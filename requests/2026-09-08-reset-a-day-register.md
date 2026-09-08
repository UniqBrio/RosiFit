# NEW REQUEST — something that does not exist yet
<!-- Filled by workflows/request.md (/request) · Consumed by Track A: /feature requests/<this-file> -->
<!-- Stated fields are BINDING; "unknown" is honest and the track MUST ask it. -->

Run **Track A** ([workflows/feature.md](../workflows/feature.md)) with this request.

> **Why NEW and not CHANGE.** Nothing in the app claims to undo a register. 0044 states the
> opposite as a property — "the register is the union of its files and no file undoes
> another's" — and 0035 declined the job in writing: "it cannot clear an attendance record …
> the mistake it would fix is already fixed by picking the other chip". That is true of ONE
> mark made by hand and false of a whole file that should never have landed. This is the
> missing capability, not a defect in an existing one.

## FIELDS

- **ONE-LINE GOAL:** a day's register can be undone from the course screen, and the members an
  upload created with no address can be deleted with it.
- **WHERE:** `app/course/[id].tsx` — on the `Attendance for <day>` line, above the member
  cards, acting on the day the week strip has selected. Stated by the requester at intake,
  chosen over the day card in the strip.
- **MUST-HAVE**, in the requester's words:
  - "give a reset attendnace button"
  - "enable select and deselct option to so we will delete that member records"
  - "the upload again should be changed to awaiting upload"
  - "on click of reset do you want to delet member under no email yes delete option"
- **WHAT RESET DOES** — requester, at intake: *"ask reset member with email to yet to markk and
  ask to delet all member uploaded in no email section on click yes delete them"*. Read as:
  members WITH an address keep their place on the course and their reading for that day returns
  to **Yet to mark**; the dialog then asks whether to delete the addressless members, and on yes
  deletes them.
- **SCOPE:** the SELECTED DAY only. Other days are untouched. Stated by the requester at intake,
  chosen over "every day of this course".
- **SELECT / DESELECT:** per-member ticks, confirmed by the requester after the first build
  attempt omitted them ("also no select and deselect option"). They live INSIDE the reset
  dialog, never on the roster card — a checkbox on the card would reverse **ADR-030**, which
  made that row a reading and not a control at this same requester's asking, as a side effect
  of an unrelated request.
- **WHO IT REACHES** — a deliberate departure from the literal words, and the reason is
  evidence. "Delete member under no email" read as *the members under the No email heading*
  MISSES the case it was asked about: on 08-Sep-2026 Rani, Rossy and UniqBotz Infotech were
  marked on the Yoda Advance register while enrolled in NO course, so the roster — built from
  enrolments — never listed them and the screen read "Members (1)" over a register holding
  four. So the offer is driven by the REGISTER: every member the day's rows mark who has no
  address on file. On ordinary data that is the same set the No email heading shows.
- **MUST NOT CHANGE:** everything not named above. Named explicitly because each was at risk:
  the roster card stays a reading (ADR-030); the day returns to awaiting by DERIVATION — no
  status is written that could then disagree with the rows (guardrail 1); `delete_member`
  (0051) is the only deletion path and is not bypassed; no table grant on `attendance_records`
  is widened (guardrail 4, RC-007).
- **DESIGN SURFACE:** the course detail screen — the attendance caption line gains one control;
  a new modal dialog with a tick list. Both themes; the control carries its own word and icon,
  never colour alone (guardrail 3); the danger fill is `STATUS.absent` through `statusSurface`.
  States: counting, counted, nothing-to-reset, failed, running.
- **USAGE PROFILE:** occasional and corrective — reached only when a file went to the wrong
  place. Frequency otherwise `unknown`.
- **CORRECTION ROUND:** 1 for the feature. The first attempt shipped nothing at all: the run
  stopped at a triage gate of the agent's own making and the requester reported the button
  missing.

## RESOLVED AT INTAKE (was `unknown`, answered by evidence rather than invented)

- **Is the day's `csv_imports` row cleared too?** Yes — moved to `reverted`. Not a preference:
  `csv_imports_sha_completed` is a PARTIAL unique index on `status = 'completed'`, so without
  this the reset would clear the register and then refuse the very file that would refill it.
  `'reverted'` has been a legal status since 0008.
- **Soft or hard delete for the members?** Hard, via `delete_member` — the repo owner's own
  decision that morning (`requests/2026-09-08-hard-delete-member.md`). Not re-litigated here.
- **What about a no-email member with attendance on OTHER days?** The delete reaches all of
  them. It is therefore COUNTED and stated per member in the dialog before the tick.
- **Who may press it?** Any active staff on a writable subscription — the same permission
  `delete_member` and the CSV override already carry, and for the reason RBAC_MATRIX gives for
  the override: whoever may upload may correct, and gating the correction behind the owner
  leaves her with a register she knows is wrong and no way to fix it.

## STILL `unknown`

- Whether a reset should be reachable for a day OUTSIDE the current week (it currently is —
  the button follows the register, not the upload window).
- Whether the audit screen should surface `attendance.day_reset` distinctly.

## STANDING INSTRUCTIONS (do not edit)
- Track A order is binding: Gate 1 restates these FIELDS for confirmation before any build.
- Stated fields are BINDING and cannot be overridden by an assumption downstream.
- Every backend change is an additive migration with tests; test files are append-only.
- Before applying any migration to PROD: show the requester the raw SQL and wait for an
  explicit go-ahead. Production is never touched automatically.
