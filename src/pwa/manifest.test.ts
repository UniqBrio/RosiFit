import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { ACCENTS, DARK } from '../theme/tokens';

/**
 * "make sure this app is downloadable as a PWA"
 * (requests/2026-09-07-installable-pwa.md).
 *
 * The app called itself a PWA for its whole life and was never installable.
 * The reason is worth keeping in front of whoever reads this next: the
 * `expo.web` keys in `app.json` (`name`, `shortName`, `themeColor`, `display`,
 * `startUrl`, ...) belong to the retired `@expo/webpack-config` PWA pipeline.
 * This app exports through Metro, which does not read them. They looked exactly
 * like working configuration and emitted nothing at all.
 *
 * That is the failure this file guards against repeating: PWA config that reads
 * as correct and ships as nothing. Every assertion below is a way the app can
 * go back to being uninstallable while every file still looks fine in a diff.
 *
 *   - a required manifest member is dropped, or start_url/scope drift apart, so
 *     Chromium silently stops offering the install;
 *   - an icon is renamed or deleted and the manifest keeps pointing at it —
 *     a 404 icon is an uninstallable app and nothing else complains;
 *   - an icon's declared `sizes` stops matching the file's real dimensions,
 *     which no build step anywhere checks;
 *   - the maskable icon is lost, so Android crops the crest into a circle;
 *   - the colours drift from the theme module (CP-008), which is easy because a
 *     static JSON file is the one place in this app a colour literal can hide
 *     from `check:contrast`;
 *   - the head tags or the worker registration disappear from `app/+html.tsx`,
 *     which takes the manifest out of every page while the manifest itself
 *     still passes every check above;
 *   - the worker starts caching API responses, which would give the member list
 *     a second source and break guardrail 1 the moment the two disagree.
 *
 * It reads the shipped files rather than rendering, for the same reason the
 * other guards in this repo do: the thing being asserted is what is ON DISK and
 * gets copied into `dist/`, not what a component would render.
 */

const root = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: { src: string; sizes: string; type: string; purpose: string }[];
};

/** PNG header: width and height are big-endian uint32s at byte 16 and 20. */
function pngSize(file: string): { width: number; height: number } {
  const bytes = fs.readFileSync(path.join(root, file));
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG', `${file} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test('the manifest carries every member an install depends on', () => {
  for (const key of [
    'name',
    'short_name',
    'start_url',
    'scope',
    'display',
    'theme_color',
    'background_color',
    'icons',
  ] as const) {
    assert.ok(manifest[key], `manifest is missing "${key}"`);
  }

  assert.equal(manifest.display, 'standalone', 'the installed app must not show browser chrome');
  assert.equal(manifest.start_url, '/', 'start_url is what Chromium probes offline');
  assert.equal(manifest.scope, '/', 'a scope narrower than start_url makes the app uninstallable');
});

test('every icon the manifest names exists, and is the size it claims', () => {
  for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith('/'), `${icon.src} must be an absolute path`);
    const file = path.join('public', icon.src.slice(1));
    assert.ok(fs.existsSync(path.join(root, file)), `${icon.src} is named in the manifest but ${file} does not exist`);

    const [declaredWidth, declaredHeight] = icon.sizes.split('x').map(Number);
    const actual = pngSize(file);
    assert.equal(actual.width, declaredWidth, `${icon.src} declares ${icon.sizes} but is ${actual.width}px wide`);
    assert.equal(actual.height, declaredHeight, `${icon.src} declares ${icon.sizes} but is ${actual.height}px tall`);
  }
});

test('the icon set covers what installability actually requires', () => {
  const any = manifest.icons.filter((i) => i.purpose === 'any').map((i) => i.sizes);
  assert.ok(any.includes('192x192'), 'Chromium requires a 192x192 icon');
  assert.ok(any.includes('512x512'), 'Chromium requires a 512x512 icon');

  const maskable = manifest.icons.filter((i) => i.purpose === 'maskable');
  assert.equal(maskable.length, 1, 'exactly one maskable icon, or Android crops the crest');
  assert.equal(maskable[0].sizes, '512x512');
});

test('the manifest colours are theme tokens, not literals of their own (CP-008)', () => {
  const rosifit = ACCENTS.find((accent) => accent.key === 'rosifit');
  assert.ok(rosifit, 'the RosiFit accent has been renamed or removed');

  assert.equal(
    manifest.theme_color.toUpperCase(),
    rosifit.deep.toUpperCase(),
    'theme_color must stay ACCENTS.rosifit.deep',
  );
  assert.equal(
    manifest.background_color.toUpperCase(),
    DARK.bg.toUpperCase(),
    'background_color must stay DARK.bg — the colour the app actually paints behind itself',
  );
});

test('the root document links the manifest and registers the worker on every page', () => {
  const html = read('app/+html.tsx');

  assert.match(html, /rel="manifest"\s+href="\/manifest\.webmanifest"/, 'no manifest link');
  assert.match(html, /name="theme-color"/, 'no theme-color meta');
  assert.match(html, /rel="apple-touch-icon"/, 'iOS has no home-screen icon without this');
  assert.match(html, /name="apple-mobile-web-app-capable"/, 'iOS will not launch standalone without this');
  assert.match(html, /serviceWorker.*register\('\/sw\.js'\)/s, 'the worker is never registered');

  // The tag must READ the token, never restate its value: a colour literal in a
  // head tag is one `check:contrast` never sees (CP-008).
  assert.match(html, /content=\{THEME_COLOR\}/, 'theme-color must come from the token module');
  assert.match(
    html,
    /const THEME_COLOR = ACCENTS\.find\(.*\)!\.deep/,
    'THEME_COLOR must resolve from ACCENTS, not from a literal',
  );
  assert.doesNotMatch(html, /#[0-9A-Fa-f]{6}/, 'no colour literal belongs in the root document');
});

test('the exported document carries the manifest and the right tint', (t) => {
  // Proves the tags SHIPPED, not merely that the source has them. Only
  // meaningful after a build; `npm run export` is what makes it run.
  const built = path.join(root, 'dist', 'index.html');
  if (!fs.existsSync(built)) {
    t.skip('no dist/ — run `npm run export` to include this check');
    return;
  }
  const html = fs.readFileSync(built, 'utf8');
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest"\/>/);
  assert.match(html, /rel="apple-touch-icon"/);
  assert.match(
    html,
    new RegExp(`<meta name="theme-color" content="${manifest.theme_color}"\\/>`, 'i'),
    'the built page and the manifest disagree about theme_color',
  );
  assert.match(html, /navigator\.serviceWorker\.register\('\/sw\.js'\)/);
});

test('the worker never becomes a second source for member data (guardrail 1)', () => {
  const worker = read('public/sw.js');

  assert.match(
    worker,
    /url\.origin !== self\.location\.origin\)\s*return/,
    'cross-origin requests must pass through — Supabase is a different origin',
  );
  assert.match(
    worker,
    /request\.method !== 'GET'\)\s*return/,
    'a write must never be intercepted',
  );
  assert.doesNotMatch(worker, /supabase\.co/, 'the worker must not special-case the API — it must not see it at all');
  // The CALL, not the word: the file's own comment explains why it is absent.
  assert.doesNotMatch(
    worker,
    /skipWaiting\s*\(/,
    'no skipWaiting(): a new build activates on next launch, not mid-session',
  );
});
