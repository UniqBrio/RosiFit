# Root Cause Register

> Every defect that reached a user, or that cost more than an hour to diagnose.
>
> **Append-only. Newest first. Never renumber. Never backfill.**
>
> Read before every bug fix, cited in every implementation plan, and consulted at every test run.
> Its value is entirely in having been kept from the start.

---

## Template

```markdown
## RC-000 — <one-line title>
**Date:** DD-MMM-YYYY  ·  **Severity:** S1 | S2 | S3 | S4  ·  **Modules:** <list>

**Symptom** — what was observed, in the words of whoever reported it.

**Root cause** — the reason it existed. Distinct from the symptom, and distinct from the file
where the error surfaced. One or two sentences.

**Fix** — what changed, and why that addresses the cause rather than the symptom.

**Files** — the paths touched.

**How to verify** — a specific instruction a future test run can execute to prove this has not
returned. This is the field that makes the register useful rather than historical.

**Recurrence risk** — where else this class can occur. If it is a pattern, say how many other
sites were found and how you searched. An unevidenced sweep did not happen.

**Prevention** — the rule, checklist item or gate that now catches it, **named as a path**.
Or, honestly: "no rung — prose only", and why a rung is not currently feasible.

**Process check** — would a correctly functioning process have caught this?
No → one line, done. Yes → the framework-update workflow ran, and here is what changed.
```

---

## Severity

| | |
|---|---|
| **S1** | Data loss, security exposure, or the application is unusable. Fix now. |
| **S2** | A major flow is broken with no workaround. Fix this release. |
| **S3** | A flow is degraded, or there is a workaround. Schedule it. |
| **S4** | Cosmetic or rare. Backlog. |

---

## Entries

> The four entries below were found **by this framework's own gates, while it was being built**.
> They are kept as worked examples of the format — and as evidence that the gates fire.
> RC-005 and RC-006 were found by the **fixtures**, during the evolution release (v1.1.0),
> before either defect ever reached an app.

---

## RC-013 — a dependency's Node build bundled into the app, and the build stayed green
**Date:** 04-Sep-2026 · **Severity:** S2 · **Modules:** `src/data/memberXlsx.ts`, `metro.config.js`

**Symptom** — reported from the running dev server, with a screenshot:

```
While trying to resolve module `async` from node_modules/archiver/lib/core.js,
the package node_modules/async/package.json was successfully found. However, this
package itself specifies a `main` module field that could not be resolved
(node_modules/async/dist/async.js). Indeed, none of these files exist:
```

**Root cause** — two things behind one message, and only the second is a defect.

The literal claim was false: `async/dist/async.js` does exist. The dev server was running while
`npm install exceljs` was mid-flight, so Metro read a half-written `node_modules`. That is a
race, and a restart clears it.

What it exposed is the real one. **exceljs ships two builds.** `main` is the Node build and
depends on `archiver`, `unzipper`, `tmp` and `readable-stream` — Node's filesystem and stream
stack. `browser` is the self-contained `dist/exceljs.min.js`. Metro was resolving the first, so
a React Native / web bundle was pulling in Node's zip and fs layers. On web it survived by
accident; on a native build it could never have worked.

**Why the gates did not catch it** — and this is the part worth keeping. `npm run typecheck`
passes: the *types* resolve from `index.d.ts` regardless of which build runs.
`npm run export` **passed too**, emitting `/member/import` at 33 KB, because Metro's web
resolution happened to find something for every specifier. Nothing in the pipeline asks *which
file* a dependency resolved to. So a wrong-half dependency reaches a user as a runtime error in
their browser, with a green build behind it.

**Fix** — `metro.config.js`, new, doing one thing: resolve `exceljs` to its browser build.
Scoped to that package deliberately — setting `resolverMainFields` to prefer `browser` globally
would change resolution for *every* dependency in the tree, `@supabase/supabase-js` included, to
fix one. And `memberXlsx.ts` makes exceljs a **type-only** import plus a lazy loader, so the
~950 KB browser build is fetched only when a workbook is actually built or read.

