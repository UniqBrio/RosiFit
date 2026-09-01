import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const AUDIT = () => {
  const parse = c => { const m = c.match(/[\d.]+/g); return m ? m.slice(0,3).map(Number) : null; };
  const lum = ([r,g,b]) => { const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const ratio=(a,b)=>{const x=lum(a)+0.05,y=lum(b)+0.05;return x>y?x/y:y/x;};
  const bgOf = el => { let n=el;
    while (n && n!==document.documentElement) {
      const cs=getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage!=='none') return null; // gradient: skip
      const c=parse(cs.backgroundColor);
      const a=cs.backgroundColor.match(/[\d.]+/g);
      if (c && (!a || a.length<4 || +a[3]>0.85)) return c;
      n=n.parentElement;
    } return [255,255,255]; };
  const out=[];
  for (const el of document.querySelectorAll('*')) {
    const txt=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();
    if(!txt) continue;
    const r=el.getBoundingClientRect(); if(r.width<2||r.height<2) continue;
    const cs=getComputedStyle(el);
    if(cs.visibility==='hidden'||cs.opacity==='0') continue;
    const fg=parse(cs.color); const bg=bgOf(el); if(!fg||!bg) continue;
    const size=parseFloat(cs.fontSize), weight=+cs.fontWeight||400;
    const need=(size>=24||(size>=18.66&&weight>=700))?3:4.5;
    const got=ratio(fg,bg);
    if(got<need) out.push({txt:txt.slice(0,40),got:+got.toFixed(2),need,color:cs.color,size});
  }
  return out;
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport:{width:420,height:900}, deviceScaleFactor:2 });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8100/more',{waitUntil:'networkidle'});
await p.waitForTimeout(900);

// drive the app's OWN switch, not a faked attribute
await p.getByText('Light', { exact: true }).click();
await p.waitForTimeout(600);
await p.screenshot({ path:'.harness/shot-more-light.png', fullPage:true });

const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
console.log('body background after choosing Light:', bg);

for (const [path,name] of [['/more','more'],['/weekly','weekly'],['/upload','upload'],['/members','members']]) {
  await p.goto('http://127.0.0.1:8100'+path,{waitUntil:'networkidle'});
  await p.waitForTimeout(700);
  const bad = await p.evaluate(AUDIT);
  console.log(`${name.padEnd(9)} ${bad.length} contrast failures`);
  for (const f of bad.slice(0,5)) console.log(`   ${f.got}/${f.need}  ${f.color} ${f.size}px  "${f.txt}"`);
  if (name==='weekly') await p.screenshot({ path:'.harness/shot-weekly-light.png', fullPage:true });
}
console.log('errors:', errs.length?errs.join('\n'):'(none)');
await b.close();
