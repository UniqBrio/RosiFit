import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errs = [];
for (const [path,name] of [['/(tabs)','home'],['/reports','reports'],['/(tabs)/weekly','weekly']]) {
  const p = await b.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(`${name}: ${e.message}`));
  p.on('console', m => { if (m.type()==='error' && !/favicon|404/.test(m.text())) errs.push(`${name}: ${m.text()}`); });
  await p.goto('http://127.0.0.1:8100' + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 1) console.log(`  !! ${name}: ${over}px overflow`);
  await p.screenshot({ path: `.harness/shot-${name}.png`, fullPage: true });
  await p.close();
}
console.log('errors: ' + (errs.length ? '\n'+errs.join('\n') : '(none)'));
await b.close();
