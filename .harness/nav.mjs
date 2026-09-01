import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 400, height: 880 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));

// walk the app the way a person does, not by typing URLs
await p.goto('http://127.0.0.1:8100/members', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.getByText('Open', { exact: true }).first().click();
await p.waitForTimeout(900);
const url = p.url();
const head = (await p.evaluate(() => document.body.innerText)).split('\n').filter(Boolean).slice(0,4).join(' | ');
console.log('after tapping Open →', url);
console.log('  ', head);
await p.screenshot({ path: '.harness/shot-member.png', fullPage: true });

// and the send flow end to end
await p.goto('http://127.0.0.1:8100/weekly', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.getByText(/Choose a template/).click();
await p.waitForTimeout(800);
console.log('weekly → send:', p.url());
await p.getByText('Choose', { exact: true }).first().click();
await p.waitForTimeout(400);
await p.getByText(/Review the message/).click();
await p.waitForTimeout(900);
console.log('send → review:', p.url());
const rv = (await p.evaluate(() => document.body.innerText)).split('\n').filter(Boolean).slice(0,6).join(' | ');
console.log('  ', rv);
await p.screenshot({ path: '.harness/shot-review.png', fullPage: true });
console.log('\nerrors:', errs.length ? errs.join('\n') : '(none)');
await b.close();
