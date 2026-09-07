\echo 'delete_course (0047): the course and every row it owns leave the database'
--
-- 14_delete_course.sql pinned the OPPOSITE promise -- "the history stays" --
-- and was right to, for as long as that was the promise. The repo owner
-- withdrew it on 08-Sep-2026 (requests/2026-09-08-hard-delete-course.md) after
-- being shown, in the live data, exactly what a hard delete destroys. 14 is
-- amended to match; this file is the new contract in full.
--
-- THE ASSERTION THAT MATTERS MOST IS THE ORDER, and it is not obvious from
-- reading the function. attendance_records cascades from sessions, but
-- csv_imports must be deleted BEFORE sessions and attendance_records.import_id
-- points AT csv_imports -- so an implementation that leaned on the cascade
-- fails at the import delete. It fails only when a course has actually had
-- attendance IMPORTED into it, which is why the fixture below imports rather
-- than merely marking: a spec that inserted attendance by hand would pass
-- against the broken order and prove nothing.

begin;
  insert into auth.users (id) values
    ('dddddddd-0000-0000-0000-000000000001'),
    ('dddddddd-0000-0000-0000-000000000002');
  insert into public.app_users (auth_user_id, kind, name, phone_e164) values
    ('dddddddd-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871101'),
    ('dddddddd-0000-0000-0000-000000000002','staff','Nandhini R','+919940633802');
  insert into public.branches (name, code, city) values ('Velachery','VEL','Chennai');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Purged Course','06:00','07:00',3), ('Neighbour Course','07:00','08:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00','07:00' from public.courses c, public.branches b;

  -- TWO members, and the second one is the whole point of the neighbour
  -- course: she is in both, so this deletion must take exactly half of her
  -- history and leave the other half standing.
  insert into public.members (member_code, full_name) values
    ('RF-000950','Purged Only Member'),
    ('RF-000951','Both Courses Member');
  insert into public.member_enrollments (member_id, offering_id, effective_from)
    select m.id, o.id, '2026-08-01'
      from public.members m, public.course_offerings o
      join public.courses c on c.id = o.course_id
     where m.member_code in ('RF-000950','RF-000951') and c.name = 'Purged Course';
  insert into public.member_enrollments (member_id, offering_id, effective_from)
    select m.id, o.id, '2026-08-01'
      from public.members m, public.course_offerings o
      join public.courses c on c.id = o.course_id
     where m.member_code = 'RF-000951' and c.name = 'Neighbour Course';

  -- A course with real history: one completed day and one still to come.
  insert into public.sessions (offering_id, session_date, status, completed_at)
    select o.id, '2026-08-10', 'completed', now()
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Purged Course';
  insert into public.sessions (offering_id, session_date, status)
    select o.id, '2026-12-10', 'scheduled'
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Purged Course';
  insert into public.sessions (offering_id, session_date, status, completed_at)
    select o.id, '2026-08-11', 'completed', now()
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Neighbour Course';

  -- The frozen expected set, which is what the reports read.
  insert into public.session_expectations (session_id, member_id, schedule_source)
    select s.id, m.id, 'offering'
      from public.sessions s
      join public.course_offerings o on o.id = s.offering_id
      join public.courses c on c.id = o.course_id,
           public.members m
     where c.name = 'Purged Course' and s.status = 'completed'
       and m.member_code in ('RF-000950','RF-000951');

  -- AN IMPORT, not a hand-written row. csv_imports is what pins the file
  -- fingerprint, and attendance_records.import_id is the foreign key that
  -- dictates the delete order.
  insert into public.csv_imports
    (file_name, file_sha256, offering_id, session_id, session_date,
     row_count, matched_count, unmatched_count, ambiguous_count, possible_count,
     missing_email_count, processed_count, duplicates_in_file, status,
     summary, decisions, completed_at)
    select 'meet_purged_20260810.csv', repeat('a', 64), o.id, s.id, '2026-08-10',
           2, 2, 0, 0, 0, 0, 2, 0, 'completed', '{}'::jsonb, '[]'::jsonb, now()
      from public.sessions s
      join public.course_offerings o on o.id = s.offering_id
      join public.courses c on c.id = o.course_id
     where c.name = 'Purged Course' and s.status = 'completed';

  insert into public.attendance_records (session_id, member_id, status, expected, import_id)
    select s.id, m.id, 'present', true, i.id
      from public.sessions s
      join public.course_offerings o on o.id = s.offering_id
      join public.courses c on c.id = o.course_id
      join public.csv_imports i on i.session_id = s.id,
           public.members m
     where c.name = 'Purged Course' and s.status = 'completed'
       and m.member_code in ('RF-000950','RF-000951');

  -- Her other course's attendance, which must survive intact.
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'present', true
      from public.sessions s
      join public.course_offerings o on o.id = s.offering_id
      join public.courses c on c.id = o.course_id,
           public.members m
     where c.name = 'Neighbour Course' and s.status = 'completed'
       and m.member_code = 'RF-000951';

  -- A member-import run pointing at the doomed offering. It is its own audit
  -- trail and must outlive the course.
  insert into public.member_import_runs (default_offering_id)
    select o.id from public.course_offerings o
      join public.courses c on c.id = o.course_id
     where c.name = 'Purged Course';

  perform public.recompute_member_stats();
