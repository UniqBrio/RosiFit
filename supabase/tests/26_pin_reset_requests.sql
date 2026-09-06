\echo 'pin reset requests: one open per person, admin-only read, no client writes'

-- 0034. A staff member asks the academy admin for a new PIN. The rules worth
-- pinning are the ones that fail SILENTLY if they regress: a second open row
-- would give the admin two notifications for one forgotten PIN, and a read
-- policy that let staff see the table would hand any staff member a list of
-- accounts whose owners cannot currently sign in.

begin;
insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000002');
insert into public.app_users (id, auth_user_id, kind, name, phone_e164) values
  ('11111111-2222-3333-4444-555555555551','aaaaaaaa-0000-0000-0000-000000000001',
   'super_admin','Rosi Owner','+919994871101'),
  ('11111111-2222-3333-4444-555555555552','aaaaaaaa-0000-0000-0000-000000000002',
   'staff','Priya Menon','+918056329701');

-- one open ask is fine
insert into public.pin_reset_requests (app_user_id)
  values ('11111111-2222-3333-4444-555555555552');
select t.eq(
  (select count(*)::int from public.pin_reset_requests where resolved_at is null),
  1, 'a staff member can have one open request');

-- a SECOND open ask for the same person is refused by the partial index. This
-- is what makes "she tapped Forgot PIN three times" one notification.
select t.rejects($$insert into public.pin_reset_requests (app_user_id)
    values ('11111111-2222-3333-4444-555555555552')$$,
  'a second OPEN request for the same person is refused', 'pin_reset_requests_one_open');

-- resolving it frees the slot: history is kept, and she may ask again later.
update public.pin_reset_requests
  set resolved_at = now(), resolved_by = '11111111-2222-3333-4444-555555555551'
  where app_user_id = '11111111-2222-3333-4444-555555555552';
insert into public.pin_reset_requests (app_user_id)
  values ('11111111-2222-3333-4444-555555555552');
select t.eq(
  (select count(*)::int from public.pin_reset_requests where app_user_id = '11111111-2222-3333-4444-555555555552'),
  2, 'a resolved request is history; she can ask again');
select t.eq(
  (select count(*)::int from public.pin_reset_requests where resolved_at is null),
  1, 'and only one of them is open');
rollback;

-- ------------------------------------------------------------------ RLS
begin;
insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000011'),
  ('aaaaaaaa-0000-0000-0000-000000000012');
insert into public.app_users (id, auth_user_id, kind, name, phone_e164) values
  ('11111111-2222-3333-4444-55555555556a','aaaaaaaa-0000-0000-0000-000000000011',
   'super_admin','Rosi Owner','+919994871102'),
  ('11111111-2222-3333-4444-55555555556b','aaaaaaaa-0000-0000-0000-000000000012',
   'staff','Priya Menon','+918056329702');
insert into public.pin_reset_requests (app_user_id)
  values ('11111111-2222-3333-4444-55555555556b');

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000011';
select t.eq((select count(*)::int from public.pin_reset_requests), 1,
  'the academy admin sees the open request');

set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000012';
select t.eq((select count(*)::int from public.pin_reset_requests), 0,
  'a staff member sees NOTHING -- not even her own; she is not signed in when she asks');

-- No insert/update/delete policy exists for anyone. Every write is an Edge
-- Function using the service role, so a client that tried would be refused
-- however plausible its reason.
select t.rejects($$insert into public.pin_reset_requests (app_user_id)
    values ('11111111-2222-3333-4444-55555555556b')$$,
  'a signed-in client cannot write a request');
rollback;

-- ------------------------------------------------ the resolve is what empties the tray
begin;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000021');
insert into public.app_users (id, auth_user_id, kind, name, phone_e164) values
  ('11111111-2222-3333-4444-55555555557a','aaaaaaaa-0000-0000-0000-000000000021',
   'staff','Priya Menon','+918056329703');
insert into public.pin_reset_requests (app_user_id)
  values ('11111111-2222-3333-4444-55555555557a');

-- deleting the person takes her requests with her: the tray must not carry a
-- line naming somebody who is no longer on the staff list.
delete from public.app_users where id = '11111111-2222-3333-4444-55555555557a';
select t.eq((select count(*)::int from public.pin_reset_requests), 0,
  'removing the staff member cascades her requests away');
rollback;
