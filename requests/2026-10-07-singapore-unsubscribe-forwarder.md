# Singapore's unsubscribe forwards to Mumbai's — 07-Oct-2026

**Asked (verbatim):** "Implement B2: create the Singapore unsubscribe compatibility forwarder - GET
must use 307 - POST must use 308 - preserve the complete query string unchanged - accept only the
intended unsubscribe path ... DO NOT deploy the forwarder to Singapore yet"

**Class:** CHANGE (scoped). Blocker B2 of the move to Mumbai
(`requests/2026-10-06-move-production-to-mumbai.md`). New files only:
`supabase/forwarders/unsubscribe/{forward.ts,index.ts}` and
`src/data/unsubscribeForwarder.test.ts`. No existing function, schema, secret or page changed.

**Why:** every email sent before cutover links to Singapore's `unsubscribe`. After cutover
Singapore's database is not production, so an opt-out written there is lost.

**What it does:** deployed to Singapore AS `unsubscribe`, it answers
- `GET /unsubscribe` or `GET /functions/v1/unsubscribe` → **307** to
  `https://lbyqipunsbzkcvdrxach.supabase.co/functions/v1/unsubscribe` + the query string exactly as
  it arrived (never parsed and rebuilt);
- the same paths with `POST` → **308** to the same place (method and body kept: the press,
  Resubscribe and RFC 8058 one-click);
- any other path → 404; any other method → 405 (as the real function); a query over 2,048
  characters → 414; a query with characters outside printable ASCII, or no parsable URL → 400.
Every answer is `Cache-Control: no-store` and `Referrer-Policy: no-referrer`, with no body.

**What it cannot do:** choose its destination from the request (one constant), read a secret or
the environment, or reach a database. The signed pair is still checked by Mumbai's function under
the same `UNSUBSCRIBE_SECRET`.

**Why outside `supabase/functions/`:** that tree is the eleven functions deployed to Mumbai and
checked by `check:functions`. The forwarder must never be one of them.

**Known limit:** Gmail's one-click POST gets a 308; whether Gmail follows a redirect is Gmail's
choice. The body link in the same email always reaches Mumbai.

## Deploy — AT CUTOVER ONLY, after Vercel Production points to Mumbai (separate approval)
Target: Singapore `lhpzhkzbnquwjljmbylo`, slug `unsubscribe`, `verify_jwt: false`, files
`index.ts` (entrypoint) and `forward.ts` from this folder, byte for byte. Then read the bundle back
and diff it against this folder. Verify with no data written anywhere:
`curl -si "https://lhpzhkzbnquwjljmbylo.supabase.co/functions/v1/unsubscribe?e=x&t=y"` → `307` and
`location: https://lbyqipunsbzkcvdrxach.supabase.co/functions/v1/unsubscribe?e=x&t=y`.

**Rollback:** redeploy `unsubscribe` v9 to Singapore from `supabase/functions/unsubscribe/`
(unchanged since `ef74760`), `verify_jwt: false`.