**Guard** — measurement of the emitted bundle, recorded in `TEST_SUMMARY.md`: `archiver` 0
files, `unzipper` 0, `tmp` 0, and `exceljs` split into its own 924 KB chunk. That is evidence,
not a rung — nothing re-checks it on the next change.

**Recurrence risk** — moderate, and it applies to *any* dual-build dependency this app adds.
The trap is that both halves typecheck and both may bundle; only one runs.

**Prevention** — prose only, honestly. A real rung would assert that no Node-only module name
appears in `dist/_expo/static/js/web/` after an export, which is cheap and would have caught
this the moment exceljs landed. Named here so the next reader can weigh whether to build it,
rather than discovering the class a third time.

---

## RC-012 — two member screens read the fixture, so one showed the wrong person
**Date:** 04-Sep-2026 · **Severity:** S1 · **Modules:** `app/member/edit.tsx`, `app/member/[id].tsx`

**Symptom** — reported as *"Edit member is not working, it's opening the add member form instead."*
Tapping Edit on a real member opened a blank form titled **"Welcome a new member"**.

**Root cause** — both screens resolved the member against `MEMBERS`, the **fixture array**, rather
than against the live list:

```ts
const existing = MEMBERS.find(m => m.id === id);              // member/edit
const index = Math.max(0, MEMBERS.findIndex(x => x.id === id));
const m = MEMBERS[index] ?? MEMBERS[0];                        // member/[id]
```

On live data no real id is in the fixture. In the edit form `existing` was always `undefined`, so
Edit rendered Add — and its Save would have **created a second record for somebody already on the
register**.

The detail screen was worse and nobody had reported it. `findIndex` returns `-1`, `Math.max`
clamps that to `0`, and the screen rendered **the first fixture member** — a different person's
name, course, attendance and missed streak — under the heading of whoever was tapped. A defensive
clamp turned "not found" into "here is someone else", confidently.

**Fix** — both read `useMembers`, the same source the list and the follow-up derivation use
(guardrail 1). The edit form seeds its fields from an effect once her record arrives, guarded by a
`seeded` flag so a refetch cannot overwrite a keystroke. The detail screen answers **loading** and
**missing** as separate states and never substitutes a neighbour.

**Guard** — the `?? MEMBERS[0]` fallback is gone and cannot come back without reintroducing the
fixture import, which no longer exists in either file.

**Recurrence risk** — high. `MEMBERS` is exported for the fixtures mode and imports cleanly
anywhere; nothing fails when a screen reaches for it. RC-010 recorded this exact class on the
Reports screen and explicitly noted `app/member/[id].tsx` as *"the same class of defect, out of
scope"*. It was left, and this is it arriving.

**Prevention** — prose only, and honestly so: `rung: scripts/audits/check-dead-weight.mjs` does
not cover this, and a lint rule banning the fixture import would also ban the fixtures mode that
needs it. The register entry is the guard. Named here so the next reader can weigh whether a
dedicated audit is worth it.

---

## RC-011 — every action taken through an Edge Function was logged as "System"
**Date:** 03-Sep-2026 · **Severity:** S2 · **Modules:** `supabase/migrations/0004_audit_logs.sql`, `supabase/functions/*`

**Symptom** — the audit log's *Modified by* column said **System** for every communication sent,
every attendance file uploaded, every match decision taken on an ambiguous row, and every staff
PIN issued or reset. Only writes the app made directly — a branch added, a member edited, a
course saved — carried a name.

**Root cause** — `audit_log()` derives its actor from `current_app_user_id()`, which reads
`auth.uid()`. Every Edge Function calls it on the **service-role** client, where `auth.uid()` is
null. So the actor column was written NULL and `actor_kind` fell through to `'anon'` — the label
an *unauthenticated* request carries. In an append-only table that by design cannot be corrected,
a batch of emails sent by the super admin was indistinguishable from a batch sent by nobody.

