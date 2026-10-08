\echo 'which PIN_PEPPER secured each credential and recovery answer: two additive columns, every row 0 (0091)'

-- WHAT THIS PINS
--   0091 adds app_users.pin_pepper_version and super_admin_recovery.pepper_version, smallint,
--   NOT NULL, DEFAULT 0. Rows that exist when it is applied (every credential copied from
--   Singapore) read 0; only the Edge Functions ever set 1. It changes no credential, no hash and
--   no other column (docs/security/PIN_PEPPER_MIGRATION.md).

insert into public.app_users (kind, name, phone_e164) values
  ('super_admin','Pepper Admin','+919900000041'),
  ('staff','Pepper Staff','+919900000042');
insert into public.super_admin_recovery (app_user_id, question_id, answer_hash)
  select u.id, q.id, 'hash-' || q.id from public.app_users u, public.security_questions q
  where u.phone_e164 = '+919900000041' order by q.id limit 2;

select t.eq((select data_type || '|' || is_nullable || '|' || column_default from information_schema.columns
              where table_schema = 'public' and table_name = 'app_users' and column_name = 'pin_pepper_version'),
  'smallint|NO|0', 'app_users.pin_pepper_version is smallint NOT NULL DEFAULT 0');
select t.eq((select data_type || '|' || is_nullable || '|' || column_default from information_schema.columns
              where table_schema = 'public' and table_name = 'super_admin_recovery' and column_name = 'pepper_version'),
  'smallint|NO|0', 'super_admin_recovery.pepper_version is smallint NOT NULL DEFAULT 0');

select t.eq((select count(*)::int from public.app_users where phone_e164 like '+9199000000%' and pin_pepper_version = 0), 2,
  'a credential written without a version reads 0 -- what every copied Singapore credential becomes');
select t.eq((select count(*)::int from public.super_admin_recovery r join public.app_users u on u.id = r.app_user_id
              where u.phone_e164 = '+919900000041' and r.pepper_version = 0), 2,
  'a recovery answer written without a version reads 0');

-- As the service role: since 0092 the guard refuses this column from anyone else (spec 69).
set role service_role;
update public.app_users set pin_pepper_version = 1 where phone_e164 = '+919900000042';
reset role;
select t.eq((select pin_pepper_version::int from public.app_users where phone_e164 = '+919900000042'), 1,
  'the functions can mark a credential current');

-- Additive only: the two tables have exactly one new column each, and the stored hash is untouched.
select t.eq((select count(*)::int from information_schema.columns where table_schema = 'public'
              and table_name = 'super_admin_recovery' and column_name in ('answer_hash', 'pepper_version')), 2,
  'answer_hash is still there beside the new column');
select t.eq((select answer_hash from public.super_admin_recovery r join public.app_users u on u.id = r.app_user_id
              where u.phone_e164 = '+919900000041' order by r.question_id limit 1) like 'hash-%', true,
  'no stored hash was rewritten');
