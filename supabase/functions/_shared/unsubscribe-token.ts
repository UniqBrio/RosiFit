/**
 * The signed unsubscribe link: how one is minted, and how one is checked.
 *
 * PURE, AND DENO-GLOBAL-FREE ON PURPOSE. `src/data/unsubscribeToken.test.ts`
 * imports THIS file, so the rule that runs in production is the rule under
 * test rather than a copy kept in step by hand -- the same reasoning
 * `from-address.ts` records. Every function here takes the secret as an
 * argument; reading it out of the environment is the caller's job, and
 * happens in exactly two places (`unsubscribe`, `send-followups`).
 *
 * WHY A SIGNATURE AND NOT JUST THE ID. member_emails.id is a UUID, and a
 * bare id in the link would make "unsubscribe somebody" a matter of guessing
 * one -- 687 live addresses on this project, all reachable from an endpoint
 * that by design has no session. The HMAC means the only person who can opt
 * a member out is the person holding a link the academy itself sent.
 */

/** RFC 4648 §5: base64 with `-`/`_` and no padding, so it survives a query
 *  string, a mail client's line-wrapping and a copy-paste out of a browser
 *  bar unchanged. `+`, `/` and `=` do none of those things reliably. */
function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** HMAC-SHA256 of the member_emails id under the shared secret. */
export async function signUnsubscribeId(memberEmailId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(memberEmailId));
  return base64url(new Uint8Array(sig));
}

/**
 * Constant-time string comparison.
 *
 * A `===` here would return as soon as two characters differ, and the time it
 * took would say how many leading characters were right -- enough, over
 * enough requests, to build a valid signature one character at a time. The
 * length is compared first and does leak, which is fine: every token this
 * function ever sees is the same length, so the length is not a secret.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Does this token belong to this id? The one check `unsubscribe` performs. */
export async function unsubscribeTokenValid(
  memberEmailId: string, token: string, secret: string,
): Promise<boolean> {
  if (!memberEmailId || !token || !secret) return false;
  return constantTimeEquals(token, await signUnsubscribeId(memberEmailId, secret));
}

/**
 * The link that goes in the email, and in its List-Unsubscribe header.
 *
 * `functionsBase` is `${SUPABASE_URL}/functions/v1` -- SUPABASE_URL is
 * injected into every Edge Function by the runtime, so the address of the
 * unsubscribe endpoint is derived rather than configured. One less secret to
 * set, and one less to set wrongly.
 */
export async function buildUnsubscribeUrl(
  memberEmailId: string, secret: string, functionsBase: string,
): Promise<string> {
  const token = await signUnsubscribeId(memberEmailId, secret);
  const base = functionsBase.replace(/\/+$/, '');
  return `${base}/unsubscribe?e=${encodeURIComponent(memberEmailId)}&t=${encodeURIComponent(token)}`;
}
