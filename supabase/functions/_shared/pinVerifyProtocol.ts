/**
 * The authenticated, server-to-server PIN / recovery-answer check between Mumbai and Singapore.
 * docs/security/PIN_PEPPER_MIGRATION.md has the whole design.
 *
 * WHY IT EXISTS. Production moves to Mumbai with a new PIN_PEPPER and the old one cannot be read
 * back. Singapore's runtime still holds it, so Singapore -- and only Singapore -- can say whether a
 * PIN or recovery answer matches a credential secured under it. This file is the contract both
 * sides speak: Mumbai (the caller, `pinVerifyClient.ts`) and Singapore (the verifier, `pin-verify`).
 *
 * AUTHENTICATION. HMAC-SHA256, keyed by PIN_VERIFY_KEY -- a NEW random secret held only by the
 * two projects' Edge Function secrets -- over a domain-separated copy of the EXACT request body.
 * The body carries a millisecond timestamp (accepted within MAX_SKEW_MS either way) and a random
 * nonce (the verifier refuses a nonce it has already seen). A request without a valid signature
 * learns nothing: the verifier answers 401 with no body.
 *
 * MINIMUM RESULT. The verifier answers one word. Never a session, a token, a hash or a derived
 * secret -- there is no field in the protocol that could carry one.
 *
 * PURE and free of Deno globals, so src/data tests run this exact file.
 */

export const SINGAPORE_REF = 'lhpzhkzbnquwjljmbylo';
export const SINGAPORE_PIN_VERIFY_URL = `https://${SINGAPORE_REF}.supabase.co/functions/v1/pin-verify`;
export const SIGNATURE_HEADER = 'x-rosifit-signature';
export const MAX_SKEW_MS = 60_000;
export const MIN_KEY_LENGTH = 32;
const DOMAIN = 'rosifit-pin-verify/v1\n';

export type VerifyResult = 'valid' | 'invalid' | 'locked' | 'disabled' | 'not_found';
export const VERIFY_RESULTS: readonly VerifyResult[] = ['valid', 'invalid', 'locked', 'disabled', 'not_found'];

export type RecoveryAnswer = { question_id: number; answer: string };
export type VerifyRequest =
  | { v: 1; kind: 'pin'; app_user_id: string; pin: string; ts: number; nonce: string }
  | { v: 1; kind: 'recovery'; app_user_id: string; answers: RecoveryAnswer[]; ts: number; nonce: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NONCE = /^[0-9a-f]{32,64}$/;

export function keyUsable(key: string | undefined | null): key is string {
  return typeof key === 'string' && key.length >= MIN_KEY_LENGTH;
}

async function hmacHex(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Equal-length comparison that does not stop at the first difference. */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function signBody(key: string, rawBody: string): Promise<string> {
  return hmacHex(key, DOMAIN + rawBody);
}

export function newNonce(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** What Mumbai sends. The body string returned is the one that is signed AND sent, byte for byte. */
export async function buildSignedRequest(
  key: string,
  payload: { kind: 'pin'; app_user_id: string; pin: string } | { kind: 'recovery'; app_user_id: string; answers: RecoveryAnswer[] },
  now: number = Date.now(),
  nonce: string = newNonce(),
): Promise<{ body: string; signature: string }> {
  const body = JSON.stringify({ v: 1, ...payload, ts: now, nonce });
  return { body, signature: await signBody(key, body) };
}

export type Checked =
  | { ok: true; request: VerifyRequest }
  | { ok: false; reason: 'no_key' | 'unsigned' | 'bad_signature' | 'malformed' | 'stale' };

/**
 * The verifier's gate. The signature is checked over the raw bytes BEFORE the body is parsed, so
 * an unauthenticated caller cannot reach the JSON parser, let alone the database.
 */
export async function checkSignedRequest(
  key: string | undefined, rawBody: string, signature: string | null, now: number = Date.now(),
): Promise<Checked> {
  if (!keyUsable(key)) return { ok: false, reason: 'no_key' };
  if (!signature || !/^[0-9a-f]{64}$/.test(signature)) return { ok: false, reason: 'unsigned' };
  if (!constantTimeEquals(await signBody(key, rawBody), signature)) return { ok: false, reason: 'bad_signature' };
  let r: Record<string, unknown>;
  try { r = JSON.parse(rawBody); } catch { return { ok: false, reason: 'malformed' }; }
  if (!r || r.v !== 1 || typeof r.ts !== 'number' || typeof r.nonce !== 'string' || !NONCE.test(r.nonce)
      || typeof r.app_user_id !== 'string' || !UUID.test(r.app_user_id)) {
    return { ok: false, reason: 'malformed' };
  }
  if (Math.abs(now - r.ts) > MAX_SKEW_MS) return { ok: false, reason: 'stale' };
  if (r.kind === 'pin') {
    if (typeof r.pin !== 'string' || !/^\d{4}$/.test(r.pin)) return { ok: false, reason: 'malformed' };
    return { ok: true, request: { v: 1, kind: 'pin', app_user_id: r.app_user_id, pin: r.pin, ts: r.ts, nonce: r.nonce } };
  }
  if (r.kind === 'recovery') {
    const a = r.answers;
    if (!Array.isArray(a) || a.length < 1 || a.length > 10) return { ok: false, reason: 'malformed' };
    const answers: RecoveryAnswer[] = [];
    for (const x of a) {
      if (!x || typeof x !== 'object') return { ok: false, reason: 'malformed' };
      const q = (x as Record<string, unknown>).question_id, s = (x as Record<string, unknown>).answer;
      if (typeof q !== 'number' || !Number.isInteger(q) || typeof s !== 'string' || s.length > 200) {
        return { ok: false, reason: 'malformed' };
      }
      answers.push({ question_id: q, answer: s });
    }
    return { ok: true, request: { v: 1, kind: 'recovery', app_user_id: r.app_user_id, answers, ts: r.ts, nonce: r.nonce } };
  }
  return { ok: false, reason: 'malformed' };
}

/** Mumbai's reading of the verifier's answer: exactly `{"result": <one known word>}` or nothing. */
export function parseVerifyResponse(status: number, text: string): VerifyResult | null {
  if (status !== 200) return null;
  try {
    const j = JSON.parse(text);
    if (!j || typeof j !== 'object' || Array.isArray(j) || Object.keys(j).length !== 1) return null;
    return VERIFY_RESULTS.includes(j.result) ? j.result : null;
  } catch {
    return null;
  }
}
