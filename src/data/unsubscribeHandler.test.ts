import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { signUnsubscribeId } from '../../supabase/functions/_shared/unsubscribe-token.ts';

// The unsubscribe endpoint, end to end inside one process: the DEPLOYED file
// (supabase/functions/unsubscribe/index.ts) with its real signature check and
// landing rules, given a stand-in `Deno` (env + serve) and a fake database in
// place of supabase-js. The fake does what Postgres does for this endpoint,
// including 0006's row audit, which is where email_status_before_opt_out
// (0084) reads an opt-out's "before".
//
// TWO WAYS IN, ONE STATE: the body link (GET) and Gmail's own Unsubscribe
// (RFC 8058 one-click POST, no cookie, no Authorization, no redirect) must
// leave the same row in the same state with the same audit action.
// (requests/2026-10-01-resubscribe-recovery-and-gmail-one-click.md)

const SECRET = 'a-long-random-unsubscribe-secret-value';
const FN = 'https://lhpzhkzbnquwjljmbylo.supabase.co/functions/v1/unsubscribe';
const ORIGIN = 'https://rosi-fit.vercel.app';

// supabase-js is an `npm:` specifier Node cannot load; the client it would
// build is the fake below, whichever test is running. The spec runs as
// CommonJS under tsx, so the stand-in goes in at require() resolution.
const STUB = '\0supabase-js-stand-in';
const M = Module as unknown as {
  _resolveFilename: (request: string, ...rest: unknown[]) => string;
  _cache: Record<string, unknown>;
};
const resolveFilename = M._resolveFilename;
M._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  return request.startsWith('npm:@supabase/supabase-js') ? STUB : resolveFilename.call(this, request, ...rest);
};
M._cache[STUB] = {
  id: STUB, filename: STUB, loaded: true,
  exports: { createClient: () => (globalThis as Record<string, unknown>).__unsubscribeFakeDb, SupabaseClient: class {} },
};

type Handler = (req: Request) => Promise<Response>;
const ENV: Record<string, string> = {
  UNSUBSCRIBE_SECRET: SECRET,
  SUPABASE_URL: 'https://lhpzhkzbnquwjljmbylo.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-for-the-fake',
};
const g = globalThis as unknown as Record<string, unknown>;
let served: Handler | null = null;
g.Deno = { env: { get: (k: string) => ENV[k] }, serve: (h: Handler) => { served = h; } };
const entry = '../../supabase/functions/unsubscribe/index.ts';
const loaded = import(entry);

type Row = { id: string; member_id: string; status: string; deleted_at: string | null };
type Audit = { action: string; entity_id: string; changes: unknown; metadata: Record<string, unknown> };

/** Just enough of the service-role client: filtered select, filtered update
 *  with `.select()`, and the two RPCs. Every status change is also logged the
 *  way the `audit_member_email` trigger logs it. */
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
      // Copies, as PostgREST returns: a later write must not reach back into
      // a row the handler already read.
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
        anon.push({
          action: args.p_action as string, entity_id: args.p_entity_id as string,
          changes: args.p_changes, metadata: args.p_metadata as Record<string, unknown>,
        });
        return { data: anon.length, error: null };
      }
      if (fn === 'email_status_before_opt_out') {
        const last = rowAudit.filter(a => a.id === args.p_member_email_id && a.new === 'unsubscribed').pop();
        return { data: last ? last.old : null, error: null };
      }
      return { data: null, error: { message: `no such rpc ${fn}` } };
    },
  };
  return { db, byId, anon, rowAudit };
}

const A = '11111111-2222-3333-4444-555555555555';
const B = '99999999-8888-7777-6666-555555555555';

async function setup(rows: Row[]) {
  await loaded;
  const f = fakeDb(rows);
  const handle: Handler = (req) => { g.__unsubscribeFakeDb = f.db; return served!(req); };
  return { ...f, handle };
}

const link = async (id: string, extra = '') =>
  `${FN}?e=${encodeURIComponent(id)}&t=${encodeURIComponent(await signUnsubscribeId(id, SECRET))}${extra}`;

/** Exactly what Gmail sends: RFC 8058 section 3.1. No cookie, no auth. */
const gmailOneClick = (url: string) => new Request(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'List-Unsubscribe=One-Click',
});

