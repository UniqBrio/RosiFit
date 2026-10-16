# Reports' Attendance emails, and each member's email history — 16-Oct-2026

**Asked (verbatim):** "under reports add new section attendance email section : what is date , what
is course how many emails sent, how many bounced how many failed  and all other details with export
button for download along with member name , email , date and reason all necessary detailed
previously yu missed to add email under export option

Under reach out show details of email sent on which date whether it reached or failed , or bounce
for each person and reach out its induvidual details with email sent details on so an so date all
detail when it was sent when it bounce or failed every detail"

**Class:** NEW (feature): one migration, two screens, one fix.

**Decided with the requester (16-Oct-2026), before building:**
- The member's history goes in a **new Emails tab** on the member record (beside This week and
  Details, directly above Reach out).
- Reports gets its **own "Attendance emails" card with its own Export**, under the attendance chart,
  on the report's Period.
- **Bounce and delivery times: yes.** They need a read-only database function. It is tested in the
  harness, and its SQL is shown to the requester and applied to production only on an explicit
  go-ahead.

**What changes:**
- `supabase/migrations/0095_email_log.sql`: `public.email_log(p_from, p_to, p_member_id, p_after,
  p_limit)`, one row per email_messages row with batch date, sender, member, address, course and
  branch as sent, status, reason, sent_at, and the first Delivery / Bounce / Complaint time from
  email_events (with the bounce type). It is SECURITY DEFINER for those three times (email_events is
  super-admin only), refuses anyone who is not an active app user, is keyset-paged on message_id,
  and needs a member or a period. It is the only database change: no table, column, index, policy
  or data change.
- `src/data/emailLog.ts` (pure): one outcome per email (Delivered / Sent / Bounced / Spam report /
  Failed / Excluded / Sending), each with its own word, icon and measured STATUS colour. It also
  holds the per-send counts, the timeline lines, academy-zone times, and the export sheets.
  `src/data/emailLogFixture.ts` provides offline data.
- `fetchEmailLog` (repository.ts, paged). `useEmailLog` / `useMemberEmails` (hooks.ts) revalidate
  on a send.
- **Reports** (`src/components/AttendanceEmailsCard.tsx`, mounted in `app/(tabs)/reports.tsx`):
  shows the period's totals, then each send's date, time, course, counts and sender, and an
  **Export** button. The export is `rosifit-attendance-emails-<from>-to-<to>.xlsx`, with a **Sends**
  sheet (one row per send: date, time, course, sent by, members, sent, delivered, bounced, failed,
  spam reports, excluded) and an **Emails** sheet (one row per email: date, time, course, branch,
  member, **email**, status, reason, sent at, delivered at, bounced at, bounce type, marked as spam
  at, subject, from, sent by).
- **Member record** (`src/components/MemberEmails.tsx`, third tab `emails` in MEMBER_TABS): every
  email the member has been sent, newest first. Each shows the outcome as a word and an icon, the
  date and time, the address, course and subject, and a timeline: sent, delivered, bounced (with
  whether it was temporary), marked as spam, failed with its reason, or not sent with its reason.
- **Fix:** a send started from a member's **Reach out** now hands the addresses to the Result
  dialog, as the course's Send Communication already did, so that export's Email column is filled
  there too.

**A temporary bounce counts as Bounced.** SES reports one only after it has stopped retrying, so the
email did not arrive. The address is not suppressed, and the timeline says the next send tries it
again.

**Known limit:** *Delivered* appears only if SES delivery notifications are switched on for the
sending account. Without them, an email that arrived reads as *Sent*, never as a failure.

**Specs:** `supabase/tests/72_email_log.sql` (20 assertions); `src/data/emailLog.test.ts` (12); one
test appended to `src/data/sendReport.test.ts`. `src/components/memberDialog.test.ts`'s tab list is
re-pointed to include Emails (see TEST_SUMMARY).
