-- 0078 · REINSTATE A SUPPRESSED ADDRESS -- the route back that never existed
--
-- REPORTED
--   "I clicked on Edit button and then added email and then saved but its not
--   reflecting why?"  (requests/2026-09-22-saved-email-not-reflecting.md)
--
-- WHAT WAS ACTUALLY WRONG, in three pieces
--   1. `src/data/repository.ts` DISCARDED any `member_emails` row whose status
--      was 'bounced' or 'unsubscribed' on the way out of the member read. The
--      record the whole app derives from carried no trace of an address that
--      exists.
--   2. So the member card drew its no-address branch -- "No usable email" over
--      a row sitting in this table -- and the Edit form, which seeds its list
--      from that same record, opened BLANK.
--   3. The operator did the only thing that screen invited: typed the address
--      the academy holds. `update_member` (0027) found the row still live, took
--      its `exists` branch, set `is_primary`, and never touched `status`. The
--      save wrote nothing and reported success.
--
--   Pieces 1 and 2 are fixed in the app. This file is the third thing, which is
--   the one nobody could work around: NOTHING IN THIS SCHEMA HAS EVER CLEARED A
--   SUPPRESSION. `ses-feedback` writes 'bounced' and 'complained',
--   `unsubscribe` (0066) writes 'unsubscribed', and no function anywhere writes
--   any of them back. `supabase/tests/47_unsubscribe_and_ses_feedback.sql`
--   already says out loud that "'bounced' is a state the academy could decide
--   to clear" -- it was never given anything to clear it with.
--
-- WHY A NEW FUNCTION AND NOT A PARAMETER ON update_member
--   Two reasons, and the second is the one that decided it.
--
--   * AN ORDINARY SAVE MUST NOT UN-SUPPRESS AN ADDRESS. The Edit form sends the
--     WHOLE address list on every save, so if `update_member` reset `status` it
--     would do so whenever anybody corrected a display name or moved a member's
--     course -- silently putting a bounced address, or an opt-out, back on the
--     send list as a side effect of an unrelated edit. Reinstatement is a
--     deliberate act and gets a deliberate call. This is 0057's reasoning for
--     `set_member_active_from`, and 0045's for `set_member_status`.
--
--   * `update_member` IS ONE OF THE FIFTEEN. T-120 (18-Sep-2026) measured every
--     function body on production against a full harness replay: `update_member`
--     is 9,625 bytes live against 11,213 in the replay. T-400's rule applies --
--     "the function does X, because the source says so" is unfounded for these.
--     A `create or replace` of that body from this repository would push
--     whatever this tree happens to hold over whatever production is actually
--     running, which is precisely RC-047's mechanism and T-125's warning. So
--     this migration RESTATES NO EXISTING FUNCTION. It adds one, and nothing
--     else in the schema moves.
--
-- WHAT MAY BE REINSTATED, AND WHAT MAY NOT
--   'bounced'    -- YES, and it is the only one. A bounce is the mail system
--                   reporting that the address does not accept mail, which is
--                   most often a typo somebody at the academy can correct.
--   'complained' -- NO. A complaint is the member clicking "report spam" in
--                   their own mail client. It is the member's act, not a
--                   mistake the academy made, and clearing it would put the
--                   academy back in front of somebody who said stop. AWS acts
--                   on complaint rates at 0.1%, so guessing here is expensive
--                   as well as wrong.
--   'unsubscribed' -- NEVER, for the same reason one rung up: the member said
--                   something deliberate. This is the rule `ses-feedback`
--                   already enforces with `.neq('status','unsubscribed')` and
--                   that 47_unsubscribe_and_ses_feedback.sql already pins;
--                   stating it here too means a screen cannot get it wrong,
--                   because the screen is not what enforces it.
--   'unknown' / 'valid' -- nothing to clear; refused rather than no-oped.
--
--   NOTE ON THE NARROWING (22-Sep-2026). The first draft of this file allowed
--   'complained' through as well, on the reading that a complaint is a
--   judgement SES made about a message. That was a NEW POLICY invented by this
--   bug fix, and nothing in the product asked for it: before this change the
--   send path had no complaint rule at all (`send-followups` refuses only
--   bounced and unsubscribed), so a complained address was simply SENDABLE. It
--   is suppressed now -- that part is the conservative half and stays -- but it
--   is not the academy's to lift.
--
-- WHAT IT RESETS TO
--   'unknown', not 'valid'. 'unknown' is what `create_member` (0016) and
--   `update_member` (0027) write on every address they insert, and it is the
--   honest answer: the academy believes the address is good and nothing has
--   confirmed it. Writing 'valid' would claim a verification that has not
--   happened -- nothing in this schema writes 'valid' at all.
--
-- APPLYING THIS TO PRODUCTION
--   Nothing here is data-dependent. One CREATE FUNCTION, one COMMENT, and the
--   grants. No column is added, no constraint is validated against existing
--   rows, no index is built, and no existing row is read or written at apply
--   time. It cannot fail on live data.
--
-- REHEARSAL
--   supabase/tests/57_reinstate_member_email.sql -- a bounce is cleared; an
--   opt-out AND a complaint are each refused in their own words; an address
--   that is not suppressed is refused rather than no-oped; a soft-deleted row
--   is refused; the audit row names the acting user rather than System; and
--   `anon` cannot execute it.

