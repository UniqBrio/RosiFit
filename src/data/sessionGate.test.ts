import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * THE SESSION GATE: protected readers ask nothing until the session is known
 * (docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md §5, the unauthenticated
 * fan-out).
 *
 * Run: npx tsx --test src/data/sessionGate.test.ts
 *
 * The module is loaded configured (fakePostgrest.testkit's stubs) with its
 * question injected, so the live branch is what runs. The hook wiring is
 * pinned from the source.
 */
import { installNodeStubs } from './fakePostgrest.testkit';

// The stubs set the two public env vars and the React Native modules the
// client pulls in, so the module loads CONFIGURED and the gate is live.
installNodeStubs();
const GATE = './sessionGate.ts';
type Gate = { sessionKnown(ask?: () => Promise<unknown>): Promise<boolean>; forgetSession(): void };

test('one question for every reader, answered once, until the auth state moves', async () => {
  const { sessionKnown, forgetSession } = await import(GATE) as Gate;
  let asked = 0;
  let answer: unknown = { id: 'u1' };
  const ask = () => { asked++; return Promise.resolve(answer); };
  const [a, b, c] = await Promise.all([sessionKnown(ask), sessionKnown(ask), sessionKnown(ask)]);
  assert.deepEqual([a, b, c], [true, true, true]);
  assert.equal(asked, 1, 'three readers, one identity read');
  assert.equal(await sessionKnown(ask), true);
  assert.equal(asked, 1, 'the answer is kept');

  forgetSession();
  answer = null;                                          // signed out
  assert.equal(await sessionKnown(ask), false);
  assert.equal(asked, 2, 'asked again after the auth state moved');
  assert.equal(await sessionKnown(ask), false);
  assert.equal(asked, 2, 'and a signed-out answer is kept too -- no retry storm');

  forgetSession();
  const failing = () => Promise.reject(new Error('offline'));
  assert.equal(await sessionKnown(failing), false, 'a question that could not be asked is not a yes');
  forgetSession();
});

test('useAsync asks the gate before it loads, and a closed gate is a sentence, not a request', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/data/hooks.ts'), 'utf8');
  assert.match(src, /import \{ sessionKnown, SIGNED_OUT_MESSAGE \} from '\.\/sessionGate'/);
  assert.ok(!/withTimeout\(load\(\)\)/.test(src), 'a reader still loads without asking the gate');
  assert.match(src, /withTimeout\(sessionKnown\(\)\.then\(signedIn => \{\s*\n\s*if \(!signedIn\) throw new Error\(SIGNED_OUT_MESSAGE\);\s*\n\s*return load\(\);/);
});

test('the gate forgets on every auth state change and never redirects', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/data/sessionGate.ts'), 'utf8');
  assert.match(src, /supabase\.auth\.onAuthStateChange\(event => \{\s*\n\s*if \(event !== 'INITIAL_SESSION' && event !== 'TOKEN_REFRESHED'\) forgetSession\(\);/);
  assert.ok(!/router|replace\(|href/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'the gate must not navigate');
  assert.match(src, /if \(!isConfigured\) return Promise\.resolve\(true\)/, 'fixtures mode stays open');
});
