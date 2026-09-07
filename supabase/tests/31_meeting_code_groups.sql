\echo 'meeting groups: N meetings a day, each file touches only its own people'
--
-- 0039. A course runs N meetings a day, each with its own members and its own
-- Google Meet code, and one file is uploaded as each meeting ends.
--
-- Before this migration every one of those files landed on the SAME session
-- row, and since 0037 made a second file a full override, the second file
-- reverted the first meeting's members to `absent`. Six files left only the
-- sixth meeting's members present.
--
-- The four rules asserted here are the requester's, in her order:
--   1. any number of files, different codes, same course, same day
--   2. a file updates ONLY the people it names -- the other meetings are
--      untouched
--   3. the register is overridden only on the same code AND the same date
--   4. the same code on a later date is that date's register
-- and the fifth, which is the one this must not break:
--   5. a member's count is DAYS attended, never meetings attended.

begin;
insert into auth.users (id) values ('ffffffff-0000-0000-0000-000000000001');
insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
  values ('ffffffff-1111-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000001',
          'super_admin','Groups Owner','+919994871777');
insert into public.branches (name, code) values ('Velachery','VLC');
insert into public.courses (name) values ('Postnatal Groups');
insert into public.course_offerings (course_id, branch_id, start_time, end_time)
  select c.id, b.id, '07:00','08:00' from public.courses c, public.branches b
   where c.name = 'Postnatal Groups';

-- Six members, all enrolled on the COURSE -- which is where every member the
-- app adds lands, because the pickers only ever show the course's own
-- offering. Which meeting each attends is not known here; it arrives with the
-- files.
insert into public.members (full_name) values
  ('Asha Group'), ('Bhavani Group'), ('Chitra Group'),
  ('Divya Group'), ('Esha Group'), ('Fatima Group');
insert into public.member_aliases (member_id, alias_type, alias_display, confirmed_by)
  select id, 'name', full_name, 'ffffffff-1111-0000-0000-000000000001'
    from public.members where full_name like '% Group';
insert into public.member_enrollments (member_id, offering_id, effective_from)
  select m.id, o.id, '2026-08-01'
    from public.members m, public.course_offerings o
    join public.courses c on c.id = o.course_id
   where m.full_name like '% Group' and c.name = 'Postnatal Groups';
commit;

-- ===================================================== the resolver, on its own
begin;
set local role service_role;

-- A FILE WITH NO MEETING CODE lands on the course itself, exactly where every
-- file landed before 0039. This is the whole of a single-meeting course's
-- experience of this migration.
select t.eq(
  public.offering_for_meeting(
    (select id from public.courses  where name = 'Postnatal Groups'),
    (select id from public.branches where code = 'VLC'), null, null),
  (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
    where c.name = 'Postnatal Groups' and o.meet_code is null),
  'a file with no meeting code resolves to the course''s own offering');

-- A code never seen before creates its group, silently and on first sight.
select t.ok(
  public.offering_for_meeting(
    (select id from public.courses  where name = 'Postnatal Groups'),
    (select id from public.branches where code = 'VLC'), 'aaa-bbbb-ccc', null) is not null,
  'an unseen meeting code creates its group');

-- And the SECOND sight of the same code returns the same group rather than a
-- rival one -- which is rule 3's foundation: same code, same register.
select t.eq(
  (select count(*)::int from public.course_offerings where meet_code = 'aaa-bbbb-ccc'),
  1, 'the same meeting code is one group, not two');
commit;

-- A code already bound to ANOTHER course is refused rather than moving that
-- meeting's members into this one. Name matching is academy-wide, so this is
-- what an upload against the wrong course looks like, and it is the one thing
-- silent auto-creation must not do.
begin;
insert into public.courses (name) values ('Prenatal Groups');
insert into public.course_offerings (course_id, branch_id)
  select c.id, b.id from public.courses c, public.branches b
   where c.name = 'Prenatal Groups' and b.code = 'VLC';
commit;

begin;
set local role service_role;
select t.rejects(
  $$select public.offering_for_meeting(
      (select id from public.courses  where name = 'Prenatal Groups'),
      (select id from public.branches where code = 'VLC'), 'aaa-bbbb-ccc', null)$$,
  'a meeting code bound to another course is refused, not stolen',
  'already belongs to another course');
commit;

