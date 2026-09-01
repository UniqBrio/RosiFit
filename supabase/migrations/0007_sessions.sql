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
