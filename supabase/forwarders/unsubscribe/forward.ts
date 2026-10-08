/**
 * Singapore's `unsubscribe`, after the move to Mumbai: a redirect, re-signed for Mumbai.
 *
 * B2 of requests/2026-10-06-move-production-to-mumbai.md. Every email sent before cutover links to
 * the Singapore project's unsubscribe function. Once production is Mumbai, an opt-out written to
 * Singapore's database is an opt-out lost -- so this module is deployed to Singapore AS
 * `unsubscribe` (verify_jwt false, as the real one is) and sends every request on to Mumbai's:
 *
 *   GET  -> 307, POST -> 308. Both make the client repeat the SAME method (and, for POST, the same
 *   body) at the new address; 301/302/303 would let a client turn the POST into a GET.
 *
 * RE-SIGNED (requests/2026-10-08-unsubscribe-forwarder-resigns.md). Mumbai signs with its own key,
 * not Singapore's, so a link minted before cutover would fail Mumbai's check. `forwardResigned`
 * checks the pair under SINGAPORE's key -- the same constant-time check the real function makes --
 * and only when it holds does it sign the SAME id under Mumbai's key and put that token in place
 * of the old one. Every other byte of the query is passed on as it arrived. A pair that does not
 * check out is forwarded exactly as `forward` always did, so Mumbai gives it the one answer it
 * gives every bad link; nothing here ever signs an id that Singapore's key did not vouch for.
 *
 * What it does NOT do, on purpose:
 *   - take its destination from anything in the request. The one address is a constant below.
 *   - read the environment or a database. The two keys are arguments (index.ts reads them), and
 *     the module cannot write anywhere: the opt-out is written by Mumbai's function alone.
 *   - log. Neither a token nor a key is ever printed.
 *
 * Gmail's one-click POST is answered with a 308 like any other POST. Whether Gmail follows it is
 * Gmail's choice; the body link in the same email reaches Mumbai either way.
 *
 * PURE and free of Deno globals, so src/data/unsubscribeForwarder.test.ts runs this exact file.
 */
import { signUnsubscribeId, unsubscribeTokenValid } from '../../functions/_shared/unsubscribe-token.ts';

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

/** The two signing keys: the one every pre-cutover link was signed with, and Mumbai's. */
export type ResignKeys = { singapore: string; mumbai: string };

/** The key of one `&`-separated query segment, decoded exactly as URLSearchParams decodes it. */
function segmentKey(segment: string): string | undefined {
  return new URLSearchParams(segment).keys().next().value;
}

/**
 * The query with its token re-signed for Mumbai, or null when the pair does not check out under
 * Singapore's key (or either key is missing). `e` and `t` are read as Mumbai's function reads them
 * -- the first of each -- so the id that is checked here is the id Mumbai will act on. Only the
 * segment holding that first `t` is replaced.
 */
export async function resignQuery(query: string, keys: ResignKeys): Promise<string | null> {
  if (!keys.singapore || !keys.mumbai) return null;
  const params = new URLSearchParams(query);
  const id = params.get('e') ?? '';
  if (!await unsubscribeTokenValid(id, params.get('t') ?? '', keys.singapore)) return null;
  const segments = query.split('&');
  const at = segments.findIndex(seg => segmentKey(seg) === 't');
  if (at < 0) return null;
  segments[at] = `t=${encodeURIComponent(await signUnsubscribeId(id, keys.mumbai))}`;
  return segments.join('&');
}

/**
 * What the deployed forwarder answers: `forward`'s answer, with a link Singapore signed re-signed
 * for Mumbai. Refusals (400/404/405/414) and every pair that does not check out are `forward`'s
 * answer unchanged.
 */
export async function forwardResigned(method: string, rawUrl: string, keys: ResignKeys): Promise<Response> {
  const passed = forward(method, rawUrl);
  if (passed.status !== 307 && passed.status !== 308) return passed;
  const resigned = await resignQuery(rawQuery(rawUrl), keys);
  return resigned === null ? passed : answer(passed.status, `${MUMBAI_UNSUBSCRIBE}?${resigned}`);
}
