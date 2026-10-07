\echo 'the subscription window, the timetable, a merge, course membership and the follow-up list read the academy''s day (0090)'

-- WHAT THIS PINS
--   0088 moved four member and attendance rules onto business_today(); 0090
--   moves the five business-calendar readers that were left. The clock
--   cannot be moved in a spec, so each is pinned by its anchor -- the line
--   that read current_date now reads business_today() -- and by a behaviour
--   that holds at any hour: is_in_course and subscription_state answered
--   with dates relative to business_today() itself.

\set members 10
\i db/harness/seed_scale.sql

-- ------------------------------------------------------- the five anchors
select t.ok((select p.prosrc like '%when public.business_today() <= s.expires_at %' and p.prosrc like '%when public.business_today() <= s.expires_at + s.grace_days%'
               and p.prosrc not like '%current_date%'
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'subscription_state'),
  'subscription_state judges active and grace by the academy''s day');
select t.ok((select p.prosrc like '%and os.effective_from <= public.business_today()%'
               and p.prosrc like '%os.effective_to >= public.business_today())%'
               and p.prosrc like '%set_offering_schedule(v_offering, p_weekdays, public.business_today(), ''saved with the course'')%'
               and p.prosrc not like '%current_date%'
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'save_course'),
  'save_course reads the timetable in force today, and dates a change, by the academy''s day');
select t.ok((select p.prosrc like '%least(coalesce(effective_to, public.business_today()), public.business_today())%'
               and p.prosrc not like '%current_date%'
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'merge_member_into'),
  'merge_member_into ends the stray''s enrolment on the academy''s day');
select t.ok((select p.prosrc like '%e.effective_to >= public.business_today())%' and p.prosrc not like '%current_date%'
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'is_in_course'),
  'is_in_course asks about membership on the academy''s day');
select t.ok((select p.prosrc like '%m.active_again_from, public.business_today()) = ''active''%' and p.prosrc not like '%current_date%'
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'follow_up_candidates'),
  'follow_up_candidates asks who is active on the academy''s day');
select t.eq((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.prosrc like '%current_date%'
                and p.proname not in ('create_member')), 0,
  'no other function in public reads current_date (create_member keeps the word in 0049''s prose only)');

-- ------------------------------------------------- behaviour, at any hour
-- is_in_course says a member is a candidate for a course unless a LIVE
-- enrolment puts them in a different one. The sentinel is enrolled in
-- offering B (another course): with that enrolment ending YESTERDAY by the
-- academy's calendar there is no contradiction today; ending TODAY there
-- still is. Under a UTC session, which is how production runs.
begin;
  set local timezone = 'UTC';
  update public.member_enrollments set effective_to = public.business_today() - 1
   where member_id = '0e5d0000-0000-0000-0000-0000000000aa';
  select t.ok(public.is_in_course('0e5d0000-0000-0000-0000-0000000000aa'::uuid, '0e5d0000-0000-0000-0000-0000000000f1'::uuid),
    'an enrolment elsewhere that ended yesterday, by the academy''s calendar, is no contradiction today');
  update public.member_enrollments set effective_to = public.business_today()
   where member_id = '0e5d0000-0000-0000-0000-0000000000aa';
  select t.ok(not public.is_in_course('0e5d0000-0000-0000-0000-0000000000aa'::uuid, '0e5d0000-0000-0000-0000-0000000000f1'::uuid),
    'one that ends today still is');
rollback;

begin;
  set local timezone = 'UTC';
  update public.app_subscription set expires_at = public.business_today(), grace_days = 0;
  select t.eq(public.subscription_state(), 'active', 'a subscription expiring today, by the academy''s calendar, is active today');
  update public.app_subscription set expires_at = public.business_today() - 1, grace_days = 3;
  select t.eq(public.subscription_state(), 'grace', 'one that expired yesterday with three days'' grace is in grace');
  update public.app_subscription set expires_at = public.business_today() - 4, grace_days = 3;
  select t.eq(public.subscription_state(), 'expired', 'and one whose grace ended yesterday is expired');
rollback;
