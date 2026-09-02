// Every secret-derivation primitive the auth functions need, in one place.
// PIN_PEPPER is an Edge Function secret (supabase secrets set PIN_PEPPER=...)
// and is the ONLY thing that makes a derived value unguessable from the
// database alone -- the database never sees a PIN, a pepper, or a derived
// secret, only the resulting GoTrue password hash.

import { HttpError } from './response.ts';

const encoder = new TextEncoder();

/**
 * A missing pepper is a DEPLOYMENT fault, not a caller fault, so it answers
 * 503 with a sentence that names the fix -- not an opaque 500 that reads
 * like a bug in the app. It must never be defaulted or generated on the fly:
 * every PIN in the project derives from this value, so a different pepper
 * silently invalidates every credential already issued.
 */
function pepper(): string {
  const p = Deno.env.get('PIN_PEPPER');
  if (!p) {
    throw new HttpError(503,
      'Sign-in is not finished being set up on the server yet. ' +
      'An administrator needs to set the PIN_PEPPER secret for this project.');
  }
  return p;
}

/** True when this project can derive PINs at all. Lets a handler answer a
 *  read-only request (the question list) that does not need the pepper. */
export function pinSecretsConfigured(): boolean {
  return Boolean(Deno.env.get('PIN_PEPPER'));
}

export async function hmacHex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The GoTrue password for a staff/super-admin's shadow auth.users row.
 * Keyed on the IMMUTABLE app_users.id, never on the phone number -- that is
 * what makes changing a mobile number (C-99) cheap and safe: it does not
 * touch this derivation at all.
 */
export function derivePinSecret(appUserId: string, pin: string): Promise<string> {
  return hmacHex(pepper(), `pin:${appUserId}:${pin}`);
}

/** A stable, never-displayed GoTrue identity. Nobody signs in with this
 *  email directly -- auth-login always resolves phone -> app_user -> here. */
export function syntheticEmail(appUserId: string): string {
  return `u-${appUserId}@auth.rosifit.internal`;
}

export function isFourDigitPin(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

export function generatePin(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 10000).padStart(4, '0');
}

/** C-97: lowercase, strip everything but letters/digits, so spelling and
 *  spacing quirks at recovery time do not fail a genuine answer. */
export function normalizeAnswer(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function hashAnswer(appUserId: string, answer: string): Promise<string> {
  return hmacHex(pepper(), `answer:${appUserId}:${normalizeAnswer(answer)}`);
}

/** Short-lived, stateless proof that recovery-check's two questions were
 *  answered correctly, so the follow-up "apply the new PIN" call does not
 *  have to re-ask them. Signed, not encrypted -- it carries no secret, only
 *  which account passed and until when. */
export async function signRecoveryToken(appUserId: string, ttlMs = 10 * 60 * 1000): Promise<string> {
  const payload = JSON.stringify({ sub: appUserId, exp: Date.now() + ttlMs });
  const b64 = btoa(payload);
  const sig = await hmacHex(pepper(), b64);
  return `${b64}.${sig}`;
}

export async function verifyRecoveryToken(token: string): Promise<string> {
  const [b64, sig] = (token ?? '').split('.');
  if (!b64 || !sig) throw new Error('Malformed recovery token.');
  const expected = await hmacHex(pepper(), b64);
  if (expected !== sig) throw new Error('Invalid recovery token.');
  let payload: { sub: string; exp: number };
  try {
    payload = JSON.parse(atob(b64));
  } catch {
    throw new Error('Malformed recovery token.');
  }
  if (Date.now() > payload.exp) throw new Error('This recovery check has expired. Start again.');
  return payload.sub;
}
