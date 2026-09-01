import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

/**
 * The ONE privileged client every function uses. SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are injected automatically by the Edge Runtime --
 * they are never set by hand and never appear in this repo. Auth helpers are
 * disabled because this client is never the signed-in user; it is used
 * either for direct table/RPC access (bypassing RLS deliberately, which is
 * why every function using it must do its own authorization check) or to
 * verify a caller's JWT via admin.auth.getUser().
 */
export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not available to this function.');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
