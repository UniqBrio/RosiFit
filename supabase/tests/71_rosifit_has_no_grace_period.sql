\echo 'RosiFit has no grace period: writes stop the day after the end date (0094)'

-- WHAT THIS PINS
--   0094 sets app_subscription.grace_days to 0 and touches nothing else; re-running it changes
--   nothing; and with 0 grace days the day after expires_at is 'expired' (not writable) while the
--   end date itself is still 'active' -- the grace state is no longer reachable.

begin;
select t.eq((select grace_days from public.app_subscription where id = 1), 0::smallint,
  'grace_days is 0 after the replay');

-- ------------------------------------------------ production's row, as read on 12-Oct-2026
update public.app_subscription
   set start_date = date '2026-09-01', expires_at = date '2027-09-24',
       grace_days = 14, status = 'active'
 where id = 1;
create temp table before_0094 on commit drop as
  select customer_name, plan_label, start_date, expires_at, status, renewed_at, renewal_history
    from public.app_subscription where id = 1;

\ir ../migrations/0094_rosifit_has_no_grace_period.sql

select t.eq((select grace_days from public.app_subscription where id = 1), 0::smallint,
  'grace_days moves from 14 to 0');
select t.ok((select (s.customer_name, s.plan_label, s.start_date, s.expires_at, s.status, s.renewed_at, s.renewal_history)
                    is not distinct from (b.customer_name, b.plan_label, b.start_date, b.expires_at, b.status, b.renewed_at, b.renewal_history)
               from public.app_subscription s, before_0094 b where s.id = 1),
  'customer, plan, dates, status, renewed_at and renewal_history are untouched');

\ir ../migrations/0094_rosifit_has_no_grace_period.sql
select t.eq((select grace_days from public.app_subscription where id = 1), 0::smallint,
  're-running 0094 is a no-op');

-- With no grace, the end date is the last writable day and the next day is expired.
update public.app_subscription set expires_at = public.business_today() where id = 1;
select t.eq(public.subscription_state(), 'active', 'the end date itself is still active');
select t.ok(public.is_subscription_writable(), 'and still writable');
update public.app_subscription set expires_at = public.business_today() - 1 where id = 1;
select t.eq(public.subscription_state(), 'expired', 'the day after the end date is expired, not grace');
select t.ok(not public.is_subscription_writable(), 'and writes stop');
rollback;
