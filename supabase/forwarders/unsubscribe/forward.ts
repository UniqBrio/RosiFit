/**
 * Singapore's `unsubscribe`, after the move to Mumbai: a redirect and nothing else.
 *
 * B2 of requests/2026-10-06-move-production-to-mumbai.md. Every email sent before cutover links to
 * the Singapore project's unsubscribe function. Once production is Mumbai, an opt-out written to
 * Singapore's database is an opt-out lost -- so this module is deployed to Singapore AS
 * `unsubscribe` (verify_jwt false, as the real one is) and sends every request on to Mumbai's,
 * unchanged:
 *
 *   GET  -> 307, POST -> 308. Both make the client repeat the SAME method (and, for POST, the same
 *   body) at the new address; 301/302/303 would let a client turn the POST into a GET.
 *
 * What it does NOT do, on purpose:
 *   - decide anything about the signed pair. Mumbai's function checks it, as it always has, under
 *     the same secret; the query string is passed on byte for byte, never parsed and rebuilt.
 *   - take its destination from anything in the request. The one address is a constant below.
 *   - read a secret, the environment or a database. It cannot write anywhere.
 *
 * Gmail's one-click POST is answered with a 308 like any other POST. Whether Gmail follows it is
 * Gmail's choice; the body link in the same email reaches Mumbai either way.
 *
 * PURE and free of Deno globals, so src/data/unsubscribeForwarder.test.ts runs this exact file.
 */

export const MUMBAI_UNSUBSCRIBE = 'https://lbyqipunsbzkcvdrxach.supabase.co/functions/v1/unsubscribe';

/** The real function's own address on the platform, in either form the runtime may hand over. */
const FORWARDED_PATHS = new Set(['/unsubscribe', '/functions/v1/unsubscribe']);

/** A signed link is well under 200 characters; anything near this is not one of ours. */
export const MAX_QUERY_LENGTH = 2048;

const HEADERS = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };

function answer(status: number, location?: string): Response {
  const headers = new Headers(HEADERS);
  if (location) headers.set('Location', location);
  return new Response(null, { status, headers });
}

/** The query exactly as it arrived: after the first `?`, before any `#`. Never re-serialised. */
function rawQuery(rawUrl: string): string {
  const q = rawUrl.indexOf('?');
  if (q < 0) return '';
  const hash = rawUrl.indexOf('#', q);
  return rawUrl.slice(q + 1, hash < 0 ? undefined : hash);
}

export function forward(method: string, rawUrl: string): Response {
  let pathname: string;
  try {
    pathname = new URL(rawUrl).pathname;
  } catch {
    return answer(400);
  }
  if (!FORWARDED_PATHS.has(pathname)) return answer(404);
  if (method !== 'GET' && method !== 'POST') return answer(405);

  const query = rawQuery(rawUrl);
  if (query.length > MAX_QUERY_LENGTH) return answer(414);
  // A URL the runtime hands over is already percent-encoded; anything outside printable ASCII
  // here is not a link this academy sent.
  if (/[^\x21-\x7e]/.test(query)) return answer(400);

  return answer(method === 'GET' ? 307 : 308, query ? `${MUMBAI_UNSUBSCRIBE}?${query}` : MUMBAI_UNSUBSCRIBE);
}
