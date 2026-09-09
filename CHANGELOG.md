# Changelog

## Unreleased — A branch that runs courses can now be removed

**Removing a branch no longer stops at a padlock.** Until now, a branch with any course on it
could not be removed at all — the button was locked and said *"move them first"*, which was advice
with nothing behind it: there was no way to move them.

Pressing remove on such a branch now asks **where its courses should go**, and moves them there.
The courses carry on at the new branch with everything intact — their registers, their sessions,
every member and every attendance record. **Nothing is deleted.**

If a course already runs at the branch you pick, that one cannot move there — the two registers
would end up on top of each other — so RosiFit says which course it is and changes nothing. Move
or remove that one first.

A branch with nothing on it is removed as before, behind the same plain confirmation.

**To actually delete a course, delete the course.** Removing a location does not destroy a
register, and there is a separate control on each course for when you mean that.

Adding and removing branches is still the academy admin's, unchanged.

## Unreleased — A leaving date typed into the report now actually takes

Two fixes to Bulk Import, both found from one real upload: a 794-member report with an
**Inactive from** date filled in against two members.

**The file is no longer too big.** It was refused with *"A file may carry at most 500 members;
this one has 794"* — a limit that belongs to the member template, which creates people, and never
should have applied to your own register sent back. The report can now carry up to 5,000 members,
which is past any register we expect to see.

**And the dates you type now take effect.** This is the more serious of the two. Underneath, the
app read an **Inactive from** date as meaning "inactive" only when the **Status** cell beside it
was blank — but the report always writes a Status, so on a real export that was never true. The
exported *Active* won every time and the date you had just typed was thrown away, and the upload
reported *Already correct*. Both members in that file were silently skipped.

The app now looks at **which cell you changed**, comparing against what the register already
holds:

- type a leaving date and leave Status alone → the member is inactive from that day
- set Status to **Active** → the member is back on the register, and the old date comes off
- send the export back untouched → nothing is written, every row *Already correct*

**One thing to know about names.** Rows are matched to members by name, so if two members share a
name the app refuses those rows rather than guessing which one you meant — it says so on the
result, per row, and nothing is written for them.

## Unreleased — Reset clears the members you picked, and you can delete the ones with no email

**Reset now acts on the members you tick, not on the whole day.** Pick the members whose marks are
wrong, press Reset, and only those marks are cleared. Everybody else's attendance for that day is
left exactly as it was.

Reset is unavailable until you have ticked somebody — pressing it with nothing selected used to
clear the entire register for that day, which is a much bigger thing than it looked. If you do want
the whole day, *Select all* is one tap and then Reset does exactly that, on purpose rather than by
default.

**The day only goes back to *awaiting a file* when the reset empties it.** Clearing three of eight
members leaves five marks standing, so that day is still a register and is no longer advertised as
ready for an upload — which would have invited a second file on top of the marks that survived.

**Deleting is now its own button, with its own question.** Tick members in the *no email* list and a
Delete button appears beside the count; it asks before anything happens, and names who is being
removed and what else goes with them. It only ever offers the members with no email address on
file — anybody the academy can still write to is never removed by a bulk control.

Deleting used to be folded into the reset: a list of tick boxes inside the reset dialog, and one
press that both cleared the day and deleted whoever was ticked. One button carrying a reversible
act and an irreversible one meant the whole dialog had to be read at the size of its worst half,
every time. They are two separate decisions now, and each says plainly what it does.

## Unreleased — Bulk Import now also sets joining and leaving dates

**Bulk Import takes a second kind of file, and works out for itself which one you chose.**
It is the same button in the same place; nothing about adding members has changed.

*To add members*, as always: download the template, fill in the Member Data sheet, upload it.
Members already on the register are skipped, never overwritten — exactly as before.

*To change dates on members already here*: download the members report from **Reports → Export**,
type into the **Active from** and **Inactive from** columns of the *Member details* sheet, and
upload that same file back. There is no template for this one and nothing to re-key: the file is
the report you already have.

**A blank cell is left alone.** That is the rule the whole thing turns on. Almost every cell of a
report you send back is untouched, so a blank means *as you were*, never *clear this* — where no
Active from is typed, the joining date already on record stands. Uploading an export you have not
edited changes nothing at all, and says so: *Already correct*, for every row. An **Inactive from**
date with no status beside it is read the only way it can be — inactive from that day.

**The dates file never adds anybody**, and the template never changes anyone's dates. One button,
still two jobs, and each file gets only the one it came for. A name the report mentions that is
not on the register is reported back with what to do about it, and nothing is written for that row.

When it finishes it says what it did, member by member: which dates moved and what they moved
from, which rows were already correct, and which were not changed and why. Every date is checked
the same way the member form checks it, so a file cannot record something the form would have
refused — a joining date in the future, one after the member left, or one later than a session
they are already marked present at.

## Unreleased — The app no longer says "she"

**Every message the app shows is now written about *the member*.** The academy is a women's
academy; the software is not, and a licensee running a mixed academy was being shown copy that
did not fit. Nothing changed about what any of these messages mean or when they appear — the
delete confirmation, the status pill and its confirmation, the send screen's refusals, the
member-import notes and the database's own refusals about joining and leaving dates all say the
same things about the same records, in wording that reads correctly for anybody.

## Unreleased — The app updates itself when a new version is deployed

**A new version now reaches the app on its own.** Until today the app only picked up a new
version when it was opened fresh — and the installed app is almost never closed, so a fix
that had already shipped could go unseen for days, and a problem that had been solved could
be reported again.

It now watches for a new version in the background and moves onto it at the first moment
that costs nothing: while the app is put away, or after a minute of not being touched. There
is nothing to press and nothing to close — you simply have the latest version. It will never
reload while you are working: not mid register, not mid form, not mid send.

Nothing on any screen has changed.

## Unreleased — An uploaded attendance file shows on the member cards at once

**Uploading an attendance CSV now updates the member cards as soon as the import finishes.**
The register was always written correctly — the import landed, and the figures were right the
next time the Members tab was opened. But until then the cards went on showing what they had
read before the upload, so an import that had just marked twelve women present looked like an
import that had done nothing, and the only way to see it was to reload the app.

The rest of the upload screen is untouched: the same file is read, the same rows are matched,
the same result is reported.

## Unreleased — Appearance drops its step numbers

**The three Appearance headings no longer count.** *Choose a preset colour*, *Choose a
custom colour* and *Light or dark* were numbered 1, 2 and 3, which read as a sequence you
had to work through — but the first two are alternatives separated by an *or*, and the
third is unrelated to either. The headings now say what they are and nothing more. The
controls, the swatches, the measured custom hue and the theme toggle are untouched.

## Unreleased — Staff really can bulk import now, and add, edit and delete a course

**A staff account importing a member file was told *"Only the academy admin can bulk import
members."*** — four days after that restriction was withdrawn. The withdrawal was real: it
was decided, written and specced. It simply never reached the live academy, because the
update carrying it was never applied there. The same gap blocked staff from adding, editing
and deleting a course, and from changing an offering's days.

All five now work for staff, on the live academy, and were checked there afterwards rather
than assumed. Nothing about the app's screens changed, because nothing about them was ever
the problem — no screen has ever asked whether you are the owner before offering Add Member,
Bulk Import, Add Course, Edit, Delete or Upload.

**What staff still cannot see is unchanged:** Overview, Staff & access and the Audit log,
which is exactly the line you drew. Branches, holidays and academy settings stay the owner's
too. And a lapsed subscription still refuses every one of these writes — that was never a
question of who you are.

Four refusal messages were reworded as a consequence. If one of these saves is ever declined
now, it can only mean the account is inactive or the subscription has lapsed, so the message
says that instead of naming an admin whose permission you would go looking for and already
have.

## Unreleased — Sign out asks first

**Sign out no longer takes effect on the tap.** It asks, and the session ends only when you
say so. On More the row sat third in a list of harmless settings, under Appearance and Help &
support, and one mis-tap ended the session — with no way back except your mobile number and
your PIN.

The question says what it will cost you and what it will not do: *You will need your mobile
number and PIN to sign back in. Only this device is signed out: anywhere else you are signed
in stays that way.* The way out is **Stay signed in**, and it leaves you exactly where you
were.

Both sign-out controls ask — the row under **More** and the button on **Your profile** — in
the same words, because it is the same act.

## Unreleased — A bulk import is one line in the audit log, not twenty

**Importing four members used to fill the audit log.** Each member wrote a separate entry
for herself, her name on Meet, her email address and her course enrolment — around twenty
rows for one import, which pushed everything else off the screen and told you nothing you
did not already know.

It is now one row: *4 members added by bulk import*, the file it came from, and the members
it added. Three names are shown; if there are more, **+ more** opens the full list and
**Show fewer** closes it again.

Nothing has been merged away or deleted. The row says how many entries it stands for —
*8 entries in this import* — those entries are still stored, still searched, and **Export
still writes every one of them separately**, exactly as before. The count of members comes
from what the import itself reported; on the rare entry where that was not recorded the row
counts what it can see and says so, rather than presenting a tally as a fact.

Rows are only ever grouped where the database itself recorded that an import happened, so
two unrelated changes that share a moment stay two changes, and two people importing at the
same instant stay two imports.

## Unreleased — An attendance file never marks a member of another course

**Uploading a register for one course can no longer mark a member of a different one.** A
name in the file used to be matched against everybody on the academy's register, whichever
course they were in — so a Postnatal file naming a woman who shares her name with a Prenatal
member marked *that* member present on the Postnatal session, quietly, and added nobody to
Postnatal.

A member is in one course at a time, so a name whose only member is enrolled elsewhere is
not that member. She is now added to the course you uploaded for, as somebody new with no
email — where she appears under **No email**, exactly like any other name the register did
not know.

**And the upload says so.** The result names her and says which course the name clashed
with, so if it really is the same woman who has moved course, *Add display name to existing
member* folds her in and carries her attendance across. The one judgement this import has to
make about a shared name is no longer made in silence.

## Unreleased — Deleting a course now deletes it for good

**Deleting a course removes it and everything recorded in it — its sessions, including the
ones that already happened, and every attendance record on them.** It used to be hidden rather
than removed, and its finished sessions were kept. That left ghosts: a course you had deleted
still holding registers nobody could open, a second course with the same name sitting beside
the old one in the database, and an attendance file that could never be uploaded again because
the deleted course still claimed it.

**The confirmation now counts what will go before you confirm** — how many members are
enrolled, how many sessions, how many attendance records — and says plainly that the
history cannot be recovered. Members themselves are never deleted with a course; only their
place in it. A file that was imported into a deleted course can be uploaded again afterwards.

The six courses deleted before this change are cleaned up the same way, once, when the update
is applied.

## Unreleased — Remarks move into the table, and a new record lists only what names it

**Your remarks now sit in the log itself, in a last column beside the change they are
about.** They used to be a separate list at the bottom of the page, which meant a note
explaining why a threshold moved sat several screens away from the row showing it move.
Press *Add remark* on any row, write the reason, and it stays on that row. As before, a
remark cannot be edited or deleted once saved, and the screen says so before you type
rather than after. Only one row is open for writing at a time.

Remarks written before this change are still stored and still yours; they simply belong to
no particular row, and the page no longer offers a way to write another of that kind.

This is live on the academy: the database change it needs was applied on 8 Sep 2026, so the
column reads and writes for real rather than sitting inert. What has *not* happened is the
rehearsal the process asks for — the spec written for it has never been executed anywhere,
because this machine has no Postgres to run it against. The structure was checked directly
against the live database instead; the behaviour of its permission rules under a real
sign-in is taken on the strength of the rules 0043 already carried, not demonstrated.

