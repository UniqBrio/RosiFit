# ADR-033 — The course form offers ONE follow-up trigger, and the engine keeps two

**Status:** Accepted
**Date:** 07-Sep-2026 · **Deciders:** the requester, directly
**Request:** `requests/2026-09-07-one-follow-up-trigger.md`

## Context

The Add / Edit course form has carried two follow-up triggers as a radio pair since the
course form absorbed the follow-up rule editor: *"N missed sessions in a week"* against
*"N consecutive missed sessions"*, one or the other, never both. One count stepper feeds
both labels, so at the default the second read **"4 consecutive missed sessions"**.

The requester asked for it to go:

> "remove 4 consecutive sessions under follow up let there be only one"

This is a **capability removal** — Track B stops on those in any run mode — so it was put
back to the requester with its two real consequences before anything was built.

## Options considered

**1. Remove the trigger everywhere — form, `save_course`, the engine.** Rejected on a hard
constraint, not a preference. `supabase/tests/16_save_course.sql` saves a course with
`p_rule = 'consec'` at lines 64 and 244, and **test files in this repo are append-only**
(CLAUDE.md standing rules). A migration that rejected `'consec'` would break a spec that may
not be rewritten to accommodate it. Beyond that, `follow_up_candidates()` (0009) and
`src/data/followup.ts` evaluate the consecutive condition as a matched pair — guardrail 1
holds because they agree by construction, and tearing the condition out of one of them is
exactly how they stop agreeing.

**2. Delete the second card and change nothing else.** The smallest diff, and it leaves a
selected radio button that cannot be deselected — a control offering one choice, which is
not a control. Rejected by the requester at the gate.

**3. Convert stored consecutive courses silently.** The form already falls back to the
weekly card when it cannot express a stored rule, so this needed no code at all. Rejected:
the next Save would change *who this course follows up* with nothing on screen saying so,
and the academy would meet the change as a follow-up list that had moved.

## Decision

**The form offers the weekly trigger only. The engine and the database keep both.**

- The radio pair is replaced by a **sentence** under the count stepper, not by a card with
  its dot removed. The stepper is the only control left in the block.
- `saveCourse` is called with `rule: 'week'` unconditionally. The `rule` state is gone.
- `save_course` (0040) is **untouched**: it still validates `p_rule in ('week','consec')`,
  still writes both `course_follow_up_config` columns, and spec 16 still passes.
  `ruleHits`, `isEligible`, `reasonFor`, `ruleSentence` and `follow_up_candidates()` keep
  their consecutive branch.
- A course **stored** as consecutive is still recognised on seed — its count is read off
  the trigger that is actually ON, so the academy's number is not replaced by a stale
  `weekly_threshold` — and the form **says** that saving will convert it, above the Save
  button, before it does.

## Why

A trigger the academy can no longer *choose* is not the same thing as a trigger the engine
can no longer *evaluate*. Rows written before today still exist, `follow_up_candidates()`
still reads them, and the streak they count is still a real figure the app displays. The
removal is of an option on one form; making it a removal of a capability from the engine
would have taken a spec down with it and left the app's derivation and the database's
disagreeing — the one thing guardrail 1 exists to prevent.

## Consequences

- **Only the weekly condition can be set per course from now on.** An academy that wanted
  follow-up on an unbroken run has no way to ask for it in the product.
- **Courses already stored as consecutive convert on their next save**, and only then. Until
  someone opens and saves one, its rule stands and the engine goes on honouring it — so the
  app can be in a state where a course follows up on a rule its own form cannot express.
  That is deliberate: the alternative was converting rows nobody had looked at.
- **How many such courses exist is not known.** The read-only count against production was
  blocked by the permission classifier during this run and has not been taken since.
- The global rule in `follow_up_config` is untouched and out of scope. It ships with
  `consecutive_enabled = false` (0009), so the default path is already weekly-only; if it
  were ever switched on, the app would follow up on a run the course form cannot express.
- `{{consecutive_missed}}`, the *Streak* column on Weekly review and `consecutive N` on the
  course page all stay. A trigger and a figure are different things.
- Two strings left the screen: the consecutive card's label and description, and the clause
  *"One or the other, never both."*, which stopped being true.
