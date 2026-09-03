# Changelog

## Unreleased — the 3-Sep canvas, and two screens that were not counting

The design canvas was revised on 3 Sep. Six sections are new — **Course detail**, **Delete
course confirm**, **Branches**, **Notifications**, **Confirm send**, and an **Audit log** rebuilt
as a scrollable table — and **Add holiday** is gone from it, its job folded into the calendar's
day sheet. Eighteen existing sections changed too. `design/RosiFit App.dc.html` is updated to
that revision and is the spec the rest of this entry is measured against.

**Branches has a screen.** More offered a "Branches" row that flashed the names in a toast and
went nowhere. It now adds a branch, counts the courses and members at each, and removes one.
**0019** supplies the two things a client must not decide: the unique `code`, derived from the
name by a trigger so two clients adding at once cannot collide, and the refusal to remove a
branch that still has live offerings or scopes a holiday — both would go on affecting sessions
at a branch no read can see. Removal is a soft delete through the policies **0005** already
wrote, so no new grant or policy is involved. 11 assertions in
`supabase/tests/13_branch_add_remove.sql`.

**A real Google Meet export was being refused** — see **RC-009**. `parseMeetCsv` read `lines[0]`
as the header, and a Meet export writes the meeting code and the created and ended times first.
The file was right, the reader was wrong, and the error message blamed the file. Fixed, and the
preamble it now reads past is captured and shown on the upload screen's "Mapped to this
session" panel: the last point in the flow where a wrong file can be caught, since everything
after it matches names without ever looking at which meeting the rows came from. A definite
date mismatch warns; an unreadable or absent date says it cannot check, because warning when
nothing can be checked trains people past the warning that matters.

**Reports was not counting anything** — see **RC-010**. It was asked for an export; every figure
on it was a literal, including the Members scope reading the `MEMBERS` fixture. A CSV of those
numbers would have become a document somebody keeps, so the data source was fixed first. It now
reads the same member rows the dashboard reads, aggregates them in `src/data/report.ts`, and
exports what is on screen — including the words: a row the screen calls "no sessions scheduled"
is not exported as `0%`.

**The dashboard is the chart the canvas draws, and nothing else.** The hero "N members need
you", the "What needs you" list, the quick links, the week table and the week strip are gone.
Each was a second place a figure lived; the week table counted from a different query than the
chart beside it while admitting its own filters did not reach it; and the week strip rendered
`WEEK_STRIP`, a hardcoded fixture, on the live dashboard. Everything removed is still reachable
elsewhere.

**Smaller, from the same revision.** A branch filter on Courses, asking the offerings so a
course running at two branches appears under both. A hex field on Appearance that contributes
its **hue** and nothing else — the generator darkens it until white text clears 4.5:1, so a hex
taken verbatim would walk round guardrail 2; typed as pure green it ships as `#148514`.
Numbered preset/custom headings. A way back from Member detail, which had none, and
`router.back()` on Match review, which had been replacing its history entry.

**Ratchets paid down, not baselined:** hardcoded colours 13 → 11 and test ids 26 → 24 in `app/`.
57 unit assertions added (56 → 113). The DB harness ran for the first time — Postgres 16 is
available in this session — with 215 assertions passing; two pre-existing failures are recorded
in `TEST_SUMMARY.md` and proved pre-existing rather than assumed to be.

**The gate verdict is unchanged: FAIL, as it was on main.** G1/G2/G3 need
`design/tokens.json`, which has never been committed; G6 is blocked because eslint is not a
dependency; G8 runs a `test:functional` script that does not exist. `TEST_SUMMARY.md` says
which classes are therefore unverified.

---

## Unreleased — the three migrations the live project never got

**Add Member fails in the live app.** It says so, at least: *"Could not find the function
public.create_member(p_aliases, p_emails, p_full_name, p_joined_on, p_offering_id, p_weekdays)
in the schema cache. Nothing has been saved."* The client is not wrong — `createMember` in
`src/data/repository.ts` sends exactly the six named arguments **0016** declares. The function
is not there.

