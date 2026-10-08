import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { signUnsubscribeId, unsubscribeTokenValid } from '../../supabase/functions/_shared/unsubscribe-token.ts';
import { forwardResigned, resignQuery, MUMBAI_UNSUBSCRIBE } from '../../supabase/forwarders/unsubscribe/forward.ts';

/**
 * The forwarder re-signs (requests/2026-10-08-unsubscribe-forwarder-resigns.md).
 *
 * Mumbai's `unsubscribe` checks links under Mumbai's own UNSUBSCRIBE_SECRET, which is not
 * Singapore's. Every email sent before cutover carries a link signed with Singapore's. So the
 * forwarder Singapore runs after cutover checks the pair under Singapore's key and, only when it
 * holds, signs the SAME member_emails id under Mumbai's key (UNSUBSCRIBE_SECRET_NEXT on
 * Singapore) and redirects with that token in place of the old one.
 *
 * End to end inside one process: the DEPLOYED Singapore entry file
 * (supabase/forwarders/unsubscribe/index.ts) with Singapore's two keys, and Mumbai's DEPLOYED
 * `unsubscribe` (supabase/functions/unsubscribe/index.ts) with Mumbai's one, each given a
 * stand-in `Deno` (env + serve). Mumbai gets a fake database; the forwarder gets none, and any
 * attempt to build a client, fetch anything or print anything is recorded.
 */

const SG_KEY = 'singapore-unsubscribe-key-for-this-spec-0001';
const MB_KEY = 'mumbai-unsubscribe-key-for-this-spec-000002';
const SG = 'https://lhpzhkzbnquwjljmbylo.supabase.co';
const MB = 'https://lbyqipunsbzkcvdrxach.supabase.co';
const SG_FN = `${SG}/functions/v1/unsubscribe`;
const ORIGIN = 'https://rosi-fit.vercel.app';
const KEYS = { singapore: SG_KEY, mumbai: MB_KEY };

