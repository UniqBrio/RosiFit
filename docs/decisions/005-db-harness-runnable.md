# 005 — The DB harness is runnable, and CI is what keeps it runnable

**Status:** Accepted · **Date:** 02-Sep-2026 · **Supersedes:** DECISION_LOG 012

## Context

DECISION_LOG 012 accepted the DB harness as unverifiable, and TD-010 recorded the reason:
*"neither `psql` nor Docker is on PATH on the adopting machine"*. That made the one environment
automation is allowed to write to unreachable, which made every `ENVIRONMENTS.md` rule of the
form "applied to the harness first and confirmed" unenforceable — a governance gap, not just a
tooling inconvenience.

The finding was correct about that machine and wrong as a property of the repository. Debian and
Ubuntu link only the PostgreSQL **client** tools into `/usr/bin`; `initdb`, `postgres` and
`pg_ctl` stay under `/usr/lib/postgresql/<major>/bin`. A check of `command -v postgres` therefore
reports "not installed" on a machine with a complete PostgreSQL 16 — which is exactly what
happened. On a machine with the server binaries present, the harness runs unmodified and
**all 135 assertions pass**, over a unix socket and over TCP alike.

## Decision

Accept the harness as **runnable**, and remove the dependency on any one machine:

- `db/harness/start.sh` brings a cluster up on the socket and port `reset.sh`/`test.sh` already
  expect. It searches the platform bin directories rather than trusting `PATH`, so the failure
  that produced TD-010 cannot recur silently. It is idempotent, and when `PGHOST` names a TCP
  server it confirms reachability and stands aside instead of starting a second one.
- `reset.sh` and `test.sh` take `PGHOST`/`PGPORT`/`PGUSER` from the environment, defaulting to
  today's values. A developer sees no change; CI can point them at a service container.
- `.github/workflows/ci.yml` gains a `db-harness` job running `npm run test:db` against
  `services: postgres:16`. **This is the durable half**: TECH_DEBT named CI the better fix
  precisely because it does not depend on one person's laptop.

## Consequences

TD-010 is paid down. `ENVIRONMENTS.md` rule 3 — every schema change proven against the harness
before production — becomes enforceable rather than aspirational, which matters immediately:
the migrations queued behind it touch grants on a live project with no staging to fall back on.

The harness proves the schema by **reconstruction**, not comparison: every test file replays
`000_local_shim.sql` plus all migrations in order against a dropped database. A migration that
only works against an already-migrated database fails in CI.

What this does NOT change: production is still never an automated target, there is still no
staging, and the harness still holds no accounts. ADR 004 and TD-008 stand — `gate-runner.mjs`
is untouched, and CI still runs `audit:all` rather than `gate`.
