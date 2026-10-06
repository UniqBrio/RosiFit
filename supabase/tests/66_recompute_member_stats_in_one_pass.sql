\echo 'recompute_member_stats: one pass, the same five figures row for row (0089)'

-- WHAT THIS PINS
--   0089 restates recompute_member_stats set-based. The reference is the
--   body it replaces, 0008's, recreated here under another name with
--   current_streak_for() (untouched by 0089) doing the streak -- so the two
--   are compared on the SAME data, in the same transaction, over the seed
--   and over the cases that decide the predicate: soft-deleted rows,
--   sessions not completed, deleted sessions, extra (unexpected) rows,
--   members with no rows, both scope shapes, the return value.

\set members 500
\i db/harness/seed_scale.sql

create function pg_temp.recompute_reference(p_member_ids uuid[] default null)
returns table (member_id uuid, current_streak int, sessions_expected int, sessions_attended int,
               last_present_date date, last_countable_date date)
language sql as $$
  select m.id,
         public.current_streak_for(m.id),
         coalesce(agg.expected, 0)::int,
         coalesce(agg.attended, 0)::int,
         agg.last_present,
         agg.last_countable
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
$$;

-- ---------------------------------------------------------- the edge cases
-- Written INTO the seed so both bodies see them. The last seeded Monday
-- session of offering A is the stage.
select s.id::text as sid, s.session_date::text as sdate from public.sessions s
 where s.offering_id = '0e5d0000-0000-0000-0000-0000000000f1' and s.status = 'completed'
 order by s.session_date desc limit 1 \gset
select m.id::text as m1 from public.members m where m.id <> '0e5d0000-0000-0000-0000-0000000000aa' order by m.id limit 1 \gset
select m.id::text as m2 from public.members m where m.id <> '0e5d0000-0000-0000-0000-0000000000aa' order by m.id offset 1 limit 1 \gset
select m.id::text as m3 from public.members m where m.id <> '0e5d0000-0000-0000-0000-0000000000aa' order by m.id offset 2 limit 1 \gset
select m.id::text as m4 from public.members m where m.id <> '0e5d0000-0000-0000-0000-0000000000aa' order by m.id offset 3 limit 1 \gset

-- m1: the latest row soft-deleted (must not count)
update public.attendance_records set deleted_at = now()
 where member_id = :'m1'::uuid and session_id = :'sid'::uuid;
-- m2: an extra row (present, not expected) on a new ad-hoc session
insert into public.sessions (id, offering_id, session_date, start_time, status, expectation_mode, created_by)
values ('0e5d0066-0000-0000-0000-000000000001', '0e5d0000-0000-0000-0000-0000000000f1', '2026-09-05', '06:00', 'completed', 'none',
        '0e5d0000-0000-0000-0000-00000000000a');
insert into public.attendance_records (session_id, member_id, status, expected, created_by)
values ('0e5d0066-0000-0000-0000-000000000001', :'m2'::uuid, 'extra', false, '0e5d0000-0000-0000-0000-00000000000a');
-- m3: a row on a session that is NOT completed (scheduled), and one on a deleted session
insert into public.sessions (id, offering_id, session_date, start_time, status, created_by)
values ('0e5d0066-0000-0000-0000-000000000002', '0e5d0000-0000-0000-0000-0000000000f1', '2026-09-07', '06:00', 'scheduled',
        '0e5d0000-0000-0000-0000-00000000000a');
insert into public.attendance_records (session_id, member_id, status, expected, created_by)
values ('0e5d0066-0000-0000-0000-000000000002', :'m3'::uuid, 'absent', true, '0e5d0000-0000-0000-0000-00000000000a');
insert into public.sessions (id, offering_id, session_date, start_time, status, created_by, deleted_at)
values ('0e5d0066-0000-0000-0000-000000000003', '0e5d0000-0000-0000-0000-0000000000f1', '2026-09-09', '06:00', 'completed',
        '0e5d0000-0000-0000-0000-00000000000a', now());
insert into public.attendance_records (session_id, member_id, status, expected, created_by)
values ('0e5d0066-0000-0000-0000-000000000003', :'m3'::uuid, 'present', true, '0e5d0000-0000-0000-0000-00000000000a');
-- m4: every row gone -- a member with nothing
update public.attendance_records set deleted_at = now() where member_id = :'m4'::uuid;
-- and a brand-new member with no rows at all
insert into public.members (id, full_name, joined_on, status, created_by)
values ('0e5d0066-0000-0000-0000-0000000000ee', 'Nothing Yet', '2026-09-01', 'active', '0e5d0000-0000-0000-0000-00000000000a');

