#!/usr/bin/env python3
"""Apply safety migration to database."""

import os
import sys
from pathlib import Path

def _resolve_driver():
    try:
        import psycopg as _psy
        return _psy.connect
    except ImportError:
        pass
    try:
        import psycopg2 as _psy
        return _psy.connect
    except ImportError:
        pass
    return None

def main():
    # Load DATABASE_URL from .env.local
    env_path = Path(__file__).parent / ".env.local"
    database_url = None
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATABASE_URL="):
                    database_url = line.split("=", 1)[1].strip().strip('"')
                    break
    
    if not database_url:
        database_url = os.environ.get("DATABASE_URL")
    
    if not database_url:
        print("DATABASE_URL not found in .env.local or environment")
        return 1
    
    connect_fn = _resolve_driver()
    if not connect_fn:
        print("No psycopg driver found")
        return 1
    
    # Read migration SQL
    migration_path = Path(__file__).parent.parent / "supabase" / "migrations" / "20260910000001_safety.sql"
    if not migration_path.exists():
        print(f"Migration file not found: {migration_path}")
        return 1
    
    sql = migration_path.read_text(encoding="utf-8")
    
    try:
        conn = connect_fn(database_url, autocommit=True)
        cur = conn.cursor()
        cur.execute(sql)
        cur.close()
        conn.close()
        print("Migration applied successfully")
        return 0
    except Exception as e:
        print(f"Migration failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())