const row = (id: string, status = 'unknown'): Row => ({ id, member_id: `m-${id.slice(0, 4)}`, status, deleted_at: null });

// ================================================================ TEST 1
test('TEST 1 body link: unsubscribe -> old link offers Resubscribe -> Resubscribe -> subscribed', async () => {
  const { handle, byId, anon } = await setup([row(A)]);

  // Owner-approved behaviour reversal (01-Oct-2026, TEST_SUMMARY): opening the
  // link only asks; the page's Unsubscribe press is the opt-out.
  const opened = await handle(new Request(await link(A)));
  assert.equal(new URL(opened.headers.get('Location')!).pathname, '/unsubscribe', 'opening the link only asks');
  assert.equal(byId.get(A)!.status, 'unknown', 'opening the link does not unsubscribe');
  assert.equal(anon.length, 0, 'and audits nothing');
  const res = await handle(new Request(await link(A, '&a=unsubscribe'), { method: 'POST' }));
  assert.equal(res.status, 303);
  const to = new URL(res.headers.get('Location')!);
  assert.equal(to.origin + to.pathname, `${ORIGIN}/unsubscribed`);
  assert.equal(to.searchParams.get('e'), A, 'the confirmation carries the pair for the Resubscribe button');
  assert.equal(to.searchParams.get('fn'), FN);
  assert.equal(byId.get(A)!.status, 'unsubscribed');
  assert.deepEqual(anon.map(a => [a.action, a.metadata.via]), [['communication.unsubscribed', 'link']]);

  // The same old link, clicked again later, still offers the button.
  const again = await handle(new Request(await link(A)));
  assert.equal(new URL(again.headers.get('Location')!).searchParams.get('e'), A);
  assert.equal(anon.length, 1, 'a second click writes no second audit row');

  const back = await handle(new Request(await link(A, '&a=resubscribe'), { method: 'POST' }));
  assert.equal(back.status, 303);
  assert.equal(new URL(back.headers.get('Location')!).pathname, '/resubscribed');
  assert.equal(byId.get(A)!.status, 'unknown', 'subscribed again');
  assert.deepEqual(anon.map(a => a.action), ['communication.unsubscribed', 'communication.resubscribed']);
});

// ================================================================ TEST 2
test('TEST 2 Gmail one-click: 200, empty body, no redirect, no auth needed -> unsubscribed and audited', async () => {
  const { handle, byId, anon } = await setup([row(A)]);
  const res = await handle(gmailOneClick(await link(A)));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Location'), null, 'never a redirect for a mail client');
  assert.equal(await res.text(), '');
  assert.equal(byId.get(A)!.status, 'unsubscribed');
  assert.equal(anon.length, 1);
  assert.equal(anon[0].action, 'communication.unsubscribed', 'the SAME action the body link writes');
  assert.equal(anon[0].metadata.via, 'one_click');
  assert.deepEqual(anon[0].changes, [{ field: 'status', old: 'unknown', new: 'unsubscribed' }]);
});

test('after Gmail one-click, an old body link still offers Resubscribe (same state, one system)', async () => {
  const { handle, byId } = await setup([row(A)]);
  await handle(gmailOneClick(await link(A)));
  const page = await handle(new Request(await link(A)));
  assert.equal(new URL(page.headers.get('Location')!).searchParams.get('e'), A);
  await handle(new Request(await link(A, '&a=resubscribe'), { method: 'POST' }));
  assert.equal(byId.get(A)!.status, 'unknown');
});

test('a duplicate one-click is 200 and writes nothing more', async () => {
  const { handle, anon } = await setup([row(A)]);
  await handle(gmailOneClick(await link(A)));
  const second = await handle(gmailOneClick(await link(A)));
  assert.equal(second.status, 200);
  assert.equal(anon.length, 1);
});

test('one-click on one address leaves every other address alone', async () => {
  const { handle, byId } = await setup([row(A), row(B)]);
  await handle(gmailOneClick(await link(A)));
  assert.equal(byId.get(B)!.status, 'unknown');
});

