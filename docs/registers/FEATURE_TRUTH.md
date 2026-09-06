# Feature Truth

> **The canonical answer to "what does this product actually do today?"**
>
> Updated at every close-out that changes behaviour — or "no change needed" stated out loud.
>
> Every external claim about the product — website, sales material, support answer, release note
> — is sourced from **this file only**. A stale truth file is how a website ends up promising
> what the product no longer does.

> **Backfilled at framework adoption, 02-Sep-2026,** from the **30 shipped screens** under `app/`
> (32 route files less two `_layout.tsx`), read alongside `src/data/` and
> `supabase/migrations/`. Nothing here was verified against the running project: the live
> deployment has `PIN_PEPPER` unset and `bootstrap_completed = false`, so **no end-to-end flow can
> currently be executed**. Every capability below is therefore ◻ — claimed from the code, not
> confirmed against a running system — unless it is proven by a build-time gate or a SQL test,
> which are marked ✅.

**Navigation, corrected 03-Sep-2026.** The shell has TWO structures, and the canvas' own
"Where to tap" caption names both: *"Overview and Attendance are the two tabs under the academy
name; Home · Reports · More sit in the footer. Branch is a filter, not a header control."*
The first build had five scrolling chips and a branch dropdown in the header. **Attendance is a
section, not a screen** — the tab covers the course list, a course's detail, the members list,
the weekly review and the register, and its landing screen is the course list.

> **CORRECTED 04-Sep-2026: the shell was on the tab group only.** `AcademyHeader` and the
> `Home · Reports · More` pill are drawn by the `Tabs` navigator in `app/(tabs)/_layout.tsx`, so
> only its own seven screens wore them. Everything **pushed on the root stack** — a course's
> detail, a member, the register upload, match review, the audit log, branches, staff, the send
> draft and its result, Appearance, your profile, Help — replaced the whole chrome with a bare
> page carrying a native title bar. A section that loses the shell reads as having left the app,
> not as having gone one level into it, and the sentence above claiming the Attendance tab
> "covers a course's detail" was false on screen: opening one hid the tab row entirely.
> **Now:** `ShellScreen` (`src/components/AppShell.tsx`) draws the same header and the same pill
> for a screen the navigator does not own, and all 13 of those routes are wrapped in it with
> `headerShown: false`. Eight had no back control of their own because they leaned on the native
> header, so `ShellScreen` draws the per-screen title block for them too.
> **Still bare, deliberately:** `index`, `register`, `set-pin` and `forgot-pin` — the pre-session
> flow runs before there is an academy to name or a tab to be on. Dialogs are unaffected: they
> are `transparentModal` routes on the root stack and render *over* the shell.

> **THE SHELL IS ROLE-AWARE, 06-Sep-2026.** A **staff** account does not get Overview. The two
> structures above are otherwise identical for both roles — same academy header, same
> underline tab row, same `Home · Reports · More` pill with the same three labels, same
> Reports — and the one thing that moves is where **Home** goes: the dashboard for the super
> admin, the **Attendance workspace** for staff, which is also where sign-in lands a staff
> account. The tab row then carries **Attendance alone**, full width.
> **Held shut, not merely hidden:** `staff/index`, `staff/add`, `staff/pin` and `audit` send a
> staff account to Attendance if it reaches them by a typed URL or a stale link
> (`AdminRouteGuard`, `app/_layout.tsx`); `(tabs)/index` does the same for itself, because its
> pathname `/` is also the sign-in screen's. **This is the chrome agreeing with the database,
> not a new boundary** — `app_users_read` and `audit_logs_read` were already `is_super_admin()`,
> so those screens answered a staff member with an error before and are simply no longer
> offered. Nothing about what staff may WRITE changed.
> The rule lives in `src/data/access.ts` and is proven by `src/data/access.test.ts` and
> `src/components/staffShell.test.ts` (which also fails if a new `adminOnly` row is added to
> **More** without a matching guard). Request:
> `requests/2026-09-06-staff-does-not-see-overview.md`. ◻ — code and build-time specs; not
> confirmed against a running project, which has no staff account to sign in as.

**Route inventory — all 33, so the count is auditable** (35 `.tsx` files under `app/` less the
two `_layout.tsx`; recounted 03-Sep-2026):

| Module | Routes |
|---|---|
| Dashboard | `(tabs)/index` |
| Members | `(tabs)/members` · `member/[id]` · `member/edit` · `match` |
| Sessions | `(tabs)/attendance` · `holiday` · `upload` |
| Weekly review & send | `(tabs)/weekly` · `send/index` · `send/review` · `send/result` |
| Courses | `(tabs)/courses` · `course/[id]` · `course/edit` · `course/rules` · `offering/edit` |
| Reports | `(tabs)/reports` |
| Staff & access | `staff/index` · `staff/add` · `staff/pin` |
| Identity | `index` · `register` · `set-pin` · `forgot-pin` · `change-mobile` · `profile` |
| Settings & support | `(tabs)/more` · `appearance` · `branches` · `templates` · `audit` · `help` |

Two corrections to the 02-Sep backfill, both found by recounting rather than reported: the
sessions tab is `(tabs)/attendance`, not `(tabs)/sessions`, and `offering/edit` was omitted
altogether. Added on 03-Sep: `branches` and `course/[id]`.

---

## Per module

### Dashboard — `app/(tabs)/index.tsx`
**Last confirmed:** 06-Sep-2026

**As of 06-Sep the Overview is three filters, one ring and three sections, two to a row
from a 768px window (`TWO_UP_MIN` in `app/(tabs)/index.tsx`), stacked below it.** The
"Academy wise / Branch wise" tab pair is gone: academy-wide IS the branch filter with
nothing ticked, so the tabs were a second control for one fact and could be set to
disagree with the filter beside them. The `scope` they wrote to is gone from
`src/state/academy.tsx` with them (ADR 023).

**The filters are Course, then Period, then Branch, and all three are checkbox lists.**
An empty selection means "not narrowed" — "All courses" is the state of the control, not
an option the query matches by name, so a branch that happened to be called that could
never switch the filter off. Several ticks are an OR within a filter and an AND across
them. A tick on a value that no longer exists (a branch removed under More →
Configuration) is dropped, so the filter widens visibly rather than narrowing to nothing
under a field still reading "2 branches". `src/data/overview.ts`, ✅ held by 16
assertions in `src/data/overview.test.ts`.

**The ring is Present and Absent.** "Not expected" was removed on request and is not a
category: it described the absence of a session, not the outcome of one. It was only ever
needed because the ring's denominator was a fixed six-session week; the denominator is now
what was actually expected of the members counted, so a member due at four who came four
times reads 100% rather than 67%. `distribution()` in `src/data/followup.ts`, ✅ held by
11 assertions in `src/data/distribution.test.ts`.

**Three sections, two marks, one set of numbers** (the course and period marks changed on
06-Sep-2026 at the requester's instruction — ADR-026,
`requests/2026-09-06-overview-two-per-row-donuts.md`):

