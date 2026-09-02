\echo 'offering schedule: the write path 0005 promised -- versioning, corrections, frozen history'
--
-- The defect these cover: offering_schedules is described in 0005 as *** THE
-- source of expected attendance *** and was left with a read policy and NO
-- write path at all. The course form could state "3 sessions per week" and the
-- weekdays that intent is ABOUT could never be set by anybody but service_role.
-- So the first assertion is the blunt one -- can a signed-in super admin put a
-- schedule on an offering at all -- and the rest defend the parts a direct
-- insert would have got wrong: versioning, and never rewriting frozen history.

begin;
  insert into auth.users (id) values
    ('ffffffff-0000-0000-0000-000000000001'),
    ('ffffffff-0000-0000-0000-000000000002');
  insert into public.app_users (auth_user_id, kind, name, phone_e164) values
    ('ffffffff-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158'),
    ('ffffffff-0000-0000-0000-000000000002','staff','Nandhini R','+919940633871');
  insert into public.branches (name, code, city) values ('Coimbatore','CBE','Coimbatore');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Prenatal Flow','06:00','07:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00','07:00' from public.courses c, public.branches b;
commit;

select t.eq((select count(*)::int from public.offering_schedules), 0,
  'the offering starts with no schedule -- the state the app could never leave');

-- ------------------------------------------------------------- the write
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';

  select public.set_offering_schedule(
    (select id from public.course_offerings),
    array[3,1,1,5]::smallint[], date '2026-09-07');

  select t.eq((select count(*)::int from public.offering_schedules), 1,
    'the schedule IS in the database -- the form had no way to put it there');
  select t.eq((select weekdays from public.offering_schedules),
    array[1,3,5]::smallint[],
    'weekdays come back sorted and de-duplicated, so [3,1,1,5] and [1,3,5] are one schedule');
  select t.eq((select sessions_per_week::int from public.offering_schedules), 3,
    'sessions_per_week is generated from the weekdays, never from the course frequency');
  select t.eq((select created_by from public.offering_schedules),
    (select id from public.app_users where kind='super_admin'),
    'the schedule records who set it');
commit;

-- CR-07 again, from the other side: the course still states its intent and the
-- schedule is what actually runs. Neither is reconciled into the other.
select t.eq((select default_frequency::int from public.courses), 3, 'the course still states 3');

-- ------------------------------------------------------ only the super admin
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000002';
  select t.rejects($$select public.set_offering_schedule(
      (select id from public.course_offerings), array[2,4]::smallint[], date '2026-10-01')$$,
    'a staff account cannot set a schedule', 'super admin');
commit;

select t.eq((select count(*)::int from public.offering_schedules), 1,
  'and the refusal changed nothing');

-- ------------------------------------------------------------- versioning
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';

  select public.set_offering_schedule(
    (select id from public.course_offerings),
    array[1,2,3,4]::smallint[], date '2026-10-01');

  select t.eq((select count(*)::int from public.offering_schedules), 2,
    'a change opens a NEW version rather than editing the old one');
  select t.eq((select effective_to from public.offering_schedules where effective_from = '2026-09-07'),
    date '2026-09-30',
    'the previous version is closed the day before the new one starts, so they cannot overlap');
  select t.eq((select effective_to from public.offering_schedules where effective_from = '2026-10-01'),
    null, 'the current version is open-ended');
commit;

-- ------------------------------------------- a later version blocks an earlier
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  select t.rejects($$select public.set_offering_schedule(
      (select id from public.course_offerings), array[6]::smallint[], date '2026-09-20')$$,
    'a schedule cannot be slipped in before one that already starts later',
    'later schedule already starts');
commit;

-- --------------------------------------------------- same day is a CORRECTION
-- Nothing has completed under it, so there is no history to preserve and a new
-- version would only add an empty predecessor.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';

  select public.set_offering_schedule(
    (select id from public.course_offerings),
    array[2,4,6]::smallint[], date '2026-10-01');

  select t.eq((select count(*)::int from public.offering_schedules), 2,
    'setting the same date again corrects in place -- it does not add a version');
  select t.eq((select weekdays from public.offering_schedules where effective_from = '2026-10-01'),
    array[2,4,6]::smallint[], 'and the correction took');
commit;

-- ------------------------------------------------ frozen history is protected
begin;
  set local role service_role;
  insert into public.sessions (offering_id, session_date, status, completed_at)
    select id, date '2026-10-06', 'completed', now() from public.course_offerings;
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';

  select t.rejects($$select public.set_offering_schedule(
      (select id from public.course_offerings), array[1,2]::smallint[], date '2026-10-06')$$,
    'a schedule cannot start ON a day that already has a completed session',
    'completed session');
  select t.rejects($$select public.set_offering_schedule(
      (select id from public.course_offerings), array[1,2]::smallint[], date '2026-10-02')$$,
    'nor before it -- the frozen expectation would describe days the schedule no longer has',
    'completed session');

  -- the day after is fine, and that is the boundary the message names
  select public.set_offering_schedule(
    (select id from public.course_offerings), array[1,5]::smallint[], date '2026-10-07');
  select t.eq((select count(*)::int from public.offering_schedules), 3,
    'the day AFTER the last completed session is allowed');
  select t.eq((select effective_to from public.offering_schedules where effective_from = '2026-10-01'),
    date '2026-10-06', 'and it closes the version that covered the completed session');
commit;

-- ------------------------------------------------------------- bad weekdays
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  select t.rejects($$select public.set_offering_schedule(
      (select id from public.course_offerings), array[]::smallint[], date '2026-11-01')$$,
    'a schedule with no weekdays is refused -- it would silently zero every expectation',
    'at least one weekday');
  select t.rejects($$select public.set_offering_schedule(
      (select id from public.course_offerings), array[9]::smallint[], date '2026-11-01')$$,
    'weekday 9 does not exist', 'weekdays are 1');
  select t.rejects($$select public.set_offering_schedule(
      (select id from public.course_offerings), array[null]::smallint[], date '2026-11-01')$$,
    'a NULL weekday is refused too', 'at least one weekday');
commit;

-- ------------------------------------------------------------------- grants
select t.eq(has_function_privilege('anon',
    'public.set_offering_schedule(uuid,smallint[],date,text)', 'execute'), false,
  'anon cannot execute the schedule RPC');
select t.eq(has_function_privilege('authenticated',
    'public.set_offering_schedule(uuid,smallint[],date,text)', 'execute'), true,
  'the signed-in super admin can -- the function re-checks the role itself');
select t.eq((select count(*)::int from pg_policies
              where schemaname='public' and tablename='offering_schedules'
                and cmd in ('INSERT','UPDATE')), 0,
  'and offering_schedules still has NO direct write policy (0005 holds)');
