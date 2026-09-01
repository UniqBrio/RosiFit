\echo 'follow-up: global default, per-course override, OR vs AND'
begin;
insert into auth.users (id) values ('eeeeeeee-0000-0000-0000-000000000001');
insert into public.app_users (auth_user_id, kind, name, phone_e164)
  values ('eeeeeeee-0000-0000-0000-000000000001','super_admin','Rosi','+919994871158');
insert into public.branches (name, code) values ('Coimbatore','CBE');
insert into public.courses (name) values ('Fitness'), ('Yoga'), ('Prenatal Yoga');
insert into public.course_offerings (course_id, branch_id)
  select c.id, b.id from public.courses c, public.branches b;
-- Fitness and Prenatal Yoga run 6 days; Yoga runs 4
insert into public.offering_schedules (offering_id, effective_from, weekdays)
  select o.id, '2026-08-01',
         case when c.name='Yoga' then array[1,2,4,6]::smallint[]
              else array[1,2,3,4,5,6]::smallint[] end
    from public.course_offerings o join public.courses c on c.id=o.course_id;

-- C-60..C-63: Fitness weekly>=3 OR consecutive>=4 ; Yoga weekly>=2 AND consecutive>=3
insert into public.course_follow_up_config
  (course_id, weekly_enabled, weekly_threshold, consecutive_enabled, consecutive_threshold, combination)
select id, true, 3, true, 4, 'OR'  from public.courses where name='Fitness';
insert into public.course_follow_up_config
  (course_id, weekly_enabled, weekly_threshold, consecutive_enabled, consecutive_threshold, combination)
select id, true, 2, true, 3, 'AND' from public.courses where name='Yoga';
-- Prenatal Yoga deliberately has NO course config -> must fall back to global
commit;

-- C-64 resolution
select t.eq((select source from public.effective_follow_up_config(
              (select id from public.courses where name='Fitness'))), 'course',
  'a course with its own rule resolves to "course"');
select t.eq((select source from public.effective_follow_up_config(
              (select id from public.courses where name='Prenatal Yoga'))), 'global',
  'a course with no rule falls back to the global default (C-64)');
select t.eq((select weekly_threshold from public.effective_follow_up_config(
              (select id from public.courses where name='Prenatal Yoga'))), 3,
  'and inherits the global threshold of 3');

-- both conditions off is unreachable, so it is refused at save
select t.rejects($$update public.follow_up_config
                     set weekly_enabled=false, consecutive_enabled=false$$,
  'a config with both conditions off is refused', 'at_least_one_condition');
select t.rejects($$update public.follow_up_config set weekly_threshold = 0$$,
  'a threshold of 0 would mail everyone -- refused', 'weekly_threshold_check');

-- ---- build the six worked examples from the plan, on real attendance ----
begin;
-- members, one per scenario
insert into public.members (member_code, full_name) values
  ('RF-1','Fit Weekly'),      -- Fitness: missed 3 of 6, streak 2  -> ELIGIBLE (weekly)
  ('RF-2','Fit Streak'),      -- Fitness: missed 2 of 6, streak 4  -> ELIGIBLE (consecutive)
  ('RF-3','Fit Neither'),     -- Fitness: missed 2 of 6, streak 2  -> not eligible
  ('RF-4','Yoga Short'),      -- Yoga: missed 2 of 4, streak 2     -> not eligible (AND)
  ('RF-5','Yoga Both'),       -- Yoga: missed 3 of 4, streak 3     -> ELIGIBLE (AND)
  ('RF-6','Prenatal Global'); -- Prenatal Yoga: missed 3 of 4      -> ELIGIBLE (global)

insert into public.member_enrollments (member_id, offering_id, effective_from)
select m.id, o.id, '2026-08-01'
  from public.members m
  join public.course_offerings o on true
  join public.courses c on c.id = o.course_id
 where (m.member_code in ('RF-1','RF-2','RF-3') and c.name='Fitness')
    or (m.member_code in ('RF-4','RF-5')        and c.name='Yoga')
    or (m.member_code  = 'RF-6'                 and c.name='Prenatal Yoga');

select public.generate_sessions(o.id, '2026-08-17','2026-08-22') from public.course_offerings o;
update public.sessions set status='completed', completed_at=now();
commit;

