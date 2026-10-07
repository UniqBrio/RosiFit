// pin-verify -- SINGAPORE ONLY. Answers, for an authenticated server-to-server caller (Mumbai's
// auth-login and recovery-check), whether a PIN or recovery answers match a credential secured
// under THIS project's PIN_PEPPER. docs/security/PIN_PEPPER_MIGRATION.md has the design.
//
// verify_jwt = false in config.toml, because the caller is another project's Edge Function and has
// no session here. Its own door is stricter than a JWT: an HMAC over the exact body under
// PIN_VERIFY_KEY, a 60-second timestamp window and a single-use nonce (pinVerifyProtocol.ts).
// Unsigned, stale, replayed or forged requests get 401 and no body.
//
// MINIMUM RESULT: {"result": "valid" | "invalid" | "locked" | "disabled" | "not_found"} and
// nothing else -- no session, token, hash or derived value is ever returned.
//
// READ-ONLY on the application tables: it never changes failed_attempts, locked_until, the
// recovery rate limit or the audit log. Mumbai counts attempts; this only answers. Checking a PIN
// does sign in once through GoTrue (the only thing that can compare against the stored hash), and
// that session is ended before the answer is sent.
//
// It refuses to run anywhere but Singapore (404), so a stray deploy elsewhere is inert.
import { adminClient } from '../_shared/db.ts';
import { derivePinSecret, hashAnswer, syntheticEmail } from '../_shared/pin.ts';
import {
  checkSignedRequest, constantTimeEquals, MAX_SKEW_MS, SIGNATURE_HEADER, SINGAPORE_REF, type VerifyResult,
} from '../_shared/pinVerifyProtocol.ts';

/** The key recovery-check uses for its rate limit, so a locked recovery stays locked here too. */
const RECOVERY_RATE_KEY = (appUserId: string) => `recovery:${appUserId}`;

/** Best-effort replay guard within one isolate; the timestamp window bounds it across isolates. */
const seenNonces = new Map<string, number>();
function firstUse(nonce: string, now: number): boolean {
  for (const [n, expires] of seenNonces) if (expires < now) seenNonces.delete(n);
  if (seenNonces.has(nonce)) return false;
  seenNonces.set(nonce, now + 2 * MAX_SKEW_MS);
  return true;
}

function answer(status: number, result?: VerifyResult): Response {
  return new Response(result ? JSON.stringify({ result }) : null, {
    status,
    headers: result
      ? { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      : { 'Cache-Control': 'no-store' },
  });
}

function onSingapore(): boolean {
  try {
    return new URL(Deno.env.get('SUPABASE_URL') ?? '').host === `${SINGAPORE_REF}.supabase.co`;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (!onSingapore()) return answer(404);
  if (req.method !== 'POST') return answer(405);

  const now = Date.now();
  const raw = await req.text();
  const checked = await checkSignedRequest(Deno.env.get('PIN_VERIFY_KEY'), raw, req.headers.get(SIGNATURE_HEADER), now);
  if (!checked.ok) return answer(checked.reason === 'no_key' ? 503 : 401);
  if (!firstUse(checked.request.nonce, now)) return answer(401);
  const r = checked.request;

  try {
    const admin = adminClient();
    const { data: user, error } = await admin.from('app_users')
      .select('id, kind, is_active, locked_until, deleted_at')
      .eq('id', r.app_user_id).maybeSingle();
    if (error) return answer(500);
    if (!user || user.deleted_at) return answer(200, 'not_found');

    if (r.kind === 'pin') {
      if (!user.is_active) return answer(200, 'disabled');
      if (user.locked_until && new Date(user.locked_until).getTime() > now) return answer(200, 'locked');
      const password = await derivePinSecret(user.id, r.pin);
      const { data, error: signInErr } = await admin.auth.signInWithPassword({ email: syntheticEmail(user.id), password });
      if (signInErr || !data.session) return answer(200, 'invalid');
      // A verification, not a sign-in: the session must not outlive this request.
      const { error: outErr } = await admin.auth.admin.signOut(data.session.access_token, 'local');
      if (outErr) console.error('[pin-verify] verification session could not be ended (it expires on its own)');
      return answer(200, 'valid');
    }

    // kind === 'recovery' -- the same population recovery-check serves: super admins.
    if (user.kind !== 'super_admin') return answer(200, 'not_found');
    const { data: limit } = await admin.from('auth_rate_limits')
      .select('blocked_until').eq('key', RECOVERY_RATE_KEY(user.id)).maybeSingle();
    if (limit?.blocked_until && new Date(limit.blocked_until).getTime() > now) return answer(200, 'locked');
    const { data: rows, error: recErr } = await admin.from('super_admin_recovery')
      .select('question_id, answer_hash').eq('app_user_id', user.id);
    if (recErr) return answer(500);
    if (!rows || rows.length === 0) return answer(200, 'not_found');
    const byQuestion = new Map(rows.map((x: { question_id: number; answer_hash: string }) => [x.question_id, x.answer_hash]));
    let all = true;
    for (const a of r.answers) {
      const expected = byQuestion.get(a.question_id);
      const actual = expected ? await hashAnswer(user.id, a.answer) : '';
      if (!expected || !constantTimeEquals(actual, expected)) all = false;
    }
    return answer(200, all ? 'valid' : 'invalid');
  } catch (err) {
    console.error(`[pin-verify] check failed (${err instanceof Error ? err.name : 'error'})`);
    return answer(500);
  }
});
