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
