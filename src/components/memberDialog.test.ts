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
import { memberSubtitle, attendanceTone } from './memberDialog';

test('the subtitle names her course, her branch and her joining month', () => {
  assert.equal(
    memberSubtitle({ course: 'Prenatal Flow', branch: 'Coimbatore', joined: 'Mar 2026' }),
    'Prenatal Flow · Coimbatore · joined Mar 2026');
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
