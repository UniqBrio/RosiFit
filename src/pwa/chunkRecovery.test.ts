/**
 * T-407: a screen chunk that fails to load reloads the page once, never while a
 * write is in flight, and never loops.
 *
 * Run: npx tsx --test src/pwa/chunkRecovery.test.ts
 *
 * The two messages below are the ones the exported build actually produced when
 * the Members chunk was removed and the route was loaded (RUN_app-feels-slow.md).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CHUNK_RELOAD_KEY, CHUNK_RELOAD_WINDOW_MS, chunkRecoveryStep, isChunkLoadError, reloadedRecently } from './chunkRecovery';

const root = path.join(__dirname, '..', '..');
const missing404 = Object.assign(new Error('Loading module http://localhost/_expo/static/js/web/members-d77193e9060fa98107898486dffc939f.js failed.'),
  { name: 'AsyncRequireError' });
const htmlInstead = new SyntaxError("Unexpected token '<'");
const unknownModule = new Error('Requiring unknown module "1234".');

function memoryStore(init: Record<string, string> = {}) {
  const data = new Map(Object.entries(init));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, data };
}

test('the failures a missing chunk really produces are recognised', () => {
  assert.equal(isChunkLoadError(missing404), true);
  assert.equal(isChunkLoadError(htmlInstead), true);
  assert.equal(isChunkLoadError(unknownModule), true);
  assert.equal(isChunkLoadError(new SyntaxError("expected expression, got '<'")), true, 'Firefox wording');
});

test('an ordinary error is NOT a chunk failure -- it must not trigger a reload', () => {
  assert.equal(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'name')")), false);
  assert.equal(isChunkLoadError(new SyntaxError(`Unexpected token '<', "<!DOCTYPE "... is not valid JSON`)), false,
    'JSON.parse of an HTML answer is a data error, not a missing chunk');
  assert.equal(isChunkLoadError(null), false);
  assert.equal(isChunkLoadError('Loading module x failed'), false, 'a bare string is not an Error');
});

test('first chunk failure: the note is written, then the page reloads', () => {
  const store = memoryStore();
  assert.equal(chunkRecoveryStep(missing404, store, 1_000_000, false), 'reload');
  assert.equal(store.data.get(CHUNK_RELOAD_KEY), '1000000');
});

test('a failure again inside the window shows the error instead of looping', () => {
  const store = memoryStore({ [CHUNK_RELOAD_KEY]: '1000000' });
  assert.equal(chunkRecoveryStep(missing404, store, 1_000_000 + 2_000, false), 'show');
});

test('the note expires: a later deployment in the same never-closed tab reloads again', () => {
  const store = memoryStore({ [CHUNK_RELOAD_KEY]: '1000000' });
  assert.equal(chunkRecoveryStep(missing404, store, 1_000_000 + CHUNK_RELOAD_WINDOW_MS, false), 'reload');
  assert.equal(reloadedRecently('not a time', 5), false);
  assert.equal(reloadedRecently(null, 5), false);
});

test('a write in flight (T-021) holds the reload -- and writes no note while it waits', () => {
  const store = memoryStore();
  assert.equal(chunkRecoveryStep(missing404, store, 1_000_000, true), 'wait');
  assert.equal(store.data.has(CHUNK_RELOAD_KEY), false);
  assert.equal(chunkRecoveryStep(missing404, store, 1_001_000, false), 'reload', 'and reloads once it closes');
});

test('no recordable note, no reload: storage that throws or drops the write cannot loop', () => {
  const throwsOnWrite = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.equal(chunkRecoveryStep(missing404, throwsOnWrite, 1, false), 'show');
  const dropsWrite = { getItem: () => null, setItem: () => {} };
  assert.equal(chunkRecoveryStep(missing404, dropsWrite, 1, false), 'show');
  const throwsOnRead = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => {} };
  assert.equal(chunkRecoveryStep(missing404, throwsOnRead, 1, false), 'show');
  assert.equal(chunkRecoveryStep(missing404, null, 1, false), 'show');
});

test('an ordinary error never reloads, whatever the storage says', () => {
  assert.equal(chunkRecoveryStep(new TypeError('x'), memoryStore(), 1, false), 'show');
});

test('the root layout exports the boundary and wires the rule', () => {
  const layout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
  assert.match(layout, /export function ErrorBoundary\(/, 'app/_layout.tsx must export ErrorBoundary');
  assert.match(layout, /chunkRecoveryStep\(error, noteStore\(\), Date\.now\(\), isWriteInFlight\(\)\)/);
  assert.match(layout, /<ThemeProvider>\s*<BoundaryScreen/, 'the boundary renders outside the layout, so it brings its own theme');
  assert.match(layout, /backgroundColor: theme\.bg/, 'and paints its own ground in both themes');
  assert.match(layout, /safeToRetry=\{false\}/, 'it cannot promise that nothing was changed');
});

test('a missing build file is a 404, never the not-found page served as a script', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')) as { rewrites: { source: string }[] };
  const catchAll = vercel.rewrites.find(r => r.source.includes('.*') || r.source.includes(':path*'));
  assert.ok(catchAll, 'the catch-all rewrite still exists');
  assert.match(catchAll!.source, /\(\?!_expo\/\)/, 'the catch-all must exclude /_expo/ so a missing chunk 404s');
  const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
  assert.match(sw, /text\/html/, 'the worker must refuse to cache an HTML answer under /_expo/static/');
  assert.doesNotMatch(sw, /const VERSION = 'v1'/, 'HTML cached under chunk paths by v1 is purged by a new cache name');
});
