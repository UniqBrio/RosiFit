import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "On clicking unsubscribe link its leading to html file" (30-Sep-2026).
 *
 * Supabase rewrites a GET that answers text/html to text/plain on the default
 * *.supabase.co domain, so the unsubscribe confirmation arrived as its own
 * source code. The function now redirects to a page the app's host serves
 * (supabase/functions/unsubscribe/landing.ts, with its Deno spec beside it).
 * This is the source-reading half: the function serves no HTML, and the two
 * pages it redirects to exist and say the same thing.
 */

const ROOT = process.env.UNSUBSCRIBE_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the unsubscribe function answers no GET with HTML', () => {
  const src = read('supabase/functions/unsubscribe/index.ts');
  assert.doesNotMatch(src, /text\/html/,
    'a text/html answer is rewritten to text/plain by the platform and shows as source');
  assert.match(src, /landing\('unsubscribed'/, 'the confirmation must go through landing()');
  assert.match(src, /landing\('failed'/, 'and so must the refusal');
});

test('both pages exist on the app host, in both themes, naming the academy as text only', () => {
  const pages: Array<[string, string]> = [
    ['public/unsubscribed.html', 'You are unsubscribed'],
    ['public/unsubscribe-failed.html', 'This link did not work'],
  ];
  for (const [file, heading] of pages) {
    const html = read(file);
    assert.match(html, new RegExp(`<h1>${heading}</h1>`), `${file} must carry its heading`);
    assert.match(html, /textContent/, `${file} must set the academy name as text`);
    assert.doesNotMatch(html, /innerHTML/, `${file} must never write the URL into markup`);
    // A top-level `var name` is window.name, which printed "null" on the page
    // when the link carried no academy -- found rendering this very page.
    assert.doesNotMatch(html, /^\s*var name\b/m, `${file} must not shadow window.name`);
    assert.match(html, /prefers-color-scheme: dark/, `${file} must be readable in both themes`);
  }
});

test('the paths the function redirects to are the pages that exist', () => {
  const landing = read('supabase/functions/unsubscribe/landing.ts');
  assert.match(landing, /unsubscribed: '\/unsubscribed'/);
  assert.match(landing, /failed: '\/unsubscribe-failed'/);
  // cleanUrls serves public/<name>.html at /<name>; without it the redirect 404s.
  assert.equal(JSON.parse(read('vercel.json')).cleanUrls, true);
});

test('each page carries, word for word, the sentence the function would have said', () => {
  const src = read('supabase/functions/unsubscribe/index.ts');
  // The body as index.ts builds it: one literal, or two joined with +.
  const bodyOf = (heading: string): string => {
    const at = src.indexOf(`heading: '${heading}'`);
    assert.ok(at >= 0, `index.ts must still say "${heading}"`);
    const m = src.slice(at).match(/body: '([^']*)'(?:\s*\+\s*'([^']*)')?/);
    assert.ok(m, `index.ts must carry a body under "${heading}"`);
    return m[1] + (m[2] ?? '');
  };
  const pages: Array<[string, string]> = [
    ['public/unsubscribed.html', 'You are unsubscribed'],
    ['public/unsubscribe-failed.html', 'This link did not work'],
  ];
  for (const [file, heading] of pages) {
    assert.ok(read(file).includes(`<p>${bodyOf(heading)}</p>`),
      `${file} must say what the plain-text answer says, so the two cannot drift`);
  }
});

test('both pages carry the RosiFit logo from the app host, not a bare page', () => {
  // "the page is plain it should be professional with rosifit logo right?"
  // (requests/2026-09-30-unsubscribe-page-branded.md). The logo is served
  // from public/, so it deploys with the pages and needs no app bundle.
  assert.ok(fs.existsSync(path.join(ROOT, 'public/rosifit-logo.png')), 'public/rosifit-logo.png must ship');
  for (const file of ['public/unsubscribed.html', 'public/unsubscribe-failed.html']) {
    assert.match(read(file), /<img src="\/rosifit-logo\.png"/, `${file} must show the logo`);
  }
});

// ------------------------------------------------ the way back (Resubscribe)
// "How will the end user subscribe back once they hit unsubscribe ... by
// mistake" (requests/2026-09-30-resubscribe-button.md). The page used to say
// "reply to any earlier email and we will turn them back on", and nobody
// could: 0078 refuses to reinstate an opt-out, because only the member may
// undo one. The button is the member's own undo, through the signed link.

