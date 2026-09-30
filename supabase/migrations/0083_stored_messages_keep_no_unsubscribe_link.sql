-- 0083 · nothing stored about an email keeps its unsubscribe link
--
-- WHY (requests/2026-09-30-resubscribe-button.md, owner: "Close it first")
--   The signed unsubscribe link can now UNDO an opt-out as well as make one
--   (the Resubscribe button). Two tables held copies of it:
--     · email_messages.variables.unsubscribe_url -- every message send-followups
--       recorded; readable by every signed-in account (0009, messages_read).
--       Production, 30-Sep-2026: 821 of 822 rows.
--     · email_events.payload -- SES echoes the message headers, List-Unsubscribe
--       among them, in bounce and complaint notifications; readable by the
--       super admin (0009, events_read). Production: 24 of 26 rows.
--   A copy where staff can read it lets staff undo an opt-out, which only the
--   member may. The code no longer writes either copy (send-loop.ts
--   storableVars, ses-feedback withoutUnsubscribeLinks); this removes the ones
--   already written.
--
-- WHAT CHANGES
--   email_messages: the `unsubscribe_url` key is dropped from `variables`.
--     Nothing reads `variables` back to send; every other key stays.
--   email_events: each link inside `payload` becomes
--     '[unsubscribe link removed]' -- the same words the function writes -- and
--     every other byte of the notification stays.
--   Neither table has a trigger, so no audit row copies the old value.
--   No schema change. The links in emails members already HAVE keep working.
--
-- PRODUCTION SAFETY
--   A data rewrite of two columns, and not reversible -- which is the point:
--   the copies are what is being removed. Idempotent: a second run finds no
--   row to change.

update public.email_messages
   set variables = variables - 'unsubscribe_url'
 where variables ? 'unsubscribe_url';

update public.email_events
   set payload = regexp_replace(
         payload::text,
         'https?://[^[:space:]"''<>\\]*/functions/v1/unsubscribe\?[^[:space:]"''<>\\]*',
         '[unsubscribe link removed]',
         'g')::jsonb
 where payload::text ~ '/functions/v1/unsubscribe\?';