**A record being created no longer prints every column it was born with.** *Member added*
listed six lines — name, member code, status, joined on, notes, added by — when the answer
to "who was added" is the first of them. It now prints the fields that name the thing and
says how many it left out, so nothing is quietly dropped: *+5 more fields recorded, not
shown*. Everything is still recorded, still exported and still findable by search.

A member’s email address is not stored on the member, so adding her writes two entries —
one for her, one for the address. Both are now one line each, and the address entry names
the member it belongs to. Edits and deletions are untouched: there the changed fields are
the news, and every one of them still shows.

## Unreleased — A member can be marked inactive from a date, not just from now

**A member is active today and leaving at the end of next month.** The register had two ways
to hold that and both were wrong: leave her active and remember to come back on the day, or
mark her inactive now and stop writing to her five weeks early.

Inactive now carries a date. On her record — Edit member, the form the course roster opens —
picking **Inactive** shows **Inactive from**, filled in with today so the ordinary case still
takes one tap, and it accepts any day from the day she joined onward. She stays in the
follow-up rule right up to the day before, drops out on the day, and nobody has to be there
to press anything. Picking **Active** again takes the date off.

**It is a date her follow-up stops, not a date she leaves.** Her enrolment is open, the
classes after that date still expect her, and every attendance record she has stays exactly
where it is — the same promise marking somebody inactive has always made, now with a day on
it. The Edit form and the roster confirmation both say so before anything is saved.

**Her status now answers for the day you are looking at.** Step the course roster back three
weeks and a member who left last Tuesday reads as she was that week. A departure still to
come is written on her card — *Inactive from 1 October 2026* — under a pill that truthfully
reads Active, so it is never a surprise on the day.


## Unreleased — A new course starts empty, even when it carries a deleted course's name

**Delete a course, add another with the same name, and its card opened stating the old
course's members.** *2 members · 1 with email · 1 without*, on a course nobody had been
enrolled in yet — and tapping through showed those members by name, with their addresses,
and drafted this week's follow-up to them. The counts were not stale numbers left on
screen; they were a live answer to the wrong question.

The question the card asked was *"which members are in a course called this"*, and a name is
not an identity. The academy is allowed to reuse one — only the names of courses that
currently exist have to be unique — so the moment the new course was saved, every member of
the deleted one answered to it. Every screen that gathers a course's people asked the same
way: the card, the roster behind it, the members list opened from it, the week strip, and
the send draft.

They now ask by the course's identity, which is what a member's enrolment actually points
at. A member deleted out of a course is enrolled at nothing until somebody enrols her
again, and a course created afterwards cannot claim her — not because her record was
cleaned up in time, but because she was never pointing at it.

**The deletion tells the member lists as well as the course list.** Ending forty enrolments
is a change to the register, and it used to be announced only as a change to the courses.
A screen already open went on reading the members it had loaded a minute earlier — the
deleted course's roster, held in memory, ready for the next course of that name.

Nothing changed in the database: `delete_course` already ended enrolments and kept every
completed session and attendance record, which is the promise its confirmation makes. What
changed is that the app now reads those kept records by the course they belong to rather
than by the name they were filed under, so a deleted course's history stays readable
without turning up on its successor's screen.

## Unreleased — The message preview shows what she will read, not the words that build it

**The preview under the course wording no longer prints `{{first_name}}`.** It prints Divya.
That was always the intention and it worked — for an academy that already had somebody enrolled
on the course being edited. Every course is added before it has anybody on it, so on the one
screen where this wording is written, the preview panel usually said *"No member is enrolled
yet, so there are no real figures to show this against"* and showed nothing, directly beneath a
box reading *Hello {{first_name}},*. The braces were the only rendering of the message on the
screen, so they read as the answer.

There is now always a preview. Where the course has a real member, it is still hers, and the
panel still says whose figures these are — that claim is what makes it worth trusting. Where it
has nobody, the panel is headed *Preview · sample values*, fills in stand-in figures chosen so
that no two are the same number (three due, one made, two missed, 33%, so it is clear which
detail produced which figure), and says underneath that each member receives her own.

**The template picker's second line is filled in too.** Choosing between *Gentle check-in* and
*Long absence* meant reading their source: the line under each name is taken from the first line
of that template's message, which is exactly where the details are thickest.

And the two dates read as dates. The period used to fill in as *"the period start"* and *"the
period end"* — words standing where a date belongs. It is now this week's, in the same form the
send itself uses.

**Nothing changed in the wording you edit.** The boxes still hold `{{first_name}}` and the chips
still insert it; only the preview resolves. What is sent is unchanged.

## Unreleased — A member is only shown on the days she was actually a member

**A student added on 7 September no longer appears in attendance for the 6th.** She used to:
the course roster for any past day listed her with a reading beside her name — *Yet to mark* —
for a class that ran before she was on the register, and a report for last month counted her as
a member with nothing attended. She now appears from her joining day onward, and on that day
itself.

The academy's records always held the date; the app read it, formatted it into the *joined Mar
2026* line under her name, and kept nothing it could compare. So every screen that is about a
date — a day's attendance, a period's figures — was showing every member whatever date it
claimed to be about.

**She is not hidden from the course.** The Members tab, the search, the course's own member
count and every send list are unchanged: none of them is about a date. Only the day-scoped
roster narrows, and when it does it says so underneath — *"1 member joined after Sun 6 Sep 2026
and is not listed for it. She is still on the course."* — rather than letting the count change
with nothing to explain it. A member whose record carries no joining date at all is never
hidden by this.

Offline demo data was telling the same untruth one layer down, generating weeks of attendance
for a member added that morning. It no longer does.

## Unreleased — The course header stops eating half the screen, and four controls become addressable

**The course page no longer opens on a wall of purple.** Its header — the course name, the
schedule under it and the three buttons — was painting most of the way down the screen with
nothing in it, pushing the follow-up sentence, the week strip and the member list into the
bottom half. The bar now ends where its contents end. On a wide screen it went from 417pt to
74pt; on a phone the three buttons stack, so it is 244pt and that is genuinely how tall they
are. Nothing moved, was removed or was renamed — there is simply no empty band above the
roster any more.

The cause was shared: the deep gradient assumed it was always a whole screen, which is true on
sign-in, Help and the PIN screens and stopped being true when the course header was pinned
above the scrolling roster. It now says which of the two it is, so those screens are untouched.

**Four buttons an automated test could not reach now have names.** *Call* and *WhatsApp* on
Help, the two *Powered by* links beside them, *Choose a new PIN* after a recovery check passes,
and the answer button on the recovery questions. Nothing about them looks or behaves any
different; they can now be addressed by a runner rather than only by a person, which closes the
last audit gate that was still failing.

## Unreleased — Each day that is waiting for a file says so, and takes you straight to the upload

**The week strip on a course now carries an *Awaiting upload* button on every day that has no
file yet.** Press it and the upload opens for that exact day — Wednesday's button uploads
Wednesday — so a file for the wrong day is still caught and asked about. A day whose file has
arrived shows its tick, as before, with nothing to press; a day the course does not run keeps
its dash. On a phone, where the seven cards are too narrow for the words, the button is the
cloud alone and the legend above the strip still names it.

The *Upload Session* button beside *Send Communication* is unchanged. Nothing comes back under
the strip: no card, no message.

## Unreleased — The Overview keeps its filters in view, and its charts say more than a percentage

**The three filters stay where you put them.** Course, Period and Branch used to scroll away
with everything else, so by the time the course and period charts were on screen the controls
that decided what they counted were off it — and there was no way to tell what the numbers in
front of you covered without scrolling back up. The row is now pinned to the top of the
Overview and the charts pass underneath it. Opening a filter still drops its list in place,
over the figures rather than beside them.

**Every course and every day now shows all three numbers.** A ring used to read "1 of 9
present", which left you to work out the figure you were actually after — how many were missed.
It now reads *9 scheduled · 1 attended · 8 missed*, the same words the member chart has always
used, so a course cannot be described one way under a ring and another way under a bar. A
course with nothing on the timetable still says so in words instead of showing 0%.

**And the member chart names the course.** *Divya Ramesh · Prenatal Flow · Chennai*, under her
name. The ranking tells you who to chase; now it also tells you what about, without leaving for
Reports to find out. Where two members share a name and are in different courses, no course is
named — a caption for a population it does not describe would be worse than none.

Nothing about how any figure is counted has changed.

## Unreleased — The audit log reads like English

**It was a record of your academy written in the database's handwriting.** The screen printed
what the table stores, so the line that was supposed to name a member read
`a98a2d1a-32de-45f4-8b67-6…`, the heading above it read `member.insert`, and the fields that
changed were column names — `full_name`, `joined_on`, `created_by`. Sign-ins were listed as
ordinary entries, and with only the fifty most recent changes on screen they were pushing the
real ones off the end.

**Now every line is a sentence.** *Member added · Ranjani*. *Course follow-up rule updated ·
Prenatal Yoga · Missed in a week 3 → 2*. *Course schedule updated · Days Mon Tue Thu Sat →
Mon Tue Wed Thu Sat*. Whoever made the change is named with their role beside it — Owner or
Staff — and the time reads *Today, 3:11 PM* rather than *9/7/2026, 3:11:49 PM*. An entry is
one row now, with everything it changed listed inside it, instead of one row per field with
"same action" underneath.

**Signing in and out is no longer listed.** It is still recorded, still permanent, and still
in the table — it just is not a change to anything, and the screen says so in a line under the
heading. Nothing was deleted and nothing stopped being written down.

**The column header stays put while you scroll**, so you never lose track of which column you
are reading. On a phone the entries are cards instead, where there are no columns to freeze.

**And you can find things.** A search box across every word on every row, seven chips for the
kind of activity — members, courses, attendance, uploads, messages, settings — a date range
(with *Any date* as the default, so nothing is hidden unless you ask), and a branch filter.

**Remarks.** A section of your own beneath the log, for why something was done: *"lowered the
Prenatal Yoga thresholds after the Saturday batch moved"*. Like the log itself, a remark
cannot be edited or deleted once saved, and it never alters the record beside it. **This half
needs a database update that has not been applied yet** — until it is, the section says so
plainly and the log above it works exactly as described.

## Unreleased — A form no longer disappears when you tap beside it

**A stray tap used to throw the whole form away.** Every form in RosiFit opens as a dialog over
the screen you were on, and a press anywhere on the dimmed area around it closed the dialog.
Closing is not saving, so a member you had half finished — her name, her email, her course,
her joining date — was simply gone, with nothing to undo and nothing on screen that you had
actually aimed at.

**Now the area around a form does nothing when you press it.** Add member, edit member, add and
edit a course, the class editor, a member's record, the attendance upload, the member import and
its help panel, add staff, holidays, the message you are sending, change mobile — all of them
leave the way they have always shown you they leave: the close button in the top corner, or
Cancel. The confirmations that stand in front of the irreversible things — sending, deleting
— work the same way now: they wait for an answer instead of vanishing on a misplaced click.

**The pickers are deliberately unchanged.** A calendar hanging under a date field, the
notifications list, the search panels — those still close when you tap away from them, because
tapping away is the only way out they have, and none of them is holding anything you typed.

## Unreleased — RosiFit installs like an app

**It has called itself a PWA since the day it was written, and it could not be installed.**

There was no install button in Chrome, none in Edge, and nothing under iOS Safari's Share
menu, on any device. The reason turned out to be one silent thing: the PWA settings in
`app.json` — the app name, the tint, the standalone display mode — belong to a build pipeline
this app stopped using. The current one never reads them. They looked exactly like working
configuration and produced nothing at all: no manifest, no icons, no head tags.

