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
