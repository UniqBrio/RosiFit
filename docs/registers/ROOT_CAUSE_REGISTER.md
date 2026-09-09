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

## RC-038 — a report re-uploaded untouched marks a future-dated leaver ACTIVE and clears their date
**Date:** 09-Sep-2026  ·  **Severity:** S3  ·  **Modules:** `src/data/statusImport.ts`, `src/data/reportSheets.ts`

**FOUND, NOT FIXED.** Logged here the day it was found, during the dd-mmm-yyyy
date-format change, which is not its cause and does not touch it. Recorded before it
is fixed because a defect nobody wrote down is a defect nobody remembers.

**Symptom** — a member stored inactive from a date that has not arrived yet (say
01-Dec-2026, entered in September) exports on the members report with Status
**Active**. Upload that report back with nothing typed into it, and Bulk Import
reports the row as an edit: it sets the member Active and clears the leaving date
that was scheduled for December. The academy's own file, sent back untouched, undoes
a departure somebody entered on purpose.

**Root cause** — the export and the reader read the Status column differently, and
each is right on its own terms. `memberDetailSheet` writes `statusOn(m, todayIso)` —
the status **on the day**, which is what a report about today should say, and a member
leaving in December is active in September. `wantedPair` compares that word against
`members.status`, the **stored** answer, and treats any difference as a cell somebody
typed in. For a future-dated leaver the two differ by construction, so an untouched
cell reads as an edit. Neither module is wrong about status; they are answering
different questions with one column.

**Fix** — none yet. The shape of it: the exported Status has to carry, or the reader
has to reconstruct, the fact that the difference is the DATE talking rather than a
person. Reading the exported status against `statusOn(m, todayIso)` instead of against
`m.status` closes it in one line and needs `todayIso` threaded into `wantedPair`,
which is already in `StatusContext`. That is a behaviour change to the importer and
belongs in its own change, with its own specs, not appended to a formatting one.

**Files** — `src/data/statusImport.ts` (`wantedPair`), `src/data/reportSheets.ts`
(`memberDetailSheet`, the Status cell).

**How to verify** — export a members report while a member holds a leaving date in the
future, upload the file back with no edits, and read the result. Correct behaviour is
"already correct" on that row. In specs: the fixture in `src/data/statusImport.test.ts`
→ "a report sent back exactly as exported still changes nothing", with the leaving date
moved from `2026-08-01` to a date after `TODAY`. It fails today; a comment in that spec
says why the fixture is dated the way it is.

**Recurrence risk** — this is the general shape of every derived-then-read-back column,
and this file has exactly one other: `Active from`, which is written from stored
`joined_on` with no derivation over it and so cannot drift. Searched
`src/data/reportSheets.ts` for every cell in `memberDetailSheet` computed from more than
the column it names; `statusOn` is the only one.

**Prevention** — no rung today. The nearest honest one is a spec over
`memberDetailSheet` → `validateStatusRows` driven by a fixture set that includes a
future-dated leaver, which is precisely the assertion above. Until that is made to pass
it is prose plus a dated comment in the spec file.

