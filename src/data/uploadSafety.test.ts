import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDevelopmentOrigin, fixtureModeRefusal, answeredByServer,
  commitFailureText, previewFailureText,
} from './uploadSafety';
import { FunctionError } from './sendBatch';

/**
 * T20 and T21: the two things the upload must not claim.
 *
 * Run: npx tsx --test src/data/uploadSafety.test.ts
 */

/* ===================================================================== T20
 * FIXTURE MODE MUST NOT REPORT A SUCCESS ON A REAL ORIGIN (T-113, T-114).
 *
 * `app/upload.tsx` answers from fixtures when no project is configured — a
 * day, counts, a register, and no request. On 17-Sep-2026 a stale Metro
 * transform cache produced exactly that bundle from a correct `.env`, and an
 * operator watched an import "succeed" that had never happened. Making the
 * progress UI more convincing without closing this first would make the
 * fabrication more convincing too.
 */

test('T20: fixture mode on the production origin is refused', () => {
  const refusal = fixtureModeRefusal(false, 'rosi-fit.vercel.app');
  assert.ok(refusal, 'an unconfigured build on a real origin reported a successful import');
});

test('T20: the refusal states plainly that nothing was uploaded or written', () => {
  const refusal = fixtureModeRefusal(false, 'rosi-fit.vercel.app') ?? '';
  assert.match(refusal, /[Nn]othing was uploaded and nothing was written/);
});

test('T20: a preview deployment is a real origin too', () => {
  // A `rosi-fit-git-…` preview URL built without EXPO_PUBLIC_* behaves
  // identically, and T-113 names it as suspect for exactly this reason.
  assert.ok(fixtureModeRefusal(false, 'rosi-fit-git-branch-uniqbrio.vercel.app'));
});

test('T20: a CONFIGURED build is never refused, whatever the origin', () => {
  assert.equal(fixtureModeRefusal(true, 'rosi-fit.vercel.app'), null);
  assert.equal(fixtureModeRefusal(true, 'localhost'), null);
});

test('T20: localhost still runs on fixtures — the walkthrough must keep working', () => {
  assert.equal(fixtureModeRefusal(false, 'localhost'), null);
  assert.equal(fixtureModeRefusal(false, '127.0.0.1'), null);
});

test('T20: no host at all is not a production origin', () => {
  // Native, and the `expo export` prerender, where there is no window.
  // Refusing here would break the build that produces the app.
  assert.equal(fixtureModeRefusal(false, null), null);
  assert.equal(fixtureModeRefusal(false, undefined), null);
  assert.equal(fixtureModeRefusal(false, ''), null);
});

test('T20: the dev-origin rule covers the names a phone reaches a dev server by', () => {
  for (const host of ['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0',
                      'macbook.local', 'app.localhost']) {
    assert.equal(isDevelopmentOrigin(host), true, `${host} should be a dev origin`);
  }
});

test('T20: the dev-origin rule does not let a lookalike through', () => {
  for (const host of ['rosi-fit.vercel.app', 'localhost.evil.com', 'notlocalhost',
                      'local', 'mylocal.app']) {
    assert.equal(isDevelopmentOrigin(host), false, `${host} must not count as a dev origin`);
  }
});

test('T20: the rule ignores case', () => {
  assert.equal(isDevelopmentOrigin('LOCALHOST'), true);
  assert.equal(isDevelopmentOrigin('MacBook.Local'), true);
});

/* ===================================================================== T21
 * "NOTHING WAS WRITTEN" MUST NOT BE SAID BY A CLIENT THAT CANNOT KNOW.
 *
 * The commit is one transaction and the response is the only way to learn
 * what it did (T-021, T-109). If the request lands, the transaction commits
 * and the REPLY is lost, the register HAS moved — and the screen said the
 * opposite, flatly and with no hedge.
 */

test('T21: a lost response does not claim that nothing was written', () => {
  const text = commitFailureText(new TypeError('Failed to fetch'));
  assert.doesNotMatch(text, /Nothing was written/,
    'the client asserted the register was untouched when it never got an answer');
});

test('T21: a lost response says it cannot tell', () => {
  const text = commitFailureText(new TypeError('Failed to fetch'));
  assert.match(text, /cannot tell whether this file was imported/);
});

test('T21: it names the recovery that already exists', () => {
  // csv_imports_sha_completed makes a second upload of the same file safe,
  // and `already_imported` answers with what the first one did. That is the
  // whole of what an operator needs to do next.
  const text = commitFailureText(new TypeError('Failed to fetch'));
  assert.match(text, /[Uu]pload the same file again/);
  assert.match(text, /will not import it twice/);
});

test('T21: a timeout is also an unanswered request', () => {
  const text = commitFailureText(new Error(
    'This is taking too long. Check the connection and try again — nothing has been changed.'));
  assert.doesNotMatch(text, /Nothing was written\./);
});

test('T21: a SERVER REFUSAL still says nothing was written, because that is true', () => {
  // commit_csv_import raises inside its transaction, so a refusal rolls the
  // whole thing back. Hedging here would be its own kind of dishonesty.
  const text = commitFailureText(new FunctionError('row 47 (possible) needs a decision.', 400));
  assert.match(text, /Nothing was written\./);
  assert.match(text, /row 47/);
});

test('T21: a 500 from the function is still an answer', () => {
  assert.match(commitFailureText(new FunctionError('Could not stage this import.', 500)),
    /Nothing was written\./);
});

test('T21: answeredByServer is what tells the two apart', () => {
  assert.equal(answeredByServer(new FunctionError('refused', 409)), true);
  assert.equal(answeredByServer(new FunctionError('no status')), false);
  assert.equal(answeredByServer(new TypeError('Failed to fetch')), false);
  assert.equal(answeredByServer(null), false);
  assert.equal(answeredByServer('a string'), false);
});

test('T21: the PREVIEW keeps the old sentence, answered or not', () => {
  // A preview stages a `previewed` row and touches no attendance; both
  // server-side checks count only `completed`. So nothing was written is
  // true of a lost preview reply as well as a refused one.
  assert.match(previewFailureText(new TypeError('Failed to fetch')), /Nothing was written\./);
  assert.match(previewFailureText(new FunctionError('bad file', 400)), /Nothing was written\./);
});

test('T21: a failure carrying no message still produces a usable sentence', () => {
  assert.ok(commitFailureText({}).length > 0);
  assert.ok(previewFailureText(undefined).length > 0);
});
