# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

Routed here by Track E — see the Decision Summary in
`docs/decisions/011-inserting-a-detail-into-the-wording.md`.

## FIELDS
- FEATURE / SCREEN: Add/Edit Course dialog (`app/course/edit.tsx`) → the **Message** section: the Subject and Message fields where a course's wording is authored.
- CURRENT BEHAVIOUR: The wording can already be typed freely and saved per course. It supports 13 `{{token}}` substitutions, filled at send time. **Nothing in the app ever lists those 13 tokens** — `MESSAGE_TOKENS` is exported from `src/data/message.ts` and consumed only by `src/data/message.test.ts`. The only hint a user gets is the Subject placeholder, `We missed you this week, {{first_name}}`. A live preview and a stray-token warning exist, but both only catch a token that was already guessed — neither helps someone who does not know the token exists.
- DESIRED BEHAVIOUR: Under Subject and under Message, a compact horizontal row of tappable chips, one per available detail, labelled in **plain words** ("Her first name", "The course"), never in token syntax. Tapping inserts that token into that field **at the cursor**, appending if there is no cursor. One short line of plain-language copy explains that the code shown while writing becomes the real value in the email, and points at the preview already below.
- WHY: Stated by the requester — the people using this are not technical, so a personalised message currently requires knowing a syntax nothing teaches them. Stated as "the design should be user friendly as users are not tech persons they should be easily understand the format".
- MUST NOT CHANGE: Stated by the requester — "it should not affect app flow as well". Concretely: no new screen, no new step, no reordering of the form, and the existing preview and stray-token warning stay exactly as they are. Also everything not named in DESIRED BEHAVIOUR — the template picker, Reset, the sender, the follow-up rule and threshold, the save path, and `MESSAGE_TOKENS`'s ORDER (locked to the sender's declaration order by `message.test.ts`).
- CORRECTION ROUND: 1

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: `app/course/edit.tsx` only, the Message section. Add and Edit both. No change to empty / loading / error / offline / permission-denied — the chips are static content of a section that already renders in the loaded state only.
- STRINGS ADDED OR ALTERED: one explanatory line (new, plain language, exact wording to be settled in B4) and 13 chip labels derived from the `means` field already in `MESSAGE_TOKENS`. Everything else on the screen is frozen.
- PERMISSIONS: no — the Message section is already inside the super-admin-only course form, and `save_course` (0030) restates the check server-side. Inserting text changes nothing about who may save it.
- RUN MODE: auto — the requester said "You decide which is best as senior dev", which is a delegation of the design decision, not a request to wait at a gate.

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

## EXPLICITLY OUT — and this one is a guardrail, not a preference
A compose box at SEND time. Guardrail 5 in CLAUDE.md is binding — *"Messages go out through
stored templates only. There is no free-form send path anywhere"*, honoured in `app/send/`.
This request only makes the EXISTING course-time authoring discoverable; it adds no new place
where wording can be written and no new path by which wording reaches a member. Changing that
would need an ADR, not a request.
