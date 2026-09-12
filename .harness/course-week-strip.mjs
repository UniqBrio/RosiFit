/**
 * DOES THE WEEK STRIP ACTUALLY DRAW ITS FOUR STATES?
 *
 * The claim `src/data/dayLoad.test.ts` and `src/components/courseWeekLoadFailed.test.ts`
 * cannot make. Those two prove the RULE is right and that the wiring is
 * present in source; whether seven cells appear, whether a failed week keeps
 * its dates, and whether the retry banner is PAINTED rather than sitting
 * behind a card are questions only a browser answers. The last one is not
 * hypothetical: the Reset tooltip passed every source assertion while being
 * drawn entirely behind the first member card (KL-007).
 *
 * Serve the export on 8100 first:
 *   npm run export && node .harness/serve.mjs 8100
 *
 * Then: node .harness/course-week-strip.mjs
 *
 * Runs on FIXTURES -- no EXPO_PUBLIC_SUPABASE_URL in the export means
 * `isConfigured` is false and `repository.ts` answers from `src/data/mock.ts`,
 * so there is no sign-in and no production data anywhere near this.
 *
 * `?state=error` and `?state=loading` are the review affordances useAsync
 * already carries (see src/data/hooks.ts): they force a branch so a reviewer
 * can see it without breaking anything on purpose. On fixtures they are the
 * only way to see the failure path at all.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BROWSER = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = process.env.HARNESS_BASE ?? 'http://127.0.0.1:8100';
const COURSE = process.env.HARNESS_COURSE ?? 'c1';

const b = await chromium.launch({ executablePath: BROWSER });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });

const fails = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails.push(name);
};

const cells = () => p.locator('[data-testid^="course-day-2"]');

/* ------------------------------------------------------- the ordinary week */
await p.goto(`${BASE}/course/${COURSE}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1400);

check('SEVEN DAY CELLS ARE DRAWN', await cells().count() === 7,
  `${await cells().count()} cells`);

// The strip is built from seven aggregate rows now, not from a pile of
// attendance records. If the mapping or the fixture disagreed about dates,
// this is where it would show: duplicate or missing days.
const dates = await cells().evaluateAll(
  els => els.map(e => e.getAttribute('data-testid').replace('course-day-', '')));
check('their dates are seven distinct days, in order',
  new Set(dates).size === 7 && [...dates].sort().join() === dates.join(), dates.join(' '));

const words = await p.locator('[data-testid^="course-day-2"]')
  .evaluateAll(els => els.map(e => e.getAttribute('aria-label') ?? ''));
check('every cell speaks its status to a screen reader, not just its colour',
  words.every(w => /,\s*\S/.test(w)), words[0]);

check('no cell reads "Load failed" on a week that loaded',
  !words.some(w => /Load failed/i.test(w)));

/* ------------------------------------------------------------ the loading week */
await p.goto(`${BASE}/course/${COURSE}?state=loading:week`, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
check('a week still in flight draws NO day cells — a skeleton stands in for the row',
  await cells().count() === 0, `${await cells().count()} cells`);

/* ------------------------------------------------------------- THE FAILED WEEK
 * The whole point of Phase A's Task 3, and the thing no source assertion can
 * see. Before this change the strip rendered `null` on an error: a failed week
 * looked like a course with no week, and took its dates with it. */
// `?state=error:week` forces ONLY the week read. A bare `?state=error` forces
// every read on the screen, and the course record is one of them -- so the
// screen's own `if (courses.state === 'error')` guard renders instead and the
// strip is never reached. That is not a bug in the strip; it is why the
// targeted form exists (src/data/hooks.ts). The first run of this file found
// exactly that: zero cells, zero banner, on a screen that was drawing the
// courses error state the whole time.
await p.goto(`${BASE}/course/${COURSE}?state=error:week`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);

check('A FAILED WEEK STILL DRAWS ITS SEVEN DAYS', await cells().count() === 7,
  `${await cells().count()} cells`);

const failedWords = await p.locator('[data-testid^="course-day-2"]')
  .evaluateAll(els => els.map(e => e.getAttribute('aria-label') ?? ''));
check('and EVERY ONE of them says Load failed',
  failedWords.length === 7 && failedWords.every(w => /Load failed/i.test(w)),
  failedWords[0]);

check('none of them says "Awaiting upload" — the bug this whole change is about',
  !failedWords.some(w => /Awaiting upload/i.test(w)));

// A day the app could not read must not offer an upload either: attaching a
// file to a day whose register may or may not already hold one is a guess.
check('a failed day offers no upload button',
  await p.locator('[data-testid^="course-day-upload-"]').count() === 0);
check('and no "upload again" either',
  await p.locator('[data-testid^="course-day-add-"]').count() === 0);

/* ------------------------------------------------------------- the retry banner */
const retry = p.getByTestId('course-week-retry');
check('the retry banner is on the screen', await retry.count() > 0);

if (await retry.count() > 0) {
  const text = (await retry.innerText()).trim();
  // The lines, not `[0]` -- react-native-web renders the icon as its own text
  // node, and that node is NOT empty: it is the Material Symbols ligature,
  // which trims to a character with no word in it. `filter(Boolean)` kept it,
  // and the check then compared the sentence against an icon. Keep lines that
  // contain an actual letter.
  const lines = text.split('\n').map(l => l.trim()).filter(l => /[a-z]/i.test(l));
  console.log(`      the banner says: ${lines.map(l => `"${l}"`).join(' / ')}`);
  check('IT SAYS EXACTLY WHAT WAS ASKED FOR',
    lines[0] === "Couldn't load attendance. Tap to retry.", lines[0]);
  check('with the technical reason under it, for whoever debugs it next',
    lines.length > 1 && lines[1].length > 0, lines[1] ?? '(nothing)');

  const box = await retry.boundingBox();
  const view = p.viewportSize();
  check('it spans the width of the screen, so the target is not a 33pt day cell',
    box && box.width > view.width * 0.5, box ? `w=${Math.round(box.width)}` : 'no box');
  check('and it clears the 44pt minimum touch target',
    box && box.height >= 44, box ? `h=${Math.round(box.height)}` : 'no box');

  /*
   * IS IT ACTUALLY PAINTED? Every check above would pass while the banner sat
   * behind the member cards -- present, correctly sized, inside the window,
   * invisible. That is exactly what happened to the Reset tooltip (KL-007):
   * react-native-web writes `position: relative` and `z-index: 0` onto
   * essentially every View, so almost every node is its own stacking context.
   * Counting elements cannot see it. Pixels can.
   */
  const at = { x: Math.round(box.x + 20), y: Math.round(box.y + box.height / 2) };
  const shot = await p.screenshot({ clip: { x: at.x, y: at.y, width: 6, height: 6 } });
  const here = shot.toString('base64');
  // The same sized patch of plain page background, well away from the banner.
  const bg = (await p.screenshot({ clip: { x: 4, y: Math.round(box.y), width: 6, height: 6 } }))
    .toString('base64');
  check('THE BANNER IS ACTUALLY PAINTED, not hidden behind the cards below it',
    here !== bg, `sampled at ${at.x},${at.y}`);

  check('it is a real button to a screen reader',
    await retry.evaluate(el => el.getAttribute('role')) === 'button');
  const label = await retry.evaluate(el => el.getAttribute('aria-label') ?? '');
  check('and its spoken label carries the sentence too',
    /Couldn't load attendance/.test(label), label.slice(0, 70));

  await p.screenshot({ path: '.harness/course-week-failed.png' });
}

/* -------------------------------------------------------------- the legend
 * A day cell is ~33pt on a phone and carries its ICON alone; the legend one
 * line up is where the word reaches a sighted reader. A pink icon nobody has
 * named is the colour-alone signal guardrail 3 exists to stop. */
const legend = await p.locator('text=Load failed').count();
check('THE LEGEND NAMES the failed state while the week is failed', legend > 0);

/* ------------------------------------------------------------- a phone's width */
await p.setViewportSize({ width: 400, height: 880 });
await p.waitForTimeout(700);
check('all seven cells survive at phone width', await cells().count() === 7);
if (await retry.count() > 0) {
  const box = await retry.boundingBox();
  check('the banner is still fully on screen at 400px',
    box && box.x >= 0 && box.x + box.width <= 400,
    box ? `x=${Math.round(box.x)} w=${Math.round(box.width)}` : 'no box');
  const scrolls = await p.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);
  check('and the page does not scroll sideways', !scrolls);
  check('the sentence is still readable, not clipped to one line of ellipsis',
    box && box.height >= 44, box ? `h=${Math.round(box.height)}` : 'no box');
  await p.screenshot({ path: '.harness/course-week-failed-phone.png' });
}

await b.close();
console.log(fails.length === 0
  ? `\nALL PASS (${COURSE})`
  : `\n${fails.length} FAILED: ${fails.join(' · ')}`);
process.exit(fails.length === 0 ? 0 : 1);
