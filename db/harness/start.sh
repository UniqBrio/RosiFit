#!/usr/bin/env bash
# Bring up the local harness Postgres. Idempotent -- run it twice and the
# second run just reports that the cluster is already accepting connections.
#
# The harness is the ONLY environment automation may write to
# (docs/registers/ENVIRONMENTS.md), so it has to be startable on a fresh
# machine without anyone having to remember the flags. These are the flags:
# port 5433 and a socket directory of /tmp, which is what reset.sh and
# test.sh default to.
set -euo pipefail

PGPORT="${PGPORT:-5433}"
PGHOST="${PGHOST:-/tmp}"
PGUSER="${PGUSER:-postgres}"
PGDATA="${HARNESS_PGDATA:-/tmp/rosifit-harness-pgdata}"

# A TCP PGHOST means somebody else already runs the server -- CI's
# `services: postgres` container, or a developer's own instance. There is
# nothing to start, so prove it is reachable and get out of the way. That is
# what lets `npm run test:db` be the single command in both places, which is
# the whole point of the CI file: if CI and local run different commands,
# one of them is decoration.
case "$PGHOST" in
  /*) ;;
  *)
    if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -X -q -c 'select 1' >/dev/null 2>&1; then
      echo "harness Postgres reachable at $PGHOST:$PGPORT (managed elsewhere; nothing to start)"
      exit 0
    fi
    echo "PGHOST=$PGHOST port $PGPORT is a TCP target, but it is not accepting connections." >&2
    exit 1 ;;
esac

# Debian and Ubuntu link only the CLIENT tools into /usr/bin; initdb and
# postgres stay under /usr/lib/postgresql/<major>/bin. Checking `command -v
# postgres` alone is exactly how an installed Postgres 16 gets recorded as
# "not installed" -- which is what TD-010 recorded.
bindir=""
for d in "$(dirname "$(command -v pg_ctl 2>/dev/null || echo /nonexistent)")" \
         /usr/lib/postgresql/*/bin /usr/pgsql-*/bin \
         /opt/homebrew/opt/postgresql@16/bin /usr/local/opt/postgresql@16/bin; do
  if [ -x "$d/initdb" ] && [ -x "$d/pg_ctl" ]; then bindir="$d"; break; fi
done
if [ -z "$bindir" ]; then
  echo "No PostgreSQL server binaries (initdb, pg_ctl) found." >&2
  echo "Install PostgreSQL 16, or let CI run the suite -- .github/workflows/ci.yml." >&2
  exit 1
fi

if "$bindir/pg_isready" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" >/dev/null 2>&1; then
  echo "harness Postgres already accepting connections on $PGHOST:$PGPORT"
  exit 0
fi

# Postgres refuses to run as root, so as root we borrow the `postgres`
# system account. As any other user we are already a fine owner.
runas=""
if [ "$(id -u)" -eq 0 ]; then
  if ! id postgres >/dev/null 2>&1; then
    echo "Running as root, but there is no 'postgres' account to run the server as." >&2
    exit 1
  fi
  runas="postgres"
fi
run() {
  if [ -n "$runas" ]; then su "$runas" -c "PATH=$bindir:\$PATH $1"
  else PATH="$bindir:$PATH" sh -c "$1"; fi
}

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  mkdir -p "$PGDATA"
  [ -n "$runas" ] && chown "$runas" "$PGDATA"
  chmod 700 "$PGDATA"
  # trust auth is deliberate: this cluster is reachable only over a local
  # socket, holds nothing but throwaway fixtures, and reset.sh drops and
  # rebuilds it before every single test file (TEST_ACCOUNTS.md rule 4).
  run "initdb -U postgres -D '$PGDATA' -A trust --encoding=UTF8 --locale=C.UTF-8" >/dev/null
fi

# -h '' keeps it off TCP entirely: nothing outside this machine can reach it.
run "pg_ctl -D '$PGDATA' -l '$PGDATA/server.log' -o \"-p $PGPORT -k '$PGHOST' -h ''\" -w start" >/dev/null
"$bindir/pg_isready" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER"
