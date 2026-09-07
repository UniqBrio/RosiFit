-- FOLLOW-UP SEND TEST SEED -- deliberately NOT a migration.
--
-- Puts the TWO addresses that are verified recipient identities in SES into
-- the follow-up list, each having missed five sessions, so a real send can be
-- exercised while the account is still in the sandbox.
--
--   shaziafarheen74@gmail.com   Shazia, already enrolled in Postnatal
--   uniqbotzinfo@gmail.com      the existing "UniqBotz Infotech" record
--
-- NO NEW MEMBER IS CREATED. A member named "UniqBotz Infotech" already exists
-- with no email and no enrolment. Adding a second one would put two members
-- with the same name on the register, which is the exact condition behind
-- RC-024. This gives the existing record an address and a course instead.
--
-- WHY EACH ONE IS FLAGGED, and they are flagged by DIFFERENT RULES on purpose
-- -- one send then proves both halves of effective_follow_up_config:
--
--   Postnatal  weekly_enabled, threshold 1, min_expected 1  -> Shazia hits the
--              WEEKLY rule on missed >= 1.
--   Prenatal   consecutive_enabled, threshold 4             -> UniqBotz hits
--              the CONSECUTIVE rule on a streak >= 4.
--
-- WHY SHAZIA GETS FOUR ABSENCES AND NOT FIVE. She already has one, on
-- 2026-09-04, and presents on 09-02 and 08-31. current_streak_for counts the
-- run before the most recent PRESENT, so four more after 09-02 takes her to
-- exactly five. Adding five would make it six and the seed would be lying
-- about its own number.
--
-- 2026-09-04 is skipped for her because a session already exists on that date
-- for the offering, and sessions_unique_live is unique on
-- (offering_id, session_date).
--
-- EVERYTHING IS RESOLVED BY LOOKUP, never by a pasted uuid: ids differ between
-- environments and a hardcoded one silently writes to the wrong row.
--
-- Reverse with supabase/seed_followup_test_teardown.sql. Every row this
-- creates is findable: sessions carry source = 'import' with the marker in
-- cancellation_reason, and the email and enrolment carry 'followup-test-seed'.

begin;

-- --------------------------------------------------------------- the people
create temporary table seed_target on commit drop as
select
  (select m.id from public.members m
     join public.member_emails e on e.member_id = m.id and e.is_primary and e.deleted_at is null
    where e.email = 'shaziafarheen74@gmail.com' and m.deleted_at is null limit 1) as shazia_id,
  (select m.id from public.members m
    where m.full_name = 'UniqBotz Infotech' and m.deleted_at is null limit 1) as uniqbotz_id,
  (select o.id from public.course_offerings o
     join public.courses c on c.id = o.course_id
    where c.name = 'Postnatal' and c.deleted_at is null and o.deleted_at is null limit 1) as postnatal_off,
  (select o.id from public.course_offerings o
     join public.courses c on c.id = o.course_id
    where c.name = 'Prenatal' and c.deleted_at is null and o.deleted_at is null limit 1) as prenatal_off;

-- Refuse rather than half-apply. A null here means the register does not look
-- the way this seed was written against, and every insert below would either
-- fail on a not-null or write nothing at all.
do $$
declare t record;
begin
  select * into t from seed_target;
  if t.shazia_id is null or t.uniqbotz_id is null
     or t.postnatal_off is null or t.prenatal_off is null then
    raise exception
      'seed_followup_test: could not resolve one of the four anchors '
      '(shazia=%, uniqbotz=%, postnatal=%, prenatal=%). Nothing was written.',
      t.shazia_id, t.uniqbotz_id, t.postnatal_off, t.prenatal_off;
  end if;
end $$;

-- ------------------------------------------- give UniqBotz an address and a course
insert into public.member_emails (member_id, email, is_primary, status, source)
select t.uniqbotz_id, 'uniqbotzinfo@gmail.com', true, 'valid', 'followup-test-seed'
  from seed_target t
 where not exists (select 1 from public.member_emails e
                    where e.member_id = t.uniqbotz_id and e.is_primary and e.deleted_at is null);