test('one-click never resubscribes: it carries no `a`, and an `a` on GET is ignored', async () => {
  const { handle, byId } = await setup([row(A, 'unsubscribed')]);
  await handle(gmailOneClick(await link(A)));
  await handle(new Request(await link(A, '&a=resubscribe')));
  assert.equal(byId.get(A)!.status, 'unsubscribed');
});

// ============================================== bad links: one neutral answer
for (const [name, makeUrl] of [
  ['invalid token', async () => `${FN}?e=${A}&t=not-a-token`],
  ['modified token', async () => {
    const t = await signUnsubscribeId(A, SECRET);
    return `${FN}?e=${A}&t=${(t[0] === 'A' ? 'B' : 'A') + t.slice(1)}`;
  }],
  ['wrong member (B\'s token on A\'s id)', async () => `${FN}?e=${A}&t=${await signUnsubscribeId(B, SECRET)}`],
  ['no token', async () => `${FN}?e=${A}`],
] as const) {
  test(`${name}: GET lands on the failure page, POST is a quiet 200, nothing is written`, async () => {
    const { handle, byId, anon } = await setup([row(A), row(B)]);
    const get = await handle(new Request(await makeUrl()));
    assert.equal(new URL(get.headers.get('Location')!).pathname, '/unsubscribe-failed');
    const post = await handle(gmailOneClick(await makeUrl()));
    assert.equal(post.status, 200);
    const back = await handle(new Request(`${await makeUrl()}&a=resubscribe`, { method: 'POST' }));
    assert.equal(new URL(back.headers.get('Location')!).pathname, '/unsubscribe-failed');
    assert.equal(byId.get(A)!.status, 'unknown');
    assert.equal(byId.get(B)!.status, 'unknown');
    assert.equal(anon.length, 0);
  });
}

// ====================================================== suppression is kept
test('bounced: an opt-out is recorded over it, no Resubscribe is offered, and the button is refused', async () => {
  const { handle, byId } = await setup([row(A, 'bounced')]);
  // Owner-approved behaviour reversal (01-Oct-2026, TEST_SUMMARY): opening the
  // link only asks; the page's Unsubscribe press is the opt-out.
  const opened = await handle(new Request(await link(A)));
  assert.equal(new URL(opened.headers.get('Location')!).pathname, '/unsubscribe', 'opening the link only asks');
  assert.equal(byId.get(A)!.status, 'bounced', 'opening the link does not unsubscribe');
  const page = await handle(new Request(await link(A, '&a=unsubscribe'), { method: 'POST' }));
  const to = new URL(page.headers.get('Location')!);
  assert.equal(to.pathname, '/unsubscribed');
  assert.equal(to.searchParams.get('e'), null, 'no button for an address that bounced before');
  assert.equal(byId.get(A)!.status, 'unsubscribed');
  const back = await handle(new Request(await link(A, '&a=resubscribe'), { method: 'POST' }));
  assert.equal(new URL(back.headers.get('Location')!).pathname, '/unsubscribe-failed');
  assert.equal(byId.get(A)!.status, 'unsubscribed', 'the bounce is not washed back to sendable');
});

test('spam-reported: the opt-out is confirmed and the complaint is NOT overwritten', async () => {
  const { handle, byId, anon } = await setup([row(A, 'complained')]);
  const post = await handle(gmailOneClick(await link(A)));
  assert.equal(post.status, 200);
  const page = await handle(new Request(await link(A)));
  assert.equal(new URL(page.headers.get('Location')!).searchParams.get('e'), null);
  assert.equal(byId.get(A)!.status, 'complained');
  assert.equal(anon.length, 0);
  const back = await handle(new Request(await link(A, '&a=resubscribe'), { method: 'POST' }));
  assert.equal(new URL(back.headers.get('Location')!).pathname, '/unsubscribe-failed');
  assert.equal(byId.get(A)!.status, 'complained');
});

test('an opt-out with no record of its "before" offers no button -- nothing is guessed', async () => {
  // Unsubscribed with no status change logged: the staff route is the way back.
  const { handle, byId } = await setup([row(A, 'unsubscribed')]);
  const page = await handle(new Request(await link(A)));
  assert.equal(new URL(page.headers.get('Location')!).searchParams.get('e'), null);
  await handle(new Request(await link(A, '&a=resubscribe'), { method: 'POST' }));
  assert.equal(byId.get(A)!.status, 'unsubscribed');
});

