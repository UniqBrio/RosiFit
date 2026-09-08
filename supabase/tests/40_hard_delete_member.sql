\echo 'delete_member (0051): the student and every row she owns leave the database'
--
-- 30_delete_member.sql pinned the OPPOSITE promise -- "her attendance stays on
-- it" -- and was right to, for as long as that was the promise. The repo owner
-- withdrew it on 08-Sep-2026 (requests/2026-09-08-hard-delete-member.md):
-- "delete that record entirely from database". 30 is amended to match; this
-- file is the new contract in full.
--
-- THE ASSERTION THAT MATTERS MOST IS THE ORDER, and it is invisible in the
-- function unless you have read the constraint graph. email_messages.member_email_id
-- references member_emails, which CASCADES from members -- so deleting a
-- member fires a cascade that this NO ACTION constraint refuses, and the whole
-- statement fails. It fails ONLY for a member the academy has actually
-- emailed, which is every member the follow-up feature has ever touched. So
-- the fixture below SENDS HER MAIL. A spec that only inserted attendance would
-- pass against the broken order and prove nothing.
--
-- THE SECOND ASSERTION THAT MATTERS is the neighbour. This deletion reaches
-- eight tables; "surgical" is a claim about code and only a spec is evidence.
-- Staying Member is enrolled in the same course, present at the same session
-- and mailed in the same batch, and every one of her rows is checked after.

begin;
  insert into auth.users (id) values
    ('eeeeeeee-0000-0000-0000-000000000001'),
    ('eeeeeeee-0000-0000-0000-000000000002');
  insert into public.app_users (auth_user_id, kind, name, phone_e164) values
    ('eeeeeeee-0000-0000-0000-000000000001','super_admin','Purge Owner','+919994871161'),
    ('eeeeeeee-0000-0000-0000-000000000002','staff','Purge Staff','+919940633876');
  insert into public.branches (name, code, city) values ('Adyar','ADY','Chennai');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Purged Member Course','06:00','07:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00','07:00' from public.courses c, public.branches b
     where c.name = 'Purged Member Course';

  insert into public.members (member_code, full_name, joined_on)
    values ('RF-000960','Purged Member','2026-08-01'),
           ('RF-000961','Staying Neighbour','2026-08-01');
  insert into public.member_emails (member_id, email, is_primary)
    select m.id, m.member_code || '@example.com', true
      from public.members m where m.member_code in ('RF-000960','RF-000961');
  insert into public.member_aliases (member_id, alias_type, alias_display)
    select m.id, 'name', 'Purged M' from public.members m where m.member_code='RF-000960';
  insert into public.member_schedules (member_id, effective_from, weekdays)
    select m.id, '2026-08-01', array[1,3]::smallint[]
      from public.members m where m.member_code='RF-000960';
  insert into public.member_enrollments (member_id, offering_id, effective_from)
    select m.id, o.id, '2026-08-01'
      from public.members m, public.course_offerings o
      join public.courses c on c.id = o.course_id
     where m.member_code in ('RF-000960','RF-000961') and c.name = 'Purged Member Course';

  -- TWO sessions that happened, so `sessions_touched` counts days rather than
  -- rows -- a member marked twice on one day must not be reported as two.
  insert into public.sessions (offering_id, session_date, status, completed_at)
    select o.id, d::date, 'completed', now()
      from public.course_offerings o
      join public.courses c on c.id = o.course_id,
           generate_series('2026-08-10'::date, '2026-08-12'::date, '2 days') d
     where c.name = 'Purged Member Course';
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'present', true
      from public.sessions s
      join public.course_offerings o on o.id = s.offering_id
      join public.courses c on c.id = o.course_id,
           public.members m
     where c.name = 'Purged Member Course' and m.member_code in ('RF-000960','RF-000961');

  -- The frozen expected set: NO ACTION on members, so it refuses the delete
  -- exactly as attendance does.
  insert into public.session_expectations (session_id, member_id, schedule_source)
    select s.id, m.id, 'offering'
      from public.sessions s
      join public.course_offerings o on o.id = s.offering_id
      join public.courses c on c.id = o.course_id,
           public.members m
     where c.name = 'Purged Member Course' and m.member_code in ('RF-000960','RF-000961');

  -- THE TRAP. Mail to BOTH of them in one batch: hers must go, the
  -- neighbour's must stay, and the batch itself must survive losing one
  -- recipient. Without these rows the delete succeeds for the wrong reason.
  insert into public.email_batches (client_batch_id, template_id, subject_snapshot, body_snapshot)
    select 'hard-delete-member-spec', t.id, t.subject, t.body_text
      from public.email_templates t where t.is_default limit 1;
  insert into public.email_messages (batch_id, member_id, member_email_id, to_email, status, sent_at)
    select b.id, m.id, e.id, e.email, 'sent', now()
      from public.email_batches b, public.members m
      join public.member_emails e on e.member_id = m.id
     where b.client_batch_id = 'hard-delete-member-spec'
       and m.member_code in ('RF-000960','RF-000961');