The identity was never missing. `send-followups` had `caller.id`, `csv-import` had `actorId`,
`commit_csv_import` had `p_actor` as a parameter and already wrote it into
`member_emails.added_by`, `member_aliases.confirmed_by` and `attendance_records`. Four functions
carried the actor into the data and dropped it on the way to the log.

Reproduced on the harness in one statement: `set local role service_role; select
public.audit_log('communication.batch_sent','email_batch','b1');` → null actor, kind `anon`.

**Fix** — `0023_audit_actor.sql` adds `audit_log_as(p_actor, ...)`, granted to `service_role`
**only**, and re-issues `commit_csv_import` so its five decision entries carry `p_actor`. Eleven
call sites across five functions now name the caller they had already authenticated. 16
assertions in `supabase/tests/17_audit_actor.sql`.

**Guard** — `audit_log_as` **raises** on a null actor rather than falling back to an unattributed
entry: a caller that reaches it having lost the identity fails loudly instead of writing "System"
into a table nobody can correct. It is not granted to `authenticated`, because a client that could
name its own actor could blame somebody else. Both are asserted, as is the fact that `audit_log()`
itself is **unchanged** — the old behaviour is pinned so a later edit cannot alter it silently.

**Deliberately not attributed** — the six calls in `auth-login`, `auth-bootstrap` and
`recovery-check` run *before* a session exists. Nobody has proved who they are, and naming the
account an attempt was aimed at would record her as having done something she may know nothing
about. Those keep `audit_log()`, with a comment at each saying why.

**Not fixed here** — the migration and the function changes are in the repository and applied to
the local harness. **Neither reaches the live project until someone deploys them**, so the live
audit log still says System.

**Recurrence risk** — high, and quiet. Nothing FAILS when the actor is dropped: the write
succeeds, the screen renders, and only a column is empty. Every future Edge Function starts from
a copy of an existing one, so the defect propagates by imitation.

**Prevention** — `rung: scripts/audits/check-audit-attribution.mjs`, wired into `npm run
audit:all`. A clean gate, not a ratchet: the backlog is zero and there is no honest reason for a
new unattributed call, which is exactly what a baseline would admit. The three pre-session
functions are exempt **by name, with their reason written beside them** in the check itself, so
adding a fourth is a deliberate edit somebody has to justify.

The gate has its own cases — `scripts/audits/check-audit-attribution.test.sh`, which EXECUTES it
against scratch trees and asserts its **output**, not only its exit code. A gate guarding a silent
defect is silent when it breaks: one stray character in its regex and it passes everything
forever, reporting "0 unattributed" about a tree it never read.

---

## RC-010 — Reports showed figures it had never counted
**Date:** 03-Sep-2026 · **Severity:** S2 · **Modules:** `app/(tabs)/reports.tsx`, `src/data/report.ts`

**Symptom** — the Reports screen showed per-course and per-branch attendance percentages, a
headline count and a period, and none of them moved when the academy's data did.

**Root cause** — every figure on the screen was a literal. `COURSE_BARS` and `BRANCH_BARS` were
hardcoded arrays ("Prenatal Flow 74%, 40 scheduled · 30 attended"), the headline said
"Attendance across 4 courses" whatever the academy ran, the total said `61%`, the period string
said "1–24 Aug" forever, and the Members scope read the `MEMBERS` fixture rather than the live
query. The screen was not computing a wrong answer; it was not computing.

Found while implementing a request to add an **export** to this screen. The export was the
reason it mattered: a CSV is an artefact somebody keeps and acts on months later, so exporting
these numbers would have turned a screen defect into a filed document.

