# Gate 1 — Requirements: Bulk member import

> From `requests/2026-09-04-bulk-member-import.md`. One question or one tight group at a time;
> every question carries a recommendation, so an answer can be "agree".

## FIELDS — from your request — correct anything wrong

- FEATURE NAME: Bulk member import
- ONE-LINE GOAL: From the course screen, a user can add any number of members to any course from an uploaded file built on a template.
- WHO USES IT: unknown (you said "user")
- MUST-HAVE in v1 (no priority signalled — **you trim here**):
  - placed "in the course screen", where a user "can add any number of members associated to any course"
  - the **template format** is the same as the UniqBrio Mobile App's bulk import
  - the **upload feature** is the same as the UniqBrio Mobile App's, "in reliance with Rosifit app structure"
  - "below seach bar two buttons one add member and other is bulk import"
  - the bug: **"bulk import is opening upoad attendnace"** — fixed
- EXPLICITLY OUT of v1: "do not touch anything in UniqBrio Mobile app"
- KNOWN CONSTRAINTS: the UniqBrio Mobile App is the reference and is read-only
- CLASSIFICATION: **NEW** (the bug is the feature's absence — the button points at the only importer that exists). Say so if you'd rather run the bug as its own Track C item.

## Step 0 — grounding and assumptions

- Branch `chore/framework-adoption`; only the local harness is writable; production is never an automated target. No schema change is expected — `create_member` (0016) already writes one member atomically, so a file is N calls to it.
- Patterns this must mirror: CP-001 (one data source), CP-002 (loading/ready/error), CP-003 (failure text says nothing was changed), CP-014 (sheets). Root-cause class in this module: **RC-012** — never resolve a member against the fixture array; the import reads `useMembers`/`useCourses`.
- Limitations register: no active entries. One practical limit below (Q8).
- **Assumption stated, not decided:** "the course screen" has two readings (Q2).

| # | Question | Why it matters | Options | **Recommendation** | Answer |
|---|---|---|---|---|---|
| 1 | **The template.** The UniqBrio app cannot be read from here (the two folders on this machine hold a design canvas and screenshots — no source, no template; its Supabase project is refused). What defines "same as UniqBrio"? | "Same as UniqBrio" is binding but currently unverifiable. Build to a guess and the first correction round is the columns. | (a) you send the UniqBrio template file or a screenshot of it · (b) accept RosiFit's own spec: plan §6.6 (the member file "may carry email, course and branch") + the canvas flow "file, validate, preview, confirm" · (c) wait | **(b)**, with six columns: `Full Name`* · `Email` · `Course` · `Branch` · `Display Names` (`;`-separated Meet names) · `Joined On` (YYYY-MM-DD). Only the name is required; blank Course/Branch mean "the course this was opened from". If UniqBrio's columns differ, (a) replaces this list at no cost now and at a rebuild's cost later. | |
| 2 | **"The course screen"** — the course **list** (your screenshot, with the search box), the course **detail** (already has Add Member / Bulk Import under Members — where the bug lives), or both? | Decides where the two buttons go and whether the course is pre-chosen. | list only · detail only · both | **Both.** On the list, under the search box: neither course is decided, so both buttons open asking which course. On the detail, the existing pair stays and Bulk Import opens with the course **fixed** — "add these to THIS course" is the whole act there. | |
| 3 | **One bad row.** If row 7 of 40 is unusable, do the other 39 import? | The attendance import is all-or-nothing (a register is one session's truth). Plan §15.2 says the member import is different: "some rows blocked". | all-or-nothing · partial, blocked rows named | **Partial.** Every row is judged before anything is written; blocked rows show their **spreadsheet row number** and the reason ("row 7 — Divya Ramesh is already on the register"), and the confirm button says the number it will write. Each member is her own transaction, so a refusal stops her row and no other. | |
| 4 | **A name already on the register.** Block the row, or update her from the file? | Silent merging is how two people become one; silent duplicating is how one becomes two. | block with reason · update existing · create anyway | **Block, and say "edit her instead".** Editing exists (0027, this morning). An import that updates would need a rule for which cells win, and that rule would be invented. | |
| 5 | **Two rows, one person** (same name twice in the file; same display name on two rows; same email twice). | Display names are unique academy-wide — an attendance import must never have to guess. | first wins, rest blocked · block both · import both | **First wins, the rest are blocked** with "appears earlier in this file". Blocking both would lose a real person to a copy-paste slip. | |
| 6 | **"Any number of members."** Is there a size you expect — 20, 200, 2,000? | Each row is one `create_member` call (~150–300 ms live). 40 rows ≈ 10 s; 500 rows ≈ 2 min with a progress count; 5,000 needs a batch RPC and a migration. | ≤100 · ≤1,000 · more | **Design for ≤ a few hundred**, no artificial cap, a live "37 of 120…" count while it runs, and a batch RPC recorded as the follow-up if a real file ever exceeds that. | |
| 7 | **Who can import?** | `create_member` is granted to `authenticated`, so staff can already add one member. | admin only · admin + staff | **Both roles** — forty members is the same capability as one, and an owner-only import would send staff back to adding one at a time. | |
| 8 | **The file picker is web-only.** `pickCsvFile` says so plainly on a native build. Acceptable for v1? | RosiFit ships as a PWA; a native document picker is a new dependency. | web only · add native picker | **Web only for v1**, same as the attendance upload today; the message on native already states it. | |
| 9 | **The draft on disk.** Before `/request`, a member import was built here to spec (b): parser + 24 specs, the screen, both button placements, the bug repointed — green on 253 unit tests, contrast, icons and all nine audits, staged and uncommitted. | Intake does not decide its fate; you do. | keep as the v1 draft · discard and design fresh at Gate 3 | **Keep as the draft.** It is exactly Q1(b), Q2 both, Q3 partial, Q4 block, Q5 first-wins. Gates 2–4 review it rather than reinvent it; anything you change at this gate is applied to it. | |

---

## Cardinality

| Entity A | Entity B | Relationship | Recommendation | Answer |
|---|---|---|---|---|
| import file | member | 1:N — one file creates many; one member comes from at most one row | no import record is stored; the audit log carries `member.created` per row, attributed to the importer | |
| member | offering (course at a branch) | 1 active at a time (GiST exclusion, 0006) | the file's Course + Branch (or the opened course) resolve to one offering per row; no row may name a course that does not run at that branch | |
| member | display name | 1:N, unique **academy-wide** | duplicates block (Q5) | |
| member | email | 1:N, one primary | the file gives one address; it becomes primary | |

## Roles and permissions

| Capability | Which roles | Default on/off per role | Owner-configurable? | Answer |
|---|---|---|---|---|
| Bulk import members | academy admin, staff (Q7) | on · on | no — same as Add Member; a policy, not a switch | |

## States

- **loading** — courses and the register are both needed before a file can be judged; skeleton until both land.
- **empty (not configured)** — no course exists yet: "add the course first — a member joins a course at a branch", with Add Course as the next action.
- **file refused** — no `Full Name` column, or a header with nothing under it: the message names what is missing and offers the template.
- **partial** — the preview with N ready · M blocked, each blocked row named; the confirm writes the ready ones only.
- **error** — the course list failed to load: CP-003 wording, retry; nothing was changed.
- **permission-denied** — the subscription is not writable: `create_member` refuses with its own sentence; shown per row.
- **offline** — the file is read locally; the confirm fails with the unreachable-network sentence and nothing is written.

## Platform limitations
None registered. Web-only file picker (Q8), already the case for the attendance upload.

## Out of scope
- Touching anything in the UniqBrio Mobile App.
- Updating existing members from a file (Q4 — edit her instead).
- Weekday overrides from the file — not a column; set on her form after import.
- A stored import record or an undo; each created member is edited or removed individually.
