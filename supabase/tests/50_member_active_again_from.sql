\echo 'member active_again_from: the way back ON the register is dated too'
--
-- 0072. 0045 dated one direction of the pill and left the other undated: a
-- member marked active was active, and always had been, because
-- members_inactive_from_needs_status forbids a date beside an active status
-- and set_member_status cleared the column on the way in. So "this member is
-- back with us from the 1st" could not be recorded, and a roster whose week
-- strip steps 26 weeks either way answered every one of those days with a
-- fact about now.
--
-- What these assert, in order:
--   * a member arrives with no return date, and one is stored when stated
--   * the boundary, in the mirror of tests/34: off the register up to the
--     date, on it from the date, on the day
--   * that the 3-argument member_status_on (0045) is untouched -- tests/34 is
--     still asserting the same function, not a renamed one
--   * that follow_up_candidates() judges on the DAY, so a member whose return
--     has not arrived is not written to, and is, once it has
--   * that the enrolment and the attendance records do not move
--   * the two refusals: a return before the arrival, and a return date beside
--     a non-active status
--   * that going back off CLEARS the return date, and that the write is
--     idempotent on the TRIPLE

begin;
  insert into auth.users (id) values ('eeeeeeee-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('eeeeeeee-1111-0000-0000-000000000001',
            'eeeeeeee-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871159');

  insert into public.branches (name, code, city) values ('Erode','ERD','Erode');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Postnatal Rebuild','07:00','08:00',6);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '07:00', '08:00'
      from public.courses c, public.branches b
     where c.name = 'Postnatal Rebuild' and b.code = 'ERD';
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, current_date - 120, array[1,2,3,4,5,6]::smallint[]
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
     where c.name = 'Postnatal Rebuild';
commit;

-- Joined 60 days ago and missed a whole week, so the rule fires: the same
-- fixture shape tests/34 uses, because the thing being switched on and off
-- here is the same engine.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.create_member(
    'Lakshmi Iyer',
    (select o.id from public.course_offerings o
       join public.courses c on c.id = o.course_id
      where c.name = 'Postnatal Rebuild'),
    current_date - 60,
    array[]::text[],
    array['lakshmi.i@gmail.com']::text[],
    null);
commit;

select t.ok((select active_again_from is null from public.members where full_name = 'Lakshmi Iyer'),
  'a member arrives with no return date -- which is what every row written before 0072 carries');

-- THE PAST WINDOW IS LAST WEEK'S MONDAY TO SATURDAY, not "7 to 2 days ago":
-- on a Mon-Sat schedule that one held six sessions only when it held no
-- Sunday, i.e. only on a Monday run, so the spec's counts depended on the
-- day it ran (fixed 26-Sep-2026, T-136). Always six, always in the past.
begin;
  select public.generate_sessions(o.id, (date_trunc('week', current_date)::date - 7), (date_trunc('week', current_date)::date - 2))
    from public.course_offerings o
    join public.courses c on c.id = o.course_id
   where c.name = 'Postnatal Rebuild';
  update public.sessions set status='completed', completed_at=now()
   where session_date between date_trunc('week', current_date)::date - 7 and date_trunc('week', current_date)::date - 2;
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'absent', true
      from public.sessions s, public.members m
     where m.full_name = 'Lakshmi Iyer'
       and s.session_date between date_trunc('week', current_date)::date - 7 and date_trunc('week', current_date)::date - 2;
  select public.recompute_member_stats();
commit;

select t.ok(exists (select 1 from public.follow_up_candidates(
                      (date_trunc('week', current_date)::date - 7), (date_trunc('week', current_date)::date - 2))
                     where full_name = 'Lakshmi Iyer'),
  'the member meets the rule, so is a follow-up candidate -- the fixture is real');

-- ================================================ the requester's own case
-- "mark as active ... allow user to select active from date in pop up"
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Lakshmi Iyer'), 'inactive');
  select public.set_member_status(
    (select id from public.members where full_name = 'Lakshmi Iyer'),
    'active', null, (current_date + 30)::date);
commit;

select t.eq((select status from public.members where full_name = 'Lakshmi Iyer'), 'active',
  'the stated status is stored');
select t.eq((select active_again_from from public.members where full_name = 'Lakshmi Iyer'),
  (current_date + 30)::date,
  'and the day it applies from is stored beside it');
select t.ok((select inactive_from is null from public.members where full_name = 'Lakshmi Iyer'),
  'the other date is cleared -- the two are never both set, whatever a caller sends');
select t.eq((select updated_by from public.members where full_name = 'Lakshmi Iyer'),
  'eeeeeeee-1111-0000-0000-000000000001'::uuid,
  'attributed to the signed-in actor (0023), so the audit row names a person');

-- ------------------------------------------------------ the boundary itself
-- The mirror of tests/34's block, read the other way round.
select t.eq(public.member_status_on('active', null, current_date + 30, current_date), 'inactive',
  'today the member is still OFF the register -- the return has not arrived');
select t.eq(public.member_status_on('active', null, current_date + 30, current_date + 29), 'inactive',
  'the day before the date, still off');
select t.eq(public.member_status_on('active', null, current_date + 30, current_date + 30), 'active',
  'ON the date the member is back -- it is the first day on, not the last day off');
select t.eq(public.member_status_on('active', null, current_date + 30, current_date + 365), 'active',
  'and every day after it');
select t.eq(public.member_status_on('active', null, null, current_date - 400), 'active',
  'a stated active with no return date is active on every day, exactly as before 0072');
