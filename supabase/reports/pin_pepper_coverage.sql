-- PIN / recovery-answer pepper migration coverage (0091). READ-ONLY. Run against MUMBAI:
--   psql ... -f supabase/reports/pin_pepper_coverage.sql
-- Shows COUNTS and NAMES only -- never a PIN, an answer, a hash, a pepper or a token.
-- docs/security/PIN_PEPPER_MIGRATION.md says what to do with the result.
\set ON_ERROR_STOP on
SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;

\echo '== staff credentials by pepper version (live accounts with a credential)'
SELECT pin_pepper_version AS version,
       count(*) FILTER (WHERE is_active) AS active,
       count(*) FILTER (WHERE NOT is_active) AS disabled
FROM public.app_users
WHERE deleted_at IS NULL AND auth_user_id IS NOT NULL
GROUP BY pin_pepper_version ORDER BY 1;

\echo '== still on the OLD pepper (each needs one sign-in while Singapore pin-verify is up, or a PIN re-issue)'
SELECT name, kind, role_label, is_active, last_login_at
FROM public.app_users
WHERE deleted_at IS NULL AND auth_user_id IS NOT NULL AND pin_pepper_version = 0
ORDER BY kind, name;

\echo '== recovery answers by pepper version'
SELECT r.pepper_version AS version, count(*) AS answers, count(DISTINCT r.app_user_id) AS super_admins
FROM public.super_admin_recovery r JOIN public.app_users u ON u.id = r.app_user_id
WHERE u.deleted_at IS NULL
GROUP BY r.pepper_version ORDER BY 1;

\echo '== migration complete? (want: t t -- then pin-verify can be retired)'
SELECT NOT EXISTS (SELECT 1 FROM public.app_users WHERE deleted_at IS NULL AND auth_user_id IS NOT NULL AND pin_pepper_version = 0) AS all_pins_current,
       NOT EXISTS (SELECT 1 FROM public.super_admin_recovery r JOIN public.app_users u ON u.id = r.app_user_id
                   WHERE u.deleted_at IS NULL AND r.pepper_version = 0) AS all_answers_current;
