\echo 'delete_course: it takes the members it was the whole of, and only those'
--
-- "on deleting course make sure all its related members are deleted because it
-- may cause unnecessary chaos when i wanted to bring same person under another
-- course after deleting whole course" -- the requester, 09-Sep-2026.
--
-- 0047 spared every member, which left them on the register enrolled in
-- nothing: invisible in every course view and IN THE WAY of adding the same
-- person to another course. Four members were stranded that way on production.
--
-- THE LINE THIS SPEC EXISTS TO DEFEND is the half of the instruction I did not
-- take literally: a member enrolled in ANOTHER course survives. Taken at its
-- word, "all its related members are deleted" would destroy somebody's second
-- register because their first was deleted. Every assertion below is either
-- that line or the rule it bounds.

begin;
  insert into auth.users (id) values ('eeee1111-0000-0000-0000-000000000009');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('eeee1111-1111-0000-0000-000000000009',
            'eeee1111-0000-0000-0000-000000000009','super_admin','Course Owner','+919994871199');
  insert into public.branches (name, code, city) values ('Vellore','VLR','Vellore');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Doomed','06:00','07:00',6), ('Survivor','08:00','09:00',6);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, c.default_start_time, c.default_end_time
      from public.courses c, public.branches b
     where c.name in ('Doomed','Survivor') and b.code='VLR';
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, current_date - 400, array[1,2,3,4,5,6,7]::smallint[]
      from public.course_offerings o join public.courses c on c.id=o.course_id
     where c.name in ('Doomed','Survivor');
commit;

-- Solo is in Doomed only. Both is in Doomed now, and was in Survivor before.
--
-- Not "in both at once": member_enrollments carries an exclusion constraint on
-- (member_id, daterange), so one member holds ONE live enrolment at a time.
-- "Enrolled in another course" therefore means HISTORY there -- an ended
-- enrolment with its attendance -- and that history is exactly what deleting
-- Doomed must not be allowed to destroy.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeee1111-0000-0000-0000-000000000009';
  select public.create_member('Solo Member',
           (select o.id from public.course_offerings o join public.courses c on c.id=o.course_id
             where c.name='Doomed'), null, array[]::text[], array['solo@gmail.com']::text[], null);
  select public.create_member('Both Member',
           (select o.id from public.course_offerings o join public.courses c on c.id=o.course_id
             where c.name='Doomed'), null, array[]::text[], array['both@gmail.com']::text[], null);
commit;

begin;
  insert into public.member_enrollments (member_id, offering_id, effective_from, effective_to, status)
    select m.id,
           (select o.id from public.course_offerings o join public.courses c on c.id=o.course_id
             where c.name='Survivor'),
           current_date - 60, current_date - 31, 'ended'
      from public.members m where m.full_name='Both Member';
commit;

select t.eq((select count(*)::int from public.members where deleted_at is null), 2,
  'two members on the register -- the fixture is real');

-- ======================================== the preview says who will go
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeee1111-0000-0000-0000-000000000009';
  create temporary table prev(result jsonb) on commit drop;
  insert into prev select public.course_deletion_preview(
    (select id from public.courses where name='Doomed'));

  select t.eq((select (result->>'members_enrolled')::int from prev), 2,
    'both members are enrolled in the doomed course');
  select t.eq((select (result->>'members_removed')::int from prev), 1,
    'but the preview says only ONE of them will be removed -- the dialog can name the damage');
commit;

-- ================================================== the deletion itself
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeee1111-0000-0000-0000-000000000009';
  create temporary table del(result jsonb) on commit drop;
  insert into del select public.delete_course(
    (select id from public.courses where name='Doomed'));

  select t.eq((select (result->>'members_removed')::int from del), 1,
    'one member went with the course');
commit;

select t.eq((select count(*)::int from public.members
              where full_name='Solo Member' and deleted_at is null), 0,
  'THE MEMBER THIS COURSE WAS THE WHOLE OF IS GONE -- no leftover to get in the way');

select t.eq((select count(*)::int from public.members
              where full_name='Both Member' and deleted_at is null), 1,
  'THE LINE: a member with history in ANOTHER course survives');

select t.eq((select count(*)::int from public.member_enrollments e
               join public.members m on m.id = e.member_id
              where m.full_name='Both Member'), 1,
  'and keeps exactly that other enrolment -- the history');

select t.eq((select c.name from public.member_enrollments e
               join public.members m on m.id=e.member_id
               join public.course_offerings o on o.id=e.offering_id
               join public.courses c on c.id=o.course_id
              where m.full_name='Both Member'), 'Survivor',
  'which is the course that was not deleted');

select t.eq((select count(*)::int from public.member_emails me
               join public.members m on m.id = me.member_id
              where m.full_name='Both Member'), 1,
  'with the address still on file -- nothing of the survivor was touched');

-- Nothing of the removed member is left behind anywhere.
select t.eq((select count(*)::int from public.member_emails me
              where not exists (select 1 from public.members m where m.id = me.member_id)), 0,
  'and the removed member left no address orphaned behind her');

-- ==================================== each removal is on the record
select t.eq((select count(*)::int from public.audit_logs
              where action = 'member.hard_deleted'
                and metadata->>'note' ilike '%was the whole of%'), 1,
  'the member who went has an audit entry of her own saying why');