select t.eq(public.member_status_on('inactive', null, null, current_date + 400), 'inactive',
  'and a stated inactive with neither date is inactive on every day');

-- A date recorded LATE is the same act as one recorded early, which is the
-- reason 0045 allows a past date and this allows one too.
select t.eq(public.member_status_on('active', null, current_date - 10, current_date), 'active',
  'a return backdated ten days reads active today');
select t.eq(public.member_status_on('active', null, current_date - 10, current_date - 11), 'inactive',
  'and still off the register the day before it');

-- ------------------------------------- 0045 is untouched, not renamed away
-- The 3-argument function is what tests/34 pins the other boundary with. If
-- 0072 had widened it in place rather than overloading it, that spec would
-- have become a spec for a function that no longer exists.
select t.eq(public.member_status_on('inactive', current_date + 30, current_date), 'active',
  'the 3-argument form still answers 0045''s question, unchanged');
select t.eq(public.member_status_on('inactive', null, current_date - 400), 'inactive',
  'including its NULL-is-not-today compatibility claim');

-- --------------------------------------- the engine judges on the day
select t.ok(not exists (select 1 from public.follow_up_candidates(
                          (date_trunc('week', current_date)::date - 7), (date_trunc('week', current_date)::date - 2))
                         where full_name = 'Lakshmi Iyer'),
  'a member whose return has not arrived is NOT written to -- the whole point of dating it');

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Lakshmi Iyer'),
    'active', null, (current_date - 1)::date);
commit;

select t.ok(exists (select 1 from public.follow_up_candidates(
                      (date_trunc('week', current_date)::date - 7), (date_trunc('week', current_date)::date - 2))
                     where full_name = 'Lakshmi Iyer'),
  'and once the day has arrived the member is back in the rule, with nobody pressing anything');

-- ------------------------------------------- what a dated return does NOT move
select t.eq((select count(*)::int from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.full_name = 'Lakshmi Iyer' and e.effective_to is null), 1,
  'the enrolment is open and untouched -- 0031''s promise, inherited twice over');
select t.eq((select count(*)::int from public.attendance_records a
              join public.members m on m.id = a.member_id
             where m.full_name = 'Lakshmi Iyer'), 6,
  'and every attendance record is where it was');

-- ==================================================== the two refusals
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select t.rejects($q$select public.set_member_status(
                        (select id from public.members where full_name = 'Lakshmi Iyer'),
                        'active', null, (current_date - 400)::date)$q$,
    'a return before the arrival is refused -- this member joined 60 days ago',
    'cannot go back on the register from');
  -- The CHECK says the same thing; the RPC says it to a PERSON, with both
  -- dates in it, because the form that sent it shows this sentence and
  -- cannot show a constraint name.
  select t.rejects($q$update public.members set active_again_from = current_date - 400
                       where full_name = 'Lakshmi Iyer'$q$,
    'and the constraint refuses the same date written directly',
    'members_active_again_from_after_joined');
commit;

select t.eq((select active_again_from from public.members where full_name = 'Lakshmi Iyer'),
  (current_date - 1)::date,
  'and neither refusal changed anything -- the date on the record is the one it had');

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select t.rejects($q$update public.members
                         set status = 'inactive', active_again_from = current_date + 5
                       where full_name = 'Lakshmi Iyer'$q$,
    'a return date beside a NON-active status cannot be written at all',
    'members_active_again_from_needs_status');
commit;

-- ============================ going back off, and the double tap
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Lakshmi Iyer'), 'inactive');
commit;

select t.ok((select active_again_from is null from public.members where full_name = 'Lakshmi Iyer'),
  'going back off CLEARS the return date -- the constraint could never hold it anyway');

-- A return date is IGNORED on the way off, rather than stored beside a
-- non-active status: the caller does not have to know to send null.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Lakshmi Iyer'),
    'inactive', null, (current_date + 3)::date);
commit;

select t.ok((select active_again_from is null from public.members where full_name = 'Lakshmi Iyer'),
  'a return date sent with Inactive is dropped, not stored');

-- Idempotent on the TRIPLE. Re-sending what the record already holds must not
-- rewrite when somebody moved it; re-sending the same status with a DIFFERENT
-- return date is a real change and must.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Lakshmi Iyer'),
    'active', null, (current_date + 10)::date);

  select t.ok((public.set_member_status(
                 (select id from public.members where full_name = 'Lakshmi Iyer'),
                 'active', null, (current_date + 10)::date) ->> 'changed')::boolean = false,
    'the same status AND the same return date reports changed=false -- a double tap on a slow connection');

  select t.ok((public.set_member_status(
                 (select id from public.members where full_name = 'Lakshmi Iyer'),
                 'active', null, (current_date + 20)::date) ->> 'changed')::boolean = true,
    'the same status with a DIFFERENT return date is a real change -- "they are back on the 20th, not the 10th"');
commit;

select t.eq((select active_again_from from public.members where full_name = 'Lakshmi Iyer'),
  (current_date + 20)::date,
  'and the date that was moved is the one now on the record');

-- The three-argument call every existing caller makes still resolves here,
-- through the default, and still means what it always meant.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.set_member_status(
    (select id from public.members where full_name = 'Lakshmi Iyer'),
    'inactive', (current_date + 15)::date);
commit;

select t.eq((select inactive_from from public.members where full_name = 'Lakshmi Iyer'),
  (current_date + 15)::date,
  'a 3-argument call is unchanged by 0072 -- bulk_set_member_dates makes exactly this one');
select t.ok((select active_again_from is null from public.members where full_name = 'Lakshmi Iyer'),
  'and it leaves no return date behind');
