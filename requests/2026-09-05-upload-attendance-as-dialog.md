# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: **Upload attendance** — `app/upload.tsx`, route `/upload`. Named by the
  requester through a screenshot of that screen at "Step 2 of 4 · File", reached from the
  Attendance tab's **Upload** button (`app/(tabs)/attendance.tsx`, testID `attendance-upload`).
- CURRENT BEHAVIOUR: Upload attendance is a SEPARATE PAGE. It is pushed on the root stack and
  drawn by `ShellScreen`, so it fills the window with its own academy header, its own
  "Upload attendance / The register from Google Meet, matched before anything is written"
  screen header, and the Home · Reports · More pill. The Attendance screen it was opened from
  is gone from view. Inside it runs a four-step process — Course · File · Process · Summary —
  with the step bar always visible.
- DESIRED BEHAVIOUR: Requester's exact words — "Bring this as dialog pop up not seperate page
  minimal ui on top of attendance screen pop up dialog with process".
  Read as, in three parts:
  1. The same flow opens as a POPUP DIALOG, not as a separate page.
  2. It sits ON TOP OF THE ATTENDANCE SCREEN — the Attendance screen stays visible behind it.
  3. MINIMAL UI, and the four-step PROCESS is kept ("pop up dialog with process").
  **Answered at Track B's first gate (2026-09-05), now BINDING:**
  - ENTRY POINTS: all four. The dialog opens over whatever screen opened it — the Attendance
    register's Upload button and its empty state, the course-day shortcut (`courseId` + `date`),
    and the "awaiting a file" notification.
  - MINIMAL UI: delegated to the implementer — "you decide as senior dev". Taken as PAGE CHROME
    ONLY: the academy header, the Overview/Attendance row, the "Upload attendance" screen header
    with its back arrow, and the Home · Reports · More pill go; the dialog's own title bar and
    close button replace them. The four-step bar and every word inside the steps stay.
  - `/match` IS IN SCOPE, and the rule is general. Requester's exact words — "there should be no
    seperate page with back button for any dialogs opening on click of button everyting should be
    like a pop up dialog". Applied HERE to the upload journey: `/upload` and `/match`, the two
    screens of this flow, both become dialogs and neither keeps a back-arrow page header.
    The same rule applied to the REST of the app's button-opened pages (branches, staff, audit,
    appearance, profile, help, member/import, send, the course and member detail screens) is a
    separate, much larger change and is NOT in this request's scope — see the intake note below.

- WHY: `unknown` — not stated. The screenshot shows the upload flow occupying the whole window
  with the Attendance screen no longer visible.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. In particular the requester
  named the four-step process as KEPT ("with process"), and said nothing about what the steps
  do: the course/offering choice, the file parsing and its refusals, the "Mapped to this
  session" panel, the duplicate-name and already-has-a-file warnings, the progress step, the
  summary counts, or the rule that nothing is imported until the review is finished.
- CORRECTION ROUND: 1

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: yes — how the flow is presented on screen is the whole of the ask.
- SCREENS & STATES TOUCHED: `/upload` in every one of its states, all of which must survive
  inside the dialog: step 1 **loading** (`Skeleton`), step 1 **error** (course list failed,
  with retry), step 1 **empty** ("No course to upload for" / "This course runs at no branch
  yet", with its action), step 2 **error** (the file-could-not-be-read failure banner),
  step 3 progress, step 4 summary. Plus the Attendance screen, which the ask requires to stay
  visible behind. Offline · permission-denied: not stated, `unknown`.
  ANSWERED: all four entry points open the dialog, over whichever screen opened it —
  the Attendance register's Upload button (`app/(tabs)/attendance.tsx:139`) and its empty state
  (`:288`), the course-day shortcut (`app/course/[id].tsx:441`, with `courseId` and `date`), and
  the "awaiting a file" notification (`src/components/Notifications.tsx:45`).
  ANSWERED: `/match` becomes a dialog too, with all of its own states — the per-row decision
  screens, the "Ready to import" end state, its email `Sheet` and its member `SearchPicker`.
- STRINGS ADDED OR ALTERED: none requested — everything on screen is frozen. One consequence
  needs recording: the page headers' titles and subtitles — "Upload attendance" /
  "The register from Google Meet, matched before anything is written", and "Match review" /
  "Every row the file could not resolve on its own" — move VERBATIM into the dialogs' own
  title bars. Byte for byte; no rewording anywhere.
- PERMISSIONS: no — not mentioned, and presentation does not change who may upload.

<!-- Intake notes, NOT stated by the requester:
     1. requests/2026-09-05-dialog-opens-at-top.md is an open CHANGE asking that form dialogs
        open at the top of the screen rather than centred. If both are in flight, the dialogs
        here inherit whatever that one settles. Recorded as a fact about the ledger.
     2. The requester's general rule ("no separate page with back button for ANY dialogs
        opening on click of button") was NARROWED by them on 2026-09-05: "dont apply it for
        more option only the forms within". So the More tab's destinations stay PAGES -
        appearance, profile, help, branches, audit, staff/index - and only the FORMS inside
        them are dialogs. Verified already true: staff/add and change-mobile are FormDialog
        transparentModal routes and branches uses ConfirmDialog inline, so this narrowing
        creates no work and no follow-up request. This file's scope is unchanged: /upload and
        /match only.
     3. app/_layout.tsx and docs/registers/FEATURE_TRUTH.md:138 both record the OPPOSITE
        decision - "upload and match are multi-step reviews, not forms" - as a deliberate
        exclusion from the every-form-is-a-dialog rule. This request reverses it, so both
        records are updated as part of the change rather than left contradicting the app. -->

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact analysis with
  the sibling call-site sweep (B2) BEFORE proposing, present the plan with regression risks
  (B4), wait for approval, then apply — touching only what DESIRED BEHAVIOUR requires. Every
  changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan may add to it,
  never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to the touched
  area: states, both themes in semantic tokens, the string table, the permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why (B1). If the miss was the process's fault, flag `/framework-update` too.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing merges
  without a PASS.
