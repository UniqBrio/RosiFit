import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { forward, MUMBAI_UNSUBSCRIBE, MAX_QUERY_LENGTH } from '../../supabase/forwarders/unsubscribe/forward.ts';

/**
 * B2 of the move to Mumbai (requests/2026-10-07-singapore-unsubscribe-forwarder.md).
 *
 * Every email sent before cutover carries a link to SINGAPORE's unsubscribe function. After
 * cutover Singapore's database is no longer production, so an opt-out written there is lost.
 * This forwarder replaces Singapore's `unsubscribe` and sends every request on to Mumbai's,
 * unchanged: GET with 307, POST with 308 (both keep the method and body). The signed pair is
 * checked by Mumbai's function, as it always was -- the forwarder decides nothing about it.
 */

const SG = 'https://lhpzhkzbnquwjljmbylo.supabase.co';
const at = (p: string) => SG + p;

test('the destination is Mumbai\'s unsubscribe function, fixed in the source', () => {
  assert.equal(MUMBAI_UNSUBSCRIBE, 'https://lbyqipunsbzkcvdrxach.supabase.co/functions/v1/unsubscribe');
});

test('GET is a 307 to Mumbai with the query string byte for byte', () => {
  const queries = [
    '?e=7d1c1c2e-0000-4000-8000-000000000001&t=qj7OY6JBP1fmTAAKTYKBCyOhxO1TK7UAiXE70oK4mgQ',
    '?e=id-1&t=a%2Bb%2Fc',                       // encoded characters stay encoded
    '?t=tok&e=id-1',                             // order kept
    '?e=id-1&t=tok&a=unsubscribe',
    '?e=id-1&t=tok&a=resubscribe&academy=RosiFit%20Academy',
    '?e=id-1&e=id-2&t=tok',                      // repeats kept
    '?e=&t=',                                    // empty values kept
  ];
  for (const q of queries) {
    for (const p of ['/unsubscribe', '/functions/v1/unsubscribe']) {
      const r = forward('GET', at(p + q));
      assert.equal(r.status, 307, `GET ${p}${q}`);
      assert.equal(r.headers.get('location'), MUMBAI_UNSUBSCRIBE + q, `GET ${p}${q} keeps its query`);
    }
  }
});

test('POST is a 308 to Mumbai -- the press, Resubscribe and RFC 8058 one-click alike', () => {
  for (const q of ['?e=id-1&t=tok&a=unsubscribe', '?e=id-1&t=tok&a=resubscribe', '?e=id-1&t=tok']) {
    const r = forward('POST', at('/unsubscribe' + q));
    assert.equal(r.status, 308, `POST ${q}`);
    assert.equal(r.headers.get('location'), MUMBAI_UNSUBSCRIBE + q);
  }
});

test('no query is forwarded as no query, and Mumbai answers it as it always has', () => {
  const r = forward('GET', at('/unsubscribe'));
  assert.equal(r.status, 307);
  assert.equal(r.headers.get('location'), MUMBAI_UNSUBSCRIBE);
});

test('only the unsubscribe path is forwarded; every other path is a 404 with no Location', () => {
  for (const p of ['/', '/unsubscribe/', '/unsubscribe/x', '/unsubscribex', '/functions/v1/unsubscribe/',
                   '/functions/v1/send-followups', '/send-followups', '/xunsubscribe',
                   '/functions/v1/unsubscribe/..', '/unsubscribe%2F..%2Fx', '/UNSUBSCRIBE']) {
    for (const m of ['GET', 'POST']) {
      const r = forward(m, at(p + '?e=id-1&t=tok'));
      assert.equal(r.status, 404, `${m} ${p}`);
      assert.equal(r.headers.get('location'), null, `${m} ${p} must not redirect`);
    }
  }
});

test('methods other than GET and POST are refused, as the function they replace refused them', () => {
  for (const m of ['PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']) {
    const r = forward(m, at('/unsubscribe?e=id-1&t=tok'));
    assert.equal(r.status, 405, m);
    assert.equal(r.headers.get('location'), null, `${m} must not redirect`);
  }
});

test('nothing in the request can choose the destination', () => {
  const tries = [
    'https://evil.example/unsubscribe?e=id-1&t=tok',                               // another host entirely
    at('/unsubscribe?e=id-1&t=tok&fn=https://evil.example/unsubscribe'),           // a destination in the query
    at('/unsubscribe?next=https%3A%2F%2Fevil.example&e=id-1&t=tok'),
    at('/unsubscribe?e=id-1&t=tok#https://evil.example'),                          // a fragment
    'https://user:pass@lhpzhkzbnquwjljmbylo.supabase.co/unsubscribe?e=id-1&t=tok', // credentials
  ];
  for (const u of tries) {
    const r = forward('GET', u);
    const loc = r.headers.get('location');
    if (loc === null) continue; // refused outright is also safe
    const dest = new URL(loc);
    assert.equal(dest.origin + dest.pathname, MUMBAI_UNSUBSCRIBE, `${u} must still go to Mumbai's function`);
    assert.equal(dest.username + dest.password, '', `${u} must not carry credentials on`);
    assert.equal(dest.hash, '', `${u} must not carry a fragment on`);
  }
});

test('a query that is too long or not a query is refused, not forwarded', () => {
  const long = forward('GET', at('/unsubscribe?e=id-1&t=' + 'a'.repeat(MAX_QUERY_LENGTH)));
  assert.equal(long.status, 414);
  assert.equal(long.headers.get('location'), null);
  const notAUrl = forward('GET', 'not a url');
  assert.equal(notAUrl.status, 400);
  assert.equal(notAUrl.headers.get('location'), null);
});

test('every answer is uncacheable and leaks no referrer', () => {
  for (const [m, u] of [['GET', at('/unsubscribe?e=a&t=b')], ['POST', at('/unsubscribe?e=a&t=b')],
                        ['GET', at('/nope')], ['PUT', at('/unsubscribe')]]) {
    const r = forward(m, u);
    assert.equal(r.headers.get('cache-control'), 'no-store', `${m} ${u}`);
    assert.equal(r.headers.get('referrer-policy'), 'no-referrer', `${m} ${u}`);
  }
});

test('the forwarder reads no secret, no environment and no database -- it cannot write anywhere', () => {
  const dir = path.join(process.cwd(), 'supabase/forwarders/unsubscribe');
  for (const f of ['index.ts', 'forward.ts']) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.doesNotMatch(src, /Deno\.env|createClient|supabase-js|SUPABASE_|_SECRET|fetch\(/, `${f} must stay a pure redirect`);
  }
  const literals = fs.readFileSync(path.join(dir, 'forward.ts'), 'utf8').match(/https:\/\/[^'"`\s]+/g) ?? [];
  assert.deepEqual([...new Set(literals)], [MUMBAI_UNSUBSCRIBE], 'the only address in the source is Mumbai\'s function');
});

test('the forwarder is not one of the eleven functions -- it can never be deployed to Mumbai by mistake', () => {
  assert.equal(fs.existsSync(path.join(process.cwd(), 'supabase/functions/unsubscribe-forwarder')), false);
  assert.doesNotMatch(fs.readFileSync(path.join(process.cwd(), 'supabase/config.toml'), 'utf8'), /forward/i);
});
