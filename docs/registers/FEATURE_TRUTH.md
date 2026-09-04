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
**Last confirmed:** 03-Sep-2026

**As of 03-Sep the dashboard is the scope tabs, the filters and ONE chart** — the attendance
distribution — and nothing else. The canvas revision of that date drops the hero "N members
need you" card, the "What needs you" list of four routes, the two quick links, the week-by-week
table and the week strip. Each was a second place a figure lived, and the week table counted
from a different query (`useWeekRows`) than the chart beside it while admitting in its own
caption that the branch and course filters did not reach it. The week strip rendered
`WEEK_STRIP`, a hardcoded fixture, on the live dashboard; that fixture is now deleted.

Nothing removed is unreachable: the flagged set is on Weekly, awaiting uploads on the shell's
bell and `upload`, staff without access on `staff/index`, the week table on Reports.

The donut's arithmetic is `distribution()` in `src/data/followup.ts`, ✅ held by 10 assertions
in `src/data/distribution.test.ts`.

The description below is the 02-Sep state and is kept only for the history:

The academy at a glance for the current week: attendance figures, the follow-up count, and a
branch selector that every other figure follows.

| Capability | Status | Notes |
|---|---|---|
| Week's attendance figures | ◻ | From `member_period_metrics` / `member_stats` — the same functions Reports reads, never a per-screen calculation |
| Academy-wide vs branch-wise scope | ◻ | Scope lives in the shell (`src/state/academy.tsx`, CP-013) because the header renders above every tab |
| Follow-up count | ◻ | Derived from the member list and the saved rule (DR-1), never a stored second list |

**Rules and validations** — picking a real branch switches the view to Branch wise; "All branches"
means academy wide. Every metric tile states the period it covers, so two tiles cannot claim
different weeks for the same numbers.

**Limits** — the dashboard reports; it changes nothing.

**Benefit** — one screen answers "who is drifting away this week", which is the entire job.

---

### Members — `(tabs)/members` · `member/[id]` · `member/edit` · `match`
**Last confirmed:** 02-Sep-2026

The member list, one member's history, the edit form, and the screen that links an unrecognised
name from an uploaded register to an existing member.

| Capability | Status | Notes |
|---|---|---|
| List, search and filter members | ◻ | Search covers her name, her primary address, her Meet aliases and — unadvertised — her pre-`0026` RF- code |
| One member's attendance history | ◻ | |
| Edit a member | ◻ | **Her name is the only required field** |
| Several email addresses, exactly one primary | ◻ | `member_emails.is_primary` |
| No member code is assigned, and none is shown | ✅ | Retired in `0026` (ADR 006). No screen renders one; pre-`0026` codes stay in the column and stay searchable, so somebody holding one from an export can still find her |
| Aliases | ◻ | What the uploaded register matches on |
| Link an unmatched name to an existing member | ◻ | `app/match.tsx`; branch, known display names, last-attended and her address come from the import preview |

**Rules and validations** — **no phone number is held for a member**, and since `0026` **no new
member code either**: neither identifies anyone a person could check against, so neither is
collected. Her joining month is what the detail header carries instead. An alias is a correction
and can be deleted; it is the only `for delete` policy in the schema.

**Limits** — members do not sign in. RosiFit has no member-facing surface at all; every screen is
for the academy.

**Benefit** — a name spelled three ways in three registers is still one member.


**Every form is a dialog.** A form is a decision taken *over* a screen, not a place you travel to.
Pushed as a page it wears the stack's header — so the only way out is in the chrome, and the save
sits below however much has been typed. `member/edit`, `course/edit`, `offering/edit`, `holiday`,
`staff/add` and `change-mobile` all render through one shell
(`src/components/FormDialog.tsx`): a title saying what is being decided, a subtitle naming what it
applies to, a close that leaves without saving, and a **pinned** footer. Deliberately *not*
converted: `register` / `set-pin` / `forgot-pin` are the pre-session auth flow and own the screen;
`upload` and `match` are multi-step reviews; `branches`, `staff/index`, `audit`, `appearance`,
`profile` and `help` are places, not decisions.

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
---

### Sessions — `(tabs)/sessions` · `holiday` · `upload`
**Last confirmed:** 03-Sep-2026

The month calendar, closures, and the attendance register upload.

