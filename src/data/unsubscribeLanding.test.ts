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
