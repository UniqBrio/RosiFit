# Data API grants survive Supabase's 30-Oct-2026 default change — 21-Oct-2026

**Requested:** "Audit and Fix Supabase Data API Permission Changes — Current App Only." Audit and
remediate this application's database permissions for the 30-Oct-2026 change, after which Supabase
stops automatically granting Data API access on objects newly created in `public`. Investigate,
implement safe fixes, validate, report. Least privilege; no production change without explicit
approval; preserve RLS; forward-only migrations.

**Class:** ENHANCE (platform compatibility + least privilege). Tracker T-145, RC-124.

**Scope:** this repository only (UniqBrio/RosiFit). Production is Mumbai `lbyqipunsbzkcvdrxach`;
Singapore `lhpzhkzbnquwjljmbylo` keeps only the old-link forwarder and `pin-verify` and is not a
target.

**What the platform change does** (Supabase docs, "Securing your API → Default privileges for new
tables and functions"; changelog discussion 45329): new tables get no SELECT/INSERT/UPDATE/DELETE,
new functions no EXECUTE, new sequences no USAGE/SELECT — for anon, authenticated and service_role
— and functions no longer get EXECUTE through PUBLIC. Existing objects keep their grants.

**Findings (read-only production catalog reads + a full harness replay under the new defaults):**
- Tables: 34, all RLS enabled and forced. Every one already carries explicit grants in the
  migration that creates it (or 0015), for authenticated and service_role. A fresh replay under the
  new defaults reproduces production's table privileges exactly. anon holds nothing.
- Functions: 72. anon executes none. Two are load-bearing and held only by default:
  `normalize_name(text)` and `normalize_email(text)` — evaluated as the WRITING role by the
  generated column `members.name_normalized` and the SECURITY INVOKER trigger
  `member_alias_normalize()`. On a fresh project a direct Data API write to members or
  member_aliases fails: `permission denied for function normalize_name` (proved fail-first).
- Sequences: the 4 identity sequences give anon and authenticated USAGE/SELECT/UPDATE they never
  use (identity needs none); not reachable through PostgREST/GraphQL. The project's sequence
  default still grants all three roles on every new sequence.
- Project defaults: new tables and functions still auto-grant service_role.

**Fix:** migration 0097 — explicit EXECUTE on the two helpers for authenticated and service_role;
the project's default for new tables and sequences set to the platform's new behaviour (nothing, for
all three roles); the function default production has (service_role only, RC-042, pinned by spec 19)
STATED rather than inherited; the identity sequences closed to anon/authenticated. Harness mode
`HARNESS_PLATFORM_DEFAULTS=2026-10-30` and CI job `db-harness-2026-10-30` running the suite in it.
Specs `supabase/tests/74_data_api_grants_stated_not_inherited.sql` and
`src/data/dataApiGrants.test.ts`.

**Found in passing:** a per-schema default entry cannot remove PostgreSQL's built-in EXECUTE-to-PUBLIC
on new functions, so the `... in schema public revoke execute on functions from public` line in
Supabase's opt-in SQL does nothing. Every one of the 72 functions revokes PUBLIC by name; the new unit
spec now requires it.

**Open, each the owner's decision (T-145):**
(a) revoke on production the default grants no caller uses, so production equals a fresh replay;
(b) take service_role out of the default for new functions — needs the behaviour-reversal exemption
for `supabase/tests/19_trigger_function_grants.sql`;
(c) a global `alter default privileges for role postgres revoke execute on functions from public`,
which also reaches functions postgres creates in other schemas (extension installs).

**Production:** NOT applied. 0097 needs the owner's go-ahead on its raw SQL (CLAUDE.md).
