-- 0021 · a course carries its own sender, template and wording
--
-- WHAT THE CANVAS ASKS FOR
--   The 3-Sep canvas edits a course's From Email ID, Message Template and the
--   exact subject and body it sends INSIDE the course form, and its own
--   caption is explicit about the consequence: "A course's message wording,
--   sender and follow-up rule are edited in the course form itself -- there
--   is no separate Message Templates or Follow-up Rules screen in settings."
--
--   Nothing in the schema could hold any of it. email_templates (0009) is a
--   global list; course_follow_up_config holds thresholds and nothing about
--   communication. So a course could not name its own sender, could not
--   choose which template it uses, and could not word its own message.
--
-- WHY THIS IS NOT A FREE-FORM SEND PATH
--   Guardrail 5 says messages go out through stored templates only, and
--   0009's own header says send-email-batch "accepts a template_id and
--   nothing resembling a subject or body". Both still hold. This stores
--   wording AGAINST THE COURSE, in advance, as a row -- it is authoring a
--   course-scoped template, not composing at send time. The send screen shows
--   it READ-ONLY and has no compose fields at all, which is the same rule
--   0009 wrote, applied one level down.
--
--   The distinction that matters: a person can change what a course will say
--   NEXT time, deliberately, on the course. Nobody can change what THIS batch
--   says while sending it. email_batches still snapshots subject and body at
--   send (0009), so a message already sent is still answerable for its own
--   wording whatever the course says later.
--
-- ONE ROW PER COURSE, and the course's own rule stays where it is
--   The follow-up thresholds live in course_follow_up_config and are not
--   touched: they are already per-course, already audited, and already
--   resolved by effective_follow_up_config(). Adding communication to that
--   table would mix a counting rule with a message and make one unwritable
--   without the other.

create table public.course_communication (
  course_id   uuid primary key references public.courses(id) on delete cascade,
  -- The address the academy sends AS. Not free text: it is checked against
  -- the senders the deployment actually has, because a from-address nobody
  -- owns bounces every message the course will ever send.
  from_email  text not null check (position('@' in from_email) > 1),
  -- The template this course is BASED on. Kept even though the wording below
  -- overrides it, so "Reset" has something to reset TO and the course can say
  -- which template it started from.
  template_id uuid not null references public.email_templates(id),
  -- The course's own wording. Null means "use the template's", so a course
  -- that has never been edited does not carry a stale copy of it.
  subject     text check (subject is null or length(btrim(subject)) between 3 and 200),
  body_text   text check (body_text is null or length(btrim(body_text)) >= 10),
  updated_by  uuid references public.app_users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

comment on table public.course_communication is
  'Per-course sender, template and wording, authored in advance on the course. NOT a compose-at-send path: send-email-batch still takes a template_id and email_batches still snapshots the wording it used (0009, C-68).';

comment on column public.course_communication.subject is
  'NULL means the template''s subject. A course that has never been reworded must not hold a copy that silently stops tracking the template it names.';

create trigger course_communication_updated_at before update on public.course_communication
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------- RLS
-- The same predicate the organisation tables carry, stated again rather than
-- shared: a policy that reads differently from its neighbours is how one of
-- them quietly stops matching.
alter table public.course_communication enable row level security;
alter table public.course_communication force  row level security;

create policy course_comm_read on public.course_communication
  for select to authenticated using (public.is_active_app_user());
create policy course_comm_insert on public.course_communication
  for insert to authenticated
  with check (public.is_super_admin() and public.is_subscription_writable());
create policy course_comm_update on public.course_communication
  for update to authenticated
  using (public.is_super_admin() and public.is_subscription_writable())
  with check (public.is_super_admin() and public.is_subscription_writable());
-- No DELETE policy or grant, deliberately. "Reset to template" sets subject
-- and body to NULL -- an UPDATE -- and removing a course cascades this row
-- away by the foreign key. Nothing in the product deletes one directly, so
-- the verb is not granted. Same shape as course_follow_up_config in 0009.

-- 0015 revoked the default privileges that used to hand every new table to
-- authenticated, so these grants are load-bearing: without them the policies
-- above never get the chance to allow anything.
grant select, insert, update on public.course_communication to authenticated;
grant all on public.course_communication to service_role;
revoke all on public.course_communication from anon;

create trigger audit_course_comm
  after insert or update or delete on public.course_communication
  for each row execute function public.audit_row_change('course_communication');

-- --------------------------------------------------------------- the resolver
-- What a course will actually send: its own wording where it has any, the
-- template's where it has not. ONE function, so the course form's preview,
-- the send screen's read-only draft and the batch itself cannot disagree
-- about what a course says -- which is the same reason
-- effective_follow_up_config() exists for the counting rule.
create or replace function public.effective_course_message(p_course_id uuid)
returns table (
  source text, from_email text, template_id uuid, template_name text,
  subject text, body_text text
)
language sql stable security definer set search_path = public as $$
  select
    case when cc.subject is not null or cc.body_text is not null
         then 'course' else 'template' end,
    cc.from_email,
    t.id, t.name,
    coalesce(cc.subject, t.subject),
    coalesce(cc.body_text, t.body_text)
  from public.course_communication cc
  join public.email_templates t on t.id = cc.template_id
  where cc.course_id = p_course_id

  union all

  -- No row yet: the course falls back to the default template and the
  -- deployment's first sender, exactly as the form seeds a new course.
  select 'default', null::text, t.id, t.name, t.subject, t.body_text
  from public.email_templates t
  where t.is_default
    and not exists (select 1 from public.course_communication c
                     where c.course_id = p_course_id)
  limit 1;
$$;

comment on function public.effective_course_message(uuid) is
  'The wording a course will send: its own where set, the template''s otherwise. The single resolver behind the course form preview, the read-only send draft and the batch.';

revoke all on function public.effective_course_message(uuid) from public, anon;
grant execute on function public.effective_course_message(uuid) to authenticated, service_role;
