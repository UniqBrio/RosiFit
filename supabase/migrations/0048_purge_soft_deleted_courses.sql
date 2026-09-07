-- 0048 · the courses soft-deleted before 0047 leave the database too
--
-- A DATA MIGRATION, and the second half of requests/2026-09-08-hard-delete-course.md.
-- 0047 changed what deleting a course does from now on. This applies the same
-- rule, once, to the courses that were deleted under the old one and are
-- still in the tables -- which is the clutter the requester was looking at
-- when they asked: "delete course from db and all its related data which will
-- reduce chaos".
--
-- WHAT IT REMOVES, measured on production on 08-Sep-2026 before this was
-- written (the harness has no live rows, so this is the check it cannot make):
--
--   six courses with deleted_at set   hgg · hhhhh · jjkkj · jkjjn, · Yoga 2 ·
--                                     and TWO named Postnatal
--   8 completed sessions              all still live, reachable from no screen
--   39 attendance records             across 15 members
--   15 enrolments, 11 csv_imports     one of which pinned a Meet export's
--                                     fingerprint to a deleted Postnatal
--
--   The live Postnatal (c03133b7) and Prenatal (8c77407f) are NOT flagged and
--   are NOT touched by this file. It selects on deleted_at, never on a name.
--
-- WHY THROUGH purge_course AND NOT HAND-WRITTEN DELETES. The removal order is
-- dictated by foreign keys most of which are NO ACTION, and 0047 got it right
-- once, with a spec. A second copy here would be a second place to get it
-- wrong, and this one would run exactly once, against production, with no
-- harness rows to catch it. The migration runner is superuser / service_role,
-- which is precisely who purge_course is granted to.
--
-- EVERY COURSE IS ITS OWN AUDIT ENTRY. purge_course writes one per course,
-- with `was_soft_deleted_at` carrying the original deletion time, so the log
-- records both that the course was deleted (then) and that its rows were
-- removed (now), and tells the two apart.
--
-- member_stats is rebuilt inside purge_course for the 15 members touched.
--
-- IDEMPOTENT: on a database with no flagged course -- the harness, or a
-- second run -- this selects nothing and does nothing.
--
-- NOT REVERSIBLE. There is no down migration because there is nothing to
-- restore from. That is stated to the requester at the gate, with the counts
-- above, before this file is applied.

do $$
declare
  v_course record;
  v_result jsonb;
  v_courses int := 0;
  v_sessions int := 0;
  v_attendance int := 0;
begin
  for v_course in
    select c.id, c.name, c.deleted_at
      from public.courses c
     where c.deleted_at is not null
     order by c.deleted_at
  loop
    v_result := public.purge_course(v_course.id,
      '0048_purge_soft_deleted_courses: a course soft-deleted under 0020, removed under the '
      || 'hard-delete rule the repo owner chose on 08-Sep-2026 '
      || '(requests/2026-09-08-hard-delete-course.md), on their explicit go-ahead');
    v_courses := v_courses + 1;
    v_sessions := v_sessions + (v_result->>'sessions_removed')::int;
    v_attendance := v_attendance + (v_result->>'attendance_removed')::int;
    raise notice '0048: purged % (deleted %) -- % sessions, % attendance records, % imports, % enrolments',
      v_course.name, v_course.deleted_at,
      v_result->>'sessions_removed', v_result->>'attendance_removed',
      v_result->>'imports_removed', v_result->>'enrolments_removed';
  end loop;

  raise notice '0048: % soft-deleted courses purged, % sessions and % attendance records removed',
    v_courses, v_sessions, v_attendance;
end $$;

-- What "nothing left behind" means, asserted at the end of the same
-- transaction rather than trusted: no flagged course, and no session or
-- offering whose parent is gone. A failure here rolls the whole file back.
do $$
begin
  if exists (select 1 from public.courses where deleted_at is not null) then
    raise exception '0048: a soft-deleted course survived the purge';
  end if;
  if exists (select 1 from public.course_offerings o
              left join public.courses c on c.id = o.course_id
             where c.id is null) then
    raise exception '0048: an offering is left without a course';
  end if;
  if exists (select 1 from public.sessions s
              left join public.course_offerings o on o.id = s.offering_id
             where o.id is null) then
    raise exception '0048: a session is left without an offering';
  end if;
end $$;
