-- 0038_repoint_stale_course_senders.sql
--
-- A DATA migration, and the one thing standing between 0036 and a working
-- send. Read this before applying 0036 to any environment that has rows.
--
-- WHAT IS ON PRODUCTION, MEASURED 07-Sep-2026
--   Nine courses carry their own from-address, and eight of them hold an
--   address the academy CANNOT SEND FROM:
--
--     support@rosifit.com          7 courses
--     support@ravisfit.com         1 course
--     support@getfit.rosifit.com   1 course   <- the only usable one
--
--   Those first two are the FIXTURE addresses from src/data/mock.ts, offered
--   by the course form's picker for as long as the picker existed (TD-016).
--   Neither rosifit.com nor ravisfit.com is a verified identity in SES. Only
--   the getfit.* subdomains are.
--
-- WHY THIS IS URGENT RATHER THAN TIDY
--   Until 07-Sep-2026 those eight values were harmless BECAUSE THEY WERE
--   IGNORED: send-followups called SES with SES_FROM_ADDRESS and never read
--   this column, so a course "set to" an address nobody owns still sent from
--   the deployment's own address and still arrived.
--
--   The moment the new send-followups is deployed, they stop being ignored.
--   Each is well-formed, so chooseFromAddress ACCEPTS it and hands it to SES,
--   and SES refuses it -- the sending domain is not verified. Eight of nine
--   configured courses would go from silently-working to every-message-failed,
--   and the cause would look like the new code rather than eight-day-old data.
--
--   So this is not cleanup that can follow the deploy. It has to LEAD it.
--
-- WHAT IT DOES, AND WHAT IT DELIBERATELY DOES NOT
--   Each course keeps the BRAND it chose and moves to that brand's verified
--   subdomain: rosifit -> getfit.rosifit, ravisfit -> getfit.ravisfit. The one
--   course already on getfit.rosifit.com is not touched. Nobody's choice is
--   overridden -- ravisfit stays ravisfit -- because silently consolidating
--   everything onto one address would discard the intent this whole change
--   exists to honour.
--
--   The two literals are spelled out rather than matched by pattern. A
--   `like '%@rosifit.com'` would also rewrite an address nobody has audited,
--   and this runs against real rows once.
--
--   Idempotent: re-running matches nothing, because the old values are gone.

update public.course_communication
   set from_email = 'support@getfit.rosifit.com'
 where from_email = 'support@rosifit.com';

update public.course_communication
   set from_email = 'support@getfit.ravisfit.com'
 where from_email = 'support@ravisfit.com';

-- A LOUD FAILURE rather than a quiet partial one. If any course is still on a
-- domain SES will refuse, applying this must stop and say so: the next step
-- after it is a deploy that turns exactly those rows into failed sends.
-- Anything left here is an address nobody anticipated, and it needs a person.
do $$
declare v_left int; v_addrs text;
begin
  select count(*), coalesce(string_agg(distinct from_email, ', '), '')
    into v_left, v_addrs
    from public.course_communication
   -- UNWRAP THE DISPLAY FORM, THEN MATCH THE END. Neither half is optional.
   -- `Academy <support@getfit.rosifit.com>` is a form SES accepts and
   -- isFromAddress allows, so a bare ends-with would stop the apply over a
   -- perfectly good row. A bare CONTAINS is worse in the other direction:
   -- `support@getfit.rosifit.com.example.net` contains the verified domain
   -- and is a different domain entirely, and a guard that waves that through
   -- reads as proof while proving nothing. Written first as a CONTAINS here;
   -- supabase/tests/30_verified_course_senders.sql is what caught it.
   where coalesce(substring(from_email from '<\s*([^<>]+?)\s*>'), from_email)
           not like '%@getfit.rosifit.com'
     and coalesce(substring(from_email from '<\s*([^<>]+?)\s*>'), from_email)
           not like '%@getfit.ravisfit.com';
  if v_left > 0 then
    raise exception
      '0038: % course(s) still send from an address outside the verified getfit domains: %. '
      'Deploying send-followups now would fail every message for them. Resolve before applying.',
      v_left, v_addrs;
  end if;
end $$;