-- ------------------------------------------------------- the whole scope
create temp table ref_all as select * from pg_temp.recompute_reference();
select public.recompute_member_stats() as written \gset
select t.eq(:written, (select count(*)::int from public.members where deleted_at is null),
  'the unscoped call writes one row per live member, as before');
select t.eq((select count(*)::int from public.member_stats), (select count(*)::int from ref_all),
  'and member_stats holds one row per live member');
select t.eq((select count(*)::int from (
               select member_id, current_streak, sessions_expected, sessions_attended, last_present_date, last_countable_date
                 from public.member_stats
               except select * from ref_all) x), 0,
  'every figure the one-pass body wrote is what the per-member reference computes');
select t.eq((select count(*)::int from (
               select * from ref_all
               except
               select member_id, current_streak, sessions_expected, sessions_attended, last_present_date, last_countable_date
                 from public.member_stats) x), 0,
  'and nothing the reference computes is missing');

-- The cases, read back by name so a silent pass cannot hide a vacuous fixture.
select t.ok((select s.last_countable_date < :'sdate'::date from public.member_stats s where s.member_id = :'m1'::uuid),
  'a soft-deleted row does not count (m1''s last countable date is before the deleted row''s)');
select t.eq((select s.sessions_expected from public.member_stats s where s.member_id = :'m2'::uuid),
            (select r.sessions_expected from ref_all r where r.member_id = :'m2'::uuid),
  'an extra row is not expected and both bodies agree on m2');
select t.ok((select s.last_countable_date < '2026-09-05'::date from public.member_stats s where s.member_id = :'m2'::uuid),
  'and an extra row is not a countable one, so it moves no date (m2)');
select t.ok((select s.last_countable_date < '2026-09-07'::date from public.member_stats s where s.member_id = :'m3'::uuid),
  'a scheduled session and a deleted session do not count (m3)');
select t.eq((select (s.current_streak, s.sessions_expected, s.sessions_attended, s.last_present_date, s.last_countable_date)::text
               from public.member_stats s where s.member_id = :'m4'::uuid), '(0,0,0,,)',
  'a member whose rows are all gone has zeros and nulls');
select t.eq((select (s.current_streak, s.sessions_expected, s.sessions_attended)::text
               from public.member_stats s where s.member_id = '0e5d0066-0000-0000-0000-0000000000ee'), '(0,0,0)',
  'a member with no rows at all has zeros');
select t.ok((select max(current_streak) from public.member_stats) > 0,
  'the fixture carries live streaks -- the comparison above was not over zeros');

-- ------------------------------------------------------- a scoped call
update public.member_stats set updated_at = '2001-01-01 00:00:00+00';
select public.recompute_member_stats(array[:'m1'::uuid, :'m2'::uuid, '0e5d0066-0000-0000-0000-0000000000ee'::uuid]) as scoped \gset
select t.eq(:scoped, 3, 'a scoped call writes exactly the members named');
select t.eq((select count(*)::int from public.member_stats where updated_at > '2001-01-01 00:00:00+00'), 3,
  'and touches nobody else');
select t.eq((select count(*)::int from (
               select member_id, current_streak, sessions_expected, sessions_attended, last_present_date, last_countable_date
                 from public.member_stats where member_id in (:'m1'::uuid, :'m2'::uuid)
               except select * from pg_temp.recompute_reference(array[:'m1'::uuid, :'m2'::uuid])) x), 0,
  'the scoped figures equal the reference''s scoped figures');
select t.eq(public.recompute_member_stats('{}'::uuid[]), 0, 'an empty scope writes nothing');

-- ------------------------------------------------------- it is 0089's body
select t.eq((select l.lanname from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
              where n.nspname = 'public' and p.proname = 'recompute_member_stats'), 'plpgsql', 'still plpgsql');
select t.ok((select p.prosrc not like '%public.current_streak_for(%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'recompute_member_stats'),
  'the body no longer calls current_streak_for per member (the prose may name it; the call is gone)');
select t.eq((select md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'current_streak_for'), 'aa031898b4291b5ee41ef7a2cf6cada2',
  'current_streak_for itself is untouched -- it is the reference');
