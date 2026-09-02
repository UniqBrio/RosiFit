import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const AUDIT = () => {
  const parse = c => { const m = c.match(/[\d.]+/g); return m ? m.slice(0,3).map(Number) : null; };
  const lum = ([r,g,b]) => { const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const ratio=(a,b)=>{const x=lum(a)+0.05,y=lum(b)+0.05;return x>y?x/y:y/x;};
  // Walking ANCESTORS alone is wrong: react-navigation paints the header bar
  // with a SIBLING element positioned behind the title, so the ancestor chain
  // is transparent all the way up to a light container and the title looks
  // like white-on-white. elementsFromPoint returns the real paint stack at
  // that pixel, siblings included.
  const opaque = cs => { const a = cs.backgroundColor.match(/[\d.]+/g);
    return a && (a.length < 4 || +a[3] > 0.85) ? a.slice(0,3).map(Number) : null; };
  const bgOf = el => {
    const q = el.getBoundingClientRect();
    const x = q.left + q.width / 2, y = q.top + q.height / 2;
    // Clamping an off-screen element to the viewport edge samples a DIFFERENT
    // element's pixel and invents a failure. Skip instead; the scroll pass
    // below brings each one into view and measures it properly.
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return null;
    const stack = document.elementsFromPoint(x, y);
    let started = false;
    for (const n of stack) {
      if (!started) { if (n === el || el.contains(n) || n.contains(el)) started = true; else continue; }
      if (n === el) continue;
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;  // gradient
      const c = opaque(cs);
      if (c) return c;
    }
    return null; };
  const out=[];
  for (const el of document.querySelectorAll('*')) {
    const txt=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();
    if(!txt) continue;
    const q=el.getBoundingClientRect(); if(q.width<2||q.height<2) continue;
    const cs=getComputedStyle(el);
    if(cs.visibility==='hidden'||cs.opacity==='0') continue;
    const fg=parse(cs.color); const bg=bgOf(el); if(!fg||!bg) continue;
    const size=parseFloat(cs.fontSize), weight=+cs.fontWeight||400;
    const need=(size>=24||(size>=18.66&&weight>=700))?3:4.5;
    const got=ratio(fg,bg);
    if(got<need) out.push({txt:txt.slice(0,34),got:+got.toFixed(2),need,color:cs.color});
  }
  return out;
};
const ROUTES=['/weekly','/upload','/members','/courses','/course/rules','/attendance','/holiday',
  '/templates','/staff','/reports','/audit','/send','/register','/more'];
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const theme of ['dark','light']) {
  const p = await b.newPage({ viewport:{width:400,height:880} });
  await p.goto('http://127.0.0.1:8100/more',{waitUntil:'networkidle'});
  await p.waitForTimeout(800);
  await p.getByText(theme==='light'?'Light':'Dark',{exact:true}).click();
  await p.waitForTimeout(500);
  let total=0;
  for (const r of ROUTES) {
    await p.goto('http://127.0.0.1:8100'+r,{waitUntil:'networkidle'});
    await p.waitForTimeout(450);
    // measure in viewport-sized steps so nothing is skipped for being below the fold
    const bad = [];
    const seen = new Set();
    const height = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 700) {
      await p.evaluate(v => window.scrollTo(0, v), y);
      await p.waitForTimeout(200);
      for (const f of await p.evaluate(AUDIT)) {
        const k = f.txt + f.color; if (seen.has(k)) continue; seen.add(k); bad.push(f);
      }
    }
    total += bad.length;
    if (bad.length) { console.log(`  ${theme} ${r}: ${bad.length}`);
      for (const f of bad.slice(0,3)) console.log(`     ${f.got}/${f.need} ${f.color} "${f.txt}"`); }
  }
  console.log(`${theme.toUpperCase()}: ${total} contrast failures across ${ROUTES.length} screens`);
  await p.close();
}
await b.close();
