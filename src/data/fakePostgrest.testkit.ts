/**
 * A FAKE SUPABASE NETWORK FOR SPECS THAT MUST RUN THE REAL DATA LAYER.
 *
 * Not a spec itself (no `.test.ts`), and never imported by the app. It exists
 * so a spec can load the REAL repository, the REAL supabase-js client and the
 * REAL shared fetch (T-406) and count what actually goes out on the wire,
 * instead of asserting against a hand-written mock of `fetchMembers`
 * (requests/2026-10-03-one-shared-member-refresh.md).
 *
 * `installNodeStubs()` must run BEFORE `./repository` is imported: it stubs
 * the two React Native modules the Supabase client pulls in (AsyncStorage and
 * the URL polyfill -- Node has a URL already), sets the two public env vars so
 * the repository runs live rather than on fixtures, and replaces global fetch.
 *
 * The server answers only what the member read path asks: keyset pages
 * (`order=<key>.asc&limit=N&<key>=gt.<v>`), `in.(…)` lookups, the period
 * metrics RPC, and `create_member`. Filters it does not model (`is.null`,
 * `eq.…`) are ignored -- every row it holds is live.
 */
import Module from 'node:module';

export type Req = { method: string; path: string; search: URLSearchParams; body: string };

type Row = Record<string, unknown>;

const KEYS: Record<string, string> = {
  members: 'id', member_emails: 'id', member_aliases: 'id', member_stats: 'member_id',
  member_enrollments: 'id', member_schedules: 'id', course_offerings: 'id', courses: 'id', branches: 'id',
};

/** A sortable fake uuid: the order the fake pages in is the order of these strings. */
const uid = (prefix: string, i: number) => `${prefix}${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`;

export function makeAcademy(memberCount: number) {
  const tables: Record<string, Row[]> = {
    branches: [{ id: uid('b', 1), name: 'Chennai' }],
    courses: [{ id: uid('c', 1), name: 'General' }],
    course_offerings: [{ id: uid('o', 1), course_id: uid('c', 1), branch_id: uid('b', 1) }],
    members: [], member_emails: [], member_aliases: [], member_stats: [], member_enrollments: [], member_schedules: [],
  };
  for (let i = 0; i < memberCount; i++) addMember(tables, uid('m', i), `Member ${i}`);
  return tables;
}

function addMember(tables: Record<string, Row[]>, id: string, name: string) {
  tables.members.push({ id, member_code: null, full_name: name, status: 'active',
    inactive_from: null, active_again_from: null, joined_on: '2026-01-01' });
  tables.member_emails.push({ id: `e-${id}`, member_id: id, email: `${id}@x.test`, is_primary: true, status: 'unknown', deleted_at: null });
  tables.member_aliases.push({ id: `a-${id}`, member_id: id, alias_display: name });
  tables.member_stats.push({ member_id: id, current_streak: 0, last_present_date: null, last_emailed_at: null });
  tables.member_enrollments.push({ id: `n-${id}`, member_id: id, offering_id: uid('o', 1) });
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/**
 * The server. `latencyMs` delays every answer and `pool` caps how many are
 * served at once -- a stand-in for PostgREST's database pool, so a burst of
 * requests queues the way production's did. Both are SIMULATION parameters:
 * timings measured against this are relative, never production figures.
 */
export function fakeServer(tables: Record<string, Row[]>, opts: { latencyMs?: number; pool?: number } = {}) {
  const log: Req[] = [];
  /** Paths (substrings) that answer 500 until removed -- a failed refresh. */
  const failing = new Set<string>();
  let active = 0;
  const waiting: Array<() => void> = [];
  const acquire = () => new Promise<void>(r => { if (active < (opts.pool ?? Infinity)) { active++; r(); } else waiting.push(() => { active++; r(); }); });
  const release = () => { active--; const next = waiting.shift(); if (next) next(); };
  let created = 0;

  const answer = (req: Req): Response => {
    if ([...failing].some(f => req.path.includes(f))) return json({ message: 'simulated failure' }, 500);
    const rest = req.path.replace(/^\/rest\/v1\//, '');
    if (rest === 'rpc/member_period_metrics_page') {
      const a = JSON.parse(req.body || '{}') as { p_after_member_id: string | null; p_limit: number };
      const rows = tables.members
        .map(m => ({ member_id: m.id as string, expected: 3, attended: 2, missed: 1 }))
        .filter(r => a.p_after_member_id == null || r.member_id > a.p_after_member_id)
        .sort((x, y) => (x.member_id < y.member_id ? -1 : 1))
        .slice(0, a.p_limit);
      return json(rows);
    }
    if (rest === 'rpc/create_member') {
      const a = JSON.parse(req.body || '{}') as { p_full_name: string };
      const id = uid('z', created++);
      addMember(tables, id, a.p_full_name);
      return json({ member_id: id });
    }
    if (rest.startsWith('rpc/')) return json(null);
    const table = rest;
    let rows = [...(tables[table] ?? [])];
    for (const [k, v] of req.search) {
      if (v.startsWith('in.(')) {
        const ids = v.slice(4, -1).split(',').map(s => s.replace(/^"|"$/g, ''));
        rows = rows.filter(r => ids.includes(String(r[k])));
      } else if (v.startsWith('gt.')) {
        rows = rows.filter(r => String(r[k]) > v.slice(3));
      }
    }
    const order = req.search.get('order');
    const key = order ? order.split('.')[0] : KEYS[table] ?? 'id';
    rows.sort((x, y) => (String(x[key]) < String(y[key]) ? -1 : 1));
    const limit = Number(req.search.get('limit') ?? rows.length);
    return json(rows.slice(0, limit));
  };

  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const req: Req = { method: (init?.method ?? 'GET').toUpperCase(), path: url.pathname, search: url.searchParams,
      body: typeof init?.body === 'string' ? init.body : '' };
    log.push(req);
    await acquire();
    try {
      if (opts.latencyMs) await new Promise(r => setTimeout(r, opts.latencyMs));
      return answer(req);
    } finally { release(); }
  };
  return { fetch, log, tables, failing };
}

/** Run before importing ./repository. Returns a setter for the network. */
export function installNodeStubs(): (f: typeof fetch) => void {
  const M = Module as unknown as {
    _resolveFilename: (request: string, ...rest: unknown[]) => string;
    _cache: Record<string, unknown>;
  };
  const stubs: Record<string, unknown> = {
    '@react-native-async-storage/async-storage': {
      default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined },
    },
    'react-native-url-polyfill/auto': {},
  };
  const resolve = M._resolveFilename;
  M._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
    return request in stubs ? `\0stub:${request}` : resolve.call(this, request, ...rest);
  };
  for (const [name, exports] of Object.entries(stubs)) {
    M._cache[`\0stub:${name}`] = { id: name, filename: name, loaded: true, exports };
  }
  // supabase-js builds its realtime client at createClient() and refuses to
  // without a WebSocket constructor. Browsers and Node 22+ have one; CI runs
  // Node 20, which does not. Nothing here opens a channel, so a constructor
  // that is never called is enough.
  const g = globalThis as { WebSocket?: unknown };
  if (typeof g.WebSocket === 'undefined') {
    g.WebSocket = class { constructor() { throw new Error('realtime is not part of the fake network'); } };
  }
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://fake.supabase.test';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-for-the-fake';
  let current: typeof fetch = async () => json([]);
  (globalThis as { fetch: typeof fetch }).fetch = ((i: RequestInfo | URL, n?: RequestInit) => current(i, n)) as typeof fetch;
  return f => { current = f; };
}
