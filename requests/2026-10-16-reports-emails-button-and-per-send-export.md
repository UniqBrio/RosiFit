# Reports' email section, findable; each send opens and exports alone — 16-Oct-2026

**Asked (verbatim):** "Under reach out its built but under reports nothing is built no details of
email" — then, mid-work: "On clicking each and export it should export whole info of emails sent on
that day for the course make sure every detail is present"

**Class:** CHANGE (scoped, client only — no migration, no Edge Function change).

**What was wrong:** the Attendance emails card (#76) was built and working, but it was mounted at the
foot of Reports, below every course's attendance bar. With four courses it sat far below the fold,
and it read as missing.

**What changes:**
- `app/(tabs)/reports.tsx`: an **Emails** button beside Members and Courses (`reports-scope-emails`).
  It shows the Attendance emails section in place of the attendance chart. The header Export, which
  exports attendance, steps aside there, because the section has its own Export.
- `src/components/AttendanceEmailsCard.tsx`: each send gets **Show N emails**, which opens every email
  in that send (member, address, branch, outcome as word + icon, and the timeline), and **Export this
  send**. That saves `rosifit-attendance-emails-<course>-<YYYY-MM-DD>-<HHMM>.xlsx` with only that
  send's emails.
- `src/data/emailLog.ts`: `sendFileName`, and a **What happened** column on the Emails sheet (the
  timeline in words) next to the existing columns: date, time, course, branch, member, email,
  status, reason, sent at, delivered at, bounced at, bounce type, marked as spam at, subject, from,
  sent by.

**Verified:** in the built app at 420 px, light and dark: Emails opens the section, a send opens to
its three emails, and its export downloads only that send with every column filled.
