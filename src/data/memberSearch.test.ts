/**
 * The search box narrows what is DRAWN and nothing else.
 *
 * The cases that matter are the two edges: an empty query is the whole list
 * (not an empty one), and a member is found by an address she owns but the
 * row does not print. The ordering case is here because the list above the
 * search box is the same list underneath it -- a search that also re-sorted
 * would move rows a person had already ticked.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { searchTerm, matchesMemberQuery, narrowBySearch } from './memberSearch';

const m = (name: string, ...addresses: string[]) => ({
  name, emails: addresses.map(address => ({ address })),
});

const AANCHAL = m('Aanchal Khandelwal', 'aanchalkhandelwal.2008@gmail.com');
const ABI = m('Abi Chennai', 'abirami267@gmail.com');
const PRIYA = m('Priya Nair', 'priya.work@example.com', 'priya.home@example.com');
const NO_EMAIL = m('Meena Iyer');
const ALL = [AANCHAL, ABI, PRIYA, NO_EMAIL];

test('an empty query is the whole list, not an empty one', () => {
  assert.equal(searchTerm('   '), '');
  assert.deepEqual(narrowBySearch(ALL, ''), ALL);
  assert.deepEqual(narrowBySearch(ALL, '   '), ALL);
  assert.equal(matchesMemberQuery(NO_EMAIL, ''), true);
});

test('name matches anywhere in it, either case', () => {
  assert.deepEqual(narrowBySearch(ALL, 'aan'), [AANCHAL]);
  assert.deepEqual(narrowBySearch(ALL, 'AAN'), [AANCHAL]);
  // a surname, mid-string -- not only a prefix
  assert.deepEqual(narrowBySearch(ALL, 'nair'), [PRIYA]);
  assert.deepEqual(narrowBySearch(ALL, 'iyer'), [NO_EMAIL]);
});

test('surrounding space is ignored, inner space is not', () => {
  assert.deepEqual(narrowBySearch(ALL, '  abi  '), [ABI]);
  assert.deepEqual(narrowBySearch(ALL, 'abi chennai'), [ABI]);
  assert.deepEqual(narrowBySearch(ALL, 'chennai abi'), []);
});

test('an address finds her, including one the row does not print', () => {
  assert.deepEqual(narrowBySearch(ALL, 'abirami267'), [ABI]);
  // her SECOND address: the row shows priya.work, and she is still findable
  assert.deepEqual(narrowBySearch(ALL, 'priya.home'), [PRIYA]);
  assert.deepEqual(narrowBySearch(ALL, '@example.com'), [PRIYA]);
});

test('a member with no address is searched by name alone, never dropped', () => {
  assert.equal(matchesMemberQuery(NO_EMAIL, 'meena'), true);
  assert.equal(matchesMemberQuery(NO_EMAIL, '@'), false);
});

test('a query matching nobody is an empty list, and says so by being empty', () => {
  assert.deepEqual(narrowBySearch(ALL, 'zzz'), []);
});

test('order is the order given -- the search does not re-sort the list', () => {
  assert.deepEqual(narrowBySearch(ALL, 'a').map(x => x.name),
    ['Aanchal Khandelwal', 'Abi Chennai', 'Priya Nair', 'Meena Iyer']);
});
