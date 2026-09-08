\echo 'delete_member: she comes off the register, and since 0051 out of the database'
--
-- 0038. The roster's bin icon has claimed a deletion since the screen was
-- drawn and answered a flash message; delete_member is the write behind it.
--
-- AMENDED 08-Sep-2026 FOR 0051. This file pinned the OPPOSITE promise -- "her
-- attendance stays on it" -- and was right to, for as long as that was the
-- promise. The repo owner withdrew it (requests/2026-09-08-hard-delete-member.md)
-- on being shown that attendance_records, session_expectations and
-- email_messages all reference members(id) with NO ACTION, so her rows either
-- go with her or the deletion cannot happen at all. The three assertions that
-- claimed her attendance survived now assert that it does not, and the two
-- that read `enrolments_ended` / `attendance_kept` read the counts of what
-- WENT. Everything else in this file is 0038's contract, unchanged and still
-- binding: the role gate, the billing gate's sibling in 33, idempotence, the
-- future-enrolment case, and the fact that nobody else moves.
-- 40_hard_delete_member.sql is the new contract in full.

begin;
  insert into auth.users (id) values
    ('dddddddd-0000-0000-0000-000000000001'),
    ('dddddddd-0000-0000-0000-000000000002');
  insert into public.app_users (auth_user_id, kind, name, phone_e164) values
    ('dddddddd-0000-0000-0000-000000000001','super_admin','Del Owner','+919994871160'),
    ('dddddddd-0000-0000-0000-000000000002','staff','Del Staff','+919940633875');
  insert into public.branches (name, code, city) values ('Coimbatore','CBE','Coimbatore');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Leaving Course','06:00','07:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00','07:00' from public.courses c, public.branches b
     where c.name = 'Leaving Course';

  insert into public.members (member_code, full_name, joined_on)
    values ('RF-000950','Leaving Member','2026-08-01'),
           ('RF-000951','Staying Member','2026-08-01');
  insert into public.member_emails (member_id, email, is_primary)
    select m.id, 'leaving@example.com', true from public.members m where m.member_code='RF-000950';
  insert into public.member_aliases (member_id, alias_type, alias_display)
    select m.id, 'name', 'Leaving M' from public.members m where m.member_code='RF-000950';
  insert into public.member_enrollments (member_id, offering_id, effective_from)
    select m.id, o.id, '2026-08-01'
      from public.members m, public.course_offerings o
      join public.courses c on c.id = o.course_id
     where m.member_code in ('RF-000950','RF-000951') and c.name = 'Leaving Course';

  -- a session that HAPPENED, and the record of who was at it
  insert into public.sessions (offering_id, session_date, status, completed_at)
    select o.id, '2026-08-10', 'completed', now()
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Leaving Course';
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'present', true
      from public.sessions s
      join public.course_offerings o on o.id = s.offering_id
      join public.courses c on c.id = o.course_id,
           public.members m
     where c.name = 'Leaving Course' and m.member_code = 'RF-000950';
commit;

-- ------------------------------------------------------------ the role
-- Written by a STAFF account, because that is the whole point of 0038 and
-- because a capability tested only as the owner is a capability whose guard
-- nobody has read.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000002';
  create temp table del as
  select public.delete_member((select id from public.members where member_code='RF-000950')) as r;
commit;

select t.eq((select r->>'name' from del), 'Leaving Member',
  'the deletion names who it removed, so the toast can say it rather than guess');
select t.ok((select not (r->>'already_deleted')::boolean from del),
  'and reports itself as a real deletion, not a repeat');

-- ------------------------------------------------------- what goes
select t.eq((select count(*)::int from public.members
              where member_code='RF-000950' and deleted_at is null), 0,
  'she is off the register');
select t.eq((select count(*)::int from public.member_emails e
              join public.members m on m.id = e.member_id
             where m.member_code='RF-000950' and e.deleted_at is null), 0,
  'her address goes with her');
select t.eq((select count(*)::int from public.member_aliases a
              join public.members m on m.id = a.member_id
             where m.member_code='RF-000950'), 0,
  'and her lookup aliases go for REAL -- an alias left behind would send the next upload of that name to a deleted member');

-- THE HALF THAT ACTUALLY STOPS THE EXPECTATION. Under 0044 this was the
-- ENDING of the enrolment, because the row survived: deleted_at is not what
-- stops it -- expected_members_for_session reads member_enrollments and never
-- looks at members.deleted_at. Under 0051 the row is gone outright, which
-- stops it just as completely and leaves nothing to go stale.
select t.eq((select count(*)::int from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.member_code='RF-000950' and e.status = 'active'), 0,
  'her enrolment is gone, which is what takes her off the expectation');
