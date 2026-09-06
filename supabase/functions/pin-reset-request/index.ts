// pin-reset-request: a staff member asks the academy admin for a new PIN.
//
// Public (verify_jwt=false), and it has to be: she is here BECAUSE she cannot
// sign in. There is no session to check, so the number is the only thing she
// can offer.
//
// WHAT IT ANSWERS, AND WHY IT IS THE SAME EITHER WAY. The reply is identical
// for a number that exists and one that does not: "if that number belongs to
// a staff member, your academy admin has been told." An honest 404 would turn
// this into a second enumeration oracle on top of auth-lookup (TD-017), and
// this one would be worse -- auth-lookup at least tells you nothing beyond
// yes/no, whereas "that is not staff" separates staff from admins.
//
// WHAT IT WILL NOT DO: create a request for a SUPER ADMIN. She has her own
// recovery -- two security questions, recovery-check -- and routing her
// through the admin would mean routing her through herself.
//
// RATE LIMIT. The same auth_rate_limits table recovery-check uses, keyed per
// account. Without it, anyone who knows a staff number could refresh the
// admin's tray forever. Asking twice legitimately is not the case being
// stopped -- the upsert handles that -- so the window is generous.
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { toE164India } from '../_shared/phone.ts';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_IN_WINDOW = 5;
const RATE_KEY = (appUserId: string) => `pinreq:${appUserId}`;

// One sentence, whatever happened. Built once so no branch can drift from it.
const ACCEPTED =
  'If that number belongs to a staff member, your academy admin has been asked '
  + 'to reset the PIN. Your PIN has not changed yet.';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
    const body = await req.json().catch(() => ({}));
    const e164 = toE164India(String(body.phone ?? ''));
    // A number that is not a valid Indian mobile is a typo, not a request, and
    // saying so costs nothing: it reveals nothing about who has an account.
    if (!e164) throw new HttpError(400, 'Enter a valid 10-digit mobile number.');

    const admin = adminClient();

    const { data: appUser, error: findErr } = await admin
      .from('app_users')
      .select('id, kind, is_active')
      .eq('phone_e164', e164)
      .is('deleted_at', null)
      .maybeSingle();
    if (findErr) throw new HttpError(500, 'Could not send that request. Try again.');

    // Not staff, not found, or disabled -> the same sentence, no row written.
    // A disabled account deliberately gets it too: telling her she is disabled
    // is the academy's job, face to face, not this endpoint's.
    if (!appUser || appUser.kind !== 'staff' || !appUser.is_active) {
      return json({ ok: true, message: ACCEPTED });
    }

    // auth_rate_limits is (key, window_start, count, blocked_until) -- 0003.
    // Column names read from the migration, not assumed from the other
    // callers' local variable names.
    const key = RATE_KEY(appUser.id as string);
    const { data: limit } = await admin
      .from('auth_rate_limits').select('key, window_start, count').eq('key', key).maybeSingle();
    const now = Date.now();
    const windowStart = limit?.window_start
      ? new Date(limit.window_start as string).getTime()
      : 0;
    const fresh = now - windowStart > WINDOW_MS;
    const count = fresh ? 0 : Number(limit?.count ?? 0);
    if (count >= MAX_IN_WINDOW) {
      // Named plainly rather than swallowed: she is being told her OWN ask did
      // not land, which is a fact about her, not about anyone else's account.
      throw new HttpError(429,
        'That request has already been sent several times. '
        + 'Give your academy admin a few minutes, or call the academy.');
    }
    await admin.from('auth_rate_limits').upsert({
      key,
      count: count + 1,
      window_start: new Date(fresh ? now : windowStart).toISOString(),
    }, { onConflict: 'key' });

    // Read-then-write, NOT an upsert. pin_reset_requests_one_open is a PARTIAL
    // unique index (where resolved_at is null) and PostgREST's on_conflict
    // cannot carry that predicate -- Postgres would answer "no unique or
    // exclusion constraint matching the ON CONFLICT specification". So the
    // open row is looked up and refreshed by id.
    const { data: open, error: openErr } = await admin
      .from('pin_reset_requests')
      .select('id')
      .eq('app_user_id', appUser.id)
      .is('resolved_at', null)
      .maybeSingle();
    if (openErr) {
      console.error('pin-reset-request read:', openErr.message);
      throw new HttpError(500, 'Could not send that request. Try again.');
    }

    // Asking twice refreshes the one ask rather than making a second: the
    // admin gets one line for one forgotten PIN, however many times she taps.
    const write = open
      ? await admin.from('pin_reset_requests')
          .update({ requested_at: new Date().toISOString() }).eq('id', open.id)
      : await admin.from('pin_reset_requests')
          .insert({ app_user_id: appUser.id });
    if (write.error) {
      console.error('pin-reset-request write:', write.error.message);
      throw new HttpError(500, 'Could not send that request. Try again.');
    }

    await admin.rpc('audit_log', {
      p_action: 'auth.pin_reset_requested',
      p_entity_type: 'app_user',
      p_entity_id: appUser.id,
    });

    return json({ ok: true, message: ACCEPTED });
  } catch (err) {
    return errorJson(err);
  }
});
