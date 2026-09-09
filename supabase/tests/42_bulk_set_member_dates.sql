\echo 'bulk_set_member_dates: the register re-uploaded, and the boundary with the other importer'
--
-- 0058. "user downloads members list from reports and fills in the active from
-- and inactive from dates and reuploads", and then, on the shape of it: "let
-- there be another button as bulk import inactive dont allow it in bulk import
-- itslef let that be there only to upload member and create their record."
--
-- What these assert, in order:
--   * THE BOUNDARY: a name not on the register is refused, with the other
--     button named, and NOTHING is created. This is the whole reason there
--     are two functions.
--   * BLANK MEANS LEAVE IT ALONE, from the sides that could get it wrong --
--     the re-upload that must write nothing, and the row that moves one date
--     and must not wipe the other.
--   * the inference the file is named after: an inactive date with no status
--     beside it means inactive from that day.
--   * that every write goes through set_member_status (0045) and
--     set_member_active_from (0057), so the enrolment moves with the joining
--     date and the refusals are the ones the Edit form gets.
--   * the shape check (0029) on BOTH date columns.
--   * that one refused row does not roll back the rest.

begin;
  insert into auth.users (id) values ('ffffffff-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('ffffffff-1111-0000-0000-000000000001',
            'ffffffff-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871161');

  insert into public.branches (name, code, city) values ('Trichy','TRY','Trichy');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Prenatal Basics','08:00','09:00',6);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '08:00', '09:00'
      from public.courses c, public.branches b
     where c.name = 'Prenatal Basics' and b.code = 'TRY';
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, current_date - 400, array[1,2,3,4,5,6]::smallint[]
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
     where c.name = 'Prenatal Basics';
commit;

-- Three members, all dated by the upload -- the 0049 shape this exists to fix.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  select public.create_member(n.name,
           (select o.id from public.course_offerings o
              join public.courses c on c.id = o.course_id
             where c.name = 'Prenatal Basics'),
           null, array[]::text[], array[n.email]::text[], null)
    from (values ('Kavitha Raman','kavitha.r@gmail.com'),
                 ('Priya Selvam','priya.s@gmail.com'),
                 ('Latha Kumar','latha.k@gmail.com')) as n(name, email);
commit;

select t.eq((select count(*)::int from public.members where deleted_at is null), 3,
  'three members on the register -- the fixture is real');

-- ==================================================== THE BOUNDARY
-- A file naming somebody who is not here. The row is refused and, crucially,
-- the register does not grow.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  create temporary table probe(result jsonb) on commit drop;
  insert into probe
  select public.bulk_set_member_dates(
    jsonb_build_array(
      jsonb_build_object('row', 2, 'full_name', 'Nobody At All',
                         'active_from', '2026-01-01', 'inactive_from', null, 'status', null)),
    'members-report.xlsx');

  select t.eq((select (result->>'failed')::int from probe), 1,
    'a name that is not on the register fails');
  select t.eq((select (result->>'updated')::int from probe), 0,
    'and nothing is written for it');
  select t.ok((select result->'rows'->0->>'reason' from probe) like '%Bulk Import%',
    'the refusal names the OTHER importer -- the one that does create members');
commit;

select t.eq((select count(*)::int from public.members where deleted_at is null), 3,
  'THE BOUNDARY: this function never inserts, so the register is the same size');

-- ============================================ blank means leave it alone
-- The re-upload: every row states exactly what the register already says.
-- Nothing may be written, and it is not a failure.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  create temporary table same(result jsonb) on commit drop;
  insert into same
  select public.bulk_set_member_dates(
    jsonb_build_array(
      jsonb_build_object('row', 2, 'full_name', 'Kavitha Raman',
                         'active_from', null, 'inactive_from', null, 'status', 'Active'),
      jsonb_build_object('row', 3, 'full_name', 'Priya Selvam',
                         'active_from', null, 'inactive_from', null, 'status', null)),
    'members-report.xlsx');

  select t.eq((select (result->>'unchanged')::int from same), 2,
    'the same export sent twice writes nothing, and says so as UNCHANGED');
  select t.eq((select (result->>'updated')::int from same), 0, 'nothing updated');
  select t.eq((select (result->>'failed')::int from same), 0,
    'and it is not a failure -- the file agreeing with the register is the ordinary case');
commit;

-- ============================= the correction, through the 0057 write path
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  create temporary table fixed(result jsonb) on commit drop;
  insert into fixed
  select public.bulk_set_member_dates(
    jsonb_build_array(
      jsonb_build_object('row', 2, 'full_name', 'Kavitha Raman',
                         'active_from', (current_date - 90)::text,
                         'inactive_from', null, 'status', null)),
    'members-report.xlsx');
  select t.eq((select (result->>'updated')::int from fixed), 1, 'the joining date moves');
