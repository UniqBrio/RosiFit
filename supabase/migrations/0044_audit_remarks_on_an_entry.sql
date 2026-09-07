-- 0044 · a remark can belong to the change it is about
--
-- WHAT CHANGED IN THE ASK
--   0043 built remarks as a free-standing list, and that was the right build
--   for what was asked: the requester said "add remarks a onother section",
--   and requests/2026-09-07-audit-log-for-end-users.md settled it at Q5 as
--   free-standing, noting in as many words that entry-level annotation was
--   "a bigger feature and is not what was asked".
--
--   It is what is asked now: "the remarks should be in table as last column
--   not under setting there itself user add remarks". A remark now hangs off
--   the row it explains -- "lowered the thresholds because the Saturday batch
--   moved" belongs BESIDE the row that shows the thresholds changing, not in
--   a pile at the bottom of the page.
--
-- WHY A NULLABLE COLUMN AND NOT A NEW TABLE
--   It is the same object -- a sentence a person wrote, append-only, admin
--   only -- gaining an optional target. NULL means free-standing, which is
--   what every remark written under 0043 is, so nothing already saved has to
--   be moved or reinterpreted. The screen no longer offers a way to write a
--   free-standing one, but the ones that exist stay readable and stay true.
--
-- WHY audit_logs IS STILL NOT TOUCHED
--   The reference points FROM the remark TO the entry. audit_logs gains no
--   column, no trigger and no write path; it stays exactly as immutable as
--   0004 made it. A remark cannot alter the row it annotates, which is the
--   whole reason the annotation lives in a separate table (0043).
--
--   `on delete restrict` is deliberate and it is not defensive: audit_logs
--   has no delete path at all (0004 revokes it from every role and refuses it
--   by trigger), so the clause can never fire. It is there so a future
--   migration that tried to hand out a delete would fail loudly against this
--   constraint rather than quietly orphan somebody's note.

alter table public.audit_remarks
  add column audit_log_id bigint
    references public.audit_logs(id) on delete restrict;

comment on column public.audit_remarks.audit_log_id is
  'The audit entry this remark is about. NULL is a free-standing remark - every remark written under 0043, before the screen moved them into the table. audit_logs is not modified by this reference.';

-- The screen loads the remarks for the fifty entries it is showing, so the
-- lookup is by entry. Partial: a free-standing remark is never fetched this
-- way, and an index that carries them makes every such lookup read rows it
-- will always discard.
create index audit_remarks_entry on public.audit_remarks (audit_log_id)
  where audit_log_id is not null;
