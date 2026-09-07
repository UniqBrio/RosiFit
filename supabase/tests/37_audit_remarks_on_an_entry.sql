\echo 'audit remarks on an entry: attached, optional, and still append-only'
--
-- 0044. A remark may now name the audit entry it is about. Everything 0043
-- proved stays true and is NOT re-proved here (32_audit_remarks.sql owns it);
-- this file covers only what the new column can break:
--
--   1. The column is OPTIONAL. Every remark written under 0043 has no entry,
--      and must stay valid, readable and unchanged. A NOT NULL added later --
--      or a default quietly filling one in -- would rewrite history in a table
--      whose whole promise is that it cannot be rewritten.
--   2. It must point at a REAL entry. A remark filed against an id that never
--      existed is a note about nothing, and nothing downstream would notice.
--   3. Attaching a remark must not touch audit_logs. The reference points one
--      way. If annotating a row could modify it, the immutability 0004 enforces
--      would be reachable through the back door this table exists to avoid.
--   4. Append-only still holds WITH the new column -- including the column
--      itself, which must not be re-pointable after the fact. A note that can
--      be moved to a different change is a note that can be made to say
--      something it never said.
--
-- 37, not 35 or 36: those numbers were taken by another session mid-run.

begin;
insert into auth.users (id) values ('dddddddd-0000-0000-0000-000000000001');
insert into public.app_users (id, auth_user_id, kind, name, phone_e164) values
  ('dddddddd-1111-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001',
   'super_admin','Remark Owner 44','+919994871503');
-- An entry to hang a remark on. Written through the table directly because
-- this file is testing the REFERENCE, not the way entries are produced.
insert into public.audit_logs (id, action, entity_type, entity_id, actor_kind)
  overriding system value
  values (900001, 'member.insert', 'member', 'aaaa', 'super_admin');
commit;

-- ------------------------------------------------------- 1. optional column
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  insert into public.audit_remarks (body) values ('A free-standing remark, as 0043 wrote them.');
commit;

select t.ok(
  (select audit_log_id is null from public.audit_remarks
    where body like 'A free-standing remark%'),
  'a remark written without an entry is still accepted, and its entry stays NULL');

select t.eq(
  (select is_nullable from information_schema.columns
    where table_schema='public' and table_name='audit_remarks' and column_name='audit_log_id'),
  'YES', 'audit_log_id is nullable -- every remark from 0043 depends on it');

select t.ok(
  (select column_default is null from information_schema.columns
    where table_schema='public' and table_name='audit_remarks' and column_name='audit_log_id'),
  'and it has no default -- a default would file old remarks against a row they never named');

-- --------------------------------------------------------- 2. a real entry
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  insert into public.audit_remarks (body, audit_log_id)
    values ('Added her mid-term because the Saturday batch had a place.', 900001);
commit;

select t.eq(
  (select audit_log_id from public.audit_remarks where body like 'Added her mid-term%'),
  900001::bigint, 'a remark records the entry it was written against');

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select t.rejects(
    $$insert into public.audit_remarks (body, audit_log_id) values ('about nothing', 987654321)$$,
    'a remark cannot be filed against an entry that does not exist',
    'audit_remarks_audit_log_id_fkey');
rollback;

-- ------------------------------------------------- 3. audit_logs is untouched
select t.eq(
  (select count(*)::int from public.audit_logs where id = 900001), 1,
  'the annotated entry is still there');
select t.ok(
  (select changes = '[]'::jsonb and action = 'member.insert'
     from public.audit_logs where id = 900001),
  'and unchanged -- annotating a row must not write to it');

-- The reference is one-way, so the entry cannot be deleted out from under a
-- remark. audit_logs has no delete path at all (0004), so this can never fire
-- in practice; it is asserted so a future migration that handed one out would
-- fail here rather than silently orphan somebody's note.
select t.rejects(
  $$delete from public.audit_logs where id = 900001$$,
  'an annotated entry cannot be deleted, by privilege or by restrict',
  'permission denied');

-- ------------------------------------------------ 4. still append-only, and
--                                                     the target is not movable
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select t.rejects(
    $$update public.audit_remarks set audit_log_id = null$$,
    'a remark cannot be detached from the change it is about', 'permission denied');
rollback;

begin;
  grant update on public.audit_remarks to service_role;
  set local role service_role;
  select t.rejects(
    $$update public.audit_remarks set audit_log_id = 900001$$,
    'even WITH the grant, the trigger refuses to re-point a remark', 'append-only');
rollback;

-- ---------------------------------------------------------------- and no bleed
select t.eq(
  (select count(*)::int from public.audit_logs where entity_type = 'audit_remarks'), 0,
  'attaching a remark still writes nothing into audit_logs');

select t.ok(
  (select relrowsecurity and relforcerowsecurity from pg_class
    where oid = 'public.audit_remarks'::regclass),
  'row level security is still enabled AND forced after the column was added');

select t.eq(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema='public' and table_name='audit_remarks' and grantee='anon'),
  0, 'anon still holds no privilege on audit_remarks');
