# NEW FEATURE REQUEST
<!-- Filled by workflows/request.md (/request) · Consumed by Track A: /feature requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - the Gate 1 questionnaire covers it. -->

Run **Track A** ([workflows/feature.md](../../workflows/feature.md)) with this request.

## ROUGH DESCRIPTION (verbatim)
> The bulk import should be place in the course screen where user can add any number of
> members associated to any course. Refere UniqBrio Mobile App for bulk import feature apply
> same Note: do not touch anything in UniqBrio Mobile app just take the feature details and
> implement. The template format and upload feature everything should be same but in reliance
> with Rosifit app structure. Bring bulk import below seach bar two buttons one add member and
> other is bulk import. And fix bug as bulk import is opening upoad attendnace. Fix the bug

Accompanied by a screenshot of the **Attendance** tab (the course list, route `(tabs)/courses`):
title "Attendance · 3 courses · 2 branches · nobody needs follow-up", an **Add Course** button
top-right, a Branch dropdown, a **Search courses** box, then "ALL COURSES · 3" with Yoga and
Yoga Flow cards (each with Edit / Delete).

## CLASSIFICATION NOTE
Classified **NEW**, not BUG, although the description ends "Fix the bug". The bug — "bulk
import is opening upoad attendnace" — is the symptom of the feature's absence: the course
detail's Bulk Import button points at the only importer that exists, the Google Meet
*attendance* importer, because no *member* importer has ever been built. Fixing the bug IS
building the feature; a Track C run would have nothing to root-cause. The bug wording is kept
verbatim below so the track cannot lose it. **Correct this at Gate 1 if you disagree.**

## FIELDS
- FEATURE NAME: Bulk member import
- ONE-LINE GOAL: From the course screen, a user can add any number of members to any course
  from an uploaded file built on a template.
- WHO USES IT: unknown (requester said "user")
- MUST-HAVE in v1 (no priority signalled — everything lands here; **requester to trim at Gate 1**):
  - placed "in the course screen", where a user "can add any number of members associated to any course"
  - the **template format** is the same as the UniqBrio Mobile App's bulk import
  - the **upload feature** is the same as the UniqBrio Mobile App's, "in reliance with Rosifit app structure"
  - "below seach bar two buttons one add member and other is bulk import"
  - the bug: **"bulk import is opening upoad attendnace"** — fixed
- EXPLICITLY OUT of v1: "do not touch anything in UniqBrio Mobile app just take the feature details and implement"
- KNOWN CONSTRAINTS: the UniqBrio Mobile App is the reference and is read-only. Nothing else stated.

### Intake note — a fact the track needs, not a requester statement
The UniqBrio Mobile App could **not be read** during intake: the two "Uniqbrio Custom Mobile
App" folders on this machine hold a RosiFit design canvas, screenshots and pasted images — no
source and no template — and the UniqBrio Supabase project is refused to this session. So
"same as UniqBrio" is currently **unverifiable**, and the template's columns are `unknown`
until the requester supplies the UniqBrio template (file or screenshot) or accepts RosiFit's
own specification (plan §6.6: the member file "may carry email, course and branch"; canvas
`goBulkImport`: "file, validate, preview, confirm"; plan §15.2: "some rows blocked").
Gate 1 asks which.

### Also on record — work that already exists on disk
Before `/request` was invoked, a member import was built in this session from RosiFit's own
spec (parser + 24 specs in `src/data/memberImport.ts`, screen at `app/member/import.tsx`, the
course detail's button repointed, two buttons under the search box). It is **staged and
uncommitted**; its commit was stopped by the fail-first guard. Intake does not build and does
not decide its fate — Gate 1 does: keep it as the v1 draft, or discard it and design fresh.

## DESIGN SURFACE
- SCREENS / ENTRY POINTS: "the course screen" — the screenshot is the **course list**
  (`(tabs)/courses`), and "below seach bar" names its Search courses box: two buttons there,
  **add member** and **bulk import**. The **course detail** (`course/[id]`) already carries an
  Add Member / Bulk Import pair under its Members heading and is where the bug lives.
  Whether "the course screen" means the list, the detail, or both: `unknown` — Gate 1 asks.
  The import flow's own screen(s): `unknown` (the canvas states the flow, "file, validate,
  preview, confirm", and draws none of it).
- STATES REQUESTER CARES ABOUT: unknown
- VISIBLE STRINGS STATED: "add member", "bulk import" (requester's words for the two buttons;
  the shipped buttons on the course detail read **Add Member** and **Bulk Import** — the
  freeze rule applies)

## GATE 1 — answered 04-Sep-2026, applied to the build
The requester answered Q1(a) by pasting the UniqBrio Bulk Student Import v1 feature detail
(template: three sheets — instructions, data with dropdowns, hidden lookup; `.xlsx` only, 5 MB,
500 rows; blank rows skipped; blank joining date = today; duplicates skipped, never
overwritten; per-student sub-transaction; results Imported/Skipped/Failed; error report;
owner-only) and said *"update anything if necessary and proceed with plan"*.

| # | Answer | Applied as |
|---|---|---|
| 1 | UniqBrio reference, adapted | its template SHAPE and rules, with RosiFit's six columns; **no phone** (C-70), **one course per row** (0006) |
| 2 | both | list: two buttons under the search box · detail: Bulk Import with the course fixed |
| 3 | partial | server-side sub-transaction per row (`bulk_import_members`, 0028) |
| 4 | skip, never overwrite | the reference's rule; the preview says so before the tap |
| 5 | first wins | rest blocked "appears earlier in this file" |
| 6 | 500 rows / 5 MB | the reference's ceilings, enforced in the parser AND the RPC |
| 7 | **owner-only** — changed from the intake recommendation to match the reference | `is_super_admin()` in the RPC; buttons hidden for staff; deep route shows a no-access state |
| 8 | web only | `pickFile` says so on native |
| 9 | keep the draft | reworked in place from CSV to `.xlsx` |

Adopted dependency: `exceljs@4.4.0` — verified on registry.npmjs.org, the library the reference
uses, pinned with `--save-exact`.

## STANDING INSTRUCTIONS (do not edit)
- Follow Track A end-to-end: Gate 1 questions → Gate 2 feasibility → Gate 3 design → Gate 4
  plan → build → test gate. **Stop at every gate.**
- Anything stated in FIELDS is binding and overrides assumptions; every `unknown` becomes a
  Gate 1 question with a reasoned recommendation — never a silent assumption.
- Ground first (Step 0): `CLAUDE.md`, `docs/registers/KNOWN_LIMITATIONS.md`,
  `docs/registers/CANONICAL_PATTERNS.md`, `docs/registers/ROOT_CAUSE_REGISTER.md`.
