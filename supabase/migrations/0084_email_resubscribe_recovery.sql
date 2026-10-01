-- 0084 · the way back from an opt-out, and no way round one
--
-- REPORTED
--   "Implement the complete email resubscription recovery flow end-to-end"
--   and "our RosiFit emails have TWO unsubscribe mechanisms ... make the
--   complete unsubscribe/resubscribe lifecycle work correctly for BOTH"
--   (the academy, 01-Oct-2026; requests/2026-10-01-resubscribe-recovery-and-gmail-one-click.md).
--
-- WHAT WAS MISSING, in three pieces
--   1. A member who opted out through Gmail's own "Unsubscribe" (RFC 8058
--      one-click) never sees our page, so never sees its Resubscribe button.
--      A member who has deleted every old email has no signed link at all.
--      Nothing let the academy act on "please send them again" -- 0078 refuses
--      an opt-out by design, and that refusal stays.
--   2. The button's own rule read the status before the opt-out from the
--      `communication.unsubscribed` row the Edge Function writes. One live
--      opt-out on production has no such row, so its member is never offered
--      the button. Every opt-out DOES have the row-level `member_email.update`
--      audit (0006's trigger fires for every writer), which is the one source
--      all routes share.
--   3. Removing an opted-out address in Edit and typing it back in INSERTS a
--      new row, and every inserting writer (create_member, update_member,
--      bulk_import_members, the CSV commit) writes 'unknown'. The opt-out was
--      on the old row, so the new one was sendable: an ordinary edit undid the
--      member's decision. Production holds no case of it today; nothing
--      stopped one.
--
-- WHAT THIS ADDS (no existing function is restated; no row changes on apply)
--   email_status_before_opt_out(id)   what the address was just before its
--       latest opt-out, read from the row audit. Service role only: the
--       unsubscribe Edge Function asks it, and so does the RPC below.
--   member_emails_carry_suppression   BEFORE INSERT: a new row for an address
--       whose latest row says 'unsubscribed' or 'complained' starts in that
--       state. Both are the MEMBER's act. 'bounced' is not carried: it is the
--       mail system's report, 0078 lets the academy clear it, and SES's own
--       suppression list refuses the next send and re-reports it anyway.
--   staff_resubscribe_member_email(id, source, note)   "Turn Follow-ups Back
--       On": the member asked the academy -- by WhatsApp, phone, in person or
--       a reply -- and a signed-in user records that, with the source.
--       Unsubscribed -> 'unknown' only. Bounced and spam-reported addresses are
--       refused, and so is an opt-out that was made on top of a spam report.
--
-- PRODUCTION SAFETY
--   Two CREATE FUNCTIONs, one trigger function and one CREATE TRIGGER. No
--   column, constraint or index; nothing reads or writes a row at apply time.
--   The trigger acts only on future INSERTs. Audit history is read, never
--   written to except by the RPC's own new row.
--
-- REHEARSAL
--   supabase/tests/61_email_resubscribe_recovery.sql

-- ----------------------------------------------- what it was before opting out
create or replace function public.email_status_before_opt_out(p_member_email_id uuid)
returns text
language sql stable security definer set search_path = public as $$
  -- The row trigger (audit_row_change, 0006) records every status change by
  -- every writer -- the link, Gmail's one-click POST, a hand edit -- as
  -- {field:'status', old:<before>, new:'unsubscribed'}. The latest one is the
  -- opt-out in force. Null when there is none (a row INSERTED unsubscribed by
  -- the carry trigger below has no "before" of its own).
  select c->>'old'
    from public.audit_logs a,
         jsonb_array_elements(a.changes) c
   where a.action = 'member_email.update'
     and a.entity_type = 'member_email'
     and a.entity_id = p_member_email_id::text
     and c->>'field' = 'status'
     and c->>'new' = 'unsubscribed'
   order by a.occurred_at desc, a.id desc
   limit 1
$$;

comment on function public.email_status_before_opt_out(uuid) is
  'What a member_emails row was just before its latest opt-out, from the row audit every writer produces (0084). Null when unknown. Service role only.';

revoke all on function public.email_status_before_opt_out(uuid) from public, anon, authenticated;
grant execute on function public.email_status_before_opt_out(uuid) to service_role;

-- ------------------------------------------- re-entering an address is no way round
create or replace function public.member_emails_carry_suppression()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_latest text;
begin
  if new.status not in ('unknown', 'valid') then
    return new;
  end if;
  -- The address's latest word, on ANY member's row, live or removed: an
  -- inbox that said stop said it once, not once per record. citext equality,
  -- so case does not make it a different address.
  select e.status into v_latest
    from public.member_emails e
   where e.email = new.email
     and e.id <> new.id
   order by coalesce(e.updated_at, e.created_at) desc, e.created_at desc
   limit 1;
  if v_latest in ('unsubscribed', 'complained') then
    new.status := v_latest;
  end if;
  return new;
end $$;

revoke all on function public.member_emails_carry_suppression() from public, anon, authenticated;

drop trigger if exists member_emails_carry_suppression on public.member_emails;
create trigger member_emails_carry_suppression
  before insert on public.member_emails
  for each row execute function public.member_emails_carry_suppression();

-- ------------------------------------------------ Turn Follow-ups Back On (staff)
create or replace function public.staff_resubscribe_member_email(
  p_member_email_id uuid,
  p_source text,
  p_note text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_actor  uuid := public.current_app_user_id();
  v_source text := lower(btrim(coalesce(p_source, '')));
  v_note   text := nullif(btrim(coalesce(p_note, '')), '');
  v_row    record;
  v_before text;
begin
  -- The gate 0078 uses, and the table policies: one rule, not a second one.
  if v_actor is null then
    raise exception 'only a signed-in, active user can turn follow-ups back on'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so nothing can be changed'
      using errcode = '42501';
  end if;

  -- How the member asked. Required: this is the record that the member, not
  -- the academy, decided -- an entry with no source would be the academy's word.
  if v_source not in ('whatsapp', 'phone', 'in_person', 'email_reply', 'other') then
    raise exception 'say how the member asked to get follow-ups again'
      using errcode = '22023';
  end if;
  if v_source = 'other' and v_note is null then
    raise exception 'add a note saying how the member asked'
      using errcode = '22023';
  end if;
  if length(v_note) > 500 then
    raise exception 'the note is longer than 500 characters'
      using errcode = '22023';
  end if;

  select e.* into v_row
    from public.member_emails e
    join public.members m on m.id = e.member_id
   where e.id = p_member_email_id
     and e.deleted_at is null
     and m.deleted_at is null
   for update of e;
  if not found then
    raise exception 'that address is not on the member''s record'
      using errcode = 'P0002';
  end if;

  -- Already on: a second press, or another user got there first. Said, not
  -- written -- no second audit row for a change that did not happen.
  if v_row.status in ('unknown', 'valid') then
    return 'already';
  end if;
  if v_row.status = 'bounced' then
    raise exception 'this address bounced, which is not an opt-out -- correct the address instead'
      using errcode = '55000';
  end if;
  if v_row.status = 'complained' then
    raise exception 'this address reported a message as spam, so follow-ups cannot be turned back on here'
      using errcode = '55000';
  end if;

  -- An opt-out made on top of a spam report does not wash the report away.
  v_before := public.email_status_before_opt_out(v_row.id);
  if v_before = 'complained' then
    raise exception 'this address reported a message as spam before unsubscribing, so follow-ups cannot be turned back on here'
      using errcode = '55000';
  end if;

  -- 'unknown', as 0078 and every new address: nothing has confirmed delivery.
  update public.member_emails
     set status = 'unknown'
   where id = v_row.id and status = 'unsubscribed';

  -- The act: who (actor_app_user_id), when (occurred_at), which member and
  -- address, from what to what, and how the member asked.
  perform public.audit_log(
    'communication.staff_resubscribe', 'member_email', v_row.id::text,
    jsonb_build_array(jsonb_build_object('field', 'status', 'old', v_row.status, 'new', 'unknown')),
    jsonb_build_object('member_id', v_row.member_id, 'email', v_row.email::text,
                       'source', v_source, 'note', v_note, 'via', 'staff'));
  return 'resubscribed';
end $$;

comment on function public.staff_resubscribe_member_email(uuid, text, text) is
  'Turn Follow-ups Back On (0084): an unsubscribed address back to ''unknown'' because the member asked the academy; the source is required and audited as communication.staff_resubscribe. Refuses bounced, complained, and an opt-out made on top of a spam report. Returns ''resubscribed'' or ''already''.';

revoke all on function public.staff_resubscribe_member_email(uuid, text, text) from public;
revoke execute on function public.staff_resubscribe_member_email(uuid, text, text) from anon;
grant execute on function public.staff_resubscribe_member_email(uuid, text, text) to authenticated;
