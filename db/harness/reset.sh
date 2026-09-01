#!/usr/bin/env bash
# Rebuild the test database from scratch: shim + every migration in order.
set -euo pipefail
PG="psql -h /tmp -p 5433 -U postgres -v ON_ERROR_STOP=1 -q"
cd "$(dirname "$0")/../.."
$PG -d postgres -c "drop database if exists rosifit;" -c "create database rosifit;"
$PG -d rosifit -f db/harness/000_local_shim.sql
for f in supabase/migrations/*.sql; do
  printf '  %-44s' "$(basename "$f")"
  $PG -d rosifit -f "$f" && echo "ok"
done
echo "database rebuilt."
