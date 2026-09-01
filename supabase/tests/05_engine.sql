\echo 'engine: expectation, invariant, streak, metrics, holidays'
begin;
insert into auth.users (id) values ('dddddddd-0000-0000-0000-000000000001');
insert into public.app_users (auth_user_id, kind, name, phone_e164)
  values ('dddddddd-0000-0000-0000-000000000001','super_admin','Rosi','+919994871158');
insert into public.branches (name, code) values ('Coimbatore','CBE');
insert into public.courses (name, default_frequency) values ('Prenatal Fitness', 6);
insert into public.course_offerings (course_id, branch_id, start_time, end_time)
  select c.id, b.id, '06:00','07:00' from public.courses c, public.branches b;
-- the offering runs Mon/Tue/Thu/Sat, though the course "intends" 6
insert into public.offering_schedules (offering_id, effective_from, weekdays)
  select id, '2026-08-01', array[1,2,4,6]::smallint[] from public.course_offerings;
insert into public.members (member_code, full_name) values
  ('RF-000118','Shazia Farheen'), ('RF-000204','Meena Raj');
insert into public.member_enrollments (member_id, offering_id, effective_from)
  select m.id, o.id, '2026-08-01' from public.members m, public.course_offerings o;
-- Meena only attends Mon and Thu: an override, always a SUBSET
insert into public.member_schedules (member_id, effective_from, weekdays)
  select id, '2026-08-01', array[1,4]::smallint[] from public.members where member_code='RF-000204';
commit;

-- generate the week Mon 17 Aug - Sun 23 Aug 2026
select t.eq(public.generate_sessions((select id from public.course_offerings),
            '2026-08-17','2026-08-23'), 4,
  'four sessions generated from the schedule (Mon Tue Thu Sat), not from frequency 6');

select t.eq((select count(*)::int from public.sessions where status='scheduled'), 4,
  'all four are scheduled');

-- CR-07 again, now with real sessions
select t.eq((select default_frequency::int from public.courses), 6, 'the course still states 6');
select t.eq((select count(*)::int from public.sessions), 4,
  'the engine counted the offering''s 4 days, never the course''s 6 (CR-07)');

-- who is expected on Monday 17 Aug (isodow 1)?
select t.eq((select count(*)::int from public.expected_members_for_session(
              (select id from public.sessions where session_date='2026-08-17'))), 2,
  'Monday: both members expected');
-- Tuesday 18 Aug: Meena's override excludes her
select t.eq((select count(*)::int from public.expected_members_for_session(
              (select id from public.sessions where session_date='2026-08-18'))), 1,
  'Tuesday: only Shazia -- the member override narrows the expectation');
select t.eq((select schedule_source from public.expected_members_for_session(
              (select id from public.sessions where session_date='2026-08-17'))
             where member_id=(select id from public.members where member_code='RF-000204')),
  'member', 'the override is recorded as the source for that member');

-- ***** the structural invariant *****
select t.rejects($$insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'absent', false
      from public.sessions s, public.members m
     where s.session_date='2026-08-17' and m.member_code='RF-000118'$$,
  'an ABSENT record that was not expected cannot exist -- missed <= expected is structural',
  'absent_must_be_expected');
select t.rejects($$insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'extra', true
      from public.sessions s, public.members m
     where s.session_date='2026-08-17' and m.member_code='RF-000118'$$,
  'an EXTRA record cannot be marked expected', 'extra_is_not_expected');

-- mark the week: Shazia misses Mon, Tue, Thu; attends Sat
begin;
insert into public.attendance_records (session_id, member_id, status, expected)
select s.id, m.id,
       case when s.session_date = '2026-08-22' then 'present' else 'absent' end, true
  from public.sessions s, public.members m
 where m.member_code='RF-000118';
update public.sessions set status='completed', completed_at=now();
select public.recompute_member_stats();
commit;

select t.eq((select expected from public.member_period_metrics('2026-08-17','2026-08-23',
              (select id from public.members where member_code='RF-000118'))), 4,
  'expected = 4');
select t.eq((select missed from public.member_period_metrics('2026-08-17','2026-08-23',
              (select id from public.members where member_code='RF-000118'))), 3,
  'missed = 3');
select t.eq((select attended from public.member_period_metrics('2026-08-17','2026-08-23',
              (select id from public.members where member_code='RF-000118'))), 1,
  'attended = 1');
select t.eq((select attendance_pct from public.member_period_metrics('2026-08-17','2026-08-23',
              (select id from public.members where member_code='RF-000118'))), 25.0,
  'attendance = 25%');

-- streak: she attended on Sat 22, the most recent session, so the run is 0
select t.eq((select current_streak from public.member_stats ms
             join public.members m on m.id=ms.member_id where m.member_code='RF-000118'), 0,
  'a present on the most recent session resets the streak to 0');

-- now she misses the following Monday too
begin;
select public.generate_sessions((select id from public.course_offerings),'2026-08-24','2026-08-24');
insert into public.attendance_records (session_id, member_id, status, expected)
select s.id, m.id, 'absent', true from public.sessions s, public.members m
 where s.session_date='2026-08-24' and m.member_code='RF-000118';
update public.sessions set status='completed' where session_date='2026-08-24';
select public.recompute_member_stats();
commit;
select t.eq((select current_streak from public.member_stats ms
             join public.members m on m.id=ms.member_id where m.member_code='RF-000118'), 1,
  'one miss after the last present -> streak 1');

-- recomputation is idempotent: running it again must not "increment"
begin; select public.recompute_member_stats(); commit;
select t.eq((select current_streak from public.member_stats ms
             join public.members m on m.id=ms.member_id where m.member_code='RF-000118'), 1,
  'recompute is idempotent -- the streak does not drift when re-run');

-- C-92: a holiday never counts
begin;
insert into public.holidays (name, start_date, end_date) values ('Festival','2026-08-25','2026-08-25');
select public.generate_sessions((select id from public.course_offerings),'2026-08-25','2026-08-25');
commit;
select t.eq((select status from public.sessions where session_date='2026-08-25'), 'holiday',
  'a session generated on a holiday date is born as holiday, not scheduled');
select t.eq((select expected from public.member_period_metrics('2026-08-25','2026-08-25',
              (select id from public.members where member_code='RF-000118')))::text, null::text,
  'a holiday contributes nothing to expected -- no row at all');

-- a holiday added AFTER the fact must not rewrite a completed session
begin;
insert into public.holidays (name, start_date, end_date) values ('Late notice','2026-08-24','2026-08-24');
select public.apply_holiday((select id from public.holidays where name='Late notice'));
commit;
select t.eq((select status from public.sessions where session_date='2026-08-24'), 'completed',
  'a holiday added later NEVER converts an already-completed session (C-92)');
select t.eq((select current_streak from public.member_stats ms
             join public.members m on m.id=ms.member_id where m.member_code='RF-000118'), 1,
  'and the streak is unchanged by it');
