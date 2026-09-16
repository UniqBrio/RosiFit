/**
 * The member pop-up's two pure decisions
 * (requests/2026-09-06-member-detail-as-popup.md).
 *
 * The record used to be a page with a gradient header; it is a dialog card
 * now, and the card's one-line subtitle and the colour its attendance figure
 * wears are the only logic the layout carries. Both are here so the dialog
 * itself is nothing but layout.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  memberSubtitle, attendanceTone, MEMBER_TABS, memberStatusReading,
  memberDayNames, addressesInOrder,
} from './memberDialog';

test('the subtitle names her course, her branch and her joining month', () => {
  assert.equal(
    memberSubtitle({ course: 'Prenatal Flow', branch: 'Coimbatore', joined: 'Mar 2026' }),
    'Prenatal Flow · Coimbatore · Joined Mar 2026');
});

test('a member with no joining month on record is not shown "joined —"', () => {
  // The page wrote `branch` alone in this case; the card keeps that.
  assert.equal(
    memberSubtitle({ course: 'Postnatal', branch: 'Main', joined: '—' }),
    'Postnatal · Main');
});

test('the attendance figure wears the same three tones the page used', () => {
  // 70 and above reads as present, 40 to 69 as awaiting, below 40 as absent
  assert.equal(attendanceTone(100), 'present');
  assert.equal(attendanceTone(70), 'present');
  assert.equal(attendanceTone(69), 'awaiting');
  assert.equal(attendanceTone(40), 'awaiting');
  assert.equal(attendanceTone(39), 'absent');
  assert.equal(attendanceTone(0), 'absent');
});

test('no figure at all is its own answer, never "absent"', () => {
  // A member expected at nothing this week has no percentage; painting her
  // red would say she skipped sessions she never had.
  assert.equal(attendanceTone(null), null);
});

/* ------------------------------------------------------------ the two tabs
 * (requests/2026-09-07-member-dialog-two-tabs.md)
 */

test('the card opens on her week, and the record is the second panel', () => {
  // The first tab is the panel the card has always shown. If this ever
  // reverses, the same tap starts showing a different thing.
  assert.deepEqual(MEMBER_TABS.map(t => t.key), ['week', 'details']);
  assert.deepEqual(MEMBER_TABS.map(t => t.label), ['This week', 'Details']);
});

test('her status carries a word and an icon, never a colour alone', () => {
  const active = memberStatusReading('active');
  assert.equal(active.word, 'Active');
  assert.ok(active.icon.length > 0);
  assert.equal(active.active, true);
});

test('a paused member reads as Inactive, exactly as the roster pill draws her', () => {
  // members.status allows a third value no screen sets, and
  // follow_up_candidates() (0009) passes 'active' and nothing else -- so
  // paused and inactive are one fact everywhere that acts on the column.
  for (const s of ['inactive', 'paused'] as const) {
    const r = memberStatusReading(s);
    assert.equal(r.word, 'Inactive');
    assert.equal(r.active, false);
    assert.equal(r.icon, 'pause_circle');
  }
});

test('her days are read in the week\u2019s order, not the row\u2019s', () => {
  assert.deepEqual(memberDayNames([5, 1, 3]), ['Mon', 'Wed', 'Fri']);
});

test('no override is "follows the course", never "no days"', () => {
  // member_schedules is an OVERRIDE (0006): no row means she attends the
  // days her offering runs, which is not the same as attending none.
  assert.equal(memberDayNames(null), null);
  // An empty row means the same thing and must not read as a day list
  assert.equal(memberDayNames([]), null);
});

test('the panel lists her primary address first, as the form saves them', () => {
  const rows = addressesInOrder([
    { address: 'second@x.com', primary: false },
    { address: 'main@x.com', primary: true },
    { address: 'third@x.com', primary: false },
  ]);
  assert.deepEqual(rows.map(e => e.address), ['main@x.com', 'second@x.com', 'third@x.com']);
});

test('ordering the addresses does not disturb the record it was given', () => {
  const stored = [{ address: 'a@x.com', primary: false }, { address: 'b@x.com', primary: true }];
  addressesInOrder(stored);
  assert.deepEqual(stored.map(e => e.address), ['a@x.com', 'b@x.com']);
});

/* ------------------------------- the pop-up reads the RETURN date too (0072)
 *
 * The bug this pins was live for exactly one change: 0072 gave the record a
 * second status date and this reading was not given it, so a member with a
 * return dated next month read "Active" on the member card while the roster
 * pill beside it read "Inactive" -- the two ends disagreeing, in the one
 * function written to stop that. */

test('a member whose return has not arrived reads Inactive on the card', () => {
  const r = memberStatusReading('active', null, '2026-09-16', '2026-10-01');
  assert.equal(r.word, 'Inactive');
  assert.equal(r.active, false);
  assert.equal(r.icon, 'pause_circle');
  assert.equal(r.note, 'Active from 1 October 2026 — out of the follow-up rule until then');
});

test('and Active once the day has come', () => {
  const r = memberStatusReading('active', null, '2026-10-01', '2026-10-01');
  assert.equal(r.word, 'Active');
  assert.equal(r.active, true);
  assert.equal(r.note, 'Active since 1 October 2026');
});

test('the return date is ignored when there is no day to read it against', () => {
  // A caller with no `todayIso` gets the stored word, exactly as before.
  const r = memberStatusReading('active', null, '', '2026-10-01');
  assert.equal(r.word, 'Active');
  assert.equal(r.note, null);
});

test('every pre-0072 call is byte-for-byte what it always was', () => {
  // Three arguments, no fourth: the 0045 reading, untouched.
  assert.deepEqual(memberStatusReading('inactive', '2026-10-01', '2026-09-16'), {
    active: true, word: 'Active', icon: 'check_circle',
    note: 'Inactive from 1 October 2026 — in the follow-up rule until then',
  });
  assert.deepEqual(memberStatusReading('inactive'), {
    active: false, word: 'Inactive', icon: 'pause_circle', note: null,
  });
});
