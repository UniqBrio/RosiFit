// auth-login: phone (+91, E.164) + 4-digit PIN -> GoTrue session.
// Public (verify_jwt=false) -- this IS the sign-in call, nobody has a session yet.
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { toE164India } from '../_shared/phone.ts';
import { derivePinSecret, isFourDigitPin, syntheticEmail } from '../_shared/pin.ts';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const GENERIC_FAIL = 'That mobile number and PIN do not match.';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
    const body = await req.json().catch(() => ({}));
    const e164 = toE164India(String(body.phone ?? ''));
    const pin = String(body.pin ?? '');
    if (!e164) throw new HttpError(400, 'Enter a valid 10-digit mobile number.');
    if (!isFourDigitPin(pin)) throw new HttpError(400, 'Enter your 4-digit PIN.');

    const admin = adminClient();

    const { data: appUser, error: findErr } = await admin
      .from('app_users')
      .select('id, is_active, failed_attempts, locked_until, must_change_pin, auth_user_id, kind, name, role_label')
      .eq('phone_e164', e164)
      .is('deleted_at', null)
      .maybeSingle();
    if (findErr) throw new HttpError(500, 'Could not check that account. Try again.');
    // Same generic message whether the number is unknown or the PIN is
    // wrong -- distinguishing them would let an attacker enumerate registered
    // staff by phone number.
    if (!appUser) throw new HttpError(401, GENERIC_FAIL);

    if (appUser.locked_until && new Date(appUser.locked_until).getTime() > Date.now()) {
      const mins = Math.ceil((new Date(appUser.locked_until).getTime() - Date.now()) / 60000);
      throw new HttpError(423, `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
    }
    if (!appUser.is_active) throw new HttpError(403, 'This account has been disabled. Contact your academy admin.');

    const secret = await derivePinSecret(appUser.id, pin);
    const { data: signIn, error: signInErr } = await admin.auth.signInWithPassword({
      email: syntheticEmail(appUser.id),
      password: secret,
    });

    if (signInErr || !signIn.session) {
      const nextAttempts = appUser.failed_attempts + 1;
      const locked = nextAttempts >= MAX_ATTEMPTS;
      await admin.from('app_users').update({
        failed_attempts: nextAttempts,
        locked_until: locked ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null,
      }).eq('id', appUser.id);
      await admin.rpc('audit_log', {
        p_action: 'auth.login_failed', p_entity_type: 'app_user', p_entity_id: appUser.id,
        p_changes: [], p_metadata: { attempts: nextAttempts, locked },
      });
      if (locked) {
        throw new HttpError(423, `Too many attempts. Try again in ${Math.ceil(LOCKOUT_MS / 60000)} minutes.`);
      }
      throw new HttpError(401, GENERIC_FAIL);
    }

    await admin.from('app_users').update({
      failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString(),
    }).eq('id', appUser.id);
    await admin.rpc('audit_log', {
      p_action: 'auth.login_succeeded', p_entity_type: 'app_user', p_entity_id: appUser.id,
    });

    return json({
      session: signIn.session,
      user: {
        id: appUser.id, name: appUser.name, kind: appUser.kind,
        role_label: appUser.role_label, must_change_pin: appUser.must_change_pin,
      },
    });
  } catch (err) {
    return errorJson(err);
  }
});
