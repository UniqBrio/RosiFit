/**
 * ONE request per identical read, shared while it is fresh, never across a
 * write (T-406).
 *
 * WHY HERE. Every screen and dialog reads through its own hook, and each hook
 * fetched on mount with nothing shared between them: production logged 300
 * requests for 49 distinct URLs in one minute of one session, the five-table
 * member list read 6 times in ~30 s. Identical concurrent GETs are also
 * queued one behind another by the browser's HTTP cache (shown by disabling
 * the cache), so each repeat costs a full round trip. Both are recorded in
 * RUN_app-feels-slow.md, T-406 section. This is the one
 * point every read passes through -- the Supabase client's fetch -- so it is
 * the one place the sharing lives, instead of in forty hooks.
 *
 * THE RULES
 *   - Shared: GET/HEAD under /rest/v1/, and POST to the read-only RPCs in
 *     READ_RPCS, keyed by method, URL, body and the headers that change the
 *     answer (the signed-in account's token among them).
 *   - Reused for `freshMs` (SHARED_READ_MS in supabase.ts). THE COST, stated:
 *     a hook stamps its data with the time it RECEIVED it, so an answer reused
 *     t ms after the server gave it looks t ms younger than it is -- other
 *     devices' changes can take up to freshMs longer to appear, and the
 *     freshness line understates age by up to freshMs. That is why the window
 *     is short and measured (RUN_app-feels-slow.md), not the 12 s staleness
 *     rule.
 *   - A request in flight for longer than freshMs is not joined: a retry after
 *     the hook's deadline sends a new request rather than waiting on one that
 *     hung.
 *   - ANY other request to /rest/v1/ or /functions/v1/ is a write. It clears
 *     every shared read when it starts AND when it settles. This does not
 *     depend on a write remembering to announce itself on a bus. It
 *     over-clears on purpose: read-only previews, RPCs called as GET, and
 *     read-only functions count as writes too -- never stale, only less shared.
 *   - Not kept: non-2xx answers, network errors, a body that failed to arrive
 *     whole, and callers that bring their own abort signal (one caller's abort
 *     must not cancel the others).
 *   - Expired entries are swept on every read, and a sign-out that reaches
 *     the server (/auth/v1/logout) clears everything, so a long-lived PWA tab
 *     does not accumulate bodies. Entries are keyed by the account's token and
 *     live at most freshMs, so even a sign-out that makes no request cannot
 *     hand one account's answer to another.
 *   - Untouched: other /auth/v1/ traffic (sign-in, token refresh) always goes
 *     out and is not treated as a write.
 */
export const READ_RPCS: ReadonlySet<string> = new Set([
  'member_period_metrics_page',
  'member_period_metrics',
  'course_week_day_status',
  'effective_course_message',
]);

/** Headers that change the ANSWER, so they are part of the key. */
const KEY_HEADERS = ['authorization', 'apikey', 'accept', 'prefer', 'range', 'accept-profile', 'content-profile'];

type Stored = { status: number; statusText: string; headers: [string, string][]; body: ArrayBuffer };
type Entry = { startedAt: number; settledAt: number | null; promise: Promise<Stored | null> };

function kindOf(url: URL, method: string): 'read' | 'write' | 'signout' | 'pass' {
  const p = url.pathname;
  if (p.includes('/auth/v1/')) return p.endsWith('/logout') ? 'signout' : 'pass';
  if (p.includes('/rest/v1/rpc/')) {
    const name = p.slice(p.lastIndexOf('/') + 1);
    return method === 'POST' && READ_RPCS.has(name) ? 'read' : 'write';
  }
  if (p.includes('/rest/v1/')) return method === 'GET' || method === 'HEAD' ? 'read' : 'write';
  if (p.includes('/functions/v1/')) return 'write';
  return 'pass';
}

function toResponse(s: Stored): Response {
  const body = s.status === 204 ? null : s.body.slice(0);
  return new Response(body, { status: s.status, statusText: s.statusText, headers: s.headers });
}

export type SharedFetch = typeof fetch & { entryCount: () => number };

export function createSharedFetch(
  base: typeof fetch,
  config: { freshMs: number; now?: () => number },
): SharedFetch {
  const now = config.now ?? (() => Date.now());
  const entries = new Map<string, Entry>();
  const clearAll = () => entries.clear();

  /* An entry is usable while it is young: in flight since no longer than
     freshMs (so a retry after the hook's own deadline sends a NEW request
     instead of joining one that hung), or settled no longer than freshMs ago.
     A clock that ran backwards makes nothing reusable. */
  const usable = (e: Entry, t: number): boolean => {
    const since = e.settledAt ?? e.startedAt;
    return t - since >= 0 && t - since <= config.freshMs;
  };
  const sweep = (t: number) => { for (const [k, e] of entries) if (!usable(e, t)) entries.delete(k); };

  const shared = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : null;
    const url = new URL(req ? req.url : String(input));
    const method = (init?.method ?? req?.method ?? 'GET').toUpperCase();
    const kind = kindOf(url, method);

    if (kind === 'pass') return base(input, init);
    if (kind === 'signout') { clearAll(); return base(input, init); }
    if (kind === 'write') {
      // Cleared when the write starts AND when it settles: a read that began
      // while the write was in flight may hold the pre-write answer, and must
      // not be handed out once the write has landed.
      clearAll();
      try { return await base(input, init); } finally { clearAll(); }
    }

    const body = typeof init?.body === 'string' ? init.body : init?.body == null ? '' : null;
    if (init?.signal || req || body === null) return base(input, init);   // not safely shareable

    const t = now();
    sweep(t);
    const h = new Headers(init?.headers);
    const key = [method, url.toString(), body, ...KEY_HEADERS.map(k => `${k}=${h.get(k) ?? ''}`)].join('\n');

    const hit = entries.get(key);
    if (hit && usable(hit, t)) {
      const stored = await hit.promise;
      if (stored) return toResponse(stored);
    }

    const network = base(input, init);
    const entry: Entry = { startedAt: t, settledAt: null, promise: Promise.resolve(null) };
    const drop = () => { if (entries.get(key) === entry) entries.delete(key); };
    entry.promise = network.then(async res => {
      if (!res.ok) { drop(); return null; }
      try {
        const stored: Stored = { status: res.status, statusText: res.statusText,
          headers: [...res.headers.entries()], body: await res.clone().arrayBuffer() };
        entry.settledAt = now();
        return stored;
      } catch {
        drop();                                  // the body never arrived whole: keep nothing
        return null;
      }
    }, () => { drop(); return null; });
    entries.set(key, entry);

    const res = await network;                    // the first caller's own response, if nothing was kept
    const stored = await entry.promise;
    return stored ? toResponse(stored) : res;
  }) as typeof fetch;
  return Object.assign(shared, { entryCount: () => entries.size });
}
