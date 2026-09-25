/**
 * "On every deployment app should refresh automatically so that it has the new
 * version" (requests/2026-09-09-refresh-on-every-deployment.md).
 *
 * Two things can go wrong here and only one of them is the obvious one.
 *
 *   1. It never fires — a stale tab keeps running last week's build. That is
 *      the reported defect, and the first tests are about it.
 *   2. IT FIRES WHEN IT SHOULD NOT, which is far worse than the defect: a
 *      reload throws away whatever is typed and not yet saved. Every other
 *      test here is a way that could happen — an unreadable answer read as a
 *      change, a server disagreeing with itself, or a reload landing while
 *      somebody is mid register.
 *
 * The rules are pure so both halves can be proved without a browser; the DOM
 * wiring in `DeploymentRefresh.tsx` is asserted at the bottom, by reading it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ATTEMPT_KEY,
  IDLE_MS,
  POLL_MS,
  PROBE_URL,
  RETRY_MS,
  bundlesFrom,
  bundlesFromHtml,
  isNewDeployment,
  safeToReload,
  shouldReload,
  stamp,
} from './deployment';

const OLD = '/_expo/static/js/web/entry-21187df9dabc508c580abb58fb5bf5ad.js';
const NEW = '/_expo/static/js/web/entry-0c4f1e6a9b2d47385fa0c1d2e3b4a596.js';

const EXCELJS = '/_expo/static/js/web/exceljs-eb64762df4947ffc70f21046772f5797.js';

const page = (bundle: string) =>
  `<!DOCTYPE html><html><head><meta charSet="utf-8"/></head>` +
  `<body><div id="root"></div><script src="${bundle}" defer></script></body></html>`;

test('a new build is the deployed bundle changing name', () => {
  const running = bundlesFromHtml(page(OLD));
  assert.deepEqual(running, [OLD]);
  assert.equal(isNewDeployment(running, bundlesFromHtml(page(NEW))), true);
  assert.equal(isNewDeployment(running, bundlesFromHtml(page(OLD))), false);
});

test('a chunk this session loaded LATER is not a deployment', () => {
  // The one that would have shipped a reload loop. `memberXlsx` pulls ExcelJS
  // in by dynamic import the first time a report is downloaded, and that
  // appends a script tag the served HTML has never named. Compared as sets,
  // every session that had exported a spreadsheet would reload itself — and
  // come back and do it again, and again.
  const running = bundlesFrom([`https://rosifit.example.com${OLD}`, EXCELJS]);
  assert.deepEqual(running, [EXCELJS, OLD].sort());
  assert.equal(isNewDeployment(running, bundlesFromHtml(page(OLD))), false);
  assert.equal(shouldReload(running, bundlesFromHtml(page(OLD)), null), false);
  // ...and the real deployment is still seen through the extra chunk.
  assert.equal(isNewDeployment(running, bundlesFromHtml(page(NEW))), true);
});

test('the same build served absolutely and relatively is ONE build', () => {
  // A script tag reads back from the DOM as an absolute URL; the served HTML
  // spells it as a path. Comparing those raw would reload on every check,
  // forever, which is the worst outcome this module has.
  const fromDom = bundlesFrom([`https://rosifit.example.com${OLD}`]);
  assert.deepEqual(fromDom, [OLD]);
  assert.equal(isNewDeployment(fromDom, bundlesFromHtml(page(OLD))), false);
});

test('bundle ORDER is not a deployment', () => {
  assert.deepEqual(bundlesFrom([OLD, NEW]), bundlesFrom([NEW, OLD]));
  assert.equal(stamp(bundlesFrom([OLD, NEW])), stamp(bundlesFrom([NEW, OLD])));
  assert.equal(isNewDeployment(bundlesFrom([OLD, NEW]), bundlesFrom([NEW, OLD])), false);
});

test('a duplicate reference is not a second bundle', () => {
  assert.deepEqual(bundlesFrom([OLD, OLD, OLD]), [OLD]);
});

test('an unreadable answer is no information, never a change', () => {
  // A captive-portal page, a CDN error, a login wall, an export that stops
  // naming bundles this way: none of them mean a new version shipped.
  const running = bundlesFromHtml(page(OLD));
  for (const nonsense of ['', '<html><body>Sign in to the network</body></html>', '<h1>502</h1>']) {
    assert.equal(bundlesFromHtml(nonsense), null, `read a build out of: ${nonsense}`);
    assert.equal(isNewDeployment(running, bundlesFromHtml(nonsense)), false);
    assert.equal(shouldReload(running, bundlesFromHtml(nonsense), null), false);
  }
  // ...and neither does a page whose own bundles cannot be read.
  assert.equal(isNewDeployment(null, [NEW]), false);
  assert.equal(shouldReload(null, [NEW], null), false);
});

test('a server disagreeing with itself cannot start a reload loop', () => {
  // Mid-rollout, two CDN nodes answer differently. The tab reloads once for
  // the new bundle, comes back still running the old one, and must then sit
  // still rather than reload for the same answer again and again.
  const running = [OLD];
  assert.equal(shouldReload(running, [NEW], null), true, 'the first reload must happen');
  assert.equal(shouldReload(running, [NEW], stamp([NEW])), false, 'already tried this one');
  // A THIRD build is a fresh fact and is taken.
  const NEWER = '/_expo/static/js/web/entry-ffffffffffffffffffffffffffffffff.js';
  assert.equal(shouldReload(running, [NEWER], stamp([NEW])), true);
});

test('a reload never lands under somebody who is using the app', () => {
  assert.equal(safeToReload(false, 0), false, 'not while she is touching it');
  assert.equal(safeToReload(false, IDLE_MS - 1), false, 'not one tick early');
  assert.equal(safeToReload(false, IDLE_MS), true, 'a minute of nothing is idle');
  assert.equal(safeToReload(true, 0), true, 'backgrounded is the free moment');
});

test('the intervals are sane relative to one another', () => {
  assert.ok(RETRY_MS < IDLE_MS, 'the retry must be finer than the idle it waits for');
  assert.ok(POLL_MS > IDLE_MS, 'polling faster than the safety window buys nothing');
  assert.equal(PROBE_URL, '/', 'the probe is the start URL — the one every build writes');
});

test('the wiring keeps the promises the rules make', () => {
  const root = path.resolve(__dirname, '..', '..');
  const wiring = fs.readFileSync(path.join(root, 'src/pwa/DeploymentRefresh.tsx'), 'utf8');

  assert.match(wiring, /safeToReload\(/, 'the reload must go through the idle rule');
  assert.match(wiring, /shouldReload\(/, 'the decision must go through the rule, not a !==');
  assert.match(wiring, /cache: 'no-store'/, 'a cached probe can never see a deployment');
  assert.match(wiring, /window\.location\.reload\(\)/, 'nothing here actually reloads');
  assert.match(wiring, /ATTEMPT_KEY/, 'the loop guard is imported and used');
  assert.ok(ATTEMPT_KEY.startsWith('rosifit:'), 'the key must be namespaced to this app');
  assert.doesNotMatch(wiring, /skipWaiting/, 'the worker still does not swap a bundle underneath');

  // Mounted, or none of the above ever runs.
  const layout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
  assert.match(layout, /<DeploymentRefresh \/>/, 'the watcher is not mounted at the root');
});

test('T-407: another screen\'s route chunk named by the probe page is not a deployment', () => {
  // With per-route bundles (asyncRoutes), the probe page `/` names HOME's route
  // chunk and layouts next to the shared bundles. A session that started on
  // Members never loaded Home's chunk, so under plain containment it read as
  // "a bundle this document has not got" and reloaded once for nothing --
  // every deep link and every refresh on another screen.
  const dir = '/_expo/static/js/web/';
  const shared = [`${dir}entry-00012ec88415cc753e32e3ff69b54a6a.js`, `${dir}__common-b03836d3397dc964efd292cc5593d89e.js`,
    `${dir}__expo-metro-runtime-1f8f5d3ca6b7f58204d51e14506d73fb.js`];
  const probe = [...shared, `${dir}_layout-11f98de6ed69987111a567c3d513b249.js`, `${dir}index-c45a0c2bcee4913613f58314778c01ff.js`];
  const onMembers = bundlesFrom([...shared, `${dir}_layout-11f98de6ed69987111a567c3d513b249.js`,
    `${dir}_layout-b2653f42d61d421503b7f232175fc64b.js`, `${dir}members-d77193e9060fa98107898486dffc939f.js`]);
  assert.equal(isNewDeployment(onMembers, bundlesFrom(probe)), false, 'Home\'s route chunk is not a new build');
  assert.equal(shouldReload(onMembers, bundlesFrom(probe), null), false);

  // ...and a real deployment -- the shared entry renamed -- is still seen from any screen.
  const deployed = probe.map(b => b.replace('entry-00012ec88415cc753e32e3ff69b54a6a', 'entry-ffff2ec88415cc753e32e3ff69b54a6a'));
  assert.equal(isNewDeployment(onMembers, bundlesFrom(deployed)), true);
  const commonOnly = probe.map(b => b.replace('__common-b03836d3', '__common-aaaa6d3'));
  assert.equal(isNewDeployment(onMembers, bundlesFrom(commonOnly)), true, 'a change only in __common is a build too');
});

// ES imports hoist; kept down here so the spec above stays byte-for-byte as it was (append-only).
import { sharedBundles } from './deployment';

test('T-407: the loop-guard note written before a reload matches the page that comes back on ANY screen', () => {
  const dir = '/_expo/static/js/web/';
  const shared = [`${dir}entry-ffff2ec88415cc753e32e3ff69b54a6a.js`, `${dir}__common-b03836d3397dc964efd292cc5593d89e.js`];
  const probe = bundlesFrom([...shared, `${dir}index-c45a0c2bcee4913613f58314778c01ff.js`]);
  const backOnMembers = bundlesFrom([...shared, `${dir}members-d77193e9060fa98107898486dffc939f.js`]);
  assert.equal(stamp(sharedBundles(probe!)), stamp(sharedBundles(backOnMembers!)),
    'written from the probe, cleared from the page: same stamp');

  // The case the guard exists for: the reload came back to a tab STILL on the old build (the server
  // disagreeing with itself), on a screen other than Home. The note was written from the probe.
  const oldShared = [`${dir}entry-00012ec88415cc753e32e3ff69b54a6a.js`, `${dir}__common-b03836d3397dc964efd292cc5593d89e.js`];
  const stillOld = bundlesFrom([...oldShared, `${dir}members-d77193e9060fa98107898486dffc939f.js`]);
  assert.equal(isNewDeployment(stillOld, probe), true, 'the probe really is a new build for this tab');
  assert.equal(shouldReload(stillOld, probe, stamp(sharedBundles(probe!))), false, 'no second reload for the same answer');
  assert.equal(shouldReload(stillOld, probe, stamp(probe)), true,
    'a note stamped from EVERY bundle would never match -- the loop this guards against');
});

test('T-407: an answer naming no shared bundle still compares every bundle it names', () => {
  const a = ['/_expo/static/js/web/app-1111.js'];
  const b = ['/_expo/static/js/web/app-2222.js'];
  assert.deepEqual(sharedBundles(b), b);
  assert.equal(isNewDeployment(a, b), true);
  assert.equal(isNewDeployment(b, b), false);
});
