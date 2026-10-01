\echo 'resubscribe recovery: staff turn follow-ups back on, and re-entering an address is no way round an opt-out'
--
-- 0084. Three things are pinned here:
--   * the prior-status rule reads the row audit every writer produces, so a
--     link opt-out and Gmail's one-click opt-out answer the same way;
--   * "Turn Follow-ups Back On" is a signed-in user's act, needs a source,
--     is audited with member, address, old/new, actor and source, and never
--     lifts a bounce or a spam report;
--   * removing an opted-out address and typing it back in does not make it
--     sendable, on the same member or on another.

begin;
  insert into auth.users (id) values
    ('abab0000-0000-0000-0000-000000000001'),
    ('abab0000-0000-0000-0000-000000000002'),
    ('abab0000-0000-0000-0000-000000000003'),
    ('abab0000-0000-0000-0000-000000000004');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164, is_active)
    values ('abab1111-0000-0000-0000-000000000001', 'abab0000-0000-0000-0000-000000000001',
            'super_admin', 'Recovery Owner', '+919990000101', true),
           ('abab1111-0000-0000-0000-000000000002', 'abab0000-0000-0000-0000-000000000002',
            'staff', 'Recovery Staff', '+919990000102', true),
           ('abab1111-0000-0000-0000-000000000003', 'abab0000-0000-0000-0000-000000000003',
            'staff', 'Former Staff', '+919990000103', false);
  -- abab...004 is a signed-in auth user with no app_user at all.

  insert into public.branches (name, code, city) values ('Recovery Town','RCV','Recovery Town');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Recovery Flow','06:00','07:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00' from public.courses c, public.branches b
     where c.name = 'Recovery Flow' and b.code = 'RCV';
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, '2026-01-01', array[1,3,5]::smallint[]
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Recovery Flow';
  -- A second course: an address may sit on two members only across courses (0071).
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Recovery Two','08:00','09:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '08:00', '09:00' from public.courses c, public.branches b
     where c.name = 'Recovery Two' and b.code = 'RCV';
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, '2026-01-01', array[2,4]::smallint[]
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Recovery Two';
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000001';
  select public.create_member(m.name,
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Flow'),
    current_date - 30, array[]::text[], array[m.email]::text[], null)
    from (values
      ('Opted Out Member',    'optout@example.com'),
      ('One Click Member',    'oneclick@example.com'),
      ('Bounced Member',      'bounce@example.com'),
      ('Complained Member',   'spam@example.com'),
      ('Spam Then Opt Out',   'spamthenout@example.com'),
      ('Re Entry Member',     'reentry@example.com'),
      ('Other Source Member', 'other@example.com')) m(name, email);
commit;

-- The opt-outs, written exactly as the unsubscribe Edge Function writes them:
-- service role, the status update, then audit_log_anon. 'link' and
-- 'one_click' are the same write; only the metadata differs.
begin;
  set local role service_role;
  update public.member_emails set status = 'unsubscribed'
   where email in ('optout@example.com', 'oneclick@example.com', 'reentry@example.com', 'other@example.com');
  select public.audit_log_anon('communication.unsubscribed', 'member_email', id::text,
           jsonb_build_array(jsonb_build_object('field','status','old','unknown','new','unsubscribed')),
           jsonb_build_object('member_id', member_id,
             'via', case when email = 'oneclick@example.com' then 'one_click' else 'link' end))
    from public.member_emails
   where email in ('optout@example.com', 'oneclick@example.com', 'reentry@example.com', 'other@example.com');
  update public.member_emails set status = 'bounced'    where email = 'bounce@example.com';
  update public.member_emails set status = 'complained' where email in ('spam@example.com', 'spamthenout@example.com');
  update public.member_emails set status = 'unsubscribed' where email = 'spamthenout@example.com';
commit;

-- ================================================ the prior-status rule
select t.eq((select public.email_status_before_opt_out(id) from public.member_emails
              where email = 'oneclick@example.com'),
  'unknown', 'a one-click opt-out reads its prior status from the row audit, same as a link opt-out');
select t.eq((select public.email_status_before_opt_out(id) from public.member_emails
              where email = 'spamthenout@example.com'),
  'complained', 'an opt-out made on top of a spam report remembers the report');
select t.eq(public.email_status_before_opt_out('00000000-0000-0000-0000-00000000dead'),
  null::text, 'no audit row: null, and nothing is invented');
select t.ok(not has_function_privilege('anon', 'public.email_status_before_opt_out(uuid)', 'execute'),
  'anon cannot read anybody''s opt-out history');
select t.ok(not has_function_privilege('authenticated', 'public.email_status_before_opt_out(uuid)', 'execute'),
  'nor can a signed-in user call it directly -- it is the service role''s');