**Nor are two others.** Read back from the live schema rather than assumed: the project holds
0001–0015 and stops. `create_member` (0016), the `holidays` triggers and DELETE policy (0017)
and `set_offering_schedule` (0018) are all absent. Three forms therefore fail the same way —
adding a member, deleting a holiday, and giving a course its days — and the last entry below
already said as much about 0018 alone. It was true of all three.

**`supabase db push` cannot place them.** The live migration-history table holds timestamp-named
versions from an earlier apply route (`20260901134714` …) while `supabase/migrations/` is
numbered `0001`…`0018`; the CLI refuses that mismatch outright rather than guessing which is
which. Repairing that history is a decision about the live project in its own right, not
something to do on the way past a form bug.

**`supabase/apply_0016_0018.sql`** is the paste-ready alternative, following the
`supabase/apply_all.sql` convention already in the repo: 0016, 0017 and 0018 verbatim and in
order, inside one transaction, with a PostgREST schema-cache reload after the commit. Run it
**once** — 0017's triggers and policy are bare `CREATE`s, so a second run fails loudly instead
of half-applying. Nothing here is application code; nothing in the app was wrong.

**Still not applied.** Only the repo owner runs it.

## Unreleased — a course can be given the days it actually runs

**Frequency was orphaned intent.** The course form collects "3 sessions per week" and says,
correctly, that weekdays live on the offering — "create an offering, the course at one branch,
and set its days there". There was no such screen, and no write path either: migration 0005
created `offering_schedules`, called it in its own header *the source of expected attendance*,
and deliberately left it with a read policy and **no** insert or update policy, noting that a
schedule write "has to be validated against completed sessions first". The policy was written;
the RPC it deferred to never was. So a course could state a frequency and never acquire the days
that frequency is an intent *about* — no weekdays means no sessions, no expected attendance and
no follow-up. The stepper worked perfectly, which is what made it hard to see: the missing piece
was not the control, it was everywhere the control was supposed to lead.

Migration **0018** `set_offering_schedule` is that write path. It restates the super-admin and
subscription checks inside the function, because `SECURITY DEFINER` bypasses RLS and would
otherwise be a hole straight through the policy the organisation tables carry. It refuses any
`effective_from` on or before the offering's last **completed** session — a completed session has
a frozen expected set, and moving a schedule back over one would leave history describing days
the schedule no longer contains — and it names the first date that would work rather than
silently clamping. Changes **version**: the open schedule is closed the day before the new one
starts. It does not generate sessions; that is a separate decision and this does not quietly make
it. **New screen** `app/offering/edit.tsx`, and in the Courses tab each offering is now the way
in to editing its days rather than dead text pointing at a "there" that did not exist.

**A frequency/weekday mismatch warns and is never reconciled**, which 0005's own column comment
has required from the start and no UI could honour until now. Pick two days against a stated
three and the screen says both numbers stand and attendance counts the two.

**One resolver for "which schedule version is in force".** `fetchCourses` and the new
`fetchOfferings` each carried their own copy of the effective-dating arithmetic and had to agree
by hand. They now share `src/data/schedule.ts`, whose cases caught two real defects in the
inline version they replace: an exclusive `effective_to` leaves the changeover day covered by
neither version — one day on which every member is expected at nothing, with nothing to see —
and a plain overwrite loop lets row order decide which version wins.

**0018 is committed but NOT applied.** The live schema is 0001–0015. Applying it is the repo
owner's call.

## Unreleased — holidays can be removed, and adding one now writes

**A holiday can be deleted.** C-92 has promised since the beginning that removing a holiday
returns its sessions to `scheduled`, and `remove_holiday()` has done exactly that since
migration 0007 — but nothing could reach it. There was no list to delete from, no DELETE grant
and no DELETE policy on `public.holidays`, and 0011/0012 had deliberately taken
`apply_holiday`/`remove_holiday` away from `authenticated`. A holiday could be created and never
removed. Migration **0017** closes it with triggers on `public.holidays` rather than a new grant:
inserting the row marks its sessions, deleting the row restores them, and the two RPCs stay
service_role-only as direct calls, so no staff member can rewrite the status of every session in
a date range. The delete trigger is `BEFORE DELETE` because `sessions.holiday_id` has a foreign
key with no `ON DELETE` clause — an `AFTER` trigger does not merely read worse there, it fails.