commit;

-- ------------------------------------------------------------- the preview
-- The confirmation dialog can promise nothing now, so it states a quantity
-- instead, and these are the numbers it states.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';

  select t.eq((public.course_deletion_preview(
      (select id from public.courses where name='Purged Course'))->>'attendance_records')::int,
    2, 'the preview counts every attendance record the deletion will destroy');
  select t.eq((public.course_deletion_preview(
      (select id from public.courses where name='Purged Course'))->>'sessions_completed')::int,
    1, 'and how many of its sessions actually happened');
  -- PEOPLE, not enrolments. The one sentence anybody reads before confirming
  -- must not double-count a member enrolled at two branches.
  select t.eq((public.course_deletion_preview(
      (select id from public.courses where name='Purged Course'))->>'members_enrolled')::int,
    2, 'and the distinct members who lose their history');
  select t.eq((public.course_deletion_preview(
      (select id from public.courses where name='Purged Course'))->>'imports')::int,
    1, 'and the import records that go with it');
commit;

select t.eq((select count(*)::int from public.attendance_records), 3,
  'and the preview wrote nothing -- it is a read');

-- ------------------------------------------------------------ the deletion
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000002';

  -- STAFF, deliberately. The owner moved delete_course to is_active_app_user()
  -- on 07-Sep-2026 (0038) and 0047 keeps that boundary rather than restating
  -- 0020's is_super_admin(), which would revert a decision it was never asked
  -- to revisit.
  select t.eq((public.delete_course(
      (select id from public.courses where name='Purged Course'))->>'attendance_removed')::int,
    2, 'a staff account deletes the course, and its attendance records go with it');
commit;

-- --------------------------------------------------------- nothing is left
select t.eq((select count(*)::int from public.courses where name='Purged Course'), 0,
  'the course row is GONE from the table, not flagged');

select t.eq((select count(*)::int from public.course_offerings o
              left join public.courses c on c.id = o.course_id
             where c.id is null), 0,
  'no offering is left pointing at a course that no longer exists');

select t.eq((select count(*)::int from public.sessions s
              left join public.course_offerings o on o.id = s.offering_id
             where o.id is null), 0,
  'and no session is left pointing at an offering that no longer exists -- the orphaned register this change exists to stop making');

select t.eq((select count(*)::int from public.session_expectations e
              left join public.sessions s on s.id = e.session_id
             where s.id is null), 0,
  'the frozen expected set goes with its session');

