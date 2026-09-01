import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ROUTES = ['/', '/register', '/set-pin', '/forgot-pin', '/weekly', '/upload', '/members',
  '/member/1', '/member/edit', '/courses', '/course/edit', '/course/rules', '/sessions',
  '/holiday', '/templates', '/staff', '/reports', '/audit', '/change-mobile',
  '/send', '/send/review', '/send/result', '/more'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let bad = 0;
for (const r of ROUTES) {
  const p = await b.newPage({ viewport: { width: 400, height: 880 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type()==='error' && !/favicon|404|Download the React/.test(m.text())) errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8100' + r, { waitUntil: 'networkidle' }).catch(e => errs.push('nav: '+e.message));
  await p.waitForTimeout(500);
  const txt = (await p.evaluate(() => document.body.innerText)).trim();
  const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const small = await p.evaluate(() => {
    const els = [...document.querySelectorAll('[role="button"],[role="radio"],[role="switch"],[role="link"],button')];
    return els.filter(e => { const q = e.getBoundingClientRect();
      return q.width > 0 && q.height > 0 && q.height < 44; }).length;
  });
  const flags = [];
  if (!txt) flags.push('BLANK');
  if (over > 1) flags.push('OVERFLOW ' + over + 'px');
  if (small > 0) flags.push(small + ' targets <44px');
  if (errs.length) flags.push('JS: ' + errs[0].slice(0, 60));
  if (flags.length) bad++;
  console.log(r.padEnd(16) + (txt.split('\n')[0] || '').slice(0,30).padEnd(32) + (flags.join(' | ') || 'ok'));
  await p.close();
}
console.log('\n' + (ROUTES.length - bad) + '/' + ROUTES.length + ' routes clean');
await b.close();
