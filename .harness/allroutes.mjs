import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const routes = [
  ['/','signin'],['/(tabs)','home'],['/(tabs)/weekly','weekly'],['/upload','upload'],
  ['/(tabs)/members','members'],['/(tabs)/more','more'],['/member/1','member'],['/member/edit','member-edit'],
  ['/courses','courses'],['/course/edit','course-edit'],['/course/rules','rules'],['/attendance','attendance'],
  ['/holiday','holiday'],['/templates','templates'],['/reports','reports'],['/staff','staff'],
  ['/staff/add','staff-add'],['/audit','audit'],['/register','register'],['/set-pin','set-pin'],
  ['/forgot-pin','forgot-pin'],['/change-mobile','change-mobile'],['/send','send'],
  ['/send/review','send-review'],['/send/result','send-result'],
  ['/appearance','appearance'],['/profile','profile'],['/help','help'],['/match','match'],
];
let bad=0;
for (const [path,name] of routes) {
  const p = await b.newPage({ viewport:{width:420,height:900} });
  const errs=[];
  p.on('pageerror', e => errs.push(e.message.split(';')[0]));
  p.on('console', m => { if (m.type()==='error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0,80)); });
  await p.goto('http://127.0.0.1:8100'+path, { waitUntil:'networkidle' });
  await p.waitForTimeout(600);
  const len = (await p.evaluate(() => document.body.innerText)).trim().length;
  const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const issues = [errs.length?`ERR ${errs[0]}`:null, len<40?`EMPTY(${len})`:null, over>1?`OVERFLOW ${over}px`:null].filter(Boolean);
  if (issues.length) { bad++; console.log(`FAIL ${name.padEnd(14)} ${issues.join(' | ')}`); }
  await p.close();
}
console.log(bad===0 ? `\nall ${routes.length} routes render, no errors, no overflow` : `\n${bad} of ${routes.length} routes have issues`);
await b.close();
