\echo 'trigger functions: not callable as RPC, and still firing on every write'
begin;

-- ------------------------------------------- no trigger function is exposed
-- The assertion is on the CLASS, not a list: any function returning `trigger`
-- that anon or authenticated can execute names itself here. A future one that
-- slips through fails this without anybody remembering to add it.
select t.eq(
  coalesce((select string_agg(p.proname || case when p.prosecdef then ' [SECURITY DEFINER]' else '' end,
                              ', ' order by p.proname)
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public'
               and p.prorettype = 'trigger'::regtype
               and (has_function_privilege('anon', p.oid, 'EXECUTE')
                    or has_function_privilege('authenticated', p.oid, 'EXECUTE'))), ''),
  '', 'no trigger function is executable by anon or authenticated');

-- ------------------------------ half the class is closed, and half is not
-- The RC-007 mechanism -- Supabase's default privilege granting DIRECTLY to
-- anon and authenticated -- is gone for functions.
select t.eq(
  (select coalesce(defaclacl::text, '') from pg_default_acl d
     join pg_namespace n on n.oid = d.defaclnamespace
    where n.nspname = 'public' and d.defaclobjtype = 'f'),
  '{service_role=X/postgres}',
  'the function default privilege names service_role and nobody else');

-- PostgreSQL's OWN default (CREATE FUNCTION -> EXECUTE TO PUBLIC) is not,
-- and cannot be, removed by ALTER DEFAULT PRIVILEGES -- there is no
-- pg_default_acl entry for it to remove. This asserts that unwelcome fact
-- rather than pretending otherwise, so the day it changes, this fails and
-- somebody re-reads 0025 instead of trusting a comment.
create or replace function public.zz_probe_trigger() returns trigger
language plpgsql as $$ begin return new; end $$;
select t.ok(
  has_function_privilege('anon', 'public.zz_probe_trigger()', 'EXECUTE'),
  'a NEW function is still PUBLIC-executable -- which is WHY every migration must revoke it by hand');
drop function public.zz_probe_trigger();

-- ------------------------------- and every trigger still fires for a client
-- The point of the migration: EXECUTE is checked at CREATE TRIGGER time, not
-- at fire time, so revoking it must not stop a trigger doing its job. These
-- write as `authenticated`, the role the revoke just narrowed.
insert into auth.users (id) values ('eeeeeeee-0000-0000-0000-000000000001');
insert into public.app_users (auth_user_id, kind, name, phone_e164) values
  ('eeeeeeee-0000-0000-0000-000000000001','super_admin','Grant Owner','+919994871190');

do $$
declare v_branch uuid; v_member uuid; v_updated timestamptz;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'eeeeeeee-0000-0000-0000-000000000001', true);

  -- branches_fill_code: the screen sends a name only, the trigger fills code.
  insert into public.branches (name, city) values ('Trigger Town', 'Chennai')
    returning id into v_branch;
  perform t.ok((select code is not null and code <> '' from public.branches where id = v_branch),
    'branches_fill_code still fills the code for a client insert');

  -- member_alias_normalize: sets alias_normalized on insert.
  insert into public.members (member_code, full_name) values ('RF-999001', 'Trigger Person')
    returning id into v_member;
  insert into public.member_aliases (member_id, alias_type, alias_display)
    values (v_member, 'name', 'Trigger P.');
  perform t.ok((select alias_normalized = 'trigger p' from public.member_aliases
                 where member_id = v_member),
    'member_alias_normalize still normalises for a client insert');

  -- set_updated_at: stamps updated_at on update.
  update public.members set full_name = 'Trigger Person II' where id = v_member;
  select updated_at into v_updated from public.members where id = v_member;
  perform t.ok(v_updated is not null, 'set_updated_at still stamps for a client update');

  reset role;
end $$;

-- guard_app_users still refuses self-elevation -- the guard whose whole job
-- is to refuse, proven still able to refuse after losing its grant.
select t.rejects($$
  do $x$ begin
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', 'eeeeeeee-0000-0000-0000-000000000001', true);
    update public.app_users set is_active = false
     where auth_user_id = 'eeeeeeee-0000-0000-0000-000000000001';
  end $x$; $$,
  'guard_app_users still refuses a forbidden column for a client update', 'only name and role_label');

rollback;
