# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: the **Add / Edit course** form — `app/course/edit.tsx`, the
  *Follow-up trigger* block (heading row with the count stepper at lines 364–377, the two
  radio cards at lines 378–407). Confirmed with the requester at intake against the
  rendered screen.

- CURRENT BEHAVIOUR (read in the file, 2026-09-07): the block shows one count stepper
  (`threshold`, 1..7, `MIN_THRESHOLD`/`MAX_THRESHOLD` from `src/data/followup.ts`) and
  **two radio cards** built from a literal array, `rule` being `'week' | 'consec'`:

  - `course-rule-week` — *"N missed sessions in a week"* / *"Counted across the current
    week's scheduled sessions."*
  - `course-rule-consec` — *"N consecutive missed sessions"* / *"Counted as an unbroken
    run, however long it takes."*

  Both labels interpolate the same `threshold`, so at the default the second card reads
  literally **"4 consecutive missed sessions"** — the words the requester quoted.

  The choice is one-or-the-other, never both, and the footer says so (edit.tsx:421–427).
  It travels: seeded on Edit from the stored config —
  `isConsec = r?.consecutive_enabled && !r?.weekly_enabled`, and the threshold is read off
  whichever trigger is on (edit.tsx:147–154); shown in the footer hint as
  `"… · N weekly"` / `"… · N consecutive"` (edit.tsx:268); passed as `rule` into
  `saveCourse` (edit.tsx:240) and on as `p_rule` to the `save_course` RPC
  (repository.ts:1052–1062).

  Server side, `save_course` (0022, re-issued 0030 → 0038 → **0040**, the live version)
  validates `p_rule in ('week','consec')` and writes BOTH columns from it —
  `values (…, p_rule = 'week', v_threshold, p_rule = 'consec', v_threshold, 'OR', …)` —
  so the unchosen trigger is stored disabled but keeps the count.

- DESIRED BEHAVIOUR: requester's exact words — *"remove 4 consecutive sessions under
  follow up let there be only one"*.

  Read as: **the *N consecutive missed sessions* option is removed from the Follow-up
  trigger block, leaving the weekly condition as the only trigger the form offers.** The
  count stepper stays and keeps meaning the weekly count. Saving a course therefore always
  sends `rule: 'week'`.

- WHY: `unknown` — the requester did not say. Not inferable from the code either: unlike
  the 0030 threshold defect, nothing here is unreachable or broken. Track B must ask, and
  the answer changes Q1 and Q3 below.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Specifically —
  - **The database contract.** `save_course` keeps accepting `p_rule = 'consec'` and keeps
    both `course_follow_up_config` columns. `supabase/tests/16_save_course.sql` saves with
    `'consec'` at lines 64 and 244, and **test files are append-only** (CLAUDE.md standing
    rules) — a migration that rejected `'consec'` would break a spec that may not be
    rewritten. This ask is that the form stops OFFERING the trigger, not that the engine
    forgets it.
  - **The follow-up engine.** `ruleHits`, `isEligible`, `reasonFor`, `ruleSentence` in
    `src/data/followup.ts` and `follow_up_candidates()` (0009) keep their consecutive
    branch — Guardrail 1: the app's derivation and the database's must go on agreeing.
  - **The streak figure everywhere it is read**: `member.streak`, the *Streak* column and
    its caption on Weekly review, `Missed … · consecutive N` on the course page
    (course/[id].tsx:888), and the `{{consecutive_missed}}` token in `src/data/message.ts`
    with its *Missed in a row* chip. A trigger and a figure are different things.
  - The count stepper: `course-threshold-minus` / `course-threshold-value` /
    `course-threshold-plus`, the 1..7 bounds, and the
    *"This course runs N days a week, so N can never be reached"* warning.
  - The rest of the form — name, branch, frequency days, sender, template, the wording
    card and its preview, `valid`, and every other string on the screen (freeze rule).
  - Guardrails 2 and 3 and both themes: semantic tokens only, every icon a real glyph;
    `check-contrast` and `check-icons` stay green.

- CORRECTION ROUND: 1 on this surface. The block was last touched by 0030 / RC-023
  (the hard-coded 4), which is a different defect — not a previous attempt at this ask.

## CLASSIFICATION NOTE — correct this at the gate if it is wrong
Filed as **CHANGE**, not BUG: the consecutive trigger works, is reachable, and is honoured
end to end. Nothing is erroring or producing wrong output — the requester wants one option
where there are two. If instead the consecutive trigger is producing wrong follow-up lists,
re-file as BUG so Track C finds the root cause first.

## OPEN QUESTIONS — answered by the requester at the gate, 07-Sep-2026
Track B stopped here before building: removing a trigger is a **capability removal**, which
is a hard stop in any run mode. The answers below are the requester's, not assumptions.

- **Q1. What happens to courses already saved as consecutive?**
  **ANSWERED: convert on save, and say so.** The form recognises a stored consecutive rule,
  seeds the count off the trigger that is actually ON so the academy's number is not
  replaced by a stale `weekly_threshold`, and states above Save that saving switches the
  course to the weekly trigger and will change who is followed up. Rejected: converting
  silently (smallest diff, but the academy would meet the change as a follow-up list that
  had moved) and leaving stored rules alone (needs a migration to `save_course`, which
  writes the rule unconditionally).
  **Still open:** the production count was never taken — the read-only query was blocked by
  the permission classifier during the run. Carried as **TD-045**.
- **Q2. Form-only, or the whole path?** **ANSWERED: form-only**, as MUST NOT CHANGE takes
  it — forced anyway by the append-only spec above.
- **Q3. Does the GLOBAL rule keep its consecutive condition?** **Out of scope, and it does.**
  Settled by reading 0009: `follow_up_config` ships `consecutive_enabled = false` by default
  and has no editing screen, so the default path was already weekly-only and this ask does
  not reach it.
- **Q4. With one option left, is it still a radio card?**
  **ANSWERED: no — stepper plus one plain sentence.** The radio card is dropped entirely,
  not kept with its dot removed. A radio group of one is a control with nothing to choose;
  the stepper is the only control left in the block.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: the Add / Edit course dialog only, in both its **Add** and
  **Edit** entry states (Edit additionally in its seeded state, per Q1). The form's
  loading (`Skeleton`), error (`ErrorState`) and record-missing states are not affected —
  the block renders only in the ready state. No offline state. Permission-denied is
  unchanged: the whole form is super-admin-only already.
- STRINGS ADDED OR ALTERED: the *"N consecutive missed sessions"* label and its
  *"Counted as an unbroken run, however long it takes."* description are **removed**. The
  footer hint's `"… · N consecutive"` arm (edit.tsx:268) becomes unreachable, and the
  footer sentence *"One or the other, never both."* stops being true — both need
  rewording, and the requester gave no words for either, so their replacements are
  `unknown` and belong at the gate with Q4. Everything else on the screen is frozen.
- PERMISSIONS: no — the form is reachable by exactly the roles it is today.
- USAGE: `unknown` — the requester did not say how often courses are edited or by whom.
- RUN MODE: auto (default — the description says nothing about approvals)
- SCALE: left blank; Track B decides at B0.

## OBSERVED AT INTAKE — not part of this ask
Two `0038_*` migrations exist side by side — `0038_staff_write_access.sql` and
`0038_repoint_stale_course_senders.sql` — so their order is decided by filename, not by
number. Noted for the track's Definition-of-Done register pass, not to be fixed at intake.

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
