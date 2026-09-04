\echo 'update member: her name, names, addresses, course and days — and history kept'
--
-- The defect these cover: Edit Member could not save at all. It loaded her
-- record, took every keystroke, and disabled the button behind a line saying
-- there was no write path. 0016 shipped the CREATE path only and said so.
--
-- The assertions that matter most are not "did it change" but "what did it
-- do to the record of what was true before": member_enrollments and
-- member_schedules are date-ranged with a GiST exclusion, and a move that
-- rewrote the standing row in place would silently re-file attendance
-- already recorded against the old course.

begin;
  insert into auth.users (id) values ('ffffffff-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('ffffffff-1111-0000-0000-000000000001',
            'ffffffff-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158');

  insert into public.branches (name, code, city) values ('Coimbatore','CBE','Coimbatore');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Prenatal Flow','06:00','07:00',3), ('Postnatal Core','08:00','09:00',2);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00' from public.courses c, public.branches b;
  -- Prenatal runs Mon/Wed/Fri, Postnatal Tue/Thu. Different day sets on
  -- purpose: the subset rule is measured against the NEW offering.
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, '2026-01-01', array[1,3,5]::smallint[]
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Prenatal Flow';
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, '2026-01-01', array[2,4]::smallint[]
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Postnatal Core';
commit;

-- She is added the normal way, and enrolled 60 days ago so the move below
-- has real history to protect.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  select public.create_member(
    'Anitha Rajesh',
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Prenatal Flow'),
    current_date - 60,
    array['Anitha R','Anitha']::text[],
    array['anitha@gmail.com','anitha.work@example.com']::text[],
    null);
commit;

-- ============================================================ name + lists
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  select public.update_member(
    (select id from public.members where full_name = 'Anitha Rajesh'),
    'Anitha Rajesh Kumar',
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Prenatal Flow'),
    -- "Anitha" dropped, "Anita R" added, "Anitha  R." is the SAME alias as
    -- "Anitha R" once normalised and must not churn
    array['Anitha  R.','Anita R']::text[],
    -- the work address is promoted to primary and the gmail one removed
    array['anitha.work@example.com']::text[],
    null);
commit;

select t.eq((select full_name from public.members where id =
              (select id from public.members where full_name = 'Anitha Rajesh Kumar')),
  'Anitha Rajesh Kumar', 'her name is changed — the form used to be unable to save at all');

select t.eq((select count(*)::int from public.member_aliases a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Anitha Rajesh Kumar'), 2,
  'the alias list is the list she was sent — one dropped, one added');
select t.ok(exists (select 1 from public.member_aliases a join public.members m on m.id = a.member_id
             where m.full_name = 'Anitha Rajesh Kumar' and a.alias_normalized = 'anita r'),
  'the new display name is stored');
select t.ok(not exists (select 1 from public.member_aliases a join public.members m on m.id = a.member_id
             where m.full_name = 'Anitha Rajesh Kumar' and a.alias_normalized = 'anitha'),
  'the one she removed is GONE — an alias is a correction, so it is deleted, not kept');
select t.ok(exists (select 1 from public.member_aliases a join public.members m on m.id = a.member_id
             where m.full_name = 'Anitha Rajesh Kumar' and a.alias_display = 'Anitha R'),
  '"Anitha  R." did not churn "Anitha R" — reconciliation is on the NORMALISED name');

select t.eq((select count(*)::int from public.member_emails e
               join public.members m on m.id = e.member_id
              where m.full_name = 'Anitha Rajesh Kumar' and e.deleted_at is null), 1,
  'one live address — the other was removed');
select t.ok((select e.deleted_at is not null from public.member_emails e
               join public.members m on m.id = e.member_id
              where m.full_name = 'Anitha Rajesh Kumar' and e.email = 'anitha@gmail.com'),
  'the removed address is SOFT-deleted: email_messages still points at what was sent');
select t.ok((select e.is_primary from public.member_emails e
               join public.members m on m.id = e.member_id
              where m.full_name = 'Anitha Rajesh Kumar' and e.email = 'anitha.work@example.com'),
  'the first address in the list is primary — she is never left with none');

-- ================================================== the subset rule refuses
-- Prenatal runs Mon/Wed/Fri. Tuesday is not one of its days, and an override
-- that is not a subset would make her expected at a session that does not run.
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  select public.update_member(
    (select id from public.members where full_name = 'Anitha Rajesh Kumar'),
    'Anitha Rajesh Kumar',
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Prenatal Flow'),
    '{}'::text[], array['anitha.work@example.com']::text[], array[2]::smallint[])$$,
  'a weekday the course does not run is refused', 'days the course actually runs');

