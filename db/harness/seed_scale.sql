-- Volume fixture for the harness (T-039).
--
-- WHY IT IS HERE AND NOT IN supabase/tests/
--   test.sh runs `for f in supabase/tests/*.sql`. A seed placed there would be
--   executed as though it were a spec -- producing no assertions, and counting
--   as a failure the moment it raised. db/harness/ is where the files the
--   suite LOADS live (assert.sql, 000_local_shim.sql); this is one of those.
--
-- HOW TO USE IT
--   From a spec, after the harness has reset the database:
--       \set members 500
--       \i db/harness/seed_scale.sql
--   `members` defaults to 500 if the caller does not set it. Paths are
--   relative to the repository root, which is test.sh's working directory.
--
-- WHAT IT BUILDS, and why each part is here rather than convenient
--   * TWO offerings of two different courses. Offering A (Mon/Wed/Fri) holds
--     every seeded member; offering B (Tue/Thu) holds exactly one, the
--     SENTINEL. A fixture with one offering cannot tell "recomputed every
--     member" from "recomputed the right members", because every member is
--     the right member.
--   * A YEAR of completed sessions on A -- 2025-09-01 to 2026-08-31, ~156 of
--     them. The cost this fixture exists to expose is current_streak_for(),
--     which walks one member's whole attendance history; a fixture with three
--     sessions in it measures nothing.
--   * REALISTIC NAME DENSITY. Every 80th member repeats the previous member's
--     full name, so ~1.25% of names are held by two live members -- 0071
--     measured 14 such names among 1,150 in production, which is 1.2%. A
--     fixture where every name is unique cannot exercise the matcher, the
--     duplicate rule, or the staff-name collision (T-076).
--   * DETERMINISTIC throughout. No random(), no setseed, no now() in any
--     stored value that an assertion reads: present/absent alternates by
--     arithmetic on the member and session ordinals. A volume fixture that
--     is different on every run turns a failing assertion into a coin toss.
--
-- THE SENTINEL
--   member id 0e5d0000-0000-0000-0000-0000000000aa, enrolled in offering B,
--   named in no file, with member_stats.updated_at pinned to 2001-01-01.
--   Any statement that rewrites stats it was not asked to rewrite moves that
--   date, and 52_import_recomputes_only_its_own.sql is watching it.
--
-- TIMINGS (T-039's own proof, not run by the suite)
--   The 2,000 and 5,000 sizes are too slow for the per-file replay -- test.sh
--   rebuilds the database before EVERY spec, and 5,000 members over a year is
--   ~780,000 attendance rows. They are a one-off, run by hand against a local
--   harness or a scratch Postgres 16:
--
--     bash db/harness/reset.sh
--     psql -d rosifit -v members=2000 -f db/harness/seed_scale.sql
--     psql -d rosifit -c '\timing on' -c "<the commit_csv_import call>"
--
--   Not wired to a workflow_dispatch job: .github/ is Session B's surface
--   under D-9 and this session does not edit it. When the timings are run,
--   their numbers go in T-039's row.

\if :{?members}
\else
  \set members 500
\endif

\echo 'seed_scale: building' :members 'members, a year of sessions, one sentinel'

-- ------------------------------------------------------------------ the staff
insert into auth.users (id) values ('0e5d0000-0000-0000-0000-000000000001');
insert into public.app_users (id, auth_user_id, kind, name, phone_e164) values
  ('0e5d0000-0000-0000-0000-00000000000a',
   '0e5d0000-0000-0000-0000-000000000001', 'super_admin', 'Rosi Owner', '+919994800000');

-- ----------------------------------------------------------- the organisation
insert into public.branches (id, name, code) values
  ('0e5d0000-0000-0000-0000-0000000000b1', 'Velachery', 'VLC');
insert into public.courses (id, name) values
  ('0e5d0000-0000-0000-0000-0000000000c1', 'Prenatal Flow'),
  ('0e5d0000-0000-0000-0000-0000000000c2', 'Postnatal Flow');
insert into public.course_offerings (id, course_id, branch_id, start_time, end_time) values
  ('0e5d0000-0000-0000-0000-0000000000f1', '0e5d0000-0000-0000-0000-0000000000c1',
   '0e5d0000-0000-0000-0000-0000000000b1', '06:00', '07:00'),
  ('0e5d0000-0000-0000-0000-0000000000f2', '0e5d0000-0000-0000-0000-0000000000c2',
   '0e5d0000-0000-0000-0000-0000000000b1', '07:30', '08:30');
-- A: Mon/Wed/Fri.  B: Tue/Thu. Both in force from the day the year starts.
insert into public.offering_schedules (offering_id, effective_from, weekdays) values
  ('0e5d0000-0000-0000-0000-0000000000f1', '2025-09-01', array[1,3,5]::smallint[]),
  ('0e5d0000-0000-0000-0000-0000000000f2', '2025-09-01', array[2,4]::smallint[]);

-- --------------------------------------------------------------- the register
--
-- The name pool: 40 given names x 30 surnames cycles with a period of 1,200,
-- and beyond that a suffix keeps the combinations distinct -- so name reuse is
-- something this fixture DECIDES rather than something the pool runs out of.
-- Every 80th member then takes the previous member's name, which is the 1.25%
-- density the comment at the top explains.
create temp table seed_names (i int primary key, full_name text);

insert into seed_names (i, full_name)
select g.n,
       (array['Aarthi','Abirami','Anitha','Bhavani','Chitra','Deepa','Divya','Gayathri',
              'Hema','Indhu','Janani','Kalpana','Kavya','Lakshmi','Malathi','Meena',
              'Nandhini','Nithya','Padma','Priya','Radha','Ramya','Revathi','Sangeetha',
              'Saranya','Shazia','Shobana','Sridevi','Subha','Sumathi','Swetha','Thenmozhi',
              'Uma','Vaishali','Vanitha','Vasanthi','Vidya','Vijaya','Yamuna','Yazhini'
             ])[(g.n % 40) + 1]
       || ' ' ||
       (array['Albert','Balaji','Chandran','Dhanraj','Elangovan','Ganesan','Hariharan',
              'Iyer','Jayaraman','Karthik','Kumar','Lingam','Mani','Nadar','Ottakoothar',
              'Pandian','Quadir','Raman','Sundaram','Thangaraj','Udhayakumar','Velayutham',
              'Wilson','Xavier','Yogeswaran','Zachariah','Prakash','Sham','Farheen','Raj'
             ])[((g.n / 40) % 30) + 1]
       || case when g.n >= 1200 then ' ' || ((g.n / 1200) + 1)::text else '' end
  from generate_series(1, :members) g(n);

insert into public.members (id, full_name, joined_on, status, created_by)
select ('0e5d0001-0000-0000-0000-' || lpad(g.n::text, 12, '0'))::uuid,
       -- Every 80th member answers to the name the one before it holds.
       -- `g.n`, never a bare `i`: seed_names HAS a column called i, and an
       -- unqualified name inside a correlated subquery binds to the INNER
       -- scope first. `where n.i = case when i % 80 = 0 ...` therefore read
       -- as `n.i = case when n.i % 80 = 0 ...`, which is true of every row
       -- that is not a multiple of 80, so the subquery returned 500 rows:
       --   ERROR: more than one row returned by a subquery used as an expression
       -- (db-harness run #123, 18-Sep-2026). The generator now has its own name.
       (select sn.full_name from seed_names sn
         where sn.i = case when g.n % 80 = 0 and g.n > 1 then g.n - 1 else g.n end),
       '2025-09-01', 'active', '0e5d0000-0000-0000-0000-00000000000a'
  from generate_series(1, :members) g(n);

-- The Meet display name: given name plus the surname's initial, which is the
-- shape the attendance CSV actually carries and what the matcher works on.
insert into public.member_aliases (member_id, alias_type, alias_display, source, confirmed_by)
select m.id, 'name',
       split_part(m.full_name, ' ', 1) || ' ' || left(split_part(m.full_name, ' ', 2), 1),
       'member_form', '0e5d0000-0000-0000-0000-00000000000a'
  from public.members m;

-- ~63% carry an address, which is the live proportion (727 of 1,152 on
-- 17-Sep-2026). Addresses are unique here even though 0071 no longer requires
-- it: a fixture should not depend on a rule it is not testing.
insert into public.member_emails (member_id, email, is_primary)
select m.id, 'seed' || right(m.id::text, 12) || '@example.com', true
  from public.members m
 where (('x' || right(m.id::text, 8))::bit(32)::int % 100) < 63;

insert into public.member_enrollments (member_id, offering_id, effective_from, created_by)
select m.id, '0e5d0000-0000-0000-0000-0000000000f1', '2025-09-01',
       '0e5d0000-0000-0000-0000-00000000000a'
  from public.members m;

-- ---------------------------------------------------------------- the sentinel
--
-- Enrolled in B, so no file for A ever names her and no sweep for A ever
-- expects her. She is the only member whose stats row an import has no reason
-- to touch, which is exactly what makes her worth watching.
insert into public.members (id, full_name, joined_on, status, created_by) values
  ('0e5d0000-0000-0000-0000-0000000000aa', 'Sentinel Postnatal', '2025-09-01', 'active',
   '0e5d0000-0000-0000-0000-00000000000a');
insert into public.member_aliases (member_id, alias_type, alias_display, source, confirmed_by)
  values ('0e5d0000-0000-0000-0000-0000000000aa', 'name', 'Sentinel P', 'member_form',
          '0e5d0000-0000-0000-0000-00000000000a');
insert into public.member_enrollments (member_id, offering_id, effective_from, created_by)
  values ('0e5d0000-0000-0000-0000-0000000000aa', '0e5d0000-0000-0000-0000-0000000000f2',
          '2025-09-01', '0e5d0000-0000-0000-0000-00000000000a');

-- ----------------------------------------------------------------- the year
select public.generate_sessions('0e5d0000-0000-0000-0000-0000000000f1'::uuid,
                                '2025-09-01', '2026-08-31') as sessions_on_a;
select public.generate_sessions('0e5d0000-0000-0000-0000-0000000000f2'::uuid,
                                '2025-09-01', '2026-08-31') as sessions_on_b;

-- Completed, because recompute_member_stats and current_streak_for both count
-- only sessions whose status is 'completed'. A year of 'scheduled' sessions
-- would seed the tables and none of the cost.
update public.sessions set status = 'completed', completed_at = '2026-08-31'
 where offering_id = '0e5d0000-0000-0000-0000-0000000000f1';

-- 70% present, deterministically: the member's ordinal plus the session's,
-- modulo 10. Every row is `expected` -- these are the offering's own members
-- on the offering's own days -- which satisfies absent_must_be_expected and
-- keeps every row countable, which is what makes the streak walk real work.
insert into public.attendance_records
  (session_id, member_id, status, expected, minutes_in_call, created_by)
select s.id, m.id,
       case when ((('x' || right(m.id::text, 8))::bit(32)::int) + s.ord) % 10 < 7
            then 'present' else 'absent' end,
       true,
       case when ((('x' || right(m.id::text, 8))::bit(32)::int) + s.ord) % 10 < 7
            then 40 + (s.ord % 20) else null end,
       '0e5d0000-0000-0000-0000-00000000000a'
  from (select id, row_number() over (order by session_date)::int as ord
          from public.sessions
         where offering_id = '0e5d0000-0000-0000-0000-0000000000f1'
           and status = 'completed') s
  cross join public.members m
 where m.id <> '0e5d0000-0000-0000-0000-0000000000aa';

select public.refresh_session_counts(s.id)
  from public.sessions s
 where s.offering_id = '0e5d0000-0000-0000-0000-0000000000f1';

-- ------------------------------------------------------------------ the stats
-- Built once, here, so a spec measures what an IMPORT changes rather than the
-- difference between "no row yet" and "a row".
select public.recompute_member_stats();

-- The pin. Nothing in an import for offering A has any business moving this.
update public.member_stats
   set updated_at = '2001-01-01 00:00:00+00'
 where member_id = '0e5d0000-0000-0000-0000-0000000000aa';

\echo 'seed_scale: done'
