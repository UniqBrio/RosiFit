-- ROLLBACK for 0067 — course_week_day_status
--
-- Additive and reversible with no data loss, because the migration adds nothing
-- but a function: there is no table, column, index or constraint to unwind, and
-- nothing was written to any row.
--
-- BEFORE RUNNING THIS, PUT THE SCREEN BACK FIRST. Dropping the function while
-- app/course/[id].tsx still calls it turns every course screen into the Load
-- failed state added in Phase A -- which is at least honest, and retryable, and
-- not silent, but it is still a broken screen. Deploy the revert, then drop.
--
-- Run by hand:  psql "$DATABASE_URL" -f supabase/rollback/0067_course_week_day_status.down.sql

drop function if exists public.course_week_day_status(uuid, date, uuid);
