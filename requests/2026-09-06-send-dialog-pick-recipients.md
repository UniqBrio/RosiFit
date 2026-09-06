# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Origin.** One ask of 06-Sep-2026, given with a screenshot of the Send
> communication dialog opened from a course. Four sentences, all four in
> DESIRED BEHAVIOUR below.

## FIELDS
- FEATURE / SCREEN: Send communication — `app/send/index.tsx`, the draft dialog. Opened from `(tabs)/weekly`, `course/[id]` and `member/[id]`.
- CURRENT BEHAVIOUR: The dialog lists everyone the course's follow-up rule flagged who has an address, with no way to include or exclude anybody — the recipients ARE the flagged set. Under the list it renders the stored template read-only: name, from-address, the rendered subject and body against the first recipient, and two explanatory paragraphs. The footer sends to all of them. Nothing on the screen says whether a member has already been written to for this week.
- DESIRED BEHAVIOUR:
  1. "only show list of member dont show template in send communication section" — the template card comes out of the dialog entirely.
  2. "check box should be enables for selection of member" — each listed member carries a checkbox and the send goes to the ticked ones.
  3. "if communication sent then it should indicate that communication is already sent for this person" — a member who has already been sent this period's follow-up is marked as such on her row.
  4. "bring a best ui as senior design engineer with simplified ui. minimal steps" — fewer things on screen, and no step added to send.
- WHY: The template is fixed, authored on the course, and identical on every send — reading it again on every send is a screenful nobody acts on. Selection is wanted because the flagged set is a suggestion the academy overrides by hand. The already-sent mark exists to stop the same member being mailed twice in a week; `unknown` whether a duplicate has actually happened, the requester stated the want, not the incident.
- MUST NOT CHANGE: The wording still comes from the stored template and there is still no compose field anywhere (guardrail 5 / DR-5). A member with no address is still EXCLUDED and NAMED with her reason, never dropped (C-76). The flagged set is still DERIVED from the one member list and the saved rule (guardrail 1) — selection filters what is sent, it never becomes a second list. The dialog stays a dialog over the screen that opened it, and still replaces itself with the result. `send/result` is not touched.
- CORRECTION ROUND: 1 — no previous request in `requests/` touches this dialog.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: `app/send/index.tsx` only. Its existing states all survive: loading skeleton inside the card, error inside the card, the two empty states (nobody flagged / nobody reachable), the send failure, and the confirmation. New states on this surface: a row ticked, a row unticked, a row already-sent, and none selected (the send button is unavailable).
- STRINGS ADDED OR ALTERED: the subtitle (drops the template name), the recipients heading (gains a selected-of-total count), the select-all / clear control, the already-sent mark, the confirmation body (gains what is being skipped and what would be a second message), and the removal of the template card's three strings plus the "Every send is recorded…" paragraph, which is kept as one line.
- PERMISSIONS: no — who may open this dialog and who may send is unchanged.
- RUN MODE: auto (default — the description did not say how to run)

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