test('a correctly signed link whose address is gone is confirmed, never resubscribed', async () => {
  const { handle } = await setup([{ ...row(A), deleted_at: '2026-09-01' }]);
  const page = await handle(new Request(await link(A)));
  assert.equal(new URL(page.headers.get('Location')!).pathname, '/unsubscribed');
  const back = await handle(new Request(await link(A, '&a=resubscribe'), { method: 'POST' }));
  assert.equal(new URL(back.headers.get('Location')!).pathname, '/unsubscribe-failed');
});

test('methods other than GET and POST are refused', async () => {
  const { handle } = await setup([row(A)]);
  assert.equal((await handle(new Request(await link(A), { method: 'PUT' }))).status, 405);
});

// ========================================================================
// Appended 01-Oct-2026: A GET NEVER WRITES
// (requests/2026-10-01-unsubscribe-get-confirms.md). Link scanners open every
// link in a message; the link now ASKS, and only a press -- or Gmail's RFC
// 8058 POST -- opts the address out.

/** What the question page's button sends: a browser form POST. */
const pressUnsubscribe = async (id: string) =>
  new Request(await link(id, '&a=unsubscribe'), {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: '',
  });

/** A link scanner: a plain GET, as many times as it likes. */
const SCANNER_UA = { 'User-Agent': 'Mozilla/5.0 (compatible; SafeLinksScanner/1.0)' };

for (const status of ['unknown', 'valid', 'bounced']) {
  test(`GET without a press does not unsubscribe (${status}): it asks, writes nothing, audits nothing`, async () => {
    const { handle, byId, anon, rowAudit } = await setup([row(A, status)]);
    for (let i = 0; i < 3; i++) {
      const res = await handle(new Request(await link(A), { headers: SCANNER_UA }));
      assert.equal(res.status, 303);
      const to = new URL(res.headers.get('Location')!);
      assert.equal(to.origin + to.pathname, `${ORIGIN}/unsubscribe`, 'the question, not the confirmation');
      assert.equal(to.searchParams.get('e'), A, 'the page carries the pair its button posts back');
      assert.equal(to.searchParams.get('t'), await signUnsubscribeId(A, SECRET));
      assert.equal(to.searchParams.get('fn'), FN);
    }
    assert.equal(byId.get(A)!.status, status, 'a scanner fetch changes nothing');
    assert.equal(anon.length, 0, 'and leaves no unsubscribe audit row');
    assert.equal(rowAudit.length, 0);
  });
}

test('the explicit press unsubscribes: written, audited via link, lands on the confirmation with Resubscribe', async () => {
  const { handle, byId, anon } = await setup([row(A)]);
  const res = await handle(await pressUnsubscribe(A));
  assert.equal(res.status, 303);
  const to = new URL(res.headers.get('Location')!);
  assert.equal(to.origin + to.pathname, `${ORIGIN}/unsubscribed`);
  assert.equal(to.searchParams.get('e'), A, 'the confirmation offers the undo');
  assert.equal(byId.get(A)!.status, 'unsubscribed');
  assert.deepEqual(anon.map(a => [a.action, a.metadata.via]), [['communication.unsubscribed', 'link']]);
  assert.deepEqual(anon[0].changes, [{ field: 'status', old: 'unknown', new: 'unsubscribed' }]);
});

test('RFC 8058 one-click POST still unsubscribes at once: 200, empty, via one_click -- no page, no press', async () => {
  const { handle, byId, anon } = await setup([row(A)]);
  const res = await handle(gmailOneClick(await link(A)));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Location'), null);
  assert.equal(await res.text(), '');
  assert.equal(byId.get(A)!.status, 'unsubscribed');
  assert.deepEqual(anon.map(a => [a.action, a.metadata.via]), [['communication.unsubscribed', 'one_click']]);
});

