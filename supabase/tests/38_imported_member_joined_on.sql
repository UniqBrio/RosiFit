\echo 'create_member: the day she is dated is the day she is enrolled from, and a bulk import names neither'
--
-- 0049. RC-033: create_member stored the date it was PASSED and enrolled her
-- from the date it COMPUTED. `v_from := coalesce(p_joined_on, current_date)`
-- opened the enrolment, the schedule and the future-date refusal; the members
-- row got the raw `p_joined_on`. Identical for every caller that names a date
-- -- and the bulk import names none, the member file having had no Joined On
-- column since 0029, so an imported member was enrolled from today and dated
-- NULL.
--
-- WHY 22_bulk_import_members.sql did not catch it, in one line: it asserts
-- row 3 "joined the course it NAMED, from today" by reading
-- member_enrollments.effective_from -- the half that was always right. Nothing
-- read members.joined_on back. Every assertion below reads BOTH, and compares
-- them to each other, because the defect was never a wrong value: it was two
-- values for one fact.
--
-- The dates are relative to current_date. The harness has no frozen clock and
-- the whole claim is about what "today" means to the database, so a literal
-- would test the fixture instead of the rule.

begin;
  insert into auth.users (id) values ('d0000000-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('d0000000-1111-0000-0000-000000000001',
            'd0000000-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158');

  insert into public.branches (name, code, city) values ('Velachery','VEL','Chennai');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Yoga Flow','06:00','07:00',2);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00' from public.courses c, public.branches b;
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select id, current_date - 400, array[2,4]::smallint[] from public.course_offerings;
commit;

create temporary view yoga as
  select id from public.course_offerings limit 1;
grant select on yoga to public;

-- ==================================== a bulk import, exactly as the app sends
-- No 'joined_on' key at all -- not a blank one. That is what
-- src/data/repository.ts builds: the file has no such column, so the key is
-- absent and bulk_import_members reads it as null.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';
  create temp table run as
  select public.bulk_import_members(jsonb_build_array(
    jsonb_build_object('row', 2, 'full_name', 'Divya Balakrishnan',
                       'email', 'divya@example.com',
                       'aliases', jsonb_build_array('Divya B'))
  ), (select id from yoga), 'members.xlsx') as r;
commit;

select t.eq((select (r->>'inserted')::int from run), 1, 'she is imported');

select t.eq((select joined_on from public.members where full_name = 'Divya Balakrishnan'),
            current_date,
  'a member the bulk import created is dated the day of the upload -- this is the whole of RC-033: it was null');

select t.eq((select e.effective_from from public.member_enrollments e
               join public.members m on m.id = e.member_id
              where m.full_name = 'Divya Balakrishnan'),
            (select joined_on from public.members where full_name = 'Divya Balakrishnan'),
  'and her enrolment starts on the day her record says she joined -- one fact, one value, which is what having two of them cost');

-- The audit entry is the third place the same day is written down. It said
-- null while the two rows above said today.
select t.eq((select a.metadata->>'joined_on' from public.audit_logs a
              where a.action = 'member.created'
                and a.entity_id = (select id::text from public.members where full_name = 'Divya Balakrishnan')),
            current_date::text,
  'the audit entry reports the day that was written');

-- src/data/joined.ts reads a NULL as "paperwork is thin" and shows her on
-- every past date -- deliberately, and correctly, for the members imported
-- before this migration. What it must never do again is receive one from an
-- import that happened today.
select t.eq((select count(*)::int from public.members
              where full_name = 'Divya Balakrishnan' and joined_on is null), 0,
  'nothing imported today leaves the date column for the app to guess at');

-- ================================ a member added through the form, unchanged
-- The Add form opens on today and has always sent a date, so v_from and
-- p_joined_on are the same value and her row is byte-identical to the one 0026
-- wrote. Asserted because "the fix changes nothing for the form" is the claim
-- that lets 0049 be applied without re-testing every member screen.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';
  select public.create_member('Anitha Rajesh', (select id from yoga),
                              (current_date - 90)::date,
                              array[]::text[], array['anitha@example.com'], null);
commit;

select t.eq((select joined_on from public.members where full_name = 'Anitha Rajesh'),
            (current_date - 90)::date,
  'a named date is stored as it was named -- 0049 must not round anybody up to today');
select t.eq((select e.effective_from from public.member_enrollments e
               join public.members m on m.id = e.member_id
              where m.full_name = 'Anitha Rajesh'),
            (current_date - 90)::date,
  'and it is still the date her enrolment opens at');

-- ============================================================ the boundaries
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';
  select public.create_member('Later Lakshmi',
    (select id from public.course_offerings limit 1),
    (current_date + 1)::date, array[]::text[], array[]::text[], null)$$,
  'a joining date in the future is still refused, and on the value that gets stored',
  'future');
