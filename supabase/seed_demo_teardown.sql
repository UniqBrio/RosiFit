-- Removes everything supabase/seed_demo.sql created, and nothing else.
-- Ordered child-first because the foreign keys are real.
--
-- Safe to run against a project that also holds live data: every delete is
-- anchored to the demo marker (members.notes = 'demo-seed', the DEMO- branch
-- code prefix, or a row reachable only from those).
--
-- AMENDED 07-Sep-2026. The first version anchored ONLY on
-- members.notes = 'demo-seed' and the DEMO- prefix, and deleted sessions
-- without first clearing what points AT them. That is fine on a project where
-- the seed was never USED -- and this one was used: somebody ran the CSV
-- upload against the demo offerings, so csv_imports held four rows and
-- csv_imports_session_id_fkey (NO ACTION, not CASCADE) refused the session
-- delete. The whole transaction rolled back, so the teardown was a no-op that
-- read like a failed script rather than an incomplete one.
--
-- Two things follow, and both are why this file is longer than it was:
--   1. A demo row is not only a row the seed wrote. It is also every row the
--      APP wrote against the demo structure afterwards -- an import, an
--      attendance record, a holiday. Anchoring on the seed marker alone
--      misses all of it.
--   2. Attendance on a demo session can belong to a member who is NOT
--      demo-seed, because the CSV matcher does its job and matches whoever is
--      named in the file. Those rows go too: the SESSION is fictional, so an
--      attendance record against it is a record of a class that never ran.
--      That is a delete of data carrying no demo marker, and it is called out
--      here so it can never be a surprise.
begin;

-- The three demo sets, named once, so every delete below anchors on the same
-- definition instead of re-deriving it slightly differently each time.
create temporary table demo_offering on commit drop as
  select o.id from public.course_offerings o
  join public.branches b on b.id = o.branch_id
  where b.code like 'DEMO-%';

create temporary table demo_session on commit drop as
  select s.id from public.sessions s
  where s.offering_id in (select id from demo_offering);

create temporary table demo_import on commit drop as
  select ci.id from public.csv_imports ci
  where ci.session_id in (select id from demo_session)
     or ci.offering_id in (select id from demo_offering);

-- ATTENDANCE first: it is referenced by nothing and references everything.
-- Three anchors, because a row qualifies for any of three reasons and the
-- overlap between them is harmless.
delete from public.attendance_records a
 using public.members m where m.id = a.member_id and m.notes = 'demo-seed';

delete from public.attendance_records
 where session_id in (select id from demo_session);   -- incl. non-demo members

delete from public.attendance_records
 where import_id in (select id from demo_import);

delete from public.session_expectations se
 using public.members m where m.id = se.member_id and m.notes = 'demo-seed';

delete from public.session_expectations
 where session_id in (select id from demo_session);

-- Now the imports -- the rows that blocked the original script. They must go
-- after attendance (attendance_records.import_id is NO ACTION) and before
-- sessions and offerings (both of csv_imports' own fkeys are NO ACTION too).
delete from public.csv_imports where id in (select id from demo_import);

delete from public.sessions where id in (select id from demo_session);

delete from public.member_stats ms
 using public.members m where m.id = ms.member_id and m.notes = 'demo-seed';

-- Both fkeys out of email_messages are NO ACTION -- the member AND the
-- address row -- so a message has to go before either of them can.
delete from public.email_messages e
 using public.members m where m.id = e.member_id and m.notes = 'demo-seed';

delete from public.email_messages e
 using public.member_emails em, public.members m
 where em.id = e.member_email_id and m.id = em.member_id and m.notes = 'demo-seed';

-- Two anchors, for the same reason attendance needed three: an enrolment onto
-- a demo offering can belong to a member who is not demo-seed. The OFFERING
-- is fictional, so the enrolment records a place in a class that never ran.
delete from public.member_enrollments e
 using public.members m where m.id = e.member_id and m.notes = 'demo-seed';

delete from public.member_enrollments
 where offering_id in (select id from demo_offering);   -- incl. non-demo members

delete from public.member_schedules sc
 using public.members m where m.id = sc.member_id and m.notes = 'demo-seed';

delete from public.member_aliases al
 using public.members m where m.id = al.member_id and m.notes = 'demo-seed';

delete from public.member_emails em
 using public.members m where m.id = em.member_id and m.notes = 'demo-seed';

delete from public.members where notes = 'demo-seed';

-- Structure last. member_import_runs and holidays are NO ACTION onto the
-- offering and the branch, so a run or a holiday recorded against the demo
-- has to be cleared before they can go.
delete from public.member_import_runs
 where default_offering_id in (select id from demo_offering);

delete from public.offering_schedules
 where offering_id in (select id from demo_offering);

delete from public.course_offerings where id in (select id from demo_offering);

-- sessions.holiday_id is NO ACTION, and a SURVIVING session at a real branch
-- can name a holiday declared at a demo one. The holiday is going, so the
-- reference to it has to go first -- it cannot be left dangling and it must
-- not take the real session with it.
update public.sessions set holiday_id = null
 where holiday_id in (select h.id from public.holidays h
                      join public.branches b on b.id = h.branch_id
                      where b.code like 'DEMO-%');

delete from public.holidays h using public.branches b
 where b.id = h.branch_id and b.code like 'DEMO-%';

delete from public.courses
 where name in ('Zumba Basics','Yoga Flow') and description = 'demo-seed';

delete from public.branches where code like 'DEMO-%';

commit;
