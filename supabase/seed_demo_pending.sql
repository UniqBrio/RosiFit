-- Leaves the most recent demo sessions EMPTY so the attendance upload has
-- something to import into.
--
-- The original seed filled every past session, which is realistic history but
-- leaves nothing to upload. This reopens the last two past sessions per demo
-- offering: attendance removed, status back to `scheduled`, counts recomputed.
--
-- One DO block, so the id set is captured ONCE. Recomputing it between
-- statements would drift, because the update itself changes the `completed`
-- predicate the set is selected on.
--
-- Demo data only -- anchored to members.notes = 'demo-seed' and the DEMO-
-- branch code, so it cannot touch real sessions. Not a migration: see the note
-- at the top of seed_demo.sql.

do $$
declare ids uuid[];
begin
  select array_agg(id) into ids from (
    select s.id,
           row_number() over (partition by s.offering_id order by s.session_date desc) as rn
    from public.sessions s
    join public.course_offerings o on o.id = s.offering_id
    join public.branches b on b.id = o.branch_id
    where b.code like 'DEMO-%'
      and s.session_date < current_date
      and s.status = 'completed'
  ) ranked where rn <= 2;

  if ids is null then
    raise notice 'nothing to reopen -- no completed demo sessions found';
    return;
  end if;

  -- The register has to be GONE, not reset: csv-import writes present/absent
  -- for every expected member itself.
  delete from public.attendance_records where session_id = any(ids);

  update public.sessions
     set status = 'scheduled', completed_at = null, import_id = null
   where id = any(ids);

  -- Counts and streaks are engine-owned; recompute rather than zeroing by hand.
  perform public.refresh_session_counts(u) from unnest(ids) u;
  perform public.recompute_member_stats(
    array(select id from public.members where notes = 'demo-seed'));

  raise notice 'reopened % session(s) for upload', array_length(ids, 1);
end $$;
