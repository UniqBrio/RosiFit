// recovery-check: the Super Admin's forgot-PIN path (C-97/C-98). Two
// security questions, three attempts, then a 30-minute lock -- and the
// response is explicit that the PIN is unchanged on lockout. Public
// (verify_jwt=false): she is not signed in yet, that is why she is here.
//
// Two actions, both through this one function:
//   'verify' -- checks both answers; on success returns a short-lived,
//               stateless recovery_token (no DB row to clean up or leak).
//   'apply'  -- spends that token to set a NEW pin and returns a session,
//               so the client's "Set a new PIN" screen has something to
//               submit to and lands her back in the app afterwards.
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { toE164India } from '../_shared/phone.ts';
import {
  hashAnswer, isFourDigitPin, signRecoveryToken, verifyRecoveryToken,
  derivePinSecret, syntheticEmail,
} from '../_shared/pin.ts';
import { rotatePin } from '../_shared/identity.ts';

const MAX_ATTEMPTS = 3;
const LOCK_MS = 30 * 60 * 1000;
const RATE_KEY = (appUserId: string) => `recovery:${appUserId}`;

type AnswerInput = { question_id: number; answer: string };

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'verify');
    const admin = adminClient();

    if (action === 'apply') {
      const newPin = String(body.new_pin ?? '');
      if (!isFourDigitPin(newPin)) throw new HttpError(400, 'Choose a 4-digit PIN.');
      const appUserId = await verifyRecoveryToken(String(body.recovery_token ?? ''))
        .catch(() => { throw new HttpError(401, 'This recovery check has expired. Start again.'); });

      const { data: appUser, error: findErr } = await admin
        .from('app_users').select('id, auth_user_id, is_active').eq('id', appUserId)
        .is('deleted_at', null).maybeSingle();
      if (findErr || !appUser || !appUser.is_active) {
        throw new HttpError(404, 'This account is no longer available.');
      }

      await rotatePin(admin, appUserId, appUser.auth_user_id, newPin);
      await admin.from('app_users').update({
        must_change_pin: false, pin_set_at: new Date().toISOString(),
        failed_attempts: 0, locked_until: null,
      }).eq('id', appUserId);
      await admin.rpc('audit_log', {
        p_action: 'auth.recovery_pin_set', p_entity_type: 'app_user', p_entity_id: appUserId,
      });

      const secret = await derivePinSecret(appUserId, newPin);
      const { data: signIn, error: signInErr } = await admin.auth.signInWithPassword({
        email: syntheticEmail(appUserId), password: secret,
      });
      if (signInErr || !signIn.session) throw new HttpError(500, 'PIN was set, but sign-in failed. Try signing in normally.');

      return json({ session: signIn.session, user: { id: appUserId } });
    }

    // action === 'verify'
    const e164 = toE164India(String(body.phone ?? ''));
    const answers: AnswerInput[] = Array.isArray(body.answers) ? body.answers : [];
    if (!e164) throw new HttpError(400, 'Enter a valid 10-digit mobile number.');
    if (answers.length !== 2) throw new HttpError(400, 'Answer both security questions.');

    const { data: appUser, error: findErr } = await admin
      .from('app_users').select('id').eq('phone_e164', e164).eq('kind', 'super_admin')
      .is('deleted_at', null).maybeSingle();
    if (findErr) throw new HttpError(500, 'Could not check that account.');
    if (!appUser) throw new HttpError(404, 'That mobile number is not registered as the academy admin.');

    const key = RATE_KEY(appUser.id);
    const { data: limit } = await admin.from('auth_rate_limits').select('*').eq('key', key).maybeSingle();
    if (limit?.blocked_until && new Date(limit.blocked_until).getTime() > Date.now()) {
      const mins = Math.ceil((new Date(limit.blocked_until).getTime() - Date.now()) / 60000);
      throw new HttpError(423,
        `Too many wrong answers. Recovery is locked for ${mins} more minute${mins === 1 ? '' : 's'}. Your PIN has not changed.`);
    }

    const { data: stored, error: recErr } = await admin
      .from('super_admin_recovery').select('question_id, answer_hash').eq('app_user_id', appUser.id);
    if (recErr || !stored || stored.length === 0) {
      throw new HttpError(500, 'Recovery is not set up for this account. Contact RosiFit for help.');
    }
    const byQuestion = new Map(stored.map(r => [r.question_id, r.answer_hash]));

    let allMatch = answers.length > 0;
    for (const a of answers) {
      const expected = byQuestion.get(a.question_id);
      const actual = expected ? await hashAnswer(appUser.id, a.answer) : null;
      if (!expected || actual !== expected) allMatch = false;
    }

    if (!allMatch) {
      const nextCount = (limit?.count ?? 0) + 1;
      const locked = nextCount >= MAX_ATTEMPTS;
      await admin.from('auth_rate_limits').upsert({
        key, window_start: limit?.window_start ?? new Date().toISOString(),
        count: nextCount, blocked_until: locked ? new Date(Date.now() + LOCK_MS).toISOString() : null,
      });
      await admin.rpc('audit_log', {
        p_action: 'auth.recovery_failed', p_entity_type: 'app_user', p_entity_id: appUser.id,
        p_metadata: { attempts: nextCount, locked },
      });
      if (locked) {
        throw new HttpError(423,
          'Too many wrong answers. Recovery is locked for 30 minutes. Your PIN has not changed.');
      }
      const remaining = MAX_ATTEMPTS - nextCount;
      throw new HttpError(401,
        `That does not match. ${remaining} attempt${remaining === 1 ? '' : 's'} left before recovery closes.`);
    }

    await admin.from('auth_rate_limits').delete().eq('key', key);
    await admin.rpc('audit_log', {
      p_action: 'auth.recovery_passed', p_entity_type: 'app_user', p_entity_id: appUser.id,
    });

    const recovery_token = await signRecoveryToken(appUser.id);
    return json({ ok: true, recovery_token });
  } catch (err) {
    return errorJson(err);
  }
});
