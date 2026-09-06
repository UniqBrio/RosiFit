# 014 · The file imports on the pick, and the instructor is never a member

- **Status:** Accepted
- **Date:** 06-Sep-2026
- **Request:** [`requests/2026-09-06-upload-imports-on-pick.md`](../../requests/2026-09-06-upload-imports-on-pick.md)
- **Supersedes:** the last of **C-79**'s blocking rule, and the "Not a member" answer
  added under decision 013. Decision 013 stands in every other respect.

## The situation

Decision 013 cut the upload to `Course · File · Import` and deleted `/match`. What it
kept was a step bar and a button:

```
/upload   Course -> File -> Import   ("Import 14 rows", held by D · Ambiguous)
```

The requester came back a third time on the same surface:

> *"When user uploads the csv file directly import data no confirmation just show how
> many student with email and no email and they should be landing in respective
> sections and no need of multiple steps just on click of upload session dialog appears
> user upload files and data is imported."*

Three rounds on one flow is the signal. Round 1 made it a dialog and kept four steps;
round 2 cut it to three and kept a button; each round removed one thing and left the
next one standing. What was actually being asked for, all three times, was that
choosing the file be the last thing the operator does.

## The decision

**1. The import runs on the pick.** `csvPreview` and `csvCommit` still both run and the
write is still one transaction — the split has not gone. What has gone is the stop
between them. There is no step bar, because two choices are not a journey.

**2. The result is two numbers.** *With email* is `counts.matched` — one confident
candidate who has an address on file. *No email* is everybody else who landed:
`noEmail` plus every row filed as somebody new, because an imported member has no
address either. Each number carries the section that group is now in, so "they should
be landing in respective sections" is answered on the screen instead of somewhere to
go and check.

**3. `D · Ambiguous` no longer holds anything.** Two members share the name; the row is
filed as **somebody new**, not linked to either. This is the last of C-79's blocking
rule and it goes for the reason the rest of it went: the two mistakes are not the same
size.

| | what it looks like afterwards | how it is undone |
|---|---|---|
| a wrong **link** | identical to a right one — nothing on any screen says it happened | nothing; it is invisible |
| a wrong **create** | a name you recognise, in the No email group | "Add display name to existing member" — the merge carries her attendance across (0032) |

Confirmed by the requester on 06-Sep-2026, offered against "ask only when it happens"
and "pick the first match".

**4. The instructor is set aside in `csv-import`, before matching.** This replaces the
"Not a member" chip, and the requester is the one who reframed it — asked what should
happen to the instructor now that the chip had nowhere to live, they answered:

> *"if its the instructor then why attendnace for them its only for members right?"*

Which is correct, and made every option on the table wrong. Attendance is for members;
the instructor was only ever an `unmatched` row because RosiFit was reading the file
and not its own staff list. A row whose normalised name matches an `app_users` name is
now set aside before the matcher sees it, named separately from the dropped rows, and
reported on the result screen.

Without it, auto-import creates her the first week and then **matches** her every week
after — marked present in every register for the class she teaches.

**5. The Upload Session button is on every day of the course week strip**, not only on
a day already awaiting a file. Nothing about the import needed the session to exist:
the day comes from the file and `0024` creates the session when there is none. Only the
button was gated.

**6. One confirmation survives, and the requester asked for it by name.** A file whose
day is not the day she opened says so and imports for the **file's** day on confirm:

> *"If user selected different date and uploading csv of different date then show a
> message and i will update the 31 aug record on confirm upload it for that day not for
> the current day i.e 6 sept."*

The day it opened is now read from the **date parameter**, not from a `PendingSession`.
Those exist only for days already awaiting a file, so the requester's own example — 6
Sep, holding a 31 Aug export — never asked anything: 6 Sep is not awaiting, and the file
silently updated the 31 Aug register.

## Options rejected

**Keep the Import button "just for safety".** Three rounds of the same complaint. The
button's protection was already thin: it guarded against the wrong file, and importing
the right one afterwards corrects the register anyway — one session per day is a
database invariant, so a correction supersedes rather than duplicates.

**Ask about names never seen before, so the instructor can be excluded.** Offered to the
requester as the recommendation. Their reply — attendance is only for members — is a
better answer than the question: the academy already knows who its staff are, so nobody
needs to be asked at all.

**Filter staff names on the client.** `app_users_read` (0013) is
`is_super_admin() or auth_user_id = auth.uid()`. An instructor uploading her own
register would read a staff list of one, and the same file would import differently
depending on who pressed the button. It runs with the service role in the function, so
it runs the same for everybody.

**Add a "Not a member" button to the No email group.** RosiFit has no delete-member or
retire-member path at all, so this needed a new migration — and with no `psql` on the
build machine it could not be rehearsed, and therefore could not be applied. Setting
staff aside at import time removes the need for it.

## Consequences

- A wrong file is now discovered after the write rather than before it. It is recovered
  by importing the right one, which supersedes rather than duplicates.
- `csv-import` gained a read of `app_users`. It is the first time the function reads
  the staff table, and it is why this change **has to be deployed** for part 4 to hold.
  Until it is, an instructor's name imports as a new no-email member — today's behaviour
  minus the chip.
- An academy that has never added its staff to RosiFit gets no filtering, because there
  are no names to match. That is the honest failure mode: it degrades to what happens
  today, and it is fixed by adding the staff.
