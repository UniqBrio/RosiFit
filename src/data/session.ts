/**
 * Who is signed in, as the app understands it: app_users.id is the identity
 * (C-99), not the phone number and not auth.users.id. Screens that need to
 * know "am I the super admin" or "must I change my PIN" read it from here.
 *
 * In fixtures mode there is no session at all and this reports the signed-out
 * state, which is correct rather than a failure: the app runs on fixtures
 * precisely when it has no project to sign in to.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { STAFF, FIXTURE_SELF_ID, initials as toInitials } from './mock';

export type AppUser = {
  id: string;
  name: string;
  kind: 'super_admin' | 'staff';
  role_label: string;
  phone_e164: string;
  must_change_pin: boolean;
};

export async function currentAppUser(): Promise<AppUser | null> {
  if (!isConfigured) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const authUserId = sessionData.session?.user?.id;
  if (!authUserId) return null;

  // app_users_read lets an account read its OWN row whatever its kind, so
  // this is the one identity query a staff member can always make.
  const { data, error } = await supabase.from('app_users')
    .select('id, name, kind, role_label, phone_e164, must_change_pin')
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

/**
 * The signed-in person as a SCREEN needs her: already formatted, already
 * reduced to the one question the chrome asks ("may I show this?").
 *
 * Every screen that shows a name, a number, a role or an admin-only row reads
 * this. Nothing renders an identity from a literal -- the profile, the More
 * card and the change-number screen all shipped 'Priya Menon' and
 * '+91 80563 29742' hard-coded, so they showed the fixture persona to whoever
 * was actually signed in.
 */
export type Identity = {
  id: string;
  name: string;
  /** display form -- +91 80563 29742, never the stored +918056329742 */
  phone: string;
  roleLabel: string;
  kind: 'super_admin' | 'staff';
  initials: string;
  isSuperAdmin: boolean;
};

/** app_users stores strict E.164; the screens show it spaced. */
export function formatPhone(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

/** The fixtures persona, taken from the staff list rather than copied. */
function fixtureIdentity(): Identity {
  const self = STAFF.find(s => s.id === FIXTURE_SELF_ID) ?? STAFF[0];
  return {
    id: self.id,
    name: self.name,
    phone: formatPhone(self.phone),
    roleLabel: self.role,
    kind: 'super_admin',
    initials: toInitials(self.name),
    isSuperAdmin: true,
  };
}

export type IdentityState = {
  identity: Identity | null;
  loading: boolean;
  /** live, resolved, and nobody is signed in -- the screen must say so */
  signedOut: boolean;
};

export function useIdentity(): IdentityState {
  const { user, loading } = useAppUser();

  return useMemo(() => {
    // On fixtures there is no project to sign in to, so the persona the rest
    // of the fixtures describe IS the signed-in person. Reporting signed-out
    // here would leave the prototype with an unreachable profile.
    if (!isConfigured) return { identity: fixtureIdentity(), loading: false, signedOut: false };
    if (loading) return { identity: null, loading: true, signedOut: false };
    if (!user) return { identity: null, loading: false, signedOut: true };
    return {
      identity: {
        id: user.id,
        name: user.name,
        phone: formatPhone(user.phone_e164),
        roleLabel: user.role_label,
        kind: user.kind,
        initials: toInitials(user.name),
        isSuperAdmin: user.kind === 'super_admin',
      },
      loading: false,
      signedOut: false,
    };
  }, [user, loading]);
}

export async function signOut(): Promise<void> {
  if (!isConfigured) return;
  await supabase.auth.signOut();
}
