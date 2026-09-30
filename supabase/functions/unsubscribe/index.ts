// unsubscribe: a member opts out of attendance follow-ups from the link in
// one, with no login and no app.
//
// MUST BE DEPLOYED WITH verify_jwt=false. The person clicking has no session
// and never will -- members are not app_users; nobody in this table can sign
// in. `supabase functions deploy unsubscribe --no-verify-jwt`.
//
// A BARE ID IS NEVER ENOUGH. The link carries `?e=<member_email_id>&t=<token>`
// where the token is HMAC-SHA256 of the id under UNSUBSCRIBE_SECRET
// (_shared/unsubscribe-token.ts). Without the signature, an endpoint that by
// design has no session would let anyone walk UUIDs and opt members out at
// random -- and an opt-out is the one status the academy is not free to
// clear, because clearing it would be mailing somebody who asked not to be.
//
// TWO METHODS, ONE EFFECT:
//   GET   a person clicked the link  -> redirected to a confirmation page on
//         the app's own host (landing.ts says why it is not served from here)
//   POST  a mail client acted on the List-Unsubscribe-Post header (RFC 8058
//         one-click) -> 200 and an empty body, which is all it reads
//
// AND ONE WAY BACK: POST with `a=resubscribe` is the "Resubscribe" button on
// the confirmation page, carrying the same signed link. It reverses an
// unsubscribe and nothing else -- a bounce or a spam report is not the
// member's click to undo here -- and answers with a redirect to /resubscribed.
// An opt-out stays the member's alone to undo: the signed link is the proof
// that this is the member, exactly as it is for the opt-out itself. A mail
// client's one-click POST never carries `a`, so it can only ever unsubscribe.
//
// WHAT AN INVALID LINK IS TOLD: that the link did not work, and nothing else.
// Never whether the id existed. "No such member" and "wrong signature" have
// to be one answer, or the endpoint becomes a way to test whether a UUID is
// somebody's -- the enumeration mistake TD-017 already records once.
import { adminClient } from '../_shared/db.ts';
import { unquoteSecret } from '../_shared/from-address.ts';
import { unsubscribeTokenValid } from '../_shared/unsubscribe-token.ts';
import { appOrigin, landing, resubscribeStep } from './landing.ts';

const UNSUBSCRIBE_SECRET = (() => {
  // unquoteSecret for the reason SETUP.md records: a secret set through a
  // shell keeps its quote characters, and a signature checked against a
  // quoted key never matches -- here that would turn every real unsubscribe
  // link in every email already sent into a dead one.
  const raw = Deno.env.get('UNSUBSCRIBE_SECRET');
  return raw ? unquoteSecret(raw) : '';
})();

/**
 * Where GET sends the person afterwards. Read once, like the secret above:
 * APP_ORIGIN when this deployment sets one, the recorded production host when
 * it does not, and null -- plain text, no redirect -- when it is set to
 * something that is not an https origin.
 */
const APP_ORIGIN = appOrigin(Deno.env.get('APP_ORIGIN'));
if (!APP_ORIGIN) {
  console.error('unsubscribe: APP_ORIGIN is not an https origin -- answering in plain text instead of redirecting.');
}

/** This function's own public address, which the confirmation page posts the
 *  Resubscribe button back to. SUPABASE_URL is injected by the runtime. */
const FUNCTION_URL = `${(Deno.env.get('SUPABASE_URL') ?? '').replace(/\/+$/, '')}/functions/v1/unsubscribe`;

