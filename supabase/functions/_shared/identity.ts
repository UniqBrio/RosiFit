import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';
import { CURRENT_PIN_PEPPER_VERSION, derivePinSecret, syntheticEmail } from './pin.ts';

/** Creates the shadow GoTrue user for a brand-new app_user and links it back.
 *  Every credential-issuing path (bootstrap, pin-issue on create) goes
 *  through this so the synthetic-identity shape lives in exactly one place. */
export async function createAuthIdentity(
  admin: SupabaseClient, appUserId: string, pin: string
): Promise<string> {
  const password = await derivePinSecret(appUserId, pin);
  const { data, error } = await admin.auth.admin.createUser({
    email: syntheticEmail(appUserId),
    password,
    email_confirm: true,
    user_metadata: { app_user_id: appUserId },
  });
  if (error || !data?.user) {
    throw new Error(`Could not create the sign-in credential: ${error?.message ?? 'unknown error'}`);
  }
  // The credential was just derived under THIS project's pepper, so it is current (0091).
  const { error: linkErr } = await admin.from('app_users')
    .update({ auth_user_id: data.user.id, pin_pepper_version: CURRENT_PIN_PEPPER_VERSION })
    .eq('id', appUserId);
  if (linkErr) throw new Error(`Could not link the sign-in credential: ${linkErr.message}`);
  return data.user.id as string;
}

/** Rotates the PIN for an app_user that already has a shadow GoTrue user, or
 *  creates one if -- unexpectedly -- it does not have one yet. */
export async function rotatePin(
  admin: SupabaseClient, appUserId: string, authUserId: string | null, pin: string
): Promise<string> {
  if (!authUserId) return createAuthIdentity(admin, appUserId, pin);
  const password = await derivePinSecret(appUserId, pin);
  const { error } = await admin.auth.admin.updateUserById(authUserId, { password });
  if (error) throw new Error(`Could not update the sign-in credential: ${error.message}`);
  // Every PIN this code sets -- pin-issue, pin-reset, recovery, the version-0 re-secure in
  // auth-login -- is derived under THIS project's pepper, so it is current (0091). If this write
  // fails, the row still reads 0 and this throws: for the SAME PIN (the auth-login re-secure) the
  // next sign-in simply re-secures again; for a CHANGED PIN, Singapore refuses it and the person
  // needs a re-issue -- closed, never open.
  const { error: markErr } = await admin.from('app_users')
    .update({ pin_pepper_version: CURRENT_PIN_PEPPER_VERSION }).eq('id', appUserId);
  if (markErr) throw new Error(`Could not record the credential version: ${markErr.message}`);
  return authUserId;
}

/**
 * Best-effort global sign-out. supabase-js does not expose GoTrue's
 * per-user session revocation, so this calls the Auth REST API directly.
 * Never throws: losing this call means old devices stay signed in a little
 * longer, which is a UX nicety, not the security boundary -- the PIN itself
 * has already changed by the time this runs, so a stolen device without a
 * live session cannot sign in again either way.
 */
export async function signOutEverywhere(authUserId: string): Promise<boolean> {
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const res = await fetch(`${url}/auth/v1/admin/users/${authUserId}/sessions`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    return res.ok;
  } catch (err) {
    console.error('signOutEverywhere failed (non-fatal):', err);
    return false;
  }
}
