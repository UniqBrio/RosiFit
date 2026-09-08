# RosiFit — User Manual

*Prepared by UniqBrio for the owner of the academy.*

> **Who this is for:** **you, the academy owner** — the person the product was built for
> and the only account that can see everything in it. It is also the manual you hand to
> your coaches and front-desk team: everything they need is here, and
> [§15.3](#153-who-can-do-what) marks precisely which parts are yours alone.
>
> **What it describes:** the app as it behaves in the version you have — `v1.4
> (build 212)`, printed at the foot of the **More** screen. Where something is built but
> not switched on yet, this manual says so rather than promising it; see
> [§14 Not in this release](#14-not-in-this-release).
>
> **If this manual and the app ever disagree, the app is right** — tell us and we will
> correct the manual. Support is one number, by call or WhatsApp:
> **+91 9994871158**.

---

## Contents

1. [What RosiFit does](#1-what-rosifit-does)
2. [Installing and signing in](#2-installing-and-signing-in)
3. [Finding your way around](#3-finding-your-way-around)
4. [Overview — the academy this week](#4-overview--the-academy-this-week)
5. [Attendance — the workspace you live in](#5-attendance--the-workspace-you-live-in)
6. [Inside one course](#6-inside-one-course)
7. [Members](#7-members)
8. [Uploading an attendance register](#8-uploading-an-attendance-register)
9. [Weekly review and follow-up emails](#9-weekly-review-and-follow-up-emails)
10. [Reports](#10-reports)
11. [More — settings, staff and the audit log](#11-more--settings-staff-and-the-audit-log)
12. [Rules the app enforces](#12-rules-the-app-enforces)
13. [When something goes wrong](#13-when-something-goes-wrong)
14. [Not in this release](#14-not-in-this-release)
15. [Glossary and quick reference](#15-glossary-and-quick-reference)

---

## 1. What RosiFit does

RosiFit is the academy's own staff app. It answers one question well —
**who is drifting away this week** — and does the record-keeping that makes that answer
trustworthy.

The working loop is:

1. **A class runs on Google Meet.** Meet writes a CSV of who was in the call.
2. **You upload that file.** RosiFit matches every name against the member register and
   marks the session.
3. **A rule you set per course** decides who has missed too much.
4. **You review that list** and send those members a check-in email, using wording stored
   on the course.
5. **Reports** tell you whether a dip is a bad week or a trend.

Three things RosiFit deliberately does **not** do:

- **Members do not sign in.** There is no member-facing screen anywhere. Every screen is
  for the academy.
- **There is no live check-in.** Attendance is a register that gets uploaded, not a door
  sensor or a QR code.
- **There is no free-form message box.** Every email goes out through wording stored on
  the course. Nobody can type a one-off message to a member from inside the app.

RosiFit is a **PWA** — a web app that installs to a phone home screen or a desktop like a
normal app. It works on a phone, a tablet and a browser, and the layout adapts.

### 1.1 The two people who use it

There are **two roles**, not four, and the difference between them is narrow on purpose.

- **You, the academy owner.** One per academy, enforced — there cannot be a second. You
  see everything, and four things are yours alone: **Staff & access**, the **audit log**,
  **branches and holidays**, and the **follow-up rules and message wording**.
- **Your staff** — coaches and front desk. They run the register: adding courses and
  members, importing lists, uploading attendance, sending the follow-ups. What they cannot
  do is change the shape of the business or read the log of who did what.

*Coach* and *Front desk* are **labels you type on a staff record, not permission levels.**
They carry identical rights. If that matters to you, tell us — it is a change we can make.

### 1.2 The order to set it up in

Each step needs the one before it. Roughly an hour, once.

1. **Register your account** and set your PIN — §2.2.
2. **Add your branches** — More → Branches. A branch is a place you teach.
3. **Add your courses** — Attendance → Add Course. A course is *what* is taught; adding it
   at a branch creates the thing that actually runs, and its weekdays are what attendance
   is counted from. Set each course's **follow-up rule**, **from address** and **wording**
   on the same form.
4. **Add your team** — More → Staff & access. Add the person, then issue her PIN. Two
   deliberate steps.
5. **Load your members** — Attendance → Bulk Import for a list, or Add Member one at a
   time. Every member needs an email address; that is what the follow-up reaches her on.
6. **Upload your first register** after the next class, and the loop above starts turning.

---

## 2. Installing and signing in

### 2.1 Installing it

Open the academy's RosiFit URL in a browser.

| Device | How to install |
|---|---|
| Android / desktop Chrome or Edge | The browser offers **Install**; or use the browser menu → *Install app* / *Add to Home screen*. |
| iPhone / iPad (Safari) | Share button → **Add to Home Screen**. |

Once installed it opens in its own window with no browser address bar. You can also just
use it in a browser tab — nothing is lost.

### 2.2 Your own account — registered once

**Your** account is the academy admin, and it is registered once and only once. The
registration form asks for:

- **Full name** (required)
- **Mobile number** (required) — this becomes the sign-in ID
- **Email** — optional
- **Two security questions and answers** (both required) — these are the *only* way to
  recover a forgotten admin PIN later without a phone call

Everything is on one page. Required fields carry a red asterisk. After you register you
set your own 4-digit PIN.

There is exactly one academy admin, enforced by the database. Once the academy is
registered the form refuses a second one and says so.

### 2.3 Signing in every day

The sign-in screen has one field and one button.

1. Type your **mobile number** and press **Continue**.
2. RosiFit checks whether that number has an account.
   - **It does** → the PIN screen opens. *Continue never signs you in* — the PIN is still
     required.
   - **It does not** → the registration form opens with your number carried across.
   - **The check could not be reached** → you stay on the number screen with the reason.
     RosiFit will not guess.
3. Type or tap your **4-digit PIN**. It submits the moment the fourth digit lands.

On the PIN screen:

- **CE** clears the whole entry; **⌫** removes one digit.
- **Change mobile number** goes back a step.
- **Forgot PIN?** is at the bottom — see below.
- You can type the PIN on a hardware keyboard as well as tap it.

If an admin has just issued or reset your PIN, RosiFit takes you straight to
**Set a new PIN** before anything else. That is normal.

### 2.4 Staying signed in

**You stay signed in until you sign out.** There is no timeout. Reopening the app, closing
the browser, or restarting the phone does not sign you out.

Two things that do:

- **You press Sign out.** That ends the session **on this device only** — your other phone
  stays signed in.
- **Your account is switched off** by the admin. The session ends the next time the app
  reaches the server.

If the app cannot reach the server (no wifi, server down) it shows the sign-in screen but
**does not** throw away your session. The next visit that gets through resumes without a
PIN.

While it is checking, the sign-in sheet reads *"Checking if you are already signed in…"*.

### 2.5 Signing out

Two places do it: the **Sign out** row at the foot of **More**, and the **Sign Out**
button on your **profile**.

Both ask first. The question states what it costs (your mobile number and PIN to come
back) and that it is this device only. **Stay signed in** leaves everything untouched. If
the sign-out fails, the app does not pretend it worked — the question stays open and the
button goes live again as the retry.

### 2.6 Forgotten PIN

**If you are the academy admin:** Forgot PIN asks your two security questions. You get
**three attempts, then a 30-minute lockout**. Every outcome says plainly what has and has
not happened.

**If you are staff:** the security questions are the admin's own recovery, so they are not
offered to you. Forgot PIN gives you *"Ask my academy admin to reset it"*. That places one
request; asking twice refreshes it rather than making a second. The admin sees it as a
notification ranked above everything else, resets your PIN from **Staff & access**, and
gives you the new one.

### 2.7 Changing your own PIN or number

- **PIN:** More → your profile card → **Change My PIN**.
- **Mobile number:** the profile screen's mobile row. You need your current PIN and the
  new number. Your PIN is not tied to the number, so moving the number leaves the PIN
  working. The change is recorded.

---

## 3. Finding your way around

Every signed-in screen wears the same chrome.

```
┌──────────────────────────────────────────┐
│  RosiFit          🔔 notifications       │  ← academy header
│  ── Overview ──── Attendance ────────    │  ← the two tabs (admin)
├──────────────────────────────────────────┤
│                                          │
│              the screen                  │
│                                          │
├──────────────────────────────────────────┤
│      ( Home  ·  Reports  ·  More )       │  ← the nav pill
└──────────────────────────────────────────┘
```

**The two tabs** under the academy name are **Overview** and **Attendance**. Attendance is
a *section*, not a single screen — the course list, a course's detail, the member list and
the register all live under it.

**The pill** at the bottom is always **Home · Reports · More**.

**Home means different things by role**, and that is the only structural difference
between the two roles:

| | You (academy owner) | Your staff |
|---|---|---|
| Tabs | Overview · Attendance | Attendance alone, full width |
| **Home** goes to | Overview | The Attendance workspace |
| Sign-in lands on | Overview | The Attendance workspace |
| Staff & access | ✅ | ➖ not offered |
| Audit log | ✅ | ➖ not offered |

Staff are not merely *hidden* from those screens — typing the URL sends you back to
Attendance. Nothing about what staff may **write** is reduced: staff add courses, add and
edit members, bulk import, and upload registers exactly as the admin does.

**Where Back goes.** Overview, Reports and More are tab roots and have no back arrow —
they are already home. Screens opened *from* somewhere carry a back control that returns
to where you came from.

**The notification bell** (top right of the academy header) lists what needs you. Two
kinds are *actionable* and are counted on the badge:

- **A session awaits its upload** — *"Until the Meet file is in, this session counts for
  nobody."* Tapping it opens the upload already scoped to that session.
- **A staff member needs a new PIN** — ranked above everything else. Tapping it opens
  Staff & access.

Two kinds are informational: emails sent, and an email that could not be sent. When there
is nothing, the tray says *"Nothing needs you"*.

**Forms are dialogs.** Adding a member, editing a course, uploading a register — these
open as a card *over* the screen they are about, so you can still see the register you are
changing. The **✕** leaves without saving; the save button is pinned at the foot of the
card, so it never scrolls out of reach. Tapping outside a filter panel closes it.

---

## 4. Overview — the academy this week

*Yours only — your staff are not offered this tab. It is your Home screen.*

Three filters at the top, then four sections, two to a row on a wide screen and stacked on
a phone.

### 4.1 The filters — Course, Period, Branch

The filter row is **pinned**: it stays put while the sections scroll under it, so you can
always see what the numbers in front of you cover.

- **Course** and **Branch** are checkbox lists. Tick several to compare them. Nothing
  ticked means *not narrowed* — that is what "All courses" means as a state, not as an
  option you pick.
- **Period** is *This week · Last week · Last 4 weeks · This month*, plus a custom range
  picked on a calendar.
- **A pick applies immediately.** There is no Done button and never was one that did
  anything. The figures move underneath the open panel.
- A checkbox panel stays open so you can tick a second value. Close it by tapping the
  field again, or anywhere beside the panel.
- A custom range applies and closes on the day that **completes** it. A half-picked range
  applies nothing.
- If you tick a branch and it is later removed, the tick is dropped and the filter widens
  visibly rather than quietly narrowing to nothing.

### 4.2 The four sections

| Section | What you see | What it tells you |
|---|---|---|
| **Attendance** | One ring, Present against Absent, with the percentage. Under it: Members · Courses · **Need follow-up** | The whole picture for the filtered set. **Need follow-up** is tappable and opens the weekly review. |
| **Based on member** | Ranked horizontal bars, lowest attendance first, six shown | Who to chase. Bar *length* is session volume, so a member due at ten draws a longer bar than one due at three. Each bar names her course and branch. |
| **Based on course** | A small ring per course | Which class is slipping. |
| **Based on period** | A small ring per sub-range | Whether the period is even across itself. A week splits into days, a month into weeks, longer into months. |

Every figure on the screen is counted from **one** member list, narrowed once, so no two
charts here can disagree. Every ring writes its whole figure in words underneath —
*9 scheduled · 1 attended · 8 missed* — so the colour is never the only signal.

A sub-range that expected nothing shows a dash, never `0%` — a week with no classes and a
week everybody skipped are different facts.

**Limits.** The Overview reports; it changes nothing. It shows six members; the full list
is on Reports. Holidays, cancellations and sessions still awaiting a file are excluded
from every figure.

---

## 5. Attendance — the workspace you live in

*The second tab, and Home for staff. Its landing screen is the course list.*

The header says **Attendance** and counts what the academy has — courses, branches, and
how many members need following up. Beside it sit the three things you come here to do:

| Button | Opens |
|---|---|
| **Add Member** | The member form, asking which course she joins |
| **Bulk Import** | The member-list importer (an `.xlsx` file) |
| **Add Course** | The course form |

On a phone the three drop to a full-width row under the title.

Below that: a search box and a **branch** filter, then one card per course.

### 5.1 Reading a course card

Each card shows the course name, its branch (or *"3 branches"*, or *"No branch yet"*), how
often it runs, and two email counts — how many of its members you **can** write to
(✉) and how many you **cannot** (✉̸). Under that is one sentence saying whether anybody in
this course needs following up.

If a course has **no weekdays at all**, the card says so first and in the danger colour.
That is more serious than "nobody needs follow-up": nothing is expected of anyone, so no
absence can be counted and the course sits outside the follow-up engine entirely.

### 5.2 A card has three destinations

- **The name / body** → the course in detail.
- **The chevron (›)** → that course's member roster.
- **✎ and 🗑** on the row → edit the course, or delete it.

### 5.3 Deleting a course

Delete opens a confirmation that **counts what it destroys** before you commit:

> *"3 members are enrolled. This permanently deletes the course, its 1 offering, all 8
> sessions (7 completed) and the 39 attendance records on them. That attendance history
> cannot be recovered. The 11 files imported into it can be uploaded again afterwards.
> Recorded in the audit log."*

Read it. **The deletion is permanent and the attendance history goes with the course.**
Members themselves, their addresses, their aliases and any other course they are on are
untouched. The act is written to the audit log.

If the count is still loading the dialog says so; if the count fails it still warns, in
wording that is no gentler.

---

## 6. Inside one course

The course screen is where a week of teaching is actually read.

### 6.1 The header

The course name, its schedule, and three actions:

| Action | What it does |
|---|---|
| **Upload Session** | Opens the register upload, scoped to this course. It asks which file; the file says which day. |
| **Send Communication** | Opens the follow-up draft for **this course**. |
| **Add Member** | Opens the member form with this course pre-filled. |

If the course runs at more than one branch, a **Branch** filter appears under the header
and everything below follows it.

### 6.2 The week strip

Seven day cards, at every screen width, with **‹** and **›** to step weeks. The week being
shown is named above the strip, and a legend names every icon.

| A day shows | Meaning |
|---|---|
| ✓ **Present** / ✕ **Absent** | A file has been uploaded; this is what it recorded |
| ☁ **Awaiting upload** | The course runs that day and no file is in yet — *this is a button.* Tap it to upload for exactly that day |
| — **Not expected** | The course does not run that day |

Tapping a date card **selects** that day; the roster below is then about that day.

### 6.3 The roster

`Members (n)`, a search box (name **or** email), and one card per member, split into two
groups.

Under the search box, one line says which day the cards are about —
*"Attendance for Mon 7 Sept"*. If members are missing from the count because they joined
later or were inactive on that day, the screen says that too, on its own line, rather than
letting the count drop silently.

Each member card carries:

- Her name, her avatar and her email address (or *No email on file*)
- **Present · Absent · Yet to mark** for the selected day. **This is a reading, not a
  control.** Nothing on the row is tappable. *Yet to mark* means a session ran and no file
  is in; *Not expected* means the course does not run that day.
- An **Active / Inactive** pill — tapping it confirms, then writes immediately
- ✎ **Edit** and 🗑 **Remove**

> **To correct a day's attendance, re-upload that day's file.** There is no per-member
> tick. A re-upload replaces that day's register and tells you what it moved before you
> confirm (see §8.4).

### 6.4 The "No email" group

Members with no address on file are listed **separately, at the bottom, and still
counted**. The note says exactly why they are apart:

> *Their attendance is recorded as usual, but they are never counted for follow-up: there
> is no address to send to. Add an email and they join the rule.*

This is where members created by an attendance import land — the Meet file has no email
column, so a name the register did not recognise becomes a new member with no address.

Each card in this group carries two extra buttons:

| Button | Use it when |
|---|---|
| **Add as new member** | She really is somebody new. It opens **her** record so you can add the email; that is what takes her out of this group. |
| **Add display name to existing member** | She is somebody you already have, under a different Meet name. |

The second one opens a searchable picker of every member (by name *or* any email address
she holds, with her primary address printed on the row so two people with the same name
are told apart). Before you confirm it states both halves of what it does:

> *"Anitha R" becomes a display name for Anitha Rajesh, and every class Anitha R was
> marked present at moves across to her. Anitha R is then retired — the same person is not
> on the register twice.*

---

## 7. Members

### 7.1 The member list

Reached from a course card's chevron (scoped to that course) or from the members route
directly (the whole academy).

- **Search** covers her name, her email address and her **Google Meet display names** —
  that last one is how a name off a CSV gets found at all. An old member code from a
  pre-2026 export still finds her too, though no code is displayed anywhere.
- **Chips:** All · No email · Needs follow-up · (branch).
- When the list is scoped to one course, a **Show every member** button says so and gets
  you out. A filtered list that does not admit it is a list that has silently lost rows.
- Each card shows a **NO EMAIL** / **EMAIL OK** pill in words, her course and branch, ✎
  Edit, 🗑 Remove, and an **Attendance** link that opens her record.

### 7.2 Her record (a pop-up)

Tapping a member opens a card over the list, not a new page. It holds:

- Her name; **course · branch · joined** underneath
- **Expected · Attended · Missed · Missed streak** for the week
- **Her sessions this week**, one hairline list — holidays and cancellations are still
  listed, with why they do not count
- Her email address, or *No usable email*
- One line saying **whether an email is actually going to her**, in one of four states:
  - *Rule is met, Email sent*
  - *Rule is met, Email not sent yet*
  - *Rule is met, No email to send* (she is counted but unreachable)
  - *Rule is not met, No email to send*
- **Edit** and **Reach out** pinned at the foot

**Reach out** opens the send draft filtered to her alone, using her own course's wording.
If she has already had this period's message, it asks first — *"She has already had this
week's message"*, naming the day it went, over **Not yet** / **Reach out anyway**. It is a
warning, never a bar.

### 7.3 Adding a member

**Required: her name, her course, her branch, and an email address.** Add Member stays
disabled until an address is on the form. The reason is plain: a member with no address
cannot be written to, and this is one of only two places a member is deliberately created.

The form also holds:

- **Joined on** — optional; blank means "not on record"
- **Status** — on the Add form this is *stated*, not offered: it reads **Active**, because
  that is what a new member is. Use Edit to make somebody inactive.
- **Google Meet display names** — the names Meet shows for her. Add as many as you need;
  this is what an upload matches on.
- **Email addresses** — several allowed, exactly one primary
- **Her own days — optional** — day chips open with **every day her course runs already
  selected**. Take off the days she will not attend. Leave the row untouched and she
  simply follows the course, including if the course's schedule changes later. Only a
  *narrower* selection gives her a schedule of her own.

### 7.4 Editing a member

Same form, same rules. **An email address is required here too** — a member the attendance
import created opens with Save disabled and the footer asking for her address. Nothing of
hers, status included, is saved until one is on the form.

While her record is still loading, the dialog says *Edit member · Fetching her record*
over a skeleton with no Save. It never shows you a blank Add form by mistake.

**Status** on the Edit form is a two-choice field like any other: the pick is pending,
Cancel discards it, **Save** writes it.

**Inactive from** appears under the Inactive choice. It defaults to today and accepts any
later date, so *"she is active today but leaves at the end of the month"* is recordable.
It is refused before her joining day.

> **Inactive means one thing only: she is out of the follow-up rule** — not listed, not
> written to. She stays on the roster, her attendance goes on being recorded, and her
> enrolment and history are untouched. Marking her active again puts her straight back.

### 7.5 Removing a member

The 🗑 on either card — the member list or the course roster — opens the same
confirmation, worded identically, and states what will be destroyed. Read it: it takes her
attendance with her. Cancel leaves the register untouched. The toast afterwards addresses
her by first name so you can see it was the person you meant.

### 7.6 Bulk import (a member list)

**Attendance → Bulk Import**, or the same button on a course.

> ⚠ **This is not the attendance importer.** A member list is forty independent facts and
> imports row by row. An attendance register is one session's truth and imports as a
> single transaction. They are different screens.

**Steps**

1. **Download template** — an `.xlsx` named for your academy, with three sheets:
   instructions, Member Data, and a hidden lookup.
2. Fill in **Member Data**, one member per row:

   | Column | Means |
   |---|---|
   | **Full Name** | required — her name as the academy writes it |
   | **Email** | required — the address the academy writes to |
   | **Course** | pick from the dropdown; blank means the course this import was opened from |
   | **Branch** | pick from the dropdown; blank means that course's branch |
   | **Display Names** | the names Google Meet shows for her, comma-separated |

   **The course is per row**, so one file can cover every course you run. The Course and
   Branch dropdowns are fed from your academy's real offerings and Excel itself **refuses a
   course typed by hand** — add the course in RosiFit first, then download the template
   again.

3. **Choose the file. That is the import** — read, judged, written and reported in one
   tap. There is no separate confirm step; every row is still judged before anything is
   sent, and a refused row writes nothing.
4. Read the result: **Imported / Skipped (already exist) / Failed**. Every row that did not
   land is named with its reason and its spreadsheet row number, so you can find it again.

**Rules**

- Up to **500 rows**, **5 MB**. Blank rows ignored.
- A member already on the register is **skipped, never overwritten** — edit her in the app
  instead.
- No joining date is asked for: everyone this file imports joins **today**.
- With no course on the register the template is not offered at all — the screen tells you
  to add a course first.

---

## 8. Uploading an attendance register

This is the Google Meet CSV importer, and it is the only way attendance is ever recorded.

### 8.1 Where to start it from

| Start from | What it does |
|---|---|
| A day card marked **Awaiting upload**, on a course week strip | Best. Opens for exactly that course and that day |
| **Upload Session** on a course header | Narrows to that course; the file names the day |
| **Upload** on the Attendance register screen | Narrows nothing; you choose the course |
| The **awaiting** notification on the bell | Opens scoped to that session |

A narrowed screen always says it is narrowed and offers **Show every course** as a
deliberate second tap. If a scope no longer matches anything, RosiFit says the session is
no longer waiting rather than silently widening back to everything.

### 8.2 Choosing what to upload for

Days **Waiting for a file** are listed first, because when there is one it is almost always
the answer. Under them, **Or any course, any day** lists every course at every branch.

> **A class does not have to have been scheduled.** The file carries its own date, so a
> class arranged on the day, or run on a day the course does not normally run, imports
> fine.

**Change** takes you back to this picker if the pre-selection was wrong.

### 8.3 Choosing the file

The card names what RosiFit reads and says out loud:

> **The file imports as soon as you choose it.**

Press **Browse files** and pick the Meet CSV **exactly as Meet gave it to you** — do not
strip the first lines. Meet writes the meeting code and the created/ended times above the
table; those are what identify the session. RosiFit reads past them.

**A file with no "Created on" line cannot be imported.** RosiFit cannot tell which day it
covers, and landing attendance on a date nobody chose is worse than refusing. Export it
again from Meet, or pick a day already awaiting a file.

There is no email column in a Meet export. That is why an unrecognised name becomes a
member with no address.

### 8.4 The one question it may ask

An ordinary import asks nothing at all. One dialog appears if either of these is true:

- **The file is for a different day from the one you opened.** It imports for the *file's*
  day.
- **That day already holds a register this file replaces.** Confirming is labelled
  **Confirm override**.

A re-upload genuinely **replaces** the day rather than adding to it: anyone the new file
does not name goes back to absent, and somebody who was never expected is removed. The
dialog says this before you confirm.

### 8.5 Reading the result

The heading is the answer: **Imported · Mon 31 Aug**, or **Nothing to update** if the file
moved nothing.

Two counts side by side, each saying where that group went:

| | Means |
|---|---|
| **With email** | On the register, and counted for follow-up |
| **No email** | Marked present, listed under **No email** on the course |

Then, only when they apply:

- **What this file changed** — added, updated, skipped
- **N names belong to another course** — a member is in one course at a time, so a name
  whose only member is enrolled elsewhere was added here as somebody new rather than
  marked present over there. If it is the same woman, use *Add display name to existing
  member*.
- **N staff names left off the register** — whoever ran the class was in the call. She is
  not a member, so she is set aside and named rather than silently marked present in her
  own class.
- **N repeated names — counted once** — Meet writes a line per *join*, so a dropped
  connection appears twice. She is marked present once, and the repeats are named.
- **N rows dropped before matching** — blank names, or repeats.
- **This day already had a file** — what the override moved.

**Done** closes; **Upload another file** goes round again.

If the exact same file has already been imported, that is a *result*, not a failure: the
file is in, the register says so, and RosiFit says exactly that.

### 8.6 What the importer does with each name

| The name is | RosiFit does |
|---|---|
| Her canonical name, or a display name already confirmed for her | Marks her present |
| A member with no email address on file | Marks her present; she lands in **No email** |
| Anything else — a near-match, a name two members share, a stranger | Files her as a **new member with no email** in this course |
| A staff name | Sets it aside before matching, and names it on the result |
| Blank, or a repeat | Drops it, and names it on the result |

The reasoning for that third row is deliberate: a wrong **link** marks the wrong woman
present and looks exactly like a right one — nothing on any screen would say it happened.
A wrong **create** puts a name you recognise in the **No email** group, where two taps fold
her into the real member and carry her attendance across. Visible and reversible beats
invisible and permanent.

**Time in the call decides nothing.** Being named in the file is the evidence. A member who
joined from a phone for four minutes is present.

---

## 9. Weekly review and follow-up emails

### 9.1 The rule

Each course carries its own follow-up rule, edited on the course form: **N missed sessions
in a week**, with a stepper from 1 to 7. The sentence the rule produces is stated above
every list it generated, so a row always explains itself.

The follow-up list is **derived** from the member list and the rule — it is never a second
stored list, so a count on one screen can never drift from the list on another.

### 9.2 The weekly review screen

*Reached from the Overview's **Need follow-up** figure.*

Three chips: **Needs follow-up · N** / **All N** / **No email · N**, then a table of
members with `E` (expected), `A` (attended), `M` (missed) and `Att %`.

> *"Streak" is her current run of missed sessions. "Miss" is the week's total. They are
> different numbers.*

Nobody flagged is **good news** and the screen says so — *"Nobody needs following up.
Every member met her course's rule."*

### 9.3 Sending

**Use the course's own Send Communication button** (course header), or **Reach out** on a
member's record. The academy-wide button on this screen does not send yet — see
[§14](#14-not-in-this-release).

The draft dialog is deliberately small: a list of members with a tick box each, and a Send
button.

- Everyone **not yet written to this period starts ticked**. Somebody who has already had
  this week's message starts **unticked** and carries a green **Sent 3 Sep** badge — a
  second email to her is a deliberate tick, never an accident.
- **Select all / Clear all**, and `N of M selected`.
- Members with **no email address** are listed in their own **Excluded · counted, not
  dropped** block with the reason. They are never silently removed.
- There is **no wording on this screen and no box to type one.** The message belongs to the
  course and is edited there. Every send is recorded with the wording it used.

**Send to N** opens a confirmation that names who is going (first names, then *and N
more*), then one line of caveats — *3 flagged not ticked · 1 already sent this week · 2
without an address* — and *"This cannot be recalled."*

### 9.4 The result

Reported **per member, per address — never claimed for the batch.** Sent / failed /
excluded, with **Retry this one** on a failure.

### 9.5 Editing the wording

Course → ✎ Edit. The course form holds:

- **From email ID** and **Message template** (both required)
- **Wording for this course** — Subject and Message, with token chips (`{{first_name}}`
  and friends) you tap to insert
- A live **Preview** against a real member

---

## 10. Reports

*Reports on the nav pill.* It answers a different question from the Overview: the
dashboard says what is happening this week, Reports says whether it is a trend. It opens
on **This month** for that reason.

- **Period** — the same control as everywhere else, and it renders in the loading, error
  and empty states too, so an empty month is never a dead end.
- **Scope pills — Members · Courses · Branches** — these choose what the rows are grouped
  *by*.
- One stacked bar per row: **attended** against **missed**, with the percentage, and every
  figure written out underneath. **Bar length is sessions scheduled**, so a long bar and a
  short bar are not comparable percentages — they are different volumes.
- A row with nothing scheduled reads **—**, never `0%`.

**Export** (header) and **Export as Excel** (below the card) both export **exactly the
rows on screen**, as CSV that opens in Excel, stamped with the chosen period in the
filename and in a Period column on every row. A row with nothing scheduled exports as
*"no sessions scheduled"*, not `0%`.

**Limits.** Figures cover **uploaded sessions only**. Sessions still awaiting a file count
for nobody. Holidays and cancellations are excluded.

---

## 11. More — settings, staff and the audit log

Your name and role sit at the top; tapping it opens your **profile**.

### 11.1 Configuration → Branches

Add a branch by name, or remove one. A branch is the shape of the business, so this stays
with the academy admin.

### 11.2 Access → Staff & access *(admin only)*

*"Who can sign in, and what each of them may do."* The list is sorted so that the two
states needing action are never below the ones that do not.

**Adding a person and giving them a login are two deliberate steps.**

1. **Add staff** — full name (required), mobile number (required), and a role label. Role
   labels — *Coach*, *Front desk* — are **display labels, not permission tiers**. They
   carry identical rights. You can type a new label.
2. **Generate PIN** on her row.

| State | What it means | Action offered |
|---|---|---|
| **Not enabled** | The staff row exists; no credential issued | Generate PIN |
| **Awaiting PIN** | A PIN was issued and never used | Regenerate |
| **Disabled** | Switched off — every permission fails closed, at once | Re-enable |
| **Active** | Signs in normally | Reset PIN |

**The PIN is shown once.** The *PIN issued* screen says so — *"Shown once. There is no way
back to this screen."* It offers **Copy the PIN**, **Copy the app link** and **Share**.
Give it to her before you leave.

A staff member who has asked for a reset carries a **Requested a PIN reset** badge and
sorts to the top. Resetting her PIN closes the request automatically.

**Disabling** is one switch and it closes everything at once — every read and every write.
It is how a coach who leaves is switched off everywhere in one action.

### 11.3 Access → Audit log *(admin only)*

Every change, in plain words. Identifiers resolve to the member, course, branch, account or
offering they name — nothing renders as a raw code.

- **Search** across every word on a row; seven **category** chips; **Dates** (defaults to
  *Any date*, and narrows the query rather than the loaded page); **Branch**.
- The column header stays frozen while you scroll. On a phone the entries render as cards instead.
- **Sign-ins are not listed.** Six pre-session actions are filtered from the view; nothing
  stops being recorded and no row is deleted, and the screen says so under its heading.
- **Export** gives you a CSV of exactly what is on screen, one line per changed field.
- Only the fifty most recent changes are loaded, within the chosen dates.

**The log is read-only. Nothing on it can be edited or deleted, by anybody. That is the
point.**

### 11.4 App → Appearance

- **Theme:** Light · Dark · System. Persisted, and it is your own choice — it does not
  change what anyone else sees.
- **Accent:** six presets — RosiFit pink, Plum, Coral, Teal, Indigo, Gold — plus a
  **custom hue** picker: *"Choose a colour that represents your academy."*

Every colour pair the app draws is measured at build time to clear the 4.5:1 readability
standard, in **both** themes and for **all 360** custom hues. A colour you pick cannot make
text unreadable. A live **Preview** shows the shell in your choice before you commit.

### 11.5 App → Help & support

One number, two ways to reach it: **Call** and **WhatsApp**, both to UniqBrio on
**+91 9994871158**. *"A person picks up — there is no ticket queue to wait in."*

> **Anti-phishing:** this one number, by call or WhatsApp, is the **only** support channel.
> If someone offers you another number, an email address or a link for UniqBrio, it did not
> come from us.

### 11.6 Your profile

Your name, your role and academy, your mobile number and your PIN. **Change My PIN** is
here. Rows that cannot be changed say so, out loud, before you tap them.

---

## 12. Rules the app enforces

These are the behaviours that surprise people. All of them are deliberate.

**One member source.** The follow-up list is derived from the member list and the rule,
never stored separately. That is why the dashboard count and the weekly list cannot drift
apart.

**One person, one session, one day.** Enforced by the database. A duplicate in a Meet file
is collapsed and **named**, never quietly discarded.

**One live enrolment per member.** A member is on one course at a time. That is why an
import treats a name enrolled elsewhere as somebody new here, and says so.

**A session comes from the file, not a timetable.** A class that was never scheduled still
imports.

**Colour is never the only signal.** Every status carries its own word *and* its own icon.
Every link is underlined as well as tinted. This is checked at build time.

**Nothing is ever claimed for a batch.** A send reports per member, per address. An import
names every row that did not land.

**A filtered list says it is filtered**, and offers the way out.

**A failure says what did *not* happen.** *"Nothing has been changed."* / *"Nothing has
been sent."* If the server did not answer, the app does not pretend it did.

**No phone number and no member code is held for a member.** Neither identifies anybody a
person could check against. Her joining month is what her record carries instead. Old codes
stay *searchable* for anyone holding one from an export, but nothing displays one.

**PINs are never stored readable, never logged, never shown twice.**

---

## 13. When something goes wrong

| What you see | What it means | What to do |
|---|---|---|
| *"That number could not be checked. Try again."* | The lookup did not answer. RosiFit refuses to guess whether you have an account. | Check your connection and press Continue again. |
| The sign-in screen after you were signed in | The app could not reach the server. **Your session was not thrown away.** | Reconnect and reopen — it resumes with no PIN. |
| *"This file carries no 'Created on' line…"* | Not a Meet export, or the header lines were stripped. | Export again from Meet and upload it untouched. |
| *"No course to upload for"* | The course runs at no branch yet. | Add the branch/offering first — the days it runs do not have to be decided. |
| A member is on the register twice after an import | Meet used a different display name for her. | On the course, **No email** group → **Add display name to existing member**. Her attendance moves across. |
| Attendance for a day is wrong | There is no per-member tick, by design. | Re-upload that day's file. It **replaces** the register and tells you what it moved. |
| A member is not being emailed | She has no address, or she is Inactive, or she is under the rule's threshold. | Her record's status line says which of the four it is. |
| *"She has already had this week's message"* | She has. | **Not yet**, or **Reach out anyway** — the second send is allowed, just deliberate. |
| *"Remarks are not switched on for this academy yet"* | The audit-remarks update has not been applied. | The log above it is unaffected. Nothing to do. |
| A form opens as a blank coloured screen | A known display fault when a form is opened from a bookmark or a page refresh rather than by tapping into it. | Resize the window, or reach the form by tapping. Report it and we will fix it. |
| Anything else | | Help & support → **Call** or **WhatsApp**. |

---

## 14. Not in this release

Stated plainly, because a manual that promises what the app does not yet do is worse than
no manual. Everything here is either a deliberate decision or work in progress, and none
of it blocks the weekly loop in §1.

| What | What it means for you | Do this instead |
|---|---|---|
| **The academy-wide "Reach out to N members" button** on the weekly review does not send. It answers *"The draft could not be loaded."* | A message spans several courses, and each course stores its own wording — which one a mixed send should use is a decision we want from you before we build it. | A course's own **Send Communication**, and **Reach out** on a member's record. Both work, and between them nothing is unreachable. |
| **The weekly review is reached from the Overview only.** | Your staff have no Overview, so they cannot open it. | You open it from Overview → *Need follow-up*. Tell us if your team needs it and we will give it a home. |
| **Holidays are not on the menu.** The feature works — a closure you record still correctly removes those sessions from every figure — but its menu row was removed at your request. | You cannot declare a closure from the menu today. | Open the address ending `/holiday` directly, or ask us to put the row back. |
| **Per-branch class times** cannot be edited on a screen. | You cannot set a different start time for the same course at two branches. | Days and branch are edited on the **course** form, which covers the ordinary case. |
| **Email sending needs your sending domain connected.** | Until that is done, drafts prepare correctly but nothing leaves. | Ask us to complete it. |
| **Ticking one member present or absent was removed on purpose.** | The roster's Present / Absent / Yet to mark is a reading, not a control. | Re-upload that day's file — it replaces the register and says what it moved. |
| **Notes against an audit entry** may say the feature is not switched on yet. | You cannot annotate a log entry. | The log itself is complete and unaffected. |
| **A small number of actions are still being switched on** for your live academy. | An occasional action may report an error even though the screen offers it. | Tell support what you were doing — these are quick to enable. |

---

## 15. Glossary and quick reference

### 15.1 Words this app uses precisely

| Word | Means |
|---|---|
| **Course** | *What* is taught — Prenatal Flow, Postnatal. Not when. |
| **Offering** | A course **at one branch**, with the weekdays it runs. Attendance is counted from the offering's weekdays. |
| **Session** | One class on one date. Created by the schedule, or by an import for a date nobody scheduled. |
| **Register** | One session's attendance, as uploaded. |
| **Expected** | She was due at that session. |
| **Extra attended** | She came when she was not expected. Never a miss. |
| **Holiday** | A **closure** — not a cancellation. Excluded from every figure. |
| **Alias / display name** | The name Google Meet shows for her. What an upload matches on. |
| **Flagged / needs follow-up** | Over her course's rule for the period. Derived, never stored. |
| **Inactive** | Out of the follow-up rule. Still on the roster, attendance still recorded. |
| **Academy admin** | You — the single owner. One per academy, enforced. |
| **Staff** | Your coaches and front desk. Identical rights to each other. |

### 15.2 The eight statuses

| Word | Icon | Where you see it |
|---|---|---|
| **Present** | ✓ | Attendance list, roster, week strip |
| **Absent** | ✕ | Attendance list, roster, week strip |
| **Awaiting upload** | ☁ | Week strip, notifications — *and it is a button* |
| **Scheduled** | 🕐 | A session still to come |
| **Cancelled** | ⃠ | A session that did not run |
| **Holiday** | 🎉 | A declared closure |
| **Extra attended** | ＋ | She came unexpected |
| **Not expected** | — | The course does not run that day |

Every one of them carries the word as well as the icon, everywhere. Colour is never the
only signal.

### 15.3 Who can do what

| | You (academy owner) | Your staff |
|---|---|---|
| See the Overview dashboard | ✅ | ➖ |
| See the Attendance workspace, courses, members | ✅ | ✅ |
| Add / edit / delete a course | ✅ | ✅ |
| Add / edit / remove a member | ✅ | ✅ |
| Bulk import members | ✅ | ✅ |
| Upload an attendance register (and override one) | ✅ | ✅ |
| Mark a session held or cancelled | ✅ | ✅ |
| See the follow-up rule | ✅ | ✅ |
| **Change** the follow-up rule or a template | ✅ | ➖ |
| Send follow-up emails | ✅ | ✅ |
| Add / remove a **branch**, declare a holiday | ✅ | ➖ |
| Staff & access, issue or reset a PIN | ✅ | ➖ |
| The audit log | ✅ | ➖ |
| Theme and accent | ✅ own | ✅ own |

Two more rules sit above all of the above:

- **Every write is gated on the subscription.** An expired subscription makes the whole
  product read-only rather than partially broken.
- **A disabled account fails closed.** One switch, and every read and write denies at once.

### 15.4 The week at a glance

| When | Do this | Where |
|---|---|---|
| After each class | Upload the Meet file | The day card marked **Awaiting upload** |
| When a new member joins | Add her — with her email | Attendance → **Add Member** |
| When a batch joins | Bulk Import | Attendance → **Bulk Import** |
| When the register shows a stray name | Fold her in | Course → **No email** → *Add display name to existing member* |
| Saturday | Review who is drifting, and write to them | Overview → **Need follow-up**, then the course's **Send Communication** |
| Month end | Check whether a dip is a trend, and export it | **Reports** |
| When a coach joins or leaves | Add / disable, and issue or revoke the PIN | More → **Staff & access** |

---

*RosiFit — Preparing, Thriving and Beyond.*
*Built and supported by UniqBrio for your academy. v1.4 (build 212).*
*Support: +91 9994871158, by call or WhatsApp — the only support channel. A person picks
up. If anything in this manual does not match what you see on screen, tell us: the app is
right, and correcting the manual is our job.*
