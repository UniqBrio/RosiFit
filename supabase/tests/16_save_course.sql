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
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
  select t.rejects(
    $$select public.save_course('Staff Course', (select id from public.branches where code='SCB'),
        array[1]::smallint[], 'week', 'a@b.com',
        (select id from public.email_templates where is_default))$$,
    'a staff account cannot save a course -- SECURITY DEFINER re-checks the role itself',
    'only the super admin');
commit;

select t.eq((select count(*)::int from public.courses where name='Staff Course'), 0,
  'and the refusal created nothing');