**Now it installs.** On Android and on desktop Chrome and Edge the browser offers to install
it; on an iPhone, Share → Add to Home Screen gives it a real home-screen icon. It opens in its
own window with no browser chrome, tinted in the RosiFit deep purple, under the academy's own
crest rather than a placeholder.

**Opened without a signal, it opens honestly.** The app itself will load with no connection —
but it does not pretend to have your data. Every screen says it could not reach the server and
that nothing was changed, exactly as it does today on a dropped connection. Attendance,
members and courses are never served from a cache: a register that looks completely normal
while it is quietly showing yesterday is worse than one that admits it cannot reach the
server. Working offline for real is a bigger feature, and a separate one.

**Updates arrive on the next launch,** never mid-session — nothing gets swapped underneath you
while you are half way through marking a register.

## Unreleased — You stay signed in until you sign out

**The session was never being lost. The screen never asked whether it had one.**

Opening the RosiFit URL asked for a mobile number and a 4-digit PIN every single time — on a
reload, in a new tab, after closing the browser. The cause was not the session: GoTrue has
persisted it since the client was written, its refresh token is a row in the database, and it
survives the tab, the window and the process. The cause is that `/` is both the sign-in screen
and the app's start URL, and it rendered the number field **unconditionally**, over a session
that was live the whole time.

**Now it asks first.** And it asks the *server*, not the browser — finding a token in
storage proves nothing, so GoTrue refreshes the session and the identity is then read back
through the database under its own row-level policies, which can only answer for the account
the presented credential actually belongs to. A confirmed session goes straight to the shell
that account has; a first PIN is still owed before anything else, exactly as on a fresh login.

**How long you stay in: until you sign out.** The lifetime is a setting on the Supabase
project, not a number in this codebase — changing it takes effect for every device at once,
with no deploy. A client that decided when its own credential had expired would be a client
deciding it was still valid, which is the thing this change exists to stop.

**Signing out is now about the device you are on.** It revoked *every* session the account
held anywhere, so signing out of the academy laptop at closing time also signed you out of
your own phone. Both are real server-side revocations; only the reach has changed. Resetting
a PIN still signs out every device, which is the one place that is the point.

**A session that outlives the browser does not outlive the account.** A disabled account met
that check on the way in, when the way in was the only door — it is asked again on the way
back, and a disabled account's session is ended rather than politely refused.

**If the server cannot be reached, nothing is thrown away.** Offline you get the sign-in
screen, and your stored session is left untouched, so the next time the app reaches the server
you are back in without typing a PIN.

*The HttpOnly cookie the request asked for is not here, and the reason is written down rather
than left implicit: this app is a static export with no server on its own origin, and its API
is on another domain — so such a cookie would be third-party and dead on iOS. See ADR-031
and TD-042.*

## Unreleased — Changing what a course says no longer asks to change when it runs

**Rewording a course's message saves again.** Opening *Wording for this course*, tapping a detail
to add, and pressing **Save Changes** was answering:

> this offering has a completed session on 2026-09-07, so a schedule cannot start on or before it.
> Choose 2026-09-08 or later. Nothing has been saved.

Nothing about the days had been touched, there is no date on that form to change, and the wording
was lost with the refusal. Saving a course was re-stating its timetable every single time — for a
rename, a new sender, a different template, a moved follow-up count — and on a day the class had
already been marked complete, re-stating the timetable is rewriting history, which the academy
database is built to refuse.

**Now the timetable is only written when the days actually change.** Everything else on the form
saves on its own. Changing the days themselves is still refused on a day already marked complete,
in the same words, because that one really is a change to what was expected — and it names the
date you can start from.

**The two rows of details no longer offer the same things, because the two fields are not the
same field.**

- **Beside the subject: her first name.** That is the whole row. A subject is read in a list, at
  one glance, next to thirty others — a period, a branch and two session counts neither fit
  there nor help there. Offering them there is what produced
  *"We missed you this week, {{first_name}} {{member_name}}"*.
- **Beside the message: seven.** *Her first name*, *Course*, *Period from*, *Period to*,
  *Sessions due*, *Sessions made* and *Academy* — the seven the academy's own template already
  uses. The other six are figures: her full name, the branch, sessions missed, attendance %,
  missed in a row, last present.

Both rows end in one **More** chip that opens all thirteen, so a subject that genuinely wants to
name the course is one tap away. Nothing was taken away — wording already written with any of
them reads exactly as it did, in the preview and in the inbox. The rows simply stopped putting
thirteen equally-weighted suggestions in front of somebody who came to change a sentence; tapping
along one produced lines like *"RosiFit Academy Main — 0 —"*, every detail correct and the
message worse for each one.

## Unreleased — A member card tells you where she stands; it does not ask you to say

**Present, Absent and Yet to mark are readings now, not buttons.** They sit on every roster card
for the day the week strip has selected, and they report what the register holds:

- the day's file has been uploaded — it shows **Present** or **Absent**, exactly as recorded;
- the class runs that day and no file has arrived — it shows **Yet to mark**, in the same amber
  the day above it wears for the same reason;
- the class does not run that day — it shows **Not expected**, rather than asking you to mark a
  session that never happens.

**Nothing on that row can be tapped, and no attendance is written from it.** The register is
what the uploaded session file says, and a day is corrected by uploading it again — which names
the file already there and waits for you to confirm before it replaces anything.

**The warning is gone with the tap that caused it.** Tapping a chip used to answer "The academy
database cannot record attendance by hand yet", because the change that would have allowed it
was never applied. There is nothing left to decline.

## Unreleased — Reports will answer for a period you choose

**Reports has a Period filter.** It offers the same ranges the Overview and the attendance
register offer — this week, last week, the last four weeks, this month — and a custom range you
date yourself on a calendar. Everything on the screen follows the one you pick: the bars, the
figures, the words under the title, and the spreadsheet when you export it.

**Until now the report only ever answered for the current month.** The month was printed under
the title as though it had been chosen, but there was nothing on the screen to choose it with,
so "how did last term go" was a question Reports could not be asked.

**The filter stays on screen when there is nothing to report.** A period with no uploaded
sessions still shows the Period field above the message, so you can ask for a different one
without leaving the screen.

## Unreleased — Staff run the register, so staff can change it

**Staff can now add, edit and delete a course.** Add Course and Edit Course were already on the
screen for a coach; the database refused them, so the form could be filled in and then declined
on Save. Both work now, and Delete is offered to her too. Changing a course's days from the
offering screen works for the same reason.

**Add Member and Bulk Import are on the Attendance workspace for everyone.** Both buttons used
to be hidden from a coach, and typing the import's address showed her a page explaining that
only the academy admin could import a file. That page is gone with the rule it explained. The
history of who imported what is still the admin's alone.

**The bin on a member's row finally removes her.** It used to say "Removing Priya needs a
confirmation" and do nothing. It now asks — naming what goes and what stays — and then removes
her: she comes off the register and off every follow-up list, her enrolment ends today, and her
email address is freed for whoever holds it next. **Every attendance record she has stays**,
because that is the academy's record of what happened on a day rather than hers.

**What a coach still cannot see or do:** the Overview, Staff & access, the audit log, branches,
holidays, the follow-up rules, the email templates, and anybody's PIN. And nobody can change
anything at all while the subscription is lapsed — that has not moved.

## Unreleased — Uploading over a day you already have says so first

**A day that already has a register now asks before it is replaced.** Choose a corrected
export for a day already imported and the upload says which file is there, that importing this
one overrides it, and waits for **Confirm override**. It used to say it on the result screen —
after the register had been replaced.

**One question, not two.** Pick 3 Sep, choose a file Meet created on 31 Aug, and the same panel
says both things: this file is for 31 Aug, and 31 Aug already has a register that importing
will override. One confirm, and it imports for the file's day — never for the day on screen.

**And an ordinary upload still asks nothing.** No clash, no register already there, no dialog:
the file imports on the pick exactly as before.

**"Overridden" now means it.** A member the first file marked present and the corrected file
does not name goes back to absent, and somebody who was never expected has her record removed
— instead of keeping a present from a file that has been replaced. The one thing an override
never touches is a mark somebody made **by hand** on the roster: the dialog says so before you
confirm, and the result says how many were kept.

**A class nobody scheduled is unchanged and still works:** a file whose day has no session
creates that session, marks it held, and writes present or absent for every member.

## Unreleased — The cursor is already in the first field

**Open a form and you can type.** Add a course, Add member, Add staff, Add holiday, Add
branch, Register, Change mobile, Forgot PIN, Set PIN — the first field holds the caret as the
form appears, so the name goes in without a tap first. The list searches do the same: Members,
Attendance and a course's own member list open ready for the first letter, and a picker with a
search box opens with the caret in it.

**The field it lands in does not move the screen.** A browser scrolls to whatever it focuses,
and not every first field is at the top — the member search on a course sits under the
course's header. The caret is placed without the scroll, so the screen still opens where it
always opened, showing what you tapped.

**One field per screen, and only the first.** The two security answers on Register, the second
field of a two-field form, every field further down: unchanged. Nothing about what a field
does, validates or saves has changed — only where the caret starts.

**Focus is shown on the box now, not inside it.** With the caret arriving on its own, the
browser's own focus ring became the first thing every form showed — and it is drawn around the
inner field, a second rectangle inside the one the app draws. The box takes the accent border
instead, the way the sign-in field always meant to: moved, never removed, because a field with
no visible focus is unusable on a keyboard.

Three layers used to blur whatever was focused whenever they rendered — including while they
were shut, which is how every form renders its pickers. That blur now happens only when a
layer actually opens, and never to a field inside the layer itself.

## Unreleased — Edit course opens on the course, not on an empty form

**The pencil beside a course now opens its form filled in** — the name, the branch, the
weekday chips it runs on, and the follow-up trigger it was saved with. It was opening blank:
the dialog named the course in its own subtitle and then offered nothing but placeholders,
*Choose a branch*, no day selected, and a Save Changes that could not be pressed. Anyone
wanting to change one day of the week had to retype the whole course to get the button back —
and a form that arrives empty is one Save away from replacing a course with whatever was typed
to make it usable.

The form was always waiting for two things: the course itself, and the follow-up rule saved
against it. Yesterday's fix taught it to wait properly, so it could no longer fill itself in
from a course that had not arrived yet. What it did not do was wake the form up when the wait
ended. The rule always lands last — it is fetched with the whole member list behind it — so
the form waited, the rule arrived, and nothing told the form to look again. It sat there empty
for as long as it was open.

Nothing else about the form changed. It still shows a skeleton while it is loading, still says
so plainly if the course cannot be read or is no longer on the list, and still never overwrites
what is being typed when something behind it reloads.

## Unreleased — Welcome a new member: the form says she is being added active

**The Add member form now shows her status** — a toggle, switched on, reading *Active · In
the follow-up rule* — with a line under the heading: *She is added active, so the follow-up
rule reaches her. To make her inactive, add her first, then open her record and use Edit.*

Every member has always been created active. The form simply never said so, and the column it
was quietly setting is the one that decides whether the academy ever writes to her at all —
the difference between a member the weekly follow-up reaches and one it leaves alone. The
answer was there; nothing on the screen carried it.

**The toggle states her status; it does not set it.** It cannot be switched off here, and the
sentence beside it says where it can be: her own record, under Edit, where Status has been a
field since 06-Sep. That is not a shortcut left undone — a member is created in one write that
has no room for a status, so offering the choice on this form would mean a second write after
she already exists, and a second write can be refused on its own. She would be on the register
as active while the form that just added her said otherwise. A form should not be able to tell
that lie about somebody it has only just met.