| Section | Mark | Why that mark |
|---|---|---|
| Based on member | ranked horizontal bars, lowest first, 6 shown | the length is a session VOLUME, which is what decides who to chase |
| Based on course | a small ring per course — Present against Absent, the percentage in the hole (`AttendanceRings`) | the requester asked for donuts; a ring that means what the Attendance ring means is one mark to learn, not three |
| Based on period | a small ring per sub-range, the same component | as above; a sub-range that expected nothing is a dash on an empty track, never 0% |

Until 06-Sep the course section was a dot plot on one shared 0–100% axis and the period
section a line over the sub-ranges (ADR-023, amended). Both components left the tree with
their replacement; `git log` has them. ✅ held by 5 specs in
`src/components/overviewGrid.test.ts` (one grid, rings fed the report rows, the old marks
gone, words and glyphs beside every colour).

| Capability | Status | Notes |
|---|---|---|
| Attendance ring, Present/Absent | ◻ | `distribution()` over the narrowed member list; ✅ arithmetic |
| Multi-select Course / Branch filters | ◻ | `src/data/overview.ts`; ✅ narrowing and labels |
| Member, course and period sections | ◻ | `reportRows()` groupings plus `bucketTotals()`; ✅ arithmetic |
| Period split into sub-ranges | ◻ | `periodBuckets()` — a day each for a week, a week each for a month, a month each for longer; ✅ 8 assertions that the buckets PARTITION the period exactly |
| Follow-up count | ◻ | Derived from the member list and the saved rule (DR-1), never a stored second list |

**Rules and validations** — every figure on the screen is counted from ONE member list,
narrowed once. The period rings ask the same `member_period_metrics` the ring asks, once
per sub-range, over ranges that join up with no gap and no overlap — so the rings sum
back to the big ring instead of answering a second question with a second number
(`src/data/buckets.ts`, ✅ `src/data/buckets.test.ts`). A sub-range that expected nothing
is a dash rather than 0%. Every chart's caption is generated from the
same selection the figures are counted from, so a label and a number cannot describe
different populations.

**Limits** — the Overview reports; it changes nothing. The member section shows six rows;
the full list is on Reports. The period section is a second round trip and carries its own
loading and error states, so a failure there leaves the ring and the other two sections
standing.

**As of 03-Sep** the dashboard was the scope tabs, the filters and ONE chart. The canvas
revision of that date dropped the hero "N members need you" card, the "What needs you"
list of four routes, the two quick links, the week-by-week table and the week strip. Each
was a second place a figure lived, and the week table counted from a different query
(`useWeekRows`) than the chart beside it while admitting in its own caption that the branch
and course filters did not reach it — the caption the 06-Sep period section exists to make
untrue. The week strip rendered `WEEK_STRIP`, a hardcoded fixture, on the live dashboard.

Nothing removed is unreachable: the flagged set is on Weekly, awaiting uploads on the shell's
bell and `upload`, staff without access on `staff/index`, the week table on Reports.

The description below is the 02-Sep state and is kept only for the history:

The academy at a glance for the current week: attendance figures, the follow-up count, and a
branch selector that every other figure follows.

**Rules and validations (02-Sep)** — picking a real branch switches the view to Branch wise;
"All branches" means academy wide. Every metric tile states the period it covers, so two tiles
cannot claim different weeks for the same numbers.

**Benefit** — one screen answers "who is drifting away this week", which is the entire job.

---

### Members — `(tabs)/members` · `member/[id]` · `member/edit` · `match`
**Last confirmed:** 06-Sep-2026

The member list, one member's history, the edit form, and the screen that links an unrecognised
name from an uploaded register to an existing member.

