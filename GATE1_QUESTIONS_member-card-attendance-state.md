# Gate 1 — Requirements: Attendance state on the member card

> From `requests/2026-09-07-member-card-attendance-state.md`. One question or one tight group
> at a time; every question carries a recommendation, so an answer can be "agree".

## FIELDS — from your request — correct anything wrong

- FEATURE NAME: Attendance state on the member card
- ONE-LINE GOAL: On a member card, see whether her attendance has been added — Present, Absent, or yet to be marked — and select the correct state there.
- WHO USES IT: `unknown` — asked as Q4
- MUST-HAVE in v1 (no priority signalled — **you trim here**):
  1. Three small labels/chips on the member card: **Present**, **Absent**, **Yet to mark attendance**
  2. They denote whether the attendance is added — which of the three she is currently in
  3. The correct state can be **selected** on the card — *"select the correct state, absent or present etc"*
- EXPLICITLY OUT of v1: `unknown`
- KNOWN CONSTRAINTS: none stated
- RUN MODE: auto (default — you did not say how to run)
- CLASSIFICATION: **NEW**, not CHANGE. Marking one member present or absent does not exist
  anywhere in this app: `src/data/repository.ts` has `fetchAttendance` and no attendance write,
  and the only thing that has ever created an attendance row is `commit_csv_import`, fed by an
  uploaded file. Say so if you would rather run it as a CHANGE.

## Step 0 — grounding, mode and scale

- **Branch** `main`; only the local harness (`db/harness/`) is writable; production is never an
  automated target. Migrations reach production only after you have seen the raw SQL and said go.
- **Run mode: auto.** Gates 1–4 are checkpoints; every taken recommendation lands in the
  ASSUMPTIONS ledger in the run report. **Q2 and Q3 below are hard stops that survive auto mode**
  — they reshape a stated security guarantee and they write over data an import produced.
- **Scale: full.** It fails the `scoped` entry test on one item: the schema change is a new
  function, not an additive column. Everything else about it is scoped-sized.
- **Product-advisor pass: skipped**, with the reason — this is a full-scale feature inside an
  area that already exists (attendance), not a new module or a new area (docs/24 §2).
- **Patterns this must mirror:** CP-001 (screens never branch on live-vs-fixtures) · CP-002
  (loading/ready/error) · CP-003 (a refusal says nothing was changed) · CP-010 (every status
  carries its own word AND icon) · CP-011 (follow-up stays derived — never a second list).
- **Root-cause classes live in this module:** **RC-008 / RC-017** — a confirmation may only be
  emitted by the resolution of a write; **RC-007** — never widen a table grant to reach a write;
  **RC-024** — roster rows key on the database id; **RC-010** — the numbers on this screen are
  computed, never literals.
- **What the database already fixes, before any of this is designed** (`0008_attendance.sql`):
  `attendance_records` hangs off a **session**, not a date; `attendance_unique_live
  (session_id, member_id)` makes one record per member per session an invariant;
  `absent_must_be_expected` forbids *absent* on a day she was not expected; `extra_is_not_expected`
  says an unexpected attender is `extra`; and `original_status` / `correction_reason` /
  `corrected_by` / `corrected_at` are already columns — 0008 anticipated exactly this feature.

---

