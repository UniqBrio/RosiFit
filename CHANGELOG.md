# Changelog

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
