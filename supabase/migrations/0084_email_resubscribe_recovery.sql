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
-- WHAT THIS ADDS (no existing function or policy is restated; no row changes on apply)
--   email_status_before_opt_out(id)   what the address was just before its
--       opt-out, as far as suppression goes. Service role only: the
--       unsubscribe Edge Function asks it, and so does the RPC below, so the
--       member's button and the staff action apply ONE rule:
--         * a spam report anywhere on the address -- on any member's row, now
--           or underneath an opt-out -- answers 'complained' (ses-feedback
--           suppresses complaints by address; 0078 says only the member may
--           lift one, and nothing here does);
--         * otherwise the row audit of this row's latest opt-out (0006's
--           trigger records every writer: the link, Gmail's one-click POST);
--         * otherwise -- a row that was INSERTED already unsubscribed by the
--           carry trigger -- the same member's earlier row of the address;
--         * otherwise null: unknown, and never guessed.
--   member_emails_carry_suppression   BEFORE INSERT. A new row for an address
--       with a spam report anywhere starts 'complained'. A new row for an
--       address this SAME MEMBER opted out of starts 'unsubscribed' -- the
--       member's earlier row of it, latest by created_at (never updated_at,
--       which update_member bumps on every save). Per member, not per
--       address, because an opt-out is per course (0071: "unsubscribing from
--       one course's follow-up leaves the other course's copy subscribed").
--       'bounced' is not carried: it is the mail system's report, 0078 lets
--       the academy clear it, and SES refuses and re-reports the next send.
--   member_emails_guard_direct_write   BEFORE UPDATE, SECURITY INVOKER. A
--       signed-in user writing the table directly (PostgREST, not an RPC)
--       may no longer change an address's status, text, owner or creation
--       time, or bring a removed one back. The RPCs run as their owner and
--       are unaffected. A guard rather than a revoke: authenticated keeps the
--       grant 09_grants.sql pins, and no policy is touched.
--   audit_log() is no longer executable by `authenticated`. Nothing in the
--       app calls it (Edge Functions use the service role; triggers and RPCs
--       run as the owner), and the rule above decides on audit rows -- a
--       signed-in caller able to write any audit row could forge an opt-out's
--       "before" and lift a spam report.
--   staff_resubscribe_member_email(id, source, note)   "Turn Follow-ups Back
--       On": the member asked the academy -- by WhatsApp, phone, in person or
--       a reply -- and a signed-in user records that, with the source.
--       Unsubscribed -> 'unknown' only. Refused where the rule above says the
--       address bounced or was marked as spam.
--
-- NOT COVERED, on purpose: a member deleted outright (delete_member hard-
--   deletes the address rows, 0051) and added again is a new record with no
--   history to carry. Deleting a member is not editing an address.
--
-- PRODUCTION SAFETY
--   CREATE FUNCTIONs, two CREATE TRIGGERs and one REVOKE. No column,
--   constraint, index or policy; nothing reads or writes a row at apply time.
--   The triggers act only on future writes. Audit history is read, never
--   written to except by the RPC's own new row. Checked on production
--   01-Oct-2026: no SECURITY INVOKER function calls audit_log() or writes
--   member_emails, and every status change to 'unsubscribed' (34) is in the
--   row audit.
--
-- REHEARSAL
--   supabase/tests/61_email_resubscribe_recovery.sql

-- ----------------------------------------------- what it was before opting out
-- The raw read: this row's latest opt-out, from the row audit. Internal.
create or replace function public.member_email_opt_out_before(p_member_email_id uuid)
returns text
language sql stable security definer set search_path = public as $$
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

revoke all on function public.member_email_opt_out_before(uuid) from public, anon, authenticated;

create or replace function public.email_status_before_opt_out(p_member_email_id uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_row    public.member_emails%rowtype;
  v_before text;
begin
  select * into v_row from public.member_emails where id = p_member_email_id;
  if not found then
    return null;
  end if;

  if exists (select 1 from public.member_emails e
              where e.email = v_row.email
                and (e.status = 'complained'
                     or public.member_email_opt_out_before(e.id) = 'complained')) then
    return 'complained';
  end if;

  v_before := public.member_email_opt_out_before(v_row.id);
  if v_before is null then
    select b.before into v_before
      from public.member_emails e
      cross join lateral (select public.member_email_opt_out_before(e.id) as before) b
     where e.member_id = v_row.member_id
       and e.email = v_row.email
       and e.id <> v_row.id
       and e.created_at <= v_row.created_at
       and b.before is not null
     order by e.created_at desc, e.id desc
     limit 1;
  end if;
  return v_before;
end $$;

comment on function public.email_status_before_opt_out(uuid) is
  'What a member_emails address was before its opt-out, for suppression (0084): ''complained'' if a spam report stands anywhere on the address; else the row audit of this row''s latest opt-out; else the same member''s earlier row of the address; else null. Service role only.';

revoke all on function public.email_status_before_opt_out(uuid) from public, anon, authenticated;
grant execute on function public.email_status_before_opt_out(uuid) to service_role;

-- ------------------------------------------- re-entering an address is no way round
create or replace function public.member_emails_carry_suppression()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_prev text;
begin
  if new.status not in ('unknown', 'valid') then
    return new;
  end if;
  -- citext equality throughout: case does not make it a different address.
  if exists (select 1 from public.member_emails e
              where e.email = new.email
                and e.id <> new.id
                and (e.status = 'complained'
                     or public.member_email_opt_out_before(e.id) = 'complained')) then
    new.status := 'complained';
    return new;
  end if;
  select e.status into v_prev
    from public.member_emails e
   where e.member_id = new.member_id
     and e.email = new.email
     and e.id <> new.id
   order by e.created_at desc, e.id desc
   limit 1;
  if v_prev = 'unsubscribed' then
    new.status := 'unsubscribed';
  end if;
  return new;
end $$;

revoke all on function public.member_emails_carry_suppression() from public, anon, authenticated;

drop trigger if exists member_emails_carry_suppression on public.member_emails;
create trigger member_emails_carry_suppression
  before insert on public.member_emails
  for each row execute function public.member_emails_carry_suppression();

-- ------------------------------------------------- no way round it by PostgREST
-- SECURITY INVOKER on purpose: current_user is the caller for a direct write,
-- and the owner for a write made inside any SECURITY DEFINER RPC.
create or replace function public.member_emails_guard_direct_write()
returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.status     is distinct from old.status
    or new.email      is distinct from old.email
    or new.member_id  is distinct from old.member_id
    or new.created_at is distinct from old.created_at
    or (old.deleted_at is not null and new.deleted_at is null)) then
    raise exception 'an address is changed only through the member form and its actions'
      using errcode = '42501';
  end if;
  return new;
end $$;

revoke all on function public.member_emails_guard_direct_write() from public, anon, authenticated;

drop trigger if exists member_emails_guard_direct_write on public.member_emails;
create trigger member_emails_guard_direct_write
  before update on public.member_emails
  for each row execute function public.member_emails_guard_direct_write();

-- ------------------------------------------- audit rows are written, not forged
revoke execute on function public.audit_log(text, text, text, jsonb, jsonb) from authenticated;

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
  -- Control characters out: the note is kept forever in an append-only log.
  v_note   text := nullif(btrim(regexp_replace(coalesce(p_note, ''), '[[:cntrl:]]+', ' ', 'g')), '');
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
    raise exception 'choose how the member asked to get follow-ups again'
      using errcode = '22023';
  end if;
  if v_source = 'other' and v_note is null then
    raise exception 'add a note saying how the member asked'
      using errcode = '22023';
  end if;
  if length(v_note) > 500 then
    raise exception 'the note is longer than 500 characters -- shorten it to 500 or fewer'
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
    raise exception 'this address bounced; the member did not unsubscribe from it -- add a different address for the member instead'
      using errcode = '55000';
  end if;
  if v_row.status = 'complained' then
    raise exception 'a message to this address was marked as spam, so follow-ups cannot be turned back on for it -- add a different address if the member wants follow-ups'
      using errcode = '55000';
  end if;

  -- The member's own button and this action read ONE rule: a spam report
  -- anywhere on the address, or a bounce under this opt-out, is not lifted
  -- by "the member asked" (0078). Unknown history (null) is allowed: that is
  -- exactly the member whose old emails are gone, who asked the academy.
  v_before := public.email_status_before_opt_out(v_row.id);
  if v_before = 'complained' then
    raise exception 'a message to this address was marked as spam, so follow-ups cannot be turned back on for it -- add a different address if the member wants follow-ups'
      using errcode = '55000';
  end if;
  if v_before = 'bounced' then
    raise exception 'this address bounced before the member unsubscribed -- add a different address for the member instead'
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
  'Turn Follow-ups Back On (0084): an unsubscribed address back to ''unknown'' because the member asked the academy; the source is required and audited as communication.staff_resubscribe. Refuses bounced and complained addresses, a spam report anywhere on the address, and an opt-out made on top of a bounce. Returns ''resubscribed'' or ''already''.';

revoke all on function public.staff_resubscribe_member_email(uuid, text, text) from public;
revoke execute on function public.staff_resubscribe_member_email(uuid, text, text) from anon;
grant execute on function public.staff_resubscribe_member_email(uuid, text, text) to authenticated;