commit;

-- Her id, captured BEFORE the deletion, because afterwards there is no row
-- left to look it up in -- which is itself the claim this file makes.
create temp table gone as
select id from public.members where member_code='RF-000960';

-- --------------------------------------------------------------- the preview
-- What the confirmation is allowed to say, BEFORE the tap. Read-only and
-- gated exactly as the deletion is.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000002';
  create temp table pv as
  select public.member_deletion_preview(
    (select id from public.members where member_code='RF-000960')) as r;
commit;

select t.eq((select r->>'name' from pv), 'Purged Member',
  'the preview names her, so the dialog is talking about the right person');
select t.eq((select (r->>'attendance_records')::int from pv), 2,
  'it counts every attendance row that will go');
select t.eq((select (r->>'sessions_attended')::int from pv), 2,
  'and the DAYS they span -- the sentence says how many sessions change');
select t.eq((select (r->>'enrolments')::int from pv), 1,
  'and her enrolments');
select t.eq((select (r->>'emails_sent')::int from pv), 1,
  'and the mail the academy actually sent her');

select t.rejects($$
  set local role anon;
  select public.member_deletion_preview('00000000-0000-0000-0000-000000000000'::uuid)$$,
  'anon may not count what a deletion would destroy', 'permission denied');

-- --------------------------------------------------------------- the deletion
-- Written by a STAFF account: 0051 keeps 0044's boundary exactly, and a
-- capability tested only as the owner is a capability whose guard nobody read.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000002';
  create temp table del as
  select public.delete_member((select id from public.members where member_code='RF-000960')) as r;
commit;

select t.eq((select r->>'name' from del), 'Purged Member',
  'the deletion names who it removed, so the toast can say it rather than guess');
select t.ok((select not (r->>'already_deleted')::boolean from del),
  'and reports itself as a real deletion, not a repeat');
select t.eq((select (r->>'attendance_removed')::int from del), 2,
  'it reports the attendance rows it destroyed');
select t.eq((select (r->>'sessions_touched')::int from del), 2,
  'and the days whose figures changed');
select t.eq((select (r->>'messages_removed')::int from del), 1,
  'and her mail, which is the row that would have blocked the whole thing');

-- --------------------------------------------------- NOTHING OF HER IS LEFT
-- Every table that references members(id), checked one at a time. Each is an
-- ORPHAN check rather than a join through members, because there is no member
-- row left to join through -- which is the whole claim. An orphan is also the
-- only way a half-done deletion could show itself.
select t.eq((select count(*)::int from public.members where member_code='RF-000960'), 0,
  'her row is gone from members entirely -- not flagged, gone');
select t.eq((select count(*)::int from public.member_emails e
              left join public.members m on m.id = e.member_id where m.id is null), 0,
  'no address is left pointing at a member who no longer exists');
select t.eq((select count(*)::int from public.member_aliases a
              left join public.members m on m.id = a.member_id where m.id is null), 0,
  'no alias is left to send the next upload of that name to a deleted member');
select t.eq((select count(*)::int from public.member_enrollments e
              left join public.members m on m.id = e.member_id where m.id is null), 0,
  'no enrolment is left');
select t.eq((select count(*)::int from public.member_schedules s
              left join public.members m on m.id = s.member_id where m.id is null), 0,
  'no schedule override is left');
select t.eq((select count(*)::int from public.member_stats s
              left join public.members m on m.id = s.member_id where m.id is null), 0,
  'no stats row is left -- the cache is keyed by a member who is gone');
select t.eq((select count(*)::int from public.attendance_records a
              left join public.members m on m.id = a.member_id where m.id is null), 0,
  'no attendance record is left');
