\echo 'member inactive_from: a status that says WHEN, and an engine that reads the day'
--
-- 0045. `members.status` could only ever say "now" -- the pill wrote it and
-- status_changed_at recorded the press -- so a member who is active today and
-- leaving next month could be recorded two ways and both were wrong: left
-- active and remembered, or marked inactive five weeks early and withheld
-- follow-up she was still owed.
--
-- What these assert, in order:
--   * the boundary: active up to the date, inactive from it, on the day
--   * that a NULL date reads exactly as it did before 0045, which is what
--     every existing row relies on
--   * that follow_up_candidates() judges on the DAY, so nobody has to press
--     anything when the date arrives
--   * that her enrolment, her expectation and her attendance do not move --
--     the promise 0031 made, inherited
--   * the two refusals: a departure before her arrival, and a date beside an
--     active status
--   * that marking her active clears the date, and that the write is
--     idempotent on the PAIR

begin;
  insert into auth.users (id) values ('dddddddd-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('dddddddd-1111-0000-0000-000000000001',
            'dddddddd-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871159');

  insert into public.branches (name, code, city) values ('Salem','SLM','Salem');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Trimester 3 Gentle','06:00','07:00',6);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00'
      from public.courses c, public.branches b
     where c.name = 'Trimester 3 Gentle' and b.code = 'SLM';
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, current_date - 120, array[1,2,3,4,5,6]::smallint[]
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
     where c.name = 'Trimester 3 Gentle';
commit;

-- She joined 60 days ago and misses a whole week, so the rule fires and she
-- IS a candidate. That is the fixture the date has to be able to switch off
-- -- on a day, not on a press.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.create_member(
    'Revathi Nair',
    (select o.id from public.course_offerings o
       join public.courses c on c.id = o.course_id
      where c.name = 'Trimester 3 Gentle'),
    current_date - 60,
    array[]::text[],
    array['revathi.n@gmail.com']::text[],
    null);
commit;

select t.ok((select inactive_from is null from public.members where full_name = 'Revathi Nair'),
  'a member arrives with no inactive date -- which is what every row written before 0045 carries');

begin;
  select public.generate_sessions(o.id, (current_date - 7)::date, (current_date - 2)::date)
    from public.course_offerings o
    join public.courses c on c.id = o.course_id
   where c.name = 'Trimester 3 Gentle';
  update public.sessions set status='completed', completed_at=now()
   where session_date between current_date - 7 and current_date - 2;
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'absent', true
      from public.sessions s, public.members m
     where m.full_name = 'Revathi Nair'
       and s.session_date between current_date - 7 and current_date - 2;
  select public.recompute_member_stats();
commit;

select t.ok(exists (select 1 from public.follow_up_candidates(
                      (current_date - 7)::date, (current_date - 2)::date)
                     where full_name = 'Revathi Nair'),
  'she meets the rule, so she is a follow-up candidate -- the fixture is real');

-- ============================================ the requester's own case
-- "A member is active today but wants to leave next month."
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Revathi Nair'),
    'inactive',
    (current_date + 30)::date);
commit;

select t.eq((select status from public.members where full_name = 'Revathi Nair'), 'inactive',
  'the stated status is stored, exactly as it was before the column had a date');
select t.eq((select inactive_from from public.members where full_name = 'Revathi Nair'),
  (current_date + 30)::date,
  'and the date it applies from is stored beside it');
select t.ok((select status_changed_at is not null from public.members where full_name = 'Revathi Nair'),
  'WHEN somebody recorded it is still stamped -- a different fact from when she leaves');
select t.eq((select updated_by from public.members where full_name = 'Revathi Nair'),
  'dddddddd-1111-0000-0000-000000000001'::uuid,
  'attributed to the signed-in actor (0023), so the audit row names a person');

-- --------------------------------------------------- the boundary itself
select t.eq(public.member_status_on('inactive', current_date + 30, current_date), 'active',
  'today she is ACTIVE -- the whole request in one row');
select t.eq(public.member_status_on('inactive', current_date + 30, current_date + 29), 'active',
  'the day before the date, still active');
select t.eq(public.member_status_on('inactive', current_date + 30, current_date + 30), 'inactive',
  'ON the date she is inactive -- it is the first day off, not the last day on');
select t.eq(public.member_status_on('inactive', current_date + 30, current_date + 365), 'inactive',
  'and every day after it');
select t.eq(public.member_status_on('active', null, current_date - 400), 'active',
  'a stated active is active on every day');

-- A NULL date is not "today". This is the whole compatibility claim: every
-- row that existed when 0045 ran carries null, and none of them may move.
select t.eq(public.member_status_on('inactive', null, current_date - 400), 'inactive',
  'no date on record means the status applies on EVERY day -- how every pre-0045 row reads');
select t.eq(public.member_status_on('inactive', null, current_date + 400), 'inactive',
  'on both sides of today, because there is no side to be on');

-- ------------------------------------------- the engine judges on the day
select t.ok(exists (select 1 from public.follow_up_candidates(
                      (current_date - 7)::date, (current_date - 2)::date)
                     where full_name = 'Revathi Nair'),
  'she is STILL a follow-up candidate: her date is a month away and she is owed those follow-ups');

-- Bring the date to today and ask the same question. Nothing else changes --
-- no session, no attendance row, no enrolment -- so the only thing that can
-- move the answer is the date.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Revathi Nair'),
    'inactive', current_date);
