\echo 'email_log: every message with its batch, member, address, reason and SES times (0095)'

-- WHAT THIS PINS
--   One row per email_messages row, with the batch's date and sender, the member, the address,
--   the course and branch AS SENT, the status, the reason (failure or exclusion), sent_at, and
--   the FIRST Delivery / Bounce / Complaint time from email_events with the bounce type.
--   The period is the academy's days on the batch's created_at (0088's rule). One member's
--   history spans every period. Paging is keyset on message_id. Only an active app user may
--   call it; anon cannot execute it at all; a call with neither a member nor a period is refused.

begin;

-- ---------------------------------------------------------------- the fixture
insert into auth.users (id) values
  ('ffffffff-0000-0000-0000-000000000721'),   -- active staff
  ('ffffffff-0000-0000-0000-000000000722');   -- disabled staff
insert into public.app_users (id, auth_user_id, kind, name, phone_e164, is_active) values
  ('ffffffff-7200-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000721','staff','Staff 72','+919940633872', true),
  ('ffffffff-7200-0000-0000-000000000002','ffffffff-0000-0000-0000-000000000722','staff','Disabled 72','+919940633873', false);

-- Two members who share a name: the address is what tells them apart.
insert into public.members (id, full_name) values
  ('ffffffff-7200-0000-0000-0000000000a1','Priya Raman'),
  ('ffffffff-7200-0000-0000-0000000000a2','Priya Raman'),
  ('ffffffff-7200-0000-0000-0000000000a3','Kavya Balaji');

-- One send on 14-Oct-2026 at 18:00 IST (12:30 UTC), one on 15-Oct at 00:10 IST -- which is still
-- 14-Oct in UTC, so a UTC reading would file it on the wrong day.
insert into public.email_batches (id, client_batch_id, template_id, subject_snapshot, body_snapshot,
                                  sent_by, created_at)
select v.id, v.k, t.id, t.subject, t.body_text, 'ffffffff-7200-0000-0000-000000000001', v.at
  from public.email_templates t,
       (values ('ffffffff-7200-0000-0000-0000000000b1'::uuid, 'spec72-a', timestamptz '2026-10-14 12:30:00+00'),
               ('ffffffff-7200-0000-0000-0000000000b2'::uuid, 'spec72-b', timestamptz '2026-10-14 18:40:00+00')) v(id, k, at)
 where t.is_default;

insert into public.email_messages (id, batch_id, member_id, to_email, subject, variables, status,
                                   failure_reason, exclusion_reason, provider, provider_message_id,
                                   sent_at, from_email) values
  -- delivered
  ('ffffffff-7200-0000-0000-0000000000c1','ffffffff-7200-0000-0000-0000000000b1','ffffffff-7200-0000-0000-0000000000a1',
   'priya.r@example.com','Hi','{"course_name":"Yoga Flow","branch_name":"Adyar","member_name":"Priya Raman"}','sent',
   null, null, 'ses', 'ses-72-1', timestamptz '2026-10-14 12:30:05+00', 'coach@rosifit.in'),
  -- bounced (permanent) after it was sent
  ('ffffffff-7200-0000-0000-0000000000c2','ffffffff-7200-0000-0000-0000000000b1','ffffffff-7200-0000-0000-0000000000a2',
   'priya.k@example.com','Hi','{"course_name":"Yoga Flow","branch_name":"Adyar"}','bounced',
   null, null, 'ses', 'ses-72-2', timestamptz '2026-10-14 12:30:06+00', 'coach@rosifit.in'),
  -- refused by the provider
  ('ffffffff-7200-0000-0000-0000000000c3','ffffffff-7200-0000-0000-0000000000b1','ffffffff-7200-0000-0000-0000000000a3',
   'kavya@example.com','Hi','{"course_name":"—","branch_name":"—"}','failed',
   'Throttling', null, 'ses', null, null, 'coach@rosifit.in'),
  -- excluded on the second send
  ('ffffffff-7200-0000-0000-0000000000c4','ffffffff-7200-0000-0000-0000000000b2','ffffffff-7200-0000-0000-0000000000a1',
   null,'Hi','{"course_name":"Yoga Flow"}','excluded',
   null, 'Unsubscribed', null, null, null, null);

insert into public.email_events (provider, provider_message_id, event_type, payload, received_at) values
  ('ses','ses-72-1','Delivery','{}', timestamptz '2026-10-14 12:30:09+00'),
  ('ses','ses-72-2','Bounce','{"bounce":{"bounceType":"Permanent"}}', timestamptz '2026-10-14 12:31:00+00'),
  -- a message id this log does not hold: must reach nobody
  ('ses','ses-72-other','Bounce','{"bounce":{"bounceType":"Permanent"}}', timestamptz '2026-10-14 12:32:00+00');

-- -------------------------------------------------- what the catalogue says
select t.ok(not has_function_privilege('anon', 'public.email_log(date, date, uuid, uuid, int)', 'execute'),
  'anon cannot execute email_log');
select t.ok(has_function_privilege('authenticated', 'public.email_log(date, date, uuid, uuid, int)', 'execute'),
  'authenticated can execute email_log');
select t.ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'email_log'),
  'email_log is SECURITY DEFINER (it reads three times from email_events for staff)');