| Capability | Status | Notes |
|---|---|---|
| Month view; every session-bearing day carries an icon **and its word** | ✅ | Glyph resolution proven at build time by `scripts/check-icons.ts` (71/71) |
| Mark a session held or cancelled | ◻ | Status only — a session cannot be created or deleted from the client |
| Declare a holiday over a date range | ◻ | A **closure**, not a cancellation |
| Upload an attendance register (CSV) | ◻ | Preview then commit; the commit is server-side (`0014`, `csv-import`) |
| The upload is scoped to where it was opened from | ✅ | A day opens straight into that session; a course narrows to its own; Attendance narrows nothing (`src/data/uploadScope.ts`) |
| Upload works with nothing scheduled | ✅ | The first choice is the **course**; the session comes from the file's own date (0024) |
| One person, one session, one day | ✅ | `attendance_unique_live`, plus in-file duplicates collapsed and **named** before import |
| Five outcomes, blocking distinguished from not | ✅ | `OUTCOME_META` — a letter, a word and an icon each, and the count that blocks is stated |

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

### Weekly review and send — `(tabs)/weekly` · `send/index` · `send/review` · `send/result`
**Last confirmed:** 02-Sep-2026

The members the rule flagged this week, and the three-step flow that emails them.

| Capability | Status | Notes |
|---|---|---|
| The week's follow-up list, with the reason each member is on it | ✅ | Derivation covered by `supabase/tests/06_followup.sql` |
| Step 1 — choose a stored template | ◻ | |
| Step 2 — review: who receives, **and who is excluded and why** | ◻ | A member with no address is counted and named, never silently dropped |
| Step 3 — result, **per member** | ◻ | "Sent" is claimed per address, never for the batch |

**Rules and validations** — **there is no free-form composing anywhere in this flow** (DR-5). A
staff member picks a stored template; the wording is fixed and only the member's own figures are
substituted. The reason shown names the *condition* that fired, not the rule, so the row explains
itself.

**Limits** — email only; there is no SMS or chat channel. Sending needs SES credentials, which are
Edge Function secrets on the live project only.

**Benefit** — the follow-up that gets sent is the follow-up that was reviewed, and a failure names
the member instead of vanishing.

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
**Last confirmed:** 03-Sep-2026

Sign-in by mobile and PIN, first registration, PIN changes, recovery, and the profile screen.

| Capability | Status | Notes |
|---|---|---|
| Sign in with mobile + PIN | ◻ | `auth-login`; **currently returns 500 — `PIN_PEPPER` unset**. One button: Continue always goes to the PIN step |
| An unknown number reaches registration | ◻ | Decided by the server's answer, not by a public lookup — see the note below |
| A PIN can be typed, not only tapped | ✅ | Both keypads carry a real field over the boxes, with a caret on the box being filled |
| Register the academy admin | ◻ | `auth-bootstrap`; **not yet done — `bootstrap_completed` is `false`** |
| Set or change a PIN | ◻ | One screen, two lives: first PIN after a temporary one, or a self-change from Profile |
| Recover a forgotten PIN | ◻ | Two security questions, **three attempts, then a 30-minute lockout** |
| Change your own mobile number | ◻ | Authenticated, verified and audited |
| PINs never stored readable | ✅ | Column-name guard in `supabase/tests/01_auth.sql` |

**Rules and validations** — the sign-in screen has **one** button. The canvas looks a number up on
Continue and jumps straight to registration when it is unknown; against the real project that
needs a public *"does this number have an account"* endpoint, which is a **staff-enumeration
oracle** — anyone could dial numbers until one came back registered. `auth-login` is built the
other way round: an unknown number and a wrong PIN answer **identically** once the academy exists,
and the one case it will name is the global fact that nobody has registered at all. So Continue
always moves to the PIN step and the **server** picks the destination on the answer — the
bootstrap refusal routes to `register` with the number carried across, every other failure stays
put with its message. The predicate that reads that answer is `src/data/signin.ts`
(`needsRegistration`), tested rather than inlined: too eager and a member who mistyped her PIN
registers a second academy; too strict and the first admin is stranded on a PIN screen no PIN can
pass. A pasted number keeps its country code, so `groupPhone` drops a leading `91` or `0` — but
only when the input is longer than ten digits, since `91234 56789` is a real number.

Recovery answers are collected **up front at registration**, because
they are the only way a reset works later without a phone call. Every terminal state says plainly
what has and has **not** happened: a lockout that leaves someone wondering whether their PIN
changed is worse than the lockout itself. Changing the mobile number is cheap and safe because the
PIN derives from the immutable account id, not the phone number — so moving the number leaves the
PIN working.

**Limits** — **sign-in does not work on the live project today.** `PIN_PEPPER` is an Edge Function
secret that has not been set; until it is, every auth function returns 500 and the app says so.

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
