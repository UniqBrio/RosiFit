import test from 'node:test';
import assert from 'node:assert/strict';
import { freshnessLabel, staleLabel, freshnessOf, JUST_NOW_MS } from './freshness';

/**
 * "Updated at 12:54 PM" — the honest counterpart to a background refresh.
 *
 * Run: npx tsx --test src/data/freshness.test.ts
 *
 * Once data can be brought up to date without the screen moving, "is this
 * current?" is no longer answered by the fact that the page just loaded. So
 * the screen says. The rule is only that it must never say something it
 * cannot stand behind.
 */

/** A fixed local wall-clock instant, so the assertion is not about the runner's zone. */
const at = (h: number, m: number) => new Date(2026, 8, 22, h, m, 0).getTime();

test('nothing is claimed before the first answer lands', () => {
  // A skeleton is not "updated" at any time.
  assert.equal(freshnessLabel(null, at(12, 54)), null);
});

test('data fetched moments ago reads as just now', () => {
  const t = at(12, 54);
  assert.equal(freshnessLabel(t, t + 1_000), 'Updated just now');
});

test('older data reads as a clock time', () => {
  assert.equal(freshnessLabel(at(12, 54), at(13, 30)), 'Updated at 12:54 PM');
});

test('the boundary is the same idea as the staleness floor', () => {
  const t = at(12, 54);
  assert.equal(freshnessLabel(t, t + JUST_NOW_MS - 1), 'Updated just now');
  assert.match(freshnessLabel(t, t + JUST_NOW_MS) ?? '', /^Updated at /);
});

test('a refresh in flight says so rather than showing a time about to expire', () => {
  assert.equal(freshnessOf({ state: 'ready', error: null, isRevalidating: true, fetchedAt: at(12, 54) }, at(13, 30)).label, 'Updating…');
});

test('a clock that has gone backwards does not produce a time in the future', () => {
  // A device correcting itself, or a DST jump. `now` before `fetchedAt` must
  // not read as "updated in 40 minutes".
  const label = freshnessLabel(at(13, 30), at(12, 54)) ?? '';
  assert.equal(label, 'Updated just now');
});

test('midnight and noon are written the way a person reads them', () => {
  assert.equal(freshnessLabel(at(0, 5), at(6, 0)), 'Updated at 12:05 AM');
  assert.equal(freshnessLabel(at(12, 0), at(18, 0)), 'Updated at 12:00 PM');
  assert.equal(freshnessLabel(at(13, 5), at(18, 0)), 'Updated at 1:05 PM');
});

test('minutes are padded', () => {
  assert.equal(freshnessLabel(at(9, 7), at(11, 0)), 'Updated at 9:07 AM');
});

test('data kept after a failed refresh is not presented as current', () => {
  // It is still the best answer available and still worth showing
  // (asyncState.ts), but it must not be dressed as fresh.
  assert.equal(staleLabel(at(12, 54)), 'Last updated 12:54 PM · Couldn’t refresh');
});

test('a failure with nothing ever loaded says only that', () => {
  assert.equal(staleLabel(null), 'Couldn’t reach the server.');
});

test('no freshness line invents a duration', () => {
  const lines = [
    freshnessLabel(at(12, 54), at(13, 30)),
    freshnessLabel(at(12, 54), at(12, 54)),
    staleLabel(at(12, 54)),
  ].filter((l): l is string => l !== null);
  for (const line of lines) {
    assert.doesNotMatch(line, /\b\d+\s*(minutes?|mins?|seconds?|secs?|hours?|hrs?)\b/i,
      `"${line}" counts elapsed time, which is a second clock to disagree with the first`);
  }
});

/* ===================================================================== the
 * FOUR STATES — the rule every screen now shares.
 */

const read = (o: Partial<Parameters<typeof freshnessOf>[0]>) => freshnessOf({
  state: 'ready', error: null, isRevalidating: false, fetchedAt: at(12, 54), ...o,
}, at(13, 30));

test('a first load that has never answered says nothing', () => {
  assert.deepEqual(read({ state: 'loading', fetchedAt: null }), { kind: 'none', label: null });
});

test('a FIRST load that failed says nothing here — it has its own error screen', () => {
  // Initial-load behaviour is untouched by this change, deliberately.
  assert.equal(read({ state: 'error', error: 'no network', fetchedAt: null }).kind, 'none');
});

test('a successful background refresh reads as fresh, with its timestamp', () => {
  assert.deepEqual(read({}), { kind: 'fresh', label: 'Updated at 12:54 PM' });
});

test('a refresh in progress reads as updating, keeping the data', () => {
  assert.deepEqual(read({ isRevalidating: true }), { kind: 'updating', label: 'Updating…' });
});

test('a FAILED background refresh reads as stale and says when the data was true', () => {
  // The regression this closes: ready + error was invisible on 19 screens.
  assert.deepEqual(read({ error: 'RosiFit could not reach the academy database.' }),
    { kind: 'stale', label: 'Last updated 12:54 PM · Couldn’t refresh' });
});

test('a failed refresh outranks a refresh in flight', () => {
  // A retry already running does not make the data on screen any less old.
  assert.equal(read({ error: 'offline', isRevalidating: true }).kind, 'stale');
});

test('the stale line always carries a clock time, never "just now"', () => {
  // The job of the line is to say WHEN the data was true. "Last updated just
  // now · Couldn't refresh" answers with the one thing it was not asked.
  const justFailed = freshnessOf(
    { state: 'ready', error: 'offline', isRevalidating: false, fetchedAt: at(12, 54) },
    at(12, 54) + 1_000);
  assert.equal(justFailed.label, 'Last updated 12:54 PM · Couldn’t refresh');
});

test('the stale line never erases the claim that there IS data', () => {
  for (const kind of ['fresh', 'updating', 'stale'] as const) {
    const r = kind === 'fresh' ? read({})
      : kind === 'updating' ? read({ isRevalidating: true })
      : read({ error: 'offline' });
    assert.equal(r.kind, kind);
    assert.ok(r.label && r.label.length > 0);
  }
});

test('a successful retry after a failure returns to fresh', () => {
  // ready + no error + a NEW fetchedAt is the whole of what recovery looks
  // like from here, and it must not leave any trace of the failure.
  const recovered = freshnessOf(
    { state: 'ready', error: null, isRevalidating: false, fetchedAt: at(13, 29) },
    at(13, 30));
  assert.equal(recovered.kind, 'fresh');
  assert.doesNotMatch(recovered.label ?? '', /Couldn’t|Could not/);
});

test('the stale wording is exactly one sentence shape, for one place to change it', () => {
  assert.match(read({ error: 'x' }).label ?? '', /^Last updated .+ · Couldn’t refresh$/);
});
