\echo 'bulk import members: owner-only, one file, every row on its own'
--
-- The defect this covers: Bulk Import opened the ATTENDANCE importer because
-- no member importer existed. The reference (UniqBrio Bulk Student Import v1)
-- sets the rules: owner-only; one call per file; each row in its own
-- sub-transaction; a duplicate SKIPPED, never overwritten; the run recorded.

begin;
  insert into auth.users (id) values
    ('a0000000-0000-0000-0000-000000000001'),   -- the academy admin
    ('a0000000-0000-0000-0000-000000000002');   -- a staff member
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164) values
    ('a0000000-1111-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158'),
    ('a0000000-1111-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','staff','Aliya Staff','+919843155210');

  insert into public.branches (name, code, city) values ('Velachery','VEL','Chennai'), ('Anna Nagar','ANN','Chennai');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Yoga Flow','06:00','07:00',2), ('Prenatal Flow','07:00','08:00',3);
  -- Yoga Flow at Velachery only; Prenatal Flow at Anna Nagar only
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00' from public.courses c join public.branches b
      on (c.name='Yoga Flow' and b.name='Velachery') or (c.name='Prenatal Flow' and b.name='Anna Nagar');
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select id, '2026-01-01', array[2,4]::smallint[] from public.course_offerings;

  -- somebody already on the register, for the duplicate rule
  insert into public.members (full_name, joined_on, status) values ('Kavitha Ramesh', '2026-07-19', 'active');
commit;

-- ============================================================== the gate
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';
  select public.bulk_import_members('[{"row":2,"full_name":"Anitha Rajesh"}]'::jsonb,
    (select o.id from public.course_offerings o join public.courses c on c.id=o.course_id where c.name='Yoga Flow'), 'x.xlsx')$$,
  'staff may NOT bulk import -- owner-only, as the reference has it', 'only the academy admin');

select t.rejects($$
  set local role anon;
  select public.bulk_import_members('[]'::jsonb, null, null)$$,
  'anon may not call it at all', 'permission denied');

select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
  select public.bulk_import_members('[]'::jsonb, null, null)$$,
  'an empty file is refused, not "imported 0"', 'no rows');

-- ============================================================== one file
-- Six rows, six different fates. Judged together so the assertions below
-- prove they did not affect one another.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
  create temp table run as
  select public.bulk_import_members(jsonb_build_array(
    -- 2: clean, inherits the opened course
    jsonb_build_object('row', 2, 'full_name', 'Anitha Rajesh', 'email', 'anitha@example.com',
                       'aliases', jsonb_build_array('Anitha R'), 'joined_on', '2026-08-01'),
    -- 3: names its own course + branch, blank joining date -> today
    jsonb_build_object('row', 3, 'full_name', 'Divya Balakrishnan', 'course', 'prenatal flow', 'branch', 'Anna Nagar'),
    -- 4: already on the register -> SKIPPED, and Kavitha is not touched
    jsonb_build_object('row', 4, 'full_name', 'kavitha  ramesh', 'email', 'new@example.com'),
    -- 5: a course the academy does not run -> failed, named
    jsonb_build_object('row', 5, 'full_name', 'Meena Sundaram', 'course', 'Kickboxing'),
    -- 6: a display name row 2 already claimed -> create_member refuses THIS row only
    jsonb_build_object('row', 6, 'full_name', 'Priya Raghavan', 'aliases', jsonb_build_array('anitha r')),
    -- 7: a date that is not a date
    jsonb_build_object('row', 7, 'full_name', 'Shanthi Devi', 'joined_on', '01/09/2026')
  ), (select o.id from public.course_offerings o join public.courses c on c.id=o.course_id where c.name='Yoga Flow'),
     'members.xlsx') as r;
commit;

select t.eq((select (r->>'total')::int    from run), 6, 'six rows in');
select t.eq((select (r->>'inserted')::int from run), 2, 'two imported -- rows 2 and 3');
select t.eq((select (r->>'skipped')::int  from run), 1, 'one skipped -- she was already there');
select t.eq((select (r->>'failed')::int   from run), 3, 'three failed -- and each is named below');

select t.eq((select count(*)::int from public.members where full_name in ('Anitha Rajesh','Divya Balakrishnan')), 2,
  'the two clean rows are ON the register -- the failures around them cost them nothing');
select t.eq((select count(*)::int from public.members where full_name in ('Meena Sundaram','Priya Raghavan','Shanthi Devi')), 0,
  'the three failed rows wrote nothing');

-- the duplicate rule, both halves
select t.eq((select count(*)::int from public.members where name_normalized = 'kavitha ramesh'), 1,
  'a duplicate is SKIPPED -- not a second Kavitha');
select t.eq((select count(*)::int from public.member_emails e join public.members m on m.id=e.member_id
              where m.full_name='Kavitha Ramesh'), 0,
  'and never OVERWRITTEN -- the file''s address did not land on the existing member');

-- what each row was told
select t.eq((select v->>'status' from run, jsonb_array_elements(r->'rows') v where (v->>'row')::int = 4), 'skipped',
  'row 4 reads skipped');