-- ================================================== RULE 1 and RULE 2, the day
-- Two meetings, same course, same day, different codes. File A names three
-- members; file B names the other three.
begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, meeting_code, row_count, status, summary, uploaded_by)
select 'meet_A_01-09.csv', 'sha-grp-a', o.id, '2026-09-01', 'aaa-bbbb-ccc', 3, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'matched', 'raw_name', 'Asha Group', 'minutes', 55,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Asha Group')))),
    jsonb_build_object('row', 2, 'kind', 'matched', 'raw_name', 'Bhavani Group', 'minutes', 52,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Bhavani Group')))),
    jsonb_build_object('row', 3, 'kind', 'matched', 'raw_name', 'Chitra Group', 'minutes', 48,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Chitra Group'))))
  )),
  'ffffffff-1111-0000-0000-000000000001'
  from public.course_offerings o where o.meet_code = 'aaa-bbbb-ccc';
commit;

begin;
set local role service_role;
-- Three members were on the COURSE and are now in the group: the file is the
-- group's roster.
select t.eq(((public.commit_csv_import(
    (select id from public.csv_imports where file_sha256 = 'sha-grp-a'),
    'ffffffff-1111-0000-0000-000000000001', '[]'::jsonb))->'placement'->>'moved')::int, 3,
  'the file names three members and moves all three into its group');
commit;

-- Nobody was left behind on the course by that move, and nobody ended up in
-- two places at once -- the exclusion constraint would have refused, so this
-- asserts the closing of the old enrolment actually happened.
select t.eq(
  (select count(*)::int from public.member_enrollments e
     join public.course_offerings o on o.id = e.offering_id
    where o.meet_code = 'aaa-bbbb-ccc' and e.effective_to is null),
  3, 'the three moved members hold exactly one live enrolment each, on the group');

begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, meeting_code, row_count, status, summary, uploaded_by)
select 'meet_B_01-09.csv', 'sha-grp-b',
       public.offering_for_meeting(
         (select id from public.courses  where name = 'Postnatal Groups'),
         (select id from public.branches where code = 'VLC'), 'ddd-eeee-fff', null),
       '2026-09-01', 'ddd-eeee-fff', 3, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'matched', 'raw_name', 'Divya Group', 'minutes', 50,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Divya Group')))),
    jsonb_build_object('row', 2, 'kind', 'matched', 'raw_name', 'Esha Group', 'minutes', 47,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Esha Group')))),
    jsonb_build_object('row', 3, 'kind', 'matched', 'raw_name', 'Fatima Group', 'minutes', 44,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Fatima Group'))))
  )),
  'ffffffff-1111-0000-0000-000000000001';
commit;

begin;
set local role service_role;
select public.commit_csv_import(
  (select id from public.csv_imports where file_sha256 = 'sha-grp-b'),
  'ffffffff-1111-0000-0000-000000000001', '[]'::jsonb);
commit;

-- RULE 1: two meetings on one day are two registers, not one overwritten twice.
select t.eq(
  (select count(*)::int from public.sessions s
     join public.course_offerings o on o.id = s.offering_id
     join public.courses c on c.id = o.course_id
    where c.name = 'Postnatal Groups' and s.session_date = '2026-09-01'
      and s.deleted_at is null),
  2, 'two meetings on one day are two sessions');

-- RULE 2, AND THE WHOLE POINT. Before 0039 this was 'absent': the second file
-- of the day reverted everybody the first one marked.
select t.eq(
  (select a.status from public.attendance_records a
     join public.sessions s on s.id = a.session_id
    where s.session_date = '2026-09-01' and a.deleted_at is null
      and a.member_id = (select id from public.members where full_name = 'Asha Group')),
  'present', 'the second meeting''s file does not touch the first meeting''s members');

-- ...and not by accident of ordering: she has no row in the other meeting's
-- register at all, because she was never due at it.
select t.eq(
  (select count(*)::int from public.attendance_records a
     join public.sessions s on s.id = a.session_id
     join public.course_offerings o on o.id = s.offering_id
    where o.meet_code = 'ddd-eeee-fff'
      and a.member_id = (select id from public.members where full_name = 'Asha Group')),
  0, 'a member of one meeting is not on another meeting''s register');

-- Each register counts only its own three.
select t.eq(
  (select s.expected_count from public.sessions s
     join public.course_offerings o on o.id = s.offering_id
    where o.meet_code = 'aaa-bbbb-ccc' and s.session_date = '2026-09-01'),
  3, 'a meeting expects its own members and nobody else''s');

-- ============================================ RULE 3, the override is confined
-- A second file for the SAME code and the SAME date -- a corrected export.
-- 0037's override must still reach inside this meeting, and must not reach
-- outside it.
begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, meeting_code, row_count, status, summary, uploaded_by)
select 'meet_A_01-09_corrected.csv', 'sha-grp-a2', o.id, '2026-09-01', 'aaa-bbbb-ccc', 1, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'matched', 'raw_name', 'Asha Group', 'minutes', 55,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Asha Group'))))
  )),
  'ffffffff-1111-0000-0000-000000000001'
  from public.course_offerings o where o.meet_code = 'aaa-bbbb-ccc';
