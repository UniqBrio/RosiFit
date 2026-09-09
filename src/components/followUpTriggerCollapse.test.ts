import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { triggerSummary, type TriggerReading } from '../data/followupTrigger';

/**
 * "add a chevron down button to follow up triggere card after they apply they
 *  can manually click on it so that it shrink by default it should be expanded
 *  all time" (requests/2026-09-09-follow-up-trigger-collapses.md)
 *
 * What can silently regress, and is guarded below:
 *
 *   - the panel starts COLLAPSED, on any screen, because somebody flipped the
 *     initial state or reached for storage. "By default it should be expanded
 *     all time" is the whole of the requester's second sentence, and a card
 *     that opens folded is the setting hidden again;
 *   - something collapses it on its own -- Apply, a save landing, an effect --
 *     when the ask was a control the person presses MANUALLY;
 *   - collapsed goes silent: the heading with no number, over a list of 435
 *     people the number produced. The panel exists because "saying nothing at
 *     all" was the complaint;
 *   - the collapsed line states the STEPPER's number instead of the number in
 *     force, so the card claims a rule that was never saved;
 *   - a typed-but-unapplied change is folded away with nothing left on screen
 *     to say the stepper and the rule disagree;
 *   - a failed save is hidden by a tidying press, on a screen whose next
 *     control sends email;
 *   - the chevron carries the state in the glyph alone (guardrail 3), or stops
 *     announcing `expanded` to a screen reader.
 *
 * The first half reads source rather than rendering, for the reason
 * dayStripUploadButton.test.ts gives: there is no component harness here, and
 * every claim is about what is drawn where. The second half tests the one
 * generated string as a value, where it belongs (C-67). One assertion per
 * test, so a failure names its own claim.
 */

const ROOT = process.env.TRIGGER_COLLAPSE_SPEC_ROOT ?? process.cwd();
const src = fs.readFileSync(
  path.join(ROOT, 'src/components/FollowUpTriggerPanel.tsx'), 'utf8');

/** the toggle control, from its testID to the end of its press handler */
const toggleAt = src.indexOf('testID={`${testID}-toggle`}');
const toggle = toggleAt === -1 ? '' : src.slice(toggleAt, toggleAt + 900);

test('the panel has a collapse toggle at all', () => {
  assert.notEqual(toggleAt, -1);
});

test('it starts EXPANDED — the initial state is not collapsed', () => {
  assert.match(src, /const \[collapsed, setCollapsed\] = useState\(false\)/);
});

test('expanded-by-default is not remembered anywhere between mounts', () => {
  // storage of any kind would make "all time" false on the second open
  assert.doesNotMatch(src, /localStorage|sessionStorage|AsyncStorage/);
});

test('nothing but a press changes it — no effect and no save collapses the card', () => {
  const sets = src.match(/setCollapsed\([^)]*\)/g) ?? [];
  assert.deepEqual(sets, ['setCollapsed(c => !c)']);
});

test('apply() does not touch the collapse', () => {
  const applyAt = src.indexOf('const apply = async () => {');
  const apply = src.slice(applyAt, src.indexOf('\n  };', applyAt));
  assert.equal(apply.includes('setCollapsed'), false);
});

test('the chevron flips direction with the state', () => {
  assert.match(toggle, /collapsed \? 'expand_more' : 'expand_less'/);
});

test('the chevron is never the only signal — a word is drawn beside it', () => {
  assert.match(toggle, /collapsed \? 'Show' : 'Hide'/);
});

test('the toggle announces expanded to a screen reader', () => {
  assert.match(toggle, /accessibilityState=\{\{ expanded: !collapsed \}\}/);
});

test('the toggle is a button with its own spoken label', () => {
  assert.match(toggle, /accessibilityRole="button"/);
  assert.match(toggle, /accessibilityLabel=\{collapsed/);
});

test('collapsed still states the trigger — the heading is not the whole card', () => {
  assert.match(src, /testID=\{`\$\{testID\}-summary`\}/);
});

test('the collapsed line comes from the generator, not from a literal', () => {
  assert.match(src, /triggerSummary\(reading, shown\)/);
});

test('a failed save survives the collapse — it is drawn outside both branches', () => {
  const failureAt = src.indexOf('testID={`${testID}-failure`}');
  const collapsedAt = src.indexOf('{collapsed ? (');
  const readonlyAt = src.indexOf('testID={`${testID}-readonly`}');
  // after the read-only branch means after the whole expanded/collapsed ternary
  assert.equal(failureAt > readonlyAt && readonlyAt > collapsedAt, true);
});

/* ------------------------------------------------ the one generated string */

const reading = (over: Partial<TriggerReading> = {}): TriggerReading => ({
  courseName: 'Postnatal', threshold: 1, resetTo: 3, source: 'course',
  kind: 'weekly', ...over,
} as TriggerReading);

test('with nothing typed it is the rule in force, and only that', () => {
  assert.equal(triggerSummary(reading(), 1), '1 missed session in a week');
});

test('the number in force is the SAVED one, never the stepper draft', () => {
  const line = triggerSummary(reading({ threshold: 4 }), 4);
  assert.equal(line, '4 missed sessions in a week');
});

test('a typed change is NAMED, with the saved number still first', () => {
  assert.equal(triggerSummary(reading({ threshold: 4 }), 1),
    '4 missed sessions in a week · 1 missed session in a week typed, not applied');
});

test('a consecutive rule collapses to what it actually is', () => {
  assert.equal(triggerSummary(reading({ kind: 'consecutive', threshold: 3 }), 3),
    '3 consecutive missed sessions');
});

test('and its pending half is weekly, because that is what Apply would write', () => {
  assert.equal(triggerSummary(reading({ kind: 'consecutive', threshold: 3 }), 2),
    '3 consecutive missed sessions · 2 missed sessions in a week typed, not applied');
});

test('an out-of-range draft is clamped before it is compared, not after', () => {
  // 99 clamps to the maximum; it must not read as "99 typed"
  assert.equal(triggerSummary(reading({ threshold: 7 }), 99), '7 missed sessions in a week');
});
