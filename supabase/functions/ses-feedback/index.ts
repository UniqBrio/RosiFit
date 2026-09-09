// ses-feedback: AWS SES bounce and complaint notifications, delivered over
// SNS, written onto member_emails.status -- which send-followups already
// checks before it sends. No human step is involved, and none should be: a
// bounce that waits for somebody to read it is a bounce that gets sent to
// again.
//
// MUST BE DEPLOYED WITH verify_jwt=false. SNS cannot send a Supabase auth
// header, so with JWT verification on every notification 401s, the
// subscription never confirms, and nothing anywhere says so -- the AWS
// console just shows "Pending confirmation" forever. This project has
// already shipped one function whose public-ness was lost on a redeploy
// (auth-lookup, SETUP.md), so it is written here as well as in the deploy
// command: `supabase functions deploy ses-feedback --no-verify-jwt`.
//
// WHO IS ALLOWED TO POST HERE, and why it takes two answers:
//   1. a shared secret in `?s=`, compared in constant time; and
//   2. TopicArn equal to SES_SNS_TOPIC_ARN.
// The secret alone would be enough for anyone who ever saw a function URL in
// a log; the ARN alone is public information printed in every AWS console.
// Together they mean a forged suppression -- which silently stops a member
// hearing from the academy -- needs both.
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   SES_SNS_TOPIC_ARN    the exact ARN of the SNS topic in ap-south-1
//   SES_FEEDBACK_SECRET  a long random string, also the ?s= in the URL given
//                        to SNS
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the runtime.
//
// NO CORS, deliberately. Every other function in this tree calls
// handlePreflight because a browser calls it. Nothing in a browser ever calls
// this one; SNS is a server, and a preflight it never sends does not need
// answering.
import { adminClient } from '../_shared/db.ts';
import { unquoteSecret } from '../_shared/from-address.ts';

const EXPECTED_TOPIC_ARN = secret('SES_SNS_TOPIC_ARN');
const FEEDBACK_SECRET = secret('SES_FEEDBACK_SECRET');

/** unquoteSecret, not just trim. A value set through PowerShell keeps its
 *  wrapping quote characters and every consumer sees them as content -- which
 *  here would mean the constant-time compare never matches and every real
 *  notification 403s. That exact mistake has been made on this project once
 *  already, with SES_FROM_ADDRESS (SETUP.md). */
function secret(name: string): string {
  const raw = Deno.env.get(name);
  return raw ? unquoteSecret(raw) : '';
}

/** Constant-time-ish compare, so the secret cannot be rebuilt one character
 *  at a time from response timings. Length leaks and may: it is fixed. */
function secretMatches(given: string | null): boolean {
  if (!FEEDBACK_SECRET || !given) return false;
  if (given.length !== FEEDBACK_SECRET.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) {
    diff |= given.charCodeAt(i) ^ FEEDBACK_SECRET.charCodeAt(i);
  }
  return diff === 0;
}

/** SNS only ever asks us to confirm a subscription at an amazonaws.com host.
 *  Refusing anything else stops this endpoint being turned into an arbitrary
 *  outbound request by anyone who can post a JSON body to it. */
function isAwsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && /(^|\.)amazonaws\.com$/.test(u.hostname);
  } catch {
    return false;
  }
}

/** Plain text, not JSON. The client is SNS, which reads the status code and
 *  discards the body. */
function text(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
}

/**
 * The raw audit trail: every notification is recorded BEFORE anything acts on
 * it, including the ones that go on to be ignored. When somebody asks why a
 * member stopped receiving mail, this table is the answer, and an event that
 * was only recorded when it had an effect could not answer it.
 *
 * upsert, not insert. email_events carries
 * `unique (provider, provider_message_id, event_type)` (0009) for webhook
 * idempotency, and SNS retries -- so the second delivery of one notification
 * is a constraint violation, not an error. ignoreDuplicates keeps the first
 * copy, which is the one that arrived.
 */
async function recordEvent(
  db: ReturnType<typeof adminClient>,
  eventType: string, messageId: string | null, payload: unknown,
) {
  const { error } = await db.from('email_events').upsert({
    provider: 'ses',
    provider_message_id: messageId ?? '',
    event_type: eventType,
    payload,
  }, { onConflict: 'provider,provider_message_id,event_type', ignoreDuplicates: true });
  // Logged, never thrown. Losing the audit row must not cost us the
  // suppression that follows it -- and must not make us answer non-2xx, which
  // would have SNS retry and eventually disable the subscription.
  if (error) console.error('ses-feedback: could not record event', eventType, error.message);
}

/**
 * Writes the suppression onto every address named in the notification.
 *
 * BY ADDRESS, not by message linkage. email_messages.member_email_id is
 * frequently null, so following it would silently suppress nobody for exactly
 * the messages we most need to act on. `email` is citext, so the match is
 * already case-insensitive.
 *
 * `.neq('status','unsubscribed')` is the one rule that outranks this: a
 * member who opted out has said something deliberate, and a later
 * bounce must not overwrite it with a state the academy could clear.
 */
async function suppressAddresses(
  db: ReturnType<typeof adminClient>, addresses: string[], status: string,
) {
  for (const raw of addresses) {
    const address = (raw ?? '').trim();
    if (!address) continue;
    // updated_at is left to the member_emails_updated_at trigger (0006)
    // rather than written here, so one clock sets it for every writer.
    const { error } = await db.from('member_emails')
      .update({ status })
      .eq('email', address)
      .neq('status', 'unsubscribed')
      .is('deleted_at', null);
    if (error) console.error('ses-feedback: could not suppress an address', error.message);
  }
}

