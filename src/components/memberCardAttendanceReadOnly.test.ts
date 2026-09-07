import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "on member card there is present absent and yet to mark they are not button
 *  they are just status and when there is session on that day and no
 *  attendance uploaded yet then show yet to mark highlighter if uploaded
 *  attendnace show whether present or absent dont make is clickable and
 *  manual action"
 * (requests/2026-09-07-member-card-attendance-is-a-reading.md, ADR-023).
 *
 * This reverses the tap half of ADR-021. The three labels stay; the write
 * behind them goes. What can silently come back, and is guarded below:
 *
 *   - a Pressable creeps back into the row -- a second way to write the
 *     register, next to the uploaded session file that is meant to be the
 *     only one (guardrail 1's shape: one source, everything else derived);
 *   - the screen re-imports `setAttendance` for something else and the row
 *     quietly acquires a handler again;
 *   - the third label keeps saying "Yet to mark" on a day the course does
 *     not run, promising an upload that is never coming;
 *   - the inactive labels get dimmed back to the 0.45 a DISABLED CONTROL was
 *     allowed. They are static text now, and static text has to clear 4.5:1
 *     (guardrail 2).
 *
 * It reads source rather than rendering, for the reason
 * addMemberStatusShown.test.ts gives: there is no component harness in this
 * project, and the claim is about the shape of the block and what is in it.
 */

const ROOT = process.env.MEMBER_CARD_ATTENDANCE_SPEC_ROOT ?? process.cwd();
const SCREEN = 'app/course/[id].tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** The attendance row, from its banner comment to the gate that closes it. */
function attendanceBlock(src: string): string {
  const open = src.indexOf('attendance status');
  assert.notEqual(open, -1, 'the member card has no attendance status block');
  const close = src.indexOf(') : null}', open);
  assert.notEqual(close, -1, 'the attendance status block is never closed');
  return src.slice(open, close);
}

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, SCREEN)),
    `${ROOT} is not the repository root: no ${SCREEN}. Run from the root, or set MEMBER_CARD_ATTENDANCE_SPEC_ROOT.`);
});

test('the three labels are readings, not controls', () => {
  const block = attendanceBlock(read(SCREEN));
  assert.doesNotMatch(block, /<Pressable/,
    'a Pressable in the attendance row is a second way to write the register');
  assert.doesNotMatch(block, /onPress/,
    'the attendance row must carry no press handler');
  assert.doesNotMatch(block, /accessibilityRole=/,
    'no radio and no radiogroup: a reader that announces choices invites a tap that goes nowhere');
  assert.doesNotMatch(block, /aria-checked/,
    'aria-checked belongs to a control, and none of these is one');
});

test('the screen has no attendance write path at all', () => {
  const src = read(SCREEN);
  assert.doesNotMatch(src, /setAttendance/,
    `${SCREEN} must not import or call setAttendance -- the register is written by the uploaded session file`);
});

test('all three labels are still drawn, and one of them is filled', () => {
  const src = read(SCREEN);
  for (const word of ['Present', 'Absent', 'Yet to mark']) {
    assert.ok(src.includes(`word: '${word}'`) || src.includes(`word: '${word}',`),
      `the three readings must still include ${word}`);
  }
  const block = attendanceBlock(src);
  assert.match(block, /const on = day\.state === chip\.state;/,
    'which label is filled must come from the derived day state, not from a tap');
});

test('the unfilled labels are not dimmed', () => {
  const block = attendanceBlock(read(SCREEN));
  assert.doesNotMatch(block, /opacity:/,
    'static labels must not be dimmed: they are text, and text has to clear 4.5:1');
});

test('a day the course does not run says so, rather than "Yet to mark"', () => {
  const block = attendanceBlock(read(SCREEN));
  assert.match(block, /const missing = chip\.state === 'unmarked' && !day\.expected;/,
    'the unmarked label must distinguish "no session" from "session, no upload"');
  assert.match(block, /missing \? STATUS\.none/,
    'a day with no session must wear the Not expected tone the day strip already uses');
  assert.match(block, /missing \? tone\.word : chip\.word/,
    'the word must follow the tone, so a no-session day does not read "Yet to mark"');
  assert.match(block, /missing \? tone\.icon : chip\.icon/,
    'guardrail 3: the state carries its own icon as well as its own word');
});

test('a session with no upload yet is the highlighted one', () => {
  const block = attendanceBlock(read(SCREEN));
  assert.match(block, /chip\.tone \? STATUS\[chip\.tone\] : STATUS\.awaiting/,
    '"Yet to mark" must take the awaiting tone the strip uses for the same fact one line above');
  assert.match(block, /const box = on \? statusSurface\(ink\) : null;/,
    'only the true reading carries the fill');
});
