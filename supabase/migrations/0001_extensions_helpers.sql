-- 0001 · extensions and shared helpers
-- Every later migration depends on these. Nothing here reads application data.

create extension if not exists citext;
create extension if not exists unaccent;
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------- updated_at
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ------------------------------------------------------------- normalisation
-- Name matching is the ONLY identity signal the Google Meet CSV gives us
-- (the file carries Full Name / First Seen / Time in Call and nothing else),
-- so this function is load-bearing: it decides who a row belongs to.
-- IMMUTABLE because members.name_normalized is a generated column.
-- unaccent() is STABLE, so it is pinned to a fixed dictionary to stay immutable.
create or replace function public.normalize_name(p text) returns text
language sql immutable parallel safe as $$
  select nullif(
    btrim(                              -- AFTER the substitution, not before:
      regexp_replace(                   -- punctuation at the edges becomes a
        lower(public.unaccent(          -- space, so trimming first leaves it.
          'public.unaccent'::regdictionary, coalesce(p, ''))),
        '[^a-z0-9]+', ' ', 'g'
      )
    ), '')                              -- '' too, not just ' '
$$;

-- Why the order matters. Google Meet display names carry trailing periods,
-- bracketed suffixes and emoji all the time ("Shazia F.", "Shazia (Mom)").
-- Trimming before the substitution left 'shazia ' with a trailing space, which
-- would not equal 'shazia' -- so a member would silently fail to match her own
-- alias. Name is the ONLY identity signal the CSV gives us, so this function
-- decides who every attendance row belongs to.

create or replace function public.normalize_email(p text) returns citext
language sql immutable parallel safe as $$
  select nullif(lower(trim(coalesce(p, ''))), '')::citext
$$;

-- --------------------------------------------------------------- week bounds
-- Weeks are Mon-Sun in the academy timezone. p_week_start: 1 = Monday.
create or replace function public.week_bounds(
  p_date date,
  p_week_start smallint default 1
) returns table (week_start date, week_end date)
language sql immutable parallel safe as $$
  select w, w + 6
  from (select p_date - ((extract(isodow from p_date)::int - p_week_start + 7) % 7) as w) s
$$;

-- --------------------------------------------------------------------- audit
-- WHO / WHAT / WHEN / PREVIOUS / CURRENT. Table itself lands in 0004; this is
-- declared early because 0002 and 0003 already need to write audit rows.
-- Redaction is enforced here rather than by convention: a PIN, security answer
-- or key can never reach audit_logs even if a caller passes one.
create or replace function public.audit_redact(p jsonb) returns jsonb
language sql immutable parallel safe as $$
  select coalesce(
    (select jsonb_agg(
       case when lower(e->>'field') ~ '(pin|password|secret|answer|token|key|credential)'
            then jsonb_build_object('field', e->>'field', 'old', '[redacted]', 'new', '[redacted]')
            else e end)
     from jsonb_array_elements(case jsonb_typeof(p) when 'array' then p else '[]'::jsonb end) e),
    '[]'::jsonb)
$$;

comment on function public.audit_redact(jsonb) is
  'Strips secret-bearing fields from an audit changes[] array. Never remove: this is the only thing standing between a careless caller and a PIN in the audit log.';
