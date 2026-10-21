-- 0096 · a working address takes over from a bounced primary
-- requests/2026-10-21-corrected-address-never-used.md
--
-- WHY. On 12-13 Oct 2026 three Postnatal members whose address had bounced were given a
-- corrected address. The Edit form saved it as a SECOND address and left the bounced one
-- PRIMARY (app/member/edit.tsx made a new address primary only when the list was empty).
-- send-followups writes only to the primary (load.ts: is_primary = true), so on 17-Oct all
-- three were skipped again with "Primary email has bounced" -- while the course's Bounced
-- filter read 0, because it asked "does any address work". The app now asks the send's
-- question and the form promotes a working address over a bounced primary; this repairs the
-- rows already saved the wrong way.
--
-- WHAT. For every live member whose live PRIMARY address has BOUNCED and who also holds a
-- live usable address ('unknown' or 'valid', not blank): the newest such address becomes
-- primary and the bounced one stops being primary. Nothing is deleted and no status changes:
-- the bounced row keeps 'bounced' and stays on the record as history.
--
-- ONLY A BOUNCE. A primary that is 'unsubscribed' or 'complained' is the member's own decision
-- and is left alone -- moving mail to another of their addresses would resume contact with
-- someone who said stop. (Production, read-only 21-Oct-2026: 3 bounced cases, 1 unsubscribed
-- case; only the 3 are touched.)
--
-- SAFETY. Two UPDATEs per member, demote first: member_emails allows one live primary per
-- member (0006, unique where is_primary and deleted_at is null). The audit_member_email
-- trigger records each change. Re-runnable: once repaired, no member matches. A draft until
-- applied; under D-10 it merges to main only on the day it is applied.

do $mig$
declare
  r      record;
  v_n    int := 0;
begin
  for r in
    select p.member_id, p.id as bounced_id,
           (select o.id from public.member_emails o
             where o.member_id = p.member_id and o.deleted_at is null and not o.is_primary
               and o.status in ('unknown', 'valid') and btrim(o.email::text) <> ''
             order by o.created_at desc, o.id desc limit 1) as working_id
      from public.member_emails p
      join public.members m on m.id = p.member_id and m.deleted_at is null
     where p.is_primary and p.deleted_at is null and p.status = 'bounced'
  loop
    continue when r.working_id is null;
    update public.member_emails set is_primary = false where id = r.bounced_id;
    update public.member_emails set is_primary = true  where id = r.working_id;
    v_n := v_n + 1;
  end loop;
  raise notice '0096: % member(s) now send to their working address instead of a bounced primary', v_n;
end
$mig$;
