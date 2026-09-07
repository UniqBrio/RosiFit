# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: **every dialog in the app**, named by the requester as *"add member
  form, edit member and course form and edit course form and all"*. That is the chrome in
  `src/components/FormDialog.tsx`, worn by eleven screens — `app/member/edit.tsx`,
  `app/course/edit.tsx`, `app/offering/edit.tsx`, `app/member/[id].tsx`,
  `app/member/import.tsx` (twice: the importer and its help pop-up), `app/upload.tsx`,
  `app/staff/add.tsx`, `app/holiday.tsx`, `app/send/index.tsx`, `app/send/result.tsx`,
  `app/change-mobile.tsx` — and the confirm dialogs in `ConfirmDialog`
  (`src/components/Sheet.tsx`), used by seven screens.

- CURRENT BEHAVIOUR (read in the files, 2026-09-07): `FormDialog` draws a full-bleed
  `Pressable` behind its card (`testID="dialog-scrim"`, `src/components/FormDialog.tsx:114`)
  whose `onPress` is the same `close` the header's × runs — the comment there states the
  intent outright: *"Tapping beside the dialog leaves it, the way tapping beside any dialog
  does."* So a tap anywhere on the dimmed, blurred backdrop discards the form. `ConfirmDialog`
  does the same (`src/components/Sheet.tsx:468`). Nothing typed is kept either way — the
  close is not a save, so the whole form is lost by one stray tap.

- DESIRED BEHAVIOUR: requester's exact words — *"when user click away from opened dialog
  dont close the dialog such as add member form edit member an dcourse form and edit course
  form and all should be closed only on click of close icon and not by clicking away from
  dialog"*.

  Read as: pressing the backdrop beside an open dialog does **nothing at all**. The dialog
  leaves only by its own controls — the header × (`dialog-close`), and the Cancel button
  where the dialog has one.

- WHY: `unknown` as stated. Evident from the ask: a dialog that a stray tap discards loses
  a form that has been typed into.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Specifically —
  - the header × and Cancel still close, and still close **without saving**; nothing about
    what a close does changes, only what starts one;
  - the scrim still renders: the dim, the web `backdrop-filter` blur, `theme.scrim`, the
    card geometry and `DIALOG_MAX_W` are untouched — this is about the press, not the paint;
  - `accessibilityViewIsModal` and the opener-blur rules (CP-014, `openingFocus.ts`) stay as
    they are;
  - every existing testID keeps its name;
  - both themes.

- CORRECTION ROUND: 1 on this surface.

## OPEN QUESTIONS — the requester did not settle these; taken at the gate
- **Q1. Does "all" reach the field pickers?** `AnchoredPanel` (the panel that hangs under a
  date/course/branch/role field) and `Sheet` (the bottom-sheet pickers, Notifications, the
  staff sheet) also dismiss on a backdrop press — and `AnchoredPanel` has **no close icon at
  all**, so its scrim is its only way out. **Taken: pickers are OUT of scope.** A dropdown
  panel is not a dialog, it holds nothing typed to lose, and closing that door with no other
  one open would trap the reader. If the requester meant these too, they need a close control
  designed first, which is a separate ask.
- **Q2. Does it reach `ConfirmDialog`?** It is a dialog and the requester said "all", but its
  close control is the "Not yet" button rather than an × . **Taken: IN scope** — the stray
  tap is the same accident, and "Not yet" is a real, labelled, always-present way out.
- **Q3. What about hardware Back / Escape?** Not mentioned. **Taken: unchanged.** `Escape`
  and Android Back are deliberate acts aimed at the dialog, not "clicking away", and
  `onRequestClose` stays wired exactly as it is.
- **Q4. Should the scrim keep announcing itself to a screen reader?** It currently carries
  `accessibilityRole="button"` and the label *"Close without saving"*. **Taken: those go
  with the press.** A control announced as a button that does nothing is worse than no
  control; the backdrop becomes inert and unfocusable, and the × keeps the label.

## DESIGN SURFACE
- VISUAL?: nothing rendered changes — no pixel, string, colour or layout moves. What changes
  is what a press on the backdrop does. The B4 design pass therefore has no visual delta to
  check, but the **interaction** states do: dialog open, backdrop pressed (must be inert),
  × pressed, Cancel pressed — in both themes, on a narrow width where the scrim collapses to
  almost nothing and on a desktop window where it is most of the screen.
- SCREENS & STATES TOUCHED: the eleven `FormDialog` screens and the seven `ConfirmDialog`
  call sites listed above. No empty / loading / error / offline / permission-denied state is
  affected.
- STRINGS ADDED OR ALTERED: none added or reworded. The scrim's *"Close without saving"*
  accessibility label is REMOVED with the control it named (Q4); the identical label on the
  × stays.
- PERMISSIONS: no.
- USAGE: every form in the app opens as a dialog, so this is on the most-travelled path there
  is — for the academy owner and staff alike.
- RUN MODE: auto (nothing in the ask asked to be confirmed step by step).
- SCALE: blank — the track decides at B0.

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
