-- 0043 · remarks beside the audit log
--
-- WHAT WAS MISSING
--   The Audit log records what the app DID. Nothing anywhere records why.
--   The requester asked for "another section where user can add remarks" —
--   a place to write "lowered the thresholds because the Saturday batch
--   moved", beside the rows that show the thresholds changing.
--
-- WHY A SECOND TABLE AND NOT A COLUMN ON audit_logs
--   Three reasons, any one of which is sufficient:
--     * audit_logs is APPEND-ONLY, enforced by trigger against every role
--       including service_role (0004, C-96). Attaching a remark to an entry
--       means UPDATING that entry, which is precisely what must never be
--       possible — a log that can be annotated after the fact is a log that
--       can be edited after the fact.
--     * audit_logs rows are written by the database, through audit_log() and
--       audit_log_as() only, and pass a redaction pass on the way in. A row
--       a PERSON composes is a different kind of thing and must not travel
--       that path.
--     * The requester asked for a section, not an annotation. A free-standing
--       note is what was described.
--
-- WHAT IT INHERITS FROM 0004 ON PURPOSE
--   Append-only, by trigger as well as by privilege. A remark is a record of
--   what somebody thought at the time; one that can be rewritten later is
--   worth nothing beside a log whose whole value is that it cannot be. The
--   screen says so before the first one is typed.

create table public.audit_remarks (
  id                 bigint generated always as identity primary key,
  created_at         timestamptz not null default now(),
  -- Defaulted, never sent by the client. A client that could name its own
  -- author could sign somebody else's name to a note in a table nobody can
  -- correct — the same reason audit_log_as is denied to authenticated
  -- (RC-011). The insert policy asserts it as well, so the default cannot be
  -- overridden by passing the column explicitly.
  author_app_user_id uuid not null default public.current_app_user_id()
                       references public.app_users(id),
  body               text not null,
  -- 1000 to match REMARK_MAX in src/data/repository.ts. A form that refuses
  -- at one length and a table that refuses at another is a save that fails
  -- after the typing.
  constraint audit_remarks_body_length
    check (char_length(btrim(body)) between 1 and 1000)
);

create index audit_remarks_time   on public.audit_remarks (created_at desc);
create index audit_remarks_author on public.audit_remarks (author_app_user_id);

-- Its OWN refusal, rather than 0004's audit_immutable(). The rule is
-- identical and deliberately so; the message is not, because a refusal that
-- says "audit_logs is append-only" while somebody is editing a remark sends
-- the next person to read it to the wrong table.
create or replace function public.audit_remarks_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_remarks is append-only (attempted %)', tg_op
    using errcode = '42501';
end $$;

comment on function public.audit_remarks_immutable() is
  'Refuses every UPDATE, DELETE and TRUNCATE on audit_remarks. A remark is a record of what somebody thought at the time; one that can be rewritten is worth nothing beside a log that cannot be.';

create trigger audit_remarks_no_update before update on public.audit_remarks
  for each row execute function public.audit_remarks_immutable();
create trigger audit_remarks_no_delete before delete on public.audit_remarks
  for each row execute function public.audit_remarks_immutable();
create trigger audit_remarks_no_truncate before truncate on public.audit_remarks
  execute function public.audit_remarks_immutable();

alter table public.audit_remarks enable row level security;
alter table public.audit_remarks force  row level security;

-- Read: the same audience as the log it sits beside. audit_logs_read (0004)
-- is is_super_admin(), and a remark quotes what the log contains.
create policy audit_remarks_read on public.audit_remarks
  for select to authenticated using (public.is_super_admin());

-- Write: the same pair every other write policy in this schema carries, plus
-- the author assertion. Nothing here widens who may reach this screen.
create policy audit_remarks_write on public.audit_remarks
  for insert to authenticated with check (
    public.is_super_admin()
    and public.is_subscription_writable()
    and author_app_user_id = public.current_app_user_id());

grant select, insert on public.audit_remarks to authenticated, service_role;
revoke update, delete, truncate on public.audit_remarks from anon, authenticated, service_role;
revoke all on public.audit_remarks from anon;

comment on table public.audit_remarks is
  'Notes a person writes beside the audit log — why something was done. Append-only and admin-only, like the log itself. NOT part of audit_logs: that table is written by the database, redacted on write, and must never be updatable.';