| Capability | Status | Notes |
|---|---|---|
| List, search and filter members | ◻ | Search covers her name, her primary address, her Meet aliases and — unadvertised — her pre-`0026` RF- code |
| One member's attendance history | ◻ | **A pop-up over the list she was tapped on, not a page — 06-Sep-2026** (`requests/2026-09-06-member-detail-as-popup.md`, the requester's *"lengthy details … should appear as pop up on top of screen with minimal but yet full info"*). `member/[id]` is a `transparentModal` route through `FormDialog` (ADR 009, amended again): her name in the bar, course · branch · joined under it; Expected · Attended · Missed · Missed streak as one strip with *Attendance this week* on its footer line; *Her sessions this week* as one hairline list — holidays and cancellations still listed with why they do not count (C-92), *No sessions* still its own row; email on file or *No usable email* as one line; **Edit** (now a worded button) and **Reach out** pinned in the footer. The same facts the page showed, in less room; the gradient header, the shell and the five tiles are gone. Loading and not-on-register are answered in the same card. The three ways in — course roster, member list, weekly list — are unchanged and all open the dialog. `src/components/memberDialog.ts` (4 specs) holds the subtitle line and the attendance tone; the screen is layout only |
| Add a member | ◻ | **Her name, her course and branch, and an email address are required — 06-Sep-2026** (`requests/2026-09-06-add-member-email-required.md`, the requester's *"email address is mandatory for add member"*, and *"same for edit member as well"* the same day — the rule is one gate on one form, no Add-vs-Edit branch in it). The Email addresses label carries the shared required mark, the note under an empty row says she cannot be added without one, and the footer names both of her required fields; Add Member stays disabled until an address is on the form. It is the same rule the member FILE enforces (bulk import, above) and for the same reason: a member with no address cannot be written to, and these are the two surfaces that create one. **`create_member` (0016) still accepts an empty address list** — the client is the gate, as it is for the import; making the RPC refuse it is a migration that could not be rehearsed on the adopting machine (no PostgreSQL 16). The canvas's `nmHint` still reads *"Her name is all that is required"* for this form. Not reversed: the ATTENDANCE import still creates a member with no address (C-76) — which is exactly why the upload offers two ways out of it, **Add as new member** (this form, which asks for the address the card was missing) and a display name on somebody already on the register; **editing her is the third, and it asks for the address before it saves anything** |
| Edit a member | ◻ | **An email address is required here too — 06-Sep-2026**, the requester's *"same for edit member as well"* (`requests/2026-09-06-add-member-email-required.md`). A member the attendance import created opens with Save disabled and the footer asking for her address; nothing of hers — her status included — is saved until one is on the form. The first cut of the rule exempted Edit for her sake; the requester removed the exemption. **Edit is Edit from the moment it opens — 06-Sep-2026.** The dialog reads the route, not the result of its own lookup, so while her record is still being fetched it says *Edit member · Fetching her record* over a skeleton with no Save, a failed read offers Try again, and an id that is not on the register is told plainly. It used to answer all three with the ADD form — blank, titled *Welcome a new member*, over a Save that would have created her a second time (RC-021, and RC-012 before it) |
| Several email addresses, exactly one primary | ◻ | `member_emails.is_primary` |
| No member code is assigned, and none is shown | ✅ | Retired in `0026` (ADR 006). No screen renders one; pre-`0026` codes stay in the column and stay searchable, so somebody holding one from an export can still find her |
| Bulk import members from an `.xlsx` file | ✅ | `app/member/import.tsx`, `src/data/memberXlsx.ts` (template + parse, exceljs 4.4.0 browser build), `src/data/memberImport.ts` (rules), `bulk_import_members` (0028, date shape 0029). **Choosing the file IS the import** — read, judged, written and reported in one tap. The canvas names it "file → validate → preview → confirm" (`goBulkImport`) and it shipped that way; the preview was a list whose only two answers were "yes" and "choose another file", so it moved to AFTER the write, where it is the result. Every row is still judged before anything is sent and a refused row still writes nothing. **Her name and her email address are both required** (06-Sep-2026) — a row with no address is Failed, and named on the result with its reason and its row number. This does not reverse C-76, which is about the ATTENDANCE import: a member already on the register with no address still has her attendance imported and is still counted, excluded from sends with the reason shown. The member file is what CREATES her, and it is the one place a hundred unwritable-to members arrive at once. **The course is PER ROW**: the screen asks for none, so one file covers every course the academy runs. The template's Course and Branch columns are dropdowns fed from a hidden lookup of the academy's own offerings, with `errorStyle: 'stop'` — a course typed by hand is refused **by Excel**, not merely on upload, so nobody can invent one in the file. Opened from a course detail, that course is what a **blank** Course cell falls back to. With no course on the register the template is not offered at all: there would be nothing to list, so the screen says to add a course first. Modelled on UniqBrio Bulk Student Import v1: three-sheet template, academy-branded name, 500 rows / 5 MB, blank rows skipped, blank joining date = today, a duplicate **skipped, never overwritten**, each row in its own sub-transaction (§15.2 "some rows blocked"), Imported / Skipped / Failed. **The downloadable error report was removed on 06-Sep-2026** on the requester's “download error report is not needed”: every row that did not land is already listed in the result with its reason and its sheet row number, which is what the report was a second copy of. `buildErrorReport` and its spec stay in `src/data/memberXlsx.ts` with no caller — see TECH_DEBT. **It is a DIALOG, not a page** (06-Sep-2026, ADR 009 amended): a `transparentModal` route through `FormDialog`, over the workspace it was opened from, with the result in the same card rather than a second one nested over it. **Owner-only.** RosiFit's own differences: no phone column (C-70), ONE course per row (one active enrolment, 0006), Google Meet display names. 34 specs under `src/data/`, 37 assertions in `supabase/tests/22_bulk_import_members.sql`. **Closes the defect** where Bulk Import opened the attendance importer (`/upload`) |
| Her own days | ✅ | `member_schedules` (0006) is an OVERRIDE, always a subset of the days her offering runs. **Adding a member, the chips open with every one of those days already on** and whoever is entering her takes off the ones she will not attend; the row re-seeds when the course or the branch changes. A row still on that default saves as `null` — no override row, so she follows the offering and keeps following it if its schedule changes later. Only a **narrower** selection writes her a schedule of her own. `src/data/memberDays.ts` (11 specs) is the whole rule — `memberWeekdays` for what a saved row means, `openingDays` for what an opening row shows. **The EDIT form opens on her days too**, since 06-Sep-2026: `Member.weekdays` carries her current override and the row opens on it, or on the course's days when she has none (`openingDays`). Clear the row and she goes back to following the course; that is now a decision somebody takes rather than what Save did by itself (RC-020, TD-019 paid). The chips are the same accent-filled control the course form's FREQUENCY row uses — a selected day is filled, a day the course does not run is disabled. Neither picker clears the row: re-picking the course or branch already showing changes nothing. |
| Mark a member active or inactive | ◻ | **TWO controls, one write path.** On a course roster row the Active/Inactive pill is the control: tapping it confirms, then writes immediately. On **her own record** — the Edit member dialog, `app/member/edit.tsx` — Status is a two-choice field like any other on that form: the pick is pending, Cancel discards it, and **Save** writes it (06-Sep-2026, `requests/2026-09-06-member-status-in-edit-form.md`). It is a second write beside `update_member` (0027), which does not touch the column, and it runs only when the pick differs from her record and only after her details have landed — so a refusal there is reported as being about the status alone rather than as a failed save. The Add form does not offer it: `create_member` (0016) inserts `'active'`. Both controls go through `set_member_status` (0031), which stamps `status_changed_at` and the actor. **Inactive means one thing only: she is out of the follow-up rule** — not listed, not written to. She stays on the roster, her attendance goes on being recorded, and her enrolment, her sessions and her history are untouched; marking her active again puts her straight back. Before this the pill was DERIVED from `expected === 0` and could not be set by anybody, while `follow_up_candidates()` (0009) had always filtered on the column nothing wrote — so the app and the engine could disagree about who was eligible. Both now read `members.status` (ADR 018). `'paused'` is read the same way as inactive and is never written. 15 assertions in `supabase/tests/24_member_status.sql` — **written, not yet run**: the adopting machine has no PostgreSQL 16, so the harness could not rehearse 0031, and **0031 is not applied to production**. Until it is, the READ side is live (the column has existed since 0006) and the WRITE fails with the function-not-found message. The 7 specs in `src/data/memberStatus.test.ts` DO run and pass, and they cover the derivation. **The cost:** "expected at nothing this week" lost its word on the roster — TD-020 |
| Aliases | ◻ | What the uploaded register matches on |
| Link an unmatched name to an existing member | ◻ | **AMENDED AGAIN 06-Sep-2026 — there is no resolve list either.** It was `app/match.tsx`, then the upload's own list of rows needing a person; the file now imports on the pick, so nobody is asked at import time at all. **One place:** the course screen's **No email** group, where the choice is a MERGE — `merge_member_into` (0032) — not an alias on its own. Every row the matcher cannot settle, `D · Ambiguous` included, is filed as a NEW member with no email and lands there (ADR 022) |

**Rules and validations** — **no phone number is held for a member**, and since `0026` **no new
member code either**: neither identifies anyone a person could check against, so neither is
collected. Her joining month is what the detail header carries instead. An alias is a correction
and can be deleted; it is the only `for delete` policy in the schema.

**Limits** — members do not sign in. RosiFit has no member-facing surface at all; every screen is
for the academy.

**Benefit** — a name spelled three ways in three registers is still one member.


**Every form marks the fields it will not do without — 06-Sep-2026.** A field that blocks the
save carries a red asterisk against its label, and one component draws it everywhere
(`src/components/RequiredMark.tsx`, CP-017): `Field`, `Label`, `DropdownField` and the date
picker's row each take an optional `required` and render that one mark. **What is marked is taken
from each form's own validity expression, never from an opinion** — the mark reports the
validation, it does not set it, so nothing became mandatory or stopped being mandatory. Marked:
member/edit (name, course, branch), course/edit (name, branch, frequency, from-address,
template), offering/edit (branch, days, effective-from), staff/add (name, mobile), holiday (name,
start date), branches (name), change-mobile (current PIN, new number), forgot-pin (answer),
register (name, mobile, both answers). Deliberately unmarked: sign-in and `set-pin`, whose
inputs have **no field label to qualify** — a single unlabelled box under a heading; and every
field a form genuinely saves without — a holiday's end date, a member's joining date, a staff
role label, an offering's start and end times, and the registration email. The mark is a glyph
before it is a colour and its accessible name is the word "required" (guardrail 3), and
`theme.danger` is measured on every surface in both themes (guardrail 2), so it adds no
unmeasured pair. Held by `src/components/required.test.ts`, which fails if a form that gates its
own save marks nothing.


**One calendar, at one size, wherever a date is chosen — 06-Sep-2026.** `MonthCalendar`
(`src/components/DateTimePicker.tsx`) used to take its host's full width and draw square cells,
which on a phone is a 45px day and in the Overview filter's dropdown on a desktop is a 260px
tile — six rows of them, 1,560px inside a panel capped at 430, so the month arrived **cut off
after one row**. The cell is now a fixed height in a grid capped at seven of them and centred:
the same calendar on a phone and on a 27-inch screen, in the four date FIELDS (holiday start and
end, a member's joining date, a course's effective-from) and in the period filter's custom RANGE
alike. The month name in the header is now a button: it opens a **month-and-year list**, so a
joining date four years back is three taps rather than forty-eight. The fields no longer open the
bottom sheet — the calendar is drawn in a panel **anchored under the field**, pulled back inside
the window at the edges and flipped above the field when there is no room below
(`src/components/datePanel.ts`, 8 specs). The layer beside it carries no tint and is still a
real, labelled control (CP-014, amended) — though the page behind it is blank today whatever the
tint, because every date field sits in a `FormDialog` and **TD-021** collapses that card to 2px
whenever a `Modal` mounts over it; the sheet this replaced did the same. In the period filter,
which is not a modal, the screen behind the calendar is fully visible. Monday
still starts the week (CP-012) and every colour is a semantic token in both themes; ISO values,
`min`/`max`, the half-picked range and the Clear/Today pair are all exactly what they were.
`TimeField` still opens the sheet — the request was about dates. ADR 024; request
`requests/2026-09-06-compact-date-picker-everywhere.md`.

**The course, branch, role and question pickers open under their field too — 06-Sep-2026.**
The four single-tap "pick one value into a form field" pickers (member form course and branch,
Add staff role label, Register's two questions) used to slide up `SearchPicker`'s bottom sheet:
a band the full width of the viewport, over a scrim, covering the form the value was being
chosen for. They now open `AnchoredPicker` (`src/components/Sheet.tsx`) in the same
`AnchoredPanel` the date field uses (now its own module, `src/components/AnchoredPanel.tsx`):
directly under the field, **as wide as the field** (`anchoredWidth`, `datePanel.ts`, 4 more
specs), with the rest of the form in view around it, pulled back inside the window at the edges
and flipped above the field when there is no room below — pinned by its bottom edge there, so a
short list sits on the field rather than floating the reserved height above it. The rows are the
sheet's rows unchanged: a radio, the label, the meta on the right, and the chosen row saying
**Selected** in words (guardrail 3). The **search box is drawn only where it earns its height**
— when a label can be typed in and added (the role picker), or when the list is longer than seven
— so a two-course academy gets the two courses and nothing else. The picker's title is no longer
drawn (the field above it says what is being chosen) and is the panel's accessibility label. What
each picker offers and what choosing does is untouched: a real course change still drops the
branch (RC-020), the branch list is still the branches that course runs at, a new role label can
still be typed in, and a question already used by the other slot is still withheld. The merge
picker on the course screen ("Who is …?", two-step, confirm) stays a sheet: it is opened from a
list row, not a form field, and has nothing to hang under. Verified in the built app in both
themes: the panel's top is under the field's bottom and its left and width equal the field's, in
`/member/edit`, `/staff/add` and `/register` (phone width, where the question list flips above).
Request `requests/2026-09-06-pickers-open-under-their-field.md`; ADR 024 applies, no new
decision.

**Every form is a dialog.** A form is a decision taken *over* a screen, not a place you travel to.
Pushed as a page it wears the stack's header — so the only way out is in the chrome, and the save
sits below however much has been typed. `member/edit`, `course/edit`, `offering/edit`, `holiday`,
`staff/add` and `change-mobile` all render through one shell
(`src/components/FormDialog.tsx`): a title saying what is being decided, a subtitle naming what it
applies to, a close that leaves without saving, and a **pinned** footer. `upload`
renders through the same shell as of 05-Sep-2026 — see the corrections below. Deliberately *not*
converted: `register` / `set-pin` / `forgot-pin` are the pre-session auth flow and own the screen;
`branches`, `staff/index`, `audit`, `appearance`, `profile` and `help` are places, not decisions.
`member/import` was on that list until 06-Sep-2026 and came off it — see the correction below.

> **CORRECTED 05-Sep-2026 — `upload` and `match` came off the exclusion list.** They were
> excluded as "multi-step reviews", not forms. That was a true statement about their SHAPE and
> the wrong test to apply: the attendance upload is opened by a button on the register it is
> about, and as a page it replaced that register with a full window of its own — academy header,
> a back arrow, the nav pill — for the whole of the upload. A review taken *over* the screen it
> concerns is still something done to that screen. Both are now `transparentModal` routes
> rendering through `FormDialog`, carrying their existing titles and subtitles into its bar,
> from all four entry points: the Attendance register's Upload button and its empty state, a day
> on a course, and the "awaiting a file" notification. Decision 009; request
> `requests/2026-09-05-upload-attendance-as-dialog.md`.
>
> **CORRECTED 06-Sep-2026 — `member/import` came off the exclusion list too.** Decision 009
> excluded it as "reached from More, takes over nothing". It is not reached from More: it is
> reached from **Bulk Import on the Courses workspace** (`courses-bulk-import`), beside Add
> Member and Add Course in the screen's header (moved there from a row above the list on
> 06-Sep-2026, `requests/2026-09-06-courses-actions-in-header.md`), and from a course detail. It is opened
> by a button on the thing it changes, which is decision 009's own test, and as a page it
> replaced that workspace for the whole of the import. It is a `transparentModal` route
> through `FormDialog` now, title and subtitle verbatim, URL unchanged — and the RESULT
> stopped being a second `FormDialog` nested over the first: one card, one scrim, one close.
> ADR 009 (amended); request `requests/2026-09-06-import-writes-on-upload-email-required.md`.
>
> One behaviour changed with them: finishing an import used to `push`/`replace` the tab group and
> land on Home. From under a modal that mounts a **second copy of the whole shell** over the
> first, so both screens now dismiss back to whatever opened them.

> **CORRECTED 06-Sep-2026 — `match` no longer exists.** The dialog above is now the only one in
> the upload journey. The row-by-row match review — one full screen per unresolved row, walked
> in order before anything could be written — is a single list on the upload's own last step,
> and `app/match.tsx` and its route are gone. What was true of it above still describes what it
> was; nothing renders it any more. Request
> `requests/2026-09-06-upload-flow-shorter-no-email-resolution.md`.

> **CORRECTED AGAIN, SAME DAY — there is no list on the last step either.** The row-by-row
> review became one list, and the list has now gone with the `Import N rows` button it was
> waiting on: the file is read, matched and WRITTEN on the pick, and the last screen is the
> result rather than a decision. The one question that survives is a file whose day is not the
> day she opened — confirmed, then imported for the FILE's day. ADR 022, request
> `requests/2026-09-06-upload-imports-on-pick.md`.

> **CORRECTED 04-Sep-2026.** This paragraph was true on a phone and false in a browser, and it
> said so in three places at once — here, in `FormDialog`'s doc comment and in `app/_layout.tsx`.
> The shell was `flex: 1` on `theme.bg` and left the dialog part to `presentation: 'modal'`,
> which a native stack renders as a sheet and a browser renders as a **whole page**: edge to
> edge, nothing behind it. Two of the six (`course/edit`, `member/edit`) had also kept their own
> hand-built copies of the chrome, so "one shell" was not true either.
> **What makes it true now, and it needs both halves:** `FormDialog` draws its own scrim and a
> centred card (max 560px wide, 90% of viewport height, body scrolling inside it), and the six
> routes use `presentation: 'transparentModal'` so the screen underneath stays mounted and
> visible. Adoption is 6/6, verified by `grep -l FormDialog app/`.

> **CORRECTED AGAIN 05-Sep-2026 — it was three halves, and "visible" was the false one.**
> `mounted` was true; `visible` was not. The `Stack`'s `screenOptions` painted `contentStyle:
> theme.bg` onto EVERY screen, dialog routes included, so each of the six covered the mounted
> screen with an opaque `#08040A` panel and the backdrop was a flat black field. The paragraph
> above described a property the app did not have, and the screenshot that reported it is the
> only reason anyone found out. **What makes it true now:** the three properties are one object,
> `DIALOG_SCREEN` in `app/_layout.tsx` — `presentation: 'transparentModal'`, `animation: 'fade'`,
> `headerShown: false` and `contentStyle: { backgroundColor: 'transparent' }` — spread by every
> route that renders a `FormDialog` (the six forms, plus `upload` and `match` from decision 009), with `theme.bg` moved to a `View` around the whole `Stack` so a dialog opened cold still
> has a ground. `FormDialog`'s scrim adds `backdrop-filter: blur(14px)` on web, so the screen you
> opened the form from reads as a blurred backdrop rather than as content behind glass.
> See RC-016. Adoption is 8/8, verified by `grep -c "options={DIALOG_SCREEN}" app/_layout.tsx`.

**The member code is not shown anywhere.** It is an internal identifier: it tells nobody which
member this is, and it was the entire second line for anyone with no email address. Her detail
header carries `branch · joined Mar 2026`, as the canvas writes it. The code stays *searchable* so
anyone holding one from an export can still find her, but the search placeholder no longer
advertises a field the app does not display. The `{{member_code}}` message token is untouched —
stored templates may use it, and it is the academy's choice.

`SearchPicker` options now carry an optional `value`, and the member picker matches on **her id**.
It matched on the display label, which was unique only because it contained the code; without it,
two members sharing a name would both have matched the first — linking an attendance row to the
wrong person, silently.

**The same label was still the React KEY until 07-Sep-2026 (RC-024).** The note above fixed the
selection path and left the render path keyed on the name, so the academy's two Kavitha Rameshes
were two children with one key: rows the query did not match stayed on screen, and one member's
label was painted over another's props. Rows are keyed by `pickerKey` — her id, or `label#index`
where there is no id — at BOTH call sites. A note is not a guard.

**And the merge picker now shows her email address and searches by it.** The row prints her
primary address under her name (`PickerOption.sub`, ellipsized in the MIDDLE so two addresses
that differ just before the `@` stay different at phone width), or `No email on file` when she
has none (C-76: named, never silently blank). The query matches EVERY address she holds, not
only the printed one, so an old address off a spreadsheet still finds her — the placeholder says
*Search by name or email*, the same words the roster box on the same screen uses. No other
picker passes `sub` or `search`, so course, branch, role and question pickers are untouched.
`requests/2026-09-07-merge-picker-search-by-email.md`.
---

### Sessions — `(tabs)/sessions` · `holiday` · `upload`
**Last confirmed:** 03-Sep-2026

The month calendar, closures, and the attendance register upload.

| Capability | Status | Notes |
|---|---|---|
| Month view; every session-bearing day carries an icon **and its word** | ✅ | Glyph resolution proven at build time by `scripts/check-icons.ts` (71/71) |
| Mark a session held or cancelled | ◻ | Status only — a session cannot be created or deleted from the client |
| Declare a holiday over a date range | ◻ | A **closure**, not a cancellation |
| Upload an attendance register (CSV) | ◻ | **AMENDED 06-Sep-2026 — choosing the file IS the import.** Preview then commit still both run and the write is still one transaction (`0014`, `csv-import`); what went is the stop between them, along with the step bar and the `Import N rows` button. The result is the two counts the requester asked for — **with email** (`counts.matched`, a confident candidate who has an address) and **no email** (`noEmail` plus every row filed as somebody new, since an imported member has no address) — each naming the section that group is now in. ADR 022, `requests/2026-09-06-upload-imports-on-pick.md` |
| Whoever ran the class is not on the register | ◻ | **06-Sep-2026.** A Meet file lists everybody who was in the call, the instructor included; she is not a member, so every match tier missed her and — once nobody is asked — she was created the first week and MATCHED every week after, marked present in the class she teaches. `csv-import` now sets aside any row whose normalised name is an `app_users` name, BEFORE matching, and names them separately from the dropped rows. Done in the function, not the client, because `app_users_read` (0013) is `is_super_admin() or your own row` — on the client the same file would import differently depending on who pressed the button. **Needs the function deployed**; until then such a row imports as a new no-email member |
| The upload is scoped to where it was opened from | ✅ | A day opens straight into that session; a course narrows to its own; Attendance narrows nothing (`src/data/uploadScope.ts`). **The day it was opened on is read from the date PARAMETER**, not from a `PendingSession` — those exist only for days awaiting a file, so a file for another day opened from any other day used to ask nothing and silently update that other register |
| Upload works with nothing scheduled | ✅ | The first choice is the **course**; the session comes from the file's own date (0024). **Since 06-Sep-2026 the button is there too:** `course-day-upload` on the course week strip rendered only for a day already `awaiting` a file, so a class arranged on the day, or run on a day the course does not normally run, showed no way to upload at all. It is now on every day, and the day she tapped travels with it — which is what lets the upload ASK when the file turns out to be from another day. **Later on 06-Sep-2026 the day card went altogether**, button and message with it, on the requester's ask: the header's `course-upload` beside Send Communication is the one way to upload from the course screen, and the file's own date still names the session |
| One person, one session, one day | ✅ | `attendance_unique_live`, plus in-file duplicates collapsed and **named** before import |
| Five outcomes, only the unguessable one blocking | ✅ | **AMENDED 06-Sep-2026 from "blocking distinguished from not".** A and B never needed a person and no longer get a screen: `commit_csv_import` (0014) already defaults `matched` to accept and `noEmail` to continue-without-email. C pre-selects its one candidate, visibly and changeable in a tap; E resolves to a new member; **D alone holds the Import button**, because two members carry the name and the import does not guess. `OUTCOME_META` still carries a letter, a word and an icon each |
| Choosing the file processes it | ✅ | No "Process" button: `choose()` runs the preview on the pick. A file with no `Created on` line stops on the file step, where the session map names what is missing |
| Resolve a name the file could not, without a wizard | ✅ | One list on the upload's last step, one tap a row: each candidate, **New member**, **Not a member**. `app/upload.tsx` (`ResolveRow`) |
| Fold a member created in error into the real one | ✅ | `merge_member_into` (0032) — moves her attendance, moves her display names, retires the stray. The alias alone left the real member marked absent from a class she attended |

**Rules and validations** — a holiday shows its impact **before** anything is applied, and states
out loud what it will not do. Attendance is never written by the client: `authenticated` holds no
write grant on the engine tables, so a register can only arrive through the import function.

**A session comes from the file, not from a timetable.** The upload used to require a session to
upload *against*: step one listed `sessions` rows already scheduled and waiting, and the import
carried the offering and date chosen from that list. A course whose classes are not on a fixed
timetable has no such rows — so the screen said *"Every session has a file"* and there was no way
in at all, for exactly the academy that needs it most.

The first choice is now the **course**, which always exists. The **date comes from the file**:
Google Meet writes its meeting code and the created/ended timestamps above the table, and those
identify the session. Days already awaiting a file are still offered first as shortcuts, because
when there is one it is almost always the answer — and taking the shortcut is the only case where
the file's date can be *checked* against an expected day. A file with no `Created on` line cannot
be processed and says so; landing attendance on a date nobody chose is worse than refusing.

`meeting_code` and `meeting_started_at` are recorded on the import (0024), so a register is
traceable to the meeting it came from.

**Who was due at a class nobody scheduled.** A session the import creates gets
`expectation_mode = 'all_enrolled'` when the offering's weekdays do not cover that date, and
`'schedule'` when they do. Without that split the default asks the schedule, and for an off-schedule
date the answer is *nobody*: `expected_count` 0, not one absence recorded, and the follow-up engine
blind to a class that really happened. Attendance would have been "recorded" and counted for
nothing.

**Time in call decides nothing.** There was a 15-minute floor: anybody in the call for less was
dropped before matching, so a member who reconnected or joined from a phone was marked absent from
a class she attended. Being named in the file is the evidence; the duration is kept alongside it
for the record and read by nobody.

**One person, one session, one day.** `attendance_unique_live (session_id, member_id)` and
`sessions_unique_live (offering_id, session_date)` make both halves database invariants. Meet
writes a line per *join*, so a dropped connection appears twice — collapsed before the preview, on
the normalised name, and the repeats are **named on screen**, never quietly discarded. A second
file for a day already imported is not refused, because a corrected export is a real thing, but it
is announced: it **corrects** that register rather than adding to it.

**The upload screen is scoped by its entry point.** It had one door wearing three hats: opened
from an awaiting **day** on a course, from the **course**, or from the academy-wide **Attendance**
list, it offered the same list of every session anywhere awaiting a file and asked the person to
find again the one she had just tapped. Picking wrong here attaches a real class's register to a
different class, and the file-vs-session check can only compare against whatever she picked — so
narrowing removes most of the ways to pick wrong. A day carries `?courseId=…&date=…` and opens
straight into that session; a course carries `?courseId=…`; Attendance carries nothing.

Two refusals matter more than the narrowing itself, and both are asserted
(`src/data/uploadScope.test.ts`, 13 cases). A scope that matches **nothing does not widen back to
everything** — it says the session is no longer waiting and offers the full list as a deliberate
second tap. And **two sessions of one course on one day** (two branches) are never resolved to the
first; she still chooses, from two rather than twenty. Every narrowed list says it is narrowed and
carries "Show every session", and a preselected session carries "Change" — a filter that does not
announce itself is a list that has silently lost rows.

**Limits** — no live check-in. Attendance is a register that gets uploaded, not a door sensor.

**Benefit** — closing the academy for a week does not corrupt everyone's attendance percentage.

---

### Weekly review and send — `(tabs)/weekly` · `send/index` · `send/result`
**Last confirmed:** 06-Sep-2026

The members the rule flagged this week, and the two dialogs that email them.

| Capability | Status | Notes |
|---|---|---|
| The week's follow-up list, with the reason each member is on it | ✅ | Derivation covered by `supabase/tests/06_followup.sql` |
| The draft — who receives, **ticked one by one**, **and who is excluded and why** | ◻ | ADR 012. Everyone not yet written to starts ticked; a member with no address is counted and named, never silently dropped (C-76) |
| **Already sent this period, marked on her row** | ◻ | Read from `email_messages` under the period's batch, merged with this session's own sends. The RULE is executable and runs — 12 assertions in `src/data/sent.test.ts`; the screen wiring is claimed from the code |
| The result, **per member** | ◻ | "Sent" is claimed per address, never for the batch |

**Rules and validations** — **there is no free-form composing anywhere in this flow** (DR-5). The
wording comes from the course's stored message and only the member's own figures are substituted;
the send draft shows no wording at all and has no field to type one. The reason shown on the
weekly list names the *condition* that fired, not the rule, so the row explains itself. A short
send states itself: the heading counts what is ticked out of the whole flagged set, and the
confirmation names how many flagged members will not be contacted and how many are being written
to a second time this week.

**Limits** — email only; there is no SMS or chat channel. Sending needs SES credentials, which are
Edge Function secrets on the live project only. The already-sent mark is empty on fixtures and
whenever its read fails — it is an addition to the draft, never a precondition for it.

**Benefit** — the follow-up that gets sent is the follow-up that was reviewed, nobody is mailed
the same thing twice by accident, and a failure names the member instead of vanishing.

---

### Courses — `(tabs)/courses` · `course/edit` · `course/[id]`
**Last confirmed:** 04-Sep-2026

The course list, the course editor, and the follow-up rule editor.

| Capability | Status | Notes |
|---|---|---|
| List and edit courses | ◻ | A course is **what** you teach, not when |
| Per-course follow-up rules | ◻ | `course_follow_up_config` |
| Live preview of who a draft rule would list | ◻ | Nothing changes until Save |
| A course card has exactly three destinations | ✅ | Card → the course · chevron → its roster · Edit / Delete, labelled |

**Rules and validations** — everything in the rule editor edits a **draft**. A configuration with
both conditions off cannot exist — the toggle refuses.

**A course card has three destinations and says which is which.** The card body opens the course;
the chevron opens that course's roster; **Edit** and **Delete** sit labelled at its foot. It used
to end with the course's offerings listed as tappable rows plus "Set where and when" and
"Members" — so most of the card's surface opened the *schedule editor* rather than the course, and
Edit and Delete were two bare icons crowded against the card's own tap target. A pencil is not a
word, and guardrail 3 applies to controls as much as to statuses. Days and branch are edited in
the course dialog now, whose branch dropdown reaches every offering, so nothing removed here was
the only way to anything.

The roster is scoped by **name**, because that is the only key member rows carry (`Member.course`,
which the follow-up derivation joins on — guardrail 1, one member source). The name arrives in a
URL and the screen speaks it as a heading, so it is resolved against the academy's own course list
by `rosterScope` (`src/data/course.ts`, 8 cases) and the academy's spelling is what gets rendered
— never the caller's. An unknown, renamed or deleted course falls back to every member rather than
to a confident empty roster under a heading naming a course nobody teaches.

**Limits** — changing course structure is admin-only (`is_super_admin()`), because it changes
every figure downstream.

**Benefit** — "missed two in a row" can mean something different for a beginners' class than for
an advanced one.

---

### Reports — `app/(tabs)/reports.tsx`
**Last confirmed:** 02-Sep-2026

Attendance over time, by branch and by course.

| Capability | Status | Notes |
|---|---|---|
| Attendance trends | ◻ | Same engine functions as the dashboard — figures cannot disagree between the two |
| Branch and course filters | ◻ | |

**Limits** — no export. Reports are read on screen.

**Benefit** — the dashboard says what is happening this week; Reports says whether it is a trend.

---

### Staff and access — `staff/index` · `staff/add` · `staff/pin`
**Last confirmed:** 02-Sep-2026

| Capability | Status | Notes |
|---|---|---|
| List staff, sorted by what still needs doing | ◻ | The two states needing action are never below the ones that do not |
| Add a staff record | ◻ | |
| Issue, regenerate or reset a PIN | ◻ | `pin-issue` / `pin-reset`, both `requireSuperAdmin()` |
| Disable access | ◻ | One boolean: `is_active = false` closes every policy at once |

**Rules and validations** — **adding a person and giving them a login are two deliberate steps.**
A record exists first; access is granted afterwards. Four access states, each with its own word
and icon: Not enabled · Awaiting PIN · Disabled · Active.

**Limits** — exactly one academy admin, enforced by the `one_super_admin` unique index. *Coach*
and *Front desk* are display labels on a staff row, **not** distinct permission tiers — they carry
identical database rights (see RBAC_MATRIX).

**Benefit** — a coach who leaves is switched off in one action, everywhere.

---

**Navigation — where "back" goes.** Weekly review, Members and Attendance live *inside* the tab
group, because the canvas keeps the academy header, the two-tab row and the nav pill on them
(`showTabs` in the prototype lists weekly and members by name). That placement costs them a back
stack: navigating to a screen in a Tabs navigator switches the focused tab rather than pushing, so
`router.back()` pops to the **first** tab. Opening Weekly review from a course and pressing back
landed on Overview — verified in a browser, not assumed.

So the caller names its origin (`?from=/course/c1`) and the screen goes there, falling back to
`/courses`. `from` is a URL parameter and therefore untrusted input, so it is validated by
`safeBackTarget` (`src/data/nav.ts`, 11 cases): only an in-app absolute path is followed, because
a back button that navigates to whatever a link said is an open redirect wearing an arrow icon.

Overview, Reports and More get **no** back button. They are tab roots, and inside the tab group
`canGoBack()` answers about the stack the tabs sit in — so each would grow an arrow that left the
app for the sign-in screen.

---

### Identity — `index` · `register` · `set-pin` · `forgot-pin` · `change-mobile` · `profile`
**Last confirmed:** 06-Sep-2026 (the registration form row; sign-in rows 05-Sep-2026; the rest still 03-Sep-2026)

Sign-in by mobile and PIN, first registration, PIN changes, recovery, and the profile screen.

| Capability | Status | Notes |
|---|---|---|
| Sign in with mobile + PIN | ◻ | `auth-login`. **Continue now validates the number first** (05-Sep-2026): a registered number goes to the PIN step, the PIN is still required. `PIN_PEPPER` is set as of 04-Sep-2026 per `supabase/SETUP.md` |
| An unknown number reaches registration | ◻ | **Unconditionally** — the owner's flow, stated twice: "if doesnt exist user goes to registration". A gate on `registration_open` was built and reverted the same day (06-Sep-2026); see RC-019, which stands as the record of the loop and of where the real fix belongs |
| Forgot PIN on a STAFF number does not ask security questions | ◻ | 06-Sep-2026. The two questions are the super admin's own recovery — only she answered any, and only `super_admin_recovery` has rows — so `recovery-check` 404s for staff. The screen used to show its SEEDED fixture questions under that error, inviting an answer that could never pass |
| A staff member asks the admin for a new PIN | ◻ | 06-Sep-2026, **written and NOT YET DEPLOYED**. "Ask my academy admin to reset it" on Forgot PIN → `pin-reset-request` (public: she cannot sign in, that is why she is there) → one open row in `pin_reset_requests` (0034). Rate-limited per account through `auth_rate_limits`, and it answers the SAME sentence for a number that exists and one that does not, so it adds no enumeration oracle. Asking twice refreshes the one ask rather than making a second |
| The admin sees the ask and acts on it | ◻ | 06-Sep-2026, **written and NOT YET DEPLOYED**. A `pinReset` notification, **counted as actionable and ranked above everything else** — somebody locked out beats a file awaiting upload. Tapping it opens `/staff`, where the existing "Reset her PIN?" sheet already does the work; no second reset action was added. The staff card carries a "Requested a PIN reset" badge (word + icon, never colour alone) and sorts to the top. **The request closes inside `pin-reset` and `pin-issue`**, at the moment the PIN is rotated — there is no read state in this product, so a tray entry that needed dismissing would never clear |
| A PIN can be typed, not only tapped | ✅ | Both keypads carry a real field over the boxes, with a caret on the box being filled |
| Register the academy admin | ◻ | `auth-bootstrap`. **Done — `bootstrap_completed` is `true`** as of 04-Sep-2026 per `supabase/SETUP.md`, so the form now refuses a second academy and says so. It has a Back to sign-in (05-Sep-2026) |
| The registration form is ONE page | ◻ | 06-Sep-2026. Details and recovery answers on a single form — the two-step wizard and its progress row are gone, and "Your details" / "Security questions" survive as section labels. **"Academy you administer" was removed**: the academy is RosiFit, and the field's value was never sent (`setRegistrationDraft` has never carried it). Mandatory fields carry a red asterisk **and** the word "required" in their accessible name; Email carries neither and says "Optional." — `required` is a new optional prop on `src/components/Field.tsx`, additive across its 9 importers |
| Sign out lands on the number field | ✅ | 06-Sep-2026, RC-022. Sign out (More, profile), the signed-out *Sign in* cards and every *Back to sign in* reach the sign-in screen through `useGoToSignIn()`, a reset of the root Stack — never through the pathname `/`, which Overview also owns and which the router resolves to Overview from inside the tab group. `src/data/signInRoute.test.ts` scans every screen for the pathname |
| Set or change a PIN | ◻ | One screen, two lives: first PIN after a temporary one, or a self-change from Profile |
| Recover a forgotten PIN | ◻ | Two security questions, **three attempts, then a 30-minute lockout** |
| Change your own mobile number | ◻ | Authenticated, verified and audited |
| PINs never stored readable | ✅ | Column-name guard in `supabase/tests/01_auth.sql` |

**Rules and validations** — the sign-in screen has **one** button, and **Continue validates the
number before the PIN step** (05-Sep-2026, ADR 016 / `docs/decisions/008`). A registered number
opens the PIN screen — the PIN is still required, Continue never signs anybody in; an
unregistered one opens registration with the number carried across; a lookup that did not answer
leaves her exactly where she is with the reason. That third case is the one that matters:
answering "not registered" because a connection dropped would walk a real staff member into
creating a second academy, so `continueDestination` takes `null` and returns `stay`
(`src/data/signin.ts`, three cases in `src/data/signin.test.ts`).

**This is a knowing trade.** The lookup is `auth-lookup`, public and unauthenticated, and it is a
**staff-enumeration oracle**: anyone can dial numbers until one answers `registered: true`. Until
05-Sep-2026 the app refused to ship one, and `auth-login` is still built the other way round — an
unknown number and a wrong PIN answer **identically** once the academy exists. The repo owner was
shown the trade in full and chose the canvas' behaviour; rate-limiting was offered and declined.
The cost is TD-017. What the oracle does not give: no name, no `kind`, no `is_active`, no
`pin_set_at`, nothing that narrows a PIN guess — and `auth-login`'s five-attempt lockout is
untouched. A **disabled** account still answers `registered: true`, because sending a disabled
staff member to register a new academy would be worse than the sentence `auth-login` gives her.

`needsRegistration` is kept even though Continue now catches the case it was written for: it
still fires if an account disappears between Continue and the PIN, and its five tests still pin
the distinction. A pasted number keeps its country code, so `groupPhone` drops a leading `91` or
`0` — but only when the input is longer than ten digits, since `91234 56789` is a real number.

Because an unrecognised number now reaches the registration form **including after the academy is
registered** — the owner's explicit instruction — a mistyped digit lands on that form, so
`app/register.tsx` gained a Back. Before this change the form's only exit was the
browser's own back button. (That Back was added to step 1 of a two-step form; since 06-Sep-2026
there is one form and one Back.)