| # | Question | Why it matters | Options (last is always "Other: describe your own") | **Recommendation + why** | Answer |
|---|---|---|---|---|---|
| 1 | **Which DATE is the chip about?** Your words are "the attendance", with no date. | Attendance is a per-session fact. A week has no single Present/Absent, so this decides whether the chips can be *selected* at all. | (a) the day selected in the week strip above the roster · (b) always today · (c) the whole week, as a summary · (d) Other | **(a) the selected day.** The strip already owns a selected day and your screenshot has **31 Aug** highlighted; the chips then read as "her state for the day I am looking at", and stepping the strip re-reads them. (b) makes the strip decorative on the one screen it belongs to; (c) cannot be selected, so it would answer half your ask. | **(a) the selected day** — 07-Sep-2026 |
| 2 | **HARD STOP — the write path.** Nothing signed in may write attendance today, deliberately: `authenticated` holds no write grant on the engine tables and attendance arrives only through server-side code running as `service_role`, so *"a stolen anon key cannot forge attendance"* (RBAC_MATRIX, 02-Sep-2026). Marking from a card needs a new way in. | This is the safety-floor half of the feature and it changes a guarantee the register states as a promise. It is also a permission-matrix row that has read ➖ / ➖ since adoption. | (a) a new `security definer` RPC, `set_attendance`, mirroring `set_member_status` (0031) and `commit_csv_import` (0024) · (b) a new Edge Function running as `service_role` · (c) don't build the write at all — the three chips are display-only for v1 · (d) Other | **(a) the RPC.** It is the blessed shape in this repo for exactly this: no table grant is widened (RC-007 is the incident that made that rule), the actor is passed and recorded, the invariants above are enforced by the database rather than by the screen, and the audit trigger fires the same way it does for every other write. (b) adds a second place for the same rule to drift, for no gain — there is no third party to call and no secret to hold. (c) ships the labels without the ask. | **(a) the RPC** — delegated: *"you decide best approach as super senior dev"*, 07-Sep-2026 |
| 3 | **HARD STOP — a session that was already uploaded.** She is marked Present by the Google Meet file; someone taps **Absent** on her card. | This writes over a record the register produced. It is the one place this feature can destroy something real. | (a) allow it, and keep what it was — `original_status`, `corrected_by`, `corrected_at` · (b) refuse when an import wrote the row, and say so · (c) allow it for the academy admin only · (d) Other | **(a), recorded as a correction.** Those four columns exist in 0008 for this and nothing writes them today. The file is evidence, not truth — a member who joined from another device is missing from the Meet export, and correcting her is the reason a person would tap a chip at all. Nothing is lost: the original status stays on the row and the audit log names who changed it. | **(a) allow, keep the original** — 07-Sep-2026 |
| 4 | **Who may mark?** | Decides the RPC's caller check and whether staff see the chips as controls or as read-only labels. | (a) academy admin and staff · (b) academy admin only · (c) Other | **(a) both.** The matrix already lets both roles mark a *session* held or cancelled ("a coach's job") and both write members. The register is front-desk work; admin-only would mean it is done later, from memory, or not at all. | |
| 5 | **Is "Yet to mark attendance" something you can SELECT, or only a state you can be IN?** | Selecting it means deleting an attendance record — the only destructive act this feature could contain. | (a) a state only: it shows when nothing is recorded, and correcting a mistake means picking the other of Present/Absent · (b) selectable, as an undo that clears the record · (c) Other | **(a) a state only.** Your own words describe it as a state — "yet to mark attendance" — and the two real answers are the two you named. Clearing a record is not a correction, it is a hole in the register, and the mistake it would fix is already fixable by picking the other chip. | |
| 6 | **A day the course does not run, and a day still to come.** Mon/Wed/Fri/Sat for this course; the strip already draws Tue/Thu/Sun as *Not expected*. | The database refuses some of these outright, so the design has to decide them rather than discover them: `absent_must_be_expected` rejects *Absent* on a day she was not expected, and an unexpected attender must be written as `extra`. | (a) day it runs → both chips; day it does not → **Present** only, written as `extra`, with Absent disabled and its reason shown; a future date → all three disabled, reading *Yet to mark* · (b) hide the chips entirely except on a day the course runs and has passed · (c) Other | **(a).** It keeps the card's shape identical on every day of the week — chips never appear and disappear under the reader — and it says *why* a control is unavailable instead of silently removing it. It also uses `extra` for what `extra` means: she turned up when she was not expected, and it never counts as a miss. | |
| 7 | **No session row exists for that day.** Attendance hangs off a session, and a course whose classes are not on a fixed timetable has no scheduled rows. | Without an answer, the first tap on a course like *hhhhh* fails with a foreign-key error. | (a) find-or-create the session inside the same RPC, as `commit_csv_import` already does · (b) refuse, and tell the user to upload a session first · (c) Other | **(a) find-or-create.** 0024 exists because that exact assumption ("a session already existed to upload against") was wrong; repeating it here would repeat the defect. `sessions_unique_live (offering_id, session_date)` guarantees the created session cannot become a rival of a real one. | |
| 8 | **The follow-up numbers move.** Marking her absent raises *Missed* and *consecutive* on this same card, on the dashboard count, and can put her into the weekly follow-up list — which is what gets emailed. | Guardrail 1: those numbers are DERIVED from attendance. This is the feature working, not a side effect — but it means a tap on a roster card can add somebody to a send list. | (a) yes, that is the point — the numbers re-read straight after the write · (b) yes, but the chip warns before a mark that would push her over the follow-up threshold · (c) Other | **(a), with no extra warning.** The threshold is *3 or more missed sessions*, stated on this very screen, and the card's own line already shows her count moving. A confirmation before every absent mark would sit in front of the most ordinary action on the register. Nothing is sent by this feature — sending stays its own deliberate flow. | |
| 9 | **Where else does this go?** The ask says "member card". | The same person appears on the member-detail dialog, the members tab and the Attendance tab. | (a) the course roster card only, for v1 · (b) also the member-detail dialog · (c) everywhere a member is listed · (d) Other | **(a) the course roster card only.** It is the surface you screenshotted, and it is the only one that already has a chosen day to mark against — the others have no date in scope, so the chips would need a date picker each. If it works here, extending it is one more `/request`. | |
| 10 | **The third chip's wording.** You said *"Yet to mark attendance"*; the strip legend on the same screen says *Awaiting upload*. | Both words are on screen at once, so they will be read against each other. Shipped strings are frozen once out. | (a) chip reads **Yet to mark**, full phrase as its accessible label · (b) chip reads your full phrase *Yet to mark attendance* · (c) chip reads *Awaiting upload*, matching the legend · (d) Other | **(a).** Your words, trimmed to fit a chip beside two one-word siblings, with the full sentence still announced to a screen reader. (c) is wrong now: once a person can mark her by hand, "awaiting upload" stops being true. | |

