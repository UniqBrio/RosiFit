# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Origin.** A single, fully specified redesign brief for the Course Attendance
> screen, given by the requester on 06-Sep-2026 with a reference mockup. The
> brief states its own acceptance criteria; they are reproduced under DESIRED
> BEHAVIOUR. It is a layout brief only — the requester says so twice:
> "Do NOT change existing business logic, APIs, database logic, routing,
> attendance calculations, or functionality."

## FIELDS
- FEATURE / SCREEN: Course detail — `app/course/[id].tsx` (route `/course/[id]`), both the body and its `MemberCard`.
- CURRENT BEHAVIOUR: A deep-gradient hero with a `Courses → <name>` breadcrumb row (back, breadcrumb, Send Communication, delete), then a 25pt course name and two metadata lines. Under it: the rule sentence, an optional branch dropdown, a week label, a seven-card week strip flanked by week arrows, the chosen day's status panel (with an inline "Upload this session" on an awaiting day), a `Members` heading, a full-width **pinned** Add Member bar (`stickyHeaderIndices={[2]}`), and the roster in two sections (with email / no email). Every width renders the same layout; there is no member search and no legend, and Upload is reachable only from an awaiting day.
- DESIRED BEHAVIOUR:
  1. Compact course header: `← <name>` at 24–30pt with the metadata (`n branches · <schedule>`) directly underneath. No breadcrumb, no hero, course name once.
  2. The three primary actions — Send Communication (filled), Upload Session, Add Member (outlined) — grouped in that header. Horizontal on desktop, stacked full-width on mobile, ~42–48pt tall. Upload Session is the general course upload; the awaiting day keeps its own scoped button.
  3. Date navigation visually distinct from page navigation: small square controls inside the strip, never the page back-arrow style.
  4. Week range + "This week" compact, above the strip; a compact status legend beside it.
  5. Seven date cards at EVERY width, ≤125pt tall, with the week arrows at the ends of the strip. ~~Mobile shows ONE prominent selected date with `<`/`>` day arrows and seven position dots.~~ **Corrected by the requester on 06-Sep-2026, mid-build:** “Bring this as mobile view as it was showing up in previous ui … i am telling about the date chips”. The phone keeps all seven chips exactly as it had them; only the gaps close up to pay for the width. The single-card carousel, its day arrows and its position dots were built, shown and removed — no trace of them is left in the file.
  6. Awaiting-upload panel kept, tightened.
  7. The pinned full-width Add Member bar is removed — the action now lives in the header.
  8. `Members (n)` with a search box on the same line on desktop, full width on mobile. Search filters the roster on this screen only.
  9. Member rows ~64–76pt, email truncating with an ellipsis, status pill and edit control kept.
  10. Breakpoints: desktop ≥1024, tablet 768–1023, mobile <768. Vertical spacing on the 4/8/12/16/20/24 scale; no 32+ gaps.
- WHY: "The final result should be significantly more compact and use vertical space efficiently" — the screen is the daily operational surface for staff and too little of it is above the fold. The back arrow and the week arrows currently read as the same control, which is the requester's headline complaint.
- MUST NOT CHANGE: the requester's own list, verbatim and binding — "attendance states, date selection, upload session functionality, communication functionality, member creation, member editing, member status, member menu, course navigation, API calls, loading states, error states, empty states, permissions, accessibility, keyboard navigation". Plus: the week strip stays READ from attendance rows and is never derived from `frequency` (0005); the branch filter and its scoping; the rule sentence; the no-email section, its explanation and its two resolution buttons; the super-admin delete and its confirmation wording; the RosiFit dark identity (deep plum header, magenta accent, rounded cards, subtle borders).
- CORRECTION ROUND: 1 — no previous request in `requests/` touches this screen's layout. The two earlier notes IN the file (Bulk Import removed from the Members heading; the three "Attendance" action rows removed as duplicates) are honoured, not reopened.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: `app/course/[id].tsx` only. States that exist today and must survive: courses loading / error / course-not-found; attendance loading (strip skeleton) / error (message under a still-live strip) / ready; follow-up loading / error / nobody-enrolled; the four day states (present, absent, awaiting, scheduled, not expected); the delete-refused error; both themes.
- STRINGS ADDED OR ALTERED: removed — `Courses → <name>`. Added — the three action labels (`Send Communication` is unchanged and moves; `Upload Session`, `Add Member` are existing labels in new places), the search placeholder, the legend words (taken from `STATUS[*].word`, not newly written), the count in `Members (n)`, and a "no member matches" empty state for a search that hides everyone. Every other string on the screen is frozen — the day-detail sentences, the no-email explanation, the delete confirmation and every toast are untouched.
- PERMISSIONS: no. The super-admin gate on delete is the only role gate on this screen and it is carried across unchanged.
- RUN MODE: auto (default — the description did not say how to run)

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
