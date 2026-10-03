# CHANGE REQUEST — a member who unsubscribed by mistake can resubscribe
<!-- Filled by workflows/request.md (/request) · Consumed by Track B -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: the unsubscribe confirmation page (`/unsubscribed`) and the `unsubscribe` Edge Function
- CURRENT BEHAVIOUR: the page says "If this was a mistake, reply to any earlier email and we will turn them back on" — but no one can: `reinstate_member_email` (0078) refuses an unsubscribed address, because only the member may undo an opt-out.
- DESIRED BEHAVIOUR: "How will the end user subscribe back once they hit unsubscribe might be by mistake they have clicked link and now they want to resubscribe" → "for now implement resubscribe button and push to main"
- WHY: a member who clicked by mistake is stuck, and the page promised otherwise.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR — the opt-out itself, the one-click (RFC 8058) POST, the rule that only the member undoes an opt-out, the staff-side reinstate rules (0078), the no-JWT deployment.
- CORRECTION ROUND: 1
- EXPLICITLY OUT (owner, 30-Sep-2026): the staff-side "turn follow-ups back on" option — "for now" the button only.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: `/unsubscribed` (button shown only when the link carried the signed pair), new `/resubscribed`; the failure page is reused for a link that cannot be resubscribed; light and dark.
- STRINGS ADDED OR ALTERED: "Clicked this by mistake?", "Resubscribe", "You are subscribed again", "We will send attendance follow-ups to this address again."; the confirmation body loses its false promise ("If this was a mistake, reply to any earlier email and we will turn them back on.").
- PERMISSIONS: yes — the holder of a signed unsubscribe link may now also undo it. Same proof as the opt-out; no staff permission changes.
- USAGE: unknown — members who unsubscribed by mistake, from any earlier follow-up email.
- RUN MODE: auto (default — none stated)
- SCALE: scoped
