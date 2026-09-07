# Design Spec — Attendance state on the member card

**Date:** 07-Sep-2026 · **Binding artifact** · From `requests/2026-09-07-member-card-attendance-state.md`
Gate 1 answers and Gate 2 verdict (Build now) are inputs and are not restated.

---

## 1. What is being designed

One row of three chips on each member card of the course detail roster
(`MemberCard`, `app/course/[id].tsx`), stating and setting that member's attendance for **the day
selected in the week strip**:

> **Present** · **Absent** · **Yet to mark**

The chip that is true is filled; the other two are outlines and are the two ways to change it.
One tap writes. Nothing else on the card moves.

**Primary action of this screen** is unchanged — it is still *open a member's record*. Marking is
the primary action of the **card's second row**, which is the row this feature adds.

## 2. Reuse first (A3.1) — nothing new is invented

| Concern | Resolution |
|---|---|
| Chip / pill visual | **This app already has it** — the Active/Inactive pill in `MemberCard`: `statusSurface(ink)` fill and border, `RADIUS.pill`, icon 13 + word 9.5/800, `minHeight: 30`, `paddingHorizontal: 8`, `gap: 4`. The chips are that pill, three times |
| A second row of controls on the card | **This app already has it** — the two no-email action buttons, `marginTop: 11`, `flexDirection: 'row'`, `gap: SPACE.sm`. The component's own comment says why controls that are sentences do not squeeze in beside the avatar and the pill; three chips are the same case |
| Status word + icon + per-theme ink | `STATUS` in `src/theme/tokens.ts` — `present` (`check`) and `absent` (`close`), each with `fgDark`/`fgLight` already measured |
| A "nothing recorded yet" tone | `theme.dim` + `theme.line`, the treatment the Inactive pill already uses. **No new colour role**, so `design/tokens.json` is untouched |
| Radio-group semantics on this platform | `spaceSelects` + direct `aria-checked`, both already in `app/member/edit.tsx` (KL-002, KL-003) |
| Write, confirm, refuse | The Active pill's `applyStatus` shape: await the write, flash on resolution only, render the refusal (CP-003, RC-008) |
| Component library | No GAP row applies. This is a screen-local control on one card, not a baseline concern — nothing to contribute back, nothing to register |

