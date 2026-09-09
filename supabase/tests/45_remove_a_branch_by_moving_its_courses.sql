\echo 'remove_branch: a branch that runs courses is removed by moving them (0063)'
--
-- "Enable delete branch" -- 09-Sep-2026. branches_guard_removal (0019) refused
-- the removal while offerings or holidays pointed at the branch, and its own
-- message said "move or remove them first" -- advice the app gave no way to
-- act on. This moves them.
--
-- What these assert:
--   * NOTHING IS DESTROYED. The offering survives with a new branch_id, so the
--     course, its sessions and the members on it are all still there. This is
--     the whole design: removing a LOCATION must not destroy a register.
--   * the holidays scoped to the branch travel with the classes.
--   * THE COLLISION is refused and the course is named, because one live
--     offering per course per branch means merging two registers would be
--     inventing a decision nobody asked for.
--   * the guard still fires: without a target, an occupied branch still cannot
--     be removed, exactly as 0019 has always had it.

begin;
  insert into auth.users (id) values ('bbbbbbbb-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('bbbbbbbb-1111-0000-0000-000000000001',
            'bbbbbbbb-0000-0000-0000-000000000001','super_admin','Branch Owner','+919994871177');
  insert into public.branches (name, code, city) values
    ('Tirupur','TRP','Tirupur'), ('Karur','KRR','Karur'), ('Ooty','OOT','Ooty');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Branch Flow','05:00','06:00',6), ('Shared Flow','09:00','10:00',6);
  -- Branch Flow runs at Tirupur only; Shared Flow runs at BOTH Tirupur and Karur
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '05:00', '06:00' from public.courses c, public.branches b
     where c.name = 'Branch Flow' and b.code = 'TRP';
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '09:00', '10:00' from public.courses c, public.branches b
     where c.name = 'Shared Flow' and b.code in ('TRP','KRR');
  insert into public.holidays (branch_id, start_date, end_date, name)
    select b.id, current_date + 20, current_date + 20, 'Local festival'
      from public.branches b where b.code = 'TRP';
commit;

select t.eq((select count(*)::int from public.course_offerings o
               join public.branches b on b.id = o.branch_id
              where b.code = 'TRP' and o.deleted_at is null), 2,
  'Tirupur runs two offerings -- the fixture is real');

-- ================= the guard still refuses a bare removal
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000001';
  select t.rejects($q$select public.remove_branch(
                        (select id from public.branches where code = 'TRP'))$q$,
    'without a target, a branch that runs courses still cannot be removed',
    'still runs');
rollback;

-- ================= the collision is refused, and the course is named
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000001';
  select t.rejects($q$select public.remove_branch(
                        (select id from public.branches where code = 'TRP'),
                        (select id from public.branches where code = 'KRR'))$q$,
    'moving into a branch that already runs one of the courses is refused',
    'Shared Flow');
rollback;

select t.eq((select count(*)::int from public.branches where deleted_at is null), 3,
  'and the refused move left every branch standing');

-- ================= the move that works
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000001';
  create temporary table moved(result jsonb) on commit drop;
  insert into moved
  select public.remove_branch(
    (select id from public.branches where code = 'TRP'),
    (select id from public.branches where code = 'OOT'));

  select t.eq((select (result->>'offerings_moved')::int from moved), 2,
    'both offerings moved to the new branch');
  select t.eq((select (result->>'holidays_moved')::int from moved), 1,
    'and the holiday scoped to the branch travelled with them');
  select t.eq((select result->>'moved_to' from moved), 'Ooty',
    'the result names where they went');
commit;

select t.ok((select deleted_at is not null from public.branches where code = 'TRP'),
  'the branch is removed');

select t.eq((select count(*)::int from public.course_offerings o
               join public.branches b on b.id = o.branch_id
              where b.code = 'OOT' and o.deleted_at is null), 2,
  'NOTHING WAS DESTROYED: both offerings are live at the new branch');

select t.eq((select count(*)::int from public.courses where deleted_at is null), 2,
  'and neither course was deleted -- removing a location is not deleting a register');

select t.eq((select b.code from public.holidays h join public.branches b on b.id = h.branch_id
              where h.name = 'Local festival'), 'OOT',
  'the closure now points at the branch that inherited the classes');

-- ================= the gate
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000001';
  select t.rejects($q$select public.remove_branch(
                        (select id from public.branches where code = 'KRR'),
                        (select id from public.branches where code = 'KRR'))$q$,
    'a branch cannot be moved into itself',
    'itself');
rollback;

begin;
  set local role anon;
  select t.rejects($q$select public.remove_branch(
                        '00000000-0000-0000-0000-000000000000'::uuid)$q$,
    'an unsigned-in caller cannot remove a branch');
rollback;
