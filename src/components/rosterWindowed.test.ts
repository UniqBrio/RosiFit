import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * THE COURSE ROSTER IS A WINDOWED LIST (06-Oct-2026; Step 3 of the
 * deployment-preparation pass, docs/PERFORMANCE_FIX_FINAL_REPORT_2026-10-06.md).
 *
 * Run: npx tsx --test src/components/rosterWindowed.test.ts
 *
 * The screen's ScrollView held every card at once -- 11,986 DOM nodes at
 * 1,644 members, 36,063 at 5,000. It is a FlatList now: the header is what
 * was above the cards, the items are the cards with each section's heading
 * and note as items of their own, in the order the ScrollView drew them.
 * These pin the shape; the roster's behaviour specs (18 files) pin the rest.
 */
const SCREEN = path.join(process.cwd(), 'app/course/[id].tsx');
const src = fs.readFileSync(SCREEN, 'utf8');
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

test('the roster is a FlatList that owns the scroll, with the old content as its header', () => {
  const list = code.indexOf('<FlatList\n        testID="course-roster"');
  assert.ok(list > 0, 'no windowed roster list');
  const block = code.slice(list, code.indexOf('ListHeaderComponent={<View>', list) + 30);
  assert.match(block, /contentContainerStyle=\{\{ paddingBottom: 110 \}\}/, 'the bottom inset the ScrollView had');
  assert.match(block, /data=\{rosterItems\(\{/, 'the items come from rosterItems');
  assert.match(block, /keyExtractor=\{rosterItemKey\}/);
  assert.match(block, /renderItem=\{renderRosterItem\}/);
  assert.match(block, /initialNumToRender=\{12\}/);
  assert.match(block, /windowSize=\{7\}/);
  // no card is rendered inside the header any more
  const header = code.slice(list, code.indexOf('</View>} />', list));
  assert.ok(!/<MemberCard /.test(header), 'a card is still drawn in the header, outside the window');
});

test('the items keep the sections in order: live cards, No email, Email issues, Inactive', () => {
  const at = code.indexOf('function rosterItems(');
  assert.ok(at > 0);
  const body = code.slice(at, code.indexOf('const rosterItemKey', at));
  const order = ['withEmail.map(', "push('noemail'", 'withoutEmail.map(', "push('issues'", 'issueGroups.map(group =>', 'group.rows.map(', "push('inactive'", 'inactiveListed.map('];
  let last = -1;
  for (const marker of order) {
    const i = body.indexOf(marker);
    assert.ok(i > last, `${marker} is missing or out of order`);
    last = i;
  }
  // the four card shapes are the roster's cards, unchanged
  assert.equal((body.match(/<MemberCard /g) ?? []).length, 4, 'live, no-email, issue and inactive cards');
  assert.match(body, /rows=\{marks\.data \?\? \[\]\}[\s\S]{0,400}offRegister selectable=\{false\}/, 'inactive cards still take the whole day and no checkbox');
  assert.equal((body.match(/rows=\{rowsFor\(/g) ?? []).length, 3, 'the three live sections read the index');
});

test('every item wears the sides the block wore, and its section\'s gap', () => {
  assert.match(code, /const renderRosterItem: ListRenderItem<RosterItem> = \(\{ item \}\) => \(\s*<View style=\{\{ paddingHorizontal: SPACE\.lg, marginTop: item\.top \}\}>\{item\.element\}<\/View>/);
});

test('the gate matches the header\'s own empty states, and Inactive is outside it', () => {
  assert.match(code, /const rosterReady = followUp\.state !== 'loading' && followUp\.state !== 'error'\s*\n\s*&& scoped\.length > 0 && joinedByDay\.length > 0 && onDay\.length > 0\s*\n\s*&& searched\.length > 0 && shown\.length > 0;/);
  const at = code.indexOf('function rosterItems(');
  const body = code.slice(at, code.indexOf('const rosterItemKey', at));
  const ready = body.indexOf('if (c.ready) {');
  const inactive = body.indexOf("push('inactive'");
  const readyEnd = body.indexOf('\n  }\n', ready);
  assert.ok(ready > 0 && inactive > readyEnd, 'the Inactive section must be built whether or not the register is shown');
});