The word and the icon carry the status, not the position of the switch, so it reads the same
to anyone who cannot see the colour — and the same in both themes. Nothing about editing a
member changed: the Active/Inactive pick on her record, the pill on a course roster, and what
Inactive means (out of the follow-up rule, and nothing else) are all exactly as they were.

## Unreleased — A member is marked present or absent from her own card

**Every member on a course roster now carries three small labels — Present · Absent · Yet to
mark — for the day the week strip has selected**, and tapping one records it. The roster says
which day it means once, under the search box: *Attendance for Mon 7 Sept*.

Until now attendance had exactly one way into RosiFit — a Google Meet export, uploaded and
committed — and **no way to correct**. A member who joined the class from another device was
missing from that file, recorded absent, counted towards the follow-up rule and emailed about a
class she had attended, and nobody could fix it anywhere in the app.

**What the chips will not do is as deliberate as what they will.**

- **Yet to mark is a state, not a button.** It shows when nothing is recorded. Clearing an
  attendance record would be a hole in the register rather than a correction, and the mistake it
  would fix is fixed by tapping the other chip.
- **Absent is refused on a day she was never expected**, and the chip says why rather than
  disappearing: *"Divya Ramesh was not expected on Tuesday 1 September. Mark her present and it
  is recorded as extra."* Marking her present on such a day records **extra** — she turned up
  when nobody expected her, and that never counts as a miss.
- **A day still to come offers nothing.** A class that has not happened has no attendance.
- **A cancelled class and a holiday are refused**, in those words.
- **A chip fills when the write comes back, never when it is tapped.** A register that shows a
  mark it failed to save is worse than one with no chips at all.

Correcting what the upload said keeps what it said: the original status, who changed it and
when are all recorded on the row, in four columns that have existed since the attendance schema
was written and had never been used.

Her *Missed* and *consecutive* figures, the week strip above her, the dashboard count and the
follow-up list all re-read in the same beat — they are derived from attendance, and this is the
first thing that has ever moved it by hand.

**Not live yet.** The write goes through a new database function, `set_attendance` (migration
`0035`), which has not been applied to the academy's database — it needs the raw SQL read and
approved first, and it could not be rehearsed here because this machine has no PostgreSQL 16.
Until it is applied, the chips read correctly and a tap answers honestly: *"The academy database
cannot record attendance by hand yet — migration 0035 has not been applied. Nothing has been
saved."* No permission was widened to make this possible: signed-in users still hold no write
grant on the attendance tables, so a stolen key still cannot forge attendance.

## Unreleased — Her record says whether an email is going, and Reach out asks before it repeats one

**Every member's record now states, in a line of its own, whether the follow-up rule has
flagged her and whether her message has gone.** One of four answers, under her email panel:

- **Rule is met, Email sent** — she was over the threshold and this week's follow-up has gone out.
- **Rule is met, Email not sent yet** — she is over the threshold and nothing has been sent.
- **Rule is met, No email to send** — she is over the threshold and has no address, so she is
  counted but cannot be written to.
- **Rule is not met, No email to send** — the rule has not flagged her. Nothing is owed, and the
  line is deliberately quiet rather than a warning.

**Reach out now writes to the member whose record is open.** It opened a draft for every course
in the academy and left you to find her in it. It opens *her* draft: her name in the subtitle,
her course's stored wording, one recipient. If the rule has not flagged her, it says so with her
name — *"Aarthi Venkat is not over the follow-up threshold for 7–13 Sep 2026. Nothing to send."*

**And it asks before it sends a second identical email.** If this week's message has already
gone to her, Reach out stops on *"She has already had this week's message"*, names the day it
went, and offers **Not yet** or **Reach out anyway**. Writing to her twice is still allowed — it
is now a decision rather than an accident. The label on her record corrects itself the moment a
send comes back, without closing and reopening her record.

**A member already written to is still not ticked when several go at once.** That was already
true and is unchanged; the send draft's counts, its Select all, its confirmation and its
*excluded, counted, not dropped* list all behave exactly as before.

**Known and not fixed here:** the weekly screen's *Reach out to N members* button still opens
on *"The draft could not be loaded"* — it passes no course, and an all-courses send has no
course wording to use. That needs its own decision (TD-033).

## Unreleased — Who is she: the picker shows her address, searches by it, and stops mixing two people up

**The *Who is "…"?* list now prints each member's email address under her name, and finds her by
it.** Type a name as before, or type any address she holds — including an old one the list does
not show — and the box narrows to her. The box says *Search by name or email*, the same words
the roster search on this screen already uses.

**This is the list that could not tell two people apart.** The academy has two members called
Kavitha Ramesh. On a name alone they were two identical rows, and the button under them merges
one member into another: her classes move and her record is retired. Their addresses are on the
rows now, so the person you are about to merge is the person you meant. A member with no address
says **No email on file** rather than showing a blank line.

**And the list no longer shows the wrong rows.** Searching after picking somebody could leave
rows on screen that the search did not match, highlight one name while the sentence underneath
named a different member — three people in one dialog. Two members with the same name were
being drawn as if they were one. They are drawn as two now, and what you tapped is what the
sentence describes.

**Nothing else about the merge changed.** The same two steps — pick, then confirm — the same
warning, the same button, and the same members offered. Course, branch, role and question
pickers elsewhere in the app are untouched.

## Unreleased — Welcome a new member: the branch fills itself, and typing is enough

**A course that runs at one branch no longer asks you to choose it.** The Branch row offers
the branches the chosen course actually runs at, and when there is exactly one it is filled in
for you — the row shows the branch instead of *Choose a branch*, and **Add Member** stops
waiting on a picker with a single line in it. Two or more branches are still a real choice and
still open blank; a course that runs nowhere yet still says so.

**It never moves anyone.** On **Edit member** the branch already on her record is left exactly
as it is, even when her course no longer runs there — the branch is only filled into an empty
field, which on that form means after you change her course. The row is still a picker: tap it
and the list opens as before.

**A display name or an email address now counts as soon as you move on.** Both rows sit beside
a **+ Add** button, and the typed value used to reach her record only if you pressed it — type
an address, move to the next field, and the form had quietly kept nothing, right up to a Save
that discarded it. Leaving the field now adds it, exactly as the button does.

**Exactly as the button does, including the refusals.** A malformed address is still refused
with *That does not look like an address* and left in the box for you to fix, a display name
already on her record is still refused, the first address is still the primary one, and
leaving the field *by* pressing **+ Add** adds it once. **+ Add** and Enter both still work —
this is a third way in, not a replacement.

**A refusal about a display name now clears the moment you start changing it.** When a save is
turned down because the display name already belongs to another member, the message stays under
the form so you can read it — but it used to stay there while you typed the corrected name into
the box above, still naming the old one. Typing a display name, adding one, or removing one now
takes the message off the screen.

**Only that message, though.** A refusal about her email address, her days or her branch stays
where it is while you type a display name — it is a different problem and it has not been read
yet. And nothing here decides anything: pressing **Add Member** still asks the academy database
again, and it is still the one that answers.

**It also reads as a sentence.** The message opens *The display name …* rather than *the display
name …*. Only that first letter changed — the name you typed is quoted back exactly as you typed
it. Every refusal that can appear in that box now opens the same way, including the one about
changing her status, so the box no longer reads two ways depending on which part of the form was
turned down.

## Unreleased — Add a course: the wording is checked before Save, not by the database after it

**Editing a course's Subject or Message and saving no longer ends in a database error.** A
subject cut to one or two characters used to leave the Add a course dialog offering **Add
Course**, and pressing it returned *new row for relation "course_communication" violates check
constraint "course_communication_subject_check"* — a sentence nobody outside the code can act
on. The limits were real and had always been there; the form had simply never been told them.

**Now the form says so while you type.** A subject needs at least 3 characters and at most 200,
a message at least 10, and a course name between 2 and 80. Fall outside any of them and the
wording card says which, in words, and the footer under **Add Course** says the same — the card
scrolls a long way above the button, so the reason is in both places. Add Course stays off until
it is fixed.

**Leaving a box empty is still allowed and still means the same thing:** the course uses its
template's wording, exactly as **Reset** does. Nothing about what is saved has changed, and no
wording already stored was touched.

**Where a failure does still come from the database, it now arrives as a sentence.** Saving a
course, branch, offering, holiday, schedule or member no longer forwards a raw database message
to the screen. The refusals actually written for a person to read — *she has an email address of
her own*, *still runs 3 courses*, the date a completed session blocks — are unchanged and still
shown word for word.

## Unreleased — Add a course: arrows on the detail chips, so every name can be reached

**The rows of details you can tap into the wording now have a left and a right arrow.** There
are thirteen — *Her first name, Her full name, Course, Branch, Period from, Period to,
Sessions due, Sessions made, Sessions missed, Attendance %, Missed in a row, Last present,
Academy* — and at the dialog's width the row showed five with nothing saying it continued:
no scrollbar, no arrows, only a drag nobody thinks to try. The arrows move the row a page at
a time, keeping a chip from the previous view so you never lose your place, and tapping the
right arrow enough times always reaches *Academy*.

**They are never decorative.** The arrow at the end it points at goes dim and stops
responding, so an arrow that can be tapped always does something; and on a width wide enough
for every chip to fit, neither arrow appears at all. Dragging the row sideways still works
exactly as before — the arrows are a second way in, not a replacement. No detail was added,
renamed or reordered: the thirteen are the same thirteen the send function builds.

## Unreleased — Add a course: the wording opens on its preview

**The Wording for this course card now opens showing only the preview.** Under *Message
template*, the card used to open on the full editor — the Subject box, the tap-to-add chips,
the Message box, more chips — with what a member would actually read at the very bottom. It now
opens on that preview alone, against a real member of the course, with **Edit** on its heading.
Tap Edit and the Subject and Message boxes and their chips appear as before; tap **Done** and
they fold away with whatever was typed kept, and the preview showing it. **Reset** still
appears on the heading whenever the course's words differ from the template, whether or not
the editor is open, and the not-a-token warning is never hidden behind the edit tap. Nothing
about what is saved has changed.

## Unreleased — A member opens as a pop-up over the list, not as a page

**Tap a member and her record opens over the list you tapped her on.** On a course roster, the
member list and the weekly follow-up list, a member used to open as a full page of her own — a
tall coloured header, five big tiles, a card for every session — and the list was gone while you
read it. She now opens as a card over that list, the way every form does, with the list still
visible behind it. Close the card and you are back where you were.

**The same facts, in less room.** Her name, course, branch and joining month are the card's
heading. Expected, Attended, Missed and Missed streak sit side by side in one strip, with her
attendance for the week on the line under them. Her sessions this week are one short list — a
holiday or a cancelled session is still listed and still says it does not count. Her email, or
the note that she has no usable one, is one line. **Edit** and **Reach out** stay at the bottom of
the card, and Edit now says its word rather than being an icon alone.

## Unreleased — Add a course: the follow-up trigger moves up beside the schedule

**Follow-up trigger now follows Frequency.** On *Add a course* and *Edit course* the trigger
section sits directly after the days the course runs and before *From email ID*, so the rule
is set beside the schedule it counts against rather than after the email wording.

**The count sits on the heading.** The separate *Missed sessions in a week* card is gone. The
− 4 + stepper now sits on the right of the *Follow-up trigger* heading; the two rule cards
under it still read the live number. The warning that a weekly count above the days the
course runs can never be reached is kept, shown as one line under the rule cards only when it
applies.

## Unreleased — The Overview reads in one screen: two sections to a row, rings for courses and periods

**Two sections to a row.** On a desktop the Overview's four sections — Attendance, Based on
member, Based on course, Based on period — now sit two to a row instead of stacking one under
the next, so the whole picture is on one screen rather than a long scroll of one chart at a
time. On a phone they stack exactly as before.

