# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS

- FEATURE / SCREEN: **The upload attendance dialog** — `app/upload.tsx` (route `/upload`,
  a dialog over the screen that opened it), reached from `course-upload` in the course
  header, `course-day-upload` on the selected day of the course week strip
  (`app/course/[id].tsx`), and `attendance-upload` on the Attendance tab
  (`app/(tabs)/attendance.tsx`). Behind it: `supabase/functions/csv-import/index.ts`
  (`preview` / `commit`) and `public.commit_csv_import()` (migration `0024`).

- CURRENT BEHAVIOUR (read in the files, 07-Sep-2026):
  1. **The same file twice is REFUSED outright.** `csv-import` preview counts completed
     imports with the same `file_sha256` and throws `409 · "This file has already been
     imported."` (`index.ts:76-78`). Nothing on the screen offers a way past it.
  2. **A DIFFERENT file for a day already imported is allowed, and the operator is told
     AFTERWARDS.** Preview finds the most recent completed import for that offering and date
     and returns it as `supersedes`; the dialog renders it only on the **result** screen, as
     the `upload-superseded` note: *"‹file› was imported for this course on this date. This
     file CORRECTED that register rather than adding to it — nobody is counted twice."*
     By the time she reads it the write has already happened. There is **no confirmation
     before the override**, and `supersedes` is not shown anywhere in the `clash` dialog.
  3. **The date clash IS already asked** (built round 3, below). When a day was chosen and the
     file's `Created on` day differs, phase `clash` shows: *"This file is from ‹file day› /
     You opened ‹opened day›. ‹file› says it covers ‹file day›, so importing it updates the
     ‹file day› register for ‹course · branch› — not ‹opened day›."* with **Import for ‹file
     day›** and **Choose another file**. It says "updates the register"; it does **not** say a
     register for that day already exists, nor that its data will be overridden — at that
     moment the client does not know, because `supersedes` only comes back from preview, which
     has not run yet.
  4. **The clash is asked only when a day was actually chosen** (`openedDay` — the `date`
     parameter or a preselected session). Opened from the course header or the Attendance tab
     there is no chosen day, so nothing is asked and the file imports against its own day.
  5. **A day with no session already works, in code.** `commit_csv_import` (0024) creates the
     session when none exists for that offering and date (`source = 'import'`, holiday-aware,
     `expectation_mode = 'all_enrolled'` when the date is off the schedule), writes `present`
     / `extra` for everyone named, inserts `absent` for every expected member not named,
     refreshes the session counts, sets the session `status = 'completed'`, and recomputes
     member stats. Whether the requester is asking for this or reporting that it does not work
     is **Q7**.
  6. **Override is an UPSERT, not a replace.** Named rows land with
     `on conflict (session_id, member_id) do update set status = excluded.status, …`, but the
     absent sweep is `on conflict … do nothing`. So a member marked **present** by the first
     file and **not named** in the corrected file **stays present**. Members and enrolments
     created by the first file also stay. See **Q2** — this is the load-bearing gap between
     what "override" says and what the database does today.
  7. **With no Supabase project configured** (fixtures mode — which is how the DoD browser
     check is run) `fixtureOutcome()` hard-codes `supersedes: null`, so an override cannot be
     exercised at all in the harness.

- DESIRED BEHAVIOUR: requester's exact words —
  *"Allow users to override the attendnace if they are re uploading same csv with modified
  data and show message that you existing data will be overridden.*
  *Also if i am uploading attendance file by selecting date as 3rd sep and i am uploading a
  csv file in which date is 31 aug show pop up that the uploaded session is for 31aug on
  upload it will override the 31st aug attendance record on click confirm override thats all.*
  *Also when user uploads csv for a day when there was no session and in csv the date is
  present then upload attendance and update that session was taken today and based on that
  update attendance of each member."*

  Read as three parts:
  1. **RE-UPLOAD IS ALLOWED, AND SAID OUT LOUD FIRST.** A file re-uploaded for a day that
     already has a register overrides it, and the operator is told *"your existing data will
     be overridden"* — the requester's phrasing is a warning, which reads as **before** the
     write, not the after-the-fact note that exists today.
  2. **THE DATE-CLASH POPUP NAMES THE OVERRIDE.** Selecting 3 Sep and picking a 31-Aug file
     must say the uploaded session is for **31 Aug** and that importing it **will override the
     31 Aug attendance record**; **one** confirm, and that is the end of the questions —
     *"on click confirm override thats all"*.
  3. **A DAY WITH NO SESSION.** When the file's date names a day with no session, import the
     attendance, record that a session **was held** that day, and set every member's
     attendance from it.

