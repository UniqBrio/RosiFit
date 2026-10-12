-- 0093: RosiFit's subscription ends on 24 Sep 2027 -- the next renewal date.
-- requests/2026-10-12-subscription-section.md
--
-- WHY. The repo owner set the academy's end date to 24 Sep 2027 (12-Oct-2026). Production's row
-- read expires_at 2027-09-01 on 06-Oct-2026 (docs/PRE_DEPLOYMENT_REVIEW_2026-10-06.md).
--
-- WHAT. One column on the singleton row: expires_at. start_date, grace_days, status, plan and
-- renewed_at are untouched. The previous end date is appended to renewal_history, so the change
-- can be traced from the row itself (no audit trigger covers app_subscription).
--
-- SAFETY. It moves the date ONLY from the value production was read at, 2027-09-01:
--   * already 2027-09-24  -> nothing to do (re-runnable);
--   * any other date      -> left alone, with a notice naming what was found. A row renewed by
--                            hand since 06-Oct-2026 must not be shortened, and the harness's own
--                            rolling default (0002: current_date + 365) must stay rolling;
--   * no row              -> stops, inserts nothing;
--   * the update must hit exactly one row, or it stops.
-- Read the production row immediately before applying (CLAUDE.md: data that already exists).

do $mig$
declare
  v_old date;
  v_n   int;
begin
  select expires_at into v_old from public.app_subscription where id = 1;
  if not found then
    raise exception '0093: app_subscription row 1 is missing -- nothing changed';
  end if;

  if v_old = date '2027-09-24' then
    raise notice '0093: expires_at is already 2027-09-24 -- nothing to do';
    return;
  end if;

  if v_old <> date '2027-09-01' then
    raise notice '0093: expires_at is %, not the expected 2027-09-01 -- nothing changed', v_old;
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
  get diagnostics v_n = row_count;
  if v_n <> 1 then
    raise exception '0093: expected to update 1 row, updated % -- nothing changed', v_n;
  end if;
  raise notice '0093: expires_at 2027-09-01 -> 2027-09-24';
end
$mig$;
