-- 0019 · adding and removing a branch, from the app
--
-- WHAT WAS MISSING
--   The canvas gives Branches a screen: type a name, Add, and a per-branch
--   row carrying its course and member counts with a delete beside it. In
--   the app that row was a toast -- More flashed the branch names and went
--   nowhere. Three things stood between the screen and the table:
--
--     * branches.code is `not null` with a unique index on lower(code), and
--       the screen collects a NAME and nothing else. Any client filling the
--       code itself invents a second naming rule and races another client
--       for it.
--     * nothing stopped two branches sharing a NAME. Only the code was
--       unique, so "Madurai" twice was a legal pair of rows -- and every
--       filter in the app addresses a branch BY NAME (fetchFilterOptions,
--       createHoliday, the Overview scope), so the duplicate would be
--       unreachable and its sessions uncountable.
--     * removal had no definition at all. branches has deleted_at and every
--       read filters on it, but course_offerings.branch_id and
--       holidays.branch_id reference the row with no ON DELETE clause: a
--       hard delete is refused by the foreign key, and a soft delete of a
--       branch that still runs courses hides the branch while leaving its
--       offerings live -- sessions expected at a branch nobody can see.
--
-- WHY TRIGGERS RATHER THAN AN RPC
--   0005 already states who may write a branch, as RLS on the table:
--   is_super_admin() and is_subscription_writable(), for insert and update.
--   An RPC would restate that rule in a second place and need its own grant.
--   The client writes the row through the policies that already exist; these
--   triggers only fill what the screen cannot know and refuse what the
--   foreign keys would otherwise leave dangling. ONE rule, ONE place.
--
--   Removal is therefore an UPDATE that sets deleted_at, not a DELETE. No new
--   policy and no new grant is involved, and the branch's history stays
--   readable -- which is the same reason members and courses are soft-deleted.

-- ------------------------------------------------------------ the code
-- Derived from the name, never from the client. Letters and digits only,
-- upper-cased, first eight; then -2, -3 ... until it is unique among LIVE
-- rows, which is exactly what branches_code_live indexes.
create or replace function public.branches_fill_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_base text;
  v_try  text;
  v_n    int := 1;
begin
  if new.code is not null and btrim(new.code) <> '' then
    return new;                                   -- an explicit code is kept
  end if;

  v_base := upper(regexp_replace(new.name, '[^a-zA-Z0-9]', '', 'g'));
  v_base := left(v_base, 8);
  if v_base = '' then
    -- a name of punctuation alone still has to produce something addressable
    v_base := 'BRANCH';
  end if;

  v_try := v_base;
  while exists (select 1 from public.branches
                 where lower(code) = lower(v_try) and deleted_at is null) loop
    v_n := v_n + 1;
    v_try := left(v_base, 8 - length(v_n::text) - 1) || '-' || v_n::text;
  end loop;

  new.code := v_try;
  return new;
end $$;

comment on function public.branches_fill_code() is
  'Fills branches.code from the name when the client sends none. The Branches screen collects a name only; the code stays unique among live rows without a client ever choosing one.';

create trigger branches_fill_code before insert on public.branches
  for each row execute function public.branches_fill_code();

-- ------------------------------------------------------------ the name
-- The app addresses a branch by name everywhere a person picks one, so two
-- live branches sharing a name is not a cosmetic duplicate: it makes one of
-- them unreachable. Partial, like branches_code_live, so a removed branch
-- never blocks the name being used again.
create unique index branches_name_live on public.branches (lower(name))
  where deleted_at is null;

-- ------------------------------------------------------------ the removal
-- Refuses to hide a branch that still has something running at it. The
-- screen states the same rule before the tap ("a branch with courses cannot
-- be removed"), but the screen is not what enforces it.
create or replace function public.branches_guard_removal() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_offerings int;
  v_holidays  int;
begin
  if new.deleted_at is null or old.deleted_at is not null then
    return new;                        -- not a removal; nothing to check
  end if;

  select count(*) into v_offerings from public.course_offerings
    where branch_id = old.id and deleted_at is null;
  if v_offerings > 0 then
    raise exception
      'branch % still runs % course offering(s) -- move or remove them first',
      old.name, v_offerings using errcode = '55000';
  end if;

  -- A holiday scoped to this branch would outlive it and go on suppressing
  -- sessions for a branch that no longer exists.
  select count(*) into v_holidays from public.holidays where branch_id = old.id;
  if v_holidays > 0 then
    raise exception
      'branch % is the scope of % holiday(s) -- remove them first',
      old.name, v_holidays using errcode = '55000';
  end if;

  return new;
end $$;

comment on function public.branches_guard_removal() is
  'A branch is removed by setting deleted_at. This refuses that while any live offering or any holiday still points at it, because both would keep affecting sessions at a branch no read can see.';

create trigger branches_guard_removal before update of deleted_at on public.branches
  for each row execute function public.branches_guard_removal();

-- audit_branches (0005) is `after insert or update`, so both the addition and
-- the removal are already recorded with their previous values (C-94). Nothing
-- to add here.
