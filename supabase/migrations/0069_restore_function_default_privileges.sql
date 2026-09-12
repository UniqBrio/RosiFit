-- 0069 — put back the default privilege 0025 set, and revoke what arrived while it was gone
--
-- RC-042. Approved by the owner on 12-Sep-2026, as its own decision.
--
-- ────────────────────────────────────────────────────────────────────────────
-- WHAT WENT WRONG
--
-- Migration 0025 set:
--
--     alter default privileges in schema public revoke execute on functions
--       from anon, authenticated;
--
-- On 12-Sep-2026 `pg_default_acl` for role `postgres`, schema `public`,
-- objtype `f` read:
--
--     {postgres=X/postgres, anon=X/postgres,
--      authenticated=X/postgres, service_role=X/postgres}
--
-- It is no longer in force. Tables are still correctly locked (objtype `r`
-- carries no anon entry); functions are not. 0067 is the proof: it was created
-- three days ago and arrived with `anon=X` on it, which is how this was found.
--
-- ────────────────────────────────────────────────────────────────────────────
-- A CORRECTION TO WHAT I WROTE WHEN I FOUND IT
--
-- RC-042 and src/data/migrationGrants.test.ts both said a `create or replace`
-- of an existing function would "silently re-acquire the grant". **That is
-- wrong, and it is corrected here rather than left standing.** PostgreSQL
-- preserves a function's ACL across CREATE OR REPLACE — ownership and
-- permissions are explicitly not changed. Default privileges apply only when
-- an object is genuinely created.
--
-- So the real exposure was narrower than first stated: every NEW function, and
-- any function dropped and recreated. It was still real — 0067 was a new
-- function and it landed anon-executable — but the 23 functions that had no
-- explicit revoke were never one `create or replace` away from exposure. They
-- were, and are, safe. Getting that wrong in the other direction would have
-- been the easier mistake to leave uncorrected.
--
-- ────────────────────────────────────────────────────────────────────────────
-- WHAT THIS DOES, IN THREE PARTS
--
-- 1. Restores the default privilege, which is the whole of the future fix.
-- 2. Revokes from the nine TRIGGER functions that arrived while it was gone.
--    A trigger function is invoked by the trigger mechanism, and PostgreSQL
--    does not check EXECUTE against the statement's role to fire it — 0012
--    already proved that here by revoking `audit_row_change()` from both roles
--    with nothing breaking since. `supabase/tests/22_function_security.sql`
--    asserts none of them is reachable, and has been failing on `main` for
--    exactly this reason.
-- 3. Revokes from four plain helpers, FROM `anon` ONLY. They are called from
--    inside other functions, and a SECURITY INVOKER caller needs the invoking
--    role to hold EXECUTE on what it calls — so taking them from
--    `authenticated` could break a path this migration has no business
--    touching. Narrowing to anon is the safe direction and is all the RLS
--    story needs.
--
-- The 23 functions listed in src/data/migrationGrants.test.ts are deliberately
-- NOT revoked here. They hold no anon grant in production (verified), part 1
-- keeps it that way, and a no-op revoke of 23 signatures is 23 chances to typo
-- a signature and revoke nothing while appearing to.

-- ── 1. the default, restored ────────────────────────────────────────────────
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- ── AND `public` IS NAMED IN EVERY ONE OF THEM ──────────────────────────────
--
-- The first draft of this migration revoked from `anon, authenticated` and
-- stopped there. The local harness refused it: `audit_remarks_immutable` came
-- back still anon-executable, with the ACL
--
--     {=X/postgres, postgres=X/postgres, service_role=X/postgres}
--
-- The leading `=X` with no grantee is the grant to PUBLIC, and `anon` is a
-- member of PUBLIC — so revoking the direct grant left the inherited one, and
-- the function stayed reachable.
--
-- **That is the 0067 bug exactly, pointing the other way.** 0067 revoked from
-- PUBLIC and left the direct grant; this draft revoked the direct grant and
-- left PUBLIC. All thirteen functions below carry BOTH in production
-- (verified, 12-Sep-2026), so both have to be named. The rehearsal caught it;
-- it would otherwise have been a migration that read like a fix and changed
-- nothing.

-- ── 2. the trigger functions ────────────────────────────────────────────────
-- Leaves postgres and service_role. Trigger functions are fired by the trigger
-- mechanism, which does not check EXECUTE against the statement's role.
revoke execute on function public.audit_immutable()         from public, anon, authenticated;
revoke execute on function public.audit_remarks_immutable() from public, anon, authenticated;
revoke execute on function public.branches_fill_code()      from public, anon, authenticated;
revoke execute on function public.branches_guard_removal()  from public, anon, authenticated;
revoke execute on function public.guard_app_settings()      from public, anon, authenticated;
revoke execute on function public.guard_app_users()         from public, anon, authenticated;
revoke execute on function public.holidays_apply_effects()  from public, anon, authenticated;
revoke execute on function public.member_alias_normalize()  from public, anon, authenticated;
revoke execute on function public.set_updated_at()          from public, anon, authenticated;

-- ── 3. the helpers, anon only ───────────────────────────────────────────────
-- `authenticated` KEEPS these, and keeps them through its own direct grant
-- rather than through PUBLIC — which is why revoking PUBLIC here is safe.
-- Each is called from inside another function, and a SECURITY INVOKER caller
-- needs the invoking role to hold EXECUTE on what it calls.
revoke execute on function public.audit_redact(jsonb)         from public, anon;
revoke execute on function public.normalize_email(text)       from public, anon;
revoke execute on function public.normalize_name(text)        from public, anon;
revoke execute on function public.week_bounds(date, smallint) from public, anon;
