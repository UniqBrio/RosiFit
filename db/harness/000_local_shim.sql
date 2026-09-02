-- LOCAL TEST HARNESS ONLY — never applied to Supabase.
-- Recreates the pieces Supabase provides so migrations/ can be executed verbatim.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon')          then create role anon nologin;          end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role')  then create role service_role nologin bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator noinherit login; end if;
end $$;
grant anon, authenticated, service_role to authenticator;

-- Supabase ships DEFAULT PRIVILEGES that grant ALL on every new object in
-- `public` DIRECTLY to anon, authenticated and service_role -- not via the
-- PUBLIC pseudo-role. Reproducing them is not a nicety: without these lines
-- the harness is STRICTER than production, so a migration that forgets to
-- revoke looks correct here and is wide open there. That is exactly what
-- happened to the table grants 0002-0010 believed they were setting, and why
-- 135 passing assertions did not catch it (see 0015).
--
-- Set as `postgres` because that is the role migrations run as, both here and
-- on Supabase, so it is the pg_default_acl entry that governs their tables.
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create schema if not exists auth;
create schema if not exists storage;

-- GoTrue's users table: migrations only ever reference auth.users(id).
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  phone text,
  created_at timestamptz not null default now()
);

-- auth.uid() reads the JWT claim; locally it reads a GUC the tests set.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean not null default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text, owner uuid, created_at timestamptz default now(),
  metadata jsonb
);
alter table storage.objects enable row level security;
