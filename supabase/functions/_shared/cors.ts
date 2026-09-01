// Every function in this project is called only from the RosiFit app (the
// anon key is public by design, so CORS is not a security boundary here --
// RLS and the checks in each function are). Kept permissive and centralised
// so a change to allowed headers happens in one place.
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Call first in every handler. Returns a response for a preflight request, or null to continue. */
export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  return null;
}