Deno.serve(async (req) => {
  const method = req.method;
  if (method !== 'GET' && method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  // One-click posts `List-Unsubscribe=One-Click` as its body and reads only
  // the status code. The body is drained and discarded rather than parsed:
  // there is nothing in it this endpoint needs, and the id is in the URL.
  if (method === 'POST') await req.text().catch(() => '');

  const url = new URL(req.url);
  // The page's button, not a mail client: see the header.
  const resubscribe = method === 'POST' && url.searchParams.get('a') === 'resubscribe';

  const db = adminClient();

  // The academy's own name, for the page. Best-effort: a member who reached a
  // confirmation page should not meet a 500 because a settings row was slow.
  let academy = 'RosiFit Academy';
  try {
    const { data } = await db.from('app_settings').select('academy_name').eq('id', 1).single();
    if (data?.academy_name) academy = String(data.academy_name);
  } catch { /* keep the default */ }

  // ONE answer for every way this can fail. Built once so no branch can drift
  // into saying something more specific than another.
  // The words are kept here, beside the decision, for the plain-text answer;
  // the app's pages carry the same sentences (public/unsubscribed.html,
  // public/unsubscribe-failed.html).
  const neutral = () => method === 'POST' && !resubscribe
    ? new Response(null, { status: 200 })
    : landing('failed', APP_ORIGIN, {
      heading: 'This link did not work',
      body: 'The link may be incomplete or out of date. Try copying the whole address '
        + 'from the email, or reply to it and we will sort it out.',
      academy,
    });

  // `offerUndo` only where there is an address to put back: a correctly signed
  // link whose row has gone is confirmed, but has nothing to resubscribe.
  const confirmed = (offerUndo: boolean) => method === 'POST'
    ? new Response(null, { status: 200 })
    : landing('unsubscribed', APP_ORIGIN, {
      heading: 'You are unsubscribed',
      body: 'We will not send any more attendance follow-ups to this address.',
      academy,
    }, offerUndo ? { e: memberEmailId, t: token, fn: FUNCTION_URL } : undefined);

  const resubscribed = () => landing('resubscribed', APP_ORIGIN, {
    heading: 'You are subscribed again',
    body: 'We will send attendance follow-ups to this address again.',
    academy,
  });

  const memberEmailId = url.searchParams.get('e') ?? '';
  const token = url.searchParams.get('t') ?? '';

  if (!UNSUBSCRIBE_SECRET) {
    // Refuse rather than pretend. Without the key no signature can be
    // checked, and answering "you are unsubscribed" to a link this
    // deployment cannot verify would be a confirmation of nothing.
    console.error('unsubscribe: UNSUBSCRIBE_SECRET is not set -- every link is refused.');
    return neutral();
  }
  if (!await unsubscribeTokenValid(memberEmailId, token, UNSUBSCRIBE_SECRET)) return neutral();

  const { data: row, error: readErr } = await db.from('member_emails')
    .select('id, member_id, status')
    .eq('id', memberEmailId)
    .is('deleted_at', null)
    .maybeSingle();
  if (readErr) {
    console.error('unsubscribe: could not read the address', readErr.message);
    return neutral();
  }

  // A correctly signed link whose row is gone gets the CONFIRMATION, not the
  // failure page. The signature proves the link is one this academy sent, so
  // there is nothing to hide from its holder, and the promise it makes is
  // already true -- a deleted address cannot be mailed. Telling that person
  // "this link did not work" would invite them to try again.
  if (resubscribe) {
    // The rule is resubscribeStep's (landing.ts, with its spec). No address
    // left, or a bounce or spam report, gets the link-did-not-work page rather
    // than a claim of a subscription that is not there; already on is the
    // same answer as done, with no write and no second audit row.
    const step = resubscribeStep(row?.status);
    if (step === 'already') return resubscribed();
    if (step !== 'write' || !row) return neutral();

    // 'unknown', as reinstate_member_email (0078) and every new address use:
    // the next send finds out afresh whether the address takes mail.
    const { error: backErr } = await db.from('member_emails')
      .update({ status: 'unknown' })
      .eq('id', row.id)
      .eq('status', 'unsubscribed')
      .is('deleted_at', null);
    if (backErr) {
      console.error('unsubscribe: could not save the resubscribe', backErr.message);
      return neutral();
    }
    // The member's own act, filed the way the opt-out is (audit_log_anon, 0065).
    const { error: backAuditErr } = await db.rpc('audit_log_anon', {
      p_action: 'communication.resubscribed',
      p_entity_type: 'member_email',
      p_entity_id: row.id,
      p_changes: [{ field: 'status', old: row.status, new: 'unknown' }],
      p_metadata: { member_id: row.member_id, via: 'resubscribe_button' },
    });
    if (backAuditErr) console.error('unsubscribe: could not audit the resubscribe', backAuditErr.message);
    return resubscribed();
  }

  if (!row) return confirmed(false);

  // Idempotent, and quiet about it. Clicking twice must not error, and must
  // not write a second audit row saying something changed when nothing did.
  if (row.status === 'unsubscribed') return confirmed(true);

  const { error: updErr } = await db.from('member_emails')
    .update({ status: 'unsubscribed' })
    .eq('id', row.id)
    .is('deleted_at', null);
  if (updErr) {
    console.error('unsubscribe: could not save the opt-out', updErr.message);
    return neutral();
  }

  // actor_kind 'anon', through audit_log_anon (0065). Not audit_log(): on the
  // service-role client that derives 'system', which would file a member's
  // own decision as something the academy did to the member. Not audit_log_as():
  // there is no app_user to name -- members do not have accounts.
  const { error: auditErr } = await db.rpc('audit_log_anon', {
    p_action: 'communication.unsubscribed',
    p_entity_type: 'member_email',
    p_entity_id: row.id,
    p_changes: [{ field: 'status', old: row.status, new: 'unsubscribed' }],
    p_metadata: { member_id: row.member_id, via: method === 'POST' ? 'one_click' : 'link' },
  });
  // The opt-out has already been saved. Losing its log entry is worth
  // knowing about and is not worth telling the member the click failed --
  // that invites a second click, which is a no-op anyway.
  if (auditErr) console.error('unsubscribe: could not audit the opt-out', auditErr.message);

  return confirmed(true);
});
