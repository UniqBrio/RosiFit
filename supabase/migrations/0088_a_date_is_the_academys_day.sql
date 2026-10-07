-- 0088 · a date is the academy's day
--
-- THE DEFECT THIS CLOSES (docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md §12)
--   On 3 Oct 2026 between 00:37 and 01:02 in Chennai, four members added
--   with today's joining date were refused: "a joining date in the future
--   cannot be recorded". The form's "today" was the device's day -- India,
--   already the 3rd -- and create_member compared it with current_date,
--   which is the SERVER'S day: Postgres evaluates current_date in the
--   session's TimeZone, and Supabase's is UTC, where it was still the 2nd.
--   Every evening from 18:30 UTC the academy and its database disagree
--   about what day it is, for five and a half hours.
--
-- THE RULE
--   A date-only value is a calendar day in the academy's own time zone,
--   never an instant. 2026-10-05 means the fifth of October in Chennai.
--   Timestamps stay in UTC (every timestamptz column, now(), created_at);
--   nothing about the database's TimeZone changes. What changes is the ONE
--   place a timestamp becomes a date for a business rule: it is converted
--   in the academy's zone, explicitly.
--
-- WHAT THIS ADDS
--   public.business_today() -- (now() at time zone 'Asia/Kolkata')::date.
--   The zone is named once, here; the client names it once, in
--   src/data/businessDate.ts, and reads the same day by the same
--   arithmetic (Asia/Kolkata is UTC+05:30 all year). A licence for an
--   academy elsewhere changes these two literals.
--
-- WHAT THIS CHANGES, in place (0061/0071/0073/0085's idiom), one anchor each
--   create_member           the default joining date, and the "in the future" check
--   update_member           v_today, which dates an enrolment move and a day change
--   set_member_active_from  the "in the future" check on a corrected joining date
--   set_attendance          the "in the future" check on the day being marked
--   Each anchor was read in production, read-only, 06-Oct-2026 and is
--   present exactly once in the live body (create_member md5 50c546af,
--   update_member 10915909 -- before 0085 -- set_member_active_from
--   b4551360, set_attendance 076e4572). An anchor found zero times or more
--   than once raises and rolls the whole migration back, so a body some
--   later migration restated is refused rather than guessed at. The edit of
--   update_member composes with 0085's (a different line).
--
--   Deliberately NOT changed: current_date in the subscription window
--   (0002), in save_course / set_offering_schedule's "saved with the course"
--   effective_from (0022, 0030, 0038, 0040), in the enrolment-ending
--   `least(coalesce(effective_to, current_date), current_date)` of
--   delete_course / merge_member / delete_member, in is_in_course (0071)
--   and in the member_status_on reads (0045, 0072). Each is the same
--   class of question and each is a function this migration does not
--   inspect; they are listed in ISSUE_TRACKER for the same treatment one
--   row at a time, with their own anchors read first.
--
-- PRODUCTION SAFETY
--   A new function and four one-line in-place edits; no table, index,
--   policy, grant or data change. A draft until applied (D-8); under D-10 it
--   merges to main only on the day it is applied, with its ledger row.

create or replace function public.business_today()
returns date
language sql stable
set search_path = public as $$
  select (now() at time zone 'Asia/Kolkata')::date
$$;

comment on function public.business_today() is
  'Today as a calendar day in the academy''s time zone (Asia/Kolkata), whatever the session''s TimeZone. The one place a timestamp becomes a date for a business rule: joining dates, the day a member goes on or off the register, the day an attendance mark is for. Added by 0088 because current_date is the session''s day (UTC on Supabase) and disagreed with the academy for five and a half hours every evening. src/data/businessDate.ts reads the same day on the client.';

revoke execute on function public.business_today() from public, anon;
grant execute on function public.business_today() to authenticated, service_role;

do $mig$
declare
  v_edits text[][] := array[
    ['create_member',
$a$coalesce(p_joined_on, current_date)$a$,
$b$coalesce(p_joined_on, public.business_today())$b$],
    ['create_member',
$a$  if v_from > current_date then$a$,
$b$  if v_from > public.business_today() then$b$],
    ['update_member',
$a$  v_today       date := current_date;$a$,
$b$  v_today       date := public.business_today();$b$],
    ['set_member_active_from',
$a$  if p_active_from > current_date then$a$,
$b$  if p_active_from > public.business_today() then$b$],
    ['set_attendance',
$a$  if p_date > current_date then$a$,
$b$  if p_date > public.business_today() then$b$]
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
  for v_i in 1 .. array_length(v_edits, 1) loop
    v_name := v_edits[v_i][1];
    v_old  := replace(v_edits[v_i][2], chr(13), '');
    v_new  := replace(v_edits[v_i][3], chr(13), '');

    -- By name, and there must be exactly one of it: none of the four has an
    -- overload, and an overload appearing would be a reason to stop.
    select count(*), min(p.oid) into v_n, v_oid
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = v_name;
    if v_n <> 1 then
      raise exception '0088: expected exactly one public.%(), found %', v_name, v_n;
    end if;
    v_def := pg_get_functiondef(v_oid);

    v_hits := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
    if v_hits <> 1 then
      raise exception
        '0088: %() contains the anchor "%" % times, expected once', v_name, v_old, v_hits;
    end if;
    execute replace(v_def, v_old, v_new);
  end loop;

  -- Belt and braces: none of the four compares a business date with the
  -- session's day any more.
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('create_member', 'update_member', 'set_member_active_from', 'set_attendance')
       and (p.prosrc like '%> current_date%' or p.prosrc like '%coalesce(p_joined_on, current_date)%'
            or p.prosrc like '%:= current_date;%')
  ) then
    raise exception '0088: a business-date rule still reads current_date';
  end if;
end $mig$;
