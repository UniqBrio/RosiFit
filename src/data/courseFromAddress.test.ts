import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseFromAddress, isFromAddress } from '../../supabase/functions/_shared/from-address.ts';
import { SENDERS } from './mock.ts';

// The defect these pin: the From Email ID picked in the course form was
// STORED and NEVER READ. send-followups called SES with SES_FROM_ADDRESS
// whatever the course said, so an academy that set one course to its second
// address watched every message from that course go out as the first one --
// and the send reported SENT, because delivery genuinely succeeded. Nothing
// anywhere reported the sender it had actually used.
//
// Like fromAddress.test.ts, this imports the module the Edge Function
// imports. A copy of the rule kept here would pass while production sent
// from the wrong address, which is the whole failure being fixed.

const DEFAULT = 'support@getfit.rosifit.com';
const OTHER   = 'support@getfit.ravisfit.com';

test("a course's own address is what it sends as", () => {
  // The entire point of the change: picking the second address in the course
  // form has to reach SES.
  const choice = chooseFromAddress(OTHER, DEFAULT);
  assert.equal(choice.ok, true);
  assert.ok(choice.ok && choice.from === OTHER);
  assert.ok(choice.ok && choice.source === 'course');
});

test("a course that picked the deployment's own address still says so", () => {
  // Same address as the fallback, but chosen -- source distinguishes them,
  // because "it happens to match" and "nobody chose" are different facts.
  const choice = chooseFromAddress(DEFAULT, DEFAULT);
  assert.ok(choice.ok && choice.from === DEFAULT);
  assert.ok(choice.ok && choice.source === 'course');
});

test('a course with no communication row falls back to the deployment', () => {
  // Most courses. course_communication has one row per configured course and
  // none for a course nobody has opened the message editor on.
  for (const absent of [null, undefined, '', '   ']) {
    const choice = chooseFromAddress(absent, DEFAULT);
    assert.ok(choice.ok && choice.from === DEFAULT, `${JSON.stringify(absent)} falls back`);
    assert.ok(choice.ok && choice.source === 'default');
  }
});

test('surrounding whitespace on a stored address does not change the choice', () => {
  const choice = chooseFromAddress(`  ${OTHER}  `, DEFAULT);
  assert.ok(choice.ok && choice.from === OTHER);
});

test('a stored value that is not an address is REFUSED, never substituted', () => {
  // The important half. Falling back to the secret here would send the
  // message successfully from the wrong address and report success -- the
  // exact defect. The caller excludes the recipient and names the course.
  for (const bad of ['support', 'support@getfit', 'a@b.com,c@d.com', '<a@b.com']) {
    const choice = chooseFromAddress(bad, DEFAULT);
    assert.equal(choice.ok, false, `${bad} is refused`);
    assert.ok(!choice.ok && choice.badValue === bad, 'the value is handed back to be quoted at the user');
  }
});

test('the display form survives, because SES accepts it', () => {
  const choice = chooseFromAddress(`RosiFit Academy <${OTHER}>`, DEFAULT);
  assert.ok(choice.ok && choice.from === `RosiFit Academy <${OTHER}>`);
});

test('with no default configured, an unconfigured course yields no sender', () => {
  // The dev provider: EMAIL_PROVIDER=dev has no SES_FROM_ADDRESS and no
  // sender at all. `undefined` is the honest answer and the caller records
  // NULL, rather than writing down an address that was never used.
  const choice = chooseFromAddress(null, undefined);
  assert.ok(choice.ok && choice.from === undefined);
  assert.ok(choice.ok && choice.source === 'default');
});

test("a course's address still works when the deployment has none", () => {
  const choice = chooseFromAddress(OTHER, undefined);
  assert.ok(choice.ok && choice.from === OTHER);
});

test('every address the course form OFFERS is one this rule accepts', () => {
  // The picker and the send path cannot be allowed to disagree: an address a
  // person can select and the sender cannot use would exclude every recipient
  // of that course, and the course form would have given no hint.
  for (const s of SENDERS) {
    assert.ok(isFromAddress(s), `${s} is a usable from-address`);
    const choice = chooseFromAddress(s, DEFAULT);
    assert.ok(choice.ok && choice.from === s, `${s} survives the choice`);
  }
});
