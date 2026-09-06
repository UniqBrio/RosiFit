# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Origin.** Item D+E+F of the triage run of 06-Sep-2026, which split one rough
> description into seven items. The other items — the registration loop, the
> "This academy is already registered" notice, self-registration for a new
> number, and the role-based dashboard — are NOT in this file and are blocked
> on the requester's answers at the triage gate. This file is the form-shape
> half only, which triage found independent of them.

## FIELDS
- FEATURE / SCREEN: Register — `app/register.tsx`. Both steps: "Your details" and "Security questions".
- CURRENT BEHAVIOUR: A two-step wizard behind a two-segment progress row. Step 1 asks Full name, "Academy you administer", Mobile number and Email; Next advances to step 2, which picks two security questions and takes an answer to each. Nothing on either step is marked as required; Academy is required by the step-1 validation.
- DESIRED BEHAVIOUR:
  1. Remove the Academy field — "academy is by default rosifit".
  2. "Bring Security questions under one form itself, no seperate tabs" — the questions and answers sit on the same single form as the details, with no step split.
  3. "EMail is optional".
  4. "for all mandatory fields mark with red asterisk symbol".
- WHY: For the Academy field — the academy is RosiFit by default, so the question has no answer to give. For the other three: `unknown` — the requester stated the change, not the problem behind it.
- MUST NOT CHANGE: "make sure the registration flow should not break" — the requester's own words, verbatim, and binding. Plus everything not named in DESIRED BEHAVIOUR: the mobile-number carry-over from sign-in and its 10-digit rule, the recovery answers being collected before the PIN, the minimum answer length, the two-different-questions rule, the question picker, the hashed-answer wording, Back, and the hand-off to `set-pin?for=register`.
- CORRECTION ROUND: 1 — no previous request in `requests/` touches this form.

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: yes
- SCREENS & STATES TOUCHED: `app/register.tsx` only, in full — the field list, the progress row, the step footer buttons and the step-1/step-2 validation. States that exist on this surface today and must survive: the notice banner (both the "already registered" case and the question-list fetch failure), per-field error text on the mobile number and on a too-short answer, and the disabled state of the forward button. The change also reaches `src/components/Field.tsx`, which has no required-field affordance today and is imported by other screens.
- STRINGS ADDED OR ALTERED: the required marker itself (new); the step-1 validation toast "Name, academy and a 10-digit number are needed", whose wording names a field being removed; the step counter "Step 1 of 2 · recovery answers on record" and the two progress labels "Your details" / "Security questions", which describe a split being removed; the forward button labels "Next — security questions" / "Register & issue PIN". Whether the Email label gains an "optional" word is `unknown` — the requester said email is optional, not what the label should read. Every other string on the screen is frozen.
- PERMISSIONS: no — this is a pre-session screen with no role gate; none of the four changes touches who can see or do anything.
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
