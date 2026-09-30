// "On clicking unsubscribe link its leading to html file" (30-Sep-2026).
//
// Supabase rewrites a GET that answers text/html to text/plain on the default
// *.supabase.co domain, so the confirmation page arrived as its own source.
// These pin the replacement: the unsubscribe function never answers a GET
// with HTML -- it redirects to the app's page, or says the same words as text.

import { assert, assertEquals } from 'jsr:@std/assert@1';
import { appOrigin, DEFAULT_APP_ORIGIN, landing, LANDING_PATH } from './landing.ts';

const WORDS = { heading: 'You are unsubscribed', body: 'No more follow-ups.', academy: 'RosiFit Academy' };

Deno.test('unset APP_ORIGIN sends people to the recorded production host', () => {
  assertEquals(appOrigin(undefined), DEFAULT_APP_ORIGIN);
  assertEquals(appOrigin(''), DEFAULT_APP_ORIGIN);
});

Deno.test('a configured origin is used as set, quotes and a trailing slash forgiven', () => {
  assertEquals(appOrigin('"https://preview.example.com/"'), 'https://preview.example.com');
});

Deno.test('a configured origin that is not https-and-nothing-else is refused, not swapped for production', () => {
  assertEquals(appOrigin('http://rosi-fit.vercel.app'), null);
  assertEquals(appOrigin('https://rosi-fit.vercel.app/unsubscribed'), null);
  assertEquals(appOrigin('javascript:alert(1)'), null);
});

Deno.test('a confirmed opt-out is a 303 to the app page, carrying only the academy name', () => {
  const res = landing('unsubscribed', 'https://rosi-fit.vercel.app', WORDS);
  assertEquals(res.status, 303);
  assertEquals(res.headers.get('Location'),
    'https://rosi-fit.vercel.app/unsubscribed?academy=RosiFit%20Academy');
  assertEquals(res.headers.get('Cache-Control'), 'no-store');
});

Deno.test('a link that did not work goes to its own page', () => {
  const res = landing('failed', 'https://rosi-fit.vercel.app', WORDS);
  assertEquals(new URL(res.headers.get('Location')!).pathname, LANDING_PATH.failed);
});

Deno.test('with no origin to send to, the words come back as text -- never as HTML', async () => {
  const res = landing('unsubscribed', null, WORDS);
  assertEquals(res.status, 200);
  assert(res.headers.get('Content-Type')!.startsWith('text/plain'));
  const text = await res.text();
  assert(!text.includes('<'), 'no markup at all: the platform would show it as source');
  assert(text.startsWith('You are unsubscribed'));
});

// The source-reading half -- index.ts serves no HTML, and both app pages exist --
// is src/data/unsubscribeLanding.test.ts: CI runs `deno test` with no read
// permission, and the Node suite is where this project's source specs live.

// ------------------------------------------------ the way back (Resubscribe)
// Imported here rather than by editing the import above: specs are append-only.
import { resubscribeStep } from './landing.ts';

Deno.test('the confirmation carries the signed pair and the function address, so the page can offer Resubscribe', () => {
  const res = landing('unsubscribed', 'https://rosi-fit.vercel.app', WORDS,
    { e: 'id-1', t: 'a+b/c', fn: 'https://ref.supabase.co/functions/v1/unsubscribe' });
  const loc = new URL(res.headers.get('Location')!);
  assertEquals(loc.pathname, '/unsubscribed');
  assertEquals(loc.searchParams.get('e'), 'id-1');
  assertEquals(loc.searchParams.get('t'), 'a+b/c');
  assertEquals(loc.searchParams.get('fn'), 'https://ref.supabase.co/functions/v1/unsubscribe');
});

Deno.test('a resubscribe lands on its own page', () => {
  const res = landing('resubscribed', 'https://rosi-fit.vercel.app', WORDS);
  assertEquals(new URL(res.headers.get('Location')!).pathname, LANDING_PATH.resubscribed);
  assertEquals(LANDING_PATH.resubscribed, '/resubscribed');
});

Deno.test('Resubscribe undoes an unsubscribe and nothing else', () => {
  assertEquals(resubscribeStep('unsubscribed'), 'write');
  assertEquals(resubscribeStep('unknown'), 'already');
  assertEquals(resubscribeStep('valid'), 'already');
  assertEquals(resubscribeStep('bounced'), 'refuse');
  assertEquals(resubscribeStep('complained'), 'refuse');
  assertEquals(resubscribeStep(null), 'missing');
  assertEquals(resubscribeStep(undefined), 'missing');
});
