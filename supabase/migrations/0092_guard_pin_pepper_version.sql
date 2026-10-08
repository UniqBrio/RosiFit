-- 0092: app_users.pin_pepper_version is a credential column -- only the service role may change it.
-- requests/2026-10-08-pin-pepper-migration.md, docs/security/PIN_PEPPER_MIGRATION.md
--
-- WHY. 0091 added pin_pepper_version, and guard_app_users() (0003) lets only the service role
-- change the sensitive columns of app_users -- but its list predates 0091, so any role that RLS
-- lets update a row (a signed-in staff member on their own row, a super admin on any row) could
-- change it. Setting it back to 0 makes the next sign-in check the OLD Singapore credential and
-- re-secure to it, which could undo an admin's PIN reset while Singapore still holds the old PIN.
-- Found on the Mumbai rehearsal, 08-Oct-2026.
--
-- WHAT. One line is added to the guard's condition list. Every existing rule, the service-role
-- exemption, the refusal text and errcode 42501 are kept exactly. The Edge Functions (service
-- role) still set the column -- that is the only legitimate writer.
--
-- HOW (the repo's drift-safe pattern, cf. 0090). The function is rebuilt from its OWN live
-- definition (pg_get_functiondef), with the anchor -- the guard's last condition line -- required
-- to occur exactly once, and the service-role exemption and the refusal both still present.
-- Anything else means the live body has drifted from 0003: it stops, changes nothing, and says so.
-- CREATE OR REPLACE keeps the owner and the grants (0025 / 0069 revoked EXECUTE; that stays).
-- Re-runnable: a guard that already names pin_pepper_version is left alone.
--
-- Requires 0091. Apply to MUMBAI ONLY, after 0091 (rehearsal and, at cutover, after the final
-- restore). Singapore never receives it: it has no pin_pepper_version column.

do $mig$
declare
  v_n    int;
  v_oid  oid;
  v_def  text;
  v_old  constant text := '  or new.deleted_at      is distinct from old.deleted_at then';
  v_new  constant text := '  or new.deleted_at      is distinct from old.deleted_at' || chr(10)
                       || '  or new.pin_pepper_version is distinct from old.pin_pepper_version then';
  v_hits int;
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'app_users' and column_name = 'pin_pepper_version') then
    raise exception '0092: public.app_users.pin_pepper_version is missing -- apply 0091 first';
  end if;

  select count(*), min(p.oid) into v_n, v_oid
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'guard_app_users';
  if v_n <> 1 then
    raise exception '0092: expected exactly one public.guard_app_users(), found %', v_n;
  end if;

  v_def := replace(pg_get_functiondef(v_oid), chr(13), '');

  if position('new.pin_pepper_version' in v_def) > 0 then
    raise notice '0092: guard_app_users() already protects pin_pepper_version -- nothing to do';
    return;
  end if;

  if position('if current_user = ''service_role'' then' in v_def) = 0
     or position('only name and role_label may be changed here' in v_def) = 0
     or position('errcode = ''42501''' in v_def) = 0 then
    raise exception '0092: guard_app_users() no longer has its service_role exemption or its 42501 refusal -- the live body has drifted from 0003; read it before changing anything';
  end if;

  v_hits := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
  if v_hits <> 1 then
    raise exception '0092: guard_app_users() contains its deleted_at condition line % times, expected exactly 1 -- the live body has drifted from 0003; read it before changing anything', v_hits;
  end if;

  execute replace(v_def, v_old, v_new);

  if position('new.pin_pepper_version' in pg_get_functiondef(v_oid)) = 0 then
    raise exception '0092: the guard was rebuilt but does not name pin_pepper_version -- rolled back';
  end if;
end
$mig$;