commit;

select t.eq((select joined_on from public.members where full_name = 'Kavitha Raman'),
  (current_date - 90)::date,
  'her record states the day she actually started');
select t.eq((select e.effective_from from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.full_name = 'Kavitha Raman'),
  (current_date - 90)::date,
  'AND her enrolment moved with it -- because this wrote through set_member_active_from (0057), '
  'not through an UPDATE of its own');

-- ================ an inactive date with no status means inactive from then
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  select public.bulk_set_member_dates(
    jsonb_build_array(
      jsonb_build_object('row', 3, 'full_name', 'Priya Selvam',
                         'active_from', null,
                         'inactive_from', (current_date + 30)::text, 'status', null)),
    'members-report.xlsx');
commit;

select t.eq((select status from public.members where full_name = 'Priya Selvam'), 'inactive',
  'the status is inferred from the date -- the only reading members_inactive_from_needs_status allows');
select t.eq((select inactive_from from public.members where full_name = 'Priya Selvam'),
  (current_date + 30)::date,
  'and the date is stored beside it');
-- The 0045 promise, inherited: she is still ACTIVE today, and still owed her
-- follow-ups, because the date has not arrived.
select t.eq(public.member_status_on('inactive', (current_date + 30)::date, current_date), 'active',
  'she is on the register until the day itself -- a bulk file cannot short-circuit that');

-- ============ moving the joining date must not wipe the leaving date
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  select public.bulk_set_member_dates(
    jsonb_build_array(
      jsonb_build_object('row', 3, 'full_name', 'Priya Selvam',
                         'active_from', (current_date - 200)::text,
                         'inactive_from', null, 'status', null)),
    'members-report.xlsx');
commit;

select t.eq((select inactive_from from public.members where full_name = 'Priya Selvam'),
  (current_date + 30)::date,
  'THE ERASER CASE: a blank leaving-date cell left hers exactly as it was');
select t.eq((select joined_on from public.members where full_name = 'Priya Selvam'),
  (current_date - 200)::date,
  'while the column the row DID carry moved');
select t.eq((select status from public.members where full_name = 'Priya Selvam'), 'inactive',
  'and her status was not reset on the way past either');

-- ================================================= the shape check (0029)
-- '01/09/2026' IS a date to Postgres, read under DateStyle, and on this
-- project that is MDY. Both columns, not one.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  create temporary table shaped(result jsonb) on commit drop;
  insert into shaped
  select public.bulk_set_member_dates(
    jsonb_build_array(
      jsonb_build_object('row', 2, 'full_name', 'Latha Kumar',
                         'active_from', '01/09/2026', 'inactive_from', null, 'status', null),
      jsonb_build_object('row', 3, 'full_name', 'Latha Kumar',
                         'active_from', null, 'inactive_from', '1 October 2026', 'status', null)),
    'members-report.xlsx');
  select t.eq((select (result->>'failed')::int from shaped), 2,
    'a British or Indian date is refused on BOTH columns, rather than read as 9 January');
commit;

select t.eq((select joined_on from public.members where full_name = 'Latha Kumar'), current_date,
  'and her record was not touched by either refused row');

-- ====================================== one bad row does not sink the file
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  create temporary table mixed(result jsonb) on commit drop;
  insert into mixed
  select public.bulk_set_member_dates(
    jsonb_build_array(
      jsonb_build_object('row', 2, 'full_name', 'Latha Kumar',
                         'active_from', (current_date - 10)::text,
                         'inactive_from', null, 'status', null),
      jsonb_build_object('row', 3, 'full_name', 'Nobody At All',
                         'active_from', (current_date - 10)::text,
                         'inactive_from', null, 'status', null),
      jsonb_build_object('row', 4, 'full_name', 'Kavitha Raman',
                         'active_from', null, 'inactive_from', null, 'status', 'Bananas')),
    'members-report.xlsx');
  select t.eq((select (result->>'updated')::int from mixed), 1, 'the good row landed');
  select t.eq((select (result->>'failed')::int from mixed), 2, 'the two bad ones did not');
commit;

select t.eq((select joined_on from public.members where full_name = 'Latha Kumar'),
  (current_date - 10)::date,
  'ROW BY ROW: the row that was fine is on the register, though two others in the same call failed');

-- ============================================================ the gate
begin;
  set local role anon;
  select t.rejects($q$select public.bulk_set_member_dates(
                        jsonb_build_array(jsonb_build_object('row', 2, 'full_name', 'Latha Kumar')),
                        'x.xlsx')$q$,
    'an unsigned-in caller is refused -- the table predicate, restated');
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  select t.rejects($q$select public.bulk_set_member_dates('[]'::jsonb, 'x.xlsx')$q$,
    'an empty file is refused as a file, not answered with a row of zeroes');
rollback;
