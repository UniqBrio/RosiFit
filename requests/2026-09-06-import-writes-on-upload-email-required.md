# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Origin.** One message from the requester on 06-Sep-2026, sent with two
> screenshots of the bulk member import: the upload dialog, and the
> **Import complete** card with its four counts.

## FIELDS
- FEATURE / SCREEN: **Bulk import members** — `app/member/import.tsx`, with the
  two pure modules behind it, `src/data/memberImport.ts` (the rules) and
  `src/data/memberXlsx.ts` (the template and the parser).
- CURRENT BEHAVIOUR (verified in the files, 06-Sep-2026):
  1. Choosing the file already reads it, judges every row, writes the ready ones
     and opens the **Import complete** dialog — Imported · Skipped · Failed ·
     No course, the rows that did not land, and the error report. There is no
     preview and nothing to approve between the tap and the write.
  2. An email address was **required by the row verdict**
     (`validateMemberRows`) and said to be required by the template's
     instructions sheet and its Email prompt — but the change was half-landed:
     the screen's own help still read *"Only her name is required"*, the
     no-name refusal still called her name *"the one required cell"*, the
     register still described the import as *file → validate → preview →
     confirm*, and **eight specs still asserted the old rule**, including one
     written to prove that a blank address was accepted.
- DESIRED BEHAVIOUR: the requester's exact words — *"On uploading the file just
  import data and show it like this no many approvals jus import and on upload
  import done and make sure email is mandatory while uploading member"*. Two
  parts:
  1. **Uploading the file is the import.** No approval step between choosing
     the file and the write; the result is the Import complete card in the
     second screenshot.
  2. **Email is mandatory** for a member arriving in a file.
- WHY: `unknown` for part 1 — the requester stated the flow, not the problem.
  For part 2, a member with no address cannot be written to, and a file is the
  one place a hundred of them arrive at once.
- MUST NOT CHANGE: everything not named above. In particular: the OWNER-ONLY
  gate, the 500-row and 5 MB ceilings, the course-per-row rule and the
  blank-Course fallback, a duplicate **skipped never overwritten**, every row
  judged on its own, and the "add a course first" empty state.
  **AMENDED by follow-up 3:** the error report was on this list and came off
  it — the requester asked for it to go. **C-76 is not touched**: it governs the ATTENDANCE import, where a
  member already on the register with no address still has her attendance
  imported and is still counted.
- CORRECTION ROUND: 2. `requests/2026-09-06-bulk-import-field-validation.md`
  covered the same screen; part 1 and the verdict half of part 2 landed under
  it, uncommitted. What it missed was everything that DESCRIBES the rule — the
  on-screen help, the refusal wording, the register — and the specs, which were
  left failing.

## FOLLOW-UPS FROM THE REQUESTER, 06-Sep-2026 — same screen, same session

3. *"download error report is not needed"* — sent with a screenshot of the result
   showing one Skipped row above the **Download error report** button. The button
   and the workbook behind it go; the list of rows that did not import, each with
   its reason and its sheet row number, stays.
4. *"The Bulk import dialog should also be in same format as upload session. pop
   up with background overlay not as seperate page"* — sent with a screenshot of
   **Upload attendance** as it draws today. `/member/import` becomes a
   `transparentModal` route through `FormDialog`, over the screen that opened it.

## DESIGN SURFACE
- VISUAL?: yes. Parts 1–2 are strings only; follow-ups 3 and 4 change the
  shape of the screen.
- SCREENS & STATES TOUCHED: `/member/import` in **every** state — loading,
  permission-denied, courses-failed, no-course-yet, choosing the file, and the
  result — because all six now render inside one dialog card rather than on a
  page. The **What the file needs** pop-up, which now opens over that dialog.
  The result's row list, which loses the button under it. Both themes.
- STRINGS ADDED OR ALTERED: the help dialog's first paragraph; the no-name
  refusal; the line under the row list (it no longer names a report). The
  title and subtitle move verbatim from the page header into the dialog's bar.
  Every other string on the screen is frozen.
