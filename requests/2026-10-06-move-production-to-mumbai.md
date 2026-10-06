# CHANGE REQUEST — move production to the Mumbai Supabase project
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->
<!-- Drafted by Track E (brainstorm, 06-Oct-2026). The Decision Summary that produced this file is
     reproduced under DECISION below; the options it rejected are recorded there so they are not
     re-proposed. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: the production backend as a whole — the Supabase project every live read,
  write, sign-in, upload, send and bounce notification goes to; and the five places that name it
  (Vercel env vars, the AWS SNS subscription, `supabase/config.toml`, the two unsubscribe landing
  pages under `public/`, `src/data/functionRegion.ts`).
- CURRENT BEHAVIOUR (read 06-Oct-2026 through the connector): production is project
  `lhpzhkzbnquwjljmbylo` ("Rosifit"), `ap-southeast-1` Singapore, Postgres 17.6, Nano. Every
  user request comes from India; Edge Functions already execute in `ap-south-1` and SES is in
  `ap-south-1`, so each sequential database hop crosses Mumbai → Singapore (45–90 ms, row 6 of
  `RUN_app-feels-slow.md`), and `csv-import` is pinned to Singapore as a workaround (T-408).
- DESIRED BEHAVIOUR (requester, 06-Oct-2026): "migrating whole app db to that and use that as
  prod" — the new project **`lbyqipunsbzkcvdrxach` ("Rosifit_Claude", `ap-south-1` Mumbai,
  Postgres 17.11, Nano, same org)**, created by the requester, becomes production: same data,
  same accounts and PINs, same email links, same behaviour, from Mumbai.