Recovery answers are collected **up front at registration**, because
they are the only way a reset works later without a phone call. Every terminal state says plainly
what has and has **not** happened: a lockout that leaves someone wondering whether their PIN
changed is worse than the lockout itself. Changing the mobile number is cheap and safe because the
PIN derives from the immutable account id, not the phone number — so moving the number leaves the
PIN working.

**Limits** — ◻ **Continue does not work on the live project until `auth-lookup` is deployed.**
It is the one Edge Function in the tree production does not have; until it is deployed
(`--no-verify-jwt`), Continue answers "could not be reached" for every number rather than
guessing. The earlier limit recorded here — `PIN_PEPPER` unset, every auth function returning
500 — was resolved on 04-Sep-2026 per `supabase/SETUP.md`, which also records
`bootstrap_completed` as `true`. Both marks are ◻: read from `SETUP.md`, not re-verified here.

**Benefit** — a coach signs in with a number she already knows and four digits, on a shared phone.

---

### Settings and support — `(tabs)/more` · `appearance` · `templates` · `audit` · `help`
**Last confirmed:** 03-Sep-2026

| Capability | Status | Notes |
|---|---|---|
| Light, dark or system theme | ✅ | Three states, persisted; the choice is the user's own (CP-016) |
| Custom accent colour, any hue | ✅ | **All 360 hues measured at ≥4.5:1 in both themes** — `scripts/check-contrast.ts`, 2,800 pairs |
| Edit email templates | ◻ | The only place message wording changes; editing or toggling one is audited |
| Audit log | ◻ | Admin-only (`audit_logs_read`); redacted by `audit_redact()` |
| Every entry names who did it | ◻ | `audit_log_as` (0023) — see the note below and RC-011 |
| Help | ◻ | |

