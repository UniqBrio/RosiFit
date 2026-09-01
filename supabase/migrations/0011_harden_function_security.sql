-- 0011 · advisor hardening: pin search_path, narrow anon/authenticated RPC surface
--
-- get_advisors (security) on the freshly-applied schema flagged two real gaps:
--
-- 1. A handful of 0001-0004 helper/trigger functions had no `set search_path`,
--    so a role that can alter its own search_path could shadow `public` and
--    change what an unqualified call resolves to. Every one of them already
--    qualifies its own references with `public.`, so this is belt-and-braces,
--    not a live exploit -- but it is cheap to close and the linter is right
--    to ask for it.
--
-- 2. CREATE FUNCTION grants EXECUTE to PUBLIC by default unless revoked.
--    0002/0003 explicitly revoked-then-granted their SECURITY DEFINER helpers
--    (current_app_user_id, is_super_admin, subscription_state, ...); 0004,
--    0007, 0008 and 0009 did not, so every SECURITY DEFINER function they
--    declared -- including mutating ones like apply_holiday, remove_holiday,
--    generate_sessions and recompute_member_stats -- was callable by `anon`
--    over PostgREST's /rest/v1/rpc/ regardless of the table-level RLS those
--    functions bypass by design. None of these functions re-check
--    is_active_app_user()/is_super_admin() internally (they trust the grant),
--    so the grant IS the access control here.
--
-- Nothing in this file changes behaviour for a legitimate caller: the local
-- harness runs every RPC as the `postgres` superuser, which bypasses grants
-- entirely, so db/harness/test.sh is unaffected by design (verified below).

-- ---------------------------------------------------------- pin search_path
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.normalize_name(p text) returns text
language sql immutable parallel safe set search_path = public as $$
  select nullif(
    btrim(
      regexp_replace(
        lower(public.unaccent(
          'public.unaccent'::regdictionary, coalesce(p, ''))),
        '[^a-z0-9]+', ' ', 'g'
      )
    ), '')
$$;

create or replace function public.normalize_email(p text) returns citext
language sql immutable parallel safe set search_path = public as $$
  select nullif(lower(trim(coalesce(p, ''))), '')::citext
$$;

create or replace function public.week_bounds(
  p_date date,
  p_week_start smallint default 1
) returns table (week_start date, week_end date)
language sql immutable parallel safe set search_path = public as $$
  select w, w + 6
  from (select p_date - ((extract(isodow from p_date)::int - p_week_start + 7) % 7) as w) s
$$;

create or replace function public.audit_redact(p jsonb) returns jsonb
language sql immutable parallel safe set search_path = public as $$
  select coalesce(
    (select jsonb_agg(
       case when lower(e->>'field') ~ '(pin|password|secret|answer|token|key|credential)'
            then jsonb_build_object('field', e->>'field', 'old', '[redacted]', 'new', '[redacted]')
            else e end)
     from jsonb_array_elements(case jsonb_typeof(p) when 'array' then p else '[]'::jsonb end) e),
    '[]'::jsonb)
$$;

create or replace function public.guard_app_settings() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.bootstrap_completed and not new.bootstrap_completed then
    raise exception 'bootstrap_completed cannot be cleared';
  end if;
  return new;
end $$;

create or replace function public.audit_immutable() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'audit_logs is append-only (attempted %)', tg_op
    using errcode = '42501';
end $$;

create or replace function public.member_alias_normalize() returns trigger
language plpgsql set search_path = public as $$
begin
  new.alias_normalized := case new.alias_type
    when 'email' then public.normalize_email(new.alias_display)::text
    else public.normalize_name(new.alias_display) end;
  if new.alias_normalized is null then
    raise exception 'a display name must contain at least one letter or digit';
  end if;
  return new;
end $$;

-- --------------------------------------------------- narrow the RPC surface
-- Mutating engine internals: never meant to be called directly by a client.
-- They run only from Edge Functions (service_role) or from other
-- SECURITY DEFINER functions that already ran their own authorization check.
revoke all on function public.apply_holiday(uuid)                              from public;
revoke all on function public.remove_holiday(uuid)                             from public;
revoke all on function public.generate_sessions(uuid, date, date)              from public;
revoke all on function public.recompute_member_stats(uuid[])                   from public;
revoke all on function public.refresh_session_counts(uuid)                     from public;
revoke all on function public.audit_row_change()                               from public;
grant execute on function public.apply_holiday(uuid)                           to service_role;
grant execute on function public.remove_holiday(uuid)                          to service_role;
grant execute on function public.generate_sessions(uuid, date, date)           to service_role;
grant execute on function public.recompute_member_stats(uuid[])                to service_role;
grant execute on function public.refresh_session_counts(uuid)                  to service_role;
grant execute on function public.audit_row_change()                            to service_role;

-- Read-only engine views-as-functions: legitimate for any signed-in staff
-- member to call (the dashboard, reports and follow-up screens all read
-- these directly), but never for `anon`, since they are SECURITY DEFINER and
-- bypass the RLS on the tables they read.
revoke all on function public.member_period_metrics(date, date, uuid, uuid, uuid, uuid) from public;
revoke all on function public.current_streak_for(uuid)                                  from public;
revoke all on function public.effective_follow_up_config(uuid)                          from public;
revoke all on function public.expected_members_for_session(uuid)                        from public;
revoke all on function public.follow_up_candidates(date, date, uuid, uuid)              from public;
revoke all on function public.preview_holiday(date, date, uuid)                         from public;
revoke all on function public.audit_log(text, text, text, jsonb, jsonb)                 from public;
grant execute on function public.member_period_metrics(date, date, uuid, uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.current_streak_for(uuid)                                  to authenticated, service_role;
grant execute on function public.effective_follow_up_config(uuid)                          to authenticated, service_role;
grant execute on function public.expected_members_for_session(uuid)                        to authenticated, service_role;
grant execute on function public.follow_up_candidates(date, date, uuid, uuid)              to authenticated, service_role;
grant execute on function public.preview_holiday(date, date, uuid)                         to authenticated, service_role;
grant execute on function public.audit_log(text, text, text, jsonb, jsonb)                 to authenticated, service_role;
