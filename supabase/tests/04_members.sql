\echo 'members: no phone, aliases academy-wide, one primary email'
begin;
insert into auth.users (id) values ('cccccccc-0000-0000-0000-000000000001');
insert into public.app_users (auth_user_id, kind, name, phone_e164)
  values ('cccccccc-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158');
insert into public.members (member_code, full_name) values
  ('RF-000118','Shazia Farheen'), ('RF-000204','Meena Raj'), ('RF-000131','Shazia Khan');
commit;

-- C-70 / C-36: the member has no phone, at the schema level. Staff still do.
select t.ok(not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='members'
      and column_name ~* '(phone|mobile|contact_number)'),
  'members has NO phone column (C-70)');
select t.ok(exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='app_users' and column_name='phone_e164'),
  'staff mobile survives -- it is the sign-in identifier, a different thing');

select t.eq((select name_normalized from public.members where member_code='RF-000118'),
  'shazia farheen', 'the normalised name is generated for matching');

-- C-71/C-72 display names
begin;
insert into public.member_aliases (member_id, alias_display, source, confirmed_by)
select m.id, x.a, 'member_form', u.id
  from public.members m, public.app_users u,
       (values ('Shazia'),('Shazia F')) x(a)
 where m.member_code='RF-000118';
commit;
select t.eq((select count(*)::int from public.member_aliases), 2, 'a member can hold several display names');
select t.eq((select alias_normalized from public.member_aliases where alias_display='Shazia F'),
  'shazia f', 'aliases are normalised the same way names are');

-- the constraint that stops an import ever having to guess
-- (re-pointed 17-Sep-2026, D-2a: since 0071 a display name may belong to two
--  members; what survives is that ONE member cannot hold it twice -- 0073's
--  member_aliases_member_name_unique. RF-000118 already holds 'Shazia'.)
select t.rejects($$insert into public.member_aliases (member_id, alias_display)
    select id,'Shazia' from public.members where member_code='RF-000118'$$,
  'one member cannot hold the same display name twice (per-member unique, 0073)', 'member_aliases_member_name_unique');
select t.rejects($$insert into public.member_aliases (member_id, alias_display)
    select id,'shazia' from public.members where member_code='RF-000118'$$,
  'and the uniqueness survives case and punctuation', 'member_aliases_member_name_unique');
select t.rejects($$insert into public.member_aliases (member_id, alias_display)
    select id,'   ' from public.members where member_code='RF-000131'$$,
  'a blank display name is refused', 'at least one letter');

-- C-73 emails
begin;
insert into public.member_emails (member_id, email, is_primary)
select id,'shazia@example.com',true from public.members where member_code='RF-000118';
insert into public.member_emails (member_id, email, is_primary)
select id,'shazia.f@work.example.com',false from public.members where member_code='RF-000118';
commit;
select t.eq((select count(*)::int from public.member_emails), 2, 'a member can hold several emails');
select t.rejects($$insert into public.member_emails (member_id, email, is_primary)
    select id,'another@example.com',true from public.members where member_code='RF-000118'$$,
  'only one primary email per member', 'one_primary');
-- Inverted 17-Sep-2026 (D-2a): 0071 dropped member_emails_unique_live and
-- moved the address rule into refuse_course_duplicate(), scoped to the course
-- (48_duplicate_is_per_course.sql:209-213 asserts the index is gone). This
-- fixture has no offering yet, so the direct insert is accepted. Rolled back
-- so the C-76 count below still sees two members without an address. T-062
-- restores an address refusal by trigger and re-inverts this to t.rejects.
begin;
insert into public.member_emails (member_id, email)
    select id,'SHAZIA@example.com' from public.members where member_code='RF-000131';
select t.eq((select count(*)::int from public.member_emails where email = 'shazia@example.com'), 2,
  'the same address on a second member is ACCEPTED since 0071 -- the academy-wide index is gone');
rollback;
select t.ok(exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'refuse_course_duplicate'),
  'an address is unique per COURSE since 0071 -- refuse_course_duplicate() is where the rule lives now, not an index');
select t.rejects($$insert into public.member_emails (member_id, email)
    select id,'not-an-email' from public.members where member_code='RF-000131'$$,
  'a malformed address is refused', 'check');

-- C-76: a member with NO email is a first-class member, not an error
select t.eq((select count(*)::int from public.members m
             where not exists (select 1 from public.member_emails e
                               where e.member_id=m.id and e.deleted_at is null)), 2,
  'members without an email exist and are perfectly valid (C-76)');

-- enrolment cannot overlap
begin;
insert into public.branches (name, code) values ('Coimbatore','CBE');
insert into public.courses (name) values ('Prenatal Fitness');
insert into public.course_offerings (course_id, branch_id)
  select c.id, b.id from public.courses c, public.branches b;
insert into public.member_enrollments (member_id, offering_id, effective_from)
  select m.id, o.id, '2026-01-01' from public.members m, public.course_offerings o
   where m.member_code='RF-000118';
commit;
select t.rejects($$insert into public.member_enrollments (member_id, offering_id, effective_from)
    select m.id, o.id, '2026-03-01' from public.members m, public.course_offerings o
     where m.member_code='RF-000118'$$,
  'a member cannot be enrolled in two offerings at once', 'exclusion');

-- the same NULL-in-CHECK trap, on the member override
select t.rejects($$insert into public.member_schedules (member_id, effective_from, weekdays)
    select id,'2026-01-01',array[]::smallint[] from public.members where member_code='RF-000118'$$,
  'an empty member override is refused (NULL-in-CHECK trap)', 'm_weekdays_non_empty');
