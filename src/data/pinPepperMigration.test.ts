import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

// The PIN / recovery-answer pepper migration, end to end in one process (0091,
// docs/security/PIN_PEPPER_MIGRATION.md): MUMBAI's real auth-login and recovery-check call
// SINGAPORE's real pin-verify over the real signed protocol. Each project has its OWN pepper and
// its OWN fake database; the fake Supabase Auth compares stored "passwords" exactly as GoTrue
// compares the derived secret. Nothing here is a copy of the code under test.

const OLD_PEPPER = 'old-singapore-pepper-that-nobody-can-read-anymore';
const NEW_PEPPER = 'new-mumbai-pepper-generated-for-the-move-0123456789';
const VERIFY_KEY = 'pin-verify-request-key-shared-only-by-the-two-servers-9f8e7d';
const PIN = '7391';
const WRONG = '1111';
const ANSWERS = ['Velvet Harbour', 'Copper Lantern'];

const SG_URL = 'https://lhpzhkzbnquwjljmbylo.supabase.co';
const MB_URL = 'https://lbyqipunsbzkcvdrxach.supabase.co';
const ENV = {
  SG: { SUPABASE_URL: SG_URL, SUPABASE_SERVICE_ROLE_KEY: 'sg-service', PIN_PEPPER: OLD_PEPPER, PIN_VERIFY_KEY: VERIFY_KEY } as Record<string, string | undefined>,
  MB: { SUPABASE_URL: MB_URL, SUPABASE_SERVICE_ROLE_KEY: 'mb-service', PIN_PEPPER: NEW_PEPPER, PIN_VERIFY_KEY: VERIFY_KEY } as Record<string, string | undefined>,
};
type Proj = 'SG' | 'MB';

// ---------------------------------------------------------------- stand-ins for Deno + supabase-js
const g = globalThis as unknown as Record<string, unknown>;
const STUB = '\0supabase-js-stand-in-pinmig';
const M = Module as unknown as { _resolveFilename: (r: string, ...rest: unknown[]) => string; _cache: Record<string, unknown> };
const resolve0 = M._resolveFilename;
M._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  return request.startsWith('npm:@supabase/supabase-js') ? STUB : resolve0.call(this, request, ...rest);
};
M._cache[STUB] = { id: STUB, filename: STUB, loaded: true,
  exports: { createClient: () => g.__pinmigDb, SupabaseClient: class {} } };

let current: Proj = 'MB';
type Handler = (req: Request) => Promise<Response>;
const handlers: Record<string, Handler> = {};
let loading = '';
g.Deno = { env: { get: (k: string) => ENV[current][k] }, serve: (h: Handler) => { handlers[loading] = h; } };

const logs: string[] = [];
for (const k of ['log', 'error', 'warn', 'info'] as const) {
  const orig = console[k];
  console[k] = (...a: unknown[]) => { logs.push(a.map(String).join(' ')); void orig; };
}

