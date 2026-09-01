# RosiFit database

## Apply to a Supabase project

The migrations are plain SQL and run in filename order. Nothing in them is
Supabase-CLI-specific, so either route works:

```bash
# with the Supabase CLI
supabase link --project-ref <ref>
supabase db push

# or directly
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

They expect the roles `anon`, `authenticated`, `service_role` and the `auth`
schema, all of which a Supabase project already has.

## Run the tests

`db/harness/` runs the same migrations against a local PostgreSQL 16 and
asserts the invariants. It is not part of the deployed schema.

```bash
./db/harness/test.sh          # rebuilds a fresh DB per test file, then asserts
```

`db/harness/000_local_shim.sql` recreates the pieces Supabase provides
(the roles, `auth.users`, `auth.uid()`, `storage.*`) so `supabase/migrations/`
can be executed verbatim. **It is never applied to Supabase.**

## What the schema guarantees

| Guarantee | Mechanism |
|---|---|
| `missed <= expected`, always | `check (status <> 'absent' or expected)` on `attendance_records` |
| A schedule change cannot rewrite history | expectation frozen per row; completed sessions never re-derived |
| A holiday never counts, and never alters a schedule | `apply_holiday` touches only `status='scheduled'` |
| The streak cannot drift | recomputed by window function, never incremented |
| A chart cannot disagree with its report | both read `member_period_metrics` |
| A display name can never point at two members | `member_aliases` unique academy-wide |
| A PIN can never reach the audit log | `audit_redact()` inside `audit_log()` |
| The audit log cannot be edited, even by `service_role` | revoked privileges **and** a raising trigger |
| Follow-up cannot be widened to mail everyone | `check (threshold > 0)`, super-admin-only policy |

## Secrets

No secret belongs in this repo. The service-role key and the SES credentials
are Edge Function secrets; the anon key and project URL are the only values the
client ever sees.
