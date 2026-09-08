# CHANGE REQUEST — modify something that ships (+ one BUG folded in)
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Parts 1-4 are Track B. Part 5 is a DEFECT and is fixed root-cause-first (Track C rules apply to it). -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS

- FEATURE / SCREEN: **The Reports tab** — `app/(tabs)/reports.tsx` (route `/(tabs)/reports`).
  Its arithmetic lives in `src/data/report.ts` (`reportRows`, `reportBars`, `reportMeta`,
  `REPORT_SCOPES`); its export goes through `toCsv` (`src/data/csvFormat.ts`) and
  `downloadCsv` (`src/data/csv.ts`). The member rows come from `useFollowUp`
  (`src/data/hooks.ts` → `fetchMembers`, `src/data/repository.ts:199`), narrowed by
  `membersInPeriod` (`src/data/joined.ts`).

- CURRENT BEHAVIOUR (read in the files, 08-Sep-2026):
  1. **Three scope tabs.** `REPORT_SCOPES = ['Members', 'Courses', 'Branches']`, rendered as
     three pills; `scope` starts on `'Courses'`.
  2. **A row is a label, a bar and a figures line.** `reportRows` returns
     `{ label, pct, expected, attended }` and nothing else. `ReportRow.sub` exists in the type,
     is documented as "a member's course and branch under her name on the Overview", and the
     report screen never sets it or draws it. So a member row says her name and her
     percentage; a course row says the course name and its percentage. Neither says anything
     from the form behind it, and a course row does not say how many members it counts.
  3. **The export is ONE CSV.** `exportReport()` calls `toCsv` with a five-column header —
     `‹Member|Course|Branch›, Expected, Attended, Missed, Attendance %, Period` — over the rows
     on screen, and `downloadCsv` saves it as `rosifit-‹scope›-report-‹from›-to-‹to›.csv`. The
     toast says "CSV, opens in Excel"; the full-width button says **Export as Excel** and the
     header button's `accessibilityLabel` says "as CSV". A CSV cannot carry a second sheet.
  4. **exceljs is already a dependency**, pinned `4.4.0`, loaded lazily by `excel()` in
     `src/data/memberXlsx.ts`, and already used to build multi-sheet workbooks
     (`buildMemberTemplate` writes three). `downloadBlob` in `src/data/csv.ts` already saves
     arbitrary bytes.
  5. **THE DEFECT.** `fetchMembers` sets `course: '—'` and `branch: '—'` for a member whose
     enrolment is missing, ended, or points at a deleted course (`src/data/repository.ts:208`
     and `:217`; the dash is `NO_COURSE` in `src/data/course.ts:72`). `reportRows` groups the
     Courses scope by `m.course` verbatim, so every such member collapses into a group whose
     label is the literal string `—`. It draws as a bar named "—" on screen and lands in the
     export as a first column reading `—` — a course that does not exist, sorted to the TOP by
     `localeCompare`. That is the row in the requester's screenshot: `—, 0, 0, 0,
     no sessions scheduled, 7-13 Sep 2026`.

- DESIRED BEHAVIOUR: requester's exact words, in one message —

  *"Under reports remove branch tab and under members and course show course and member details
  which are present in their forms and under courses show members count as well and in export of
  reports there should be two sheets one existing sheet other sheet member details with all
  details of member from form and in courses report also another sheet with course details and
  with member in that course count."*

  *"There is bug as well when i downloaded report from course i saw find root cause and fix
  issue as showin in image no name of course it was with - in first coliumn"*

  Read as five parts:
  1. **THE BRANCH TAB GOES.** Reports offers Members and Courses only.
  2. **A MEMBER ROW CARRIES HER FORM'S DETAILS.** Under her name, the facts her member form
     holds — course, branch, status, joining month.
  3. **A COURSE ROW CARRIES THE COURSE FORM'S DETAILS, AND ITS MEMBER COUNT.** Under the course
     name: how many members it counts in this period, plus branch, days and times.
  4. **THE EXPORT BECOMES A WORKBOOK OF SHEETS.** Sheet 1 is exactly today's sheet. Sheet 2 is
     **Member details** — every column the member form holds. The **Courses** report gets a
     third, **Course details**, carrying the course's own fields *and the member count in that
     course*.
  5. **THE DASH ROW IS A DEFECT AND IS FIXED AT THE ROOT.** A course report must not print a
     course called `—`.

- WHY: `unknown` for parts 1-4; no motivation was given. Part 5's why is stated by the
  screenshot: a report row naming no course is unreadable and unactionable.

- MUST NOT CHANGE: everything not named above. Named explicitly because the words touch their
  edges: **the arithmetic** — `reportRows` groups and SUMS rather than averaging, and its
  returned object keeps its exact shape (`src/data/report.test.ts:43` deep-equals a row, so no
  field may be added to it); **`pct === null` for nothing-expected**, never `0`; **the stable
  name-sorted group order**; **`membersInPeriod` narrowing**; the period filter and its
  `PeriodPanel`; the bars, their legend and their `LABEL_MIN` rule; `reportMeta`'s wording; the
  footnote about sessions awaiting upload; every existing `testID`. **Guardrail 1** binds — the
  member list stays the one source and the report goes on deriving from it. **Guardrail 3**
  binds — nothing added may be carried by colour alone.
  **`src/data/report.test.ts` is append-only and must go on passing untouched**, which means
  the `'Branches'` *scope* survives in `ReportScope` and in `reportRows`; only its *tab* goes.

- CORRECTION ROUND: **2** on this surface. Round 1 —
  `requests/2026-09-07-reports-date-filter.md` mounted the period control. Nothing in that
  round touched the scopes, the rows or the export, so nothing here reverses it.

## FOLLOW-UP, SAME DAY — the requester corrected two things after the first cut

Their exact words: *"member detail sheet is not needed when exported courses report only count
is enough only two sheets attendance and course details and also remove export button from
bottom as export is already present on top right"*.

- **F1. The Courses export is TWO sheets, not three.** `Attendance` + `Course details`. The
  member roll comes out of it; the member COUNT is already a column on the course sheet, which
  is what the requester says is enough. The Members export is unchanged: `Attendance` +
  `Member details`. This settles Q1 below the other way, and Q1 is left standing as the
  reading that was wrong.
- **F2. `reports-export-excel` is REMOVED.** The full-width **Export as Excel** button under
  the legend called `exportReport()` on the same rows and saved the same file as
  `reports-export` in the header; the header control is now the only one.
  - **It was a prior round's MUST NOT CHANGE.** `requests/2026-09-07-reports-date-filter.md`
    froze *"both export controls"*, and `src/components/reportsPeriodFilter.test.ts` asserted
    the testID was still present. That assertion is **inverted, not deleted** — it now asserts
    the button is gone, with the reason and the superseding instruction written beside it — so
    the surface stays guarded and the reversal is on the record rather than silent.
  - Removing it removes a testID. `.baselines/testid-app-baseline.txt` is a ratchet on testids
    **missing**, not present, so nothing is owed there.

## OPEN QUESTIONS — the requester did not settle these; recorded as readings

- **Q1. Two sheets or three on the Courses report?** ~~The words say *"there should be two
  sheets ... and in courses report **also another** sheet with course details"*. Reading:
  **Members exports two sheets** (Attendance, Member details); **Courses exports three**
  (Attendance, Member details, Course details). "Also another" is additive.~~
  **SUPERSEDED BY F1 — this reading was wrong.** "Two sheets" meant two, and the second one
  swaps with the scope. Left struck through rather than removed: the next round should be able
  to see that the ambiguity was real and which way it was settled.
- **Q2. What replaces the `—` label?** Not stated. Reading: the group is **kept and named
  honestly** — *"Not enrolled in a course"* — and **sorted last**, rather than dropped. Dropping
  it would break the invariant `src/data/report.test.ts:96` pins: the attended total must not
  change when the tab changes, and a member with attendance but no current enrolment would
  vanish from the Courses tab only. The dash is fixed **at the report**, not in
  `fetchMembers` — `NO_COURSE` is the member row's own honest dash and three other screens
  read it.
- **Q3. "All details of member from form" — which fields?** Reading: the fields the read-only
  record panel already draws (`HerDetails` in `app/member/[id].tsx`) — Status, Inactive from,
  Course, Branch, Joined, Days she attends, Email addresses, Also known as — plus her period
  figures, so the detail sheet reconciles against sheet 1. Her RF- code is deliberately
  excluded on screen (`Member.code`: searchable, never rendered) but is **included in the
  export**, because a file is where an old code is looked up.
- **Q4. "Course details" — which fields?** Reading: what the `Course` record carries
  (`src/data/mock.ts:313`) — name, start/end time, stated frequency, and per-offering branch
  and weekdays — plus the member count, the branch list, and the course's effective follow-up
  rule, which `useFollowUp` already returns and the course form sets. The course form's sender
  and message template are **not** on the `Course` record and would each cost a fetch; left out
  and stated.
- **Q5. Does the file stop being a CSV?** It must — a CSV holds one sheet. Reading: the export
  becomes a real **.xlsx** through the already-pinned `exceljs`, saved by the existing
  `downloadBlob`. The button already says *Export as Excel*; the stale "as CSV" wordings are
  corrected to match what is saved.
- **Q6. Does the screen fetch courses now?** Yes, `useCourses()`. Reading: it is **additive** —
  the report renders in full without it, and a course-detail line is simply absent while it
  loads or if it fails. The report's own figures never depend on it.

## DESIGN SURFACE

- VISUAL?: **yes** — one fewer tab, a new second line under every row.
- SCREENS & STATES TOUCHED: `/(tabs)/reports` — the scope pill row (3 → 2), and the ready
  state's row block. Untouched and verified untouched: loading, error, empty; the period
  panel; the legend; the footnote.
  Both themes, semantic tokens only. The new line is `theme.muted` text — a word, never a hue.
- STRINGS ADDED OR ALTERED: new — the per-row detail lines, the sheet names, the detail sheet
  headers, and *"Not enrolled in a course"* / *"Not at a branch"*. Altered — the export toast
  and the two export `accessibilityLabel`s (CSV → spreadsheet). Everything else FROZEN.
- PERMISSIONS: **no**.
- RUN MODE: `auto`. SCALE: small.

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL. Every changed line traces to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate.
