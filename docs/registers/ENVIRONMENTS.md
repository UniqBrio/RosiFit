# Environments

> Ambiguity here produces "which database did that just write to?" — a question with no good
> answers, usually asked after the fact.

> **Filled at framework adoption, 02-Sep-2026,** from `db/harness/`, `src/data/repository.ts`,
> `src/lib/supabase.ts`, `.env.example` and `supabase/SETUP.md`.

RosiFit has **three** environments, not the template's four. There is no staging, and saying so
is more useful than leaving an empty row that looks like an oversight.

| Name | Purpose | URL | Datastore identifier | Who may write | Automated target? |
|---|---|---|---|---|---|
| **fixtures** | The app with no backend at all | `expo start` / static export | none — `src/data/mock.ts` | anyone; nothing persists | yes — no data exists to harm |
| **harness** | Automated schema + policy tests | none (psql only) | local Postgres 16, socket `/tmp`, port `5433`, database `rosifit` | CI + developers | **yes — the only automated target** |
| **production** | Real users | Vercel project `rosi-fit` | Supabase project `lhpzhkzbnquwjljmbylo` ("Rosifit") | **approved deploys only** | **NEVER without explicit instruction** |

**There is no staging.** RosiFit has one Supabase project. A change is proven against the harness
and then goes to production; there is no third place for it to sit. Recorded here so nobody plans
around a staging environment that does not exist — see TECH_DEBT if that becomes a constraint.

## Running the harness

```
npm run test:db     # start the cluster if it is not up, then run all 135 assertions
npm run db:start    # just the cluster
```

`db/harness/start.sh` brings up a local Postgres 16 on the socket and port in the table above. It
finds the server binaries by searching the platform bin directories rather than trusting `PATH`:
Debian and Ubuntu link only the *client* tools into `/usr/bin`, which is how a complete Postgres 16
came to be recorded as absent (TD-010, ADR 013).

`PGHOST`, `PGPORT` and `PGUSER` override the defaults. When `PGHOST` names a TCP host, `start.sh`
confirms that server is reachable and starts nothing — which is how the `db-harness` job in
`.github/workflows/ci.yml` runs *the same command* against `services: postgres:16`. The suite
therefore no longer depends on any one machine, and rule 3 below is enforceable rather than
aspirational.

## How the app chooses

`src/data/repository.ts` decides once, at module load, and exports `dataSource`:

- `EXPO_PUBLIC_SUPABASE_URL` **and** `EXPO_PUBLIC_SUPABASE_ANON_KEY` set → `live`. Every read
  goes to the live project through the anon key, and RLS decides what comes back.
- Either missing → `fixtures`. The app runs, warns once in dev, and signs nobody in.

**Screens never branch on this.** They receive the same shapes either way (CP-001). There is no
`APP_ENV` variable in RosiFit; presence of the two public keys *is* the switch, which means there
is no way to point a build at "production config" and "test data" by accident.

---

## Binding rules

1. **Production is never an automated test target.** Not "usually not". Never — and in this repo
   that rule has teeth, because production is the *only* live environment there is.
2. **A staging deploy is a production BUILD pointed at NON-PRODUCTION DATA.** Those are separate
   questions and conflating them is how a test run reaches live customers. N/A today: no staging.
3. **Every schema change reaches production only through a migration file** in
   `supabase/migrations/`, applied to the harness first and confirmed by `bash db/harness/test.sh`.
   Never edit an applied migration. Direct edits are drift by definition — and "minor" is not an
   exemption.
4. **Schema parity is checked before backend work and again before production promotion.** The
   harness rebuilds from `000_local_shim.sql` plus every migration in order, so parity is proven
   by reconstruction rather than by comparison.
5. **Outbound messages are deny-by-default outside production**, with an explicit allowlist. See
   TEST_ACCOUNTS.md. Today this holds trivially: fixtures and harness have no SES credentials, so
   a send cannot leave either of them.