// ------------------------------------------------------------- what the process records
const logged: string[] = [];
for (const level of ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    logged.push(args.map(a => (a instanceof Error ? `${a.message}\n${a.stack}` : typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    if (level === 'error' || level === 'warn') original(...args);
  };
}
const fetched: string[] = [];
globalThis.fetch = (async (input: unknown) => {
  fetched.push(String(input));
  throw new Error('no network in this spec');
}) as typeof fetch;
let clientsBuilt = 0;

// supabase-js is an `npm:` specifier Node cannot load; the client it would build is the fake
// below. The spec runs as CommonJS under tsx, so the stand-in goes in at require() resolution.
const STUB = '\0supabase-js-stand-in-resign';
const M = Module as unknown as {
  _resolveFilename: (request: string, ...rest: unknown[]) => string;
  _cache: Record<string, unknown>;
};
const resolveFilename = M._resolveFilename;
M._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  return request.startsWith('npm:@supabase/supabase-js') ? STUB : resolveFilename.call(this, request, ...rest);
};
const g = globalThis as unknown as Record<string, unknown>;
M._cache[STUB] = {
  id: STUB, filename: STUB, loaded: true,
  exports: { createClient: () => { clientsBuilt++; return g.__resignFakeDb; }, SupabaseClient: class {} },
};

type Handler = (req: Request) => Promise<Response>;
let env: Record<string, string> = {};
let served: Handler | null = null;
g.Deno = { env: { get: (k: string) => env[k] }, serve: (h: Handler) => { served = h; } };

// Each project reads its keys when its module loads, so each is loaded under its own env.
const loaded = (async () => {
  env = { UNSUBSCRIBE_SECRET: SG_KEY, UNSUBSCRIBE_SECRET_NEXT: MB_KEY, SUPABASE_URL: SG };
  const forwarderEntry = '../../supabase/forwarders/unsubscribe/index.ts';
  await import(forwarderEntry);
  const singapore = served!;
  served = null;
  env = { UNSUBSCRIBE_SECRET: MB_KEY, SUPABASE_URL: MB, SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-for-the-fake' };
  const mumbaiEntry = '../../supabase/functions/unsubscribe/index.ts';
  await import(mumbaiEntry);
  const mumbai = served!;
  return { singapore, mumbai };
})();

// ------------------------------------------------------------- Mumbai's database, faked
type Row = { id: string; member_id: string; status: string; deleted_at: string | null };
type Audit = { action: string; metadata: Record<string, unknown> };

function fakeDb(rows: Row[]) {
  const byId = new Map(rows.map(r => [r.id, { ...r }]));
  const anon: Audit[] = [];
  const rowAudit: { id: string; old: string; new: string }[] = [];
  const copy = (r: Row | undefined) => (r ? { ...r } : null);
  const builder = (table: string) => {
    const filters: Array<(r: Row) => boolean> = [];
    let patch: Partial<Row> | null = null;
    const matching = () => [...byId.values()].filter(r => filters.every(f => f(r)));
    const api = {
      select: (_cols?: string) => api,
      update: (p: Partial<Row>) => { patch = p; return api; },
      eq: (col: string, val: unknown) => { filters.push(r => (r as Record<string, unknown>)[col] === val); return api; },
      in: (col: string, vals: unknown[]) => { filters.push(r => vals.includes((r as Record<string, unknown>)[col])); return api; },
      is: (col: string, val: null) => { filters.push(r => (r as Record<string, unknown>)[col] === val); return api; },
      single: async () => (table === 'app_settings'
        ? { data: { academy_name: 'Rosi Academy' }, error: null }
        : { data: copy(matching()[0]), error: null }),
      maybeSingle: async () => ({ data: copy(matching()[0]), error: null }),
      then: (resolve: (v: unknown) => void) => {
        if (!patch) return resolve({ data: matching().map(copy), error: null });
        const hit = matching();
        for (const r of hit) {
          if (patch.status && patch.status !== r.status) rowAudit.push({ id: r.id, old: r.status, new: patch.status });
          Object.assign(r, patch);
        }
        return resolve({ data: hit.map(r => ({ id: r.id })), error: null });
      },
    };
    return api;
  };
  const db = {
    from: (table: string) => builder(table),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'audit_log_anon') {
        anon.push({ action: args.p_action as string, metadata: args.p_metadata as Record<string, unknown> });
        return { data: anon.length, error: null };
      }
      if (fn === 'email_status_before_opt_out') {
        const last = rowAudit.filter(a => a.id === args.p_member_email_id && a.new === 'unsubscribed').pop();
        return { data: last ? last.old : null, error: null };
      }
      return { data: null, error: { message: `no such rpc ${fn}` } };
    },
  };
  return { db, byId, anon };
}

const A = '11111111-2222-3333-4444-555555555555';
const B = '99999999-8888-7777-6666-555555555555';
const row = (id: string, status = 'unknown'): Row => ({ id, member_id: `m-${id.slice(0, 4)}`, status, deleted_at: null });

/** Every token this spec ever saw, so the last test can look for each in the logs. */
const tokensSeen = new Set<string>();
const sgToken = async (id: string) => { const t = await signUnsubscribeId(id, SG_KEY); tokensSeen.add(t); return t; };
const mbToken = async (id: string) => { const t = await signUnsubscribeId(id, MB_KEY); tokensSeen.add(t); return t; };

/** A link exactly as a pre-cutover email carries it: Singapore's address, Singapore's key. */
const oldLink = async (id: string, extra = '') => `${SG_FN}?e=${encodeURIComponent(id)}&t=${await sgToken(id)}${extra}`;

/** RFC 8058 one-click, exactly as Gmail sends it. */
const oneClick = (url: string) => new Request(url, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click',
});

async function setup(rows: Row[]) {
  const { singapore, mumbai } = await loaded;
  const f = fakeDb(rows);
  // The forwarder must never reach a database: while it runs, there is none to reach.
  const sg: Handler = async (req) => {
    g.__resignFakeDb = undefined;
    const before = clientsBuilt;
    const res = await singapore(req);
    assert.equal(clientsBuilt, before, 'the forwarder built no database client');
    return res;
  };
  const mb: Handler = (req) => { g.__resignFakeDb = f.db; return mumbai(req); };
  /** What a client does with a 307/308: the same method, and for POST the same body. */
  const follow = (res: Response, original: Request, body?: string) =>
    mb(new Request(res.headers.get('Location')!, {
      method: original.method, headers: original.headers, body: original.method === 'POST' ? body : undefined,
    }));
  return { ...f, sg, mb, follow };
}

const tokenIn = (location: string) => new URL(location).searchParams.get('t');

