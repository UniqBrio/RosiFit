\echo 'delete_member: the billing gate, and the posture the function is granted with'
--
-- 0044. delete_member has TWO guards, not one:
--
--     if not public.is_active_app_user()      then raise ...
--     if not public.is_subscription_writable() then raise ...
--
-- 30_delete_member.sql pins the first one from both sides -- anon is refused,
-- a disabled account is refused, an active staff account succeeds. It never
-- touches the second. That is the gap this file closes, and it is not a
-- theoretical one: the guards are separate on purpose (0002 -- a billing gate
-- and a role gate are different questions), and the repository has a branch
-- that exists solely for this refusal:
--
--     if (/not writable/i.test(error.message)) throw new Error(
--       'She could not be removed — the subscription has to be active. ...')
--
-- A message a user reads is only as true as the raise behind it. If the
-- subscription guard were ever dropped from the function -- the easiest thing
-- in the world to lose, since CREATE OR REPLACE means retyping the whole body
-- -- every assertion in 30_delete_member.sql would still pass, the app would
-- go on deleting members off a lapsed subscription, and nothing would say so.
--
-- The other half of this file is the GRANT posture, checked in the catalogue
-- rather than by calling. 30_delete_member.sql proves anon is refused when it
-- calls; this proves anon was never handed EXECUTE in the first place, which
-- is the 0011/0012 posture and the difference between a locked door and a door
-- that happens to be answered by someone who says no.

begin;
  insert into auth.users (id) values
    ('eeeeeeee-0000-0000-0000-000000000001'),
    ('eeeeeeee-0000-0000-0000-000000000002');
  insert into public.app_users (auth_user_id, kind, name, phone_e164) values
    ('eeeeeeee-0000-0000-0000-000000000001','super_admin','Gate Owner','+919994871161'),
    ('eeeeeeee-0000-0000-0000-000000000002','staff','Gate Staff','+919940633876');
  insert into public.branches (name, code, city) values ('Coimbatore','CBE','Coimbatore');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Billing Course','06:00','07:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00','07:00' from public.courses c, public.branches b
     where c.name = 'Billing Course';
  insert into public.members (member_code, full_name, joined_on)
    values ('RF-000960','Billing Member','2026-08-01');
  insert into public.member_enrollments (member_id, offering_id, effective_from)
    select m.id, o.id, '2026-08-01'
      from public.members m, public.course_offerings o
      join public.courses c on c.id = o.course_id
     where m.member_code = 'RF-000960' and c.name = 'Billing Course';
commit;

-- ------------------------------------------------------ the grant posture
select t.ok(not has_function_privilege('anon', 'public.delete_member(uuid)', 'EXECUTE'),
  'anon was never granted EXECUTE on delete_member -- the door is locked, not merely answered');
select t.ok(has_function_privilege('authenticated', 'public.delete_member(uuid)', 'EXECUTE'),
  'authenticated may call it, because that is the role the app signs in as');
select t.ok(has_function_privilege('service_role', 'public.delete_member(uuid)', 'EXECUTE'),
  'and service_role may, which is how a support fix runs without a session');

select t.ok((select p.prosecdef from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'delete_member'),
  'it is SECURITY DEFINER -- which is exactly why it restates the guards itself');
select t.ok((select 'search_path=public' = any(p.proconfig) from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'delete_member'),
  'with search_path pinned, so a definer function cannot be aimed at another schema (0011)');

-- -------------------------------------------------- an EXPIRED subscription
-- Past the expiry date AND past the grace window. Reads go on working; this
-- is a write, so it stops.
begin;
  set local role service_role;
  update public.app_subscription
     set expires_at = current_date - 30, grace_days = 0, status = 'active' where id = 1;
  select t.rejects($$
    set local role authenticated;
    set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000002';
    select public.delete_member((select id from public.members where member_code='RF-000960'))$$,
    'an expired subscription cannot delete a member', 'subscription is not writable');
rollback;

select t.eq((select count(*)::int from public.members
              where member_code='RF-000960' and deleted_at is null), 1,
  'and she is still on the register -- the refusal changed nothing');
select t.eq((select count(*)::int from public.member_enrollments e
              join public.members m on m.id = e.member_id
             where m.member_code='RF-000960' and e.status = 'active'), 1,
  'her enrolment is untouched too, so she is still expected at her sessions');

-- ------------------------------------------------ a SUSPENDED subscription
-- A different branch of subscription_state(): not expired, but stopped. An
-- unpaid invoice and a suspended account fail the same way on purpose.
begin;
  set local role service_role;
  update public.app_subscription
     set expires_at = current_date + 365, status = 'suspended' where id = 1;
  select t.rejects($$
    set local role authenticated;
    set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000002';
    select public.delete_member((select id from public.members where member_code='RF-000960'))$$,
    'a suspended subscription cannot delete a member either, though it has not expired',
    'subscription is not writable');
rollback;

-- ----------------------------------------------------- inside the GRACE window
-- The gate is subscription_state(), not the expiry date. Past expiry but
-- inside grace is still writable, and a member removed on the last day of
-- grace is removed for real -- otherwise the guard would be refusing renewals
-- rather than lapses.
begin;
  set local role service_role;
  update public.app_subscription
     set expires_at = current_date - 3, grace_days = 14, status = 'active' where id = 1;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000002';
  create temp table gate as
  select public.delete_member((select id from public.members where member_code='RF-000960')) as r;
commit;

select t.eq((select r->>'name' from gate), 'Billing Member',
  'inside the grace window the deletion goes through, because grace is writable (0002)');
select t.eq((select count(*)::int from public.members
              where member_code='RF-000960' and deleted_at is null), 0,
  'and it was a real deletion, not a reported one');