-- THE ONE THE FOREIGN KEYS DICTATE. If the function leaned on the cascade
-- from sessions, it would have failed at this delete rather than reaching it.
select t.eq((select count(*)::int from public.csv_imports), 0,
  'the import record is gone, which is what frees the file fingerprint for a fresh import');

select t.eq((select count(*)::int from public.member_enrollments e
              join public.course_offerings o on o.id = e.offering_id
              join public.courses c on c.id = o.course_id
             where c.name = 'Purged Course'), 0,
  'the enrolments are deleted, not ended -- there is no history left for them to protect');

-- ---------------------------------------------------------- what survives
select t.eq((select count(*)::int from public.members where member_code in ('RF-000950','RF-000951')), 2,
  'both MEMBERS survive -- they were enrolled, not owned');

select t.eq((select count(*)::int from public.attendance_records a
              join public.members m on m.id = a.member_id
             where m.member_code = 'RF-000951'), 1,
  'the member in two courses keeps the other course''s attendance, and only that');

select t.eq((select count(*)::int from public.courses where name='Neighbour Course'), 1,
  'the neighbouring course is untouched');
select t.eq((select count(*)::int from public.sessions s
              join public.course_offerings o on o.id = s.offering_id
              join public.courses c on c.id = o.course_id
             where c.name='Neighbour Course'), 1,
  'and so is its session');

select t.eq((select count(*)::int from public.member_import_runs), 1,
  'the member-import run outlives the course -- it is its own audit trail');
select t.ok((select default_offering_id from public.member_import_runs) is null,
  'and its pointer at the deleted offering is nulled rather than dangling');

-- ------------------------------------------------------------- the cache
-- member_stats is what the follow-up list is derived from. Left stale, the
-- academy goes on emailing members about sessions that no longer exist.
select t.eq((select sessions_attended from public.member_stats ms
              join public.members m on m.id = ms.member_id
             where m.member_code = 'RF-000950'), 0,
  'the member who was only in the deleted course is recomputed to nothing');
select t.eq((select sessions_attended from public.member_stats ms
              join public.members m on m.id = ms.member_id
             where m.member_code = 'RF-000951'), 1,
  'and the member in both is recomputed to what her surviving course says -- not left at 2');

-- --------------------------------------------------------------- the log
-- audit_courses and audit_offerings fire on insert or update only, so a DELETE
-- audits nothing by itself. Without the explicit entry, the most destructive
-- operation in the product would be the only one leaving no trace.
select t.eq((select count(*)::int from public.audit_logs
             where action = 'course.hard_deleted'), 1,
  'the deletion writes its own audit entry');
select t.eq((select (metadata->>'attendance_records')::int from public.audit_logs
             where action = 'course.hard_deleted'), 2,
  'and the entry records how much it destroyed, since nothing else survives to say so');
select t.eq((select metadata->>'name' from public.audit_logs
             where action = 'course.hard_deleted'), 'Purged Course',
  'and names the course, which no longer exists anywhere else');

-- ---------------------------------------------------------- idempotent
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select t.ok(
    (public.delete_course((select id from public.courses where name='Purged Course'))
      ->>'already_deleted')::boolean is not false,
    'deleting a course that is already gone reports it rather than erroring');
commit;

-- ------------------------------------------------- TD-038, paid off here
-- 0020 ended an enrolment with least(coalesce(effective_to, current_date),
-- current_date), which falls BELOW effective_from for a member enrolled from a
-- future date and raises member_enrollments' own check -- so a course could not
-- be deleted at all while anyone in it had a future joining date. 0047 deletes
-- the enrolment instead of dating it closed, so the expression is gone.
begin;
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Future Enrolment Course','09:00','10:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '09:00','10:00' from public.courses c, public.branches b
     where c.name = 'Future Enrolment Course';
  insert into public.members (member_code, full_name) values ('RF-000952','Joins Next Month');
  insert into public.member_enrollments (member_id, offering_id, effective_from)
    select m.id, o.id, current_date + 30
      from public.members m, public.course_offerings o
      join public.courses c on c.id = o.course_id
     where m.member_code = 'RF-000952' and c.name = 'Future Enrolment Course';
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select t.eq((public.delete_course(
      (select id from public.courses where name='Future Enrolment Course'))->>'enrolments_removed')::int,
    1, 'a member enrolled from a future date no longer blocks the deletion (TD-038)');
