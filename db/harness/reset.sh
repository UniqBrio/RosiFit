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
# HARNESS_PLATFORM_DEFAULTS picks which Supabase the replay stands in for:
#   legacy (default)  the platform production was created on -- every new
#                     public object auto-granted to anon/authenticated/service_role
#   2026-10-30        a project created after Supabase stopped doing that
# Anything else is refused rather than silently read as legacy.
case "${HARNESS_PLATFORM_DEFAULTS:-legacy}" in
  legacy) ;;
  2026-10-30) $PG -d rosifit -f db/harness/001_platform_defaults_2026_10_30.sql ;;
  *) echo "HARNESS_PLATFORM_DEFAULTS='${HARNESS_PLATFORM_DEFAULTS}' is not 'legacy' or '2026-10-30'." >&2; exit 1 ;;
esac
# `cmd && echo ok` looked equivalent and was not: bash's errexit explicitly
# exempts a command on the LEFT of `&&`, so a migration that failed was skipped
# and the rebuild went on to report "database rebuilt." and exit 0. Every
# rehearsal this harness performed was therefore weaker than it read -- a
# broken migration passed it silently, which is the one thing the pre-flight
# check before a production apply exists to catch (found 09-Sep-2026, while
# proving 0061's own guard fires).
for f in supabase/migrations/*.sql; do
  printf '  %-44s' "$(basename "$f")"
  if $PG -d rosifit -f "$f"; then
    echo "ok"
  else
    echo "FAILED"
    echo "MIGRATION FAILED: $f -- the database is NOT rebuilt." >&2
    exit 1
  fi
done
echo "database rebuilt."
