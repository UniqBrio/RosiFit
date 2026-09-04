-- DEMO SEED -- deliberately NOT a migration.
--
-- A migration replays into every environment forever, including the harness,
-- where it would corrupt the fixtures each test file rebuilds from. Demo rows
-- are data, not schema, so they live here and are applied by hand.
--
-- Everything below is fictional and every address is @example.com, which is
-- IANA-reserved and can never receive mail. That is deliberate: TEST_ACCOUNTS.md
-- rule 1 (contact details in test data are always fake) and rule 2 (no
-- pre-approved outbound destination exists), so if someone runs the send flow
-- against this data, nothing can reach a real person.
--
-- Reverse with supabase/seed_demo_teardown.sql. Every row is findable: members
-- carry notes = 'demo-seed', branches/courses carry the DEMO- code prefix.

begin;

-- ------------------------------------------------------------------ structure
insert into public.branches (name, code, city) values
  ('Anna Nagar', 'DEMO-AN', 'Chennai'),
  ('Velachery',  'DEMO-VL', 'Chennai');

insert into public.courses (name, description, default_start_time, default_end_time) values
  ('Zumba Basics', 'demo-seed', '06:00', '07:00'),
  ('Yoga Flow',    'demo-seed', '07:00', '08:00');

insert into public.course_offerings (course_id, branch_id, batch_label, start_time, end_time)
select c.id, b.id, '6:00 AM', '06:00', '07:00'
from public.courses c, public.branches b
where c.name = 'Zumba Basics' and b.code = 'DEMO-AN';

insert into public.course_offerings (course_id, branch_id, batch_label, start_time, end_time)
select c.id, b.id, '7:00 AM', '07:00', '08:00'
from public.courses c, public.branches b
where c.name = 'Yoga Flow' and b.code = 'DEMO-VL';

-- Zumba runs Mon/Wed/Fri, Yoga Tue/Thu. ISO weekdays, 1 = Monday.
insert into public.offering_schedules (offering_id, effective_from, weekdays, note)
select o.id, current_date - 60, array[1,3,5]::smallint[], 'demo-seed'
from public.course_offerings o join public.courses c on c.id = o.course_id
where c.name = 'Zumba Basics';

insert into public.offering_schedules (offering_id, effective_from, weekdays, note)
select o.id, current_date - 60, array[2,4]::smallint[], 'demo-seed'
from public.course_offerings o join public.courses c on c.id = o.course_id
where c.name = 'Yoga Flow';

-- -------------------------------------------------------------------- members
-- Chosen to exercise the CSV matcher's five outcomes; see docs/DEMO_CSV.md.
-- Note the TWO Kavitha Rameshes. That is not a mistake -- member_aliases is
-- UNIQUE on (alias_type, alias_normalized), so one display name can never
-- point at two members and the alias tier is structurally unambiguous.
-- Outcome D can therefore only arise from two members sharing a canonical
-- name, or from a fuzzy tie. Two people with the same name in different
-- batches is the real case, so that is what this seeds.
insert into public.members (full_name, joined_on, status, notes)
select v.full_name,
       current_date - 45, 'active', 'demo-seed'
from (values
  ('Lakshmi Narayanan'),   -- A: exact match, via her confirmed alias
  ('Anjali Krishnan'),     -- C: a near-miss in the file becomes a "possible"
  ('Meena Sundaram'),      -- B: matched, but no email on file
  ('Divya Balakrishnan'),
  ('Kavitha Ramesh'),      -- D: same canonical name as the next member
  ('Kavitha Ramesh'),      -- D: the other half of the ambiguity
  ('Priya Raghavan'),
  ('Shanthi Devi')         -- drifting away: misses the last three sessions
) as v(full_name);

-- Meena Sundaram deliberately has NO email: outcome B, and the weekly review
-- must still count and NAME her rather than dropping her silently (C-76).
-- The address carries a slice of her id so the two Kavithas stay distinct.
insert into public.member_emails (member_id, email, is_primary, status, source)
select m.id,
       lower(split_part(m.full_name, ' ', 1)) || '+' || left(m.id::text, 8) || '@example.com',
       true, 'valid', 'manual'