**Fix** — the screen reads the same member rows the dashboard donut reads (guardrail 1, one
member source), aggregation moved to `src/data/report.ts`, a real period control replaced the
caption, and the week table was pointed at `useWeekRows`. 14 assertions in
`src/data/report.test.ts`, fail-first evidence in `TEST_SUMMARY.md`.

**Guard** — `reportRows` sums expected and attended per group rather than averaging its members'
percentages, and returns `null` — never `0` — where nothing was expected. Both are asserted.

**Not fixed here** — `app/member/[id].tsx` reads the `MEMBERS` fixture the same way. Noted, out
of scope, and the same class of defect.

---

## RC-009 — a genuine Google Meet export was refused, and the message blamed the file
**Date:** 03-Sep-2026 · **Severity:** S1 · **Modules:** `src/data/meetCsv.ts` (was `src/data/csv.ts`), `app/upload.tsx`

**Symptom** — uploading a real Google Meet attendance export produced *"That file has no “Full
Name” column. RosiFit reads the Google Meet export: Full Name, First Seen, Time in Call."* The
file was correct and had that column.

**Root cause** — `parseMeetCsv` read `lines[0]` as the header row. A Meet attendance export does
not begin with the table: it writes the meeting code and the created and ended times first, and
the `Full Name` header comes after them. So the header search never looked at the header line.

S1 because attendance is the product's one irreplaceable input and this blocked it completely
for the file the product tells people to use — while asserting the file was at fault, which
sends the operator to check Meet rather than RosiFit.

**Fix** — `findHeader` locates the header wherever Meet put it; a file that does start with the
header still parses (index 0, no preamble). Reading past the preamble means reading it, so the
meeting code and times are now captured as `MeetMeta` and shown on the upload screen's "Mapped
to this session" panel — the last point in the flow where a wrong file can be noticed, since
everything after it matches names without looking at which meeting the rows came from.

