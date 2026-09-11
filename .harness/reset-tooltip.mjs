/**
 * DOES THE TOOLTIP ACTUALLY APPEAR OVER A DISABLED BUTTON?
 *
 * This is the one claim `src/components/resetTooltip.test.ts` cannot make. It
 * reads source and proves the wiring is present; whether `onPointerEnter` on a
 * `View` survives the trip to the DOM and fires while the pointer is over a
 * child with `pointerEvents: 'box-none'` is a question only a browser answers.
 *
 * Serve the export on 8100 first:
 *   npm run export && npx serve -s dist -l 8100
 *
 * Then: node .harness/reset-tooltip.mjs
 *
 * Runs on FIXTURES -- no EXPO_PUBLIC_SUPABASE_URL in the export means
 * `isConfigured` is false and `repository.ts` answers from `src/data/mock.ts`,
 * so there is no sign-in and no production data anywhere near this.
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

await p.goto(`${BASE}/course/${COURSE}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);

const reset = p.getByTestId('course-day-reset');
const bubble = p.getByTestId('course-day-reset-why');

check('the Reset button is on the screen', await reset.count() > 0);

// The state this is all about: nothing ticked, so the button is dead.
const disabled = await reset.evaluate(el => el.getAttribute('aria-disabled'));
check('the button is disabled to begin with', disabled === 'true', `aria-disabled=${disabled}`);

check('no bubble before anything is hovered', await bubble.count() === 0);

// THE CLAIM. A real pointer move, not a dispatched event: a synthetic
// MouseEvent would prove that React's handler works, which nobody doubted,
// and not that the browser delivers the event over a box-none child.
await reset.hover({ force: true });
await p.waitForTimeout(250);
check('HOVERING THE DISABLED BUTTON SHOWS THE TOOLTIP', await bubble.count() > 0);

if (await bubble.count() > 0) {
  const text = (await bubble.innerText()).trim();
  console.log(`      bubble says: "${text}"`);
  // EITHER reason is correct here -- which one depends on the day the strip
  // opens on. What must be true is that it is one of the two and not a third
  // thing, and that it is the one matching the state (checked per-day below).
  check('it gives one of the two real reasons',
    /uploaded|tick the members/i.test(text), text);

  const box = await bubble.boundingBox();
  const view = p.viewportSize();
  check('the bubble is inside the window',
    box && box.x >= 0 && box.x + box.width <= view.width,
    box ? `x=${Math.round(box.x)} w=${Math.round(box.width)} vw=${view.width}` : 'no box');

  // THE DEFECT THE FIRST RUN OF THIS SCRIPT FOUND. `maxWidth` on an
  // absolutely positioned box is measured against its containing block, which
  // is the wrapper -- as wide as the button, 82px -- so the sentence wrapped
  // into a thin column. Nothing in the source said so.
  check('the bubble is wide enough to read a sentence in',
    box && box.width >= 200,
    box ? `w=${Math.round(box.width)}` : 'no box');
  check('the bubble is not a tall thin column',
    box && box.height <= 120,
    box ? `h=${Math.round(box.height)}` : 'no box');

  /*
   * IS IT ACTUALLY VISIBLE? Every check above passed while the bubble was
   * painted BEHIND the member cards -- present, correctly sized, inside the
   * window, and a sliver of border peeping out from under a card. Counting
   * elements cannot see that. Pixels can: sample the same point with the
   * bubble up and with it down, and if nothing changed, nothing is on top.
   */
  const at = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
  const sample = async () => {
    const shot = await p.screenshot({ clip: { x: at.x, y: at.y, width: 3, height: 3 } });
    return shot.toString('base64');
  };
  const withBubble = await sample();
  await p.mouse.move(5, 5);
  await p.waitForTimeout(250);
  const without = await sample();
  await reset.hover({ force: true });
  await p.waitForTimeout(250);
  check('THE BUBBLE IS ACTUALLY PAINTED, not hidden behind the cards below it',
    withBubble !== without, `sampled at ${at.x},${at.y}`);

  check('the bubble takes no pointer events',
    await bubble.evaluate(el => getComputedStyle(el).pointerEvents) === 'none');
  check('the bubble is hidden from screen readers',
    await bubble.evaluate(el => el.getAttribute('aria-hidden')) === 'true');
}

// And it goes away again.
await p.mouse.move(5, 5);
await p.waitForTimeout(250);
check('moving the pointer away hides it', await bubble.count() === 0);

// The touch path, which is the one a phone takes.
await reset.tap({ force: true }).catch(() => reset.click({ force: true }));
await p.waitForTimeout(250);
check('TAPPING THE DISABLED BUTTON SHOWS IT TOO', await bubble.count() > 0);

