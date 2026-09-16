\echo 'duplicate is per course: the same person joins a second course; one course still refuses twice'
--
-- 0071. "Same member can be added with same name email and display name in
-- other course do not restrict user to add them as member in another course.
-- But one course cannot have duplicate."
--
-- Two courses, two branches, and one person who belongs in both. Everything
-- below is the same three keys -- name, display name, address -- asked twice:
-- once of the course the member is already in, where all three still refuse,
-- and once of a course they are not in, where none of them may.
--
-- 10_add_member.sql already covers the same-course half on its own fixture and
-- is untouched by this: every clash it sets up happens inside its one
-- offering, which is exactly where the rule still bites.

begin;
  insert into auth.users (id) values ('eeeeeeee-0000-0000-0000-000000000001');
  insert into public.app_users (auth_user_id, kind, name, phone_e164)
    values ('eeeeeeee-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158');

  insert into public.branches (name, code, city)
    values ('Velachery','VEL','Chennai'), ('Anna Nagar','ANN','Chennai');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Prenatal Flow','06:00','07:00',3), ('Postnatal Flow','07:00','08:00',3);
  -- Prenatal at Velachery, Postnatal at Anna Nagar: a different course AND a
  -- different branch, so nothing below can pass by accident on a shared one.
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00'
      from public.courses c join public.branches b
        on (c.name='Prenatal Flow'  and b.name='Velachery')
        or (c.name='Postnatal Flow' and b.name='Anna Nagar');
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select id, '2026-01-01', array[1,3,5]::smallint[] from public.course_offerings;
commit;

-- Named once, so every block below says which course it means rather than
-- relying on whichever row a bare `select id from course_offerings` returns.
create or replace view public.t_pre as
  select o.id from public.course_offerings o join public.courses c on c.id=o.course_id
   where c.name='Prenatal Flow';
create or replace view public.t_post as
  select o.id from public.course_offerings o join public.courses c on c.id=o.course_id
   where c.name='Postnatal Flow';

-- ================================================ the academy-wide rule is gone
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';

  select public.create_member('Divya Ramesh', (select id from public.t_pre), current_date - 30,
    array['Divya R']::text[], array['divya@example.com']::text[], null);

  -- THE REQUEST, in one call: the same name, the same display name and the
  -- same address, in a course this member is not in.
  select public.create_member('Divya Ramesh', (select id from public.t_post), current_date - 10,
    array['Divya R']::text[], array['divya@example.com']::text[], null);

  select t.eq((select count(*)::int from public.members
                where name_normalized='divya ramesh' and deleted_at is null), 2,
    'the same person is on the register twice, once per course — which is what one live enrolment per member makes this mean');

  select t.eq((select count(distinct c.name)::int
                 from public.member_enrollments e
                 join public.members m on m.id=e.member_id
                 join public.course_offerings o on o.id=e.offering_id
                 join public.courses c on c.id=o.course_id
                where m.name_normalized='divya ramesh' and e.status='active'), 2,
    'and the two records are enrolled in two DIFFERENT courses');

  select t.eq((select count(*)::int from public.member_emails e
                 join public.members m on m.id=e.member_id
                where m.name_normalized='divya ramesh' and e.deleted_at is null), 2,
    'one address, on both — member_emails_unique_live would have refused this');

  select t.eq((select count(*)::int from public.member_aliases a
                 join public.members m on m.id=a.member_id
                where m.name_normalized='divya ramesh'), 2,
    'one display name, on both — member_aliases_unique would have refused this');
rollback;

-- ============================================ but one course still refuses twice
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';

  select public.create_member('Divya Ramesh', (select id from public.t_pre), current_date - 30,
    array['Divya R']::text[], array['divya@example.com']::text[], null);

  -- THE NAME IS DELIBERATELY NOT A CLASH (16-Sep-2026). Production holds 14
  -- names shared by two live members of one course, 34 members in all, with no
  -- shared address between any pair -- namesakes. A name check here is asked on
  -- every EDIT too, so it would have made all 34 unable to save their own
  -- record. The bulk import still skips by name; a skipped row blocks nobody.
  select public.create_member('Divya  RAMESH', (select id from public.t_pre));
  select t.eq((select count(*)::int from public.members
                where name_normalized='divya ramesh' and deleted_at is null), 2,
    'two namesakes may share ONE course — a shared name is not evidence of a shared person');

  select t.rejects($$select public.create_member('Somebody Else',
      (select id from public.t_pre), null, array['divya r']::text[])$$,
    'the same DISPLAY NAME in the same course is refused, and the sentence says the scope',
    'already belongs to another member of this course');

  select t.rejects($$select public.create_member('Somebody Else',
      (select id from public.t_pre), null, '{}'::text[], array['DIVYA@example.com']::text[])$$,
    'the same ADDRESS in the same course is refused, whatever case it is typed in',
    'already on another member of this course');

  select t.eq((select count(*)::int from public.members where deleted_at is null
                and full_name in ('Divya  RAMESH','Somebody Else')), 0,
    'ALL OR NONE survives the new refusal — no half-written member is left behind');
rollback;

