# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS

- FEATURE / SCREEN: **The upload attendance dialog** — `app/upload.tsx` (route `/upload`, a
  dialog over the screen that opened it), reached from `course-upload` in the course header,
  `course-day-upload` on the selected day of the course week strip (`app/course/[id].tsx`),
  and `attendance-upload` on the Attendance tab (`app/(tabs)/attendance.tsx`). Two areas of
  it specifically: the **`pick` phase** (the dashed card and its `upload-browse` button) and
  the **`done` phase** (the green result panel and its buttons). Wording behind it lives in
  `src/data/uploadOverride.ts` and `src/data/uploadOutcome.ts`; the day the file covers is
  derived by `meetCreatedDate` in `src/data/meetCsv.ts`.

- CURRENT BEHAVIOUR (read in the files, 08-Sep-2026):
  1. **Nothing is asked before Browse files.** `upload-browse` calls `choose()`, which opens
     the OS file picker immediately (`pickCsvFile()`), parses the CSV, derives the day from
     the Meet `Created on` line, and goes straight on to `stage()` — preview then commit —
     with no interruption. The card says so out loud: *"The file imports as soon as you
     choose it."*
  2. **One confirmation exists, and only for two reasons.** `importAsk()` returns an ask ONLY
     when the file's day differs from a day that was actually chosen, or when a completed
     import already covers that offering and day. An ordinary same-day first upload asks
     nothing. That is round 3's shape and round 4 preserved it deliberately.
  3. **A future-dated file imports without comment.** Nothing anywhere compares the file's
     `Created on` day with today. `commit_csv_import` will create a session for a future day
     and write a register against it.
  4. **The result panel** (`upload-done`) heads with `` `${noChange ? 'Nothing to update' :
     'Imported'} · ${dayLabel(outcome.session_date)}` `` — e.g. *"Imported · Tue 15 Sep"* —
     and under it a `Muted` line *"3 marked present on the Yoda Advance · Main register."*
     The course name appears in that sentence and in the `MAPPED TO THIS SESSION` panel, not
     in the heading.
  5. **Two buttons close the result:** `upload-done-close` labelled **Done** (`router.back()`)
     and `upload-another` labelled **Upload another file**. `FormDialog` also draws a **×**
     and dismisses on a tap beside the card; both are already the way out of every other
     dialog in the app.

- DESIRED BEHAVIOUR: requester's exact words, in two messages —

  *"On clicking of upload session and browse file give a pop up asking user that you are
  uploading for course postnatal confirms yes or no or rephrase as senior design engineer once
  they confirm import the files"*

  *"remove done button and also remove the line Imported tue 13 sept and beside that add course
  name and also block upload attendance for future date"*

  Read as four parts:
  1. **A COURSE CONFIRMATION BEFORE THE FILE PICKER.** Pressing **Browse files** must first ask
     which course this upload is for — *"you are uploading for course postnatal"* — with a
     yes/no answer. On yes, the OS file picker opens and the file imports as it does today.
     The requester delegated the wording explicitly: *"or rephrase as senior design engineer"*.
  2. **THE RESULT HEADING CARRIES THE COURSE.** The course name joins the heading beside the
     day, and the sentence under it goes.
  3. **THE DONE BUTTON GOES.**
  4. **A FUTURE-DATED FILE IS BLOCKED, WITH A MESSAGE.** Requester's own example, given at the
     gate: *"If today is 8 sept user can upload for today if the upload files date is 9 sept
     then block show message as attendance can be uploaded for future dates"* — i.e. today is
     allowed, tomorrow is refused with a message saying attendance cannot be uploaded for a
     future date.

