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

const MIN_MINUTES = 15;
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
  const rawRows: RawRow[] = Array.isArray(body.rows) ? body.rows as RawRow[] : [];

  if (!offeringId) throw new HttpError(400, 'Choose the session this file belongs to.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) throw new HttpError(400, 'Choose a session date.');
  if (!fileSha256) throw new HttpError(400, 'The file could not be fingerprinted.');
  if (rawRows.length === 0) throw new HttpError(400, 'The file has no rows to import.');

  const { data: offering, error: offErr } = await admin
    .from('course_offerings').select('id, branch_id').eq('id', offeringId).maybeSingle();
  if (offErr || !offering) throw new HttpError(404, 'That session offering was not found.');

  const { count: dupCount } = await admin.from('csv_imports')
    .select('id', { count: 'exact', head: true }).eq('file_sha256', fileSha256).eq('status', 'completed');
  if (dupCount && dupCount > 0) throw new HttpError(409, 'This file has already been imported.');

  const dropped = rawRows.filter(r => (r.minutes_in_call ?? 0) < MIN_MINUTES);
  const kept = rawRows.filter(r => (r.minutes_in_call ?? 0) >= MIN_MINUTES);

  const { data: aliases } = await admin.from('member_aliases')
    .select('member_id, alias_normalized').eq('alias_type', 'name');
  const { data: members } = await admin.from('members')
    .select('id, member_code, full_name, name_normalized').is('deleted_at', null);
  const { data: primaryEmails } = await admin.from('member_emails')
    .select('member_id').eq('is_primary', true).is('deleted_at', null).neq('status', 'bounced');

  const hasEmail = new Set((primaryEmails ?? []).map(e => e.member_id as string));
  const memberById = new Map((members ?? []).map(m => [m.id as string, m]));

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
      return { member_id: id, full_name: m.full_name, member_code: m.member_code, has_email: hasEmail.has(id) };
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
    summary: { rows, dropped_count: dropped.length }, uploaded_by: actorId,
  }).select('id').single();
  if (insErr || !inserted) throw new HttpError(500, 'Could not stage this import.');

  await admin.rpc('audit_log', {
    p_action: 'csv_import.previewed', p_entity_type: 'csv_import', p_entity_id: inserted.id,
    p_metadata: { row_count: rawRows.length, dropped: dropped.length, ...counts },
  });

  return json({ import_id: inserted.id, rows, dropped_count: dropped.length, counts });
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
