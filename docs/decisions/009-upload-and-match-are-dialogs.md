# 009 — The attendance upload and its match review are dialogs, not pages

**Status:** Accepted · **Date:** 05-Sep-2026

## Context

`app/_layout.tsx` and `docs/registers/FEATURE_TRUTH.md` both carried the rule **every form is a
dialog** — a form is a decision taken *over* a screen, not a place you travel to — and both
named the same exclusions. Among them:

> Not converted, deliberately: […] `upload` and `match` are multi-step reviews, not forms.

That was a true statement about their shape. It was the wrong test.

The attendance upload is opened by the **Upload** button on the Attendance register, by a day on
a course, and by the "awaiting a file" notification. As a page it was pushed on the root stack
and wrapped in `ShellScreen`, so it filled the window with the academy header, its own
"Upload attendance" header and back arrow, and the Home · Reports · More pill. **The register
being uploaded for was gone from view for the whole of the upload** — including the step where
the file's own date is checked against the day that was tapped.

The requester put the rule in their own words, looking at step 2 of the flow: *"Bring this as
dialog pop up not seperate page minimal ui on top of attendance screen pop up dialog with
process"*, and then generally: *"there should be no seperate page with back button for any
dialogs opening on click of button"* — narrowed the same day to exclude the More tab's
destinations, *"only the forms within"*.

## Decision

**`upload` and `match` come off the exclusion list.** Both are `presentation: 'transparentModal'`
routes rendering through `src/components/FormDialog.tsx`, over whichever screen opened them.

The test is not "is it a form?" but **"is it something done TO the screen it was opened from?"**
A review of the register you are looking at is. `member/import` is not — it is reached from More,
takes over nothing, and stays a page.

Their URLs, their four steps, their entry-point scoping (`src/data/uploadScope.ts`) and every
string are unchanged. The page headers' titles and subtitles move verbatim into the dialogs' own
bars. What goes is the page chrome the dialog makes redundant, the back arrow included.

**One behaviour changed as a consequence, not as a preference.** Finishing an import used to
`router.push('/(tabs)')` (upload's "Later") or `router.replace('/(tabs)')` (match, twice), landing
on Home. Issued from under a modal, those mount a **second copy of the whole app shell** over the
first — the same trap `app/(tabs)/_layout.tsx` documents for `href: null` routes. Both now dismiss
back to the screen that opened them, so the register you uploaded for is what you land on, updated.

## Options rejected

- **Convert every button-opened page in the app.** The requester's general phrasing reaches that
  far. They narrowed it themselves the same day — the More tab's destinations stay pages and only
  the forms within them are dialogs, which was already true (`staff/add` and `change-mobile` are
  `FormDialog`, `branches` uses `ConfirmDialog`). Nothing else was in this request's scope, and
  Track B's rule is that an adjacent improvement is a separate request with its own approval.
- **A dialog only from the Attendance register, a page from the other three entry points.** Two
  presentations of one flow to keep in step, and the course-day entry — the one carrying a
  preselected session — would have been the one left behind.
- **Leave `match` a page.** It is the second half of the same journey and reached by a button.
  Half a journey in a dialog and half in a page is the shape the requester objected to.
- **Give `upload` its own card instead of reusing `FormDialog`.** `FormDialog` exists precisely
  because `course/edit` and `member/edit` each grew a copy, and a fifth hand-built card is how two
  dialogs end up disagreeing about where the close button goes. It was reused **unmodified**.
- **Keep `match`'s `Sheet` and `SearchPicker` inside the body.** The dialog card sets
  `overflow: 'hidden'`, so a bottom sheet rendered inside its scrolling body is clipped by the
  card's edge. They are passed to `FormDialog`'s `overlays`, which exists for this.

## Consequences

- `Screen` is a `ScrollView`; `FormDialog` already scrolls and pads its body. Both bodies dropped
  their `<Screen>` wrapper — nesting the two would have left the longest step unscrollable.
- `match` draws its own `FormDialog` from inside `MatchReviewBody` rather than from the default
  export, because the body owns the state its overlays render from.
- Opened directly by URL there is nothing beneath the scrim. This is already true of
  `member/edit`, `course/edit`, `holiday` and `staff/add`, which `.harness/allroutes.mjs` visits
  the same way; no harness change was needed.
- `router.dismiss(count)` clamps to the stack, so a `match` opened by URL lands as far back as
  the stack goes rather than erroring.
