\echo 'audit: append-only, redaction, previous/current'
begin;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.app_users (auth_user_id, kind, name, phone_e164)
  values ('aaaaaaaa-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158');
commit;

begin;
  set local role service_role;
  update public.app_users set role_label = 'Academy admin' where kind='super_admin';
commit;

-- WHO / WHAT / WHEN / PREVIOUS / CURRENT
select t.eq((select count(*)::int from public.audit_logs
             where action='app_user.update'), 1, 'an update writes exactly one audit row');
select t.eq((select changes->0->>'field' from public.audit_logs where action='app_user.update'),
            'role_label', 'the changed field is named');
select t.eq((select changes->0->>'old' from public.audit_logs where action='app_user.update'),
            'Coach', 'PREVIOUS value recorded');
select t.eq((select changes->0->>'new' from public.audit_logs where action='app_user.update'),
            'Academy admin', 'CURRENT value recorded');
select t.ok((select occurred_at from public.audit_logs order by id desc limit 1) is not null,
            'WHEN recorded');

-- a no-op update must not manufacture an audit row
begin;
  set local role service_role;
  update public.app_users set role_label = 'Academy admin' where kind='super_admin';
commit;
select t.eq((select count(*)::int from public.audit_logs where action='app_user.update'), 1,
            'a no-op update writes NO audit row');

-- redaction is not optional
select public.audit_log('auth.pin_reset','app_user','x',
  '[{"field":"pin","old":"1234","new":"9876"},
    {"field":"security_answer","old":"delhi","new":"chennai"},
    {"field":"name","old":"A","new":"B"}]'::jsonb);
select t.eq((select changes->0->>'new' from public.audit_logs where action='auth.pin_reset'),
            '[redacted]', 'a PIN can never reach the audit log');
select t.eq((select changes->1->>'old' from public.audit_logs where action='auth.pin_reset'),
            '[redacted]', 'a security answer can never reach the audit log');
select t.eq((select changes->2->>'new' from public.audit_logs where action='auth.pin_reset'),
            'B', 'non-secret fields are still recorded');

-- immutability, for every role including service_role
select t.rejects($$update public.audit_logs set action='tampered' where id=1$$,
  'audit rows cannot be updated', 'append-only');
select t.rejects($$delete from public.audit_logs where id=1$$,
  'audit rows cannot be deleted', 'append-only');
-- Layer 1: privileges. service_role has no DELETE on audit_logs.
begin;
  set local role service_role;
  select t.rejects($$delete from public.audit_logs where id=1$$,
    'service_role has no DELETE privilege on audit_logs', 'permission denied');
rollback;

-- Layer 2: the trigger. Prove it still holds if a future migration were to
-- hand out the grant that layer 1 relies on -- defence in depth is only real
-- if each layer is independently sufficient.
begin;
  grant delete, update on public.audit_logs to service_role;
  set local role service_role;
  select t.rejects($$delete from public.audit_logs where id=1$$,
    'even WITH the grant, the trigger refuses the delete', 'append-only');
  select t.rejects($$update public.audit_logs set action='tampered' where id=1$$,
    'even WITH the grant, the trigger refuses the update', 'append-only');
rollback;
