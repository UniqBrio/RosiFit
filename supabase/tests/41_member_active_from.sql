\echo 'member active_from: the day she goes ON the register, and the enrolment that follows it'
--
-- 0057. `members.joined_on` had ONE writer -- create_member, at the moment she
-- was added -- and after that nothing in the schema could move it.
-- update_member (0027) takes no parameter for it, and the Edit form rendered
-- the date read-only because a picker there would have accepted a change the
-- form could not save.
--
-- That stopped being tolerable at 0049, which dates every bulk-imported
-- member to the day of the UPLOAD. Forty members onboarded in one morning all
-- claim to have started that morning, and joined_on is what every date-scoped
-- screen narrows by. 0049 said the back-fill was "a data decision for the
-- academy ... the SQL for it, if they want it, is a separate migration".
--
-- What these assert, in order:
--   * the derivation: member_joined_by, on the boundary and on a null
--   * the write: her record AND her earliest enrolment move to one day, which
--     is the two-answers defect 0049 was written to remove
--   * idempotence, so a double tap on a slow connection rewrites nothing
--   * the three refusals, each naming the date that blocks it:
--       - a joining date in the future
--       - a joining date after the date she comes off the register
--       - a joining date after a session she is already recorded at, which is
--         0046's invariant read forward
--   * the gate: the SECURITY DEFINER function restates the table predicate

begin;
  insert into auth.users (id) values ('eeeeeeee-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('eeeeeeee-1111-0000-0000-000000000001',
            'eeeeeeee-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871160');

  insert into public.branches (name, code, city) values ('Erode','ERD','Erode');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Postnatal Core','07:00','08:00',6);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '07:00', '08:00'
      from public.courses c, public.branches b
     where c.name = 'Postnatal Core' and b.code = 'ERD';
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, current_date - 400, array[1,2,3,4,5,6]::smallint[]
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
     where c.name = 'Postnatal Core';
commit;

-- ==================================================== the derivation alone
-- Pure, immutable, and asked about a DAY -- the mirror of member_status_on
-- (0045). NULL is the one that would rot quietly if it were ever "read as
-- today": every member the bulk import created before 0049 carries one.
select t.eq(public.member_joined_by(null, current_date - 4000), true,
  'no date on record reads as YES on every day -- what src/data/joined.ts already does');
select t.eq(public.member_joined_by(current_date - 10, current_date - 11), false,
  'the day before she joined, she was not a member');
select t.eq(public.member_joined_by(current_date - 10, current_date - 10), true,
  'ON the joining day she IS one -- inclusive, the boundary expected_members_for_session uses');
select t.eq(public.member_joined_by(current_date - 10, current_date), true,
  'and on every day after it');

-- ====================================== the fixture: dated by the UPLOAD day
-- Exactly the shape 0049 leaves behind. She is entered with no date, so
-- create_member stores current_date -- and the academy knows perfectly well
-- she started three months ago.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.create_member(
    'Meera Sundaram',
    (select o.id from public.course_offerings o
       join public.courses c on c.id = o.course_id
      where c.name = 'Postnatal Core'),
    null,
    array[]::text[],
    array['meera.s@gmail.com']::text[],
    null);
commit;

select t.eq((select joined_on from public.members where full_name = 'Meera Sundaram'),
  current_date,
  'she is dated the day of the upload -- 0049, and the whole reason this migration exists');
select t.eq((select e.effective_from from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.full_name = 'Meera Sundaram'),
  current_date,
  'and her enrolment opens on the same day, which is the pair 0049 welded together');

-- ============================================= the correction the academy makes
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select t.ok((public.set_member_active_from(
                 (select id from public.members where full_name = 'Meera Sundaram'),
                 (current_date - 90)::date) ->> 'changed')::boolean = true,
    'moving her joining date back reports changed=true');
commit;

select t.eq((select joined_on from public.members where full_name = 'Meera Sundaram'),
  (current_date - 90)::date,
  'her record now states the day she actually started');
select t.eq((select e.effective_from from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.full_name = 'Meera Sundaram'),
  (current_date - 90)::date,
  'AND her enrolment moved with it -- one joining date, not two (0049)');
select t.eq((select updated_by from public.members where full_name = 'Meera Sundaram'),
  'eeeeeeee-1111-0000-0000-000000000001'::uuid,
  'attributed to the signed-in actor, so the audit trigger names a person');

-- The consequence that matters, rather than the column that carries it: she
-- is now expected at the sessions she was actually attending. Before the
-- correction her enrolment opened today and expected_members_for_session
-- (0007) would not have named her at any of them.
begin;
  select public.generate_sessions(o.id, (current_date - 30)::date, (current_date - 25)::date)
    from public.course_offerings o
    join public.courses c on c.id = o.course_id
   where c.name = 'Postnatal Core';
