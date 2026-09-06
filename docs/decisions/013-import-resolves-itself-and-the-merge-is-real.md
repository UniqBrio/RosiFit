# 013 · The import resolves itself, and "add display name" became a real merge

- **Status:** Accepted
- **Date:** 06-Sep-2026
- **Request:** [`requests/2026-09-06-upload-flow-shorter-no-email-resolution.md`](../../requests/2026-09-06-upload-flow-shorter-no-email-resolution.md)
- **Supersedes:** the blocking half of **C-79** (see below). Decision 009 stands except where it names `match`.

## The situation

Uploading one Google Meet register took four steps and then a second dialog:

```
/upload   Course -> File -> Process (a ring) -> Summary ("Nothing has been imported yet")
/match    one full screen per unresolved row, in order, then "Import the file"
```

The requester's words were *"The upload attendance flow is very lengthy"*, and
*"makes user work mininal"*.

Reading `commit_csv_import` (0014) is what reframed the ask. The server had
never required most of that:

```sql
v_action := coalesce(v_decision->>'action',
              case v_kind when 'matched' then 'accept'
                          when 'noEmail' then 'continue_without_email'
                          else null end);

if v_kind in ('possible', 'ambiguous', 'unmatched') and v_action is null then
  raise exception 'row % (%) needs a decision before this import can be committed', ...
```

**A · Matched** and **B · No email** default to accepted and attendance is
written for both. The screen was asking about them anyway — B got a whole
decision screen whose two options both imported her attendance, differing only
in whether an address was typed in. That was a question with no consequence
for the file being imported, asked once per row, in front of everything else.

So three outcomes were ever really at stake, and only one of them is genuinely
unanswerable by the machine.

## The decision

**One screen, three chips per row.** `/upload` is Course · File · Import.
Every row that needs a person is listed together on the last step, and every
answer is a chip on that row: each candidate the matcher found, then
**New member**, then **Not a member**.

| Outcome | What happens now |
|---|---|
| **A · Matched** | Attendance written. Never mentioned. |
| **B · No email** | Attendance written. Counted in one line — *"N marked present with no email"* — and resolved later, on the course screen, where addresses live. |
| **C · Possible** | The one fuzzy candidate is **pre-selected, on screen, with her course and branch under it**. One tap moves it to New member. |
| **D · Ambiguous** | **Nothing pre-selected, and it holds the Import button.** Two members carry the name; the import has never guessed and does not start here. |
| **E · Not found** | **New member**, already selected. She lands in the No email group. |

`app/match.tsx`, its route and `pending.ts`'s `StagedImport` hand-off are
deleted. The progress ring went with them: it was a timer advancing 7% every
70 ms while one request was in flight, and a 900 ms `setTimeout` pretending to
be work when no project was configured.

**And "Process" went too.** Choosing the file starts the read. The button
asked her to confirm a file she had just named, with nothing in between to
change her mind about, and it only ever had one answer. The wait is said on
the file's own card — *Reading…* — and the "Mapped to this session" panel,
which is the check for *is this the right file*, moved to sit above the Import
button rather than above a button that no longer exists. It still renders on
the file step in one case: a file with no "Created on" line has no day to
import into, never reaches the import step, and that panel is what says so.

**And "Add display name to existing member" became a merge.** This is the half
that is not about length at all, and it is the half that would have shipped a
wrong register. E now auto-creates a member, so the file marks *"Rani Sham"*
present. Saying afterwards that "Rani Sham" is a display name for Rani used to
insert one row into `member_aliases` and stop — teaching the matcher the
spelling for every future file while leaving this one saying that Rani, who
came to class, did not:

```
Rani Sham   present   <- holds the attendance
Rani        absent    <- still expected, never marked
```

`merge_member_into` (0032) does the whole act in one transaction: the stray's
live attendance moves to the target, the target's own record wins where both
were in one session (`attendance_unique_live` allows exactly one), her display
names move and her name becomes one of them, her enrolments end, and she is
soft-deleted. `supabase/tests/25_merge_member.sql` asserts each of those.

## What this reverses, said plainly

**C-79's blocking rule.** `docs/RosiFit_Implementation_Plan_V2.2.md` §6.2
records C, D and E as **blocking the import**. C and E no longer block. The
five outcomes themselves survive intact — the classifier is untouched, and
each still carries its letter, its word and its icon.

The guarantee that is kept is the one that mattered: **the import still never
guesses between two members with the same name.** D blocks, alone, and says
why.

The guarantee that is given up is that a fuzzy match is never accepted without
an explicit act. It is now accepted by *not being changed* — but it is on
screen, named, with her course and branch beside it, and one tap moves it.
The requester chose this, shown the trade, on 06-Sep-2026.

**Atomicity is NOT reversed.** The intake file said it was; reading 0014
showed otherwise. The commit is one transaction either way and the whole file
still imports together. What went is the review, not the all-or-nothing write.

## Options rejected

**Auto-create for C and D as well, and let the No email group clean up.**
The shortest possible flow — upload, done. Rejected: D means two members
already carry that name, so auto-creating manufactures a third, and the fix
for it is a merge somebody has to notice is needed. A flow that is minimal
because it defers its errors is not minimal, it is deferred.

**Keep `/match` for the hard rows only.** Rejected: a second route reachable
only sometimes is two ways to do one thing, and the register would have to
explain which one you get.

**Ship the alias without the merge.** Rejected outright. It is the shipped
behaviour that this decision makes actively wrong: once the importer creates
members, an alias-only link leaves attendance on a record nobody looks at.

**Drop "Not a member".** Tempting, and it was gone in the first draft of the
change. Restored on review: the instructor is in every single Meet file, and
without it the academy grows a new member every week for the person taking the
class.
