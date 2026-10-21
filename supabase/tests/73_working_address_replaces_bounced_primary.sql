\echo 'a working address takes over from a bounced primary (0096)'

-- WHAT THIS PINS
--   A member with a BOUNCED primary and a working second address gets the working one as
--   primary (the newest, if several); the bounced row stays, still 'bounced', no longer primary.
--   An unsubscribed or spam-reported primary is left alone. A bounced primary with nothing
--   working beside it is left alone. A healthy primary is never touched. Re-running changes
--   nothing. Afterwards the send's own read -- the live primary row -- names the working address.

begin;

insert into public.members (id, full_name) values
  ('ffffffff-7300-0000-0000-0000000000a1', 'Bounced With Fix'),
  ('ffffffff-7300-0000-0000-0000000000a2', 'Bounced With Two Fixes'),
  ('ffffffff-7300-0000-0000-0000000000a3', 'Unsubscribed With Other'),
  ('ffffffff-7300-0000-0000-0000000000a4', 'Bounced Alone'),
  ('ffffffff-7300-0000-0000-0000000000a5', 'Healthy');

insert into public.member_emails (id, member_id, email, is_primary, status, created_at) values
  ('ffffffff-7300-0000-0000-0000000000b1', 'ffffffff-7300-0000-0000-0000000000a1', 'fix.dead@example.com',    true,  'bounced',      now() - interval '9 days'),
  ('ffffffff-7300-0000-0000-0000000000b2', 'ffffffff-7300-0000-0000-0000000000a1', 'fix.good@example.com',    false, 'unknown',      now() - interval '1 day'),
  ('ffffffff-7300-0000-0000-0000000000b3', 'ffffffff-7300-0000-0000-0000000000a2', 'two.dead@example.com',    true,  'bounced',      now() - interval '9 days'),
  ('ffffffff-7300-0000-0000-0000000000b4', 'ffffffff-7300-0000-0000-0000000000a2', 'two.older@example.com',   false, 'unknown',      now() - interval '5 days'),
  ('ffffffff-7300-0000-0000-0000000000b5', 'ffffffff-7300-0000-0000-0000000000a2', 'two.newest@example.com',  false, 'unknown',      now() - interval '1 day'),
  ('ffffffff-7300-0000-0000-0000000000b6', 'ffffffff-7300-0000-0000-0000000000a3', 'stop.please@example.com', true,  'unsubscribed', now() - interval '9 days'),
  ('ffffffff-7300-0000-0000-0000000000b7', 'ffffffff-7300-0000-0000-0000000000a3', 'stop.other@example.com',  false, 'unknown',      now() - interval '1 day'),
  ('ffffffff-7300-0000-0000-0000000000b8', 'ffffffff-7300-0000-0000-0000000000a4', 'alone.dead@example.com',  true,  'bounced',      now() - interval '9 days'),
  ('ffffffff-7300-0000-0000-0000000000b9', 'ffffffff-7300-0000-0000-0000000000a5', 'healthy@example.com',     true,  'unknown',      now() - interval '9 days'),
  ('ffffffff-7300-0000-0000-0000000000ba', 'ffffffff-7300-0000-0000-0000000000a5', 'healthy.old@example.com', false, 'bounced',      now() - interval '9 days');

\ir ../migrations/0096_working_address_replaces_bounced_primary.sql

-- The send's own read: the live primary row (send-followups/load.ts).
create temp table primary73 on commit drop as
  select member_id, email::text as email, status from public.member_emails
   where is_primary and deleted_at is null and member_id::text like 'ffffffff-7300-%';

select t.eq((select email from primary73 where member_id = 'ffffffff-7300-0000-0000-0000000000a1'),
  'fix.good@example.com', 'a bounced primary with a working address beside it: the working one is now primary');
select t.eq((select status from public.member_emails where id = 'ffffffff-7300-0000-0000-0000000000b1'),
  'bounced', 'the bounced row keeps its status -- nothing is reinstated');
select t.ok((select not is_primary and deleted_at is null from public.member_emails where id = 'ffffffff-7300-0000-0000-0000000000b1'),
  'and stays on the record, no longer primary');
select t.eq((select email from primary73 where member_id = 'ffffffff-7300-0000-0000-0000000000a2'),
  'two.newest@example.com', 'with two working addresses, the newest becomes primary');
select t.eq((select email from primary73 where member_id = 'ffffffff-7300-0000-0000-0000000000a3'),
  'stop.please@example.com', 'an UNSUBSCRIBED primary is left alone -- the member said stop');
select t.eq((select email from primary73 where member_id = 'ffffffff-7300-0000-0000-0000000000a4'),
  'alone.dead@example.com', 'a bounced primary with nothing working beside it is left alone');
select t.eq((select email from primary73 where member_id = 'ffffffff-7300-0000-0000-0000000000a5'),
  'healthy@example.com', 'a healthy primary is never touched');
select t.eq((select count(*)::int from primary73), 5, 'every member still has exactly one live primary');

create temp table before_rerun73 on commit drop as
  select id, is_primary, status from public.member_emails where member_id::text like 'ffffffff-7300-%';
\ir ../migrations/0096_working_address_replaces_bounced_primary.sql
select t.eq((select count(*)::int from (
    select id, is_primary, status from public.member_emails where member_id::text like 'ffffffff-7300-%'
    except select * from before_rerun73) d), 0, 're-running 0096 changes nothing');

rollback;
