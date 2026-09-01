-- RosiFit — all migrations, concatenated in order, for one-shot application.
-- Generated from supabase/migrations/. Paste into the Supabase SQL editor,
-- or: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/apply_all.sql
--
-- Safe to run on an EMPTY project only. It creates tables from scratch and
-- will fail loudly (not silently half-apply) if any object already exists.
-- Wrapped in a single transaction: either the whole schema lands or none.
--
-- Generated 2026-09-01T12:35:07Z from eac132f

begin;

-- ===================================================================
-- 0001_extensions_helpers.sql
-- ===================================================================
-- 0001 · extensions and shared helpers
-- Every later migration depends on these. Nothing here reads application data.

create extension if not exists citext;
create extension if not exists unaccent;
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------- updated_at
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ------------------------------------------------------------- normalisation
-- Name matching is the ONLY identity signal the Google Meet CSV gives us
-- (the file carries Full Name / First Seen / Time in Call and nothing else),
-- so this function is load-bearing: it decides who a row belongs to.
-- IMMUTABLE because members.name_normalized is a generated column.
-- unaccent() is STABLE, so it is pinned to a fixed dictionary to stay immutable.
create or replace function public.normalize_name(p text) returns text
language sql immutable parallel safe as $$
  select nullif(
    btrim(                              -- AFTER the substitution, not before:
      regexp_replace(                   -- punctuation at the edges becomes a
        lower(public.unaccent(          -- space, so trimming first leaves it.
          'public.unaccent'::regdictionary, coalesce(p, ''))),
        '[^a-z0-9]+', ' ', 'g'
      )
    ), '')                              -- '' too, not just ' '
$$;

-- Why the order matters. Google Meet display names carry trailing periods,
-- bracketed suffixes and emoji all the time ("Shazia F.", "Shazia (Mom)").
-- Trimming before the substitution left 'shazia ' with a trailing space, which
-- would not equal 'shazia' -- so a member would silently fail to match her own
-- alias. Name is the ONLY identity signal the CSV gives us, so this function
-- decides who every attendance row belongs to.

create or replace function public.normalize_email(p text) returns citext
language sql immutable parallel safe as $$
  select nullif(lower(trim(coalesce(p, ''))), '')::citext
$$;

-- --------------------------------------------------------------- week bounds
-- Weeks are Mon-Sun in the academy timezone. p_week_start: 1 = Monday.
create or replace function public.week_bounds(
  p_date date,
  p_week_start smallint default 1
) returns table (week_start date, week_end date)
language sql immutable parallel safe as $$
  select w, w + 6
  from (select p_date - ((extract(isodow from p_date)::int - p_week_start + 7) % 7) as w) s
$$;

-- --------------------------------------------------------------------- audit
-- WHO / WHAT / WHEN / PREVIOUS / CURRENT. Table itself lands in 0004; this is
-- declared early because 0002 and 0003 already need to write audit rows.
-- Redaction is enforced here rather than by convention: a PIN, security answer
-- or key can never reach audit_logs even if a caller passes one.
create or replace function public.audit_redact(p jsonb) returns jsonb
language sql immutable parallel safe as $$
  select coalesce(
    (select jsonb_agg(
       case when lower(e->>'field') ~ '(pin|password|secret|answer|token|key|credential)'
            then jsonb_build_object('field', e->>'field', 'old', '[redacted]', 'new', '[redacted]')
            else e end)
     from jsonb_array_elements(case jsonb_typeof(p) when 'array' then p else '[]'::jsonb end) e),
    '[]'::jsonb)
$$;

comment on function public.audit_redact(jsonb) is
  'Strips secret-bearing fields from an audit changes[] array. Never remove: this is the only thing standing between a careless caller and a PIN in the audit log.';

-- ===================================================================
-- 0002_settings_subscription.sql
-- ===================================================================
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

-- ===================================================================
-- 0003_users_auth.sql
-- ===================================================================
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

-- ===================================================================
-- 0004_audit_logs.sql
-- ===================================================================
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

-- ===================================================================
-- 0005_organisation.sql
-- ===================================================================
-- 0005 · branches, courses, offerings, schedules, holidays
--
-- THE MODEL, stated once:
--   Course   -- what is taught, plus DEFAULT timing/frequency
--     +- at a Branch -> OFFERING          -- the thing that actually runs
--          +- OFFERING_SCHEDULE          -- the weekdays it runs (effective-dated)
--          |                                *** THE source of expected attendance ***
--          +- SESSIONS                   -- one row per date
--          +- MEMBER_ENROLLMENT
--               +- MEMBER_SCHEDULE       -- a SUBSET of the offering's days
--
-- Nothing on the course participates in the expectation calculation.

create table public.branches (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 2 and 80),
  code       text not null,
  city       text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);
create unique index branches_code_live on public.branches (lower(code)) where deleted_at is null;
create trigger branches_updated_at before update on public.branches
  for each row execute function public.set_updated_at();

-- C-56 / C-57. Four fields. Course Fee and Course Short Code are absent by
-- design -- there are no commercial fields anywhere in this product.
create table public.courses (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (length(btrim(name)) between 2 and 80),
  description        text,
  default_start_time time,
  default_end_time   time,
  default_frequency  smallint check (default_frequency between 1 and 7),
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz,
  deleted_at         timestamptz,
  check (default_end_time is null or default_start_time is null
         or default_end_time > default_start_time)
);
create unique index courses_name_live on public.courses (lower(name)) where deleted_at is null;
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

comment on column public.courses.default_frequency is
  'Stated intent only (C-59). Expected attendance is derived from offering_schedules.weekdays and is NEVER read from here. A mismatch warns in the UI; it never reconciles.';
comment on column public.courses.default_start_time is
  'Copied into a new offering at creation, then never read again (CR-06). Changing it does not touch any existing offering: two branches legitimately run the same course at different hours.';

create table public.course_offerings (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id),
  branch_id   uuid not null references public.branches(id),
  batch_label text not null default '',
  start_time  time,
  end_time    time,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  deleted_at  timestamptz,
  check (end_time is null or start_time is null or end_time > start_time)
);
create unique index offerings_unique_live
  on public.course_offerings (course_id, branch_id, batch_label) where deleted_at is null;
create index offerings_branch on public.course_offerings (branch_id);
create index offerings_course on public.course_offerings (course_id);
create trigger offerings_updated_at before update on public.course_offerings
  for each row execute function public.set_updated_at();

