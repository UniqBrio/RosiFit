-- Reverses supabase/seed_send_test.sql, and nothing else.
--
-- Ordered so the indexes never block the restore: the seeded rows go FIRST,
-- because both `member_emails_unique_live` (one live row per address) and
-- `member_emails_one_primary` (one live primary per member) would refuse the
-- originals while the seeded ones are still live.
--
-- ANCHORED, not dated. Seeded rows carry source = 'send-test-seed'; parked
-- originals carry the sentinel deleted_at the seed stamped. Nothing else in
-- the table matches either, so an address somebody deleted for a real reason
-- is never resurrected.
--
-- RUN THIS BEFORE ANY REAL SEND. While it is un-run, every member on the
-- register has a support@ address and no member is reachable at her own.

begin;

-- ------------------------------------------------- remove the seeded rows
-- Hard delete: these rows were created by the seed and were never real. A
-- soft delete would leave fifteen tombstones and keep the addresses occupying
-- nothing, but it would also mean the seed cannot be run again cleanly.
delete from public.member_emails
 where source = 'send-test-seed';

-- ------------------------------------------------ restore the real ones
update public.member_emails
   set deleted_at = null
 where deleted_at = '2026-09-07T00:00:00Z'::timestamptz;

-- --------------------------------------------- Yoga 2 back to the default
update public.course_communication
   set from_email = 'support@getfit.rosifit.com'
 where course_id = (select id from public.courses
                     where name = 'Yoga 2' and deleted_at is null);

commit;

-- ------------------------------------------------------------ verify
-- Expect: zero seeded rows left, and every live member back on the address
-- she had before the seed ran. Members who had NO email before the seed
-- correctly have none again.
select
  (select count(*) from public.member_emails where source = 'send-test-seed') as seeded_rows_left,
  (select count(*) from public.member_emails
    where deleted_at = '2026-09-07T00:00:00Z'::timestamptz) as still_parked,
  (select count(*) from public.member_emails where is_primary and deleted_at is null) as live_primaries,
  (select count(*) from public.course_communication
    where from_email = 'support@getfit.ravisfit.com') as courses_on_ravisfit;