-- ====================================== a member in NO course is a duplicate everywhere
-- splitByCourse's own rule, and the one that keeps 22_bulk_import_members.sql
-- green: its Kavitha Ramesh sits on the register with no enrolment at all.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';

  insert into public.members (full_name, joined_on, status) values ('Stray Member','2026-07-19','active');

  insert into public.member_emails (member_id, email, is_primary, status)
    select id, 'stray@example.com', true, 'unknown'
      from public.members where full_name='Stray Member';

  select t.rejects($$select public.create_member('Someone New', (select id from public.t_pre),
      null, '{}'::text[], array['stray@example.com']::text[])$$,
    'nothing contradicts Prenatal for somebody enrolled nowhere, so their address is claimed there',
    'already on another member of this course');
  select t.rejects($$select public.create_member('Someone New', (select id from public.t_post),
      null, '{}'::text[], array['stray@example.com']::text[])$$,
    'and the same answer for Postnatal — a member with no live enrolment is a candidate for every course',
    'already on another member of this course');
rollback;

-- ================================= an ENDED enrolment is not a live one
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';

  select public.create_member('Moved On', (select id from public.t_pre), current_date - 60,
    array['Moved']::text[], '{}'::text[], null);
  update public.member_enrollments set status='ended', effective_to = current_date - 1
   where member_id = (select id from public.members where full_name='Moved On');

  -- No LIVE enrolment now, so they are a candidate for every course again --
  -- the same answer as Stray Member above, reached a different way.
  select t.rejects($$select public.create_member('Someone New', (select id from public.t_post),
      null, array['moved']::text[])$$,
    'an ended enrolment does not put them in Prenatal any more, so Postnatal treats their display name as claimed',
    'already belongs to another member of this course');
rollback;

-- ======================================== editing a member asks the same question
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';

  select public.create_member('Anitha Rajesh', (select id from public.t_pre), current_date - 30,
    '{}'::text[], array['anitha@example.com']::text[], null);
  select public.create_member('Priya Menon', (select id from public.t_post), current_date - 30,
    '{}'::text[], array['priya@example.com']::text[], null);

  -- Priya is in Postnatal. Moving her to Prenatal AND giving her Anitha's
  -- address puts two members of one course on one address.
  select t.rejects($$select public.update_member(
      (select id from public.members where full_name='Priya Menon'),
      'Priya Menon', (select id from public.t_pre),
      '{}'::text[], array['anitha@example.com']::text[], null)$$,
    'an edit that moves a member INTO a course is judged against that course',
    'already on another member of this course');

  -- The one member who is never their own duplicate.
  select public.update_member(
    (select id from public.members where full_name='Priya Menon'),
    'Priya Menon', (select id from public.t_post),
    '{}'::text[], array['priya@example.com']::text[], null);
  select t.eq((select count(*)::int from public.members where full_name='Priya Menon' and deleted_at is null), 1,
    'saving a member unchanged is not a clash with themselves');
rollback;

-- ============================== the bulk import skips per course, not per academy
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';

  select public.create_member('Divya Ramesh', (select id from public.t_pre), current_date - 30);

  create temp table run48 as
  select public.bulk_import_members(jsonb_build_array(
    -- in Prenatal already -> skipped, exactly as before
    jsonb_build_object('row', 2, 'full_name', 'Divya Ramesh', 'email', 'a@example.com',
                       'course', 'Prenatal Flow', 'branch', 'Velachery'),
    -- the same person, for the course they are NOT in -> imported
    jsonb_build_object('row', 3, 'full_name', 'Divya Ramesh', 'email', 'b@example.com',
                       'course', 'Postnatal Flow', 'branch', 'Anna Nagar')
  ), (select id from public.t_pre), 'members.xlsx') as r;

  select t.eq((select (r->>'skipped')::int  from run48), 1, 'the row for the course they are in is skipped');
  select t.eq((select (r->>'inserted')::int from run48), 1, 'the row for the other course is imported');
  select t.eq((select v->>'status' from run48, jsonb_array_elements(r->'rows') v
                where (v->>'row')::int = 3), 'inserted',
    'and it is row 3 that landed — the one naming the course they are not in');
rollback;

-- =================================== the indexes that used to carry the rule
select t.ok(not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='member_emails_unique_live'),
  'member_emails_unique_live is gone — it was the academy-wide address rule');
select t.ok(not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='member_aliases_unique'),
  'member_aliases_unique is gone — it was the academy-wide display-name rule');
select t.ok(exists (
    select 1 from pg_indexes where schemaname='public' and indexname='member_emails_email_live'
      and indexdef not like '%UNIQUE%'),
  'and its replacement is a plain lookup index, not the same rule under a new name');
select t.ok(exists (
    select 1 from pg_indexes where schemaname='public' and indexname='member_aliases_lookup'
      and indexdef not like '%UNIQUE%'),
  'likewise for display names');

-- One primary address per member is NOT part of what moved.
select t.ok(exists (
    select 1 from pg_indexes where schemaname='public' and indexname='member_emails_one_primary'),
  'member_emails_one_primary is untouched — a member still has exactly one primary address');

-- ------------------------------------------------------------------ the gate
select t.rejects($$
  set local role anon;
  select public.refuse_course_duplicate(null, '{}'::text[], '{}'::text[], null)$$,
  'anon may not call the duplicate rule either', 'permission denied');

drop view public.t_pre;
drop view public.t_post;