commit;

select t.ok(not exists (select 1 from public.follow_up_candidates(
                          (current_date - 7)::date, (current_date - 2)::date)
                         where full_name = 'Revathi Nair'),
  'the day arrives and she drops out of the candidate list, with nobody pressing anything');

-- ==================================== her enrolment, expectation and history
-- The promise 0031 made and 0045 inherits: this is a statement about
-- FOLLOW-UP, not a departure.
select t.eq((select count(*)::int from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.full_name = 'Revathi Nair' and e.status = 'active'), 1,
  'her enrolment is untouched -- inactive is not unenrolled');
select t.ok((select e.effective_to is null from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.full_name = 'Revathi Nair'),
  'and it is not closed at the inactive date either: the enrolment window is a different fact');
select t.eq((select count(*)::int from public.attendance_records a
              join public.members m on m.id = a.member_id
             where m.full_name = 'Revathi Nair'), 6,
  'every attendance record she had is still there, unedited');

-- Sessions AFTER the date still expect her, because expectation resolves
-- offering schedule -> enrolment window -> member override (0007) and
-- members.status is none of the three. A WEEK of them, not one day: the
-- offering runs Mon-Sat, so a single tomorrow could land on the Sunday it
-- does not run and the assertion would pass for the wrong reason.
begin;
  select public.generate_sessions(o.id, (current_date + 1)::date, (current_date + 7)::date)
    from public.course_offerings o
    join public.courses c on c.id = o.course_id
   where c.name = 'Trimester 3 Gentle';
commit;

select t.eq(
  (select count(*)::int from public.sessions s
     join public.course_offerings o on o.id = s.offering_id
     join public.courses c on c.id = o.course_id
    where c.name = 'Trimester 3 Gentle'
      and s.session_date between current_date + 1 and current_date + 7), 6,
  'the offering runs six days of that week -- the fixture for the next assertion is real');

select t.eq(
  (select count(*)::int
     from public.sessions s
     join public.course_offerings o on o.id = s.offering_id
     join public.courses c on c.id = o.course_id
     cross join lateral public.expected_members_for_session(s.id) e
     join public.members m on m.id = e.member_id
    where c.name = 'Trimester 3 Gentle'
      and s.session_date between current_date + 1 and current_date + 7
      and m.full_name = 'Revathi Nair'), 6,
  'every one of them still expects her -- the date stops follow-up, not attendance');

-- ================================================== the two refusals
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select t.rejects($q$select public.set_member_status(
                        (select id from public.members where full_name = 'Revathi Nair'),
                        'inactive', (current_date - 400)::date)$q$,
    'a departure before her arrival is refused -- she joined 60 days ago',
    'she joined on');
  -- The CHECK says the same thing; the RPC says it to a PERSON, with both
  -- dates in it, because the form that sent it shows this sentence and
  -- cannot show a constraint name.
  select t.rejects($q$update public.members set inactive_from = current_date - 400
                       where full_name = 'Revathi Nair'$q$,
    'and the constraint refuses the same date written directly',
    'members_inactive_from_after_joined');
commit;

select t.eq((select inactive_from from public.members where full_name = 'Revathi Nair'),
  current_date,
  'and neither refusal changed anything -- her date is the one she had');

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select t.rejects($q$update public.members
                         set status = 'active', inactive_from = current_date + 5
                       where full_name = 'Revathi Nair'$q$,
    'a date beside an ACTIVE status cannot be written at all',
    'members_inactive_from_needs_status');
commit;

-- ================================ coming back on, and the double tap
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Revathi Nair'), 'active');
commit;

select t.ok((select inactive_from is null from public.members where full_name = 'Revathi Nair'),
  'marking her active CLEARS the date -- coming back on is not a dated act');
select t.ok(exists (select 1 from public.follow_up_candidates(
                      (current_date - 7)::date, (current_date - 2)::date)
                     where full_name = 'Revathi Nair'),
  'and she is straight back in the follow-up rule');

-- A date is IGNORED on the way back on, rather than stored beside an active
-- status: the caller does not have to know to send null.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Revathi Nair'),
    'active', (current_date + 3)::date);
commit;

select t.ok((select inactive_from is null from public.members where full_name = 'Revathi Nair'),
  'a date sent with Active is dropped, not stored -- the constraint could never hold it anyway');

-- Idempotent on the PAIR. Re-sending what she already holds must not rewrite
-- when somebody took her off; re-sending the same status with a DIFFERENT
-- date is a real change and must.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Revathi Nair'), 'inactive',
    (current_date + 10)::date);

  select t.ok((public.set_member_status(
                 (select id from public.members where full_name = 'Revathi Nair'),
                 'inactive', (current_date + 10)::date) ->> 'changed')::boolean = false,
    'the same status AND the same date reports changed=false -- a double tap on a slow connection');

  select t.ok((public.set_member_status(
                 (select id from public.members where full_name = 'Revathi Nair'),
                 'inactive', (current_date + 20)::date) ->> 'changed')::boolean = true,
    'the same status with a DIFFERENT date is a real change -- "she leaves on the 30th, not the 20th"');
commit;

select t.eq((select inactive_from from public.members where full_name = 'Revathi Nair'),
  (current_date + 20)::date,
  'and the date that was moved is the one now on her record');
