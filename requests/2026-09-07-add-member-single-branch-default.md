# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: the **Branch** field in *Welcome a new member* (the Add member dialog) —
  the `member-branch` `PickRow` and its `member-branch-list` `AnchoredPicker` in
  `app/member/edit.tsx`. The same file renders the Edit member dialog.

- CURRENT BEHAVIOUR (read in the file, 2026-09-07): `branch` starts `''` on the Add form, so
  the row renders muted placeholder text *"Choose a branch"*. Its options are
  `chosenCourse?.offerings.map(o => o.branch)` — the branches that course actually runs at —
  so the row is only pressable after a course is chosen. Nothing is pre-filled: even when the
  chosen course runs at exactly **one** branch, the branch stays blank until somebody taps the
  row and taps the single line in the list. Until then `offering` is null, `valid` is false,
  the Add Member button is disabled, and the hint reads *"Choose the branch — <course> runs at
  1 of them"*.

- DESIRED BEHAVIOUR: requester's exact words — *"In add member form if only one branch is
  present show that branch as default"*.

  Read as: when the branch list has exactly one option, that option is filled in as the
  branch — shown in the row as a real chosen value, not the muted placeholder — without
  anybody opening the picker. The form is then complete on that field.

- WHY: `unknown` as stated. Evident from the ask: a course that runs at a single branch makes
  the pick a formality, and the form still charges two taps and a disabled Save for it.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Specifically: **two or more**
  branch options still open blank and are still picked by hand; **zero** options still warn
  *"<course> does not run at any branch yet"* and fill nothing; the branch row stays pressable
  and the picker still opens, so the default is a default and not a lock. The Edit form's
  seeded `existing.branch` is never overwritten by this — a member enrolled at a branch her
  course no longer offers keeps the branch on her record. Changing the course still clears the
  branch (RC-020's re-pick rule stands: re-picking the SAME course clears nothing). The
  `course|branch` day re-seed, `valid`, the hint line's other branches, and both save paths
  are untouched. Both themes.

- CORRECTION ROUND: 1 on this surface.

## OPEN QUESTIONS — the requester did not settle these; taken at the gate
- **Q1. "Only one branch" — of the course, or of the academy?** This row's list is
  course-scoped, so an academy-wide count is not a thing it can read. **Taken: exactly one
  option in the list this row offers**, i.e. the chosen course runs at one branch. A
  one-branch academy satisfies this for every course, so the requester's case is covered
  either way.
- **Q2. Does it apply on the Edit form, which is the same component?** **Taken: yes, but only
  into an EMPTY branch** — so it fills after the course is changed (which clears the branch),
  and never writes over the branch her record already holds.
- **Q3. What if the sole option arrives while the picker is open?** **Taken: fill it and leave
  the picker alone** — it is showing that one option, and selecting it is a no-op.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: the Branch row of *Welcome a new member* (and of *Edit member*
  after a course change) in its **filled** state where it used to be **empty** — the row loses
  its `muted` placeholder styling and shows the branch name; the footer hint moves off
  *"Choose the branch — …"* to the next unmet requirement or to `<course> · <branch>`. The
  loading, error and missing-record states of the dialog are unaffected; so is the
  no-offering-yet warn path. Both themes.
- STRINGS ADDED OR ALTERED: none — the branch name is data, and every fixed string on the
  screen is frozen.
- PERMISSIONS: no — who may add a member is unchanged.
- RUN MODE: auto (nothing said about approvals)

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
