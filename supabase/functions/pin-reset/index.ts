// pin-reset: super-admin-only "Reset PIN" on an already-active staff member,
// with an optional sign-out-everywhere. Distinct from pin-issue's
// create/regenerate because this is the C-98 admin-assisted path staff use
// when they forget their PIN -- there is no staff security-question system.
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { requireSuperAdmin } from '../_shared/authz.ts';
import { generatePin } from '../_shared/pin.ts';
import { rotatePin, signOutEverywhere } from '../_shared/identity.ts';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
    const caller = await requireSuperAdmin(req);
    const body = await req.json().catch(() => ({}));
    const appUserId = String(body.app_user_id ?? '');
    const signOutAll = Boolean(body.sign_out_everywhere);
    if (!appUserId) throw new HttpError(400, 'Choose a staff member.');

    const admin = adminClient();
    const { data: existing, error: findErr } = await admin
      .from('app_users').select('id, auth_user_id, is_active')
      .eq('id', appUserId).is('deleted_at', null).maybeSingle();
    if (findErr) throw new HttpError(500, 'Could not look up that staff member.');
    if (!existing) throw new HttpError(404, 'Staff member not found.');
    if (!existing.is_active) throw new HttpError(409, 'This account is disabled. Re-enable it first.');

    const pin = generatePin();
    await rotatePin(admin, appUserId, existing.auth_user_id, pin);

    await admin.from('app_users').update({
      must_change_pin: true, pin_set_at: new Date().toISOString(),
      failed_attempts: 0, locked_until: null,
    }).eq('id', appUserId);

    let signedOut = false;
    if (signOutAll && existing.auth_user_id) {
      signedOut = await signOutEverywhere(existing.auth_user_id);
    }

    await admin.rpc('audit_log', {
      p_action: 'auth.pin_reset', p_entity_type: 'app_user', p_entity_id: appUserId,
      p_metadata: { reset_by: caller.id, sign_out_everywhere: signOutAll, sign_out_succeeded: signedOut },
    });

    return json({ app_user_id: appUserId, pin, signed_out_everywhere: signedOut });
  } catch (err) {
    return errorJson(err);
  }
});
