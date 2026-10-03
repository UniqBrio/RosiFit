// Per-screen JavaScript budget (T-407). Not part of any gate; a measurement.
// Loads each route COLD (fresh browser context) with a stored session against the local stand-in API
// (stand-in-api.js in this folder), and sums the COMPRESSED bytes of every .js response the page
// downloads until the network is idle -- initial scripts AND any chunk fetched on demand.
//   1. build: EXPO_PUBLIC_SUPABASE_URL=https://localhost:54322 EXPO_PUBLIC_SUPABASE_ANON_KEY=x \
//        npx expo export --platform web --clear
//   2. serve dist/ with gzip on :4173 (any static server that gzips), run stand-in-api.js, then:
//   3. npm i --no-save playwright-core@1.63.0 && node scripts/perf/js-budget.js [budgetKB=250] [routes...]
//   CHROMIUM=/path/to/chrome overrides the browser (default: this container's /opt/pw-browsers/chromium).
const { chromium } = require('playwright-core');
const zlib = require('zlib');
(async () => {
  const budget = +(process.argv[2] || 250) * 1024;
  const routes = process.argv.slice(3).length ? process.argv.slice(3) : ['/', '/attendance', '/members'];
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'auth-1', role: 'authenticated', exp })}.sig`;
  const session = { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp,
    user: { id: 'auth-1', aud: 'authenticated', role: 'authenticated' } };
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--ignore-certificate-errors'] });
  let fail = 0;
  for (const route of routes) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
    const page = await ctx.newPage();
    await page.addInitScript(s => localStorage.setItem('sb-localhost-auth-token', s), JSON.stringify(session));
    const js = [];
    page.on('response', async r => {
      if (!/\.js(\?|$)/.test(r.url())) return;
      const h = await r.allHeaders();
      // No content-length (chunked): the body Playwright hands back is DECODED, so gzip it here rather than
      // report uncompressed bytes as compressed.
      const declared = +(h['content-length'] || 0);
      const len = declared || zlib.gzipSync(await r.body()).length;
      js.push({ url: r.url().replace(/^https?:\/\/[^/]+/, ''), bytes: len, enc: declared ? (h['content-encoding'] || 'identity') : 'gzip*' });
    });
    await page.goto('http://localhost:4173' + route, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const total = js.reduce((a, x) => a + x.bytes, 0);
    const ok = total <= budget; if (!ok) fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${route.padEnd(12)} ${(total / 1024).toFixed(0).padStart(5)} KB compressed JS  (${js.length} files; budget ${budget / 1024} KB)`);
    for (const x of js.sort((a, b) => b.bytes - a.bytes).slice(0, 4)) console.log(`        ${(x.bytes / 1024).toFixed(0).padStart(5)} KB ${x.enc.padEnd(8)} ${x.url.slice(0, 90)}`);
    await ctx.close();
  }
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
