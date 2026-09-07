import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "In the Edit Course flow, allow the user to set when a member should become
 * inactive ... The member should remain active until that date and become
 * inactive from that date onward"
 * (requests/2026-09-07-member-inactive-from-date.md).
 *
 * The RULE has its own specs (src/data/inactiveFrom.test.ts) and the DATABASE
 * has its own (supabase/tests/34_member_inactive_from.sql). What neither of
 * them can see is the wiring: a derivation that is right and a form that
 * never sends its value is a feature that does not exist.
 *
 * The four things that can silently go wrong here, each guarded below:
 *   - the field renders beside Active, where the date cannot be stored
 *     (members_inactive_from_needs_status) and means nothing;
 *   - it acquires a `max`, which would refuse the FUTURE date that is the
 *     whole of the request;
 *   - the Save writes the status and drops the date, or measures a change on
 *     the status alone so moving only the date saves nothing;
 *   - the roster pill goes back to reading `member.status` directly and
 *     starts calling a member Inactive for the five weeks she is still being
 *     followed up.
 *
 * It reads source rather than rendering, for the same reason
 * addMemberStatusShown.test.ts does: there is no component harness in this
 * project, and the claim is about the shape of the gate and what is in it.
 */

const ROOT = process.env.INACTIVE_FROM_SPEC_ROOT ?? process.cwd();
const FORM = 'app/member/edit.tsx';
const ROSTER = 'app/course/[id].tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** The DateField call for the inactive date, opening tag to closing slash. */
function field(src: string): string {
  const open = src.indexOf('<DateField label="Inactive from"');
  assert.notEqual(open, -1, 'the Edit form has no "Inactive from" date field');
  const close = src.indexOf('/>', open);
  assert.notEqual(close, -1, 'the "Inactive from" field is never closed');
  return src.slice(open, close);
}

test('the spec is looking at a real tree', () => {
  assert.ok(read(FORM).includes('export default function MemberEdit'), FORM);
  assert.ok(read(ROSTER).includes('function MemberCard'), ROSTER);
});

