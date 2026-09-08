import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "Ask for confirmation when user click on signout"
 * (requests/2026-09-08-confirm-before-sign-out.md).
 *
 * Sign out took effect on the first tap. On More the row sits third in a list
 * of harmless settings -- under Appearance and Help & support -- and the act
 * it performed cannot be undone from the app: the session is indefinite until
 * Sign Out (ADR-031), so the way back in is the mobile number and the PIN.
 *
 * WHAT CAN SILENTLY GO WRONG, AND IS GUARDED BELOW:
 *
 *   - ONE of the two controls gains the question. There are two sign-out
 *     controls for one act -- the More row and the profile button -- and a
 *     confirmation on one of them makes the same words mean different things
 *     depending on where they were tapped;
 *   - the two screens grow their OWN wording for the question, which is how
 *     the Members tab's card and the roster card came to say different things
 *     after the same write (`memberRemoval.ts` was extracted against exactly
 *     that);
 *   - the confirm button calls `signOut()` while a revocation is already in
 *     flight, because the label still reads "Sign out" during the server call;
 *   - a revocation that FAILED navigates anyway, claiming a session ended that
 *     did not -- the failure this app already refuses to make on resume ("a
 *     server that does not answer is not a sign-out", FEATURE_TRUTH);
 *   - the AUTOMATIC sign-outs acquire a dialog. `session.ts` signs out when a
 *     session resolves to no account or to a closed one. Those are not clicks,
 *     there is nobody to ask, and a disabled account must not be offered
 *     "Stay signed in".
 *
 * It reads source rather than rendering, for the reason
 * courseRosterRemoveMember.test.ts gives: there is no component harness in
 * this project, and the claim is about which control is wired to which act.
 */

const ROOT = process.env.SIGN_OUT_CONFIRM_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Every control a person can tap to end her own session. */
const SCREENS = ['app/(tabs)/more.tsx', 'app/profile.tsx'];
const PROMPT = 'src/data/signOutPrompt.ts';

test('the spec is looking at a real tree', () => {
  for (const rel of [...SCREENS, PROMPT]) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)),
      `${ROOT} is not the repository root: no ${rel}. Run from the root, or set SIGN_OUT_CONFIRM_SPEC_ROOT.`);
  }
});

test('BOTH sign-out controls ask first -- neither ends the session on the tap', () => {
  for (const rel of SCREENS) {
    const src = read(rel);
    assert.match(src, /setConfirmSignOut\(true\)/,
      `${rel}: the control must OPEN the question, not sign out`);
    assert.match(src, /open=\{confirmSignOut\}/,
      `${rel}: the dialog must be driven by that state`);
    assert.match(src, /onConfirm=\{\(\) => \{ void leave\(\); \}\}/,
      `${rel}: the session may only end from the confirm`);
  }
});

test('the question is ONE question, held in one file', () => {
  const prompt = read(PROMPT);
  for (const rel of SCREENS) {
    const src = read(rel);
    assert.match(src, /import \{ SIGN_OUT_PROMPT \} from '(\.\.\/)+src\/data\/signOutPrompt'/,
      `${rel}: the wording comes from the shared module`);
    for (const key of ['title', 'body', 'cancel'] as const) {
      assert.match(src, new RegExp(`SIGN_OUT_PROMPT\\.${key}`),
        `${rel}: ${key} must come from SIGN_OUT_PROMPT, never be written into the screen`);
    }
  }
  // The two halves the question exists to state: what it costs, and what it
  // does NOT do. `scope: 'local'` is deliberate (ADR-031) and a person signing
  // out of a shared device is entitled to know which sessions this ends.
  assert.match(prompt, /mobile number and PIN to sign back in/,
    'the question must say what signing back in will need');
  assert.match(prompt, /Only this device is signed out/,
    'the question must say what survives, as the removal confirmation does');
  assert.match(prompt, /cancel: 'Stay signed in'/,
    'the way out says what staying means, not ConfirmDialog\'s default "Not yet"');
});

test('a revocation in flight cannot be tapped a second time', () => {
  for (const rel of SCREENS) {
    const src = read(rel);
    assert.match(src, /if \(leaving\) return;/,
      `${rel}: a confirm pressed twice must not start a second revocation`);
    assert.match(src, /confirmLabel=\{leaving \? SIGN_OUT_PROMPT\.busy : SIGN_OUT_PROMPT\.confirm\}/,
      `${rel}: the label must say the request is in flight`);
  }
});

test('a revocation that failed does not pretend the session ended', () => {
  for (const rel of SCREENS) {
    const src = read(rel);
    const out = src.indexOf('await signOut();');
    const nav = src.indexOf('toSignIn();');
    assert.ok(out > -1 && nav > out,
      `${rel}: the session still ends BEFORE the route changes (RC-022)`);
    // The catch returns rather than falling through to toSignIn(), so the
    // question stays open with a live button -- which is the retry.
    assert.match(src, /\} catch \{[\s\S]*?setLeaving\(false\);\s*\n\s*return;\s*\n\s*\}/,
      `${rel}: a failed revocation must clear the busy state and NOT navigate`);
  }
});

test('the automatic sign-outs are not asked about', () => {
  const session = read('src/data/session.ts');
  assert.doesNotMatch(session, /ConfirmDialog|SIGN_OUT_PROMPT/,
    'session.ts signs out a missing or closed account by itself: there is nobody to ask');
  assert.match(session, /if \(!data\) \{ await signOut\(\); return \{ state: 'none' \}; \}/,
    'the no-account sign-out stays immediate');
  assert.match(session, /if \(!data\.is_active\) \{ await signOut\(\); return \{ state: 'closed' \}; \}/,
    'a disabled account must never be offered "Stay signed in"');
});