commit;

-- ------------------------------------------------------------ the posture
select t.eq((select has_function_privilege('anon','public.delete_course(uuid)','execute')), false,
  'anon cannot execute the delete');
select t.eq((select has_function_privilege('anon','public.course_deletion_preview(uuid)','execute')), false,
  'nor read what it would destroy');
select t.eq((select has_function_privilege('authenticated','public.delete_course(uuid)','execute')), true,
  'a signed-in account can -- the function re-checks the caller itself');

-- purge_course is the removal WITHOUT the caller check, which is why nothing
-- a signed-in account holds may reach it directly. delete_course gets there
-- as its definer, after checking.
select t.eq((select has_function_privilege('authenticated','public.purge_course(uuid, text)','execute')), false,
  'the unguarded removal behind it is NOT executable by a signed-in account');
select t.eq((select has_function_privilege('anon','public.purge_course(uuid, text)','execute')), false,
  'nor by anon');
select t.eq((select has_function_privilege('service_role','public.purge_course(uuid, text)','execute')), true,
  'only by service_role, which is what 0048 runs as');

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000002';
  select t.rejects(
    $$select public.purge_course((select id from public.courses where name='Neighbour Course'))$$,
    'and calling it directly as a signed-in account is refused', 'permission denied');
commit;

-- -------------------------------------------------- 0048's path, in miniature
-- A course flagged under the OLD rule. delete_course rightly answers
-- already_deleted for it; purge_course, as service_role, removes it whole.
begin;
  insert into public.courses (name, default_start_time, default_end_time, default_frequency, deleted_at)
    values ('Flagged Before 0047','10:00','11:00',3, now() - interval '1 day');
  insert into public.course_offerings (course_id, branch_id, start_time, end_time, deleted_at)
    select c.id, b.id, '10:00','11:00', now() - interval '1 day'
      from public.courses c, public.branches b where c.name = 'Flagged Before 0047';
  insert into public.sessions (offering_id, session_date, status, completed_at)
    select o.id, '2026-08-12', 'completed', now()
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Flagged Before 0047';
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select t.ok(
    (public.delete_course((select id from public.courses where name='Flagged Before 0047'))
      ->>'already_deleted')::boolean,
    'delete_course still answers already_deleted for a course flagged under the old rule');
commit;

select t.eq((select count(*)::int from public.sessions s
              join public.course_offerings o on o.id = s.offering_id
              join public.courses c on c.id = o.course_id
             where c.name = 'Flagged Before 0047'), 1,
  'and touched nothing -- the orphaned register is still there');

begin;
  set local role service_role;
  select t.eq((public.purge_course((select id from public.courses where name='Flagged Before 0047'))
      ->>'sessions_removed')::int, 1,
    'purge_course, as service_role, removes the flagged course and its orphaned register');
commit;

select t.eq((select count(*)::int from public.courses where name='Flagged Before 0047'), 0,
  'and the flagged course is gone from the table');
select t.eq((select (metadata->>'was_soft_deleted_at') is not null from public.audit_logs
             where action = 'course.hard_deleted' and metadata->>'name' = 'Flagged Before 0047'),
  true, 'and its audit entry records when it was first deleted, telling it apart from a live deletion');

-- Signed out entirely: the guard inside the function, not only the grant.
begin;
  set local role authenticated;
  select t.rejects(
    $$select public.delete_course((select id from public.courses where name='Neighbour Course'))$$,
    'a request with no app user is refused', 'active user');
commit;

select t.eq((select count(*)::int from public.courses where name='Neighbour Course'), 1,
  'and the refusal changed nothing');
