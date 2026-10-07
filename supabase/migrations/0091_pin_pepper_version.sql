-- 0091: which PIN_PEPPER secured each staff credential and each recovery answer.
-- requests/2026-10-08-pin-pepper-migration.md, docs/security/PIN_PEPPER_MIGRATION.md
--
-- Production moves to Mumbai with a NEW PIN_PEPPER; the old one cannot be recovered. Every
-- credential copied from Singapore was derived under the old pepper, so Mumbai cannot check it
-- locally. A version-0 credential is checked once by Singapore's authenticated `pin-verify`, then
-- re-secured under Mumbai's pepper in the same request and marked 1. Version 1 is checked locally.
--
--   0 = secured under the OLD (Singapore) pepper -- every row that exists when this is applied
--   1 = secured under the NEW (Mumbai) pepper     -- set by the functions, never by this file
--
-- ADDITIVE ONLY. Two columns, NOT NULL DEFAULT 0: existing rows read 0, no credential, hash or
-- answer is touched, nothing is dropped. Apply to MUMBAI ONLY, after the final restore and its R8
-- comparison (the columns would otherwise be the one difference R8 reports). Singapore never
-- receives it: its functions stay at the versions deployed today.
--
-- No grants change: both tables are read and written by the Edge Functions with the service role.

alter table public.app_users
  add column if not exists pin_pepper_version smallint not null default 0;

alter table public.super_admin_recovery
  add column if not exists pepper_version smallint not null default 0;

-- Deliberately no CHECK constraint: the functions only ever write 0 or 1, and a constraint over
-- existing rows is a separate production check (CLAUDE.md) this migration does not need.

comment on column public.app_users.pin_pepper_version is
  '0 = PIN credential secured under the old Singapore pepper (checked once by pin-verify, then re-secured); 1 = secured under this project''s PIN_PEPPER.';
comment on column public.super_admin_recovery.pepper_version is
  '0 = answer hashed under the old Singapore pepper (checked once by pin-verify, then re-hashed); 1 = hashed under this project''s PIN_PEPPER.';
