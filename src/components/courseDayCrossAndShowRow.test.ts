/**
 * Two layout claims on the course detail screen
 * (requests/2026-09-12-day-card-cross-and-show-filter-right.md):
 *
 *   1. A DAY CARD THAT OFFERS "UPLOAD AGAIN" DRAWS NO ABSENT CROSS. The
 *      requester, on seeing Fri 11 wearing a red ✕ over the button: "Remove
 *      that marking of x on upload again button from date cards not others."
 *      The ✕ stays everywhere else -- the legend, the member chips -- and the
 *      status WORD stays in the card's spoken label (guardrail 3). The tick on
 *      a present day is not named and not touched.
 *
 *   2. THE SHOW FILTER SITS BESIDE THE SEARCH BOX, ON THE RIGHT, on a wide
 *      screen -- "making more members visible as its occupying more space".
 *      Under 768pt the two still stack, on the 360pt reason recorded in the
 *      render comment, which the request does not reopen.
 *
 * Run: npx tsx --test src/components/courseDayCrossAndShowRow.test.ts
 *
 * Source-reading, for the reason multipleFilesSameDay.test.ts gives: there is
 * no component harness here, and these are claims about what is written
 * where. The browser run in .evidence/ is what shows them painted.
 *
 * WHAT THIS DOES NOT LOOSEN. multipleFilesSameDay.test.ts pins
 * `waiting ? null : <Icon name={tone.icon}` -- "an uploaded day still keeps
 * its status icon in the cell". That stays true of a present day and its
 * assertion is untouched; the cross rule is an OUTER clause in front of it,
 * and this file pins the clause.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.DAY_CROSS_SPEC_ROOT ?? process.cwd();
const SCREEN = 'app/course/[id].tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ------------------------------------------------- 1. no cross over Upload again
test('a card carrying Upload again on an all-absent day is "crossed", and the rule is one line', () => {
  assert.match(read(SCREEN), /const crossed = second && d\.key === 'absent';/,
    'the cross rule is missing or has changed shape');
});

test('the crossed card draws no icon in the cell; a present day still draws its tick', () => {
  // The outer clause is the 12-Sep rule; the inner is the 08-Sep one the
  // older spec pins, byte for byte, so it goes on passing.
  assert.match(read(SCREEN),
    /\{crossed \? null : waiting \? null : <Icon name=\{tone\.icon\} size=\{13\} color=\{ink\} \/>\}/,
    'the cross is still drawn over Upload again, or the tick was taken with it');
});

test('the status word still reaches a screen reader on every card, crossed or not', () => {
  assert.match(read(SCREEN), /accessibilityLabel=\{`\$\{dayWords\}, \$\{tone\.word\}`\}/,
    'the spoken label lost the status word -- the cross was the only signal after all');
});

test('the cross rule never reaches a card that is not offering Upload again', () => {
  const src = read(SCREEN);
  // `second` is the ONLY thing that can make `crossed` true, and `second` is
  // still gated on d.canUpload -- so a past week's absent day keeps its ✕.
  assert.match(src, /const second = d\.canUpload && \(d\.key === 'present' \|\| d\.key === 'absent'\)/);
  const crossedUses = src.match(/\bcrossed\b/g) ?? [];
  assert.equal(crossedUses.length, 2, `crossed is read ${crossedUses.length} times; expected its definition and the icon slot only`);
});

// ------------------------------------------- 2. the Show filter on the right
test('the search box and the Show filter share one row on a wide screen, stacked on a phone', () => {
  const src = read(SCREEN);
  const at = src.indexOf("testID=\"course-member-search\"");
  assert.ok(at > 0, 'the member search box is gone');
  const before = src.slice(Math.max(0, at - 1600), at);
  assert.match(before, /flexDirection: compact \? 'column' : 'row'/,
    'the row that holds the search box does not switch between row and column by width');
});

test('the filter comes AFTER the search box in the row, which is what puts it on the right', () => {
  const src = read(SCREEN);
  const search = src.indexOf("testID=\"course-member-search\"");
  const field = src.indexOf("testID=\"course-show-field\"");
  assert.ok(search > 0 && field > search, 'the Show field is not to the right of the search box');
  // ...and inside the same row: no other roster block opens between them.
  assert.ok(!src.slice(search, field).includes('<Label>'), 'a heading sits between the search box and the filter');
});

test('the search box grows to fill the row; the filter keeps its own width', () => {
  const src = read(SCREEN);
  const at = src.indexOf("testID=\"course-member-search\"");
  const searchBox = src.slice(Math.max(0, at - 700), at);
  assert.match(searchBox, /flex: compact \? undefined : 1/,
    'the search box does not take the width the filter leaves');
  assert.match(src, /style=\{compact \? \{ width: '100%', maxWidth: FILTER_WIDTH \} : \{ width: FILTER_WIDTH \}\}/,
    'the filter has lost its bounded width beside the search box');
});

test('the row carries the z-order lift, so the open panel still floats over the roster', () => {
  const src = read(SCREEN);
  const at = src.indexOf("testID=\"course-member-search\"");
  const before = src.slice(Math.max(0, at - 1600), at);
  // ADR-035: every container between the panel and the scroller is lifted
  // while the panel is out. This row is a new link in that chain.
  assert.match(before, /flexDirection: compact \? 'column' : 'row',[\s\S]{0,200}zIndex: showOpen \? 40 : 0/,
    'the new row is not lifted while the panel is open -- the cards will paint over it');
});
