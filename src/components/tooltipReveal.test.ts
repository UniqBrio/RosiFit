/**
 * Cases for when a tooltip is showing.
 *
 * Run: npx tsx --test src/components/tooltipReveal.test.ts
 *
 * The defect these exist to prevent is invisible on a desktop and total on a
 * phone: a touch fires `pointerenter` and `pointerleave` milliseconds apart,
 * so a tooltip written as "show on enter, hide on leave" flickers and is gone
 * before it can be read. Every academy owner using this app on a phone would
 * have seen exactly nothing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextReveal, isShowing, wantsTimer, HOLD_MS, type Reveal } from './tooltipReveal';

/** Replay a sequence of events from hidden, and report where it ends. */
const after = (...events: Parameters<typeof nextReveal>[1][]): Reveal =>
  events.reduce<Reveal>((state, e) => nextReveal(state, e), 'hidden');

test('hovering shows it, and taking the pointer away hides it again', () => {
  assert.equal(after('pointerEnter'), 'hover');
  assert.equal(after('pointerEnter', 'pointerLeave'), 'hidden');
});

test('A TAP SURVIVES THE POINTER LEAVING — the whole point on a phone', () => {
  // This exact sequence IS a touch: the browser fires enter, then the tap,
  // then leave, within a few milliseconds. Written as one boolean this ends
  // hidden and the bubble is never read.
  assert.equal(after('pointerEnter', 'tap', 'pointerLeave'), 'held');
  // and a bare tap with no enter before it, which is what some touch stacks send
  assert.equal(after('tap', 'pointerLeave'), 'held');
});

test('a held tooltip withdraws on its own, and on a press elsewhere', () => {
  assert.equal(after('tap', 'timeout'), 'hidden');
  assert.equal(after('tap', 'awayPress'), 'hidden');
});

test('neither dismissal can take a HOVERED tooltip away from under the cursor', () => {
  // A timer that fired on hover would blank the bubble while somebody is
  // still reading it, with their mouse sitting on the control.
  assert.equal(after('pointerEnter', 'timeout'), 'hover');
  assert.equal(after('pointerEnter', 'awayPress'), 'hover');
});

test('a tap wins from every state, because nobody taps a dead button by accident', () => {
  for (const from of ['hidden', 'hover', 'held'] as const) {
    assert.equal(nextReveal(from, 'tap'), 'held', `a tap from ${from} must hold it open`);
  }
});

test('hovering a HELD tooltip does not demote it to hover', () => {
  // Otherwise moving the mouse after tapping would re-arm the leave-dismiss
  // and the bubble would go on the next mouse move.
  assert.equal(after('tap', 'pointerEnter'), 'held');
  assert.equal(after('tap', 'pointerEnter', 'pointerLeave'), 'held');
});

test('a control that comes ALIVE takes its tooltip with it, however it was showing', () => {
  // A bubble left open by a tap, beside a button that has since become
  // usable, is a sentence that is no longer true sitting on the screen.
  for (const from of ['hidden', 'hover', 'held'] as const) {
    assert.equal(nextReveal(from, 'resolved'), 'hidden', `${from} must clear when resolved`);
  }
});

test('the timer runs for a tap and never for a hover', () => {
  assert.equal(wantsTimer('held'), true);
  assert.equal(wantsTimer('hover'), false);
  assert.equal(wantsTimer('hidden'), false);
});

test('showing is both ways of showing, never just one', () => {
  // A component asking `state === 'hover'` would draw nothing for a tap.
  assert.equal(isShowing('hover'), true);
  assert.equal(isShowing('held'), true);
  assert.equal(isShowing('hidden'), false);
});

test('the hold is long enough to read a sentence and short enough to forget', () => {
  assert.ok(HOLD_MS >= 4000 && HOLD_MS <= 10000,
    'a tapped tooltip must outlast reading it without becoming furniture');
});