-- ============================================== who may turn follow-ups back on
select t.ok(not has_function_privilege('anon', 'public.staff_resubscribe_member_email(uuid, text, text)', 'execute'),
  'anon cannot execute staff_resubscribe_member_email');

select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000003';
  select public.staff_resubscribe_member_email(
    (select id from public.member_emails where email = 'optout@example.com'), 'phone', null);
$$, 'a deactivated staff user is refused', 'only a signed-in, active user');

select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000004';
  select public.staff_resubscribe_member_email(
    (select id from public.member_emails where email = 'optout@example.com'), 'phone', null);
$$, 'a signed-in account with no app user is refused', 'only a signed-in, active user');

select t.eq((select status from public.member_emails where email = 'optout@example.com'),
  'unsubscribed', 'and neither refusal changed the address');

-- ============================================================== the inputs
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.staff_resubscribe_member_email(
    (select id from public.member_emails where email = 'optout@example.com'), 'carrier pigeon', null);
$$, 'a source outside the list is refused', 'choose how the member asked');

select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.staff_resubscribe_member_email(
    (select id from public.member_emails where email = 'other@example.com'), 'other', '   ');
$$, '"Other" with a blank note is refused', 'add a note');

select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.staff_resubscribe_member_email('00000000-0000-0000-0000-00000000dead', 'phone', null);
$$, 'an id that is no address on any member is refused', 'not on the member''s record');

-- ======================================================== the act itself
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select t.eq(public.staff_resubscribe_member_email(
    (select id from public.member_emails where email = 'oneclick@example.com'),
    'WhatsApp', '  Asked on the class group  '), 'resubscribed',
    'staff turn follow-ups back on for an address Gmail''s one-click opted out');
commit;

select t.eq((select status from public.member_emails where email = 'oneclick@example.com'),
  'unknown', 'the address is subscribed again -- ''unknown'', as 0078 and every new address');

select t.eq((select count(*)::int from public.audit_logs
              where action = 'communication.staff_resubscribe'
                and entity_id = (select id::text from public.member_emails where email = 'oneclick@example.com')),
  1, 'exactly one communication.staff_resubscribe row');

select t.ok((select a.actor_app_user_id = 'abab1111-0000-0000-0000-000000000002'
                and a.actor_kind = 'staff'
                and a.occurred_at is not null
                and a.changes = jsonb_build_array(jsonb_build_object('field','status','old','unsubscribed','new','unknown'))
                and a.metadata->>'member_id' = e.member_id::text
                and a.metadata->>'email' = 'oneclick@example.com'
                and a.metadata->>'source' = 'whatsapp'
                and a.metadata->>'note' = 'Asked on the class group'
               from public.audit_logs a
               join public.member_emails e on e.id::text = a.entity_id
              where a.action = 'communication.staff_resubscribe'
                and e.email = 'oneclick@example.com'),
  'the audit row names the staff user, the time, member, address, old and new status, source and note');

-- A second press: no write, no second row.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000001';
  select t.eq(public.staff_resubscribe_member_email(
    (select id from public.member_emails where email = 'oneclick@example.com'), 'phone', null),
    'already', 'a duplicate request answers ''already''');
commit;
select t.eq((select count(*)::int from public.audit_logs
              where action = 'communication.staff_resubscribe'
                and entity_id = (select id::text from public.member_emails where email = 'oneclick@example.com')),
  1, 'and writes no second audit row');

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select t.eq(public.staff_resubscribe_member_email(
    (select id from public.member_emails where email = 'other@example.com'), 'other', 'Told the front desk'),
    'resubscribed', '"Other" with a note is accepted');
commit;

-- ============================================== never a bounce or a spam report
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.staff_resubscribe_member_email(
    (select id from public.member_emails where email = 'bounce@example.com'), 'phone', null);
$$, 'a bounced address is refused -- a bounce is not an opt-out', 'bounced');

select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.staff_resubscribe_member_email(
    (select id from public.member_emails where email = 'spam@example.com'), 'phone', null);
$$, 'a spam-reported address is refused', 'was marked as spam, so');

select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.staff_resubscribe_member_email(
    (select id from public.member_emails where email = 'spamthenout@example.com'), 'phone', null);
$$, 'an opt-out on top of a spam report is refused too', 'was marked as spam, so');

select t.eq((select string_agg(status, ',' order by email) from public.member_emails
              where email in ('bounce@example.com', 'spam@example.com', 'spamthenout@example.com')),
  'bounced,complained,unsubscribed', 'and every refusal left its address exactly as it was');

-- ============================================ no way round it through Edit
-- Remove the opted-out address, save, type it back in, save.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.update_member(m.id, m.full_name,
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Flow'),
    array[]::text[], array[]::text[], null)
    from public.members m where m.full_name = 'Re Entry Member';
