// auth-lookup: phone (+91, E.164) -> does an account exist for it?
// Public (verify_jwt=false) -- this is asked BEFORE sign-in, so nobody has a
// session yet. It is the sixth public function; the previous five are
// auth-login, auth-bootstrap and recovery-check.
//
// THIS ENDPOINT IS A DELIBERATE, ACCEPTED STAFF-ENUMERATION ORACLE.
// Anyone can dial numbers through it until one answers `registered: true`,
// which reveals that the number belongs to the academy's super admin or one
// of its staff. That is not an oversight: the sign-in screen's Continue
// button is specified to send an unrecognised number to registration rather
// than to a PIN screen it can never pass (design/RosiFit App.dc.html
// doContinue), and there is no way to make that decision without answering
// this question out loud. The repo owner was shown the trade-off and chose
// it on 05-Sep-2026 -- see docs/decisions/008-continue-validates-the-number.md
// (DECISION_LOG 016) and TECH_DEBT TD-017. Rate-limiting it was offered
// and not taken.
//
// What it deliberately does NOT say: the person's name, role, whether the
// account is active, whether a PIN has ever been set, or whether the academy
// has been registered. One boolean, and nothing that narrows a PIN guess.
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { toE164India } from '../_shared/phone.ts';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
    const body = await req.json().catch(() => ({}));
    const e164 = toE164India(String(body.phone ?? ''));
    // A number that is not a valid Indian mobile is refused rather than
    // answered `false`. "Not registered" would send it to registration,
    // where auth-bootstrap refuses the same number for the same reason --
    // a dead end two screens deep instead of a sentence on this one.
    if (!e164) throw new HttpError(400, 'Enter a valid 10-digit mobile number.');

    const admin = adminClient();

    // The same row auth-login resolves, found the same way: phone_e164 among
    // the app_users that have not been deleted. `is_active` is NOT part of
    // the question -- a disabled staff member HAS an account, and sending
    // her to register a new academy would be worse than the "this account
    // has been disabled" sentence auth-login gives her at the PIN step.
    // PINs are not touched here at all: this reads no credential column.
    const { data: appUser, error: findErr } = await admin
      .from('app_users')
      .select('id')
      .eq('phone_e164', e164)
      .is('deleted_at', null)
      .maybeSingle();
    if (findErr) throw new HttpError(500, 'Could not check that number. Try again.');

    return json({ registered: Boolean(appUser) });
  } catch (err) {
    return errorJson(err);
  }
});
