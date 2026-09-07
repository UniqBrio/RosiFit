# ADR-029 — Staff own the register: the owner keeps the account and its record, not the courses

**Status:** Accepted
**Date:** 07-Sep-2026 · **Deciders:** the repo owner, on `requests/2026-09-07-staff-write-access.md`

## Context

RosiFit has two roles and one admin (`app_users.kind`, `0003`). Since 02-Sep-2026 the boundary
between them was drawn at the **organisation**: staff read branches, courses and offerings and
wrote none of them, on the reasoning recorded in `RBAC_MATRIX.md` — *"Branches and courses are
the shape of the business; a coach changing them changes every figure."* Bulk import was added
owner-only on 04-Sep-2026 for a parallel reason: *"a file of forty is the shape of the
register."*

Three things forced the question now.

1. **The owner asked it.** *"Staff should be able add course edit course delete course and add
   member upload bul member edit and delte they can upload attendance as well why are we
   restricting them."* Asked what he meant by delete, given no member delete existed for
   anybody, he answered: *"Allow crud we are just hiding view of few fields such as overview and
   staff access and audit log."*
2. **The boundary was already incoherent in the app.** `app/(tabs)/courses.tsx` offered Add
   Course and Edit Course to staff unconditionally, and `save_course` refused them — so a staff
   member could fill the whole dialog and be refused on save. `app/offering/edit.tsx` was the
   same. That is RC-008's shape one role over: a form that cannot complete the write it offers.
3. **Half the named capabilities were already staff's.** Editing a member and marking attendance
   ask only for an active account. The "restriction" the owner was objecting to was, in
   practice, three RPCs and two hidden buttons.

## Options considered

### Option A — Move the boundary from the ORGANISATION to the ACCOUNT *(chosen)*
Every course and member write asks `is_active_app_user()`; `app_users`, `audit_logs`, security
questions, PIN issue/reset, academy settings, follow-up rules, email templates, branches and
holidays keep `is_super_admin()`.
**Pros:** matches what the owner said, in his words; removes the offered-and-refused screens;
leaves one sentence that a reader can hold a diff against — *the owner keeps the account and its
record, everyone active runs the academy*. **Cons:** a coach can now delete a course, and
deleting a course ends every enrolment in it. **Cost:** one migration, four functions replaced,
two policies, three registers amended, four specs.

### Option B — Grant only the Add/Edit Course dialog, keep the offering screens owner-only
`save_course` opens; `set_offering_schedule` stays shut and gains an internal unchecked variant
that `save_course` calls, so the nested call succeeds without opening `/offering/edit`.
**Pros:** the narrowest possible reading of the ask; MUST NOT CHANGE untouched.
**Cons:** a staff member could create a course and never afterwards change its days — the
incoherence of point 2 above, preserved in a new place. Also invents a second function for one
concern, which CANONICAL_PATTERNS exists to prevent. **Rejected by the owner explicitly**, at
the question: *"Yes — grant the whole course path."*

### Option C — Hide the buttons instead, and keep the owner-only boundary
Fix the incoherence in the other direction: `courses.tsx` and `offering/edit.tsx` stop offering
what the database refuses.
**Pros:** no permission change at all, no migration, smallest diff. **Cons:** it answers the
owner's question with "yes, we are restricting you, and now you can see less of it." Rejected
because the ask was not "the button is broken."

### Option D — Introduce a third role between staff and admin
A "senior coach" who writes courses while an ordinary coach does not.
**Pros:** the finest-grained answer. **Cons:** `one_super_admin` and a two-value `kind` check are
load-bearing in `0003`; a third role touches every policy in the schema, and RBAC_MATRIX already
records that the UI's three role LABELS (Academy admin · Coach · Front desk) are display text on
a two-role database. Nobody asked for a third role. Rejected as an answer to a question that was
not asked.

## Decision

Option A. Migration `0038` changes the guard in `save_course`, `set_offering_schedule`,
`delete_course` and `bulk_import_members` from `is_super_admin()` to `is_active_app_user()`, and
the `courses` / `course_offerings` insert-update policies with them. `is_subscription_writable()`
is untouched on every one — it is a billing gate, not a role gate, and conflating the two is how
an expired subscription starts looking like a permissions bug.

What actually decided it is the second point in Context. The owner's question — *why are we
restricting them* — had an answer on record, and the answer had already stopped being true in
the product: two of the eight capabilities were never restricted, and two more were offered and
then refused. A boundary that the screens do not agree with is not a boundary, it is a defect
with a rationale attached.

`delete_member` (new in the same migration) follows from *"Allow crud"* and is a **soft** delete,
which was not a choice: `attendance_records.member_id` references `members(id)` with no ON
DELETE, so the database refuses a hard delete regardless.

## Consequences

**Positive:** the chrome and the policies agree again. The four screens that offered a write the
database would refuse now complete it. One sentence describes the boundary, and
`src/data/access.ts` keeps holding the chrome half in one module.

**Negative:** a coach can delete a course, which ends every enrolment in it, and can delete a
member. Both are behind a confirmation that names what survives, and both are audited — but a
confirmation is not a permission, and this is a real widening of what one mistaken tap can do.
The mitigation is the audit log, which staff still cannot read or alter.

**What this forecloses:** the "shape of the business" reasoning is spent for courses. Re-drawing
the line there would now mean taking a capability back from people who have it, which is a much
harder change than never granting it. Branches and holidays keep that reasoning intact, and are
the place it can still be argued.

## Revisit when

An academy runs with enough staff that one of them deleting a course is a plausible Monday
morning rather than a hypothetical — or the first time the audit log is actually read to find
out who removed something. At that point the answer is probably not a third role but a
restore path: nothing here is hard-deleted, so an "undo" is a `deleted_at = null` away, and
that is the cheaper repair.
