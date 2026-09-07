\echo 'save_course: the Add Course form as one transaction'
--
-- 0022. Seven fields from one dialog land in five tables, and offering_schedules
-- has no direct write policy at all. Sequenced from the client, a failure half
-- way leaves a course with no offering or an offering with no schedule --
-- expected at no session, in no follow-up list, counted by nobody. That is
-- RC-008's shape one level up, which is what this function exists to prevent.

begin;
insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000002');
insert into public.app_users (auth_user_id, kind, name, phone_e164) values
  ('aaaaaaaa-0000-0000-0000-000000000001','super_admin','Save Owner','+919994871104'),
  ('aaaaaaaa-0000-0000-0000-000000000002','staff','Save Staff','+919994871105');
insert into public.branches (name, code) values ('Save Branch','SVB'), ('Second Branch','SCB');
commit;

-- ------------------------------------------------------------- creating
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';

  select t.ok((public.save_course('Saved Course',
    (select id from public.branches where code='SVB'),
    array[1,3,5]::smallint[], 'week', 'support@rosifit.com',
    (select id from public.email_templates where is_default))->>'created')::boolean,
    'a new course reports itself created');
commit;

select t.eq((select count(*)::int from public.courses where name='Saved Course'), 1,
  'the course row exists');
select t.eq((select count(*)::int from public.course_offerings o
               join public.courses c on c.id=o.course_id where c.name='Saved Course'), 1,
  'and its offering at the branch exists -- not a course with nowhere to run');
select t.eq((select weekdays from public.offering_schedules s
               join public.course_offerings o on o.id=s.offering_id
               join public.courses c on c.id=o.course_id where c.name='Saved Course'),
            array[1,3,5]::smallint[],
  'and the schedule went through set_offering_schedule, so days are actually expected');
select t.eq((select sessions_per_week::int from public.offering_schedules s
               join public.course_offerings o on o.id=s.offering_id
               join public.courses c on c.id=o.course_id where c.name='Saved Course'), 3,
  'sessions_per_week is generated from the weekdays, never from a stated frequency');
select t.ok((select weekly_enabled and not consecutive_enabled
               from public.course_follow_up_config f
               join public.courses c on c.id=f.course_id where c.name='Saved Course'),
  'the week trigger enables weekly and DISABLES consecutive -- one or the other, never both');
select t.eq((select from_email from public.course_communication cc
               join public.courses c on c.id=cc.course_id where c.name='Saved Course'),
            'support@rosifit.com',
  'the course carries its own sender');
select t.eq((select source from public.effective_course_message(
              (select id from public.courses where name='Saved Course'))), 'template',
  'with no wording of its own it resolves to the template it names');

-- ------------------------------------------------------------- editing
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';

  select t.ok(not (public.save_course('Renamed Course',
    (select id from public.branches where code='SVB'),
    array[2,4]::smallint[], 'consec', 'support@ravisfit.com',
    (select id from public.email_templates where is_default),
    'We saved your mat, {{first_name}}', 'A longer body than ten characters.',
    (select id from public.courses where name='Saved Course'))->>'created')::boolean,
    'saving with a course id edits in place rather than creating a second course');
commit;

select t.eq((select count(*)::int from public.courses where name in ('Saved Course','Renamed Course')), 1,
  'there is still exactly one course');
select t.ok((select consecutive_enabled and not weekly_enabled
               from public.course_follow_up_config f
               join public.courses c on c.id=f.course_id where c.name='Renamed Course'),
  'switching the trigger disables the one it replaces');
select t.eq((select source from public.effective_course_message(
              (select id from public.courses where name='Renamed Course'))), 'course',
  'its own wording now overrides the template');
-- Editing at the SAME branch must not open a second offering: two rows for
-- one (course, branch) would split one class's members across two rosters.
select t.eq((select count(*)::int from public.course_offerings o
               join public.courses c on c.id=o.course_id where c.name='Renamed Course'), 1,
  'editing at the same branch reuses the offering rather than opening a second');

-- ------------------------------------------------------------- the guards
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  select t.rejects(
    $$select public.save_course('No Days', (select id from public.branches where code='SCB'),
        array[]::smallint[], 'week', 'a@b.com',
        (select id from public.email_templates where is_default))$$,
    'a course with no frequency days is refused -- nothing would be expected of anyone',
    'at least one frequency day');
  select t.rejects(
    $$select public.save_course('Bad Rule', (select id from public.branches where code='SCB'),
        array[1]::smallint[], 'sometimes', 'a@b.com',
        (select id from public.email_templates where is_default))$$,
    'an unknown follow-up trigger is refused',
    'week or consec');
  select t.rejects(
    $$select public.save_course('Nowhere', (select id from public.branches where code='SCB'),
        array[1]::smallint[], 'week', 'a@b.com',
        (select id from public.email_templates where is_default),
        null, null, '00000000-0000-0000-0000-000000000009')$$,
    'editing a course that does not exist is refused rather than creating one',
    'no longer exists');
commit;

-- --------------------------------------------------------------- the role
-- AMENDED 07-Sep-2026 (0038). This block asserted the opposite until today:
--   'a staff account cannot save a course -- SECURITY DEFINER re-checks the
--    role itself' / 'only the super admin'
-- and 'and the refusal created nothing'. The repo owner moved the boundary
-- (requests/2026-09-07-staff-write-access.md): staff run the register, so
-- staff own the courses it is kept for. What is asserted instead is that the
-- SECURITY DEFINER function still re-checks SOMETHING -- an active account --
-- because that check is what stops it being a hole straight through the org
-- tables, and the check moving is not the check going.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
  select t.ok((public.save_course('Staff Course', (select id from public.branches where code='SCB'),
      array[1]::smallint[], 'week', 'a@b.com',
      (select id from public.email_templates where is_default))->>'created')::boolean,
    'a staff account CAN save a course, since 0038');