-- Effective-dated. Changing a schedule NEVER rewrites history: a new row is
-- opened and the old one closed, and completed sessions keep their frozen
-- expectation (see 0007/0008).
create table public.offering_schedules (
  id               uuid primary key default gen_random_uuid(),
  offering_id      uuid not null references public.course_offerings(id) on delete cascade,
  effective_from   date not null,
  effective_to     date,
  weekdays         smallint[] not null,
  sessions_per_week smallint generated always as (coalesce(array_length(weekdays,1),0)) stored,
  note             text,
  created_by       uuid references public.app_users(id),
  created_at       timestamptz not null default now(),
  -- coalesce is load-bearing: array_length('{}',1) is NULL, and a CHECK that
  -- evaluates to NULL PASSES. Without it an empty weekday array is accepted,
  -- sessions_per_week becomes 0, and every enrolled member silently drops to
  -- zero expected sessions -- which also switches off follow-up for them.
  constraint weekdays_non_empty check (coalesce(array_length(weekdays,1),0) between 1 and 7),
  constraint weekdays_in_range  check (weekdays <@ array[1,2,3,4,5,6,7]::smallint[]),
  -- a NULL element would slip past <@ for the same reason
  constraint weekdays_no_nulls  check (array_position(weekdays, null) is null),
  check (effective_to is null or effective_to >= effective_from),
  -- one schedule per offering per day: overlapping versions would make
  -- "how many sessions were expected" ambiguous
  exclude using gist (
    offering_id with =,
    daterange(effective_from, effective_to, '[]') with &&)
);
create index offering_schedules_offering on public.offering_schedules (offering_id, effective_from desc);

-- C-91. A holiday is a DATE RANGE with a scope, not a single date.
-- branch_id NULL means every branch.
create table public.holidays (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 2 and 80),
  start_date date not null,
  end_date   date not null,
  branch_id  uuid references public.branches(id),
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint holiday_range_valid check (end_date >= start_date)
);
create index holidays_range on public.holidays using gist (daterange(start_date, end_date, '[]'));
create index holidays_branch on public.holidays (branch_id);
create trigger holidays_updated_at before update on public.holidays
  for each row execute function public.set_updated_at();

comment on table public.holidays is
  'Overlapping holidays are ALLOWED on purpose: a regional festival legitimately falls inside a national one. holidays-upsert warns about overlap rather than a unique index blocking it outright.';

-- ---------------------------------------------------------------------- RLS
alter table public.branches           enable row level security;
alter table public.branches           force  row level security;
alter table public.courses            enable row level security;
alter table public.courses            force  row level security;
alter table public.course_offerings   enable row level security;
alter table public.course_offerings   force  row level security;
alter table public.offering_schedules enable row level security;
alter table public.offering_schedules force  row level security;
alter table public.holidays           enable row level security;
alter table public.holidays           force  row level security;

