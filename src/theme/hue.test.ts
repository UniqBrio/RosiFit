/**
 * Cases for reading a hue out of a typed hex.
 *
 * Run: npx tsx --test src/theme/hue.test.ts
 *
 * This is a guardrail, not a convenience. The custom accent is stored as a
 * HUE because the generator darkens it until white text clears 4.5:1 and
 * check-contrast.ts verifies all 360. A hex accepted verbatim would walk
 * round that: somebody types #FFFF00 and ships white labels at 1.07:1.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { hueFromHex } from './tokens';

test('the six primaries and secondaries land on their own hues', () => {
  assert.equal(hueFromHex('#FF0000'), 0);
  assert.equal(hueFromHex('#FFFF00'), 60);
  assert.equal(hueFromHex('#00FF00'), 120);
  assert.equal(hueFromHex('#00FFFF'), 180);
  assert.equal(hueFromHex('#0000FF'), 240);
  assert.equal(hueFromHex('#FF00FF'), 300);
});

test('the RosiFit pink reads back as its own hue', () => {
  // #D6157F is the shipped accent, so the value a person is most likely to
  // paste has to come back as the colour they already see.
  assert.equal(hueFromHex('#D6157F'), 327);
});

test('the leading hash is optional', () => {
  assert.equal(hueFromHex('D6157F'), hueFromHex('#D6157F'));
});

test('case does not matter', () => {
  assert.equal(hueFromHex('#d6157f'), hueFromHex('#D6157F'));
});

test('surrounding whitespace is trimmed, because paste brings it', () => {
  assert.equal(hueFromHex('  #D6157F \n'), 327);
});

test('a HALF-TYPED value leaves the colour alone', () => {
  // Returning 0 here would make the accent jump to red on the way to every
  // hex a person types.
  assert.equal(hueFromHex('#D61'), null);
  assert.equal(hueFromHex('#'), null);
  assert.equal(hueFromHex(''), null);
});

test('a grey has no hue, and is not silently called red', () => {
  assert.equal(hueFromHex('#808080'), null);
  assert.equal(hueFromHex('#000000'), null);
  assert.equal(hueFromHex('#FFFFFF'), null);
});

test('a 3-digit shorthand is refused rather than half-read', () => {
  assert.equal(hueFromHex('#F00'), null);
});

test('non-hex characters are refused', () => {
  assert.equal(hueFromHex('#GGGGGG'), null);
  assert.equal(hueFromHex('pink'), null);
});

test('every hue it returns is inside 0..359, which is what the generator takes', () => {
  // The generator is verified for 0..359 only; a 360 or a -1 would be a
  // position CI never measured.
  // #FF0001 is the case that caught this: its true hue is 359.765, and
  // rounding before the modulo returned 360.
  for (const hex of ['#FF0001', '#01FF00', '#0001FF', '#FE00FF', '#D6157F']) {
    const h = hueFromHex(hex)!;
    assert.ok(h >= 0 && h <= 359, `${hex} gave ${h}`);
  }
  assert.equal(hueFromHex('#FF0001'), 0);
});
