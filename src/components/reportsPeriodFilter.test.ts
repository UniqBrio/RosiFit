import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "Add filter dropdown for date filters in reports"
 * (requests/2026-09-07-reports-date-filter.md).
 *
 * Reports already held the period as state, resolved it, handed it to the
 * query and printed its label in the subtitle and in every exported row.
 * What it did not have was the control: `setPeriod` had NO CALL SITE, so the
 * screen was pinned to whatever calendar month it opened on while the header
 * named that range as though somebody had picked it. The file's own comment
 * -- "The period is a CONTROL, not a caption" -- described what did not ship.
 *
 * The four things that can silently go wrong here, each guarded below:
 *   - `setPeriod` loses its call site again and the screen goes back to
 *     rendering a period nobody can change. Nothing about that looks broken
 *     in a diff: the state, the resolve and the label all still read fine;
 *   - the filter drifts BELOW the loading/error/empty branch, where it
 *     disappears in exactly the state it is most needed -- an empty month
 *     with no way to ask for a different one;
 *   - the screen grows its own list of ranges instead of the shared
 *     `PeriodPanel`, so the same field means two things in one app (CP-012);
 *   - the default period is quietly changed, which moves every figure on the
 *     screen on first load without anything having been asked for.
 *
 * It reads source rather than rendering, for the same reason
 * addMemberStatusShown.test.ts and addMemberBranchDefault.test.ts do: there
 * is no component harness in this project, and the claim is about where the
 * control is mounted and what it is wired to.
 */

const ROOT = process.env.REPORTS_PERIOD_SPEC_ROOT ?? process.cwd();
const SCREEN = 'app/(tabs)/reports.tsx';
const src = () => fs.readFileSync(path.join(ROOT, SCREEN), 'utf8');

test('the period panel is wired to setPeriod — the control exists at all', () => {
  const s = src();
  assert.match(s, /<PeriodPanel[^>]*onChange=\{setPeriod\}/s,
    'PeriodPanel must receive setPeriod as onChange; without it the screen '
    + 'renders a period that cannot be changed, which is the defect this request fixed');
});

test('the field opens the panel and reports the current choice', () => {
  const s = src();
  assert.match(s, /testID="reports-filter-period"/, 'the period field needs its own testID');
  assert.match(s, /value=\{periodFieldValue\(period\)\}/,
    'the closed field must show the CHOSEN period through the shared formatter, '
    + 'so a custom range reads as its dates rather than as the words "Custom range"');
  assert.match(s, /onDone=\{\(\) => setPeriodOpen\(false\)\}/,
    'picking a preset must close the panel');
});

test('the filter renders in every state, not only the ready one', () => {
  const s = src();
  const filter = s.indexOf('<DropdownRow');
  const branch = s.indexOf("followUp.state === 'loading'");
  assert.ok(filter > -1, 'the filter row must be mounted');
  assert.ok(branch > -1, 'the loading/error/empty branch must still exist');
  assert.ok(filter < branch,
    'the period filter must sit ABOVE the loading/error/empty branch. Below it, '
    + 'a person looking at "Nothing to report yet" for a month they did not pick '
    + 'has no way to pick another one');
});

test('the ranges come from the shared control, never a local list', () => {
  const s = src();
  assert.match(s, /import \{ PeriodPanel, periodFieldValue \}/,
    'the panel and its formatter come from src/components/PeriodFilter.tsx');
  for (const literal of ['This week', 'Last week', 'Last 4 weeks', 'Custom range']) {
    assert.ok(!s.includes(`'${literal}'`) && !s.includes(`"${literal}"`),
      `Reports must not name the range "${literal}" itself — the named ranges belong `
      + 'to PERIOD_PRESETS, or the same field comes to mean two things in one app (CP-012)');
  }
});

test('the default period is unchanged, and the query and the label share one range', () => {
  const s = src();
  assert.match(s, /useState<PeriodChoice>\(\{ key: 'This month' \}\)/,
    'Reports opens on This month by design — the dashboard answers "this week", '
    + 'Reports answers "is it a trend". Changing this moves every figure on first load');
  assert.match(s, /const range = resolvePeriod\(period\);/);
  assert.match(s, /useFollowUp\(forced, range\)/,
    'the query must run over the same resolved range the subtitle names (CP-012)');
  assert.match(s, /subtitle=\{`\$\{range\.label\} · uploaded sessions only`\}/,
    'the subtitle must keep reading the same range object the query used');
});

test('the scope pills and both exports are untouched', () => {
  const s = src();
  // MUST NOT CHANGE, asserted rather than trusted: this change is a mount,
  // and a mount that quietly renamed a testID would break the harness runs
  // without failing a typecheck.
  assert.match(s, /testID=\{`reports-scope-\$\{s\.toLowerCase\(\)\}`\}/);
  assert.match(s, /testID="reports-export"/);
  assert.match(s, /testID="reports-export-excel"/);
});
