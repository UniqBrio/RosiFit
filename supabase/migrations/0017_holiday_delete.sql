-- 0017 · deleting a holiday, and keeping its sessions honest either way
--
-- WHAT WAS MISSING
--   C-92 says removing a holiday returns its sessions to `scheduled`, and
--   public.remove_holiday() has done exactly that since 0007. Nothing could
--   reach it. There was no way to delete a holidays row at all:
--
--     * no DELETE grant and no DELETE policy on public.holidays (0005 granted
--       insert and update only), so PostgREST refused the verb outright; and
--     * 0011/0012 revoked execute on apply_holiday() and remove_holiday()
--       from authenticated, deliberately -- both are SECURITY DEFINER and
--       bypass RLS, so a direct grant would let ANY active staff member
--       rewrite the status of every session in a date range.
--
--   So a holiday could be created and never removed, and the sessions it
--   marked could never come back.
--
-- WHY TRIGGERS RATHER THAN A GRANT OR AN EDGE FUNCTION
--   Granting the two RPCs to authenticated reopens exactly the hole 0012
--   closed. An Edge Function would work but needs a deploy to the live
--   project before anything functions, and it would put the "who may change
--   a holiday" rule in a second place -- the RLS policies on public.holidays
--   already state it.
--
--   Triggers keep ONE rule in ONE place. The client writes the holidays row
--   through the policies 0005 already wrote; the session effects follow from
--   the row automatically. apply_holiday/remove_holiday stay service_role-only
--   as direct calls, reachable now only from a table whose RLS decides who
--   may write it. Nothing can mark a session as a holiday without a holidays
--   row to answer for it.
--
-- BEFORE DELETE, NOT AFTER
--   sessions.holiday_id references holidays(id) with no ON DELETE clause, so
--   the FK is checked before an AFTER DELETE trigger would ever fire and the
--   delete fails while any session still points at the row. remove_holiday()
--   nulls holiday_id, so it has to run BEFORE. An AFTER trigger here is not a
--   style preference; it does not work.

-- ------------------------------------------------------------ session effects
create or replace function public.holidays_apply_effects() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.apply_holiday(new.id);
    return new;
  elsif tg_op = 'DELETE' then
    -- restores every session this holiday marked, and clears holiday_id so
    -- the foreign key permits the row to go
    perform public.remove_holiday(old.id);
    return old;
  else
    -- UPDATE. 0005 has granted authenticated UPDATE on holidays since the
    -- beginning, so a super admin can already move a holiday's dates or
    -- change its scope -- and until now that left the previously marked
    -- sessions marked and the newly covered ones untouched. A holiday whose
    -- dates disagree with the sessions it marked is the same drift the
    -- follow-up list is derived to avoid, so it is closed here rather than
    -- left for the first edit screen to discover.
    perform public.remove_holiday(old.id);
    perform public.apply_holiday(new.id);
    return new;
  end if;
end $$;

comment on function public.holidays_apply_effects() is
  'Keeps sessions.status in step with the holidays row that caused it. The only path from a client to apply_holiday/remove_holiday, which stay service_role-only as direct calls (0012).';

-- BEFORE DELETE for the foreign key (see the header). INSERT and UPDATE are
-- AFTER, so the row is settled and every CHECK has passed before any session
-- is touched.
create trigger holidays_effects_insert after insert on public.holidays
  for each row execute function public.holidays_apply_effects();

create trigger holidays_effects_update after update of start_date, end_date, branch_id
  on public.holidays
  for each row execute function public.holidays_apply_effects();

create trigger holidays_effects_delete before delete on public.holidays
  for each row execute function public.holidays_apply_effects();

-- ---------------------------------------------------------------- the verb
-- The same predicate as holidays_insert and holidays_update in 0005, stated
-- again rather than shared: a policy that reads differently from its
-- neighbours is how one of them quietly stops matching.
create policy holidays_delete on public.holidays
  for delete to authenticated
  using (public.is_super_admin() and public.is_subscription_writable());

-- 0015 revoked the default privileges that used to hand every new table to
-- authenticated, so this grant is load-bearing: without it the policy above
-- never gets the chance to allow anything.
grant delete on public.holidays to authenticated;

-- service_role already holds `all` on holidays from 0005; nothing to add.

-- The audit trigger from 0005 already covers delete -- audit_holidays is
-- `after insert or update or delete` -- so the removed holiday's name, range
-- and scope survive in audit_logs as PREVIOUS values (C-94), which is what
-- makes a hard delete acceptable here rather than a deleted_at column.
