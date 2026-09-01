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
