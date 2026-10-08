\echo 'pin_pepper_version is a credential column: only the service role may change it (0092)'

-- WHAT THIS PINS
--   guard_app_users() (0003) refuses changes to the sensitive app_users columns from anyone but the
--   service role. 0092 adds pin_pepper_version (0091) to that list. Everything else the guard did
--   it still does: the same columns refused, the same 42501 refusal, name and role_label still
--   editable, the service role still trusted.

begin;
insert into auth.users (id) values
  ('51111111-1111-1111-1111-111111111111'),
  ('52222222-2222-2222-2222-222222222222');
insert into public.app_users (auth_user_id, kind, name, phone_e164) values
  ('51111111-1111-1111-1111-111111111111','super_admin','Guard Admin','+919900000051'),
  ('52222222-2222-2222-2222-222222222222','staff','Guard Staff','+919900000052');

select t.ok((select p.prosrc like '%or new.pin_pepper_version is distinct from old.pin_pepper_version then%'
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'guard_app_users'),
  'guard_app_users() names pin_pepper_version (0092)');

-- ------------------------------------------------ a signed-in staff member, on their own row
set local role authenticated;
set local request.jwt.claim.sub = '52222222-2222-2222-2222-222222222222';
select t.rejects($$update public.app_users set pin_pepper_version = 1 where phone_e164 = '+919900000052'$$,
  'staff cannot change their own pin_pepper_version', 'only name and role_label may be changed here');
select t.rejects($$update public.app_users set failed_attempts = 5, locked_until = now() + interval '1 hour' where phone_e164 = '+919900000052'$$,
  'staff still cannot change their own lockout state (existing rule)', 'only name and role_label may be changed here');
select t.rejects($$update public.app_users set is_active = false where phone_e164 = '+919900000052'$$,
  'staff still cannot change is_active (existing rule)', 'only name and role_label may be changed here');
update public.app_users set name = 'Guard Staff Renamed' where phone_e164 = '+919900000052';
select t.eq((select name from public.app_users where phone_e164 = '+919900000052'), 'Guard Staff Renamed',
  'staff can still change their own name');

-- ------------------------------------------------ a signed-in super admin
set local role authenticated;
set local request.jwt.claim.sub = '51111111-1111-1111-1111-111111111111';
select t.rejects($$update public.app_users set pin_pepper_version = 1 where phone_e164 = '+919900000052'$$,
  'a super admin cannot change another account''s pin_pepper_version', 'only name and role_label may be changed here');
select t.rejects($$update public.app_users set pin_pepper_version = 1 where phone_e164 = '+919900000051'$$,
  'a super admin cannot change their own pin_pepper_version', 'only name and role_label may be changed here');
select t.rejects($$update public.app_users set auth_user_id = null where phone_e164 = '+919900000052'$$,
  'a super admin still cannot change auth_user_id (existing rule)', 'only name and role_label may be changed here');
update public.app_users set role_label = 'Front desk' where phone_e164 = '+919900000052';
select t.eq((select role_label from public.app_users where phone_e164 = '+919900000052'), 'Front desk',
  'a super admin can still change role_label');

-- ------------------------------------------------ any other role that is not service_role
reset role;
select t.rejects($$update public.app_users set pin_pepper_version = 1 where phone_e164 = '+919900000052'$$,
  'a role other than service_role (here the harness owner) cannot change pin_pepper_version',
  'only name and role_label may be changed here');

-- ------------------------------------------------ the service role: the Edge Functions
set local role service_role;
update public.app_users
   set pin_pepper_version = 1, failed_attempts = 3, locked_until = now() + interval '5 minutes'
 where phone_e164 = '+919900000052';
reset role;
select t.eq((select pin_pepper_version::int from public.app_users where phone_e164 = '+919900000052'), 1,
  'the service role can change pin_pepper_version');
select t.eq((select failed_attempts::int from public.app_users where phone_e164 = '+919900000052'), 3,
  'the service role can still change the other guarded columns (existing rule)');
rollback;
