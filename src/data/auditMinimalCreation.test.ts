import test from 'node:test';
import assert from 'node:assert/strict';
import { toPlain, creationEntity } from './auditPlain';

/**
 * "show mimal info such as member added show only name of member and email
 * thats it" (8 Sep 2026).
 *
 * A record being CREATED has no previous values, so the audit trigger reports
 * every column it was born with. "Member added" printed six lines — Name,
 * Member code, Status, Joined on, Notes, Added by — of which one answers the
 * question the reader actually has. An UPDATE is the opposite case: there the
 * changed fields ARE the news, and dropping one hides the very change the log
 * exists to report.
 *
 * So the summary applies to creations only, and it must never be able to empty
 * a row. Three ways that could go wrong quietly, each guarded below:
 *
 *   - the filter reaches an UPDATE and silently drops changed fields. The row
 *     still looks plausible; it is just no longer the truth;
 *   - an entity with no essentials list, or one whose recorded columns happen
 *     to match none of its essentials, renders a heading with nothing under it;
 *   - the count of what was left out drifts away from what was actually left
 *     out, so the row's own footnote misstates the record.
 *
 * The search haystack deliberately keeps the WHOLE record. Summarising a
 * display is not the same as shortening a record, and a reader who searches
 * for a note left on a member must still find the row that carries it.
 */

const base = {
  id: 'x1', subject: 'Anitha Raman', branch: 'Coimbatore',
  who: 'Rosi Owner', whoKind: 'super_admin', when: '2026-09-07T09:12:00.000Z',
};
const NOW = new Date('2026-09-07T18:00:00.000Z');

const memberCreated = {
  ...base, action: 'member.insert', entity: 'member',
  changes: [
    { field: 'full_name', old: null, new: 'Anitha Raman' },
    { field: 'member_code', old: null, new: 'RF-0148' },
    { field: 'status', old: null, new: 'active' },
    { field: 'joined_on', old: null, new: '2026-09-07' },
    { field: 'notes', old: null, new: 'Referred by Divya' },
    { field: 'created_by', old: null, new: 'Rosi Owner' },
  ],
};

test('creationEntity names the entity only for an insert', () => {
  assert.equal(creationEntity('member.insert'), 'member');
  assert.equal(creationEntity('member_email.insert'), 'member_email');
  assert.equal(creationEntity('member.update'), null);
  assert.equal(creationEntity('member.delete'), null);
  // The entity itself can contain a dot, so the split comes from the right.
  assert.equal(creationEntity('auth.mobile_changed.insert'), 'auth.mobile_changed');
  assert.equal(creationEntity('nodots'), null);
});

test('a member added prints her name and nothing else', () => {
  const p = toPlain(memberCreated, NOW);
  assert.deepEqual(p.changes.map(c => c.label), ['Name']);
  assert.equal(p.changes[0].to, 'Anitha Raman');
  assert.equal(p.hiddenCount, 5);
});

test('her email arrives on its own entry, naming the member it belongs to', () => {
  // members has no email column - it lives in member_emails (0006, C-73), so
  // adding a member writes two entries. Together they are the requester's
  // "name and email"; neither pretends to be the other.
  const p = toPlain({
    ...base, action: 'member_email.insert', entity: 'member_email',
    changes: [
      { field: 'member_id', old: null, new: 'Anitha Raman' },
      { field: 'email', old: null, new: 'anitha.r@gmail.com' },
      { field: 'is_primary', old: null, new: 'true' },
    ],
  }, NOW);
  assert.deepEqual(p.changes.map(c => c.label), ['Member', 'Email address']);
  assert.equal(p.changes[1].to, 'anitha.r@gmail.com');
  assert.equal(p.hiddenCount, 1);
});

test('an UPDATE keeps every changed field — the changes are the news', () => {
  const p = toPlain({
    ...base, action: 'course_follow_up_config.update', entity: 'course_follow_up_config',
    changes: [
      { field: 'weekly_threshold', old: '3', new: '2' },
      { field: 'consecutive_threshold', old: '4', new: '3' },
      { field: 'combination', old: 'or', new: 'and' },
    ],
  }, NOW);
  assert.equal(p.changes.length, 3);
  assert.equal(p.hiddenCount, 0);
});

test('a DELETE keeps every field too', () => {
  const p = toPlain({
    ...base, action: 'member.delete', entity: 'member',
    changes: [
      { field: 'full_name', old: 'Anitha Raman', new: null },
      { field: 'status', old: 'active', new: null },
    ],
  }, NOW);
  assert.equal(p.changes.length, 2);
  assert.equal(p.hiddenCount, 0);
});

test('an entity with no essentials list is left alone', () => {
  const p = toPlain({
    ...base, action: 'something_new.insert', entity: 'something_new',
    changes: [
      { field: 'alpha', old: null, new: 'a' },
      { field: 'beta', old: null, new: 'b' },
    ],
  }, NOW);
  assert.equal(p.changes.length, 2, 'an unmapped entity must not be summarised to nothing');
  assert.equal(p.hiddenCount, 0);
});

test('a creation that records none of its essentials keeps what it has', () => {
  // The row must never be a heading with nothing under it.
  const p = toPlain({
    ...base, action: 'member.insert', entity: 'member',
    changes: [{ field: 'notes', old: null, new: 'Referred by Divya' }],
  }, NOW);
  assert.equal(p.changes.length, 1);
  assert.equal(p.changes[0].label, 'Notes');
  assert.equal(p.hiddenCount, 0, 'nothing was dropped, so nothing may be claimed as dropped');
});

test('hiddenCount always equals what was actually left out', () => {
  for (const entry of [memberCreated,
    { ...memberCreated, changes: memberCreated.changes.slice(0, 2) },
    { ...memberCreated, changes: memberCreated.changes.slice(0, 1) }]) {
    const p = toPlain(entry, NOW);
    const recorded = entry.changes.length;
    assert.equal(p.changes.length + p.hiddenCount, recorded,
      'the row must account for every field the entry recorded');
  }
});

test('the search still reaches a value the row does not print', () => {
  const p = toPlain(memberCreated, NOW);
  assert.equal(p.changes.some(c => c.to === 'Referred by Divya'), false,
    'the note is summarised away from the display');
  assert.match(p.haystack, /referred by divya/,
    'and it is still findable - the record is complete even when the row is short');
  assert.match(p.haystack, /rf-0148/);
});

test('a creation with nothing recorded is still a row', () => {
  const p = toPlain({ ...base, action: 'member.insert', entity: 'member', changes: [] }, NOW);
  assert.deepEqual(p.changes, []);
  assert.equal(p.hiddenCount, 0);
});