commit;
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.update_member(m.id, m.full_name,
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Flow'),
    array[]::text[], array['ReEntry@Example.com']::text[], null)
    from public.members m where m.full_name = 'Re Entry Member';
commit;

select t.eq((select count(*)::int from public.member_emails
              where lower(email::text) = 'reentry@example.com'), 2,
  'the removal and the re-entry both happened: the old row removed, a new row inserted');
select t.eq((select status from public.member_emails
              where lower(email::text) = 'reentry@example.com' and deleted_at is null),
  'unsubscribed', 're-entering an opted-out address in Edit (any case) keeps it unsubscribed');

-- The same address on a brand-new member.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.create_member('Second Record',
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Two'),
    current_date - 1, array[]::text[], array['spam@example.com']::text[], null);
commit;
select t.eq((select e.status from public.member_emails e join public.members m on m.id = e.member_id
              where m.full_name = 'Second Record' and e.deleted_at is null),
  'complained', 'a spam-reported address added to another member arrives suppressed');

-- After staff turned it back on, the address's latest word is "send": a
-- re-entry then is ordinary and starts 'unknown'.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.create_member('Third Record',
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Two'),
    current_date - 1, array[]::text[], array['oneclick@example.com']::text[], null);
commit;
select t.eq((select e.status from public.member_emails e join public.members m on m.id = e.member_id
              where m.full_name = 'Third Record' and e.deleted_at is null),
  'unknown', 'an address staff turned back on is sendable when added again');

-- A bounce is not carried: it is the mail system's, not the member's word.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.create_member('Fourth Record',
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Two'),
    current_date - 1, array[]::text[], array['bounce@example.com']::text[], null);
commit;
select t.eq((select e.status from public.member_emails e join public.members m on m.id = e.member_id
              where m.full_name = 'Fourth Record' and e.deleted_at is null),
  'unknown', 'a bounced address re-added starts ''unknown'' -- bounces are not carried');

-- A plain new address is untouched by the trigger.
select t.eq((select status from public.member_emails where email = 'optout@example.com'),
  'unsubscribed', 'the untouched opt-out is still an opt-out');

-- =====================================================================
-- Appended after review (code-reviewer, permission-reviewer, 01-Oct-2026).
-- =====================================================================

-- ------------------------------------------ the RPC's own path, the carried row
select t.eq((select public.email_status_before_opt_out(id) from public.member_emails
              where lower(email::text) = 'reentry@example.com' and deleted_at is null),
  'unknown', 'a carried row with no history of its own reads the same member''s earlier opt-out');
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select t.eq(public.staff_resubscribe_member_email(
    (select id from public.member_emails where lower(email::text) = 'reentry@example.com' and deleted_at is null),
    'phone', null), 'resubscribed', 'and staff can turn a carried opt-out back on when the member asks');
commit;

-- ---------------------------------------------- refusals the review asked for

begin;
  set local role service_role;
  update public.app_subscription set expires_at = current_date + 365, status = 'suspended' where id = 1;
  select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
    select public.staff_resubscribe_member_email(
      (select id from public.member_emails where email = 'optout@example.com'), 'phone', null)$$,
    'a suspended subscription refuses it', 'subscription is not writable');
rollback;

begin;
  set local role service_role;
  update public.member_emails set deleted_at = now() where email = 'optout@example.com';
  select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
    select public.staff_resubscribe_member_email(
      (select id from public.member_emails where email = 'optout@example.com'), 'phone', null)$$,
    'a removed address is refused', 'not on the member''s record');
rollback;

-- An opt-out on top of a BOUNCE: the member's button refuses it, so staff do too.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000001';
  select public.create_member('Bounce Then Out', (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Flow'),
    current_date - 30, array[]::text[], array['bouncethenout@example.com']::text[], null);
commit;
begin;
  set local role service_role;
  update public.member_emails set status = 'bounced'      where email = 'bouncethenout@example.com';
  update public.member_emails set status = 'unsubscribed' where email = 'bouncethenout@example.com';
commit;
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.staff_resubscribe_member_email(
    (select id from public.member_emails where email = 'bouncethenout@example.com'), 'phone', null);
$$, 'an opt-out made on top of a bounce is refused', 'bounced before the member unsubscribed');