6. **Never create Supabase branches.** All schema work targets the main Supabase project
   directly. A Supabase branch is not one of the three environments above and must not become a
   fourth — it starts empty, so it proves nothing the harness does not already prove, and it
   bills by the hour for as long as it exists.

7. **Rehearsal is the local harness, and only the local harness.** Replay every migration from
   scratch against a fresh Postgres 16 and run the full spec suite (`npm run test:db`). That is
   the pre-flight check in its entirety.

8. **Production applies are gated and serial.** Show the requester the raw SQL of every pending
   migration and wait for an explicit go-ahead; then apply **one at a time, in filename order**,
   reporting the result of each before starting the next.

   Rules 7 and 8 divide the work between them, and the division matters. The harness proves a
   migration is well-formed *by reconstruction*; it cannot prove the migration is compatible with
   data that already exists, because it holds none. A migration that builds a unique index or adds
   a constraint over existing rows therefore needs that one check run against production itself,
   before it is applied — and no rehearsal environment, branch or otherwise, can stand in for it.

---

## Configuration per environment

| Variable | fixtures | harness | production |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | *(unset — this is what makes it fixtures)* | *(unset)* | set |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | *(unset)* | *(unset)* | set |
| `SUPABASE_SERVICE_ROLE_KEY` | ➖ | ➖ | Edge Function secret only |
| `PIN_PEPPER` | ➖ | ➖ | Edge Function secret only — ◻ **not yet set** |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `SES_*` | ➖ | ➖ | Edge Function secrets only |

Only the two `EXPO_PUBLIC_` values may ever be public: anything with that prefix is compiled into
the bundle and readable by anyone who installs the app (guardrail 4, `.env.example`). The rest are
set with `supabase secrets set` and appear in no tracked file.

---

## Production change applied 09-Sep-2026 (fourth and fifth) — ✅ VERIFIED

**`0062_a_typed_leaving_date_is_an_instruction` APPLIED.** Reported with a real 794-member export:
a leaving date typed against two members, uploaded, and nothing happened. `bulk_set_member_dates`
read "an inactive date with NO STATUS beside it means inactive from that day", and the report
writes a Status on every row — so the exported "Active" always won and the typed date was
discarded. Now reads WHICH CELL WAS EDITED against the record. **Verified:** the new rule is in
the live source and the old line is gone. Rehearsed first; new spec 44 8/8.

**`0063_remove_a_branch_by_moving_its_courses` APPLIED.** Adds `remove_branch(uuid, uuid)`, which
moves a branch's live offerings and scoped holidays to another branch before removing it, so a
branch that runs courses can be removed without destroying anything. **Verified:** present,
SECURITY DEFINER, EXECUTE to authenticated and service_role only.

- **PURELY ADDITIVE, so no deployment window** — unlike 0057. It creates a function that did not
  exist and drops nothing; the live app still removes a branch with its own direct UPDATE and is
  untouched until the new code deploys. Rehearsed first; new spec 45 13/13, which caught two of
  my own errors before production saw them (a column that does not exist on `holidays`, and an
  `updated_by` on `branches` and `course_offerings` that neither table has).
- **It does not reopen branches to staff.** 0050 records that the owner was asked about branches
  on 08-Sep-2026 and chose to keep them super-admin; the gate is restated in the function.

---

## Production change applied 09-Sep-2026 (third) — ✅ VERIFIED

**`0061_the_last_gendered_refusals` APPLIED.** Eleven strings across four functions:
`create_member` (4), `update_member` (4), `merge_member_into` (2), `bulk_import_members` (1).

- **Found by reading the DATABASE, not the repo.** The repo holds superseded copies of these
  functions; the live definition is the one that talks to people. Every quoted literal in every
  live function was read, and only these eleven were text a user is actually shown.
- **It rewrites in place rather than restating the functions.** These four bodies are 28KB of the
  most load-bearing code in the schema. Restating them to change 11 short strings would mean
  re-typing 28KB by hand, where one slip is a silent behaviour change in a core write path that
  no reviewer would reliably catch. Instead `pg_get_functiondef` reconstructs each definition, the
  named substitutions are applied to that text, and the result is executed — so the function
  differs by exactly those strings, by construction rather than by inspection.
