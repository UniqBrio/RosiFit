// Request-waterfall reproduction (T-405/T-406, RUN_app-feels-slow.md). Not part of any gate.
//   1. openssl req -x509 -newkey rsa:2048 -nodes -keyout k.pem -out c.pem -days 2 -subj /CN=localhost
//   2. node scripts/perf/stand-in-api.js            (HTTP/2 + TLS on :54322, logs to h2.log; DELAY=ms)
//   3. EXPO_PUBLIC_SUPABASE_URL=https://localhost:54322 EXPO_PUBLIC_SUPABASE_ANON_KEY=x \
//        npx expo export --platform web --clear      (--clear matters: T-114, a stale Metro cache kept the old URL)
//   4. serve dist/ on :4173, then: npm i --no-save playwright-core && node scripts/perf/cold-start.js /
//      (EXPIRED=1: start from an expired token; cold-start-nocache.js with NOCACHE=1 disables the browser
//       cache; cold-start-and-tabs.js taps Courses -> Reports -> Home, GAP=ms between taps)
//   h2.log: start ms, end ms, HTTP version, method, URL [+ first 80 chars of the body] -- one line per request.
// Cold start on Home, then Courses -> Reports -> Home by tapping the tab bar (client-side, no reload).
const { chromium } = require('playwright-core');
(async () => {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'auth-1', role: 'authenticated', exp })}.sig`;
  const session = { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp,
    user: { id: 'auth-1', aud: 'authenticated', role: 'authenticated' } };
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--ignore-certificate-errors'] });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  await page.addInitScript(s => localStorage.setItem('sb-localhost-auth-token', s), JSON.stringify(session));
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle', timeout: 60000 });
  const tapped = [];
  for (const label of ['Courses', 'Reports', 'Home']) {
    const el = page.getByRole('tab', { name: label }).or(page.getByText(label, { exact: true })).first();
    try { await el.click({ timeout: 5000 }); tapped.push(label); } catch { tapped.push(label + '(missing)'); }
    await page.waitForTimeout(+(process.env.GAP || 2000));
  }
  console.log('tapped: ' + tapped.join(', ') + ' url=' + page.url());
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
