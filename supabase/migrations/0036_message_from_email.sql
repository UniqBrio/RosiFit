-- 0036_message_from_email.sql
--
-- WHICH ADDRESS DID THIS MESSAGE GO OUT AS.
--
-- Until 07-Sep-2026 the question did not need asking. send-followups called
-- SES with SES_FROM_ADDRESS and nothing else, so every message this academy
-- had ever sent had the same sender and the answer was "whatever that secret
-- holds". The From Email ID picked in the course form was stored by
-- save_course into course_communication.from_email and READ BY NOTHING: a
-- course set to the academy's second address sent as the first one, reported
-- SENT, and was telling the truth about delivery while being wrong about the
-- sender.
--
-- The Edge Function now honours the course's choice. That makes the sender a
-- thing that VARIES per message, and a varying value read from a secret's
-- CURRENT contents is not evidence of anything: rotate SES_FROM_ADDRESS and
-- every message ever sent appears retroactively to have come from the new
-- address. So it is written down, per message, at the moment it is used --
-- the same reason email_batches snapshots subject and body (0009) rather than
-- pointing at a template that can be reworded afterwards.
--
-- NULLABLE, and deliberately. Three real rows carry no address: every message
-- sent BEFORE this column existed (backfilling them would be inventing a fact
-- -- they went out as whatever the secret held at the time, which is not
-- recoverable), a message excluded before a sender was ever chosen, and any
-- message from a deployment running the dev provider, which has no sender at
-- all. NULL means "not recorded", never "the default".
--
-- NOT a foreign key to anything. There is no table of senders to point at --
-- the list is still hardcoded in src/data/mock.ts, which is the remaining
-- half of TD-016 -- and even once there is one, a message must keep the
-- address it actually used after that address is removed from the list.

alter table public.email_messages
  add column if not exists from_email text;

comment on column public.email_messages.from_email is
  'The address this message was actually sent AS, recorded at send time. The '
  'course''s own course_communication.from_email where it has one, otherwise '
  'the deployment''s SES_FROM_ADDRESS. NULL means not recorded -- sent before '
  '0036, excluded before a sender was chosen, or sent by the dev provider -- '
  'and never "the default".';
