-- 0004 · append-only audit log
-- WHO / WHAT / WHEN / PREVIOUS / CURRENT (C-94). Immutable to every role
-- including service_role (C-96): a compromised Edge Function must not be able
-- to erase its own tracks.

create table public.audit_logs (
  id                 bigint generated always as identity primary key,
  occurred_at        timestamptz not null default now(),
  actor_app_user_id  uuid references public.app_users(id),
  actor_kind         text not null default 'system'
                       check (actor_kind in ('super_admin','staff','system','anon','provider')),
  action             text not null,
  entity_type        text not null,
  entity_id          text,
  changes            jsonb not null default '[]'::jsonb,   -- [{field, old, new}]
  metadata           jsonb not null default '{}'::jsonb,
  ip                 inet,
  request_id         text
);
create index audit_logs_entity   on public.audit_logs (entity_type, entity_id);
create index audit_logs_time     on public.audit_logs (occurred_at desc);
create index audit_logs_actor    on public.audit_logs (actor_app_user_id);
create index audit_logs_action   on public.audit_logs (action);

-- Immutability, enforced twice: by privilege and by trigger. The trigger is
-- the one that still holds if a future migration hands out a stray grant.
create or replace function public.audit_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_logs is append-only (attempted %)', tg_op
    using errcode = '42501';
end $$;
create trigger audit_logs_no_update before update on public.audit_logs
  for each row execute function public.audit_immutable();
create trigger audit_logs_no_delete before delete on public.audit_logs
  for each row execute function public.audit_immutable();
create trigger audit_logs_no_truncate before truncate on public.audit_logs
  execute function public.audit_immutable();

-- The one way anything writes an audit row. Redaction is not optional.
create or replace function public.audit_log(
  p_action      text,
  p_entity_type text,
  p_entity_id   text    default null,
  p_changes     jsonb   default '[]'::jsonb,
  p_metadata    jsonb   default '{}'::jsonb
) returns bigint
language plpgsql security definer set search_path = public, auth as $$
declare
  v_actor uuid := public.current_app_user_id();
  v_kind  text;
  v_id    bigint;
begin
  select case when v_actor is null then
           case when current_user = 'service_role' then 'system' else 'anon' end
         else (select u.kind from public.app_users u where u.id = v_actor) end
    into v_kind;

  insert into public.audit_logs (actor_app_user_id, actor_kind, action, entity_type,
                                 entity_id, changes, metadata)
  values (v_actor, v_kind, p_action, p_entity_type, p_entity_id,
          public.audit_redact(p_changes), coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

-- Generic row-change trigger: builds changes[] by diffing OLD and NEW so an
-- audited table records PREVIOUS and CURRENT without per-table code.
create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_entity text := coalesce(tg_argv[0], tg_table_name);
  v_id     text;
  v_changes jsonb := '[]'::jsonb;
  v_old    jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new    jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  k text;
begin
  v_id := coalesce(v_new->>'id', v_old->>'id');
  for k in select key from jsonb_object_keys(v_old || v_new) key loop
    if k not in ('updated_at','created_at') and (v_old->k) is distinct from (v_new->k) then
      v_changes := v_changes || jsonb_build_array(jsonb_build_object(
        'field', k, 'old', v_old->k, 'new', v_new->k));
    end if;
  end loop;
  if jsonb_array_length(v_changes) = 0 and tg_op = 'UPDATE' then
    return coalesce(new, old);                    -- nothing actually changed
  end if;
  perform public.audit_log(lower(v_entity) || '.' || lower(tg_op), v_entity, v_id, v_changes);
  return coalesce(new, old);
end $$;

alter table public.audit_logs enable row level security;
alter table public.audit_logs force  row level security;
create policy audit_logs_read on public.audit_logs
  for select to authenticated using (public.is_super_admin());

grant select on public.audit_logs to authenticated, service_role;
-- Deliberately NOT granted to service_role: insert flows through audit_log()
-- only, so every row passes the redaction pass.
grant insert on public.audit_logs to service_role;
revoke update, delete, truncate on public.audit_logs from anon, authenticated, service_role;
revoke all on public.audit_logs from anon;
grant execute on function public.audit_log(text,text,text,jsonb,jsonb) to authenticated, service_role;

-- audit the identity tables created in 0002/0003
create trigger audit_app_users     after insert or update or delete on public.app_users
  for each row execute function public.audit_row_change('app_user');
create trigger audit_app_settings  after update on public.app_settings
  for each row execute function public.audit_row_change('app_settings');
create trigger audit_mobile_change after insert on public.mobile_number_changes
  for each row execute function public.audit_row_change('auth.mobile_changed');
