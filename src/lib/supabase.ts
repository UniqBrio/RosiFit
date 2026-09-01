import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The ONLY Supabase client in the app.
 *
 * It carries the anon (publishable) key and nothing else. The service-role key
 * and the SES credentials are Edge Function secrets and must never reach a
 * bundle -- anything prefixed EXPO_PUBLIC_ is compiled into the app and is
 * readable by anyone who installs it.
 *
 * RLS is what actually protects the data: `authenticated` holds no write
 * grants on the engine tables, so a stolen anon key still cannot write
 * attendance, and the credential tables have no policies at all.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

if (!isConfigured && __DEV__) {
  // A missing URL should say so plainly rather than fail later as an opaque
  // network error against "undefined".
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
    'Copy .env.example to .env and fill them in. The app runs on fixtures until then.'
  );
}

/**
 * `expo export` prerenders every route in Node, where there is no window and
 * no AsyncStorage. GoTrue starts restoring a session the moment the client is
 * constructed, so with storage attached during the prerender that restore
 * throws and takes the whole export down. On the server the client is built
 * storage-less and stateless; in the browser and on device it is the real
 * one. Nothing is signed in during a prerender anyway -- the markup it
 * produces is the signed-out first paint.
 */
const isServer = typeof window === 'undefined';

export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'anon', {
  auth: isServer
    ? { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    : {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // The app has no deep-link callback: sign-in is mobile + PIN through
        // the auth-login Edge Function, not an OAuth redirect.
        detectSessionInUrl: false,
      },
});

/** Calls an Edge Function, forwarding the caller's session automatically. */
export async function callFunction<T>(name: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body: body ?? {} });
  if (error) throw error;
  return data as T;
}
