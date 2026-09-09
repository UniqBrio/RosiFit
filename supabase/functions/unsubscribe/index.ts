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
//   GET   a person clicked the link  -> a small confirmation page
//   POST  a mail client acted on the List-Unsubscribe-Post header (RFC 8058
//         one-click) -> 200 and an empty body, which is all it reads
//
// WHAT AN INVALID LINK IS TOLD: that the link did not work, and nothing else.
// Never whether the id existed. "No such member" and "wrong signature" have
// to be one answer, or the endpoint becomes a way to test whether a UUID is
// somebody's -- the enumeration mistake TD-017 already records once.
import { adminClient } from '../_shared/db.ts';
import { unquoteSecret } from '../_shared/from-address.ts';
import { unsubscribeTokenValid } from '../_shared/unsubscribe-token.ts';

const UNSUBSCRIBE_SECRET = (() => {
  // unquoteSecret for the reason SETUP.md records: a secret set through a
  // shell keeps its quote characters, and a signature checked against a
  // quoted key never matches -- here that would turn every real unsubscribe
  // link in every email already sent into a dead one.
  const raw = Deno.env.get('UNSUBSCRIBE_SECRET');
  return raw ? unquoteSecret(raw) : '';
})();

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * The page, both outcomes.
 *
 * Inline styles and no assets on purpose: this is opened from a mail client's
 * browser, often on a phone, often on a bad connection, and a stylesheet that
 * has not arrived would leave the member staring at unstyled text wondering
 * whether it worked. 16px minimum, one column, generous line height.
 *
 * Colours are literal here and only here. src/theme/tokens.ts is a React
 * Native module an Edge Function cannot import, and this page renders in a
 * browser that never loads the app -- so the token gate does not reach it.
 * They are plain near-black on white, which needs no measurement to clear
 * 4.5:1 (#1a1a1a on #ffffff is 16.1:1).
 */
function page(heading: string, body: string, academy: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:32px 20px;background:#ffffff;color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;">
<div style="max-width:34em;margin:0 auto;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;">${escapeHtml(heading)}</h1>
<p style="margin:0 0 16px;">${escapeHtml(body)}</p>
<p style="margin:24px 0 0;font-size:14px;color:#4a4a4a;">${escapeHtml(academy)}</p>
</div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async (req) => {
  const method = req.method;
  if (method !== 'GET' && method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  // One-click posts `List-Unsubscribe=One-Click` as its body and reads only
  // the status code. The body is drained and discarded rather than parsed:
  // there is nothing in it this endpoint needs, and the id is in the URL.
  if (method === 'POST') await req.text().catch(() => '');

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
  const neutral = () => method === 'POST'
    ? new Response(null, { status: 200 })
    : page(
      'This link did not work',
      'The link may be incomplete or out of date. Try copying the whole address '
      + 'from the email, or reply to it and we will sort it out.',
      academy);

  const confirmed = () => method === 'POST'
    ? new Response(null, { status: 200 })
    : page(
      'You are unsubscribed',
      'We will not send any more attendance follow-ups to this address. '
      + 'If this was a mistake, reply to any earlier email and we will turn them back on.',
      academy);

  const url = new URL(req.url);
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
  if (!row) return confirmed();

  // Idempotent, and quiet about it. Clicking twice must not error, and must
  // not write a second audit row saying something changed when nothing did.
  if (row.status === 'unsubscribed') return confirmed();

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

  return confirmed();
});
