# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: **The upload attendance dialog** — `app/upload.tsx` (route `/upload`,
  presented as a dialog over the screen that opened it), reached from three buttons:
  `course-upload` "Upload Session" in the course header, `course-day-upload`
  "Upload this session" on the selected day of the course week strip
  (`app/course/[id].tsx`), and `attendance-upload` "Upload" on the Attendance tab
  (`app/(tabs)/attendance.tsx`). Plus the **No email** group on the course screen, named by
  the requester as one of the "respective sections".

- CURRENT BEHAVIOUR (read in the files, 2026-09-06 — see the WORKING-TREE note below, which
  changes what "today" means here):
  1. **As last committed and as staged:** `/upload` is a three-step dialog with a step bar —
     **Course · File · Import**. Step 1 picks the offering, step 2 picks the CSV (the file is
     read on the pick, there is no Process button), step 3 shows counts, the "Mapped to this
     session" panel, warning panels, a list of every row that needs a person as radio chips,
     and an **`Import N rows` button that must be pressed before anything is written**.
     Nothing reaches the database until that press. `D · Ambiguous` rows leave the button
     disabled.
  2. The date has always come **from the file**, never from the day tapped. A file whose
     `Created on` line disagrees with the day the operator tapped is imported against the
     **file's** day, and the only warning is a line of grey text inside the "Mapped to this
     session" panel: *"This file is from ‹file date›, but the day you tapped is ‹tapped
     date›."* No confirmation is asked.
  3. `course-day-upload` renders **only when the selected day's status is `awaiting`**
     (`app/course/[id].tsx` — `{chosen.key === 'awaiting' ? … : null}`). A day that is
     `none`, `scheduled` or already `imported` shows no upload button at all.
     `course-upload` in the course header and `attendance-upload` on the Attendance tab are
     both already unconditional.
  4. The counts on the import step are `rows read` · `matched` · `need you`. There is **no
     count of "with email" and "no email"** anywhere; a single amber panel says
     *"N marked present with no email"*.

- **WORKING-TREE NOTE — the file does not currently compile.** `app/upload.tsx` in the shared
  worktree carries an unfinished rewrite by an earlier session: `tsc` reports 27 `TS2304`
  errors (`STEPS`, `Resolution`, `defaultResolution`, `resolutions`/`setResolutions`,
  `importing`/`setImporting`, `NEW_MEMBER`, `NOT_A_MEMBER` are used in the render and no
  longer declared), and it already contains an unused `Outcome` type carrying `with_email`
  and `no_email`, an unused `autoDecisions()` that files every unresolved row as a new
  member, and a `dateClash` state that is set but never rendered. That half-built work is
  aimed at THIS request. It is recorded as fact, not as a decision: Track B decides whether
  to finish it or replace it, and either way the file must compile at the gate.
  Both live sibling sessions (`rosifit-fb`, `rosifit-2e`) have confirmed they are not
  touching `app/upload.tsx`.

- DESIRED BEHAVIOUR: requester's exact words —
  *"When user uploads the csv file directly import data no confirmation just show how many
  student with email and no email and they should be landing in respective sections and no
  need of multiple steps just on click of upload session dialog appears user upload files and
  data is imported.*
  *Upload session button should always be present even if there is no scheduled session.*
  *If user selected different date and uploading csv of different date then show a message and
  i will update the 31 aug record on confirm upload it for that day not for the current day
  i.e 6 sept."*

  Read as six parts:
  1. **The import runs ON THE PICK.** "directly import data no confirmation" — the
     `Import N rows` button goes, and with it the review of rows before the write.
  2. **The result is TWO COUNTS: with email, and no email.** "just show how many student with
     email and no email". These are the numbers the requester asked to see; they are not on
     the screen today.
  3. **"They should be landing in respective sections."** Whoever has an email is in the
     register; whoever has none is in the **No email** group on the course, which is where the
     two resolve buttons already live.
  4. **"No need of multiple steps."** The step bar and the sequence go. One press of Upload
     Session, one dialog, one file pick, one result.
  5. **The Upload Session button is ALWAYS present**, "even if there is no scheduled session".
  6. **ONE confirmation survives, and only for a date clash.** A CSV whose day is not the day
     the operator selected must say so — the requester's own example is a 31-Aug file opened
     on 6 Sep — and on confirm it imports **against the file's day (31 Aug)**, never against
     today. This is the requester deliberately carving an exception out of part 1: "no
     confirmation" everywhere except here.

- WHY: `unknown` as a stated motivation. The requester gave none in this message. The only
  evidence is the shape of the ask — fewer steps, and a date clash they do not want to find
  out about afterwards.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. In particular the requester said
  nothing about, and therefore froze: CSV parsing and its refusals, the Meet header lines the
  parser reads past, the de-duplication of repeated names, the rule that the session date comes
  from the file, the already-has-a-file correction rule (one session per day), the audit log,
  the alias and merge mechanism, the follow-up rule, and the atomicity of the write itself.
  Guardrail 1 also binds: the No email group stays DERIVED from the member list, never a second
  parallel list of people.