- **It cannot silently no-op.** Every substitution is checked before it is applied; a string the
  migration expects and does not find raises and rolls back. Proved by injecting a wrong
  expectation, which failed exactly as intended.
- **✅ Verified afterwards:** `0` functions in `public` now contain a gendered pronoun in any
  `raise exception` message, and the old Bulk Import reason string is gone.

---

## ⚠️ Production drift found 09-Sep-2026 — `set_attendance` IS NOT IN PRODUCTION

Found while sweeping the live schema for gendered text: the harness has
`public.set_attendance`, and **production has no function of that name at all**.

`src/data/repository.ts:3535` calls `supabase.rpc('set_attendance', …)`, so **marking attendance
by hand is broken in the live app** and has been since the feature shipped. The code already
suspects it — the error branch there reads *"0035 may not be applied yet"* — which is exactly
what happened: `0035_set_attendance.sql` was never applied.

Not fixed here, because it is nobody's ask in this session and applying an unreviewed migration
to production is a decision, not a cleanup. It is the largest single thing outstanding on this
project and should be taken deliberately.

Related, and the same root cause — migrations in the repo that production never received:
`0035_set_attendance`, `0044_override_scoped_by_meeting_instance`, `0045_import_change_counts`,
`0046_attendance_backdates_membership`. There is no automated check that the repo's migration
list and the applied list agree; there should be.

---

## Production change applied 09-Sep-2026 (second) — ✅ VERIFIED, with a known window

Project `lhpzhkzbnquwjljmbylo` ("Rosifit"). **`0057_reset_only_the_selected_members` APPLIED.**

- **Rehearsed first.** `npm run test:db` replayed every migration from scratch; the new
  `supabase/tests/43` passes 13/13, and the ten failures elsewhere in the suite are pre-existing
  and unrelated.
- **`reset_day_attendance` now takes `p_member_ids`** — the members whose marks to CLEAR. The
  0056 function taking `p_delete_member_ids` (members to DELETE) is **dropped**, not overloaded.
  Verified: one definition only, `(p_course_id uuid, p_session_date date, p_member_ids uuid[])`,
  `EXECUTE` to `authenticated` and `service_role`.
