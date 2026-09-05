# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## ROUGH DESCRIPTION (verbatim)
> In member addition form by default make sure the frequency is already selected based on the
> course only the member can deselect if they want

## FIELDS
- FEATURE / SCREEN: Member addition form (`app/member/edit.tsx`, add mode) — the
  "Her own days — optional" day chips.
  **Intake reading, to confirm at the first gate:** the requester's word is "frequency"; the
  only per-course selectable thing on this form is that day-chip row (the course carries a
  `frequency` count, its offerings carry the weekdays those chips are drawn from). If
  "frequency" meant something else, correct it at the gate.
- CURRENT BEHAVIOUR: The day chips start with **nothing selected**. Only days the chosen
  course's offerings actually run are pickable; the rest warn on tap. The helper line reads
  "Leave blank and she follows the days {course} offerings run — {days}. Only those days can be
  picked." On save, an empty selection is sent as `weekdays: null`, which means "follows the
  offering's days" — deliberately not the same as an empty list. Choosing a course or a branch
  clears the selection back to none.
- DESIRED BEHAVIOUR: By default the days are **already selected based on the course** — the
  member does not have to pick them. She can deselect any of them if she wants.
- WHY: unknown (requester did not say)
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR
- CORRECTION ROUND: 1

### Answered at Track B's B3 (05-Sep-2026, auto mode — recommendation taken and logged)
- WHICH DAYS PRE-SELECT: **every day the chosen course runs** — the same set the chips already
  allow. With a course but no branch yet that is the union of its offerings; it narrows to the
  one offering's days when the branch lands, and the row re-seeds.
- THE `null` MEANING — **kept.** A row still on its seeded default saves as `null`, exactly as a
  blank row did: she follows the offering, and follows it still if its schedule changes later.
  Only a NARROWER selection becomes a real `member_schedules` override. The alternative — saving
  the seeded list literally — would give every new member an override row equal to today's days
  and leave her expected on days the course had stopped running. Say the word if that literal
  reading is what was wanted; it is a one-line change from here.
- EDIT MODE — **excluded, deliberately.** The `Member` record carries no weekdays, so the Edit
  form cannot know her real override; seeding it from the COURSE would show days that are not
  hers. Its chips and its helper line are untouched, byte for byte. (The related pre-existing
  defect this surfaced — Edit silently ending her override on save — is recorded as **TD-019**
  and needs a request of its own.)
- DESELECT TO EMPTY: unchanged — an empty row means "follows the course", as it does today.
- COURSE / BRANCH CHANGE: **re-seeds** from the new course instead of clearing to none.
- BULK IMPORT: **out.** `app/member/import.tsx` sends no days at all and is untouched.

### Left `unknown` at intake — Track B's B3 answered these
- WHICH DAYS PRE-SELECT: all days the chosen course runs, or some subset — `unknown`.
- THE `null` MEANING: pre-selecting every course day means the saved value is now an explicit
  list rather than `null` ("follows the offering's days"), so she would no longer track the
  course if its days later change. Whether that consequence is intended — `unknown`.
- EDIT MODE: the requester said "member addition form". Whether the same pre-selection should
  apply when editing an existing member — `unknown`.
- DESELECT TO EMPTY: what an all-deselected row should then mean (an explicit no-days record,
  or back to "follows the course") — `unknown`.
- COURSE / BRANCH CHANGE: the selection is cleared today on both; whether it should instead
  re-seed from the new course — `unknown`.
- BULK IMPORT: whether `app/member/import.tsx` is in scope — `unknown` (not named).

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: Member addition form only, loaded state — the day-chip row goes
  from all-off to pre-selected. States where no course is chosen yet and where the course has
  no offering already have their own copy and are unaffected by the ask. Empty / loading /
  error / offline / permission-denied: `unknown` — not named by the requester.
- STRINGS ADDED OR ALTERED: `unknown` — the requester named no wording. The existing helper
  line ("Leave blank and she follows the days…") describes the behaviour being changed, so the
  plan has to say whether it still tells the truth; everything else on the screen is frozen
  (the freeze rule).
- PERMISSIONS: no — nothing about who can see or do anything changes
- RUN MODE: auto (default — not stated by the requester)

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
