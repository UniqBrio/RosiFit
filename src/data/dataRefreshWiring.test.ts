import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * THE WIRING OF THE LIFECYCLE REFRESH, asserted on the source.
 *
 * Run: npx tsx --test src/data/dataRefreshWiring.test.ts
 *
 * `src/pwa/DataRefresh.tsx` touches `document` and `window`, so it cannot be
 * imported in this runner and `scripts/tsconfig.json` has no DOM in its lib.
 * The RULES it obeys are in `src/data/revalidate.ts` and are tested properly
 * there; what cannot be tested that way is whether this file actually reaches
 * for them, and that is what is asserted here — the same shape, and for the
 * same reason, as `importRevalidates.test.ts` asserting on `app/upload.tsx`.
 *
 * Each claim can be lost on its own, so each is its own test.
 */

const ROOT = process.env.DATA_REFRESH_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Run from the root, or set DATA_REFRESH_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};

const refresh = () => read('src/pwa/DataRefresh.tsx');

/**
 * The file with its COMMENTS TAKEN OUT.
 *
 * Every "it must not do X" assertion below reads this rather than the raw
 * source, because this module's header discusses the things it refuses to do
 * — it says in words that it never reloads the page — and an assertion that
 * matched that sentence would fail on a correct file and pass on a wrong one
 * with the sentence deleted. The claim is about the CODE.
 */
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

/* ----------------------------------------------- it hears the app come back */

test('it listens for the app becoming visible again', () => {
  assert.match(refresh(), /addEventListener\('visibilitychange'/);
});

test('it listens for focus', () => {
  assert.match(refresh(), /addEventListener\('focus'/);
});

test('it listens for coming back online', () => {
  assert.match(refresh(), /addEventListener\('online'/);
});

test('a tab going AWAY does not fetch — only a visible one does', () => {
  // The answer would land in a tab nobody is looking at, and the return that
  // follows would ask again.
  assert.match(refresh(), /visibilityState === 'visible'/);
});

test('every listener it adds is removed again', () => {
  const src = refresh();
  const added = [...src.matchAll(/addEventListener\('([a-z]+)'/g)].map(m => m[1]).sort();
  const removed = [...src.matchAll(/removeEventListener\('([a-z]+)'/g)].map(m => m[1]).sort();
  assert.deepEqual(removed, added,
    'a lifecycle listener outliving the component is a leak that fires into a dead tree');
});

/* ------------------------------------------------------- T5: it coalesces */

test('T5: the events go through the coalescer, not straight to a fetch', () => {
  const src = refresh();
  assert.ok(src.includes('createCoalescer'),
    'focus and visibilitychange both fire on one return to the app; without '
    + 'the coalescer that is two full data fan-outs');
});

test('T5: a pending burst is cancelled on unmount', () => {
  assert.match(refresh(), /\.cancel\(\)/);
});

/* ------------------------------------------- T6: never during a write */

test('T6: the refresh consults isWriteInFlight', () => {
  const src = refresh();
  assert.ok(src.includes('isWriteInFlight'),
    'a lifecycle refresh that can run during an import will read the register '
    + 'between the per-row loop and the absent sweep');
});

test('T6: the in-flight answer is what is handed to revalidateStale', () => {
  // Not merely imported — actually passed. An import with no call site is the
  // shape this assertion exists to refuse.
  assert.match(refresh(), /writeInFlight:\s*isWriteInFlight\(\)/);
});

/* ------------------------------------- T7: the staleness floor is applied */

test('T7: it goes through revalidateStale, which is what applies the floor', () => {
  assert.match(refresh(), /revalidateStale\(/);
});

test('T7: it does not pass a staleness floor of its own', () => {
  // The floor is DERIVED from LOAD_TIMEOUT_MS in revalidate.ts. A number
  // written here would be exactly the invented product-level interval that
  // derivation exists to avoid.
  assert.doesNotMatch(codeOnly(refresh()), /staleAfterMs\s*:/);
});

/* ------------------------------------------------- it never reloads the page */

test('it never reloads the page', () => {
  // The whole point: the register somebody is reading stays on screen while
  // it is brought up to date. A reload also throws away everything typed and
  // not yet saved.
  assert.doesNotMatch(codeOnly(refresh()), /location\.reload/);
});

test('it does not poll', () => {
  // Deliberately not `DeploymentRefresh`'s five-minute probe: that one fetches
  // a single small HTML document, this one would fan out across every mounted
  // read. Coming back to the app is the signal; a clock is not.
  assert.doesNotMatch(codeOnly(refresh()), /setInterval/);
});

/* ------------------------------------------------- separation of concerns */

test('DeploymentRefresh is left alone — it still owns the reload and its idle rule', () => {
  const deployment = read('src/pwa/DeploymentRefresh.tsx');
  assert.ok(deployment.includes('window.location.reload()')
    && deployment.includes('safeToReload'),
    'the deployment reload and its idle rule must stay where they are');
});

test('the data refresh does NOT inherit the deployment reload’s idle rule', () => {
  // `safeToReload` is sixty seconds of stillness or a hidden tab. Correct for
  // throwing a document away; useless here, because a refresh that only
  // happens after a minute of not touching the app never happens to somebody
  // using it.
  assert.doesNotMatch(codeOnly(refresh()), /safeToReload/);
});

test('both are mounted at the root, and separately', () => {
  const layout = read('app/_layout.tsx');
  assert.ok(layout.includes('<DeploymentRefresh />') && layout.includes('<DataRefresh />'),
    'a lifecycle owner that is never mounted does nothing at all');
});

/* ------------------------------- the readers are reachable from the outside */

test('every live read registers itself, or there is nothing to revalidate', () => {
  // The lifecycle module asks the REGISTRY, not the hooks. A useAsync that
  // does not register is a screen the app can never bring up to date, and
  // DataRefresh would be wiring into an empty set.
  const hooks = read('src/data/hooks.ts');
  assert.ok(hooks.includes('registerRevalidator('),
    'useAsync does not register, so revalidateStale has nobody to ask');
});

test('what is registered is the hook’s own refetch', () => {
  const hooks = read('src/data/hooks.ts');
  assert.match(hooks, /registerRevalidator\(\{\s*revalidate:\s*retry/,
    'the registry must call the same path as a retry, so a lifecycle refresh '
    + 'and a manual one cannot diverge');
});

test('a registration is torn down when the screen goes', () => {
  // registerRevalidator returns its own unsubscribe; returning it from the
  // effect is what unregisters. Without it, an unmounted screen is refetched
  // forever and its dispatch fires into a dead tree.
  const hooks = read('src/data/hooks.ts');
  assert.match(hooks, /return registerRevalidator\(/);
});

test('a read pinned by ?state=loading is not dragged out of it', () => {
  const hooks = read('src/data/hooks.ts');
  assert.match(hooks, /if \(pinned\) return;/,
    'a reviewer pinning a screen on its loading state would have it refetched away');
});

test('the registry holds no data — only the ability to be asked', () => {
  // Guardrail 1: one member source. A registry that cached answers would be
  // a second copy of the member list by another name.
  const src = read('src/data/revalidate.ts');
  assert.ok(!/\bdata\b\s*:/.test(codeOnly(src)),
    'the revalidation registry has started storing data');
});