**One genuinely new glyph name:** `radio_button_unchecked` for *Yet to mark* — verified present in
`MaterialIcons.json`. It is the only status icon in this feature that `STATUS` does not already
carry, and it is deliberately not `cloud_upload` (the strip's *Awaiting upload*): once a person
can mark by hand, "awaiting upload" has stopped being what the state means.

## 3. Usage-profile translation (A3.1b), then subtraction (A3.2 / §3c)

| Profile fact | Translation |
|---|---|
| Frequent action: mark the correct state | **Primary screen, one interaction.** A chip is the control; no dialog, no confirmation, no edit mode |
| Essential: which state she is in | Rendered on the card, in a word and an icon, always visible |
| Occasional: how the state got there (file vs hand) | **Not rendered.** It is in the audit log and on her record |
| Automate: nothing | An automatic absent would write against the follow-up rule unattended. Never |

**Subtraction pass, per surface:**

- *Member card* — removed a confirmation dialog (the substitution table: immediate action, and
  the mistake is fixed by tapping the other chip — the act is not destructive); removed a
  per-card "which day" caption (it repeats on every row — one caption for the roster instead);
  removed a "marked by hand" badge (occasional info); removed a fourth *Extra* chip (the
  distinction is expectation, not attendance, and the database records it without the reader
  having to).
- *Roster* — **one line added, not a screen**: `Attendance for Mon 31 Aug` under the search box.
  Nothing removable beyond it; the roster is already one heading, one search box, one list.
- *Course screen overall* — nothing else changes. The strip, the header actions and the follow-up
  sentence are untouched.

**Three-interaction budget:** counted in §9. Marking is **1**.

## 4. Layout

```
┌ member card ─────────────────────────────────────────────────────────────┐
│ (A) anita                                    [✓ Active]  [✎]             │   ← unchanged row
│     ani@g.com                                                            │
│     Missed 31 Aug – 6 Sep 2026: 0 · consecutive 0                        │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│ [✓ Present]  [✕ Absent]  [◯ Yet to mark]                                 │   ← the new row
└──────────────────────────────────────────────────────────────────────────┘
```

- The new row is a sibling of the existing row, `marginTop: 11`, `gap: SPACE.sm`, left-aligned —
  the same shape as the no-email action row that already ships in this component.
- `flexWrap: 'wrap'`, so at the narrowest supported width the third chip wraps under the first
  two rather than truncating. **No chip ever truncates its word** — the word is half the signal
  (DR-3), so it is the row that gives, never the label.
- Chip metrics, identical to the Active pill: `minHeight: 30` · `paddingHorizontal: 8` ·
  `borderRadius: RADIUS.pill` · `borderWidth: 1` · icon 13 · label 9.5/800 · `hitSlop: 6`.
  Widths ≈ 74 / 68 / 92 pt; the three plus gaps ≈ 250 pt, inside a 320 pt card.
- The roster caption sits under the search box, before the first card: 11.5 pt, `theme.muted`,
  `Attendance for Mon 31 Aug`. It is what makes every chip below it unambiguous without repeating
  a date on every row.

## 5. Every state (A3.3)

| State | Present chip | Absent chip | Yet to mark | Card says |
|---|---|---|---|---|
| Nothing recorded, past/today, day the course runs | outline, tappable | outline, tappable | **filled**, not tappable | — |
| Recorded present (or `extra`) | **filled** | outline, tappable | outline, not tappable | — |
| Recorded absent | outline, tappable | **filled** | outline, not tappable | — |
| Day the course does **not** run | outline, tappable → writes `extra` | **disabled** | **filled** | Absent's label: *"She was not expected on Tuesday — mark her Present and it is recorded as extra"* |
| Date in the future | disabled | disabled | **filled** | *"That day has not happened yet"* on both disabled chips' labels |
| Marking in flight | the tapped chip at `opacity: 0.6`; **all three disabled** | | | nothing said — the write is the feedback |
| Write refused (RLS, inactive account, subscription) | the group returns to the state the data holds — **never the tapped one** | | | toast: *"Her attendance was not changed. Nothing has been saved."* + the reason |
| Not configured / fixtures (`dataSource !== 'live'`) | writes the fixture, chip moves | | | toast: *"Marked on this device only. The academy database is not configured."* (`warn`) — the Active pill's exact wording pattern |
| Week still loading | a 30 pt-high placeholder in the chips' place, so the card does not jump | | | — |
| Week failed to load | **no chips** | | | one muted line: *"Her attendance for this week could not be loaded."* The retry already lives under the strip; a second one per card would be six retries for one failure |
| Member is inactive | chips unchanged and fully usable | | | Inactive means *left out of follow-up*, not *off the register*: "her attendance goes on being recorded" — the app already says so in the confirm sheet, and this honours it |
| First run / empty roster | not reached — the empty state owns the screen | | | — |
| Permission denied | not reachable: both roles may mark (Gate 1 Q4) | | | — |

**No optimistic UI.** A chip fills when the write resolves, not when it is tapped. RC-008 and
RC-017 are both "the app reported something it had not done", both in these files, and a register
that fills in a chip it failed to save is the same defect in a third costume.

## 6. Lists and dashboards

**A3.3b — N/A with reason.** CP-23 `ListControls` is a framework-seed pattern with no
implementation in this repository (CANONICAL_PATTERNS starts at CP-001 after the adoption
supersede); this roster's search and its scope filter already ship, and this change adds no list.
**A3.3c — N/A**: no dashboard section is added. The dashboard's existing follow-up count moves
because attendance moved, which is guardrail 1 working, not a new metric.

## 7. Theme and contrast (A3.4)

Semantic tokens only; no literal enters the code.

| Surface | Light | Dark |
|---|---|---|
| Present, selected | `statusSurface(STATUS.present.fgLight)` fill/border, ink `#0F7551` | same on `fgDark` `#2FBE8C` |
| Absent, selected | `statusSurface(STATUS.absent.fgLight)`, ink `#B3261E` | `fgDark` `#F2683C` |
| Yet to mark, selected | `statusSurface(theme.dim)`, ink `theme.dim` | same |
| Any chip, unselected | `backgroundColor: 'transparent'`, `borderColor: theme.line`, ink `theme.muted` | same |
| Any chip, disabled | as unselected at `opacity: 0.45`, not pressable, `aria-disabled` | same |
| Roster caption | `theme.muted` on `theme.bg` | same |

Every pair above is a pair `scripts/check-contrast.ts` already measures (status inks on
`statusSurface`, `muted`/`dim` on `bg` and `surface`) — **the audit is the evidence, not a hand
count**. No new colour role, so `design/tokens.json` and the per-theme asset decisions
(docs/14) are untouched.

## 8. Copy — the string table (A3.5)

| Surface | Placement | Final string |
|---|---|---|
| Roster | caption under the search box | `Attendance for {Mon 31 Aug}` |
| Chip 1 | label | `Present` |
| Chip 2 | label | `Absent` |
| Chip 3 | label | `Yet to mark` |
| Chip 1 | accessible label | `Mark {name} present on {Monday 31 August}` |
| Chip 2 | accessible label | `Mark {name} absent on {Monday 31 August}` |
| Chip 3 | accessible label | `{name} has no attendance recorded for {Monday 31 August}` |
| Chip 2, not-expected day | accessible label | `{name} was not expected on {Tuesday 1 September}. Mark her present and it is recorded as extra.` |
| Chips, future date | accessible label | `{Friday 11 September} has not happened yet` |
| Toast, saved live | after the write resolves | `{First name} is marked present on {31 Aug}` / `… absent on …` |
| Toast, fixtures | after the write resolves | `{First name} is marked present on {31 Aug} on this device only. The academy database is not configured.` |
| Toast, refused | after the write rejects | `Her attendance was not changed. Nothing has been saved.` |
| Card, week failed | in place of the chips | `Her attendance for this week could not be loaded.` |

**Freeze rule honoured:** `Present` and `Absent` are the shipped `STATUS` words, reused
letter-for-letter, not re-coined. `Yet to mark` is the requester's own phrase trimmed to chip
width, with the full sentence in the accessible label (Gate 1 Q10). The strip legend's
*Awaiting upload* is **not** changed by this feature — it still describes the strip's own
question, which is about the session, not about one member. PRODUCT_LEXICON has no rows yet, so
nothing to check against; the three chip words are candidates for its first entries and are noted
for `/promote`, not added here.

## 9. Scenario dry run (A3.8)

Walked against the live-shaped roster: 2 members with email, 1 without, 1 inactive, 1 with a name
that wraps, 1 with a 40-character address, 1 with a Meet-imported present, 1 with an absent, 1
with nothing recorded, 1 on a not-expected day, 1 on a future date.

| # | Scenario | Interactions | Verdict |
|---|---|---|---|
| 1 | *"Anita turned up, the file missed her."* Open course → tap **Present** | **1** (the course was already open) | PASS |
| 2 | *"Mark yesterday, not today."* Tap yesterday in the strip → tap **Absent** | **2** | PASS |
| 3 | *"Who is still unmarked?"* Read the roster — every card states one of three words | **0** | PASS |
| 4 | *"I marked the wrong person."* Tap the right chip on her card | **1** | PASS |
| 5 | *"She came to Tuesday's catch-up"* (not a scheduled day) → tap **Present**, stored `extra`, Absent disabled with the reason | **1** | PASS |

Longest path is 2 of 3. **Keyboard-only pass:** Tab reaches the card, then the Active pill, then
Edit, then each chip in order; Enter presses; **Space presses only because `spaceSelects` is
carried** (KL-003) — without it the page scrolls instead, which is why it is in the spec and not
left to the build. Focus stays on the chip after the write, so a correction is one more key.
Disabled chips are skipped, not focused-and-dead.

**Edge records walked:** a member with no email (the chips sit under her two action buttons, one
row lower, same shape) · a member with a very long name (the top row already truncates; the chip
row is unaffected because it is a sibling, not a child) · a day with no session row at all (the
RPC creates it) · two taps in quick succession (the group is disabled while in flight, and the
RPC is idempotent).

## 10. Permissions (A3.6)

Answered in full at Gate 1 and carried here: new capability **yes** (`set_attendance`); an
existing permission **changes meaning** — RBAC_MATRIX's *Write attendance* row moves from ➖/➖ to
both roles **through the RPC only**, with the table grants unmoved so the anon-key guarantee
stands; both roles default on; nothing owner-configurable, because RosiFit has no permissions UI
by design. The register row is rewritten in this same change, dated, with the reason.

## 11. Customer-facing artifacts (A3.7)

**N/A.** This feature produces and consumes no file. The Google Meet import is untouched.

## 12. Responsive behaviour

From the narrowest supported width up. **Measured on the built page (07-Sep-2026), not
predicted:** at 320, 360 and 768 pt all three chips sit on ONE line — 71 + 68 + 90 pt plus gaps
inside a 296 pt card — no word is clipped (`scrollWidth === clientWidth` on each label) and the
document never scrolls horizontally. `flexWrap: 'wrap'` stays on the row as the guard for a
future longer word or a larger text scale; it is not exercised at any supported width today.
The top row's truncation behaviour is unchanged at every width — the chip row is its sibling and
takes none of its space, which is the whole reason it is a second row.

---

## DESIGN QA — Attendance state on the member card — 07-Sep-2026

```
Area                    verdict   evidence
1  User flow            PASS      5 scenarios walked; longest 2 interactions of 3 (§9)
2  IA                   PASS      state sits on the member it describes; no new screen, no new nav level
3  Navigation           PASS      nothing added or moved; the strip keeps its selected day
4  Interaction design   PASS      1 tap, no dialog; substitution table applied (confirmation removed)
5  Visual hierarchy     PASS      chips are a second row, subordinate to name and to the Active pill
6  UI consistency       PASS      the Active pill's exact metrics, tokens and press treatment, 3x
7  Accessibility        PASS      radiogroup + direct aria-checked (KL-002), spaceSelects (KL-003),
                                  word+icon per chip (DR-3), focus retained after write
8  Responsive           PASS      wrap at <=360pt; no truncation of a chip word at any width (§12)
9  Forms / data entry   N/A       no form; one-tap control
10 States and feedback  PASS      11 states specified (§5); no optimistic fill (RC-008)
11 Error handling       PASS      refusal names what failed and that nothing changed (CP-003);
                                  load failure replaces the chips rather than guessing a state
12 Empty states         PASS      "Yet to mark" IS the empty state and it offers the next action
13 Dialogs              N/A       none added, and one deliberately removed
14 Cognitive load       PASS      three words, one true; the day named once for the roster
15 Design simplicity    PASS      subtraction pass recorded per surface (§3); 4 things removed
16 Production readiness PASS      no new token, no new dependency, one new verified glyph
17 Edge cases           PASS      not-expected day, future date, no session row, double tap,
                                  inactive member, no-email card, fixtures mode (§5, §9)
18 Overall UX           PASS      no-manual test walked in scenario 1; no decoration doing
                                  hierarchy's work

Grade: Production-ready
Open findings: none blocking. One carried into the build as a hard requirement, not a
  preference: the chip fills on the RESOLUTION of the write, never on the tap.
Iterations: 2 — first pass raised 2 NEEDS-IMPROVEMENT (a per-card date caption that repeated on
  every row; a fourth "Extra" chip that made the reader learn a distinction the database keeps
  for them) and 1 CRITICAL (chips filling optimistically on tap — RC-008's exact class). All
  three resolved above.
```

**Canvas:** not produced. Auto mode skips it by default (Track A, A3.9) — it exists for a
synchronous human review that this run defers to the report. The spec above is the binding
artifact.