select t.eq((select (r->>'enrolments_removed')::int from del), 1,
  'and the call says so');

-- ------------------------------------------------------- what goes with her
-- AMENDED. These three asserted the opposite until 0051 -- see the header.
select t.eq((select count(*)::int from public.attendance_records a
              join public.members m on m.id = a.member_id
             where m.member_code='RF-000950'), 0,
  'the record of the day she was there goes with her -- the foreign key allows no other answer');
select t.eq((select (r->>'attendance_removed')::int from del), 1,
  'and the call says how much, because that is what a person needs to hear before confirming');
select t.eq((select (r->>'sessions_touched')::int from del), 1,
  'and over how many days, because those days now count one fewer person present');
select t.eq((select count(*)::int from public.sessions s
              join public.course_offerings o on o.id = s.offering_id
              join public.courses c on c.id = o.course_id
             where c.name='Leaving Course' and s.deleted_at is null), 1,
  'the session itself is not a member''s to delete');
select t.eq((select count(*)::int from public.members
              where member_code='RF-000951' and deleted_at is null), 1,
  'and nobody else moved');
select t.eq((select count(*)::int from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.member_code='RF-000951' and e.status = 'active'), 1,
  'including the enrolment of the member sitting beside her in the same course');

-- ------------------------------------------------------- the address is freed
-- Under 0044 this worked because member_emails_unique_live is PARTIAL on
-- deleted_at, so a flagged address was out of the index. Under 0051 the row
-- is gone entirely and the address is free for the plainest possible reason.
-- The assertion is unchanged and still the one that matters: whatever the
-- mechanism, the next holder can use it.
begin;
  insert into public.member_emails (member_id, email, is_primary)
    select m.id, 'leaving@example.com', true from public.members m where m.member_code='RF-000951';
commit;
select t.eq((select count(*)::int from public.member_emails e
              join public.members m on m.id = e.member_id
             where m.member_code='RF-000951' and e.email='leaving@example.com'
               and e.deleted_at is null), 1,
  'her address is freed for whoever holds it next');

-- ------------------------------------------------------- idempotence
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000002';
  create temp table del2 as
  select public.delete_member((select id from public.members where member_code='RF-000950')) as r;
commit;
select t.ok((select (r->>'already_deleted')::boolean from del2),
  'a second tap reports already_deleted rather than erroring -- two taps on a slow connection is not a failure to read about');
select t.eq((select (r->>'enrolments_removed')::int from del2), 0,
  'and it removes nothing the second time');

-- ------------------------------------------------------- a future enrolment
-- A joining date read out of an imported file is not always in the past, and
-- member_enrollments checks effective_to >= effective_from. 0044 had to clamp
-- the end date up to effective_from or a future enrolment made her
-- undeletable. 0051 DELETES the enrolment instead of dating it closed, so the
-- clamp and its failure are both gone -- the same debt 0047 paid off on the
-- course side. The case is kept because it is the one that used to break.
begin;
  insert into public.members (member_code, full_name, joined_on)
    values ('RF-000952','Future Member', current_date);
  insert into public.member_enrollments (member_id, offering_id, effective_from)
    select m.id, o.id, current_date + 30
      from public.members m, public.course_offerings o
      join public.courses c on c.id = o.course_id
     where m.member_code = 'RF-000952' and c.name = 'Leaving Course';
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000002';
  select t.ok(not ((public.delete_member((select id from public.members where member_code='RF-000952'))
                    ->>'already_deleted')::boolean),
    'a member enrolled from a FUTURE date can be removed');
commit;
select t.eq((select count(*)::int from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.member_code='RF-000952' and e.status = 'active'), 0,
  'and her enrolment goes without ever meeting effective_to >= effective_from');

-- ------------------------------------------------------------ the gate
select t.rejects($$
  set local role anon;
  select public.delete_member('00000000-0000-0000-0000-000000000000'::uuid)$$,
  'anon may not call it at all', 'permission denied');

-- A DISABLED account fails closed, the way is_active_app_user() makes every
-- other write fail closed. This is the check that replaced the role check --
-- 0038 moved the boundary, it did not remove one.
begin;
  update public.app_users set is_active = false
   where auth_user_id = 'dddddddd-0000-0000-0000-000000000002';
commit;
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000002';
  select public.delete_member((select id from public.members where member_code='RF-000951'))$$,
  'a disabled account cannot delete a member', 'only a signed-in');
select t.eq((select count(*)::int from public.members
              where member_code='RF-000951' and deleted_at is null), 1,
  'and the refusal changed nothing');
