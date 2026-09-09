// csv-import: Google Meet CSV -> the five A-E outcomes -> atomic import.
// Authenticated (any active staff). Two actions:
//   'preview' -- classify every row, stage it in csv_imports, return it for
//                on-screen review. Nothing else is written yet.
//   'commit'  -- apply the operator's decisions ATOMICALLY via
//                commit_csv_import() (0014): all rows land, or none do.
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { requireCaller } from '../_shared/authz.ts';
import { normalizeName, similarity, splitByCourse } from '../_shared/match.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

/**
 * THERE IS NO MINUTES FLOOR.
 *
 * This was 15: anybody in the call for less was dropped before matching, so a
 * member who reconnected, joined from a phone, or was marked by Meet at 32
 * seconds simply did not appear -- and the register said she was absent from
 * a class she attended.
 *
 * Time in call decides NOTHING now. Being named in the file is the evidence;
 * the duration is recorded alongside it for the record and read by nobody.
 * The rule the academy asked for is simpler and truer to what the file says:
 * one person, one session, one day.
 */
const FUZZY_THRESHOLD = 0.90;

type RawRow = { full_name: string; first_seen?: string; minutes_in_call: number };
type MatchKind = 'matched' | 'noEmail' | 'possible' | 'ambiguous' | 'unmatched';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
    const caller = await requireCaller(req);
    const body = await req.json().catch(() => ({}));
    const admin = adminClient();

    if (String(body.action ?? 'preview') === 'commit') return await commit(admin, caller.id, body);
    return await preview(admin, caller.id, body);
  } catch (err) {
    return errorJson(err);
  }
});

