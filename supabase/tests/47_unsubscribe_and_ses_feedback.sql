\echo 'unsubscribe + SES feedback: an anonymous actor, and a template that says how to stop'
--
-- 0065 and 0066, and the two schema facts the two new Edge Functions lean on.
--
-- WHAT COULD GO WRONG THAT NOTHING ELSE WOULD CATCH:
--
--   1. A member's own opt-out gets filed as 'system'. audit_log() derives the
--      kind, and on the service-role client -- which is every Edge Function --
--      it answers 'system'. The one table that cannot be corrected would then
--      say the academy did this to the member. 0065 exists so it can say the
--      member did it.
--   2. audit_log_anon becomes a way to act without leaving a name. It writes
--      actor_kind 'anon' and a null actor and takes NEITHER as an argument,
--      and `authenticated` must not reach it at all -- otherwise a signed-in
--      client has a way to write untraceable entries.
--   3. The unsubscribe line is not actually in the template. The wording lives
--      in the database, so "we added an unsubscribe line" is a claim about a
--      row, not about the repo, and only a query can check it.
--   4. Applying 0066 twice appends the line twice. Migrations get replayed by
--      the harness on every single test file; a non-idempotent one would show
--      up as a member reading the same sentence twice.
--   5. The webhook idempotency ses-feedback relies on is not really there.
--      recordEvent upserts on (provider, provider_message_id, event_type)
--      because SNS RETRIES -- if that constraint were missing the upsert would
--      be a plain insert and every retry would duplicate the audit trail.

-- ------------------------------------------------ 1. the anonymous audit entry
select t.eq(public.audit_log_anon('communication.unsubscribed', 'member_email',
              'aaaaaaaa-0000-0000-0000-000000000001',
              '[{"field":"status","old":"valid","new":"unsubscribed"}]'::jsonb,
              '{"via":"link"}'::jsonb) is not null, true,
            'audit_log_anon writes an entry and returns its id');

select t.eq((select actor_kind from public.audit_logs
              where action = 'communication.unsubscribed' order by id desc limit 1),
            'anon',
            'a member opting out is filed as anon, not as system');

select t.eq((select actor_app_user_id from public.audit_logs
              where action = 'communication.unsubscribed' order by id desc limit 1),
            null::uuid,
            'no app_user is named, because a member does not have one');

select t.eq((select metadata->>'via' from public.audit_logs
              where action = 'communication.unsubscribed' order by id desc limit 1),
            'link',
            'the metadata records which route the opt-out came in by');

-- The entry is still append-only. 0065 adds a writer, not an exception.
select t.rejects(
  $$update public.audit_logs set action = 'edited' where action = 'communication.unsubscribed'$$,
  'an anon entry cannot be edited afterwards, like every other entry',
  'append-only');

-- ------------------------------------------------------- 2. who may call it
select t.rejects(
  $$set local role authenticated;
    select public.audit_log_anon('forged.entry', 'member_email', 'x')$$,
  'a signed-in client cannot write an anonymous entry',
  'permission denied');

select t.rejects(
  $$set local role anon;
    select public.audit_log_anon('forged.entry', 'member_email', 'x')$$,
  'anon cannot write an anonymous entry either',
  'permission denied');

begin;
  set local role service_role;
  select t.eq(public.audit_log_anon('communication.unsubscribed', 'member_email', 'y')
                is not null, true,
              'service_role -- the role every Edge Function runs as -- can');
commit;

-- ------------------------------------------- 3. the template says how to stop
select t.eq((select count(*)::int from public.email_templates
              where body_text like '%{{unsubscribe_url}}%'),
            (select count(*)::int from public.email_templates),
            'every stored template carries the unsubscribe placeholder');

-- A COPY-LOCK on the sentence itself. The wording is the member-facing half of
-- the promise the List-Unsubscribe header makes, and it is what AWS was shown.
-- Changing it is allowed; changing it by accident is not.
select t.ok((select body_text from public.email_templates where is_default)
              like '%If you would rather not get these check-ins, you can stop them here:%',
            'the default template asks in the academy''s own voice, not a marketing footer');

