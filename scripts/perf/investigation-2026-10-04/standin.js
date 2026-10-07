// Stand-in Supabase API for local request-count measurement. HTTP/2+TLS, answers every REST read with []
// except app_users; logs every request. DELAY ms per request simulates the ~130 ms production floor.
const http2 = require('http2'), fs = require('fs'), path = require('path');
const DELAY = +process.env.DELAY || 130, LOG = process.env.LOG || path.join(__dirname, 'h2.log');
fs.writeFileSync(LOG, '');
const t0 = Date.now();
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const user = { id: '11111111-1111-1111-1111-111111111111', name: 'Owner Local', kind: 'super_admin', role_label: 'Owner', phone_e164: '+919999999999', must_change_pin: false, is_active: true };
const dir = path.join(__dirname, 'certs');
const srv = http2.createSecureServer({ key: fs.readFileSync(dir + '/k.pem'), cert: fs.readFileSync(dir + '/c.pem'), allowHTTP1: true });
srv.on('request', (q, r) => {
  let raw = ''; q.on('data', c => raw += c);
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'Content-Range' };
  if (q.method === 'OPTIONS') { r.writeHead(204, cors); return r.end(); }
  const start = Date.now() - t0; const u = new URL(q.url, 'https://x'); const p = u.pathname;
  q.on('end', () => setTimeout(() => {
    let body = [];
    if (p.endsWith('/app_users')) body = [user];
    else if (p.startsWith('/auth/v1/token')) { const exp = Math.floor(Date.now()/1000)+3600; body = { access_token: `${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:'auth-1',role:'authenticated',exp})}.sig`, refresh_token:'r2', token_type:'bearer', expires_in:3600, expires_at:exp, user:{id:'auth-1',aud:'authenticated',role:'authenticated'} }; }
    else if (p.startsWith('/auth/v1/user')) body = { id:'auth-1', aud:'authenticated', role:'authenticated' };
    else if (p.startsWith('/rest/v1/rpc/')) body = (q.method==='POST' && /metrics|week_day|course_message/.test(p)) ? [] : null;
    fs.appendFileSync(LOG, `${start}\t${Date.now()-t0}\t${q.method}\t${q.url}${raw ? ' ' + raw.slice(0,60) : ''}\n`);
    r.writeHead(200, { ...cors, 'content-type': 'application/json', 'content-range': '0-0/0' });
    r.end(JSON.stringify(body));
  }, DELAY));
});
srv.listen(54322, () => console.log('standin on 54322'));