commit;

select t.ok(
  (select count(*)::int
     from public.sessions s
     join public.course_offerings o on o.id = s.offering_id
     join public.courses c on c.id = o.course_id
     cross join lateral public.expected_members_for_session(s.id) e
     join public.members m on m.id = e.member_id
    where c.name = 'Postnatal Core'
      and s.session_date between current_date - 30 and current_date - 25
      and m.full_name = 'Meera Sundaram') > 0,
  'and the sessions from before the upload now expect her -- the point of the correction');

-- ==================================================== idempotence
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select t.ok((public.set_member_active_from(
                 (select id from public.members where full_name = 'Meera Sundaram'),
                 (current_date - 90)::date) ->> 'changed')::boolean = false,
    'the same date again reports changed=false -- a double tap is not a change');
  select t.ok((public.set_member_active_from(
                 (select id from public.members where full_name = 'Meera Sundaram'),
                 (current_date - 60)::date) ->> 'changed')::boolean = true,
    'a DIFFERENT date is a real change -- "she started in July, not June"');
commit;

select t.eq((select joined_on from public.members where full_name = 'Meera Sundaram'),
  (current_date - 60)::date,
  'and the date that was moved is the one now on her record');

-- ==================================================== refusal 1: the future
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select t.rejects($q$select public.set_member_active_from(
                        (select id from public.members where full_name = 'Meera Sundaram'),
                        (current_date + 1)::date)$q$,
    'a joining date in the future is refused -- create_member''s rule, where it cannot be skipped',
    'future');
rollback;

-- ============================== refusal 2: after the day she comes off
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Meera Sundaram'),
    'inactive', (current_date - 30)::date);
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  -- members_inactive_from_after_joined would refuse this as a constraint
  -- name. The function refuses it first, in a sentence with both dates in it,
  -- because the form that sent it can show a sentence and cannot show a
  -- constraint.
  select t.rejects($q$select public.set_member_active_from(
                        (select id from public.members where full_name = 'Meera Sundaram'),
                        (current_date - 20)::date)$q$,
    'she cannot go on the register after the day she comes off it',
    'inactive');
rollback;

-- Back on, so the remaining assertions are not standing on that date.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Meera Sundaram'), 'active');
commit;

-- ================ refusal 3: past a session she is already recorded at
-- 0046 exists because a register naming her IS evidence she was there, and it
-- moves her joining date BACK to meet it -- one way, never forward. Moving it
-- forward past that session from a form would recreate exactly the
-- contradiction 0046 removes, on purpose.
begin;
  update public.sessions set status='completed', completed_at=now()
   where session_date between current_date - 30 and current_date - 25;
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'present', true
      from public.sessions s, public.members m
     where m.full_name = 'Meera Sundaram'
       and s.session_date = (select min(session_date) from public.sessions
                              where session_date >= current_date - 30);
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select t.rejects($q$select public.set_member_active_from(
                        (select id from public.members where full_name = 'Meera Sundaram'),
                        (current_date - 5)::date)$q$,
    'she cannot join later than a session she is on the register for -- 0046 read forward',
    'register');
rollback;

-- And the boundary of that refusal: the day of that session itself is legal,
-- because `>` is the comparison and not `>=`. A member whose first class was
-- the day she started is the ordinary case, not an error.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.set_member_active_from(
    (select id from public.members where full_name = 'Meera Sundaram'),
    (select min(s.session_date) from public.sessions s
       join public.attendance_records a on a.session_id = s.id
       join public.members m on m.id = a.member_id
      where m.full_name = 'Meera Sundaram'));
commit;

select t.eq((select m.joined_on from public.members m where m.full_name = 'Meera Sundaram'),
  (select min(s.session_date) from public.sessions s
     join public.attendance_records a on a.session_id = s.id
     join public.members m on m.id = a.member_id
    where m.full_name = 'Meera Sundaram'),
  'joining on the day of her first recorded session is accepted');

-- ==================================================== the gate
-- SECURITY DEFINER bypasses RLS, so the predicate members_update carries is
-- restated inside the function. Without that restatement this is a hole
-- straight through the policy.
begin;
  set local role anon;
  select t.rejects($q$select public.set_member_active_from(
                        (select id from public.members where full_name = 'Meera Sundaram'),
                        (current_date - 10)::date)$q$,
    'an unsigned-in caller is refused -- the table predicate, restated');
rollback;

-- A null date is refused rather than clearing the column: un-recording a fact
-- is a different act from correcting one, and no screen asks for it.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select t.rejects($q$select public.set_member_active_from(
                        (select id from public.members where full_name = 'Meera Sundaram'),
                        null)$q$,
    'a null date is refused -- clearing a joining date is not what this does');
rollback;
