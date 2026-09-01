-- 0013 · advisor hardening: wrap auth.uid() so RLS evaluates it once per
-- query, not once per row.
--
-- get_advisors (performance) flagged app_users_read and app_users_self_update
-- for calling auth.uid() directly in their USING/WITH CHECK clauses. Postgres
-- cannot volatility-cache a bare function call across rows in that position,
-- so it re-evaluates auth.uid() per row scanned. Wrapping it as
-- `(select auth.uid())` lets the planner treat it as an InitPlan, evaluated
-- once. No behavioural change -- same rows are visible/writable either way.

drop policy app_users_read on public.app_users;
create policy app_users_read on public.app_users
  for select to authenticated
  using (public.is_super_admin() or auth_user_id = (select auth.uid()));

drop policy app_users_self_update on public.app_users;
create policy app_users_self_update on public.app_users
  for update to authenticated
  using ((public.is_super_admin() or auth_user_id = (select auth.uid()))
         and public.is_subscription_writable())
  with check (public.is_super_admin() or auth_user_id = (select auth.uid()));
