-- 0010 · per-user appearance  [C-81, C-82]
--
-- Plan V2.2 §11.2 specified a controlled set of accents and an accent_key
-- column, on the stated grounds that "the user picks from measured options,
-- so no runtime calculation can go wrong". The design canvas supersedes that
-- with a hue slider, and this table follows the canvas -- but it keeps the
-- guarantee C-82 was protecting rather than dropping it:
--
--   * accent_key stays the stored choice, and 'custom' is the only value that
--     is not a key into the pre-measured set.
--   * accent_hue is constrained to 0..359, and every one of those 360 hues is
--     measured at BUILD time by scripts/check-contrast.ts -- both themes,
--     text on every surface, white on the fill. The build fails if any pair
--     drops below 4.5:1, so no reachable hue can ship a failing pair.
--
-- That is a stronger guarantee than the curated list gave: three of the six
-- canvas presets (Coral, Teal, Gold) shipped white labels at 3.05-3.67:1 and
-- had to be corrected before they could enter the set.

create table public.user_preferences (
  app_user_id uuid primary key references public.app_users(id) on delete cascade,
  theme_mode  text     not null default 'system'
                       check (theme_mode in ('light','dark','system')),
  -- a key into the approved set, or 'custom' to use accent_hue
  accent_key  text     not null default 'rosifit'
                       check (accent_key in
                         ('rosifit','plum','coral','teal','indigo','gold','custom')),
  accent_hue  smallint not null default 322
                       check (accent_hue between 0 and 359),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create trigger user_preferences_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

-- Per user, never global: one staff member's choice never changes another's.
-- Deliberately NOT readable by a super admin -- an appearance preference is
-- not an administrative fact, and there is no screen that shows anyone
-- else's.
create policy user_preferences_self_read on public.user_preferences
  for select to authenticated
  using (app_user_id = public.current_app_user_id());

create policy user_preferences_self_insert on public.user_preferences
  for insert to authenticated
  with check (app_user_id = public.current_app_user_id());

create policy user_preferences_self_update on public.user_preferences
  for update to authenticated
  using (app_user_id = public.current_app_user_id())
  with check (app_user_id = public.current_app_user_id());

-- No DELETE policy: a preference row is upserted, never removed. It goes with
-- the user when the user goes (on delete cascade).

comment on table public.user_preferences is
  'Per-user appearance. accent_key is a key into the measured accent set, or '
  '''custom'', in which case accent_hue selects a build-time-measured hue.';

-- Grants. RLS decides WHICH rows; the grant decides whether the role may
-- touch the table at all. Both are required -- a policy without a grant is a
-- permission-denied, not an empty result.
grant select, insert, update on public.user_preferences to authenticated;
grant all                    on public.user_preferences to service_role;
-- No delete to authenticated: the row is upserted, never removed.
