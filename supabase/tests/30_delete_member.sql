\echo 'delete_member: she comes off the register, her attendance stays on it'
--
-- 0038. The roster's bin icon has claimed a deletion since the screen was
-- drawn and answered a flash message; delete_member is the write behind it.
-- The promise the confirmation makes has two halves that fail in opposite
-- directions -- too little and a removed member goes on being expected at
-- every session and counted absent in every figure; too much and the record
-- of a day that actually happened is rewritten. Both halves are asserted.

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

-- THE HALF THAT ACTUALLY STOPS THE EXPECTATION. deleted_at is not it:
-- expected_members_for_session reads member_enrollments and never looks at
-- members.deleted_at, so a flagged member with a live enrolment keeps being
-- expected at every session and counted absent in every figure.
select t.eq((select count(*)::int from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.member_code='RF-000950' and e.status = 'active'), 0,
  'her enrolment is ENDED, which is what takes her off the expectation');
select t.eq((select (r->>'enrolments_ended')::int from del), 1,
  'and the call says so');

-- ------------------------------------------------------- what stays
select t.eq((select count(*)::int from public.attendance_records a
              join public.members m on m.id = a.member_id
             where m.member_code='RF-000950'), 1,
  'the record of the day she WAS there is untouched -- it is the academy''s record of what happened, not hers');
select t.eq((select (r->>'attendance_kept')::int from del), 1,
  'and the call says that too, because that is the half a person needs to hear before confirming');
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
-- member_emails_unique_live is PARTIAL on deleted_at, so the address she gave
-- up can be used by whoever holds it next. A soft delete that kept the row
-- live would have locked the address away permanently.
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
select t.eq((select (r->>'enrolments_ended')::int from del2), 0,
  'and it ends nothing the second time');

-- ------------------------------------------------------- a future enrolment
-- A joining date read out of an imported file is not always in the past, and
-- member_enrollments checks effective_to >= effective_from. Ending a
-- not-yet-started enrolment at current_date would violate that check, so the
-- end date is clamped up to effective_from.
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
  'and her enrolment ends without breaking effective_to >= effective_from');

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
