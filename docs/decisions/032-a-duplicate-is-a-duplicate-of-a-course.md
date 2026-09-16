# 032 — A duplicate member is a duplicate of a COURSE, not of the academy

**Status:** Accepted · **Date:** 12-Sep-2026

## Context

The owner asked for something the schema forbade outright:

> *"Same member can be added with same name email and display name in other course do not
> restrict user to add them as member in another course. But one course cannot have duplicate.
> A member with same display name and email and display can be added as new member in another
> course if he is not present in that course but if he is present in that course show as
> duplicate"*

One person who attends Prenatal on Tuesdays and Postnatal on Saturdays could be put on the
register once and only once. Three separate rules said so, and not one of them had ever looked
at a course:

| | |
|---|---|
| `member_emails_unique_live` | `unique (email) where deleted_at is null` (0006) |
| `member_aliases_unique` | `unique (alias_type, alias_normalized)` — global, no `deleted_at` (0006) |
| `bulk_import_members` | `exists (members.name_normalized = …)` over the whole register (0038) |

The second one was load-bearing by design. 0006 says: *"Uniqueness is ACADEMY-WIDE: one display
name can never point at two members, or an import would have to guess."*

## The fork, and why it went the way it did

"Add them in another course" has two readings, and they are not close together.

**One member, two live enrolments** was rejected. `member_enrollments` carries a GiST exclusion
constraint on `(member_id, daterange(effective_from, effective_to))` — one offering at a time —
and that constraint is not decoration. `set_attendance` states outright that *"one active
enrolment means there is nothing to choose"* (0035); `splitByCourse` is built on it; the
follow-up rule, the member's own schedule and every screen that reads "her offering" assume a
single answer. Taking it away is not this request, it is a different application.

**A second member record** was chosen, and the owner confirmed it knowing the cost: the roster
shows the name twice, and the two records are two people as far as the engine is concerned.
This is also what the requester's own words say — *"added as **new member** in another course"*.

## Decision

A duplicate is judged against the members of the course the new member is joining.
`member_emails_unique_live` and `member_aliases_unique` are dropped and replaced with plain
lookup indexes; `public.refuse_course_duplicate()` carries the rule instead, and every write
path — `create_member`, `update_member`, `bulk_import_members` — asks it before it writes
(`0071_duplicate_is_per_course.sql`).

Inside a course nothing is loosened: **any one of** the checks matching is a duplicate. The owner
chose that over "all three must match", which would have let two members of one course share an
address.

### Amended 16-Sep-2026 — the name is not one of the keys the forms check

The first draft read "any one of the three" literally and put a **name** check on Add Member and
Edit Member as well as the import. Measured against the live register before it was applied, that
rule refuses people who are already there:

| | |
|---|---|
| Names held by two live members of ONE course | **14** |
| Members in those groups | **34** |
| Of those groups, how many share an address | **0** |

They are namesakes, not duplicates — which an academy of 1,150 women across a handful of courses
is expected to contain. And because `refuse_course_duplicate` is asked on **update** too,
excluding only the member being edited, each of those 34 would have become un-editable: open the
member, press Save, get *"already in this course"*, with no way out from the screen. A change
requested to stop the app refusing things would have started refusing thirty-four saves.

So the name check stays exactly where it already lived — `bulk_import_members`, which **skips a
row** rather than blocking a person mid-edit, and which has carried it since 0028. It is
re-scoped to the course like everything else. The two keys the forms enforce are the **address**
and the **display name**: the one the academy writes to, and the one the attendance CSV matches
on. "One course cannot have a duplicate" still holds, on the keys that can carry it.

Pinned by `src/data/duplicatePerCourse.test.ts` — *"the form paths do NOT refuse on the full
name"* — so the check cannot be reinstated by someone reading the request without the register in
front of them.

### "Present in that course" is not a new rule

It is `splitByCourse`'s, already shipped and already tested (`src/data/importCourseScope.test.ts`):

> *"A member with NO live enrolment is `here`. Nothing contradicts this course for her, and
> creating a second record for a woman already on the register would be inventing a duplicate
> to avoid a collision that does not exist."*

So `public.is_in_course()` answers **true** for a member whose live enrolment is in this course
**and** for a member who has no live enrolment at all; only an enrolment in a *different* course
makes somebody not a duplicate here. Adopting the existing answer rather than inventing a second
one is guardrail 1 applied to the question of who somebody is — and it is why every existing
spec stayed green, including `22_bulk_import_members.sql`, whose Kavitha Ramesh sits on the
register with no enrolment.

## Consequences

**The unique indexes were also the atomicity.** Two sessions adding the same address at the same
instant used to be separated by the index; a check-then-insert in application code is not.
`refuse_course_duplicate` therefore takes `pg_advisory_xact_lock` on the course and holds it to
commit, so the check and the insert it guards are one critical section. Keyed on the course, so
adds to different courses never wait on each other.

**The attendance import does not have to guess, and never did.** 0006's justification for
academy-wide display names is answered by work that shipped after it: `splitByCourse` narrows
its candidates to the course *before* deciding a row's kind, so two members of two courses may
share a display name without the matcher losing its answer. A same-course clash is still refused,
which is the only case that would have made it guess.

**One address, two members, two unsubscribe links.** The opt-out token is signed on
`member_emails.id` (0066), so unsubscribing from one course's follow-up leaves the other course's
copy subscribed. That is per-course behaviour and consistent with the ask; it is recorded because
nobody asked for it by name. Bounces are unaffected — `ses-feedback` suppresses by address with
no row limit, so it already marks every copy.

**Nothing on the forms got stricter.** The one candidate for that — a name check on Add and Edit
Member — was removed on the evidence above. Every rule this change touches is now the same rule
or a looser one, which is what the request asked for.

## Reversal

Reversible in principle, expensive in practice. Re-creating either unique index requires the
production data to hold no duplicate by then — which is precisely what this change exists to
allow — so a reversal is a data decision before it is a migration.