- WHY: `unknown`. The requester gave no motivation. The only evidence is the shape of the ask:
  a correction to a register should be possible, and should not be discovered afterwards.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Named explicitly because the
  requester's words touch their edges: the rule that **the session date comes from the file,
  never from the screen**; the one-session-per-offering-per-day invariant
  (`sessions_unique_live`) and the one-record-per-member-per-session invariant
  (`attendance_unique_live`); the atomicity of the commit (all rows land or none do); CSV
  parsing and its refusals; the de-duplication of repeated names; the staff-name filter that
  keeps the instructor off the register; the two `Landed` counts (With email / No email) and
  where those groups land; `autoDecisions()` filing an unresolved row as somebody new; the
  audit log; the alias and merge mechanism; the follow-up rule. Guardrail 1 also binds — the
  follow-up list stays DERIVED. *"On click confirm override thats all"* additionally forbids
  adding a second confirmation step to an ordinary import.

- CORRECTION ROUND: **4** on this surface — but only part 2 is a correction; parts 1 and 3 are
  new ground on the same screen. Track B reads all three before proposing.
  - Round 1 — `requests/2026-09-05-upload-attendance-as-dialog.md`: page → dialog, four steps
    and the row-by-row review kept.
  - Round 2 — `requests/2026-09-06-upload-flow-shorter-no-email-resolution.md`: cut to
    Course · File · Import, `/match` deleted, unresolved rows auto-file as new members,
    "add display name to existing member" became a real merge (migration `0032`).
  - Round 3 — `requests/2026-09-06-upload-imports-on-pick.md`: the file imports **on the pick**,
    the step bar and the Import button went, and **the date-clash confirmation was built** —
    the requester's example that round was the same one as here (6 Sep + a 31-Aug file). Its
    AS BUILT records Q6 answered as *"wording is the implementer's; the requester gave sense,
    not strings"* and Q7 as *"the clash asks only when a day was actually chosen"*.
    **What round 3 missed, in this round's terms:** the clash message describes the day the
    file will be written to, and never that an existing register for that day is about to be
    replaced. Round 3 was never asked for that — the requester's words that round stopped at
    *"i will update the 31 aug record"*. Track B must state this itself at B1 rather than take
    it from here.
  - Round 3's AS BUILT also carries two constraints unchanged into this round: **`csv-import`
    is not deployed**, so any Edge Function change here is inert until it is; and
    **`bash db/harness/test.sh` has never been run on this machine** (no `psql`), which binds
    if this round produces a migration.

## OPEN QUESTIONS — the requester did not settle these; Track B's first gate must

- **Q1. Does "same csv" mean the IDENTICAL file, or a corrected one?** The words are *"same
  csv with modified data"*, which is a different file and is already allowed. An identical
  file (same `file_sha256`) is refused with 409 and the requester may or may not be asking for
  that refusal to lift. `unknown`, and it decides whether `index.ts:76-78` is touched at all.
- **Q2. What does "override" mean for a member the corrected file DOES NOT name?** Today she
  keeps the `present` the first file gave her (current behaviour 6). A true override would
  flip her to `absent` — or remove her record entirely if she was never expected. The
  requester said "override the attendance record" and nothing about this case. **This is the
  most load-bearing unknown here:** a partial override silently leaves the very row the
  corrected file was uploaded to fix, and no screen would say so.
- **Q2b. And for a MEMBER the first file created by mistake?** She and her enrolment survive
  the override. Not mentioned either way.
- **Q3. WHEN is "your existing data will be overridden" shown?** The word "warning" reads as
  before the write, but the client only learns a register exists from `csvPreview`, which
  stages a `csv_imports` row (`status = 'previewed'`) before it answers. So a confirm placed
  there sits **between preview and commit** — and abandoning it leaves a staged `previewed`
  row behind, which nothing currently cleans up. Alternative: keep it after the write, as the
  note that already exists. Not stated.
- **Q4. One dialog or two, when BOTH apply?** The requester's 3-Sep/31-Aug case is exactly a
  date clash **and** an override of a day that already has a file. *"On click confirm override
  thats all"* reads as ONE confirmation carrying both facts, but the two are known at
  different moments (clash before preview, override after). Not stated.
