import { Pool, type PoolClient } from "pg";

/**
 * Thin PostgreSQL access layer.
 *
 * The whole application talks to PostgreSQL exclusively through the functions
 * in lib/ (products.ts, categories.ts, search.ts). Nothing else touches the
 * pool. DATABASE_URL is the single provider-agnostic credential (Supabase
 * today, any PostgreSQL later) — the same connection string used by the
 * importer. We connect as the table owner, so RLS stays untouched and the
 * public catalogue queries exactly mirror the documented RLS "public read"
 * matrix (status='active' products, is_active categories, …).
 */

const globalForDb = globalThis as unknown as { __drChemPool?: Pool };

function pool(): Pool {
  if (globalForDb.__drChemPool) return globalForDb.__drChemPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill in the value.",
    );
  }

  globalForDb.__drChemPool = new Pool({
    connectionString,
    // Supabase direct connections cap at max_connections=60 (57 usable). Every
    // serverless instance gets its own pool, so a large per-instance max lets a
    // handful of Lambda invocations exhaust the shared ceiling. Queries are
    // short and multi-statement work is scoped to a single client below, so a
    // small per-instance pool is ample.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // In Next.js dev, modules re-load: keep a single pool per process.
  });
  return globalForDb.__drChemPool;
}

/**
 * Any query result row. Deliberately `object` rather than an index-signature
 * interface: TypeScript does not give implicit index signatures to named
 * interfaces, so concrete row types (CategoryRow, CasRow, Packing, …) could
 * never satisfy `T extends { [key: string]: unknown }`. Callers always use
 * their own concrete row types; nothing indexes rows by arbitrary key.
 */
export type DbRow = object;

/** Run a parameterised query, returning all rows. */
export async function rows<T extends DbRow = DbRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = await pool().connect();
  try {
    const result = await client.query(text, params);
    return (result.rows as T[]) ?? [];
  } finally {
    client.release();
  }
}

/** Run a statement that returns one row (or null). */
export async function one<T extends DbRow = DbRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const out = await rows<T>(text, params);
  return out.length ? out[0] : null;
}

/** Run a write statement, returning the number of affected rows. */
export async function execute(
  text: string,
  params: unknown[] = [],
): Promise<number> {
  const client = await pool().connect();
  try {
    const result = await client.query(text, params);
    return result.rowCount ?? 0;
  } finally {
    client.release();
  }
}

/**
 * Scoped query runner bound to ONE pooled connection.
 *
 * `rows()`/`one()` above acquire a client per query, so firing many queries in
 * parallel through the pool bursts to one PostgreSQL connection per query. The
 * product-detail render issues ~14 small queries at once — under multiple
 * serverless instances that exhausts the shared max_connections ceiling
 * (53300 "too many clients") and 500s the page. This helper holds exactly one
 * connection for the whole scoped block; the driver safely queues the queries
 * on a single client, and errors propagate unchanged.
 */
export interface QueryRunner {
  rows: <T extends DbRow = DbRow>(text: string, params?: unknown[]) => Promise<T[]>;
  one: <T extends DbRow = DbRow>(text: string, params?: unknown[]) => Promise<T | null>;
}

function clientRows<T extends DbRow = DbRow>(
  client: PoolClient,
  text: string,
  params: unknown[],
): Promise<T[]> {
  return client.query(text, params).then((result) => result.rows as T[]);
}

function clientOne<T extends DbRow = DbRow>(
  client: PoolClient,
  text: string,
  params: unknown[],
): Promise<T | null> {
  return client
    .query(text, params)
    .then((result) => (result.rows as T[])[0] ?? null);
}

export async function withPoolClient<T>(
  fn: (db: QueryRunner) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();
  try {
    const db: QueryRunner = {
      rows: (text, params = []) => clientRows(client, text, params),
      one: (text, params = []) => clientOne(client, text, params),
    };
    return await fn(db);
  } finally {
    client.release();
  }
}

/** Health probe used by /api/health. Throws when the DB is unreachable. */
export async function ping(): Promise<void> {
  await one("SELECT 1 AS ok");
}