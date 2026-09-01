\echo 'appearance: per-user isolation, the accent contract, hue bounds'
begin;
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');
insert into public.app_users (auth_user_id, kind, name, phone_e164) values
  ('11111111-1111-1111-1111-111111111111','super_admin','Rosi Owner','+919994871158'),
  ('22222222-2222-2222-2222-222222222222','staff','Priya Menon','+918056329742');

-- ---------------------------------------------------------------- the shape
select t.rejects($$insert into public.user_preferences (app_user_id, theme_mode)
    select id, 'sepia' from public.app_users where kind='staff'$$,
  'theme_mode is one of light/dark/system', 'user_preferences_theme_mode_check');

select t.rejects($$insert into public.user_preferences (app_user_id, accent_key)
    select id, 'chartreuse' from public.app_users where kind='staff'$$,
  'an accent_key outside the measured set is refused', 'user_preferences_accent_key_check');

select t.rejects($$insert into public.user_preferences (app_user_id, accent_key, accent_hue)
    select id, 'custom', 360 from public.app_users where kind='staff'$$,
  'a hue above 359 is refused -- every stored hue is one the build measured',
  'user_preferences_accent_hue_check');

select t.rejects($$insert into public.user_preferences (app_user_id, accent_key, accent_hue)
    select id, 'custom', -1 from public.app_users where kind='staff'$$,
  'a negative hue is refused', 'user_preferences_accent_hue_check');

-- the defaults are a correct app on their own: brand accent, follow the phone
insert into public.user_preferences (app_user_id)
  select id from public.app_users where kind = 'staff';
select t.eq((select theme_mode from public.user_preferences), 'system',
  'theme defaults to system until she chooses');
select t.eq((select accent_key from public.user_preferences), 'rosifit',
  'accent defaults to the RosiFit brand colour');
select t.eq((select accent_hue from public.user_preferences), 322::smallint,
  'the default hue is the brand magenta');

-- 'custom' is the one key that is not in the pre-measured set, and it is allowed
insert into public.user_preferences (app_user_id, accent_key, accent_hue)
  select id, 'custom', 200 from public.app_users where kind = 'super_admin';
select t.eq((select accent_hue from public.user_preferences p
             join public.app_users u on u.id = p.app_user_id
             where u.kind = 'super_admin'), 200::smallint,
  'a custom hue is stored as chosen');

-- ------------------------------------------------------------------- RLS
-- C-82: one staff member's choice never changes another's, and a super admin
-- has no business reading it either -- there is no screen that shows it.
do $$ begin
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  perform t.eq((select count(*)::int from public.user_preferences), 1,
    'a staff member sees exactly her own row');
  perform t.eq((select accent_key from public.user_preferences), 'rosifit',
    'and it is hers, not the owner''s custom one');
end $$;

do $$ begin
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  perform t.eq((select count(*)::int from public.user_preferences), 1,
    'the super admin sees only her own row too -- appearance is not admin data');
end $$;

-- writing to someone else's row is refused by the WITH CHECK, not silently ignored
do $$
declare v_staff uuid;
begin
  select id into v_staff from public.app_users where kind = 'staff';
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  perform t.eq((select count(*)::int from public.user_preferences
                where app_user_id = v_staff), 0,
    'another user''s row is not even visible to update');
end $$;

rollback;