**Process check** — would a correct process have caught this? Yes, and the gap is
nameable: the round-trip spec that exists ("the report uploaded untouched changes
nothing at all") was written with three members and none of them future-dated, so it
proved the round trip for the cases somebody thought of. A round-trip spec is only as
good as the states in its fixture, and "one member in every state the column can hold"
is the rule that was missing.

---

## RC-037 — Bulk Import Inactive's refusal never named the button that would have worked

**Date:** 09-Sep-2026 · **Severity:** S3 · **Modules:** `supabase/migrations/0058`, member import

**Symptom** — `supabase/tests/42_bulk_set_member_dates.sql` failed from the day it was written,
at *"the refusal names the OTHER importer -- the one that does create members"*. The spec
aborted there, so the twenty assertions after it had never run either. In the app, a row naming
somebody not yet on the register came back **"not on the register — nothing of hers to change"**.

**Root cause** — Three defects in one string, and each is a rule this repo already holds:

1. **It did not name the other button.** The whole feature is a PAIR — `bulk_import_members`
   only creates, `bulk_set_member_dates` only updates — and the pair is only safe because the
   boundary between them is readable. The refusal is where that boundary is stated, and it
   stated nothing actionable: *"nothing to change"* tells the academy the file is wrong, when
   the file is fine and the member simply is not on the register yet.
2. **It disagreed with its own client mirror.** `src/data/statusImport.ts` refuses the identical
   row, before the file is ever sent, with *"not on the register — add them with Bulk Import
   first, this file only changes dates"*. The same row could therefore produce two different
   sentences depending on which half caught it first.
3. **It said "hers".** Member-facing copy is written about *the member* (CLAUDE.md standing
   rules); the academy is a women's academy, the software is not.

The spec was correct throughout and was never run: the harness needs a local Postgres, the
session that wrote 0058 had none, and the migration was applied to production unrehearsed.

**Fix** — `supabase/migrations/0059_import_refusal_names_the_other_button.sql`, additive because
0058 is already applied. The function is restated with one string changed, copied verbatim from
`statusImport.ts` so the two halves cannot drift again; `diff` against 0058 shows that string and
the function comment as the only differences.

**Files** — `supabase/migrations/0059_import_refusal_names_the_other_button.sql`,
`supabase/tests/42_bulk_set_member_dates.sql` (unchanged — it was right)

**How to verify** — `npm run test:db`; spec 42 runs to the end, 24/24. Before 0059 it aborts
after 3 assertions.

**Recurrence risk** — Every refusal that exists in two places: one in SQL for the bulk path, one
in TypeScript for the form. The client mirror is written first because it is cheap to test, and
the SQL copy is retyped rather than copied. The pattern to watch is a refusal whose wording is
load-bearing — where the sentence IS the feature, not decoration on it.

**Prevention** — The spec that catches it already existed. What was missing was running it:
a migration must not reach production before `npm run test:db` has replayed it on a fresh
harness (CLAUDE.md, *Supabase and migrations*). Recorded in TECH_DEBT as TD-010's real cost —
"no Postgres here" ended a rehearsal instead of postponing an apply.

**Process check** — **Yes.** The binding rule ("rehearsal is the local harness only", then show
the SQL and wait) was stated and was skipped, and the skip is what let a failing spec ship. The
rule needs no change; it needed following.

---

## RC-036 — the audit log had no coupling to the audit writers, so nine migrations of new actions reached the owner as codes and the deletions named nobody
**Date:** 08-Sep-2026  ·  **Severity:** S2  ·  **Modules:** `src/data/auditPlain.ts`, `src/data/repository.ts`, `app/audit.tsx`, `src/data/mock.ts`

**Symptom** — the requester, on the one screen only she may open: *"In audit log show member
name if member deleted and also dropdowns are not working under that please fix and showing
wrong info"*. Measured against production the same day: the log's 46 most recent entries were
`member.hard_deleted`, and every one of them rendered as **"Member — member hard deleted"**
with no name, "No field values recorded", and a dash in both value columns. Thirteen other
actions rendered as prettified codes — `csv_import.previewed` (38 rows) as "Csv import
previewed", `attendance.day_reset` as "Attendance — attendance day reset", filed under
Courses. The Dates and Branch filters opened and applied correctly and could not be seen.

**Root cause** — two, and the first is one cause with N symptoms.

1. **Nothing couples the audit READER to the audit WRITERS.** Every migration that adds an
   `audit_log(...)` call adds an action code and a metadata shape, and no rung made
   `src/data/auditPlain.ts` learn either. Its totality guarantee was a hand-kept list inside
   `auditPlain.test.ts` — a snapshot of a grep, correct on 07-Sep-2026 and structurally unable
   to fail for anything added after it. `actionTitle` is total by construction, so the gap
   never surfaced as an error: it surfaced as a plausible-looking sentence. The deletions are
   the same cause at its worst — `purge_member` (0051), `purge_course` (0047) and the purges in
   0053–0055 delete the row they are about *in the transaction that writes the entry*, so the
   screen's one way of naming a subject (look `entity_id` up in its table) misses by design,
   and the name each of those functions carefully recorded in `metadata` was read by nothing.
2. **A stacking lift only ranks a node against its own siblings.** react-native-web gives every
   `<View>` `position: relative; z-index: 0`, so every View opens a stacking context.
   `DropdownRow` lifts itself to `zIndex: 40` while a panel is out; Audit was the only screen
   that wrapped it — in `<View key="controls">` and again in a margin View — which re-trapped
   the panel at 0, behind the frozen column header (which `ScrollView` lifts to `zIndex: 10`
   for `stickyHeaderIndices`) and behind the table, a later sibling at the same level.

**Fix** — `hasPlainTitle` names `actionTitle`'s fall-through, and `auditActionCoverage.test.ts`
runs the grep instead of quoting it: it reads `supabase/` at test time, so a new `audit_log`
call fails the suite until the words exist. The fourteen missing actions were written.
`subjectFromMeta` / `isRemoval` read the name a removal recorded, used in two places for two
different jobs — `toPlain` names the entry's own subject, and `fetchAudit` seeds the resolved-id
map so every *other* row in the batch pointing at the same dead id names her too. A removal now
fills its value columns from that name ("no longer on record", which is not "cleared" — a
cleared field leaves a row behind), and states what went with it from the counts the deletion
itself recorded, including the note saying who ordered a purge. The filter row is pushed as its
own `Fragment` child, unwrapped and with **no** z-index of its own — a number tuned to out-rank
10 is RC-018's mistake again — and gains the `dismiss` layer CP-014 requires and this screen
alone lacked.

**Files** — `src/data/auditPlain.ts`, `src/data/repository.ts`, `app/audit.tsx`,
`src/data/mock.ts`, `src/data/auditActionCoverage.test.ts`, `src/data/auditRemovedSubject.test.ts`,
`src/components/auditFilterStacking.test.ts`.

**How to verify** — `npx tsx --test src/data/auditActionCoverage.test.ts` against a tree whose
`auditPlain.ts` is missing any one `*.hard_deleted` entry: it names the action and the migration
that emits it. Then open Audit with the fixtures: entry `a17` names Sumathi with no members row
behind her, `a18` carries 0055's purge note, `a20` sits under the Attendance chip; open Dates
and confirm the panel is over the table, not under it.

**Recurrence risk** — the coupling half is a pattern and its sweep is now the test itself:
`emitted()` reads all four writer shapes (`audit_log`, `audit_log_as`, the Edge Functions'
`p_action`, and `audit_row_change`'s composed triple) across every `.sql` and `.ts` under
`supabase/`, so the sweep re-runs on every suite rather than being a count in this paragraph.
The stacking half was swept by reading all seven `DropdownRow` call sites
(`grep -n DropdownRow app/**/*.tsx`): Overview, Attendance and Reports mount it unwrapped and
are unaffected; `course/[id].tsx` and `course/edit.tsx` and `offering/edit.tsx` mount it inside
form scrollers with no later sibling to lose to. Audit was the only one wrapped, and the only
one whose panel overlays a table.

**Prevention** — `src/data/auditActionCoverage.test.ts` (the coupling, enforced from source) and
`src/components/auditFilterStacking.test.ts` (the wrapper, and the absence of a magic z-index).
Both run under `npm run test:unit`.

**Process check** — **yes**, in one specific way, and it is worth a rung: a totality test whose
input is a pasted grep is a snapshot wearing the clothes of a property, and the comment above it
even names the grep it was pasted from. That shape should be a review question wherever it
appears — "does this list re-derive itself, or did somebody paste it once?" — rather than a
lesson this app pays for alone. Flagged for `/promote` as a framework candidate.

---

## RC-035 — the course back arrow was a bare `router.back()`, so a refresh on the screen left it drawn, pressable and dead
**Date:** 08-Sep-2026  ·  **Severity:** S3  ·  **Modules:** `app/course/[id].tsx`, `src/data/nav.ts`, `src/data/courseBack.test.ts`

**Symptom** — In the requester's words: *"back button from attendnace screen is not working after
sometime and after refresh"*, with a screenshot of the **Gentle Yoga** course detail screen — the
arrow to the left of the course name. It worked when the screen was opened from the Courses tab
and stopped working with nothing on screen having changed.

**Root cause** — `course-back` called `router.back()` unconditionally. That is right on the ONE
path it was written for: the Courses tab **pushes** this screen, so there is an entry to pop. It
is a **silent no-op on an empty stack**, and the stack is empty whenever the course screen is the
app's FIRST route rather than its second — a browser refresh on `/course/<id>`, a bookmark, a
pasted link, a PWA relaunch, or any reload the person did not ask for, which is the "after
sometime". `app/_layout.tsx` declares no `initialRouteName`, so a cold load builds a root Stack
holding that route and nothing beneath it. This is **RC-026's defect wearing a different icon**:
set-pin accepted a new PIN and then sat there for every first login for the same reason.

**Fix** — The decision is a pure function, `backFrom(canPop, from, fallback)` in `src/data/nav.ts`,
beside `afterPinChange` and reusing `safeBackTarget`. `canPop` is the caller's
`router.canGoBack()` — only the router knows — and where it says no the answer is a real route
(`/courses`), never `'back'`. The screen `replace`s in that case, so the dead entry is spent
rather than stacked. The pushed path is untouched and still pops, which is what keeps the Courses
tab's scroll and filters. The arrow's size, position, `testID` and label are unchanged: this was a
behaviour fix, not a redraw.

**Files** — `src/data/nav.ts`, `app/course/[id].tsx`, `src/data/courseBack.test.ts` (new),
`requests/2026-09-08-course-back-arrow-dead-after-refresh.md`,
`.evidence/course-back-arrow-dead-after-refresh-browser.txt`.

**How to verify** — `npm run test:unit` (`courseBack.test.ts`, 7 cases: a pushed arrival still
pops; an empty stack never answers `'back'` for any of eight `from` values; an off-app `from` falls
back; the screen goes through `nav.ts` and asks `canGoBack()`). In a built app (`npm run export`,
served with a `/course/<id>` → `course/[id].html` rewrite) open `/course/c1` **directly, with no
history behind it** and press the arrow: it must land on `/courses`. Recorded in
`.evidence/course-back-arrow-dead-after-refresh-browser.txt`.

**Recurrence risk** — **High, and largely unclosed.** `grep -n "router\.back()" app/` finds the
same bare call on every other pushed screen: `branches`, `audit`, `profile`, `help`, `appearance`,
`staff/index`, and the dialogs `member/[id]`, `upload`, `send/index`, `send/result`,
`member/import`, plus `FormDialog`'s default close. Each is dead on a refresh for exactly this
reason — `/branches` is the one used to reproduce the defect in the browser evidence above,
*in the fixed build*. They are deliberately **not** changed here: the request named the attendance
screen, and it is recorded as the open item in that request's `STILL unknown`.

**Prevention** — No rung. A lint that banned bare `router.back()` would be wrong: it is the
correct call on a pushed screen, and `ScreenHeader`'s own comment explains why `canGoBack()` is
not a blanket answer inside the tab group. What exists is the pure function and its spec, so the
next screen that needs this has one to reach for. The honest gate would be a route-level check
that cold-loads every screen with a back control and asserts the URL changes — worth raising when
the open item above is taken.

**Process check** — Yes, partly. RC-026 recorded this exact failure mode the day before and the
fix stayed local to set-pin, so the class was known and un-swept. The framework-update workflow is
not run for this: the missing rung is an app-level route check, named above, not a process defect.

---

## RC-034 — the CSV import wrote the register through a path that announces nothing, so every mounted list kept its pre-upload figures
**Date:** 08-Sep-2026  ·  **Severity:** S3  ·  **Modules:** `src/data/repository.ts`, `app/upload.tsx`, `src/data/importRevalidates.test.ts`

**Symptom** — In the requester's words: *"On uploading attendance csv file the data is reflecting
on members card only after refresh"*. The import reported its counts, the rows were in the
database, and the member cards beside them went on showing the attendance and Missed figures they
had loaded before the file was chosen.

**Root cause** — `src/data/repository.ts` is where every write announces itself: it owns
`membersChanged()` and `attendanceChanged()`, and every mounted list refetches when it hears one.
The CSV commit does not go through that file. It is an Edge Function call made from
`src/data/api.ts` (`csvCommit`), which by design holds no notifications at all — so the one write
that moves the most rows was the one write no listener heard. Not a caching bug: nothing stale was
stored. Nobody was told to ask again.

**Fix** — `repository.ts` exports `attendanceImported()`, which fires `attendanceChanged()` and
`membersChanged()` together, and `app/upload.tsx` calls it the moment `csvCommit` returns. Both,
for the reason `setAttendance` fires both: the register moving and the per-member figures derived
from it moving are one event, and announcing half of it would leave a filled chip beside an
unchanged Missed count. It sits on the success path only — a commit that threw wrote nothing.

**Files** — `src/data/repository.ts`, `app/upload.tsx`, `src/data/importRevalidates.test.ts`.

**How to verify** — with the Members tab already open behind it, upload an attendance file for a
day those members attended and leave the app alone: the cards must carry the new attendance and
Missed figures when the result screen appears, with no reload. In the spec:
`npx tsx --test src/data/importRevalidates.test.ts`.

**Recurrence risk** — the class is any write made through `src/data/api.ts` rather than
`repository.ts`, since only the latter announces. Grepping every `callFn` caller: `sendFollowUps`
announces through `onSentChanged` (`src/data/sent.ts`); the PIN and staff writes call their own
screen's `retry()` at the call site (`app/staff/index.tsx`), which covers that screen and only
that screen; the auth and recovery calls change no list. `csvCommit` was the one caller that
told nothing at all.

**Prevention** — `src/data/importRevalidates.test.ts` asserts that the announcement covers both
lists and that the commit path makes it. No rung guards the general class — a test cannot see
that a future `api.ts` write is displayed somewhere — so the module docs on `attendanceImported`
and on `api.ts` state the rule where a next caller will read it.

**Process check** — no. The gates run without a browser, and a screen that is correct on mount and
stale afterwards is invisible to every one of them.

---

## RC-033 — a bulk-imported member had no joining date, because create_member stored the date it was PASSED and enrolled her from the date it COMPUTED
**Date:** 08-Sep-2026  ·  **Severity:** S3  ·  **Modules:** `supabase/migrations/0049_imported_member_joins_on_the_upload_date.sql`, `supabase/tests/38_imported_member_joined_on.sql`, `src/data/repository.ts`, `src/data/joined.ts`

**Symptom** — In the requester's words: *"when member is imported from bulk import then joined on
should be default as the current uploaded date"*. A member created by the member `.xlsx` import
opened with **Joined on** blank and her `Joined` line reading `—`, however recently she had been
imported — while her enrolment, invisibly, had started on the day of the upload.

**Root cause** — One function holding two values for one fact. `create_member` (0016, re-issued
0026) declares `v_from date := coalesce(p_joined_on, current_date)` and uses it for the enrolment's
`effective_from`, for her own schedule, for the schedule lookup and for the future-date refusal —
but inserts the RAW `p_joined_on` into `members.joined_on`, and reports the raw argument in the
audit entry. For every caller that names a date the two are the same value and nothing is visible.
The bulk import names none by design: the member file has carried no Joined On column since 0029
(*"today is the only answer, so there is no cell left to write a date into the wrong shape"*), so
`bulk_import_members` passes null and the member landed enrolled-from-today and dated nothing.

Both sides of the boundary asserted the opposite in prose while the INSERT said otherwise:
`src/data/repository.ts` said *"create_member coalesces null to current_date, so a bulk-imported
member joins the day she was imported"*, and 0046's own header said *"`joined_on` defaults to
current_date (0016/0026)"*. Two readers had read the declaration; neither had read the write four
lines below it.

Not the same defect as RC-029 (the date was read and thrown away on the way OUT) or RC-031 (the
form seeded a month instead of a date). This is the write side of the same column, and it is the
one that made RC-029's deliberate null-tolerance load-bearing: `hasJoinedBy` shows a dateless
member on every past date, which was right for her and wrong about the import that made her.

**Fix** — `0049_imported_member_joins_on_the_upload_date.sql` re-issues `create_member` whole with
two changed values: the `members` INSERT stores `v_from`, and the audit entry reports `v_from`. The
record, the enrolment, her schedule and the audit log now state one day. The default is
`current_date` evaluated in the database, not a date the client sends — the upload date that
matters is the one her enrolment already opens at, and a browser in another timezone must not be
able to date her a day either side of it.

`bulk_import_members` is deliberately NOT restated: it has been re-issued by 0028, 0029 and 0038
already, and 0046's second reason applies exactly — restating a much-restated function to change a
line that is not in it is how a concurrent change to it gets reverted by whichever number is
higher. Members imported BEFORE 0049 keep their null; back-filling means deciding which day to
write over "not recorded" for rows 0046's trigger may already have moved, which is the academy's
decision and a separate migration.

**Files** — `supabase/migrations/0049_imported_member_joins_on_the_upload_date.sql` (new),
`supabase/tests/38_imported_member_joined_on.sql` (new),
`src/data/importedMemberJoinedOn.test.ts` (new), `src/data/repository.ts` (the comment that
asserted the fix already existed), `src/data/joined.ts` (the same, on the null it tolerates),
`docs/registers/FEATURE_TRUTH.md`, `requests/2026-09-08-imported-member-joins-on-the-upload-date.md`.

**How to verify** — `npx tsx --test src/data/importedMemberJoinedOn.test.ts`. Against the pre-fix
tree it fails twice, naming the migration in force: *"0026_retire_member_code.sql: create_member
must store v_from"* and *"an audit entry saying joined_on: null beside a record dated today is a
third answer to the same question"*. Against a live database, `supabase/tests/38_imported_member_joined_on.sql`
imports one row with no `joined_on` key and reads `members.joined_on`, `member_enrollments.effective_from`
and the audit entry back, comparing them to each other rather than to a literal.

**Applied** — 08-Sep-2026, to `lhpzhkzbnquwjljmbylo`, on the owner's explicit go-ahead. The
local harness cannot run (`psql: command not found`, TD-050), so ADR 007's rolled-back rehearsal
stood in for it: the live `create_member` was diffed line by line against 0026 first — 94 code
lines, identical but for the dollar-quote tag — because re-issuing from a body that has drifted is
RC-027 exactly; then the migration and a real `create_member(..., null, ...)` call ran inside a
transaction that was rolled back, returning `joined_on 2026-09-08`, `effective_from 2026-09-08` and
an audit entry saying the same day. Applied with `supabase db query --linked -f`, never `db push`,
and the ledger row (`20260908031112`) written by hand. Re-proven on the live function afterwards,
again rolled back. **No bulk import was run against the academy** — creating a real member to prove
a function is how a test seed hijacked a real upload the day before.
`.evidence/imported-member-joins-on-the-upload-date-prod.txt`. **5 of the 22 live members carry a
null joining date** and 0049 does not touch them.

**Recurrence risk** — The class is *a default computed into a local and then not used at the one
write that needed it*. Swept with `grep -n "insert into public.members" supabase/migrations/*.sql`:
11 sites, every one a re-issue of the same two functions — `create_member` (fixed here) and
`commit_csv_import`'s `add_as_new`, which has always written `v_import.session_date` and never a
null. The second is pinned by the third group of the new spec so a later re-issue cannot quietly
null it. No other writer of `members` exists.

**Prevention** — `src/data/importedMemberJoinedOn.test.ts`, which resolves the LATEST migration
that defines a function rather than naming one, so a re-issue that drops the line fails
`npm run check` on the next commit rather than at the next import.

**Process check** — **Yes.** `supabase/tests/22_bulk_import_members.sql` covers exactly this row
("blank joining date -> today") and asserts it by reading `member_enrollments.effective_from` — the
half that was always right. Nothing in the suite ever read `members.joined_on` back, so the spec
that existed to catch this could pass with the defect present. The rule that would have caught it:
**a spec for a writer reads back every column the write is ABOUT, not one of them**. That is a
framework finding (`/framework-update`) and it has NOT been run — flagged here so it is not lost.
The second half is RC-014's, unchanged: 22 has never executed anywhere (no Postgres on this
machine, TD-050), so even a complete assertion would have been read rather than run — which is why
the new claim is duplicated into a node spec that runs on every `npm run check`.

---

## RC-032 — A name matched a member of another course, so one course's register marked a different course's member
**Date:** 08-Sep-2026  ·  **Severity:** S2  ·  **Modules:** `supabase/functions/_shared/match.ts`, `supabase/functions/csv-import/index.ts`, `src/data/api.ts`, `app/upload.tsx`

**Symptom** — In the requester's words: *"I uploaded a csv file containing member in postnnatal
course and there was a name which was included in prenatal course as well when i uploaded it in
postanatal it update attendance of person in prenatal instead of bringing her as new member in
postnatal."* A Google Meet export uploaded to **Postnatal** carried a participant whose name is
also the name of a member enrolled in **Prenatal**. The Prenatal member was written an attendance
row on the Postnatal session, her `last_present_date` moved, Postnatal gained no member, and
nothing on the result screen said any of it had happened.

**Root cause** — `preview()` resolved a participant name against **every member in the academy**
and never once looked at `offering_id` — the course the file is the register of. A member has one
live enrolment (0006); `set_attendance` states the consequence outright — *"her offering is read
from the enrolment in force on that date, never passed in ... one active enrolment means there is
nothing to choose"* (0035) — so a member enrolled in Prenatal is, by construction, **not** a
member of Postnatal, and a name that resolves only to her is not naming her. The canonical-name
tier returned her as the single confident candidate all the same, `kind` became `matched`, and
`matched` is the one classification nobody is asked about: `autoDecisions` (app/upload.tsx) filters
it out and `commit_csv_import` defaults it to `accept`. The wrong woman was marked, invisibly.

The selectivity is the proof. A file whose names are all members of the course it is uploaded into
imports correctly, which is why this had never been seen: the defect fires **exactly** when the
single confident candidate is enrolled somewhere else.

It was not always silent. While the operator answered row by row she could see the candidate's
course on the review card and refuse it. The harm arrived on 06-Sep-2026, when the review was
removed on request ("directly import data no confirmation") — the check that had been a person's
was never moved into the matcher.

**Fix** — `splitByCourse` (`_shared/match.ts`) splits the candidates into the ones this offering
could claim and the ones enrolled elsewhere; only the first group decides the row's `kind`. A
member with **no** live enrolment stays in the first group — null is "in no course", not a
contradiction, and creating a duplicate for her would invent a collision that does not exist. A
row left with nothing in the first group is `unmatched`, which the upload files as somebody new on
this course: with no email, listed under **No email**, where "Add display name to existing member"
folds her in and carries her attendance across (0032). That is the standing trade in this flow,
recorded above `autoDecisions` and confirmed by the requester on 06-Sep-2026 — *a wrong LINK marks
the wrong woman present and looks exactly like a right one; a wrong CREATE is visible and two taps
to undo.*

The `elsewhere` candidates are kept, not discarded, and ordered **after** the others —
`commit_csv_import` reads `candidates[0]`, so a member this course cannot claim must never sit
first. They carry their own hint ("Same name, but she is enrolled in *X* — not this one"), they
are what makes the row's `confirm_different_person` a real acknowledgement, and their names come
back as `other_course_names` so the result screen can name them. Filing a row as new because of a
name collision is a judgement, and a judgement nobody is told about is a judgement nobody can
correct — the same reason `dropped_names` and `staff_names` are named rather than counted.

**Files** — `supabase/functions/_shared/match.ts` (`splitByCourse`, new),
`supabase/functions/csv-import/index.ts` (the split, the candidate order, the hint,
`other_course_names` on the response and in the staged summary), `src/data/api.ts`
(`PreviewResult.other_course_names`), `app/upload.tsx` (`Outcome.other_course` and the
`upload-other-course` note), `src/data/importCourseScope.test.ts` (new).

**How to verify** — `npx tsx --test src/data/importCourseScope.test.ts`. Twelve claims in three
groups: the rule itself, run (a member of another course is not a candidate; a member of this one
is; a member of no course is; the requester's two-course name yields only this course's member;
order is preserved so `candidates[0]` is still safe); that the matcher applies it and orders
`[...here, ...elsewhere]`; and that the operator is told, by name. Seven of the twelve were
observed failing against the pre-fix tree. In the app: with the same name on a member of each
course, upload a Postnatal Meet export naming her — Postnatal gains a new member under No email,
the Prenatal member's register is untouched, and the result names the collision.

**Recurrence risk** — Swept: every place a name is turned into a member.
`grep -rn "name_normalized|normalizeName(|normalize_name(" --include=*.ts --include=*.sql .`
finds three other resolution sites and none shares the defect. (1) csv-import's staff filter
(index.ts:247) matches Meet names against `app_users` — staff are academy-wide, so academy-wide is
the right scope. (2) `bulk_import_members` (0028, re-issued by 0029 and 0038) refuses a name
already on the register anywhere — deliberate, and the opposite failure mode: it writes nothing and
reports the row by name with its reason, so nothing is silent. It does mean two genuinely different
women of one name cannot both be bulk-imported; that is a known limitation, not this defect.
(3) `update_member` (0027) enforces alias uniqueness academy-wide, which is the invariant that
stops one display name pointing at two members. This was the only site that turned a name into a
**write** against a member the course cannot claim.

**Prevention** — The rule lives in one exported function with the reasoning above it, and
`src/data/importCourseScope.test.ts` holds it as an executable claim together with the two things
around it that can be loosened separately: that the matcher still calls it, and that the operator
is still told. The standing rule is the one `set_attendance` already followed and the import did
not: **a member's course is read from her enrolment, never inferred from a file, and a name alone
is never an identity.**

**Process check** — **Yes, and it is the same lesson as removing a person from a loop.** The
06-Sep change deleted the review screen without asking what that screen had been *checking*. The
candidate's course was on the review card; a person reading "Prenatal · Anna Nagar" beside a
Postnatal upload would have refused it. Nothing in the track that removed the confirmation
required an inventory of the judgements the removed step was making, so one of them was simply
lost. Worth `/framework-update`: **when a confirmation step is removed, enumerate what the person
was deciding and say, for each, where that decision now lives.**

---

## RC-031 — Edit Member opened "Joined on" blank, because the form was seeded from a month
**Date:** 07-Sep-2026  ·  **Severity:** S3  ·  **Modules:** `src/data/period.ts`, `src/data/repository.ts`, `app/member/edit.tsx`, `src/components/DateTimePicker.tsx`

**Symptom** — In the requester's words: *"a member's Joined Date is not populated when opening
Edit Course."* Every member, however long she had been on the register: her name, her course, her
branch, her display names and her addresses all arrived in the form, and the one row under them
read as a date nobody had ever filled in.

**Root cause** — The same lossy read as **RC-029**, arriving from the form's side.
`members.joined_on` was in the SELECT and was mapped one line later to `joined` — a FORMATTED
MONTH, "Mar 2026" — and the record carried nothing else. A month is not a date: the form's date
row can only open on `yyyy-mm-dd`, so there was no value on the record it could open on, and the
once-only seeding effect that fills every other field from her record had no field to fill.

The comment in the form said the blank was deliberate — *"the EDIT form keeps it blank: it does
not save this field"* — and that reasoning covered the defect for as long as it stood. Not saving
a field is a reason not to WRITE it. It was never a reason not to SHOW it, on the one screen that
shows the rest of her record.

**Fix** — `Member.joinedOn` carries the column exactly as stored (nullable as the column is), and
`joined` is derived from it by `joinedLabel` (`src/data/period.ts`) — one derivation, so the date
and its label cannot tell different stories, and locale-free so the label does not change per
device. The seeding effect fills the row from `existing.joinedOn`, beside her name and her
status, under the same once-only guard. Null seeds `''`, which the row reads as *Not on record*
rather than as an unknown day; today's date is still never defaulted onto an edit.

The row is READ-ONLY on the Edit form and editable on Add. `update_member` (0027) takes no
`p_joined_on` — deliberately, so a typo cannot move the day every session she was ever expected
at is counted from — so a picker here would accept a change this form cannot save. A field that
quietly discards what it was told is the worse of the two answers. `DateField readOnly` draws it
as a row rather than a control: a padlock and a hint under it, never colour alone (guardrail 3).

**Files** — `src/data/period.ts` (`joinedLabel`), `src/data/mock.ts` (`Member.joinedOn` +
fixtures), `src/data/repository.ts` (the read, both offline writers, the `MemberUpdate` note),
`app/member/edit.tsx`, `src/components/DateTimePicker.tsx` (`readOnly`),
`src/data/memberJoinedOn.test.ts` (new).

**How to verify** — `npx tsx --test src/data/memberJoinedOn.test.ts`. Twelve cases in three
groups: the record carries the date and derives the label from it; opening an existing member
seeds the row from `existing.joinedOn` and never from today; and no save carries a joining date
at all. Each group was run against a copy of the tree with the fix reverted and each fired. In
the app: open any member from her course — the row states the month she joined, and Save leaves
the stored date exactly as it was.

**Recurrence risk** — Two classes, both swept. (1) Every stored fact this form seeds. The state
it declares (`grep -n 'const \[' app/member/edit.tsx`, 16 hooks) against what the once-only
effect fills: name, course, branch, aliases, emails, status, inactiveFrom and now joined. Her
days are seeded by their own effect under `seededDays`, for the reason recorded there. What is
left unseeded is the alias draft, the email draft, the open picker and the form's own machinery
(`seeded`, `saving`, `refusal`) — no stored fact among them. (2) Every value the repository
formats on the way out: `grep -n 'toLocaleDateString' src/data/repository.ts` finds two, both
labels and neither compared or opened by any control — `last` (`last_emailed_at`), which RC-029
already names as the same trap, and the staff row's `when()` over `created_at` / `pin_set_at` /
`last_login_at`. The day a screen needs to compare either, it gets carried the way this one now
is.

**Prevention** — `src/data/memberJoinedOn.test.ts` holds both halves as executable claims: the
seeding effect must fill this field, and the update path must send no joining date (asserted
against the RPC arguments, the `MemberUpdate` type, and the offline writer's field list). The
standing rule is RC-029's: **carry the stored value and derive the label from it, never the
reverse.**

**Process check** — **No.** The blank was documented in the file as intended behaviour, so it
read as a decision rather than a defect to everyone who passed it, including the tracks that
edited the lines around it. What is new is the spec that states what the form must show; no
process rung would have found a comment that was simply wrong about its own consequence.

---

## RC-030 — The preview of the wording rendered the tokens, because the context was optional
**Date:** 07-Sep-2026  ·  **Severity:** S3  ·  **Modules:** `src/data/message.ts`, `app/course/edit.tsx`

**Symptom** — reported as *"the Edit Email Template preview shows variable names/placeholders
instead of their values"* — `{{first_name}}`, `{{course_name}}` and the rest arriving on screen
in the one panel whose entire job is to show what a member will actually read.

**Root cause** — the preview context was assembled inline in the form, so it could only exist
when the form happened to hold every part of one. Two consequences, one cause:

1. `previewCtx` was `null` whenever the register had no member to sample — which is the state
   **every course is in at the moment it is added**. The panel then rendered a sentence saying
   there was nothing to show it against, directly under a box reading `Hello {{first_name}},`.
   The braces were the only rendering of the wording anywhere on the screen.
2. The template picker's one-line preview (`meta: t.preview`) was never filled at all. Live
   templates build that line from the **first line of the body** (`fetchTemplates`), which is
   where the tokens are thickest, so choosing between templates meant reading their source.

A third, smaller instance of the same shape: `period_from` / `period_to` were filled with the
prose *"the period start"* and *"the period end"* — words standing where a date belongs, which
is an unresolved token wearing different clothes.

**Fix** — `previewContext()` in `src/data/message.ts`: one builder, **no null case**. Real
figures where the screen holds them, `SAMPLE_MEMBER` where it does not; course and branch fall
back to the preview member's *own*, never to `''` or `—`, so the resolved message describes one
coherent person. The period is `currentWeek()` in the sender's own ISO shape — what a send made
today actually puts in the email. The form now always renders the preview and labels it
`Preview · <her name>` or `Preview · sample values`, and the picker line is filled like
everything else. The tokens in the **editor** are untouched: this is the preview only.

**Files** — `src/data/message.ts`, `src/data/message.test.ts`, `app/course/edit.tsx`.

**How to verify** — `npx tsx --test src/data/message.test.ts`. The load-bearing case is
*"previewContext given NOTHING still resolves every documented token"*, backed by *"no token
resolves to blank, an em dash, or the word undefined"* — resolving is not the whole job, since
`Hello ,` clears a brace check and is the same defect. In the app: open Add a course on an
academy with nobody enrolled and read the preview panel; then open the Message template
dropdown and read each option's second line. Neither may contain `{{`.

**Recurrence risk** — the class is *"a preview whose context is optional"*. Grepped for
`fillTokens` across `app/` and `src/`: the course form was the only caller, and the send dialog
renders no wording at all since C-68 removed the preview there. Any future screen that shows
stored wording must take its context from `previewContext()` rather than assembling one, which
is why the fallbacks live in that function and not at the call site.

**Prevention** — `src/data/message.test.ts`, the block appended 07-Sep-2026. It asserts on
`{{` rather than on values, because the failure mode is a brace on the screen; and *"every
seeded template previews clean — subject, body AND picker line"* covers the picker path that
had no spec at all.

**Process check** — would a correctly functioning process have caught this? Yes, partly. The
"every state exists and was looked at: empty, loading, error" item in
`checklists/DEFINITION_OF_DONE.md` covers the empty-register state, and the panel's empty state
was written deliberately — what was missed is that *empty* is the **default** state of this
screen, not an edge of it. No framework change: the item is right and was applied too shallowly.

---

## RC-029 — the joining date was read, formatted, and thrown away, so every date-scoped screen showed every member
**Date:** 07-Sep-2026  ·  **Severity:** S2  ·  **Modules:** `src/data/joined.ts`, `src/data/mock.ts`, `app/course/[id].tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/reports.tsx`

**Symptom** — In the requester's words: *"If a student is added on September 7, 2026, they should
not appear when viewing attendance or other date-based student data for September 6 or any
earlier date."* She did. On the course roster for a past day her card carried an attendance
reading — *Yet to mark* — for a session she could not have attended; on Reports for last month
she was a row with 0 expected and 0 attended; offline she had generated present/absent rows going
back weeks.

**Root cause** — Not a missing rule; a **lossy read**. `members.joined_on` has existed since 0006
and the database has always honoured it — `create_member` (0026) opens the enrolment at
`coalesce(p_joined_on, current_date)` and `expected_members_for_session` (0007) will not expect
anybody whose `member_enrollments.effective_from` falls after the session date. But
`fetchMembers` mapped the column straight to a formatted month (`joined: "Mar 2026"`), so the
only thing that ever reached a screen was a subtitle. Nothing downstream of the repository could
compare the date to anything, and every date-scoped derivation therefore ran over the whole
member list whatever date it claimed to be about.

One cause, four symptoms — the roster, the Overview, Reports, and the offline register — not
four defects.

**Fix** — The date is carried as `Member.joinedOn` (ISO, nullable exactly as the column is) and
the rule that reads it lives in one pure module, `src/data/joined.ts`: `hasJoinedBy`,
`membersOnDay`, `membersInPeriod`. The day-scoped roster and the two period-scoped screens call
it; no screen compares dates itself. The boundary is inclusive on the joining day, matching
`session_date >= effective_from`. A **missing** date never hides anybody — the column is nullable
and the bulk import may leave it null (0029), so reading a blank as "joined later than every date
you can ask about" would empty the register of everybody imported before it was being filled in.

The register itself is untouched, on the requester's second condition: the Members tab, the
search, the course card's member count and every send list pass no date and narrow nothing.

**Files** — `src/data/joined.ts` (new), `src/data/joined.test.ts` (new), `src/data/mock.ts`
(`attendanceFixture` no longer generates rows before a member joined),
`app/course/[id].tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/reports.tsx`,
`src/data/attendance.test.ts` (appended).

**How to verify** — `npx tsx --test src/data/joined.test.ts src/data/attendance.test.ts`. The
three cases that matter are named for the dates: *NOT there on 6 Sep*, *IS there on 7 Sep — the
boundary is inclusive*, *there on 8 Sep and every day after*. In the app: add a member today,
open her course, step the week strip back a day — she is off the roster and the line under the
heading says how many members joined later and that they are still on the course.

**The server half, written and not yet rehearsed (TD-049).** The client narrowing left one way for
the database to contradict it: `commit_csv_import` matches a participant by alias or address and
never consults her joining date, so a Meet export for the 6th naming a member who joined on the
7th wrote her a row for a day her roster no longer shows her on. `set_attendance` (0035) cannot do
this — it refuses a date her enrolment does not cover — so the import is the only writer that can.
`supabase/migrations/0046_attendance_backdates_membership.sql` answers it the way the evidence
points: a register that names her moves her joining date and her enrolment BACK to the session,
never forward. That keeps a bulk-imported academy able to backfill last month's files, which
refusing the row or the file would have broken. It is a trigger rather than an eighth restatement
of `commit_csv_import`, so nothing existing is redefined. NOT APPLIED and NOT REHEARSED — this
machine has no Postgres; see TD-049.

**Recurrence risk** — Every column the repository *formats* on the way out. `last`
(`last_emailed_at` → a locale date string) is the same shape and the same trap: a screen that
ever needs to compare it has nothing to compare. The rule: **carry the stored value and derive
the label from it**, never the reverse — which is what `joinedLabel` now does for `joined`.

**Prevention** — the derivation is a pure module with specs, so a second screen that needs the
rule imports it rather than re-writing the comparison. Class relatives already in this register:
**RC-014** (a joining date cast without being checked) and **RC-012** (a derivation that imported
the fixture and so could not be tested).

**Process check** — **No.** The defect is older than any of the tracks that touched the file; no
request ever stated the rule, because everybody assumed the screens had it. The prevention is the
module, not a process change.

---

## RC-028 — A migration that was never applied answered the operator in PostgREST's own words
**Date:** 07-Sep-2026  ·  **Severity:** S2  ·  **Modules:** `src/data/repository.ts`, `src/data/engineWording.ts`, `supabase/migrations/0032_merge_member.sql`

**Symptom** — the requester, on the course roster's **No email** group: "nitha i added as new
member but still apeaing under no mail section", and an "issue appearing when adding the no
email member as display to existing member". Two buttons on one card, neither of which
resolved the row it sits on.

**Root cause** — two causes, one per symptom, and they compound.

1. The card is still listed because the register still holds the TWIN that
   `cc9438c` was written to stop being made. That commit closed the door; it could not
   unmake the record already through it. The stray still has no address and the No email
   group is DERIVED from the member list (guardrail 1), so listing her is the group telling
   the truth. The one act that repairs the data is the merge — the other button.
2. The merge is inert in production. `merge_member_into` is defined in
   `supabase/migrations/0032_merge_member.sql` and was never applied to the live project
   (TD-033, found the same day by Track A's parity check). PostgREST answers a call to a
   function it cannot see with `PGRST202` — "Could not find the function
   public.merge_member_into(p_stray, p_target) in the schema cache" — and that sentence
   reached the operator VERBATIM, because `personReadable`'s guard knew Postgres' wording
   for a violated constraint and had never heard PostgREST's wording for a function that is
   not there. So the deployment gap was reported to her as a cache and an argument list.

**Fix** — the guard moved out of `repository.ts` (which no spec can import) into
`src/data/engineWording.ts` and gained the two PostgREST shapes: `schema cache` and a
`PGRSTnnn` code. A missing deployment now reads as the product's own sentence — "That merge
did not run. Nothing has been changed — she is still on the register under her own name." —
while the machine detail still reaches the console. That is the C2 message exception: what
the operator READ was the defect.

**The button itself is fixed by applying 0032**, which is a production write and was the
owner's call, not automation's. They read the raw SQL and gave the go-ahead; it was applied on
07-Sep-2026 (ledger `20260907112255`) and the deployed body verified byte-identical to the file
— 6074 characters, md5 `c8ce4e52084201fd8011c0a131e7c3f3` — with `anon` holding no execute
grant. It creates one function and touches no row, so there was no production-data hazard to
check; the harness could not rehearse it (no PostgreSQL 16 on this machine, TD-010), and every
object it depends on was verified present in the live project first.

**Files** — `src/data/engineWording.ts` (new), `src/data/engineWording.test.ts` (new),
`src/data/repository.ts`.

**How to verify** — `npx tsx --test src/data/engineWording.test.ts`. The fail-first output
against the pre-fix regex was the leak itself: `actual: 'Could not find the function
public.merge_member_into(p_stray, p_target) in the schema cache'`. For the button: once 0032
is applied, the No email card's "Add display name to existing member" folds the stray into
the member she is and the row leaves the group.

**Recurrence risk** — `personReadable` has three call sites in `repository.ts`
(`memberWriteError`, `mergeMemberInto`, `aliasSaveError`'s neighbours) and ALL of them ran
through the same holed regex, so all three are fixed by the one module — searched with
`grep -n personReadable src/data/repository.ts`. The wider class is live now and not closed
by this change: nine migration files are absent from production's ledger (TD-033, TD-035),
so `set_member_status`, `set_attendance` and `delete_member` are the same inert-button shape
waiting behind the same message. They now read as a product sentence rather than a leak,
which is a better failure and still a failure.

**Prevention** — `src/data/engineWording.test.ts` pins both halves: the engine shapes are
caught, and the sentences a migration wrote for the operator are still passed through. The
deployment half has no rung — nothing in `npm run check` can see production's migration
ledger. TD-033 is the record, and the parity check that found it is a Gate 4 obligation, not
an automated one.

**Process check** — yes, partly. RC-023 closed this exact class for Postgres' wording and did
not ask which OTHER engine sits on the wire; CP-003 says "no raw engine string", and the
guard implemented "no raw POSTGRES string". A rule stated once and implemented for one of its
two producers is a process finding — `/framework-update` is flagged in the request file.

---

## RC-027 — Every course save re-asserted the schedule, so a reword hit the history guard
**Date:** 07-Sep-2026 · **Severity:** S2 · **Modules:** `supabase/migrations/0040_save_course_schedule_only_when_days_change.sql`,
`app/course/edit.tsx`, `src/components/TokenChips.tsx`, `src/data/message.ts`

**Symptom** — Edit course → Postnatal → *Wording for this course* → tap a detail chip →
**Save Changes**:

> this offering has a completed session on 2026-09-07, so a schedule cannot start on or before
> it. Choose 2026-09-08 or later.. Nothing has been saved.

Nothing about the schedule had been touched, the dialog has no date field, and the reworded
message was lost with the refusal.

**Root cause** — `save_course` ended its offering block with an **unconditional**
`perform public.set_offering_schedule(v_offering, p_weekdays, current_date, …)`. Every save — a
rename, a new sender, a different template, a reworded message, a moved threshold — therefore
asked to open a schedule version starting *today*. `set_offering_schedule`'s history guard then
refused, correctly, because a session for that offering was already `completed` today. The guard
was right; the call was wrong. An **unchanged schedule was being re-asserted as a change**, which
made a correct refusal reachable from a form that could not act on it — and, because `save_course`
is one transaction, took the wording down with it.

**Fix** — `0040` compares the days being saved against the schedule in force *today* and calls
`set_offering_schedule` only when they actually differ; the comparison uses the same
distinct-and-sorted normalisation the writer uses, so `[4,2,2]` is not a change to `[2,4]`. The
guard is untouched: a **real** change of days on a day that already has a completed session is
still refused in the same words. `save_course` now also returns `rescheduled`, added beside the
existing keys, so the condition is assertable rather than inferred.

**Applied to the live project 07-Sep-2026** and verified there: `save_course` carries the
condition, keeps `is_super_admin()` and SECURITY DEFINER, still has one overload, and its
`authenticated` EXECUTE grant survived the replace. Diagnosis confirmed against real rows before
and after — the Postnatal offering at Main (`13f554a0…`) has `last_completed = 2026-09-07` with
weekdays `[1,2,4,5]` in force, so the old code refused and the new one does not reschedule.
**The body it re-issues is the LIVE project's own (0030's), not the repo chain's** — neither
`0038_staff_write_access` nor `0039_meeting_code_groups` is applied there and
`course_offerings.meet_code` does not exist, so 0039's body would have failed at runtime on every
Add/Edit Course. That divergence, and the fact that `0039`'s header claims `0040` carries a guard
it does not, is **TD-023** — it must be settled by whoever lands 0038/0039.

A second, quieter defect surfaced in the same screenshot: the chip row offered all thirteen
tokens at once, and tapping along it produced `RosiFit Academy Main — 0 —` — every token resolved
exactly as designed and the message was worse for each one. Each row now opens on what the seeded
template already uses in the field it sits under — **seven** beside the message, and **her first
name alone** beside the subject, where the reporter's own box had come out as
`We missed you this week, {{first_name}} {{member_name}}`. A subject is read in a list at one
glance; the figures are what the message is for. Both rows end in a `More` chip that opens all
thirteen, so the list is **split, never shortened** — wording already written with
`{{attendance_pct}}` still resolves everywhere.

**Files** — `supabase/migrations/0040_save_course_schedule_only_when_days_change.sql`,
`supabase/tests/16_save_course.sql`, `src/data/message.ts`, `src/data/message.test.ts`,
`src/components/TokenChips.tsx`

**How to verify** — `supabase/tests/16_save_course.sql`, the `0040 · RC-027` block: mark a session
`completed` on `current_date` for an offering, then call `save_course` with the **same** weekdays
and new wording. It must return `rescheduled = false`, save the subject, and leave exactly one
`offering_schedules` row. The same block asserts that changing the weekdays under those conditions
is **still** rejected with `completed session`.

**Recurrence risk** — Every write path that re-sends an unchanged sub-record through a validator
built for changes. Swept with `grep -rn 'perform public\.' supabase/migrations/*.sql` — 29 nested
calls, and every one other than this is `audit_log` / `audit_log_as`, `recompute_member_stats`,
`refresh_session_counts` or `apply_holiday` / `remove_holiday`. None of those refuses a no-op, so
`save_course → set_offering_schedule` is the only site of this shape in the schema today.

**Prevention** — Prose plus the spec above. No rung: the general rule ("a validator written for a
change must not be handed a no-op") is not mechanically checkable, but the specific case is now
pinned by an assertion on `rescheduled`, which exists so a future reader cannot mistake "it did not
raise" for "it did not write".

**Process check** — **Yes.** `16_save_course.sql` covered create, edit, refusals and the role
boundary, and every case ran against an offering with **no completed session** — so the one
condition that makes the guard fire was never present in the fixture. The lesson is not "add a
case": it is that a spec for a function which delegates to a guarded one must set up the state that
makes the guard fire, or it only ever tests the happy branch. **No framework change is proposed
at n=1** — parked as a candidate, in line with the register's own standing refusal to promote
from a single instance.

---

## RC-026 — A keypad sized in percentages beside a flex gap fitted two keys, not three
**Date:** 07-Sep-2026 · **Severity:** S2 · **Modules:** `app/index.tsx`, `app/set-pin.tsx`,
`src/components/keypadGrid.ts`, `src/data/nav.ts`

**Symptom** — "for enter pin screen only two number boxes appearing in a row in mobile view";
and on Change your PIN, "its overlappping enter pin fields" — the four PIN boxes drawn on top
of the keys. Reported for both staff login and super admin login, with a screenshot.

**Root cause** — Both keypads sized a key as a PERCENTAGE of the row (`width: '31.5%'`) while
also putting a flex `gap: 10` between keys. A flex line breaks on widths PLUS gaps, so three
keys need `3 × 31.5% + 2 × 10px`, which only fits once the row is ~364px wide. Sign-in's card
leaves `viewport − 40` and set-pin's Screen leaves `viewport − 32`, so every phone from 320 to
393 got two keys to a row, and `flexGrow: 1` stretched the pair to full width — which is why a
wrap read as a design choice. The overlap was the SAME cause two steps on: two-up makes the pad
six rows instead of four (374px, not 246px), and that extra height squeezed the `flex: 1`
region above it below its own content, so the content spilled over the keys instead of being
clipped. Measured: the overlap appears at exactly the widths that wrap and nowhere else.

**Fix** — The gutter is now PADDING INSIDE each cell rather than a gap between them, in one
shared module both screens import. Padding takes no part in the line-breaking sum, so the only
question a line asks is whether three cells of `33.3333%` fit in `100%` — true at every width,
with no measurement, no breakpoint and no first-render mismatch. It is the idiom
`app/(tabs)/index.tsx` (`Cell`) and `src/components/DateTimePicker.tsx` (the month and day
grids) already use. Separately, set-pin's top region became a `ScrollView` so no future height
can overlap the pad, and the PIN boxes moved OUT of it — on a 320×568 phone the prose alone
fills the scrollable part, and dots you must scroll to find are no better than dots under the
keys.

**Also fixed here, same screens** — set-pin decided where to go after a successful change from
`?for=self`, a flag that records WHO ASKED rather than whether anything was pushed, and
answered with `router.back()`. Profile arrives by `push` so back worked; sign-in's
`must_change_pin` path and forgot-pin arrive by `replace`, which leaves an empty stack, and
`back()` on an empty stack is a no-op — so every FIRST login, staff and super admin alike,
accepted the new PIN and then sat on the PIN screen. The caller now names the arrival
(`?for=first`) and `afterPinChange()` in `src/data/nav.ts` resolves it to the role's dashboard.
The registration button also read "Register & issue PIN" for a screen on which she CHOOSES one;
it now reads "Register & set PIN".

**Files** — `src/components/keypadGrid.ts` (new), `src/components/keypadGrid.test.ts` (new),
`src/data/pinReturn.test.ts` (new), `app/index.tsx`, `app/set-pin.tsx`, `app/forgot-pin.tsx`,
`app/register.tsx`, `src/data/nav.ts`.

**How to verify** — `npm run test:unit`; `keypadGrid.test.ts` asserts three columns fit at
320/360/375/390/393/412/430px for both screens' content widths, and that the row carries NO
horizontal gap. In a built app (`npm run export`) open `/set-pin?for=self` at 320×568 and
360×640: four rows of three, and the PIN boxes clear of the pad. For the navigation, open
`/set-pin?for=first` directly (no history behind it) and complete a PIN — it must land on a
dashboard, not stay on `/set-pin`.

**Recurrence risk** — The class is "percentage width on a child of a wrapping row that also
has a gap". Swept with `grep -rn "flexWrap" app src --include=*.tsx` (14 sites) crossed with
`grep -rnE "width: '[0-9]+(\.[0-9]+)?%'" app src --include=*.tsx` (10 sites). Exactly two sites
had both — the two keypads, both fixed here. Two more already use the correct idiom and are
the reference for it: `app/(tabs)/index.tsx:263` (two-up grid, negative margin + padded `Cell`)
and `src/components/DateTimePicker.tsx:205,241` (month and day grids, `width: '25%'` with
`padding` and no gap). The remaining eleven wrap CONTENT-sized chips and pills, which have no
fixed column count to break.

**Prevention** — `rung: src/components/keypadGrid.test.ts`. The arithmetic is asserted against
the shipped values at seven phone widths, and one assertion fails outright if a `columnGap`
returns to the row. The module is the single source both screens import, so a fix cannot land
on one keypad while its twin ships broken — which is the specific way this defect survived.

**Process check** — Yes. Nothing in the pipeline renders a screen at a phone width: the
contrast and icon rungs read tokens, and the route checks in `.harness/` do not run on this
machine (Linux-only). The fault was visible at 412px and above, which is where it would have
been previewed, and invisible below — so review at desktop width could not have caught it.
Flagged for `/framework-update`: the gate has no narrow-viewport render check.

---

## RC-025 — the wait RC-021 added was never lifted, so Edit course seeded nothing at all
**Date:** 07-Sep-2026 · **Severity:** S2 · **Modules:** `app/course/edit.tsx`

**Symptom** — *"on clicking edit course icon the form is opening with empty values fix the
bug"*. The screenshot shows the dialog headed **Edit course · hhhhh** — so the course was
found and named — over a blank **Course name** placeholder, **Choose a branch**, a frequency
row reading **Required** with no day lit, and **A course name is required** under an unusable
**Save Changes**.

The same blank Edit form RC-021 was reported as, one day later, by the fix for it.

**Root cause** — the seeding effect bails on a value React cannot see change. RC-021 taught it
to WAIT for the course and its saved rules — `const ready = … && !recordPending` — but
`recordPending` reads `courses.state` and `followUp.state`, and the dependency array carried
neither, nor `recordPending` itself:

```ts
}, [seeded, message.state, branches.state, templates.state, senders.state, course]);
```

So when the four listed queries and `courses` had landed and `followUp` had not, the effect
ran, bailed, and was never scheduled again: `followUp` arriving changes nothing the array
lists, and `course` is the same object from the same array. The `seeded` latch — deliberately
never reset, so a refetch cannot overwrite a keystroke — then held the form empty for good.
`useFollowUp` awaits `fetchMembers` and `fetchRules` together and `useCourses` awaits one
query, so followUp landing last is the ordinary case, not the rare one.

**What the previous attempt missed** (correction round 2) — RC-021 diagnosed the three-way
`null` correctly and fixed WHEN the form may seed. It did not ask what makes the effect run
again once its new condition is satisfied, and the change is invisible in review because the
guard it added and the array it did not touch are eight lines apart. Its rung,
`src/components/editDialog.test.ts`, checks that the form ANSWERS loading, failed and missing —
all three of which this defect answers correctly. Nothing was watching whether the form ever
leaves the state those answers describe.

**Fix** — `recordPending` is in the dependency array. The effect now re-runs when the wait
ends and seeds from the course that has arrived. The `ready` gate, the latch, and everything
RC-021 added are unchanged: this restores the run RC-021 assumed it already had.

**Files** — `app/course/edit.tsx`, `src/components/seedGateDeps.test.ts` (new spec),
`.evidence/seed-gate-deps-fail-first.txt`.

**How to verify** — `npx tsx --test src/components/seedGateDeps.test.ts` (3 tests). In the app:
open a course's pencil from the Attendance tab; the dialog must show that course's name, its
branch and its lit weekday chips, with **Save Changes** live. `/course/edit?id=<a real
id>&state=loading` must still be a skeleton with no footer, and `/course/edit` with no id must
still read **Add a course** with nothing filled but the sole branch.

**Recurrence risk** — high, and not from carelessness: a readiness gate is naturally written as
a derived `const`, which reads as one name while it depends on two. Swept every `useEffect` in
`app/` and `src/` — 26 effects — extracting each body's early-return guards and comparing their
identifiers against its dependency array (`scripts`-free scan, comments stripped so prose could
not satisfy it). Twenty reads were flagged and nineteen are module constants (`Platform.OS`,
`isConfigured`), string-literal comparisons, or variables created inside the effect body. This
was the only site. The two latched seeding forms — `app/course/edit.tsx` and
`app/member/edit.tsx` — are both named in the new spec; `app/member/edit.tsx` was already
correct, because the one value it bails on, `existing`, is in its array.

**Prevention** — a seeding effect must be re-runnable by everything it bails on, gates reached
through a derived `const` included. Rung:
`src/components/seedGateDeps.test.ts`, in `npm run test:unit`.

**Process check** — Yes, and the framework was NOT changed for it. A fix that adds a wait to an
effect without touching that effect's dependency array is a mechanical hazard with a mechanical
answer, and Track C closed RC-021 with a rung that asserted the three answers the form gives
without ever asking whether the form leaves them. `/promote` ran on the class: it clears the
domain-word test (**CAND-004**, no business noun in the rule; the lexicon has no entries to
grep against, so that filter was judged by inspection) and parks at **n=1**, one app, which is
where `/framework-update` sends an n=1 promotion back to. The lesson is therefore held at the
cheapest level the rule budget allows — an automated check in this app,
`src/components/seedGateDeps.test.ts` — and the framework gains nothing until a second app
sights the same class. No `VERSION` bump, and none is owed.

---

## RC-024 — Two members with one name were two React children with one key
**Date:** 07-Sep-2026 · **Severity:** S2 · **Modules:** `src/components/Sheet.tsx`, `src/components/pickerSearch.ts`, `app/course/[id].tsx`

**Symptom** — In the course screen's `Who is "Rani"?` merge picker: *"When user selected a name
already, it is not searching properly."* The screenshot shows a typed query listing **four**
"Kavitha Ramesh" rows that the query does not match, one row highlighted "Rohini · Selected",
and the confirm sentence beneath it naming a third member, "Divya Balakrishnan".

**Root cause** — The rows were drawn as `results.map(o => <PickerChoice key={o.label} …>)`. The
register holds two live members called "Kavitha Ramesh" (RF-000105 and RF-000106), so two React
children carried ONE key. React's documented answer to a duplicate key is children "duplicated
and/or omitted": on re-render after a keystroke it reconciled rows against the wrong options,
leaving stale rows on screen and painting one member's label over another member's props. The
staged value was a member id and was correct throughout — only the row drawn over it was not.

Not a search bug, though it was reported as one. `usePickerQuery` filtered correctly; the list
that survived the filter was rendered from the wrong children.

**Fix** — `pickerKey(option, index)` — the option's `value` (a member id, unique by
construction) when it has one, `label#index` when it does not. Applied at BOTH call sites,
`SearchPicker` and `AnchoredPicker`. The picker also now carries her email address on the row
and in the query, so two same-named members are distinguishable to the person as well as to
React.

**Files** — `src/components/pickerSearch.ts` (new), `src/components/pickerSearch.test.ts` (new),
`src/components/Sheet.tsx`, `app/course/[id].tsx`

**How to verify** — `npx tsx --test src/components/pickerSearch.test.ts`; *"two members sharing
a name are two different rows"* asserts `pickerKey` separates them. Against the shipped
expression the two keys were both the string `Kavitha Ramesh`.

**Recurrence risk** — Every `.map()` over rows keyed by a display string. A name, a course name,
a branch label — none of them is an identity, and the failure only appears once two rows
collide, which is data-dependent and therefore absent from every fixture.

**Prevention** — The key decision is a named, tested function rather than an expression inside
JSX, so the next picker inherits it. `Sheet.tsx:96` had ALREADY recorded that labels stopped
being unique and had moved `onSelect` onto `value` for exactly this reason — the note was right
and the key was simply left behind. A note is not a guard.

**Process check** — **Yes.** The earlier change that introduced `value` because "two members can
share a name" fixed the selection path and left the render path keyed on the label. Nothing in
the process asks "you just declared this field non-unique — what else is keyed on it?". Worth a
`/framework-update`: when a change declares a field non-unique, sweep every use of that field as
an identity, not just the one that prompted it.

---

## RC-023 — A rule the database enforced and the form had never heard of
**Date:** 07-Sep-2026 · **Severity:** S2 · **Modules:** `app/course/edit.tsx`, `src/data/message.ts`, `src/data/repository.ts`

**Symptom** — reported as *"In add course form on editing email template and saving course this
error is appearing"*, with the dialog showing: **"Something went wrong / `new row for relation
"course_communication" violates check constraint "course_communication_subject_check"`. Nothing
has been saved."** The course was not created.

**Root cause** — Two layers, and the second is why the first was unreadable.

*Why the save failed:* `course_communication.subject` is `null or length(btrim(subject)) between
3 and 200` (migration 0021). That rule was specified once, as a CHECK constraint, and pinned by
`supabase/tests/15_course_communication.sql` — which asserts in as many words that *"a
two-character subject is refused"*. **The form that collects the subject encoded none of it.**
`valid` in `app/course/edit.tsx` gated on name, weekdays, branch, sender and template and said
nothing about the wording it also collects, so the first thing in the system to enforce the
rule was the INSERT — after Save had been offered, enabled, and pressed. Editing the wording is
the only way to reach it: an untouched course saves `NULL` and a chip-inserted token is always
long enough, which is exactly why the report says *on editing email template*.

*Why the person read Postgres:* `courseSaveError()` ended by interpolating the server's own
`message` straight into the sentence it showed. The
translators in `src/data/repository.ts` deliberately pass a refusal through when the database
wrote it **for a person** — "she has an email address of her own", "still runs 3 courses", the
date a completed session blocks — and that decision is sound. What none of them could tell apart
was a sentence somebody wrote from a sentence Postgres generated, so a constraint violation was
forwarded to the dialog verbatim. CP-003 says never a raw engine string; seven translators ended
in one.

This is RC-015's shape one level over: **a rule that lives in exactly one place, invisible from
where it has to be obeyed.** There it was a design divergence recorded only in a comment; here it
is a validation rule recorded only in a constraint.

**Fix** — The bounds are restated where the form can read them (`SUBJECT_MIN/MAX`, `BODY_MIN`,
`COURSE_NAME_MIN/MAX` in `src/data/message.ts`) and `wordingProblem()` / `courseNameProblem()`
turn them into the sentence a person needs. The form's `valid` consumes them, so Save is not
offered for wording the database will refuse, and the reason is stated twice — beside the field
and at the footer hint, because the wording card scrolls far above the button and a Save
disabled for no stated reason is the same dead end as the refusal it replaced.

Restated, **not moved**: the constraint stays the last line of defence. If it ever fires anyway,
`courseSaveError()` now maps `course_communication_subject_check`,
`course_communication_body_text_check` and `courses_name_check` to sentences, and
`personReadable()` intercepts engine wording at every translator's fall-through — hand-raised
`RAISE` messages match none of its shapes and still pass through untouched, so the deliberate
policy above survives intact.

**Files** — `src/data/message.ts`, `src/data/message.test.ts`, `src/data/courseWordingGate.test.ts`
(new), `app/course/edit.tsx`, `src/data/repository.ts`.

**How to verify** — Add a course, open **Edit** on the wording card, cut the subject to two
characters. Save must be **disabled**, the card must say *"The subject needs at least 3
characters, or leave it empty to use the template's."* and the footer must say the same. Clear
the subject entirely: Save is enabled again — empty means the course follows its template
(0021), which is what Reset writes. Paste 201 characters: refused, and the sentence names 200.
In JS: `npx tsx --test src/data/message.test.ts src/data/courseWordingGate.test.ts` — 40 cases.

**Recurrence risk** — The defect class is **a database rule the form that feeds it does not
encode**, and it is not confined to this form. Swept by listing every text-length CHECK in
`supabase/migrations/` (`grep -rn "length(btrim" supabase/migrations/`) and reading every
`const valid` in `app/`. **Six sites, three fixed here** — the course subject, body and name, all
three in the one `valid` expression this defect was reported against. The other three are live
and unfixed, deliberately, as outside the reported defect; each is recorded as TD-028 in `TECH_DEBT.md`
with the exact bound it is missing: `app/branches.tsx` and `app/holiday.tsx` (no upper bound
against `between 2 and 80`), `app/member/edit.tsx` and `app/staff/add.tsx` (gate on
`length > 0` against `between 2 and 120` / `2 and 80`). The member and staff RPCs raise their own
worded refusals, so those two currently fail *readably* — which is why they are debt and not a
second S2.

A second observation, recorded rather than fixed because it is outside the reported defect
(TD-029): clearing the subject box saves `NULL` and silently returns the course to its
template's subject, while the preview above shows it blank.

**Prevention** — Prose rule, in `checklists/DEFINITION_OF_DONE.md`: **a CHECK constraint on a
column a form writes is a rule that form must state before Save, not after.** No rung yet — one
is feasible (parse the length CHECKs out of `supabase/migrations/` and assert a matching bound
exists in the form that writes the column) and is proposed as a framework candidate rather than
built here, because it needs a column→form map this repo does not have.

**Process check** — **Yes.** `supabase/tests/15_course_communication.sql` asserted the exact
input that broke the form, and passed, for as long as the form has existed. The DB suite proved
the constraint refuses a two-character subject; nothing ever asked whether anything *upstream*
knew that. See the close-out.

---

## RC-022 — Sign out landed on the signed-out Overview, not on the number field
**Date:** 06-Sep-2026 · **Severity:** S2 · **Modules:** `app/(tabs)/more.tsx`, `app/profile.tsx`, `app/forgot-pin.tsx`, `app/register.tsx`, `src/data/access.ts`

**Symptom** — reported as *"on clicking signout its going to some other screen instead it shoud
go to enter number screen"*. More → Sign out ended the session and then showed the **Overview**
tab's "You are signed out" card, still inside the academy shell with the Home · Reports · More
pill under it, instead of *Welcome back* with the mobile-number field.

**Root cause** — two screens answer to the pathname `/`: the sign-in screen (`app/index.tsx`)
and the Overview tab (`app/(tabs)/index.tsx`). `router.replace('/')` has to pick one, and
expo-router's config sorter (`getRouteConfigSorter` in `fork/getStateFromPath-forks.js`) breaks
the tie in favour of the route that shares the caller's current **group** — so from any screen
under `(tabs)` the href `/` means Overview. Sign out on More was written as `router.replace('/')`,
the same call the pre-session screens use from the root stack, where the tie goes the other way.
The session did end (`supabase.auth.signOut()` was awaited); only the destination was wrong,
which is why the card on arrival said *You are signed out* rather than showing a stale account.
Both roles are affected equally, because the tie-break is about position, not permission — which
matches the report having no selectivity.

**Fix** — the sign-in screen is no longer named by its pathname anywhere. `src/data/access.ts`
carries `SIGN_IN_ROUTE` and `signInRootState()` (the root Stack on its first route, `index`,
and nothing else), and one hook, `src/components/useGoToSignIn.ts`, resets the root navigation
container to that state. A reset has no tie to break, and it also empties the stack — which is
what ending a session should mean: the browser's Back cannot step into the shell afterwards.
Sign out (More, profile) calls it after `signOut()`; the signed-out "Sign in" cards and every
*Back to sign in* call it directly.

**Sweep** — every `router.replace('/')` / `router.push('/')` under `app/`, found by
`grep -rn "replace('/')\|push('/')" app` (7 hits, 4 files): `(tabs)/more.tsx` ×2 (Sign out; the
signed-out card's Sign in — both inside the group, both wrong), `profile.tsx` ×2, `forgot-pin.tsx`
×2 and `register.tsx` ×1 (root-stack screens where the tie happened to fall the right way; changed
so that there is one way to reach sign-in, not a correct way and a lucky one). The two
`router.navigate('/')` on More's back arrow are NOT in the pattern: there `/` is meant to be
Overview, and the tie-break is what makes it so.

**Files** — `src/data/access.ts`, `src/components/useGoToSignIn.ts` (new), `app/(tabs)/more.tsx`,
`app/profile.tsx`, `app/forgot-pin.tsx`, `app/register.tsx`, `src/data/signInRoute.test.ts` (new
spec), `.evidence/sign-in-route-fail-first.txt`.

**How to verify** — `npx tsx --test src/data/signInRoute.test.ts` (2 tests; the second scans
every screen under `app/` and fails on a `replace`/`push` to `'/'`). In the app: sign in, More,
Sign out — *Welcome back* with the number field, no pill; the browser's Back stays on it. Walked
against a fixtures-mode `expo export` build on 06-Sep-2026 (see TEST_SUMMARY).

**Recurrence risk** — every new screen that wants "back to sign-in" will reach for the
pathname, because `/` is what the sign-in screen looks like it is called. The spec above holds
every screen under `app/` shut by scanning the source, so the next one fails at `npm run check`.
The class is wider than sign-in: **any** two routes sharing a pathname across a group boundary
resolve by position, and `homeMatch()` in `access.ts` already documents Overview's half of it.

**Prevention rule** — the sign-in screen is reached by `useGoToSignIn()` only; never by an href.
Rung: `src/data/signInRoute.test.ts`, in `npm run test:unit`.

**Process check** — no. The request was scoped, the screen was read, and the call it used was
the one every sibling screen used; only the router's tie-break, which lives in a vendored fork
inside `node_modules`, told them apart. A reachability question ("does the destination this
routes to actually succeed?", RC-013) asked at the gate would have walked Sign out, but that
question is already on the register and this fix adds the rung it lacked.

---

## RC-021 — "not loaded yet" and "not on the register" both rendered as the ADD form
**Date:** 06-Sep-2026 · **Severity:** S1 · **Modules:** `app/member/edit.tsx`, `app/course/edit.tsx`, `app/offering/edit.tsx`

**Symptom** — reported as *"on click of edit button it is opening add member form instead of edit
member"*, with a screenshot of a course roster. Tapping the pencil on a member opened
**"Welcome a new member"** with her name blank and an **Add Member** button.

Word for word what RC-012 was reported as, twelve days apart, by a different mechanism.

**Root cause** — the form decided WHICH form it was from the RESULT of its own lookup rather
than from the route:

```ts
const existing = id ? (roster.data ?? []).find(m => m.id === id) ?? null : null;
const title = existing ? 'Edit member' : 'Welcome a new member';
```

One `null` stood for three different things — no id was passed (Add), her record has not
arrived yet, and her id is not on the register — and the dialog answered all three with the Add
form. The dialog runs its own `useMembers` fetch (nine queries and an RPC) rather than reading
the list already on screen, so the second of those three is not a corner case: it is **every**
tap on Edit, for as long as that fetch takes. If the fetch failed or timed out, the Add form is
where it stayed — over a Save that would have created a SECOND record for somebody already on
the register.

**What the previous attempt missed** (correction round 2) — RC-012 fixed **where** the record is
read from: the fixture array became `useMembers`. It did not touch the three-way conflation,
because with the fixture the lookup answered instantly and the loading window was invisible.
The same commit gave `app/member/[id].tsx` separate `loading` and `missing` answers and left the
form beside it deciding its identity from a value that is `null` while a network call is in
flight. CP-002 has required all three states since adoption; this dialog rendered one.

**Fix** — Add-vs-Edit is now decided by the ROUTE (`const editing = typeof id === 'string' && …`,
the idiom `app/course/edit.tsx` already used), and `loading` / `failed` / `missing` are three
named answers with their own copy, no footer under any of them, and a Save that returns early if
a record was asked for and is not in hand.

**Sweep** — every form reachable with a record id in the route, found by
`grep -rn ".data ?? []).find|data?.find|const existing" app/ src/` (7 hits, 5 files):
`app/member/edit.tsx` (the report), `app/course/edit.tsx` (title already came from the route,
but its readiness gate omitted `courses` and `followUp` — the two queries that carry the course
and its saved rule — so an Edit whose course arrived last seeded itself blank and, because
`seeded` is never reset, stayed blank), and `app/offering/edit.tsx` (title came from the lookup;
an offering deleted while the list was on screen became "Add an offering" over a Save that
creates). `app/member/[id].tsx` and `app/course/[id].tsx` already answered all three states and
were not changed.

**Files** — `app/member/edit.tsx`, `app/course/edit.tsx`, `app/offering/edit.tsx`,
`src/components/editDialog.test.ts` (new spec), `.evidence/edit-opens-add-fail-first.txt`.

**How to verify** — `npx tsx --test src/components/editDialog.test.ts` (6 tests). In the app:
`/member/edit?id=<a real id>&state=loading` must read **Edit member · Fetching her record** over
a skeleton with no Save; `?id=<any id>&state=error` must offer **Try again**; `?id=<an id that is
not on the register>` must say **"That member is not on the register"**; `/member/edit` with no
id must still read **Welcome a new member** with **Add Member**. All four were walked in both
themes against an `expo export` build on 06-Sep-2026.

**Recurrence risk** — high, and not from carelessness: the shape is natural. `find()` returns
`undefined` for "still loading" and for "not there", and every form that opens on a record has
to resist writing `record ? edit : add`. The spec above holds all five sites shut by name.

**Prevention rule** — a form that can be opened on an existing record decides Add-vs-Edit from
the ROUTE, and answers loading, failed and missing before it renders. Rung:
`src/components/editDialog.test.ts`, in `npm run test:unit`.

---

## RC-020 — a day row that a picker cleared and only a CHANGED value refilled
**Date:** 06-Sep-2026 · **Severity:** S2 · **Modules:** `app/member/edit.tsx`, `src/data/repository.ts`, `src/data/mock.ts`, `src/data/memberDays.ts`, `app/course/edit.tsx`

**Symptom** — reported as *"when user selects a course make sure the frequency days are selected
based on course … dont allow user to reselect each time as its set already in course"*, and then
*"in edit form also no color for selected days"*. The member form's day chips showed nothing
selected while the line above them named the days: **"Leave blank and she follows the days
Postnatal offerings run — Mon, Tue, Thu, Fri"**, seven grey chips underneath.

**Root cause** — two of them, one per form, and neither was the colour.

*Add* — the row was maintained by **two mechanisms that only agree while the value changes**: each
picker's `onSelect` cleared it imperatively (`setDays([])`), and an effect refilled it, guarded on
the `course|branch` identity. Pick the course or branch **already showing** and the clear runs, the
key does not change, the re-seed does not run, and the row stays blank with nothing left to refill
it. The same unchanged pick also silently dropped her branch.

*Edit* — `Member` carried no `weekdays` at all, so the form had nothing to open her chips from.
That was not only a blank row: `memberWeekdays` reads a blank row as *she follows the course*, and
`update_member` (0027) reads that as **end her override**. Opening Edit on a member with days of her
own and pressing Save — changing nothing — closed her `member_schedules` row.

**Fix** — one mechanism, and a record that knows her days. The pickers no longer touch the day row;
the seed effect owns it and is the only writer, so a pick that changes nothing changes nothing.
`fetchMembers` now reads `member_schedules` through the same tested effective-dating resolver the
offering schedules use (`src/data/schedule.ts`), and `Member.weekdays` is `number[] | null` — null
being *she follows the offering*, which is not the same fact as an empty list. `openingDays`
(`src/data/memberDays.ts`) is the opening half of the rule `memberWeekdays` already stated for
saving: her own days when she has them, the course's when she does not, and a day the course has
since stopped running dropped because that chip is disabled and the form could not save it. A failed
read of `member_schedules` now fails loudly — its silent empty is the one here that ends with a
destructive write.

**Files** — `app/member/edit.tsx` · `app/course/edit.tsx` · `src/data/repository.ts` ·
`src/data/mock.ts` · `src/data/memberDays.ts` · `src/data/memberDays.test.ts` · the six
`Partial<Member>` builders in `src/data/*.test.ts` (one line each, no spec touched)

**How to verify** — `npm run test:unit` covers the rule (`src/data/memberDays.test.ts`, 11 cases).
In the app: Add member → pick a course → every day it runs is on; open the course picker again and
pick **the same course** → the days and the branch are still there. Edit a member who has days of
her own (fixture id `2`, Shazia Begum, Tue + Sat of a Tue/Thu/Sat course) → Tue and Sat open filled,
Thu open and unfilled, the rest disabled; Save without touching anything → her override is
unchanged.

**Recurrence risk** — the class is *a picker that runs the consequences of a change on a selection
that changed nothing*. Searched `app/**` for `onSelect` handlers that clear adjacent state
(`grep -rn "onSelect={" -A 8 --include=*.tsx app` filtered for `set…([])`, `set…('')`, `set…(null)`
excluding picker chrome): **3 sites, all fixed in this change** — the member course picker (branch),
the member branch picker (days), and the course form's template picker, where re-picking the
template already showing threw away the wording written for that course. `app/register.tsx`'s hit
was picker chrome, not state.

**Prevention** — no rung — prose only. There is no audit that can see "this clear and that re-seed
are the same field owned twice"; it is a shape a reviewer recognises, not one a script does. The
rule stated for the next reader: **a row that an effect seeds has exactly one writer, and a picker's
consequences are guarded on the value actually changing.**

**Process check** — Yes, partly. The add-form seeding shipped with its own comment describing
behaviour nobody had exercised on an unchanged pick, and the edit form's blank row was documented as
deliberate ("her saved override is not on the Member record") without following that sentence to
what Save then does with a blank row. A design note that records a limitation is not the same as
one that records its consequence. Not raised to `/framework-update`: the gap is this app's habit of
writing the rationale and not the failure mode, not a missing step in the track.

---

## RC-019 — a routing decision with one input sent every unknown number into a form that answered 409

**Date:** 06-Sep-2026 · **Severity:** S2 · **Modules:** sign-in, registration, auth-lookup

**Symptom** — In the owner's words: *"I entered a number completed registration process and set
new pin and it did not move further screen to dashboard and but that when i login with same
number again it brough me back to registration page."* The registration form also carried
*"This academy is already registered. Sign in with your mobile number and PIN instead."* at the
top of a form it was still inviting her to fill in.

**Root cause** — `continueDestination` decided the destination from ONE input, whether the
number had an account, and mapped `false` straight to `register`. That mapping encodes an
assumption nobody ever checked: that an unregistered number MAY register. It may not.
Registration is the one-time creation of the academy admin, latched by
`app_settings.bootstrap_completed` (0002, one-way), and `auth-bootstrap` answers 409 to every
call after the first — and per the owner on 06-Sep-2026 there is no self-registration at all:
*"there is no registration page for staff — super admin inside app creates pin and shares with
staff."* The decision was missing an input, and the missing input surfaced as a CYCLE rather
than as an error: form → 409 → no account created → the lookup truthfully says "not
registered" → the same form.

**Fix** — **NOT YET FIXED. The client-side fix was built and reverted the same day, and this
entry is kept so the next attempt does not repeat it.** The attempt gave `continueDestination`
a second input (`auth-lookup` returning `registration_open`) and kept an unknown number on the
sign-in screen with "ask your academy admin". The owner rejected it within the hour: the
registration screen is exactly where an unrecognised number belongs — *"if doesnt exist user
goes to registration know why restricting"* — and the earlier answer it was inferred from
("there is no registration page for staff") was about who creates STAFF accounts, not a rule
about this screen. Reverted in full: `signin.ts`, `repository.ts`, `api.ts`, `app/index.tsx`,
`auth-lookup/index.ts` and the amended spec are all back to their prior behaviour.

**Where the fix actually belongs** — on the SERVER, not the client. The loop exists because
`auth-bootstrap` refuses every call after the first (`app_settings.bootstrap_completed`, a
one-way latch) while the client keeps offering the form. Making the form succeed for a new
number is the fix; refusing to show the form was treating the symptom, and treating it in the
place the owner could see it. Requires a decision about what a self-registered number becomes,
since `one_super_admin` allows exactly one super admin.

**Recurrence risk** — Every routing decision computed from a subset of the facts that govern it.
The tell is a mapping that reads as total (`false → register`) over a domain that has a second
axis nobody wrote down. **The sibling sweep found the other call site and it is correct:**
`app/index.tsx:119` also opens `/register`, but only on `auth-login`'s "has not been registered
yet" sentence, which the server sends only when `!bootstrap_completed` — the same guard,
enforced server-side.

**Prevention** — The destination now carries the reason in its own name: `ask-admin` cannot be
returned by accident the way `register` was, because nothing else in the app produces it.

**Process check** — **YES, and it is worth naming.** This exact destination was approved by the
owner at a Track C gate on 05-Sep-2026 (`requests/2026-09-05-mobile-number-not-validated.md`),
having been shown that registration is a one-time bootstrap and that the form would say so. The
gate presented a true fact and the wrong conclusion from it: that a sentence above a form is a
sufficient substitute for not offering the form. No gate in the process asks *"can the
destination this routes to actually succeed?"* — a reachability question about outcomes rather
than routes, which is what would have caught it. Flagged for `/framework-update`.

---
## RC-018 — the backdrop was composited and still black, because the dimming was tuned for the bug
**Date:** 05-Sep-2026 · **Severity:** S3 · **Modules:** `src/theme/tokens.ts`, `src/components/FormDialog.tsx`, `src/components/Sheet.tsx`

**Symptom** — reported by the owner, for the SECOND time on the same surface: *"on click of any
button which opens a form dialog is appear but the background is black but it should not it
should show the screen in background."* Supplied a reference image of another application's
dialog over its own list, with the list behind clearly readable. Dark theme.

**Root cause** — `DARK.scrim` was `rgba(6,2,7,0.7)`, and that value was chosen while a dialog
route still painted an opaque `theme.bg` panel over the screen behind it. With nothing visible
underneath, the scrim's whole job was to say "this is over something" and 0.7 was reasonable —
it was hiding nothing, because nothing was showing. RC-016 removed the panel and did not
revisit the number. 0.7 of near-black over a `#08040A` background leaves 30% of the screen
behind, which composites to imperceptible. **The composition was fixed and the value tuned for
the broken composition was left in place.**

**Fix** — `DARK.scrim` to `rgba(6,2,7,0.5)`: half the screen behind survives instead of under a
third, and FormDialog's existing 14px blur keeps it a backdrop rather than competing content.
`LIGHT.scrim` is deliberately UNCHANGED at 0.42 — the report is the dark theme's, the light
value already satisfied the bound, and lowering it is the riskier direction because the dialog
card is itself light and would lose separation the dark theme gets for free.

**One token, three backdrops.** `theme.scrim` is read at exactly three sites — `FormDialog.tsx`
(every form dialog), `Sheet.tsx:45` (the bottom sheet) and `Sheet.tsx:194` (ConfirmDialog) —
found by grepping `theme.scrim` across `src/` and `app/`. Two further mentions are prose only:
`set-pin.tsx` names the token in a comment but uses `deepControl`, and `Dropdown.tsx` describes
a sheet it no longer opens. So the requester's "across all forms" is satisfied by the token,
not by three edits.

**How to verify** — `src/theme/scrim.test.ts`, in `npm run check`. It bounds both scrims in
BOTH directions: at most 0.55, or the screen behind stops being legible as a place; at least
0.2, or the scrim stops reading as a backdrop at all and the card floats on live content.
**Observed failing against the pre-fix tree**: `DARK.scrim alpha 0.7 hides the screen behind
it; must be <= 0.55`. The light assertion PASSED before the fix, which is the test agreeing
with the reported selectivity rather than being written around it.

**Recurrence risk** — the class is "a constant tuned around a defect, left behind when the
defect is fixed". It is not specific to colour: any value chosen to compensate for something —
a timeout sized for a slow query, a retry count sized for a flaky call, a z-index sized for a
stacking bug — becomes wrong the moment the thing it compensated for is repaired, and nothing
about the compensating value looks wrong on its own afterwards. Worth asking, at every root-fix:
what was tuned around this?

**Prevention** — `src/theme/scrim.test.ts` (5 assertions). It is a real rung and it is a
NARROW one: it bounds a number, and it cannot see a rendered pixel. A scrim inside the bound
with, say, a 40px blur over it would pass here and fail a person. The rung that would catch
that is a render check, and this repo has none (TD-006, G8 FAILs on an empty log).

**Process check — YES, and this is the more important half.** Round 1 (`c5620a0`) verified
itself with screenshots taken by the agent that wrote the change, against a criterion
("the screen behind is visible") that the same agent chose. Both halves were true and the
requester still saw a black screen, because "visible" and "legible" are different claims and
nothing forced the distinction. **No rung existed that could disagree with the author.** The
test above is the first one that can: it states the criterion as a number, in the repo, ahead
of the judgement. Flagged for `/framework-update` — a correction round that reaches the
requester twice is a gate finding, not a coding mistake.

---

## RC-017 — the app said SENT for an email it never sent
**Date:** 05-Sep-2026 · **Severity:** S1 · **Modules:** `supabase/functions/send-followups/`

> **NUMBERED RC-017, NOT RC-015.** It was written as RC-015 by one session while another was
> writing a different RC-015 and an RC-016 in parallel; both landed in the same worktree. The
> register says never renumber, and the register is right — but two entries cannot share an id,
> and the one that arrived second is the one that moves. Nothing else in this entry changed.
> `rung: scripts/audits/check-rule-coverage.mjs`, which is what caught the collision.

**Symptom** — reported by the owner: *"I just clicked on send communication, it says message sent
but I don't receive any message."* The Result screen showed **1 sent · 0 failed · 0 excluded** and a
green SENT beside her name. `email_messages` agreed: `status='sent'`,
`provider_message_id='dev-869384b3…'`. Nothing had been sent.

**Root cause** — two faults, and the second is the one that made the first invisible.

1. **The secret names did not match.** The account had `AWS_SES_REGION` and `SES_FROM`; the
   function read `AWS_REGION` and `SES_FROM_ADDRESS`. `EMAIL_PROVIDER` was absent entirely, and it
   was the first thing checked — so `getEmailProvider()` returned the dev provider before it ever
   looked at the AWS values.
2. **The dev provider reports success.** It writes the message to the function log and returns
   `{ ok: true, providerMessageId: 'dev-…' }`. `send-followups` cannot tell that from a delivery,
   so it recorded `sent`, bumped `last_emailed_at`, and told the screen 1 sent.

The fallback was deliberate — *"Never throws: a missing secret degrades to logging, not 500s"* —
and `SETUP.md` even predicted the consequence: *"every message is recorded status='sent' with
provider='dev' while nothing leaves the building. A send that looks successful and sent nothing is
worse than one that fails."* It was written down, and it still shipped, because nothing enforced it.

**Fix** — `resolveEmailProvider()` returns the provider **and what is missing**, and
`send-followups` refuses with a 503 naming the absent secrets **before the batch row is written**,
so a refused send leaves nothing to explain. `EMAIL_PROVIDER` is no longer the switch: four complete
AWS values are. A separate flag was one more thing to forget, and forgetting it looked like success.
Both spellings of the region and the from-address are accepted, and `SES_CONFIG_SET` is passed to
SES when present. Setting `EMAIL_PROVIDER=dev` explicitly still logs instead of sending — that is a
real answer, and now the only way to reach the dev provider on a deployment.

**AMENDED 05-Sep-2026, after the next send.** With the refusal in place the send reached SES and
failed honestly — `provider='ses'`, `SES 400: {"message":"Missing final '@domain'"}` — which is
progress and still not good enough. That message names neither the field nor the value, and the
RECIPIENT was demonstrably fine (25 characters, trimmed, in `to_email`), so the only way to know it
meant the SENDER was to reason it out. `resolveEmailProvider()` now checks the from-address SHAPE
before any SES call and quotes the value back: *"SES_FROM_ADDRESS is \"x\", which is not an email
address. Use name@example.com, or \"Academy <name@example.com>\" with the angle brackets."*
Showing the value leaks nothing — a from-address is on every email the academy sends — and it is
the only thing that makes the error actionable. The check excludes `=` and `,` from the address on
purpose: both are legal in a local part, neither is ever used, and their absence catches the two
mistakes people actually make in a secrets field — pasting the whole `SES_FROM=someone@example.com`
line, and putting two addresses in one value. My first version of that regex accepted the pasted
line; it was caught by running the pattern against real inputs rather than reading it.

**AMENDED AGAIN 05-Sep-2026, the third link in the same chain.** The shape check from the last
amendment fired on the next send, and it was right: `SES_FROM_ADDRESS` held
`"UniqBrio <uniqbotzinfo@gmail.com>"` -- **with the quote characters stored as part of the value**.
`supabase secrets set FROM="X <a@b>"` in PowerShell keeps the quotes, and so does pasting a quoted
value into the dashboard field. The value reads correctly to a person and is wrong to every
consumer. `unquoteSecret()` now strips one or more matching wrapping pairs from **every** secret
this function reads, not just the from-address, because a quoted `AWS_SECRET_ACCESS_KEY` fails far
worse: the signature simply does not match and SES answers 403 with nothing pointing at the quotes.
Stripping is safe here because none of these secrets may legitimately begin AND end with a quote --
and `"UniqBrio" <a@b.com>`, where the quotes correctly wrap only the display name, ends `>` and is
left untouched.

**A latent defect in the guard itself, found while fixing the above.** `FROM_SHAPE` was built with a
plain template literal, and a plain literal eats an unrecognised escape: `\s` became the letter
`s`, so `<\s*...\s*>` compiled to `<s*...s*>` and matched a run of *s* where it meant whitespace.
It still accepted the ordinary `Academy <me@example.com>` -- zero s's, zero spaces -- which is
exactly why nothing caught it; `Academy < me@example.com >` was refused for no stated reason. Both
halves are now `String.raw`. This one never reached a user and gets no entry of its own; it is
recorded here because it shows the shape of the mistake: the half of the pattern that was correct
(`ADDR`) was already `String.raw`, so the file looked consistent at a glance.

**Recurrence risk** — the class is "a degraded fallback that returns the success shape". It is
worth grepping for on any provider abstraction added later: a stub that satisfies the interface
will satisfy the caller too.

**Prevention** — `src/data/fromAddress.test.ts` (14 assertions), which imports
`supabase/functions/_shared/from-address.ts` — **the module the Edge Function imports**, not a copy
of the rule kept in step by hand. A copied regex would have passed here while production failed,
which is the failure this whole entry is about. It runs in `npm run check` via `test:unit`, and it
covers the quoted value from the live failure end to end.

**The gap that remains, narrowed but not closed.** `resolveEmailProvider()` itself still has no
spec — reaching it means mocking `Deno.env` inside an Edge Function — so the *name mismatch* half
of this entry is still guarded by prose alone. What is now tested is the part that was extractable:
unquoting and the from-address shape, the two rules that decide whether a secrets field is usable.
Pulling the env lookup behind an injectable reader would close the rest and was not done here.

**Left standing:** the one `provider='dev'` row from 05-Sep. It is the evidence, and deleting the
record of a message the academy believes it sent would be the same lie one layer down.

---

---

## RC-016 — a global screenOption silently cancelled a per-screen presentation, and both sites still read as correct
**Date:** 05-Sep-2026 · **Severity:** S3 · **Modules:** `app/_layout.tsx`, `src/components/FormDialog.tsx`

**Symptom** — "The dialog should open top of screen from where that button is clicked or form is
opened. same goes for all forms." Clarified by the requester: the dialog itself was right; what
was wrong was behind it — "the background from where dialog is opened should be shows as blurred
screen as dialog is opens". A screenshot of "Welcome a new member" showed the card floating on a
flat near-black field with no trace of the screen it was opened from.

**Root cause** — `Nav`'s `<Stack screenOptions={{ contentStyle: { backgroundColor: theme.bg } }}>`
applied to every screen in the app, the `transparentModal` dialog routes included — at the time
seven, the six forms and `upload`. So each dialog route painted an opaque `#08040A` panel over the screen
`transparentModal` had gone to the trouble of keeping mounted. **Neither site was wrong on its own.** The screenOption is the right
default for the screens that are pages; the per-screen `presentation` is the right option
for the ones that are dialogs; the defect existed only in their composition, which is written down
nowhere and visible in neither file. The 04-Sep correction that introduced `transparentModal`
tested the half it changed — the form was no longer a whole page — and recorded "the screen
underneath stays mounted and visible" in three places, a claim that was true of `mounted` and
false of `visible` from the moment it was written.

**Fix** — The three properties that make a route a dialog are now ONE named object,
`DIALOG_SCREEN` in `app/_layout.tsx`, carrying `presentation`, `animation`, `headerShown` and the
`contentStyle: transparent` that was missing; the dialog routes spread it rather than each repeating
— and each being able to drop — a property. The ground moved to a `View` wrapping the whole
`Stack`, so a dialog route opened cold still lands on `theme.bg` instead of the navigator's white.
`FormDialog`'s scrim gained `backdrop-filter: blur(14px)` on web, which is what keeps the
now-visible screen a backdrop rather than competing content. This addresses the cause because the
composition is no longer something six call sites have to get right independently: there is one
place where "what makes a route a dialog" is written, and it is the place a future option is added.

**Files** — `app/_layout.tsx`, `src/components/FormDialog.tsx`,
`docs/registers/FEATURE_TRUTH.md`, `requests/2026-09-05-dialog-opens-at-top.md`.

**How to verify** — Open any of the dialog routes from a screen (not by URL): member/edit,
course/edit, offering/edit, staff/add, holiday, change-mobile, upload, match. The screen behind must be
recognisable through the scrim and blurred, in BOTH themes. The mechanical check that it has not
regressed: every route that renders a `FormDialog` must take `DIALOG_SCREEN` —
`grep -c "options={DIALOG_SCREEN}" app/_layout.tsx` equals the number of routes that render a
`FormDialog` — 8 since decision 009 added `match` — and no `Stack.Screen` line carries
`presentation: 'transparentModal'` inline: `grep -c "options={{ presentation: 'transparentModal'" app/_layout.tsx`
is **0**. Compare the two greps rather than trusting the number written here; it moves every time a
screen becomes a dialog, and a stale count reads as a failure.

**Recurrence risk** — `match` was the live second instance when this entry was written: declared
`transparentModal`, described in its own comment as "a dialog over the screen that opened it", and
drawing an opaque `ShellScreen` that had never shown anything underneath. It was deliberately left
alone by THIS change — the request scoped to forms, and `match` was not one — and was converted
hours later, in the same working tree and on the same day, by decision 009. **That overlap belongs
in this entry:** two changes reached `app/_layout.tsx` concurrently, and the second one adopting
`DIALOG_SCREEN` rather than copying three properties is the only reason `match` did not ship the
third-half bug a second time. Which is the argument for the named object, made by accident. The
general class is "a global default and a per-screen option that only conflict
when composed". Every other `screenOptions` property is a candidate: `headerStyle`,
`headerTintColor` and `contentStyle` all apply to routes that draw their own chrome. The same
shape exists wherever this app sets a default centrally and overrides it locally — the theme
provider and `AppShell` are the two other places. Nothing automated catches it: a gate would have
to render the route and look at what is behind the dialog, which is why the verify step above is
a human one.

---

## RC-015 — Continue accepted any ten digits, because a deliberate divergence from the canvas lived only in a code comment
**Date:** 05-Sep-2026 · **Severity:** S3 · **Modules:** `app/index.tsx`, `src/data/signin.ts`, `supabase/functions/auth-login`, `app/register.tsx`

**Symptom** — "On entering mobile number its not validating mobile number on continue for any
random mobile number its leading us to pin screen." Reported against the live project, where
`bootstrap_completed` is `true`.

**Root cause** — Not a missing check. `toPin` never called the server *on purpose*: the canvas'
`doContinue()` validates the number against the account list, and the app replaced that with
"Continue always advances, the server decides on the PIN submission" to avoid shipping a public
phone-lookup endpoint — a staff-enumeration oracle. **That decision was recorded in a comment in
`src/data/signin.ts` and nowhere else** — no ADR, no register row — so from outside the file it
was indistinguishable from an oversight. The behaviour also degrades exactly as reported once
`bootstrap_completed` flips: pre-bootstrap an unknown number does reach registration, via
`auth-login`'s 409 and `needsRegistration`; post-bootstrap `auth-login` deliberately answers the
same generic sentence for an unknown number and a wrong PIN, so nothing ever reaches registration
and every number stops at the PIN screen. The reporter was seeing the post-bootstrap half of a
documented design, with the document invisible.

**Fix** — Two halves, and the second is the one that matters.

*The behaviour:* `supabase/functions/auth-lookup` answers one boolean, `registered`, for a phone
number. Continue calls it and routes — registered to the PIN step (the PIN is still required),
unregistered to registration, and a lookup that did not answer stays put with the reason.
`continueDestination` is the pure decision, `isRegisteredNumber` is the one place that decides
live-vs-fixtures (CP-001).

*The cause:* the divergence is now **ADR 016** (`docs/decisions/008`) with the trade-off, who
accepted it and what was rejected; the accepted enumeration risk is **TD-017**. The next person
to read `auth-lookup` finds out in the file header why an endpoint that leaks staff numbers is
there on purpose.

**Files** — `supabase/functions/auth-lookup/index.ts` (new), `src/data/api.ts`,
`src/data/repository.ts`, `src/data/signin.ts`, `src/data/signin.test.ts`, `app/index.tsx`,
`app/register.tsx`, `docs/decisions/008-continue-validates-the-number.md`,
`docs/registers/DECISION_LOG.md`, `docs/registers/TECH_DEBT.md`.

**How to verify** — With the live project: enter a number that has no `app_users` row and press
Continue — the registration screen opens, and its Back returns to sign-in. Enter the super
admin's or a staff member's number — the PIN screen opens and still demands a PIN. Kill the
network and press Continue — the number screen stays put and says the number could not be
checked; it must NOT advance and must NOT go to registration. In JS:
`npx tsx --test src/data/signin.test.ts` — 22 cases, three of which are `continueDestination`
and one of which pins the `null` case.

**Recurrence risk** — The defect class is *a deliberate divergence from the design source of
truth recorded only in code*. Swept for the behavioural sibling — a screen advancing a person
past an identity step without validating — by grepping `isCompletePhone|phoneDigits` across
`app/` and `src/` and reading all four screens that handle a phone number.
**One site found, `app/index.tsx`, and it is the one fixed.** `forgot-pin.tsx` receives the
number from the PIN step and verifies it server-side (`recoveryQuestions`/`recoveryVerify`),
`register.tsx` is validated by `auth-bootstrap`, and `change-mobile.tsx` reads the signed-in
identity. The *documentation* class was not swept and is the larger risk: any other place where
the app knowingly departs from `design/RosiFit App.dc.html` with only a comment to say so.

**Prevention** — No rung, and a rung is not currently feasible: no check can tell a deliberate
divergence from the canvas apart from an unimplemented one. Prose rule, in
`checklists/DEFINITION_OF_DONE.md`: **a departure from the design source of truth gets an ADR,
not a comment.** A comment is invisible to the person holding the canvas next to the app, which
is exactly who reports it as a bug.

**Process check** — **Yes.** The build that made this choice wrote a thorough comment and no
record, and nothing asked it for one. See the framework-update note in the close-out.

---

## RC-014 — a mistyped joining date was imported as a real one, because the cast did not raise
**Date:** 05-Sep-2026 · **Severity:** S2 · **Modules:** `supabase/migrations/0028_bulk_import_members.sql`

**Symptom** — a bulk-import probe row carrying `01/09/2026` came back **`inserted`** where the
spec says `failed`, and landed on the register with a joining date nobody had written.

**Root cause** — `0028` guarded the date the way a cast is usually guarded:

```sql
begin
  v_joined := nullif(btrim(coalesce(v_row->>'joined_on', '')), '')::date;
exception when others then   -- "not a date"
```

That assumes `'01/09/2026'::date` raises. **It does not.** Postgres parses it under the
session's `DateStyle` and returns a perfectly real date — just not the one the academy meant.
The exception block only ever caught outright gibberish; the dangerous input is the one that
*is* a date, in the wrong order. A member's `joined_on` becomes
`member_enrollments.effective_from`, which decides every session she was ever expected at, so a
silent slip there rewrites her whole attendance history.

The client already refused it (`src/data/memberImport.ts` matches `^\d{4}-\d{2}-\d{2}$`).
The server did not, and the server is the boundary that writes.

**Fix** — `0029` checks the SHAPE before the cast: `YYYY-MM-DD` or a named refusal. The cast
stays, guarded, for a well-shaped date that is not a real day (`2026-02-31`). A future date is
still `create_member`'s own refusal, inside the per-row sub-transaction.

**How it was found** — the ADR 007 rolled-back rehearsal against production, run immediately
after `0028` was applied. Nothing persisted. **The committed spec already asserted the correct
outcome** — `22_bulk_import_members.sql`, *"three failed -- and each is named below"* — and had
never been executed, because no machine here has PostgreSQL 16 (ADR 005). The spec was right
and unread; that is the cost of the unrun harness, in one line.

**Guard** — seven assertions appended to `22_bulk_import_members.sql` pinning the slashed date,
the impossible day, the future date and the good one. Still unrun for the same reason, so the
live guard today is the shape check itself plus the rehearsal transcript in `TEST_SUMMARY.md`.

**Recurrence risk** — moderate, and general. Any `text::date`, `::int` or `::uuid` behind
`exception when others` in this schema makes the same assumption: that bad input raises. For
dates it usually does not.

**Prevention** — prose. The real rung is the harness running in CI, which would have failed
this on the commit that introduced it.

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

**AMENDED 05-Sep-2026 — the first fix did not reach the person reporting it.** The same error
came back, and the log dated the dev server at ~8 hours old: `metro.config.js` had not existed
when it started, and **Metro reads that file once, at startup**. So the repository looked fixed,
`npm run export` passed, and the app in front of the owner was unchanged. A fix that depends on
somebody restarting a long-running process is not a fix.

The shape was wrong, not just the rollout. `import('exceljs')` leaves the CHOICE OF BUILD to the
bundler, and a config file then has to take that choice back. `memberXlsx.ts` now imports
**`exceljs/dist/exceljs.min.js` by path**, so there is no choice to take back — verified first
that this build makes zero `require()` calls and loads under plain node, which is why it is safe
on web, on native, and in the Node renderer that prerenders these routes (that renderer,
`router-server/node/render.js`, was the half actually failing). `metro.config.js` stays, demoted
to a second line of defence against a future plain `import 'exceljs'`.

**Guard** — measurement of the emitted bundle, recorded in `TEST_SUMMARY.md`: across **all** of
`dist/`, server-rendered HTML included, `archiver` 0 files, `unzipper` 0, `async/dist` 0,
`lib/core.js` 0; `exceljs` its own chunk. The specs also build their fixtures through the same
loader the app uses, so they exercise the build that ships. That is evidence plus one real
coupling — still not a rung; nothing re-checks the bundle on the next change.

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

**AMENDED 07-Sep-2026** — "a real period control replaced the caption" was **not true when it
was written, and stayed untrue for four days** (`requests/2026-09-07-reports-date-filter.md`).
What shipped on 03-Sep was the period as *state*: resolved, handed to the query, printed in the
subtitle and stamped on every exported row — but with **no control anywhere on the screen**.
`setPeriod` had no call site, so the report was pinned to whatever calendar month it opened on
while the subtitle named that range as though somebody had chosen it. The screen had stopped
showing figures it never counted, which is what this entry is about; it had not stopped naming
a period nobody picked. The control exists now: the shared `PeriodPanel`, mounted above the
state branch so it survives the loading, error and empty states.

**The lesson is about the register, not the screen.** A fix paragraph is written from the plan,
and here the plan's last item silently did not land. Nothing caught it because a claim about a
*rendered control* has no rung: the typecheck was clean (the state was genuinely used), the
specs were green (`report.test.ts` covers the arithmetic, which was correct), and no test
asserted that anything on screen could reach `setPeriod`. Dead state reads exactly like live
state from every angle except the running app. `src/components/reportsPeriodFilter.test.ts` is
that missing rung — its first assertion is that `setPeriod` has a call site at all.

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
`GET {SUPABASE_URL}/rest/v1/courses?select=name&name=eq.<name>` with the session's JWT.

**AMENDED 07-Sep-2026.** The second half of this step said: *"Then sign in as a non-super-admin
staff member and add one: the screen must show the refusal and the row must not exist. Both are
the point — a screen that cannot report a refusal is the defect."* Migration 0038 grants staff
the course write, so that refusal no longer exists to be reported and the step as written now
fails against correct behaviour. Sign in as staff, add a course, and the row **must** exist. What
the step was really guarding — that a refusal reaches the screen instead of a false "saved" — is
now exercised by letting the SUBSCRIPTION lapse rather than by the role, and that path is
unchanged. Note the intervening period was the defect this migration also closed: between the
`saveCourse` RPC landing and 0038, Add Course was offered to staff by
`app/(tabs)/courses.tsx` and refused by `save_course` — this very shape, one role over.

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
