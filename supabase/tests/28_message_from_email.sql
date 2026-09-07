\echo 'email_messages.from_email: the sender is recorded per message, not inferred'

-- 0036. The sender used to be one constant -- SES_FROM_ADDRESS -- so "which
-- address did this message go out as" was answerable from a secret. It is now
-- the COURSE's address wherever the course has one, so it varies per message,
-- and a varying fact read from a secret's CURRENT value is evidence of
-- nothing: rotate the secret and every message ever sent appears to have come
-- from the new address. These pin that the column exists, records what it was
-- given, and stays NULLABLE -- because the rows that predate it cannot be
-- backfilled without inventing the fact.

begin;

select t.ok(exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='email_messages'
      and column_name='from_email' and data_type='text'),
  'email_messages carries the address it was sent as');

-- NULLABLE, deliberately: rows sent before 0036, a send by the dev provider
-- (which has no sender at all), and a message excluded before any sender was
-- chosen all legitimately have no address to record.
select t.ok(exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='email_messages'
      and column_name='from_email' and is_nullable='YES'),
  'from_email is nullable -- NULL means not recorded, never "the default"');

insert into public.members (id, full_name)
  values ('ffffffff-3333-3333-3333-333333333331','Meenakshi Sundaram');

insert into public.email_batches (client_batch_id, template_id, subject_snapshot, body_snapshot)
select 'from-email-spec', t.id, t.subject, t.body_text
  from public.email_templates t where t.is_default limit 1;

-- The academy's SECOND sender, on a message whose deployment default is the
-- first. This is the whole change in one row: what the course chose is what
-- gets written down.
insert into public.email_messages (batch_id, member_id, to_email, subject, status, from_email)
select b.id, 'ffffffff-3333-3333-3333-333333333331', 'meena@example.com', 'S', 'sent',
       'support@getfit.ravisfit.com'
  from public.email_batches b where b.client_batch_id = 'from-email-spec';

select t.eq(
  (select from_email from public.email_messages where to_email = 'meena@example.com'),
  'support@getfit.ravisfit.com',
  'a message from a course set to the second sender records THAT address');

-- A message that records no sender is still storable, and reads as unknown
-- rather than as the default.
insert into public.email_messages (batch_id, member_id, to_email, subject, status)
select b.id, 'ffffffff-3333-3333-3333-333333333331', 'meena2@example.com', 'S', 'excluded'
  from public.email_batches b where b.client_batch_id = 'from-email-spec';

select t.ok(
  (select from_email is null from public.email_messages where to_email = 'meena2@example.com'),
  'a message with no recorded sender stays NULL');

rollback;
