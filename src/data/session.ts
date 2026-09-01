/**
 * Who is signed in, as the app understands it: app_users.id is the identity
 * (C-99), not the phone number and not auth.users.id. Screens that need to
 * know "am I the super admin" or "must I change my PIN" read it from here.
 *
 * In fixtures mode there is no session at all and this reports the signed-out
 * state, which is correct rather than a failure: the app runs on fixtures
 * precisely when it has no project to sign in to.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

export type AppUser = {
  id: string;
  name: string;
  kind: 'super_admin' | 'staff';
  role_label: string;
  must_change_pin: boolean;
};

export async function currentAppUser(): Promise<AppUser | null> {
  if (!isConfigured) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const authUserId = sessionData.session?.user?.id;
  if (!authUserId) return null;

  const { data, error } = await supabase.from('app_users')
    .select('id, name, kind, role_label, must_change_pin')
    .eq('auth_user_id', authUserId).is('deleted_at', null).maybeSingle();
  if (error || !data) return null;
  return data as AppUser;
}

export function useAppUser(): { user: AppUser | null; loading: boolean; refresh: () => void } {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(isConfigured);

  const load = useCallback(() => {
    if (!isConfigured) { setUser(null); setLoading(false); return; }
    setLoading(true);
    currentAppUser().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    if (!isConfigured) return;
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, [load]);

  return { user, loading, refresh: load };
}

export async function signOut(): Promise<void> {
  if (!isConfigured) return;
  await supabase.auth.signOut();
}
