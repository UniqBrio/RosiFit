import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const CASES = [
  ['/weekly?state=loading', 'weekly · loading'],
  ['/weekly?state=error',   'weekly · error'],
  ['/weekly',               'weekly · ready'],
  ['/members?state=loading','members · loading'],
  ['/members?state=error',  'members · error'],
  ['/upload?state=error',   'upload · error'],
  ['/reports?state=loading','reports · loading'],
  ['/reports?state=error',  'reports · error'],
];
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let bad = 0;
for (const [url, name] of CASES) {
  const p = await b.newPage({ viewport:{width:400,height:880} });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8100' + url, { waitUntil:'networkidle' });
  await p.waitForTimeout(700);
  const txt = (await p.evaluate(() => document.body.innerText)).replace(/\n+/g,' | ');
  const flags = [];
  if (errs.length) flags.push('JS: ' + errs[0].slice(0,50));
  if (name.includes('loading') && !/Loading|progressbar/i.test(await p.evaluate(() => document.body.innerHTML))) {
    // skeleton has no text, so assert on the accessibility role instead
    const has = await p.evaluate(() => !!document.querySelector('[role="progressbar"]'));
    if (!has) flags.push('NO SKELETON');
  }
  if (name.includes('error') && !/went wrong/i.test(txt)) flags.push('NO ERROR STATE');
  if (flags.length) bad++;
  console.log(name.padEnd(20) + txt.slice(0,66).padEnd(68) + (flags.join(' | ') || 'ok'));
  await p.close();
}
console.log('\n' + (CASES.length - bad) + '/' + CASES.length + ' state cases correct');
await b.close();
