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
