-- 0033_many_super_admins.sql
--
-- RosiFit has ONE academy and MANY super admins.
--
-- 0003 created `one_super_admin`, a partial unique index over (kind) where
-- kind = 'super_admin', which allowed exactly one undeleted super admin in the
-- project. That encoded "registration creates the academy" -- an academy can
-- only be created once, so its owner could only exist once. The owner restated
-- the model on 06-Sep-2026: "it is not academy creation it is super admin
-- creation ... it is rosifit only, we are just creating super admins for
-- rosifit academy". The academy is a constant, not a thing the form makes, so
-- the singleton constraint has nothing left to protect.
--
-- WHAT IS DELIBERATELY NOT DROPPED:
--   * `app_users_phone_live` -- one live account per mobile number. That is
--     what stops the same person registering twice, and it is the constraint
--     `auth-bootstrap`'s duplicate check reports on. It stays.
--   * `app_settings.bootstrap_completed` and its one-way latch trigger. Still
--     written by the first registration and still read by `auth-login`, which
--     uses "nobody has registered at all" to explain an empty project rather
--     than answering like a wrong PIN. It simply no longer REFUSES a later
--     registration.
--
-- `is_super_admin()` (0003) is `exists (...)`, not `= the one row`, so every
-- RLS policy in the schema already behaves correctly with several. No policy
-- changes here.
--
-- REVERSIBILITY: dropping an index is reversible only while no second super
-- admin exists. Recreating `one_super_admin` after two have registered fails
-- on the duplicate, and choosing which account to delete is a decision, not a
-- rollback. Stated because it is the sharp edge of this migration.

drop index if exists public.one_super_admin;

comment on table public.app_users is
  'Sign-in accounts. kind = super_admin (academy admins, MANY as of 0033) or staff. '
  'One live account per mobile number (app_users_phone_live).';
