// Scenario A: request counts per phase against the stand-in (DELAY=130 ms). Phases: cold start, each tab, idle, focus burst.
const { chromium } = require('/home/user/RosiFit/node_modules/playwright-core');
const fs = require('fs'); const LOG = __dirname + '/h2.log';
const lines = () => fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean);
function summarize(from, label) {
  const l = lines().slice(from); const starts = l.map(x => +x.split('\t')[0]), ends = l.map(x => +x.split('\t')[1]);
  const byPath = {}; for (const x of l) { const u = x.split('\t')[3]; const p = u.split('?')[0].replace('/rest/v1/', ''); byPath[p] = (byPath[p] || 0) + 1; }
  const span = l.length ? Math.max(...ends) - Math.min(...starts) : 0;
  console.log(`\n## ${label}: ${l.length} requests, first-start→last-end ${span} ms`);
  console.log('   ' + Object.entries(byPath).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(', '));
  return lines().length;
}
(async () => {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'auth-1', role: 'authenticated', exp })}.sig`;
  const session = { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: { id: 'auth-1', aud: 'authenticated', role: 'authenticated' } };
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--ignore-certificate-errors'] });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  await page.addInitScript(s => localStorage.setItem('sb-localhost-auth-token', s), JSON.stringify(session));
  let mark = 0; const t0 = Date.now();
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle', timeout: 60000 }); await page.waitForTimeout(2500);
  console.log('url after cold start: ' + page.url() + ' (' + (Date.now() - t0) + ' ms wall)');
  mark = summarize(mark, 'Cold start on / (signed in, fresh token)');
  for (const label of ['Members', 'Attendance', 'Courses', 'Reports', 'Follow-ups', 'Home']) {
    const el = page.getByRole('tab', { name: label }).or(page.getByText(label, { exact: true })).first();
    try { await el.click({ timeout: 5000 }); } catch { console.log(label + ' not found'); }
    await page.waitForTimeout(2500);
    mark = summarize(mark, 'Tab → ' + label + ' (url ' + page.url().replace('http://localhost:4173', '') + ')');
  }
  await page.waitForTimeout(13000);
  mark = summarize(mark, 'Idle 13 s on Home (no interaction)');
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
  await page.waitForTimeout(4000);
  mark = summarize(mark, 'Return to app (visibilitychange hidden→visible + focus) after 13 s idle, 6 tabs visited');
  await page.waitForTimeout(13000);
  await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
  await page.waitForTimeout(4000);
  mark = summarize(mark, 'Second return after another 13 s');
  await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
  await page.waitForTimeout(3000);
  mark = summarize(mark, 'Third return immediately (data < 12 s old)');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
