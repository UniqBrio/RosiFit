\echo 'course threshold: the count is the academy''s, 1..7, and it reaches the rule'
--
-- The defect: save_course hard-coded the follow-up count at FOUR (0022, in
-- the values list, twice). A course running once or twice a week could never
-- reach four missed sessions in a week, so its trigger read as switched ON in
-- the form and was unreachable by arithmetic -- no follow-up at all, silently.
-- 0030 makes it a parameter, 1..7.

begin;
  insert into auth.users (id) values ('b0000000-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('b0000000-1111-0000-0000-000000000001',
            'b0000000-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158');
  insert into public.branches (name, code, city) values ('Velachery','VEL','Chennai');
  insert into public.email_templates (name, subject, body_text, is_active)
    values ('Gentle check-in', 'We missed you, {{first_name}}', 'Hello {{first_name}}.', true);
commit;

-- ===================================================== the default is still 4
-- Every call written before 0030 omits the argument and must keep meaning what
-- it meant. That is the whole reason the parameter is appended and defaulted.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000001';
  select public.save_course('Unchanged', (select id from public.branches),
    array[1,3,5]::smallint[], 'week', 'support@example.com',
    (select id from public.email_templates), null, null, null);
commit;

select t.eq((select cf.weekly_threshold from public.course_follow_up_config cf
               join public.courses c on c.id = cf.course_id where c.name = 'Unchanged'), 4,
  'a call with no threshold still means 4 -- 0030 changed nothing for existing callers');

-- ========================================================= the academy's own
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000001';
  -- A course that runs ONCE a week. Four could never fire here; one can.
  select public.save_course('Sunday Only', (select id from public.branches),
    array[7]::smallint[], 'week', 'support@example.com',
    (select id from public.email_templates), null, null, null, 1::smallint);
commit;

select t.eq((select cf.weekly_threshold from public.course_follow_up_config cf
               join public.courses c on c.id = cf.course_id where c.name = 'Sunday Only'), 1,
  'one missed session is a legal trigger -- the point of the change');
select t.ok((select cf.weekly_enabled from public.course_follow_up_config cf
               join public.courses c on c.id = cf.course_id where c.name = 'Sunday Only'),
  'and the weekly trigger is the one switched on');

-- The count lands on BOTH columns on purpose: switching the trigger back must
-- not silently reset the number the academy chose.
select t.eq((select cf.consecutive_threshold from public.course_follow_up_config cf
               join public.courses c on c.id = cf.course_id where c.name = 'Sunday Only'), 1,
  'the disabled trigger keeps the same count, so switching back does not reset it');
select t.ok(not (select cf.consecutive_enabled from public.course_follow_up_config cf
               join public.courses c on c.id = cf.course_id where c.name = 'Sunday Only'),
  'but it stays disabled -- one trigger or the other, never both');

-- ================================================================ the bounds
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000001';
  select public.save_course('Zero', (select id from public.branches),
    array[1]::smallint[], 'week', 'support@example.com',
    (select id from public.email_templates), null, null, null, 0::smallint)$$,
  'zero is refused -- it would flag a member who has missed nothing', 'between 1 and 7');

select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000001';
  select public.save_course('Eight', (select id from public.branches),
    array[1]::smallint[], 'week', 'support@example.com',
    (select id from public.email_templates), null, null, null, 8::smallint)$$,
  'eight is refused -- a week has seven days, so it could never fire', 'between 1 and 7');

select t.eq((select count(*)::int from public.courses where name in ('Zero','Eight')), 0,
  'and neither refused call left a course behind -- the whole save is one transaction');

-- ================================================== changing it on an EDIT
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000001';
  select public.save_course('Sunday Only', (select id from public.branches),
    array[7]::smallint[], 'week', 'support@example.com',
    (select id from public.email_templates), null, null,
    (select id from public.courses where name = 'Sunday Only'), 5::smallint);
commit;

select t.eq((select cf.weekly_threshold from public.course_follow_up_config cf
               join public.courses c on c.id = cf.course_id where c.name = 'Sunday Only'), 5,
  'editing the course changes the count in place');
select t.eq((select count(*)::int from public.course_follow_up_config cf
               join public.courses c on c.id = cf.course_id where c.name = 'Sunday Only'), 1,
  'and does not leave a second config row behind');

-- ============================================ it actually reaches the engine
-- The number is worth nothing if follow_up_candidates does not read it. One
-- member, one missed session, threshold 1.
begin;
  insert into public.members (full_name, joined_on, status) values ('Solo Member', current_date - 30, 'active');
  insert into public.member_enrollments (member_id, offering_id, effective_from)
    select m.id, o.id, current_date - 30
      from public.members m, public.course_offerings o
      join public.courses c on c.id = o.course_id
     where m.full_name = 'Solo Member' and c.name = 'Sunday Only';
  insert into public.sessions (offering_id, session_date, status)
    select o.id, current_date - 1, 'completed'
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Sunday Only';
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'absent', true
      from public.sessions s, public.members m
     where m.full_name = 'Solo Member' and s.session_date = current_date - 1;
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000001';
  select public.save_course('Sunday Only', (select id from public.branches),
    array[7]::smallint[], 'week', 'support@example.com',
    (select id from public.email_templates), null, null,
    (select id from public.courses where name = 'Sunday Only'), 1::smallint);
commit;

select t.ok(exists (select 1 from public.follow_up_candidates(
              current_date - 7, current_date, null, null) f
             where f.full_name = 'Solo Member'),
  'ONE missed session flags her once the academy says one -- the number reaches the engine');

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000001';
  select public.save_course('Sunday Only', (select id from public.branches),
    array[7]::smallint[], 'week', 'support@example.com',
    (select id from public.email_templates), null, null,
    (select id from public.courses where name = 'Sunday Only'), 2::smallint);
commit;

select t.ok(not exists (select 1 from public.follow_up_candidates(
              current_date - 7, current_date, null, null) f
             where f.full_name = 'Solo Member'),
  'and raising it to two takes her off again -- the same member, the same absence');

-- ==================================================================== the gate
select t.rejects($$
  set local role anon;
  select public.save_course('Anon', (select id from public.branches),
    array[1]::smallint[], 'week', 'support@example.com',
    (select id from public.email_templates), null, null, null, 3::smallint)$$,
  'anon may not save a course, threshold or otherwise', 'permission denied');
