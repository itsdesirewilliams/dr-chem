# DR-Chem — Local Docker & PostgreSQL

This directory contains the local Docker setup for DR-Chem. For now it is a
single, plain PostgreSQL service — no other dependencies are required.

## What you get

- One **PostgreSQL 17** container (`postgres:17-alpine` — a stable major
  release; see *Changing the PostgreSQL version* below).
- A **persistent named Docker volume** (`postgres-data`) for all database
  data. Data survives `docker compose down` and is removed only with a
  deliberate `docker compose down -v`.
- A **healthcheck** based on `pg_isready`, so the database advertises a
  `healthy` status that other stacks can depend on later.
- **No hardcoded credentials** — the database name, user, and password come
  exclusively from environment variables.

## Prerequisites

- Docker with Docker Compose v2 (recent Docker Desktop includes both).
- Nothing to install in this repository — this stack runs entirely from the
  files in the repo.

## Quick start

```powershell
# 1. Create the environment file from the template and choose real values.
Copy-Item docker/.env.example .env

# 2. Generate a strong database password and set it in `.env`
#    (e.g. `openssl rand -hex 32`). This step is mandatory — startup fails
#    fast if POSTGRES_PASSWORD is missing.

# 3. Start PostgreSQL in the background.
docker compose up -d
```

On macOS / Linux, the equivalent for step 1 is:

```bash
cp docker/.env.example .env
```

> Prefer keeping the real values in the root `.env` (the default Docker
> Compose env file). If you would rather keep them inside `docker/`, run
> `docker compose --env-file docker/.env` with every command instead.

## Checking it works

```bash
docker compose ps              # Status "running (healthy)"
docker compose logs postgres   # PostgreSQL startup logs
docker compose exec postgres pg_isready -U drchem  # "accepting connections"
```

## Stopping and cleaning up

```bash
docker compose down        # Stop and remove the container (data is kept)
docker compose down -v     # Stop AND delete the postgres-data volume (data loss!)
```

## Configuration

| Variable          | Default   | Description                                           |
| ----------------- | --------- | ----------------------------------------------------- |
| `POSTGRES_DB`     | `drchem`  | Database name created on first start                 |
| `POSTGRES_USER`   | `drchem`  | Superuser role created on first start                |
| `POSTGRES_PASSWORD` | _(none)_ | Password for `POSTGRES_USER`. Required.             |
| `POSTGRES_PORT`   | `5432`    | Host port PostgreSQL is published on (loopback only) |

To connect from another tool on this machine:

```
host: localhost
port: ${POSTGRES_PORT}
database: ${POSTGRES_DB}
user: ${POSTGRES_USER}
password: ${POSTGRES_PASSWORD}
```

## Notes

- **Credentials are applied only the first time the data volume is
  initialized.** Changing `POSTGRES_PASSWORD` (or user/db) after first start
  has no effect on an existing volume. Use `docker compose down -v` and start
  again if you really need to change them.
- The host port is published on `127.0.0.1` only by default, keeping the
  database off the local network. To expose it, change the port mapping to
  `"${POSTGRES_PORT:-5432}:5432"`.
- The container is reachable from other project containers on the
  `drchem-net` network at hostname `postgres`, port `5432`.
- The official image sets `PGDATA` to `/var/lib/postgresql/data`, which is
  what the `postgres-data` volume is mounted on.

## Changing the PostgreSQL version

A major version change requires an intentional data migration:

1. `docker compose down -v` (this deletes the data volume — dump first).
2. Change `image: postgres:17-alpine` to the desired major in
   `docker-compose.yml`.
3. `docker compose up -d` and re-initialize seed data (schema is created in a
   later step).

Do not switch between `alpine` and Debian variants of the same major and
expect the data to be compatible — data lives in the volume, not the image.

## Self-hosting / portability

This setup was designed with future self-hosting in mind:

- A single, self-contained service with an isolated network and a named
  volume — easy to move to any host running Docker or Podman with Compose.
- No external infrastructure (Supabase, managed databases, etc.) is assumed;
  the app connects to plain PostgreSQL.
- Credentials are injected via environment variables, so production can reuse
  the same Compose file with a different `.env` (or an orchestrator's secret
  store).