/** Best-effort, so the batch history is honest about what became of a
 *  message. Best-effort because provider_message_id is only set for messages
 *  this project actually sent through SES: a notification for anything else
 *  matches no row, which is not a failure. */
async function markMessage(
  db: ReturnType<typeof adminClient>, messageId: string | null, status: string,
) {
  if (!messageId) return;
  const { error } = await db.from('email_messages')
    .update({ status }).eq('provider_message_id', messageId);
  if (error) console.error('ses-feedback: could not mark a message', error.message);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return text('Method not allowed', 405);

  // REFUSE RATHER THAN PRETEND, and refuse FIRST. A deployment missing either
  // secret cannot authenticate anybody, so it accepts nobody -- it does not
  // fall through to accepting everybody. Same shape as send-followups'
  // 503-naming-the-fix for the AWS secrets, for the same reason: the
  // failure that costs the most here is the one that looks like success.
  if (!FEEDBACK_SECRET || !EXPECTED_TOPIC_ARN) {
    console.error(
      'ses-feedback: refusing every notification -- '
      + `${!FEEDBACK_SECRET ? 'SES_FEEDBACK_SECRET' : 'SES_SNS_TOPIC_ARN'} is not set.`);
    return text('Not configured', 403);
  }

  const url = new URL(req.url);
  if (!secretMatches(url.searchParams.get('s'))) return text('Forbidden', 403);

  let envelope: Record<string, unknown>;
  try {
    // SNS posts JSON and labels it text/plain, so req.json() would refuse it.
    // The raw body is parsed by hand.
    envelope = JSON.parse(await req.text());
  } catch {
    return text('Bad request', 400);
  }

  if (String(envelope.TopicArn ?? '') !== EXPECTED_TOPIC_ARN) return text('Forbidden', 403);

  const db = adminClient();
  const snsType = String(envelope.Type ?? '');

  // The one-time handshake. SNS delivers nothing at all until this URL is
  // fetched, so a subscription that never confirms is a silent no-op -- the
  // most common way this whole mechanism fails.
  if (snsType === 'SubscriptionConfirmation') {
    const subscribeUrl = String(envelope.SubscribeURL ?? '');
    if (!isAwsUrl(subscribeUrl)) {
      console.error('ses-feedback: refused a SubscribeURL that was not an https amazonaws.com host');
      return text('Bad subscribe URL', 400);
    }
    // Named in the log either way. A handshake that quietly failed leaves the
    // AWS console saying "Pending confirmation" and nothing saying why.
    try {
      const res = await fetch(subscribeUrl);
      console.log(`ses-feedback: subscription confirmation fetched, SNS answered ${res.status}`);
    } catch (err) {
      console.error('ses-feedback: could not fetch the SubscribeURL', err);
    }
    await recordEvent(db, 'SubscriptionConfirmation', null, envelope);
    return text('Subscription confirmed', 200);
  }

  if (snsType === 'UnsubscribeConfirmation') {
    await recordEvent(db, 'UnsubscribeConfirmation', null, envelope);
    return text('OK', 200);
  }

  if (snsType !== 'Notification') return text('Ignored', 200);

  let ses: Record<string, unknown>;
  try {
    // The SES payload is a JSON *string* inside the SNS envelope's Message,
    // not a nested object. It is parsed separately.
    ses = JSON.parse(String(envelope.Message ?? '{}'));
  } catch {
    await recordEvent(db, 'Unparseable', null, envelope);
    return text('OK', 200);
  }

  // Identity-level notifications carry notificationType; configuration-set
  // event publishing carries eventType. Either is accepted, because which one
  // arrives depends on how the topic was wired in AWS rather than on anything
  // this repo controls.
  const kind = String(ses.notificationType ?? ses.eventType ?? 'Unknown');
  const mail = ses.mail as { messageId?: string } | undefined;
  const messageId: string | null = mail?.messageId ?? null;

  await recordEvent(db, kind, messageId, ses);

  if (kind === 'Bounce') {
    const bounce = ses.bounce as
      { bounceType?: string; bouncedRecipients?: Array<{ emailAddress?: string }> } | undefined;
    const recipients = (bounce?.bouncedRecipients ?? [])
      .map((r) => r?.emailAddress).filter((a): a is string => Boolean(a));

    // ONLY a permanent bounce suppresses. A Transient bounce is a full mailbox
    // or a server having a bad morning; suppressing on it would permanently
    // lose a member who is perfectly reachable next week, and nothing in the
    // app would ever put that member back.
    if (bounce?.bounceType === 'Permanent') {
      await suppressAddresses(db, recipients, 'bounced');
      await markMessage(db, messageId, 'bounced');
    }
    return text('OK', 200);
  }

  if (kind === 'Complaint') {
    const complaint = ses.complaint as
      { complainedRecipients?: Array<{ emailAddress?: string }> } | undefined;
    const recipients = (complaint?.complainedRecipients ?? [])
      .map((r) => r?.emailAddress).filter((a): a is string => Boolean(a));

    // Always. Somebody pressing "this is spam" is not a transient condition,
    // and asking twice is how a sending reputation is lost.
    await suppressAddresses(db, recipients, 'complained');
    await markMessage(db, messageId, 'complained');
    return text('OK', 200);
  }

  if (kind === 'Delivery') {
    await markMessage(db, messageId, 'sent');
    return text('OK', 200);
  }

  // Anything else is recorded above and ignored here. 200, ALWAYS: a non-2xx
  // makes SNS retry, and enough retries make SNS disable the subscription --
  // at which point bounces stop arriving and nothing says so.
  return text('OK', 200);
});
