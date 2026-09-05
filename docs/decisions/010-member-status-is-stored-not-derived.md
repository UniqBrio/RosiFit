# 010 · A member's Active/Inactive is STORED, and the engine's own column is the one that is stored

- **Status:** Accepted
- **Date:** 05-Sep-2026
- **Request:** [`requests/2026-09-05-inline-actions-and-member-status.md`](../../requests/2026-09-05-inline-actions-and-member-status.md)
- **Supersedes:** nothing

## The situation

The course roster drew an Active/Inactive pill. It was computed, in the render
body, as:

```ts
const inactive = member.expected === 0;
```

Separately, `public.members` has carried since 0006:

```sql
status            text not null default 'active'
                    check (status in ('active','paused','inactive')),
status_changed_at timestamptz,
```

with `create index members_status on public.members (status) where deleted_at is null;`

and `public.follow_up_candidates()` (0009) has read it since the day it was
written:

```sql
where m.deleted_at is null and m.status = 'active'
```

Nothing in the application had ever written that column, and nothing had ever
read it — `fetchMembers` selected it and dropped it on the floor. So there
were two different things both called "inactive":

1. the pill, which meant *the week expects her at no sessions*, and
2. the column, which meant *the academy has taken her off the register*, and
   which silently decided who the server would ever email.

They agreed only by luck: every row still held its default.

## The decision

**The pill shows the column, and tapping it sets the column.**

- `Member` carries `status: 'active' | 'paused' | 'inactive'`.
- `isEligible` (`src/data/followup.ts`) refuses anybody whose status is not
  `'active'`, which is the same clause `follow_up_candidates()` has always had.
- `public.set_member_status` (0031) is the only write path, and it stamps
  `status_changed_at` and `updated_by` server-side.
- Marking somebody inactive changes **nothing else**: no enrolment is ended,
  no session touched, no attendance record altered. It is a statement about
  follow-up, not a departure.

## Options rejected

**Leave the pill derived and add a separate switch elsewhere.** Two controls
saying "inactive" in the same product, one of which cannot be changed, is the
exact confusion this record exists to remove. It also leaves the engine's
column unreachable.

**Make the app ignore `members.status` and drop the clause from
`follow_up_candidates()` instead.** That resolves the disagreement in the
wrong direction: it deletes the academy's only way of saying "stop writing to
her", and it rewrites a shipped SQL function to match an accident in the
client.

**Write the column directly from the client.** `members` carries an UPDATE
policy, so `supabase.from('members').update({ status })` would work. It cannot
truthfully stamp `status_changed_at` (a client clock is not evidence of when
she came off the register) or `updated_by` (the client holds an auth uid, not
an `app_users` id — resolving it is `current_app_user_id()`'s job, and 0023
made every member write attribute itself that way). The audit row would name a
session instead of a person.

**Treat inactive as "end her enrolment".** It takes her attendance history's
join with it, and it is not reversible by tapping the pill again. Ending an
enrolment is `delete_course`'s business (0020) and is a different act.

**Expose `'paused'` in the UI as a third state.** The CHECK allows it and the
derivation reads it (not active, therefore not followed up), but nobody asked
for three states and a third word with no stated meaning is furniture. It is
read, never written.

## What it costs

The derived fact the pill used to state — *expected at nothing this week* — no
longer has a word on the roster. Carried as **TD-020** rather than quietly
dropped.

Until 0031 is applied to production, `setMemberStatus` fails against the live
project (the function does not exist) and the toast says so. The READ side is
safe either way: the column has existed since 0006.
