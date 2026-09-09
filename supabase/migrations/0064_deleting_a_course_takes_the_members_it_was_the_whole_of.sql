-- 0064 · deleting a course removes the members it was the whole of
--
-- "on deleting course make sure all its related members are deleted because it
-- may cause unnecessary chaos when i wanted to bring same person under another
-- course after deleting whole course" -- the requester, 09-Sep-2026.
--
-- WHAT WAS HAPPENING. 0047 deliberately spared every member: "Only their
-- enrolment IN THIS COURSE goes." The member survived on the register with no
-- enrolment at all, which is invisible in every course view and, worse, IN THE
-- WAY: adding the same person to another course hits the name that is already
-- there. Diagnosed on production 09-Sep-2026 -- four members stranded this way,
-- one of them "John", created 13:04:57 and orphaned at 13:11:55 when the course
-- "Yoga" was deleted out from under him.
--
-- THE RULE, AND THE ONE LINE OF IT I DID NOT TAKE LITERALLY
--
--   A member goes when this course was the WHOLE of their membership -- when
--   removing its enrolments leaves them enrolled in nothing.
--
--   A member enrolled in ANOTHER course stays, with that course and all of its
--   history. Taken literally, "all its related members are deleted" would take
--   somebody who attends two courses when only one is deleted, and destroy a
--   register nobody asked about -- their other course's attendance, addresses
--   and aliases with it. The requester's own reason is the stranded leftover,
--   and a member who still has a course is not stranded. That is the line, and
--   it is drawn here rather than left to the caller.
--
-- IT GOES THROUGH purge_member (0051/0052), not through hand-written deletes.
-- That function is the one definition of what removing a member means -- every
-- attendance row, enrolment, address, alias, schedule and message -- and a
-- second copy here would be a second thing to get wrong. It also writes each
-- member's own audit entry before their rows go, so a course deletion that
-- takes forty people leaves forty entries saying so, not one.
--
-- THE PREVIEW LEARNS TO COUNT THEM TOO, because a dialog that says "12 members
-- are enrolled" while the press is about to delete nine of them is worse than
-- no number at all.
--
-- Rewritten in place with 0061's guard: the anchors below must be present or
-- this migration raises and rolls back, so it cannot silently no-op against a
-- body some later migration has already changed.

do $mig$
declare
  v_def text;
  v_old text;
  v_new text;
begin
  -- ============================================ 1. the preview counts them
  v_def := pg_get_functiondef('public.course_deletion_preview(uuid)'::regprocedure);

  v_old := $old$    'members_enrolled',   v_members,$old$;
  v_new := $new$    'members_enrolled',   v_members,
    -- Of those, the ones this course is the WHOLE of: deleting it removes
    -- them outright (0064). Counted here so the dialog can say so before
    -- anybody presses it.
    'members_removed',    (
      select count(*) from (
        select distinct e.member_id
          from public.member_enrollments e
         where e.offering_id = any(v_offerings)
           and not exists (
             select 1 from public.member_enrollments o
              where o.member_id = e.member_id
                and not (o.offering_id = any(v_offerings)))
      ) whole_of),$new$;
  if position(v_old in v_def) = 0 then
    raise exception '0064: course_deletion_preview does not contain the return line this migration expects';
  end if;
  execute replace(v_def, v_old, v_new);

  -- ================================================ 2. the deletion takes them
  v_def := pg_get_functiondef('public.purge_course(uuid, text)'::regprocedure);

  -- 2a. room to count
  v_old := $old$  v_offer_gone  int := 0;$old$;
  v_new := $old2$  v_offer_gone  int := 0;
  v_orphaned    int := 0;              -- members this course was the whole of
  v_one         uuid;$old2$;
  if position(v_old in v_def) = 0 then
    raise exception '0064: purge_course does not declare v_offer_gone as expected';
  end if;
  v_def := replace(v_def, v_old, v_new);

  -- 2b. after the enrolments go, the members they were the whole of
  v_old := $old3$    select count(*) into v_enrolments from gone;$old3$;
  v_new := $new3$    select count(*) into v_enrolments from gone;

    -- 5b. THE MEMBERS THIS COURSE WAS THE WHOLE OF (0064). Read AFTER the
    --     enrolments above are gone, so "enrolled in nothing" is a fact about
    --     the register as it now stands rather than a prediction. A member
    --     with another course still has one and is left alone.
    --
    --     Through purge_member, which is the one definition of removing a
    --     member and writes that member's own audit entry before their rows
    --     go -- so this reads as forty removals in the log, not one.
    for v_one in
      select m from unnest(v_members) m
       where not exists (select 1 from public.member_enrollments e where e.member_id = m)
         and exists (select 1 from public.members mm where mm.id = m)
    loop
      perform public.purge_member(v_one,
        format('0064: the course %L was deleted and was the whole of this member''''s membership', v_course.name));
      v_orphaned := v_orphaned + 1;
    end loop;$new3$;
  if position(v_old in v_def) = 0 then
    raise exception '0064: purge_course does not contain the enrolment-delete block this migration expects';
  end if;
  v_def := replace(v_def, v_old, v_new);

  -- 2c. only the SURVIVORS get their stats rebuilt -- the others have no row
  v_old := $old4$  if array_length(v_members, 1) > 0 then
    perform public.recompute_member_stats(v_members);
  end if;$old4$;
  v_new := $new4$  -- Only the members who are still here. Recomputing a member purged two
  -- steps ago is at best wasted work and at worst a resurrection.
  select coalesce(array_agg(m), '{}') into v_members
    from unnest(v_members) m
   where exists (select 1 from public.members mm where mm.id = m);
  if array_length(v_members, 1) > 0 then
    perform public.recompute_member_stats(v_members);
  end if;$new4$;
  if position(v_old in v_def) = 0 then
    raise exception '0064: purge_course does not contain the recompute block this migration expects';
  end if;
  v_def := replace(v_def, v_old, v_new);

  -- 2d. say how many went
  v_old := $old5$    'members_recomputed',   coalesce(array_length(v_members, 1), 0),$old5$;
  v_new := $new5$    'members_recomputed',   coalesce(array_length(v_members, 1), 0),
    'members_removed',      v_orphaned,$new5$;
  if position(v_old in v_def) = 0 then
    raise exception '0064: purge_course does not return members_recomputed as expected';
  end if;
  v_def := replace(v_def, v_old, v_new);

  execute v_def;
end $mig$;

comment on function public.purge_course(uuid, text) is
  'The row removal behind delete_course, with NO caller guard of its own -- which is why only service_role may execute it. Removes a course together with its offerings, schedules, sessions, expectations, attendance, enrolments and import records, children first. SINCE 0064 it also removes the MEMBERS this course was the whole of -- those left enrolled in nothing once its enrolments go -- through purge_member, so each gets its own audit entry. A member enrolled in another course is left alone, with that course and all of its history. Writes its own audit entry before the rows go and rebuilds member_stats for the members that survive.';