**Add Holiday wrote nothing before this.** It flashed `"<name> applied · N sessions marked
Holiday"` and navigated back; N was the literal `14` or `6`, not a count of anything. Same defect
as Add Course (**RC-008**), and the `holiday` row of **TD-012**. It now writes the row, shows the
real impact from `preview_holiday()` — the same query `apply_holiday()` runs, so the number shown
cannot disagree with the number marked — and renders an RLS refusal instead of swallowing it.
The scope list reads the academy's real branches instead of a hardcoded `'Coimbatore'`, and a
scope naming a branch that does not exist is refused rather than falling through to `branch_id
null`, which the column reads as *every* branch.

**Adding a member never saved either** — written by a parallel session, carried in the same
commit. `app/member/edit.tsx` flashed `"<name> added"` and navigated back; her record, her display
names, her addresses and her enrolment existed only on screen. It is an RPC (**0016**
`create_member`) rather than a direct write, and not by preference: `member_enrollments` and
`member_schedules` carry a read policy and nothing else, so a member added by direct insert lands
with **no enrolment** — expected at no session, in no follow-up list, counted by nobody. That is
the same lie one layer down. `create_member` writes her record, her aliases, her addresses with
the first as primary, her enrolment and her optional weekday override in one transaction, or none
of them. Changing an existing member is deliberately still not fixed: that needs an enrolment RPC
that does not exist, so on that path the button is disabled and says so.

**⚠ Migrations 0016 and 0017 are not applied anywhere.** The live Supabase project is never an automated
target without explicit instruction (`CLAUDE.md`), and the local harness cannot run on the
adopting machine (**TD-010**). Until they are applied, the delete button and the Add Member save are both present and
will be refused by PostgREST, because neither the DELETE grant nor `create_member` exists yet.
On screen that reads as a permissions bug rather than a missing migration (**TD-013**).


## Unreleased — the attendance register, and a form that only said it saved

**Add Course wrote nothing.** `app/course/edit.tsx` flashed "saved" and navigated back; there
was no write of any kind behind it. Fixed through `repository.createCourse` / `updateCourse`,
with the RLS refusal rendered rather than swallowed, and every mounted course list revalidated
so a saved course appears because it is in the database. Recorded as **RC-008**, together with
the five other forms in the app that still have the same shape (**TD-012**) — they are unfixed
and now written down rather than waiting to be found one user report at a time.

**Sessions → Attendance.** The month calendar answered "which days ran"; the register people
read answers "who attended what, and when". `app/(tabs)/attendance.tsx` lists attendance facts
grouped by day, filtered by branch, course, status and period (four presets plus a custom
range), with a member/code search. Every figure on it is a count of the rows below it.

**Overview leads the chip row**, so the dashboard is one tap from every other screen rather
than reachable only from the bar at the bottom of a long scroll. The row scrolls now that there
are five chips.

**Upload attendance replaces Add Holiday** as the dashboard's quick action — a festival is
decided a few times a year, an attendance file is due after every session. Add Holiday keeps
its one-tap route from the header's + sheet.

**Date and time pickers** (`src/components/DateTimePicker.tsx`) on the course, holiday and
member forms, replacing free text with a `dd-MMM-yy` placeholder. Values are ISO and 24-hour —
what `date` and `time` columns take — so there is no format to get wrong.

**The screens show the real signed-in user** — written by a parallel session and carried in the
same commit. `useIdentity` in `src/data/session.ts` replaces the `'Priya Menon'` /
`'+91 80563 29742'` literals that the profile, the More card and the change-number screen shipped,
so they no longer show the fixture persona to whoever is actually signed in. More also hides the
rows a staff account cannot read at all — `app_users`, `audit_logs` and `security_questions` are
`is_super_admin()` — while rows staff can read but not write stay visible on purpose.