**Based on course and Based on period are rings.** Each course, and each part of the period,
is drawn as a small ring — present in green, absent in red, the percentage in the middle and
the counts under it — the same ring the Attendance section draws for the whole academy. The
dot plot on a shared scale and the line over time are gone; every ring on the screen now means
the same thing. A course or a day with nothing scheduled shows a dash on an empty ring, never
0%. The numbers behind the rings are unchanged: they are still counted from the one member
list every figure on the Overview reads.

## Unreleased — The course and branch lists open under their field

**Choosing a course or a branch no longer slides a sheet up over the form.** On **Welcome a new
member** and **Edit member**, tapping Course or Branch now opens the list directly under that
field, as wide as the field, with the rest of the form still in view around it — the way
**Joined on** already opens its calendar. Tap a course and the list closes with the course in the
field; tap beside the list and it closes with nothing changed. The chosen row still says
*Selected*. A short list is just the list: the search box appears only when there are more than
seven choices to narrow.

**The same for the role label on Add staff and the two questions on Register.** The role list
keeps its search box, because that is where a new label is typed in and added. On a phone, where
there is no room under the second question, the list opens above it instead.

Nothing about what the lists offer or what choosing does has changed: changing the course still
clears the branch, the branch list is still the branches that course runs at, and a question used
for the other slot is still withheld.

## Unreleased — Add Member and Bulk Import sit beside Add Course

**The Attendance header carries all three of its actions.** Add Member and Bulk Import used
to be a row of their own between the search box and the course list, two bars stretched
across the whole screen. They now sit beside **Add Course** in the header, in the same
compact style, as one group. On a phone the group drops under the title as a full-width row
that wraps, so no button is squeezed to a single word. Nothing about what they do or who sees
them has changed: Add Member and Bulk Import are still for the academy admin only.

## Unreleased — The course screen: search under the heading, no day card

**The card under the week strip is gone.** Tapping a day on a course's week used to open a
tinted card beneath it — the day's status in words, a sentence about it, and a second
**Upload session** button. The course header already carries **Upload Session** beside Send
Communication, so the card only put a message and a duplicate button in the way. The strip
itself is unchanged: each day still shows its status, still reads it aloud, and still holds
its highlight when tapped.

**Search sits under the Members heading.** The roster search now has its own full-width row
directly under **Members**, at every screen size, and its placeholder says what it does:
**Search by name or email**. It always matched both; on a wide screen it sat at the far right
of the heading row, where it was easy to miss.

## Unreleased — A new member needs an email address

**Add Member now asks for her email address.** Until now a member could be added with her
name alone, and the form said so under its buttons. She would then sit on the register
counted as *excluded from every send* — the academy had nobody to write to. The Email
addresses row on **Welcome a new member** now carries the same red mark as her name, course
and branch, the note under it says she cannot be added without one, and **Add Member** stays
disabled until an address is on the form. This is the rule the member file already follows.

**Editing a member asks for one too.** A member who was created by an attendance upload has
no address on file. Her Edit form now opens with **Save Changes** disabled and the line under
it asking for her email address, and nothing about her — her course, her status, her display
names — is saved until one is added. That is what the two choices after an upload are for:
add her as a new member, or make the name a display name of someone already on the register.

## Unreleased — Staff sign in to the app they actually have

**A staff account no longer sees Overview.** Signing in as staff now lands on **Attendance**,
the academy header carries Attendance on its own, and **Home** in the footer means the
Attendance workspace. Everything else about the shell is exactly the super admin's — the same
academy name and bell, the same `Home · Reports · More` footer with the same three labels, and
Reports unchanged.

**More keeps only what staff can use.** Staff & access and the Audit log are not listed. They
never were for staff — the rows have been withheld for a while — but the screens behind them
could still be reached by typing the address, and doing so now goes to Attendance instead of to
a screen that could only answer with an error. The same is true of Overview itself.

This is the app agreeing with the database rather than a new restriction: the staff list and the
audit log have always been readable by the academy admin alone. **Nothing changed about what a
staff member can do** — the whole Attendance workspace, Reports, Branches, Appearance, Help and
her own profile are all exactly as they were, and the super admin's app is untouched.

## Unreleased — A member can be taken off the follow-up list from her own record

**Active or Inactive is now a field on the Edit member form.** Until now the only place
anybody could mark a member inactive was the pill on a course roster row — so changing her
status meant opening a course she happens to be on and finding her in the list, and her own
record said nothing about it at all.

It behaves like every other field on that form: pick **Active** or **Inactive**, and nothing
happens until **Save Changes**. Cancel leaves her exactly as she was. Choosing the one she is
not on already puts a line on the form saying what Save will do — she is left out of the
follow-up rule, she is not written to, and picking Active again puts her straight back — so
"Inactive" cannot be mistaken for deleted, unenrolled, or gone. Her enrolment, her sessions
and her attendance history are untouched either way, and the change is recorded in the audit
log against whoever made it.

The pill on the course roster is unchanged and still writes on the tap; both controls go
through the one write path. Welcoming a new member does not ask the question — she starts
active.


## Unreleased — Edit opens on the person you tapped

**Editing a member no longer starts as "Welcome a new member".** Tapping the pencil on a
member opened the ADD form — her name blank, an **Add Member** button — because the dialog
worked out which form it was from a record it had not finished fetching. It now says **Edit
member** from the moment it opens: while her record is on its way it shows a skeleton with no
Save, a read that fails offers **Try again**, and a member who is no longer on the register is
told so instead of being quietly offered as somebody new. A Save taken in that state would
have created a second copy of a member already on the register; it cannot be reached at all
now until her record is in hand.

The same three answers were given to **Edit course** — which could open blank when the course
list arrived last, and stay blank — and to **Edit an offering**, which turned into "Add an
offering" if the offering had been removed while the screen was open.


## Unreleased — One calendar, the same size everywhere a date is chosen

**The month no longer arrives cut off.** The calendar used to stretch to fill whatever
it opened inside, which on a wide screen made a single day a 260-pixel tile and pushed
all but the first row of the month out of sight — most visibly in the Overview's
**Custom range**. Every day is now the same size wherever the calendar opens, on a
phone and on a desktop: the whole month, and only the month.

**A date opens under its own field.** Holiday start and end, a member's joining date
and a course's "these days apply from" used to slide a sheet up from the bottom of the
screen; they now open a small calendar just under the field you tapped. Near the edge of
the window it moves back inside, and near the bottom it opens upwards. Nothing is dimmed
over the form, **and the form no longer goes blank behind it** — the card that holds a
form was capped at 90% of a viewport it measured as zero for as long as any picker was
open, so it collapsed to a 2px sliver and clipped the form away. It is not capped at all
until there is a viewport to be 90% of, which also fixes the blank screen you got by
refreshing the page with a form open, or opening a form's URL directly (TD-021).

**The month name opens the months and the years.** Tap "September 2026" for a list of
the twelve months and a year to step through — a joining date four years ago is three
taps instead of forty-eight.

**The month keeps one shape.** The grid used to draw only its own days and leave the
space before the 1st blank, so it was five rows in one month and six in the next and
the Clear and Today buttons under it moved by a whole row between them. It is six
weeks every time now, and the days either side are the neighbouring months' — greyed,
and tappable, so a date at the turn of the month is one tap rather than a step and a
tap.

**The month steps up and down.** The month and year sit at the left of the header with
the two arrows together on the right, so the name starts in one place instead of
shifting as its length changes.

Nothing else about choosing a date changed: the week still starts on Monday, Clear and
Today are where they were, and a date a form will not accept is still shown and still
unpickable rather than missing.

## Unreleased — Choosing the attendance file is the whole upload

**The file imports the moment you choose it.** The step bar is gone and so is the
`Import N rows` button: `/upload` asks which course, you pick the Meet CSV, and what
comes back is the result. The preview-then-commit split behind it has not changed —
every row still lands in one transaction — what went is the stop in between.

**The result is two numbers: with email, and no email.** *With email* is a name the
register matched to a member who has an address on file; *no email* is everybody else
who landed — a member with no address, plus every name the register did not know,
which is added to the course as a new member. Each number says where that group is
now, so there is nowhere to go and check.

**Two members sharing a name no longer stops the import.** She is filed as somebody
new rather than linked to a guess, and appears in the **No email** group where
"Add display name to existing member" folds her into the real member and carries her
attendance across. A wrong link looks exactly like a right one; a wrong create is a
name you recognise, two taps from being undone.

**Whoever ran the class is left off the register.** A Meet file lists everybody who was
in the call, and the instructor is not a member — so `csv-import` now sets aside any
row whose name matches a staff name before matching, and says whose. Without it she
would be created the first week and marked present in every register after that.
*This half needs the `csv-import` function deployed; until then such a row imports as a
new member with no email.*

**Upload Session is on every day of the course week strip**, not only on a day already
waiting for a file. A class arranged on the day had no way in at all.

**A file from another day says so before it is imported.** Open 6 Sep, choose a 31 Aug
export, and the screen says it will update the **31 Aug** register — and on confirm
that is the day it imports for. The day has always come from the file; now it is asked
rather than discovered afterwards.

## Unreleased — The Overview answers four questions, and the filters take more than one answer

**The two tabs at the top of Overview are gone, and Branch is a filter like the
others.** "Academy wise / Branch wise" and the Branch dropdown were two controls
for one fact — academy-wide IS the branch filter with nothing chosen — and the
Branch field only appeared once you had already found the right tab. The filter
row now reads **Course, Period, Branch**, and it is always all three.

**The filters take checkboxes, so they take more than one answer.** Tick two
branches and every figure on the screen is those two together; tick none and it
is the whole academy. The field says which — "All branches", one branch by name,
or "2 branches" — and the caption under each chart says the same thing in
words, because it is generated from the same selection the figures are counted
from.

**"Not expected" is no longer a category.** The ring shows **Present** and
**Absent** and nothing else, and its percentage is now the share of what was
actually expected of the members being counted. That is what made the third
segment unnecessary rather than merely unwanted: it only ever existed to stop a
member on a four-day schedule reading as two sessions short of a six-day week,
and she now reads at her own attendance instead.

**Three sections, three charts, one set of numbers.** Under the ring the screen
answers three different questions and draws each with the mark that suits it:

- **Based on member** — a ranked bar per member, lowest attendance first, six of
  them, with the whole list still on Reports. The bar's length is her session
  count, so a member due at ten does not look like a member due at three.
- **Based on course** — every course as a dot on one shared 0–100% scale, so the
  spread down the column is the finding rather than four lengths to compare.
- **Based on period** — the period split into its own parts (a day each for a
  week, a week each for a month) and drawn as a line, with the period's own
  figure as the line to read it against. A stretch with nothing scheduled leaves
  a gap in the line instead of dropping to zero, because those are different
  facts.

Every one of them is counted from the same member list, narrowed the same way.
The period line asks the same query as the ring, once per part, over ranges that
join up exactly — so the points add back up to the ring rather than answering a
second question with a second number.

A summary row under the ring carries the three counts worth knowing at a glance:
how many members are in the figures, how many courses they span, and how many
the follow-up rule has flagged — that last one opens the weekly review.

## Unreleased — The member import is a dialog, and every imported member has an address

**Bulk Import opens over the screen you were on, not instead of it.** It used
to be a page: press Bulk Import and the workspace you were importing into was
replaced by a window of its own for the whole of the import. It is a pop-up
over a dimmed backdrop now — the same shape Upload Attendance already has —
so the list you are adding people to stays behind it, and the close in the
corner or a tap beside the card puts you straight back on it. Nothing about
the import itself changed: same link, same buttons, same words.

