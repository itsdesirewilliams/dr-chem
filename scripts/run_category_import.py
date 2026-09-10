#!/usr/bin/env python3
"""Run scripts/import_categories.py with DATABASE_URL loaded from .env.local.

Never prints the connection URL. Usage:
  python scripts/run_category_import.py [--dry-run]
"""

from __future__ import annotations

import argparse
import os
import pathlib
import sys

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
ENV_LOCAL = PROJECT_ROOT / ".env.local"
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

import import_categories  # noqa: E402


def load_env_local(path: pathlib.Path) -> dict:
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
            value = value[1:-1]
        env[key] = value
    return env


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    env = load_env_local(ENV_LOCAL)
    url = env.get("DATABASE_URL") or os.environ.get("DATABASE_URL", "")
    if not url:
        sys.exit("DATABASE_URL not found in .env.local")
    os.environ["DATABASE_URL"] = url

    cat_argv = ["import_categories.py", "--csv", r"D:\dev\loba-extractor\input\loba_urls_all.csv"]
    if args.dry_run:
        cat_argv.append("--dry-run")
    sys.argv = cat_argv
    return import_categories.main()


if __name__ == "__main__":
    raise SystemExit(main())