for (const [name, makeUrl] of [
  ['invalid token', () => `${FN}?e=${A}&t=not-a-token&a=unsubscribe`],
  ['wrong member (B\'s token on A\'s id)', async () => `${FN}?e=${A}&t=${await signUnsubscribeId(B, SECRET)}&a=unsubscribe`],
  ['no token', () => `${FN}?e=${A}&a=unsubscribe`],
] as const) {
  test(`${name}: the press is refused on the failure page and nothing is written`, async () => {
    const { handle, byId, anon } = await setup([row(A), row(B)]);
    const res = await handle(new Request(await makeUrl(), { method: 'POST' }));
    assert.equal(new URL(res.headers.get('Location')!).pathname, '/unsubscribe-failed');
    const get = await handle(new Request((await makeUrl()).replace('&a=unsubscribe', '')));
    assert.equal(new URL(get.headers.get('Location')!).pathname, '/unsubscribe-failed',
      'a bad link never reaches the question page either');
    assert.equal(byId.get(A)!.status, 'unknown');
    assert.equal(byId.get(B)!.status, 'unknown');
    assert.equal(anon.length, 0);
  });
}

test('a repeated press is idempotent: one write, one audit row, the same confirmation', async () => {
  const { handle, byId, anon } = await setup([row(A)]);
  await handle(await pressUnsubscribe(A));
  const again = await handle(await pressUnsubscribe(A));
  assert.equal(new URL(again.headers.get('Location')!).pathname, '/unsubscribed');
  await handle(gmailOneClick(await link(A)));
  assert.equal(byId.get(A)!.status, 'unsubscribed');
  assert.equal(anon.length, 1, 'no second audit row for a change that did not happen');
  // Opening the old link now goes straight to the confirmation, Resubscribe offered.
  const page = await handle(new Request(await link(A)));
  const to = new URL(page.headers.get('Location')!);
  assert.equal(to.pathname, '/unsubscribed');
  assert.equal(to.searchParams.get('e'), A);
});

test('Resubscribe still works after the pressed unsubscribe', async () => {
  const { handle, byId, anon } = await setup([row(A)]);
  await handle(await pressUnsubscribe(A));
  const back = await handle(new Request(await link(A, '&a=resubscribe'), { method: 'POST' }));
  assert.equal(new URL(back.headers.get('Location')!).pathname, '/resubscribed');
  assert.equal(byId.get(A)!.status, 'unknown');
  assert.deepEqual(anon.map(a => a.action), ['communication.unsubscribed', 'communication.resubscribed']);
  // And a scanner re-fetching the link afterwards changes nothing again.
  await handle(new Request(await link(A), { headers: SCANNER_UA }));
  assert.equal(byId.get(A)!.status, 'unknown');
  assert.equal(anon.length, 2);
});

test('bounced: GET asks; the press records the opt-out but offers no Resubscribe, and the button is refused', async () => {
  const { handle, byId } = await setup([row(A, 'bounced')]);
  await handle(new Request(await link(A)));
  assert.equal(byId.get(A)!.status, 'bounced', 'opening the link changes nothing');
  const res = await handle(await pressUnsubscribe(A));
  const to = new URL(res.headers.get('Location')!);
  assert.equal(to.pathname, '/unsubscribed');
  assert.equal(to.searchParams.get('e'), null, 'no undo for an address that bounced before');
  assert.equal(byId.get(A)!.status, 'unsubscribed');
  const back = await handle(new Request(await link(A, '&a=resubscribe'), { method: 'POST' }));
  assert.equal(new URL(back.headers.get('Location')!).pathname, '/unsubscribe-failed');
  assert.equal(byId.get(A)!.status, 'unsubscribed', 'the bounce is not washed back to sendable');
});

test('spam-reported: GET confirms without asking, the press does not overwrite, nothing is audited', async () => {
  const { handle, byId, anon } = await setup([row(A, 'complained')]);
  const page = await handle(new Request(await link(A)));
  assert.equal(new URL(page.headers.get('Location')!).pathname, '/unsubscribed');
  await handle(await pressUnsubscribe(A));
  assert.equal(byId.get(A)!.status, 'complained');
  assert.equal(anon.length, 0);
});

test('a POST whose `a` is neither button is refused and writes nothing', async () => {
  const { handle, byId, anon } = await setup([row(A)]);
  const res = await handle(new Request(await link(A, '&a=whatever'), { method: 'POST', body: 'List-Unsubscribe=One-Click' }));
  assert.equal(new URL(res.headers.get('Location')!).pathname, '/unsubscribe-failed');
  assert.equal(byId.get(A)!.status, 'unknown');
  assert.equal(anon.length, 0);
});
