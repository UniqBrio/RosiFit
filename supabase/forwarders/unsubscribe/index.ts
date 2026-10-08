// Singapore's `unsubscribe` after cutover -- see forward.ts for what it does and why.
// Deployed to the Singapore project ONLY, under the slug `unsubscribe`, verify_jwt false.
// Lives outside supabase/functions/ so it is never one of the functions deployed to Mumbai.
import { unquoteSecret } from '../../functions/_shared/from-address.ts';
import { forwardResigned, type ResignKeys } from './forward.ts';

// Read once. UNSUBSCRIBE_SECRET is the key Singapore has always signed with (unchanged);
// UNSUBSCRIBE_SECRET_NEXT is Mumbai's UNSUBSCRIBE_SECRET, set on Singapore for this alone.
// unquoteSecret for the reason the real function records: a key set through a shell keeps its
// quotes, and a signature made with a quoted key never matches.
const KEYS: ResignKeys = (() => {
  const read = (name: string) => {
    const raw = Deno.env.get(name);
    return raw ? unquoteSecret(raw) : '';
  };
  return { singapore: read('UNSUBSCRIBE_SECRET'), mumbai: read('UNSUBSCRIBE_SECRET_NEXT') };
})();
if (!KEYS.singapore || !KEYS.mumbai) {
  // Names only, never values. Without both keys nothing is re-signed: links are forwarded as they
  // arrived, and Mumbai refuses the ones signed with Singapore's key.
  console.error('unsubscribe forwarder: UNSUBSCRIBE_SECRET or UNSUBSCRIBE_SECRET_NEXT is not set -- forwarding without re-signing.');
}

Deno.serve(async (req) => {
  // The client re-sends the body to the new address (308); this copy is drained and dropped.
  if (req.method === 'POST') await req.text().catch(() => '');
  return forwardResigned(req.method, req.url, KEYS);
});
