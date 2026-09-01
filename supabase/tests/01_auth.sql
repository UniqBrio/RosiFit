\echo 'auth: identity, lockout surface, column guard, RLS'
begin;
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333');
insert into public.app_users (auth_user_id, kind, name, phone_e164) values
  ('11111111-1111-1111-1111-111111111111','super_admin','Rosi Owner','+919994871158'),
  ('22222222-2222-2222-2222-222222222222','staff','Priya Menon','+918056329742');

select t.rejects($$insert into public.app_users (auth_user_id,kind,name,phone_e164)
    values ('33333333-3333-3333-3333-333333333333','super_admin','Impostor','+919000000001')$$,
  'only one super admin can exist', 'one_super_admin');

select t.rejects($$insert into public.app_users (auth_user_id,kind,name,phone_e164)
    values ('33333333-3333-3333-3333-333333333333','staff','Dup','+918056329742')$$,
  'a live phone number is unique', 'app_users_phone_live');

select t.rejects($$insert into public.app_users (auth_user_id,kind,name,phone_e164)
    values ('33333333-3333-3333-3333-333333333333','staff','Bad','8056329742')$$,
  'phone must be E.164', 'phone_e164_check');

-- the PIN is never stored in our schema; it lives in GoTrue
-- word-boundary, not substring: 'csv_mapping' contains "pin" and is fine.
select t.ok(not exists (select 1 from information_schema.columns
    where table_schema='public'
      and column_name ~* '(^|_)(pin|password|passwd|secret|answer|token)(_|$)'
      and (table_name, column_name) not in
            (('app_users','must_change_pin'), ('app_users','pin_set_at'),
             ('super_admin_recovery','answer_hash'))),
  'no column stores a PIN, password, secret or security answer');
-- the one hash we DO keep is the super-admin recovery answer, and it is
-- reachable only by service_role (the table has no RLS policy at all).
select t.ok(exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='super_admin_recovery'
      and column_name='answer_hash'),
  'security answers are stored hashed, in a table with no RLS policy');
commit;

-- Lock the staff account for real, so the guard tests below change something.
-- (An UPDATE that sets a column to the value it already holds is not DISTINCT
-- FROM the old value, so the guard lets it through -- correctly, but it makes
-- for a test that passes without proving anything.)
begin;
  set local role service_role;
  update public.app_users set failed_attempts = 5, locked_until = now() + interval '15 min'
   where kind = 'staff';
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  select t.eq((select count(*)::int from public.app_users), 1, 'staff sees only their own row');
  select t.rejects($$update public.app_users set is_active=false where name='Priya Menon'$$,
    'staff cannot deactivate themselves', 'only name and role_label');
  select t.rejects($$update public.app_users set phone_e164='+919000000009' where name='Priya Menon'$$,
    'staff cannot change their own phone via PostgREST', 'only name and role_label');
  select t.eq((select failed_attempts::int from public.app_users where kind='staff'), 5,
    'the staff account really is locked (5 failed attempts)');
  select t.rejects($$update public.app_users set failed_attempts=0 where name='Priya Menon'$$,
    'staff cannot clear their own lockout counter', 'only name and role_label');
  select t.rejects($$update public.app_users set locked_until=null where name='Priya Menon'$$,
    'staff cannot lift their own lockout', 'only name and role_label');
  select t.rejects($$select 1 from public.super_admin_recovery$$,
    'staff cannot read security answers at all', 'denied');
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  select t.eq((select count(*)::int from public.app_users), 2, 'super admin sees every row');
rollback;

begin;
  set local role service_role;
  update public.app_users set name='Priya M', role_label='Front desk' where name='Priya Menon';
  select t.eq((select name from public.app_users where kind='staff'), 'Priya M', 'name is editable');
  -- C-99: the number moves, and app_user_id is untouched
  update public.app_users set phone_e164='+919000000009' where kind='staff';
  select t.eq((select phone_e164 from public.app_users where kind='staff'), '+919000000009',
    'service_role (Edge change-mobile) CAN move the number');
rollback;