-- ---------------------------------------------------------------- the function
create or replace function public.reinstate_member_email(
  p_member_email_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := public.current_app_user_id();
  v_row   record;
begin
  -- ------------------------------------------------------------------ the gate
  -- Deliberately the same two predicates create_member and update_member use,
  -- and the same two the table policies use. One rule, not a second one that
  -- can drift.
  if v_actor is null then
    raise exception 'only a signed-in, active user can reinstate an address'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so nothing can be changed'
      using errcode = '42501';
  end if;

  select e.* into v_row
    from public.member_emails e
    join public.members m on m.id = e.member_id
   where e.id = p_member_email_id
     and e.deleted_at is null
     and m.deleted_at is null;

  -- A removed address is not an address. Refused rather than silently ignored:
  -- the caller is a form that is about to tell somebody it worked.
  if not found then
    raise exception 'that address is not on the member''s record'
      using errcode = 'P0002';
  end if;

  -- THE REFUSALS THIS FUNCTION EXISTS TO MAKE, and there are two of them.
  --
  -- Both are the MEMBER'S OWN ACT, which is the line this function draws. An
  -- opt-out is a click on the unsubscribe link; a complaint is a click on
  -- "report spam" in the member's own mail client. Neither is a mistake the
  -- academy made and neither is the academy's to undo -- only a BOUNCE is,
  -- because a bounce is the mail system saying the address does not accept
  -- mail, which is usually a typo somebody here can correct.
  --
  -- Worded separately, because they are different facts and the operator reads
  -- the sentence.
  if v_row.status = 'unsubscribed' then
    raise exception 'the member unsubscribed from this address, and only the member can undo that'
      using errcode = '55000';
  end if;
  if v_row.status = 'complained' then
    raise exception 'that address reported a message as spam, so only the member can ask to be written to again'
      using errcode = '55000';
  end if;

  -- Nothing to clear. Said rather than swallowed -- a call that reports success
  -- having changed nothing is the defect this whole change is about.
  if v_row.status <> 'bounced' then
    raise exception 'that address is not suppressed, so there is nothing to reinstate'
      using errcode = '55000';
  end if;

  -- updated_at is left to the member_emails_updated_at trigger (0006) rather
  -- than written here, so one clock sets it for every writer.
  update public.member_emails
     set status = 'unknown'
   where id = p_member_email_id;

  -- The row carries its own audit trigger from 0006, so the column change is
  -- recorded either way. This line records the ACT: one person decided one
  -- address was good again, and which state it was in when they decided.
  perform public.audit_log(
    'member_email.reinstated', 'member_email', p_member_email_id::text,
    jsonb_build_array(jsonb_build_object(
      'field', 'status', 'old', v_row.status, 'new', 'unknown')),
    jsonb_build_object('member_id', v_row.member_id, 'via', 'member_form'));
end $$;

comment on function public.reinstate_member_email(uuid) is
  'Clears a BOUNCE on one address, back to ''unknown'' -- the only route back a suppression has ever had (0078). A bounce is the mail system reporting the address does not accept mail, usually a typo. REFUSES ''unsubscribed'' AND ''complained'', both of which are the member''s own act and only the member''s to undo: the member said something deliberate and only the member can undo it, the same rule ses-feedback enforces with .neq(''status'',''unsubscribed''). Deliberately NOT a parameter on update_member: that RPC is sent the whole address list on every save, so folding this in would un-suppress an address as a side effect of an unrelated edit -- and update_member is one of the fifteen bodies T-120 measured as divergent on production, which a restatement would revert.';

-- ------------------------------------------------------------------ the grants
-- RC-042 and RC-052 are THIS grant, shipped twice: a new SECURITY DEFINER
-- function left executable by `anon`. Stated explicitly, and `anon` named
-- explicitly, because the default is what went wrong both times.
-- `src/data/migrationGrants.test.ts` fails the build on a file that omits it.
-- `anon` is NAMED, in its own statement, and that is not belt-and-braces:
-- Supabase grants EXECUTE on every new public function DIRECTLY to `anon`, so
-- `revoke ... from public` does not remove it. 0012 exists for exactly this.
revoke all on function public.reinstate_member_email(uuid) from public;
revoke execute on function public.reinstate_member_email(uuid) from anon;
grant execute on function public.reinstate_member_email(uuid) to authenticated;