---

## Mandatory sections

### Usage profile — every `unknown` line of the request

| Fact | Question | **Recommendation + why** | Answer |
|---|---|---|---|
| Frequency of use | How often is a member marked by hand — every session, or only to correct an import? | **Correction-first, several a day at most.** The Meet upload is the bulk path and stays it; hand-marking is for the member the file missed. This is why the chips are on the card rather than a marking mode of their own. | |
| Essential vs optional info | Beside the three chips, does the card need to say *how* the state got there (file vs by hand)? | **Not on the card.** The state is essential; its provenance is occasional and belongs in her record. One extra line on every roster row costs more than it tells. | |
| Frequent vs occasional actions | Is marking now the card's primary action, ahead of opening her record and Edit? | **Yes — one tap, no confirmation, no dialog.** Opening her record and Edit stay where they are. | |
| Automate vs must stay manual | Should a member with no record by end of day be auto-marked absent? | **Must stay manual.** An automatic absent is an unattended write against the follow-up rule that sends email. Nobody asked for it. | |
| Operating environment | Front desk on a phone during class, or a desk browser afterwards? | **Both, designed narrowest-first.** Your screenshot is a desktop browser; the chips must still fit a phone card without pushing the name or the Active pill off the row. | |

### Cardinality

| Entity A | Entity B | Relationship | Recommendation | Answer |
|---|---|---|---|---|
| member | attendance_record | 1:N | As shipped. | |
| session | attendance_record | 1:N | As shipped. | |
| (session, member) | attendance_record | **1:1 live** | Enforced by `attendance_unique_live`; the RPC upserts against it, never inserts blind. | |
| offering (course × branch) | session | 1:N, **one per date** | `sessions_unique_live`; find-or-create keys on it. | |
| member | offering | 1:1 live enrolment | One active enrolment (0006) — so a member card resolves to exactly one offering, and the chips need no branch picker. | |

### Roles and permissions — the five questions

| Capability | Which roles | Default per role | Owner-configurable? | Answer |
|---|---|---|---|---|
| **Write attendance by hand** (new — `set_attendance`) | admin ✅ · staff ✅ (Q4) | on for both | 🔒 no — RosiFit has no permissions UI by design | |

1. New capability: **yes.** 2. Existing permission changes meaning: **yes — the "Write attendance"
row moves from ➖/➖ ("nobody, through the client") to both roles via a `security definer` RPC**;
the table grants themselves do not move, so the anon-key guarantee is intact in the form that
matters. That row is rewritten in this same change, with the reason and the date. 3–5 as above.

### States — the member card and its chips

Loading (week still fetching) · nothing recorded (*Yet to mark*) · Present · Absent · marking
in flight · refused (RLS, caller, or an inactive account) · offline / no database configured ·
future date · not-expected day · the week failed to load. **A refusal says what failed and that
nothing was changed** (CP-003), rendered on the card rather than as a toast that scrolls away.

### Platform limitations — both active entries land on this control

- **KL-002** — `accessibilityState` never reaches the DOM on react-native-web. Three chips where
  one is current is a radio group, so `aria-checked` is written **directly** on each `Pressable`.
  The workaround is the canonical pattern here, not an option.
- **KL-003** — Space does not operate a focused `Pressable`. The chips take the `spaceSelects`
  helper already in `app/member/edit.tsx`, or a keyboard user cannot pick one the way every
  radio group in the world is picked.

### Out of scope for v1 (proposed — trim or extend at this gate)

Marking from the member-detail dialog, the members tab or the Attendance tab (Q9) · marking
several members at once · a reason or note on a correction · unmarking (Q5) · marking a whole
session Present in one action · any change to the Meet upload · any change to the follow-up rule
or to what is sent.
