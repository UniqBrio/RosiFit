# CHANGE REQUEST — the unsubscribe/resubscribe lifecycle, for the body link AND Gmail's Unsubscribe
<!-- Filled by workflows/request.md (/request) · Consumed by Track B (with a Track C defect inside) -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: `unsubscribe` and `send-followups` Edge Functions; `member_emails`; the member Edit form.
- CURRENT BEHAVIOUR:
  - Every follow-up carries `List-Unsubscribe: <mailto:unsubscribe@getfit.rosifit.com>, <https://…/functions/v1/unsubscribe?e=…&t=…>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. Nothing reads that mailbox, so a mail client that takes the mailto loses the opt-out. Production has 34 opt-outs, every one `via: link` and none `via: one_click`. Edge logs show no POST.
  - A member who unsubscribed through Gmail, or who has deleted every old email, has no way back. Staff have none either: 0078 refuses an opt-out.
  - Removing an opted-out address in Edit and typing it back in inserts a new `unknown` row, so the opt-out is bypassed.
  - The Resubscribe button reads the prior status only from `communication.unsubscribed` audit rows, and one live opt-out has none.
  - The opt-out also overwrites a spam report.
- DESIRED BEHAVIOUR (owner, 01-Oct-2026, verbatim headings):
  - "Implement the complete email resubscription recovery flow end-to-end".
  - "our RosiFit emails have TWO unsubscribe mechanisms … make the complete unsubscribe/resubscribe lifecycle work correctly for BOTH". Both paths reach the same state and the same audit. Both are idempotent, preserve bounce and spam suppression, and leave other addresses alone.
  - Staff: "Unsubscribed → Turn Follow-ups Back On → explicit confirmation → Subscribed". Record member ID, email, previous and new state, staff user, timestamp, reason/source. Sources: WhatsApp, phone, in person, replied by email, Other + text.
  - "Do NOT allow normal email editing/re-entering the same address to bypass unsubscribe."
- WHY: an opt-out must be honoured whichever button the member pressed, and undone only on the member's word.
- MUST NOT CHANGE:
  - the signed `?e=&t=` link and its secret
  - `verify_jwt=false` on `unsubscribe`
  - the one answer for every invalid link
  - 0078's refusals
  - the member-only Resubscribe button rule (prior status must have been usable)
  - audit history (read, never rewritten)
  - RLS
- CORRECTION ROUND: 1 (follows `requests/2026-09-30-resubscribe-button.md`, whose "staff-side … for now" exclusion the owner has now lifted).

## DESIGN SURFACE
- VISUAL?: yes. An Edit-form row action and a confirmation dialog.
- SCREENS & STATES TOUCHED: member Edit → email row shows "Turn follow-ups back on" only for an UNSUBSCRIBED saved address. The dialog has:
  - five sources, chosen each time and never pre-selected
  - a note, required for Other
  - Cancel / Turn back on
  - the database refusal shown inside the dialog

  Light and dark.
- STRINGS ADDED OR ALTERED:
  - Button: "Turn follow-ups back on"
  - Dialog title: "Turn follow-ups back on?"
  - Dialog body: "The member unsubscribed <address>. Do this only because the member asked to get attendance follow-ups again. It is recorded with your name and how the member asked."
  - Question: "How did the member ask?"
  - Sources: "WhatsApp", "Phone call", "In person", "Replied by email", "Other"
  - Note field: "Note", with placeholders "Optional" and "How the member asked"
  - Toast: "Follow-ups are on again for <address>"
  - Audit title: "Follow-ups turned back on at the member’s request"
  - 0084's refusal sentences
- PERMISSIONS: yes.
  - Turn Follow-ups Back On: any active app user (staff or super admin), the same gate as 0078 and the `member_emails` policies. `anon` has no execute. Not configurable per role (staff parity, 0050).
  - `email_status_before_opt_out`: service role only.
  - Tightened after review (permission-reviewer H1/M2):
    - a direct signed-in write to `member_emails` may no longer change status, text, owner or creation time, or un-delete a row (INVOKER guard trigger; the table grant 09_grants pins is kept, and no policy changes);
    - `audit_log()` is no longer executable by `authenticated`. Nothing in the app calls it; Edge Functions use the service role.
- USAGE: 25 live unsubscribed addresses on production at 01-Oct-2026.
- RUN MODE: auto
- SCALE: scoped

## WHAT GMAIL DOES AND DOES NOT DO (documented, not assumed)
- Gmail draws its Unsubscribe from our headers. When it acts with one-click, it POSTs `List-Unsubscribe=One-Click` to the HTTPS URL. That is a server-to-server request: no cookie, no session, no redirect followed. `unsubscribe` answers 200 with an empty body and writes the same opt-out as the link.
- Gmail uses one-click only when the DKIM signature covers `List-Unsubscribe` and `List-Unsubscribe-Post`. That is decided by SES's signing, and it is only provable from a delivered message's "Show original" (`DKIM-Signature: … h=…`). If they are not covered, Gmail may open the URL instead, which is a GET and the same opt-out. With the mailto removed, there is no route that loses it.
- Gmail's own UI state (the banner, hiding the button, any sender-level filter the member makes) is Gmail's. No database change here can reverse it. Resubscribing restores OUR subscription state, so the next follow-up is sent. Whether Gmail files it in the inbox is Gmail's decision and the member's.

## REVIEW ROUND (01-Oct-2026)
- **code-reviewer: REQUEST CHANGES.**
  - H1 the carry rule used the address's latest-updated row on any member. It is now same-member by `created_at`, with complaints by address.
  - H2 a hard-deleted member leaves nothing to carry. Recorded as a gap; deleting a member is not editing an address.
  - H3 the staff path could lift a complaint (carried, or on a sibling copy) or a bounce. Fixed by one shared rule, `email_status_before_opt_out`.
  - M1 the cross-member carry contradicted 0071. The opt-out is now per member; the complaint stays by address.
  - M2 direct PATCH. Guard trigger added.
  - M3 deploy order. 0084 goes first, as recorded in ENVIRONMENTS.
  - Low: stale comments fixed; Cancel accessible name fixed; note length wording fixed.
- **permission-reviewer: REQUEST CHANGES.**
  - H1 direct PATCH. Guard trigger.
  - M2 forged audit rows. `audit_log` revoked from `authenticated`.
  - M3 null history on the staff path, and M4 the ordering issues. Both covered by the shared rule and spec 61's appended cases.
  - L6 the note: control characters stripped. It is not redacted; staff are told it is recorded.
- **copy-gate-reviewer: BLOCKED** (no shell for the diff), with REQUEST CHANGES on the strings.
  - Lexicon rows added.
  - Refusals reworded with a next step.
  - The subscription refusal translated in the repository.
  - Note length wording and the dialog body clarified.
  - Confirm button is now "Turn follow-ups back on".
