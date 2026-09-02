-- Removes everything supabase/seed_demo.sql created, and nothing else.
-- Ordered child-first because the foreign keys are real.
--
-- Safe to run against a project that also holds live data: every delete is
-- anchored to the demo marker (members.notes = 'demo-seed', the DEMO- branch
-- code prefix, or a row reachable only from those).
begin;

delete from public.attendance_records a
 using public.members m where m.id = a.member_id and m.notes = 'demo-seed';

delete from public.session_expectations se
 using public.members m where m.id = se.member_id and m.notes = 'demo-seed';

delete from public.sessions s using public.course_offerings o, public.branches b
 where o.id = s.offering_id and b.id = o.branch_id and b.code like 'DEMO-%';

delete from public.member_stats ms
 using public.members m where m.id = ms.member_id and m.notes = 'demo-seed';

delete from public.member_enrollments e
 using public.members m where m.id = e.member_id and m.notes = 'demo-seed';

delete from public.member_aliases al
 using public.members m where m.id = al.member_id and m.notes = 'demo-seed';

delete from public.member_emails em
 using public.members m where m.id = em.member_id and m.notes = 'demo-seed';

delete from public.members where notes = 'demo-seed';

delete from public.offering_schedules os using public.course_offerings o, public.branches b
 where o.id = os.offering_id and b.id = o.branch_id and b.code like 'DEMO-%';

delete from public.course_offerings o using public.branches b
 where b.id = o.branch_id and b.code like 'DEMO-%';

delete from public.courses where name in ('Zumba Basics','Yoga Flow') and description = 'demo-seed';
delete from public.branches where code like 'DEMO-%';

commit;