- **Q5. Does the override warning apply when NO day was chosen?** Round 3 settled that the
  *clash* asks only when a day was chosen. An override has nothing to do with the chosen day —
  opened from the course header, a file for an already-imported day would override it with no
  question at all. Not stated.
- **Q6. Exact wording and button labels.** The requester gave the sense — *"you existing data
  will be overridden"*, *"the uploaded session is for 31 aug"*, *"it will override the 31st
  aug attendance record"* — and named no strings and no buttons. What the second (decline)
  answer does is also not stated; today's clash offers "Choose another file".
- **Q7. Is part 3 a REQUEST or a BUG REPORT?** `commit_csv_import` (0024) already creates the
  session, marks it completed and writes present/absent for every member (current behaviour
  5). If the requester has seen this fail, this part is a defect and belongs in Track C with a
  repro — if it is simply an expectation being stated, it is already met and the answer is a
  verification, not a change. **The gate must ask before anything is built for part 3.**
- **Q7b. "Update that session was taken today"** — "today" against a file dated 31 Aug is
  ambiguous. Read as *the session was held on the file's day*; recorded as a reading, not as
  fact.
- **Q8. Permissions.** Who may override an existing register — anyone who may import, or the
  academy owner only? Overwriting a completed register is a larger act than creating one.
  `unknown`; round 3 left import permissions untouched.
- **Q9. How is any of this verified?** Fixtures mode hard-codes `supersedes: null` (current
  behaviour 7) and `csv-import` is not deployed, so neither the override warning nor the 409
  can be exercised end-to-end on this machine as things stand.

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->

