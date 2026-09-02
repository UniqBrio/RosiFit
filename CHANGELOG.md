# Changelog

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
