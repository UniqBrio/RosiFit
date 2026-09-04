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
import { normalizeName, similarity } from '../_shared/match.ts';
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

  const { count: dupCount } = await admin.from('csv_imports')
    .select('id', { count: 'exact', head: true }).eq('file_sha256', fileSha256).eq('status', 'completed');
  if (dupCount && dupCount > 0) throw new HttpError(409, 'This file has already been imported.');

  // A DIFFERENT file for a day already imported. Not refused -- a corrected
  // export is a real thing and the commit resolves it member by member -- but
  // never silent either: one session per offering per day is a database
  // invariant, so this file will UPDATE that register rather than add to it,
  // and the person deciding has to be told before she decides.
  const { data: already } = await admin.from('csv_imports')
    .select('id, file_name, completed_at').eq('offering_id', offeringId)
    .eq('session_date', sessionDate).eq('status', 'completed')
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

  const rows = kept.map((r, i) => {
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

    let kind: MatchKind;
    if (candidateIds.length === 0) kind = 'unmatched';
    else if (candidateIds.length > 1) kind = 'ambiguous';
    else if (tier === 'fuzzy') kind = 'possible';       // never auto-accepted (C-79)
    else kind = hasEmail.has(candidateIds[0]) ? 'matched' : 'noEmail';

    const candidates = candidateIds.map(id => {
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
        // why THIS candidate is being offered, in one line
        hint: tier === 'alias' ? 'Matched on a confirmed display name'
            : tier === 'canonical' ? 'Matched on her canonical name'
            : 'Fuzzy match — nothing is assumed',
        hint_tone: tier === 'fuzzy' ? 'unsure' : 'sure',
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

  const { data: inserted, error: insErr } = await admin.from('csv_imports').insert({
    file_name: fileName, file_sha256: fileSha256, offering_id: offeringId, session_date: sessionDate,
    row_count: rawRows.length, matched_count: counts.matched, unmatched_count: counts.unmatched,
    ambiguous_count: counts.ambiguous, possible_count: counts.possible, missing_email_count: counts.noEmail,
    duplicates_in_file: duplicatesInFile, status: 'previewed',
    meeting_code: meetingCode, meeting_started_at: meetingStartedAt,
    summary: {
      rows, dropped_count: dropped.length,
      dropped_names: dropped.map(r => r.full_name).filter(Boolean),
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
      row_count: rawRows.length, dropped: dropped.length,
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
