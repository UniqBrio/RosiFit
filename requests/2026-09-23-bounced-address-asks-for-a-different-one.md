# CHANGE REQUEST — something works, but should behave differently
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING; "unknown" is honest. MUST NOT CHANGE is the guarantee being bought. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- WHAT EXISTS NOW: RC-106 made a suppressed address visible on the member card and in the Edit form, and gave a BOUNCE a way back — a **Reinstate** action calling `reinstate_member_email` (0078, applied to production 22-Sep-2026, ledger `20260922195737`).
- DESIRED BEHAVIOUR: when the operator enters an address that **already exists on the member with `status = 'bounced'`**, do not reinstate it and do not silently accept it. Mark the entry unusable, show inline — associated with that field, not a toast — an ⓘ message reading exactly **"Email address is not active"** followed by an explanation that a previous email could not be delivered, that the address may be inactive or invalid, and asking the operator to try a different address. **Block Save** while that address is in the box. A genuinely different address continues to work normally.
- MUST NOT CHANGE:
  - the status-carrying `Member.emails` implementation (RC-106) — the address stays on the record and stays visible;
  - `unsubscribed` semantics — still shown, still unsendable, still no reinstatement, never silently converted;
  - `unknown` / `valid` behaviour — unchanged;
  - `update_member` — not modified;
  - the existing bounced database row — not modified by this flow;
  - the card's four distinguishable states: no address / usable / bounced / unsubscribed;
  - **everything not named in DESIRED BEHAVIOUR.**
- WHO IS AFFECTED: academy users editing a member in the Member Edit form. Production currently holds 6 live bounced addresses and 6 unsubscribed.
- CORRECTION ROUND: 1 for this behaviour. It **reverses part of RC-106** — the Reinstate action — which was shipped the previous day and is recorded there.
- RUN MODE: auto (not stated; default).

## DESIGN SURFACE
`app/member/edit.tsx` — the email field and its address rows: an invalid state on the input, an inline info block under it, Save disabled, the Reinstate control removed. `app/member/[id].tsx` — the card's advice line, which pointed at a Reinstate action that no longer exists. Both themes; word and icon, never colour alone (guardrail 3); the whole explanation readable without hover.

## WHY THE REVERSAL IS RIGHT, recorded because it undoes yesterday's work
A bounce is the mail system's verdict on the **address**, not a flag the academy can clear. Marking it un-rejected does not make it deliverable — the next follow-up goes into the same hole, and the bounce rate that AWS acts on at 5% climbs. The useful answer is the one the academy asked for: tell the operator this address does not work, and ask for one that does.

`reinstate_member_email` stays in the database, deliberately uncalled. It is applied, tested and correct; if a reinstatement surface is ever wanted elsewhere it is there. `src/data/repository.ts` says so at the wrapper.

## STANDING INSTRUCTIONS (do not edit)
- Track B order is binding: read the existing behaviour FIRST and state it; the plan starts from MUST NOT CHANGE and may only add to it; surgical diff — every changed line traces to DESIRED BEHAVIOUR.
- A change to a shipped user-visible string is a copy-lock re-point, not a rewrite: the diff shows the string literal changing and nothing else.
- Data-store-level change → STOP, propose, wait for approval. Production is never touched automatically.
