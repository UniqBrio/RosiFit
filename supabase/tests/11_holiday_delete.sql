\echo 'holidays: deleting one restores its sessions, and never rewrites history'
--
-- 0017. C-92 promises that removing a holiday returns its sessions to
-- `scheduled`, and that a holiday never touches a completed session. Both
-- were unreachable before 0017 -- there was no DELETE grant, no DELETE policy,
-- and apply_holiday/remove_holiday were service_role-only -- so neither
-- promise had ever been executed.

begin;
insert into auth.users (id) values ('dddddddd-0000-0000-0000-000000000001');
insert into public.app_users (auth_user_id, kind, name, phone_e164)
  values ('dddddddd-0000-0000-0000-000000000001','super_admin','Holiday Owner','+919994871101');
insert into public.branches (name, code, city) values
  ('Trichy','TRY','Trichy'), ('Erode','ERD','Erode');
insert into public.courses (name, default_start_time, default_end_time, default_frequency)
  values ('Holiday Test Course','06:00','07:00',3);
insert into public.course_offerings (course_id, branch_id, start_time, end_time)
select c.id, b.id, '06:00','07:00'
  from public.courses c, public.branches b
 where c.name='Holiday Test Course' and b.code in ('TRY','ERD');
commit;

-- Four sessions per branch across the range, plus one COMPLETED and one
-- CANCELLED that the holiday must not touch, and one outside the range.
begin;
insert into public.sessions (offering_id, session_date, status)
select o.id, d::date, 'scheduled'
  from public.course_offerings o
  join public.courses c on c.id = o.course_id
  cross join generate_series('2026-11-02'::date,'2026-11-05'::date,'1 day') d
 where c.name='Holiday Test Course';

insert into public.sessions (offering_id, session_date, status)
select o.id, '2026-11-03'::date, 'completed'
  from public.course_offerings o
  join public.courses c on c.id = o.course_id
  join public.branches b on b.id = o.branch_id
 where c.name='Holiday Test Course' and b.code='TRY';

insert into public.sessions (offering_id, session_date, status)
select o.id, '2026-11-04'::date, 'cancelled'
  from public.course_offerings o
  join public.courses c on c.id = o.course_id
  join public.branches b on b.id = o.branch_id
 where c.name='Holiday Test Course' and b.code='TRY';

-- outside the range on purpose: the blast radius is the range, not the course
insert into public.sessions (offering_id, session_date, status)
select o.id, '2026-11-20'::date, 'scheduled'
  from public.course_offerings o
  join public.courses c on c.id = o.course_id
 where c.name='Holiday Test Course';
commit;

-- ------------------------------------------------------------------ apply
-- Nothing calls apply_holiday here. The INSERT alone must do it (0017), which
-- is the whole point: a session cannot be marked without a holidays row.
begin;
insert into public.holidays (name, start_date, end_date)
  values ('Test Closure','2026-11-03','2026-11-04');
commit;

select t.eq((select count(*)::int from public.sessions
              where status='holiday' and session_date between '2026-11-03' and '2026-11-04'),
  3, 'inserting a holiday marks every scheduled session in the range, both branches');

select t.eq((select count(*)::int from public.sessions where status='completed'), 1,
  'a COMPLETED session is never converted by a holiday (C-92)');
select t.eq((select count(*)::int from public.sessions where status='cancelled'), 1,
  'a CANCELLED session is never converted by a holiday (C-93)');
select t.eq((select count(*)::int from public.sessions
              where session_date='2026-11-20' and status='scheduled'),
  2, 'a session outside the range is untouched');

select t.ok(exists (select 1 from public.sessions s join public.holidays h on h.id = s.holiday_id
                     where h.name='Test Closure'),
  'every marked session names the holiday that marked it');

-- --------------------------------------------------------------- the range
-- Moving the dates must move the marks with them, or the holidays row and the
-- sessions it claims to explain drift apart.
begin;
update public.holidays set start_date='2026-11-04', end_date='2026-11-05'
 where name='Test Closure';
commit;

select t.eq((select count(*)::int from public.sessions
              where status='holiday' and session_date='2026-11-03'),
  0, 'a day dropped from the range goes back to scheduled');
select t.eq((select count(*)::int from public.sessions
              where status='holiday' and session_date='2026-11-05'),
  2, 'a day added to the range is marked');

-- ----------------------------------------------------------------- delete
begin;
delete from public.holidays where name='Test Closure';
commit;

select t.eq((select count(*)::int from public.holidays where name='Test Closure'), 0,
  'the holiday row is gone');
select t.eq((select count(*)::int from public.sessions where status='holiday'), 0,
  'deleting a holiday returns every session it marked to scheduled (C-92)');
select t.eq((select count(*)::int from public.sessions where holiday_id is not null), 0,
  'no session still points at the deleted holiday');
select t.eq((select count(*)::int from public.sessions where status='completed'), 1,
  'the completed session is still completed after the delete');
select t.eq((select count(*)::int from public.sessions where status='cancelled'), 1,
  'the cancelled session is still cancelled after the delete');

-- The delete has to be REFUSED rather than silently ignored if the FK were
-- ever left to fire -- this asserts the BEFORE DELETE ordering actually works,
-- because an AFTER DELETE trigger would have failed the foreign key instead.
select t.ok(not exists (select 1 from public.holidays where name='Test Closure'),
  'the FK on sessions.holiday_id did not block the delete (BEFORE DELETE ordering)');

-- ------------------------------------------------------------------ audit
-- C-94: who, what, when, previous, current. A hard delete is only acceptable
-- because the removed row survives here as a PREVIOUS value.
select t.ok(exists (select 1 from public.audit_logs
                     where entity_type='holiday' and action like '%delete%'),
  'the delete is audited');
select t.ok(exists (select 1 from public.audit_logs where action='holiday.removed'),
  'remove_holiday recorded how many sessions it restored');
select t.ok(exists (select 1 from public.audit_logs where action='holiday.applied'),
  'apply_holiday recorded how many sessions it marked');

-- ------------------------------------------------------------------ grants
-- 0012 took apply_holiday and remove_holiday away from authenticated on
-- purpose: both are SECURITY DEFINER and bypass RLS, so a direct grant would
-- let any active staff member rewrite the status of every session in a range.
-- 0017 must not have handed them back.
select t.ok(not has_function_privilege('authenticated','public.apply_holiday(uuid)','execute'),
  'authenticated still cannot call apply_holiday directly');
select t.ok(not has_function_privilege('authenticated','public.remove_holiday(uuid)','execute'),
  'authenticated still cannot call remove_holiday directly');
select t.ok(has_table_privilege('authenticated','public.holidays','delete'),
  'authenticated holds the DELETE grant the policy needs to allow anything');
select t.ok(not has_table_privilege('anon','public.holidays','delete'),
  'anon holds no DELETE on holidays');
select t.ok(exists (select 1 from pg_policies
                     where schemaname='public' and tablename='holidays'
                       and policyname='holidays_delete' and cmd='DELETE'),
  'the DELETE policy exists, so the grant alone cannot let a non-admin through');
