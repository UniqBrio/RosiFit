# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: the final send step of "Send communication" (course → send draft → confirm pop-up) and of "Reach out" (member pop-up → the send draft's confirm pop-up, or the trigger prompt's confirm step).
- CURRENT BEHAVIOUR: the final step names who it goes to and says it cannot be recalled; the message itself is not shown anywhere in the send flow (the draft's preview was removed on 06-Sep-2026, on request).
- DESIRED BEHAVIOUR: "It would be easier if the user sees what content will be sent before hitting send button either using "Send communication" or "Reach out" button. Quickly show the message in the last screen where final send button exists."
- WHY: the person sending cannot see what will be sent before the final Send.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR — the draft screen stays without a preview (the 06-Sep removal), the wording is still edited only on the course form (guardrail 5), the send path and its confirmation text are unchanged.
- CORRECTION ROUND: 1

## REQUESTER DECISIONS (26-Sep-2026, asked in session)
- Whose figures fill a group preview: the FIRST TICKED member; Reach out previews its one member.
- Placement: in the final confirm pop-up / confirm step only, not on the draft screen.
- Length: subject + full body.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: the send draft's confirm pop-up (`app/send/index.tsx`) and the trigger prompt's confirm step (`FollowUpTriggerPrompt`, opened from `app/member/[id].tsx`). States: no preview is drawn until the wording, the academy name and the trigger have been read and a member is ticked; the send draft's confirm cannot open before the wording loads, while the trigger prompt's confirm step can (pre-existing) and then shows no preview. Otherwise the step is unchanged. No empty/offline/permission state of its own.
- STRINGS ADDED OR ALTERED: "Preview · <member name>" (the course form's existing label pattern). The previewed subject and body are the course's stored wording. Nothing else altered.
- PERMISSIONS: no
- USAGE: unknown
- RUN MODE: auto (default — nothing said)
- SCALE: scoped

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