// ===================================================================== valid old links
test('a valid old GET: 307 to Mumbai with a NEW token for the same id, every other byte unchanged', async () => {
  const { sg } = await setup([row(A)]);
  const old = await sgToken(A);
  assert.equal(await unsubscribeTokenValid(A, old, SG_KEY), true, 'the old token is one Singapore accepts');

  const res = await sg(new Request(await oldLink(A)));
  assert.equal(res.status, 307);
  const fresh = await mbToken(A);
  assert.notEqual(fresh, old, 'the two projects really do sign differently');
  assert.equal(res.headers.get('location'), `${MUMBAI_UNSUBSCRIBE}?e=${A}&t=${fresh}`);
  assert.equal(await unsubscribeTokenValid(A, tokenIn(res.headers.get('location')!)!, MB_KEY), true,
    'the new token is one Mumbai accepts');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
});

test('a valid old POST: 308 to Mumbai with a NEW token -- one-click, the press and Resubscribe alike', async () => {
  const { sg } = await setup([row(A)]);
  const fresh = await mbToken(A);
  for (const extra of ['', '&a=unsubscribe', '&a=resubscribe', '&a=unsubscribe&academy=Rosi%20Academy']) {
    const res = await sg(oneClick(await oldLink(A, extra)));
    assert.equal(res.status, 308, `POST ${extra}`);
    assert.equal(res.headers.get('location'), `${MUMBAI_UNSUBSCRIBE}?e=${A}&t=${fresh}${extra}`, `POST ${extra}`);
  }
});

test('order, encoding and the other parameters are kept; only the token segment changes', async () => {
  const old = await sgToken(A);
  const fresh = await mbToken(A);
  const cases: Array<[string, string]> = [
    [`t=${old}&e=${A}`, `t=${fresh}&e=${A}`],
    [`e=${encodeURIComponent(A)}&t=${encodeURIComponent(old)}`, `e=${A}&t=${fresh}`],
    [`e=${A}&t=${old.replace(/-/g, '%2D')}`, `e=${A}&t=${fresh}`],         // an over-encoded token still checks
    [`a=unsubscribe&e=${A}&x=1&t=${old}&y=%20`, `a=unsubscribe&e=${A}&x=1&t=${fresh}&y=%20`],
    // Mumbai reads the FIRST `e` and the FIRST `t`; so does the check, so the id checked is the id acted on.
    [`e=${A}&e=${B}&t=${old}`, `e=${A}&e=${B}&t=${fresh}`],
    [`e=${A}&t=${old}&t=junk`, `e=${A}&t=${fresh}&t=junk`],
  ];
  for (const [q, want] of cases) {
    assert.equal(await resignQuery(q, KEYS), want, q);
    const res = await forwardResigned('GET', `${SG_FN}?${q}`, KEYS);
    assert.equal(res.headers.get('location'), `${MUMBAI_UNSUBSCRIBE}?${want}`, q);
  }
});

test('the re-signed link is accepted by Mumbai end to end: GET asks, the press and one-click write', async () => {
  const { sg, follow, byId, anon } = await setup([row(A), row(B)]);
  const fresh = await mbToken(A);

  // GET: Mumbai's question page, carrying Mumbai's token and Mumbai's own address.
  const get = new Request(await oldLink(A));
  const asked = await follow(await sg(get), get);
  assert.equal(asked.status, 303);
  const page = new URL(asked.headers.get('Location')!);
  assert.equal(page.origin + page.pathname, `${ORIGIN}/unsubscribe`, 'the question, not the failure page');
  assert.equal(page.searchParams.get('e'), A);
  assert.equal(page.searchParams.get('t'), fresh, 'the page posts back the token Mumbai signed');
  assert.equal(page.searchParams.get('fn'), `${MB}/functions/v1/unsubscribe`);
  assert.equal(byId.get(A)!.status, 'unknown', 'opening the link still writes nothing');

  // The press on that page, sent to the old Singapore address (a page opened before cutover).
  const press = new Request(await oldLink(A, '&a=unsubscribe'), { method: 'POST', body: '' });
  const pressed = await follow(await sg(press), press, '');
  assert.equal(new URL(pressed.headers.get('Location')!).pathname, '/unsubscribed');
  assert.equal(byId.get(A)!.status, 'unsubscribed', 'written in MUMBAI\'s database');
  assert.deepEqual(anon.map(a => [a.action, a.metadata.via]), [['communication.unsubscribed', 'link']]);

  // Gmail's one-click on another member's old link.
  const click = oneClick(await oldLink(B));
  const clicked = await follow(await sg(click), click, 'List-Unsubscribe=One-Click');
  assert.equal(clicked.status, 200);
  assert.equal(byId.get(B)!.status, 'unsubscribed');
  assert.deepEqual(anon.map(a => a.metadata.via), ['link', 'one_click']);
});