select t.eq((select count(*)::int from public.session_expectations x
              left join public.members m on m.id = x.member_id where m.id is null), 0,
  'no expected-slot is left -- a completed session no longer expects somebody who does not exist');
select t.eq((select count(*)::int from public.email_messages x
              left join public.members m on m.id = x.member_id where m.id is null), 0,
  'no sent message is left');

-- ------------------------------------------------------ THE NEIGHBOUR STANDS
-- The other half of "surgical", and the half a spec has to prove.
select t.eq((select count(*)::int from public.members
              where member_code='RF-000961' and deleted_at is null), 1,
  'the member sitting beside her is untouched');
select t.eq((select count(*)::int from public.attendance_records a
              join public.members m on m.id = a.member_id
             where m.member_code='RF-000961'), 2,
  'and so is every attendance record of hers');
select t.eq((select count(*)::int from public.session_expectations x
              join public.members m on m.id = x.member_id
             where m.member_code='RF-000961'), 2,
  'and her expected-slots');
select t.eq((select count(*)::int from public.email_messages x
              join public.members m on m.id = x.member_id
             where m.member_code='RF-000961'), 1,
  'and the mail she was sent in the same batch');
select t.eq((select count(*)::int from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.member_code='RF-000961' and e.status = 'active'), 1,
  'and her enrolment in the same course');

-- ------------------------------------------------- WHAT IS THE ACADEMY'S STAYS
select t.eq((select count(*)::int from public.sessions s
              join public.course_offerings o on o.id = s.offering_id
              join public.courses c on c.id = o.course_id
             where c.name='Purged Member Course'), 2,
  'the sessions are the academy''s classes and are not a member''s to delete');
select t.eq((select count(*)::int from public.courses where name='Purged Member Course'), 1,
  'nor is the course');
select t.eq((select count(*)::int from public.email_batches), 1,
  'nor the batch -- a send happened, whether or not one of its recipients is still on the register');

-- ------------------------------------------------------------- the audit row
-- audit_members fires `after insert or update`, so a DELETE audits NOTHING by
-- itself. This is the single most destructive act available on a person and
-- the entry is written by hand, before the rows go, inside the same
-- transaction. Without this assertion the deletion could ship traceless and
-- every other test here would still pass.
select t.eq((select count(*)::int from public.audit_logs
             where action = 'member.hard_deleted'), 1,
  'the deletion wrote its own audit entry, because the trigger cannot');
select t.eq((select metadata->>'name' from public.audit_logs
             where action = 'member.hard_deleted'), 'Purged Member',
  'and the entry names her, since there is no row left to look her up in');
select t.eq((select (metadata->>'attendance_records')::int from public.audit_logs
             where action = 'member.hard_deleted'), 2,
  'and records what it destroyed, counted before the rows went');

-- ------------------------------------------------------------- idempotence
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000002';
  create temp table del2 as
  select public.delete_member((select id from gone)) as r;
commit;
select t.ok((select (r->>'already_deleted')::boolean from del2),
  'a second tap reports already_deleted rather than erroring');
select t.eq((select (r->>'attendance_removed')::int from del2), 0,
  'and removes nothing the second time');
select t.eq((select count(*)::int from public.audit_logs
             where action = 'member.hard_deleted'), 1,
  'and writes no second audit entry for a deletion that did not happen');

-- ------------------------------------------------------------- the guards
-- 0051 changed WHAT the function does and nothing about WHO may call it.
select t.rejects($$
  set local role anon;
  select public.delete_member('00000000-0000-0000-0000-000000000000'::uuid)$$,
  'anon may not call it at all', 'permission denied');

-- purge_member carries NO caller guard of its own -- delete_member checks the
-- caller and then reaches it as the definer -- so it must be unreachable from
-- a signed-in account. If this ever passes, every member in the academy is
-- deletable by anyone who can open a session.
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000002';
  select public.purge_member('00000000-0000-0000-0000-000000000000'::uuid)$$,
  'purge_member is service_role only -- it has no guard of its own', 'permission denied');

begin;
  update public.app_users set is_active = false
   where auth_user_id = 'eeeeeeee-0000-0000-0000-000000000002';
commit;
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000002';
  select public.delete_member((select id from public.members where member_code='RF-000961'))$$,
  'a disabled account cannot delete a member', 'only a signed-in');
select t.eq((select count(*)::int from public.members
              where member_code='RF-000961' and deleted_at is null), 1,
  'and the refusal changed nothing');
