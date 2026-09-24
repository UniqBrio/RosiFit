/**
 * T-408: csv-import runs next to the database, not next to the caller.
 *
 * Run: npx tsx --test src/data/functionRegion.test.ts
 *
 * The database is in ap-southeast-1 (Singapore). Without a region, Supabase
 * runs a function nearest the CALLER -- ap-south-1 (Mumbai) for every
 * RosiFit user, read from `x_sb_edge_region` in function_edge_logs -- and a
 * csv-import preview then makes ~26 database round trips in sequence, each
 * crossing Mumbai -> Singapore.
 *
 * WHY THE QUERY PARAMETER AND NOT THE SDK's `region:` OPTION. `region:` sends
 * an `x-region` HEADER as well as the parameter
 * (functions-js FunctionsClient.invoke). A browser must preflight a request
 * that carries a header the server does not list, and
 * supabase/functions/_shared/cors.ts allows only
 * `authorization, x-client-info, apikey, content-type` -- so `region:` from
 * the browser would fail EVERY import at the preflight. Supabase's own guide
 * (functions/regional-invocation) names `forceFunctionRegion` for exactly
 * this case: "In case you cannot add the x-region header to the request
 * (e.g.: CORS requests...)". The assertions below pin both halves: the
 * parameter is sent, and the header is not.
 *
 * These drive the REAL installed FunctionsClient with a recording fetch, so
 * they assert the request that would leave the browser -- not a string in a
 * source file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FunctionsClient } from '@supabase/functions-js';
import { functionTarget } from './functionRegion';

type Seen = { url: URL; headers: Headers };

async function send(name: string): Promise<Seen> {
  let seen: Seen | undefined;
  const client = new FunctionsClient('https://project.supabase.co/functions/v1', {
    customFetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      seen = { url: new URL(String(input)), headers: new Headers(init?.headers) };
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  await client.invoke(functionTarget(name), { body: { action: 'preview' } });
  assert.ok(seen, 'the client made no request');
  return seen;
}

test('csv-import is sent to ap-southeast-1, next to the database', async () => {
  const { url } = await send('csv-import');
  assert.equal(url.pathname, '/functions/v1/csv-import', 'the function path is unchanged');
  assert.equal(url.searchParams.get('forceFunctionRegion'), 'ap-southeast-1');
});

test('csv-import carries NO x-region header -- the CORS allow-list would refuse the preflight', async () => {
  const { headers } = await send('csv-import');
  assert.equal(headers.get('x-region'), null);
});

test('every other function keeps the default region (scoped to csv-import only)', async () => {
  for (const name of ['auth-login', 'auth-lookup', 'auth-bootstrap', 'pin-issue', 'pin-reset',
                      'pin-reset-request', 'recovery-check', 'send-followups']) {
    const { url, headers } = await send(name);
    assert.equal(url.pathname, `/functions/v1/${name}`, `${name}: path unchanged`);
    assert.equal(url.searchParams.get('forceFunctionRegion'), null, `${name}: no region forced`);
    assert.equal(headers.get('x-region'), null, `${name}: no x-region header`);
  }
});

test('api.ts sends every Edge Function call through functionTarget', async () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/data/api.ts'), 'utf8');
  const invokes = src.match(/functions\.invoke\(([^,]+),/g) ?? [];
  assert.deepEqual(invokes, ['functions.invoke(functionTarget(name),'],
    'callFn is the one invoke site and it resolves the target through functionTarget');
});