test('without the re-sign Mumbai refuses the old link -- which is why the forwarder re-signs', async () => {
  const { mb, byId } = await setup([row(A)]);
  const direct = await mb(new Request(`${MUMBAI_UNSUBSCRIBE}?e=${A}&t=${await sgToken(A)}`));
  assert.equal(new URL(direct.headers.get('Location')!).pathname, '/unsubscribe-failed');
  assert.equal(byId.get(A)!.status, 'unknown');
});

test('a repeated valid old link keeps working: the same redirect every time, and it confirms after the opt-out', async () => {
  const { sg, follow, byId } = await setup([row(A)]);
  const first = (await sg(new Request(await oldLink(A)))).headers.get('location');
  for (let i = 0; i < 3; i++) {
    assert.equal((await sg(new Request(await oldLink(A)))).headers.get('location'), first, `click ${i + 2}`);
  }
  const click = oneClick(await oldLink(A));
  await follow(await sg(click), click, 'List-Unsubscribe=One-Click');
  assert.equal(byId.get(A)!.status, 'unsubscribed');
  const again = new Request(await oldLink(A));
  const page = new URL((await follow(await sg(again), again)).headers.get('Location')!);
  assert.equal(page.pathname, '/unsubscribed', 'the same old link now confirms');
  assert.equal(page.searchParams.get('e'), A, 'with Resubscribe offered, as on Singapore before cutover');
});

// ===================================================================== links that do not check out
const BAD: Array<[string, () => Promise<string>]> = [
  ['an invalid token', async () => `e=${A}&t=not-a-token`],
  ['a tampered token (one character changed)', async () => {
    const t = await sgToken(A);
    return `e=${A}&t=${(t[0] === 'A' ? 'B' : 'A') + t.slice(1)}`;
  }],
  ['a truncated token', async () => `e=${A}&t=${(await sgToken(A)).slice(0, -1)}`],
  ['another member\'s token on this id', async () => `e=${A}&t=${await sgToken(B)}`],
  ['a tampered id under a real token', async () => `e=${B}&t=${await sgToken(A)}`],
  ['a malformed token', async () => `e=${A}&t=%ZZ%%`],
  ['an empty token', async () => `e=${A}&t=`],
  ['no token', async () => `e=${A}`],
  ['no id', async () => `t=${await sgToken(A)}`],
  ['a real token behind a junk first `t`', async () => `e=${A}&t=junk&t=${await sgToken(A)}`],
  ['a real pair behind a different first `e`', async () => `e=${B}&e=${A}&t=${await sgToken(A)}`],
];

for (const [name, query] of BAD) {
  test(`${name}: forwarded exactly as it arrived, no token made, refused by Mumbai, nothing written`, async () => {
    const { sg, follow, byId, anon } = await setup([row(A), row(B)]);
    const q = await query();
    assert.equal(await resignQuery(q, KEYS), null, 'nothing is re-signed');

    const get = new Request(`${SG_FN}?${q}`);
    const res = await sg(get);
    assert.equal(res.status, 307);
    assert.equal(res.headers.get('location'), `${MUMBAI_UNSUBSCRIBE}?${q}`, 'the query passes byte for byte, as B2 did');
    for (const id of [A, B]) {
      assert.notEqual(tokenIn(res.headers.get('location')!), await mbToken(id), 'no valid Mumbai token was manufactured');
    }
    assert.equal(new URL((await follow(res, get)).headers.get('Location')!).pathname, '/unsubscribe-failed',
      'the existing invalid-link answer');

    const click = oneClick(`${SG_FN}?${q}`);
    const posted = await sg(click);
    assert.equal(posted.status, 308);
    assert.equal(posted.headers.get('location'), `${MUMBAI_UNSUBSCRIBE}?${q}`);
    assert.equal((await follow(posted, click, 'List-Unsubscribe=One-Click')).status, 200, 'one-click: the quiet 200');

    assert.equal(byId.get(A)!.status, 'unknown');
    assert.equal(byId.get(B)!.status, 'unknown');
    assert.equal(anon.length, 0);
  });
}

