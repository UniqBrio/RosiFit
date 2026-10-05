import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * EVERY BIG SEARCH BOX APPLIES ITS QUERY AFTER A QUIET, AND THE MEMBERS TAB
 * SEARCHES PRECOMPUTED TEXT.
 *
 * Run: npx tsx --test src/data/searchDebounce.test.ts
 *
 * On the source, as hookInvalidation.test.ts is: the screens import React
 * Native and expo-router. The rule itself (src/data/debounce.ts) is tested
 * directly in debounce.test.ts.
 */
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

test('useDebouncedQuery is the wiring of applyAfterMs, and clears at once', () => {
  const hooks = read('src/data/hooks.ts');
  assert.match(hooks, /export function useDebouncedQuery\(query: string\): string/);
  assert.match(hooks, /const wait = applyAfterMs\(query\);\s*if \(wait === 0\) \{ setApplied\(query\); return; \}/);
  assert.match(hooks, /return \(\) => clearTimeout\(timer\);/, 'a superseded keystroke must cancel its timer');
});

for (const [screen, use] of [
  ['app/(tabs)/members.tsx', /const applied = useDebouncedQuery\(query\);/],
  ['app/(tabs)/attendance.tsx', /const q = useDebouncedQuery\(query\)\.trim\(\)\.toLowerCase\(\);/],
  ['app/course/[id].tsx', /const appliedQuery = useDebouncedQuery\(query\);/],
] as const) {
  test(`${screen}: the list is narrowed by the applied query, the box by the typed one`, () => {
    const src = read(screen);
    assert.match(src, use, 'the query is applied on every keystroke');
    assert.match(src, /value=\{query\} onChangeText=\{setQuery\}/, 'the box must still render the typed value directly');
  });
}

test('the Members tab searches a per-member text built once per register, not an array per keystroke', () => {
  const src = read('app/(tabs)/members.tsx');
  assert.match(src, /const searchText = useMemo\(\(\) => new Map\(members\.map\(m => \[m\.id,/);
  assert.match(src, /\[m\.name, m\.code, primaryEmail\(m\), \.\.\.m\.aliases\]\.join\('\\n'\)\.toLowerCase\(\)/,
    'the four fields the placeholder promises, lower-cased once');
  assert.match(src, /const matches = !q \|\| \(searchText\.get\(m\.id\) \?\? ''\)\.includes\(q\);/);
});

test('the course roster narrows by the applied query but its sentences still quote what was typed', () => {
  const src = read('app/course/[id].tsx');
  assert.match(src, /narrowToSearch\(onDay, appliedQuery\)/);
  assert.match(src, /narrowToSearch\(inactiveOnDay, appliedQuery\)/);
  assert.match(src, /matches “\$\{query\.trim\(\)\}”/, 'the empty-search sentence quotes the typed query');
});