select t.ok((select v->>'reason' from run, jsonb_array_elements(r->'rows') v where (v->>'row')::int = 5) like '%Kickboxing%',
  'row 5 names the course nobody runs');
select t.ok((select v->>'reason' from run, jsonb_array_elements(r->'rows') v where (v->>'row')::int = 6) like '%already belongs to another member%',
  'row 6 carries create_member''s own sentence about the display name');
select t.ok((select v->>'reason' from run, jsonb_array_elements(r->'rows') v where (v->>'row')::int = 7) like '%YYYY-MM-DD%',
  'row 7 says the date shape it wants');

-- the enrolment and the defaults
select t.ok(exists (select 1 from public.member_enrollments e join public.members m on m.id=e.member_id
             join public.course_offerings o on o.id=e.offering_id join public.courses c on c.id=o.course_id
             where m.full_name='Anitha Rajesh' and c.name='Yoga Flow' and e.effective_from='2026-08-01'),
  'row 2 joined the OPENED course, from the date it gave');
select t.ok(exists (select 1 from public.member_enrollments e join public.members m on m.id=e.member_id
             join public.course_offerings o on o.id=e.offering_id join public.courses c on c.id=o.course_id
             where m.full_name='Divya Balakrishnan' and c.name='Prenatal Flow' and e.effective_from=current_date),
  'row 3 joined the course it NAMED (case-insensitive), from today');
select t.ok((select e.is_primary from public.member_emails e join public.members m on m.id=e.member_id
              where m.full_name='Anitha Rajesh'),
  'the address from the file is her primary');

-- ============================================================== the run
select t.eq((select count(*)::int from public.member_import_runs), 1, 'the run is recorded once');
select t.eq((select inserted_count from public.member_import_runs), 2, 'with the counts the call returned');
select t.eq((select file_name from public.member_import_runs), 'members.xlsx', 'and the file it came from');
select t.eq((select jsonb_array_length(rows) from public.member_import_runs), 6,
  'every verdict is kept, so the error report can be rebuilt later');

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';
  select t.eq((select count(*)::int from public.member_import_runs), 0,
    'staff cannot read the runs -- owner-only, like the audit log');
rollback;

select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
  insert into public.member_import_runs (file_name) values ('forged.xlsx')$$,
  'nobody writes a run by hand -- there is no insert policy', 'row-level security');

select t.ok(exists (select 1 from public.audit_logs
             where action='member.bulk_imported' and actor_app_user_id='a0000000-1111-0000-0000-000000000001'),
  'the import is one audited ACT, attributed to the admin who did it');
select t.eq((select count(*)::int from public.audit_logs where action='member.created'), 2,
  'and each member she created is audited on her own, as create_member always does');

-- ============================================ the date shape (0029)
-- '01/09/2026'::date does NOT raise -- Postgres reads it under DateStyle and
-- returns a real date, just not the one she wrote. 0028 guarded the date with
-- a cast inside an exception block, so a mistyped date imported silently with
-- the WRONG DAY, and the day she joined decides every session she was ever
-- expected at. Found by the ADR 007 rehearsal against production; row 7 above
-- already asserted it, and this pins the two neighbouring cases so the shape
-- check cannot be relaxed back into a bare cast.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
  create temp table run2 as
  select public.bulk_import_members(jsonb_build_array(
    jsonb_build_object('row', 2, 'full_name', 'ZZ Shape Slash',  'joined_on', '01/09/2026'),
    jsonb_build_object('row', 3, 'full_name', 'ZZ Shape NoDay',  'joined_on', '2026-02-31'),
    jsonb_build_object('row', 4, 'full_name', 'ZZ Shape Future', 'joined_on', '2099-01-01'),
    jsonb_build_object('row', 5, 'full_name', 'ZZ Shape Good',   'joined_on', '2026-08-01')
  ), (select o.id from public.course_offerings o join public.courses c on c.id=o.course_id where c.name='Yoga Flow'),
     'shapes.xlsx') as r;
commit;

select t.eq((select (r->>'inserted')::int from run2), 1, 'only the well-formed date imported');
select t.eq((select (r->>'failed')::int from run2), 3, 'a slashed date, an impossible day and a future date all fail');
select t.ok((select v->>'reason' from run2, jsonb_array_elements(r->'rows') v where (v->>'row')::int = 2) like '%YYYY-MM-DD%',
  '01/09/2026 is REFUSED and names the shape it wants -- it must never be read as 9 January');
select t.ok((select v->>'reason' from run2, jsonb_array_elements(r->'rows') v where (v->>'row')::int = 3) like '%not a real date%',
  '2026-02-31 has the right shape and no such day');
select t.ok((select v->>'reason' from run2, jsonb_array_elements(r->'rows') v where (v->>'row')::int = 4) like '%future%',
  'a future joining date is create_member''s own refusal, carried through');
select t.eq((select joined_on from public.members where full_name = 'ZZ Shape Good'), '2026-08-01'::date,
  'and the one good date is stored exactly as written');
select t.eq((select count(*)::int from public.members where full_name in
              ('ZZ Shape Slash','ZZ Shape NoDay','ZZ Shape Future')), 0,
  'not one of the three refused rows wrote a member');