-- ======================================================= moving her course
-- Postnatal runs Tue/Thu, so Thursday is a legal override there and not here.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  select public.update_member(
    (select id from public.members where full_name = 'Anitha Rajesh Kumar'),
    'Anitha Rajesh Kumar',
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Postnatal Core'),
    array['Anitha  R.','Anita R']::text[],
    array['anitha.work@example.com']::text[],
    array[4]::smallint[]);
commit;

select t.eq((select count(*)::int from public.member_enrollments e
               join public.members m on m.id = e.member_id
              where m.full_name = 'Anitha Rajesh Kumar'), 2,
  'the old enrolment is KEPT — a move adds a row, it does not rewrite one');
select t.eq((select e.effective_to from public.member_enrollments e
               join public.members m on m.id = e.member_id
               join public.course_offerings o on o.id = e.offering_id
               join public.courses c on c.id = o.course_id
              where m.full_name = 'Anitha Rajesh Kumar' and c.name = 'Prenatal Flow'),
  current_date - 1,
  'the old one ends YESTERDAY — the ranges are inclusive and may not overlap');
select t.eq((select e.status from public.member_enrollments e
               join public.members m on m.id = e.member_id
               join public.course_offerings o on o.id = e.offering_id
               join public.courses c on c.id = o.course_id
              where m.full_name = 'Anitha Rajesh Kumar' and c.name = 'Prenatal Flow'), 'ended',
  'and is marked ended, so the engine stops expecting her there');
select t.eq((select e.effective_from from public.member_enrollments e
               join public.members m on m.id = e.member_id
               join public.course_offerings o on o.id = e.offering_id
               join public.courses c on c.id = o.course_id
              where m.full_name = 'Anitha Rajesh Kumar' and c.name = 'Postnatal Core'),
  current_date, 'the new one starts today');
select t.eq((select count(*)::int from public.member_enrollments e
               join public.members m on m.id = e.member_id
              where m.full_name = 'Anitha Rajesh Kumar' and e.status = 'active'), 1,
  'exactly one active enrolment — one offering at a time is the invariant');

select t.eq((select ms.weekdays from public.member_schedules ms
               join public.members m on m.id = ms.member_id
              where m.full_name = 'Anitha Rajesh Kumar' and ms.effective_to is null),
  array[4]::smallint[],
  'her own days are stored, and Thursday is legal at the NEW offering');

-- ================================================= back to following the course
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  select public.update_member(
    (select id from public.members where full_name = 'Anitha Rajesh Kumar'),
    'Anitha Rajesh Kumar',
    (select o.id from public.course_offerings o join public.courses c on c.id = o.course_id
      where c.name = 'Postnatal Core'),
    array['Anitha  R.','Anita R']::text[],
    array['anitha.work@example.com']::text[],
    null);
commit;

-- The override was written TODAY, so clearing it deletes the row rather than
-- ending it yesterday -- which `effective_to >= effective_from` forbids.
select t.eq((select count(*)::int from public.member_schedules ms
               join public.members m on m.id = ms.member_id
              where m.full_name = 'Anitha Rajesh Kumar' and ms.effective_to is null), 0,
  'blank days means she follows the course again — no standing override');

-- ============================================================== the gate
select t.rejects($$
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000001';
  select public.update_member(
    '00000000-0000-0000-0000-000000000000'::uuid, 'Nobody',
    (select id from public.course_offerings limit 1),
    '{}'::text[], '{}'::text[], null)$$,
  'a member who is not on the register is refused', 'not on the register');

select t.rejects($$
  set local role anon;
  select public.update_member(
    (select id from public.members limit 1), 'Anitha Rajesh Kumar',
    (select id from public.course_offerings limit 1),
    '{}'::text[], '{}'::text[], null)$$,
  'anon may not change a member at all', 'permission denied');

-- The ACT is recorded, which no per-row audit trigger can see: one person
-- changed one member, once.
select t.ok(exists (select 1 from public.audit_logs
             where action = 'member.updated'
               and actor_app_user_id = 'ffffffff-1111-0000-0000-000000000001'),
  'the change is attributed to the person who made it, not to "System"');
