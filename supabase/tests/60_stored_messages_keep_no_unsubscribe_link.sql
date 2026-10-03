\echo 'stored email records keep no unsubscribe link (0083)'
--
-- The signed link can undo an opt-out since the Resubscribe button
-- (requests/2026-09-30-resubscribe-button.md), so no copy may sit where staff
-- can read it. The migrations have already run before this file opens, so the
-- rows are written AFTER 0083 -- the shape of a row written before it -- and
-- 0083 is applied again below, which is also its idempotence check.

begin;
  insert into public.members (id, full_name) values ('eeeeeeee-0000-0000-0000-000000000060','Asha R');
  insert into public.email_templates (id, name, subject, body_text)
    values ('eeeeeeee-2222-0000-0000-000000000060','Check-in','Hello','Hi {{first_name}}');
  insert into public.email_batches (id, client_batch_id, template_id, subject_snapshot, body_snapshot)
    values ('eeeeeeee-1111-0000-0000-000000000060','cb-60','eeeeeeee-2222-0000-0000-000000000060','Hello','Hi');
  insert into public.email_messages (batch_id, member_id, member_email_id, subject, variables)
    values ('eeeeeeee-1111-0000-0000-000000000060','eeeeeeee-0000-0000-0000-000000000060', null, 'Hello',
            jsonb_build_object('first_name','Asha',
              'unsubscribe_url','https://ref.supabase.co/functions/v1/unsubscribe?e=abc&t=SECRETTOKEN'));
  insert into public.email_events (provider, provider_message_id, event_type, payload)
    values ('ses','p-1','Bounce', jsonb_build_object(
      'notificationType','Bounce',
      'bounce', jsonb_build_object('bounceType','Permanent'),
      'mail', jsonb_build_object('headers', jsonb_build_array(
        jsonb_build_object('name','Subject','value','Hello'),
        jsonb_build_object('name','List-Unsubscribe',
          'value','<mailto:unsubscribe@getfit.rosifit.com>, <https://ref.supabase.co/functions/v1/unsubscribe?e=abc&t=SECRETTOKEN>'))))),
           ('ses','p-2','Complaint', '{"notificationType":"Complaint","mail":{"messageId":"p-2"}}'::jsonb);
commit;

\i supabase/migrations/0083_stored_messages_keep_no_unsubscribe_link.sql

select t.eq((select count(*)::int from public.email_messages where variables ? 'unsubscribe_url'), 0,
  'no stored message keeps the unsubscribe link');
select t.eq((select variables->>'first_name' from public.email_messages
              where member_id = 'eeeeeeee-0000-0000-0000-000000000060'), 'Asha',
  'and every other template value stays');
select t.eq((select count(*)::int from public.email_events where payload::text like '%SECRETTOKEN%'), 0,
  'no stored SES notification keeps the signed link');
select t.eq((select payload #>> '{mail,headers,1,value}' from public.email_events where provider_message_id='p-1'),
  '<mailto:unsubscribe@getfit.rosifit.com>, <[unsubscribe link removed]>',
  'the header says what was taken out, and keeps the mailto');
select t.eq((select payload #>> '{bounce,bounceType}' from public.email_events where provider_message_id='p-1'),
  'Permanent', 'the bounce itself is untouched');
select t.eq((select payload from public.email_events where provider_message_id='p-2'),
  '{"notificationType":"Complaint","mail":{"messageId":"p-2"}}'::jsonb,
  'a notification with no link is left exactly as it was');

create temp table after_once as select id, variables from public.email_messages;
\i supabase/migrations/0083_stored_messages_keep_no_unsubscribe_link.sql
select t.eq((select count(*)::int from public.email_messages m join after_once a using (id)
              where m.variables is distinct from a.variables), 0,
  '0083 is idempotent -- a second run changes nothing');
