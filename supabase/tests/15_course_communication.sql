\echo 'course communication: a course carries its own sender, template and wording'
--
-- 0021. The canvas edits a course's sender, template and exact wording in the
-- course form, and nothing in the schema could hold any of it. The rule this
-- must not break is guardrail 5 / C-68: messages go out through STORED
-- templates, never composed at send time. Storing wording against the course
-- in advance is authoring; the resolver below is what the form's preview, the
-- read-only send draft and the batch all read, so none of them can disagree.

begin;
insert into auth.users (id) values ('cccccccc-0000-0000-0000-000000000001');
insert into public.app_users (auth_user_id, kind, name, phone_e164)
  values ('cccccccc-0000-0000-0000-000000000001','super_admin','Comm Owner','+919994871103');
insert into public.branches (name, code) values ('Comm Branch','CMB');
insert into public.courses (name) values ('Comm Course'), ('Untouched Course');
insert into public.email_templates (name, subject, body_text)
  values ('Long absence','It has been a while, {{first_name}}',
          E'Hello {{first_name}},\n\nWe have not seen you in {{course_name}} for some time.');
commit;

-- ------------------------------------------------------- the fallback first
select t.eq((select source from public.effective_course_message(
              (select id from public.courses where name='Comm Course'))), 'default',
  'a course with no row falls back to the DEFAULT template, not to nothing');

select t.eq((select subject from public.effective_course_message(
              (select id from public.courses where name='Comm Course'))),
            'We missed you this week, {{first_name}}',
  'and the fallback carries the default template''s own subject');

-- ------------------------------------------------------------- naming a template
insert into public.course_communication (course_id, from_email, template_id)
select c.id, 'support@rosifit.com', t.id
  from public.courses c, public.email_templates t
 where c.name='Comm Course' and t.name='Long absence';

select t.eq((select source from public.effective_course_message(
              (select id from public.courses where name='Comm Course'))), 'template',
  'naming a template but no wording resolves to the TEMPLATE''s words');

select t.eq((select subject from public.effective_course_message(
              (select id from public.courses where name='Comm Course'))),
            'It has been a while, {{first_name}}',
  'and those words are the named template''s, not the default''s');

select t.eq((select from_email from public.effective_course_message(
              (select id from public.courses where name='Comm Course'))), 'support@rosifit.com',
  'the course''s own sender comes back with it');

-- ------------------------------------------------------------- own wording
update public.course_communication
   set subject = 'We saved your mat, {{first_name}}'
 where course_id = (select id from public.courses where name='Comm Course');

select t.eq((select source from public.effective_course_message(
              (select id from public.courses where name='Comm Course'))), 'course',
  'wording on the course overrides the template it names');

select t.eq((select body_text from public.effective_course_message(
              (select id from public.courses where name='Comm Course'))),
            E'Hello {{first_name}},\n\nWe have not seen you in {{course_name}} for some time.',
  'a subject override alone leaves the BODY still tracking the template');

-- NULL is "use the template's", which is what lets Reset work and what stops
-- an untouched course holding a stale copy of wording it never chose.
update public.course_communication set subject = null
 where course_id = (select id from public.courses where name='Comm Course');
select t.eq((select source from public.effective_course_message(
              (select id from public.courses where name='Comm Course'))), 'template',
  'clearing the wording returns the course to its template');

-- ------------------------------------------------------------ one row only
select t.rejects(
  $$insert into public.course_communication (course_id, from_email, template_id)
    select c.id, 'x@y.com', t.id from public.courses c, public.email_templates t
     where c.name='Comm Course' and t.is_default$$,
  'a course cannot hold two communication rows',
  'course_communication_pkey');

-- ------------------------------------------------------------- the guards
select t.rejects(
  $$insert into public.course_communication (course_id, from_email, template_id)
    select c.id, 'not-an-address', t.id from public.courses c, public.email_templates t
     where c.name='Untouched Course' and t.is_default$$,
  'a from-address with no @ is refused -- it would bounce every message',
  'from_email');

select t.rejects(
  $$insert into public.course_communication (course_id, from_email, template_id, subject)
    select c.id, 'a@b.com', t.id, 'Hi' from public.courses c, public.email_templates t
     where c.name='Untouched Course' and t.is_default$$,
  'a two-character subject is refused',
  'subject');

-- ------------------------------------------------------- deleting the course
-- The row is ON DELETE CASCADE, so removing a course cannot leave its wording
-- behind pointing at nothing.
select t.eq((select count(*)::int from public.course_communication), 1,
  'one course carries communication before the delete');
delete from public.courses where name='Comm Course';
select t.eq((select count(*)::int from public.course_communication), 0,
  'deleting the course takes its communication row with it');

-- ------------------------------------------------------------ untouched
select t.eq((select source from public.effective_course_message(
              (select id from public.courses where name='Untouched Course'))), 'default',
  'a course nobody configured still resolves, to the default template');

-- ------------------------------------------------------------- the grants
-- 09_grants.sql is a whitelist scoped to "0002-0010" and cannot know about a
-- table added by 0021, so the new table's privileges are asserted HERE rather
-- than by editing an existing spec (test files are append-only).
select t.eq((select string_agg(privilege_type, ',' order by privilege_type)
               from information_schema.role_table_grants
              where grantee='authenticated' and table_name='course_communication'),
            'INSERT,SELECT,UPDATE',
  'authenticated may read and write a course''s wording -- and may NOT delete it');

select t.eq((select count(*)::int from information_schema.role_table_grants
              where grantee='anon' and table_name='course_communication'), 0,
  'anon holds nothing on course_communication');

select t.ok((select count(*) from pg_policies
              where tablename='course_communication') = 3,
  'three policies: read for any active user, insert and update for the super admin');
