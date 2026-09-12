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

**A pick is the whole interaction — no dropdown asks for a confirming tap, 07-Sep-2026**
(`requests/2026-09-07-dropdowns-apply-on-pick-no-done.md`, ADR 035). The tick applies the
filter and the figures move underneath the open panel; the day that COMPLETES a custom range
applies that range and closes the panel, exactly as a named range does. The **"Done"** button
under the Course and Branch panels and the **"Use this range" / "Pick both days"** button under
the custom-range calendar are gone from the app — `DropdownDone` and `DropdownPanel`'s `footer`
slot are deleted from the library rather than merely unmounted, because an empty shelf is how a
button comes back. Neither had ever applied anything: both called the screen's close and nothing
else, which told a reader the figures already on screen were provisional when they never were.
**A tick still does NOT close the panel** — a checkbox list that shut on the first tick could
never be given a second branch — so the way out is now the press that means "not in here": the
field again, or **anywhere beside the panel**, through `DropdownRow`'s `dismiss` prop
(`home-filter-dismiss`, `attendance-filter-dismiss`, `reports-filter-dismiss`). That layer is
untinted, because these panels exist so the figures they narrow stay readable; it is
`position: fixed` on the web and a negatively-inset `absolute` on native, since an absolute
child stretched to the window on the web would add its own overshoot to the page's scroll
height. It covers the screen's CONTENT AREA rather than the whole window — react-navigation's
screen container carries a transform and so becomes the containing block — which leaves the
persistent header's controls and the tab bar above it and still working. Measured in the
exported page in both themes (420x603 at y=178 of 420x780), not assumed. A half-picked range still applies nothing (C-84), and that guard is now the only thing
between a stray tap and a one-day period. The single-choice filters — Attendance's Branch,
Course and Status — already behaved this way and are untouched. ✅ held by 8 assertions in
`src/components/dropdownAppliesOnPick.test.ts`.

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

