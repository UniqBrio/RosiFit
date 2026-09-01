-- 0002 · singleton settings and the subscription gate

create table public.app_settings (
  id                  smallint primary key default 1 check (id = 1),
  academy_name        text        not null default 'RosiFit Academy',
  sender_name         text        not null default 'RosiFit Academy',
  timezone            text        not null default 'Asia/Kolkata',
  week_start_day      smallint    not null default 1 check (week_start_day between 1 and 7),
  bootstrap_completed boolean     not null default false,
  max_emails_per_day  int         not null default 500 check (max_emails_per_day > 0),
  expiry_mode         text        not null default 'grace' check (expiry_mode in ('grace','hard')),
  role_labels         jsonb       not null default '["Academy admin","Coach","Front desk"]'::jsonb,
  -- The AUTHORITATIVE Google Meet export. It has three columns and NO email.
  -- email_column is null on purpose: an attendance file never carries an
  -- address, so every email must come from the matched member record.
  csv_mapping         jsonb       not null default jsonb_build_object(
                        'name_column',       'Full Name',
                        'email_column',      null,
                        'duration_column',   'Time in Call',
                        'first_seen_column', 'First Seen',
                        'required_columns',  jsonb_build_array('Full Name')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);
insert into public.app_settings (id) values (1);

create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

-- bootstrap_completed is a one-way latch: it may go false -> true exactly once
-- and can never be flipped back, so the public bootstrap endpoint cannot be
-- reopened by anyone who gains write access to settings.
create or replace function public.guard_app_settings() returns trigger
language plpgsql as $$
begin
  if old.bootstrap_completed and not new.bootstrap_completed then
    raise exception 'bootstrap_completed cannot be cleared';
  end if;
  return new;
end $$;
create trigger app_settings_guard before update on public.app_settings
  for each row execute function public.guard_app_settings();

create table public.app_subscription (
  id               smallint primary key default 1 check (id = 1),
  customer_name    text        not null default 'RosiFit Academy',
  plan_label       text        not null default 'Standard',
  start_date       date        not null default current_date,
  expires_at       date        not null default (current_date + 365),
  grace_days       smallint    not null default 14 check (grace_days >= 0),
  status           text        not null default 'active'
                     check (status in ('active','grace','expired','suspended')),
  renewed_at       timestamptz,
  renewal_history  jsonb       not null default '[]'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);
insert into public.app_subscription (id) values (1);
create trigger app_subscription_updated_at before update on public.app_subscription
  for each row execute function public.set_updated_at();

-- Derived, never trusted from the stored column: a stale row cannot buy access.
create or replace function public.subscription_state() returns text
language sql stable security definer set search_path = public as $$
  select case
    when s.status = 'suspended'                              then 'suspended'
    when current_date <= s.expires_at                        then 'active'
    when current_date <= s.expires_at + s.grace_days         then 'grace'
    else 'expired'
  end
  from public.app_subscription s where s.id = 1
$$;

-- Reads keep working after expiry; writes stop. Losing access to your own
-- attendance history because an invoice is late would be the wrong failure.
create or replace function public.is_subscription_writable() returns boolean
language sql stable security definer set search_path = public as $$
  select public.subscription_state() in ('active','grace')
$$;

revoke all on function public.subscription_state()      from public, anon;
revoke all on function public.is_subscription_writable() from public, anon;
grant execute on function public.subscription_state()       to authenticated, service_role;
grant execute on function public.is_subscription_writable() to authenticated, service_role;

-- Grants live with the table that needs them, so no table ever exists without
-- an explicit posture. 0014 re-asserts the whole picture and fails if a table
-- was added without RLS or with a stray anon grant.
grant select          on public.app_settings, public.app_subscription to authenticated;
grant update          on public.app_settings                          to authenticated;
grant all             on public.app_settings, public.app_subscription to service_role;
revoke all            on public.app_settings, public.app_subscription from anon;