**And the result arrives in that same card.** Choosing the file used to open a
second dialog on top of the first when it finished — two cards, two dimmed
backdrops and two ways out for one action. Now the card you started in turns
into **Import complete**, with the file name under the title and one **Done**.

**The rows that did not import are on that card, and still downloadable.**
Each one is named with what happened to her and the row number in your
spreadsheet, so a handful of refusals needs nothing else. **Download these
rows** is under the list for the files where that is not enough — two hundred
refusals in a five-hundred-row import is not a list anybody scrolls, and the
fix happens in the workbook anyway. Either way: fix those rows in your own file
and choose it again; the ones that imported are skipped next time, not
repeated.

**Every member in an import file needs an email address.** A row without one is
not imported: it is counted under **Failed**, named on the Import complete card
with the reason, and carried into the error report so it can be fixed in place
and the same file imported again. The template already asked for the address in
its instructions and in the Email cell's own prompt — what changed is that the
screen no longer says the opposite. The help behind **What the file needs** used
to read "Only her name is required"; it now says her name and her email address
are both required, and the refusal on a nameless row names both cells too.

This is about the member file only. A member already on the register with no
address still has her attendance imported, is still counted in the reports, and
is still excluded from sends with the reason shown.

**Choosing the file is still the whole import.** Nothing to approve, nothing to
preview: the file is read, every row is judged, the ones that can be written are
written, and the Import complete card says what happened — Imported, Skipped,
Failed, No course. The description of the screen that still promised a preview
and a confirm step was the last thing describing an import that no longer works
that way.

## Unreleased — A course fits on the screen again

**The course page opens on the work instead of on its own name.** The name used
to be printed twice — once as a `Courses → Postnatal` line and again as a
banner underneath — above two more rows of branch and schedule. It is said once
now, at heading size, with the branches and the days it runs on the line below.

**Send Communication, Upload Session and Add Member sit together.** They were
three separate places: Send was up in the header, Upload could only be reached
by finding a day that was waiting for its file, and Add Member was a wide bar
pinned across the middle of the page that followed you as you scrolled. They are
one group at the top now. On a phone they stack full width; on a desktop they
line up on the right of the course name. Every one of them still goes exactly
where it went before, and the day that is waiting for a file keeps its own
Upload button — that one arrives already knowing which session it is.

**The back arrow and the date arrows can no longer be mistaken for each other.**
There is one back arrow, beside the course name, and it means leave this course.
The date arrows are smaller, squarer and sit at the two ends of the week strip,
where the thing they move actually is.

**A key to the day icons, beside the week it explains.** Present, Absent,
Awaiting upload and Not expected, in one line.

**The roster has a search box.** Type part of a name or an address and the list
narrows; the count beside the heading follows it, and clearing the box brings
everybody back. It searches the members already on this course — nothing is
re-fetched, and no filter you had set is changed.

**Everything got shorter.** The date cards, the day panel, the member rows and
the spacing between them all lost the padding they did not need, and long email
addresses now end in an ellipsis instead of pushing the Active pill and the edit
button off the side of the card. Nothing was removed from the page: the branch
filter, the follow-up rule, the members with no email on file and the two ways
to resolve them, the delete, and every loading, error and empty message are all
still there, saying the same things.

## Unreleased — A member's days are already on the screen, in colour

**The day chips now show which days are actually in force, filled in the same
accent the course form uses.** Adding a member, every day her course runs is
already on the moment you pick the course — take off the ones she will not
attend, and if you leave them all on she simply follows the course. Nobody
re-picks days the course already states.

**Editing a member shows HER days, not a blank row.** A member who attends two
days of a four-day course opens with those two filled and the other two
available; the line above the chips says they are her own days and what
clearing them means. Before this, the row opened empty however many days she
was on — and saving that empty row quietly put her back on the whole course
timetable, so correcting somebody's email address could change the days she was
expected.

**Picking the course or branch you already had picked no longer undoes
anything.** Re-opening the course list and choosing the same course used to
wipe the branch and blank out every day, with nothing to bring them back. The
same was true of the course form's message template: choosing the template
already shown threw away the wording written for that course.

## Unreleased — Every form says which fields it will not do without

**A red asterisk now sits beside every field a form cannot be saved without.**
Course, branch, days, name, mobile number, start date, the answer to a security
question — whichever ones a given form waits for, it says so before you start
filling it in, rather than greying out the button and leaving you to work out
which box is the empty one.

**What is marked is decided by the form itself.** The asterisk goes exactly
where the save is already blocked, so a field without one really can be left
empty: the end date of a one-day holiday, a member's joining date, a staff
member's role label, the times an offering runs, and — as before — the email
address on the registration form.

**The mark does not depend on seeing red.** It is an asterisk first, and it
reads out as the word "required" to a screen reader.

## Unreleased — Uploading a register is two choices and a list

**The upload is no longer four steps and a second screen.** It is Course, File,
Import. The spinning "Matching names" ring is gone — it was an animation of a
network call — and so is the review that walked you through one name per screen
before anything could be written.

**Choosing the file starts the read.** There is no "Process" button any more:
picking the register was already the instruction, and the button just asked you
to say so twice. The card shows *Reading…* while it works, and what the file
says it is — meeting code, date, course — now sits with the Import button,
where checking it can still change what you do.

**Everything the file can resolve on its own is simply imported.** A name that
matches a member is marked present without being mentioned. A member with no
email address is marked present too, counted in one line, and listed under
**No email** on her course — where an address belongs — instead of interrupting
the import to ask about her.

**The names that do need you are one list, one tap each.** Each row shows the
name exactly as the file spelled it, and the answers beside it: the member it
probably is (already chosen, with her course and branch, so you are checking
rather than searching), **New member**, or **Not a member** for the instructor
and anyone else who was in the call but is not on the register.

**One thing still stops the import, on purpose.** When two members carry the
same name, nothing is chosen for you and the Import button waits. RosiFit has
never guessed which of two women was in the class and it still does not.

**"Add display name to existing member" now moves her attendance too.** It used
to save the name and nothing else — which taught future files the right thing
and left the current one wrong, with the class marked against a duplicate and
the real member marked absent. Picking the member she is now moves her
attendance across, moves her other display names, and retires the duplicate.
The dialog says all of that before you confirm, opens at the top of the screen,
and has a button to press — tapping a name no longer commits it.

## Unreleased — Sending is a list of people, and it says who already got one

**You now tick who gets the email.** The send dialog lists the members the
week's rule flagged, each with a box, and sends to the ones that are ticked.
Everyone who has not already been written to starts ticked, so the ordinary
send is still one tap — but a member you would rather not mail this week is now
one tap away from being left out, instead of impossible to leave out.

**A member who has already had this week's message says so on her row**, with
the date, and her box starts empty. Writing to her twice is still allowed; it
just has to be meant now. Nothing on the screen used to say it had happened at
all, even though every send has always been recorded.

**The template no longer takes up half the dialog.** The wording is the
course's — it is written there, it is the same on every send, and it could not
be changed from this screen anyway. One line says so and points at where it
lives. What is left is the thing you actually decide: who receives it.

**Sending fewer people than the rule named now says so out loud.** The heading
counts what is ticked out of the whole flagged list, and the confirmation names
how many flagged members will not be contacted and how many are getting a
second message this week. A member with no email address is still listed by
name with her reason, and still counted in every figure.

## Unreleased — The import file checks itself, and stops asking for a date

**Every column in the member import template now refuses a bad cell.** Course
and Branch were the only two that did, so a one-character name or an address
with no @ in it went into the sheet quite happily and only failed once the
file reached RosiFit — one round trip per mistake, on a file that may carry
500 rows. Full Name, Email and Display Names now stop the cell where it is
typed, and each says what it wants when you click it.

**Display names are separated by commas**, and the column header says so —
"Display Names (separate with commas)". It used to be a semicolon, mentioned
on the instructions sheet and nowhere near the column itself. Files built from
the old template still import: a semicolon is still understood.

**No Branch column unless you have more than one branch.** A dropdown with a
single entry in it is a question whose answer is already known, and it was
being asked on every row. Where the column is gone, each member joins the one
branch her course runs at.

**Nobody is asked for a joining date any more.** The Joined On column is gone
and every member a file imports joins on the day it is imported. It is the
answer that was right nearly every time, and it was the one cell you could
write in the wrong shape.

**"What the file needs" is now a pop-up.** The description of the file and the
table of what each column means used to sit on the screen above the two
buttons — read once, scrolled past every time after. It is a dialog over the
screen now, in the place the rest of the app puts an explanation.

## Unreleased — Registering is one form, and it says what it needs

**The registration form no longer has two steps.** Your details and the two
recovery questions used to sit on separate tabs behind a progress bar, so half
of what registering asks for was on a screen you could not see. It is one form
now. The two tab names stayed on as headings, so nothing moved that you would
have to hunt for.

**"Academy you administer" is gone.** The academy is RosiFit. The box was
asking a question with one answer — and it was never sending that answer
anywhere.

**Every field you have to fill now carries a red asterisk**, and a screen
reader says "required" out loud rather than leaving it to the colour. Email
carries neither: it says "Optional." underneath, because it always was.

## Unreleased — A member can be marked inactive, and two rows lost a floor

**Marking somebody inactive now exists.** Tap the Active pill on her row in a
course and she comes off the follow-up rule: she stays on the roster, her
attendance goes on being recorded, her enrolment and her history are untouched
— but she is not listed for follow-up and nothing is sent to her. Tapping it
again puts her straight back. It is recorded in the audit log, with your name
on it.

That pill used to be read-only, and it was not even reading the right thing:
it said "Inactive" for anybody the week expected at nothing, which is a fact
about her schedule, not about her membership. The academy database has always
had a status column for her, and the query that decides who gets an email has
always insisted on it being active — so a member could have been off the
register in the database with the app cheerfully listing her. Both ends now
read the same column.

**The week arrows moved to the dates.** On a course, the back and forward
arrows now sit at either end of the seven day cards rather than on a row of
their own with the week written between them. The week is stated above them.

**Edit and Delete moved onto the row.** On the course list, and on each member
of a course, they ride the row they belong to instead of a separate strip
underneath it — so a course card and a member card are each one line shorter,
and Edit is beside the status it belongs next to.

**Bulk Import is gone from a course's Members heading.** It was never the twin
of Add Member: one opens a form already scoped to this course, the other opens
a file flow with its own screen and its own per-row verdicts. It is unchanged
on the Attendance tab, where you choose the course. **Add Member is now
pinned** — scroll a long roster and it stays at the top of the list instead of
disappearing upwards.

## Unreleased — Her days start on, not off

Add a member, choose her course, and the days that course runs are already
ticked. Take off the ones she will not attend; leave them as they are and she
simply follows the course — which is what an empty row meant before, so
nothing about how she is expected has changed.

Leaving them all on is not the same as ticking them all yourself. A member who
follows the course keeps following it: change the course to run on Tuesday
instead of Monday and she moves with it. Take even one day off and she has a
schedule of her own from that day on, and the course's changes no longer reach
her.

Changing her course or her branch re-ticks the new days rather than clearing
the row.

The Edit form is unchanged.

## Unreleased — A form now opens over the screen you were on

Open Add Member, Add Course, Upload attendance or any other form and the
screen you opened it from is still there behind it, blurred. It used to
disappear behind a flat black panel, which made a form feel like somewhere you
had travelled to rather than something you were doing to the page in front of
you.

Nothing about the form itself has changed — same size, same place, same
buttons, same words. Only what is behind it.

## Unreleased — Continue checks the number

