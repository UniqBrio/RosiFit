// Request-waterfall reproduction (T-405/T-406, RUN_app-feels-slow.md). Not part of any gate.
//   1. openssl req -x509 -newkey rsa:2048 -nodes -keyout k.pem -out c.pem -days 2 -subj /CN=localhost
//   2. node scripts/perf/stand-in-api.js            (HTTP/2 + TLS on :54322, logs to h2.log; DELAY=ms)
//   3. EXPO_PUBLIC_SUPABASE_URL=https://localhost:54322 EXPO_PUBLIC_SUPABASE_ANON_KEY=x \
//        npx expo export --platform web --clear      (--clear matters: T-114, a stale Metro cache kept the old URL)
//   4. serve dist/ on :4173, then: npm i --no-save playwright-core && node scripts/perf/cold-start.js /
//      (EXPIRED=1: start from an expired token; cold-start-nocache.js with NOCACHE=1 disables the browser
//       cache; cold-start-and-tabs.js taps Courses -> Reports -> Home, GAP=ms between taps)
//   h2.log: start ms, end ms, HTTP version, method, URL [+ first 80 chars of the body] -- one line per request.
// HTTP/2 + TLS stand-in for the Supabase API (production browsers use HTTP/2-3, so no 6-connection queue).
const http2 = require('http2'), fs = require('fs');
const DELAY = +process.env.DELAY || 200, LOG = process.env.LOG || 'h2.log';
fs.writeFileSync(LOG, '');
const t0 = Date.now();
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const user = { id: '11111111-1111-1111-1111-111111111111', name: 'Owner Local', kind: 'super_admin',
  role_label: 'Owner', phone_e164: '+919999999999', must_change_pin: false, is_active: true };
const srv = http2.createSecureServer({ key: fs.readFileSync('k.pem'), cert: fs.readFileSync('c.pem'), allowHTTP1: true });
srv.on('request', (q, r) => {
  let raw = ''; q.on('data', c => raw += c);
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
    'access-control-allow-methods': '*', 'access-control-expose-headers': 'Content-Range' };
  if (q.method === 'OPTIONS') { r.writeHead(204, cors); return r.end(); }
  const start = Date.now() - t0; const path = new URL(q.url, 'https://x').pathname;
  setTimeout(() => {
    let body = [];
    if (path.endsWith('/app_users')) body = [user];
    else if (path.startsWith('/auth/v1/token')) {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      body = { access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'auth-1', role: 'authenticated', exp })}.sig`,
        refresh_token: 'r2', token_type: 'bearer', expires_in: 3600, expires_at: exp,
        user: { id: 'auth-1', aud: 'authenticated', role: 'authenticated' } };
    } else if (path.startsWith('/auth/v1/user')) body = { id: 'auth-1', aud: 'authenticated', role: 'authenticated' };
    fs.appendFileSync(LOG, `${start}\t${Date.now() - t0}\t${q.httpVersion}\t${q.method}\t${q.url}${raw ? ' ' + raw.slice(0,80) : ''}\n`);
    r.writeHead(200, { ...cors, 'content-type': 'application/json', 'content-range': '0-0/0' });
    r.end(JSON.stringify(body));
  }, DELAY);
});
srv.listen(54322);