await p.mouse.move(5, 5);
await p.waitForTimeout(300);

/* ------------------------------------------------ the requester's own case
 * A day whose file has NOT arrived. Its card carries the "Awaiting upload"
 * button, so that is how one is found rather than by guessing a date. This is
 * the wording the request was about, and until now no check had ever seen it.
 */
// The DAY CARD of an awaiting day, not its upload button -- pressing the
// button opens the upload screen, which is a different thing entirely. The
// card is found by the button beside it rather than by a hard-coded date, so
// this keeps working when the fixture week moves.
/*
 * FROM THE CARD OUTWARDS, not from the button inwards. The first version of
 * this walked up from the "Awaiting upload" text and took the first day
 * testID it found under any ancestor -- which is whatever card comes first in
 * the strip, not the awaiting one. It reported Monday, Monday HAS marks, and
 * the check then "failed" on the app for saying the right thing.
 *
 * Two traps here, both of which cost a run:
 *   - `course-day-add-<iso>` is NOT the awaiting button. It is the SECOND
 *     upload, offered on a day that already has marks, and its words are
 *     "Upload again". Only the words "Awaiting upload" identify the state.
 *   - the fixture week does not give every course an un-uploaded day. `c1`
 *     runs Mon/Wed/Fri and all three have marks, so the requester's own case
 *     cannot be reached there at all. Hunt for a course that has one rather
 *     than assume.
 */
const findAwaiting = () => p.evaluate(() => {
  for (const card of document.querySelectorAll('[data-testid^="course-day-2"]')) {
    const frame = card.parentElement;
    if (frame && /Awaiting upload/.test(frame.textContent ?? '')) {
      return card.getAttribute('data-testid');
    }
  }
  return null;
});

let awaitingDay = await findAwaiting();
let awaitingCourse = COURSE;
for (const c of ['c2', 'c3', 'c1']) {
  if (awaitingDay) break;
  await p.goto(`${BASE}/course/${c}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  awaitingDay = await findAwaiting();
  awaitingCourse = c;
}

check('a course with an un-uploaded day was found, to test the ask against',
  awaitingDay !== null, `${awaitingCourse} ${awaitingDay}`);

if (awaitingDay) {
  await p.getByTestId(awaitingDay).click({ force: true });
  await p.waitForTimeout(700);
  await p.getByTestId('course-day-reset').hover({ force: true });
  await p.waitForTimeout(300);
  const b2 = p.getByTestId('course-day-reset-why');
  check('the tooltip shows on a day whose file has not arrived', await b2.count() > 0);
  if (await b2.count() > 0) {
    const text = (await b2.innerText()).trim();
    console.log(`      on an un-uploaded day it says: "${text}"`);
    // THE REQUEST, IN ONE ASSERTION. It must name the upload rather than the
    // ticking: a day with no file has nobody to tick, so the other sentence
    // would be true and useless.
    check('IT NAMES THE UPLOAD, WHICH IS WHAT WAS ASKED FOR',
      /once an attendance file has been uploaded/i.test(text), text);
    await p.screenshot({ path: '.harness/reset-tooltip-awaiting.png' });
  }
}

/* ---------------------------------------------------------- a phone's width
 * The bubble is 240 wide and anchored to the control's right edge. On a
 * narrow screen it grows leftwards, and the thing to prove is that it does
 * not grow off the left edge or push the page sideways. */
await p.setViewportSize({ width: 400, height: 880 });
await p.waitForTimeout(600);
await p.mouse.move(5, 5);
await reset.hover({ force: true });
await p.waitForTimeout(300);
check('the tooltip still appears at phone width', await bubble.count() > 0);
if (await bubble.count() > 0) {
  const box = await bubble.boundingBox();
  check('at 400px it is still fully on screen',
    box && box.x >= 0 && box.x + box.width <= 400,
    box ? `x=${Math.round(box.x)} w=${Math.round(box.width)}` : 'no box');
  const scrolls = await p.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);
  check('and it does not make the page scroll sideways', !scrolls);
  await p.screenshot({ path: '.harness/reset-tooltip-phone.png' });
}

await p.setViewportSize({ width: 1200, height: 900 });
await p.waitForTimeout(400);
await p.mouse.move(5, 5);
await reset.hover({ force: true });
await p.waitForTimeout(300);
await p.screenshot({ path: '.harness/reset-tooltip.png' });
await b.close();

console.log(fails.length === 0
  ? `\nALL PASS (${COURSE})`
  : `\n${fails.length} FAILED: ${fails.join(' · ')}`);
process.exit(fails.length === 0 ? 0 : 1);