**Sign Out now ends the session.** Profile and More both called `router.replace('/')` and left the
Supabase session alive, so the next launch walked straight back in as the previous account — the
most user-visible of these three, and a security-shaped one on a shared phone, which is the
deployment this app has. Both now `await signOut()` first. Profile's "Change My PIN" also pushed
`/set-pin` without `?for=self`, taking the first-PIN branch and landing on the dashboard with
"welcome to RosiFit" instead of returning with "PIN updated".

**A JS test suite exists.** `node:test` under `tsx`, `npm run test:unit`, wired into
`npm run check`. Gate step G7 moves FAIL → PASS; TD-005 is partly paid.


## 1.3.0 — CP-21, wide tables

More than three columns means the user chooses which show and in what order, and the choice
persists. Gate step G11 (`audit:columns`, ratcheted), a reference `ColumnControl` +
`useColumnPrefs` in the starter, seven unit cases on `reconcileOrder`, and a review item for the
dynamically-built tables the audit cannot see. Promoted from `academies-dashboard` at n=1 by
owner override — recorded as such in `CANDIDATES.md`.

## 1.2.0 — the adoption-safety release

See `UPGRADES.md` (the canonical per-version entry). Everything found by running v1.1.0
against a real adopted app and a workspace scaffold: the workspace gate and commit guards now
actually run, adopted apps are offered seed files instead of being buried in them
(`--decline` to refuse, `--refresh` to take), the backward-compat gate can no longer pass on
stale results, and Half A now genuinely reaches standalone apps on upgrade.

## 1.1.0 — the evolution release

See `UPGRADES.md` (the canonical per-version entry) and `docs/22-FRAMEWORK-EVOLUTION.md`.
Lineage + upgrade + promotion + fixtures + backward-compat gate; quadruple close-out.
The fixtures caught RC-005 (adoption clobbering) and RC-006 (baseline first-entry loss)
before release.

## 1.0.0

Initial release.

### The process
- Eight-stage SDLC with six gates, and seven track runbooks (feature, enhance, bug, refactor,
  triage, brainstorm, framework update) plus a test gate.
- The learning loop: every root cause asks whether the process should have caught it, and the
  process repairs itself when the answer is yes.
- The rule budget: cheapest workable enforcement level, and a screen checklist capped at 20 items.

### The theme system
- `design/tokens.json` as the single source of truth for every colour and scale.
- Generated CSS custom properties and typed tokens; hand-editing the output is blocked.
- Three-state theme preference (light / dark / system) with no flash of the wrong theme.
- 92 contrast assertions across both themes, all passing, as a build gate.
- Per-theme brand assets, verified to exist, switched by CSS rather than JavaScript.

### The gates
- A generic ratchet engine: adopt any rule today, on any codebase, backlog can only shrink.
- Contrast · theme sync · theme assets · hard-coded colours · test-id coverage · rule coverage.
- A three-valued gate runner where BLOCKED is a verdict and green-by-omission is impossible.
- Seven commit guards with per-guard escape tokens, and an executable proof that each can fire —
  including a type-error ratchet, a case-loss guard, and a guard that holds *process* changes to
  the same test-case obligation as application code.

### The wiring (`.claude/` + `CLAUDE.md`)
- `CLAUDE.md` at the root — binding rules, read before every task, each stating what, **why**, and
  **where it is honoured in code**.
- `.claude/settings.json` wires the commit guards as a `PreToolUse` hook, so they run in **every**
  session — including the ad-hoc fix that never opened a runbook. Committed, because settings that
  live on one machine enforce nothing on anyone else.
- Nine slash commands, written as **pointers to `workflows/`, never copies** — duplicating a
  runbook guarantees two versions, and the drifted one is always the one someone finds first.
- Eleven review sub-agents, each with a scope, a boundary, and a machine-readable verdict.
- A hook-protocol adapter that recovers escape tokens from the **command** at commit time and from
  the **log range** at push time, because a guard must read the same *change* in both modes, not
  the same *string*.
- Nine executable adapter tests: a correct guard behind a broken adapter enforces nothing, and
  looks installed.
- `new-app.mjs` carries all of it into every scaffolded application.

### The starter
- Pure/impure split error taxonomy with a reference unit spec.
- Fail-closed API handler, config with fail-fast validation, signature-based logging.
- Reference migration, cloud-function pipeline, and three test tiers.