// ---------------------------------------------------------------- a fake project (tables + auth)
type Row = Record<string, unknown>;
function project(name: Proj) {
  const tables: Record<string, Row[]> = { app_users: [], super_admin_recovery: [], auth_rate_limits: [], app_settings: [{ id: 1, bootstrap_completed: true }] };
  const audit: { fn: string; args: Row }[] = [];
  const passwords = new Map<string, string>();      // email -> stored credential (stands in for the bcrypt hash)
  const authEmail = new Map<string, string>();      // auth user id -> email
  const sessions = new Set<string>();
  const signedOut: string[] = [];
  let n = 0;

  const from = (table: string) => {
    const filters: Array<(r: Row) => boolean> = [];
    let op: 'select' | 'update' | 'delete' = 'select';
    let patch: Row = {};
    const rows = () => (tables[table] ??= []).filter((r) => filters.every((f) => f(r)));
    const api: Record<string, unknown> = {
      select: () => api,
      eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return api; },
      is: (c: string, v: unknown) => { filters.push((r) => (r[c] ?? null) === v); return api; },
      in: (c: string, v: unknown[]) => { filters.push((r) => v.includes(r[c])); return api; },
      order: () => api,
      update: (p: Row) => { op = 'update'; patch = p; return api; },
      delete: () => { op = 'delete'; return api; },
      insert: (r: Row) => { (tables[table] ??= []).push({ ...r }); return { select: () => ({ single: async () => ({ data: r, error: null }) }), then: (ok: (v: unknown) => void) => ok({ error: null }) }; },
      upsert: (r: Row) => { const t = (tables[table] ??= []); const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = { ...t[i], ...r }; else t.push({ ...r }); return Promise.resolve({ error: null }); },
      maybeSingle: async () => ({ data: rows()[0] ? { ...rows()[0] } : null, error: null }),
      single: async () => ({ data: rows()[0] ? { ...rows()[0] } : null, error: null }),
      then: (ok: (v: unknown) => void) => {
        if (op === 'update') { for (const r of rows()) Object.assign(r, patch); return ok({ data: null, error: null }); }
        if (op === 'delete') { tables[table] = tables[table].filter((r) => !filters.every((f) => f(r))); return ok({ data: null, error: null }); }
        return ok({ data: rows().map((r) => ({ ...r })), error: null });
      },
    };
    return api;
  };
  const db = {
    from,
    rpc: async (fn: string, args: Row) => { audit.push({ fn, args }); return { data: null, error: null }; },
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        if (passwords.get(email) !== password) return { data: { session: null }, error: { message: 'Invalid login credentials' } };
        const s = { access_token: `${name.toLowerCase()}-access-${++n}`, refresh_token: `${name.toLowerCase()}-refresh-${n}` };
        sessions.add(s.access_token);
        return { data: { session: s }, error: null };
      },
      admin: {
        signOut: async (jwt: string) => { sessions.delete(jwt); signedOut.push(jwt); return { data: null, error: null }; },
        updateUserById: async (id: string, { password }: { password: string }) => { passwords.set(authEmail.get(id)!, password); return { data: {}, error: null }; },
        createUser: async ({ email, password }: { email: string; password: string }) => {
          const id = `auth-${++n}`; authEmail.set(id, email); passwords.set(email, password); return { data: { user: { id } }, error: null };
        },
      },
    },
  };
  return { db, tables, audit, passwords, authEmail, sessions, signedOut };
}

// ---------------------------------------------------------------- the network between the two
let singapore: ReturnType<typeof project>;
let mumbai: ReturnType<typeof project>;
let mode: 'up' | 'down' | 'http500' | 'extra-field' | 'wrong-key' = 'up';
let sgCalls = 0;
g.fetch = async (url: string, init: RequestInit) => {
  if (url !== `${SG_URL}/functions/v1/pin-verify`) throw new Error(`unexpected fetch to ${url}`);
  sgCalls++;
  if (mode === 'down') throw new TypeError('fetch failed');
  if (mode === 'http500') return new Response('', { status: 500 });
  if (mode === 'extra-field') return new Response(JSON.stringify({ result: 'valid', session: 'x' }), { status: 200 });
  const was = current; const wasDb = g.__pinmigDb;
  current = 'SG'; g.__pinmigDb = singapore.db;
  if (mode === 'wrong-key') ENV.SG.PIN_VERIFY_KEY = 'a-different-key-that-mumbai-does-not-hold-00000';
  try { return await handlers['pin-verify'](new Request(url, init)); }
  finally { current = was; g.__pinmigDb = wasDb; ENV.SG.PIN_VERIFY_KEY = VERIFY_KEY; }
};

