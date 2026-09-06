-- 0034_pin_reset_requests.sql
--
-- A staff member who has forgotten her PIN asks the academy admin for a new
-- one, and the admin sees the ask.
--
-- WHY A TABLE AND NOT AN AUDIT ROW. audit_logs records what HAPPENED; this
-- records what is still OWED, and something owed needs a resolved state or the
-- admin's tray never empties. src/data/notifications.ts is explicit that a
-- badge which cannot go down is worse than no badge at all.
--
-- WHY ONE PENDING PER PERSON. She taps Forgot PIN, nothing visibly happens
-- because the admin is not looking yet, so she taps it again. Without the
-- partial unique index below that is two rows, two notifications and two
-- things for the admin to dismiss for one forgotten PIN. The Edge Function
-- upserts onto this index instead, so asking twice refreshes the same ask.

create table if not exists public.pin_reset_requests (
  id            uuid primary key default gen_random_uuid(),
  app_user_id   uuid not null references public.app_users (id) on delete cascade,
  requested_at  timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references public.app_users (id),
  created_at    timestamptz not null default now()
);

-- At most one OPEN request per person; any number of resolved ones stay as
-- history. Partial, so it constrains only the rows that mean "still owed".
create unique index if not exists pin_reset_requests_one_open
  on public.pin_reset_requests (app_user_id) where resolved_at is null;

create index if not exists pin_reset_requests_open
  on public.pin_reset_requests (requested_at desc) where resolved_at is null;

alter table public.pin_reset_requests enable row level security;

-- READ: the academy admin only. A staff member cannot enumerate who else has
-- forgotten a PIN -- that is a list of accounts worth attacking. She never
-- reads this table at all: she is not signed in when she asks (that is the
-- whole point), so the Edge Function writes it with the service role.
drop policy if exists pin_reset_requests_read on public.pin_reset_requests;
create policy pin_reset_requests_read on public.pin_reset_requests
  for select using (public.is_super_admin());

-- No insert/update/delete policy for anyone, deliberately. Every write goes
-- through an Edge Function using the service role: the requester has no
-- session, and the resolve happens inside pin-issue/pin-reset where the PIN is
-- actually rotated. A policy here would be a second way to do it.

grant select on public.pin_reset_requests to authenticated;
grant all    on public.pin_reset_requests to service_role;
revoke all   on public.pin_reset_requests from anon;

comment on table public.pin_reset_requests is
  'Staff asking the academy admin for a new PIN. One OPEN row per person '
  '(pin_reset_requests_one_open); resolved rows are history. Written only by '
  'Edge Functions -- the asker has no session, and the resolve rides along with '
  'the PIN rotation in pin-issue / pin-reset.';
