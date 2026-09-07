-- SEND TEST SEED -- deliberately NOT a migration.
--
-- Points every live member's primary email at the academy's own verified
-- domain so a real send can be exercised end to end and every message lands
-- in one inbox the academy owns. Reverse with seed_send_test_teardown.sql.
--
-- WHY THIS IS NOT JUST `update ... set email = 'support@getfit.rosifit.com'`
--
--   1. `member_emails_unique_live` is UNIQUE on (email) where deleted_at is
--      null. Fifteen members cannot share one literal address; the second
--      insert is refused. Plus-addressing keeps every row unique while every
--      message still arrives at the same support@ mailbox, and a verified
--      DOMAIN identity in SES covers support+anything@ -- which is also what
--      satisfies the sandbox's recipient check, if the account is still in it.
--
--   2. The addresses being replaced are NOT all disposable. Two are real
--      personal gmail addresses sitting in customer records, which is already
--      a breach of TEST_ACCOUNTS.md rule 1 ("contact details in test data are
--      always fake -- never a real email used as a customer record") and a
--      live hazard: a send today reaches a person who never asked for it.
--      So the originals are SOFT-DELETED, not overwritten. They stay in the
--      table, recoverable, and the teardown puts them back exactly.
--
-- WHY "Yoga 2" CHANGES SENDER
--   All three live courses currently send from support@getfit.rosifit.com, so
--   a send would exercise one address and prove nothing about the per-course
--   sender that 1c3d45b built. Yoga 2 has the fewest active members (1), so it
--   is the smallest change that makes the second address reachable.
--
-- TEST_ACCOUNTS.md is amended in the same change, as its own closing
-- paragraph requires: "When a send needs exercising end to end, add the
-- destination here first, in the same change that makes it reachable."
--
-- THE SENTINEL. The soft-delete stamps one fixed instant rather than now(),
-- so the teardown can find exactly the rows this script parked and cannot
-- resurrect an address somebody deleted for a real reason.

begin;

-- ------------------------------------------------- park the real addresses
update public.member_emails
   set deleted_at = '2026-09-07T00:00:00Z'::timestamptz
 where deleted_at is null
   and is_primary;

-- ------------------------------------------------- one inbox, unique rows
-- `n` guarantees uniqueness where two members share a name -- this register
-- has both "anita" and "Anita", whose slugs are identical.
with ranked as (
  select id, full_name, row_number() over (order by full_name, id) as n
    from public.members
   where deleted_at is null
)
insert into public.member_emails (member_id, email, is_primary, status, source)
select r.id,
       case when r.full_name = 'Shazia'
            then 'support@getfit.rosifit.com'
            else 'support+'
                 || coalesce(nullif(lower(regexp_replace(r.full_name, '[^a-zA-Z0-9]', '', 'g')), ''), 'member')
                 || r.n || '@getfit.rosifit.com'
       end,
       true,
       'valid',
       'send-test-seed'
  from ranked r;

-- ------------------------------------ make the SECOND sender reachable
update public.course_communication
   set from_email = 'support@getfit.ravisfit.com'
 where course_id = (select id from public.courses
                     where name = 'Yoga 2' and deleted_at is null);

commit;

-- ------------------------------------------------------------- what landed
select m.full_name, e.email, c.name as course, cc.from_email as will_send_as
  from public.members m
  join public.member_emails e
    on e.member_id = m.id and e.is_primary and e.deleted_at is null
  left join public.member_enrollments en on en.member_id = m.id and en.status = 'active'
  left join public.course_offerings o on o.id = en.offering_id
  left join public.courses c on c.id = o.course_id
  left join public.course_communication cc on cc.course_id = c.id
 where m.deleted_at is null
 order by cc.from_email nulls last, m.full_name;