- WHY: `unknown`. No motivation was given for any of the four parts. The only evidence is the
  shape of the ask — the operator wants to see which course she is committing to before she
  commits, and a shorter result panel.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Named explicitly because the
  requester's words touch their edges: **the rule that the session date comes from the file,
  never from the screen**; CSV parsing and its refusals; the Meet header lines the parser reads
  past; the de-duplication of repeated names; the staff-name filter; `autoDecisions()` filing an
  unresolved row as somebody new; the two `Landed` count tiles (With email / No email) and where
  those groups land; the `MAPPED TO THIS SESSION` panel; every `Note` on the result (new
  members, other course, staff, duplicates, dropped, superseded); the already-imported result
  (`upload-already`); the atomicity of the commit; the audit log; the alias and merge mechanism;
  the follow-up rule. **Guardrail 1** binds — the No email group stays DERIVED.
  **Round 4's own MUST NOT CHANGE binds too, and part 1 pushes directly against it: *"on click
  confirm override thats all"* forbade a second confirmation on an import.** See the reversal
  recorded under CORRECTION ROUND — it is stated, not silent.

- CORRECTION ROUND: **5** on this surface. Track B reads rounds 3 and 4 before proposing.
  - Round 1 — `requests/2026-09-05-upload-attendance-as-dialog.md`: page → dialog.
  - Round 2 — `requests/2026-09-06-upload-flow-shorter-no-email-resolution.md`: cut to
    Course · File · Import; `/match` deleted.
  - Round 3 — `requests/2026-09-06-upload-imports-on-pick.md`: **"directly import data no
    confirmation"** — the Import button and the step bar went, the file imports on the pick,
    and the date-clash confirm was carved out as the one exception.
  - Round 4 — `requests/2026-09-07-upload-override-confirm.md`: the override warning moved
    BEFORE the write and folded into that same single ask. Its Q4 answer is binding on this
    round: **ONE dialog, never two.**
  - **What rounds 3 and 4 did NOT miss, and this round reverses anyway.** Round 3 removed
    confirmation on the requester's explicit instruction, and round 4 wrote that instruction
    into its MUST NOT CHANGE. Part 1 asks for a confirmation on **every** import. That is not
    a defect in either round — it is the requester changing their mind, and it was **put to
    them at this gate in those words and confirmed** (see ANSWERS TAKEN AT INTAKE). Track B
    must state the reversal in its plan rather than let it read as a bug fix.
  - Round 4's constraints carry unchanged: **`csv-import` is not deployed**, and
    **`bash db/harness/test.sh` has never run on this machine** (no `psql`, TD-035).

## ANSWERS TAKEN AT INTAKE — asked of the requester, answered, and therefore BINDING

- **A1. Where the course confirmation sits.** **BEFORE the file picker opens.** Press Browse
  files → the ask → yes → the OS picker. The requester chose this over folding it into the
  existing post-pick confirm, with the trade-off stated to them: the ask cannot name the file
  or the day, and a clashing/overriding file will then be asked a SECOND time.
- **A2. Does it ask on every import?** **YES — every import**, including an ordinary same-day
  first upload. The round-3 reversal was stated and confirmed.
- **A3. The result heading.** **`Imported · ‹course · branch› · ‹day›`** — the course is ADDED
  beside the day and **the day is KEPT**. "Remove the line" therefore applies to the sentence
  underneath (*"N marked present on the ‹course› register."*), which the option they picked
  said in those words.
- **A4. What "future date" blocks.** **The FILE's date only.** Today is allowed; a file whose
  `Created on` day is after today is refused with a message. The `Upload session` button stays
  on every day of the course week strip, unchanged from round 3.

## OPEN QUESTIONS — the requester did not settle these; Track B's gate must

- **Q1. What does the ask say and what are its two buttons?** Delegated in the requester's own
  words — *"or rephrase as senior design engineer"* — so the wording is the implementer's.
  What the NO answer does is **not stated**: close the dialog, or return to the pick card with
  Browse still available. Reading taken: return to the pick card, because that is what
  `Choose another file` already does and abandoning her out of the dialog is a larger act than
  she asked for.
- **Q2. Does A1 + A2 mean TWO dialogs for a clashing file?** By A1 and A2 together, yes: the
  course ask before the picker, then the existing clash/override ask after it. That contradicts
  round 4's Q4 answer (**ONE dialog, never two**), which was itself the requester's instruction.
  The two answers cannot both hold for that one case. **This is the load-bearing unknown of
  this round** — and the honest resolution is that the second ask is the one the requester
  asked for MOST RECENTLY and MOST SPECIFICALLY, so both are built and the clash case asks
  twice. Recorded as a reading, and the gate states it.
