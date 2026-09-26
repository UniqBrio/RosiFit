# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: the follow-up email sent by `send-followups` (Reach out and Send communication), and the send-step preview.
- CURRENT BEHAVIOUR: since RC-109 a course with its own wording sends that wording verbatim; Postnatal's has no `{{unsubscribe_url}}`, so its emails carry no visible opt-out line (the List-Unsubscribe headers are still sent).
- DESIRED BEHAVIOUR: requester, on "Postnatal's wording has no visible unsubscribe line": "Is that mandatory. If yes, add it." Answered in session: not legally required for these relationship emails (the one-click headers meet the mailbox providers' bulk-sender rule), but this app's own rule (0066, "every follow-up email says how to stop getting them") requires it — so it is added: any wording without `{{unsubscribe_url}}` gets 0066's line appended at send, and the preview shows the same.
- WHY: every follow-up must say how to stop (0066).
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR — a wording that already places `{{unsubscribe_url}}` is sent exactly as written; the stored wording itself is not edited (no data change); the headers are unchanged.
- CORRECTION ROUND: 1

## DESIGN SURFACE
- VISUAL?: yes (the send-step preview gains the line when the wording lacks one)
- SCREENS & STATES TOUCHED: the send-step preview only; no new state.
- STRINGS ADDED OR ALTERED: none new — 0066's existing line, verbatim.
- PERMISSIONS: no
- USAGE: unknown
- RUN MODE: auto (default)
- SCALE: scoped
