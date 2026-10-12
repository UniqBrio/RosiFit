\echo 'RosiFit subscription ends on 24 Sep 2027, and both roles can read it (0093)'

-- WHAT THIS PINS
--   0093 sets app_subscription.expires_at to 2027-09-24 and records the previous date in
--   renewal_history, touching nothing else; re-running it changes nothing; the state every write
--   gate reads follows the new date; and a signed-in staff member and super admin can both READ
--   the row the More > Subscription screen shows, but neither can change it.

begin;
select t.eq((select expires_at from public.app_subscription where id = 1), date '2027-09-24',
  'expires_at is 24 Sep 2027 after 0093');
select t.eq((select grace_days from public.app_subscription where id = 1), 14::smallint,
  'grace_days is untouched');
select t.eq((select status from public.app_subscription where id = 1), 'active',
  'status is untouched');
select t.eq((select jsonb_array_length(renewal_history) from public.app_subscription where id = 1), 1,
  'the previous end date is recorded once in renewal_history');
select t.eq((select renewal_history->0->>'expires_at_to' from public.app_subscription where id = 1), '2027-09-24',
  'the history entry names the new end date');

-- Re-running the migration is a no-op: no second history entry.
\i supabase/migrations/0093_rosifit_renews_on_24_sep_2027.sql
select t.eq((select jsonb_array_length(renewal_history) from public.app_subscription where id = 1), 1,
  're-running 0093 adds nothing');

-- The derived state follows the stored date.
select t.eq(public.subscription_state(), 'active', 'subscription_state() is active today');

insert into auth.users (id) values
  ('71111111-1111-1111-1111-111111111111'),
  ('72222222-2222-2222-2222-222222222222');
insert into public.app_users (auth_user_id, kind, name, phone_e164) values
  ('71111111-1111-1111-1111-111111111111','super_admin','Sub Admin','+919900000071'),
  ('72222222-2222-2222-2222-222222222222','staff','Sub Staff','+919900000072');

-- ------------------------------------------------ a signed-in staff member
set local role authenticated;
set local request.jwt.claim.sub = '72222222-2222-2222-2222-222222222222';
select t.eq((select expires_at from public.app_subscription where id = 1), date '2027-09-24',
  'staff can read the end date');
select t.eq(public.subscription_state(), 'active', 'staff can read the derived state');
select t.rejects($$update public.app_subscription set expires_at = date '2099-01-01' where id = 1$$,
  'staff cannot change the end date', 'permission denied');

-- ------------------------------------------------ a signed-in super admin
set local role authenticated;
set local request.jwt.claim.sub = '71111111-1111-1111-1111-111111111111';
select t.eq((select expires_at from public.app_subscription where id = 1), date '2027-09-24',
  'the super admin can read the end date');
select t.rejects($$update public.app_subscription set expires_at = date '2099-01-01' where id = 1$$,
  'the super admin cannot change the end date from the client', 'permission denied');
rollback;
