// Where a person who clicked an unsubscribe link ends up, and what they read.
//
// WHY THIS IS NOT AN HTML PAGE ANY MORE
// "On clicking unsubscribe link its leading to html file" (the academy,
// 30-Sep-2026, with a screenshot of the page's own source). The function
// built a correct page and sent it as `text/html` -- and the platform
// rewrote it. Supabase's Edge Function limits: "Serving of HTML content is
// only supported with custom domains (Otherwise GET requests that return
// text/html will be rewritten to text/plain)." This project calls its
// functions on the default `<ref>.supabase.co` domain, so every member who
// clicked read markup. No header or body change on this side can undo a
// rewrite made after the response leaves it.
//
// So the answer is a REDIRECT to a page the app's own host serves
// (`public/unsubscribed.html`, `public/unsubscribe-failed.html`), which is
// ordinary static hosting with no such rule. The opt-out itself is still
// decided and written here, before the redirect -- the page is only what the
// person reads afterwards, and it takes nothing from the URL but the
// academy's name.
//
// Pure: no Deno globals, so it is testable without a request or a database.

/** The production app host, as recorded in docs/registers (T-113). Overridden
 *  by the APP_ORIGIN secret on any other deployment. */
export const DEFAULT_APP_ORIGIN = 'https://rosi-fit.vercel.app';

export type Outcome = 'unsubscribed' | 'failed' | 'resubscribed';

/** The static pages, one per outcome, at their clean URLs (vercel.json). */
export const LANDING_PATH: Record<Outcome, string> = {
  unsubscribed: '/unsubscribed',
  failed: '/unsubscribe-failed',
  resubscribed: '/resubscribed',
};

/**
 * What the confirmation page needs to offer "Resubscribe": the same signed
 * pair the email's link carried, and where to post it back to. Nothing here
 * is new to the person holding it -- `e` and `t` are the link they clicked --
 * and the page accepts `fn` only in the shape of this function's own address.
 */
export type Undo = { e: string; t: string; fn: string };

/** `https://host[:port]` and nothing after it. */
const ORIGIN = /^https:\/\/[a-z0-9.-]+(:\d+)?$/i;

/**
 * The origin to send people to, or null when the configured one is not a
 * usable https origin. Unset means the recorded production host; SET BUT
 * WRONG is not quietly replaced by it, because a preview deployment pointing
 * members at production is a surprise nobody would find.
 */
export function appOrigin(raw: string | undefined | null): string | null {
  const value = (raw ?? '').trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  if (!value) return DEFAULT_APP_ORIGIN;
  return ORIGIN.test(value) ? value : null;
}

export type Words = { heading: string; body: string; academy: string };

/**
 * The GET answer. A 303 to the app's page when there is an origin to send
 * the person to; otherwise the same words as PLAIN TEXT -- which is what the
 * platform would turn any HTML into anyway, and which reads as a sentence
 * rather than as source code.
 */
export function landing(outcome: Outcome, origin: string | null, words: Words, undo?: Undo): Response {
  if (origin) {
    const target = `${origin}${LANDING_PATH[outcome]}?academy=${encodeURIComponent(words.academy)}`
      + (undo
        ? `&e=${encodeURIComponent(undo.e)}&t=${encodeURIComponent(undo.t)}&fn=${encodeURIComponent(undo.fn)}`
        : '');
    return new Response(null, {
      status: 303,
      headers: { Location: target, 'Cache-Control': 'no-store' },
    });
  }
  return new Response(`${words.heading}\n\n${words.body}\n\n${words.academy}\n`, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/**
 * What the Resubscribe button may do to an address, by its current status --
 * the whole rule, here so it is tested without a database.
 *
 *   write    it was unsubscribed: put it back ('unknown', as 0078 does)
 *   already  it is on already -- a second press, an old tab: say so, write nothing
 *   refuse   a bounce or a spam report: not what this button undoes
 *   missing  the address is gone: there is nothing to put back
 */
export type ResubscribeStep = 'write' | 'already' | 'refuse' | 'missing';

export function resubscribeStep(status: string | null | undefined): ResubscribeStep {
  if (status == null) return 'missing';
  if (status === 'unsubscribed') return 'write';
  if (status === 'unknown' || status === 'valid') return 'already';
  return 'refuse';
}
