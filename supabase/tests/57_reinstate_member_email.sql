\echo 'reinstate a suppressed address: a bounce clears, an opt-out never does'
--
-- The defect these cover (requests/2026-09-22-saved-email-not-reflecting.md):
-- a member whose only address had been suppressed read "No usable email" on the
-- card, the Edit form opened with no address at all, the operator retyped the
-- address the academy already holds, and the save reported success having
-- changed nothing. `update_member` finds the row still live, takes its `exists`
-- branch, sets `is_primary`, and never touches `status` -- and NOTHING in this
-- schema had ever cleared a suppression. 0078 is the route back.
--
-- The assertion that matters most is not "did the bounce clear" but "did the
-- OPT-OUT refuse": a bounce is a typo the academy may correct, and an opt-out
-- is the member's own decision. A function that cannot tell them apart would
-- put somebody who asked not to be written to back on the send list.

begin;
  insert into auth.users (id) values ('eeeeeeee-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('eeeeeeee-1111-0000-0000-000000000001',
            'eeeeeeee-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871159');

  insert into public.branches (name, code, city) values ('Reinstate Town','RTN','Reinstate Town');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Reinstate Flow','06:00','07:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00'
      from public.courses c, public.branches b
     where c.name = 'Reinstate Flow' and b.code = 'RTN';
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, '2026-01-01', array[1,3,5]::smallint[]
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Reinstate Flow';
commit;

-- Four members, added the normal way so every address starts at 'unknown' --
-- which is what both RPCs insert, and what reinstatement must return a row to.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.create_member('Bounced Member',
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Reinstate Flow'),
    current_date - 30, array[]::text[], array['bounced.one@example.com']::text[], null);
  select public.create_member('Opted Out Member',
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Reinstate Flow'),
    current_date - 30, array[]::text[], array['optedout.one@example.com']::text[], null);
  select public.create_member('Complained Member',
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Reinstate Flow'),
    current_date - 30, array[]::text[], array['complained.one@example.com']::text[], null);
  select public.create_member('Healthy Member',
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Reinstate Flow'),
    current_date - 30, array[]::text[], array['healthy.one@example.com']::text[], null);
commit;

-- The suppressions, written the way the Edge Functions write them: by address,
-- on the service role, with no RPC involved. That is the point -- these states
-- arrive from outside the app entirely.
begin;
  update public.member_emails set status = 'bounced'     where email = 'bounced.one@example.com';
  update public.member_emails set status = 'unsubscribed' where email = 'optedout.one@example.com';
  update public.member_emails set status = 'complained'  where email = 'complained.one@example.com';
commit;

select t.eq((select status from public.member_emails where email = 'bounced.one@example.com'),
  'bounced', 'the bounce is on the record before anybody tries to clear it');

-- ===================================================== a bounce is cleared
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.reinstate_member_email(
    (select id from public.member_emails where email = 'bounced.one@example.com'));
commit;

select t.eq((select status from public.member_emails where email = 'bounced.one@example.com'),
  'unknown', 'the bounce is cleared to ''unknown'' -- what both RPCs insert, not a ''valid'' nobody verified');

select t.ok((select deleted_at is null from public.member_emails
              where email = 'bounced.one@example.com'),
  'and the row is still live -- reinstating is not re-adding');

select t.eq((select count(*)::int from public.member_emails
              where email = 'bounced.one@example.com'), 1,
  'exactly one row -- reinstating did not insert a second copy of the address');

-- ======================================= A COMPLAINT IS REFUSED TOO
-- NARROWED 22-Sep-2026. The first draft of 0078 cleared a complaint as well,
-- on the reading that it is a judgement SES made about a message. It is not:
-- a complaint is the member clicking "report spam" in their own mail client,
-- which is the member's act exactly as an opt-out is. Nothing in the product
-- ever asked for complaint reinstatement -- before this change `send-followups`
-- had no complaint rule at all -- so allowing it would have been a new policy
-- invented by a bug fix. It stays SUPPRESSED (the conservative half) and is
-- not the academy's to lift.
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.reinstate_member_email(
    (select id from public.member_emails where email = 'complained.one@example.com'));
$$, 'a spam complaint is REFUSED, in its own words -- it is the member''s click, not the academy''s mistake', 'only the member can ask to be written to again');

select t.eq((select status from public.member_emails where email = 'complained.one@example.com'),
  'complained', 'and the refusal changed nothing');

-- ================================================ AN OPT-OUT NEVER CLEARS
-- The one refusal this function exists to make.
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.reinstate_member_email(
    (select id from public.member_emails where email = 'optedout.one@example.com'));
$$, 'an opt-out is REFUSED, in words -- the member said something deliberate', 'only the member can undo that');

select t.eq((select status from public.member_emails where email = 'optedout.one@example.com'),
  'unsubscribed', 'and the refusal changed nothing');

-- ====================================== an address that is not suppressed
-- Refused rather than silently ignored. A call that reports success having
-- changed nothing is the exact defect this whole change exists to end.
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.reinstate_member_email(
    (select id from public.member_emails where email = 'healthy.one@example.com'));
$$, 'a healthy address is refused rather than quietly no-oped', 'not suppressed, so there is nothing to reinstate');

-- ============================================== a removed address is not one
-- On its OWN member, and bounced, so the only reason it can be refused is that
-- it has been removed. Hung on the complained address before the narrowing
-- above, which would now pass for the wrong reason -- a test that cannot fail
-- for the reason it names is not a test.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.create_member('Removed Address Member',
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Reinstate Flow'),
    current_date - 30, array[]::text[], array['removed.one@example.com']::text[], null);
commit;
begin;
  update public.member_emails set status = 'bounced', deleted_at = now()
   where email = 'removed.one@example.com';
commit;

select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.reinstate_member_email(
    (select id from public.member_emails where email = 'removed.one@example.com'));
$$, 'a soft-deleted address cannot be reinstated -- it is not on the record any more', 'not on the member');

-- ============================================================ the audit row
-- CP-2: the row names the acting user, never System or Anonymous.
select t.eq((select count(*)::int from public.audit_logs
              where action = 'member_email.reinstated'), 1,
  'the ONE reinstatement is audited as the ACT, beside the column trigger''s own row -- '
  'and the three refusals wrote no audit row at all, because nothing happened');

select t.eq((select actor_app_user_id from public.audit_logs
              where action = 'member_email.reinstated' order by id desc limit 1),
  'eeeeeeee-1111-0000-0000-000000000001'::uuid,
  'and the audit row names the person who decided, not the system that wrote it');

select t.eq((select p_changes.value ->> 'old' from public.audit_logs a,
               jsonb_array_elements(a.changes) as p_changes
              where a.action = 'member_email.reinstated' order by a.id asc limit 1),
  'bounced', 'the row records WHICH state was cleared, so the log can be read back');

-- ================================================================ the grants
-- RC-042 and RC-052 are this same grant shipped twice.
select t.ok(not has_function_privilege('anon', 'public.reinstate_member_email(uuid)', 'execute'),
  '`anon` cannot execute it -- Supabase grants EXECUTE to anon on every new public function');

select t.ok(has_function_privilege('authenticated', 'public.reinstate_member_email(uuid)', 'execute'),
  'and the role that actually calls it can');

-- ============================================ update_member is NOT restated
-- T-120 measured update_member at 9,625 bytes on production against 11,213 in
-- the replay. 0078 must not carry a body for it: restating a divergent function
-- reverts production to whatever this tree holds (RC-047's mechanism, T-125).
select t.ok(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'reinstate_member_email') = 1,
  'the new function exists, exactly once');