- PERMISSIONS: no.
- RUN MODE: auto

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: minimum change for the ask; every changed line traces to
  this request.
- Definition of done: `npm run check` green. No DB change, so no harness run.

---

## AS BUILT — 06-Sep-2026

- **Part 1 needed no code.** Choosing the file already writes and reports; the
  docstring and the register that still described a preview and a confirm were
  corrected to say what the screen does.
- **Part 2, the copy that contradicted the rule:** the help dialog now reads
  *"Her name and her email address are both required — a row with no address is
  not imported"*; the no-name refusal names both cells.
- **The specs.** The fixture helper in `memberImport.test.ts` now gives every
  row its own valid address, so each spec still isolates the variable it was
  written for; two fixtures in `memberXlsx.test.ts` gained one. The spec
  *"a malformed address is blocked; a BLANK one is not (C-76)"* was the one real
  reversal — it is now *"a malformed address is blocked, and so is a BLANK
  one"*, carrying the reason C-76 does not apply to the member file. Three
  specs were added: the refusal, the count it lands in (Failed), and a
  whitespace-only cell. 410 unit specs pass.
- `docs/registers/FEATURE_TRUTH.md` amended in the bulk-import row.

### NOT CHANGED, deliberately
- **`bulk_import_members` (0028/0029) still accepts a row with no address.**
  The client refuses it, which is the gate the requester asked for. Making the
  RPC refuse it too is a migration, and this machine has no `psql` and no local
  Postgres, so it could not be rehearsed — and per CLAUDE.md the harness replay
  is the whole of the pre-flight check. Recorded rather than shipped unproven.
- `npm run check` could not complete its **typecheck** step: `app/upload.tsx` is
  mid-rewrite in this shared worktree by a concurrent session and reports 27
  `TS2304` errors of its own. `tsc` is clean on every other file, and the unit,
  contrast and icon checks all pass.

## AS BUILT, PART 2 — the two follow-ups, 06-Sep-2026

- **The error report is gone from the screen.** The `Download error report` button,
  its handler and its `buildErrorReport` import are removed from
  `app/member/import.tsx`; the line under it no longer tells anybody to fix rows
  "in the report" — it says to fix them in their own file and choose it again.
  The rows that did not import are still listed, each with its reason and the row
  number in the sheet it came from. `buildErrorReport` and its spec stay in
  `src/data/memberXlsx.ts` with no caller, recorded as **TD-022**: deleting the
  function means deleting its spec, and test files are append-only.
- **The import is a dialog.** `app/member/import.tsx` renders through
  `FormDialog` instead of `ShellScreen`, and `app/_layout.tsx` gives
  `member/import` `DIALOG_SCREEN` — the same `transparentModal` + `fade` +
  `contentStyle: transparent` triple every other dialog route takes. The URL,
  the states, the permission gate and every string are unchanged; the title and
  subtitle moved verbatim into the dialog's bar.
- **The result is the same card, not a second one over it.** It used to be a
  nested `Modal` drawing its own `FormDialog` — fine over a page, a card over a
  card with two scrims and two closes now that the import is itself a dialog. The
  dialog's title, subtitle and footer switch to `Import complete` / the file name
  / `Done` when the result arrives. `import-result-close` and `import-done` keep
  their testIDs; the file-choosing state's close is `import-close`.
- **The help pop-up moved to `FormDialog`'s `overlays`**, so it renders outside
  the card rather than inside the body that scrolls — which is what that prop
  exists for (ADR 009).
- **ADR 009 amended** rather than superseded: its exclusion of `member/import`
  rested on "it is reached from More", which was never true — it is reached from
  **Bulk Import on the Courses workspace**, a button on the very list the file is
  imported into. DECISION_LOG row 017 notes the amendment; FEATURE_TRUTH corrected
  in three places.
- `npm run check` **green end to end** this time: typecheck, 413 unit specs,
  2,840 contrast pairs, 75 icons. `audit:testids` and `audit:colors` clean.
  (`app/upload.tsx`, which was blocking the typecheck earlier in the session, was
  fixed by the session that owns it.)