test('the date is offered only beside a non-active pick', () => {
  const src = read(FORM);
  // Not `status === 'inactive'`: a record holding the CHECK's third value
  // ('paused') seeds the Inactive choice and must show its date too.
  assert.match(src, /\{status !== 'active' \? \(\s*<View[^>]*>\s*<DateField label="Inactive from"/,
    'the field must be gated on the pick being non-active — a date beside Active is one '
    + 'members_inactive_from_needs_status (0045) will not hold');
});

test('a FUTURE date is accepted — the field carries no max', () => {
  const f = field(read(FORM));
  assert.doesNotMatch(f, /\bmax=/,
    'a max on this field would refuse "she leaves next month", which is the request itself. '
    + 'The "Joined on" field above has one; this one must not.');
});

test('and a date before she joined is greyed out rather than refused afterwards', () => {
  assert.match(field(read(FORM)), /min=\{existing\.joinedOn \?\? undefined\}/,
    'min must be her joining day, so the calendar cannot offer a departure before an arrival');
});

test('the Save sends the date, not just the status', () => {
  const src = read(FORM);
  assert.match(src, /await setMemberStatus\(existing\.id, status, wantedInactiveFrom \|\| null\)/,
    'set_member_status (0045) takes the date as its third argument; sending only the status '
    + 'would store a departure with no date and lose the whole request');
});

test('moving ONLY the date counts as a change', () => {
  const src = read(FORM);
  // "She leaves on the 30th, not the 12th" is a real edit. A form measuring
  // the status alone would offer to save it and then write nothing.
  assert.match(src, /const statusChanged = !!existing\s*\r?\n\s*&& \(status !== storedStatus \|\| wantedInactiveFrom !== storedInactiveFrom\)/,
    'the change must be measured on the PAIR');
});

test('Active never carries a date to the write', () => {
  assert.match(read(FORM), /const wantedInactiveFrom = status === 'active' \? '' : inactiveFrom\.trim\(\)/,
    'coming back onto the register is not a dated act, and the constraint would refuse one');
});

test('the Save is held while the date is refused, and the footer says why', () => {
  const src = read(FORM);
  assert.match(src, /const valid = [\s\S]{0,200}?&& !inactiveFromError/,
    'a Save that offers to write a date the database will decline is a Save that lies');
  assert.match(src, /: inactiveFromError \? inactiveFromError/,
    'a disabled Save with the course name under it explains nothing — the hint must name the field');
});

test('the form does not invent a date for a record that never had one', () => {
  const src = read(FORM);
  assert.match(src, /setInactiveFrom\(existing\.inactiveFrom \?\? ''\)/,
    'seeding must carry null through as blank; today\'s date there would claim she left on a '
    + 'day nobody recorded — every member marked inactive before 0045 carries no date');
});

test('picking Inactive fills today in, so the ordinary case costs no extra decision', () => {
  assert.match(read(FORM), /if \(next !== 'active' && !inactiveFrom\.trim\(\)\) setInactiveFrom\(iso\(new Date\(\)\)\)/,
    'the pick used to mean "she is off the register now" and must go on meaning it; '
    + 'a date already in the box is left alone');
});

/* -------------------------------------------------------------- the roster */

test('the roster pill reads the DAY, never the stored column', () => {
  const src = read(ROSTER);
  assert.match(src, /const inactive = !isActiveOn\(member, statusDay\)/,
    'the card is about the selected day and the pill is on the card; reading member.status '
    + 'directly is what made a member due to leave in October read Inactive all September');
  assert.doesNotMatch(src, /const inactive = member\.status !== 'active'/,
    'the undated reading must not come back');
});

test('but the TAP is about today, in the write, the title and the button', () => {
  const src = read(ROSTER);
  assert.match(src, /const wanted: MemberStatus = inactiveToday \? 'active' : 'inactive'/,
    'a control on a past week that flipped the state as it was three weeks ago would undo '
    + 'every change made since');
  assert.match(src, /title=\{inactiveToday \?/, 'the confirmation names today, not the strip');
  assert.match(src, /confirmLabel=\{saving \? 'Saving…' : inactiveToday \?/,
    'and so does the button that does it');
});

test('the pill writes a date, so the two surfaces record the same kind of fact', () => {
  assert.match(read(ROSTER),
    /await setMemberStatus\(member\.id, wanted, wanted === 'active' \? null : todayIso\)/,
    'the one-tap pill has always meant "from now on"; now it says so in the column');
});

test('a departure still to come is stated on the card, not left to the day it happens', () => {
  const src = read(ROSTER);
  // Against `statusDay`, not `todayIso` -- see the pending-tense test below,
  // which is why that argument changed.
  assert.match(src, /const pending = pendingInactiveFrom\(member, statusDay\)/);
  assert.match(src, /course-member-pending-\$\{member\.id\}/,
    'the scheduled date needs its own testID or nothing can assert it is drawn');
  assert.match(src, /\{`Inactive from \$\{dateInWords\(pending\)\}`\}/,
    'the pill reads "Active", truthfully, and would go on reading it right up to the day');
});

test('a day in the future is spoken about in the future tense', () => {
  // The strip runs Monday to Sunday, so on a Monday four of its cells are
  // days that have not happened. A member whose date falls on the Wednesday
  // of this week reads differently there -- and "she was inactive on
  // Wednesday" claims something that has not happened yet.
  assert.match(read(ROSTER),
    /const wasOrWillBe = dayIso && dayIso > todayIso \? 'will be' : 'was'/,
    'the historic reading must pick its tense from the day, not assume the past');
});

test('the day-scoped roster drops a member who was off the register that day', () => {
  const src = read(ROSTER);
  // "when i set member as inactive from 1st oct then when i click on date
  // card of 1st oct that member should not show up" (08-Sep-2026).
  assert.match(src, /membersActiveOn\(joinedByDay, chosen\?\.iso \?\? null\)/,
    'the roster must narrow by the STATUS on the selected day as well as by the joining date');
  // Two steps, so each omission can be counted and named separately.
  assert.match(src, /const joinedLater = chosen \? joinedLaterNote\(scoped\.length - joinedByDay\.length/,
    'the joined-later count must be measured against the un-narrowed list');
  assert.match(src, /const leftEarlier = chosen \? leftEarlierNote\(joinedByDay\.length - onDay\.length/,
    'and the inactive count against the list the joining filter already produced');
  assert.match(src, /testID="course-left-earlier"/,
    'a count that drops rows in silence is the defect this screen already fixed once');
});

test('a departure is pending against the day on screen, not against today', () => {
  assert.match(read(ROSTER), /const pending = pendingInactiveFrom\(member, statusDay\)/,
    'read against today it contradicted the pill beside it: on the 1 Oct card an '
    + 'Inactive member also drew "Inactive from 1 October 2026"');
});