commit;

begin;
set local role service_role;
select t.eq(((public.commit_csv_import(
    (select id from public.csv_imports where file_sha256 = 'sha-grp-a2'),
    'ffffffff-1111-0000-0000-000000000001', '[]'::jsonb))->'overridden'->>'reverted')::int, 2,
  'a corrected file for the same code and date reverts the two it no longer names');
commit;

-- INSIDE the meeting: reverted, as 0037 promises.
select t.eq(
  (select a.status from public.attendance_records a
     join public.sessions s on s.id = a.session_id
     join public.course_offerings o on o.id = s.offering_id
    where o.meet_code = 'aaa-bbbb-ccc' and s.session_date = '2026-09-01'
      and a.deleted_at is null
      and a.member_id = (select id from public.members where full_name = 'Bhavani Group')),
  'absent', 'the override still reaches inside the meeting it belongs to');

-- OUTSIDE it: untouched. This is the assertion that says the override is
-- scoped by meeting code and not merely by day.
select t.eq(
  (select a.status from public.attendance_records a
     join public.sessions s on s.id = a.session_id
     join public.course_offerings o on o.id = s.offering_id
    where o.meet_code = 'ddd-eeee-fff' and s.session_date = '2026-09-01'
      and a.deleted_at is null
      and a.member_id = (select id from public.members where full_name = 'Divya Group')),
  'present', 'the override does not reach the other meeting on the same day');

-- ================================== RULE 4, the same code on a different date
begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, meeting_code, row_count, status, summary, uploaded_by)
select 'meet_A_02-09.csv', 'sha-grp-a3', o.id, '2026-09-02', 'aaa-bbbb-ccc', 1, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'matched', 'raw_name', 'Bhavani Group', 'minutes', 51,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Bhavani Group'))))
  )),
  'ffffffff-1111-0000-0000-000000000001'
  from public.course_offerings o where o.meet_code = 'aaa-bbbb-ccc';
commit;

begin;
set local role service_role;
-- It overrides NOTHING: a recurring link on a new day is a new register, not
-- a correction of the old one.
select t.eq(((public.commit_csv_import(
    (select id from public.csv_imports where file_sha256 = 'sha-grp-a3'),
    'ffffffff-1111-0000-0000-000000000001', '[]'::jsonb))->'overridden'->>'reverted')::int, 0,
  'the same meeting code on a new date overrides nothing');
commit;

select t.eq(
  (select count(*)::int from public.sessions s
     join public.course_offerings o on o.id = s.offering_id
    where o.meet_code = 'aaa-bbbb-ccc' and s.deleted_at is null),
  2, 'one meeting code over two dates is two registers');

-- The first date's register is still what it was.
select t.eq(
  (select a.status from public.attendance_records a
     join public.sessions s on s.id = a.session_id
     join public.course_offerings o on o.id = s.offering_id
    where o.meet_code = 'aaa-bbbb-ccc' and s.session_date = '2026-09-01'
      and a.deleted_at is null
      and a.member_id = (select id from public.members where full_name = 'Asha Group')),
  'present', 'a later date does not rewrite an earlier one');

-- =========================================== RULE 5, the counting rule itself
-- "7 days, attended 6, the count is 6 -- IRRESPECTIVE of how many meetings in
-- each day." Its own course, so nothing above can flatter it.
--
-- Seven days. Two meetings run on every one of them. The member sits in one
-- of the two, and her count must be seven expected and six attended -- not
-- fourteen, and not seven with the other meeting's day counted against her.
begin;
insert into public.courses (name) values ('Counting Course');
insert into public.course_offerings (course_id, branch_id)
  select c.id, b.id from public.courses c, public.branches b
   where c.name = 'Counting Course' and b.code = 'VLC';
insert into public.members (full_name) values ('Gita Count'), ('Hema Count');
insert into public.member_enrollments (member_id, offering_id, effective_from)
  select m.id, o.id, '2026-09-01'
    from public.members m, public.course_offerings o
    join public.courses c on c.id = o.course_id
   where m.full_name in ('Gita Count','Hema Count') and c.name = 'Counting Course';
commit;

begin;
set local role service_role;
-- Two meeting groups, and one member moved into each.
select public.offering_for_meeting(
  (select id from public.courses where name = 'Counting Course'),
  (select id from public.branches where code = 'VLC'), 'cnt-aaaa-001', null);
select public.offering_for_meeting(
  (select id from public.courses where name = 'Counting Course'),
  (select id from public.branches where code = 'VLC'), 'cnt-bbbb-002', null);
