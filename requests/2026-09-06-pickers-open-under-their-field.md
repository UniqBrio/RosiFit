# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: **The Course and Branch pickers on the member form** — `app/member/edit.tsx`
  (`member-course`, `member-branch`), shown in the requester's screenshot of
  `/member/edit?courseId=…` ("Welcome a new member"). Sibling call sites of the same control,
  found by the B2 sweep: the **Role label** picker on `app/staff/add.tsx` and the two
  **Question** pickers on `app/register.tsx`. All four are single-tap "pick one value into a
  form field" pickers built on `SearchPicker` (`src/components/Sheet.tsx`).

- CURRENT BEHAVIOUR (read in the files, 2026-09-06): tapping the field opens `SearchPicker`,
  which is a `Sheet` — a bottom sheet the full width of the viewport, sliding up over a
  scrim, with a title, a search box and the list. On a desktop window it covers the lower
  half of the screen and dims the form the value is being chosen for. The **Joined on** date
  field on the same form already does NOT do this: since the date-panel change it opens an
  `AnchoredPanel` (`src/components/DateTimePicker.tsx`) — a card hanging directly under the
  field, measured at the press, drawn in a `Modal` so the dialog's scroller cannot clip it.

- DESIRED BEHAVIOUR: requester's exact words — *"the dropdowns should appear withinh form as
  shown in second attached images"*. The second image is a reference from another product:
  an **Assign Course** field with the list opening directly beneath it, the same width as the
  field, overlaying the form content below it, each row a tick box and a label with a small
  meta tag on the right, no scrim, no title, no search box.

  Read as: the course and branch lists open **under the field they belong to, inside the
  form**, the way the date field already does — not as a bottom sheet.

- WHY: `unknown` as stated. Evident from the ask: the sheet covers the form and reads as a
  separate screen; a list under the field keeps the form in view.

- MUST NOT CHANGE: what each picker offers and what choosing does. The course change still
  drops the branch (RC-020 — only a real change does); the branch list is still the branches
  the chosen course runs at; the role picker can still add a new label by typing it; a
  question already used by the other slot is still withheld. The **merge picker** on the
  course screen ("Who is …?", two-step with a confirm) is deliberately left as a sheet: it
  is opened from a list row, not a form field, and there is no field for it to hang under.
  The **filter dropdowns** (`Dropdown.tsx`) are untouched. Guardrail 3 binds: the chosen row
  still says "Selected" in words as well as showing the filled radio.