const loaded = (async () => {
  for (const name of ['auth-login', 'recovery-check', 'pin-verify']) {
    loading = name;
    await import(`../../supabase/functions/${name}/index.ts`);
  }
})();
// Deno-side modules are imported through a variable, as unsubscribeHandler.test.ts does, so the
// Node type check does not try to resolve their Deno globals and `npm:` specifiers.
type PinModule = {
  hmacHex: (key: string, message: string) => Promise<string>;
  normalizeAnswer: (raw: string) => string;
  verifyRecoveryToken: (token: string) => Promise<string>;
};
type IdentityModule = {
  rotatePin: (admin: unknown, appUserId: string, authUserId: string | null, pin: string) => Promise<string>;
  createAuthIdentity: (admin: unknown, appUserId: string, pin: string) => Promise<string>;
};
const PIN_TS = '../../supabase/functions/_shared/pin.ts';
const IDENTITY_TS = '../../supabase/functions/_shared/identity.ts';
const pinTs = import(PIN_TS) as Promise<PinModule>;

const STAFF = '11111111-2222-4333-8444-555555555555';
const ADMIN = '99999999-8888-4777-8666-555555555555';
const email = (id: string) => `u-${id}@auth.rosifit.internal`;

/** Both projects exactly as the restore leaves them: Mumbai is a clone, so every credential and
 *  answer in it is still secured under Singapore's OLD pepper, and every version reads 0. */
async function world(over: Partial<Row> = {}, sgOver: Partial<Row> = {}) {
  await loaded;
  const { hmacHex, normalizeAnswer } = await pinTs;
  singapore = project('SG'); mumbai = project('MB'); mode = 'up'; sgCalls = 0; logs.length = 0;
  for (const p of [singapore, mumbai]) {
    for (const [id, kind, phone] of [[STAFF, 'staff', '+919876543210'], [ADMIN, 'super_admin', '+919800000001']] as const) {
      const authId = `auth-${id.slice(0, 4)}`;
      p.authEmail.set(authId, email(id));
      p.passwords.set(email(id), await hmacHex(OLD_PEPPER, `pin:${id}:${PIN}`));
      p.tables.app_users.push({ id, kind, phone_e164: phone, name: kind, role_label: kind, is_active: true, deleted_at: null,
        failed_attempts: 0, locked_until: null, must_change_pin: false, auth_user_id: authId, pin_pepper_version: 0,
        ...(id === STAFF ? (p === mumbai ? over : sgOver) : {}) });
    }
    ANSWERS.forEach(async (a, i) => p.tables.super_admin_recovery.push({ app_user_id: ADMIN, question_id: i + 1,
      answer_hash: await hmacHex(OLD_PEPPER, `answer:${ADMIN}:${normalizeAnswer(a)}`), pepper_version: 0 }));
  }
  await new Promise((r) => setTimeout(r, 0));
  current = 'MB'; g.__pinmigDb = mumbai.db;
}