from public.members m
where m.notes = 'demo-seed' and m.full_name <> 'Meena Sundaram';

-- Confirmed display names. The alias tier is checked BEFORE the canonical
-- name, so an alias wins outright -- which is how "Lakshmi N" in a file
-- resolves with no guessing at all.
insert into public.member_aliases (member_id, alias_type, alias_display, source)
select m.id, 'name', v.alias, 'manual'
from (
  select m.*, row_number() over (partition by full_name order by m.id) as rn
  from public.members m where m.notes = 'demo-seed'
) m
join (values
  ('Lakshmi Narayanan',  1, 'Lakshmi N'),
  ('Divya Balakrishnan', 1, 'Divya B'),
  ('Kavitha Ramesh',     1, 'Kavi')
) as v(full_name, rn, alias) on v.full_name = m.full_name and v.rn = m.rn;

-- Five in Zumba, three in Yoga. The two Kavithas are split across the two
-- offerings on purpose: when the review screen asks which one a file row
-- means, the course and branch are what tell them apart.
insert into public.member_enrollments (member_id, offering_id, effective_from, status, note)
select m.id, o.id, current_date - 45, 'active', 'demo-seed'
from (
  select m.*, row_number() over (partition by full_name order by m.id) as rn
  from public.members m where m.notes = 'demo-seed'
) m
join public.course_offerings o on true
join public.courses c on c.id = o.course_id
where (c.name = 'Zumba Basics' and (
         (m.full_name in ('Lakshmi Narayanan','Anjali Krishnan','Meena Sundaram','Divya Balakrishnan','Shanthi Devi'))
      or (m.full_name = 'Kavitha Ramesh' and m.rn = 1)))
   or (c.name = 'Yoga Flow' and (
         m.full_name = 'Priya Raghavan'
      or (m.full_name = 'Kavitha Ramesh' and m.rn = 2)));

-- ------------------------------------------------------------------- sessions
-- Generated by the engine, not hand-written, so the calendar and the
-- expectation rules are the same ones production uses.
select public.generate_sessions(o.id, current_date - 28, current_date + 14)
from public.course_offerings o
join public.courses c on c.id = o.course_id
where c.description = 'demo-seed' or c.name in ('Zumba Basics','Yoga Flow');

-- ----------------------------------------------------------------- attendance
-- Past sessions only. Shanthi misses the last three (consecutive-miss rule);
-- Meena misses every other one (weekly-count rule). Everyone else attends,
-- bar one absence each so the figures are not artificially perfect.
insert into public.attendance_records
  (session_id, member_id, status, expected, minutes_in_call, raw_display_name)
select s.id, m.id,
       case when miss then 'absent' else 'present' end,
       true,
       case when miss then null else 42 + (extract(day from s.session_date)::int % 15) end,
       m.full_name
from public.sessions s
join public.member_enrollments e
  on e.offering_id = s.offering_id and e.status = 'active'
join public.members m on m.id = e.member_id
cross join lateral (
  select case
    when m.full_name = 'Shanthi Devi'  then s.session_date >= current_date - 9
    when m.full_name = 'Meena Sundaram' then (extract(day from s.session_date)::int % 2) = 0
    else (extract(day from s.session_date)::int % 11) = 0
  end as miss
) f
where s.session_date < current_date
  and s.status = 'scheduled'
  and m.notes = 'demo-seed';

update public.sessions s set status = 'completed', completed_at = now()
where s.session_date < current_date and s.status = 'scheduled'
  and exists (select 1 from public.attendance_records a where a.session_id = s.id);

-- The engine recomputes its own figures; nothing above sets a count by hand.
select public.refresh_session_counts(s.id) from public.sessions s
where exists (select 1 from public.attendance_records a where a.session_id = s.id);

select public.recompute_member_stats(
  array(select id from public.members where notes = 'demo-seed'));

commit;
