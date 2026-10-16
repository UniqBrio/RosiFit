# Export the members a send did not reach; the import template says it never deletes — 16-Oct-2026

**Asked (verbatim):** "In send ccommunication dialog where we send bulk email give export buttton
download list of members for whom email is sent failed and bounced.

Also in impot excel sample sheet add a line that on importing it only updates existing member or add
new member does not delete the already existing members in app"

**Class:** CHANGE (scoped, two items, client only — no migration, no Edge Function change).

**What changes:**
- `app/send/result.tsx`: the Result dialog gains **Export failed & bounced (n)**, above Done, shown
  only when there is at least one such member. Saves a CSV: Member, Outcome (Failed / Bounced),
  Reason. Built from the rows the dialog shows, so the file and the screen cannot disagree.
- `src/data/sendProblems.ts` (new, pure): picks the rows. FAILED = the provider refused the message.
  BOUNCED = excluded because the address on file has already bounced. Unsubscribed, spam and
  no-email exclusions are not in the file (not asked for).
- `src/data/memberXlsx.ts`: the "Instructions & Sample" sheet gains, in bold, "Importing never deletes
  anyone. It only adds the new members in this file — every member already in RosiFit stays in the
  app, even if this file leaves them out."

**Deviation from the words, stated:** the request says the import "updates existing member". The
template import does not — `bulk_import_members` only inserts, and a member already on the register
is SKIPPED, never changed (the sheet already says so; that line stays). Dates of existing members are
updated by re-uploading the Reports export, a different file. Writing "updates" on the template would
tell the academy something the import does not do, so the line states what it does: adds new, deletes
nobody.

**Known limit:** a bounce SES reports *after* this send (an address that bounces on this message) is
not known when the dialog opens, so it is not in this file; it shows on the member's record once the
bounce arrives, and is in the next send's file as Bounced.

**Specs:** `src/data/sendProblems.test.ts` (4, new); one test appended to `src/data/memberXlsx.test.ts`.
**Verified:** `npm run check` green; Result dialog rendered and the CSV downloaded, light and dark
(420 px, web export via `.harness/serve.mjs`).

---

## Follow-up, same day — export the whole send

**Asked (verbatim):** "export all not just failed total number of emails sent with full list with
status and downlable fiel should contain date in its name"

**What changes (replaces the failed & bounced export above):**
- The Result dialog's button becomes **Export full list (n)**, where n is every member in the send.
  It is shown whenever the send has at least one member.
- The CSV opens with the send's date and time and the totals (Total members, Sent, Failed, Bounced,
  Excluded), then a blank line, then one line per member: Member, Status, Reason. Members are
  grouped Sent → Failed → Bounced → Excluded.
- The file name carries the LOCAL date and time of the send: `rosifit-email-send-YYYY-MM-DD-HHMM.csv`
  (the minute keeps two sends on one day as two files).
- `src/data/sendProblems.ts` → `src/data/sendReport.ts`; its spec moves with it (see TEST_SUMMARY).