- **Q3. With the Done button gone, how does the result close?** The **×** and the tap-beside
  are `FormDialog`'s, present on every dialog, and `Upload another file` remains. Not stated by
  the requester. Reading: no replacement is added — removing a button and adding one back is
  not what "remove done button" says.
- **Q4. Is the removed sentence removed in the "Nothing to update" case too?** That case
  renders `noChangeWords(...).lines[0]` in the SAME slot, and it is the only sentence that says
  the register did not move (round's own `2026-09-07-reimport-nothing-to-update.md`). Not
  stated. Reading: the sentence goes for the IMPORTED case, whose content is now duplicated by
  the heading and the two tiles, and STAYS for the nothing-to-update case, whose content exists
  nowhere else.
- **Q5. "Today" measured where?** The device's local day, since `dayLabel` and `meetCreatedDate`
  already build local dates deliberately (a UTC midnight is the previous day west of
  Greenwich). Not stated; recorded as a reading.
- **Q6. Is the future-date block client-side only?** The client can refuse before preview, but
  `csv-import` and `commit_csv_import` would still accept a future day from any other caller.
  Not stated. Reading: **client-side only** in this round — a server-side guard is a migration,
  and `db/harness/test.sh` has never run on this machine (TD-035).
- **Q7. Permissions.** Not mentioned. Reading: unchanged — nobody's role gate moves.
- **Q8. Does the course ask fire when the offering is still unchosen?** It cannot: the `pick`
  phase is only reachable once `target` is set, so there is always a course to name. Recorded
  so the gate does not re-derive it.

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->

- VISUAL?: **yes** — a new dialog, an altered heading, a removed sentence and a removed button.
- SCREENS & STATES TOUCHED:
  - `/upload` (`app/upload.tsx`): a **NEW course-confirm state** on the `pick` phase; the
    `pick` phase's dashed card (its "imports as soon as you choose it" line now describes a
    step that has an ask in front of it); a **NEW future-date refusal** on the `pick` phase's
    failure panel; the `done` phase heading, its sentence, and its button row. Untouched and
    verified untouched: `choose` (loading · error · empty), `working`, `confirm`,
    `upload-already`.
  - Both themes, semantic tokens. Colour is never the only signal (**guardrail 3**): the new
    ask and the future-date refusal each carry a word AND an icon.
  - Keyboard: the new ask's two controls are Tab-reachable in visual order and
    Enter/Space-operable (CP-22, A-10).
- STRINGS ADDED OR ALTERED: the requester gave **sense, not strings**, and delegated the
  wording explicitly (*"rephrase as senior design engineer"*). New: the course-confirm title,
  body, note and two button labels; the future-date refusal sentence. Altered: the result
  heading (course added). Removed: *"N marked present on the ‹course› register."* and the
  **Done** button label. Everything else on the touched screens is **FROZEN, byte for byte** —
  in particular round 3's clash strings and round 4's override strings, which specs pin.
- PERMISSIONS: **no** — see Q7.
- USAGE: `unknown`. How often a file is uploaded, and by whom, was not stated. It matters
  directly for part 1: an ask on every import is cheap if uploads are weekly and expensive if
  they are hourly.
- RUN MODE: `auto` (not stated by the requester; the default applies).
- SCALE: `<blank — B0 decides>`. Note micro is refused for CORRECTION ROUND ≥ 2.

<!-- Intake notes, NOT stated by the requester:
     1. Part 1 places an ask BEFORE pickCsvFile(), which is the only place in this flow where
        an ask has NO file to describe. Every existing ask in this dialog is post-preview and
        names the file, the day and what it will replace. The new one can name only the course
        and the branch. That is A1's stated trade-off, not an oversight.
     2. Part 4's check belongs next to meetCreatedDate's result in choose(), which is the one
        place the file's day is derived and where the "no Created on line" refusal already
        lives. Putting it there also means no preview row is staged for a file that will be
        refused. Recorded so B1 does not re-derive it.
     3. Removing `upload-done-close` removes a testID. .baselines/testid-app-baseline.txt is a
        ratchet on testids MISSING, not present, so a removal is not blocked -- but the browser
        evidence scripts and any spec naming it must be swept (B2).
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