test('without both keys nothing is re-signed: links pass through unchanged and Mumbai refuses them', async () => {
  const q = `e=${A}&t=${await sgToken(A)}`;
  for (const keys of [{ singapore: SG_KEY, mumbai: '' }, { singapore: '', mumbai: MB_KEY }, { singapore: '', mumbai: '' }]) {
    assert.equal(await resignQuery(q, keys), null);
    const res = await forwardResigned('GET', `${SG_FN}?${q}`, keys);
    assert.equal(res.headers.get('location'), `${MUMBAI_UNSUBSCRIBE}?${q}`);
  }
});

test('refusals are B2\'s: other paths 404, other methods 405, over-long 414, non-ASCII 400 -- none re-signed', async () => {
  const { sg } = await setup([row(A)]);
  const q = `?e=${A}&t=${await sgToken(A)}`;
  const cases: Array<[Request, number]> = [
    [new Request(`${SG}/functions/v1/send-followups${q}`), 404],
    [new Request(`${SG_FN}${q}`, { method: 'PUT' }), 405],
    [new Request(`${SG_FN}${q}&pad=${'a'.repeat(2100)}`), 414],
  ];
  for (const [req, status] of cases) {
    const res = await sg(req);
    assert.equal(res.status, status, `${req.method} ${req.url.slice(0, 60)}`);
    assert.equal(res.headers.get('location'), null);
  }
  const nonAscii = await forwardResigned('GET', `${SG_FN}${q}&n=é`, KEYS);
  assert.equal(nonAscii.status, 400);
  assert.equal(nonAscii.headers.get('location'), null);
});

// ===================================================================== what the forwarder cannot do
test('the forwarder writes nothing: no client, no fetch, Mumbai\'s rows untouched until the client follows', async () => {
  const { sg, byId, anon } = await setup([row(A), row(B)]);
  const before = clientsBuilt;
  for (const req of [new Request(await oldLink(A)), oneClick(await oldLink(A)), oneClick(await oldLink(B, '&a=unsubscribe')),
                     new Request(await oldLink(A, '&a=resubscribe'), { method: 'POST' })]) {
    assert.ok([307, 308].includes((await sg(req)).status));
  }
  assert.equal(clientsBuilt, before, 'no database client was built');
  assert.deepEqual(fetched, [], 'nothing was fetched');
  assert.equal(byId.get(A)!.status, 'unknown');
  assert.equal(byId.get(B)!.status, 'unknown');
  assert.equal(anon.length, 0);

  const dir = path.join(process.cwd(), 'supabase/forwarders/unsubscribe');
  const forwardSrc = fs.readFileSync(path.join(dir, 'forward.ts'), 'utf8');
  assert.match(forwardSrc, /import \{ signUnsubscribeId, unsubscribeTokenValid \} from '\.\.\/\.\.\/functions\/_shared\/unsubscribe-token\.ts';/,
    'the check is the shared constant-time one the real function uses, not a copy');
  assert.doesNotMatch(forwardSrc, /console\.|Deno\.|===\s*token|token\s*===/, 'forward.ts neither logs, reads the environment, nor compares tokens itself');
  const indexSrc = fs.readFileSync(path.join(dir, 'index.ts'), 'utf8');
  for (const [i, line] of indexSrc.split('\n').entries()) {
    if (/console\./.test(line)) assert.doesNotMatch(line, /\$\{|\+\s*[A-Za-z]|,\s*[A-Za-z]/, `index.ts:${i + 1} logs a fixed message only`);
  }
});

// Runs last: everything the process printed, across every test above.
test('no key and no token -- old or new -- appears in anything the process logged', async () => {
  const all = logged.join('\n');
  for (const key of [SG_KEY, MB_KEY]) assert.equal(all.includes(key), false, 'a signing key was logged');
  assert.ok(tokensSeen.size >= 4, 'the spec really did handle tokens');
  for (const t of tokensSeen) assert.equal(all.includes(t), false, 'a token was logged');
});
