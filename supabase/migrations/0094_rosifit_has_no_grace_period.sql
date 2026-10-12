-- 0094: RosiFit has no grace period -- writes stop the day after the end date.
-- requests/2026-10-12-no-grace-period.md
--
-- WHY. The repo owner, 12-Oct-2026: "Grace period is not required", and chose to remove it
-- entirely rather than only hide it. Production's row read grace_days 14 the same day.
--
-- WHAT. One column on the singleton row: grace_days -> 0. expires_at (2027-09-24, 0093),
-- start_date, status and plan are untouched. subscription_state() (0002, 0090) is unchanged: with
-- 0 grace days its 'grace' branch can no longer be reached, so the day after expires_at is
-- 'expired' and is_subscription_writable() is false. Reads keep working, as before.
--
-- NOT RECORDED IN renewal_history: that column is the renewal record, and spec 70 (merged,
-- append-only) pins a replayed row's history as empty. The change is recorded in
-- docs/registers/ENVIRONMENTS.md when applied.
--
-- SAFETY. Re-runnable: a row already at 0 is left alone. A missing row stops the migration; the
-- update must hit exactly one row, or it stops.

do $mig$
declare
  v_old smallint;
  v_n   int;
begin
  select grace_days into v_old from public.app_subscription where id = 1;
  if not found then
    raise exception '0094: app_subscription row 1 is missing -- nothing changed';
  end if;

  if v_old = 0 then
    raise notice '0094: grace_days is already 0 -- nothing to do';
    return;
  end if;

  update public.app_subscription set grace_days = 0 where id = 1;
  get diagnostics v_n = row_count;
  if v_n <> 1 then
    raise exception '0094: expected to update 1 row, updated % -- nothing changed', v_n;
  end if;
  raise notice '0094: grace_days % -> 0', v_old;
end
$mig$;
