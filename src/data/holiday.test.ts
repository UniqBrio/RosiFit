/**
 * Cases for the holiday range rules.
 *
 * Run: npx tsx --test src/data/holiday.test.ts
 *
 * A holiday's range is the blast radius of a closure — it decides which
 * sessions stop counting as expected. Every failure mode here is silent: the
 * app renders happily and a report is wrong a month later, which is exactly
 * the class the SQL tests in supabase/tests/11_holiday_delete.sql cannot see,
 * because by the time a row reaches the database the range is already decided.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseRange, rangeLabel, coversDate } from './holiday';
import { HOLIDAYS, type Holiday } from './mock';

const holiday = (over: Partial<Holiday> = {}): Holiday => ({
  id: 'h', name: 'Test', from: '2026-10-20', to: '2026-10-22',
  branch: null, sessions: 0, ...over,
});

test('an empty end date is a ONE-DAY closure, not an open-ended one', () => {
  // The failure this guards is not a crash: end_date takes some other value
  // and the closure silently covers days nobody chose.
  assert.deepEqual(normaliseRange('2026-10-20', ''), { from: '2026-10-20', to: '2026-10-20' });
});

test('a reversed pair is swapped, not rejected', () => {
  // Same range read backwards. The CHECK constraint would refuse it, so
  // refusing it here too would turn a typo into a dead end.
  assert.deepEqual(normaliseRange('2026-10-22', '2026-10-20'), { from: '2026-10-20', to: '2026-10-22' });
});

test('an already-ordered pair is left alone', () => {
  assert.deepEqual(normaliseRange('2026-10-20', '2026-10-22'), { from: '2026-10-20', to: '2026-10-22' });
});

test('no start date yields no range at all', () => {
  // Not "today", and not a range ending at the epoch.
  assert.deepEqual(normaliseRange('', '2026-10-22'), { from: '', to: '' });
  assert.deepEqual(normaliseRange('', ''), { from: '', to: '' });
});

test('normalising is idempotent', () => {
  const once = normaliseRange('2026-10-22', '2026-10-20');
  assert.deepEqual(normaliseRange(once.from, once.to), once);
});

test('a one-day closure reads as one date, not a range of one', () => {
  assert.equal(rangeLabel('2026-10-20', '2026-10-20'), '20 Oct 2026');
  assert.equal(rangeLabel('2026-10-20', ''), '20 Oct 2026');
  assert.equal(rangeLabel('2026-10-20', '2026-10-22'), '20 Oct 2026 – 22 Oct 2026');
});

test('both ends of the range are INCLUSIVE', () => {
  // between start_date and end_date in apply_holiday() is inclusive, so an
  // exclusive reading here would show one fewer day than gets marked.
  const h = holiday({ from: '2026-10-20', to: '2026-10-22' });
  assert.equal(coversDate(h, '2026-10-20', 'Coimbatore'), true, 'first day');
  assert.equal(coversDate(h, '2026-10-22', 'Coimbatore'), true, 'last day');
  assert.equal(coversDate(h, '2026-10-19', 'Coimbatore'), false);
  assert.equal(coversDate(h, '2026-10-23', 'Coimbatore'), false);
});

test('branch null means EVERY branch, never none', () => {
  // Reading it the other way inverts the widest closure the product has into
  // the narrowest — the single most expensive mistake available here.
  const all = holiday({ branch: null });
  assert.equal(coversDate(all, '2026-10-21', 'Coimbatore'), true);
  assert.equal(coversDate(all, '2026-10-21', 'Madurai'), true);
  assert.equal(coversDate(all, '2026-10-21', null), true);
});

test('a branch holiday closes only that branch', () => {
  const one = holiday({ branch: 'Coimbatore' });
  assert.equal(coversDate(one, '2026-10-21', 'Coimbatore'), true);
  assert.equal(coversDate(one, '2026-10-21', 'Madurai'), false);
});

test('a date outside the range is not covered even at the right branch', () => {
  const one = holiday({ branch: 'Coimbatore', from: '2026-10-20', to: '2026-10-20' });
  assert.equal(coversDate(one, '2026-10-21', 'Coimbatore'), false);
});

test('every fixture holiday is a valid, orderable range', () => {
  // The offline list is what the delete confirmation counts against, so a
  // reversed or malformed fixture would show an impact the delete cannot honour.
  for (const h of HOLIDAYS) {
    assert.match(h.from, /^\d{4}-\d{2}-\d{2}$/, `${h.name} has a malformed start`);
    assert.match(h.to, /^\d{4}-\d{2}-\d{2}$/, `${h.name} has a malformed end`);
    assert.ok(h.to >= h.from, `${h.name} ends before it starts`);
    assert.ok(h.sessions >= 0, `${h.name} holds a negative session count`);
    assert.ok(h.name.trim().length >= 2, `${h.name} would fail the name CHECK`);
  }
});

test('fixture holiday ids are unique, so deleting one cannot remove two', () => {
  const ids = HOLIDAYS.map(h => h.id);
  assert.equal(new Set(ids).size, ids.length);
});