- CORRECTION ROUND: **3** on the same surface. Track B must read all three before proposing.
  - Round 1 — `requests/2026-09-05-upload-attendance-as-dialog.md`: turned `/upload` and
    `/match` from pages into dialogs, and explicitly KEPT all four steps and the whole
    row-by-row review.
  - Round 2 — `requests/2026-09-06-upload-flow-shorter-no-email-resolution.md`: cut the flow to
    Course · File · Import, deleted `/match`, made unresolved rows auto-file as new members,
    and made "add display name to existing member" a real merge (migration `0032`). Its own
    AS BUILT block already records a same-day follow-up ("why again user have to click on
    process") that removed the Process button. **What round 2 left in place is exactly what
    this round is about:** a step bar, and an `Import` button that still has to be pressed.
  - Round 2 also decided things this round pushes against, and B1 must say so out loud rather
    than reverse them silently: **`D · Ambiguous` holds the Import button** (two members carry
    the name, so RosiFit refuses to guess), and the **"Not a member"** chip was added on
    review, unasked, so the instructor in every Meet file does not become a new member every
    week. With no button and no row list, neither guard has anywhere left to live. See Q3/Q4.
  - `requests/2026-09-05-park-unresolved-upload-rows.md` is still open on adjacent ground.
  - Round 2's AS BUILT also records that migration `0032` is **written but never rehearsed** —
    no `psql` on this machine — and must not reach the live project until
    `bash db/harness/test.sh` runs green. That constraint carries into this round unchanged.

## OPEN QUESTIONS — the requester did not settle these; Track B's first gate must
- **Q1. WHICH Upload Session button is missing?** The requester said "always be present even if
  there is no scheduled session". `course-upload` (course header) and `attendance-upload`
  (Attendance tab) are already unconditional, so the only gated one is `course-day-upload` on
  the selected day of the week strip, which appears only for an `awaiting` day. That is the
  honest reading — recorded as a **reading, not as fact**.
- **Q2. Where are the two counts shown, and for how long?** In the dialog after the import, in
  a toast, or on the course screen — not stated. Whether the dialog then closes itself is also
  not stated.
- **Q3. What happens to `D · Ambiguous` now?** Two members carry the name. With no Import
  button there is nothing left to hold, so the choice is: guess, file her as somebody new, or
  keep one question. Not mentioned by the requester either way. This is the most load-bearing
  `unknown` here — picking wrong marks the wrong woman present, invisibly.
- **Q4. What happens to "Not a member"?** Round 2 added it so the instructor is not created as
  a member every week. Auto-importing every row removes the only place that answer was given.
- **Q5. Does the Course step survive?** A file has to be imported into a course at a branch, so
  something must name the offering. Opened from a course the scope already answers it; opened
  from the Attendance tab it does not. "No multiple steps" does not say which.
- **Q6. What does the date-clash message say, and what are the two answers?** The requester gave
  the sense — *"i will update the 31 aug record"* — but not the wording, not the button labels,
  and not what the second (cancel) answer does: abandon the file, or pick another.
- **Q7. Does the clash confirm apply when NO day was selected?** Opened from the course header
  or the Attendance tab there is no chosen day for the file to disagree with. Not stated.
- **Q8. Permissions.** Writing attendance and creating members are both writes, and creating a
  member is owner-only in places (`courses-add-member` is gated on `isSuperAdmin`). Who may
  trigger an import that now writes immediately is `unknown`.
- **Q9. What is shown while the import runs, and what happens if it fails?** The write now
  happens with no button press behind it, so a failure is the first thing the operator hears
  about. Not stated.

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: **yes** — the shape of the dialog is the whole of the ask.
- SCREENS & STATES TOUCHED:
  - `/upload` (`app/upload.tsx`) in every state that must survive the cut: loading
    (`Skeleton`), course-list error with retry, empty ("No course to upload for"), file-read
    failure, a file with no `Created on` line (which can never be imported), the import
    running, the import failed, and the result.
  - NEW states this creates: the **date clash confirmation**, and **import failed after the
    operator was given no button to press**. Both `unknown` in wording; the gate specifies.
  - `app/course/[id].tsx` — the selected-day panel, in all four day states (`none`,
    `scheduled`, `awaiting`, imported), since Q1's reading changes which of them carry a
    button; and the **No email** group, named by the requester as a destination.
  - `app/(tabs)/attendance.tsx` — `attendance-upload`, in scope only if Q1 is answered wider.
  - Both themes, as always.
- STRINGS ADDED OR ALTERED: the requester gave **no exact wording** — only the sense of the
  clash message (*"i will update the 31 aug record"*) and the sense of the two counts (*"how
  many student with email and no email"*). Wording is the implementer's, and everything else on
  every touched screen is FROZEN, with one forced exception: the copy that promises a review
  and a button — *"The whole file imports together. Nothing is written until you press
  Import."*, *"Import N rows"*, *"N names need you"* — must stop describing a step that no
  longer happens.
- PERMISSIONS: `unknown` — see Q8.
- RUN MODE: `auto` (not stated by the requester; the default applies).

<!-- Intake notes, NOT stated by the requester:
     1. Parts 1, 2 and 6 are already HALF-BUILT and BROKEN in the working tree (Outcome with
        with_email/no_email, autoDecisions(), dateClash) — see the WORKING-TREE NOTE. Track B
        must decide finish-or-replace at B1 and must not treat the broken file as "current
        behaviour" when restating it to the requester.
     2. The counts the requester asked for map onto the preview's own counts:
        with email = counts.matched; no email = counts.noEmail plus every row auto-filed as a
        new member (possible + ambiguous + unmatched), because a created member has no address.
        Confirmed in supabase/functions/csv-import/index.ts:183 — 'matched' is a single
        confident candidate WITH an email, 'noEmail' the same WITHOUT one. Recorded so the gate
        does not have to re-derive it; it is a reading of the requester's words, not their words.
     3. Part 6 and part 1 are in tension by the requester's own choice — "no confirmation"
        except this one. Do not resolve the tension by dropping either half.
     4. docs/registers/FEATURE_TRUTH.md records the current shape of this dialog. If the flow
        changes again, that register is updated as part of the change. -->

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

## AS BUILT — 06-Sep-2026

**Client-only except for one function change. No migration.** `commit_csv_import` (0014)
already accepted `add_as_new` for every unresolved kind and already created the member with
no address, so nothing in the schema had to move.

- **`app/upload.tsx` rewritten around a phase, not a step.** `choose · pick · clash ·
  working · done`; no step bar, no `Import N rows` button, no per-row resolve list.
  `ResolveRow`, `resolutions`, `NEW_MEMBER`, `NOT_A_MEMBER`, `Resolution` and
  `defaultResolution` are gone. The file is parsed, previewed, decided by `autoDecisions()`
  and committed on the pick.
- **The two counts** are `Landed` tiles — *With email* (`counts.matched`) and *No email*
  (`counts.noEmail + possible + ambiguous + unmatched`) — each carrying the section that
  group is now in, which is the other half of "landing in respective sections".
- **`supabase/functions/csv-import/index.ts`** sets aside rows whose normalised name matches
  an `app_users` name, before matching, and returns them as `staff_names`. `src/data/api.ts`
  carries the new field.
- **`app/course/[id].tsx`** — `course-day-upload` renders on every day of the week strip,
  labelled **Upload session**, warn-tinted only on an `awaiting` day.
- **The clash** reads its opened day from the `date` PARAMETER rather than from a
  `PendingSession`, which is what makes the requester's own 6-Sep/31-Aug example ask at all.
- Decision record `docs/decisions/014-the-file-imports-on-the-pick.md`, DECISION_LOG row 022,
  FEATURE_TRUTH amended in five places, CHANGELOG entry.
- `.baselines/testid-app-baseline.txt` — `app/upload.tsx|2` removed; the rewrite gives every
  interactive element a testID, and the ratchet blocks on a paid-down entry left listed.

### Answers taken at the gate
- **Q3 (two members share a name)** — requester chose *file her as someone new*, over asking
  and over picking the first match.
- **Q4 (the instructor)** — requester reframed it: *"if its the instructor then why attendnace
  for them its only for members right?"* None of the three options offered were right; the
  staff-name filter above is what that answer asks for.
- **Q1** — the gated button was `course-day-upload`, as read at intake.
- **Q2** — the counts are on the result screen, which stays until Done is pressed.
- **Q5** — the course step survives, because a file has to be imported into an offering. From a
  course or a day it is already answered and never shown.
- **Q6** — wording is the implementer's; the requester gave sense, not strings.
- **Q7** — the clash asks only when a day was actually chosen.
- **Q8** — permissions unchanged; no new role gate was added or removed.
- **Q9** — the import running is stated in place (`upload-working`), and a failure says
  "Nothing was written", which the one-transaction commit makes true.

### Verified
- `npm run check` — typecheck, **409 specs / 0 fail**, 2840/2840 contrast pairs, 75/75 icons.
- `npm run audit:testids · colors · rules · columns · deadweight · auditactor` — all OK, none new.
- **Driven in a real browser** (`expo export` → Playwright, fixtures mode): choose → pick →
  file chosen → imported, `With email 1` / `No email 4`; and 6-Sep + a 31-Aug file →
  *"This file is from Mon 31 Aug … importing it updates the Mon 31 Aug register … not
  Sun 6 Sep."* No page errors in either theme.
- **Contrast measured on the live DOM in BOTH themes** for all four states — every text node
  passes its WCAG threshold.

### NOT VERIFIED
- **No pixel screenshot.** Every `FormDialog` route in this working tree renders its scroll
  container at height 0 under `expo export` — `/course/edit`, `/holiday`, `/member/edit` and
  `/send` all do it too, so it is not this change; another session is working in
  `app/_layout.tsx` and `src/components/Sheet.tsx`. Behaviour, strings and contrast were
  verified against the DOM instead.
- **`csv-import` is not deployed.** The staff filter is inert until it is, and a staff name
  imports as a new no-email member until then.
- **`bash db/harness/test.sh` not run** — no `psql` on this machine, unchanged from the
  previous round. Nothing here needs it: there is no migration in this change.
