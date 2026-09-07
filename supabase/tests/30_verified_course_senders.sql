\echo 'course senders: the unverified-domain guard 0038 applies actually catches one'

-- 0038 repointed eight production courses off support@rosifit.com /
-- support@ravisfit.com -- the fixture addresses the picker offered for as
-- long as it existed (TD-016) -- onto the getfit.* subdomains that ARE
-- verified identities in SES. It then refuses to apply if any course is
-- still outside those domains, because the very next step is a deploy that
-- turns each such row into a failed send.
--
-- The UPDATE itself cannot be specced here: the harness replays migrations
-- against an EMPTY database, so by the time this file runs there were no rows
-- to repoint and re-running it matches nothing. Asserting that would be
-- asserting nothing.
--
-- What IS worth pinning is the PREDICATE, because a guard that cannot see a
-- bad row is worse than no guard -- it reads as proof. Writing these caught
-- the guard's first version, which used a bare CONTAINS and waved through
-- support@getfit.rosifit.com.example.net.

begin;

create temporary table sender_probe (label text, from_email text);
insert into sender_probe values
  ('the old default',        'support@rosifit.com'),
  ('the old second sender',  'support@ravisfit.com'),
  ('a look-alike domain',    'support@getfit.rosifit.com.example.net'),
  ('a look-alike, wrapped',  'RosiFit <support@getfit.ravisfit.com.example.net>'),
  ('verified, bare',         'support@getfit.rosifit.com'),
  ('verified, second',       'support@getfit.ravisfit.com'),
  ('verified, display form', 'RosiFit Academy <support@getfit.ravisfit.com>'),
  ('verified, spaced form',  'RosiFit Academy < support@getfit.rosifit.com >');

create temporary view probe_verdict as
  select label, from_email,
         coalesce(substring(from_email from '<\s*([^<>]+?)\s*>'), from_email) as addr
    from sender_probe;

-- CAUGHT: the two retired fixture addresses and both look-alikes.
select t.eq(
  (select count(*)::int from probe_verdict
    where addr not like '%@getfit.rosifit.com'
      and addr not like '%@getfit.ravisfit.com'),
  4, 'both retired addresses and both look-alike domains are caught');

select t.ok(
  (select bool_and(addr not like '%@getfit.rosifit.com'
               and addr not like '%@getfit.ravisfit.com')
     from probe_verdict
    where label in ('the old default','the old second sender')),
  'neither address 0038 repoints would survive the guard');

-- THE ONE THAT MATTERS MOST. A domain that merely CONTAINS the verified one
-- is a different domain, and the guard's first version let it through.
select t.ok(
  (select bool_and(addr not like '%@getfit.rosifit.com'
               and addr not like '%@getfit.ravisfit.com')
     from probe_verdict where label like 'a look-alike%'),
  'a domain that only CONTAINS a verified one is still caught');

-- PASSED: the two verified addresses, plus the display forms SES accepts.
select t.eq(
  (select count(*)::int from probe_verdict
    where addr like '%@getfit.rosifit.com'
       or addr like '%@getfit.ravisfit.com'),
  4, 'both verified addresses pass, and so do the Name <addr> display forms');

-- and the real table is clean, in whatever environment this runs. Vacuous on
-- the harness, which has no rows; it earns its keep anywhere that does.
select t.eq(
  (select count(*)::int from public.course_communication
    where coalesce(substring(from_email from '<\s*([^<>]+?)\s*>'), from_email)
            not like '%@getfit.rosifit.com'
      and coalesce(substring(from_email from '<\s*([^<>]+?)\s*>'), from_email)
            not like '%@getfit.ravisfit.com'),
  0, 'no course is left sending from an unverified domain');

rollback;
