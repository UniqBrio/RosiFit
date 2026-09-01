import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport:{width:400,height:880} });
await p.goto('http://127.0.0.1:8100/more',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
await p.getByText('Dark',{exact:true}).click(); await p.waitForTimeout(400);
await p.goto('http://127.0.0.1:8100/staff',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
const info = await p.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find(e =>
    [...e.childNodes].some(n => n.nodeType===3 && n.textContent.trim()==='Staff'));
  const chain = []; let n = el;
  for (let i=0;i<6 && n;i++){ const cs=getComputedStyle(n);
    chain.push({tag:n.tagName, bg:cs.backgroundColor, color:cs.color}); n=n.parentElement; }
  return chain;
});
console.log(JSON.stringify(info,null,1));
// authoritative: sample the actual painted pixel behind the title
const px = await p.evaluate(async () => {
  const el = [...document.querySelectorAll('*')].find(e =>
    [...e.childNodes].some(n => n.nodeType===3 && n.textContent.trim()==='Staff'));
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, h: r.height };
});
console.log('title box', px);
await p.screenshot({ path:'.harness/hdr.png', clip:{x:0,y:0,width:400,height:120} });
await b.close();
