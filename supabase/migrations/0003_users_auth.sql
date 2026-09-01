-- 0003 · staff identity, recovery, rate limiting
--
-- The PIN is NEVER stored here. It lives as the password of a shadow GoTrue
-- user, derived with a pepper keyed on the IMMUTABLE app_users.id -- not on the
-- phone number. That is what makes "change mobile number" (C-99) a cheap,
-- safe operation instead of one that invalidates everybody's PIN.

create table public.app_users (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid unique references auth.users(id) on delete restrict,
  kind            text        not null check (kind in ('super_admin','staff')),
  name            text        not null check (length(btrim(name)) between 2 and 80),
  phone_e164      text        not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  role_label      text        not null default 'Coach',
  is_active       boolean     not null default true,
  must_change_pin boolean     not null default true,
  failed_attempts smallint    not null default 0 check (failed_attempts >= 0),
  locked_until    timestamptz,
  pin_set_at      timestamptz,
  last_login_at   timestamptz,
  created_by      uuid references public.app_users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  deleted_at      timestamptz
);

-- A number identifies exactly one live account; freed when an account is removed.
create unique index app_users_phone_live
  on public.app_users (phone_e164) where deleted_at is null;
-- Exactly one super admin, structurally.
create unique index one_super_admin
  on public.app_users ((kind)) where kind = 'super_admin' and deleted_at is null;
create index app_users_active on public.app_users (is_active) where deleted_at is null;

create trigger app_users_updated_at before update on public.app_users
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ helpers
-- SECURITY DEFINER so RLS policies can call them without recursing into
-- app_users' own policies.
create or replace function public.current_app_user_id() returns uuid
language sql stable security definer set search_path = public, auth as $$
  select u.id from public.app_users u
  where u.auth_user_id = auth.uid() and u.deleted_at is null and u.is_active
$$;

create or replace function public.is_active_app_user() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_app_user_id() is not null
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.app_users u
    where u.auth_user_id = auth.uid() and u.deleted_at is null
      and u.is_active and u.kind = 'super_admin')
$$;

-- --------------------------------------------------------------- column guard
-- Staff reach app_users through PostgREST. Without this, an UPDATE policy that
-- allows a row also allows every column on it -- including is_active, kind and
-- failed_attempts. Privilege escalation by UPDATE is the failure this prevents.
-- Credential-adjacent columns move only through Edge Functions (service_role).
-- SECURITY INVOKER on purpose. The bypass must key on the real database role,
-- not on auth.role(): that reads a JWT claim, which a direct service_role
-- connection does not set -- which would block the very Edge Functions
-- (change-mobile, staff-admin) that are supposed to pass through here.
-- SECURITY DEFINER would also rewrite current_user to the owner and defeat it.
create or replace function public.guard_app_users() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user = 'service_role' then
    return new;                                   -- Edge Functions are trusted
  end if;
  if new.kind            is distinct from old.kind
  or new.auth_user_id    is distinct from old.auth_user_id
  or new.phone_e164      is distinct from old.phone_e164
  or new.is_active       is distinct from old.is_active
  or new.must_change_pin is distinct from old.must_change_pin
  or new.failed_attempts is distinct from old.failed_attempts
  or new.locked_until    is distinct from old.locked_until
  or new.pin_set_at      is distinct from old.pin_set_at
  or new.deleted_at      is distinct from old.deleted_at then
    raise exception 'only name and role_label may be changed here'
      using errcode = '42501';
  end if;
  return new;
end $$;
create trigger app_users_guard before update on public.app_users
  for each row execute function public.guard_app_users();

-- ------------------------------------------------------------------ recovery
create table public.security_questions (
  id        smallint primary key,
  text      text    not null unique,
  is_active boolean not null default true
);
insert into public.security_questions (id, text) values
  (1,'What was the name of your first school?'),
  (2,'In which city were you born?'),
  (3,'What is your mother''s maiden name?'),
  (4,'What was the name of your first pet?'),
  (5,'What is the name of the street you grew up on?'),
  (6,'What was your childhood nickname?'),
  (7,'What is your favourite book?'),
  (8,'Who was your favourite teacher?'),
  (9,'What was the make of your first vehicle?'),
  (10,'In which city did your parents meet?');

