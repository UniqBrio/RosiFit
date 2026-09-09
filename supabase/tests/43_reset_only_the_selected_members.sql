\echo 'reset_day_attendance: a reset acts on the members who were SELECTED'
--
-- 0057. "The reset of attendance should happend only when user selects the
-- members using select option and when they select members and click on reset
-- only those members attendance should be reset."
--
-- THIS FUNCTION HAD NO SPEC AT ALL, through 0056 and up to this migration --
-- found while rehearsing 0057, and worth saying plainly: it is the most
-- destructive thing on the course screen and nothing asserted what it cleared.
--
-- What these assert, in order:
--   * THE SELECTION IS THE SCOPE: the ticked member's marks go, and the marks
--     of the member beside her stay. This is the requester's sentence.
--   * THE ARGUMENT'S MEANING. 0056's `p_delete_member_ids` named members to
--     DELETE; `p_member_ids` names members to RESET. Same type, same position,
--     opposite instruction -- so a reset must never remove anybody, and that
--     is asserted directly rather than left to reading.
--   * AWAITING IS CONDITIONAL NOW. A day still holding marks must not be sent
--     back to "awaiting a file", or the register invites a re-upload on top of
--     the marks that survived.
--   * an empty selection still means the whole day, which is what 0056 did and
--     what a caller genuinely meaning the register passes.

begin;
  insert into auth.users (id) values ('dddddddd-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('dddddddd-1111-0000-0000-000000000001',
            'dddddddd-0000-0000-0000-000000000001','super_admin','Reset Owner','+919994871190');

  insert into public.branches (name, code, city) values ('Salem','SLM','Salem');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Reset Flow','07:00','08:00',6);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '07:00', '08:00'
      from public.courses c, public.branches b
     where c.name = 'Reset Flow' and b.code = 'SLM';
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, current_date - 400, array[1,2,3,4,5,6,7]::smallint[]
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
     where c.name = 'Reset Flow';
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.create_member(n.name,
           (select o.id from public.course_offerings o
              join public.courses c on c.id = o.course_id
             where c.name = 'Reset Flow'),
           null, array[]::text[], array[n.email]::text[], null)
    from (values ('Anitha Mohan','anitha.m@gmail.com'),
                 ('Bhavani Rao','bhavani.r@gmail.com')) as n(name, email);
commit;

-- One session, both members marked on it.
begin;
  insert into public.sessions (offering_id, session_date, start_time, end_time, status)
    select o.id, current_date - 1, '07:00', '08:00', 'completed'
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
     where c.name = 'Reset Flow';
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'present', true
      from public.sessions s, public.members m
     where s.session_date = current_date - 1
       and m.full_name in ('Anitha Mohan','Bhavani Rao');
commit;

-- LIVE rows throughout. A reset SOFT-deletes: `deleted_at` is stamped so
-- attendance_unique_live frees the slot for a re-import while the row survives
-- for anybody reading the table directly, and so member_deletion_preview
-- (0051) goes on counting the same history. Counting raw rows here would
-- assert the opposite of what the function promises.
select t.eq((select count(*)::int from public.attendance_records where deleted_at is null), 2,
  'two live marks on the day -- the fixture is real');

-- ============================================ the selection is the scope
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  create temporary table reset_probe(result jsonb) on commit drop;
  insert into reset_probe
  select public.reset_day_attendance(
    (select c.id from public.courses c where c.name = 'Reset Flow'),
    (current_date - 1)::date,
    array[(select id from public.members where full_name = 'Anitha Mohan')]::uuid[]);

  select t.eq((select (result->>'cleared')::int from reset_probe), 1,
    'ONLY THE SELECTED MEMBER''S mark is cleared -- the requester''s whole sentence');
  select t.eq((select (result->>'marks_left')::int from reset_probe), 1,
    'and the day is reported as still holding the other one');
commit;

select t.eq((select count(*)::int from public.attendance_records where deleted_at is null), 1,
  'the mark beside it survives -- a reset of one member is not a reset of the day');

select t.eq((select m.full_name from public.attendance_records a
               join public.members m on m.id = a.member_id
              where a.deleted_at is null), 'Bhavani Rao',
  'and it is the member who was NOT ticked whose mark stands');

-- THE ARGUMENT CHANGED MEANING, so this is asserted rather than assumed: the
-- old p_delete_member_ids named members to DELETE. Nobody is deleted by a
-- reset, ever.
select t.eq((select count(*)::int from public.members where deleted_at is null), 2,
  'A RESET DELETES NOBODY -- both members are still on the register');

-- ============================== awaiting is conditional on an empty day
select t.eq((select s.status::text from public.sessions s
              where s.session_date = current_date - 1), 'completed',
  'a day that still holds a mark is NOT sent back to awaiting a file');

-- ==================================== an empty selection is the whole day
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  create temporary table reset_all(result jsonb) on commit drop;
  insert into reset_all
  select public.reset_day_attendance(
    (select c.id from public.courses c where c.name = 'Reset Flow'),
    (current_date - 1)::date,
    '{}'::uuid[]);

  select t.eq((select (result->>'cleared')::int from reset_all), 1,
    'an empty selection clears what is left -- 0056''s behaviour, kept');
  select t.eq((select (result->>'marks_left')::int from reset_all), 0,
    'and the day is now empty');
commit;

select t.eq((select count(*)::int from public.attendance_records where deleted_at is null), 0,
  'nothing live is recorded on that day any more');

-- The rows are still THERE, soft-deleted. Asserted, because "cleared" meaning
-- a soft delete is the one thing about this function a reader would get wrong.
select t.eq((select count(*)::int from public.attendance_records where deleted_at is not null), 2,
  'both marks survive as soft-deleted rows -- a reset is not a shredder');

select t.eq((select count(*)::int from public.members where deleted_at is null), 2,
  'and STILL nobody was deleted, on the whole-day path either');

-- ============================================================ the gate
begin;
  set local role anon;
  select t.rejects($q$select public.reset_day_attendance(
                        '00000000-0000-0000-0000-000000000000'::uuid,
                        current_date::date, '{}'::uuid[])$q$,
    'an unsigned-in caller cannot reset a register');
rollback;
