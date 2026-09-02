#!/usr/bin/env bash
# Rebuild the test database from scratch: shim + every migration in order.
set -euo pipefail
# Defaults are the local socket cluster db/harness/start.sh brings up. CI
# overrides them: a `services: postgres` container listens on TCP, not /tmp.
PGHOST="${PGHOST:-/tmp}"; PGPORT="${PGPORT:-5433}"; PGUSER="${PGUSER:-postgres}"
PG="psql -h $PGHOST -p $PGPORT -U $PGUSER -v ON_ERROR_STOP=1 -q"
cd "$(dirname "$0")/../.."
$PG -d postgres -c "drop database if exists rosifit;" -c "create database rosifit;"
$PG -d rosifit -f db/harness/000_local_shim.sql
for f in supabase/migrations/*.sql; do
  printf '  %-44s' "$(basename "$f")"
  $PG -d rosifit -f "$f" && echo "ok"
done
echo "database rebuilt."
