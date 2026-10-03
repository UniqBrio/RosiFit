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
// A GET NEVER WRITES (requests/2026-10-01-unsubscribe-get-confirms.md).
// Link scanners -- mail security gateways, the mailbox provider's own
// safe-browsing fetch -- open every link in a message before the member
// does. Production has seen them hit these links. So a GET that opted the
// address out was an opt-out the member never made. Now:
//   GET   the link was opened -> redirected to a page on the app's own host
//         (landing.ts says why it is not served from here) that ASKS. Nothing
//         is written and nothing is audited. An address that is already off
//         goes straight to the confirmation, as before.
//   POST  `a=unsubscribe`: the member pressed Unsubscribe on that page ->
//         written, audited `via: link`, redirected to the confirmation.
//   POST  with no `a`: a mail client acted on the List-Unsubscribe-Post header
//         (RFC 8058 one-click: Gmail's own "Unsubscribe" beside the sender) ->
//         written at once, audited `via: one_click`, 200 and an empty body,
//         which is all it reads. No cookie, session, Authorization header or
//         redirect is needed or given. RFC 8058 exists so that this POST, and
//         not a GET, is the unattended opt-out.
// Both writes are the SAME write to the same row with the same audit action:
// one subscription state, two ways in. Old links keep working: the same
// `?e=&t=` now opens the question instead of answering it.
//
// THE OPT-OUT NEVER WEAKENS A SUPPRESSION. 'unknown', 'valid' and 'bounced'
// become 'unsubscribed' (the member's word outranks a bounce, and the bounce
// stays readable as the opt-out's "before"). 'complained' is left as it is: a
// spam report already stops every send and is the stronger record.
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
import { appOrigin, landing, mayOfferResubscribe, resubscribeStep } from './landing.ts';

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
  // Read before any closure below captures them.
  const memberEmailId = url.searchParams.get('e') ?? '';
  const token = url.searchParams.get('t') ?? '';
  // The page's button, not a mail client: see the header.
  const resubscribe = method === 'POST' && url.searchParams.get('a') === 'resubscribe';
  // The question page's own button: an explicit press, never a fetch.
  const pressedUnsubscribe = method === 'POST' && url.searchParams.get('a') === 'unsubscribe';
  // RFC 8058: the only POST that carries no `a`. Answered in status codes.
  const oneClick = method === 'POST' && !url.searchParams.has('a');

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
  const neutral = () => oneClick
    ? new Response(null, { status: 200 })
    : landing('failed', APP_ORIGIN, {
      heading: 'This link did not work',
      body: 'The link may be incomplete or out of date. Try copying the whole address '
        + 'from the email, or reply to it and we will sort it out.',
      academy,
    });

  // `offerUndo` only where there is an address to put back: a correctly signed
  // link whose row has gone is confirmed, but has nothing to resubscribe.
  const confirmed = (offerUndo: boolean) => oneClick
    ? new Response(null, { status: 200 })
    : landing('unsubscribed', APP_ORIGIN, {
      heading: 'You are unsubscribed',
      body: 'We will not send any more attendance follow-ups to this address.',
      academy,
    }, offerUndo ? { e: memberEmailId, t: token, fn: FUNCTION_URL } : undefined);

  // The question, for a GET of a link whose address is still on. Carries the
  // same signed pair the link did, so the page's button can post it back.
  const ask = () => landing('confirm', APP_ORIGIN, {
    heading: 'Unsubscribe from attendance follow-ups?',
    body: 'Press Unsubscribe to stop attendance follow-ups to this address.',
    academy,
  }, { e: memberEmailId, t: token, fn: FUNCTION_URL });

  const resubscribed = () => landing('resubscribed', APP_ORIGIN, {
    heading: 'You are subscribed again',
    body: 'We will send attendance follow-ups to this address again.',
    academy,
  });

  if (!UNSUBSCRIBE_SECRET) {
    // Refuse rather than pretend. Without the key no signature can be
    // checked, and answering "you are unsubscribed" to a link this
    // deployment cannot verify would be a confirmation of nothing.
    console.error('unsubscribe: UNSUBSCRIBE_SECRET is not set -- every link is refused.');
    return neutral();
  }
  if (!await unsubscribeTokenValid(memberEmailId, token, UNSUBSCRIBE_SECRET)) return neutral();
  // A POST with an `a` that is neither button is nobody's request.
  if (method === 'POST' && !oneClick && !resubscribe && !pressedUnsubscribe) return neutral();

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
  // What the address was just before its latest opt-out -- by the link or by
  // Gmail's one-click alike -- from the row audit every writer produces
  // (email_status_before_opt_out, 0084). It used to read only this
  // function's own `communication.unsubscribed` row, which one live opt-out
  // does not have. Read only for an address that IS unsubscribed: it decides
  // whether the page offers Resubscribe, and whether a press of it is
  // honoured. Null when unknown, which offers nothing and is never guessed.
  const statusBeforeOptOut = async (): Promise<string | null> => {
    if (!row || row.status !== 'unsubscribed') return null;
    const { data, error } = await db.rpc('email_status_before_opt_out', {
      p_member_email_id: row.id,
    });
    if (error) {
      console.error('unsubscribe: could not read the opt-out history', error.message);
      return null;
    }
    return typeof data === 'string' ? data : null;
  };

  if (resubscribe) {
    // The rule is resubscribeStep's (landing.ts, with its spec). No address
    // left, a bounce or spam report -- now or just before the opt-out -- gets
    // the link-did-not-work page rather than a claim of a subscription that
    // is not there; already on is the same answer as done, with no write and
    // no second audit row.
    const step = resubscribeStep(row?.status, await statusBeforeOptOut());
    if (step === 'already') return resubscribed();
    if (step !== 'write' || !row) return neutral();

    // 'unknown', as reinstate_member_email (0078) and every new address use:
    // the next send finds out afresh whether the address takes mail.
    const { data: moved, error: backErr } = await db.from('member_emails')
      .update({ status: 'unknown' })
      .eq('id', row.id)
      .eq('status', 'unsubscribed')
      .is('deleted_at', null)
      .select('id');
    if (backErr) {
      console.error('unsubscribe: could not save the resubscribe', backErr.message);
      return neutral();
    }
    // Nothing moved: a second press raced this one, or the status changed in
    // between. No audit row for a change that did not happen; the page then
    // says whatever the address now is.
    if (!moved || moved.length === 0) {
      const { data: now } = await db.from('member_emails').select('status')
        .eq('id', row.id).is('deleted_at', null).maybeSingle();
      return now && (now.status === 'unknown' || now.status === 'valid') ? resubscribed() : neutral();
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
  // The button is offered only where pressing it would be honoured.
  if (row.status === 'unsubscribed') return confirmed(mayOfferResubscribe(await statusBeforeOptOut()));
  // A spam report already stops every send, and is not overwritten.
  if (row.status === 'complained') return confirmed(false);

  // A GET only asks. Whoever opened the link -- the member, or a scanner
  // before the member -- gets the question; the answer is a POST.
  if (method === 'GET') return ask();

  // Guarded on the status just read, so a complaint that lands in between is
  // never overwritten either.
  const { data: written, error: updErr } = await db.from('member_emails')
    .update({ status: 'unsubscribed' })
    .eq('id', row.id)
    .in('status', ['unknown', 'valid', 'bounced'])
    .is('deleted_at', null)
    .select('id');
  if (updErr) {
    console.error('unsubscribe: could not save the opt-out', updErr.message);
    return neutral();
  }
  if (!written || written.length === 0) {
    // Something else wrote in between (a second click, a complaint). The
    // promise holds only if nothing can be sent there now.
    const { data: now } = await db.from('member_emails').select('status')
      .eq('id', row.id).is('deleted_at', null).maybeSingle();
    return !now || ['unsubscribed', 'complained', 'bounced'].includes(now.status)
      ? confirmed(false) : neutral();
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
    p_metadata: { member_id: row.member_id, via: oneClick ? 'one_click' : 'link' },
  });
  // The opt-out has already been saved. Losing its log entry is worth
  // knowing about and is not worth telling the member the click failed --
  // that invites a second click, which is a no-op anyway.
  if (auditErr) console.error('unsubscribe: could not audit the opt-out', auditErr.message);

  // Offered only when the address could be written to before this opt-out: a
  // bounced or spam-reported address unsubscribed now is not one to put back.
  return confirmed(mayOfferResubscribe(row.status));
});