**As of 07-Sep the filter row is PINNED and every mark carries the whole figure**
(`requests/2026-09-07-overview-course-detail-and-frozen-filters.md`). The filters are the
Screen's `header` rather than the first thing in its scroller, in the ready, loading and
error states alike — the sections scroll under them, and an open panel paints over the body
because the header owns the stacking context (`zIndex` on the header frame in
`src/components/ui.tsx`). The freeze is the SCREEN's: `DropdownRow` is drawn by eight
screens and was not touched, so only Overview pins. Each ring now writes
`reportMeta` — *9 scheduled · 1 attended · 8 missed* — the same line the member bars write
and from the same function, replacing "1 of 9 present"; the ring column widened 108 → 132 to
hold it. Each member bar carries the course and branch it is counted under (`withScope`,
`src/data/overview.ts`), attached by the screen from the same narrowed member list every
figure is counted from — nothing new is queried and nothing new is totalled. A name shared by
members of DIFFERENT courses gets no course line at all. Verified in a browser at 1440×900,
both themes: the row holds at the same offset through a full 537px scroll, and the open panel
tests on top. ✅ held by `src/components/overviewDetailAndFrozenFilters.test.ts` and
`src/data/overviewScope.test.ts` (11 assertions, fail-first recorded in
`.evidence/overview-course-detail-and-frozen-filters-fail-first.txt`).

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
| **Whether an email is going to her, on her record** | ✅ | 07-Sep-2026 (`requests/2026-09-07-reach-out-already-sent-and-rule-label.md`, the requester's *"Add a lebel, if the email is sent only if rule is met"*). One line under the email panel, in one of four states: **Rule is met, Email sent** · **Rule is met, Email not sent yet** · **Rule is met, No email to send** (flagged, no address — counted, unreachable) · **Rule is not met, No email to send**. Two of the strings are the requester's own, byte-exact; the third exists because *"Email sent"* over a member nobody has written to is **RC-017 one layer up** — the app saying SENT for an email it never sent — and the fourth recombines her own clauses rather than inventing vocabulary. Word AND icon AND a measured token pair per theme (guardrail 3, CP-008/CP-010): verified painted as `#7A5300`/`#6B5563`/`#B3261E` light and `#E8B93B`/`#A78E9E`/`#F2683C` dark. Membership is **read from `isEligible` and the saved rule**, never a second opinion (guardrail 1, CP-011). Absent while the rule is still loading and if it fails — an addition to the record, never a precondition for it. `src/data/reachOut.ts`, 9 specs |
| Add a member | ◻ | **Her name, her course and branch, and an email address are required — 06-Sep-2026** (`requests/2026-09-06-add-member-email-required.md`, the requester's *"email address is mandatory for add member"*, and *"same for edit member as well"* the same day — the rule is one gate on one form, no Add-vs-Edit branch in it). The Email addresses label carries the shared required mark, the note under an empty row says she cannot be added without one, and the footer names both of her required fields; Add Member stays disabled until an address is on the form. It is the same rule the member FILE enforces (bulk import, above) and for the same reason: a member with no address cannot be written to, and these are the two surfaces that create one. **`create_member` (0016) still accepts an empty address list** — the client is the gate, as it is for the import; making the RPC refuse it is a migration that could not be rehearsed on the adopting machine (no PostgreSQL 16). The canvas's `nmHint` still reads *"Her name is all that is required"* for this form. Not reversed: the ATTENDANCE import still creates a member with no address (C-76) — which is exactly why the upload offers two ways out of it, **Add as new member** (this form, which asks for the address the card was missing) and a display name on somebody already on the register. **07-Sep-2026 — "Add as new member" opens HER record, not a blank Add form.** It pushed `/member/edit?name=<her name>`, so saving wrote a SECOND member: the new one held the address, the import-created stray kept the attendance, and the No email group still listed the stray (it is DERIVED from the member list, guardrail 1). The stray IS the member — the import enrolled her — so the button now routes by `id` and the form's own address rule is what takes her out of the group. The `name` param is gone from the route and from the form, and `src/components/noEmailResolvesInPlace.test.ts` holds both shut. Editing her from the card's mail-off button was always the same act and reaches the same form |
| Edit a member | ◻ | **An email address is required here too — 06-Sep-2026**, the requester's *"same for edit member as well"* (`requests/2026-09-06-add-member-email-required.md`). A member the attendance import created opens with Save disabled and the footer asking for her address; nothing of hers — her status included — is saved until one is on the form. The first cut of the rule exempted Edit for her sake; the requester removed the exemption. **Edit is Edit from the moment it opens — 06-Sep-2026.** The dialog reads the route, not the result of its own lookup, so while her record is still being fetched it says *Edit member · Fetching her record* over a skeleton with no Save, a failed read offers Try again, and an id that is not on the register is told plainly. It used to answer all three with the ADD form — blank, titled *Welcome a new member*, over a Save that would have created her a second time (RC-021, and RC-012 before it) |
| Delete a course | ◻ | **A HARD delete since 08-Sep-2026 — built, specced and NOT LIVE.** `delete_course` (0020) was a soft delete that drew its line at COMPLETED: the course, its offerings and its not-yet-completed sessions were flagged, active enrolments were ENDED, and every completed session with its frozen expectations and attendance records was left untouched — which is what the confirmation promised: *"Their attendance history stays."* What that left behind in production by 08-Sep-2026: **three** course rows named `Postnatal · Main` (two flagged, one live), 8 completed sessions hanging off deleted offerings and reachable from no screen, and a Meet export whose fingerprint (`csv_imports_sha_completed` is global) was pinned to a deleted course so it could never be imported into the live one — surfacing as the upload panel saying *"nothing about this file has touched Postnatal · Main"* directly under *"was imported for Postnatal · Main"*. Shown those numbers and the promise they contradicted, the repo owner chose to withdraw it: *"if course is deleted then delete course from db and all its related data which will reduce chaos"* (`requests/2026-09-08-hard-delete-course.md`; the middle option — purge only when empty, keep and rename otherwise — was offered and declined). **`0047_hard_delete_course`** replaces it: `purge_course` removes the course, its offerings and schedules, every session including completed ones, their expectations and attendance records, the enrolments and the import records, **children first because most of the foreign keys are `NO ACTION`** — attendance before imports before sessions, since `attendance_records.import_id → csv_imports` and `csv_imports.session_id → sessions` mean the cascade from sessions fires one step too late. It writes its own audit entry BEFORE the rows go (the `audit_*` triggers fire on insert/update only, so a DELETE would otherwise leave no trace) and rebuilds `member_stats` for the members it touched, since the follow-up list is derived from that cache. `delete_course` is now the caller check — `is_active_app_user()`, 0038's boundary, on a writable subscription — plus `purge_course`; `purge_course` itself is executable by `service_role` alone. **The confirmation can promise nothing now, so it counts instead:** `course_deletion_preview` answers offerings · members enrolled · sessions (completed) · attendance records · imports, and `src/data/courseDeletion.ts` turns that into the dialog's one paragraph (*"3 members are enrolled. This permanently deletes the course, its 1 offering, all 8 sessions (7 completed) and the 39 attendance records on them. That attendance history cannot be recovered. The 11 files imported into it can be uploaded again afterwards. Recorded in the audit log."*), with a counting state and a no-numbers fallback that is no gentler — 10 specs. Members, their addresses, aliases and their OTHER courses are untouched. Idempotent. Pays TD-038 by removal. **`0048_purge_soft_deleted_courses`** applies the same rule once to the six courses already flagged (`hgg`, `hhhhh`, `jjkkj`, `jkjjn,`, `Yoga 2`, two `Postnatal`) through the same function, each with its own audit entry carrying `was_soft_deleted_at`, and refuses to commit if any flagged course or orphaned offering/session survives. `supabase/tests/36_hard_delete_course.sql` (35 assertions: the FK order proven by an IMPORTED attendance row, what survives, the recompute, the audit entry, idempotency, TD-038, the `purge_course` posture, 0048's path in miniature); `14_delete_course.sql` amended in four places to the new contract, dated. **BOTH APPLIED TO PRODUCTION 08-Sep-2026**, on the repo owner's explicit go-ahead at the gate, after being shown that this destroys 35 of the 52 attendance records then in the database — 67% of all attendance — across 13 members. Rehearsed first against production inside a rolled-back transaction (no `psql` here, so the harness cannot run — TD-050), which predicted the apply exactly: courses 12 → 3, sessions 11 → 3 (all 8 completed ones gone), attendance 52 → 17, enrolments 21 → 7, imports 23 → 12, members untouched at 23. The real apply reproduced all six and left **zero orphans** in `sessions`, `attendance_records`, `course_offerings` and `member_enrollments`. Nine `course.hard_deleted` audit entries, one per purged course. **The recompute is proven, not assumed:** `member_stats` totals 3 sessions attended against exactly 3 surviving `present` rows. Posture after: `delete_course` and `course_deletion_preview` SECURITY DEFINER, `search_path` pinned, granted to `authenticated`; **`purge_course` to `service_role` only**. Ledger rows `20260908115000` / `20260908115100`. **The permission side effect the request file flagged for acknowledgement had already evaporated** — production's `delete_course` was measured immediately before the apply and already carried `is_active_app_user()`, delivered by `0050_staff_are_not_restricted`, so 0047 changed no boundary and reverted nothing. **Still ◻:** `36_hard_delete_course.sql` and the amended `14_delete_course.sql` have never been executed anywhere, and no course has yet been deleted through the screen against the live database. |
| Remove a member | ◻ | **Built, specced and NOT LIVE — the capability the app has been offering since the roster was drawn, and has never once performed.** The bin on each member card, the confirmation that states what survives as well as what goes, `deleteMember` in `src/data/repository.ts` and `delete_member` (written in `0038_staff_write_access`) have all been committed and green since 07-Sep-2026, with 21 assertions in `supabase/tests/30_delete_member.sql`. **`public.delete_member(uuid)` does not exist in the production database** — verified against `lhpzhkzbnquwjljmbylo` on 07-Sep-2026 — because `0038_staff_write_access` was never applied; the live ledger jumps from `0036` to `0038_repoint_stale_course_senders`, a different file sharing the number. So the live app confirms the deletion and then answers *"She could not be removed. Nothing has been changed."* Offline against the fixture list it works, which is why nothing on screen ever said otherwise. **The fix is not "apply 0038":** 0038 also reproduces `save_course` in full from a body that predates 0040, so applying it would revert RC-027 and dead-end every course reword again (`supabase/tests/16_save_course.sql` pins this and would fail). `delete_member` is therefore split out **verbatim** into `0044_delete_member.sql` to be applied alone; the billing guard 30_delete_member never covered is pinned in `supabase/tests/33_delete_member_subscription_gate.sql`. ****0044 was applied to production on 07-Sep-2026** on the repo owner's explicit go-ahead, and `public.delete_member(uuid)` now exists there — SECURITY DEFINER, `search_path` pinned, `anon` holds no EXECUTE, `authenticated` and `service_role` do. `save_course` was re-measured either side of the apply and is byte-identical (`pg_get_functiondef` length 5169 before and after), so RC-027 stands. **The screen is proven end to end — 08-Sep-2026.** The whole flow was driven in Chromium against the fixtures build in **both themes**: the bin names her, the confirmation states what survives as well as what goes, Cancel leaves the register untouched, Remove takes her off it and nobody else, the toast addresses her by first name, and a link to a member who is no longer on the register is answered in words. 29 checks, `.evidence/enable-member-deletion-browser.txt`. That run also caught a trap worth keeping: `ThemeProvider` defaults to dark outright rather than to `system`, so `prefers-color-scheme` alone re-tests dark twice — the script now fails itself if the two passes paint the same background. The four outcome sentences moved out of the render body into `src/data/memberRemoval.ts` (14 specs), which fixed a real one: an imported name with a leading space shipped a toast addressed to nobody. **It stays ◻, not ✅,** for one honest reason — every one of those proofs is either the fixtures list or a catalogue query. The local Postgres 16 harness cannot run on this machine, so `30_delete_member.sql` and `33_delete_member_subscription_gate.sql` have still never been executed anywhere, and **no member has yet been removed against the live academy database.** It turns ✅ on the first real removal** (`requests/2026-09-07-enable-member-deletion.md`). **"Each member card" became true on 08-Sep-2026.** The line above said the bin was on every member card; it was on ONE — the Members tab's. The course-detail roster card (`MemberCard` in `app/course/[id].tsx`), which is the card the roster is actually read on, had Edit and the Active/Inactive pill and no way to take anybody off the register. It now carries the same control: the same `deleteMember` call, the same confirmation word for word, and the same four outcome sentences out of `src/data/memberRemoval.ts`, so the two cards cannot drift into saying different things after the same result. Five specs in `src/components/courseRosterRemoveMember.test.ts`, including the one the no-email card needs — Edit is already drawn in the danger colour there, so Remove is told apart by its own glyph and its own label rather than by the colour (guardrail 3). Not browser-driven: the control reuses a flow proven end to end in both themes three paragraphs above (`requests/2026-09-08-delete-member-from-course-roster.md`). **THE DELETION BECAME A HARD ONE, 08-Sep-2026 — built, green, and NOT YET APPLIED.** `requests/2026-09-08-hard-delete-member.md`: *"on deleting a student delete that record entirely from database"*. `0051_hard_delete_member.sql` adds `member_deletion_preview` and `purge_member` and rewrites `delete_member` to remove her record outright; `0052_purge_soft_deleted_members.sql` applies the same rule once to the 7 members already flagged in production. There was never a middle option — `attendance_records`, `session_expectations` and `email_messages` all reference `members(id)` with NO ACTION, so those rows go with her or the deletion is refused by the foreign key. The confirmation on BOTH cards can no longer promise anything and states a quantity instead, out of `src/data/memberRemoval.ts` (22 specs). **BOTH APPLIED TO PRODUCTION 08-Sep-2026**, on the repo owner's explicit go-ahead, one at a time and in order. Rehearsed first the only way this machine allows — the local Postgres 16 harness cannot run here (no `psql`), so 0051 and 0052 were replayed **against production inside a rolled-back transaction**, which predicted the outcome exactly: members 30 → 23, attendance 56 → 52, enrolments 28 → 21, `email_messages` unchanged at 8, seven audit rows, nothing left flagged. The real apply produced those same six numbers and **zero orphans** in `attendance_records`, `member_enrollments`, `member_emails` and `member_stats`. Posture verified after: all three functions SECURITY DEFINER with `search_path` pinned, `anon` holds EXECUTE on none, and **`purge_member` is `service_role` only — `authenticated` does not hold it**, which is the guard the whole design rests on. All seven purges are named in `audit_logs` under `member.hard_deleted`, each carrying `was_soft_deleted_at` and what it destroyed (nitha: 4 records over 4 sessions; the other six: enrolment only). Ledger rows recorded as `20260908120000` / `20260908120100`. **Still ◻, not ✅:** `40_hard_delete_member.sql` and the amended `30_delete_member.sql` have never been executed — TD-050 — and no member has yet been deleted through the SCREEN against the live database. `npm run check` green: 1043 unit specs, 2840 contrast pairs, 75 icons |
| Several email addresses, exactly one primary | ◻ | `member_emails.is_primary` |
| No member code is assigned, and none is shown | ✅ | Retired in `0026` (ADR 006). No screen renders one; pre-`0026` codes stay in the column and stay searchable, so somebody holding one from an export can still find her |
| Bulk import members from an `.xlsx` file | ✅ | `app/member/import.tsx`, `src/data/memberXlsx.ts` (template + parse, exceljs 4.4.0 browser build), `src/data/memberImport.ts` (rules), `bulk_import_members` (0028, date shape 0029). **Choosing the file IS the import** — read, judged, written and reported in one tap. The canvas names it "file → validate → preview → confirm" (`goBulkImport`) and it shipped that way; the preview was a list whose only two answers were "yes" and "choose another file", so it moved to AFTER the write, where it is the result. Every row is still judged before anything is sent and a refused row still writes nothing. **Her name and her email address are both required** (06-Sep-2026) — a row with no address is Failed, and named on the result with its reason and its row number. This does not reverse C-76, which is about the ATTENDANCE import: a member already on the register with no address still has her attendance imported and is still counted, excluded from sends with the reason shown. The member file is what CREATES her, and it is the one place a hundred unwritable-to members arrive at once. **The course is PER ROW**: the screen asks for none, so one file covers every course the academy runs. The template's Course and Branch columns are dropdowns fed from a hidden lookup of the academy's own offerings, with `errorStyle: 'stop'` — a course typed by hand is refused **by Excel**, not merely on upload, so nobody can invent one in the file. Opened from a course detail, that course is what a **blank** Course cell falls back to. With no course on the register the template is not offered at all: there would be nothing to list, so the screen says to add a course first. Modelled on UniqBrio Bulk Student Import v1: three-sheet template, academy-branded name, 500 rows / 5 MB, blank rows skipped, blank joining date = today — **true of her ENROLMENT only until 08-Sep-2026** (RC-033): `create_member` enrolled her from `coalesce(p_joined_on, current_date)` and dated her record with the raw argument, so every imported member's **Joined on** was blank while the line above and the comment in `src/data/repository.ts` both said otherwise. `0049_imported_member_joins_on_the_upload_date` stores the computed date on the record and in the audit entry; `src/data/importedMemberJoinedOn.test.ts` (8) holds it on the latest definition of the function, `supabase/tests/38_imported_member_joined_on.sql` (8) reads all three back against a database. **APPLIED TO PRODUCTION 08-Sep-2026** on the owner's explicit go-ahead — the live `create_member` was first proven byte-identical to 0026's (94 code lines, md5 `8b2b2854…`) so the re-issue could revert nothing (the RC-027 hazard), then rehearsed against real data inside a rolled-back transaction and applied with `supabase db query --linked -f`; ledger row `20260908031112` written by hand. The live function now dates her, enrols her and audits her on one day — proven by a second rolled-back call after the apply, with no bulk import run against the academy (`.evidence/imported-member-joins-on-the-upload-date-prod.txt`). **The 5 members imported before it keep their null**; back-filling them is its own migration and its own decision. A duplicate is **skipped, never overwritten**, each row in its own sub-transaction (§15.2 "some rows blocked"), Imported / Skipped / Failed. **The downloadable error report was removed on 06-Sep-2026** on the requester's “download error report is not needed”: every row that did not land is already listed in the result with its reason and its sheet row number, which is what the report was a second copy of. `buildErrorReport` and its spec stay in `src/data/memberXlsx.ts` with no caller — see TECH_DEBT. **It is a DIALOG, not a page** (06-Sep-2026, ADR 009 amended): a `transparentModal` route through `FormDialog`, over the workspace it was opened from, with the result in the same card rather than a second one nested over it. **Owner-only until 07-Sep-2026; open to staff since** (0038, `requests/2026-09-07-staff-write-access.md`) — the owner's answer to why staff were restricted was *"Allow crud we are just hiding view of few fields such as overview and staff access and audit log"*. `member_import_runs` stays readable by the admin alone. RosiFit's own differences: no phone column (C-70), ONE course per row (one active enrolment, 0006), Google Meet display names. 34 specs under `src/data/`, 37 assertions in `supabase/tests/22_bulk_import_members.sql`. **Closes the defect** where Bulk Import opened the attendance importer (`/upload`) |
| Her own days | ✅ | `member_schedules` (0006) is an OVERRIDE, always a subset of the days her offering runs. **Adding a member, the chips open with every one of those days already on** and whoever is entering her takes off the ones she will not attend; the row re-seeds when the course or the branch changes. A row still on that default saves as `null` — no override row, so she follows the offering and keeps following it if its schedule changes later. Only a **narrower** selection writes her a schedule of her own. `src/data/memberDays.ts` (11 specs) is the whole rule — `memberWeekdays` for what a saved row means, `openingDays` for what an opening row shows. **The EDIT form opens on her days too**, since 06-Sep-2026: `Member.weekdays` carries her current override and the row opens on it, or on the course's days when she has none (`openingDays`). Clear the row and she goes back to following the course; that is now a decision somebody takes rather than what Save did by itself (RC-020, TD-019 paid). The chips are the same accent-filled control the course form's FREQUENCY row uses — a selected day is filled, a day the course does not run is disabled. Neither picker clears the row: re-picking the course or branch already showing changes nothing. |
| Mark a member active or inactive | ◻ | **TWO controls, one write path.** On a course roster row the Active/Inactive pill is the control: tapping it confirms, then writes immediately. On **her own record** — the Edit member dialog, `app/member/edit.tsx` — Status is a two-choice field like any other on that form: the pick is pending, Cancel discards it, and **Save** writes it (06-Sep-2026, `requests/2026-09-06-member-status-in-edit-form.md`). It is a second write beside `update_member` (0027), which does not touch the column, and it runs only when the pick differs from her record and only after her details have landed — so a refusal there is reported as being about the status alone rather than as a failed save. **The Add form STATES it, and does not offer it — 07-Sep-2026** (`requests/2026-09-07-add-member-status-toggle-default-active.md`): a toggle drawn on, reading Active, with the same word, icon and meaning line the Edit rows carry, above one sentence pointing at Edit for Inactive. It is not pickable and writes nothing — `create_member` (0016) inserts `'active'` and takes no status, so offering a pick here would need a second write after the create, and a create that landed while that write was refused would leave a member on the register in the state the form had just claimed she was not in. It renders on a pure add only: an edit still fetching her record shows nothing, because 'Active' there would be a guess. This amends ADR-025's last consequence, which had the Add form saying nothing at all. Both controls go through `set_member_status` (0031), which stamps `status_changed_at` and the actor. **Inactive means one thing only: she is out of the follow-up rule** — not listed, not written to. She stays on the roster, her attendance goes on being recorded, and her enrolment, her sessions and her history are untouched; marking her active again puts her straight back. Before this the pill was DERIVED from `expected === 0` and could not be set by anybody, while `follow_up_candidates()` (0009) had always filtered on the column nothing wrote — so the app and the engine could disagree about who was eligible. Both now read `members.status` (ADR 018). `'paused'` is read the same way as inactive and is never written. 15 assertions in `supabase/tests/24_member_status.sql` — **written, not yet run**: the adopting machine has no PostgreSQL 16, so the harness could not rehearse 0031. **0031 itself has never been applied to production and now never needs to be** — it was confirmed missing by querying the live database on 08-Sep-2026 (`set_member_status` did not exist at any arity), which means **every status write this app has ever attempted against production failed** with the function-not-found message, on both controls, for as long as they have shipped. 0045 supersedes it: that migration drops the 2-argument signature (a no-op where it never existed) and creates the 3-argument one whole, so applying 0045 on 08-Sep-2026 is what gave the column a working write path for the first time. `p_inactive_from` is optional and omitting it means "no date on record", so 0031's behaviour is contained in it exactly. The 7 specs in `src/data/memberStatus.test.ts` DO run and pass, and they cover the derivation. **The cost:** "expected at nothing this week" lost its word on the roster — TD-020 |
| A member can be marked inactive **from a future date** | ◻ | **07-Sep-2026 (ADR-037/030, `requests/2026-09-07-member-inactive-from-date.md`).** A status could only ever say *now*, so *"she is active today but leaves next month"* had two ways of being recorded and both were wrong. `members.inactive_from` (0045) is the date the stated status applies from: she is active on every day before it and off the register from it onward. The Edit member form shows an **Inactive from** field under the Inactive pick, defaulting to today (so the ordinary case costs no extra decision) and accepting any later date; it is refused before her joining day, in the same words the RPC raises. **Null means what it always meant** — inactive on every day — so no row written before 0045 moves. `follow_up_candidates()` judges the day with `public.member_status_on(...)` against `current_date`, and `isFollowable` in the app defaults to the same day, read at call time. Every status reading is now a reading about a day: the roster pill draws the SELECTED day while its tap, title and button are about today, and the confirmation says so when the two differ. **Nothing about attendance moves** — expectation is offering schedule → enrolment window → member override (0007), and the status is none of the three, so sessions after the date still expect her and every record she has stays where it is. 26 specs in `src/data/inactiveFrom.test.ts` and 15 in `src/components/memberInactiveFromField.test.ts` DO run and pass. 27 assertions in `supabase/tests/34_member_inactive_from.sql` — **written, NOT run**: this machine has no PostgreSQL 16, so the harness never rehearsed 0045 and the spec suite has never executed. **0045 IS APPLIED TO PRODUCTION — 08-Sep-2026**, on the owner's explicit instruction and without that rehearsal, which is a departure from the CLAUDE.md pre-flight and is recorded as such. What stood in for it: the whole migration was executed against the live database inside a transaction that was rolled back (proving it applies over the real 23 rows, that both CHECKs validate, and that `create or replace follow_up_candidates` matches the deployed return type), then applied for real in one transaction. **Verified after applying, by querying production:** the column exists and is nullable, 0 of 23 rows carry a date (so no existing row changed meaning), both CHECK constraints are present, `member_status_on` evaluates the boundary correctly in the database itself (today → active, the day before → active, on the day → inactive, a null date → inactive), `follow_up_candidates` still returns its 3 candidates, and EXECUTE on `set_member_status` is granted to `authenticated` and refused to `anon`. Ledger row `20260908000000` (`member_inactive_from`) — a timestamp version, not the literal `0045`, because two local files carry that number while several sessions are running and claiming it would mark the other one applied too. |
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
short list sits on the field rather than floating the reserved height above it. The rows were the
sheet's rows unchanged -- a radio, the label, the meta on the right, and the chosen row saying
**Selected** in words (guardrail 3) -- **until 08-Sep-2026**, when the requester supplied a
reference image and asked every dropdown inside a form or dialog to look like it
(`requests/2026-09-08-form-dropdown-list-ui.md`). They are now `MenuRow`
(`src/components/Dropdown.tsx`): **flat rows reaching the panel's edges**, a hairline between
one and the next, no card and no radio, and the chosen row **tinted (`control`) with its label
in the accent ink and a check at the end**. The panel gives up its padding and clips to its own
radius so a tinted row cannot square off a rounded corner; the search box, the “Add …” row and
the nothing-matches note take that inset back for themselves and are otherwise untouched. The
chosen row still says **Selected** in words beside the check -- the image carries the state in
the tint and the tick alone, and CP-010 asks for a word as well. The same rows are what the
**course** and **offering** forms' own dropdowns draw (`DropdownMenuList`, `<DropdownPanel menu>`
-- Branch, From email ID, Message template), so a form field's list looks the same whichever
component opens it. **The list screens' filters are deliberately NOT this** -- they keep their
bordered cards and their radio/checkbox, because a filter takes several values at once and the
glyph is the promise about which; and neither is the merge sheet, whose tap stages a choice for
a confirming tap rather than settling one. `src/components/formDropdownMenu.test.ts` holds all
three halves. The **search box is drawn only where it earns its height**
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

> **AMENDED 07-Sep-2026 — that one question now has TWO reasons, and one of them is an
> override.** The file is still read and matched on the pick, but the PREVIEW and the COMMIT are
> no longer one step: the preview stages the file (writing no attendance), and only then is
> anything asked. What is asked, in one dialog with one confirm (`upload-confirm`):
> a file whose day is not the day she opened — round 3's wording, unchanged — and/or a day that
> **already holds a register this file replaces**, which is a fact only the preview knows.
> Confirming the second is labelled **Confirm override**. An ordinary import — no clash, no
> existing register — still asks nothing at all.
> The register is genuinely REPLACED rather than added to: `commit_csv_import` (**0037**) puts
> an earlier file's `present` back to `absent` for anyone this file does not name, and removes
> the record of somebody who was never expected — **except a row a person marked by hand**
> (`set_attendance`, 0035, `corrected_at`), which an import never reverts, and the dialog says
> so before she confirms. What moved is reported on the result. ADR 027 /
> `docs/decisions/019-a-second-file-replaces-the-register-and-says-so-first.md`, request
> `requests/2026-09-07-upload-override-confirm.md`.
> **0037 IS WRITTEN, NOT REHEARSED AND NOT APPLIED** (no `psql` on the adopting machine), and
> `csv-import` is still not deployed — until both land, the ask is right and the override is the
> partial one 0026 performs.

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
| An awaiting day carries its own upload button | ✅ | **07-Sep-2026, the third round on this surface.** Round 1 put an *Upload session* button on the card under the strip; round 2 removed the card, its sentence AND the button on the ask *"remove that extra upload session dialog appearing with a message"*. What round 2 missed: the card was two things and only the message was the complaint. Now every date card is a frame holding two SIBLING controls, never one inside the other — the date block (`course-day-<iso>`, still selects the day) and, on an **awaiting day only**, `course-day-upload-<iso>`: the cloud and the word **Awaiting upload** (read from `STATUS.awaiting.word`, never retyped), opening `/upload?courseId=…&date=<that day>` — the dated push 0024 reads. An uploaded day shows its tick and nothing to press; a not-expected day its dash. Under 768pt the press is the cloud alone, 26pt tall, the word in the legend one line up. The course bar's undated *Upload Session* stays. Requested as *"bring awaiting upload button as earlier for each day … Its a button with text on click of it user should be able to upload"*. ADR 036; 11 specs in `src/components/dayStripUploadButton.test.ts`; browser evidence in `.evidence/awaiting-upload-button-on-each-day-browser.txt` (three widths, both themes, Enter and click both land on the dated route) |
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
**Last confirmed:** 07-Sep-2026

The members the rule flagged this week, and the two dialogs that email them.

| Capability | Status | Notes |
|---|---|---|
| The week's follow-up list, with the reason each member is on it | ✅ | Derivation covered by `supabase/tests/06_followup.sql` |
| **A draft for ONE member** — `/send?member=<id>` | ◻ | 07-Sep-2026, `requests/2026-09-07-reach-out-already-sent-and-rule-label.md`. Reach out on her record opens **her** draft: the flagged set filtered to her, her name in the subtitle, and the wording resolved from **her own course** (guardrail 5 — a send has to use the wording the course stores). If the rule has not flagged her the empty state names her rather than claiming something about the academy. The list, the tick, the confirmation and the excluded block are the same ones the wider drafts use — this narrows WHO is listed and nothing else |
| **The all-courses draft (`/send` with no course) is DEAD** | ❌ | `useCourseMessage(null)` resolves `null` and `!message.data` is the error branch, so the weekly screen's "Reach out to N members" opens on *"The draft could not be loaded. Nothing has been sent."* Confirmed in a browser, not inferred. Out of scope of the change that found it — an all-courses send has no course wording to use, and that is a product decision. **TD-033** |
| The draft — who receives, **ticked one by one**, **and who is excluded and why** | ◻ | ADR 012. Everyone not yet written to starts ticked; a member with no address is counted and named, never silently dropped (C-76) |
| **Already sent this period, marked on her row** | ◻ | Read from `email_messages` under the period's batch, merged with this session's own sends. The RULE is executable and runs — 12 assertions in `src/data/sent.test.ts`; the screen wiring is claimed from the code |
| **Reach out ASKS before it repeats a message** | ✅ | 07-Sep-2026. Pressing Reach out on a member who has already had this period's follow-up raises *"She has already had this week's message"*, naming the day it went, over **Not yet** / **Reach out anyway**. A warning, never a bar — the deliberate second send the draft has always allowed is untouched. `warnsBeforeReachOut` fires for that one state only; 9 assertions in `src/data/reachOut.test.ts`, and the whole path (send → label flips → warning → both ways out) walked in a browser against a fixtures build |
| A send reaches every mounted screen that shows it | ✅ | `onSentChanged` (`src/data/sent.ts`), the same listener idiom as `onMembersChanged`. The member pop-up stays mounted UNDER the send dialog it opened, so without this its label still read *"Email not sent yet"* about the send it had just made |
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
**Last confirmed:** 07-Sep-2026 (the follow-up trigger row only; the rest still 04-Sep-2026)

The course list, the course editor, and the follow-up rule editor.

| Capability | Status | Notes |
|---|---|---|
| List and edit courses | ◻ | A course is **what** you teach, not when |
| Per-course follow-up rules | ◻ | `course_follow_up_config` |
| The follow-up trigger is **weekly only** | ✅ | **07-Sep-2026 (ADR-033, `requests/2026-09-07-one-follow-up-trigger.md`).** The form offered two triggers as a radio pair — *"N missed sessions in a week"* against *"N consecutive missed sessions"* — and the consecutive one is gone on the requester's instruction: *"remove 4 consecutive sessions under follow up let there be only one"*. What replaces it is a **sentence**, not a card with its radio dot removed: the count stepper (1..7, unchanged) is the only control in the block. `saveCourse` now sends `rule: 'week'` unconditionally. **Nothing server-side was removed** — `save_course` (0040) still validates `p_rule in ('week','consec')`, still writes both config columns, and `supabase/tests/16_save_course.sql` (which saves with `'consec'` at lines 64 and 244) is untouched, as it must be: test files are append-only. `follow_up_candidates()` (0009) and `src/data/followup.ts` keep their consecutive branch, so guardrail 1 still holds by construction. **The cost:** a course already stored as consecutive converts to the weekly trigger on its next save — the form recognises the stored rule, seeds the count off the trigger that is actually ON so the academy's number survives, and states above Save that saving will change who is followed up. Until someone saves one, its rule stands and the engine honours it. How many such courses exist is **unknown**: the read-only production count was blocked by the permission classifier during the run |
| Live preview of who a draft rule would list | ◻ | Nothing changes until Save |
| A course card has exactly three destinations | ✅ | Card → the course · chevron → its roster · Edit / Delete, labelled |
| Where a member stands on the selected day, on the roster | ◻ | **A READING, and only a reading (ADR-030).** Three labels on every roster card — **Present · Absent · Yet to mark** — for the day the week strip has selected, named once under the search box (*Attendance for Mon 7 Sept*). Which one is filled is derived by `dayAttendance` and nothing on the row is tappable: a row was uploaded → Present or Absent exactly as recorded; a session that day with no file yet → *Yet to mark*, in the same `awaiting` amber the day strip puts on that day one line above; a day the course does not run → **Not expected** (`STATUS.none`), because "yet to mark" there promises an upload that is never coming. `extra` reads as Present, which is what happened. The unfilled two are drawn at FULL opacity — they were dimmed to 0.45 as disabled controls, and static text has to clear 4.5:1 (DR-2). 13 specs in `src/data/dayAttendance.test.ts` cover the derivation; 7 in `src/components/memberCardAttendanceReadOnly.test.ts` hold the row inert. `requests/2026-09-07-member-card-attendance-is-a-reading.md` |
| Every icon on the course week strip is in its legend | ✅ | **07-Sep-2026.** A day still to come was drawn with a clock (`STATUS.scheduled`) that nothing named: the legend deliberately left it out because the day panel under the strip spelled it out in a sentence, and that panel was removed on 06-Sep-2026 — so the clock was left saying nothing. The strip now draws the four states its legend names: uploaded → **Present**/**Absent**, a day the course runs with no file yet → **Awaiting upload** (the cloud, past date or future), a day it does not run → **Not expected**. Requested as *"what is that clock icon its not clear it should be awaiting upload icon only"*. No new colour: the amber is the one the roster card one line below already uses for the same day (`app/course/[id].tsx`). **"A day the course runs" includes a day a class was actually held, since 12-Sep-2026** (0070, RC-044): a file uploaded for a day off the timetable and then reset left the day as a dash with nothing to press while the Attendance tab listed its session as awaiting; `course_week_day_status.runs` now reads the timetable OR a live scheduled/completed session on the date, so the day reads **Awaiting upload** again. No client change; `supabase/tests/49_ad_hoc_day_runs_after_reset.sql` |
| ~~Mark one member present or absent, on the roster~~ | ✖ | **Withdrawn 07-Sep-2026, one day after it was built (ADR-030 supersedes the client half of ADR-021).** It shipped as three chips whose Present and Absent tapped through `setAttendance` → `set_attendance` (0035), and the requester asked for it to be a status and not a control: *"they are not button they are just status ... dont make is clickable and manual action"*. **Nothing server-side was removed** — 0035, its 24 assertions in `supabase/tests/27_set_attendance.sql` and its RBAC row are all still there, and now have no caller (**TD-040**). A day is corrected by re-uploading it, which since 0037 replaces the day and says so first (ADR-027). The reasoning for the write path, if it is ever wanted again, is ADR-021 and it is worth reading before rebuilding it. |

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
**Last confirmed:** 08-Sep-2026

Attendance over time, by member and by course.

| Capability | Status | Notes |
|---|---|---|
| Attendance trends | ◻ | Same engine functions as the dashboard — figures cannot disagree between the two |
| Group by member or course | ◻ | **Two** scope pills (`reports-scope-*`) since 08-Sep-2026 — the Branch tab was removed (`requests/2026-09-08-reports-details-two-sheets-and-dash-course.md`). `'Branches'` survives in `ReportScope` and in `reportRows` because `report.test.ts` pins that arithmetic; only the tab is gone. The pills choose what the rows are grouped BY, not which rows are shown |
| **Every row says what it is about** | ◻ | **Added 08-Sep-2026.** A second line under each bar carries the fields of the form behind its name: a member's *course · branch · status · joining month* (`memberDetailLine`, status read ON the day so `inactive_from` is honoured), a course's *member count · branches · days · times* (`courseDetailLine`). The course list is a second fetch (`useCourses`) and is ADDITIVE — every figure still comes from the member rows alone, so the report renders in full while it loads or if it fails |
| **A member enrolled at nothing is named, not dashed** | ◻ | **Fixed 08-Sep-2026.** `fetchMembers` writes `course: '—'` for a member whose enrolment is missing, ended, or points at a deleted course; `reportRows` grouped on that verbatim, so the Courses report drew a bar named `—` and exported a first column reading `—`, sorted to the TOP by `localeCompare`. The group is now **"Not enrolled in a course"** and sorts LAST. Fixed at the report, not in `fetchMembers` — the member row's dash is honest and three other screens read it. The row is KEPT, never dropped: her attendance is real, and the Courses total has to go on agreeing with the Members total |
| **Choose the period** | ◻ | **Added 07-Sep-2026** (`requests/2026-09-07-reports-date-filter.md`). The shared `PeriodPanel` — *This week · Last week · Last 4 weeks · This month*, plus a custom range dated on a calendar — mounted as one full-width field above the scope pills. Before this the screen HELD a period, resolved it, queried on it and printed its label, but `setPeriod` had no call site: the report was pinned to the calendar month it opened on while the subtitle named that range as though it had been chosen. The field renders in the loading, error and empty states too, so an empty period is never a dead end. Reports opens on **This month** deliberately — the dashboard answers "this week", Reports answers "is it a trend". 6 assertions in `src/components/reportsPeriodFilter.test.ts` |
| Export the report as a workbook | ◻ | **`.xlsx`, two sheets, since 08-Sep-2026** (was one CSV). **ONE control** — `reports-export` in the header; the duplicate full-width `reports-export-excel` below the card was removed, having made the same call on the same rows. Sheet 1 `Attendance` is the file that was exported before, unmoved: the same header and the same five values per row, stamped with the chosen period in the filename and in a Period column. Sheet 2 depends on the scope — **Members → `Member details`** (code, status, inactive-from, course, branch, joined-on, her own days, primary + all addresses, aliases, then her period figures); **Courses → `Course details`** (members / with email / without email, branches, days, days-per-week, start, end, follow-up trigger, then the figures). A course report does NOT carry the member roll: the count is already a column on it. Built by `reportSheets.ts` (pure) and `reportXlsx.ts` (lazy exceljs, already a pinned dependency); every cell is written as text, so a member code keeps its leading zeroes and a date does not become a serial. A row with nothing scheduled exports as *"no sessions scheduled"* rather than `0%` — a course with no sessions and a course everybody skipped are different facts |

**Limits** — the figures cover uploaded sessions only; holidays and cancellations are excluded.

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

**A screen that genuinely PUSHED still has to ask whether anything was pushed** (08-Sep-2026,
RC-035). Course detail is its own root Stack entry, so `canGoBack()` there is about its own stack
and is the right question — but it is a question, not a given. Opened from the Courses tab the
screen is the stack's second entry and pops; **refreshed on `/course/<id>`** — or bookmarked, or
relaunched there as a PWA — it is the stack's *first* entry, `back()` is a silent no-op, and the
arrow was drawn, pressable and dead. `backFrom(canPop, from, fallback)` in `src/data/nav.ts`
answers both cases in one place: pop where there is something to pop, otherwise `replace` to a
real route, never `'back'`. **Every other pushed screen still calls a bare `router.back()`** and is
still dead on a refresh — `branches`, `audit`, `profile`, `help`, `appearance`, `staff/index` and
the dialogs. That is known, listed in RC-035, and deliberately not yet changed.

---

### Identity — `index` · `register` · `set-pin` · `forgot-pin` · `change-mobile` · `profile`
**Last confirmed:** 06-Sep-2026 (the registration form row; sign-in rows 05-Sep-2026; the rest still 03-Sep-2026)

Sign-in by mobile and PIN, first registration, PIN changes, recovery, and the profile screen.

| Capability | Status | Notes |
|---|---|---|
| Sign in with mobile + PIN | ◻ | `auth-login`. **Continue now validates the number first** (05-Sep-2026): a registered number goes to the PIN step, the PIN is still required. `PIN_PEPPER` is set as of 04-Sep-2026 per `supabase/SETUP.md` |
| **You stay signed in until you sign out** | ◻ | 07-Sep-2026, ADR-031. `/` now ASKS the server before it shows a number field — it never did, which is the whole of "it asks for my PIN every time": the GoTrue session has persisted in `localStorage` since the client was written, and the screen rendered over it. The answer is two server acts, not a token lookup: GoTrue refreshes the session, then the identity is read back through PostgREST **under RLS**. Lifetime is **indefinite until Sign Out** (requester’s choice), held in the Supabase project’s Auth settings — there is deliberately no lifetime constant in this repo. **Not verified end-to-end:** this machine has no project configured, so the app runs on fixtures and the resume path cannot be walked here; covered by `src/data/sessionRestore.test.ts` (18 assertions) and by the export |
| A disabled account cannot ride an old session back in | ◻ | 07-Sep-2026. `is_active` used to be met at `auth-login` on every entry, because entry was the only door. A session that survives the browser would carry her past it indefinitely, so it is asked again on resume — and her session is **ended**, not merely refused |
| A server that does not answer is not a sign-out | ◻ | 07-Sep-2026. Offline, or a 5xx, leaves the stored token **untouched** and shows the sign-in screen: if the server did not say yes, the answer is not yes — but the next visit that reaches it resumes without a PIN. Collapsing this into "signed out" would log a coach out of her own phone every time the academy wifi blinked |
| An unknown number reaches registration | ◻ | **Unconditionally** — the owner's flow, stated twice: "if doesnt exist user goes to registration". A gate on `registration_open` was built and reverted the same day (06-Sep-2026); see RC-019, which stands as the record of the loop and of where the real fix belongs |
| Forgot PIN on a STAFF number does not ask security questions | ◻ | 06-Sep-2026. The two questions are the super admin's own recovery — only she answered any, and only `super_admin_recovery` has rows — so `recovery-check` 404s for staff. The screen used to show its SEEDED fixture questions under that error, inviting an answer that could never pass |
| A staff member asks the admin for a new PIN | ◻ | 06-Sep-2026, **written and NOT YET DEPLOYED**. "Ask my academy admin to reset it" on Forgot PIN → `pin-reset-request` (public: she cannot sign in, that is why she is there) → one open row in `pin_reset_requests` (0034). Rate-limited per account through `auth_rate_limits`, and it answers the SAME sentence for a number that exists and one that does not, so it adds no enumeration oracle. Asking twice refreshes the one ask rather than making a second |
| The admin sees the ask and acts on it | ◻ | 06-Sep-2026, **written and NOT YET DEPLOYED**. A `pinReset` notification, **counted as actionable and ranked above everything else** — somebody locked out beats a file awaiting upload. Tapping it opens `/staff`, where the existing "Reset her PIN?" sheet already does the work; no second reset action was added. The staff card carries a "Requested a PIN reset" badge (word + icon, never colour alone) and sorts to the top. **The request closes inside `pin-reset` and `pin-issue`**, at the moment the PIN is rotated — there is no read state in this product, so a tray entry that needed dismissing would never clear |
| A PIN can be typed, not only tapped | ✅ | Both keypads carry a real field over the boxes, with a caret on the box being filled |
| Register the academy admin | ◻ | `auth-bootstrap`. **Done — `bootstrap_completed` is `true`** as of 04-Sep-2026 per `supabase/SETUP.md`, so the form now refuses a second academy and says so. It has a Back to sign-in (05-Sep-2026) |
| The registration form is ONE page | ◻ | 06-Sep-2026. Details and recovery answers on a single form — the two-step wizard and its progress row are gone, and "Your details" / "Security questions" survive as section labels. **"Academy you administer" was removed**: the academy is RosiFit, and the field's value was never sent (`setRegistrationDraft` has never carried it). Mandatory fields carry a red asterisk **and** the word "required" in their accessible name; Email carries neither and says "Optional." — `required` is a new optional prop on `src/components/Field.tsx`, additive across its 9 importers |
| Sign out lands on the number field, and ends THIS device’s session | ✅ | 06-Sep-2026, RC-022; scope narrowed 07-Sep-2026 (ADR-031). `supabase.auth.signOut()` defaulted to `scope: 'global'`, which revoked every session the account held anywhere — signing out of the academy laptop also signed her out of her own phone. It is now `scope: 'local'`; both revoke server-side, only the scope differs. Every-device revocation still exists where it means something: `signOutEverywhere()`, called by `pin-reset`. Sign out (More, profile), the signed-out *Sign in* cards and every *Back to sign in* reach the sign-in screen through `useGoToSignIn()`, a reset of the root Stack — never through the pathname `/`, which Overview also owns and which the router resolves to Overview from inside the tab group. `src/data/signInRoute.test.ts` scans every screen for the pathname |
| Sign out asks before it acts | ✅ | 08-Sep-2026. Both controls — the More row and the profile button — open `ConfirmDialog` and end the session only from its confirm; the way out is "Stay signed in" and it leaves the screen untouched. The question states the cost (mobile number and PIN to return) and the scope (this device only, which is what `scope: 'local'` actually does), in wording held once in `src/data/signOutPrompt.ts` so the two screens cannot drift. The confirm reads "Signing out…" while the revocation is in flight and refuses a second tap; a revocation that FAILS does not navigate, because a screen that left would be claiming a session ended that did not. **The automatic sign-outs in `session.ts` — no account, closed account — are NOT asked about:** they are not clicks, and a disabled account must never be offered "Stay signed in". `src/data/signOutConfirm.test.ts`; walked in the export on both screens in both themes, `.evidence/confirm-before-sign-out-browser.txt` |
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
**Last confirmed:** 07-Sep-2026 (audit rows); 03-Sep-2026 (the rest)

| Capability | Status | Notes |
|---|---|---|
| Light, dark or system theme | ✅ | Three states, persisted; the choice is the user's own (CP-016) |
| Custom accent colour, any hue | ✅ | **All 360 hues measured at ≥4.5:1 in both themes** — `scripts/check-contrast.ts`, 2,800 pairs |
| Edit email templates | ◻ | The only place message wording changes; editing or toggling one is audited |
| Audit log | ◻ | Admin-only (`audit_logs_read`); redacted by `audit_redact()` |
| Every entry names who did it | ◻ | `audit_log_as` (0023) — see the note below and RC-011 |
| The log reads in plain words | ✅ | Every action, entity, column name and stored value is translated in `src/data/auditPlain.ts`; identifiers resolve to the member, course, branch, account or offering they name, and never render raw. Tested for TOTALITY over all 24 hand-written actions and 19×3 trigger actions (`src/data/auditPlain.test.ts`) — an unmapped future action prettifies, it never prints as a code (07-Sep-2026) |
| Changes only — sign-ins are not listed | ✅ | The six pre-session actions are filtered from the VIEW by `visibleEntries`. Nothing stops being recorded and no row is deleted; the screen states this in a line under the heading (07-Sep-2026) |
| The column header is frozen | ✅ | `stickyHeaderIndices` on the page scroller; verified pinned at the top of the viewport after scrolling, both themes. Below 768px the entries render as cards, where there are no columns to freeze (07-Sep-2026) |
| Search, category, dates and branch | ✅ | Search across every plain word on a row; seven category chips; the shared `PeriodPanel` plus an **Any date** default that narrows the QUERY, not the loaded fifty; a branch filter traced from what each entry points at (07-Sep-2026) |
| Remarks beside the log | ⚠ | Built end to end — `audit_remarks` (0043), append-only, admin-only, author forced server-side, spec at `supabase/tests/32_audit_remarks.sql`. **The migration is written but UNAPPLIED and UNREHEARSED** (no Postgres on the development machine): until it is applied the section renders a stated "not switched on yet" message and the log above is unaffected (07-Sep-2026) |
| Help | ◻ | |
| One support number, two ways to reach it | ✅ | UniqBrio support, `+91 9994871158` — Call and WhatsApp both hand off to the SAME number, which is what keeps the C-90 "only support channel" claim true (07-Sep-2026) |
| Powered by UniqBrio | ✅ | The maker's mark at the foot of Help: uniqbrio.com and uniqbotz.com. An attribution, **not** a third support channel — it sits below the C-90 card, not beside the number |

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

**Limits** — the audit log is read-only: nothing on it can be edited or deleted, by anyone,
and that is the point. It **can** be exported — a CSV of exactly what the screen shows, one
line per changed field, written by `downloadCsv` (the earlier "cannot be exported" line here
was stale). Only the fifty most recent changes are loaded, within the chosen dates if any.
A branch is worked out from what an entry POINTS AT and is therefore the branch that holds
today; `audit_logs` records no branch of its own. The attribution above is applied
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
| The app installs to a home screen or desktop as a standalone app | ✅ 07-Sep-2026 — manifest, icons and a shell-only service worker ship in `public/`; head tags in `app/+html.tsx`. Verified in Chromium against the built `dist/`: manifest parses with no errors, worker activates and controls the page, and the start URL answers a navigation offline. Installs on Chromium and on iOS Safari (Add to Home Screen). **Before this date the app called itself a PWA and could not be installed at all** — the `expo.web` keys in `app.json` are webpack-era options the Metro export never reads, so no manifest was ever emitted. |

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