-- ------------------------------- a spam report on ANOTHER member's copy (H3b)
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000001';
  select public.create_member('Sibling One', (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Flow'),
    current_date - 30, array[]::text[], array['sibling@example.com']::text[], null);
  select public.create_member('Sibling Two', (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Two'),
    current_date - 30, array[]::text[], array['sibling@example.com']::text[], null);
commit;
begin;
  set local role service_role;
  update public.member_emails e set status = 'unsubscribed'
    from public.members m where m.id = e.member_id and m.full_name = 'Sibling One';
  update public.member_emails e set status = 'complained'
    from public.members m where m.id = e.member_id and m.full_name = 'Sibling Two';
commit;
select t.eq((select public.email_status_before_opt_out(e.id) from public.member_emails e
              join public.members m on m.id = e.member_id where m.full_name = 'Sibling One'),
  'complained', 'a spam report on the other course''s copy is the answer for this copy too');
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.staff_resubscribe_member_email(
    (select e.id from public.member_emails e join public.members m on m.id = e.member_id
      where m.full_name = 'Sibling One'), 'phone', null);
$$, 'staff cannot lift it by turning the opted-out copy back on', 'was marked as spam');

-- ------------------- an opt-out that hid a spam report, removed and re-added (M3)
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.update_member(m.id, m.full_name, (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Flow'), array[]::text[], array[]::text[], null)
    from public.members m where m.full_name = 'Spam Then Opt Out';
commit;
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.update_member(m.id, m.full_name, (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Flow'), array[]::text[],
           array['spamthenout@example.com']::text[], null)
    from public.members m where m.full_name = 'Spam Then Opt Out';
commit;
select t.eq((select status from public.member_emails
              where email = 'spamthenout@example.com' and deleted_at is null),
  'complained', 're-entered, it arrives as the spam report it was hiding');

-- ------------------- the latest word is the member's own, not the last save (M4a)
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000001';
  select public.create_member('Order A', (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Flow'),
    current_date - 30, array[]::text[], array['order@example.com']::text[], null);
  select public.create_member('Order B', (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Two'),
    current_date - 30, array[]::text[], array['order@example.com']::text[], null);
commit;
begin;
  set local role service_role;
  update public.member_emails e set status = 'unsubscribed'
    from public.members m where m.id = e.member_id and m.full_name = 'Order A';
commit;
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.update_member(m.id, m.full_name, (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Flow'), array[]::text[], array[]::text[], null)
    from public.members m where m.full_name = 'Order A';
commit;
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  -- an unrelated save of the other course's member bumps its row's updated_at
  select public.update_member(m.id, m.full_name, (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Two'), array['Order Bee']::text[],
           array['order@example.com']::text[], null)
    from public.members m where m.full_name = 'Order B';
commit;
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.update_member(m.id, m.full_name, (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Flow'), array[]::text[],
           array['order@example.com']::text[], null)
    from public.members m where m.full_name = 'Order A';
commit;
select t.eq((select e.status from public.member_emails e join public.members m on m.id = e.member_id
              where m.full_name = 'Order A' and e.deleted_at is null),
  'unsubscribed', 'a save of another member in between does not make the re-entered copy sendable');
select t.eq((select e.status from public.member_emails e join public.members m on m.id = e.member_id
              where m.full_name = 'Order B' and e.deleted_at is null),
  'unknown', 'and the other course''s copy stays subscribed -- an opt-out is per course (0071)');

-- --------------------------------- per course: a new member elsewhere is not carried
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000001';
  select public.create_member('Optout Elsewhere', (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Recovery Two'),
    current_date - 1, array[]::text[], array['optout@example.com']::text[], null);
commit;
select t.eq((select e.status from public.member_emails e join public.members m on m.id = e.member_id
              where m.full_name = 'Optout Elsewhere' and e.deleted_at is null),
  'unknown', 'an opt-out from one course is not carried to a member of another course (0071)');

-- ------------------------------------------ no way round it through PostgREST
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  update public.member_emails set status = 'unknown' where email = 'optout@example.com';
$$, 'a signed-in user cannot PATCH an opt-out away', 'changed only through the member form');
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  update public.member_emails set status = 'unknown' where email = 'spam@example.com';
$$, 'nor a spam report', 'changed only through the member form');
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  update public.member_emails set email = 'optout@example.com'
   where email = 'other@example.com';
$$, 'nor rename a sendable row onto an opted-out address', 'changed only through the member form');
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  update public.member_emails set deleted_at = null
   where lower(email::text) = 'reentry@example.com' and deleted_at is not null;
$$, 'nor bring a removed row back', 'changed only through the member form');
select t.eq((select e.status from public.member_emails e join public.members m on m.id = e.member_id
              where m.full_name = 'Opted Out Member' and e.deleted_at is null),
  'unsubscribed', 'and the opt-out is untouched');

-- ------------------------------------------------------ audit rows are not forged
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'abab0000-0000-0000-0000-000000000002';
  select public.audit_log('member_email.update', 'member_email',
    (select id::text from public.member_emails where email = 'spamthenout@example.com' and deleted_at is null),
    '[{"field":"status","old":"unknown","new":"unsubscribed"}]'::jsonb);
$$, 'a signed-in user cannot write an audit row that would forge an opt-out''s history', 'permission denied');
