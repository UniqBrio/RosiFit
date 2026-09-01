import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [path,name] of [['/','signin'],['/(tabs)','home'],['/help','help'],['/(tabs)/weekly','weekly'],['/(tabs)/more','more']]) {
  const p = await b.newPage({ viewport:{width:420,height:900} });
  const errs=[];
  p.on('pageerror', e => errs.push(e.message.split(';')[0]));
  await p.goto('http://127.0.0.1:8100'+path, { waitUntil:'networkidle' });
  await p.waitForTimeout(700);
  console.log(name.padEnd(8), errs.length? errs.join(' | ') : 'clean');
  await p.close();
}
await b.close();
