# The send export names each member's email — 16-Oct-2026

**Asked (verbatim):** "Add email also in the sheet because there can me many members with same name
but email ids will be different"

**Follows:** requests/2026-10-16-export-failed-bounced-and-import-never-deletes.md (merged in #75).

**Class:** CHANGE (scoped, client only — no migration, no Edge Function change, no deploy).

**What changes:**
- The **Members** sheet of the send export becomes **Member, Email, Status, Reason**.
- The address is the member's **primary** address, which is the one the send writes to
  (`member_emails.is_primary`, send-followups/load.ts). A bounced or unsubscribed primary address is
  still named, because it is the address the Reason refers to. A member with no primary address
  gets a blank cell, because the send never tried one.
- The draft (`app/send/index.tsx`) hands the addresses to the result along with the send's answer
  (`setSendResult(result, emails)` in pending.ts), since the send function's answer does not include
  them. The draft already holds every record, so no new read is added.

**Specs:** `src/data/sendReport.test.ts`: four tests appended, and two shape expectations re-pointed
(see TEST_SUMMARY).
**Verified:** `npm run check` passes 7/7. The `.xlsx` downloaded from the built app has the Email
column filled in for members with an address.
