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
import type { RestoredSession } from './sessionRestore';

export type AppUser = {
  id: string;
  name: string;
  kind: 'super_admin' | 'staff';
  role_label: string;
  phone_e164: string;
  must_change_pin: boolean;
  /** Read for one reason: a session that survives reloads must not
   *  outlive the account. See restoreSession below. */
  is_active: boolean;
};

export async function currentAppUser(): Promise<AppUser | null> {
  if (!isConfigured) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const authUserId = sessionData.session?.user?.id;
  if (!authUserId) return null;

  // app_users_read lets an account read its OWN row whatever its kind, so
  // this is the one identity query a staff member can always make.
  const { data, error } = await supabase.from('app_users')
    .select('id, name, kind, role_label, phone_e164, must_change_pin, is_active')
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
  // 'local', NOT supabase-js' default of 'global'.
  //
  // Both revoke server-side -- GoTrue deletes the refresh token rows, so this
  // is a real invalidation and not just a cleared browser. The difference is
  // WHOSE: 'global' kills every session this account has anywhere, so signing
  // out of the academy laptop at closing time also signed her out of her own
  // phone. One device signing out is a statement about one device.
  //
  // Global revocation still exists and is still used where it MEANS something:
  // signOutEverywhere() in supabase/functions/_shared/identity.ts, called by
  // pin-reset, because a PIN that has just been reset should not leave old
  // devices holding a live session.
  await supabase.auth.signOut({ scope: 'local' });
}

/**
 * IS ANYBODY ALREADY SIGNED IN? -- asked once, by the sign-in screen, before
 * it decides whether to show a number field.
 *
 * WHAT MAKES THIS A SERVER ANSWER AND NOT A CLIENT ONE
 * Finding a token in storage proves nothing; anyone can put a string in
 * localStorage. Two things happen here, in order, and only the second one
 * counts:
 *
 *   1. `getSession()` hands back the stored session, REFRESHING it against
 *      GoTrue when the access token has expired. A refresh token that has been
 *      revoked -- signed out here, signed out everywhere by a PIN reset, or
 *      deleted with the account -- fails that exchange and there is no session.
 *   2. The identity is then read back through PostgREST UNDER RLS, where
 *      `app_users_read` is `is_super_admin() or auth_user_id = auth.uid()`.
 *      That query can only answer for the account the presented JWT actually
 *      belongs to, which is what "validate session ownership server-side"
 *      means here: the database resolves the owner, the app never claims one.
 *
 * The states are kept APART rather than collapsed to a boolean because they
 * mean different things and one of them must not sign anybody out. A dropped
 * connection is 'unverified' and leaves the stored token alone; a server that
 * ANSWERED and gave nothing back is 'none', and the dead session is cleared so
 * the next launch does not retry it. Collapsing the two logs a coach out of
 * her own phone every time the academy wifi drops.
 */
export async function restoreSession(): Promise<RestoredSession> {
  if (!isConfigured) return { state: 'none' };

  let authUserId: string | undefined;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { state: 'unverified' };
    authUserId = data.session?.user?.id;
  } catch {
    return { state: 'unverified' };
  }
  if (!authUserId) return { state: 'none' };

  const { data, error } = await supabase.from('app_users')
    .select('kind, must_change_pin, is_active')
    .eq('auth_user_id', authUserId).is('deleted_at', null).maybeSingle();

  // The token refreshed but the row could not be read. That is the network
  // again, not a verdict -- `error` here is a transport or a policy failure,
  // and neither is "she is signed out".
  if (error) return { state: 'unverified' };

  // Answered, and there is no live row for this identity: the account was
  // deleted while the session was still in a browser somewhere.
  if (!data) { await signOut(); return { state: 'none' }; }

  // THE CHECK PERSISTENCE MAKES NECESSARY. Before a session survived reloads,
  // a disabled account met `is_active` at auth-login on every entry ("This
  // account has been disabled"). A session that outlives the browser would
  // walk straight past that, so it is asked again here -- and her session is
  // ended rather than merely refused, so disabling an account actually turns
  // the device off instead of asking it to be polite.
  if (!data.is_active) { await signOut(); return { state: 'closed' }; }

  return {
    state: 'active',
    kind: data.kind as 'super_admin' | 'staff',
    mustChangePin: Boolean(data.must_change_pin),
  };
}
