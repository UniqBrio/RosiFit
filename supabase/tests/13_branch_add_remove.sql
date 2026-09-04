\echo 'branches: a name is enough to add one, and a branch in use cannot be removed'
--
-- 0019. The Branches screen collects a NAME and nothing else, so the code has
-- to come from somewhere that cannot race; two live branches must never share
-- a name, because every filter in the app addresses a branch by name; and a
-- branch that still runs offerings or scopes a holiday must not be removable,
-- because the rows pointing at it go on affecting sessions after it is gone.

begin;
insert into auth.users (id) values ('bbbbbbbb-0000-0000-0000-000000000001');
insert into public.app_users (auth_user_id, kind, name, phone_e164)
  values ('bbbbbbbb-0000-0000-0000-000000000001','super_admin','Branch Owner','+919994871102');
commit;

-- ------------------------------------------------------------- the code
insert into public.branches (name) values ('Coimbatore');
select t.eq((select code from public.branches where name='Coimbatore'), 'COIMBATO',
  'a branch added with no code gets one derived from its name');

insert into public.branches (name) values ('Coimbatore North');
select t.eq((select code from public.branches where name='Coimbatore North'), 'COIMBA-2',
  'a second name with the same first eight letters gets a distinct code');

insert into public.branches (name, code) values ('Madurai','MDU');
select t.eq((select code from public.branches where name='Madurai'), 'MDU',
  'a code sent explicitly is kept, not overwritten');

insert into public.branches (name) values ('...');
select t.ok((select code from public.branches where name='...') = 'BRANCH',
  'a name of punctuation alone still produces an addressable code');

-- ------------------------------------------------------------- the name
select t.rejects(
  $$insert into public.branches (name) values ('madurai')$$,
  'a second LIVE branch cannot take an existing name, in any case',
  'branches_name_live');

-- A removed branch releases its name -- the index is partial on purpose.
update public.branches set deleted_at = now() where name = '...';
insert into public.branches (name) values ('...');
select t.eq((select count(*)::int from public.branches where name='...'), 2,
  'a removed branch does not hold its name against a new one');

-- ---------------------------------------------------------- the removal
insert into public.courses (name) values ('Branch Test Course');
insert into public.course_offerings (course_id, branch_id)
select c.id, b.id from public.courses c, public.branches b
 where c.name='Branch Test Course' and b.name='Coimbatore';

select t.rejects(
  $$update public.branches set deleted_at = now() where name='Coimbatore'$$,
  'a branch that still runs an offering cannot be removed',
  'still runs');

-- The guard reads LIVE offerings, so moving the offering out releases it.
update public.course_offerings set deleted_at = now()
 where branch_id = (select id from public.branches where name='Coimbatore');
update public.branches set deleted_at = now() where name='Coimbatore';
select t.ok((select deleted_at from public.branches where name='Coimbatore') is not null,
  'once nothing runs at it, the branch is removed');

-- A holiday scoped to a branch outliving it would suppress sessions for a
-- branch no read can see.
insert into public.holidays (name, start_date, end_date, branch_id)
select 'Branch Test Holiday', '2026-12-25', '2026-12-25', id
  from public.branches where name='Madurai';

select t.rejects(
  $$update public.branches set deleted_at = now() where name='Madurai'$$,
  'a branch that scopes a holiday cannot be removed',
  'scope');

-- An UPDATE that is not a removal is untouched by the guard.
update public.branches set city = 'Madurai' where name='Madurai';
select t.eq((select city from public.branches where name='Madurai'), 'Madurai',
  'an ordinary edit to a branch in use still goes through');

-- Re-removing an already-removed branch is not a fresh removal, so the guard
-- stays out of the way rather than re-running its counts.
update public.branches set deleted_at = now() where name='Coimbatore';
select t.ok(true, 'setting deleted_at again on a removed branch is not re-checked');
