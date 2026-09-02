\echo 'add member: one transaction — her record, names, addresses, enrolment and days'
--
-- The defect these cover: the Add Member form reported "<name> added" and
-- wrote nothing at all. So the first assertion is the blunt one — after the
-- call, is she IN the database — and the rest defend the parts of that write
-- that a direct insert could not have done correctly anyway.

begin;
  insert into auth.users (id) values ('dddddddd-0000-0000-0000-000000000001');
  insert into public.app_users (auth_user_id, kind, name, phone_e164)
    values ('dddddddd-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158');

  insert into public.branches (name, code, city) values ('Coimbatore','CBE','Coimbatore');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Prenatal Flow','06:00','07:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00'
      from public.courses c, public.branches b where c.name='Prenatal Flow';
  -- Mon/Wed/Fri, open-ended, starting well before anything these tests date.
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select id, '2026-01-01', array[1,3,5]::smallint[] from public.course_offerings;
commit;

-- ---------------------------------------------------------------- the write
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';

  select public.create_member(
    'Anitha Rajesh',
    (select id from public.course_offerings),
    current_date - 30,
    array['Anitha R','Anitha']::text[],
    array['anitha@gmail.com','anitha.r@work.example.com']::text[],
    null);

  select t.eq((select count(*)::int from public.members where full_name='Anitha Rajesh'), 1,
    'she is IN the database — the form used to say "added" and write nothing');
  select t.eq((select member_code ~ '^RF-[0-9]{6}$' from public.members where full_name='Anitha Rajesh'),
    true, 'her member code is generated, not asked for');
  select t.eq((select joined_on from public.members where full_name='Anitha Rajesh'),
    current_date - 30, 'the joining date is the one that was given');
  select t.eq((select status from public.members where full_name='Anitha Rajesh'), 'active',
    'a new member is active');

  -- The reason this is an RPC at all: member_enrollments has a read policy and
  -- nothing else, so a direct insert would have produced a member enrolled in
  -- nothing — expected at no session, in no follow-up list, counted by nobody.
  select t.eq((select count(*)::int from public.member_enrollments e
                 join public.members m on m.id = e.member_id
                where m.full_name='Anitha Rajesh'), 1,
    'she is enrolled — without this she would be invisible to the engine');
  select t.eq((select e.effective_from from public.member_enrollments e
                 join public.members m on m.id = e.member_id
                where m.full_name='Anitha Rajesh'),
    current_date - 30, 'her enrolment starts the day she joined, not today');

  select t.eq((select count(*)::int from public.member_aliases a
                 join public.members m on m.id = a.member_id
                where m.full_name='Anitha Rajesh'), 2,
    'both Google Meet display names are stored (C-71)');
  select t.eq((select count(*)::int from public.member_emails e
                 join public.members m on m.id = e.member_id
                where m.full_name='Anitha Rajesh'), 2, 'both addresses are stored');
  -- C-73: several addresses, exactly one primary, and it is the first one.
  select t.eq((select e.email::text from public.member_emails e
                 join public.members m on m.id = e.member_id
                where m.full_name='Anitha Rajesh' and e.is_primary),
    'anitha@gmail.com', 'the FIRST address is the primary one');

  -- No override was asked for, so she follows the offering's days. An empty
  -- member_schedules row would mean something different and stricter.
  select t.eq((select count(*)::int from public.member_schedules s
                 join public.members m on m.id = s.member_id
                where m.full_name='Anitha Rajesh'), 0,
    'no weekday override means she follows the course, not a row saying nothing');
rollback;

-- --------------------------------------------------------- no email is fine
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.create_member('Nithya Krishnan', (select id from public.course_offerings));
  select t.eq((select count(*)::int from public.member_emails e
                 join public.members m on m.id = e.member_id
                where m.full_name='Nithya Krishnan'), 0,
    'a member with no address is still added — she is counted as excluded, never dropped (C-76)');
  select t.eq((select count(*)::int from public.member_enrollments e
                 join public.members m on m.id = e.member_id
                where m.full_name='Nithya Krishnan'), 1,
    'and she is still enrolled');
rollback;