- WHY: region change — the database is the one piece of the stack a country away from its users
  (requester's words: "for region change").
- MUST NOT CHANGE: **the data** (every row, every id, every `auth.users` hash — the clone is
  verified equal before anyone touches it); **the secrets** (`PIN_PEPPER`, `UNSUBSCRIBE_SECRET`,
  `SES_FEEDBACK_SECRET` are copied, never regenerated — the requester holds all three); the live
  function bodies as production runs them today (the clone, not a migration replay, is the
  source); RLS, grants and policies; the Vercel host `rosi-fit.vercel.app`; the migration ledger;
  `supabase/tests/53_harness_body_matches_production.sql` (a clone moves no hash); everything
  not named in DESIRED BEHAVIOUR.
- CORRECTION ROUND: 1

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: not visual — the one user-visible effect is that every signed-in person signs in once
  more after cutover (supabase-js keys its stored session by project ref). No screen, string or
  state changes.
- SCREENS & STATES TOUCHED: none. The sign-in screen is reached once by everyone; it is unchanged.
- STRINGS ADDED OR ALTERED: none. The project ref inside `public/unsubscribe.html` and
  `public/unsubscribed.html` is a host check, not copy.
- PERMISSIONS: no — same roles, same policies, same grants, verified equal old against new.
- USAGE: every user, every request. Cutover is done out of academy hours under a freeze of about
  one hour; the data is small (≈1,625 members, ≈12k audit rows).
- RUN MODE: **confirm** — every production-touching step shows its exact commands or SQL first
  and waits for an explicit go-ahead (CLAUDE.md "Before applying to PROD"; ENVIRONMENTS.md rule 8).
- SCALE: scoped

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact analysis with
  the sibling call-site sweep (B2) BEFORE proposing, produce the plan with regression risks
  (B4) — confirm mode waits for approval; auto mode (default) logs it and applies — touching
  only what DESIRED BEHAVIOUR requires. Every changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan may add to it,
  never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to the touched
  area: states, both themes in semantic tokens, the string table, the permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why (B1). If the miss was the process's fault, flag `/framework-update` too.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing merges
  without a PASS.

## DECISION — from the brainstorm, binding on the method
```
DECISION: Clone the live database byte for byte (roles, schema, data, the auth
  rows, the migration ledger) from lhpzhkzbnquwjljmbylo into lbyqipunsbzkcvdrxach;
  redeploy the 11 Edge Functions from the repo with config.toml deciding
  verify_jwt; re-point Vercel and SNS. Keep the old project frozen 30 days as
  an unsubscribe-link forwarder, pause at 30, delete at 90.
REASONING: Production provably differs from the migration replay (T-120: 15 of
  60 function bodies; T-125: 0045_import_change_counts forbidden as written;
  T-132: a production-only guard) and from the Edge tree (T-130, T-131, T-400).
  A clone changes one thing, the region, so every check is "is new equal to
  old". Same secrets or every PIN, recovery answer and sent link dies at once.
REJECTED: rebuild from migrations (ships a schema production never ran, and the
  purge migrations 0048/0052-0055 would delete every member over copied data);
  dashboard backup as the cutover copy (none exists on Free; up to a day stale
  anyway); keeping the old JWT secret for sessions (sessions die regardless).
```

## THE WORK — in order; each numbered step is a go-ahead gate in confirm mode

**Phase 0 — prepare (no freeze, no user impact)**
1. Requester sets the secrets on the new project, same values, **no surrounding quotes**
   (RC-017): `PIN_PEPPER`, `UNSUBSCRIBE_SECRET`, `SES_FEEDBACK_SECRET`, `SES_SNS_TOPIC_ARN`,
   `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `SES_FROM_ADDRESS`; `EMAIL_PROVIDER`
   and `SES_CONFIG_SET` only if set today; `APP_ORIGIN` unset (defaults to the Vercel host).
2. Dashboard-only settings read from the old project and written on the new one, each pair
   recorded in `ENVIRONMENTS.md`: API max rows (CP-020 depends on it), JWT expiry, refresh-token
   reuse interval and rotation (ADR-031 depends on them), auth rate limits, email signups off.
3. Requester installs Postgres 17 client tools (`pg_dump`, `psql`) on their machine. The session
   prepares the exact commands, the verification SQL and the diff scripts; it never runs the
   dump itself (its proxy refuses `*.supabase.co`).

**Phase 1 — rehearsal (no freeze)**
4. Dump the old project in three parts: roles, schema, data (`--data-only --use-copy`, loaded
   under `session_replication_role = replica` so audit, backdating and suppression triggers do
   not fire). **Auth is copied as data, never as schema** — the new project's GoTrue schema is
   newer; `auth.users` and `auth.identities` rows load before `public` data (the `restrict` FK).
   Sessions and refresh tokens are not copied. Restore in that order with `ON_ERROR_STOP`.
5. Verify old against new by query and record the table: row count of all 34 `public` tables,
   `auth.users` and `auth.identities` counts, `md5(prosrc)` of every function in `public`
   (`54_function_body_inventory.sql` shape), `pg_policies` count (62), `anon` holds EXECUTE on no
   RPC, every table `rowsecurity` and `relforcerowsecurity`, identity-sequence `last_value` for
   `audit_logs` / `email_events` / `audit_remarks` / `mobile_number_changes`, `schema_migrations`
   row count. Advisors run on the new project and diffed against the old.
6. Deploy all 11 Edge Functions from the repo, one at a time, with `supabase/config.toml` —
   `pin-reset-request` goes public as its source says (T-127); the repo's `pin-issue` and
   `send-followups` replace the stale v13 and v18 (T-130, T-131). Each deployed bundle is read
   back and diffed against `supabase/functions/` (T-400's method).
7. A Vercel **Preview** deployment pointed at the new project (Preview-scoped env vars only),
   smoked by hand: a real PIN signs in (proves the pepper and the auth copy), member list,
   course screen, upload preview, a send to the two SES simulator addresses, a second SNS
   subscription to the new `ses-feedback` URL (old one stays), `email_events` rows observed,
   unsubscribe link clicked, resubscribe.
8. Every restore quirk and its handling written down before cutover is scheduled.

**Phase 2 — cutover (freeze ≈ 1 hour, out of academy hours)**
9. Freeze announced; uploads and sends stop. **No migration is applied to either project
   between rehearsal and cutover.**
10. Final data-only dump; truncate and reload the new project's data; step 5 re-run, every
    count equal.
11. Vercel Production env vars → new URL and anon key; redeploy with a cleared cache; the served
    bundle grepped for the new host and for the absence of the old one (T-114's missing check).
12. SNS: new subscription `Confirmed`; old subscription deleted.
13. Old project: every secret except `UNSUBSCRIBE_SECRET` removed; `unsubscribe` redeployed as a
    307/308 forwarder to the new host carrying the same query string; nothing else touched.
    Pause date (+30 d) and delete date (+90 d) written into `ENVIRONMENTS.md`.
14. Unfreeze. First sign-in, first upload, first real send, first SNS event each read back from
    the new project.

**Phase 3 — the repo PR (Track B proper, merged after cutover)**
- `supabase/config.toml`: `project_id = "lbyqipunsbzkcvdrxach"`.
- `public/unsubscribe.html`, `public/unsubscribed.html`: host regex to the new ref; the two
  copy-locks in `src/data/unsubscribeLanding.test.ts` re-pointed (the one append-only exemption).
- `src/data/functionRegion.ts`: the `csv-import` pin removed — database and functions now share
  `ap-south-1`, T-408's experiment closes; `functionRegion.test.ts` keeps every "no `x-region`
  header" assertion; its region literals are copy-locks and move only as the spec's own job.
- `supabase/SETUP.md`; `docs/registers/ENVIRONMENTS.md` (production row, dated "Production moved"
  entry with the step 5 and 10 tables, pause and delete dates); `ISSUE_TRACKER.md` row;
  `DECISION_LOG.md` ADR; `RUN_LOG.md`. `supabase/APPLY_0078.md` and migration comments stay as
  dated history. `53_harness_body_matches_production.sql` untouched.

**Phase 4 — watch, read-only**
- +1 h and +24 h: edge-log `response.origin_time` p50 (expect a clear drop from 91 ms), function
  error rates, sign-in count, any `PGRST`/`42501` in logs (`post-release-monitor`).

**Rollback**
- Before the first real write on the new project after unfreeze: Vercel env vars back, redeploy,
  SNS re-pointed. The old project was never written to.
- After it: the old project is behind and rollback is a reverse data copy. The freeze, the
  step 10 verification and the first hour of watching are the point of no return's guard.

## OBSERVED AT INTAKE — not binding fields
- The new project exists and is empty (0 `auth.users`, no `public` tables, none of
  `citext` / `unaccent` / `btree_gist` installed; the schema dump installs them in `public`, where
  the old project has them, so the `search_path = public` helpers keep resolving).
- The org is on the **Free plan**: no dashboard backups on either project (the live dump is the
  only source); free projects pause after about a week without API activity (harmless for the
  forwarder, but a paused project must be restored by hand before any rollback); compute cannot
  be raised, so the parallel-burst finding (`RUN_app-feels-slow.md` cause 2) is unchanged by the
  move; two active projects is the plan's limit, and these are the two.
- The drift rows T-120, T-125, T-132, T-400, T-130, T-131 and T-127 are **not resolved** by the
  move: the database functions arrive as the clone has them, the Edge Functions as the repo has
  them. Each is named here so nobody reads the move as having closed them.
- Links in emails already sent carry the old host; the ids and the secret survive the clone, so
  they verify on the new host via the forwarder. Gmail's one-click POST may not follow a
  redirect; the body link will, and every email sent after cutover carries the new host.
- Sessions do not carry over whatever is done; everyone signs in once. Accepted by the requester
  in the brainstorm.
- MUST NOT CHANGE was partly inferred from the brainstorm's hard prerequisites rather than stated
  in the requester's words; the first gate restates it for correction.