**Rules and validations** — templates are the only way anything reaches a member. The audit log is
readable by the academy admin only, because it records staff actions.

Every entry **names its actor**. Writes the app makes directly are attributed by the row triggers,
which run as `authenticated` and can read `auth.uid()`. Writes made through an Edge Function run
on the service-role client where `auth.uid()` is null, so those call `audit_log_as(p_actor, …)`
with the caller they already authenticated — `communication.batch_sent`, both `csv_import` paths
and every match decision inside `commit_csv_import`, and the staff PIN entries. `audit_log_as` is
granted to `service_role` **only**: naming your own actor is forging a signature, and a client
that could pass `p_actor` could write an entry blaming somebody else into a table that cannot be
corrected. It raises on a null actor rather than falling back to an unattributed entry.

The exception is deliberate: sign-in, first registration and PIN recovery run **before** a session
exists, so they keep `audit_log()` and record no actor. Nobody has proved who they are yet, and
naming the account an attempt was aimed at would record her as having done something she may know
nothing about.

**Limits** — the audit log is read-only and cannot be exported. The attribution above is applied
to the local harness and present in the repository; **the live project still records "System" for
Edge Function actions until 0023 and the functions are deployed** (RC-011).

**Benefit** — the academy picks its own colour and it is *guaranteed* readable, rather than
guaranteed only on the designer's monitor.

