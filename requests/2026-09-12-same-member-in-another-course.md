# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## THE REQUESTER'S WORDS, VERBATIM
> "Same member can be added with same name email and display name in other course do not
> restrict user to add them as member in another course. But one course cannot have duplicate.
> A member with same display name and email and display can be added as new member in another
> course if he is not present in that course but if he is present in that course show as
> duplicate"

## FIELDS
- FEATURE / SCREEN: Adding a member — the requester said "add them as member in another
  course" and named no screen. The app refuses this in three places and the requester
  distinguished none of them: **Add Member** (`app/member/edit.tsx` → `create_member`), the
  **bulk member import** (`app/member/import.tsx`, `src/data/memberImport.ts` →
  `bulk_import_members`), and **editing a member** (`update_member`). Which of the three the
  requester meant is `unknown`.
- CURRENT BEHAVIOUR: The refusal is **academy-wide**, not per course. An address already on
  any live member is refused — "the address "x@y.com" is already on another member"
  (`member_emails_unique_live`, 0006). A display name already on any member is refused — "the
  display name "x" already belongs to another member" (`member_aliases_unique`, 0006). In the
  bulk import a row whose name is already on the register is filed `duplicate` and skipped —
  "“Name” is already on the register — skipped." (`src/data/memberImport.ts`). None of those
  three checks looks at which course the member is in, so a member of Prenatal cannot be added
  to Postnatal under the same name, address and display name.
- DESIRED BEHAVIOUR: Duplicate is judged **per course, not academy-wide**. The same name +
  email + display name may be added as a new member in a course the member is not already in,
  and must not be refused for existing in another course. Within one course, the same name +
  email + display name is a duplicate and is shown as one.
- WHY: `unknown` — the requester stated the rule, not the problem behind it.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR.
- CORRECTION ROUND: 1

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: yes — "show as duplicate" is something the operator sees, and the refusals that
  stop being raised are refusals the operator sees today.
- SCREENS & STATES TOUCHED: `unknown` in detail. The surfaces that carry the current refusals
  are Add Member / Edit Member (the dialog's refusal banner) and the member import result
  screen (the `Skipped (already exist)` group). The requester named neither, and named no
  state (empty · loading · error · offline · permission-denied).
- STRINGS ADDED OR ALTERED: `unknown`. The requester wrote "show as duplicate" and gave no
  wording. The strings that exist today and would have to say something course-scoped instead
  are: `the address "%" is already on another member`, `the display name "%" already belongs
  to another member`, and `“Name” is already on the register — skipped. Edit the member
  instead.` Everything else on the touched screens is frozen (the freeze rule).
- PERMISSIONS: `unknown` — not mentioned; nothing in the description suggests who-can-do
  changes.
- USAGE: `unknown`.
- RUN MODE: auto (the requester said nothing about approvals; docs/01 §Run modes default).
- SCALE: `<leave to B0>`

## ANSWERED AT TRACK B'S FIRST GATE — 12 Sep 2026 (binding from here)
The three forks the description left open were put to the requester and answered. These are
stated fields now, not assumptions:

1. **A SECOND MEMBER RECORD.** Two courses = two member rows carrying the same name, email and
   display name, each with its own enrolment. The one-live-enrolment guardrail (0006's GiST
   exclusion constraint, relied on by `splitByCourse` and `set_attendance`) is **not** touched.
   The requester accepted that the roster will show the name twice.
2. **ALL FOUR ENTRY POINTS**: Add Member form, bulk member import, editing an existing member,
   and the attendance CSV import.
3. **ANY ONE OF THE THREE MATCHES** makes a duplicate within a course — same name, OR same
   email, OR same display name. Today's three checks survive unchanged in strength; only their
   SCOPE moves from the academy to the course.

## ASSUMPTIONS LEDGER (B3, auto mode — recommendation taken, logged, not re-asked)
- **A1 — "course", not "offering".** The requester's word throughout is *course*. A course may
  run at several branches; the scope is the whole course, every branch of it. This is the
  stricter of the two readings and the requester's literal word.
- **A2 — "present in that course" means the rule `splitByCourse` already uses.** A candidate
  counts as a duplicate for this course when their live enrolment is in this course **or they
  have no live enrolment at all**; they are not a duplicate only when their live enrolment is
  in a *different* course. This is not a new rule — it is
  `supabase/functions/_shared/match.ts` verbatim: "A member with NO live enrolment is `here`.
  Nothing contradicts this course for her, and creating a second record for a woman already on
  the register would be inventing a duplicate to avoid a collision that does not exist."
  Adopting it keeps one answer to "who could this be in this course" across the import matcher
  and the add paths.
- **A3 — "show as duplicate" keeps the refusal each surface already has.** Add/Edit Member
  refuses with its banner; the bulk import files the row `duplicate` and shows it under
  `Skipped (already exist)`. No new surface; the two create/update refusals gain " of this
  course" so the sentence matches the scope that just changed.

## CONSEQUENCES THE REQUESTER SHOULD KNOW (stated, not changed)
- **Unsubscribe is per address row**, signed on `member_emails.id`. With one person holding two
  member records, opting out of one course's follow-up does **not** opt out of the other's.
  That is per-course behaviour and is consistent with the ask, but it is a behaviour change
  nobody asked for by name.
- **Bounces already work.** `ses-feedback` suppresses by address with no row limit, so a bounce
  marks every copy of that address. Verified; no change needed.
- **Add Member gains a name check it did not have.** Today only the bulk import refuses a
  duplicate *name*; answer 3 puts that check on the form too, scoped to the course. This is the
  one place the change makes something stricter rather than looser.

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact analysis with
  the sibling call-site sweep (B2) BEFORE proposing, produce the plan with regression risks
  (B4) — confirm mode waits for approval; auto mode (default) logs it and applies — touching
  only what DESIRED BEHAVIOUR requires. Every changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan may add to it,
  never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to the touched
  area: states, both themes in semantic tokens, the string table, the permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why (B1). If the miss was the process's fault, flag `/framework-update` too.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing merges
  without a PASS.
