import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * THE BIG LISTS ARE WINDOWED, AND THEIR ROWS ARE MEMOISED.
 *
 * Run: npx tsx --test src/components/windowedLists.test.ts
 *
 * Members rendered every card into the DOM at once: 29,703 nodes for 1,644
 * members and a 1.4 s render on a fast machine, 90,111 nodes at 5,000
 * (docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md, RC-6). Attendance did
 * the same for every record in the period (49,476 nodes locally), the weekly
 * review for every flagged member. A `ScrollView` over `.map()` cannot window
 * anything; a FlatList that OWNS the scroll draws the rows near the viewport
 * and recycles the rest. On the source, as the other screen guards are, for
 * the reason hookInvalidation.test.ts gives: the screens import React Native
 * and expo-router, which do not resolve in this runner.
 */
const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const WINDOWED: { screen: string; list: string; rowComponent: string }[] = [
  { screen: 'app/(tabs)/members.tsx', list: 'members-list', rowComponent: 'MemberCard' },
  { screen: 'app/(tabs)/weekly.tsx', list: 'weekly-list', rowComponent: 'WeeklyRow' },
  { screen: 'app/(tabs)/attendance.tsx', list: 'attendance-list', rowComponent: 'AttendanceCard' },
];

for (const { screen, list, rowComponent } of WINDOWED) {
  test(`${screen}: the list is a FlatList that owns the scroll (Screen scroll={false})`, () => {
    const src = read(screen);
    assert.match(src, /<FlatList\b/, 'no FlatList: the rows are all in the DOM');
    assert.match(src, new RegExp(`testID="${list}"`), 'the list carries its handle');
    assert.match(src, /scroll=\{false\} pad=\{false\}/, 'a FlatList inside Screen\'s ScrollView cannot window');
    assert.match(src, /contentContainerStyle=\{screenBodyPadding\(true\)\}/, 'the list pads its content as the ScrollView did');
    assert.match(src, /keyExtractor=\{/);
    assert.match(src, /renderItem=\{renderItem\}/);
  });

  test(`${screen}: ${rowComponent} is memoised and gets stable handlers, never an inline arrow per row`, () => {
    const src = read(screen);
    assert.match(src, new RegExp(`const ${rowComponent} = memo\\(function ${rowComponent}\\(`), `${rowComponent} is not memo()`);
    const renderAt = src.indexOf('const renderItem = useCallback');
    assert.notEqual(renderAt, -1, 'renderItem must be a useCallback');
    const render = src.slice(renderAt, src.indexOf(']);', renderAt));
    assert.doesNotMatch(render, /on\w+=\{\(\) =>/, 'an inline arrow per row gives every row new props on every render');
  });
}

test('the Members tab no longer maps every member into a card', () => {
  assert.doesNotMatch(read('app/(tabs)/members.tsx'), /list\.map\(\(m, i\) => \(\s*<MemberCard/);
});

test('the course roster: each card gets ITS member\'s rows from an index, not the whole day to scan', () => {
  const src = read('app/course/[id].tsx');
  assert.match(src, /const rowsByMember = useMemo\(/, 'the day is indexed by member once per load');
  assert.equal((src.match(/rows=\{rowsFor\(/g) ?? []).length, 3, 'the three live sections read the index');
  assert.match(src, /const MemberCard = memo\(function MemberCard\(/);
  assert.match(src, /const pickerOptions = useMemo\(\(\) => !linking \? \[\] : allMembers/,
    'a closed picker must not be handed the whole register on every render');
  assert.match(src, /const toggleSelected = useCallback\(/);
});
