# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## FIELDS
- WHERE: every form dialog in the app — stated as "any button which opens a form dialog", "across all forms". The screenshot supplied is `member/edit` ("Welcome a new member").
- WHAT HAPPENS: "on click of any button which opens a form dialog is appear but the background is black but it should not". The dialog itself renders correctly; the area around it is black.
- WHAT SHOULD HAPPEN: "it should show the screen in background like same as in attached image" — the screen the dialog was opened from is legible behind it. Reference image supplied: a second application's dialog over its own course list, where the list behind is dimmed but readable.
- WHEN IT STARTED: unknown as stated. Requester did not say; the surface was last changed 05-Sep-2026 (`c5620a0`).
- WHO IS AFFECTED: all users, all form dialogs — stated as "across all forms". No selectivity stated: the requester did not say it is right anywhere. Theme selectivity `unknown` (the screenshot is dark theme only).
- REPRO STEPS: 1) Open any screen with a form 2) Tap the button that opens the dialog (e.g. Add Member) 3) Observe the area outside the card.
- WAS WORKING BEFORE?: no — this is the same surface `c5620a0` set out to fix, and the requester is reporting it again.
- CORRECTION ROUND: **2** — previous attempt `c5620a0` "The form dialog's backdrop was a claim, not a screen", closing `requests/2026-09-05-dialog-opens-at-top.md`, recorded as RC-016.

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

## ROUND 2 — what the previous attempt missed
Required by the standing instructions, written before any fix is proposed.

`c5620a0` diagnosed a **composition** defect and fixed exactly that: the Stack's
`screenOptions` painted `contentStyle: theme.bg` onto every screen including dialog routes, so
a `transparentModal` covered the mounted screen with an opaque `#08040A` panel. It added
`contentStyle: transparent` (via `DIALOG_SCREEN`) and `backdrop-filter: blur(14px)`.

That fix was correct and is still in place. What it treated as finished was a **boolean** —
is the screen behind covered, or not — and it verified against that boolean: the commit
message records screenshots "with the screen behind visible and blurred". Visible it is. The
question never asked was *how much*, and the value that decides it was never revisited:

`DARK.scrim` is `rgba(6,2,7,0.7)` and `LIGHT.scrim` is `rgba(28,10,23,0.42)`. Those were
chosen while the backdrop was an opaque panel — the scrim was doing the entire job of saying
"this is over something", because there was nothing behind it to show. With the panel gone,
70% of near-black over a `#08040A` app background, compounded by a 14px blur, leaves the
screen technically composited and perceptually black. FormDialog's own docstring states the
obligation the round-1 fix left unmet: *"you can tell where you are without being able to
read it."*

So round 1 removed the blocker and left the dimming tuned for a world where the blocker was
still there. Round 2 is the value, not the composition.

**Process finding, per the standing instruction.** A recurring "fixed" bug is flagged for
`/framework-update`: round 1's verification was a screenshot judged by the agent that wrote
the change, against a criterion ("visible") it also chose. No rung distinguishes "composited"
from "legible", and G8 cannot run at all (TD-006), so nothing but that judgement stood between
the change and the requester seeing it again.
