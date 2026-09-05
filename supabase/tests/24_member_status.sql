\echo 'member status: the column that decided who gets mailed, now written and honoured'
--
-- The defect: members.status has existed since 0006 with a CHECK, a default
-- and an index, and NOTHING has ever written it. follow_up_candidates()
-- (0009) has filtered `m.status = 'active'` since the day it was written --
-- so the column decided, server-side, who the academy could ever reach, and
-- there was no way to set it and no screen that showed it. 0031 is the write
-- path.
--
-- What these assert is the pair of promises the confirmation makes: it stops
-- the follow-up, and it is NOT a departure -- her enrolment, her addresses
-- and her attendance are all still there when she comes back.

begin;
  insert into auth.users (id) values ('cccccccc-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('cccccccc-1111-0000-0000-000000000001',
            'cccccccc-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158');

  insert into public.branches (name, code, city) values ('Coimbatore','CBE','Coimbatore');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Prenatal Flow','06:00','07:00',6);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00' from public.courses c, public.branches b;
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, '2026-08-01', array[1,2,3,4,5,6]::smallint[] from public.course_offerings o;
commit;

-- She is added the normal way, so her starting status is whatever the CREATE
-- path leaves -- which is the thing every existing row is relying on.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  select public.create_member(
    'Anitha Rajesh',
    (select id from public.course_offerings),
    current_date - 60,
    array[]::text[],
    array['anitha@gmail.com']::text[],
    null);
commit;

select t.eq((select status from public.members where full_name = 'Anitha Rajesh'), 'active',
  'a member arrives active -- which is what every row written before 0031 relies on');
select t.ok((select status_changed_at is null from public.members where full_name = 'Anitha Rajesh'),
  'and nobody has changed it, so there is no date claiming somebody did');

-- She misses the whole week, so the rule fires and she IS a candidate. This
-- is the fixture the status has to be able to switch off.
begin;
  select public.generate_sessions(o.id, '2026-08-17','2026-08-22') from public.course_offerings o;
  update public.sessions set status='completed', completed_at=now();
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'absent', true
      from public.sessions s, public.members m where m.full_name = 'Anitha Rajesh';
  select public.recompute_member_stats();
commit;

select t.ok(exists (select 1 from public.follow_up_candidates('2026-08-17','2026-08-22')
                     where full_name = 'Anitha Rajesh'),
  'she meets the rule, so she is a follow-up candidate -- the fixture is real');

-- ================================================== marking her inactive
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Anitha Rajesh'), 'inactive');
commit;

select t.eq((select status from public.members where full_name = 'Anitha Rajesh'), 'inactive',
  'her status is changed -- the column had no write path at all before this');
select t.ok((select status_changed_at is not null from public.members where full_name = 'Anitha Rajesh'),
  'and WHEN she came off the register is recorded, which a client clock cannot evidence');
select t.eq((select updated_by from public.members where full_name = 'Anitha Rajesh'),
  'cccccccc-1111-0000-0000-000000000001'::uuid,
  'attributed to the signed-in actor (0023), so the audit row names a person');

select t.ok(not exists (select 1 from public.follow_up_candidates('2026-08-17','2026-08-22')
                         where full_name = 'Anitha Rajesh'),
  'and she is no longer a candidate -- the mark MEANS something, it is not a pill');

-- IT IS NOT A DEPARTURE. This is the half that would be easy to get wrong by
-- ending her enrolment "while we are here", and it would take her attendance
-- history's join with it.
select t.eq((select count(*)::int from public.member_enrollments e
               join public.members m on m.id = e.member_id
              where m.full_name = 'Anitha Rajesh' and e.status = 'active'), 1,
  'her enrolment is untouched -- inactive is "stop following her up", not "she left"');
select t.eq((select count(*)::int from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Anitha Rajesh'), 6,
  'and every attendance record she has is still there');
select t.eq((select count(*)::int from public.member_emails e
               join public.members m on m.id = e.member_id
              where m.full_name = 'Anitha Rajesh' and e.deleted_at is null), 1,
  'and so is her address, so marking her active again reaches her');

-- ======================================================== idempotence
-- A second tap on a slow connection must not rewrite WHEN she came off, and
-- must not read as a change that happened.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  select t.eq((public.set_member_status(
                (select id from public.members where full_name = 'Anitha Rajesh'),
                'inactive') ->> 'changed')::boolean, false,
    'setting the status she already holds reports changed = false');
commit;

-- ==================================================== and back again
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Anitha Rajesh'), 'active');
commit;

select t.ok(exists (select 1 from public.follow_up_candidates('2026-08-17','2026-08-22')
                     where full_name = 'Anitha Rajesh'),
  'marking her active again puts her straight back in the follow-up set');

-- ========================================================= the refusals
-- Signed in throughout: a refusal that fires because nobody was signed in
-- would pass this file while proving nothing about the value or the id.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  select t.rejects($$select public.set_member_status(
                       (select id from public.members where full_name = 'Anitha Rajesh'), 'archived')$$,
    'a status outside the CHECK is refused, in words a person can read',
    'active, paused or inactive');
  select t.rejects($$select public.set_member_status(
                       '00000000-0000-0000-0000-000000000000'::uuid, 'inactive')$$,
    'a member who is not on the register is refused', 'not on the register');
commit;

-- And the gate itself. The function is SECURITY DEFINER, so the members_update
-- policy it bypasses has to be restated inside it or this is a hole through it.
select t.rejects($$select public.set_member_status(
                     (select id from public.members where full_name = 'Anitha Rajesh'), 'inactive')$$,
  'nobody signed in cannot change anybody''s status', 'signed-in');