**Guard** — 23 assertions in `src/data/meetCsv.test.ts`, including a preamble row never being
imported as a member ("Meeting code" as a person's name), and the local-day rule that stops an
11:30pm session being filed under the next day. Observed failing against the pre-fix parser: 6
of 23, recorded in `TEST_SUMMARY.md`.

**Why it was not caught** — the parsing lived in `src/data/csv.ts` alongside `document` and
`FileReader`, so it was outside `scripts/tsconfig.json`'s DOM-free program and could not be
unit-tested at all. The pure parsing is now `src/data/meetCsv.ts`; `csv.ts` keeps only the
browser halves. The same split as `csvFormat.ts`, and for the same reason.

---

## RC-008 — Add Course reported a save it had never attempted
**Date:** 02-Sep-2026 · **Severity:** S2 · **Modules:** `app/course/edit.tsx`, `src/data/repository.ts`

**Symptom** — Reported by the repo owner: *"Add course is not working, it says course is saved but
course is not getting stored in supabase."*

**Root cause** — `save()` in `app/course/edit.tsx` was `flash(...)` followed by `router.back()`.
There was no write of any kind — no Supabase call, no Edge Function, not even a mutation of the
fixture list. The screen was built as a layout with a plausible confirmation and the persistence
was never added; the confirmation is what made that invisible. A form that says "saved"
unconditionally is indistinguishable from a working one until somebody goes looking for the
record, which is why this survived a build, a typecheck, three audits and a visual review.

Two things hid it further. `.env` did not exist, so `isConfigured` was false and the app was on
fixtures — a real write would have been a no-op anyway. And the edit screen read `COURSE_LIST`
from `src/data/mock.ts` directly rather than the repository, so it could not have opened a
database-backed course to edit either.

**Fix** — `repository.createCourse` / `updateCourse` do the write and the screen awaits them.
Direct PostgREST, not an Edge Function: 0005 already grants `authenticated` INSERT/UPDATE on
`public.courses` behind `is_super_admin() and is_subscription_writable()`, and `audit_courses`
fires either way — an Edge Function would only add a second place for that rule to drift. A
refusal is rendered on the screen instead of being swallowed. An RLS-refused UPDATE returns **no
rows rather than an error**, so that case is checked explicitly, or the same false "saved" would
have come back by another route. `onCoursesChanged` notifies every mounted `useCourses`, because
a saved course missing from the list it was saved to reads exactly like a save that did nothing.

**Files** — `app/course/edit.tsx`, `src/data/repository.ts`, `src/data/hooks.ts`, `.env`

**How to verify** — Sign in as the super admin, add a course, and read it back:
`GET {SUPABASE_URL}/rest/v1/courses?select=name&name=eq.<name>` with the session's JWT. Then sign
in as a non-super-admin staff member and add one: the screen must show the refusal and the row
must not exist. Both are the point — a screen that cannot report a refusal is the defect.

**Recurrence risk** — High, and it is a class rather than an incident. Every other "saves" in this
app is the same shape and was written the same way: `app/holiday.tsx` (apply), `app/member/edit.tsx`
(save), `app/course/rules.tsx`, `app/staff/add.tsx`, `app/templates.tsx`. **Each of these still
flashes a confirmation for a write that does not happen.** They are unfixed, deliberately — they
were outside the reported defect — and they are recorded here and in `TECH_DEBT.md` so the next
person does not have to rediscover each one from a user report.

**Prevention** — A confirmation may only be emitted by the resolution of a write. Where there is no
write yet, the screen says so in the words the user needs ("saved on this device only — the academy
database is not configured"), which is what `dataSource` is read for in `app/course/edit.tsx`.

**Process check** — **Yes.** Five gates, three ratcheted audits and a contrast checker all passed
over a form that persisted nothing. Every one of them examines the code's shape; none executes a
user journey and asserts on the database afterwards. The gate has a G8 "Functional / integration"
step and it has been FAILing on a missing `test:functional` script since before this change — the
one step that could have caught this is the one that has never run.

---

## RC-007 — Every narrow table grant in 0002-0010 was a no-op, and the harness could not see it
**Date:** 02-Sep-2026  ·  **Severity:** S1  ·  **Modules:** supabase/migrations, db/harness

**Symptom** — a live-project audit found `authenticated` holding
`DELETE, INSERT, SELECT, TRUNCATE, UPDATE` on 28 of 30 tables, and `anon` holding all of the same
on `user_preferences` — while RBAC_MATRIX and FEATURE_TRUTH both stated, as a guarantee, that
"`authenticated` holds no write grant on the engine tables". 135 assertions were passing.

**Root cause** — Supabase ships DEFAULT PRIVILEGES granting ALL on every new `public` object
**directly to `anon` and `authenticated`**, not through the PUBLIC pseudo-role. Every table was
therefore fully open the instant it was created, and the narrow `grant select` / `grant insert,
update` statements that followed added nothing to a grant that already included everything. Only
the `revoke all ... from anon` lines did any work — which is exactly why `anon` was clean
everywhere except `user_preferences`, the one migration with no revoke. The same root cause was
found and fixed for FUNCTIONS in 0012; nobody went back for the tables.

The reason it survived 135 green assertions is the second half: `000_local_shim.sql` did not
reproduce those default privileges, so **the harness was stricter than production**. Every grant
assertion was vacuously true there. A test environment that is safer than production cannot
prove a claim about production.

**Fix** — `0015_repair_table_grants.sql` revokes everything from `anon` and `authenticated` and
re-grants exactly what each creating migration asked for, restores the column-level
`update (status, cancellation_reason)` on `sessions`, forces RLS on `user_preferences`, and
removes the `postgres`-owned default-privilege entry so the next table starts closed. The shim
now sets those default privileges, so the defect is reproducible before it is fixed.

**Files** — `supabase/migrations/0015_repair_table_grants.sql`, `db/harness/000_local_shim.sql`,
`supabase/tests/09_grants.sql`.

**How to verify** — `npm run test:db`. `09_grants.sql` compares `authenticated`'s privileges
against the intended set table by table and names any that differ; it asserts `sessions` carries
UPDATE on exactly `status, cancellation_reason`; and it creates a throwaway table to prove a NEW
one starts with no `anon`/`authenticated` grant. Revert 0015 and those assertions fail.

**Recurrence risk** — the class is "a grant the platform made that a migration did not know to
take away". Searched with `information_schema.role_table_grants` and `pg_default_acl` across all
30 tables and both client roles; the remaining sites are the SECURITY DEFINER functions, already
closed by 0011/0012, and the `supabase_admin`-owned default ACL, which governs only objects
created by that role and not by our migrations. The default-privilege revoke in 0015 closes the
class for tables rather than the instances.

**What was actually reachable** — RLS refused nearly all of it, because a write with no permissive
policy is denied whatever the grant says. Two things were real. `sessions` had a table-wide UPDATE
where 0007 intended two columns, and `sessions_status_update` is a row predicate, so any signed-in
active staff member could rewrite `present_count`, `expected_count`, `session_date` or
`deleted_at` — attendance figures, from the client, which RBAC_MATRIX forbids outright. And a
staff `SELECT` on `super_admin_recovery` was ACCEPTED (RLS returned zero rows) where
`01_auth.sql` asserted it was REFUSED; no hash could ever be read, so nothing leaked, but that
assertion was green for a reason that did not hold in production. Nothing was exploited: the
project has zero `app_users` rows, so no session has ever existed. It would have become live with
the first sign-in.

**Prevention** — `supabase/tests/09_grants.sql`, executed by `db/harness/test.sh` and by the
`db-harness` job in `.github/workflows/ci.yml`. The rung only exists because the shim was made
faithful first; the assertion and the fidelity are one control, not two.

**Process check** — **Yes**, a correctly functioning process would have caught this. ENVIRONMENTS
rule 4 requires schema parity to be "proven by reconstruction", and the harness did reconstruct —
but only what the migrations wrote, never what the platform granted underneath them. The rule now
reads on a shim that reproduces the platform's own defaults. The wider lesson is recorded rather
than assumed: a harness is only evidence about production to the extent it reproduces
production's defaults, and one that is *stricter* produces false greens, which are worse than
reds.

---

## RC-006 — writeBaseline glued the first entry onto the header
**Date:** 28-Aug-2026 · **Severity:** S2 · **Modules:** ratchet engine (all baselined gates)

**Symptom** — `fixtures/with-debt` failed conformance: an audit re-run immediately after
`--write-baseline` reported the just-baselined violation as NEW.

**Root cause** — `writeBaseline`'s header array ends with `''` to produce the final newline, but
`.filter(Boolean)` treats `''` as false and stripped it — gluing the first entry onto the last
comment line, where `readBaseline` discarded it as a comment. Every 0-entry (clean) baseline
masked the bug; the first 1-entry baseline exposed it.

**Fix** — `.filter((x) => x !== null)`. All framework baselines regenerated with the fixed writer.

**Files** — `scripts/lib/ratchet.mjs`

**How to verify** — write a 1-entry baseline with any audit's `--write-baseline`, re-run the
audit: exit 0, "none new". `fixtures/with-debt` pins this permanently.

**Recurrence risk** — every consumer of `writeBaseline` shared the defect; one fix covers all.
Sweep evidence: `grep -rn "filter(Boolean)" scripts/` → 0 remaining matches.

**Prevention** — rung: `scripts/conformance.mjs` (with-debt checks) + `scripts/audits/check-backward-compat.mjs`.

**Process check** — **Yes.** No gate ever exercised a NON-EMPTY baseline round-trip; all the
framework's own baselines were clean, so the writer's output was never read back with content.
The fixture suite now does exactly that on every change — that is the process fix, shipped in
the same release.

---

## RC-005 — the first upgrade after adoption clobbered pre-existing app edits
**Date:** 28-Aug-2026 · **Severity:** S1 · **Modules:** lineage, upgrade

**Symptom** — `fixtures/diverged` failed conformance: its deliberate seed-file modification did
not survive an upgrade — the divergence marker was overwritten.

**Root cause** — `lineage --init` recorded already-modified files as `pristine` ("today's hash is
your baseline"). `upgrade` then read *pristine + seed differs* as "the framework changed this"
and auto-applied — but the difference was the APP's edit, made before lineage existed. Two
different histories collapsed into one status.

**Fix** — `--init` compares each file against the current seed and records differing files as
`adopted-modified`; `statusOf` treats that status as sticky `modified`, so such files always
route to review, never to auto-apply.

**Files** — `scripts/lib/lineage.mjs`, `scripts/lineage.mjs`

**How to verify** — adopt an app whose seed file carries an edit, upgrade with a changed seed:
the edit must survive and an incoming copy must appear. `fixtures/diverged` pins this; the
injected-defect run in TEST_SUMMARY.md shows the audit going red without the fix.

**Recurrence risk** — any status collapse where two histories share one label. The scaffolder
writes seed-identical files, so it cannot exhibit this; stated, not assumed.

**Prevention** — rung: `scripts/conformance.mjs` (diverged checks) + `scripts/upgrade.test.sh`.

**Process check** — **Yes and no.** The upgrade test suite existed and passed — but only
exercised scaffolder-born apps, never adopted ones. The fixture existed precisely to cover the
adoption path, and it fired on first run. The process worked as designed; the lesson (a test
suite covers the paths it was written from) is already FP'd under "a passing check proves only
what it looked at".

---

## RC-004 — The gate runner reported a missing tool as FAIL
**Date:** 28-Aug-2026 · **Severity:** S3 · **Modules:** gate runner

**Symptom** — On a machine where the type-checker could not be installed, the gate reported
`VERDICT: FAIL` with an npm registry error pasted into the report, as though the code were broken.

**Root cause** — `run()` classified any non-zero exit as FAIL, and only a literal `ENOENT`
launch failure as BLOCKED. A tool that launches successfully and then fails to *fetch itself*
exits non-zero like any other failure, so "this machine cannot check your code" was
indistinguishable from "your code is wrong".

**Fix** — An `UNAVAILABLE` signature list (registry errors, missing modules, unresolvable
executables, missing scripts) classifies those outputs as **BLOCKED** with the tool named.

**Files** — `scripts/gate-runner.mjs`

**How to verify** — Run the gate with a dependency uninstalled. The step must read
`BLOCKED - tooling unavailable`, the verdict must be `BLOCKED`, and the exit code must be 3.

**Recurrence risk** — Any step shelling out to an installed tool. All nine steps share `run()`,
so the fix is at the shared boundary and covers every one.

**Prevention** — The three-valued contract now has a written rule in both directions: a missing
tool is never FAIL *and* never PASS. `rung: scripts/gate-runner.mjs` (the `unavailable()`
classifier); prose in [docs/16](../16-TESTING-AND-VALIDATION.md) §2.

**Process check** — **Yes.** The framework's own principle — "fail open on tooling, block only
on evidence" — was documented for the ratchets and not applied to the runner. Corrected in
[docs/17](../17-ENFORCEMENT-RATCHETS.md) §4, which now states the rule applies to every gate.

---

## RC-003 — The rule-coverage audit was blind to `.tsx` references
**Date:** 28-Aug-2026 · **Severity:** S2 · **Modules:** rule-coverage audit

**Symptom** — Ten canonical-pattern rows were reported as `PROSE-ONLY` — declared, accepted debt
— when in fact each named a component file that **did not exist**. The audit under-reported the
exact defect class it exists to find.

**Root cause** — The rung pattern matched `.spec.ts|.test.ts|.mjs|.py|.sh|.ts` only. A rule
pointing at `src/components/Dialog.tsx` therefore matched nothing, and "no rung found" was
reported as the benign outcome rather than the unverified claim it was.

**Fix** — Extended the pattern to `.tsx|.jsx|.json|.css`. Eight rows immediately reclassified as
`DEAD-RUNG`; all eight were then repaired by creating the referenced files.

**Files** — `scripts/audits/check-rule-coverage.mjs`, `docs/registers/CANONICAL_PATTERNS.md`,
eight new files under `starter/src/`.

**How to verify** — `node scripts/audits/check-rule-coverage.mjs --report` reports
`dead/dupe: 0` and `prose only: 0`. Add a row citing a non-existent `.tsx` file; it must appear
as `DEAD-RUNG`.

**Recurrence risk** — Any file type a future rule might cite. The pattern is now one list in one
place.

**Prevention** — `rung: scripts/audits/check-rule-coverage.mjs`, ratcheted.

**Process check** — **Yes.** A detector's own coverage is a coverage question, and nothing was
asking it. This is the general form of *"a passing check proves only what it looked at"*
([docs/09](../09-CODE-QUALITY.md) D-3) applied to the detector itself.

---

## RC-002 — The documentation guard was live but vacuous
**Date:** 28-Aug-2026 · **Severity:** S2 · **Modules:** commit guards

**Symptom** — The guard reachability test expected guard G5 to block a commit that touched
application code with no documentation. It passed the commit instead.

**Root cause** — G5 accepted **any** `.md` file as documentation, and `TEST_SUMMARY.md` is a
`.md` file written by the gate runner. Since G2 already requires a gate run, every compliant
commit staged `TEST_SUMMARY.md` — and satisfied the documentation guard for free. The guard was
reachable, executing, and could never fire.

**Fix** — G5 now excludes `TEST_SUMMARY.md`. It is a gate **artifact**, not a description of
behaviour.

**Files** — `scripts/hooks/pre-commit-guard.sh`

**How to verify** — `bash scripts/hooks/guard-reachability.test.sh` — the case
*"the LAST guard still fires"* must return exit 2, and *"a real doc satisfies it"* exit 0.

**Recurrence risk** — Any guard whose condition can be satisfied by an artifact another guard
already requires. Guards are ordered, so a later guard must never accept an earlier guard's output.

**Prevention** — `rung: scripts/hooks/guard-reachability.test.sh`, which executes each guard
against a scratch repository.

**Process check** — **Yes.** A guard that cannot fire is worse than an absent one: it reports
coverage. Only executing it revealed this — a source scan would have shown a correct-looking
guard. Recorded in [docs/17](../17-ENFORCEMENT-RATCHETS.md) §5.

---

## RC-001 — A reachability test asserted on the wrong guard
**Date:** 28-Aug-2026 · **Severity:** S3 · **Modules:** guard tests

**Symptom** — The case *"G1's escape token releases it"* failed: the commit was still blocked.

**Root cause** — The scratch repository satisfied G1's escape token but not G2's precondition, so
the blocking exit came from **G2**. The test's assertion could not distinguish which guard
produced the exit code, so a green result would have proven nothing about G1.

**Fix** — The scratch repository now satisfies every downstream guard's precondition, so a pass
can only come from the token under test.

**Files** — `scripts/hooks/guard-reachability.test.sh`

**How to verify** — Remove the `CASES-NA:` token from that case; it must fail. Restore it; it
must pass.

**Recurrence risk** — Every test of one item in an ordered chain. The pattern: isolate the item
under test by satisfying everything else.

**Prevention** — Prose: *"assert on the RESULT, not the precondition"*
([docs/09](../09-CODE-QUALITY.md) D-8), plus a comment at the case itself.

**Process check** — **No.** The test found the defect on its first run, which is the outcome the
test was written for. The process worked.