- CORRECTION ROUND: 1 on this surface. Adjacent: `.evidence/date-panel-placement-fail-first.txt`
  (the date field's move from sheet to anchored panel, which this follows).

## OPEN QUESTIONS — the requester did not settle these; taken at the gate
- **Q1. Radio or tick box?** The reference shows tick boxes because that product assigns
  MANY courses. RosiFit's member joins ONE course at ONE branch, and a tick box that accepts
  only one tick would lie about the control (the reasoning `DropdownCheckItem` already
  records). **Taken: radio**, as today.
- **Q2. Does the search box survive?** Not in the reference. Kept only where it does work:
  when a label can be typed in and added (the role picker), or when the list is long enough
  to need narrowing. A two-item course list gets the plain list the reference shows.
- **Q3. The other three pickers.** The requester showed the member form. The role and
  question pickers are the same control on the same kind of form, and a role field that
  still slides a sheet up next to a course field that does not is two behaviours for one
  gesture. **Taken: all four move.**

## DESIGN SURFACE
- VISUAL?: **yes**.
- SCREENS & STATES TOUCHED: `/member/edit` (Add and Edit; course picked, course not yet
  picked, branch list); `/staff/add` (role list, "Add “…”" row, nothing-matches note);
  `/register` (question lists, one question withheld). Both themes.
- STRINGS ADDED OR ALTERED: the picker title ("Choose a course", "Choose a branch", "Choose a
  role label", "Choose a question") is no longer drawn — it becomes the panel's
  accessibility label. `PickRow`'s hint "Opens a searchable list" becomes "Opens a list under
  the field". Nothing else.
- PERMISSIONS: none — a picker gates nothing.
- RUN MODE: `auto`.

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact analysis with
  the sibling call-site sweep (B2) BEFORE proposing, produce the plan with regression risks
  (B4) — confirm mode waits for approval; auto mode (default) logs it and applies — touching
  only what DESIRED BEHAVIOUR requires. Every changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan may add to it,
  never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to the touched
  area: states, both themes in semantic tokens, the string table, the permission answer.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing merges
  without a PASS.

---

## AS BUILT — 06-Sep-2026

**Client only. No migration, no function change, no permission change.**

- **`src/components/AnchoredPanel.tsx` (new)** — the panel the date field already hung under,
  moved out of `DateTimePicker.tsx` unchanged in behaviour and given three things: a `width`
  that, when omitted, is the FIELD's width (`anchoredWidth`, `datePanel.ts`); a `header` slot
  pinned above the scroller; and bottom-edge pinning when the panel is flipped above its field,
  so a list shorter than the reserved height sits on the field instead of floating. `useAnchor()`
  packages the ref + measure-at-press the date field used to do inline.
- **`src/components/Sheet.tsx`** — `SearchPicker`'s search box, choice row, "Add …" row and
  nothing-matches note are now shared pieces (`usePickerQuery`, `PickerSearch`, `PickerChoice`,
  `PickerAddRow`, `PickerEmpty`). `SearchPicker` composes them exactly as before and stays for
  the two-step merge picker. New **`AnchoredPicker`** composes the same pieces in an
  `AnchoredPanel`; the search box is drawn only with `onAdd` or more than 7 options.
- **`app/member/edit.tsx`** — course and branch on `AnchoredPicker`; `PickRow` takes the anchor
  ref; hint "Opens a list under the field". **`app/staff/add.tsx`** — role label, search kept.
  **`app/register.tsx`** — both questions, one picker anchored to whichever row was tapped.
- **`.baselines/testid-baseline.txt`** — `Sheet.tsx|6` → `|4`: the shared rows gained test ids
  where the anchored picker uses them; the ratchet blocks on a paid-down entry left listed.
- FEATURE_TRUTH paragraph, CHANGELOG entry, `.evidence/anchored-picker-width-fail-first.txt`.
  No new ADR: ADR 024 ("the calendar hangs under the field") is the decision, applied wider.

### Answers taken at the gate
- **Q1** radio, as today. **Q2** search only with `onAdd` or > 7 options. **Q3** all four moved;
  the merge picker stays a sheet.

### Verified
- `npm run typecheck` clean · `npm run test:unit` **473 / 0 fail** (4 new) · contrast 2840/2840 ·
  icons 75/75 · `npm run audit:all` all OK, none new.
- **Driven in a real browser** (fixtures export, Playwright/Chromium, 1280×900 dark and light,
  420×900 light): course panel top 301 under field bottom 295, left and width equal to the
  field's (377 / 526); pick closes the panel and lands in the field; branch panel under the
  branch field; scrim tap closes; Joined on still opens its calendar; worst text contrast in the
  open list 5.01:1 dark, 4.54:1 light; role panel under the role field with search, "Add …"
  adds the typed label; question panel at the field's width on a phone, flipped above the second
  question and pinned 6px over it. Screenshots looked at in both themes.

### NOT VERIFIED / KNOWN
- **React error #418 (hydration) is logged on every route at load**, including untouched ones
  (`/courses`, `/holiday`), with and without a seeded theme. Pre-existing in this working tree,
  not introduced here, and not fixed here.
- Native (iOS/Android) not run: `measureInWindow` is asynchronous there and the panel centres
  itself for the first frame, as the date field already does.
- `bash db/harness/test.sh` N/A — no DB change.
