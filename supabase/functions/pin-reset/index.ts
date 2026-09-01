// pin-reset: a PIN gets replaced. Two callers, two shapes:
//
//   ADMIN     -- app_user_id is somebody else. Super-admin only. The server
//                GENERATES the PIN, sets must_change_pin, and returns it
//                once. This is the C-98 admin-assisted path staff use when
//                they forget theirs, since there is no staff
//                security-question system.
//   SELF      -- app_user_id is absent or the caller's own. Any signed-in
//                user, and she CHOOSES the PIN (new_pin), so it is not
//                returned to anyone -- it clears must_change_pin instead of
//                setting it. This is the "pick your own PIN" screen after a
//                temporary one, and Profile -> Change PIN.
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { requireCaller } from '../_shared/authz.ts';
import { generatePin, isFourDigitPin } from '../_shared/pin.ts';
import { rotatePin, signOutEverywhere } from '../_shared/identity.ts';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
    const caller = await requireCaller(req);
    const body = await req.json().catch(() => ({}));
    const target = String(body.app_user_id ?? '') || caller.id;
    const isSelf = target === caller.id;
    const signOutAll = Boolean(body.sign_out_everywhere);
    const admin = adminClient();

    if (isSelf) {
      const newPin = String(body.new_pin ?? '');
      if (!isFourDigitPin(newPin)) throw new HttpError(400, 'Choose a 4-digit PIN.');

      const { data: me } = await admin.from('app_users')
        .select('id, auth_user_id').eq('id', caller.id).is('deleted_at', null).maybeSingle();
      if (!me) throw new HttpError(404, 'This account is no longer available.');

      await rotatePin(admin, caller.id, me.auth_user_id, newPin);
      await admin.from('app_users').update({
        must_change_pin: false, pin_set_at: new Date().toISOString(),
        failed_attempts: 0, locked_until: null,
      }).eq('id', caller.id);

      let selfSignedOut = false;
      if (signOutAll && me.auth_user_id) selfSignedOut = await signOutEverywhere(me.auth_user_id);

      await admin.rpc('audit_log', {
        p_action: 'auth.pin_changed', p_entity_type: 'app_user', p_entity_id: caller.id,
        p_metadata: { self_service: true, sign_out_everywhere: signOutAll },
      });
      // No PIN in the response: she chose it, she already knows it, and
      // echoing it back would put it somewhere it does not need to be.
      return json({ app_user_id: caller.id, signed_out_everywhere: selfSignedOut });
    }

    if (caller.kind !== 'super_admin') throw new HttpError(403, 'Only the academy admin can reset someone else’s PIN.');
    const appUserId = target;
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