test('the resubscribed page exists, branded, and says what the function would have said', () => {
  const src = read('supabase/functions/unsubscribe/index.ts');
  assert.match(src, /heading: 'You are subscribed again'/);
  assert.match(src, /body: 'We will send attendance follow-ups to this address again\.'/);
  const html = read('public/resubscribed.html');
  assert.match(html, /<h1>You are subscribed again<\/h1>/);
  assert.match(html, /<p>We will send attendance follow-ups to this address again\.<\/p>/);
  assert.match(html, /<img src="\/rosifit-logo\.png"/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.doesNotMatch(html, /innerHTML/);
});

test('the confirmation no longer promises a reply can undo it', () => {
  for (const file of ['public/unsubscribed.html', 'supabase/functions/unsubscribe/index.ts']) {
    assert.doesNotMatch(read(file), /reply to any earlier email and we will turn them back on/,
      `${file} must not promise what no one in the academy is allowed to do`);
  }
});

test('Resubscribe posts back only to a Supabase unsubscribe function, and starts hidden', () => {
  const html = read('public/unsubscribed.html');
  assert.match(html, /<form class="undo" id="undo" method="post" hidden>/,
    'no signed link, no button -- a direct visit has nothing to undo');
  assert.match(html, /<button type="submit">Resubscribe<\/button>/);
  assert.ok(html.includes('/^https:\\/\\/lhpzhkzbnquwjljmbylo\\.supabase\\.co\\/functions\\/v1\\/unsubscribe$/.test(fn)'),
    'the page must refuse any address but this project\'s own function');
  assert.match(html, /history\.replaceState/, 'the signed pair must not stay in the address bar or history');
  assert.match(html, /&a=resubscribe/);
  assert.match(html, /<meta name="referrer" content="no-referrer">/,
    'the signed pair must not leak in a Referer header');
});

test('only a POST that asks for it can resubscribe -- a mail client\'s one-click never can', () => {
  const src = read('supabase/functions/unsubscribe/index.ts');
  assert.match(src, /const resubscribe = method === 'POST' && url\.searchParams\.get\('a'\) === 'resubscribe';/);
  assert.match(src, /resubscribeStep\(row\?\.status, await statusBeforeOptOut\(\)\)/,
    'the decision must be the tested one in landing.ts, fed the status before the opt-out');
  assert.match(src, /\.select\('id'\);/, 'success must be read from the rows the write actually moved');
  assert.match(src, /\.eq\('status', 'unsubscribed'\)/, 'the write must only ever move an unsubscribed row');
  assert.match(src, /p_action: 'communication\.resubscribed'/, 'the member\'s undo is audited like the opt-out');
});

// Appended 01-Oct-2026: the link ASKS (requests/2026-10-01-unsubscribe-get-confirms.md).
test('the question page exists, branded, both themes, and says what the function would have said', () => {
  const src = read('supabase/functions/unsubscribe/index.ts');
  assert.match(src, /heading: 'Unsubscribe from attendance follow-ups\?'/);
  assert.match(src, /body: 'Press Unsubscribe to stop attendance follow-ups to this address\.'/);
  assert.match(read('supabase/functions/unsubscribe/landing.ts'), /confirm: '\/unsubscribe'/);
  const html = read('public/unsubscribe.html');
  assert.match(html, /<h1>Unsubscribe from attendance follow-ups\?<\/h1>/);
  assert.match(html, /<p>Press Unsubscribe to stop attendance follow-ups to this address\.<\/p>/);
  assert.match(html, /<img src="\/rosifit-logo\.png"/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /textContent/);
  assert.doesNotMatch(html, /innerHTML/);
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
});

test('the question page posts Unsubscribe only to this project\'s function, and only as a press', () => {
  const html = read('public/unsubscribe.html');
  assert.match(html, /<form class="undo" id="act" method="post" hidden>/, 'a form POST, hidden until the pair is checked');
  assert.match(html, /<button type="submit">Unsubscribe<\/button>/);
  assert.ok(html.includes('/^https:\\/\\/lhpzhkzbnquwjljmbylo\\.supabase\\.co\\/functions\\/v1\\/unsubscribe$/.test(fn)'));
  assert.match(html, /&a=unsubscribe/);
  assert.match(html, /history\.replaceState/);
  assert.doesNotMatch(html, /\.submit\(\)|requestSubmit|fetch\(/, 'the page never presses its own button');
});

test('a GET only asks: the write and its audit are reached by a POST alone', () => {
  const src = read('supabase/functions/unsubscribe/index.ts');
  const ask = src.indexOf("if (method === 'GET') return ask();");
  const write = src.indexOf(".update({ status: 'unsubscribed' })");
  assert.ok(ask > 0 && write > ask, 'the GET returns before the opt-out write');
  assert.match(src, /const oneClick = method === 'POST' && !url\.searchParams\.has\('a'\);/);
  assert.match(src, /via: oneClick \? 'one_click' : 'link'/);
});
