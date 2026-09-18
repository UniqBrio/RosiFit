-- 0077 · take anon's execute off member_period_metrics_page
--
-- WHAT WAS WRONG
--   0075 created member_period_metrics_page and wrote its grants as
--
--     revoke all on function public.member_period_metrics_page(...) from public, anon;
--     grant execute on function public.member_period_metrics_page(...) to authenticated, service_role;
--
--   The revoke names anon, so it looks complete. It is not. Supabase grants
--   EXECUTE on every new function in `public` DIRECTLY to anon, via a default
--   privilege that fires at CREATE time -- and `revoke all ... from public,
--   anon` in the same file as the create does not remove the grant applied to
--   the created object. The function shipped executable by anon. Migration
--   0012 exists for exactly this and RC-042 recorded it the first time; this
--   is the second.
--
--   member_period_metrics_page is SECURITY DEFINER, so an unauthenticated
--   caller holding only the public anon key would have run it with the
--   definer's rights and read every member's attendance figures for any
--   period they asked for.
--
-- WHAT ACTUALLY HAPPENED, read rather than assumed
--   Exposed 2026-09-18 09:46:15 UTC (0075 applied) to 10:28:15 UTC (the
--   revoke), forty-two minutes. `edge_logs` over that window holds exactly
--   ONE request to the path -- the verification probe at 10:28:47, after the
--   revoke, answering 401. No other caller reached it, authenticated or not.
--   Nothing was read.
--
-- WHAT THIS DOES
--   The revoke, as its own statement, which is the form 0012 established and
--   the form src/data/migrationGrants.test.ts:102 scans for. `revoke all ...
--   from public` is not a substitute and the spec says so in its own failure
--   message.
--
--   Applied to production 2026-09-18 10:28:15 UTC ahead of this file, because
--   the exposure was live and a file is not a fix until it runs. This
--   migration is that statement, recorded so a replay reaches the same state
--   and so the ledger carries it (D-10). Re-running it is harmless: revoking
--   a privilege that is already absent is a no-op.
--
-- RC-052. The class is RC-042 recurring, and the reason it reached production
-- is in that entry: the apply was authorised on a db-harness read alone,
-- without reading the gate job's failure diff against main -- which had
-- already caught this, on the PR's own run, two hours before the apply.
-- D-12b now requires both reads.
-- ---------------------------------------------------------------------------

revoke execute on function public.member_period_metrics_page(date, date, uuid, int) from anon;

-- The guard, because the whole point of this file is that the obvious form of
-- the statement did not do what it read as.
do $verify$
begin
  if has_function_privilege('anon',
       'public.member_period_metrics_page(date,date,uuid,int)', 'execute') then
    raise exception
      '0077: anon can still execute member_period_metrics_page after the revoke -- the grant is coming from somewhere this migration does not name.';
  end if;

  -- And the roles that must keep it, keep it. A revoke that over-reaches is a
  -- different outage.
  if not has_function_privilege('authenticated',
       'public.member_period_metrics_page(date,date,uuid,int)', 'execute') then
    raise exception '0077: authenticated lost execute on member_period_metrics_page';
  end if;
  if not has_function_privilege('service_role',
       'public.member_period_metrics_page(date,date,uuid,int)', 'execute') then
    raise exception '0077: service_role lost execute on member_period_metrics_page';
  end if;
end $verify$;
