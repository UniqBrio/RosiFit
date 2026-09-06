// auth-bootstrap: super-admin registration, incl. two hashed recovery
// answers. Public (verify_jwt=false) -- nobody has a session before this runs.
//
// NO LONGER ONE-TIME (06-Sep-2026). It used to refuse every call after the
// first, because registration was modelled as creating the ACADEMY and an
// academy can only be created once. It is not: the academy is RosiFit, fixed,
// and this form creates a super ADMIN for it -- the owner's words, "we are
// just creating super admins for rosifit academy". The singleton index went
// with it in 0033.
//
// bootstrap_completed is still written by the first registration and still
// read by auth-login, which uses "nobody has registered at all" to explain an
// empty project instead of answering like a wrong PIN. It is no longer a gate.
//
// WHAT STILL REFUSES: a mobile number that already has a live account
// (app_users_phone_live). That is the check that stops one person registering
// twice, and it is unchanged.
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { toE164India } from '../_shared/phone.ts';
import {
  hashAnswer, isFourDigitPin, syntheticEmail, derivePinSecret, pinSecretsConfigured,
} from '../_shared/pin.ts';
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

    // Fail before the first write, not after. Without the pepper this call
    // cannot possibly finish, and discovering that AFTER inserting app_users
    // means relying on the cleanup path to undo a row that should never have
    // been created.
    if (!pinSecretsConfigured()) {
      throw new HttpError(503,
        'Sign-in is not finished being set up on the server yet. ' +
        'An administrator needs to set the PIN_PEPPER secret for this project.');
    }

    const admin = adminClient();

    const { data: questions, error: qErr } = await admin
      .from('security_questions').select('id').in('id', Array.from(ids)).eq('is_active', true);
    if (qErr || !questions || questions.length !== 2) {
      throw new HttpError(400, 'Choose two valid security questions.');
    }

    const { count: dupCount } = await admin
      .from('app_users').select('id', { count: 'exact', head: true })
      .eq('phone_e164', e164).is('deleted_at', null);
    if (dupCount && dupCount > 0) throw new HttpError(409, 'This mobile number is already registered.');

    // From here on, clean up the half-created app_user on any failure, so a
    // retry is possible: app_users_phone_live would otherwise refuse the same
    // number forever on the strength of a row that was never finished.
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

      // Still set, and still one-way (0002). It no longer gates this
      // function; auth-login reads it to tell an EMPTY project apart from a
      // wrong PIN, and that remains true and useful. Already-true is a
      // no-op update, so a second registration costs nothing here.
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