commit;

select t.eq((select count(*)::int from public.courses where name='Staff Course'), 1,
  'and the course it saved is on the register');

-- The nested call is the half a permission change forgets: save_course calls
-- set_offering_schedule, which carried its OWN is_super_admin() guard until
-- 0038. A staff grant on save_course alone would have failed in there, and
-- the course above would have no schedule -- expected at no session.
select t.eq(
  (select count(*)::int
     from public.offering_schedules os
     join public.course_offerings o on o.id = os.offering_id
     join public.courses c on c.id = o.course_id
    where c.name = 'Staff Course'),
  1,
  'and its schedule was written too -- set_offering_schedule let the staff call through');

-- ============================================================ 0040 · RC-027
-- Rewording a course is not rescheduling it.
--
-- Reported 07-Sep-2026: Edit course -> Postnatal -> Wording -> tap a detail
-- chip -> Save Changes gave "this offering has a completed session on
-- 2026-09-07, so a schedule cannot start on or before it. Choose 2026-09-08
-- or later. Nothing has been saved." Nothing about the schedule was touched.
--
-- save_course called set_offering_schedule UNCONDITIONALLY, from current_date,
-- on every save. With a session already completed today the history guard
-- refused -- correctly -- and took the wording down with it, because
-- save_course is one transaction.
--
-- These pin the two halves that must BOTH hold: an unchanged schedule is not
-- re-asserted, and a changed one still is.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  select t.ok((public.save_course('Reword Course',
    (select id from public.branches where code='SVB'),
    array[2,4]::smallint[], 'week', 'support@rosifit.com',
    (select id from public.email_templates where is_default))->>'created')::boolean,
    '0040 fixture: a course to reword exists');
commit;

-- The condition the report was made under: today is already history for this
-- offering. Written directly rather than through a helper -- the point is the
-- row set_offering_schedule reads, not how it got there.
insert into public.sessions (offering_id, session_date, status, completed_at)
select o.id, current_date, 'completed', now()
  from public.course_offerings o
  join public.courses c on c.id = o.course_id
 where c.name = 'Reword Course';

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  -- Same days. Different wording. This is the exact call the Edit dialog makes
  -- when only the message was touched, and before 0040 it raised.
  select t.ok(not ((public.save_course('Reword Course',
      (select id from public.branches where code='SVB'),
      array[2,4]::smallint[], 'week', 'support@rosifit.com',
      (select id from public.email_templates where is_default),
      'We missed you, {{first_name}}', 'Hello {{first_name}}, come back to the mat.',
      (select id from public.courses where name='Reword Course')))->>'rescheduled')::boolean,
    'an unchanged schedule is not re-asserted, so a completed session today does not block a reword');
commit;

select t.eq((select subject from public.course_communication cc
               join public.courses c on c.id=cc.course_id where c.name='Reword Course'),
            'We missed you, {{first_name}}',
  'and the wording it was refusing to save is now saved');

select t.eq((select count(*)::int from public.offering_schedules os
               join public.course_offerings o on o.id = os.offering_id
               join public.courses c on c.id = o.course_id
              where c.name = 'Reword Course'), 1,
  'with no second schedule version opened -- a save that changed no days wrote no history');

-- Order does not make a change. [4,2] is the schedule [2,4] already is, and
-- comparing the raw array rather than the normalised one would put the
-- refusal straight back.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  select t.ok(not ((public.save_course('Reword Course',
      (select id from public.branches where code='SVB'),
      array[4,2,2]::smallint[], 'week', 'support@rosifit.com',
      (select id from public.email_templates where is_default),
      null, null,
      (select id from public.courses where name='Reword Course')))->>'rescheduled')::boolean,
    'the same days out of order and repeated are still the same schedule');
commit;

-- The other half. The guard is NOT relaxed: a genuine change of days on a day
-- that already has a completed session is still refused, in its own words.
-- 0040 narrowed when set_offering_schedule is called, not what it enforces.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  select t.rejects(
    $$select public.save_course('Reword Course',
        (select id from public.branches where code='SVB'),
        array[1,2,4]::smallint[], 'week', 'support@rosifit.com',
        (select id from public.email_templates where is_default),
        null, null, (select id from public.courses where name='Reword Course'))$$,
    'a REAL change of days is still refused while today is already completed',
    'completed session');
commit;

-- And a new course still gets its first schedule -- v_in_force is null there,
-- which is distinct from any weekday array. The condition must not turn into
-- "never write a schedule".
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
  select t.ok((public.save_course('First Schedule Course',
      (select id from public.branches where code='SCB'),
      array[6]::smallint[], 'consec', 'support@rosifit.com',
      (select id from public.email_templates where is_default))->>'rescheduled')::boolean,
    'a brand-new offering is still scheduled on its first save');
commit;

select t.eq((select weekdays from public.offering_schedules os
               join public.course_offerings o on o.id = os.offering_id
               join public.courses c on c.id = o.course_id
              where c.name = 'First Schedule Course'),
            array[6]::smallint[],
  'and the days it was created with are the days it is expected on');
