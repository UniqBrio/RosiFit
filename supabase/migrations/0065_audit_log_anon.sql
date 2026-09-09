-- 0065 · the audit log learns to say "the member did this"
--
-- THE GAP
-- audit_logs.actor_kind already allows 'anon' (0004), and nothing can write
-- it. There are exactly two write paths: audit_log(), which DERIVES the kind
-- and answers 'system' whenever current_user is service_role -- which is
-- every Edge Function, always -- and audit_log_as(), which REQUIRES an
-- app_users row and raises without one.
--
-- The unsubscribe endpoint has neither. The person clicking is a MEMBER, and
-- members are not app_users: there is no row to name and there never will be.
-- Through audit_log() that decision would be filed as 'system', which in this
-- table reads as "the academy's own automation did this" -- the exact
-- confusion 0023 was written to end, pointed the other way. An opt-out is the
-- one status the academy may not clear, so the log has to say who chose it.
--
-- WHY A THIRD FUNCTION AND NOT A PARAMETER
-- The same reason 0023 gave for the second one: `p_kind text default null`
-- on audit_log() creates an overload that every existing five-argument call
-- matches equally well, and Postgres refuses an ambiguous call. A distinct
-- name is additive in the way this repo means it -- nothing already applied
-- is edited, no existing call changes meaning, and neither existing write
-- path is touched.
--
-- WHY IT CANNOT BE USED TO FORGE
-- It writes actor_kind 'anon' and actor_app_user_id NULL, and takes neither
-- as an argument. There is no value a caller can pass that makes an entry
-- blame a person. That is what makes it safe to add where a sixth parameter
-- on audit_log_as() would not have been.
--
-- WHY service_role ONLY
-- Same as 0023. `authenticated` reaching this would let a signed-in client
-- write "anonymous" entries into an append-only table, which is a way to act
-- without leaving a trace rather than a way to record acting anonymously.
-- The redaction pass is kept: every changes[] still goes through
-- audit_redact, so this is a new caller of the existing discipline, not a way
-- around it.

create or replace function public.audit_log_anon(
  p_action      text,
  p_entity_type text,
  p_entity_id   text    default null,
  p_changes     jsonb   default '[]'::jsonb,
  p_metadata    jsonb   default '{}'::jsonb
) returns bigint
language plpgsql security definer set search_path = public, auth as $$
declare
  v_id bigint;
begin
  insert into public.audit_logs (actor_app_user_id, actor_kind, action, entity_type,
                                 entity_id, changes, metadata)
  values (null, 'anon', p_action, p_entity_type, p_entity_id,
          public.audit_redact(p_changes), coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.audit_log_anon(text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.audit_log_anon(text, text, text, jsonb, jsonb)
  to service_role;
