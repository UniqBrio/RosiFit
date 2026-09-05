import test from 'node:test';
import assert from 'node:assert/strict';
import { DARK, LIGHT } from './tokens';

// RC-016 fixed the COMPOSITION -- a dialog route no longer paints an opaque
// panel over the screen it was opened from. It left the DIMMING tuned for the
// world where that panel was still there: at 0.7 over a #08040A background the
// now-visible screen composites back to imperceptible, and the requester
// reported the same black backdrop a second time.
//
// FormDialog states the obligation in its own docstring: "you can tell where
// you are without being able to read it." That is a claim about a NUMBER, and
// this is the number.
//
// One token, three backdrops -- FormDialog, Sheet and ConfirmDialog all read
// `theme.scrim` -- so this asserts the value rather than any one screen.

/** The alpha of an `rgba(r,g,b,a)` token. */
function alpha(token: string): number {
  const m = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)$/.exec(token);
  assert.ok(m, `scrim must be an rgba() token, got ${token}`);
  return Number(m![1]);
}

// The floor and the ceiling are both requirements, and they pull opposite ways.
//
// CEILING 0.55 — above this the screen behind stops being legible as a place.
// The share of the backdrop that survives is (1 - alpha): at 0.7 only 30% of
// the screen's own luminance comes through, and over a near-black app
// background that is the reported bug. At 0.5 half survives, which is what
// makes shapes and colour blocks readable as "the roster I was on".
//
// FLOOR 0.2 — below this the scrim stops doing its own job. It exists to say
// "this is over something": too light and the backdrop competes with the card
// for attention, which is the opposite failure and just as real.
const MAX_SCRIM_ALPHA = 0.55;
const MIN_SCRIM_ALPHA = 0.2;

test('the dark scrim leaves the screen behind legible', () => {
  const a = alpha(DARK.scrim);
  assert.ok(a <= MAX_SCRIM_ALPHA,
    `DARK.scrim alpha ${a} hides the screen behind it; must be <= ${MAX_SCRIM_ALPHA}`);
});

test('the light scrim leaves the screen behind legible', () => {
  const a = alpha(LIGHT.scrim);
  assert.ok(a <= MAX_SCRIM_ALPHA,
    `LIGHT.scrim alpha ${a} hides the screen behind it; must be <= ${MAX_SCRIM_ALPHA}`);
});

test('both scrims are still dark enough to read as a backdrop', () => {
  // The other direction. A scrim that dims nothing leaves the card floating on
  // live content, and "over something" stops being legible too.
  assert.ok(alpha(DARK.scrim) >= MIN_SCRIM_ALPHA, 'DARK.scrim must still dim');
  assert.ok(alpha(LIGHT.scrim) >= MIN_SCRIM_ALPHA, 'LIGHT.scrim must still dim');
});

test('the dark theme dims harder than the light theme', () => {
  // Not symmetry for its own sake. The dark app background is near-black, so
  // the same alpha buys far less separation there than over the light theme's
  // #F4EEF2 -- the dark scrim needs the larger share to read as a backdrop at
  // all, and the light one would look muddy at the dark one's value.
  assert.ok(alpha(DARK.scrim) > alpha(LIGHT.scrim),
    'the dark scrim carries the heavier dim; see the note above for why');
});

test('every scrim is translucent — never an opaque panel', () => {
  // The regression that started all of this. An alpha of 1, or a hex token
  // with no alpha channel at all, is a panel over the screen rather than a
  // scrim over it, and it is exactly what RC-016 was.
  for (const [name, token] of [['DARK', DARK.scrim], ['LIGHT', LIGHT.scrim]] as const) {
    assert.match(token, /^rgba\(/, `${name}.scrim must carry an alpha channel`);
    assert.ok(alpha(token) < 1, `${name}.scrim must not be opaque`);
  }
});