-- Gender-neutral, like every other member-facing string here. The line added
-- by 0066 must not have smuggled a pronoun into the one place every member
-- reads.
select t.eq((select count(*)::int from public.email_templates
              where body_text ~* '\m(she|her|hers|he|his|him|s/he)\M'),
            0,
            'no template speaks about the member as "she" or "he"');

-- ------------------------------------------------ 4. 0066 is safe to re-apply
update public.email_templates
   set body_text = body_text
     || E'\n\n--\nIf you would rather not get these check-ins, you can stop them here:\n{{unsubscribe_url}}'
 where body_text not like '%{{unsubscribe_url}}%';

select t.eq((select count(*)::int from public.email_templates
              where (length(body_text) - length(replace(body_text, '{{unsubscribe_url}}', '')))
                    / length('{{unsubscribe_url}}') > 1),
            0,
            'applying 0066 a second time cannot append the line twice');

-- --------------------------------------- 5. the webhook idempotency behind it
begin;
  insert into public.email_events (provider, provider_message_id, event_type, payload)
  values ('ses', 'msg-0000000000000001', 'Bounce', '{"first":true}'::jsonb);
commit;

select t.rejects(
  $$insert into public.email_events (provider, provider_message_id, event_type, payload)
    values ('ses', 'msg-0000000000000001', 'Bounce', '{"second":true}'::jsonb)$$,
  'the same SNS notification delivered twice is refused by the unique key',
  'duplicate key');

-- ...which is why ses-feedback upserts with ignoreDuplicates rather than
-- inserting: the retry must leave the FIRST copy standing and must not make
-- the function answer non-2xx, because a non-2xx is what makes SNS eventually
-- disable the subscription.
begin;
  insert into public.email_events (provider, provider_message_id, event_type, payload)
  values ('ses', 'msg-0000000000000001', 'Bounce', '{"second":true}'::jsonb)
  on conflict (provider, provider_message_id, event_type) do nothing;
commit;

select t.eq((select payload->>'first' from public.email_events
              where provider_message_id = 'msg-0000000000000001'),
            'true',
            'the retry leaves the event that actually arrived first in place');

select t.eq((select count(*)::int from public.email_events
              where provider_message_id = 'msg-0000000000000001'),
            1,
            'and does not duplicate the audit trail');

-- --------------------------- 6. an opt-out outranks a bounce that lands later
-- The rule ses-feedback enforces with `.neq('status','unsubscribed')`, stated
-- here as the SQL it becomes. A member who said no must not be
-- re-labelled 'bounced' -- 'bounced' is a state the academy could decide to
-- clear, and 'unsubscribed' is one it may not.
begin;
  insert into public.members (id, full_name, joined_on, status)
  values ('bbbbbbbb-0000-0000-0000-000000000001', 'Opted Out', current_date, 'active');
  insert into public.member_emails (id, member_id, email, is_primary, status)
  values ('bbbbbbbb-1111-0000-0000-000000000001',
          'bbbbbbbb-0000-0000-0000-000000000001', 'optedout@example.com', true, 'unsubscribed');
  insert into public.member_emails (id, member_id, email, is_primary, status)
  values ('bbbbbbbb-1111-0000-0000-000000000002',
          'bbbbbbbb-0000-0000-0000-000000000001', 'reachable@example.com', false, 'valid');
commit;

update public.member_emails set status = 'bounced'
 where email in ('optedout@example.com', 'reachable@example.com')
   and status <> 'unsubscribed'
   and deleted_at is null;

select t.eq((select status from public.member_emails where email = 'optedout@example.com'),
            'unsubscribed',
            'a permanent bounce does not overwrite a member''s own opt-out');
select t.eq((select status from public.member_emails where email = 'reachable@example.com'),
            'bounced',
            'and every other address in the same notification is still suppressed');
