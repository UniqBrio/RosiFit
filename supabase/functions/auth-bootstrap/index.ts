// auth-bootstrap: one-time super-admin registration, incl. two hashed
// recovery answers. Public (verify_jwt=false) -- nobody has a session before
// this runs -- but gated by app_settings.bootstrap_completed, a one-way
// latch the schema itself will not let flip back to false (0002).
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { toE164India } from '../_shared/phone.ts';
import { hashAnswer, isFourDigitPin, syntheticEmail, derivePinSecret } from '../_shared/pin.ts';
import { createAuthIdentity } from '../_shared/identity.ts';

type AnswerInput = { question_id: number; answer: string };

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
    const body = await req.json().catch(() => ({}));

    // The registration screen has to show the question list before anyone is
    // signed in, and security_questions is readable only by the super admin
    // (0003) -- which is the very account being created. So the list comes
    // from here, where the service role can read it. The questions carry no
    // secret; only the answers do.
    if (String(body.action ?? '') === 'questions') {
      const admin = adminClient();
      const [{ data: questions }, { data: settings }] = await Promise.all([
        admin.from('security_questions').select('id, text').eq('is_active', true).order('id'),
        admin.from('app_settings').select('bootstrap_completed').eq('id', 1).single(),
      ]);
      return json({
        questions: questions ?? [],
        bootstrap_completed: Boolean(settings?.bootstrap_completed),
      });
    }

    const name = String(body.name ?? '').trim();
    const e164 = toE164India(String(body.phone ?? ''));
    const pin = String(body.pin ?? '');
    const answers: AnswerInput[] = Array.isArray(body.answers) ? body.answers : [];

    if (name.length < 2 || name.length > 80) throw new HttpError(400, 'Enter your name.');
    if (!e164) throw new HttpError(400, 'Enter a valid 10-digit mobile number.');
    if (!isFourDigitPin(pin)) throw new HttpError(400, 'Choose a 4-digit PIN.');
    if (answers.length !== 2) throw new HttpError(400, 'Answer both security questions.');
    const ids = new Set(answers.map(a => a.question_id));
    if (ids.size !== 2) throw new HttpError(400, 'Choose two different security questions.');
    for (const a of answers) {
      if (typeof a.answer !== 'string' || a.answer.trim().length === 0) {
        throw new HttpError(400, 'Every security question needs an answer.');
      }
    }

    const admin = adminClient();

    const { data: settings, error: settingsErr } = await admin
      .from('app_settings').select('bootstrap_completed').eq('id', 1).single();
    if (settingsErr) throw new HttpError(500, 'Could not check registration status.');
    if (settings.bootstrap_completed) throw new HttpError(409, 'RosiFit is already set up. Sign in instead.');

    const { data: questions, error: qErr } = await admin
      .from('security_questions').select('id').in('id', Array.from(ids)).eq('is_active', true);
    if (qErr || !questions || questions.length !== 2) {
      throw new HttpError(400, 'Choose two valid security questions.');
    }

    const { count: dupCount } = await admin
      .from('app_users').select('id', { count: 'exact', head: true })
      .eq('phone_e164', e164).is('deleted_at', null);
    if (dupCount && dupCount > 0) throw new HttpError(409, 'This mobile number is already registered.');

    // From here on, clean up the half-created app_user on any failure --
    // bootstrap_completed has not flipped yet, so a retry must be possible,
    // and the partial-unique index on kind='super_admin' would otherwise
    // block it forever.
    const { data: inserted, error: insertErr } = await admin
      .from('app_users')
      .insert({
        kind: 'super_admin', name, phone_e164: e164, role_label: 'Academy admin',
        must_change_pin: false, pin_set_at: new Date().toISOString(),
      })
      .select('id').single();
    if (insertErr || !inserted) throw new HttpError(500, 'Could not create the account. Try again.');
    const appUserId = inserted.id as string;

    try {
      await createAuthIdentity(admin, appUserId, pin);

      for (const a of answers) {
        const answer_hash = await hashAnswer(appUserId, a.answer);
        const { error: recErr } = await admin.from('super_admin_recovery').insert({
          app_user_id: appUserId, question_id: a.question_id, answer_hash,
        });
        if (recErr) throw new Error(`Could not save recovery answers: ${recErr.message}`);
      }

      const { error: latchErr } = await admin
        .from('app_settings').update({ bootstrap_completed: true }).eq('id', 1);
      if (latchErr) throw new Error(`Could not complete setup: ${latchErr.message}`);
    } catch (err) {
      await admin.from('app_users').delete().eq('id', appUserId);
      throw err;
    }

    await admin.rpc('audit_log', {
      p_action: 'auth.bootstrap_completed', p_entity_type: 'app_user', p_entity_id: appUserId,
    });

    const secret = await derivePinSecret(appUserId, pin);
    const { data: signIn, error: signInErr } = await admin.auth.signInWithPassword({
      email: syntheticEmail(appUserId), password: secret,
    });
    if (signInErr || !signIn.session) {
      // The account is real and complete; only the convenience of auto
      // sign-in failed. Tell her to sign in normally rather than erroring.
      return json({ session: null, user: { id: appUserId, name, kind: 'super_admin' } });
    }

    return json({
      session: signIn.session,
      user: { id: appUserId, name, kind: 'super_admin', role_label: 'Academy admin' },
    });
  } catch (err) {
    return errorJson(err);
  }
});