const staffRow = () => mumbai.tables.app_users.find((r) => r.id === STAFF)!;
async function login(pin: string, phone = '9876543210') {
  current = 'MB'; g.__pinmigDb = mumbai.db;
  const res = await handlers['auth-login'](new Request(`${MB_URL}/functions/v1/auth-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, pin }) }));
  return { status: res.status, text: await res.text() };
}
async function recover(answers: string[]) {
  current = 'MB'; g.__pinmigDb = mumbai.db;
  const res = await handlers['recovery-check'](new Request(`${MB_URL}/functions/v1/recovery-check`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify', phone: '9800000001', answers: answers.map((a, i) => ({ question_id: i + 1, answer: a })) }) }));
  return { status: res.status, text: await res.text() };
}
const newDerived = async (id: string, pin: string) => (await pinTs).hmacHex(NEW_PEPPER, `pin:${id}:${pin}`);
const oldDerived = async (id: string, pin: string) => (await pinTs).hmacHex(OLD_PEPPER, `pin:${id}:${pin}`);

/** Nothing secret, anywhere it could leak: the response, the logs, the audit rows. */
async function assertNothingLeaked(where: string, text: string) {
  const secrets = [PIN, ...ANSWERS, OLD_PEPPER, NEW_PEPPER, VERIFY_KEY, await oldDerived(STAFF, PIN), await newDerived(STAFF, PIN), 'sg-access', 'sg-refresh'];
  const haystacks = [text, ...logs, JSON.stringify(mumbai.audit), JSON.stringify(singapore.audit)];
  for (const s of secrets) for (const h of haystacks) assert.ok(!h.includes(s), `${where}: a secret value appeared (${s.slice(0, 4)}...)`);
}

// ================================================================ A. version 0, correct PIN
test('A: a version-0 staff PIN is confirmed by Singapore once, re-secured under Mumbai, and signs in', async () => {
  await world();
  const r = await login(PIN);
  assert.equal(r.status, 200, r.text);
  assert.equal(sgCalls, 1, 'Singapore asked exactly once');
  assert.equal(staffRow().pin_pepper_version, 1, 'now current');
  assert.equal(mumbai.passwords.get(email(STAFF)), await newDerived(STAFF, PIN), 'Mumbai credential now under the NEW pepper');
  assert.equal(singapore.passwords.get(email(STAFF)), await oldDerived(STAFF, PIN), 'Singapore credential untouched');
  const body = JSON.parse(r.text);
  assert.match(body.session.access_token, /^mb-access-/, 'the session is MUMBAI\'s, never Singapore\'s');
  assert.equal(singapore.sessions.size, 0, 'the verification session on Singapore was ended');
  assert.equal(singapore.signedOut.length, 1);
  assert.equal(staffRow().failed_attempts, 0);
  assert.ok(staffRow().last_login_at, 'last-login tracked as before');
  const ok = mumbai.audit.find((a) => a.args.p_action === 'auth.login_succeeded');
  assert.deepEqual(ok?.args.p_metadata, { pin_rekeyed: true });
  assert.equal(singapore.audit.length, 0, 'the verifier writes no audit rows on Singapore');
  assert.equal(singapore.tables.app_users.find((x) => x.id === STAFF)!.failed_attempts, 0, 'and no counters');
  await assertNothingLeaked('A', r.text);

  const again = await login(PIN);
  assert.equal(again.status, 200);
  assert.equal(sgCalls, 1, 'C-style: once current, Singapore is never asked again');
});

// ================================================================ B. version 0, wrong PIN
test('B: a wrong PIN on a version-0 account fails, is counted, and migrates nothing', async () => {
  await world();
  const r = await login(WRONG);
  assert.equal(r.status, 401);
  assert.equal(sgCalls, 1);
  assert.equal(staffRow().pin_pepper_version, 0);
  assert.equal(staffRow().failed_attempts, 1, 'counted exactly as a wrong PIN always was');
  assert.equal(mumbai.passwords.get(email(STAFF)), await oldDerived(STAFF, PIN), 'credential unchanged');
  assert.ok(mumbai.audit.some((a) => a.args.p_action === 'auth.login_failed'));
  await assertNothingLeaked('B', r.text);
});

// ================================================================ C / D. version 1
test('C: a version-1 account is checked locally and Singapore is never contacted', async () => {
  await world({ pin_pepper_version: 1 });
  mumbai.passwords.set(email(STAFF), await newDerived(STAFF, PIN));
  const r = await login(PIN);
  assert.equal(r.status, 200, r.text);
  assert.equal(sgCalls, 0);
});

test('D: wrong PINs on a version-1 account lock it after five, as before, without asking Singapore', async () => {
  await world({ pin_pepper_version: 1 });
  mumbai.passwords.set(email(STAFF), await newDerived(STAFF, PIN));
  const statuses: number[] = [];
  for (let i = 0; i < 5; i++) statuses.push((await login(WRONG)).status);
  assert.deepEqual(statuses, [401, 401, 401, 401, 423]);
  assert.ok(staffRow().locked_until, 'locked');
  assert.equal((await login(PIN)).status, 423, 'the right PIN is refused while locked');
  assert.equal(sgCalls, 0);
});

// ================================================================ I. protections first
test('I: a locked or disabled Mumbai account never reaches Singapore, even with the right PIN', async () => {
  await world({ locked_until: new Date(Date.now() + 600_000).toISOString() });
  assert.equal((await login(PIN)).status, 423);
  await world({ is_active: false });
  assert.equal((await login(PIN)).status, 403);
  assert.equal(sgCalls, 0);
  assert.equal(staffRow().pin_pepper_version, 0);
});

test('I: Singapore\'s own lock or disable is respected -- refused, nothing migrated', async () => {
  await world({}, { locked_until: new Date(Date.now() + 600_000).toISOString() });
  let r = await login(PIN);
  assert.equal(r.status, 423);
  assert.equal(staffRow().pin_pepper_version, 0);
  await world({}, { is_active: false });
  r = await login(PIN);
  assert.equal(r.status, 403);
  assert.equal(staffRow().pin_pepper_version, 0);
  assert.equal(mumbai.passwords.get(email(STAFF)), await oldDerived(STAFF, PIN));
});

// ================================================================ J / K. Singapore down or refusing
for (const m of ['down', 'http500', 'extra-field', 'wrong-key'] as const) {
  test(`J/K: Singapore ${m} -> sign-in fails closed (503), nothing migrated, nothing counted`, async () => {
    await world(); mode = m;
    const r = await login(PIN);
    assert.equal(r.status, 503, r.text);
    assert.equal(staffRow().pin_pepper_version, 0);
    assert.equal(staffRow().failed_attempts, 0, 'not the person\'s fault, not counted');
    assert.equal(mumbai.passwords.get(email(STAFF)), await oldDerived(STAFF, PIN), 'credential unchanged');
    await assertNothingLeaked(`J/K ${m}`, r.text);
  });
}

test('J: Mumbai without PIN_VERIFY_KEY never calls out and fails closed', async () => {
  await world();
  const saved = ENV.MB.PIN_VERIFY_KEY; ENV.MB.PIN_VERIFY_KEY = undefined;
  try {
    const r = await login(PIN);
    assert.equal(r.status, 503);
    assert.equal(sgCalls, 0);
    assert.equal(staffRow().pin_pepper_version, 0);
  } finally { ENV.MB.PIN_VERIFY_KEY = saved; }
});

// ================================================================ G / H. recovery answers
test('G: version-0 recovery answers are confirmed by Singapore once and re-hashed under Mumbai', async () => {
  await world();
  const { hmacHex, normalizeAnswer, verifyRecoveryToken } = await pinTs;
  const r = await recover(ANSWERS);
  assert.equal(r.status, 200, r.text);
  assert.equal(sgCalls, 1);
  for (const [i, a] of ANSWERS.entries()) {
    const row = mumbai.tables.super_admin_recovery.find((x) => x.question_id === i + 1)!;
    assert.equal(row.pepper_version, 1);
    assert.equal(row.answer_hash, await hmacHex(NEW_PEPPER, `answer:${ADMIN}:${normalizeAnswer(a)}`));
  }
  const token = JSON.parse(r.text).recovery_token;
  assert.equal(await verifyRecoveryToken(token), ADMIN, 'the recovery token is Mumbai\'s own, under the new pepper');
  assert.equal(singapore.audit.length, 0, 'Singapore wrote nothing');
  await assertNothingLeaked('G', r.text);
  assert.equal((await recover(ANSWERS)).status, 200);
  assert.equal(sgCalls, 1, 'H: re-hashed answers are checked locally from then on');
});

test('G: a wrong recovery answer is refused, counted by Mumbai\'s rate limit, and nothing is re-hashed', async () => {
  await world();
  const r = await recover([ANSWERS[0], 'not the answer']);
  assert.equal(r.status, 401);
  assert.ok(mumbai.tables.super_admin_recovery.every((x) => x.pepper_version === 0));
  assert.equal(mumbai.tables.auth_rate_limits.length, 1, 'counted');
  await assertNothingLeaked('G-wrong', r.text);
});

test('G: Singapore unreachable during recovery -> 503, not counted, nothing re-hashed', async () => {
  await world(); mode = 'down';
  const r = await recover(ANSWERS);
  assert.equal(r.status, 503);
  assert.equal(mumbai.tables.auth_rate_limits.length, 0);
  assert.ok(mumbai.tables.super_admin_recovery.every((x) => x.pepper_version === 0));
});

// ================================================================ E / F. every PIN Mumbai sets is current
test('E/F: rotatePin and createAuthIdentity (pin-issue, pin-reset, recovery apply, bootstrap) mark version 1', async () => {
  await world();
  const { rotatePin, createAuthIdentity } = await (import(IDENTITY_TS) as Promise<IdentityModule>);
  current = 'MB';
  await rotatePin(mumbai.db, STAFF, staffRow().auth_user_id as string, '4826');
  assert.equal(staffRow().pin_pepper_version, 1);
  assert.equal(mumbai.passwords.get(email(STAFF)), await newDerived(STAFF, '4826'), 'set directly under the new pepper');
  staffRow().pin_pepper_version = 0; staffRow().auth_user_id = null;
  await createAuthIdentity(mumbai.db, STAFF, '5937');
  assert.equal(staffRow().pin_pepper_version, 1);
  assert.equal(sgCalls, 0, 'issuing or resetting a PIN never involves Singapore');
});

test('E/F: no function sets a credential except through rotatePin / createAuthIdentity', () => {
  const dir = path.join(process.cwd(), 'supabase/functions');
  for (const fn of fs.readdirSync(dir)) {
    const f = path.join(dir, fn, 'index.ts');
    if (!fs.existsSync(f)) continue;
    assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /updateUserById|admin\.createUser/, `${fn} sets a credential directly`);
  }
  const boot = fs.readFileSync(path.join(dir, 'auth-bootstrap/index.ts'), 'utf8');
  assert.match(boot, /pepper_version: CURRENT_PIN_PEPPER_VERSION/, 'bootstrap stores new recovery answers as current');
});

// ================================================================ the verifier itself
async function callVerifier(body: string, sig: string | null, method = 'POST') {
  current = 'SG'; g.__pinmigDb = singapore.db;
  try {
    const res = await handlers['pin-verify'](new Request(`${SG_URL}/functions/v1/pin-verify`, {
      method, headers: sig ? { 'x-rosifit-signature': sig } : {}, body: method === 'POST' ? body : undefined }));
    return { status: res.status, text: await res.text() };
  } finally { current = 'MB'; g.__pinmigDb = mumbai.db; }
}

test('pin-verify: unsigned, forged, stale or replayed requests get 401 and no body', async () => {
  await world();
  const { buildSignedRequest, signBody } = await import('../../supabase/functions/_shared/pinVerifyProtocol.ts');
  const good = await buildSignedRequest(VERIFY_KEY, { kind: 'pin', app_user_id: STAFF, pin: PIN });
  assert.deepEqual(await callVerifier(good.body, null), { status: 401, text: '' });
  assert.deepEqual(await callVerifier(good.body, 'f'.repeat(64)), { status: 401, text: '' });
  assert.deepEqual(await callVerifier(good.body.replace(PIN, '0000'), good.signature), { status: 401, text: '' }, 'tampered body');
  const stale = await buildSignedRequest(VERIFY_KEY, { kind: 'pin', app_user_id: STAFF, pin: PIN }, Date.now() - 120_000);
  assert.deepEqual(await callVerifier(stale.body, stale.signature), { status: 401, text: '' });
  const forged = await buildSignedRequest('someone-elses-key-of-sufficient-length-1234', { kind: 'pin', app_user_id: STAFF, pin: PIN });
  assert.deepEqual(await callVerifier(forged.body, forged.signature), { status: 401, text: '' });
  assert.equal((await callVerifier(good.body, good.signature)).status, 200, 'the genuine request');
  assert.deepEqual(await callVerifier(good.body, good.signature), { status: 401, text: '' }, 'the same request again is a replay');
  assert.equal((await callVerifier('', null, 'GET')).status, 405);
  void signBody;
});

test('pin-verify: the answer is one word -- never a session, token, hash or derived value', async () => {
  await world();
  const { buildSignedRequest } = await import('../../supabase/functions/_shared/pinVerifyProtocol.ts');
  for (const [pin, want] of [[PIN, 'valid'], [WRONG, 'invalid']] as const) {
    const q = await buildSignedRequest(VERIFY_KEY, { kind: 'pin', app_user_id: STAFF, pin });
    const r = await callVerifier(q.body, q.signature);
    assert.deepEqual(JSON.parse(r.text), { result: want });
  }
  const unknown = await buildSignedRequest(VERIFY_KEY, { kind: 'pin', app_user_id: '00000000-0000-4000-8000-000000000000', pin: PIN });
  assert.deepEqual(JSON.parse((await callVerifier(unknown.body, unknown.signature)).text), { result: 'not_found' });
  assert.equal(singapore.sessions.size, 0, 'every verification session ended');
  assert.equal(singapore.audit.length, 0);
});

test('pin-verify: refuses to run anywhere but Singapore, and without a key', async () => {
  await world();
  const { buildSignedRequest } = await import('../../supabase/functions/_shared/pinVerifyProtocol.ts');
  const q = await buildSignedRequest(VERIFY_KEY, { kind: 'pin', app_user_id: STAFF, pin: PIN });
  ENV.SG.SUPABASE_URL = MB_URL;
  try { assert.deepEqual(await callVerifier(q.body, q.signature), { status: 404, text: '' }); }
  finally { ENV.SG.SUPABASE_URL = SG_URL; }
  ENV.SG.PIN_VERIFY_KEY = undefined;
  try { assert.equal((await callVerifier(q.body, q.signature)).status, 503); }
  finally { ENV.SG.PIN_VERIFY_KEY = VERIFY_KEY; }
});

// ================================================================ L. secrets in source
test('L: no changed file logs or returns the PIN, an answer, the key or a request body', () => {
  const files = ['auth-login/index.ts', 'recovery-check/index.ts', 'pin-verify/index.ts', '_shared/pinVerifyClient.ts', '_shared/pinVerifyProtocol.ts'];
  // A log line may carry fixed text and nothing but these values: an error's NAME, an HTTP status.
  const ALLOWED = new Set(["err instanceof Error ? err.name : 'error'", 'res.status']);
  for (const f of files) {
    const src = fs.readFileSync(path.join(process.cwd(), 'supabase/functions', f), 'utf8');
    for (const call of src.match(/console\.(log|error|warn|info)\([\s\S]*?\);/g) ?? []) {
      const arg = call.replace(/^console\.\w+\(/, '').replace(/\);$/, '').trim();
      assert.match(arg, /^(['`])[\s\S]*\1$/, `${f}: a log takes one literal, nothing else: ${call}`);
      for (const [, expr] of arg.matchAll(/\$\{([^}]*)\}/g)) {
        assert.ok(ALLOWED.has(expr.trim()), `${f}: a log interpolates "${expr}"`);
      }
    }
  }
  const verifier = fs.readFileSync(path.join(process.cwd(), 'supabase/functions/pin-verify/index.ts'), 'utf8');
  assert.doesNotMatch(verifier, /JSON\.stringify\(\{[^}]*(session|token|hash|password)/, 'the verifier never serialises a credential');
});
