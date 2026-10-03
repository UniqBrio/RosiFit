/**
 * WHERE an Edge Function runs, decided per function (T-408).
 *
 * Supabase runs a function in the region nearest the CALLER unless told
 * otherwise. For RosiFit's users that is ap-south-1 (Mumbai), while the
 * database is in ap-southeast-1 (Singapore), so every query a function makes
 * crosses Mumbai -> Singapore. `functionTarget` is the one place that decides
 * whether a function is sent somewhere else.
 *
 * csv-import is the experiment: its preview makes ~26 database round trips in
 * sequence, so running it beside the database should pay the India ->
 * Singapore distance once per call instead of once per query. Measured before
 * and after in RUN_app-feels-slow.md; nothing else is moved until that says so.
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
const PINNED: Record<string, string> = {
  'csv-import': 'ap-southeast-1', // beside the database (Singapore)
};

export function functionTarget(name: string): string {
  const region = PINNED[name];
  return region ? `${name}?forceFunctionRegion=${region}` : name;
}
