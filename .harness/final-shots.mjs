import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [path,name] of [['/member/1','member'],['/match','match'],['/course/rules','rules']]) {
  const p = await b.newPage({ viewport:{width:420,height:900}, deviceScaleFactor:2 });
  await p.goto('http://127.0.0.1:8100'+path, { waitUntil:'networkidle' });
  await p.waitForTimeout(700);
  await p.screenshot({ path:`.harness/final-${name}.png`, fullPage:true });
  await p.close();
}
await b.close(); console.log('shots done');
