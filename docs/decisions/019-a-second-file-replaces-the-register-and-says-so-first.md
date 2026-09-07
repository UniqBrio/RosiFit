# 019 · A second file REPLACES the day's register, and says so before it does

- **Status:** Accepted
- **Date:** 07-Sep-2026
- **Request:** [`requests/2026-09-07-upload-override-confirm.md`](../../requests/2026-09-07-upload-override-confirm.md)
- **Extends:** decision 022 in the log ([014 · The file imports on the pick](./014-the-file-imports-on-the-pick.md)).
  The import still runs on the pick and still asks nothing on an ordinary upload; what changes
  is the ONE ask that survived, and what the word in it means.

## The situation

Round 3 built one confirmation into the upload: a file whose day is not the day she opened.
It said which register the file would update. It did not say that a register was already
there.

Two things were true and neither was said in time:

1. **A second file for a day already imported REPLACES that register.** The preview has always
   known this — `supersedes` comes back from `csv-import` — but the screen only rendered it on
   the RESULT, as `upload-superseded`, read after the replacing was done.
2. **"Replaces" was not true.** Every name the new file carries was upserted, so anybody the
   two files disagree ABOUT was corrected. Anybody the second file simply does not name was
   not: the absent sweep is `on conflict do nothing`, so a member the first file marked present
   kept that present for ever. She is the reason a corrected file gets uploaded at all — the
   wrong name, the visitor who was never in the class — and she was the one row the correction
   could not reach.

The requester asked for both halves at once:

> *"Allow users to override the attendnace if they are re uploading same csv with modified data
> and show message that you existing data will be overridden. Also if i am uploading attendance
> file by selecting date as 3rd sep and i am uploading a csv file in which date is 31 aug show
> pop up that the uploaded session is for 31aug on upload it will override the 31st aug
> attendance record on click confirm override thats all."*

## The decision

**One ask, carrying both facts, before the write. And the word in it is made true.**

### 1. The preview runs BEFORE the question, not after it

The day-clash was a client-side check, so it could be asked the instant a file was picked. Which
file already holds that day's register is a fact only the server has. So the order changes:
parse → **preview** → ask, if anything is owed → commit.

The preview classifies and stages; it writes no attendance. "Nothing has been written yet" is
still literally true on the panel that says it.

**What this costs:** every picked file now reaches the server once, even one that is then
declined, and a declined ask leaves a `csv_imports` row at `previewed`. That row is inert by
construction — the already-imported check and the supersede lookup both count only `completed`
imports — and a failed commit already left one.

### 2. One ask, never two

The requester's own case is both facts at once, and her instruction on it is four words: *"on
click confirm override thats all"*. So `importAsk()` returns one question carrying both, and
`askWords()` writes it:

| what is true | title | confirm button |
|---|---|---|
| the file is for another day | `This file is from Mon 31 Aug` (round 3's words, byte for byte) | `Import for Mon 31 Aug` |
| the day already has a register | `Mon 31 Aug already has a register` | `Override the Mon 31 Aug register` |
| both | `This file overrides the Mon 31 Aug register` | `Override the Mon 31 Aug register` |

The clash-only wording is unchanged from what shipped. It was approved, and re-writing a string
nobody asked about is a product change nobody approved.

**The day is on the button, not only in the panel.** The requester's word for this control is
"confirm override", and round 3's rule is that the confirm names the day it writes to
(`Import for Sun 30 Aug`) — because the button is the one control she actually presses and the
day is the thing she could be wrong about. `Override the Mon 31 Aug register` is both.

### 3. The register is made to MATCH the file (0037)

`commit_csv_import` gains three statements. After the rows are written, for the session the
import landed in:

- a row an **earlier file** wrote, for somebody **due**, whom this file does not name →
  back to `absent`;
- the same for somebody **not due** (an `extra`) → the row is soft-deleted, because
  `absent_must_be_expected` (0008) forbids marking her absent and is right to: she was never due,
  and "not expected, not there" is no row at all;
- the upsert now carries `import_id`, without which "a row this import did not write" cannot be
  asked.

**Due is asked LIVE**, from `expected_members_for_session`, never read off the row's own
`expected` column. That column is what was true when a file wrote the row, and enrolments move
between one file and its correction: reconciling against the stale copy soft-deletes the row of
a member enrolled since — who IS due — and leaves her with no record at all, which is worse than
the stale `present` it was trying to fix. The revert rewrites `expected` as well, because
`absent_must_be_expected` is a statement about the row and the two have to agree.

### 4. Except a mark a person made by hand

`set_attendance` (0035) stamps `corrected_at` when somebody disagrees with the register — and it
exists precisely because the file was wrong about her. An import silently reverting that would
be a file overruling the person who corrected it, invisibly. So the override skips any row with
`corrected_at`, and any row no file wrote, and the dialog says so before she agrees:
**"Marks you made by hand on the roster are kept."**

That sentence is unqualified, so it needs BOTH halves, and the second was missing from the
first draft of `0037`: the two reconciliation statements skip her, **and the upsert keeps her
status where the corrected file names her again**. Without the second, a member somebody marked
absent by hand — because the file was wrong about her — is put back to `present` by the next
export, silently, since she is named and so appears in no count. The file's own evidence
(minutes, the spelling it used, which file wrote last) is still recorded against her; only the
status is hers.

### 5. What it did is reported

`overridden.{reverted, removed, kept_by_hand}` comes back from the commit and is written under
the result. A promise that existing data will be replaced is worth nothing if nobody can see
what was replaced.

## Options rejected

**Warn AFTER the import, which is what shipped.** It is where `upload-superseded` already lives,
and it needs no reordering. Rejected because a warning that arrives after the write is not a
warning; the requester's word is "message ... will be overridden", future tense, and the whole
of round 3's lesson was that finding out afterwards is the complaint.

**Ask before the preview, from what the client already knows.** No server round trip, no staged
row. Rejected because the client does not know, and cannot: which files have been imported for
an offering is not on any screen. The ask would have had to say "this MIGHT replace something",
which is worse than silence.

**Two dialogs — one for the day, one for the override.** Honest, and each question would be
simple. Rejected on the requester's own instruction: *"on click confirm override thats all"*.

**Leave the database alone and word the dialog around it** ("names in this file will be
corrected"). Cheapest, and it would need no migration on a machine that cannot rehearse one.
Rejected: it makes the screen describe a mechanism instead of an outcome, and the member it
quietly excludes is the exact member the corrected file was uploaded to fix.

**Let the import overrule a hand correction, since it is later in time.** Rejected — see 4.
The two acts are not comparable: a file is a machine's account of a call, and a hand mark is a
person's account of the same class, made in the knowledge that the file was wrong.

**Delete the superseded rows outright rather than reverting them.** Rejected: `absent` is a
fact about the day (she was due and did not come) and it counts towards the follow-up rule.
Only the `extra` — who was never due — has no fact left to record.

## What this does NOT change

The import still runs on the pick with no confirmation when there is nothing to say: no clash,
no existing register, no dialog. The day still comes from the file. One session per offering per
day, one record per member per session, and the commit's all-or-nothing transaction are all
untouched. Nobody's permissions change.

## Not verified

`0037` **has not been rehearsed and has not been applied.** There is no PostgreSQL 16 and no
`psql` on the adopting machine, so `bash db/harness/test.sh` cannot run — the same constraint
that has stood since `0032`. `supabase/tests/29_import_override.sql` is written and unrun.
`csv-import` is also still not deployed. Until both land, the dialog's ask is correct and the
override it promises is the partial one 0026 performs. The result screen reports nothing rather
than zeroes in that state, deliberately: `overridden` is read as optional.