select t.rejects($$select * from public.email_log(date '2026-10-14', date '2026-10-14')$$,
  'a caller who is no app user at all (the database owner here) is refused', 'only an active RosiFit user');

-- Everything below is read AS THE ACTIVE STAFF MEMBER -- the audience the function is for.
set local role authenticated;
set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000721';

create temp table log72 on commit drop as select * from public.email_log(date '2026-10-14', date '2026-10-14');

-- ------------------------------------------------------------- the rows
select t.eq((select count(*)::int from log72), 3,
  '14-Oct (academy day) holds the first send''s three messages, not the 00:10 IST send of the 15th');
select t.eq((select count(*)::int from public.email_log(date '2026-10-15', date '2026-10-15')), 1,
  'the 00:10 IST send is filed on the 15th, though it was still the 14th in UTC');

select t.ok((select (to_email, course_name, branch_name, status, sent_at, delivered_at, sent_by, from_email)
                    = ('priya.r@example.com', 'Yoga Flow', 'Adyar', 'sent',
                       timestamptz '2026-10-14 12:30:05+00', timestamptz '2026-10-14 12:30:09+00',
                       'Staff 72', 'coach@rosifit.in')
               from log72 where message_id = 'ffffffff-7200-0000-0000-0000000000c1'),
  'a delivered message carries its address, course, branch, sender, sent and delivered times');

select t.ok((select (status, bounced_at, bounce_type, delivered_at is null)
                    = ('bounced', timestamptz '2026-10-14 12:31:00+00', 'Permanent', true)
               from log72 where message_id = 'ffffffff-7200-0000-0000-0000000000c2'),
  'a bounced message carries when it bounced and the bounce type');

select t.eq((select count(distinct to_email)::int from log72 where member_name = 'Priya Raman'), 2,
  'two members with one name are two rows with two addresses');

select t.ok((select (status, reason, course_name is null, branch_name is null, sent_at is null)
                    = ('failed', 'Throttling', true, true, true)
               from log72 where message_id = 'ffffffff-7200-0000-0000-0000000000c3'),
  'a failure carries the provider''s reason; a course sent as an em dash reads as no course');

select t.eq((select reason from public.email_log(date '2026-10-15', date '2026-10-15')), 'Unsubscribed',
  'an exclusion carries its exclusion reason');

select t.eq((select count(*)::int from log72 where bounced_at is not null), 1,
  'an event for a message id the log does not hold reaches no row');

-- ----------------------------------------------------- one member, every period
select t.eq((select count(*)::int from public.email_log(p_member_id => 'ffffffff-7200-0000-0000-0000000000a1')), 2,
  'one member''s history spans both sends');

-- --------------------------------------------------------------- paging
select t.eq((select count(*)::int from public.email_log(date '2026-10-14', date '2026-10-14', p_limit => 2)), 2,
  'p_limit bounds a page');
select t.eq((select count(*)::int from public.email_log(date '2026-10-14', date '2026-10-14',
              p_after => (select message_id from public.email_log(date '2026-10-14', date '2026-10-14', p_limit => 2)
                           order by message_id desc limit 1))), 1,
  'p_after continues after the last message id of the page before');

-- ------------------------------------------- what staff could not read before
-- As the active staff member: allowed, and sees the times staff cannot read from email_events.
select t.eq((select count(*)::int from public.email_events), 0,
  'staff cannot read email_events directly (0009 events_read is super admin only)');
select t.eq((select bounced_at from public.email_log(date '2026-10-14', date '2026-10-14')
              where message_id = 'ffffffff-7200-0000-0000-0000000000c2'),
  timestamptz '2026-10-14 12:31:00+00',
  'but an active staff member reads the bounce time through email_log');

-- --------------------------------------------------------------- refusals
select t.rejects($$select * from public.email_log()$$,
  'a call with neither a member nor a period is refused', 'give a member, or a period');
select t.rejects($$select * from public.email_log(date '2026-10-15', date '2026-10-14')$$,
  'a period that ends before it starts is refused', 'before p_from');
-- As the disabled staff member: refused.
set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000722';
select t.rejects($$select * from public.email_log(date '2026-10-14', date '2026-10-14')$$,
  'a disabled user is refused', 'only an active RosiFit user');
reset role;

rollback;
