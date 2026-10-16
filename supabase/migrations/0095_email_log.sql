-- 0095 · the email log: every message, with when it was sent, delivered, bounced or complained of
-- requests/2026-10-16-attendance-email-report-and-member-email-history.md
--
-- WHY. The requester, 16-Oct-2026: Reports needs an "attendance email" section -- the date, the
-- course, how many were sent, bounced and failed, with an export of member, email, date and
-- reason -- and a member's record needs "details of email sent on which date whether it reached
-- or failed, or bounce ... when it was sent when it bounce or failed every detail".
--
-- WHAT THE APP COULD ALREADY READ. email_batches and email_messages are readable by every active
-- app user (0009 batches_read / messages_read): the send date, the address, the status
-- (sent / failed / bounced / complained / excluded) and the reason are all there. What is NOT
-- there is WHEN a bounce, a delivery or a spam report happened: ses-feedback records each SES
-- notification in email_events with its received_at, and flips email_messages.status, but no
-- timestamp lands on the message. email_events is readable by the super admin only (0009
-- events_read), and it carries the whole SES payload -- headers included -- which staff have no
-- reason to read.
--
-- WHAT THIS ADDS. One read-only function, public.email_log(p_from, p_to, p_member_id, p_after,
-- p_limit): one row per email_messages row, joined to its batch and its member, with the FIRST
-- Delivery / Bounce / Complaint event's received_at and the bounce's type (Permanent / Transient)
-- -- and nothing else from email_events. SECURITY DEFINER so it can read those three timestamps
-- for staff; it refuses anybody who is not an active app user, exactly the audience the 0009
-- read policies already give the rest of every row.
--
--   p_from / p_to   the academy's calendar days (0088: a date is a day in Asia/Kolkata), on the
--                   batch's created_at -- "the date" of a send is when it was sent.
--   p_member_id     one member's history, every period. At least one of the two is required, so
--                   no call reads the whole log by accident.
--   p_after/p_limit keyset paging on message_id, the shape every paged read in the app uses
--                   (src/data/pageAll.ts): Supabase answers at most 1,000 rows a call.
--
-- PRODUCTION SAFETY. A new function, its grants, and nothing else: no table, column, index,
-- policy, trigger or data change. The joins it makes are on keys that are already indexed
-- (email_batches_recent on created_at; email_messages_member on member_id; email_events' unique
-- (provider, provider_message_id, event_type)). Re-runnable (create or replace). A draft until
-- applied; under D-10 it merges to main only on the day it is applied.

create or replace function public.email_log(
  p_from      date default null,
  p_to        date default null,
  p_member_id uuid default null,
  p_after     uuid default null,
  p_limit     int  default 1000
)
returns table (
  message_id     uuid,
  batch_id       uuid,
  batch_at       timestamptz,
  sent_by        text,
  member_id      uuid,
  member_name    text,
  to_email       text,
  from_email     text,
  course_name    text,
  branch_name    text,
  subject        text,
  status         text,
  reason         text,
  sent_at        timestamptz,
  delivered_at   timestamptz,
  bounced_at     timestamptz,
  bounce_type    text,
  complained_at  timestamptz
)
language plpgsql stable security definer set search_path = public as $function$
begin
  if not public.is_active_app_user() then
    raise exception 'email_log: only an active RosiFit user can read the email log'
      using errcode = '42501';
  end if;
  if p_member_id is null and (p_from is null or p_to is null) then
    raise exception 'email_log: give a member, or a period (p_from and p_to)'
      using errcode = '22023';
  end if;
  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception 'email_log: p_to is before p_from' using errcode = '22023';
  end if;

  return query
  select m.id, b.id, b.created_at, u.name,
         m.member_id,
         coalesce(mem.full_name, m.variables ->> 'member_name'),
         m.to_email::text, m.from_email,
         -- The course and branch AS THEY WERE when the email went out: the send stored them in
         -- the message's variables. A course renamed since is still named as the member saw it.
         nullif(m.variables ->> 'course_name', '—'),
         nullif(m.variables ->> 'branch_name', '—'),
         m.subject, m.status,
         coalesce(m.failure_reason, m.exclusion_reason),
         m.sent_at,
         ev.delivered_at, ev.bounced_at, ev.bounce_type, ev.complained_at
    from public.email_messages m
    join public.email_batches b on b.id = m.batch_id
    left join public.app_users u on u.id = b.sent_by
    left join public.members mem on mem.id = m.member_id
    left join lateral (
      select min(e.received_at) filter (where e.event_type = 'Delivery')  as delivered_at,
             min(e.received_at) filter (where e.event_type = 'Bounce')    as bounced_at,
             min(e.payload -> 'bounce' ->> 'bounceType')
                               filter (where e.event_type = 'Bounce')    as bounce_type,
             min(e.received_at) filter (where e.event_type = 'Complaint') as complained_at
        from public.email_events e
       where m.provider_message_id is not null
         and e.provider = m.provider
         and e.provider_message_id = m.provider_message_id
    ) ev on true
   where (p_member_id is null or m.member_id = p_member_id)
     and (p_from is null
          or b.created_at >= (p_from::timestamp at time zone 'Asia/Kolkata'))
     and (p_to is null
          or b.created_at <  ((p_to + 1)::timestamp at time zone 'Asia/Kolkata'))
     and (p_after is null or m.id > p_after)
   order by m.id
   limit greatest(1, least(coalesce(p_limit, 1000), 1000));
end $function$;

revoke execute on function public.email_log(date, date, uuid, uuid, int) from public, anon;
grant execute on function public.email_log(date, date, uuid, uuid, int) to authenticated;

comment on function public.email_log(date, date, uuid, uuid, int) is
  'Every follow-up email message for a period (academy days, on the batch''s created_at) or for one member: batch, sender, member, address, course and branch as sent, status, reason, sent_at, and the first Delivery / Bounce / Complaint time from email_events (with the bounce type). Active app users only. Keyset-paged on message_id. Added by 0095 for Reports'' Attendance emails and the member record''s Emails tab; supabase/tests/72 pins it.';