-- mark attendance. absent_first = the run at the END of the week (the streak).
begin;
insert into public.attendance_records (session_id, member_id, status, expected)
select s.id, m.id,
  case m.member_code
    -- 6 sessions Mon-Sat. present unless listed absent.
    when 'RF-1' then case when s.session_date in ('2026-08-17','2026-08-18','2026-08-22')
                          then 'absent' else 'present' end          -- 3 missed, streak 1
    when 'RF-2' then case when s.session_date in ('2026-08-21','2026-08-22')
                          then 'absent' else 'present' end          -- 2 missed, streak 2
    when 'RF-3' then case when s.session_date in ('2026-08-17','2026-08-19')
                          then 'absent' else 'present' end          -- 2 missed, streak 0
    -- Yoga runs 4 days: Mon Tue Thu Sat
    when 'RF-4' then case when s.session_date in ('2026-08-17','2026-08-18')
                          then 'absent' else 'present' end          -- 2 missed, streak 0
    when 'RF-5' then case when s.session_date in ('2026-08-18','2026-08-20','2026-08-22')
                          then 'absent' else 'present' end          -- 3 missed, streak 1
    when 'RF-6' then case when s.session_date in ('2026-08-17','2026-08-18','2026-08-19')
                          then 'absent' else 'present' end
  end, true
from public.sessions s
join public.member_enrollments e on e.offering_id = s.offering_id
join public.members m on m.id = e.member_id;
select public.recompute_member_stats();
commit;

-- sanity on the fixture itself before judging the rule
select t.eq((select missed from public.member_period_metrics('2026-08-17','2026-08-22',
             (select id from public.members where member_code='RF-1'))), 3, 'RF-1 missed 3 of 6');
select t.eq((select expected from public.member_period_metrics('2026-08-17','2026-08-22',
             (select id from public.members where member_code='RF-4'))), 4, 'Yoga expects 4, not 6');

-- give RF-2 a real consecutive run of 4 so the OR fires on the second condition
begin;
update public.attendance_records a set status='absent'
  from public.sessions s
 where s.id=a.session_id and a.member_id=(select id from public.members where member_code='RF-2')
   and s.session_date >= '2026-08-19';
select public.recompute_member_stats();
commit;
select t.eq((select current_streak from public.member_stats ms join public.members m
             on m.id=ms.member_id where m.member_code='RF-2'), 4, 'RF-2 has a run of 4');

-- ---------------------------- the rule itself ----------------------------
select t.ok(exists (select 1 from public.follow_up_candidates('2026-08-17','2026-08-22')
                     where full_name='Fit Weekly'),
  'OR: the weekly condition alone lists the member');
select t.ok(exists (select 1 from public.follow_up_candidates('2026-08-17','2026-08-22')
                     where full_name='Fit Streak'),
  'OR: the consecutive condition alone lists the member');
select t.ok(not exists (select 1 from public.follow_up_candidates('2026-08-17','2026-08-22')
                     where full_name='Fit Neither'),
  'OR: neither condition -> not listed');
select t.ok(not exists (select 1 from public.follow_up_candidates('2026-08-17','2026-08-22')
                     where full_name='Yoga Short'),
  'AND: weekly hit but streak short -> NOT listed');
select t.ok(exists (select 1 from public.follow_up_candidates('2026-08-17','2026-08-22')
                     where full_name='Yoga Both'),
  'AND: both conditions -> listed');
select t.ok(exists (select 1 from public.follow_up_candidates('2026-08-17','2026-08-22')
                     where full_name='Prenatal Global' and config_source='global'),
  'a course with no rule of its own is judged by the global default');

-- the reason must name the condition that fired, not the rule in general
select t.eq((select reason from public.follow_up_candidates('2026-08-17','2026-08-22')
             where full_name='Fit Weekly'), 'Missed 3 of 6 sessions this week',
  'the reason names the weekly condition and its real numbers');

-- C-76: no email means excluded from sending, but still listed and counted
select t.eq((select has_email from public.follow_up_candidates('2026-08-17','2026-08-22')
             where full_name='Fit Weekly'), false,
  'a member with no email is still listed, flagged as unsendable (C-76)');
