// auth-login: phone (+91, E.164) + 4-digit PIN -> GoTrue session.
// Public (verify_jwt=false) -- this IS the sign-in call, nobody has a session yet.
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { toE164India } from '../_shared/phone.ts';
import { CURRENT_PIN_PEPPER_VERSION, derivePinSecret, isFourDigitPin, syntheticEmail } from '../_shared/pin.ts';
import { rotatePin } from '../_shared/identity.ts';
import { verifyPinWithSingapore } from '../_shared/pinVerifyClient.ts';

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
      .select('id, is_active, failed_attempts, locked_until, must_change_pin, auth_user_id, kind, name, role_label, pin_pepper_version')
      .eq('phone_e164', e164)
      .is('deleted_at', null)
      .maybeSingle();
    if (findErr) throw new HttpError(500, 'Could not check that account. Try again.');

    if (!appUser) {
      // Before anyone has registered there is no account ANY number could
      // match, and "that number and PIN do not match" sends the first user
      // hunting for a typo instead of to the register screen. This leaks
      // nothing: whether the academy has been set up is a single global fact
      // the register screen already states out loud. Once it IS set up, the
      // message below goes back to being deliberately indistinguishable from
      // a wrong PIN, so nobody can enumerate staff by phone number.
      const { data: settings } = await admin
        .from('app_settings').select('bootstrap_completed').eq('id', 1).maybeSingle();
      if (settings && !settings.bootstrap_completed) {
        throw new HttpError(409,
          'This academy has not been registered yet. Use “Register your academy” to create the admin account first.');
      }
      throw new HttpError(401, GENERIC_FAIL);
    }

    if (appUser.locked_until && new Date(appUser.locked_until).getTime() > Date.now()) {
      const mins = Math.ceil((new Date(appUser.locked_until).getTime() - Date.now()) / 60000);
      throw new HttpError(423, `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
    }
    if (!appUser.is_active) throw new HttpError(403, 'This account has been disabled. Contact your academy admin.');

    // Local sign-in under THIS project's pepper.
    const signInLocally = async () => {
      const secret = await derivePinSecret(appUser.id, pin);
      const { data: signIn, error: signInErr } = await admin.auth.signInWithPassword({
        email: syntheticEmail(appUser.id),
        password: secret,
      });
      return signInErr || !signIn.session ? null : signIn.session;
    };

    // 0091 / docs/security/PIN_PEPPER_MIGRATION.md. Lock and disabled were checked above, so
    // nothing below can reach Singapore for an account this project already refuses.
    let session: Awaited<ReturnType<typeof signInLocally>> = null;
    let pinRekeyed = false;
    if ((appUser.pin_pepper_version ?? 0) >= CURRENT_PIN_PEPPER_VERSION) {
      session = await signInLocally();
    } else {
      // Secured under the OLD pepper: only Singapore can check it, once, then it is re-secured.
      const remote = await verifyPinWithSingapore(appUser.id, pin, { readEnv: (n) => Deno.env.get(n) });
      if (remote === 'unavailable') {
        // Fail closed and do not count it: the person did nothing wrong.
        throw new HttpError(503, 'Sign-in is temporarily unavailable. Try again in a few minutes.');
      }
      if (remote === 'locked') throw new HttpError(423, 'Too many attempts. Try again later.');
      if (remote === 'disabled') throw new HttpError(403, 'This account has been disabled. Contact your academy admin.');
      if (remote === 'valid') {
        await rotatePin(admin, appUser.id, appUser.auth_user_id, pin);   // marks it current (identity.ts)
        pinRekeyed = true;
        session = await signInLocally();
        if (!session) throw new HttpError(500, 'Your PIN was confirmed, but sign-in could not finish. Try again.');
      }
      // 'invalid' and 'not_found' fall through as a wrong PIN, counted exactly as below.
    }

    if (!session) {
      const nextAttempts = appUser.failed_attempts + 1;
      const locked = nextAttempts >= MAX_ATTEMPTS;
      await admin.from('app_users').update({
        failed_attempts: nextAttempts,
        locked_until: locked ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null,
      }).eq('id', appUser.id);
      // audit_log, NOT audit_log_as (0023). Nobody has proved who they are
      // yet -- that is the whole point of a failed sign-in -- so there is no
      // actor to name, and naming the account the attempt was AIMED at would
      // record her as having done something she may know nothing about.
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
      ...(pinRekeyed ? { p_metadata: { pin_rekeyed: true } } : {}),
    });

    return json({
      session,
      user: {
        id: appUser.id, name: appUser.name, kind: appUser.kind,
        role_label: appUser.role_label, must_change_pin: appUser.must_change_pin,
      },
    });
  } catch (err) {
    return errorJson(err);
  }
});