-- Answers are hashed, never displayed after being set (C-97). Super Admin only.
create table public.super_admin_recovery (
  id           uuid primary key default gen_random_uuid(),
  app_user_id  uuid     not null references public.app_users(id) on delete cascade,
  question_id  smallint not null references public.security_questions(id),
  answer_hash  text     not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  unique (app_user_id, question_id)
);
create trigger super_admin_recovery_updated_at before update on public.super_admin_recovery
  for each row execute function public.set_updated_at();

create table public.auth_rate_limits (
  key           text primary key,
  window_start  timestamptz not null default now(),
  count         int         not null default 0,
  blocked_until timestamptz
);
create index auth_rate_limits_window on public.auth_rate_limits (window_start);

-- ------------------------------------------------------- mobile number history
-- C-99. The number is a credential input, not the identity; app_users.id is.
create table public.mobile_number_changes (
  id                  bigint generated always as identity primary key,
  app_user_id         uuid not null references public.app_users(id),
  previous_phone_e164 text not null,
  new_phone_e164      text not null,
  initiated_by        uuid not null references public.app_users(id),
  approved_by         uuid references public.app_users(id),
  verification_method text,
  occurred_at         timestamptz not null default now(),
  check (previous_phone_e164 <> new_phone_e164)
);
create index mobile_number_changes_user on public.mobile_number_changes (app_user_id, occurred_at desc);

-- ---------------------------------------------------------------------- RLS
alter table public.app_settings          enable row level security;
alter table public.app_settings          force  row level security;
alter table public.app_subscription      enable row level security;
alter table public.app_subscription      force  row level security;
alter table public.app_users             enable row level security;
alter table public.app_users             force  row level security;
alter table public.security_questions    enable row level security;
alter table public.security_questions    force  row level security;
alter table public.mobile_number_changes enable row level security;
alter table public.mobile_number_changes force  row level security;
-- Credential tables get NO policies at all: unreachable except by service_role.
alter table public.super_admin_recovery  enable row level security;
alter table public.super_admin_recovery  force  row level security;
alter table public.auth_rate_limits      enable row level security;
alter table public.auth_rate_limits      force  row level security;

create policy app_settings_read on public.app_settings
  for select to authenticated using (public.is_active_app_user());
create policy app_settings_write on public.app_settings
  for update to authenticated
  using (public.is_super_admin() and public.is_subscription_writable())
  with check (public.is_super_admin() and public.is_subscription_writable());

create policy app_subscription_read on public.app_subscription
  for select to authenticated using (public.is_active_app_user());
-- No UPDATE policy: renewal runs through the provider Edge Function only.

create policy app_users_read on public.app_users
  for select to authenticated
  using (public.is_super_admin() or auth_user_id = auth.uid());
create policy app_users_self_update on public.app_users
  for update to authenticated
  using ((public.is_super_admin() or auth_user_id = auth.uid())
         and public.is_subscription_writable())
  with check (public.is_super_admin() or auth_user_id = auth.uid());

create policy security_questions_read on public.security_questions
  for select to authenticated using (public.is_super_admin());

create policy mobile_changes_read on public.mobile_number_changes
  for select to authenticated
  using (public.is_super_admin() or app_user_id = public.current_app_user_id());

revoke all on function public.current_app_user_id() from public, anon;
revoke all on function public.is_active_app_user()  from public, anon;
revoke all on function public.is_super_admin()      from public, anon;
grant execute on function public.current_app_user_id(), public.is_active_app_user(),
                          public.is_super_admin() to authenticated, service_role;

grant select         on public.app_users, public.security_questions,
                        public.mobile_number_changes                 to authenticated;
grant update         on public.app_users                             to authenticated;
grant all            on public.app_users, public.security_questions,
                        public.super_admin_recovery, public.auth_rate_limits,
                        public.mobile_number_changes                 to service_role;
revoke all           on public.app_users, public.security_questions,
                        public.super_admin_recovery, public.auth_rate_limits,
                        public.mobile_number_changes                 from anon;
