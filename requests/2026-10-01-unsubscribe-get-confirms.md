# CHANGE REQUEST — the unsubscribe link asks; only a press or RFC 8058 POST opts out
<!-- Filled by workflows/request.md (/request) · Consumed by Track B -->

## FIELDS
- FEATURE / SCREEN: `unsubscribe` Edge Function; new `public/unsubscribe.html`; the send
  confirmations (`app/send/index.tsx`, `src/components/FollowUpTriggerPanel.tsx`).
- CURRENT BEHAVIOUR: a GET of the signed body link writes the opt-out at once. Link scanners
  fetch every link in a message, so a scanner can unsubscribe a member (P1). The send
  confirmations say "N without an address" for every excluded member, unsubscribed ones included.
- DESIRED BEHAVIOUR (owner, 01-Oct-2026, steps 4 and 6):
  - Gmail's RFC 8058 POST stays an immediate one-click unsubscribe.
  - A browser GET does not change the subscription; the member confirms on a page first.
  - Resubscribe keeps working; the signed-token check is unchanged; old links keep working.
  - Scanners create no unsubscribe audit rows.
  - Excluded counts distinguish: no email address / unsubscribed / bounced / spam / other.
- MUST NOT CHANGE: token validation; one neutral answer for every bad link; 0084; the
  bounced/complained protections; verify_jwt=false on `unsubscribe`.
- OPEN (owner decision pending): two existing specs in `src/data/unsubscribeHandler.test.ts`
  ("TEST 1 body link…", "bounced: an opt-out is recorded over it…") pin the OLD GET-writes
  behaviour and fail. Test files are append-only; they are untouched until the owner decides.
- DEPLOY ORDER when approved: Vercel (the new page) first, then `unsubscribe` v9.
- RUN MODE: auto · SCALE: scoped

## DECISION (owner, 01-Oct-2026, later the same day)
- "Proceed with Option 1. I explicitly approve a narrow exception to the CLAUDE.md append-only test
  rule for this deliberate security behaviour reversal." The owner dictated the exemption text now
  in CLAUDE.md (owner-approved behaviour reversal) and directed that only the two conflicting specs
  change, only in their first action, with every downstream assertion kept.
- Affected specs: `src/data/unsubscribeHandler.test.ts` "TEST 1 body link: unsubscribe -> old link
  offers Resubscribe -> Resubscribe -> subscribed" and "bounced: an opt-out is recorded over it, no
  Resubscribe is offered, and the button is refused". The OPEN item above is closed by this.

## DEPLOYED (03-Oct-2026)
- Vercel: `/unsubscribe` page live with `f0ea2a5` (production deployment 6794138951, success, 1-Oct 20:11).
- Supabase `unsubscribe` **v9**, from `main` (`ef74760`), verify_jwt=false, owner-approved. Deployed
  after confirming the connector points at project lhpzhkzbnquwjljmbylo ("Rosifit"; latest migration
  0084; unsubscribe was v8). Source read back from the platform: identical to main.