Type your mobile number, press **Continue**, and RosiFit now checks it before
asking for a PIN. A number it knows — the academy admin's, or a staff
member's — opens the PIN screen as before. A number it does not know opens
**Register your academy** instead, with the number already filled in, rather
than sending you to a PIN screen no PIN could ever pass.

You still type your PIN. Continue only decides which screen comes next; it
never signs anyone in on a number alone. After the PIN, nothing has changed:
the admin lands on the app, a staff member signing in for the first time is
asked to pick her own PIN first, and a staff member who already has one lands
on the app too.

If the check cannot be made — no signal, or the server is unreachable — the
screen stays where it is and says so. It does not guess.

The registration form has gained a **Back** button on its first step, because
a mistyped digit can now land you there.

## Unreleased — Appearance, rebuilt

Three numbered steps, because two routes to one setting read as two unrelated
controls without ordinals: **1. Choose a preset colour** (six swatches, tick
on the active one) → *or* → **2. Choose a custom colour** → **3. Light or
dark**.

The custom step gains a saturation/value field beside the hue rail and the
hex box, the four derived shades named (Accent, Tint, Header, Avatar), and the
**measured** ratio printed rather than promised — "Now #148514 · white text
4.8:1".

**Every route contributes a HUE and nothing else**, and that is guardrail 2
rather than a limitation. `customAccent()` darkens the hue until white text
clears 4.5:1 and `check-contrast.ts` sweeps all 360 positions in both themes;
a picker that stored its own saturation and lightness would walk straight
round that sweep. The note under it promises "no custom pick can fail
contrast", and this is what makes the promise true rather than hopeful — type
a pure green and it ships as `#148514`.

The Preview is now a card that reads like a real screen: an accent app bar
with the academy name and a bell, "Welcome back", three stat tiles, a "Needs
you" card with a filled button, and a mini tab bar — all recolouring with the
chosen accent and theme.

The theme picker offers Dark and Light, as the canvas does. `system` is still
honoured by ThemeProvider and by any preference already stored against an
account, so nobody who has it saved is stranded; it is simply not offered as
a new choice.

`app/appearance.tsx` drops from 11 hardcoded colours to 3 — the white and
black ramps a colour field is literally made of.

---

## Unreleased — a course decides its own message

The canvas moves a course's sender, template, wording and follow-up trigger
INTO the course form, and says so in its own caption: *"A course's message
wording, sender and follow-up rule are edited in the course form itself —
there is no separate Message Templates or Follow-up Rules screen in
settings."* Nothing in the schema could hold most of it.

**0021** adds `course_communication` — a course's sender, the template it is
based on, and wording that is NULL while the course still uses the
template's — plus `effective_course_message()`, the one resolver the form's
preview, the read-only send draft and the batch all read.

**This is not a free-form send path.** Guardrail 5 and C-68 both hold: the
wording is authored against the COURSE, in advance, as a row. `send-followups`
still takes a `template_id` and `email_batches` still snapshots what it sent.
A person can change what a course will say *next* time; nobody can change
what this batch says while sending it.

**0022** `save_course` does the whole dialog as one transaction. Seven fields
land in five tables and `offering_schedules` has no direct write policy at
all, so a client-side sequence that failed half way would leave a course with
no offering, or an offering with no schedule — expected at no session, in no
follow-up list, counted by nobody. That is RC-008's shape one level up.

**The send flow is one read-only draft per course.** No template picker, no
per-member checkboxes. The recipients ARE the follow-up list; ticking a subset
made the rule advisory, and nothing recorded who was skipped or why. Now the
rule decides and the exclusions are listed by name (C-76).

**Deleted:** `app/templates.tsx`, `app/course/rules.tsx`, `app/send/review.tsx`.
The course form also loses start/end time, fee, short code, offerings-as-
schedule and the tap-to-insert token row.

**Two defects caught while building it.** The stored templates use
`{{double_brace}}` tokens — that is what the Edge Function renders — and the
first preview filler assumed single braces, turning `{{first_name}}` into
`{Divya}`. And extracting the recipient split closed a require cycle the
typechecker could not see, because the imports that had hidden it were
type-only.

**Known consequence:** `09_grants.sql` now fails a third way. It is a
whitelist scoped to "0002–0010" and cannot know about a table added by 0021.
The new grants are asserted in the new spec instead, since test files are
append-only.

**Still outstanding:** the Appearance rebuild (saturation/value field, the
numbered third section, the live app-preview card), the sign-in
single-button lookup, and the course-detail cleanups.

---

## Unreleased — the shell the canvas actually draws

The previous pass built the canvas' new SCREENS and missed its NAVIGATION.
The header carried five scrolling chips and a branch dropdown; the canvas has
two underline tabs and no branch control, and says so in its own words:

> "Overview and Attendance are the two tabs under the academy name;
> Home · Reports · More sit in the footer. **Branch is a filter, not a header
> control.**"

That caption — the prototype's own "Where to tap" — turned out to be the
missing specification. It was found by RUNNING the prototype rather than
reading its markup: `design/support.js` loads React from unpkg, which this
environment blocks, so React 18 was vendored from the npm registry and the
whole design driven in a browser, screen by screen, against the app.

**The shell.** Two tabs (Overview · Attendance) as an underline row, the
tagline back in the subtitle line the branch label had taken, and a settings
gear where the + add sheet was. Attendance is a SECTION — the tab is active
for the course list, a course's detail, the members list, the weekly review
and the register alike. Fixed on the way: `href: null` on the courses route
made it un-switchable, so every attempt to reach it STACKED a second copy of
the whole shell instead of switching.

**Reports draws bars, not rings.** The bar's length is itself a figure — "Bar
length = sessions scheduled" — so courses are comparable down the column. The
hero gradient and the week-by-week table go, because the canvas draws
neither. Two defects were caught before shipping: the canvas is a dark-only
prototype and its bar-count ink measures 2.91:1 on the LIGHT green, and a
zero-width segment still drew a 5px stub, so a course with nothing scheduled
showed a sliver of data that did not exist.

**More lists seven rows, not thirteen.** Follow-up rules, Message templates,
Language, First-time PIN setup, PIN recovery questions and Super admin
registration all come out; every one keeps an entry point elsewhere, checked
in the tree before the row was removed. Holidays stays: with the add sheet
gone it is now the feature's only route.

**Attendance is the workspace.** The card summarises rather than lists —
branch, frequency, members, who can be emailed, and one sentence on who needs
following up. It uses the app's real rule engine rather than the prototype's
hardcoded `missed >= 4`, never counts a member with no address as needing
follow-up, and says "No frequency days — nothing is expected" ahead of
anything else, because a course with no weekdays is outside the engine
entirely.

**Still outstanding.** The canvas edits a course's branch, days, sender,
template and follow-up rule inside the course FORM — "there is no separate
Message Templates or Follow-up Rules screen in settings" — and that form does
not exist yet. It needs a migration for course-scoped wording and a decision
on guardrail 5. Until then the offerings list and the "Follow-up rules" link
stay on each card as the only routes to them. Add Course is also still a
route rather than the dialog the canvas opens.

**A note on the canvas' own inconsistency:** its caption says Reports has "a
week-by-week trend", and its view-model defines `trendBars` and `trendNote` —
but no markup ever renders them. The drawing wins; the trend is unbuilt and
`useWeekRows` is left in place rather than deleted.

---

## Unreleased — the 3-Sep canvas, and two screens that were not counting

The design canvas was revised on 3 Sep. Six sections are new — **Course detail**, **Delete
course confirm**, **Branches**, **Notifications**, **Confirm send**, and an **Audit log** rebuilt
as a scrollable table — and **Add holiday** is gone from it, its job folded into the calendar's
day sheet. Eighteen existing sections changed too. `design/RosiFit App.dc.html` is updated to
that revision and is the spec the rest of this entry is measured against.

**Branches has a screen.** More offered a "Branches" row that flashed the names in a toast and
went nowhere. It now adds a branch, counts the courses and members at each, and removes one.
**0019** supplies the two things a client must not decide: the unique `code`, derived from the
name by a trigger so two clients adding at once cannot collide, and the refusal to remove a
branch that still has live offerings or scopes a holiday — both would go on affecting sessions
at a branch no read can see. Removal is a soft delete through the policies **0005** already
wrote, so no new grant or policy is involved. 11 assertions in
`supabase/tests/13_branch_add_remove.sql`.

**A real Google Meet export was being refused** — see **RC-009**. `parseMeetCsv` read `lines[0]`
as the header, and a Meet export writes the meeting code and the created and ended times first.
The file was right, the reader was wrong, and the error message blamed the file. Fixed, and the
preamble it now reads past is captured and shown on the upload screen's "Mapped to this
session" panel: the last point in the flow where a wrong file can be caught, since everything
after it matches names without ever looking at which meeting the rows came from. A definite
date mismatch warns; an unreadable or absent date says it cannot check, because warning when
nothing can be checked trains people past the warning that matters.

**Reports was not counting anything** — see **RC-010**. It was asked for an export; every figure
on it was a literal, including the Members scope reading the `MEMBERS` fixture. A CSV of those
numbers would have become a document somebody keeps, so the data source was fixed first. It now
reads the same member rows the dashboard reads, aggregates them in `src/data/report.ts`, and
exports what is on screen — including the words: a row the screen calls "no sessions scheduled"
is not exported as `0%`.

**The dashboard is the chart the canvas draws, and nothing else.** The hero "N members need
you", the "What needs you" list, the quick links, the week table and the week strip are gone.
Each was a second place a figure lived; the week table counted from a different query than the
chart beside it while admitting its own filters did not reach it; and the week strip rendered
`WEEK_STRIP`, a hardcoded fixture, on the live dashboard. Everything removed is still reachable
elsewhere.

**Smaller, from the same revision.** A branch filter on Courses, asking the offerings so a
course running at two branches appears under both. A hex field on Appearance that contributes
its **hue** and nothing else — the generator darkens it until white text clears 4.5:1, so a hex
taken verbatim would walk round guardrail 2; typed as pure green it ships as `#148514`.
Numbered preset/custom headings. A way back from Member detail, which had none, and
`router.back()` on Match review, which had been replacing its history entry.

**Ratchets paid down, not baselined:** hardcoded colours 13 → 11 and test ids 26 → 24 in `app/`.
57 unit assertions added (56 → 113). The DB harness ran for the first time — Postgres 16 is
available in this session — with 215 assertions passing; two pre-existing failures are recorded
in `TEST_SUMMARY.md` and proved pre-existing rather than assumed to be.

**The gate verdict is unchanged: FAIL, as it was on main.** G1/G2/G3 need
`design/tokens.json`, which has never been committed; G6 is blocked because eslint is not a
dependency; G8 runs a `test:functional` script that does not exist. `TEST_SUMMARY.md` says
which classes are therefore unverified.

---

## Unreleased — the three migrations the live project never got

**Add Member fails in the live app.** It says so, at least: *"Could not find the function
public.create_member(p_aliases, p_emails, p_full_name, p_joined_on, p_offering_id, p_weekdays)
in the schema cache. Nothing has been saved."* The client is not wrong — `createMember` in
`src/data/repository.ts` sends exactly the six named arguments **0016** declares. The function
is not there.

**Nor are two others.** Read back from the live schema rather than assumed: the project holds
0001–0015 and stops. `create_member` (0016), the `holidays` triggers and DELETE policy (0017)
and `set_offering_schedule` (0018) are all absent. Three forms therefore fail the same way —
adding a member, deleting a holiday, and giving a course its days — and the last entry below
already said as much about 0018 alone. It was true of all three.

**`supabase db push` cannot place them.** The live migration-history table holds timestamp-named
versions from an earlier apply route (`20260901134714` …) while `supabase/migrations/` is
numbered `0001`…`0018`; the CLI refuses that mismatch outright rather than guessing which is
which. Repairing that history is a decision about the live project in its own right, not
something to do on the way past a form bug.

