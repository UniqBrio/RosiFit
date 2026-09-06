\echo 'merge_member_into: the alias was only half the act -- the attendance has to move with it'
--
-- The defect this closes. The upload now auto-creates a member for a Meet
-- display name it cannot resolve, and marks HER present. Saying afterwards
-- that "Rani Sham" is a display name for Rani used to insert one alias row
-- and stop: the matcher learned the spelling for every FUTURE file, and this
-- file stayed wrong -- Rani Sham held the attendance, Rani was still expected
-- and therefore still absent, and the register said a woman who came to class
-- did not.
--
-- So these assert the whole act, not the visible half: the attendance moves,
-- the target's own record wins where both were in one session, the display
-- names move, the stray is retired, and the follow-up rule stops counting an
-- absence that never happened.

begin;
  insert into auth.users (id) values ('dddddddd-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('dddddddd-1111-0000-0000-000000000001',
            'dddddddd-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871159');

  insert into public.branches (name, code, city) values ('Salem','SLM','Salem');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Prenatal Flow','06:00','07:00',6);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00' from public.courses c, public.branches b;
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, '2026-08-01', array[1,2,3,4,5,6]::smallint[] from public.course_offerings o;
commit;

-- The real member, enrolled and with an address, exactly as she is on the
-- register today.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.create_member(
    'Rani',
    (select id from public.course_offerings),
    '2026-08-01',
    array[]::text[],
    array['rani@gmail.com']::text[],
    null);
commit;

-- The stray: what the importer creates for a name it could not resolve. No
-- address -- that is WHY she lands in the No email group.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.create_member(
    'Rani Sham',
    (select id from public.course_offerings),
    '2026-08-17',
    array[]::text[],
    array[]::text[],
    null);
commit;

begin;
  select public.generate_sessions(o.id, '2026-08-17','2026-08-22') from public.course_offerings o;
  update public.sessions set status='completed', completed_at=now();
commit;

-- THE WRONG REGISTER, built exactly as the import leaves it. Two sessions:
--   Mon 17th -- the file named "Rani Sham", so the stray is present and Rani,
--               who was expected, is absent. This is the lie.
--   Tue 18th -- both have a record: Rani was matched properly that day and
--               the stray was marked too. The unique index allows one.
begin;
  insert into public.attendance_records (session_id, member_id, status, expected, raw_display_name)
    select s.id, m.id, 'present', true, 'Rani Sham'
      from public.sessions s, public.members m
     where s.session_date = '2026-08-17' and m.full_name = 'Rani Sham';
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'absent', true
      from public.sessions s, public.members m
     where s.session_date = '2026-08-17' and m.full_name = 'Rani';

  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'present', true
      from public.sessions s, public.members m
     where s.session_date = '2026-08-18' and m.full_name = 'Rani';
  insert into public.attendance_records (session_id, member_id, status, expected, raw_display_name)
    select s.id, m.id, 'present', true, 'Rani Sham'
      from public.sessions s, public.members m
     where s.session_date = '2026-08-18' and m.full_name = 'Rani Sham';
commit;

select t.eq((select a.status from public.attendance_records a join public.members m on m.id = a.member_id
              join public.sessions s on s.id = a.session_id
             where m.full_name = 'Rani' and s.session_date = '2026-08-17'), 'absent',
  'before the merge the real member is marked ABSENT from a class she attended -- the fixture is the defect');

-- ============================================================== the merge
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.merge_member_into(
    (select id from public.members where full_name = 'Rani Sham'),
    (select id from public.members where full_name = 'Rani'));
commit;

-- ---------------------------------------------------- the attendance moved
select t.eq((select a.status from public.attendance_records a join public.members m on m.id = a.member_id
              join public.sessions s on s.id = a.session_id
             where m.full_name = 'Rani' and s.session_date = '2026-08-17'
               and a.deleted_at is null), 'present',
  'the 17th now says PRESENT for the member she actually is -- this is the whole point of the merge');

select t.eq((select a.raw_display_name from public.attendance_records a join public.members m on m.id = a.member_id
              join public.sessions s on s.id = a.session_id
             where m.full_name = 'Rani' and s.session_date = '2026-08-17'
               and a.deleted_at is null), 'Rani Sham',
  'and the name the FILE carried is still on the record, so the move is readable afterwards');

