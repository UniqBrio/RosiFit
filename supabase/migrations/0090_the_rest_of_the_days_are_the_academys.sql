-- 0090 · the rest of the days are the academy's
--
-- WHAT THIS CLOSES (ISSUE_TRACKER T-144, the sites 0088 left)
--   0088 moved the four member and attendance rules off current_date -- the
--   session's day, UTC on Supabase -- onto business_today(), the academy's
--   day in Asia/Kolkata. Five more functions still ask "what day is it" of
--   the session for a business-calendar question, and give the wrong answer
--   between 18:30 and 24:00 UTC every evening:
--
--     subscription_state     whether the subscription is active, in grace or
--                            expired on a given DAY (0002) -- and through it
--                            is_subscription_writable(), which gates every
--                            write: at 00:30 in Chennai on the day after a
--                            subscription expires the academy can still
--                            write for five and a half hours, and on the day
--                            a grace period ends it is locked out five and a
--                            half hours early.
--     save_course            which offering schedule is in force today, and
--                            the day a changed timetable takes effect
--                            ("saved with the course", 0022/0040)
--     merge_member_into      the day the stray's enrolment ends (0032)
--     is_in_course           whether a member is in a course today (0071)
--     follow_up_candidates   whether a member is active today (0045/0072)
--
--   Each is the same class as 0088's four: a date-only business value
--   compared with the session's day. Each anchor below was read in
--   production, read-only, 06-Oct-2026 (subscription_state md5 78d1e4ab,
--   save_course a4248f1d, merge_member_into 91467511, is_in_course 871e3b16,
--   follow_up_candidates 76d0c98a) and in the harness replay, and is present
--   exactly once in both -- save_course and is_in_course differ between the
--   two in comments only (T-120), and these are code lines.
--
-- WHAT IS NOT CHANGED
--   create_member, update_member, set_member_active_from and set_attendance
--   (0088); delete_course and delete_member, which production no longer
--   reads current_date in; the subscription table's column DEFAULTS
--   (start_date, expires_at -- rows written once, by hand); and
--   app/audit.tsx's export file name (cosmetic). After this, no function in
--   public compares a business date with current_date.
--
-- PRODUCTION SAFETY
--   Seven one-line in-place edits (0061/0071/0073/0085/0088's idiom), each
--   guarded to match exactly once; no table, index, policy, grant or data
--   change. A draft until applied (D-8); under D-10 it merges to main only
--   on the day it is applied, with its ledger row.

do $mig$
declare
  v_edits text[][] := array[
    ['subscription_state',
$a$    when current_date <= s.expires_at                        then 'active'$a$,
$b$    when public.business_today() <= s.expires_at                        then 'active'$b$],
    ['subscription_state',
$a$    when current_date <= s.expires_at + s.grace_days         then 'grace'$a$,
$b$    when public.business_today() <= s.expires_at + s.grace_days         then 'grace'$b$],
    ['save_course',
$a$     and os.effective_from <= current_date$a$,
$b$     and os.effective_from <= public.business_today()$b$],
    ['save_course',
$a$     and (os.effective_to is null or os.effective_to >= current_date)$a$,
$b$     and (os.effective_to is null or os.effective_to >= public.business_today())$b$],
    ['save_course',
$a$    perform public.set_offering_schedule(v_offering, p_weekdays, current_date, 'saved with the course');$a$,
$b$    perform public.set_offering_schedule(v_offering, p_weekdays, public.business_today(), 'saved with the course');$b$],
    ['merge_member_into',
$a$         effective_to = least(coalesce(effective_to, current_date), current_date)$a$,
$b$         effective_to = least(coalesce(effective_to, public.business_today()), public.business_today())$b$],
    ['is_in_course',
$a$       and (e.effective_to is null or e.effective_to >= current_date)$a$,
$b$       and (e.effective_to is null or e.effective_to >= public.business_today())$b$],
    ['follow_up_candidates',
$a$       and public.member_status_on(m.status, m.inactive_from, m.active_again_from, current_date) = 'active'$a$,
$b$       and public.member_status_on(m.status, m.inactive_from, m.active_again_from, public.business_today()) = 'active'$b$]
  ];
  v_i    int;
  v_oid  oid;
  v_n    int;
  v_def  text;
  v_name text;
  v_old  text;
  v_new  text;
  v_hits int;
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'business_today') then
    raise exception '0090: public.business_today() is missing -- apply 0088 first';
  end if;

  for v_i in 1 .. array_length(v_edits, 1) loop
    v_name := v_edits[v_i][1];
    v_old  := replace(v_edits[v_i][2], chr(13), '');
    v_new  := replace(v_edits[v_i][3], chr(13), '');

    select count(*), min(p.oid) into v_n, v_oid
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = v_name;
    if v_n <> 1 then
      raise exception '0090: expected exactly one public.%(), found %', v_name, v_n;
    end if;
    v_def := pg_get_functiondef(v_oid);

    v_hits := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
    if v_hits <> 1 then
      raise exception
        '0090: %() contains the anchor "%" % times, expected once', v_name, v_old, v_hits;
    end if;
    execute replace(v_def, v_old, v_new);
  end loop;

  -- After this, no function in public compares a business date with the
  -- session's day. (Column defaults and prose are not functions.)
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('subscription_state', 'save_course', 'merge_member_into', 'is_in_course', 'follow_up_candidates')
       and p.prosrc like '%current_date%'
  ) then
    raise exception '0090: a business-date rule still reads current_date';
  end if;
end $mig$;