---

## Product-wide guarantees

These hold across every screen above and are proven at build time, not asserted:

| Guarantee | Proof |
|---|---|
| Every colour pair the UI renders clears 4.5:1, both themes, all 360 custom hues | ✅ `scripts/check-contrast.ts` — 2,800 pairs, fails the build |
| Every status carries a word **and** an icon; colour is never the only signal | ✅ `scripts/check-icons.ts` — 71/71 glyphs resolve |
| The follow-up list is derived, never a stored second list | ✅ `supabase/tests/06_followup.sql` |
| PINs and recovery answers are never stored readable | ✅ `supabase/tests/01_auth.sql` column-name guard |
| No secret reaches the bundle | ✅ Only two `EXPO_PUBLIC_` values exist; `.env.example` documents the split |
| Every message goes out through a stored template | ✅ No free-form send path exists in `app/send/` or `send-followups` |

---

## Two conventions

**Marks:** ✅ means verified against the running system on the stated date. ◻ means claimed but
not yet verified — verify it the next time you touch that module and flip it, or correct it.
Never leave a claim unmarked; an unmarked claim reads as verified.

The ✅ marks above are a deliberate widening of that convention, and it should be read honestly:
they are verified by a **build-time gate or a SQL test**, not against a running deployment. Every
claim that needs a live system is ◻, because there is not currently a live system that can be
signed into. **The whole file becomes verifiable the moment `PIN_PEPPER` is set and the admin
registers** — that is the single event that unblocks it.

**On conflict, code wins.** If this file, a module document and the code disagree, the code is
the truth and **both documents are corrected in the same change**. A document that lost an
argument with reality and was left standing will win the next one.
