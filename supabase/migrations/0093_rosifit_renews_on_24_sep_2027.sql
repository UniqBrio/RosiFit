-- 0093: RosiFit's subscription ends on 24 Sep 2027 -- the next renewal date.
-- requests/2026-10-12-subscription-section.md
--
-- WHY. The repo owner set the academy's end date to 24 Sep 2027 (12-Oct-2026). Production's row
-- read expires_at 2027-09-01 on 06-Oct-2026 (docs/PRE_DEPLOYMENT_REVIEW_2026-10-06.md).
--
-- WHAT. One column on the singleton row: expires_at. start_date, grace_days, status and plan are
-- untouched. The previous end date is appended to renewal_history, so the change can be traced
-- from the row itself (no audit trigger covers app_subscription).
--
-- SAFETY. It only ever moves the end date LATER than 01-Sep-2027 or leaves it alone: a row whose
-- end date is already 2027-09-24 is not touched (re-runnable), and a missing row stops the
-- migration rather than inserting one. subscription_state() reads the new date at once; nothing
-- that is writable today becomes read-only.

do $mig$
declare
  v_old date;
begin
  select expires_at into v_old from public.app_subscription where id = 1;
  if not found then
    raise exception '0093: app_subscription row 1 is missing -- nothing changed';
  end if;

  if v_old = date '2027-09-24' then
    raise notice '0093: expires_at is already 2027-09-24 -- nothing to do';
    return;
  end if;

  update public.app_subscription
     set expires_at      = date '2027-09-24',
         renewal_history = renewal_history || jsonb_build_array(jsonb_build_object(
                             'changed_at',      now(),
                             'expires_at_from', v_old,
                             'expires_at_to',   date '2027-09-24',
                             'source',          '0093_rosifit_renews_on_24_sep_2027'))
   where id = 1;
  raise notice '0093: expires_at % -> 2027-09-24', v_old;
end
$mig$;
