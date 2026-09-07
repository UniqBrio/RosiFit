\echo 'attendance_backdates_membership: a register that names her moves her joining date back, and never forward'
--
-- 0046. The client half of RC-029 narrows every date-scoped view to the
-- members who had joined by the date it is about. This is the half that keeps
-- the DATABASE from contradicting it: an attendance row dated before the day
-- she joined would sit in the register for a day her roster no longer shows
-- her on -- two answers to one question, which is what guardrail 1 exists to
-- prevent.
--
-- The rule under test, in one line: an attendance row is evidence, so the
-- joining date and the enrolment it belongs to move BACK to meet it, and
-- nothing here can ever move a date forward.
--
-- The three cases are named for the requester's own dates: a session BEFORE
-- she joined, ON the day she joined, and AFTER it.
--
-- WHY THE ROWS ARE INSERTED DIRECTLY rather than through a writer. Only ONE
-- writer can produce a pre-joining row today: commit_csv_import matches a
-- participant by alias or address and never looks at her joining date.
-- set_attendance (0035) refuses the same date outright -- "X was not enrolled
-- in a course on <date>" -- so it cannot be used to set the case up. Driving
-- commit_csv_import would mean staging a csv_imports row and a decisions
-- array, which tests that function's plumbing rather than this trigger. The
-- insert below is exactly the one commit_csv_import performs, minus the
-- plumbing.

