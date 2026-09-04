-- 0025 · trigger functions are not an API, and the default privilege that
--        made them one is removed
--
-- WHAT THE ADVISOR FOUND
--   After 0019, get_advisors (security) reports three SECURITY DEFINER
--   functions callable by `anon` over /rest/v1/rpc/:
--     branches_fill_code(), branches_guard_removal()   -- 0019
--     holidays_apply_effects()                          -- 0017
--   and the same three plus five others callable by `authenticated`.
--   All eight return `trigger`. None is meant to be called by anybody.
--
-- WHY THEY WERE EXPOSED
--   TWO grants, from two different mechanisms, and the first draft of this
--   migration only closed one of them -- 19_trigger_function_grants.sql
--   failed and said so:
--
--     1. `CREATE FUNCTION` grants EXECUTE to **PUBLIC** by default, and
--        anon and authenticated inherit through PUBLIC. 0011 revoked PUBLIC
--        on the mutating helpers (apply_holiday, generate_sessions, ...) but
--        the trigger functions were never on that list.
--     2. Supabase's DEFAULT PRIVILEGES additionally grant DIRECTLY to anon
--        and authenticated -- the RC-007 mechanism. 0015 removed that default
--        FOR TABLES and not FOR FUNCTIONS.
--
--   Revoking from anon and authenticated alone leaves (1) untouched, so the
--   privilege survives. Both have to go, and both classes have to be closed
--   or the next function created inherits them again.
--
-- HOW REACHABLE IT ACTUALLY IS
--   Barely. PostgREST cannot usefully invoke a `returns trigger` function:
--   with no trigger context, TG_OP and NEW are unset and the call errors
--   before touching a row. So this is a grant that should never have existed
--   rather than a hole somebody could climb through -- which is the honest
--   description, and also the reason it is closed here rather than urgently.
--
-- REVOKING IS SAFE FOR THE TRIGGERS THEMSELVES
--   PostgreSQL checks EXECUTE on a trigger function at CREATE TRIGGER time,
--   against the trigger's creator -- not at fire time against whoever wrote
--   the row. Revoking from anon and authenticated therefore stops the RPC
--   surface without stopping a single trigger from firing. The whole suite
--   is the evidence: nearly every spec writes rows as `authenticated` and
--   depends on set_updated_at, guard_app_users, member_alias_normalize and
--   audit_immutable firing on those writes.

-- ------------------------------------------------- the eight, by name
-- Named individually rather than swept, so the list is reviewable and a
-- future function does not get silently included by a pattern.
revoke execute on function public.set_updated_at()            from public, anon, authenticated;
revoke execute on function public.guard_app_settings()        from public, anon, authenticated;
revoke execute on function public.guard_app_users()           from public, anon, authenticated;
revoke execute on function public.audit_immutable()           from public, anon, authenticated;
revoke execute on function public.member_alias_normalize()    from public, anon, authenticated;
revoke execute on function public.holidays_apply_effects()    from public, anon, authenticated;
revoke execute on function public.branches_fill_code()        from public, anon, authenticated;
revoke execute on function public.branches_guard_removal()    from public, anon, authenticated;

-- ------------------------------- the class, as far as it CAN be closed
-- This closes the RC-007 half: the Supabase default privilege that grants
-- DIRECTLY to anon and authenticated. After it, pg_default_acl for functions
-- in `public` names service_role and nobody else.
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- The PUBLIC half CANNOT be closed this way, and saying so is the point of
-- this comment. `alter default privileges ... revoke execute on functions
-- from public` is accepted and does nothing: PostgreSQL's built-in
-- CREATE FUNCTION -> EXECUTE TO PUBLIC is not represented in pg_default_acl,
-- so there is no entry for the revoke to remove, and the next function
-- created still carries `=X/postgres`. Measured on the harness, not assumed:
-- the statement was run, pg_default_acl showed {service_role=X/postgres},
-- and a freshly created probe function still came out PUBLIC-executable.
--
-- So there is no structural guarantee available here, only a rule and a
-- rung: EVERY migration that creates a function must revoke it from PUBLIC
-- explicitly, and supabase/tests/19_trigger_function_grants.sql fails the
-- suite if a trigger function is ever reachable again.
