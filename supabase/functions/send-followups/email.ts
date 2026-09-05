// EmailProvider abstraction (plan section: "an EmailProvider interface with
// two impls -- AWS SES; dev/log for local"). send-followups depends only on
// this interface, never on SES or console.log directly, so a third provider
// is a third class, not a rewrite of the send flow.

import { unquoteSecret, isFromAddress } from '../_shared/from-address.ts';

export type EmailMessage = { to: string; subject: string; text: string };
export type EmailResult = { ok: boolean; providerMessageId?: string; error?: string };

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<EmailResult>;
}

/** Local/dev: writes the email to the function log instead of sending it.
 *  This is what the harness's end-to-end send verification uses. */
export class DevEmailProvider implements EmailProvider {
  readonly name = 'dev';
  send(msg: EmailMessage): Promise<EmailResult> {
    console.log(`[dev-email] to=${msg.to} subject=${JSON.stringify(msg.subject)}\n${msg.text}\n---`);
    return Promise.resolve({ ok: true, providerMessageId: `dev-${crypto.randomUUID()}` });
  }
}

// ------------------------------------------------------------- AWS SES v2
// Hand-rolled SigV4 over fetch + Web Crypto rather than the AWS SDK: the SDK
// assumes Node's http/https stack, which the Edge Runtime does not provide,
// and pulling it in as an npm: specifier for one REST call was not worth the
// bundle size or the compatibility risk.

async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(msg));
}
async function hmacHex(key: ArrayBuffer | Uint8Array, msg: string): Promise<string> {
  const sig = await hmac(key, msg);
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function sha256Hex(msg: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sesSendEmail(
  region: string, accessKeyId: string, secretAccessKey: string, bodyObj: unknown
): Promise<Response> {
  const service = 'ses';
  const host = `email.${region}.amazonaws.com`;
  const path = '/v2/email/outbound-emails';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const body = JSON.stringify(bodyObj);
  const payloadHash = await sha256Hex(body);

  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';
  const canonicalRequest = ['POST', path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');

  const kDate = await hmac(new TextEncoder().encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = await hmacHex(kSigning, stringToSign);

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(`https://${host}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Amz-Date': amzDate, Authorization: authorization },
    body,
  });
}

export class SesEmailProvider implements EmailProvider {
  readonly name = 'ses';
  constructor(
    private region: string, private accessKeyId: string,
    private secretAccessKey: string, private fromAddress: string,
    /** SES configuration set, if the account uses one. Optional: it turns on
     *  SES's own open/bounce/complaint tracking and changes nothing here when
     *  absent. */
    private configSet?: string,
  ) {}

  async send(msg: EmailMessage): Promise<EmailResult> {
    try {
      const res = await sesSendEmail(this.region, this.accessKeyId, this.secretAccessKey, {
        FromEmailAddress: this.fromAddress,
        ...(this.configSet ? { ConfigurationSetName: this.configSet } : {}),
        Destination: { ToAddresses: [msg.to] },
        Content: {
          Simple: {
            Subject: { Data: msg.subject, Charset: 'UTF-8' },
            Body: { Text: { Data: msg.text, Charset: 'UTF-8' } },
          },
        },
      });
      const text = await res.text();
      if (!res.ok) return { ok: false, error: `SES ${res.status}: ${text.slice(0, 300)}` };
      const parsed = JSON.parse(text) as { MessageId?: string };
      return { ok: true, providerMessageId: parsed.MessageId };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

/** EMAIL_PROVIDER=ses with complete AWS_* secrets -> SES. Anything else,
 *  including local dev where those secrets are never set, -> the dev
 *  provider. Never throws: a missing secret degrades to logging, not 500s. */
/**
 * Which provider, and WHAT IS MISSING if it is not the real one.
 *
 * The old version answered only the first half and fell back to the dev
 * provider with a console.warn nobody reads. A send then recorded
 * `status='sent'` for every recipient and delivered nothing — the exact
 * "looks successful, sent nothing" failure SETUP.md warns about, and it
 * happened: a live send on 05-Sep-2026 wrote provider='dev'.
 *
 * So `missing` comes back with it, and the caller refuses rather than
 * reporting a delivery it did not make.
 *
 * TWO NAMES PER SECRET, on purpose. `AWS_REGION` and `SES_FROM_ADDRESS` are
 * what this file has always read; `AWS_SES_REGION` and `SES_FROM` are what
 * somebody setting these up actually reaches for, and both were set on this
 * project before anyone noticed the mismatch. Accepting both costs one
 * `??` and removes a class of silent misconfiguration.
 */
export function resolveEmailProvider(): { provider: EmailProvider; problems: string[] } {
  // unquoteSecret, not just trim: a value set through a shell keeps its
  // wrapping quote characters, and every consumer below sees them as content.
  const env = (...names: string[]): string | undefined => {
    for (const n of names) {
      const v = Deno.env.get(n);
      if (v) {
        const clean = unquoteSecret(v);
        if (clean) return clean;
      }
    }
    return undefined;
  };

  // Explicitly asking for the dev provider is a real answer, and the only one
  // that lets a deployment log mail instead of sending it on purpose.
  if (env('EMAIL_PROVIDER') === 'dev') return { provider: new DevEmailProvider(), problems: [] };

  const region = env('AWS_REGION', 'AWS_SES_REGION');
  const accessKeyId = env('AWS_ACCESS_KEY_ID');
  const secretAccessKey = env('AWS_SECRET_ACCESS_KEY');
  const from = env('SES_FROM_ADDRESS', 'SES_FROM');
  const configSet = env('SES_CONFIG_SET');

  const problems: string[] = [];
  if (!region) problems.push('AWS_REGION (or AWS_SES_REGION) is not set');
  if (!accessKeyId) problems.push('AWS_ACCESS_KEY_ID is not set');
  if (!secretAccessKey) problems.push('AWS_SECRET_ACCESS_KEY is not set');
  if (!from) {
    problems.push('SES_FROM_ADDRESS (or SES_FROM) is not set');
  } else if (!isFromAddress(from)) {
    // The VALUE, quoted back. It is a from-address -- it appears on every
    // email this academy sends -- so showing it leaks nothing and is the only
    // thing that makes the error actionable.
    problems.push(
      `SES_FROM_ADDRESS (or SES_FROM) is "${from}", which is not an email address. `
      + 'Use name@example.com, or "Academy <name@example.com>" with the angle brackets');
  }

  if (problems.length === 0) {
    return {
      provider: new SesEmailProvider(region!, accessKeyId!, secretAccessKey!, from!, configSet),
      problems: [],
    };
  }
  // EMAIL_PROVIDER is no longer the switch. Four complete AWS values ARE the
  // switch: a deployment that has them means to send, and one that does not
  // cannot. A separate flag was one more thing to forget, and forgetting it
  // looked exactly like success.
  return { provider: new DevEmailProvider(), problems };
}

/** Kept for callers that only want the provider. */
export function getEmailProvider(): EmailProvider {
  return resolveEmailProvider().provider;
}
