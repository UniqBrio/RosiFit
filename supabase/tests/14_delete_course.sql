\echo 'delete_course: the schedule goes, the history stays'
--
-- The confirmation the canvas draws makes a promise -- "their attendance
-- history stays, but the course and its sessions are removed" -- and the
-- canvas itself flashes "<name> deleted" without touching anything. These
-- assertions are that promise, both halves, because the two halves fail in
-- opposite directions: too little and a deleted course goes on expecting
-- attendance and emailing members; too much and a completed session's
-- attendance is rewritten.

begin;
  insert into auth.users (id) values
    ('cccccccc-0000-0000-0000-000000000001'),
    ('cccccccc-0000-0000-0000-000000000002');
  insert into public.app_users (auth_user_id, kind, name, phone_e164) values
    ('cccccccc-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158'),
    ('cccccccc-0000-0000-0000-000000000002','staff','Nandhini R','+919940633871');
  insert into public.branches (name, code, city) values ('Coimbatore','CBE','Coimbatore');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Doomed Course','06:00','07:00',3), ('Surviving Course','07:00','08:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00','07:00' from public.courses c, public.branches b;

  insert into public.members (member_code, full_name)
    values ('RF-000900','Doomed Member');
  insert into public.member_enrollments (member_id, offering_id, effective_from)
    select m.id, o.id, '2026-08-01'
      from public.members m, public.course_offerings o
      join public.courses c on c.id = o.course_id
     where m.member_code = 'RF-000900' and c.name = 'Doomed Course';

  -- one session that HAPPENED and one that has not
  insert into public.sessions (offering_id, session_date, status, completed_at)
    select o.id, '2026-08-10', 'completed', now()
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Doomed Course';
  insert into public.sessions (offering_id, session_date, status)
    select o.id, '2026-12-10', 'scheduled'
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Doomed Course';
  insert into public.sessions (offering_id, session_date, status, cancellation_reason)
    select o.id, '2026-12-11', 'cancelled', 'teacher unwell'
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Doomed Course';

  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'present', true
      from public.sessions s
      join public.course_offerings o on o.id = s.offering_id
      join public.courses c on c.id = o.course_id,
           public.members m
     where c.name = 'Doomed Course' and s.status = 'completed'
       and m.member_code = 'RF-000900';
commit;

-- ------------------------------------------------------------ the guard
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000002';
  select t.rejects(
    $$select public.delete_course((select id from public.courses where name='Doomed Course'))$$,
    'a staff account cannot delete a course',
    'only the super admin');
commit;

select t.eq((select count(*)::int from public.courses where name='Doomed Course' and deleted_at is null), 1,
  'and the refusal changed nothing');

-- ------------------------------------------------------------ the delete
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';

  select t.eq(
    (public.delete_course((select id from public.courses where name='Doomed Course'))->>'sessions_removed')::int,
    2, 'both not-yet-completed sessions are removed -- scheduled AND cancelled');
commit;

select t.eq((select count(*)::int from public.courses where name='Doomed Course' and deleted_at is null), 0,
  'the course is gone from every read');

-- THE one that matters: an offering left live would go on expecting
-- attendance for a course nobody can see.
select t.eq((select count(*)::int from public.course_offerings o
              join public.courses c on c.id = o.course_id
             where c.name='Doomed Course' and o.deleted_at is null), 0,
  'its offerings are gone too, which is what stops the expectation');

select t.eq((select count(*)::int from public.sessions s
              join public.course_offerings o on o.id = s.offering_id
              join public.courses c on c.id = o.course_id
             where c.name='Doomed Course' and s.deleted_at is null and s.status <> 'completed'), 0,
  'no future session survives');

-- ----------------------------------------------------------- the history
select t.eq((select count(*)::int from public.sessions s
              join public.course_offerings o on o.id = s.offering_id
              join public.courses c on c.id = o.course_id
             where c.name='Doomed Course' and s.deleted_at is null and s.status = 'completed'), 1,
  'the COMPLETED session is untouched -- deleting a course does not rewrite what happened');

select t.eq((select count(*)::int from public.attendance_records), 1,
  'and so is every attendance record');

select t.eq((select status from public.member_enrollments
              where member_id = (select id from public.members where member_code='RF-000900')), 'ended',
  'her enrolment is ENDED rather than deleted, so she still has a history of this course');

select t.ok((select effective_to from public.member_enrollments
              where member_id = (select id from public.members where member_code='RF-000900')) is not null,
  'and the enrolment is dated closed');

select t.ok((select deleted_at from public.members where member_code='RF-000900') is null,
  'the MEMBER is not deleted -- she was enrolled, not owned');

-- ------------------------------------------------------- the neighbours
select t.eq((select count(*)::int from public.courses where name='Surviving Course' and deleted_at is null), 1,
  'the other course is untouched');
select t.eq((select count(*)::int from public.course_offerings o
              join public.courses c on c.id = o.course_id
             where c.name='Surviving Course' and o.deleted_at is null), 1,
  'and so is its offering');

-- ------------------------------------------------------------ idempotent
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  select t.ok(
    (public.delete_course((select id from public.courses where name='Doomed Course'))->>'already_deleted')::boolean,
    'deleting an already-deleted course reports it rather than erroring');
commit;

-- ------------------------------------------------------------ the posture
select t.eq((select has_function_privilege('anon','public.delete_course(uuid)','execute')), false,
  'anon cannot execute the delete');
select t.eq((select has_function_privilege('authenticated','public.delete_course(uuid)','execute')), true,
  'a signed-in account can -- the function re-checks the role itself');
