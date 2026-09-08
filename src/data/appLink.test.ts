/**
 * Cases for the link a staff member is handed with her PIN.
 *
 * Run: npx tsx --test src/data/appLink.test.ts
 *
 * The defect these cover shipped as a one-line constant --
 * `https://rosifit.app/staff` -- and the interesting half of it is not the
 * host but the PATH: `/staff` is the admin's own screen, behind a session the
 * recipient does not have. So the first assertion here is that nothing this
 * module returns ever carries a path.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { signInLinkFrom, linkDisplay, APP_LINK_FALLBACK } from './appLink';

test('the link is the origin and never a path -- /staff is behind a session', () => {
  assert.equal(signInLinkFrom('https://rosifit.example'), 'https://rosifit.example');
  for (const origin of ['https://rosifit.example', 'https://a.vercel.app', null, undefined]) {
    assert.doesNotMatch(signInLinkFrom(origin), /^https?:\/\/[^/]+\//,
      `${String(origin)} produced a link with a path`);
  }
});

test('a trailing slash is not a path', () => {
  assert.equal(signInLinkFrom('https://rosifit.example/'), 'https://rosifit.example');
  assert.equal(signInLinkFrom('https://rosifit.example///'), 'https://rosifit.example');
});

test('a port is kept -- a preview deployment is a real destination', () => {
  assert.equal(signInLinkFrom('https://staging.rosifit.example:8443'),
    'https://staging.rosifit.example:8443');
});

test('loopback is an origin and not a link, so it falls back', () => {
  for (const origin of [
    'http://localhost:8081', 'http://127.0.0.1:19006',
    'http://0.0.0.0:8081', 'http://[::1]:8081', 'https://LOCALHOST',
  ]) {
    assert.equal(signInLinkFrom(origin), APP_LINK_FALLBACK, `${origin} was shared as-is`);
  }
});

test('no origin at all -- native, and the prerender -- falls back', () => {
  assert.equal(signInLinkFrom(undefined), APP_LINK_FALLBACK);
  assert.equal(signInLinkFrom(null), APP_LINK_FALLBACK);
  assert.equal(signInLinkFrom(''), APP_LINK_FALLBACK);
  assert.equal(signInLinkFrom('   '), APP_LINK_FALLBACK);
});

test('an origin that is not one is refused rather than trimmed into one', () => {
  // A value carrying a path is exactly the defect being fixed; it must not be
  // salvaged by cutting the path off, because a caller passing one has
  // already misunderstood what this returns.
  assert.equal(signInLinkFrom('https://rosifit.example/staff'), APP_LINK_FALLBACK);
  assert.equal(signInLinkFrom('rosifit.example'), APP_LINK_FALLBACK);
  assert.equal(signInLinkFrom('javascript:alert(1)'), APP_LINK_FALLBACK);
  assert.equal(signInLinkFrom('file:///Users/x/index.html'), APP_LINK_FALLBACK);
});

test('the fallback is itself a bare origin', () => {
  assert.equal(signInLinkFrom(APP_LINK_FALLBACK), APP_LINK_FALLBACK);
});

test('the toast drops the scheme and keeps the rest', () => {
  assert.equal(linkDisplay('https://rosifit.example'), 'rosifit.example');
  assert.equal(linkDisplay('http://rosifit.example:8443'), 'rosifit.example:8443');
});
