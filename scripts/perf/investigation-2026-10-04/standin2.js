// Data-rich stand-in: N members with emails/aliases/stats/enrollments, 4 courses, a month of sessions and attendance.
// Implements the PostgREST filter subset the app uses (eq/gt/gte/lte/in/is.null, order, limit, maybeSingle).
const http2 = require('http2'), fs = require('fs'), path = require('path');
const N = +process.env.MEMBERS || 1644, DELAY = +process.env.DELAY || 130, LOG = process.env.LOG || path.join(__dirname, 'h2b.log');
fs.writeFileSync(LOG, ''); const t0 = Date.now();
const uuid = (p, i) => `${p}0000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const iso = d => d.toISOString().slice(0, 10);
const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
const branches = [0, 1].map(i => ({ id: uuid('b', i), name: ['Anna Nagar', 'Velachery'][i], code: 'B' + i, deleted_at: null }));
const courses = [0, 1, 2, 3].map(i => ({ id: uuid('c', i), name: ['Zumba', 'Yoga', 'Pilates', 'Aerobics'][i], default_start_time: '06:00', default_end_time: '07:00', default_frequency: 3, deleted_at: null }));
const offerings = courses.map((c, i) => ({ id: uuid('d', i), course_id: c.id, branch_id: branches[i % 2].id, batch_label: null, meet_code: null, deleted_at: null }));
const offering_schedules = offerings.map((o, i) => ({ id: uuid('e', i), offering_id: o.id, weekdays: [1, 3, 5], effective_from: '2025-09-01', effective_to: null }));
const first = ['Priya', 'Anita', 'Kavya', 'Divya', 'Meena', 'Lakshmi', 'Sneha', 'Pooja', 'Riya', 'Deepa', 'Nithya', 'Shreya'], last = ['Sharma', 'Iyer', 'Nair', 'Reddy', 'Menon', 'Pillai', 'Rao', 'Krishnan', 'Das', 'Verma'];
const members = [], member_emails = [], member_aliases = [], member_stats = [], member_enrollments = [];
for (let i = 0; i < N; i++) {
  const id = uuid('a', i), name = `${first[i % 12]} ${last[(i * 7) % 10]} ${i}`;
  const status = i % 25 === 0 ? 'inactive' : 'active';
  members.push({ id, member_code: 'RF' + String(1000 + i), full_name: name, status, inactive_from: status === 'inactive' ? '2026-09-01' : null, active_again_from: null, joined_on: '2026-01-15', deleted_at: null });
  if (i % 5 !== 4) member_emails.push({ id: uuid('f', i), member_id: id, email: `member${i}@example.com`, is_primary: true, status: i % 40 === 0 ? 'bounced' : 'valid', deleted_at: null });
  if (i % 5 !== 2) member_aliases.push({ id: uuid('9', i), member_id: id, alias_display: name.split(' ')[0] + ' ' + i, alias_type: 'name', alias_normalized: name.toLowerCase() });
  member_stats.push({ member_id: id, current_streak: i % 7, last_present_date: iso(new Date(today - (i % 10) * 86400000)), last_emailed_at: null, sessions_expected: 40, sessions_attended: 30 });
  member_enrollments.push({ id: uuid('8', i), member_id: id, offering_id: offerings[i % 4].id, status: 'active', effective_from: '2026-01-15', effective_to: null });
}
const sessions = [], attendance_records = []; let sid = 0, aid = 0;
for (let d = 0; d < 42; d++) { const day = new Date(today - d * 86400000); const dow = (day.getUTCDay() + 6) % 7 + 1; if (![1, 3, 5].includes(dow)) continue;
  for (const o of offerings) { const s = { id: uuid('5', sid++), offering_id: o.id, session_date: iso(day), start_time: '06:00', status: 'completed', expected_count: 0, present_count: 0, absent_count: 0, extra_present_count: 0, deleted_at: null, holiday_id: null, cancellation_reason: null }; sessions.push(s);
    for (const e of member_enrollments) if (e.offering_id === o.id) { const present = (aid + d) % 3 !== 0; attendance_records.push({ id: uuid('4', aid++), session_id: s.id, member_id: e.member_id, status: present ? 'present' : 'absent', expected: true, minutes_in_call: present ? 45 : null, deleted_at: null }); s.expected_count++; present ? s.present_count++ : s.absent_count++; } } }
const tables = { branches, courses, course_offerings: offerings, offering_schedules, members, member_emails, member_aliases, member_stats, member_enrollments, member_schedules: [], sessions, attendance_records,
  follow_up_config: [{ id: 1, weekly_enabled: true, weekly_threshold: 2, consecutive_enabled: true, consecutive_threshold: 3, is_active: true }],
  course_follow_up_config: courses.map(c => ({ course_id: c.id, weekly_enabled: true, weekly_threshold: 2, consecutive_enabled: true, consecutive_threshold: 3, is_active: true })),
  email_batches: [], email_messages: [], pin_reset_requests: [], holidays: [], email_templates: [], audit_logs: [], audit_remarks: [], user_preferences: [], csv_imports: [],
  app_settings: [{ id: 1, academy_name: 'RosiFit Local' }], app_subscription: [{ id: 1 }],
  app_users: [{ id: '11111111-1111-1111-1111-111111111111', name: 'Owner Local', kind: 'super_admin', role_label: 'Owner', phone_e164: '+919999999999', must_change_pin: false, is_active: true, auth_user_id: 'auth-1', deleted_at: null }] };
function filter(rows, params) {
  let out = rows; const keyOf = r => r.id ?? r.member_id ?? r.course_id ?? r.offering_id;
  for (const [k, v] of params) { if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    const m = /^(eq|neq|gt|gte|lt|lte|in|is|like)\.(.*)$/s.exec(v); if (!m) continue; const [, op, raw] = m; const col = k.includes('->>') ? null : k;
    out = out.filter(r => { const x = col ? r[col] : null;
      switch (op) { case 'eq': return String(x) === raw; case 'neq': return String(x) !== raw; case 'gt': return String(x) > raw; case 'gte': return String(x) >= raw; case 'lt': return String(x) < raw; case 'lte': return String(x) <= raw;
        case 'in': return raw.slice(1, -1).split(',').map(s => s.replace(/^"|"$/g, '')).includes(String(x)); case 'is': return raw === 'null' ? x == null : raw === 'true' ? x === true : x === false; default: return true; } }); }
  const order = params.get('order'); if (order) { const [col, dir] = order.split('.'); out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === 'desc' ? -1 : 1)); } else out = [...out].sort((a, b) => keyOf(a) > keyOf(b) ? 1 : -1);
  const off = +params.get('offset') || 0, lim = +params.get('limit') || out.length; return out.slice(off, off + lim);
}
function metricsPage(b) { const from = b.p_from, to = b.p_to, after = b.p_after_member_id, lim = b.p_limit || 1000; const agg = new Map();
  const sids = new Set(sessions.filter(s => s.session_date >= from && s.session_date <= to).map(s => s.id));
  for (const a of attendance_records) if (sids.has(a.session_id)) { const g = agg.get(a.member_id) || { member_id: a.member_id, expected: 0, attended: 0, missed: 0, extra: 0 }; g.expected++; a.status === 'present' ? g.attended++ : g.missed++; agg.set(a.member_id, g); }
  return [...agg.values()].filter(g => !after || g.member_id > after).sort((x, y) => x.member_id > y.member_id ? 1 : -1).slice(0, lim).map(g => ({ ...g, attendance_pct: g.expected ? +(100 * g.attended / g.expected).toFixed(1) : null })); }
function weekDays(b) { const out = []; const d0 = new Date(b.p_week_start + 'T00:00:00Z'); for (let i = 0; i < 7; i++) { const day = iso(new Date(+d0 + i * 86400000)); const ss = sessions.filter(s => s.session_date === day && offerings.find(o => o.id === s.offering_id)?.course_id === b.p_course_id); out.push({ day, uploaded: ss.length > 0, present_count: ss.reduce((a, s) => a + s.present_count, 0), absent_count: ss.reduce((a, s) => a + s.absent_count, 0), expected_count: ss.reduce((a, s) => a + s.expected_count, 0), runs: ss.length > 0 }); } return out; }
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const dir = path.join(__dirname, 'certs');
const srv = http2.createSecureServer({ key: fs.readFileSync(dir + '/k.pem'), cert: fs.readFileSync(dir + '/c.pem'), allowHTTP1: true });
srv.on('request', (q, r) => { let raw = ''; q.on('data', c => raw += c);
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'Content-Range' };
  if (q.method === 'OPTIONS') { r.writeHead(204, cors); return r.end(); }
  const start = Date.now() - t0; const u = new URL(q.url, 'https://x'); const p = u.pathname;
  q.on('end', () => setTimeout(() => { let body = []; let status = 200;
    try {
      if (p.startsWith('/auth/v1/token')) { const exp = Math.floor(Date.now() / 1000) + 3600; body = { access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'auth-1', role: 'authenticated', exp })}.sig`, refresh_token: 'r2', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: { id: 'auth-1', aud: 'authenticated', role: 'authenticated' } }; }
      else if (p.startsWith('/auth/v1/user')) body = { id: 'auth-1', aud: 'authenticated', role: 'authenticated' };
      else if (p.startsWith('/rest/v1/rpc/')) { const name = p.split('/').pop(); const b = raw ? JSON.parse(raw) : {};
        body = name === 'member_period_metrics_page' ? metricsPage(b) : name === 'course_week_day_status' ? weekDays(b) : name === 'effective_course_message' ? [] : null; }
      else if (p.startsWith('/rest/v1/')) { const t = p.replace('/rest/v1/', ''); const rows = tables[t]; if (!rows) { status = 404; body = { message: 'no table ' + t }; }
        else { body = filter(rows, u.searchParams); if ((q.headers.accept || '').includes('object')) body = body[0] ?? null; } }
    } catch (e) { status = 500; body = { message: String(e) }; }
    const txt = JSON.stringify(body); fs.appendFileSync(LOG, `${start}\t${Date.now() - t0}\t${q.method}\t${q.url}\t${txt.length}${raw ? ' ' + raw.slice(0, 60) : ''}\n`);
    r.writeHead(status, { ...cors, 'content-type': 'application/json', 'content-range': `0-${Array.isArray(body) ? body.length : 0}/*` }); r.end(txt); }, DELAY)); });
srv.listen(54322, () => console.log(`standin2 on 54322: ${N} members, ${sessions.length} sessions, ${attendance_records.length} attendance rows, course ${courses[0].id}`));
