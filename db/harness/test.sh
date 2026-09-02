#!/usr/bin/env bash
# Each test file gets a FRESH database. Tests that share state pass or fail
# depending on filename order, which is worse than no test at all.
set -uo pipefail
cd "$(dirname "$0")/../.."
# Defaults are the local socket cluster db/harness/start.sh brings up. CI
# overrides them: a `services: postgres` container listens on TCP, not /tmp.
PGHOST="${PGHOST:-/tmp}"; PGPORT="${PGPORT:-5433}"; PGUSER="${PGUSER:-postgres}"
export PGHOST PGPORT PGUSER
PG="psql -h $PGHOST -p $PGPORT -U $PGUSER -X -q -v ON_ERROR_STOP=1"
fail=0; pass=0
for f in supabase/tests/*.sql; do
  [ -e "$f" ] || continue
  ./db/harness/reset.sh >/dev/null 2>&1 || { echo "MIGRATIONS FAILED"; ./db/harness/reset.sh; exit 1; }
  $PG -d rosifit -f db/harness/assert.sql >/dev/null 2>&1
  echo "── $(basename "$f")"
  out=$($PG -d rosifit -f "$f" 2>&1)
  echo "$out" | grep -E 'PASS|FAIL|ERROR' | sed 's/^psql:[^ ]* NOTICE:  //; s/^psql:[^ ]* //'
  pass=$((pass + $(echo "$out" | grep -c 'PASS')))
  if echo "$out" | grep -q 'FAIL\|ERROR'; then fail=1; fi
done
echo
if [ $fail -eq 0 ]; then echo "ALL $pass ASSERTIONS PASSED"; else echo "THERE ARE FAILURES"; fi
exit $fail