select public.place_member_in_group(
  (select id from public.members where full_name = 'Gita Count'),
  (select id from public.course_offerings where meet_code = 'cnt-aaaa-001'),
  '2026-09-01', null);
select public.place_member_in_group(
  (select id from public.members where full_name = 'Hema Count'),
  (select id from public.course_offerings where meet_code = 'cnt-bbbb-002'),
  '2026-09-01', null);
commit;

begin;
-- Seven days, both meetings running on each of them.
insert into public.sessions (offering_id, session_date, status, completed_at, expectation_mode)
select o.id, d::date, 'completed', now(), 'all_enrolled'
  from public.course_offerings o,
       generate_series('2026-09-01'::date, '2026-09-07'::date, interval '1 day') d
 where o.meet_code in ('cnt-aaaa-001','cnt-bbbb-002');

-- Gita attended six of her seven and missed the 4th.
insert into public.attendance_records (session_id, member_id, status, expected)
select s.id, (select id from public.members where full_name = 'Gita Count'),
       case when s.session_date = '2026-09-04' then 'absent' else 'present' end, true
  from public.sessions s join public.course_offerings o on o.id = s.offering_id
 where o.meet_code = 'cnt-aaaa-001';

-- Hema attended all seven of HERS, on the very same seven days.
insert into public.attendance_records (session_id, member_id, status, expected)
select s.id, (select id from public.members where full_name = 'Hema Count'), 'present', true
  from public.sessions s join public.course_offerings o on o.id = s.offering_id
 where o.meet_code = 'cnt-bbbb-002';
commit;

select t.eq(
  (select expected from public.member_period_metrics('2026-09-01','2026-09-07',
     (select id from public.members where full_name = 'Gita Count'))),
  7, 'seven days of classes is seven expected, not fourteen');

select t.eq(
  (select attended from public.member_period_metrics('2026-09-01','2026-09-07',
     (select id from public.members where full_name = 'Gita Count'))),
  6, 'she attended six, so the count is six -- irrespective of the meetings a day');

-- ============================================ the guards on the other writers
-- save_course resolves "the offering for this course at this branch". With a
-- group present it could pick the GROUP and write the course's schedule onto
-- it, which would drop every member of the real course to zero expected
-- sessions. It must return the course's own offering, every time.
begin;
  -- As the form calls it: an authenticated super admin, never the service
  -- role -- save_course checks is_super_admin() inside itself.
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  select t.eq(
    (public.save_course('Postnatal Groups',
      (select id from public.branches where code = 'VLC'),
      array[1,3,5]::smallint[], 'week', 'support@getfit.rosifit.com',
      (select id from public.email_templates where is_default),
      null, null,
      (select id from public.courses where name = 'Postnatal Groups'), 4)->>'offering_id')::uuid,
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Postnatal Groups' and o.meet_code is null),
    'save_course picks the course''s own offering, never one of its meeting groups');
commit;

-- The schedule landed on the course, not on a group -- the consequence the
-- assertion above exists to prevent, stated in its own right.
select t.eq(
  (select count(*)::int from public.offering_schedules os
     join public.course_offerings o on o.id = os.offering_id
    where o.meet_code is not null),
  0, 'no meeting group carries a schedule');

-- A member enrolled in a DIFFERENT COURSE is never moved by a file. This is
-- what an upload against the wrong course looks like, and silent
-- auto-creation is only safe because of it.
begin;
set local role service_role;
select t.eq(
  public.place_member_in_group(
    (select id from public.members where full_name = 'Gita Count'),
    (select id from public.course_offerings where meet_code = 'aaa-bbbb-ccc'),
    '2026-09-08', null),
  'other_course', 'a member of another course is reported, never moved');
commit;

select t.eq(
  (select c.name from public.member_enrollments e
     join public.course_offerings o on o.id = e.offering_id
     join public.courses c on c.id = o.course_id
    where e.member_id = (select id from public.members where full_name = 'Gita Count')
      and e.effective_to is null),
  'Counting Course', 'and she is still in the course she was actually in');

-- The course's own offering is unique, so "the parent" is never ambiguous --
-- which is what every resolver above relies on when it asks for the row with
-- no meet_code.
--
-- A DIFFERENT batch_label deliberately: offerings_unique_live (0005) is on
-- (course, branch, batch_label) and would let this through, so this asserts
-- the NEW index and not the old one. Matching on the index name is what stops
-- it passing because some other constraint happened to fire.
select t.rejects(
  $$insert into public.course_offerings (course_id, branch_id, batch_label)
    select c.id, b.id, 'a second parent' from public.courses c, public.branches b
     where c.name = 'Postnatal Groups' and b.code = 'VLC'$$,
  'a course cannot have two of its own offerings at one branch',
  'offerings_parent_live');
