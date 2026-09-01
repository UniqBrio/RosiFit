import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
// spot-check the reworked screens in LIGHT mode too: the theme toggle drives
// every screen, so a light-only regression is easy to ship blind
const routes = ['/(tabs)','/(tabs)/weekly','/member/1','/match','/course/rules','/forgot-pin','/set-pin','/appearance'];
let bad = 0;
for (const path of routes) {
  const p = await b.newPage({ viewport:{width:420,height:900}, colorScheme:'light' });
  const errs=[];
  p.on('pageerror', e => errs.push(e.message.split(';')[0]));
  await p.goto('http://127.0.0.1:8100'+path, { waitUntil:'networkidle' });
  await p.waitForTimeout(500);
  const len = (await p.evaluate(() => document.body.innerText)).trim().length;
  if (errs.length || len < 40) { bad++; console.log(`FAIL ${path} ${errs[0]??''} len=${len}`); }
  await p.close();
}
console.log(bad===0 ? `light mode: all ${routes.length} clean` : `${bad} light-mode failures`);
await b.close();
