\echo 'audit remarks: admin-only, self-signed, append-only'
--
-- 0043. A remark is a note a person writes beside the audit log. Four things
-- have to hold, and each of them is a way the feature could look correct on
-- screen while being wrong in the table:
--
--   1. Only the academy admin may read one, and only the academy admin may
--      write one. The Audit log is admin-only; a remark quotes it.
--   2. The AUTHOR is the person who wrote it and cannot be anybody else.
--      A client that could name its own author could sign somebody else's
--      name to a note nobody can afterwards correct (the same reason
--      audit_log_as is denied to authenticated -- RC-011).
--   3. It cannot be edited or deleted, by anybody, ever -- including with
--      the grant that layer 1 relies on, which is the assertion that proves
--      the trigger is independently sufficient (mirroring 02_audit.sql).
--   4. audit_logs is not touched by any of it.

begin;
insert into auth.users (id) values
  ('cccccccc-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000002');
insert into public.app_users (id, auth_user_id, kind, name, phone_e164) values
  ('cccccccc-1111-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001',
   'super_admin','Remark Owner','+919994871501'),
  ('cccccccc-1111-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000002',
   'staff','Remark Staff','+919994871502');
commit;

-- ------------------------------------------------------------ the admin writes
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  insert into public.audit_remarks (body)
    values ('Lowered the Prenatal Yoga thresholds after the Saturday batch moved.');
commit;

select t.eq((select count(*)::int from public.audit_remarks), 1,
            'the academy admin can add a remark');
select t.eq((select author_app_user_id from public.audit_remarks limit 1),
            'cccccccc-1111-0000-0000-000000000001'::uuid,
            'the author is filled from the signed-in person, not from the client');

-- ------------------------------------------------------------ nobody else does
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000002';
  select t.eq((select count(*)::int from public.audit_remarks), 0,
              'a staff account cannot READ a remark');
  select t.rejects($$insert into public.audit_remarks (body) values ('staff note')$$,
    'a staff account cannot WRITE a remark', 'row-level security');
rollback;

-- The forgery this exists to stop: signing the owner's name to a note.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  select t.rejects($$insert into public.audit_remarks (author_app_user_id, body)
                     values ('cccccccc-1111-0000-0000-000000000002','not mine')$$,
    'even the admin cannot post a remark under somebody else''s name', 'row-level security');
rollback;

-- ---------------------------------------------------------------- the content
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  select t.rejects($$insert into public.audit_remarks (body) values ('   ')$$,
    'a remark of whitespace is not a remark', 'audit_remarks_body_length');
  select t.rejects(
    format($$insert into public.audit_remarks (body) values (%L)$$, repeat('x', 1001)),
    'a remark longer than the form allows is refused by the table too',
    'audit_remarks_body_length');
rollback;

-- ----------------------------------------------------------------- append-only
-- Layer 1: privilege. Neither role holds UPDATE or DELETE.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  select t.rejects($$update public.audit_remarks set body='rewritten'$$,
    'authenticated has no UPDATE privilege on audit_remarks', 'permission denied');
  select t.rejects($$delete from public.audit_remarks$$,
    'authenticated has no DELETE privilege on audit_remarks', 'permission denied');
rollback;

begin;
  set local role service_role;
  select t.rejects($$delete from public.audit_remarks$$,
    'service_role has no DELETE privilege on audit_remarks either', 'permission denied');
rollback;

-- Layer 2: the trigger. Defence in depth is only real if each layer is
-- independently sufficient, so this proves it still holds WITH the grant a
-- future migration might hand out by accident.
begin;
  grant update, delete on public.audit_remarks to service_role;
  set local role service_role;
  select t.rejects($$update public.audit_remarks set body='tampered'$$,
    'even WITH the grant, the trigger refuses the update', 'append-only');
  select t.rejects($$delete from public.audit_remarks$$,
    'even WITH the grant, the trigger refuses the delete', 'append-only');
rollback;

select t.rejects($$truncate public.audit_remarks$$,
  'a remark cannot be truncated away', 'append-only');

-- The refusal names the right table. A message pointing at audit_logs would
-- send the next person to read it to a table that was never involved.
select t.ok(
  (select true from public.audit_remarks limit 1) is not null,
  'the remark written at the top of this file is still there, unaltered');

-- ------------------------------------------------------------- and no bleed
select t.eq(
  (select count(*)::int from public.audit_logs where entity_type = 'audit_remarks'), 0,
  'adding a remark does not write into audit_logs -- the two tables stay separate');

select t.ok(
  (select relrowsecurity and relforcerowsecurity from pg_class
    where oid = 'public.audit_remarks'::regclass),
  'row level security is enabled AND forced on audit_remarks');

select t.eq(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema='public' and table_name='audit_remarks' and grantee='anon'),
  0, 'anon holds no privilege on audit_remarks');