async function preview(admin: SupabaseClient, actorId: string, body: Record<string, unknown>) {
  const offeringId = String(body.offering_id ?? '');
  const sessionDate = String(body.session_date ?? '');
  const fileName = String(body.file_name ?? 'upload.csv');
  const fileSha256 = String(body.file_sha256 ?? '');
  // The meeting the file came from. Meet writes both above the table, and
  // together they are what identifies the SESSION -- which is why the date
  // below is derived from the file rather than picked from a list of
  // sessions somebody scheduled in advance.
  const meetingCode = String(body.meeting_code ?? '').trim() || null;
  const meetingStartedAt = String(body.meeting_started_at ?? '').trim() || null;
  const rawRows: RawRow[] = Array.isArray(body.rows) ? body.rows as RawRow[] : [];

  if (!offeringId) throw new HttpError(400, 'Choose the course this file belongs to.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    throw new HttpError(400,
      'This file carries no date, so RosiFit cannot tell which day it covers. ' +
      'Pick the date yourself, or use an export that has the “Created on” line.');
  }
  if (!fileSha256) throw new HttpError(400, 'The file could not be fingerprinted.');
  if (rawRows.length === 0) throw new HttpError(400, 'The file has no rows to import.');

  const { data: offering, error: offErr } = await admin
    .from('course_offerings').select('id, branch_id').eq('id', offeringId).maybeSingle();
  if (offErr || !offering) throw new HttpError(404, 'That session offering was not found.');

  // THE SAME FILE, BYTE FOR BYTE, A SECOND TIME.
  //
  // This was `409 · "This file has already been imported."` -- true, and the
  // whole of what anybody was told. The screen paints a 409 in the red
  // failure panel and appends "Nothing was written.", so an operator who
  // re-uploaded the file she already sent -- because she was not sure it went
  // through, which is the only reason anybody does this -- read a failure and
  // still did not know whether the attendance was marked.
  //
  // Nothing is wrong here and nothing needs doing, so this answers with WHAT
  // THE EARLIER IMPORT DID instead of a refusal: which file, which register,
  // and how many women are marked on it right now. The screen turns that into
  // "there is nothing to update" (src/data/uploadOutcome.ts).
  //
  // It still writes nothing and stages nothing -- the early return is above
  // the csv_imports insert -- so a second upload cannot duplicate an
  // attendance record by any path. csv_imports_sha_completed (0008) is the
  // structural half of the same rule and is unchanged.
  const { data: sameFile } = await admin.from('csv_imports')
    .select('id, file_name, session_date, completed_at, session_id, offering_id')
    .eq('file_sha256', fileSha256).eq('status', 'completed')
    .order('completed_at', { ascending: false }).limit(1);
  const earlier = sameFile?.[0];
  if (earlier) {
    // WHAT THE REGISTER SAYS NOW, not what the import said then. "Attendance
    // is already marked" is a claim about today, and a session somebody
    // deleted or a mark somebody changed since would make it false.
    let marked = 0;
    let registerLive = false;
    if (earlier.session_id) {
      const { data: session } = await admin.from('sessions')
        .select('id').eq('id', earlier.session_id).is('deleted_at', null).maybeSingle();
      registerLive = !!session;
      if (registerLive) {
        const { count } = await admin.from('attendance_records')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', earlier.session_id).is('deleted_at', null)
          .in('status', ['present', 'extra']);
        marked = count ?? 0;
      }
    }
    // WHICH COURSE it landed in, named. The fingerprint is unique across the
    // whole table, so the file may well have gone to a DIFFERENT course from
    // the one she has open -- and "already imported" without saying where is
    // exactly the sentence that sends somebody hunting.
    const { data: earlierOffering } = await admin.from('course_offerings')
      .select('id, course_id, branch_id').eq('id', earlier.offering_id).maybeSingle();
    const { data: earlierCourse } = earlierOffering
      ? await admin.from('courses').select('name').eq('id', earlierOffering.course_id).maybeSingle()
      : { data: null };
    const { data: earlierBranch } = earlierOffering
      ? await admin.from('branches').select('name').eq('id', earlierOffering.branch_id).maybeSingle()
      : { data: null };

    const alreadyImported = {
      file_name: earlier.file_name as string,
      completed_at: earlier.completed_at as string,
      session_date: earlier.session_date as string,
      course_name: (earlierCourse?.name as string) ?? '—',
      branch_name: (earlierBranch?.name as string) ?? '—',
      same_course: earlier.offering_id === offeringId,
      marked,
      register_live: registerLive,
    };

    await admin.rpc('audit_log_as', {
      p_actor: actorId,
      p_action: 'csv_import.already_imported', p_entity_type: 'csv_import', p_entity_id: earlier.id,
      p_metadata: {
        file_name: fileName, file_sha256: fileSha256, offering_id: offeringId,
        session_date: sessionDate, marked, register_live: registerLive,
      },
    });

    // A 200 carrying an empty import: there is nothing staged to commit, and
    // the client reads `already_imported` before anything else.
    return json({
      import_id: '', rows: [], dropped_count: 0, dropped_names: [], staff_names: [],
      other_course_names: [],
      counts: { matched: 0, noEmail: 0, possible: 0, ambiguous: 0, unmatched: 0 },
      meeting_code: meetingCode, session_date: sessionDate, supersedes: null,
      already_imported: alreadyImported,
    });
  }

  // A DIFFERENT file for THE SAME MEETING on a day already imported. Not
  // refused -- a corrected export is a real thing and the commit resolves it
  // member by member -- but never silent either: it will REPLACE what its
  // earlier version wrote, and the person deciding has to be told first.
  //
  // Scoped to the meeting INSTANCE -- the code AND the created-on timestamp
  // (0042, narrowed by 0044). A course may run several meetings a day, each
  // with its own members and its own file, and they all land on the one
  // session for that day. A second meeting's file is not a correction of the
  // first's: it supersedes nothing, and commit_csv_import's override -- keyed
  // on the same pair -- leaves the other meeting's rows exactly as they were.
  //
  // THE CODE ALONE WAS NOT ENOUGH, which is why the timestamp joins it here.
  // The code is the Meet LINK, so a course that keeps one link writes the same
  // code on every export and two genuine meetings read as a file and its
  // correction; a file with no code line at all matched every other code-less
  // file for that day. The created-on line is the CALL, and a re-export of one
  // call carries the same one.
  //
  // THIS QUERY AND THE OVERRIDE MUST AGREE ON SCOPE. The dialog it feeds says
  // the register "is replaced by what this file says" -- so asking it on a
  // wider scope than commit_csv_import overrides on would put a warning about
  // something that is not going to happen in front of an ordinary second
  // upload, which is how a person learns to click past the one that matters.
  const alreadyQuery = admin.from('csv_imports')
    .select('id, file_name, completed_at').eq('offering_id', offeringId)
    .eq('session_date', sessionDate).eq('status', 'completed');
  const sameCode = meetingCode
    ? alreadyQuery.eq('meeting_code', meetingCode)
    : alreadyQuery.is('meeting_code', null);
  // The literal is sent as the insert below stores it, so both go through the
  // same timestamptz cast and are compared as instants, never as text.
  const { data: already } = await (meetingStartedAt
      ? sameCode.eq('meeting_started_at', meetingStartedAt)
      : sameCode.is('meeting_started_at', null))
    .order('completed_at', { ascending: false }).limit(1);
  const supersedes = already?.[0]
    ? { file_name: already[0].file_name as string, completed_at: already[0].completed_at as string }
    : null;

  // ONE PERSON, ONE ROW. Meet writes a line per JOIN, so anybody whose
  // connection dropped appears twice -- and attendance_unique_live is one
  // record per member per session. Collapsed here, on the NORMALISED name, so
  // the count the review screen shows is the count that will be written.
  // Named, never silently dropped: a file that says 14 rows and imports 12
  // has to say which two and why.
  const seen = new Map<string, RawRow>();
  const dropped: RawRow[] = [];
  for (const r of rawRows) {
    const key = normalizeName(r.full_name ?? '');
    if (!key) { dropped.push(r); continue; }
    if (seen.has(key)) { dropped.push(r); continue; }
    seen.set(key, r);
  }
  const kept = [...seen.values()];
  if (kept.length === 0) {
    throw new HttpError(400, 'Every row in that file is blank or a repeat of another. Nothing to import.');
  }

  /**
   * WHOEVER RAN THE CLASS IS NOT ON THE REGISTER.
   *
   * A Meet file is a list of everybody who was in the call, and that always
   * includes the instructor. She is not a member, so every match tier misses
   * her: she comes out `unmatched`. While the operator answered row by row
   * that was harmless -- "Not a member" left her out. Once the file imports
   * on the pick there is nobody to ask, and an unmatched row becomes a new
   * member: created the first week, then MATCHED every week after that, and
   * marked present in every register for a class she teaches.
   *
   * Attendance is for members. The academy already says who its staff are,
   * so the file does not have to: a row whose name is a staff name is set
   * aside here and never reaches the matcher.
   *
   * WHY THIS CANNOT BE DONE ON THE CLIENT: app_users_read (0013) is
   * `is_super_admin() or your own row`, so an instructor uploading her own
   * register would read a staff list of one and the filter would apply to
   * some operators and not others -- the same file importing differently
   * depending on who pressed the button. Here it runs with the service role,
   * so it runs the same for everybody.
   *
   * Set aside is NOT dropped: `dropped` means blank or repeated, and saying
   * "1 row dropped" about the person who taught the class explains nothing.
   * These are named separately and the screen says why.
   */
  const { data: staffRows } = await admin.from('app_users')
    .select('name').is('deleted_at', null);
  const staffNames = new Set(
    (staffRows ?? []).map(u => normalizeName((u.name as string) ?? '')).filter(Boolean));
  const staff: RawRow[] = [];
  const attendees: RawRow[] = [];
  for (const r of kept) {
    if (staffNames.has(normalizeName(r.full_name ?? ''))) staff.push(r);
    else attendees.push(r);
  }
  if (attendees.length === 0) {
    throw new HttpError(400,
      'Every name in that file belongs to a staff member, so there is no attendance to import.');
  }

  const { data: aliases } = await admin.from('member_aliases')
    .select('member_id, alias_display, alias_normalized').eq('alias_type', 'name');
  const { data: members } = await admin.from('members')
    .select('id, full_name, name_normalized').is('deleted_at', null);
  // The ADDRESS, not just whether there is one: with the member code retired
  // it is what tells two same-named candidates apart on the review screen.
  const { data: primaryEmails } = await admin.from('member_emails')
    .select('member_id, email').eq('is_primary', true).is('deleted_at', null).neq('status', 'bounced');
  const { data: stats } = await admin.from('member_stats').select('member_id, last_present_date');

  const hasEmail = new Set((primaryEmails ?? []).map(e => e.member_id as string));
  const emailBy = new Map((primaryEmails ?? []).map(e => [e.member_id as string, e.email as string]));
  const memberById = new Map((members ?? []).map(m => [m.id as string, m]));
  const lastPresentBy = new Map((stats ?? []).map(s => [s.member_id as string, s.last_present_date as string | null]));

  // Who she is, in the words the review screen shows: course, branch and the
  // display names already known for her. Outcome C is the prompt that stops
  // a duplicate being created, and it can only do that if the person
  // deciding can see who the candidate actually is.
  const { data: enrollments } = await admin.from('member_enrollments')
    .select('member_id, offering_id').eq('status', 'active');
  const offeringIds = [...new Set((enrollments ?? []).map(e => e.offering_id as string))];
  const zero = '00000000-0000-0000-0000-000000000000';
  const { data: offeringRows } = await admin.from('course_offerings')
    .select('id, course_id, branch_id').in('id', offeringIds.length ? offeringIds : [zero]);
  const courseIds = [...new Set((offeringRows ?? []).map(o => o.course_id as string))];
  const branchIds = [...new Set((offeringRows ?? []).map(o => o.branch_id as string))];
  const { data: courseRows } = await admin.from('courses').select('id, name')
    .in('id', courseIds.length ? courseIds : [zero]);
  const { data: branchRows } = await admin.from('branches').select('id, name')
    .in('id', branchIds.length ? branchIds : [zero]);

  const offeringById = new Map((offeringRows ?? []).map(o => [o.id as string, o]));
  const courseNameById = new Map((courseRows ?? []).map(c => [c.id as string, c.name as string]));
  const branchNameById = new Map((branchRows ?? []).map(b => [b.id as string, b.name as string]));
  const offeringByMember = new Map((enrollments ?? []).map(e => [e.member_id as string, e.offering_id as string]));
  const aliasNamesByMember = new Map<string, string[]>();
  for (const a of aliases ?? []) {
    const list = aliasNamesByMember.get(a.member_id as string) ?? [];
    list.push(a.alias_display as string);
    aliasNamesByMember.set(a.member_id as string, list);
  }

  const rows = attendees.map((r, i) => {
    const normalized = normalizeName(r.full_name);
    let candidateIds: string[] = [];
    let tier: 'alias' | 'canonical' | 'fuzzy' | 'none' = 'none';

    const aliasHit = (aliases ?? []).filter(a => a.alias_normalized === normalized);
    if (aliasHit.length > 0) {
      candidateIds = [...new Set(aliasHit.map(a => a.member_id as string))];
      tier = 'alias';
    } else {
      const canonicalHit = (members ?? []).filter(m => m.name_normalized === normalized);
      if (canonicalHit.length > 0) {
        candidateIds = canonicalHit.map(m => m.id as string);
        tier = 'canonical';
      } else {
        const scored = (members ?? [])
          .map(m => ({ id: m.id as string, score: similarity(normalized, (m.name_normalized as string) ?? '') }))
          .filter(s => s.score >= FUZZY_THRESHOLD)
          .sort((a, b) => b.score - a.score);
        if (scored.length > 0) {
          candidateIds = [...new Set(scored.map(s => s.id))];
          tier = 'fuzzy';
        }
      }
    }

    /**
     * THE NAME IS NOT THE IDENTITY -- THE NAME AND THE COURSE ARE.
     *
     * Everything above asks the academy "is there a member called this",
     * which is a wider question than the one being answered: this file is
     * the register of ONE offering, and a member has one live enrolment
     * (0006). A candidate enrolled in another course is therefore not a
     * member of this one, and taking her as an exact `matched` hit marked
     * the wrong woman present -- the Prenatal member, on the Postnatal
     * register -- with nothing on any screen saying it had happened, since
     * `matched` is accepted without asking anybody (autoDecisions).
     *
     * So the candidates are split, and only the ones this course could
     * actually claim decide the kind. `elsewhere` is kept and offered
     * AFTER them: the commit reads candidates[0] for a matched row, so a
     * member of another course must never be able to sit first, but she is
     * still worth showing -- she is what makes the row's
     * `confirm_different_person` a real acknowledgement, and she is the name
     * the result screen puts in front of the operator so a woman who really
     * has moved course can be folded in by hand (0032).
     */
    const { here, elsewhere } = splitByCourse(
      candidateIds, id => offeringByMember.get(id) ?? null, offeringId);

    let kind: MatchKind;
    if (here.length === 0) kind = 'unmatched';
    else if (here.length > 1) kind = 'ambiguous';
    else if (tier === 'fuzzy') kind = 'possible';       // never auto-accepted (C-79)
    else kind = hasEmail.has(here[0]) ? 'matched' : 'noEmail';

    const candidates = [...here, ...elsewhere].map(id => {
      const m = memberById.get(id)!;
      const offering = offeringById.get(offeringByMember.get(id) ?? '');
      return {
        member_id: id,
        full_name: m.full_name as string,
        has_email: hasEmail.has(id),
        primary_email: emailBy.get(id) ?? '',
        course_name: offering ? (courseNameById.get(offering.course_id as string) ?? '—') : '—',
        branch_name: offering ? (branchNameById.get(offering.branch_id as string) ?? '—') : '—',
        aliases: aliasNamesByMember.get(id) ?? [],
        last_present_date: lastPresentBy.get(id) ?? null,
        // why THIS candidate is being offered, in one line. A candidate from
        // another course is offered for a DIFFERENT reason from the rest --
        // not "this is probably her" but "this is the name you collided
        // with" -- so she says so rather than borrowing the tier's wording,
        // which would read as a match that was then quietly ignored.
        hint: elsewhere.includes(id)
              ? `Same name, but she is enrolled in ${
                  offering ? (courseNameById.get(offering.course_id as string) ?? 'another course') : 'another course'
                } — not this one`
            : tier === 'alias' ? 'Matched on a confirmed display name'
            : tier === 'canonical' ? 'Matched on the canonical name'
            : 'Fuzzy match — nothing is assumed',
        hint_tone: elsewhere.includes(id) || tier === 'fuzzy' ? 'unsure' : 'sure',
      };
    });

    return {
      row: i + 1, kind, raw_name: r.full_name, first_seen: r.first_seen ?? null,
      minutes: r.minutes_in_call, candidates,
    };
  });

  const counts = {
    matched: rows.filter(r => r.kind === 'matched').length,
    noEmail: rows.filter(r => r.kind === 'noEmail').length,
    possible: rows.filter(r => r.kind === 'possible').length,
    ambiguous: rows.filter(r => r.kind === 'ambiguous').length,
    unmatched: rows.filter(r => r.kind === 'unmatched').length,
  };
  const duplicatesInFile = rawRows.length - new Set(rawRows.map(r => normalizeName(r.full_name))).size;

  /**
   * THE NAMES THIS FILE COLLIDED WITH, NAMED.
   *
   * A row whose only candidates belong to another course is filed as somebody
   * new here -- which is the right call (a wrong CREATE is visible and two
   * taps to undo; a wrong LINK is invisible and permanent), but it is still a
   * call, and it is the one place this import can be wrong about a woman who
   * genuinely moved from Prenatal to Postnatal.
   *
   * Counted silently it would be the same defect wearing the other face: a
   * duplicate member nobody knows to fold in. So it goes back with the names,
   * for the same reason dropped_names and staff_names do.
   */
  const otherCourseNames = rows
    .filter(r => r.kind === 'unmatched' && r.candidates.length > 0)
    .map(r => r.raw_name).filter(Boolean);

  const { data: inserted, error: insErr } = await admin.from('csv_imports').insert({
    file_name: fileName, file_sha256: fileSha256, offering_id: offeringId, session_date: sessionDate,
    row_count: rawRows.length, matched_count: counts.matched, unmatched_count: counts.unmatched,
    ambiguous_count: counts.ambiguous, possible_count: counts.possible, missing_email_count: counts.noEmail,
    duplicates_in_file: duplicatesInFile, status: 'previewed',
    meeting_code: meetingCode, meeting_started_at: meetingStartedAt,
    summary: {
      rows, dropped_count: dropped.length,
      dropped_names: dropped.map(r => r.full_name).filter(Boolean),
      other_course_names: otherCourseNames,
      supersedes,
    },
    uploaded_by: actorId,
  }).select('id').single();
  if (insErr || !inserted) throw new HttpError(500, 'Could not stage this import.');

  // audit_log_as, not audit_log: this runs on the SERVICE-ROLE client, where
  // auth.uid() is null, so audit_log() would write a null actor and the audit
  // screen would say "System" for an upload a named person made. actorId is
  // already verified above -- the log was the only place throwing it away.
  await admin.rpc('audit_log_as', {
    p_actor: actorId,
    p_action: 'csv_import.previewed', p_entity_type: 'csv_import', p_entity_id: inserted.id,
    p_metadata: {
      row_count: rawRows.length, dropped: dropped.length, staff: staff.length,
      meeting_code: meetingCode, session_date: sessionDate,
      superseded: supersedes !== null, ...counts,
    },
  });

  return json({
    import_id: inserted.id, rows, counts,
    dropped_count: dropped.length,
    // NAMED, not just counted. "2 rows dropped" is a number somebody has to
    // take on trust; the names are what lets her check.
    dropped_names: dropped.map(r => r.full_name).filter(Boolean),
    // Set aside because they are staff, not because anything was wrong with
    // the row. Named for the same reason the dropped ones are: leaving the
    // instructor off the register silently is how somebody concludes the
    // import missed her.
    staff_names: staff.map(r => r.full_name).filter(Boolean),
    // Filed as somebody new because the only member of that name is enrolled
    // in ANOTHER course. Named for the third time for the same reason: this
    // is the one row the import had to make a judgement about, and a
    // judgement nobody is told about is a judgement nobody can correct.
    other_course_names: otherCourseNames,
    meeting_code: meetingCode,
    session_date: sessionDate,
    supersedes,
  });
}

async function commit(admin: SupabaseClient, actorId: string, body: Record<string, unknown>) {
  const importId = String(body.import_id ?? '');
  const decisions = Array.isArray(body.decisions) ? body.decisions : [];
  if (!importId) throw new HttpError(400, 'Missing import_id.');

  const { data, error } = await admin.rpc('commit_csv_import', {
    p_import_id: importId, p_actor: actorId, p_decisions: decisions,
  });
  // commit_csv_import's own RAISE EXCEPTION messages are already written for
  // an operator reading a row-level problem ("row 47 (possible) needs a
  // decision...") -- pass them straight through rather than a generic 500.
  if (error) throw new HttpError(400, error.message);
  return json(data);
}
