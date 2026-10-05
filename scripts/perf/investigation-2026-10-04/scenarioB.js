// Scenario B: render cost per screen with realistic data. Reports wall time to networkidle, DOM nodes, CDP script/layout time, long tasks, and search keystroke latency.
const { chromium } = require('/home/user/RosiFit/node_modules/playwright-core');
const fs = require('fs'); const LOG = __dirname + '/h2b.log';
const COURSE = process.env.COURSE || 'c0000000-0000-4000-8000-000000000000';
const routes = (process.env.ROUTES || `/,/members,/attendance,/courses,/reports,/weekly,/course/${COURSE},/audit`).split(',');
(async () => {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url'); const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'auth-1', role: 'authenticated', exp })}.sig`;
  const session = { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: { id: 'auth-1', aud: 'authenticated', role: 'authenticated' } };
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--ignore-certificate-errors'] });
  for (const route of routes) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } }); const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(String(e).slice(0, 120))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
    await page.addInitScript(s => { localStorage.setItem('sb-localhost-auth-token', s); window.__lt = []; window.__ev = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); new PerformanceObserver(l => l.getEntries().forEach(e => window.__ev.push({ n: e.name, d: Math.round(e.duration), p: Math.round(e.processingEnd - e.processingStart) }))).observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch {} }, JSON.stringify(session));
    const cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable');
    const before = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).length; const t0 = Date.now();
    await page.goto('http://localhost:4173' + route, { waitUntil: 'networkidle', timeout: 90000 }); const tIdle = Date.now() - t0;
    await page.waitForTimeout(1500);
    const lines = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).slice(before); const bytes = lines.reduce((a, l) => a + (+l.split('\t')[4] || 0), 0);
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
    const dom = await page.evaluate(() => ({ nodes: document.getElementsByTagName('*').length, lt: window.__lt, ltSum: window.__lt.reduce((a, b) => a + b, 0), text: document.body.innerText.length }));
    console.log(`\n## ${route}: networkidle ${tIdle} ms | ${lines.length} requests, ${(bytes / 1024).toFixed(0)} KB JSON | DOM nodes ${dom.nodes} | script ${(m.ScriptDuration * 1000).toFixed(0)} ms, layout ${(m.LayoutDuration * 1000).toFixed(0)} ms, style ${(m.RecalcStyleDuration * 1000).toFixed(0)} ms, task ${(m.TaskDuration * 1000).toFixed(0)} ms | heap ${(m.JSHeapUsedSize / 1048576).toFixed(0)} MB | long tasks ${dom.lt.length} (sum ${dom.ltSum} ms, max ${Math.max(0, ...dom.lt)} ms) | url ${page.url().replace('http://localhost:4173', '')}`);
    if (errors.length) console.log('   errors: ' + [...new Set(errors)].slice(0, 4).join(' | '));
    // search keystrokes where a search box exists
    const box = page.getByPlaceholder(/search|alias/i).first();
    if (await box.count()) { await box.click(); await page.evaluate(() => { window.__ev = []; window.__lt = []; });
      const keyT = []; for (const ch of 'priya') { const s = Date.now(); await page.keyboard.type(ch); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); keyT.push(Date.now() - s); await page.waitForTimeout(150); }
      const ev = await page.evaluate(() => ({ ev: window.__ev.filter(e => /input|key/.test(e.n)), lt: window.__lt }));
      const after = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).length - before - lines.length;
      console.log(`   search 'priya' one key at a time: per-key wall to next frame ${keyT.join('/')} ms | input/key event durations ${ev.ev.map(e => e.d).join('/') || '<16'} ms | long tasks during typing ${ev.lt.join('/') || 'none'} | network requests caused by typing: ${after}`); }
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
