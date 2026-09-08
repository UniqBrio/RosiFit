\echo 'staff are not restricted (0050): the guard moves, and nothing else does'
--
-- WHAT THIS PINS, AND WHY IT IS A SEPARATE FILE FROM 22 AND 16
--   22_bulk_import_members.sql opens "bulk import members: owner-only" and was
--   right when it was written (0028). 0038 withdrew owner-only; 0050 is the
--   file that actually delivers it, because 0038 never reached production --
--   the live ledger has no 0038_staff_write_access row and four functions there
--   still called is_super_admin() on 08-Sep-2026. That is the whole of what the
--   repo owner saw as "Only the academy admin can bulk import members."
--
--   The assertions below are in two halves, and the SECOND half is the one
--   that made 0050 a rewrite of the guard rather than a re-issue of the body.
--
--     1. A STAFF account may bulk-import, save, delete and reschedule.
--     2. Doing so DID NOT REVERT the bodies those functions had. 0040 warned
--        in block capitals (TD-023) that re-issuing save_course from the 0030
--        baseline -- which is exactly what 0038 does -- silently drops its
--        "reschedule only when the days change" block. A migration that opened
--        the guard by reproducing a body would pass half 1 and fail half 2.
--
--   Half 2 is asserted against pg_get_functiondef, not against behaviour,
--   deliberately: it is a claim about the TEXT that survived the rewrite, and
--   a behavioural probe would pass against a body that merely happened to
--   agree on the one case the probe chose.

-- ------------------------------------------------------- half 2, first
-- Read before anything is called, so a failure here is unambiguous: the
-- migration chain, not the fixture, is what these describe.
select t.eq((select count(*)::int
               from pg_proc p
               join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.prokind = 'f'
                and p.proname in ('save_course','delete_course',
                                  'set_offering_schedule','bulk_import_members')
                and pg_get_functiondef(p.oid) ilike '%is_super_admin%'), 0,
  'not one of the four functions still asks is_super_admin()');

select t.eq((select count(*)::int
               from pg_proc p
               join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.prokind = 'f'
                and p.proname in ('save_course','delete_course',
                                  'set_offering_schedule','bulk_import_members')
                and pg_get_functiondef(p.oid) ilike '%is_subscription_writable%'), 4,
  'and every one of them still checks the subscription -- a billing gate, not a role gate');

-- THE REGRESSION 0050 EXISTS TO AVOID. `rescheduled` is 0040's, and 0038's
-- save_course body does not contain it.
select t.ok((select pg_get_functiondef(p.oid) ilike '%rescheduled%'
               from pg_proc p
               join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'save_course' and p.prokind = 'f'),
  'save_course still carries 0040''s reschedule-only-when-the-days-change block');

-- The refusal moved with the guard. A message naming a role the check no
-- longer consults is the sentence the next reader trusts instead of the code.
select t.eq((select count(*)::int
               from pg_proc p
               join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.prokind = 'f'
                and p.proname in ('save_course','delete_course',
                                  'set_offering_schedule','bulk_import_members')
                and (pg_get_functiondef(p.oid) ilike '%only the super admin can %'
                  or pg_get_functiondef(p.oid) ilike '%only the academy admin can bulk import%')), 0,
  'and no refusal below them still names the academy admin');

-- ---------------------------------------------------------- the fixture
begin;
  insert into auth.users (id) values
    ('ffffffff-0000-0000-0000-000000000001'),
    ('ffffffff-0000-0000-0000-000000000002');
  insert into public.app_users (auth_user_id, kind, name, phone_e164) values
    ('ffffffff-0000-0000-0000-000000000001','super_admin','Rosi Owner 39','+919994871139'),
    ('ffffffff-0000-0000-0000-000000000002','staff','Nandhini 39','+919940633839');
  insert into public.branches (name, code, city) values ('Adyar 39','AD39','Chennai');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Unrestricted Course','06:00','07:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00','07:00'
      from public.courses c, public.branches b
     where c.name = 'Unrestricted Course' and b.code = 'AD39';
commit;

-- --------------------------------------------------------- half 1: staff
-- Every call below runs as the STAFF account. That is the whole point: not one
-- of them is made as the owner, so a guard that quietly still asked for the
-- owner would fail rather than pass on the fixture's behalf.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000002';

  select t.eq((public.bulk_import_members(
      jsonb_build_array(
        jsonb_build_object('row', 1, 'full_name', 'Imported By Staff',
                           'course', 'Unrestricted Course', 'branch', 'Adyar 39',
                           'aliases', '[]'::jsonb)),
      null, 'staff_import_39.xlsx')->>'inserted')::int,
    1, 'a STAFF account bulk-imports a member -- the refusal the owner was shown is gone');

  select t.ok((public.save_course(
      'Course Saved By Staff',
      (select id from public.branches where code = 'AD39'),
      array[1,3]::smallint[], 'week', 'rosi@example.com',
      (select id from public.email_templates where is_default))->>'course_id') is not null,
    'and she adds a course');

  select t.eq((public.set_offering_schedule(
      (select o.id from public.course_offerings o
         join public.courses c on c.id = o.course_id
        where c.name = 'Course Saved By Staff'),
      array[2,4]::smallint[], current_date + 1, 'moved by staff')->>'mode'),
    'versioned', 'and she reschedules its offering');

  select t.ok(public.delete_course(
      (select id from public.courses where name = 'Course Saved By Staff')) is not null,
    'and she deletes it again');
commit;

select t.eq((select count(*)::int from public.members where full_name = 'Imported By Staff'), 1,
  'and the imported member is really on the register -- the run was not a results screen over nothing');

-- ------------------------------------------------------- what stays shut
-- The owner named her own exclusions: "only staff access audit log and
-- overview screen is not visible to staff thats it". Those are READS, and they
-- are still refused. This assertion is what keeps 0050 from being read later
-- as "staff got everything".
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000002';

  select t.eq((select count(*)::int from public.audit_logs), 0,
    'the audit log returns nothing to staff, exactly as 2026-09-06 left it');
commit;
