\echo 'audit actor: an action performed through an Edge Function names the person'
--
-- 0023. audit_log() derives its actor from auth.uid(), and every Edge Function
-- calls it through the service-role client where auth.uid() is null -- so a
-- send, a CSV preview, a CSV commit and every match decision inside it were
-- written with a NULL actor and kind 'anon', and the audit screen rendered all
-- of them as "System".
--
-- 'anon' is the label an UNAUTHENTICATED request carries, so a batch of emails
-- sent by the super admin was indistinguishable, in the one table that is
-- append-only and cannot be corrected, from a batch sent by nobody. The first
-- assertion below pins that old behaviour deliberately: audit_log() has NOT
-- changed, and the fix must not have quietly changed it.

begin;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
  values ('11111111-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
          'super_admin','Audit Owner','+919994871201');
insert into public.app_users (id, kind, name, phone_e164, is_active)
  values ('11111111-0000-0000-0000-000000000002','staff','Departed Coach','+919994871202', false);
commit;

-- --------------------------------------------------- the defect, still true
begin;
set local role service_role;
select public.audit_log('communication.batch_sent', 'email_batch', 'batch-unattributed');
commit;

select t.ok((select actor_app_user_id is null from public.audit_logs
              where entity_id = 'batch-unattributed'),
  'audit_log() through service_role still records NO actor -- the defect, unchanged');

select t.eq((select actor_kind from public.audit_logs where entity_id = 'batch-unattributed'),
            'anon',
  'and still labels it anon, which is what an unauthenticated request would carry');

-- ------------------------------------------------------- the fix, attributed
begin;
set local role service_role;
select public.audit_log_as('11111111-0000-0000-0000-000000000001',
  'communication.batch_sent', 'email_batch', 'batch-attributed',
  '[]'::jsonb, jsonb_build_object('sent', 7));
commit;

select t.eq((select actor_app_user_id from public.audit_logs where entity_id = 'batch-attributed'),
            '11111111-0000-0000-0000-000000000001'::uuid,
  'audit_log_as records the actor it was handed');

select t.eq((select actor_kind from public.audit_logs where entity_id = 'batch-attributed'),
            'super_admin',
  'and reads her KIND from her row rather than guessing from the connection');

select t.eq((select metadata->>'sent' from public.audit_logs where entity_id = 'batch-attributed'),
            '7',
  'metadata is carried through unchanged');

select t.eq((select action from public.audit_logs where entity_id = 'batch-attributed'),
            'communication.batch_sent',
  'and so is the action');

-- ------------------------------------------------- staff who have since left
-- Who performed an action is a fact about the past. A coach who leaves next
-- month still did this today, and a log that dropped her on the way out would
-- be rewriting history by omission -- so the lookup is NOT filtered by
-- is_active, unlike current_app_user_id().
begin;
set local role service_role;
select public.audit_log_as('11111111-0000-0000-0000-000000000002',
  'csv_import.completed', 'csv_import', 'import-by-departed');
commit;

select t.eq((select actor_app_user_id from public.audit_logs where entity_id = 'import-by-departed'),
            '11111111-0000-0000-0000-000000000002'::uuid,
  'a deactivated account is still named as the actor of what she did');

select t.eq((select actor_kind from public.audit_logs where entity_id = 'import-by-departed'),
            'staff',
  'with her kind, not a fallback');

-- ------------------------------------------------------------- it refuses
select t.rejects($$
  set local role service_role;
  select public.audit_log_as(null, 'communication.batch_sent', 'email_batch', 'x');
$$, 'a null actor is REFUSED rather than silently written as System', 'requires an actor');

select t.rejects($$
  set local role service_role;
  select public.audit_log_as('11111111-0000-0000-0000-00000000dead',
    'communication.batch_sent', 'email_batch', 'x');
$$, 'an actor who is not an app user is refused', 'not an app user');

select t.eq((select count(*)::int from public.audit_logs where entity_id = 'x'), 0,
  'and neither refusal left an entry behind');

-- ------------------------------------------------ naming an actor is forging
-- A client that could pass p_actor could write, into a table nobody can
-- correct, an entry blaming somebody else. Only functions that verified a
-- session first may reach this.
select t.rejects($$
  set local role authenticated;
  select public.audit_log_as('11111111-0000-0000-0000-000000000001',
    'communication.batch_sent', 'email_batch', 'forged');
$$, 'authenticated cannot name an actor at all', 'permission denied');

select t.rejects($$
  set local role anon;
  select public.audit_log_as('11111111-0000-0000-0000-000000000001',
    'communication.batch_sent', 'email_batch', 'forged');
$$, 'and neither can anon', 'permission denied');

select t.eq((select count(*)::int from public.audit_logs where entity_id = 'forged'), 0,
  'no forged entry exists');

-- ------------------------------------------------------ redaction still holds
-- audit_log_as goes through audit_redact for the same reason audit_log does:
-- a PIN or a recovery answer must never reach this table readable, whichever
-- function put the row there.
begin;
set local role service_role;
select public.audit_log_as('11111111-0000-0000-0000-000000000001',
  'auth.pin_issued', 'app_user', 'redaction-check',
  jsonb_build_array(jsonb_build_object('field','pin_hash','old','abc','new','def')));
commit;

select t.ok((select changes::text not like '%abc%' and changes::text not like '%def%'
               from public.audit_logs where entity_id = 'redaction-check'),
  'a secret handed to audit_log_as is redacted, exactly as audit_log redacts it');

-- ---------------------------------------------------- the table is still shut
select t.rejects($$
  update public.audit_logs set action = 'tampered' where entity_id = 'batch-attributed';
$$, 'an attributed entry is no more editable than any other', 'append-only');
