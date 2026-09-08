-- RosiFit: wipe ALL application data and return the project to "nobody has
-- registered yet". Paste the whole thing into the Supabase SQL editor (it
-- runs as postgres) and execute once. Schema, functions, RLS policies and the
-- security-question list are kept. Everything else goes.
begin;

-- 1. audit_logs / audit_remarks are append-only by trigger. Lift the guards
--    for this transaction only; they are re-enabled at the end.
alter table public.audit_remarks disable trigger user;
alter table public.audit_logs    disable trigger user;

-- 2. Every data table, including the two seeded config rows (they carry an
--    FK to app_users, so CASCADE takes them anyway). Re-seeded in step 5.
truncate table
  public.attendance_records,
  public.session_expectations,
  public.sessions,
  public.csv_imports,
  public.member_import_runs,
  public.member_stats,
  public.member_schedules,
  public.member_enrollments,
  public.member_aliases,
  public.member_emails,
  public.members,
  public.holidays,
  public.offering_schedules,
  public.course_communication,
  public.course_follow_up_config,
  public.course_offerings,
  public.courses,
  public.branches,
  public.email_events,
  public.email_messages,
  public.email_batches,
  public.email_templates,
  public.follow_up_config,
  public.user_preferences,
  public.pin_reset_requests,
  public.mobile_number_changes,
  public.auth_rate_limits,
  public.super_admin_recovery,
  public.app_users
restart identity cascade;

-- 3. Sign-in identities. app_users points at these with ON DELETE RESTRICT,
--    which is why app_users had to go first. Cascades to auth.identities,
--    auth.sessions and auth.refresh_tokens.
delete from auth.users;

-- 4. Singletons back to migration defaults (the id=1 rows must exist).
--    bootstrap_completed is a one-way latch guarded by trigger and is left
--    alone; registration (auth-bootstrap) no longer checks it.
update public.app_settings set
  academy_name       = default,
  sender_name        = default,
  timezone           = default,
  week_start_day     = default,
  max_emails_per_day = default,
  expiry_mode        = default,
  role_labels        = default,
  csv_mapping        = default
where id = 1;

update public.app_subscription set
  customer_name   = default,
  plan_label      = default,
  start_date      = default,
  expires_at      = default,
  grace_days      = default,
  status          = default,
  renewed_at      = null,
  renewal_history = default
where id = 1;

-- 5. Re-seed the two rows migrations 0009 created.
insert into public.follow_up_config default values;
insert into public.email_templates (name, subject, body_text, is_default) values
 ('Gentle check-in',
  'We missed you this week, {{first_name}}',
  E'Hello {{first_name}},\n\nYou were down for {{expected_sessions}} sessions in {{course_name}} between {{period_from}} and {{period_to}}, and made {{attended_sessions}}.\n\nNothing is wrong -- we would just like to see you back on the mat.\n\n{{academy_name}}',
  true);

-- 6. Audit trail LAST, so the writes above do not leave rows behind.
truncate table public.audit_remarks, public.audit_logs restart identity cascade;

alter table public.audit_logs    enable trigger user;
alter table public.audit_remarks enable trigger user;

commit;

-- Sanity check: every count should be 0.
select 'app_users' t, count(*) from public.app_users
union all select 'auth.users',   count(*) from auth.users
union all select 'members',      count(*) from public.members
union all select 'courses',      count(*) from public.courses
union all select 'audit_logs',   count(*) from public.audit_logs;
