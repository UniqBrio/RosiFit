# CHANGE REQUEST — one member change, one shared member refresh
<!-- Filled by workflows/request.md (/request) · Consumed by Track B -->

## FIELDS
- FEATURE / SCREEN: the member data layer (`src/data/repository.ts` fetchMembers / fetchBucketMetrics /
  fetchWeekRows), the change buses, the client's shared fetch, the Add member form.
- CURRENT BEHAVIOUR (investigation, 03-Oct-2026): every mounted screen re-ran the whole member read
  when the member bus fired. Production (before T-406 was deployed): ~110 requests after one add
  (01-Oct 13:58), 216 in 3 s after an import commit (02-Oct 13:21), one browser. T-406 (merged
  03-Oct) now shares IDENTICAL concurrent network reads for 5 s, which absorbs the simultaneous
  case at the network layer, but every screen still runs the read itself, and nothing tells the
  Add form whether the new member reached the list.
- DESIRED BEHAVIOUR (owner, 03-Oct-2026): one member change → ONE shared member refresh, all screens
  consuming the same result; in-flight requests deduplicated; the new member reliably in the
  shared list after create; a failed refresh distinguishable from "member does not exist"; no
  delays, polling, forced reloads, schema changes or new state library.
- MUST NOT CHANGE: the async-state machine (stale data kept on a failed refresh, the sequence guard);
  the T-016/T-042 call-site specs; RLS; the database.
- RUN MODE: auto · SCALE: scoped

## WHAT WAS BUILT
- `src/data/memberStore.ts` — a pure shared read: callers asking for a key while its read is in
  flight share one promise; nothing kept after it settles; never joined across a change
  (generation moved by the member and attendance buses and by every write the client sends);
  not joined when older than 5 s; never retried.
- `fetchMembers(period)` and the three period-figure reads route through it.
- `confirmMemberListed(id)` — the Add form asks the SAME shared read whether the new member is in it;
  warns separately for "not in the list" and "the list could not refresh".

## 401 INVESTIGATION (separate)
- 102 `401`s, role `anon`, 02-Oct 13:38–13:42: all from ONE device (iPhone Safari) that had never
  signed in that day — no token refresh, no sign-out; the same device signed in at 13:47 and its
  requests became authenticated. Not a lost or expired session; one Supabase client exists.
- Code: the data tabs carry no sign-in guard (only More, Profile and AdminOnly read `signedOut`), so
  a device opening a tab URL without a session mounts the screens and every read is refused.
  The URL it opened is not recoverable (the referer is the origin only). NOT FIXED here: a route
  guard is an auth-flow change, recommended as its own request.
