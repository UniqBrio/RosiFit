\echo 'a joining date is the academy''s day, not the server''s (0088)'

-- WHAT THIS PINS
--   current_date is the SESSION'S day. On Supabase that is UTC, so from 18:30
--   UTC the academy in Chennai is a day ahead of its database and a member
--   added with today's date was refused as joining "in the future" (§12 of
--   the performance report: four refusals on 3 Oct 2026, 00:37-01:02 IST).
--   0088 adds business_today() and moves the four business-date rules onto
--   it. (A body may still SAY current_date in a comment -- create_member's
--   0049 prose does -- so the anchors are what is asserted, not the word.)
--   The clock cannot be moved in a spec, so the rule is pinned two ways:
--   business_today() is the Chennai day whatever the session's TimeZone, and
--   the four functions no longer read current_date at those lines -- then
--   create_member and set_member_active_from are run with the academy's own
--   "today", which must be accepted at any hour.

\set members 10
\i db/harness/seed_scale.sql

-- -------------------------------------------------- the day, whatever the zone
begin;
  set local timezone = 'UTC';
  select t.eq(public.business_today(), (now() at time zone 'Asia/Kolkata')::date,
    'under a UTC session business_today() is still the Chennai day');
  -- Between 18:30 and 24:00 UTC the two days differ; at every other hour they
  -- agree. Asserted as the relation, not a fixed answer, so this passes at
  -- any hour and still says what it means.
  select t.eq(public.business_today() - current_date,
              case when extract(hour from now() at time zone 'UTC') * 60 + extract(minute from now() at time zone 'UTC') >= 18 * 60 + 30 then 1 else 0 end,
    'and it is one day ahead of the UTC day exactly from 18:30 UTC');
commit;
begin;
  set local timezone = 'Asia/Kolkata';
  select t.eq(public.business_today(), current_date,
    'under a Chennai session business_today() IS current_date');
commit;
begin;
  set local timezone = 'America/Los_Angeles';
  select t.eq(public.business_today(), (now() at time zone 'Asia/Kolkata')::date,
    'and a session elsewhere does not move it');
commit;

-- ----------------------------------------------------- the rules read it
select t.ok((select p.prosrc like '%coalesce(p_joined_on, public.business_today())%'
               and p.prosrc like '%if v_from > public.business_today() then%'
               and p.prosrc not like '%coalesce(p_joined_on, current_date)%'
               and p.prosrc not like '%> current_date%'
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'create_member'),
  'create_member defaults and checks the joining date against the academy''s day');
select t.ok((select p.prosrc like '%v_today       date := public.business_today();%'
               and p.prosrc not like '%:= current_date;%'
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'update_member'),
  'update_member dates a move by the academy''s day');
select t.ok((select p.prosrc like '%if p_active_from > public.business_today() then%'
               and p.prosrc not like '%> current_date%'
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'set_member_active_from'),
  'set_member_active_from checks a corrected joining date against the academy''s day');
select t.ok((select p.prosrc like '%if p_date > public.business_today() then%'
               and p.prosrc not like '%> current_date%'
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'set_attendance'),
  'set_attendance checks the day being marked against the academy''s day');
select t.ok(not has_function_privilege('anon', 'public.business_today()', 'execute'),
  'anon cannot call business_today()');

-- ---------------------------------------- today is never "in the future"
-- Under a UTC session, which is how production runs. At any hour.
begin;
  set local timezone = 'UTC';
  set local role authenticated;
  set local request.jwt.claim.sub = '0e5d0000-0000-0000-0000-000000000001';
  select public.create_member('Joined Today In Chennai', '0e5d0000-0000-0000-0000-0000000000f1'::uuid,
    public.business_today(), '{}'::text[], '{}'::text[], null) as created \gset
  select t.ok((:'created')::jsonb ? 'member_id', 'a member joining today, by the academy''s calendar, is accepted');
  select t.rejects($$select public.create_member('Joined Tomorrow', '0e5d0000-0000-0000-0000-0000000000f1'::uuid,
    public.business_today() + 1, '{}'::text[], '{}'::text[], null)$$,
    'and tomorrow is still refused', 'in the future');
  select public.create_member('Joined Yesterday', '0e5d0000-0000-0000-0000-0000000000f1'::uuid,
    public.business_today() - 1, '{}'::text[], '{}'::text[], null) as created2 \gset
  select t.ok((:'created2')::jsonb ? 'member_id', 'yesterday is accepted');
  select public.create_member('Joined Unsaid', '0e5d0000-0000-0000-0000-0000000000f1'::uuid,
    null, '{}'::text[], '{}'::text[], null) as created3 \gset
  select t.eq((select joined_on from public.members where id = ((:'created3')::jsonb->>'member_id')::uuid),
              public.business_today(),
    'and a member added with no date is dated the academy''s today, not the server''s');
commit;