- VISUAL?: **yes** — a message and a confirmation are the whole of parts 1 and 2.
- SCREENS & STATES TOUCHED:
  - `/upload` (`app/upload.tsx`): the `clash` phase (existing, wording changes), a **new
    override-confirm state** — or a changed `upload-superseded` note, per Q3 — the `working`
    state if a confirm now sits between preview and commit, the `done` state, and the failure
    state (today a 409 on a repeated file surfaces as *"This file has already been imported.
    Nothing was written."* on the `pick` phase — that message changes or goes, per Q1).
  - `app/course/[id].tsx` — the selected-day panel and the day statuses, if a day that already
    has a register must now read differently before an upload. In scope only if Q5 widens it.
  - `app/(tabs)/attendance.tsx` — `attendance-upload`, same condition.
  - Both themes, semantic tokens, as always. Colour is never the only signal (guardrail 3):
    an override warning carries its word and its icon.
- STRINGS ADDED OR ALTERED: the requester gave **sense, not strings** — *"you existing data
  will be overridden"*, *"the uploaded session is for 31 aug"*, *"it will override the 31st aug
  attendance record"*. Wording is the implementer's. Everything else on every touched screen is
  FROZEN, with one forced exception: the existing clash copy *"…so importing it updates the
  ‹file day› register for ‹course› — not ‹opened day›"* and the `upload-superseded` note must
  stop being the only place the override is described, if the confirmation now says it first.
- PERMISSIONS: `unknown` — see Q8.
- USAGE: `unknown`. How often a register is re-uploaded, and by whom, was not stated. It
  matters: a rare correction earns an interruption, a routine one does not.
- RUN MODE: `auto` (not stated; the default applies).
- SCALE: `<blank — B0 decides>`. Note that micro is refused for CORRECTION ROUND ≥ 2.

<!-- Intake notes, NOT stated by the requester:
     1. Parts 1 and 2 both hinge on `supersedes`, which already exists end to end
        (csv-import preview -> PreviewResult.supersedes in src/data/api.ts -> the
        upload-superseded note). What is missing is that it is known too LATE to warn with,
        and never reaches the clash dialog. Recorded so B1 does not re-derive it.
     2. Part 3 appears to be already shipped (migration 0024). Recorded as a reading of the
        code, NOT as an answer to the requester -- Q7 is the question that settles it.
     3. Q2 is the difference between the requester's word ("override") and the database's
        behaviour (upsert-and-leave). Whatever is decided, it is a behaviour change to
        commit_csv_import, which means an ADDITIVE migration -- and db/harness/test.sh has
        never run on this machine (no psql). That constraint is round 3's, unchanged.
     4. docs/registers/FEATURE_TRUTH.md records the current shape of this dialog and is
        updated as part of any change to it. -->

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

---

## AS BUILT — 07-Sep-2026

**Run mode `auto`.** The nine open questions were answered by taking a recommendation and
logging it; every one is stated below, so a wrong answer is visible rather than buried.

### Answers taken
- **Q1 (identical file).** The `409` refusal for a byte-identical file **STAYS**. The words were
  *"same csv with modified data"*, and a modified file has a different fingerprint and was
  already allowed — a byte-identical re-upload has nothing to override, so the refusal costs
  nothing. Nothing in `csv-import`'s duplicate check was touched.
- **Q2 (what "override" means).** It means the register MATCHES the file. `0037` puts an earlier
  file's `present` back to `absent` for anyone this file does not name, and soft-deletes the
  record of somebody never expected. **Q2b:** a member the first file CREATED still stays a
  member — deleting people over a re-upload is a different and much larger act, and the No email
  group is where she is already visible.
- **Q3 (when the message is shown).** BEFORE, which is what "will be overridden" says. The
  preview and the commit are now separate steps and the ask sits between them; the preview
  writes no attendance, so *"Nothing has been written yet"* stays literally true. A declined ask
  leaves a `previewed` row, which is inert — both server-side checks count only `completed`.
- **Q4 (one dialog or two).** ONE, on the requester's own instruction. `importAsk()` returns a
  single question carrying both facts and one confirm.
- **Q5 (override with no day chosen).** YES — asked wherever she came from. A register being
  replaced has nothing to do with which screen she started on. The DAY half is still only asked
  when a day was chosen, unchanged from round 3.
- **Q6 (wording).** The implementer's, as in round 3. The clash-only strings are round 3's
  **byte for byte** and a spec pins them; everything new appears only when a register is
  actually being overridden. The decline answer stays *"Choose another file"*.
- **Q7 (is part 3 a bug?).** Read as an EXPECTATION being stated, not a defect report — it
  already works (`0024`, still current in `0026`: the session is created, marked completed and
  every member gets present or absent) and `supabase/tests/18_import_session.sql` covers it.
  **NOTHING WAS BUILT FOR IT.** If the requester has watched this fail, that is a Track C bug
  with a repro and this answer is the wrong one.
- **Q8 (permissions).** UNCHANGED. Nobody's role gate moved; anyone who could import can
  override. Overwriting a completed register is arguably a larger act than creating one, and
  that is a decision the requester can still take.
- **Q9 (how it is verified).** The fixtures now carry two days that already have a register
  (`FIXTURE_IMPORTED` in `app/upload.tsx`), which is the same reason `PENDING_SESSIONS` carries a
  `date` — a state only the server knows was undemonstrable offline. Five cases driven in a real
  browser in both themes; see TEST_SUMMARY.

### What changed
- **`src/data/uploadOverride.ts`** (new, pure) — `importAsk()` decides whether anything is owed;
  `askWords()` writes it; `overrideSummary()` reports what an override moved. The words live
  here because the specs run under plain node and a sentence inside the screen is a sentence no
  test can read.
- **`app/upload.tsx`** — `run()` split into `stage()` (parse → preview → decide whether to ask)
  and `commit()` (write). Phase `clash` → `confirm`, testIDs `upload-confirm`,
  `upload-confirm-go`, `upload-confirm-cancel`. `meetMatchesSession` is no longer imported: the
  day comes from `meetCreatedDate` once and `importAsk` compares ISO days.
- **`src/data/api.ts`** — `csvCommit` returns an OPTIONAL `overridden`, read as optional so a
  project still on `0026` reports nothing rather than zeroes.
- **`supabase/migrations/0037_import_override.sql`** — `commit_csv_import` re-issued from 0026
  with the reconciliation, `import_id` carried on the upsert (without which "a row this import
  did not write" is unaskable), an audit row, and the three counts.
- **`supabase/tests/29_import_override.sql`** — 28 assertions, unrun.
- ADR 027 (`docs/decisions/019-…`), DECISION_LOG row 027, FEATURE_TRUTH amended, CHANGELOG,
  TD-035/036/037.

### Verified
- `npm run check` — typecheck clean, **615/615 specs** (7 new), 2840/2840 contrast, 75/75 icons.
- `npm run audit:all` — six audits, no new violations.
- Fail-first: `.evidence/upload-override-fail-first.txt` (3 of 7 fail against what shipped).
- Browser, both themes, five cases: `.evidence/upload-override-confirm-browser.txt`.

### NOT VERIFIED
- **`0037` is unrehearsed and unapplied, and `29_import_override.sql` has never run** — no
  `psql` on this machine (TD-035). Until it is applied AND `csv-import` is deployed, the dialog
  asks correctly and the override performed is `0026`'s partial one.
- **No pixel screenshot.** Behaviour, strings and composited contrast were verified against the
  live DOM instead.
- **Part 3 was verified by READING** `0026`/`0024` and the existing DB spec, not by running one
  — see Q7.

### Definition of done — `checklists/DEFINITION_OF_DONE.md`

| Item | Verdict |
|---|---|
| Implements the approved plan, no unrequested scope | done — auto mode; plan and its answers above |
| Every changed line traces to the request | done — diff reviewed; 0037 diffed against 0026 line by line |
| Canonical pattern per concern | done — CP-003 (failure text), CP-010 (word + icon), CP-014 untouched |
| No colour literals, no magic numbers | done — `gate: PASS` G4, `audit:colors` none new |
| Dead weight deleted | N/A: `meetMatchesSession` left, logged TD-037 |
| Dependencies verified and pinned | N/A: none introduced |
| Component contributed / promoted | N/A: no new shared component |
| Every state looked at | done — five browser cases, both themes; empty/loading/error unchanged |
| Loading terminates, incl. forced error | done — preview and commit both land on `pick` with a sentence |
| Failure path exercised | partly — the client path was; the 409 and a server error need the deployed function |
| Writes idempotent against every unique constraint | done — `attendance_unique_live` and `sessions_unique_live` untouched; the override never inserts |
| Every CHECK the form writes is stated before Save | done — `absent_must_be_expected` is why an `extra` is removed rather than marked absent |
| Multi-step writes in one transaction | done — unchanged; the override runs inside `commit_csv_import` |
| A save proved against the data, never the toast | **NOT DONE** — 0037 and its 17 assertions have never run (TD-035) |
| Screen checklist per screen | done — the touched panel only, per Track B scoping |
| Both themes verified visually | done — `.evidence/upload-override-confirm-browser.txt` |
| Contrast asserted, token gate AND computed | done — 2840/2840, plus composited DOM in every state this change produces; five PRE-EXISTING failures found on the untouched result panel, TD-036 |
| Per-theme assets | N/A: no brand asset touched |
| Five permission questions, matrix row | done — RBAC_MATRIX `csv_imports_*` row amended 07-Sep; no gate moved (Q8) |
| Permission gates the deep route and API path | N/A: no permission change |
| Tenant scoping | done — every statement is keyed on `v_session_id` from the import's own offering |
| No secret in client code or repo | done — `gate: PASS`; nothing new reaches `.env` |
| Cases added, registry delta stated | done — 7 specs (`uploadOverride.test.ts`), 615/615; 17 SQL assertions written, unrun |
| All four dimensions | done — pure logic + wording specced; DB specced-not-run; browser-driven; the negative case (an ordinary import asks nothing) is specced twice |
| Fail-first evidence | done — `.evidence/upload-override-fail-first.txt`, 3 of 7 fail against what shipped |
| The gate ran | done — VERDICT FAIL: the four missing-runner FAILs and one BLOCKED this repo has carried since 02-Sep (TD-001..006), named and accepted; substitute rungs green |
| Module document updated | done — FEATURE_TRUTH amended |
| Feature register updated | done — as above |
| Root-cause entry | N/A: a change, not a fix |
| Limitations entry | N/A: no platform limit found |
| Decision record | done — ADR 027 |
| Changelog in the user's language | done |
| Tier stated | **T1** — behaviour change on one shipped surface, no new capability and no pricing, contract or support-facing surface. Outputs: the changelog entry, the amended FEATURE_TRUTH and RBAC rows, and the deployment note in TD-035 |
| Would a correct process have caught this? | **Partly, and it is worth saying.** Round 3 built the clash dialog and nothing asked whether the day it wrote to already held a register — no gate covers "the message describes the write, but not what the write destroys". Not raised as a framework failure: the requester never asked for it in round 3 either, so the honest answer is that this is round 4 of a widening ask, not a step that was skipped. **The half that WOULD have been caught:** TD-036 — the contrast gate measures status inks on opaque surfaces while every status panel draws them on a tint of themselves, and only a composited DOM measurement found it. That is a rung with a hole in it, and it is a `/promote` candidate. |

### Review pass — 07-Sep-2026

`code-reviewer` and `copy-gate-reviewer` (review matrix, scoped run). Both reported; the
findings below were APPLIED, and the ones that were not are named with a reason.

**Copy gate — 3 findings, all applied.**
- `overrideSummary()`'s removed clause read *"2 records for somebody who was never expected"* —
  plural records, singular somebody, and "record" is the mechanism's noun for a person. Now
  *"2 people who were not expected and are not in this file are off the register."* A plural
  case was added to the spec, which had only covered n=1.
- The new preview-failure fallback said *"The file could not be read against the register"* — a
  mechanism nobody outside the code has words for. It now uses the sentence the commit's own
  catch already shipped, which deletes a new string instead of adding one.
- The confirm button was `Confirm override`, which dropped the DAY from the one control she
  presses — exactly the case (3 Sep opened, an 18 Aug file) round 3 put the day on the button
  for. Now `Override the ‹day› register`: the requester's word AND round 3's rule.

**Code review — 2 correctness holes in `0037`, both applied, and both were invisible without
being able to run a query.**
- **A member could be left with NO record at all.** The reconciliation keyed on the row's own
  `expected` column, which is what was true when a FILE wrote it. A member enrolled between one
  file and its correction still carried `expected = false` from her `extra` row, so the absent
  sweep's `do nothing` skipped her and the removal then soft-deleted her — she is due, and the
  register simply lost her. Both statements now key on `expected_members_for_session`, asked
  LIVE and once, and the revert rewrites `expected` so the row agrees with itself. The same fix
  closes the mirror case: a member whose enrolment ENDED is now removed rather than marked
  absent, so an override cannot put her on the follow-up list for a class she left.
- **"Marks you made by hand are kept" was false for anyone the new file NAMES.** Only the two
  reconciliation statements skipped `corrected_at`; the upsert did not. Somebody marked absent
  by hand — because the file was wrong about her — was put straight back to `present` by the
  next export, silently, since a named row appears in no count. The upsert now keeps her status
  and she is counted in `kept_by_hand`. The file's evidence (minutes, spelling, which file wrote
  last) is still recorded; only the status is hers.
- `kept_by_hand` counted rows the override could never have moved — a mark no file ever wrote
  (`import_id is null`) was reported as "kept" from an override that had no claim on it. Now
  counted over exactly the rows that would have moved.
- The audit row was skipped when only `kept_by_hand` was non-zero, so a re-upload that moved
  nothing BECAUSE every candidate was hand-marked left no record. Now logged.
- `FIXTURE_IMPORTED` was a fixture table living inside the screen — a fresh CP-001 breach on top
  of the pre-existing `isConfigured` branch. Moved to `src/data/mock.ts` as `IMPORTED_DAYS`.
- The preselect effect could knock her out of the ask with a late `usePendingSessions` answer.
  Guarded on `phase === 'choose'` — and `phase` is in the dependency list, not only the guard,
  because a deferral nothing can lift is RC-025 / CAND-004's exact shape.
- `setAsk(null)` added to both reset handlers (not reachable today; `phase` and `ask` are only
  ever set together, which is why it is worth writing down rather than relying on).
- The CSV was parsed twice per import — once in `stage()` and again in `commit()` to recover the
  duplicate names. `duplicates` now travels on `Staged`.
- `29_import_override.sql` grew from 17 to **28 assertions**: the hand mark no file wrote, a
  hand mark on somebody the new file names, an `extra` who became expected between the two
  files, the reverted row's `import_id`, and the session counts after an override — which is
  where a member losing her record actually shows up. The tautological
  `absent_must_be_expected` assertion is kept (it costs nothing) but is no longer the only
  structural check.
- ADR 019 was corrected: its table still gave the old button label, and it now states the
  live-expectation rule and the upsert half of the hand-mark rule.

**Not applied, with reasons.** Actor-less audit rows from the two new UPDATEs (RC-011's shape) —
the upsert already had this property under `0026`, so it is not a regression and fixing it means
changing `audit_row_change`, which every table shares. The double `import_id` guard on the
reconciliation was confirmed sufficient, not redundant. The reviewer's note that the ask can be
skipped by a server answering `supersedes: null` is the un-deployed state already recorded in
TD-035, not a defect in this diff.
