// Singapore's `unsubscribe` after cutover -- see forward.ts for what it does and why.
// Deployed to the Singapore project ONLY, under the slug `unsubscribe`, verify_jwt false.
// Lives outside supabase/functions/ so it is never one of the functions deployed to Mumbai.
import { forward } from './forward.ts';

Deno.serve(async (req) => {
  // The client re-sends the body to the new address (308); this copy is drained and dropped.
  if (req.method === 'POST') await req.text().catch(() => '');
  return forward(req.method, req.url);
});