**`supabase/apply_0016_0018.sql`** is the paste-ready alternative, following the
`supabase/apply_all.sql` convention already in the repo: 0016, 0017 and 0018 verbatim and in
order, inside one transaction, with a PostgREST schema-cache reload after the commit. Run it
**once** — 0017's triggers and policy are bare `CREATE`s, so a second run fails loudly instead
of half-applying. Nothing here is application code; nothing in the app was wrong.

**Still not applied.** Only the repo owner runs it.

## Unreleased — a course can be given the days it actually runs

**Frequency was orphaned intent.** The course form collects "3 sessions per week" and says,
correctly, that weekdays live on the offering — "create an offering, the course at one branch,
and set its days there". There was no such screen, and no write path either: migration 0005
created `offering_schedules`, called it in its own header *the source of expected attendance*,
and deliberately left it with a read policy and **no** insert or update policy, noting that a
schedule write "has to be validated against completed sessions first". The policy was written;
the RPC it deferred to never was. So a course could state a frequency and never acquire the days
that frequency is an intent *about* — no weekdays means no sessions, no expected attendance and
no follow-up. The stepper worked perfectly, which is what made it hard to see: the missing piece
was not the control, it was everywhere the control was supposed to lead.

Migration **0018** `set_offering_schedule` is that write path. It restates the super-admin and
subscription checks inside the function, because `SECURITY DEFINER` bypasses RLS and would
otherwise be a hole straight through the policy the organisation tables carry. It refuses any
`effective_from` on or before the offering's last **completed** session — a completed session has
a frozen expected set, and moving a schedule back over one would leave history describing days
the schedule no longer contains — and it names the first date that would work rather than
silently clamping. Changes **version**: the open schedule is closed the day before the new one
starts. It does not generate sessions; that is a separate decision and this does not quietly make
it. **New screen** `app/offering/edit.tsx`, and in the Courses tab each offering is now the way
in to editing its days rather than dead text pointing at a "there" that did not exist.

**A frequency/weekday mismatch warns and is never reconciled**, which 0005's own column comment
has required from the start and no UI could honour until now. Pick two days against a stated
three and the screen says both numbers stand and attendance counts the two.

**One resolver for "which schedule version is in force".** `fetchCourses` and the new
`fetchOfferings` each carried their own copy of the effective-dating arithmetic and had to agree
by hand. They now share `src/data/schedule.ts`, whose cases caught two real defects in the
inline version they replace: an exclusive `effective_to` leaves the changeover day covered by
neither version — one day on which every member is expected at nothing, with nothing to see —
and a plain overwrite loop lets row order decide which version wins.

**0018 is committed but NOT applied.** The live schema is 0001–0015. Applying it is the repo
owner's call.

## Unreleased — holidays can be removed, and adding one now writes

**A holiday can be deleted.** C-92 has promised since the beginning that removing a holiday
returns its sessions to `scheduled`, and `remove_holiday()` has done exactly that since
migration 0007 — but nothing could reach it. There was no list to delete from, no DELETE grant
and no DELETE policy on `public.holidays`, and 0011/0012 had deliberately taken
`apply_holiday`/`remove_holiday` away from `authenticated`. A holiday could be created and never
removed. Migration **0017** closes it with triggers on `public.holidays` rather than a new grant:
inserting the row marks its sessions, deleting the row restores them, and the two RPCs stay
service_role-only as direct calls, so no staff member can rewrite the status of every session in
a date range. The delete trigger is `BEFORE DELETE` because `sessions.holiday_id` has a foreign
key with no `ON DELETE` clause — an `AFTER` trigger does not merely read worse there, it fails.

**Add Holiday wrote nothing before this.** It flashed `"<name> applied · N sessions marked
Holiday"` and navigated back; N was the literal `14` or `6`, not a count of anything. Same defect
as Add Course (**RC-008**), and the `holiday` row of **TD-012**. It now writes the row, shows the
real impact from `preview_holiday()` — the same query `apply_holiday()` runs, so the number shown
cannot disagree with the number marked — and renders an RLS refusal instead of swallowing it.
The scope list reads the academy's real branches instead of a hardcoded `'Coimbatore'`, and a
scope naming a branch that does not exist is refused rather than falling through to `branch_id
null`, which the column reads as *every* branch.

**Adding a member never saved either** — written by a parallel session, carried in the same
commit. `app/member/edit.tsx` flashed `"<name> added"` and navigated back; her record, her display
names, her addresses and her enrolment existed only on screen. It is an RPC (**0016**
`create_member`) rather than a direct write, and not by preference: `member_enrollments` and
`member_schedules` carry a read policy and nothing else, so a member added by direct insert lands
with **no enrolment** — expected at no session, in no follow-up list, counted by nobody. That is
the same lie one layer down. `create_member` writes her record, her aliases, her addresses with
the first as primary, her enrolment and her optional weekday override in one transaction, or none
of them. Changing an existing member is deliberately still not fixed: that needs an enrolment RPC
that does not exist, so on that path the button is disabled and says so.

**⚠ Migrations 0016 and 0017 are not applied anywhere.** The live Supabase project is never an automated
target without explicit instruction (`CLAUDE.md`), and the local harness cannot run on the
adopting machine (**TD-010**). Until they are applied, the delete button and the Add Member save are both present and
will be refused by PostgREST, because neither the DELETE grant nor `create_member` exists yet.
On screen that reads as a permissions bug rather than a missing migration (**TD-013**).


## Unreleased — the attendance register, and a form that only said it saved

**Add Course wrote nothing.** `app/course/edit.tsx` flashed "saved" and navigated back; there
was no write of any kind behind it. Fixed through `repository.createCourse` / `updateCourse`,
with the RLS refusal rendered rather than swallowed, and every mounted course list revalidated
so a saved course appears because it is in the database. Recorded as **RC-008**, together with
the five other forms in the app that still have the same shape (**TD-012**) — they are unfixed
and now written down rather than waiting to be found one user report at a time.

**Sessions → Attendance.** The month calendar answered "which days ran"; the register people
read answers "who attended what, and when". `app/(tabs)/attendance.tsx` lists attendance facts
grouped by day, filtered by branch, course, status and period (four presets plus a custom
range), with a member/code search. Every figure on it is a count of the rows below it.

**Overview leads the chip row**, so the dashboard is one tap from every other screen rather
than reachable only from the bar at the bottom of a long scroll. The row scrolls now that there
are five chips.

**Upload attendance replaces Add Holiday** as the dashboard's quick action — a festival is
decided a few times a year, an attendance file is due after every session. Add Holiday keeps
its one-tap route from the header's + sheet.

**Date and time pickers** (`src/components/DateTimePicker.tsx`) on the course, holiday and
member forms, replacing free text with a `dd-MMM-yy` placeholder. Values are ISO and 24-hour —
what `date` and `time` columns take — so there is no format to get wrong.

**The screens show the real signed-in user** — written by a parallel session and carried in the
same commit. `useIdentity` in `src/data/session.ts` replaces the `'Priya Menon'` /
`'+91 80563 29742'` literals that the profile, the More card and the change-number screen shipped,
so they no longer show the fixture persona to whoever is actually signed in. More also hides the
rows a staff account cannot read at all — `app_users`, `audit_logs` and `security_questions` are
`is_super_admin()` — while rows staff can read but not write stay visible on purpose.

**Sign Out now ends the session.** Profile and More both called `router.replace('/')` and left the
Supabase session alive, so the next launch walked straight back in as the previous account — the
most user-visible of these three, and a security-shaped one on a shared phone, which is the
deployment this app has. Both now `await signOut()` first. Profile's "Change My PIN" also pushed
`/set-pin` without `?for=self`, taking the first-PIN branch and landing on the dashboard with
"welcome to RosiFit" instead of returning with "PIN updated".

**A JS test suite exists.** `node:test` under `tsx`, `npm run test:unit`, wired into
`npm run check`. Gate step G7 moves FAIL → PASS; TD-005 is partly paid.


## 1.3.0 — CP-21, wide tables

More than three columns means the user chooses which show and in what order, and the choice
persists. Gate step G11 (`audit:columns`, ratcheted), a reference `ColumnControl` +
`useColumnPrefs` in the starter, seven unit cases on `reconcileOrder`, and a review item for the
dynamically-built tables the audit cannot see. Promoted from `academies-dashboard` at n=1 by
owner override — recorded as such in `CANDIDATES.md`.

## 1.2.0 — the adoption-safety release

See `UPGRADES.md` (the canonical per-version entry). Everything found by running v1.1.0
against a real adopted app and a workspace scaffold: the workspace gate and commit guards now
actually run, adopted apps are offered seed files instead of being buried in them
(`--decline` to refuse, `--refresh` to take), the backward-compat gate can no longer pass on
stale results, and Half A now genuinely reaches standalone apps on upgrade.

## 1.1.0 — the evolution release

See `UPGRADES.md` (the canonical per-version entry) and `docs/22-FRAMEWORK-EVOLUTION.md`.
Lineage + upgrade + promotion + fixtures + backward-compat gate; quadruple close-out.
The fixtures caught RC-005 (adoption clobbering) and RC-006 (baseline first-entry loss)
before release.

## 1.0.0

Initial release.

### The process
- Eight-stage SDLC with six gates, and seven track runbooks (feature, enhance, bug, refactor,
  triage, brainstorm, framework update) plus a test gate.
- The learning loop: every root cause asks whether the process should have caught it, and the
  process repairs itself when the answer is yes.
- The rule budget: cheapest workable enforcement level, and a screen checklist capped at 20 items.

### The theme system
- `design/tokens.json` as the single source of truth for every colour and scale.
- Generated CSS custom properties and typed tokens; hand-editing the output is blocked.
- Three-state theme preference (light / dark / system) with no flash of the wrong theme.
- 92 contrast assertions across both themes, all passing, as a build gate.
- Per-theme brand assets, verified to exist, switched by CSS rather than JavaScript.

### The gates
- A generic ratchet engine: adopt any rule today, on any codebase, backlog can only shrink.
- Contrast · theme sync · theme assets · hard-coded colours · test-id coverage · rule coverage.
- A three-valued gate runner where BLOCKED is a verdict and green-by-omission is impossible.
- Seven commit guards with per-guard escape tokens, and an executable proof that each can fire —
  including a type-error ratchet, a case-loss guard, and a guard that holds *process* changes to
  the same test-case obligation as application code.

### The wiring (`.claude/` + `CLAUDE.md`)
- `CLAUDE.md` at the root — binding rules, read before every task, each stating what, **why**, and
  **where it is honoured in code**.
- `.claude/settings.json` wires the commit guards as a `PreToolUse` hook, so they run in **every**
  session — including the ad-hoc fix that never opened a runbook. Committed, because settings that
  live on one machine enforce nothing on anyone else.
- Nine slash commands, written as **pointers to `workflows/`, never copies** — duplicating a
  runbook guarantees two versions, and the drifted one is always the one someone finds first.
- Eleven review sub-agents, each with a scope, a boundary, and a machine-readable verdict.
- A hook-protocol adapter that recovers escape tokens from the **command** at commit time and from
  the **log range** at push time, because a guard must read the same *change* in both modes, not
  the same *string*.
- Nine executable adapter tests: a correct guard behind a broken adapter enforces nothing, and
  looks installed.
- `new-app.mjs` carries all of it into every scaffolded application.

### The starter
- Pure/impure split error taxonomy with a reference unit spec.
- Fail-closed API handler, config with fail-fast validation, signature-based logging.
- Reference migration, cloud-function pipeline, and three test tiers.
