/**
 * WHERE an Edge Function runs, decided per function (T-408).
 *
 * Supabase runs a function in the region nearest the CALLER unless told
 * otherwise. For RosiFit's users that is ap-south-1 (Mumbai). Until the move
 * the database was in Singapore, so every query a function made crossed
 * Mumbai -> Singapore. `functionTarget` is the one place that decides
 * whether a function is sent somewhere else.
 *
 * csv-import was the experiment: its preview makes ~26 database round trips in
 * sequence, so running it beside the database paid the India -> Singapore
 * distance once per call instead of once per query (RUN_app-feels-slow.md).
 * MOVED TO MUMBAI (requests/2026-10-06-move-production-to-mumbai.md, owner
 * decision D3): the database is now in ap-south-1, where the callers already
 * are, so the default region IS beside the database and nothing is pinned.
 * The mechanism stays, empty, as the one place a future pin would go.
 *
 * The region travels as the `forceFunctionRegion` QUERY PARAMETER, not the
 * SDK's `region:` option: that option also sends an `x-region` header, which
 * the functions' CORS allow-list (supabase/functions/_shared/cors.ts) does not
 * list, so a browser's preflight would refuse every import. Supabase documents
 * the parameter for exactly this case. functions-js builds the request URL as
 * `new URL(`${url}/${name}`)`, so the parameter lands in the query string and
 * the path is unchanged -- functionRegion.test.ts drives the real client to
 * prove it.
 */
const PINNED: Record<string, string> = {};

export function functionTarget(name: string): string {
  const region = PINNED[name];
  return region ? `${name}?forceFunctionRegion=${region}` : name;
}