select t.eq((select count(*)::int from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-17' and a.deleted_at is null), 1,
  'the absence it replaced is gone, not kept alongside it -- one member, one session, one record');

-- ------------------------------------------- the target's own record wins
select t.eq((select count(*)::int from public.attendance_records a
               join public.members m on m.id = a.member_id
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-18' and m.full_name = 'Rani'
                and a.deleted_at is null), 1,
  'where BOTH were in one session the target keeps exactly one record -- attendance_unique_live is not negotiable');

select t.eq((select count(*)::int from public.attendance_records a
              where a.raw_display_name = 'Rani Sham' and a.deleted_at is not null), 1,
  'and the stray''s duplicate is soft-deleted rather than dropped, so the merge can be read back');

-- ------------------------------------------------------- the display name
select t.ok(exists (
    select 1 from public.member_aliases al join public.members m on m.id = al.member_id
     where m.full_name = 'Rani' and al.alias_display = 'Rani Sham'),
  '"Rani Sham" is now a display name for Rani -- which is what the operator thought she was doing');

select t.eq((select count(*)::int from public.member_aliases al
               join public.members m on m.id = al.member_id
              where m.full_name = 'Rani Sham'), 0,
  'and nothing is left pointing at the stray');

-- -------------------------------------------------------------- retired
select t.ok((select deleted_at is not null from public.members where full_name = 'Rani Sham'),
  'the stray is retired -- she was never a person, she was a spelling');

select t.eq((select count(*)::int from public.member_enrollments e
               join public.members m on m.id = e.member_id
              where m.full_name = 'Rani Sham' and e.status = 'active'), 0,
  'her enrolment is ended, so nothing expects her at a class any more');

select t.eq((select count(*)::int from public.member_enrollments e
               join public.members m on m.id = e.member_id
              where m.full_name = 'Rani' and e.status = 'active'), 1,
  'and the target''s own enrolment is untouched -- merging is a statement about the STRAY');

-- ----------------------------------------------- what the academy now sees
begin;
  select public.recompute_member_stats();
commit;

select t.ok(not exists (
    select 1 from public.follow_up_candidates('2026-08-17','2026-08-22')
     where full_name = 'Rani Sham'),
  'a retired spelling is never a follow-up candidate');

-- ==================================================== what it refuses
-- Each refusal runs SIGNED IN. Outside a transaction the role resets, and
-- then every one of these would be rejected by the caller check instead --
-- a test that passes for the wrong reason is worse than no test.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';

  select t.rejects(
    format('select public.merge_member_into(%L, %L)',
      (select id from public.members where full_name = 'Rani'),
      (select id from public.members where full_name = 'Rani')),
    'a member cannot be merged into herself',
    'same member');

  -- Called twice: the stray is gone, and the honest answer is that she is not
  -- on the register -- never a silent success that did nothing.
  select t.rejects(
    format('select public.merge_member_into(%L, %L)',
      (select id from public.members where full_name = 'Rani Sham'),
      (select id from public.members where full_name = 'Rani')),
    'merging a member who has already been merged says so',
    'not on the register');
commit;

-- An address is the one thing this act will not decide: choosing which
-- primary wins is not a merge's business, so it refuses instead of guessing.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.create_member(
    'Kavya Balaji',
    (select id from public.course_offerings),
    '2026-08-19',
    array[]::text[],
    array['kavya@gmail.com']::text[],
    null);
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select t.rejects(
    format('select public.merge_member_into(%L, %L)',
      (select id from public.members where full_name = 'Kavya Balaji'),
      (select id from public.members where full_name = 'Rani')),
    'a stray carrying her own address is refused rather than merged on a guess',
    'email address of her own');
commit;

-- ========================================================= who may call it
-- SECURITY DEFINER bypasses RLS, so the function restates the predicate the
-- members policy carries. Anonymous is not a signed-in active user.
begin;
  set local role anon;
  select t.rejects(
    format('select public.merge_member_into(%L, %L)',
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'),
    'anonymous cannot merge anybody',
    'signed-in');
commit;