insert into public.member_enrollments (member_id, offering_id, effective_from, status, note)
select t.uniqbotz_id, t.prenatal_off, date '2026-08-24', 'active', 'followup-test-seed'
  from seed_target t
 where not exists (select 1 from public.member_enrollments en
                    where en.member_id = t.uniqbotz_id and en.status = 'active');

-- ------------------------------------------------------------- the sessions
-- expectation_mode 'none' so ONLY the member named below is ever expected at
-- these sessions. The offerings are shared -- Postnatal has six active members
-- and Prenatal three -- and 'schedule' would pull all of them in and change
-- everybody's attendance percentage, which the seed has no business doing.
insert into public.sessions
  (offering_id, session_date, status, source, expectation_mode,
   expected_count, absent_count, cancellation_reason)
select t.postnatal_off, d::date, 'completed', 'import', 'none', 1, 1, 'followup-test-seed'
  from seed_target t,
       unnest(array['2026-09-03','2026-09-05','2026-09-06','2026-09-07']::date[]) d
 where not exists (select 1 from public.sessions s
                    where s.offering_id = t.postnatal_off
                      and s.session_date = d::date and s.deleted_at is null);

insert into public.sessions
  (offering_id, session_date, status, source, expectation_mode,
   expected_count, absent_count, cancellation_reason)
select t.prenatal_off, d::date, 'completed', 'import', 'none', 1, 1, 'followup-test-seed'
  from seed_target t,
       unnest(array['2026-09-01','2026-09-02','2026-09-03','2026-09-04','2026-09-05']::date[]) d
 where not exists (select 1 from public.sessions s
                    where s.offering_id = t.prenatal_off
                      and s.session_date = d::date and s.deleted_at is null);

-- ------------------------------------------------- expected, then absent
-- expected = true on the attendance row is load-bearing twice over: the
-- absent_must_be_expected constraint refuses 'absent' without it, and
-- current_streak_for counts only rows where it is set.
insert into public.session_expectations (session_id, member_id, schedule_source)
select s.id, t.shazia_id, 'all_enrolled'
  from seed_target t
  join public.sessions s on s.offering_id = t.postnatal_off
   and s.cancellation_reason = 'followup-test-seed' and s.deleted_at is null
 on conflict (session_id, member_id) do nothing;

insert into public.session_expectations (session_id, member_id, schedule_source)
select s.id, t.uniqbotz_id, 'all_enrolled'
  from seed_target t
  join public.sessions s on s.offering_id = t.prenatal_off
   and s.cancellation_reason = 'followup-test-seed' and s.deleted_at is null
 on conflict (session_id, member_id) do nothing;

insert into public.attendance_records (session_id, member_id, status, expected)
select s.id, t.shazia_id, 'absent', true
  from seed_target t
  join public.sessions s on s.offering_id = t.postnatal_off
   and s.cancellation_reason = 'followup-test-seed' and s.deleted_at is null
 where not exists (select 1 from public.attendance_records a
                    where a.session_id = s.id and a.member_id = t.shazia_id
                      and a.deleted_at is null);

insert into public.attendance_records (session_id, member_id, status, expected)
select s.id, t.uniqbotz_id, 'absent', true
  from seed_target t
  join public.sessions s on s.offering_id = t.prenatal_off
   and s.cancellation_reason = 'followup-test-seed' and s.deleted_at is null
 where not exists (select 1 from public.attendance_records a
                    where a.session_id = s.id and a.member_id = t.uniqbotz_id
                      and a.deleted_at is null);

-- ------------------------------------------------------------ the stats
-- RECOMPUTED, never incremented -- the function's own rule (0008). Without
-- this current_streak stays at its old value and the CONSECUTIVE rule, which
-- is the only thing that flags UniqBotz, never fires.
select public.recompute_member_stats(
  array(select unnest(array[t.shazia_id, t.uniqbotz_id]) from seed_target t));

commit;

-- ----------------------------------------------------------------- verify
-- Expect both members present, each with missed = 5 and streak = 5, each
-- carrying the reason its own course's rule produced.
select f.full_name, f.course_name, f.expected, f.attended, f.missed,
       f.current_streak, f.reason, f.has_email,
       cc.from_email as will_send_as
  from public.follow_up_candidates(date '2026-08-25', date '2026-09-07') f
  left join public.course_communication cc on cc.course_id = f.course_id
 order by f.full_name;
