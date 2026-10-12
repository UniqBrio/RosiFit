\echo 'RosiFit subscription ends on 24 Sep 2027, and both roles can read it (0093)'

-- WHAT THIS PINS
--   0093 moves app_subscription.expires_at from production's 2027-09-01 to 2027-09-24, records
--   the previous date in renewal_history and touches nothing else; any other starting date is
--   left alone (so the harness's rolling default stays rolling); re-running it changes nothing;
--   the state every write gate reads follows the new date; and a signed-in staff member and
--   super admin can both READ the row the More > Subscription screen shows, but neither can
--   change it.

begin;
-- ------------------------------------------------ the harness row is not production's: untouched
select t.eq((select expires_at from public.app_subscription where id = 1), current_date + 365,
  'a starting date other than 2027-09-01 is left alone');
select t.eq((select jsonb_array_length(renewal_history) from public.app_subscription where id = 1), 0,
  'and nothing is recorded for it');

-- ------------------------------------------------ production's row, as read on 06-Oct-2026
update public.app_subscription
   set start_date = date '2026-09-01', expires_at = date '2027-09-01',
       grace_days = 14, status = 'active', renewal_history = '[]'::jsonb
 where id = 1;
create temp table before_0093 on commit drop as
  select customer_name, plan_label, start_date, grace_days, status, renewed_at
    from public.app_subscription where id = 1;

\ir ../migrations/0093_rosifit_renews_on_24_sep_2027.sql

select t.eq((select expires_at from public.app_subscription where id = 1), date '2027-09-24',
  'expires_at moves from 2027-09-01 to 2027-09-24');
select t.ok((select (s.customer_name, s.plan_label, s.start_date, s.grace_days, s.status, s.renewed_at)
                    is not distinct from (b.customer_name, b.plan_label, b.start_date, b.grace_days, b.status, b.renewed_at)
               from public.app_subscription s, before_0093 b where s.id = 1),
  'customer, plan, start date, grace days, status and renewed_at are untouched');
select t.eq((select jsonb_array_length(renewal_history) from public.app_subscription where id = 1), 1,
  'the previous end date is recorded once in renewal_history');
select t.eq((select renewal_history->0->>'expires_at_from' from public.app_subscription where id = 1), '2027-09-01',
  'the history entry names the old end date');
select t.eq((select renewal_history->0->>'expires_at_to' from public.app_subscription where id = 1), '2027-09-24',
  'the history entry names the new end date');

\ir ../migrations/0093_rosifit_renews_on_24_sep_2027.sql
select t.eq((select jsonb_array_length(renewal_history) from public.app_subscription where id = 1), 1,
  're-running 0093 adds nothing');

-- The derived state follows the stored date, on whatever day the suite runs.
select t.eq(public.subscription_state(),
  case when public.business_today() <= date '2027-09-24' then 'active'
       when public.business_today() <= date '2027-10-08' then 'grace'
       else 'expired' end,
  'subscription_state() follows the new end date and its 14 grace days');

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
select t.ok(public.subscription_state() is not null, 'staff can read the derived state');
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