-- Everyone active reads the organisation; only the super admin changes it, and
-- only while the subscription is writable (T23: a staff member must not be able
-- to silently alter everyone's expected sessions).
do $$
declare tbl text;
begin
  foreach tbl in array array['branches','courses','course_offerings','holidays'] loop
    execute format($f$
      create policy %1$s_read on public.%1$s
        for select to authenticated using (public.is_active_app_user());
      create policy %1$s_insert on public.%1$s
        for insert to authenticated
        with check (public.is_super_admin() and public.is_subscription_writable());
      create policy %1$s_update on public.%1$s
        for update to authenticated
        using (public.is_super_admin() and public.is_subscription_writable())
        with check (public.is_super_admin() and public.is_subscription_writable());
    $f$, tbl);
  end loop;
end $$;

-- Schedules are RPC-only: no direct INSERT/UPDATE policy at all, because a
-- schedule write has to be validated against completed sessions first.
create policy offering_schedules_read on public.offering_schedules
  for select to authenticated using (public.is_active_app_user());

grant select on public.branches, public.courses, public.course_offerings,
                public.offering_schedules, public.holidays to authenticated;
grant insert, update on public.branches, public.courses, public.course_offerings,
                        public.holidays to authenticated;
grant all on public.branches, public.courses, public.course_offerings,
             public.offering_schedules, public.holidays to service_role;
revoke all on public.branches, public.courses, public.course_offerings,
              public.offering_schedules, public.holidays from anon;

create trigger audit_branches  after insert or update on public.branches
  for each row execute function public.audit_row_change('branch');
create trigger audit_courses   after insert or update on public.courses
  for each row execute function public.audit_row_change('course');
create trigger audit_offerings after insert or update on public.course_offerings
  for each row execute function public.audit_row_change('offering');
create trigger audit_schedules after insert or update or delete on public.offering_schedules
  for each row execute function public.audit_row_change('offering_schedule');
create trigger audit_holidays  after insert or update or delete on public.holidays
  for each row execute function public.audit_row_change('holiday');

-- ===================================================================
-- 0006_members.sql
-- ===================================================================
-- 0006 · members, their Google Meet display names, emails, enrolment, schedule
--
-- C-70: a member has NO phone number. It was never a matching key and the
-- attendance system does not need it. (app_users.phone_e164 is a different
-- thing entirely -- it is the STAFF sign-in identifier and stays required.)

create table public.members (
  id               uuid primary key default gen_random_uuid(),
  member_code      text not null,
  full_name        text not null check (length(btrim(full_name)) between 2 and 120),
  name_normalized  text generated always as (public.normalize_name(full_name)) stored,
  status           text not null default 'active' check (status in ('active','paused','inactive')),
  status_changed_at timestamptz,
  joined_on        date,
  notes            text,
  created_by       uuid references public.app_users(id),
  updated_by       uuid references public.app_users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  deleted_at       timestamptz
);
create unique index members_code_live on public.members (member_code) where deleted_at is null;
create index members_name_norm on public.members (name_normalized);
create index members_status    on public.members (status) where deleted_at is null;
create trigger members_updated_at before update on public.members
  for each row execute function public.set_updated_at();

-- C-73. Several addresses, exactly one primary. Follow-up mail goes to the
-- primary only.
create table public.member_emails (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  email       citext not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  is_primary  boolean not null default false,
  status      text not null default 'unknown'
                check (status in ('unknown','valid','bounced','complained','unsubscribed')),
  source      text,
  created_by  uuid references public.app_users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  deleted_at  timestamptz
);
create unique index member_emails_unique_live on public.member_emails (email) where deleted_at is null;
create unique index member_emails_one_primary
  on public.member_emails (member_id) where is_primary and deleted_at is null;
create index member_emails_member on public.member_emails (member_id);
create trigger member_emails_updated_at before update on public.member_emails
  for each row execute function public.set_updated_at();

-- C-71 / C-72: "Google Meet display names".
-- The attendance CSV gives us Full Name and nothing else, so these aliases are
-- the primary matching signal, not a convenience. Uniqueness is ACADEMY-WIDE:
-- one display name can never point at two members, or an import would have to
-- guess.
create table public.member_aliases (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references public.members(id) on delete cascade,
  alias_type       text not null default 'name' check (alias_type in ('name','email')),
  alias_display    text not null,
  alias_normalized text not null,
  source           text,
  confirmed_by     uuid references public.app_users(id),
  import_id        uuid,
  created_at       timestamptz not null default now()
);
create unique index member_aliases_unique on public.member_aliases (alias_type, alias_normalized);
create index member_aliases_member on public.member_aliases (member_id);

create or replace function public.member_alias_normalize() returns trigger
language plpgsql as $$
begin
  new.alias_normalized := case new.alias_type
    when 'email' then public.normalize_email(new.alias_display)::text
    else public.normalize_name(new.alias_display) end;
  if new.alias_normalized is null then
    raise exception 'a display name must contain at least one letter or digit';
  end if;
  return new;
end $$;
create trigger member_aliases_normalize before insert or update on public.member_aliases
  for each row execute function public.member_alias_normalize();

create table public.member_enrollments (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references public.members(id) on delete cascade,
  offering_id    uuid not null references public.course_offerings(id),
  effective_from date not null,
  effective_to   date,
  status         text not null default 'active' check (status in ('active','ended')),
  note           text,
  created_by     uuid references public.app_users(id),
  created_at     timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  -- one offering at a time per member
  exclude using gist (
    member_id with =,
    daterange(effective_from, effective_to, '[]') with &&)
);
create index member_enrollments_offering on public.member_enrollments (offering_id);
create index member_enrollments_member   on public.member_enrollments (member_id, effective_from desc);

-- An individual override: ALWAYS a subset of the offering's weekdays. The
-- subset rule is enforced in set_member_schedule (0007), because it needs to
-- look at the offering schedule effective on the same dates.
create table public.member_schedules (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references public.members(id) on delete cascade,
  effective_from   date not null,
  effective_to     date,
  weekdays         smallint[] not null,
  sessions_per_week smallint generated always as (coalesce(array_length(weekdays,1),0)) stored,
  note             text,
  created_by       uuid references public.app_users(id),
  created_at       timestamptz not null default now(),
  constraint m_weekdays_non_empty check (coalesce(array_length(weekdays,1),0) between 1 and 7),
  constraint m_weekdays_in_range  check (weekdays <@ array[1,2,3,4,5,6,7]::smallint[]),
  constraint m_weekdays_no_nulls  check (array_position(weekdays, null) is null),
  check (effective_to is null or effective_to >= effective_from),
  exclude using gist (
    member_id with =,
    daterange(effective_from, effective_to, '[]') with &&)
);
create index member_schedules_member on public.member_schedules (member_id, effective_from desc);

-- A rebuildable cache. Never the source of truth: recompute_member_stats()
-- derives every column from attendance_records.
create table public.member_stats (
  member_id           uuid primary key references public.members(id) on delete cascade,
  current_streak      int not null default 0,
  sessions_expected   int not null default 0,
  sessions_attended   int not null default 0,
  last_present_date   date,
  last_countable_date date,
  last_emailed_at     timestamptz,
  updated_at          timestamptz not null default now()
);
create index member_stats_streak on public.member_stats (current_streak desc);

-- ---------------------------------------------------------------------- RLS
alter table public.members            enable row level security;
alter table public.members            force  row level security;
alter table public.member_emails      enable row level security;
alter table public.member_emails      force  row level security;
alter table public.member_aliases     enable row level security;
alter table public.member_aliases     force  row level security;
alter table public.member_enrollments enable row level security;
alter table public.member_enrollments force  row level security;
alter table public.member_schedules   enable row level security;
alter table public.member_schedules   force  row level security;
alter table public.member_stats       enable row level security;
alter table public.member_stats       force  row level security;

-- Members, their emails and their display names are day-to-day staff work.
do $$
declare tbl text;
begin
  foreach tbl in array array['members','member_emails','member_aliases'] loop
    execute format($f$
      create policy %1$s_read on public.%1$s
        for select to authenticated using (public.is_active_app_user());
      create policy %1$s_insert on public.%1$s
        for insert to authenticated
        with check (public.is_active_app_user() and public.is_subscription_writable());
      create policy %1$s_update on public.%1$s
        for update to authenticated
        using (public.is_active_app_user() and public.is_subscription_writable())
        with check (public.is_active_app_user() and public.is_subscription_writable());
    $f$, tbl);
  end loop;
  -- Enrolment, overrides and stats are read-only through PostgREST: they move
  -- only through RPCs that can check the subset rule and protect history.
  foreach tbl in array array['member_enrollments','member_schedules','member_stats'] loop
    execute format($f$
      create policy %1$s_read on public.%1$s
        for select to authenticated using (public.is_active_app_user());
    $f$, tbl);
  end loop;
end $$;

-- An alias may be removed (it was confirmed by mistake); a member never is.
create policy member_aliases_delete on public.member_aliases
  for delete to authenticated
  using (public.is_active_app_user() and public.is_subscription_writable());

grant select on public.members, public.member_emails, public.member_aliases,
                public.member_enrollments, public.member_schedules, public.member_stats
             to authenticated;
grant insert, update on public.members, public.member_emails, public.member_aliases to authenticated;
grant delete on public.member_aliases to authenticated;
grant all on public.members, public.member_emails, public.member_aliases,
             public.member_enrollments, public.member_schedules, public.member_stats
          to service_role;
revoke all on public.members, public.member_emails, public.member_aliases,
              public.member_enrollments, public.member_schedules, public.member_stats
           from anon;

create trigger audit_members      after insert or update on public.members
  for each row execute function public.audit_row_change('member');
create trigger audit_member_email after insert or update on public.member_emails
  for each row execute function public.audit_row_change('member_email');
create trigger audit_member_alias after insert or update or delete on public.member_aliases
  for each row execute function public.audit_row_change('member_alias');
create trigger audit_enrollments  after insert or update on public.member_enrollments
  for each row execute function public.audit_row_change('member_enrollment');
create trigger audit_m_schedules  after insert or update or delete on public.member_schedules
  for each row execute function public.audit_row_change('member_schedule');

-- ===================================================================
-- 0007_sessions.sql
-- ===================================================================
-- 0007 · sessions, the frozen expectation, holidays applied to dates
--
-- A session is one date an offering runs. Its expected set is computed from the
-- schedule ONCE and then FROZEN, so a later schedule change can never rewrite
-- what was expected of somebody in a week that has already been marked.

create table public.sessions (
  id                  uuid primary key default gen_random_uuid(),
  offering_id         uuid not null references public.course_offerings(id),
  session_date        date not null,
  start_time          time,
  end_time            time,
  status              text not null default 'scheduled'
                        check (status in ('scheduled','completed','cancelled','holiday')),
  source              text not null default 'generated'
                        check (source in ('generated','manual','import')),
  expectation_mode    text not null default 'schedule'
                        check (expectation_mode in ('schedule','all_enrolled','none')),
  cancellation_reason text,
  holiday_id          uuid references public.holidays(id),
  import_id           uuid,
  expected_count      int not null default 0,
  present_count       int not null default 0,
  absent_count        int not null default 0,
  extra_present_count int not null default 0,
  completed_at        timestamptz,
  created_by          uuid references public.app_users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz,
  deleted_at          timestamptz
);
create unique index sessions_unique_live
  on public.sessions (offering_id, session_date) where deleted_at is null;
create index sessions_date     on public.sessions (session_date);
create index sessions_offering on public.sessions (offering_id, status, session_date);
create index sessions_holiday  on public.sessions (holiday_id) where holiday_id is not null;
create trigger sessions_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();

-- The frozen expected set. Written when a session completes; read forever after.
create table public.session_expectations (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  member_id       uuid not null references public.members(id),
  schedule_source text not null check (schedule_source in ('offering','member','all_enrolled')),
  schedule_id     uuid,
  computed_at     timestamptz not null default now(),
  unique (session_id, member_id)
);
create index session_expectations_member on public.session_expectations (member_id);

-- ------------------------------------------------- who is expected, right now
-- Resolution order, and the ONLY one: offering schedule -> member enrolment ->
-- member override. The course's frequency is not consulted (C-59/CR-07).
create or replace function public.expected_members_for_session(p_session_id uuid)
returns table (member_id uuid, schedule_source text, schedule_id uuid)
language sql stable security definer set search_path = public as $$
  with s as (
    select id, offering_id, session_date, expectation_mode,
           extract(isodow from session_date)::smallint as dow
      from public.sessions
     where id = p_session_id and deleted_at is null
  ),
  -- the offering's schedule effective ON that date
  osched as (
    select os.id, os.weekdays
      from public.offering_schedules os join s on os.offering_id = s.offering_id
     where s.session_date >= os.effective_from
       and (os.effective_to is null or s.session_date <= os.effective_to)
  ),
  enrolled as (
    select e.member_id
      from public.member_enrollments e join s on e.offering_id = s.offering_id
     where s.session_date >= e.effective_from
       and (e.effective_to is null or s.session_date <= e.effective_to)
  ),
  -- an individual override, effective on that date, if she has one
  msched as (
    select ms.member_id, ms.id, ms.weekdays
      from public.member_schedules ms cross join s
     where s.session_date >= ms.effective_from
       and (ms.effective_to is null or s.session_date <= ms.effective_to)
  )
  select e.member_id,
         case when s.expectation_mode = 'all_enrolled' then 'all_enrolled'
              when ms.member_id is not null            then 'member'
              else 'offering' end,
         coalesce(ms.id, os.id)
    from enrolled e
    cross join s
    left join msched ms on ms.member_id = e.member_id
    left join osched os on true
   where s.expectation_mode <> 'none'
     and (
       s.expectation_mode = 'all_enrolled'
       -- the override wins where it exists, and it is always a SUBSET of the
       -- offering's days, so it can only ever narrow the expectation
       or (ms.member_id is not null and s.dow = any (ms.weekdays))
       or (ms.member_id is null     and s.dow = any (os.weekdays))
     )
$$;

-- ------------------------------------------------------------ generate sessions
-- Creates the scheduled dates an offering runs, honouring holidays. Never
-- touches a session that already exists, so it is safe to re-run.
create or replace function public.generate_sessions(
  p_offering_id uuid, p_from date, p_to date
) returns int
language plpgsql security definer set search_path = public as $$
declare v_created int := 0;
begin
  if p_to < p_from then raise exception 'to-date is before from-date'; end if;

  with cal as (
    select d::date as session_date
      from generate_series(p_from, p_to, interval '1 day') d
  ),
  due as (
    select c.session_date, os.id as sched_id
      from cal c
      join public.offering_schedules os
        on os.offering_id = p_offering_id
       and c.session_date >= os.effective_from
       and (os.effective_to is null or c.session_date <= os.effective_to)
     where extract(isodow from c.session_date)::smallint = any (os.weekdays)
  ),
  ins as (
    insert into public.sessions (offering_id, session_date, start_time, end_time,
                                 status, source, holiday_id)
    select p_offering_id, d.session_date, o.start_time, o.end_time,
           case when h.id is not null then 'holiday' else 'scheduled' end,
           'generated', h.id
      from due d
      join public.course_offerings o on o.id = p_offering_id
      left join lateral (
        select hh.id from public.holidays hh
         where d.session_date between hh.start_date and hh.end_date
           and (hh.branch_id is null or hh.branch_id = o.branch_id)
         order by hh.branch_id nulls last limit 1
      ) h on true
    on conflict do nothing
    returning 1
  )
  select count(*) into v_created from ins;
  return v_created;
end $$;

-- --------------------------------------------------------------- holiday apply
-- C-92: a holiday never counts, never extends a streak, never triggers
-- follow-up, and NEVER alters a recurring schedule. A COMPLETED session is
-- never converted -- history is not rewritten by a festival added later.
create or replace function public.apply_holiday(p_holiday_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  with h as (select * from public.holidays where id = p_holiday_id)
  update public.sessions s
     set status = 'holiday', holiday_id = h.id
    from h
    join public.course_offerings o on (h.branch_id is null or o.branch_id = h.branch_id)
   where s.offering_id = o.id
     and s.session_date between h.start_date and h.end_date
     and s.status = 'scheduled'            -- completed/cancelled are untouched
     and s.deleted_at is null;
  get diagnostics v_n = row_count;
  perform public.audit_log('holiday.applied','holiday', p_holiday_id::text,
    '[]'::jsonb, jsonb_build_object('sessions_marked', v_n));
  return v_n;
end $$;

-- The count the UI must show BEFORE saving (C-91), using the same query as the
-- apply, so the preview cannot disagree with what happens.
create or replace function public.preview_holiday(
  p_start date, p_end date, p_branch_id uuid default null
) returns table (offering_id uuid, course_name text, branch_name text, session_count bigint)
language sql stable security definer set search_path = public as $$
  select s.offering_id, c.name, b.name, count(*)
    from public.sessions s
    join public.course_offerings o on o.id = s.offering_id
    join public.courses  c on c.id = o.course_id
    join public.branches b on b.id = o.branch_id
   where s.session_date between p_start and p_end
     and s.status = 'scheduled'
     and s.deleted_at is null
     and (p_branch_id is null or o.branch_id = p_branch_id)
   group by s.offering_id, c.name, b.name
   order by c.name, b.name
$$;

create or replace function public.remove_holiday(p_holiday_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  update public.sessions
     set status = 'scheduled', holiday_id = null
   where holiday_id = p_holiday_id and status = 'holiday' and deleted_at is null;
  get diagnostics v_n = row_count;
  perform public.audit_log('holiday.removed','holiday', p_holiday_id::text,
    '[]'::jsonb, jsonb_build_object('sessions_restored', v_n));
  return v_n;
end $$;

-- ---------------------------------------------------------------------- RLS
alter table public.sessions              enable row level security;
alter table public.sessions              force  row level security;
alter table public.session_expectations  enable row level security;
alter table public.session_expectations  force  row level security;

create policy sessions_read on public.sessions
  for select to authenticated using (public.is_active_app_user());
-- Staff may cancel/uncancel a session and nothing else; every other column
-- moves through an RPC. Column-level UPDATE is how that is enforced.
create policy sessions_status_update on public.sessions
  for update to authenticated
  using (public.is_active_app_user() and public.is_subscription_writable())
  with check (public.is_active_app_user() and public.is_subscription_writable());
create policy session_expectations_read on public.session_expectations
  for select to authenticated using (public.is_active_app_user());

grant select on public.sessions, public.session_expectations to authenticated;
grant update (status, cancellation_reason) on public.sessions to authenticated;
grant all on public.sessions, public.session_expectations to service_role;
revoke all on public.sessions, public.session_expectations from anon;

create trigger audit_sessions after insert or update on public.sessions
  for each row execute function public.audit_row_change('session');

-- ===================================================================
-- 0008_attendance.sql
-- ===================================================================
-- 0008 · attendance facts, the streak, and period metrics
--
-- THE STRUCTURAL INVARIANT
--   check (status <> 'absent' or expected)
-- An 'absent' row must carry expected = true. Because "missed" counts absent
-- rows and "expected" counts expected rows, missed <= expected stops being
-- something the application has to remember and becomes something the database
-- cannot represent otherwise. Every report, chart and follow-up rule inherits
-- it for free.

create table public.csv_imports (
  id                 uuid primary key default gen_random_uuid(),
  file_name          text not null,
  file_sha256        text not null,
  storage_path       text,
  session_id         uuid references public.sessions(id),
  offering_id        uuid not null references public.course_offerings(id),
  session_date       date not null,
  row_count          int not null default 0,
  matched_count      int not null default 0,
  unmatched_count    int not null default 0,
  ambiguous_count    int not null default 0,
  possible_count     int not null default 0,   -- outcome C (C-78)
  missing_email_count int not null default 0,  -- outcome B (C-76)
  processed_count    int not null default 0,
  duplicates_in_file int not null default 0,
  status             text not null default 'previewed'
                       check (status in ('previewed','completed','failed','cancelled','reverted')),
  summary            jsonb not null default '{}'::jsonb,
  decisions          jsonb not null default '[]'::jsonb,
  error              text,
  uploaded_by        uuid references public.app_users(id),
  created_at         timestamptz not null default now(),
  completed_at       timestamptz
);
-- the same file cannot be imported twice
create unique index csv_imports_sha_completed
  on public.csv_imports (file_sha256) where status = 'completed';
create index csv_imports_session on public.csv_imports (session_id);
create index csv_imports_recent  on public.csv_imports (created_at desc);

create table public.attendance_records (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  member_id       uuid not null references public.members(id),
  status          text not null check (status in ('present','absent','extra')),
  expected        boolean not null,
  minutes_in_call int check (minutes_in_call >= 0),
  raw_display_name text,
  original_status text,
  correction_reason text,
  corrected_by    uuid references public.app_users(id),
  corrected_at    timestamptz,
  import_id       uuid references public.csv_imports(id),
  created_by      uuid references public.app_users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  deleted_at      timestamptz,
  -- ***** the invariant *****
  constraint absent_must_be_expected check (status <> 'absent' or expected),
  -- an 'extra' is someone who turned up when she was not expected
  constraint extra_is_not_expected   check (status <> 'extra' or not expected)
);
create unique index attendance_unique_live
  on public.attendance_records (session_id, member_id) where deleted_at is null;
create index attendance_member  on public.attendance_records (member_id, session_id);
create index attendance_session on public.attendance_records (session_id, status);
create index attendance_import  on public.attendance_records (import_id);
create trigger attendance_updated_at before update on public.attendance_records
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------- period metrics
-- The ONE place attendance numbers are computed. Dashboard tiles, the donut,
-- the week-wise table, the member report and the follow-up rule all read this,
-- so a chart cannot disagree with the report it sits next to (C-87).
create or replace function public.member_period_metrics(
  p_from date, p_to date,
  p_member_id uuid default null,
  p_offering_id uuid default null,
  p_branch_id uuid default null,
  p_course_id uuid default null
) returns table (
  member_id uuid, expected int, attended int, missed int,
  attendance_pct numeric, extra int
)
language sql stable security definer set search_path = public as $$
  select a.member_id,
         count(*) filter (where a.expected)                            ::int,
         count(*) filter (where a.expected and a.status = 'present')   ::int,
         count(*) filter (where a.status = 'absent')                   ::int,
         case when count(*) filter (where a.expected) = 0 then null
              else round(100.0 * count(*) filter (where a.expected and a.status='present')
                               / count(*) filter (where a.expected), 1) end,
         count(*) filter (where a.status = 'extra')                    ::int
    from public.attendance_records a
    join public.sessions s  on s.id = a.session_id and s.deleted_at is null
    join public.course_offerings o on o.id = s.offering_id
   where a.deleted_at is null
     and s.session_date between p_from and p_to
     -- holidays and cancellations are NOT countable opportunities (C-92/C-93)
     and s.status = 'completed'
     and (p_member_id   is null or a.member_id  = p_member_id)
     and (p_offering_id is null or s.offering_id = p_offering_id)
     and (p_branch_id   is null or o.branch_id   = p_branch_id)
     and (p_course_id   is null or o.course_id   = p_course_id)
   group by a.member_id
$$;

-- ---------------------------------------------------------------- the streak
-- RECOMPUTED, never incremented. An incrementing counter drifts the moment a
-- correction, a revert or a back-dated session lands; a recomputation cannot.
-- The current streak is the run of consecutive countable sessions, most recent
-- first, before the first 'present'.
create or replace function public.current_streak_for(p_member_id uuid) returns int
language sql stable security definer set search_path = public as $$
  with ordered as (
    select a.status, s.session_date,
           -- how many presents have been seen at or before this row, scanning
           -- backwards from today
           sum(case when a.status = 'present' then 1 else 0 end)
             over (order by s.session_date desc
                   rows between unbounded preceding and current row) as presents_seen
      from public.attendance_records a
      join public.sessions s on s.id = a.session_id and s.deleted_at is null
     where a.member_id = p_member_id
       and a.deleted_at is null
       and a.expected                 -- only countable opportunities
       and s.status = 'completed'
  )
  select coalesce(count(*), 0)::int
    from ordered
   where presents_seen = 0            -- everything before the most recent present
$$;

create or replace function public.recompute_member_stats(p_member_ids uuid[] default null)
returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  insert into public.member_stats as ms
    (member_id, current_streak, sessions_expected, sessions_attended,
     last_present_date, last_countable_date, updated_at)
  select m.id,
         public.current_streak_for(m.id),
         coalesce(agg.expected, 0),
         coalesce(agg.attended, 0),
         agg.last_present,
         agg.last_countable,
         now()
    from public.members m
    left join lateral (
      select count(*) filter (where a.expected)                          as expected,
             count(*) filter (where a.expected and a.status='present')   as attended,
             max(s.session_date) filter (where a.status='present')       as last_present,
             max(s.session_date) filter (where a.expected)               as last_countable
        from public.attendance_records a
        join public.sessions s on s.id = a.session_id and s.deleted_at is null
       where a.member_id = m.id and a.deleted_at is null and s.status = 'completed'
    ) agg on true
   where m.deleted_at is null
     and (p_member_ids is null or m.id = any (p_member_ids))
  on conflict (member_id) do update set
    current_streak      = excluded.current_streak,
    sessions_expected   = excluded.sessions_expected,
    sessions_attended   = excluded.sessions_attended,
    last_present_date   = excluded.last_present_date,
    last_countable_date = excluded.last_countable_date,
    updated_at          = now();
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- keep the denormalised session counters honest
create or replace function public.refresh_session_counts(p_session_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.sessions s set
    expected_count      = c.expected,
    present_count       = c.present,
    absent_count        = c.absent,
    extra_present_count = c.extra
  from (
    select count(*) filter (where expected)                        as expected,
           count(*) filter (where expected and status='present')   as present,
           count(*) filter (where status='absent')                 as absent,
           count(*) filter (where status='extra')                  as extra
      from public.attendance_records
     where session_id = p_session_id and deleted_at is null
  ) c
  where s.id = p_session_id
$$;

alter table public.attendance_records enable row level security;
alter table public.attendance_records force  row level security;
alter table public.csv_imports        enable row level security;
alter table public.csv_imports        force  row level security;

create policy attendance_read on public.attendance_records
  for select to authenticated using (public.is_active_app_user());
create policy csv_imports_read on public.csv_imports
  for select to authenticated using (public.is_active_app_user());
create policy csv_imports_insert on public.csv_imports
  for insert to authenticated
  with check (public.is_active_app_user() and public.is_subscription_writable()
              and status = 'previewed');

grant select on public.attendance_records, public.csv_imports to authenticated;
grant insert on public.csv_imports to authenticated;
grant all on public.attendance_records, public.csv_imports to service_role;
revoke all on public.attendance_records, public.csv_imports from anon;

create trigger audit_attendance after update on public.attendance_records
  for each row execute function public.audit_row_change('attendance');

-- ===================================================================
-- 0009_communication.sql
-- ===================================================================
-- 0009 · follow-up rules (global default -> per course) and email
--
-- C-60..C-64. Resolution order:
--     global default -> course-specific -> EFFECTIVE config for that course
-- There are NO member-level rules (C-65). A member is always evaluated against
-- her course's effective configuration.

create table public.follow_up_config (
  id                    uuid primary key default gen_random_uuid(),
  weekly_enabled        boolean not null default true,
  weekly_threshold      int     not null default 3 check (weekly_threshold > 0),
  consecutive_enabled   boolean not null default false,
  consecutive_threshold int     not null default 4 check (consecutive_threshold > 0),
  combination           text    not null default 'OR' check (combination in ('OR','AND')),
  min_expected          int     not null default 1 check (min_expected >= 1),
  present_min_minutes   int     not null default 0 check (present_min_minutes >= 0),
  week_start_day        smallint not null default 1 check (week_start_day between 1 and 7),
  is_active             boolean not null default true,
  updated_by            uuid references public.app_users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz,
  -- a config with both conditions off is savable but unreachable: reject it
  constraint at_least_one_condition check (weekly_enabled or consecutive_enabled)
);
create unique index one_active_global_config on public.follow_up_config ((is_active)) where is_active;
create trigger follow_up_config_updated_at before update on public.follow_up_config
  for each row execute function public.set_updated_at();
insert into public.follow_up_config default values;

-- C-60: a course may override the default. Same shape, same constraints.
create table public.course_follow_up_config (
  id                    uuid primary key default gen_random_uuid(),
  course_id             uuid not null references public.courses(id) on delete cascade,
  weekly_enabled        boolean not null default true,
  weekly_threshold      int     not null default 3 check (weekly_threshold > 0),
  consecutive_enabled   boolean not null default false,
  consecutive_threshold int     not null default 4 check (consecutive_threshold > 0),
  combination           text    not null default 'OR' check (combination in ('OR','AND')),
  min_expected          int     not null default 1 check (min_expected >= 1),
  is_active             boolean not null default true,
  updated_by            uuid references public.app_users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz,
  constraint course_at_least_one_condition check (weekly_enabled or consecutive_enabled)
);
create unique index one_active_config_per_course
  on public.course_follow_up_config (course_id) where is_active;
create trigger course_follow_up_updated_at before update on public.course_follow_up_config
  for each row execute function public.set_updated_at();

-- The course row if one is active, otherwise the global default.
create or replace function public.effective_follow_up_config(p_course_id uuid)
returns table (
  source text, weekly_enabled boolean, weekly_threshold int,
  consecutive_enabled boolean, consecutive_threshold int,
  combination text, min_expected int
)
language sql stable security definer set search_path = public as $$
  select 'course', c.weekly_enabled, c.weekly_threshold, c.consecutive_enabled,
         c.consecutive_threshold, c.combination, c.min_expected
    from public.course_follow_up_config c
   where c.course_id = p_course_id and c.is_active
  union all
  select 'global', g.weekly_enabled, g.weekly_threshold, g.consecutive_enabled,
         g.consecutive_threshold, g.combination, g.min_expected
    from public.follow_up_config g
   where g.is_active
     and not exists (select 1 from public.course_follow_up_config c
                      where c.course_id = p_course_id and c.is_active)
$$;

-- C-63: the two conditions, combined by OR or AND.
--   weekly_hit      = weekly_enabled      and missed >= weekly_threshold
--                                         and expected >= min_expected
--   consecutive_hit = consecutive_enabled and streak >= consecutive_threshold
-- The reason names the condition that fired, not the rule in general: an
-- operator has to be able to see why THIS member, today.
create or replace function public.follow_up_candidates(
  p_from date, p_to date,
  p_branch_id uuid default null,
  p_course_id uuid default null
) returns table (
  member_id uuid, full_name text, course_id uuid, course_name text,
  branch_name text, expected int, attended int, missed int,
  attendance_pct numeric, current_streak int,
  config_source text, reason text, has_email boolean
)
language sql stable security definer set search_path = public as $$
  with scope as (
    select distinct m.id as member_id, m.full_name, o.course_id, c.name as course_name,
           b.name as branch_name
      from public.members m
      join public.member_enrollments e on e.member_id = m.id
      join public.course_offerings   o on o.id = e.offering_id
      join public.courses  c on c.id = o.course_id
      join public.branches b on b.id = o.branch_id
     where m.deleted_at is null and m.status = 'active'
       and (p_branch_id is null or o.branch_id = p_branch_id)
       and (p_course_id is null or o.course_id = p_course_id)
  ),
  metric as (
    select s.*, coalesce(pm.expected,0) as expected, coalesce(pm.attended,0) as attended,
           coalesce(pm.missed,0) as missed, pm.attendance_pct,
           coalesce(st.current_streak,0) as current_streak,
           exists (select 1 from public.member_emails me
                    where me.member_id = s.member_id and me.is_primary
                      and me.deleted_at is null and me.status <> 'bounced') as has_email
      from scope s
      left join lateral public.member_period_metrics(p_from, p_to, s.member_id) pm on true
      left join public.member_stats st on st.member_id = s.member_id
  ),
  judged as (
    select m.*, cfg.source as config_source,
           (cfg.weekly_enabled and m.missed >= cfg.weekly_threshold
                                and m.expected >= cfg.min_expected)      as weekly_hit,
           (cfg.consecutive_enabled and m.current_streak >= cfg.consecutive_threshold)
                                                                          as consecutive_hit,
           cfg.combination, cfg.weekly_threshold, cfg.consecutive_threshold
      from metric m
      join lateral public.effective_follow_up_config(m.course_id) cfg on true
  )
  select member_id, full_name, course_id, course_name, branch_name,
         expected, attended, missed, attendance_pct, current_streak, config_source,
         case
           when weekly_hit and consecutive_hit then
             format('Missed %s of %s this week and %s consecutive', missed, expected, current_streak)
           when weekly_hit then
             format('Missed %s of %s sessions this week', missed, expected)
           else
             format('%s consecutive missed sessions', current_streak)
         end,
         has_email
    from judged
   where case when combination = 'OR' then (weekly_hit or consecutive_hit)
              else (weekly_hit and consecutive_hit) end
$$;

-- ------------------------------------------------------------------- email
-- C-68: templates only. There is no free-form compose anywhere -- not in the
-- UI and not in the API. send-email-batch accepts a template_id and nothing
-- resembling a subject or body.
create table public.email_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  subject    text not null,
  body_text  text not null,
  body_html  text,
  is_default boolean not null default false,
  is_active  boolean not null default true,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create unique index email_templates_name    on public.email_templates (lower(name));
create unique index email_templates_default on public.email_templates ((is_default)) where is_default;
create trigger email_templates_updated_at before update on public.email_templates
  for each row execute function public.set_updated_at();

insert into public.email_templates (name, subject, body_text, is_default) values
 ('Gentle check-in',
  'We missed you this week, {{first_name}}',
  E'Hello {{first_name}},\n\nYou were down for {{expected_sessions}} sessions in {{course_name}} between {{period_from}} and {{period_to}}, and made {{attended_sessions}}.\n\nNothing is wrong -- we would just like to see you back on the mat.\n\n{{academy_name}}',
  true);

create table public.email_batches (
  id               uuid primary key default gen_random_uuid(),
  client_batch_id  text not null unique,
  template_id      uuid not null references public.email_templates(id),
  subject_snapshot text not null,
  body_snapshot    text not null,
  context          jsonb not null default '{}'::jsonb,
  -- C-66: the EFFECTIVE config per course, so a report six months later can
  -- say which rule applied
  config_snapshot  jsonb not null default '{}'::jsonb,
  requested_count  int not null default 0,
  excluded_count   int not null default 0,
  sent_count       int not null default 0,
  failed_count     int not null default 0,
  status           text not null default 'processing'
                     check (status in ('processing','completed','completed_with_failures','cancelled')),
  sent_by          uuid references public.app_users(id),
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);
create index email_batches_recent on public.email_batches (created_at desc);

create table public.email_messages (
  id                  uuid primary key default gen_random_uuid(),
  batch_id            uuid not null references public.email_batches(id) on delete cascade,
  member_id           uuid not null references public.members(id),
  member_email_id     uuid references public.member_emails(id),
  to_email            citext,
  subject             text,
  variables           jsonb not null default '{}'::jsonb,
  status              text not null default 'queued'
                        check (status in ('queued','sending','sent','failed','bounced','complained','excluded')),
  exclusion_reason    text,
  provider            text,
  provider_message_id text,
  failure_reason      text,
  attempt_count       int not null default 0,
  sent_at             timestamptz,
  delivered_at        timestamptz,
  unique (batch_id, member_id, member_email_id)
);
create unique index email_messages_provider_id
  on public.email_messages (provider_message_id) where provider_message_id is not null;
create index email_messages_member on public.email_messages (member_id, sent_at desc);
create index email_messages_status on public.email_messages (status);

create table public.email_events (
  id                  bigint generated always as identity primary key,
  provider            text not null,
  provider_message_id text not null,
  event_type          text not null,
  payload             jsonb not null default '{}'::jsonb,
  received_at         timestamptz not null default now(),
  unique (provider, provider_message_id, event_type)   -- webhook idempotency
);

alter table public.follow_up_config        enable row level security;
alter table public.follow_up_config        force  row level security;
alter table public.course_follow_up_config enable row level security;
alter table public.course_follow_up_config force  row level security;
alter table public.email_templates         enable row level security;
alter table public.email_templates         force  row level security;
alter table public.email_batches           enable row level security;
alter table public.email_batches           force  row level security;
alter table public.email_messages          enable row level security;
alter table public.email_messages          force  row level security;
alter table public.email_events            enable row level security;
alter table public.email_events            force  row level security;

-- Q-D6 interim: rule editing is SUPER ADMIN ONLY. Widening a threshold mails
-- more members, so it is organisation configuration, not day-to-day work.
create policy fuc_read on public.follow_up_config
  for select to authenticated using (public.is_active_app_user());
create policy fuc_write on public.follow_up_config
  for update to authenticated
  using (public.is_super_admin() and public.is_subscription_writable())
  with check (public.is_super_admin() and public.is_subscription_writable());
create policy cfuc_read on public.course_follow_up_config
  for select to authenticated using (public.is_active_app_user());
create policy cfuc_insert on public.course_follow_up_config
  for insert to authenticated
  with check (public.is_super_admin() and public.is_subscription_writable());
create policy cfuc_update on public.course_follow_up_config
  for update to authenticated
  using (public.is_super_admin() and public.is_subscription_writable())
  with check (public.is_super_admin() and public.is_subscription_writable());

-- Templates are all-staff (they are the only way to send anything at all).
create policy tmpl_read on public.email_templates
  for select to authenticated using (public.is_active_app_user());
create policy tmpl_insert on public.email_templates
  for insert to authenticated
  with check (public.is_active_app_user() and public.is_subscription_writable());
create policy tmpl_update on public.email_templates
  for update to authenticated
  using (public.is_active_app_user() and public.is_subscription_writable())
  with check (public.is_active_app_user() and public.is_subscription_writable());

-- Batches and messages are written by the Edge Function only.
create policy batches_read  on public.email_batches  for select to authenticated using (public.is_active_app_user());
create policy messages_read on public.email_messages for select to authenticated using (public.is_active_app_user());
create policy events_read   on public.email_events   for select to authenticated using (public.is_super_admin());

grant select on public.follow_up_config, public.course_follow_up_config,
                public.email_templates, public.email_batches, public.email_messages,
                public.email_events to authenticated;
grant update on public.follow_up_config to authenticated;
grant insert, update on public.course_follow_up_config, public.email_templates to authenticated;
grant all on public.follow_up_config, public.course_follow_up_config, public.email_templates,
             public.email_batches, public.email_messages, public.email_events to service_role;
revoke all on public.follow_up_config, public.course_follow_up_config, public.email_templates,
              public.email_batches, public.email_messages, public.email_events from anon;

create trigger audit_fuc   after insert or update on public.follow_up_config
  for each row execute function public.audit_row_change('follow_up_config');
create trigger audit_cfuc  after insert or update on public.course_follow_up_config
  for each row execute function public.audit_row_change('course_follow_up_config');
create trigger audit_tmpl  after insert or update on public.email_templates
  for each row execute function public.audit_row_change('email_template');

-- ===================================================================
-- 0010_user_preferences.sql
-- ===================================================================
-- 0010 · per-user appearance  [C-81, C-82]
--
-- Plan V2.2 §11.2 specified a controlled set of accents and an accent_key
-- column, on the stated grounds that "the user picks from measured options,
-- so no runtime calculation can go wrong". The design canvas supersedes that
-- with a hue slider, and this table follows the canvas -- but it keeps the
-- guarantee C-82 was protecting rather than dropping it:
--
--   * accent_key stays the stored choice, and 'custom' is the only value that
--     is not a key into the pre-measured set.
--   * accent_hue is constrained to 0..359, and every one of those 360 hues is
--     measured at BUILD time by scripts/check-contrast.ts -- both themes,
--     text on every surface, white on the fill. The build fails if any pair
--     drops below 4.5:1, so no reachable hue can ship a failing pair.
--
-- That is a stronger guarantee than the curated list gave: three of the six
-- canvas presets (Coral, Teal, Gold) shipped white labels at 3.05-3.67:1 and
-- had to be corrected before they could enter the set.

create table public.user_preferences (
  app_user_id uuid primary key references public.app_users(id) on delete cascade,
  theme_mode  text     not null default 'system'
                       check (theme_mode in ('light','dark','system')),
  -- a key into the approved set, or 'custom' to use accent_hue
  accent_key  text     not null default 'rosifit'
                       check (accent_key in
                         ('rosifit','plum','coral','teal','indigo','gold','custom')),
  accent_hue  smallint not null default 322
                       check (accent_hue between 0 and 359),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create trigger user_preferences_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

-- Per user, never global: one staff member's choice never changes another's.
-- Deliberately NOT readable by a super admin -- an appearance preference is
-- not an administrative fact, and there is no screen that shows anyone
-- else's.
create policy user_preferences_self_read on public.user_preferences
  for select to authenticated
  using (app_user_id = public.current_app_user_id());

create policy user_preferences_self_insert on public.user_preferences
  for insert to authenticated
  with check (app_user_id = public.current_app_user_id());

create policy user_preferences_self_update on public.user_preferences
  for update to authenticated
  using (app_user_id = public.current_app_user_id())
  with check (app_user_id = public.current_app_user_id());

-- No DELETE policy: a preference row is upserted, never removed. It goes with
-- the user when the user goes (on delete cascade).

comment on table public.user_preferences is
  'Per-user appearance. accent_key is a key into the measured accent set, or '
  '''custom'', in which case accent_hue selects a build-time-measured hue.';

-- Grants. RLS decides WHICH rows; the grant decides whether the role may
-- touch the table at all. Both are required -- a policy without a grant is a
-- permission-denied, not an empty result.
grant select, insert, update on public.user_preferences to authenticated;
grant all                    on public.user_preferences to service_role;
-- No delete to authenticated: the row is upserted, never removed.

commit;
