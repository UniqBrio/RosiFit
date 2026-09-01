\echo 'organisation: course shape, schedule versioning, holiday ranges'
begin;
insert into auth.users (id) values ('bbbbbbbb-0000-0000-0000-000000000001');
insert into public.app_users (auth_user_id, kind, name, phone_e164)
  values ('bbbbbbbb-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158');
insert into public.branches (name, code, city) values
  ('Coimbatore','CBE','Coimbatore'), ('Salem','SLM','Salem');
insert into public.courses (name, default_start_time, default_end_time, default_frequency)
  values ('Prenatal Fitness','06:00','07:00',6);
commit;

-- C-57: the commercial fields do not exist, at the schema level
select t.ok(not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='courses'
      and column_name in ('fee','price','amount','code','short_code')),
  'courses has no fee and no short code (C-57)');

select t.rejects($$insert into public.courses (name, default_frequency) values ('Bad',9)$$,
  'frequency must be 1-7', 'default_frequency_check');
select t.rejects($$insert into public.courses (name, default_start_time, default_end_time)
                   values ('Bad','07:00','06:00')$$,
  'end time must be after start time', 'check');
select t.rejects($$insert into public.courses (name) values ('prenatal fitness')$$,
  'course names are unique case-insensitively', 'courses_name_live');

begin;
insert into public.course_offerings (course_id, branch_id, start_time, end_time)
select c.id, b.id, c.default_start_time, c.default_end_time
  from public.courses c, public.branches b where c.name='Prenatal Fitness';
commit;
select t.eq((select count(*)::int from public.course_offerings), 2,
  'the same course runs at two branches');

-- CR-06: changing the course time must NOT touch an existing offering
begin;
  update public.courses set default_start_time='05:00' where name='Prenatal Fitness';
commit;
select t.eq((select distinct start_time::text from public.course_offerings), '06:00:00',
  'changing the course default does NOT move an existing offering (CR-06)');

-- schedules: weekdays are the source of truth, versions cannot overlap
begin;
insert into public.offering_schedules (offering_id, effective_from, weekdays)
select id, '2026-01-01', array[1,2,4,6]::smallint[] from public.course_offerings limit 1;
commit;
select t.eq((select sessions_per_week::int from public.offering_schedules), 4,
  'sessions_per_week is generated from the weekdays, not from the course');

select t.rejects($$insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select offering_id,'2026-06-01',array[1,3]::smallint[] from public.offering_schedules limit 1$$,
  'two schedules cannot overlap in time for one offering', 'exclusion');
select t.rejects($$insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select id,'2026-01-01',array[9]::smallint[] from public.course_offerings offset 1 limit 1$$,
  'weekday 9 does not exist', 'check');
select t.rejects($$insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select id,'2026-01-01',array[]::smallint[] from public.course_offerings offset 1 limit 1$$,
  'a schedule with no weekdays is meaningless', 'check');

-- CR-07: frequency says 6, the offering runs 4. Both are stored; neither is
-- silently reconciled. The engine reads only the schedule.
select t.eq((select c.default_frequency::int from public.courses c), 6, 'course still states 6');
select t.eq((select s.sessions_per_week::int from public.offering_schedules s), 4,
  'the offering runs 4 -- attendance counts 4 (CR-07)');

-- C-91/C-92: holidays are ranges with a scope, and may overlap
begin;
insert into public.holidays (name, start_date, end_date) values ('Diwali','2026-10-20','2026-10-22');
insert into public.holidays (name, start_date, end_date, branch_id)
  select 'Local festival','2026-10-21','2026-10-21', id from public.branches where code='CBE';
commit;
select t.eq((select count(*)::int from public.holidays), 2,
  'a branch holiday may overlap an academy-wide one (both are legitimate)');
select t.rejects($$insert into public.holidays (name,start_date,end_date)
                   values ('Backwards','2026-10-22','2026-10-20')$$,
  'end date must be on or after start date', 'holiday_range_valid');
select t.rejects($$insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select id,'2026-01-01',array[null]::smallint[] from public.course_offerings offset 1 limit 1$$,
  'a NULL weekday is rejected too (same NULL-in-CHECK trap)', 'violates check constraint');
