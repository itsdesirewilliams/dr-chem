import { Pool } from "pg";

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
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // In Next.js dev, modules re-load: keep a single pool per process.
  });
  return globalForDb.__drChemPool;
}

export interface DbRow {
  [key: string]: unknown;
}

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

/** Health probe used by /api/health. Throws when the DB is unreachable. */
export async function ping(): Promise<void> {
  await one("SELECT 1 AS ok");
}