- **A KNOWN WINDOW WAS ACCEPTED, deliberately, and this is the record of it.** The application
  code that calls the new signature is on `claude/pull-latest-main-7azgnr` (PR #8) and was NOT
  merged when this was applied. Until that deploys, pressing Reset in the live app fails with
  *"The register could not be reset"* and clears nothing. The decision was the repo owner's,
  taken with the trade-off stated; the failure is loud, writes nothing, risks no data, and
  touches one occasional admin control and nothing else.
- **Why zero-downtime was not available.** Postgres identifies a function by name and argument
  TYPES, not parameter names, so `(uuid, date, uuid[])` cannot exist twice — the old and new
  versions could not coexist for a phased cutover. The only alternative was renaming the
  function, which was judged more churn than the window is worth.
- **The old 2-argument `attendance_reset_preview` SURVIVES**, because 0057 adds the 3-argument
  form rather than replacing it. That is why the window is narrower than it first appears: the
  live app can still OPEN the reset dialog and see its numbers, and only the confirm fails.
- **Follow-up owed:** once PR #8 is deployed, nothing calls the 2-argument preview. It should be
  dropped — it is also one of the twelve functions still carrying gendered text, so the drop and
  that sweep are the same piece of work.

---

## Production change applied 09-Sep-2026 — ✅ VERIFIED against the live project

Project `lhpzhkzbnquwjljmbylo` ("Rosifit", ap-southeast-1). Two migrations, applied **one at a
time and in order**, each verified by reading `pg_proc` back before the next was started.

- **`0059_import_refusal_names_the_other_button` APPLIED.** Replaces
  `bulk_set_member_dates`. An unknown name is now refused with *"not on the register — add them
  with Bulk Import first, this file only changes dates"* — the exact sentence
  `src/data/statusImport.ts` refuses the same row with, so the two halves of one import cannot
  tell different stories. The string it replaced named no button and said "hers".
  **Verified:** the new refusal is in the live source and `prosrc` matches no gendered pronoun.
- **`0060_refusals_stop_saying_she` APPLIED.** Replaces `set_member_status` (0045) and
  `set_member_active_from` (0057) with their six refusals written about *the member*.
  **Verified:** all eight `raise exception` messages across the two functions read back in the
  new wording, and neither `prosrc` matches a gendered pronoun.
- **✅ REHEARSED ON THE HARNESS FIRST — the step 06-Sep could not take.** This machine has
  Postgres 16, so `npm run test:db` replayed every migration from scratch: specs 41 and 42
  together **44/44**, re-run after the last edit to either file. The ten failures elsewhere in
  the suite are pre-existing and in unrelated specs; they were present before these migrations
  and are unchanged by them.
- **No signature, grant or behaviour changed.** All four import-path functions
  (`bulk_import_members`, `bulk_set_member_dates`, `set_member_status`,
  `set_member_active_from`) were re-read afterwards: same identity arguments, still
  `SECURITY DEFINER`, still `EXECUTE` to `authenticated` and `service_role` only. Both
  migrations replace a function body; neither builds an index nor adds a constraint over
  existing rows, so there was no data-compatibility question for the harness to leave open.
- **Still unapplied, and deliberately untouched:** `0044_override_scoped_by_meeting_instance`,
  `0045_import_change_counts`, `0046_attendance_backdates_membership`,
  `0057_reset_only_the_selected_members`. `0046` deserves attention on its own —
  `set_member_active_from`'s third refusal is that invariant read forward, and the trigger it
  reads forward from is not in this project. Note also that two different migrations in the repo
  claim the number `0057`.

---

## Production change applied 06-Sep-2026 — ✅ VERIFIED against the live project

Project `lhpzhkzbnquwjljmbylo` ("Rosifit", ap-southeast-1), confirmed as the target by matching
the ref against `EXPO_PUBLIC_SUPABASE_URL` in `.env` before anything was run.

- **`0033_many_super_admins` APPLIED.** `drop index if exists public.one_super_admin`, plus a
  table comment. Verified afterwards by listing `pg_indexes` for `app_users`: `one_super_admin`
  is gone; `app_users_pkey`, `app_users_auth_user_id_key`, `app_users_phone_live` and
  `app_users_active` all remain. One live account per mobile number is therefore still enforced.
- **NOT REHEARSED ON THE HARNESS.** `db/harness` needs Docker and psql; this machine has
  neither, so the rehearsal this register requires could not run. The owner was told before
  giving the go-ahead and chose to proceed. The migration drops an index and adds no constraint
  over existing rows, so it carries none of the data-compatibility risk the harness could not
  have answered anyway — but the step was skipped, and that is recorded rather than implied.
- **`auth-bootstrap` REDEPLOYED — by the OWNER, not by this session.** The MCP deploy was denied
  by the session's permission classifier and was deliberately NOT re-attempted through
  `npx supabase functions deploy`: routing a denied production deploy through a second tool
  defeats the point of the denial. The owner ran it instead.
- **✅ Verified by reading the DEPLOYED source back**, not by trusting the version number:
  `auth-bootstrap` is at **version 9**, `verify_jwt: false` preserved (it must stay public —
  nobody has a session when they register), and the
  `409 'RosiFit is already set up. Sign in instead.'` branch is **absent from the deployed
  code**. All six `_shared` modules shipped with it. The duplicate-number check
  (`409 'This mobile number is already registered.'`) is still present, which is correct — that
  is the one refusal that should survive.
- **Net effect: the backend now supports the owner's flow end to end.** An unrecognised number
  reaches registration, the form can complete, and the account is created as a super admin.

---

## Current state of production — ◻ as recorded in `supabase/SETUP.md`, not re-verified here

- Migrations `0001`–`0014` applied; 30 tables in `public`, every one with RLS.
- Edge Functions deployed: `auth-login`, `auth-bootstrap`, `recovery-check` (public,
  `verify_jwt=false` — nobody has a session when they call them), plus `pin-issue`, `pin-reset`,
  `csv-import`, `send-followups` (JWT required).
- `app_settings` singleton seeded; **`bootstrap_completed` is still `false`** — the academy admin
  has not registered yet.
- **`PIN_PEPPER` is not set.** Until it is, every auth function returns 500. Nothing else is
  blocked: CSV import and send do not derive from it.
- Supabase advisors run and acted on — migrations `0011`–`0013`.

These marks are ◻ because they were read from `SETUP.md` during this documentation pass. Nothing
in this pass connected to the live project, by design.

---

## 09-Sep-2026 — SES feedback and unsubscribe: what is written, what is proved

Written for AWS support case 178876518600723 (production-access review). The
distinction between **written**, **rehearsed** and **verified in production**
is the whole point of this entry — it is the source for a statement to AWS
Trust & Safety, and a claim that outruns its evidence there is worse than a
gap admitted.

### New Edge Functions — both MUST be `verify_jwt=false`
- **`ses-feedback`** — SNS-delivered bounce and complaint notifications, written
  onto `member_emails.status`. SNS cannot send a Supabase auth header, so JWT
  verification on means every notification 401s and the subscription never
  confirms, silently. Its own door: shared secret in `?s=` (constant-time) AND
  `TopicArn` equal to `SES_SNS_TOPIC_ARN`. **Missing either secret refuses
  everything** rather than accepting everything — this is a deliberate
  departure from the supplied reference, which skipped the ARN check when the
  variable was unset.
- **`unsubscribe`** — opt-out from a signed link, no login. `?e=<member_email_id>`
  `&t=<HMAC-SHA256 under UNSUBSCRIBE_SECRET>`, constant-time. GET returns a
  confirmation page; POST with any body is RFC 8058 one-click and returns 200
  empty. Idempotent, and an invalid token gets the same page as an id that
  does not exist.

### Secrets this adds
`SES_SNS_TOPIC_ARN`, `SES_FEEDBACK_SECRET`, `UNSUBSCRIBE_SECRET`. All three are
read through `unquoteSecret` — a value set through PowerShell keeps its quote
characters, which on this project has already broken `SES_FROM_ADDRESS` once
and here would silently 403 every real notification.

**`UNSUBSCRIBE_SECRET` MUST BE SET BEFORE `send-followups` IS REDEPLOYED.**
The new version refuses the whole send with a 503 naming the fix when it is
absent, on the same "refuse rather than pretend" grounds as the AWS secrets
(RC-017): a message advertising an unsubscribe link that cannot be verified is
worse than a message not sent.

### Migrations
- **`0065_audit_log_anon.sql`** — a third audit writer, for a member with no
  account. `audit_log()` derives `'system'` on the service-role client and
  `audit_log_as()` demands an `app_users` row; a member has neither. It writes
  `actor_kind 'anon'` with a null actor and takes **neither as an argument**,
  so it cannot be used to forge attribution. `service_role` only, redaction
  kept. Neither existing write path is touched and `audit_logs` stays
  append-only.
- **`0066_every_follow_up_email_says_how_to_stop_it.sql`** — the unsubscribe
  line and the `{{unsubscribe_url}}` placeholder, into every stored template.
  Re-runnable: guarded on the placeholder's absence.

### ✅ Rehearsed on the harness — the first full run this project has had
`bash db/harness/test.sh` on PostgreSQL 16, every migration replayed from
scratch. `supabase/tests/47_unsubscribe_and_ses_feedback.sql`: **17 of 17
assertions pass.**

**16 OTHER TEST FILES FAIL, AND THEY FAILED BEFORE THIS CHANGE.** Proved, not
assumed: the two new migrations were moved out of the tree and all sixteen were
re-run, failing identically (`09_grants`, `11_holiday_delete`,
`12_offering_schedule`, `19_trigger_function_grants`, `22_bulk_import_members`,
`23_course_threshold`, `25_merge_member`, `27_set_attendance`,
`30_delete_member`, `34_member_inactive_from`, `34_reimport_feedback`,
`35_attendance_backdates_membership`, `36_hard_delete_course`,
`37_audit_remarks_on_an_entry`, `39_staff_are_not_restricted`,
`40_hard_delete_member`). This is the backlog `SETUP.md` has recorded as owed
since `0026` — the suite had never actually been run — now measured rather
than owed. **It is not this change's, and it is not fixed by this change.**

`npm run gate` says **FAIL**, and says it identically on the commit before
this one — same 11 steps, same 5 pass / 5 fail / 1 blocked, run side by side
to check rather than assumed. G1–G3 want `design/tokens.json`, which is not in
the repository at all; G6 wants a local eslint; G7/G8 are the six unit failures
above. What DOES pass and is this change's to claim: `check:contrast`
2842/2842 pairs, `check:icons` 75/75, `audit:all` clean with no new violations,
`tsc --noEmit` clean, and **1441 of 1448 unit tests pass, 6 fail, 1 skipped** —
the six failures being exactly the six the base commit already had, by name.

### ✅ Deployed to production, 09-Sep-2026
`ses-feedback` **v1** and `unsubscribe` **v1**, both `verify_jwt: false`,
confirmed by reading the deployed record back rather than by trusting the
deploy call. The deployed source of `ses-feedback` was also read back in full
and matches what was sent, including its two `_shared` modules.

**`send-followups` was deliberately NOT redeployed.** It stays at **v14**, the
version without the List-Unsubscribe headers, because the new version needs
`UNSUBSCRIBE_SECRET` set and `0066` applied first, and because it is the one
file in this change that could break sending outright if SES refuses the
`Headers` field. Production therefore still sends exactly what it sent
yesterday.

Neither migration is applied: `audit_log_anon` does not exist on the project
and 0 of 1 templates carry the placeholder, both checked by query. Until `0065`
lands, an opt-out through the deployed `unsubscribe` would still be SAVED and
its audit row would fail and be logged — the function treats the log as
best-effort on purpose. No link exists to click yet, so this window is
theoretical.

### ◻ NOT verified — what a statement to AWS must not claim
- **The SESv2 `Headers` field has never been exercised against live SES.** The
  `List-Unsubscribe` pair is set through `Content.Simple.Headers` rather than
  raw MIME. If ap-south-1 refuses the field, sends fail with a 400 — so the
  first test send after deploy is a gate, not a formality.
- No SNS notification has been received; no bounce, complaint or unsubscribe
  has been observed end to end. `email_events` holds 0 rows and 0 addresses are
  suppressed, both re-checked after deploying.
- **Neither deployed function has ever been executed.** The session that
  deployed them cannot reach `*.supabase.co` — its egress proxy answers 403 for
  that host — so not even a boot check ("does it return 405 to a GET") was
  performed. `pg_net` and `http` are both absent from the project, so there was
  no in-database route either, and enabling an extension in production to run a
  test was not a trade worth making. The functions are proved to BUILD (the
  platform accepted and bundled them) and are not proved to RUN.

### Still open, by design
A template created through Settings **after** `0066` carries no visible
unsubscribe line unless whoever writes it includes `{{unsubscribe_url}}`;
nothing in the schema requires it. What holds regardless is the
`List-Unsubscribe` / `List-Unsubscribe-Post` pair, which `send-followups` sets
on **every** message from the recipient's own signed link. Making the visible
line unskippable is a change to the template form, not to a migration.

### Noticed in passing, NOT changed
`pin-reset-request` is deployed with **`verify_jwt: true`** while its own source
says it must be public — the person calling it is there BECAUSE they cannot
sign in, so there is no session to verify. That is the
exact failure mode this entry warns about for the two new functions, already
live on a third. Out of scope here; recorded so it is not found by a staff
member locked out.
