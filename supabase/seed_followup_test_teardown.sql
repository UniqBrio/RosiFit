-- Reverses supabase/seed_followup_test.sql, and nothing else.
--
-- Child-first, because the foreign keys are real: attendance and expectations
-- point at sessions, and deleting a session with either still attached is
-- refused (attendance_records cascades, session_expectations cascades, but the
-- explicit order makes the intent readable rather than relying on it).
--
-- ANCHORED ON THE MARKER, never on dates or ids. Sessions this seed created
-- carry cancellation_reason = 'followup-test-seed'; the email and enrolment
-- carry source / note = 'followup-test-seed'. Nothing else in the database
-- matches, so a real session or a real enrolment is never removed.
--
-- Shazia's PRE-EXISTING absence on 2026-09-04 and her presents on 09-02 and
-- 08-31 are untouched. She goes back to a streak of one, which is what she had.

begin;

delete from public.attendance_records a
 using public.sessions s
 where s.id = a.session_id
   and s.cancellation_reason = 'followup-test-seed';

delete from public.session_expectations x
 using public.sessions s
 where s.id = x.session_id
   and s.cancellation_reason = 'followup-test-seed';

delete from public.sessions
 where cancellation_reason = 'followup-test-seed';

delete from public.member_enrollments
 where note = 'followup-test-seed';

delete from public.member_emails
 where source = 'followup-test-seed';

-- Recompute AFTER the rows are gone, or the stats keep describing sessions
-- that no longer exist and both members stay flagged for a streak they no
-- longer have.
select public.recompute_member_stats(null);

commit;

-- ----------------------------------------------------------------- verify
-- Expect zero seeded rows of every kind, and Shazia back to her real streak
-- of 1 from the 2026-09-04 absence that was already there.
select
  (select count(*) from public.sessions
    where cancellation_reason = 'followup-test-seed') as sessions_left,
  (select count(*) from public.member_enrollments where note = 'followup-test-seed') as enrolments_left,
  (select count(*) from public.member_emails where source = 'followup-test-seed') as emails_left,
  (select st.current_streak from public.member_stats st
     join public.member_emails e on e.member_id = st.member_id
      and e.is_primary and e.deleted_at is null
    where e.email = 'shaziafarheen74@gmail.com') as shazia_streak;
