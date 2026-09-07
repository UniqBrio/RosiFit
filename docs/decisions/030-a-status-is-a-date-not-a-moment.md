# ADR-030 — A member's status carries a DATE, and dates follow-up only

**Status:** Accepted
**Date:** 07-Sep-2026 · **Deciders:** this run

## Context

ADR-018 made a member's Active/Inactive a stored fact and gave it the roster
pill; ADR-025 added the same pick to the Edit member form, written by Save.
Both shipped a status that could only ever say one thing: **now**.

`members.status_changed_at` looks like the missing date and is not. It records
when somebody pressed the control — which, under a control that can only mean
"from this moment", is the same instant as the change. Two names, one fact,
and the fact the academy actually holds was missing:

> *"A member is active today but wants to leave next month. The user should be
> able to set a future inactive date. The member should remain active until
> that date and become inactive from that date onward."*
> (`requests/2026-09-07-member-inactive-from-date.md`)

There were exactly two ways to record that, and both are wrong. Leave her
active and remember to come back on the day — the register is then knowingly
false, and the reminder lives in somebody's head. Or mark her inactive now,
and withhold five weeks of follow-up she is still owed.

Two decisions had to be taken, not one: **where the date lives**, and **what
it is a date OF**.

## Options considered

### Option A — Close her enrolment: `member_enrollments.effective_to`
The window is already there, already effective-dated, and
`expected_members_for_session` (0007) already honours it.
· **Pros:** no new column; the date is enforced by machinery that exists and
is tested.
· **Cons:** it answers a different question. The enrolment window decides
**expectation** — which sessions she is due at — so setting it would stop the
register expecting her, drop her expected count, and change her attendance
percentage for every period that straddles the date. 0031 says out loud that
inactive touches no enrolment, session, expectation or attendance record;
this option is that promise broken, silently, by the feature that was meant to
sit beside it. It also cannot express "she is off follow-up but still coming
to class", which is a real thing an academy says.
· **Cost:** ~10 lines, and a rewrite of what inactive means.

### Option B — A second status row, effective-dated like `member_schedules`
A `member_status_periods` table: one row per stretch, resolved by date.
· **Pros:** full history — every status she has ever held, with its window.
· **Cons:** a second list of the same fact, resolved by a second resolver,
against guardrail 1's whole reasoning. `members.status` would either stay and
disagree with it, or go and take `follow_up_candidates()`, six screens and
three specs with it. The academy asked to date one departure, not to model a
membership timeline.
· **Cost:** a table, a resolver, an RPC, a migration through every reader.

### Option C — One nullable column beside the status (chosen)
`members.inactive_from`. `status` stays the **stated** answer; the date says
from when it applies. Her status on a day D is: stated active → active;
otherwise a date and `D < date` → active; otherwise the stated status.
· **Pros:** null means "applies on every day", which is exactly how every row
written before this reads — so no existing record moves and no reader has to
be told about a migration it did not ask for. One derivation, written twice
against each other on purpose: `public.member_status_on` (SQL) and
`statusOn` (`src/data/inactiveFrom.ts`), each with its own spec. The one-tap
pill goes on meaning what it meant, and now says so in the column.
· **Cons:** no history — moving the date overwrites it, and the only trace is
the audit row. Accepted: the audit trigger already fires on the UPDATE and
names the actor, and nothing in the app asks "what was her status in March"
except by way of this same derivation, which answers it from the one date.
· **Cost:** one column, two CHECKs, one function, one replaced predicate.

## Decision

Option C. And the second half, which is the part that will be argued about
again: **the date is a date of FOLLOW-UP, not of membership.**

A member with an inactive date next month goes on being expected at every
session her offering runs, before that date and after it. Her attendance is
recorded, her history is readable, her enrolment is open. What stops on the
day is the academy writing to her. That is what `inactive` has meant since
0031 and this dates it; it does not redefine it.

`follow_up_candidates()` judges on `current_date`, not on the report period's
end: the list drives a send that leaves **now**, so whether the academy may
write to her is a question about today even when the figures beside her name
are a month old. `isFollowable` in the app defaults to the same day, read at
call time so a list left open across midnight does not answer for yesterday.

## Consequences

**A status reading becomes a reading about a day.** The roster pill draws the
selected day — the rest of that card already does — while the tap, its title
and its button are about today, and the confirmation says so whenever those
two differ. The member pop-up reads today. Nothing anywhere may go back to
`member.status !== 'active'`, and a spec asserts that it has not
(`src/components/memberInactiveFromField.test.ts`).

**A member can now be Active on screen with a departure already recorded.**
That is the feature, and it is the one state a reader could be surprised by,
so it is stated rather than left to the day: on the roster card, in the pill's
label, on the Edit form's banner, and on Her details.

**The roster pill now writes a date (today) where it used to write nothing.**
Its present-tense meaning is unchanged; what changes is that a member marked
off by the pill reads as active in views of the weeks before it, which is
true and was not previously representable.

**Not done, deliberately:** no way to schedule a return to active, and no
history of past statuses. Both are inventions past the request, and the second
is Option B waiting to be asked for properly.
