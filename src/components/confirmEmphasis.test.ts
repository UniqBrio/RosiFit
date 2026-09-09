import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { confirmButtonStyles, isFilled } from './confirmEmphasis';

/**
 * requests/2026-09-08-member-delete-confirm-yes-no.md
 *
 * "when user click on delete on member card confirm that you are deleting a
 * member and its record entire[ly] do you want to delete yes or no button
 * highligh no with dark background".
 *
 * WHAT CAN SILENTLY GO WRONG, AND IS GUARDED BELOW:
 *
 *   - the emphasis inverts, and the dialog fills the button that deletes.
 *     Nothing about the screen would look wrong; the words would still be
 *     right and the wrong answer would be the one under the thumb. This is
 *     why the mapping is a function (src/components/confirmEmphasis.ts) and
 *     is asserted here in both directions rather than read off the styles;
 *   - the OTHER eleven ConfirmDialogs in the app quietly change shape.
 *     `emphasis` defaults to 'confirm', which is what they all drew before,
 *     and the default is asserted below -- a change of default would restyle
 *     the sign-out, the send, the holiday and the branch dialogs at once;
 *   - both member cards stop agreeing. The Members tab and the course roster
 *     card ask the same question about the same write, so both are checked;
 *   - the fill loses its border. In the dark theme `safeFill` measures 1.06:1
 *     against the dialog card it sits on -- without the drawn edge it is not
 *     a button, it is a hole. Guardrail 2 covers the LABEL on that fill in
 *     check-contrast.ts; nothing there can see a missing border.
 *
 * The screen half reads source rather than rendering, for the reason
 * courseRosterRemoveMember.test.ts gives: there is no component harness in
 * this project, and the claim is about the shape of the call.
 */

const ROOT = process.env.CONFIRM_EMPHASIS_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const SHEET = 'src/components/Sheet.tsx';
const MEMBERS = 'app/(tabs)/members.tsx';
const ROSTER = 'app/course/[id].tsx';

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, SHEET)),
    `${ROOT} is not the repository root: no ${SHEET}. Run from the root, or set CONFIRM_EMPHASIS_SPEC_ROOT.`);
});

test('a destructive dialog fills the answer that changes nothing', () => {
  const { cancel, confirm } = confirmButtonStyles('cancel');
  assert.equal(cancel, 'safe', 'the No must be the filled one -- that is the whole request');
  assert.equal(confirm, 'outline-danger',
    'the Yes must not also be filled: it stays available, in the danger ink, and stops competing for the thumb');
});

test('every other dialog is left exactly as it was', () => {
  const { cancel, confirm } = confirmButtonStyles('confirm');
  assert.equal(confirm, 'accent', 'the ordinary dialog keeps its accent primary');
  assert.equal(cancel, 'outline', 'and its outline secondary');
});

test('exactly one of the two is ever filled', () => {
  for (const emphasis of ['confirm', 'cancel'] as const) {
    const { cancel, confirm } = confirmButtonStyles(emphasis);
    assert.equal([cancel, confirm].filter(isFilled).length, 1,
      `${emphasis}: two filled buttons is a dialog with no recommended answer, none is one with no shape`);
  }
});

test('the emphasis defaults to the confirm button', () => {
  const src = read(SHEET);
  assert.match(src, /emphasis = 'confirm'/,
    "the eleven dialogs that pass no emphasis must keep the shape they had; the default is what holds them");
});

test('the filled safe answer carries a drawn edge, not just a fill', () => {
  const src = read(SHEET);
  assert.match(src, /backgroundColor: theme\.safeFill, borderWidth: 1, borderColor: theme\.lineStrong/,
    'safeFill barely out-contrasts the dark theme\'s dialog card -- the border is what makes it a button');
  assert.match(src, /theme\.onSafeFill/,
    'and it is lettered in the ink measured against that fill in check-contrast.ts, not in fgStrong');
});

test('both member cards ask the same question, and both highlight No', () => {
  for (const screen of [MEMBERS, ROSTER]) {
    const src = read(screen);
    assert.match(src, /emphasis="cancel"/,
      `${screen}: the member deletion must put its weight behind the answer that keeps the member`);
    assert.match(src, /cancelLabel="No"/, `${screen}: the requested wording is Yes / No`);
    assert.match(src, /confirmLabel=\{removing \? 'Deleting…' : 'Yes'\}/,
      `${screen}: the confirm says Yes, and says something else while its own write is in flight`);
    // Not anchored to the closing brace: the Members tab's title is a ternary
    // (the dialog outlives its own member for one render), the roster's is not.
    // COPY-LOCK RE-POINTED 09-Sep-2026, de-gendering: "and her records?" ->
    // "and every record?" (requester: "no where her should be used"). Still
    // one exact string, still the same claim -- the title says the records go
    // too, not just the member.
    assert.match(src, /and every record\?`/,
      `${screen}: the title must state that the records go too, not just the member`);
  }
});