begin;
  insert into auth.users (id) values ('eeeeeeee-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('eeeeeeee-1111-0000-0000-000000000001',
            'eeeeeeee-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158');

  insert into public.branches (name, code, city) values ('Coimbatore','CBE','Coimbatore');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Prenatal Flow','06:00','07:00',3),
           ('Postnatal Core','08:00','09:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00' from public.courses c, public.branches b;
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, current_date - 200, array[1,3,5]::smallint[] from public.course_offerings o;
commit;

-- Named so every assertion below reads in the requester's own terms. JOINED is
-- her joining date; BEFORE is the day before it, AFTER the day after. Dated
-- off current_date because create_member refuses nothing about the past and
-- the harness has no frozen clock.
create temporary view d as
  select (current_date - 30) as joined,
         (current_date - 31) as before,
         (current_date - 29) as after;
-- The blocks below run as `authenticated` and as `service_role`, and a temp
-- view is owned by the session user with no grants of its own -- so without
-- this every one of them fails on permission denied for d, which reads like a
-- broken assertion rather than a broken fixture.
grant select on d to public;

-- One member, joined on JOINED and enrolled in Prenatal Flow from the same
-- day -- which is what create_member does with p_joined_on (0026:
-- v_from := coalesce(p_joined_on, current_date)).
create or replace function pg_temp.a_member(p_name text)
returns void language plpgsql as $$
begin
  perform public.create_member(
    p_name,
    (select o.id from public.course_offerings o
       join public.courses c on c.id = o.course_id where c.name = 'Prenatal Flow'),
    (select joined from d),
    array[]::text[], array[]::text[], null);
end $$;

-- One completed session on a given date, for an attendance row to hang off.
create or replace function pg_temp.a_session(p_date date, p_course text default 'Prenatal Flow')
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.sessions (offering_id, session_date, status, source)
  select o.id, p_date, 'completed', 'import'
    from public.course_offerings o
    join public.courses c on c.id = o.course_id where c.name = p_course
  returning id into v_id;
  return v_id;
end $$;

-- The row commit_csv_import writes for somebody the file names: present, and
-- NOT expected, because expected_members_for_session cannot expect a member
-- whose enrolment has not begun. 'extra' is the status that pairs with
-- expected = false (0008's extra_is_not_expected).
create or replace function pg_temp.mark_present(p_name text, p_session uuid)
returns void language sql as $$
  insert into public.attendance_records
    (session_id, member_id, status, expected, minutes_in_call, raw_display_name, created_by)
  select p_session, m.id, 'extra', false, 45, 'From the file',
         'eeeeeeee-1111-0000-0000-000000000001'
    from public.members m where m.full_name = p_name;
$$;

-- ================================================= BEFORE the day she joined
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select pg_temp.a_member('Anitha Rajesh');
commit;

begin;
  set local role service_role;
  select pg_temp.mark_present('Anitha Rajesh', pg_temp.a_session((select before from d)));
commit;

select t.eq((select joined_on from public.members where full_name = 'Anitha Rajesh'),
            (select before from d),
  'a session the day BEFORE she joined moves her joining date back to that day');

select t.eq((select e.effective_from from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.full_name = 'Anitha Rajesh'),
            (select before from d),
  'and her enrolment starts there too -- expected_members_for_session reads the enrolment, so moving one without the other would leave the roster and the register still disagreeing');

-- The row itself is NOT rewritten. Expectation is a fact about what the academy
-- expected AT THE TIME, and back-dating her membership does not retroactively
-- make anybody expect her. 'extra' is never counted as a miss, so nothing
-- inflates.
select t.eq((select status from public.attendance_records ar
              join public.members m on m.id = ar.member_id
             where m.full_name = 'Anitha Rajesh'), 'extra',
  'the attendance row keeps the status the caller resolved');
select t.eq((select expected from public.attendance_records ar
              join public.members m on m.id = ar.member_id
             where m.full_name = 'Anitha Rajesh'), false,
  'and keeps its expectation -- the correction is to the membership, never to the register');

-- Visible, not silent: the audit trigger on members (0006) records the move
-- with both dates, so it reads on the audit screen as an ordinary member
-- update naming "Joined on". No second, hand-written entry is added.
select t.ok(exists (
    select 1 from public.audit_logs a
     where a.action = 'member.update'
       and a.changes @> jsonb_build_array(jsonb_build_object('field', 'joined_on'))),
  'the move is in the audit log as a member update, with the field named');

-- ==================================================== ON the day she joined
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select pg_temp.a_member('Divya Ramesh');
commit;

begin;
  set local role service_role;
  select pg_temp.mark_present('Divya Ramesh', pg_temp.a_session((select joined from d)));
commit;

select t.eq((select joined_on from public.members where full_name = 'Divya Ramesh'),
            (select joined from d),
  'a session ON her joining day changes nothing -- the boundary is inclusive, the same way expected_members_for_session reads session_date >= effective_from');

-- ================================================= AFTER the day she joined
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select pg_temp.a_member('Kavya Balaji');
commit;

begin;
  set local role service_role;
  select pg_temp.mark_present('Kavya Balaji', pg_temp.a_session((select after from d)));
commit;

select t.eq((select joined_on from public.members where full_name = 'Kavya Balaji'),
            (select joined from d),
  'a session AFTER she joined leaves her joining date alone');

select t.eq((select e.effective_from from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.full_name = 'Kavya Balaji'),
            (select joined from d),
  'THE ONE-WAY RULE: nothing here can move a date forward, so a late file can never shorten somebody''s membership');

-- ============================================ a member with no date on record
-- Null is "not recorded", which is not the same as a date that is wrong.
-- Filling it in from a file would be inventing a fact.
begin;
  set local role service_role;
  insert into public.members (full_name, joined_on, status, created_by)
    values ('Undated Member', null, 'active', 'eeeeeeee-1111-0000-0000-000000000001');
  insert into public.member_enrollments (member_id, offering_id, effective_from, created_by)
    select m.id, o.id, (select joined from d), 'eeeeeeee-1111-0000-0000-000000000001'
      from public.members m
      cross join public.course_offerings o
      join public.courses c on c.id = o.course_id
     where m.full_name = 'Undated Member' and c.name = 'Prenatal Flow';
  select pg_temp.mark_present('Undated Member', pg_temp.a_session((select before from d)));
commit;

select t.ok((select joined_on from public.members where full_name = 'Undated Member') is null,
  'a member with no joining date on record is left with none -- a file corrects a date, it does not invent one');

select t.eq((select e.effective_from from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.full_name = 'Undated Member'),
            (select before from d),
  'her ENROLMENT still moves back: that date is not missing, it is later than a session she is recorded at');

-- ===================================== the exclusion constraint is respected
-- member_enrollments carries `exclude using gist (member_id with =,
-- daterange(effective_from, effective_to, '[]') with &&)`: one offering at a
-- time. Stretching an enrolment back over days she spent in ANOTHER course
-- would violate it -- and a GiST index name reaching a person mid-import is
-- exactly the failure CP-003 exists to prevent (RC-023). So the move is
-- declined and the attendance row is still written.
begin;
  set local role service_role;
  insert into public.members (full_name, joined_on, status, created_by)
    values ('Moved Member', (select joined from d), 'active',
            'eeeeeeee-1111-0000-0000-000000000001');
  -- Postnatal Core until the day before she joined Prenatal Flow...
  insert into public.member_enrollments
    (member_id, offering_id, effective_from, effective_to, status, created_by)
    select m.id, o.id, (select joined from d) - 60, (select joined from d) - 1,
           'ended', 'eeeeeeee-1111-0000-0000-000000000001'
      from public.members m
      cross join public.course_offerings o
      join public.courses c on c.id = o.course_id
     where m.full_name = 'Moved Member' and c.name = 'Postnatal Core';
  -- ...then Prenatal Flow from her joining day.
  insert into public.member_enrollments (member_id, offering_id, effective_from, created_by)
    select m.id, o.id, (select joined from d), 'eeeeeeee-1111-0000-0000-000000000001'
      from public.members m
      cross join public.course_offerings o
      join public.courses c on c.id = o.course_id
     where m.full_name = 'Moved Member' and c.name = 'Prenatal Flow';
  -- A Prenatal Flow session dated INSIDE the Postnatal Core enrolment.
  select pg_temp.mark_present('Moved Member',
                              pg_temp.a_session((select joined from d) - 10));
commit;

select t.eq((select count(*)::int from public.attendance_records ar
              join public.members m on m.id = ar.member_id
             where m.full_name = 'Moved Member'), 1,
  'the attendance row is written even when the correction cannot be: the file is still evidence of what happened');

select t.eq((select e.effective_from from public.member_enrollments e
              join public.members m on m.id = e.member_id
              join public.course_offerings o on o.id = e.offering_id
              join public.courses c on c.id = o.course_id
             where m.full_name = 'Moved Member' and c.name = 'Prenatal Flow'),
            (select joined from d),
  'and the enrolment is left exactly where it was, because moving it would overlap the course she was actually in that day');

-- ========================================================= the RPC surface
-- 0025's standing rule, checked here as well as in 19_trigger_function_grants:
-- a trigger function is not an API.
select t.ok(not has_function_privilege('anon',
              'public.attendance_backdates_membership()', 'execute'),
  'anon cannot execute the trigger function');
select t.ok(not has_function_privilege('authenticated',
              'public.attendance_backdates_membership()', 'execute'),
  'authenticated cannot execute the trigger function');