-- ------------------------------------------------------------- her own days
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';

  select public.create_member('Aarthi Venkat', (select id from public.course_offerings),
    current_date - 7, '{}'::text[], '{}'::text[], array[1,3]::smallint[]);
  select t.eq((select s.weekdays from public.member_schedules s
                 join public.members m on m.id = s.member_id
                where m.full_name='Aarthi Venkat'), array[1,3]::smallint[],
    'a subset of the course days is accepted as her own days');
  select t.eq((select s.sessions_per_week::int from public.member_schedules s
                 join public.members m on m.id = s.member_id
                where m.full_name='Aarthi Venkat'), 2,
    'and two days a week is what she is then expected for');
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  -- Tuesday is not a day this offering runs. An override that is not a subset
  -- would make her expected at a session that does not exist.
  select t.rejects($$select public.create_member('Kavya Balaji',
      (select id from public.course_offerings), current_date,
      '{}'::text[], '{}'::text[], array[1,2]::smallint[])$$,
    'her days must be days the course actually runs', 'actually runs');
  select t.rejects($$select public.create_member('Kavya Balaji',
      (select id from public.course_offerings), current_date,
      '{}'::text[], '{}'::text[], '{}'::smallint[])$$,
    'an empty day list is refused — blank means "follow the course", which is different',
    'at least one day');
rollback;

-- ------------------------------------------------------------ what it refuses
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';

  select t.rejects($$select public.create_member('Future Person',
      (select id from public.course_offerings), current_date + 1)$$,
    'a member cannot have started next week', 'future');

  select t.rejects($$select public.create_member('No Offering',
      '00000000-0000-0000-0000-000000000000'::uuid)$$,
    'a course that is not offered at that branch is named, not a foreign-key error',
    'not offered at that branch');

  select t.rejects($$select public.create_member('X',
      (select id from public.course_offerings))$$,
    'a one-character name is refused by the same rule the column carries', 'name is needed');
rollback;

-- ------------------------------------------- one display name, one member
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.create_member('Shazia Begum', (select id from public.course_offerings),
    null, array['Shazia']::text[]);

  -- C-71/C-72: academy-wide unique, or an import would have to guess which
  -- member a row belongs to. The clash is NAMED so the operator can fix it.
  select t.rejects($$select public.create_member('Shazia Khan',
      (select id from public.course_offerings), null, array['Shazia']::text[])$$,
    'a display name already on another member is refused, and says which one',
    'already belongs to another member');

  select public.create_member('Shazia Two', (select id from public.course_offerings),
    null, '{}'::text[], array['shazia.b@gmail.com']::text[]);
  select t.rejects($$select public.create_member('Someone Else',
      (select id from public.course_offerings), null, '{}'::text[],
      array['shazia.b@gmail.com']::text[])$$,
    'an address on another member is refused too', 'already on another member');
rollback;

-- --------------------------------------------------------------- all or none
-- The whole reason this is ONE function. The second alias clashes, so the
-- member, her first alias and her address must all be gone too -- a half-added
-- member is the failure that would be hardest to find later.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.create_member('Meena Raj', (select id from public.course_offerings),
    null, array['Meena']::text[]);

  select t.rejects($$select public.create_member('Lakshmi Priya',
      (select id from public.course_offerings), null,
      array['Lakshmi','Meena']::text[], array['lakshmi@gmail.com']::text[])$$,
    'the second display name clashes, so the call fails', 'already belongs to another member');

  select t.eq((select count(*)::int from public.members where full_name='Lakshmi Priya'), 0,
    'ALL OR NONE — no member row survives a failed call');
  select t.eq((select count(*)::int from public.member_aliases where alias_display='Lakshmi'), 0,
    'nor the display name that had already been written');
  select t.eq((select count(*)::int from public.member_emails where email='lakshmi@gmail.com'), 0,
    'nor the address');
rollback;

-- ------------------------------------------------------------------- the gate
-- 0015's lesson: Supabase's default privileges grant EXECUTE on every new
-- function to anon and authenticated, so a function is open unless a migration
-- revokes it. This is that revoke, tested rather than assumed.
begin;
  set local role anon;
  select t.rejects($$select public.create_member('Anon Person',
      '00000000-0000-0000-0000-000000000000'::uuid)$$,
    'anon cannot add a member at all', 'denied');
rollback;

begin;
  set local role authenticated;
  -- signed in to Postgres, but no app_users row: not a member of this academy
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000099';
  select t.rejects($$select public.create_member('Ghost Member',
      (select id from public.course_offerings))$$,
    'an authenticated caller who is not an active app user is refused',
    'signed-in, active user');
rollback;

-- Reads keep working after expiry; writes stop. Losing your history because an
-- invoice is late would be the wrong failure -- but adding is a write.
begin;
  set local role service_role;
  update public.app_subscription
     set expires_at = current_date - 30, grace_days = 0 where id = 1;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select t.rejects($$select public.create_member('After Expiry',
      (select id from public.course_offerings))$$,
    'an expired subscription cannot add a member', 'subscription is not writable');
rollback;
