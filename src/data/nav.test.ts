/**
 * Cases for where a back button goes.
 *
 * Run: npx tsx --test src/data/nav.test.ts
 *
 * `from` is a URL parameter, so this is untrusted input on a control whose
 * whole promise is "you will end up where you were". A back button that
 * navigates to whatever a link said is an open redirect wearing an arrow icon.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { safeBackTarget } from './nav';

test('an in-app path is used', () => {
  assert.equal(safeBackTarget('/course/c1', '/courses'), '/course/c1');
});

test('a path with a query is used', () => {
  assert.equal(safeBackTarget('/course/c1?tab=members', '/courses'), '/course/c1?tab=members');
});

test('a route group and a dynamic segment survive', () => {
  assert.equal(safeBackTarget('/(tabs)/weekly', '/courses'), '/(tabs)/weekly');
  assert.equal(safeBackTarget('/member/[id]', '/courses'), '/member/[id]');
});

test('nothing given falls back', () => {
  assert.equal(safeBackTarget(undefined, '/courses'), '/courses');
  assert.equal(safeBackTarget('', '/courses'), '/courses');
  assert.equal(safeBackTarget('   ', '/courses'), '/courses');
});

test('a non-string falls back', () => {
  // expo-router hands back string | string[] for a repeated parameter.
  assert.equal(safeBackTarget(['/a', '/b'], '/courses'), '/courses');
  assert.equal(safeBackTarget(null, '/courses'), '/courses');
  assert.equal(safeBackTarget(7, '/courses'), '/courses');
});

test('an absolute URL is REFUSED', () => {
  assert.equal(safeBackTarget('https://evil.example/x', '/courses'), '/courses');
  assert.equal(safeBackTarget('http://evil.example', '/courses'), '/courses');
});

test('a protocol-relative host is REFUSED', () => {
  // '//evil.example' starts with a slash and would otherwise read as in-app,
  // while a browser treats it as another origin entirely.
  assert.equal(safeBackTarget('//evil.example/x', '/courses'), '/courses');
});

test('a backslash host is REFUSED', () => {
  // Some parsers normalise '\' to '/', so '/\evil.example' becomes '//evil…'.
  assert.equal(safeBackTarget('/\\evil.example', '/courses'), '/courses');
});

test('a javascript: target is REFUSED', () => {
  assert.equal(safeBackTarget('javascript:alert(1)', '/courses'), '/courses');
});

test('a relative path is refused — only absolute in-app paths', () => {
  assert.equal(safeBackTarget('course/c1', '/courses'), '/courses');
  assert.equal(safeBackTarget('../course/c1', '/courses'), '/courses');
});

test('the fallback is returned verbatim, never rewritten', () => {
  assert.equal(safeBackTarget('https://x', '/(tabs)/courses'), '/(tabs)/courses');
});
