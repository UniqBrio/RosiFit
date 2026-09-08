-- 0050 · staff are not restricted — the guard, and only the guard
--
-- WHAT WENT WRONG, MEASURED NOT REMEMBERED (08-Sep-2026)
--   The repo owner, shown "Only the academy admin can bulk import members.
--   Nothing has been saved." on a staff account, asked again why staff are
--   restricted: "all actions crud bulk import upload everything as staff does
--   is possible only staff access audit log and overview screen is not visible
--   to staff thats it do not restrict staff from any operations within app".
--
--   Nothing in the CLIENT restricts her. src/data/access.ts gates exactly two
--   prefixes -- /staff and /audit -- plus Overview, which guards itself; no
--   screen in app/ asks the role before offering Add Member, Bulk Import, Add
--   Course, Edit, Delete or Upload. The refusal came from the DATABASE, and
--   the reason it did is not a decision anybody re-took:
--
--     0038_staff_write_access WAS NEVER APPLIED TO THE LIVE PROJECT.
--
--   Read from lhpzhkzbnquwjljmbylo on 08-Sep-2026: its migration ledger has no
--   0038_staff_write_access row (the `0038_repoint_stale_course_senders` entry
--   is a DIFFERENT file that collided on the number), and exactly four
--   functions there still call is_super_admin() --
--
--     save_course, delete_course, set_offering_schedule, bulk_import_members
--
--   -- which is precisely the set 0038 was written to open. Everything else
--   staff needs is already hers in production: create_member, update_member,
--   delete_member (via 0044), set_attendance, set_member_status, and the
--   members / attendance policies. So the whole of the reported restriction is
--   these four functions.
--
-- WHY THIS FILE EXISTS AND 0038 IS NOT SIMPLY APPLIED
--   Because applying 0038 now would REVERT two later fixes, and 0040 says so
--   itself in block capitals (TD-023): 0040 re-issued save_course in full from
--   the 0030 baseline -- the live body -- so replaying 0038 after it drops
--   0040's "reschedule only when the days change" block and puts the refusal
--   back. The same hazard runs the other way: any file here that reproduces a
--   body wholesale can silently undo 0039's meet_code clause or 0049's
--   joined_on fix.
--
--   So this migration reproduces NO bodies. It reads each function's current
--   definition out of the catalogue, moves the one guard token, and writes the
--   definition back. Whatever body is live -- 0040's in production, 0047's and
--   0049's in the harness -- is the body that survives. That makes the file
--   order-independent by construction: it is the last word on the guard and
--   has no opinion at all about anything else in the function.
--
-- WHAT DOES NOT CHANGE
--   is_subscription_writable(). All four functions check it separately (in
--   save_course, in the same condition), and moving only the is_super_admin()
--   token leaves every one of those checks standing. A lapsed subscription
--   still refuses every write below -- a billing gate, not a role gate (0002).
--
-- WHAT THIS DOES NOT OPEN, deliberately
--   The owner named the exclusions herself: the Audit log, Overview and Staff
--   & access. app_users, audit_logs, audit_remarks, security questions, PIN
--   issue/reset, academy settings, follow-up rules, email templates, branches
--   and holidays all keep is_super_admin(), exactly as 2026-09-06 and 0038
--   left them. Nothing here touches them. The owner was asked about branches,
--   holidays and settings on 08-Sep-2026 and chose to leave them owner-only.
--
-- APPLIED to the live project (lhpzhkzbnquwjljmbylo) on 08-Sep-2026 with the
-- owner's explicit go-ahead, and VERIFIED there afterwards rather than assumed:
--   * none of the four still names is_super_admin, all four now call
--     is_active_app_user(), and all four still check is_subscription_writable();
--   * save_course still contains `rescheduled`, so 0040 survived the rewrite;
--   * no refusal below them still says "only the super admin" or "only the
--     academy admin can bulk import";
--   * EXECUTE for `authenticated` survived the CREATE OR REPLACE on all four;
--   * courses and course_offerings insert/update policies read is_active_app_user();
--   * audit_logs, app_users, audit_remarks, security_questions, app_settings,
--     branches, holidays, follow_up_config, member_import_runs and
--     pin_reset_requests all still read is_super_admin(), unchanged.
--
-- NOT rehearsed against the local harness: this machine has neither psql nor
-- Docker (TD-024's condition, still true on 08-Sep-2026). What stood in for it
-- is that the rewrite was computed read-only against the live catalogue BEFORE
-- this file was written -- every invariant above checked on the would-be text
-- while nothing was executed -- and that supabase/tests/39 asserts all of it
-- permanently for the next machine that can replay the chain.


-- ---------------------------------------------------------------- functions
do $mig$
declare
  r        record;
  v_def    text;
  v_new    text;
  v_hits   int;
  v_moved  int := 0;
  v_open   int := 0;
begin
  for r in
    select p.oid, p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and p.proname in ('save_course', 'delete_course',
                         'set_offering_schedule', 'bulk_import_members')
     order by p.proname
  loop
    v_def := pg_get_functiondef(r.oid);

    -- Already open -- 0038 or 0047 got here first in this environment. Not an
    -- error, and not something to "fix": there is no guard left to move.
    if position('public.is_super_admin()' in v_def) = 0 then
      v_open := v_open + 1;
      continue;
    end if;

    -- ONE guard, or this migration does not understand the body it was handed
    -- and must not rewrite it blind. Measured on the live project: each of the
    -- four carries exactly one occurrence.
    v_hits := (length(v_def) - length(replace(v_def, 'public.is_super_admin()', '')))
              / length('public.is_super_admin()');
    if v_hits <> 1 then
      raise exception
        '0050: public.%() carries % occurrences of is_super_admin(); exactly 1 was expected, so nothing was changed',
        r.proname, v_hits using errcode = '55000';
    end if;

    v_new := replace(v_def, 'public.is_super_admin()', 'public.is_active_app_user()');

    -- The refusal has to move with the guard. A message that still says "only
    -- the academy admin" above a check that no longer means it is the sentence
    -- the next reader trusts instead of reading the guard -- the exact fault
    -- 0038 called out in 0028's comment.
    v_new := replace(v_new, 'only the super admin can ',  'only a signed-in, active user can ');
    v_new := replace(v_new, 'only the academy admin can bulk import members',
                            'only a signed-in, active user can import members');

    -- Belt and braces: never execute a definition that still names the role
    -- we just removed, and never one that lost the replacement.
    if position('is_super_admin' in v_new) > 0
       or position('public.is_active_app_user()' in v_new) = 0 then
      raise exception '0050: rewriting public.%() did not produce the expected guard', r.proname
        using errcode = '55000';
    end if;

    execute v_new;
    v_moved := v_moved + 1;
  end loop;

  raise notice '0050: % function(s) moved to is_active_app_user(), % already open', v_moved, v_open;
end $mig$;


-- ---------------------------------------------------------------- policies
-- 0005 wrote these through a loop over four tables. Two of the four move;
-- branches and holidays do NOT, so they are named one at a time here rather
-- than looped -- a loop would invite the next reader to add the other two.
--
-- These are restated rather than rewritten from the catalogue because a policy
-- has no body to preserve: the predicate IS the whole of it. Identical to
-- 0038's block, and harmless to run twice.
--
-- offering_schedules is deliberately absent: 0005 left it with no write policy
-- at all and set_offering_schedule is still the only path in.
drop policy if exists courses_insert          on public.courses;
drop policy if exists courses_update          on public.courses;
drop policy if exists course_offerings_insert on public.course_offerings;
drop policy if exists course_offerings_update on public.course_offerings;

do $mig$
declare tbl text;
begin
  foreach tbl in array array['courses','course_offerings'] loop
    execute format($f$
      create policy %1$s_insert on public.%1$s
        for insert to authenticated
        with check (public.is_active_app_user() and public.is_subscription_writable());
      create policy %1$s_update on public.%1$s
        for update to authenticated
        using (public.is_active_app_user() and public.is_subscription_writable())
        with check (public.is_active_app_user() and public.is_subscription_writable());
    $f$, tbl);
  end loop;
end $mig$;


-- ---------------------------------------------------------------- comments
-- Written unconditionally: they describe the boundary this file establishes,
-- whichever body the function ended up with.
comment on function public.bulk_import_members(jsonb, uuid, text) is
  'Imports a parsed member file in one call. Open to any active user (0038, actually reached production in 0050; was owner-only in 0028) -- each row is written by create_member in its own sub-transaction, which has always been open to staff, so one refusal never rolls back the rest; a name already on the register is SKIPPED, never overwritten. Returns {run_id, total, inserted, skipped, failed, rows[]} and records the run in member_import_runs, which stays readable by the academy admin only.';
