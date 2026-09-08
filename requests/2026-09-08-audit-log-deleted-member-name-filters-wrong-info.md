# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## FIELDS
- WHERE: the Audit log screen (`app/audit.tsx`, reached from More → Audit log)
- WHAT HAPPENS: three things, in the requester's own words —
  1. `"In audit log show member name if member deleted"` — a deleted member's entry names
     nobody.
  2. `"dropdowns are not working under that"` — the Dates and Branch filters on that screen.
  3. `"showing wrong info"` — no further detail given.
- WHAT SHOULD HAPPEN: the deletion entry names the member it removed; the two filters work;
  the screen shows right information. What "right" means for item 3 beyond items 1 and 2 is
  **unknown** — see OPEN QUESTION below.
- WHEN IT STARTED: unknown — not stated.
- WHO IS AFFECTED: unknown — not stated. (The screen is admin-only; no selectivity was given.)
- REPRO STEPS: unknown — not stated. Measured independently at intake, recorded below.
- WAS WORKING BEFORE?: unknown — not stated.
- CORRECTION ROUND: 1 for all three defects. The surface itself was rebuilt on 07-Sep-2026 by
  `requests/2026-09-07-audit-log-for-end-users.md`; that round predates the hard-delete
  actions (0051–0055, all 08-Sep-2026), so it is not a previous attempt at any of these.

## STANDING INSTRUCTIONS (do not edit)
- Track C order is binding: search `docs/registers/ROOT_CAUSE_REGISTER.md` for the same class;
  state the ROOT CAUSE, distinct from the symptom, BEFORE any fix; reproduce with a failing
  test, fix at the root, make it pass; if the cause is a pattern, sweep EVERY sibling site;
  append the root-cause entry; then the test gate.
- WHO IS AFFECTED is evidence — a fix whose mechanism does not explain the stated selectivity
  has not found the root cause.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why. A recurring "fixed" bug is a process finding — flag `/framework-update`.
- Data-store-level cause → STOP, propose the change, wait for approval. Production is never
  touched automatically.

---

## MEASURED AT INTAKE
Not stated by the requester — measured, and recorded here so Track C's root-cause step starts
from evidence rather than from a guess. Read-only `select` against the live project
(lhpzhkzbnquwjljmbylo), plus the source.

**Item 1 — the deleted member's name.** `purge_member` (0051) writes
`member.hard_deleted` with `changes = []` and the name in `metadata.name`; it then deletes the
`members` row. `fetchAudit` resolves the subject by looking `entity_id` up in `members`
(`src/data/repository.ts:1583`) — the row is gone by design, so the lookup misses and `subject`
is `null`. Nothing in `src/data/auditPlain.ts` reads `metadata`. Production holds **46**
`member.hard_deleted` rows, all written today, all carrying a real name in metadata, and they
are the most recent activity on the screen.

**Item 2 — the filters.** react-native-web gives every `<View>` `position: relative; z-index: 0`
(`node_modules/react-native-web/dist/exports/View/index.js:132-134`), so every View opens a
stacking context. `DropdownRow` lifts itself to `zIndex: 40` while a panel is open — but on
this screen it is wrapped in two plain Views (`<View key="controls">` at `app/audit.tsx:859`
and the `marginBottom` View at `app/audit.tsx:702`), both at z-index 0. The 40 is trapped
inside them, so the open panel is painted underneath the frozen table header and the table,
which are later siblings at the same z-index. Every other screen with these filters
(`app/(tabs)/index.tsx`, `attendance.tsx`, `reports.tsx`) puts `DropdownRow` directly in the
content and is unaffected. Same screen, second defect: audit is also the only one of those
that passes no `dismiss` to `DropdownRow`, so there is no press-beside-to-close.

**Item 3 — wrong info.** The requester gave no detail. What is demonstrably wrong on the
screen today, from the same production read:

| Action | Rows in prod | Rendered as |
|---|---|---|
| `member.hard_deleted` | 46 | "Member — member hard deleted", no name, "No field values recorded" |
| `csv_import.previewed` | 38 | "Csv import previewed" |
| `course.hard_deleted` | 10 | "Course — course hard deleted", no name |
| `member_import_run.hard_deleted` | 8 | prettified code, no file name |
| `member_email.hard_deleted` | 3 | prettified code, no address |
| `attendance.day_reset` | 1 | "Attendance — attendance day reset" |
| `branch.hard_deleted` | 1 | prettified code, no name |
| `auth.recovery_pin_set` | 1 | prettified code |
| `member.seeded_for_send_test` | 1 | prettified code |

`src/data/auditPlain.ts` claims totality over "every action the backend can currently emit"
and `auditPlain.test.ts` asserts it — the assertion has drifted from what the backend emits.

## OPEN QUESTION (for Track C's first gate)
Item 3 is a symptom with no detail. The table above is what intake could measure; the
requester may have meant something else entirely, and that must be confirmed before it is
treated as the whole of item 3.

## RUN MODE
`auto` (default — the description said nothing about approvals).

## NOTE ON THE RUN LOG
`node scripts/run-log.mjs start` was refused: a concurrent session has a run open since
2026-09-08T08:43:19Z ("dropdown UI … inside forms and dialogs"). Opening a second would make
both durations meaningless, and ending another session's run is not this run's to do. This run
is therefore not in `docs/registers/RUN_LOG.md`. That other run touches
`src/components/Dropdown.tsx`; the fix for item 2 here is in `app/audit.tsx` only, so the two
do not collide.
