// Scenario C: cold-start timing under a simulated mid-range phone (4x CPU throttle, slow-4G-like network: 1.6 Mbps down, 150 ms RTT) with the data stand-in (130 ms API).
const { chromium } = require('/home/user/RosiFit/node_modules/playwright-core');
const fs = require('fs'); const LOG = __dirname + '/h2b.log';
const routes = (process.env.ROUTES || '/,/members,/attendance').split(',');
const CPU = +(process.env.CPU || 4);
(async () => {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url'); const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'auth-1', role: 'authenticated', exp })}.sig`;
  const session = { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: { id: 'auth-1', aud: 'authenticated', role: 'authenticated' } };
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--ignore-certificate-errors'] });
  for (const route of routes) for (const signedIn of [true]) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } }); const page = await ctx.newPage();
    await page.addInitScript(s => { localStorage.setItem('sb-localhost-auth-token', s); window.__lcp = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {} }, JSON.stringify(session));
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    const reqs = []; page.on('request', r => reqs.push({ url: r.url(), t: Date.now() })); const resps = []; page.on('response', r => resps.push({ url: r.url(), t: Date.now(), ok: r.ok() }));
    const before = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).length;
    const t0 = Date.now(); await page.goto('http://localhost:4173' + route, { waitUntil: 'networkidle', timeout: 120000 }); const tIdle = Date.now() - t0;
    // time until the screen shows real content: a member name / list rows (DOM grows past 1500 nodes) or the home metrics
    let tContent = null; const tc = Date.now(); while (Date.now() - tc < 30000) { const n = await page.evaluate(() => document.getElementsByTagName('*').length); if (n > 1500 || route === '/') { tContent = Date.now() - t0; break; } await page.waitForTimeout(100); }
    await page.waitForTimeout(1000);
    const perf = await page.evaluate(() => { const nav = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; const res = performance.getEntriesByType('resource'); const js = res.filter(r => r.name.endsWith('.js')); return { ttfb: Math.round(nav.responseStart), domInteractive: Math.round(nav.domInteractive), fcp: fcp ? Math.round(fcp.startTime) : null, lcp: window.__lcp, jsBytes: Math.round(js.reduce((a, r) => a + (r.encodedBodySize || 0), 0) / 1024), jsDone: Math.round(Math.max(...js.map(r => r.responseEnd))), fontBytes: Math.round(res.filter(r => /\.ttf/.test(r.name)).reduce((a, r) => a + (r.encodedBodySize || 0), 0) / 1024), nodes: document.getElementsByTagName('*').length }; });
    const api = reqs.filter(r => r.url.includes('54322')); const apiResp = resps.filter(r => r.url.includes('54322'));
    const firstApi = api.length ? api[0].t - t0 : null, lastApi = apiResp.length ? Math.max(...apiResp.map(r => r.t)) - t0 : null;
    console.log(`\n## ${route} cold start, CPU×${CPU}, slow-4G: TTFB ${perf.ttfb} ms | JS downloaded ${perf.jsBytes} KB by ${perf.jsDone} ms | FCP ${perf.fcp} ms | LCP ${perf.lcp} ms | first API request at ${firstApi} ms | last API response at ${lastApi} ms (${api.length} API requests) | content on screen at ${tContent} ms (${perf.nodes} nodes) | network idle ${tIdle} ms | fonts ${perf.fontBytes} KB`);
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
