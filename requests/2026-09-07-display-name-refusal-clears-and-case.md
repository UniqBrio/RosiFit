# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: The add/edit member dialog ("Welcome a new member" / "Edit member", `/member/edit`) — the refusal banner it shows under the form after a refused save.
- CURRENT BEHAVIOUR: When a save is refused because the display name is taken, the banner reads `the display name "ani" already belongs to another member. Nothing has been saved.` and stays on screen while the requester goes back and edits the display name. The sentence opens with a lowercase `the`.
- DESIRED BEHAVIOUR: Two things.
  1. As soon as the user starts changing the display name, the message is removed from display.
  2. The wording is corrected for case: `the display name "ani" already belongs to another member. Nothing has been saved.` becomes `The display name "ani" already belongs to another member. Nothing has been saved.` — the requester marked this explicitly as a case-sensitive correction of `The`.
- WHY: `unknown` — not stated.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR.
- CORRECTION ROUND: 1

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: yes
- SCREENS & STATES TOUCHED: add/edit member dialog only, its error state (the refusal banner). Empty · loading · offline · permission-denied unaffected.
- STRINGS ADDED OR ALTERED: `The display name "ani" already belongs to another member. Nothing has been saved.` — the requester's exact words, the only alteration being the capital `T` on `The`. Everything else on the screen is frozen (the freeze rule).
- PERMISSIONS: no
- USAGE: `unknown`
- RUN MODE: auto
- SCALE: `<micro | scoped | full — leave blank and the track decides at B0; micro is refused for CORRECTION ROUND >= 2>`

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

## NOT COVERED BY THE DESCRIPTION (Track B must ask — do not fill silently)
- Whether editing any OTHER field (name, emails, days) should also clear the banner, or only the display name field. The requester named the display name only.
- Whether "started changing" means the first keystroke in the display-name draft box, or also removing/re-adding an already-attached display name chip.
- Whether the same case correction applies to the other refusals that share this banner.
