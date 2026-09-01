// EmailProvider abstraction (plan section: "an EmailProvider interface with
// two impls -- AWS SES; dev/log for local"). send-followups depends only on
// this interface, never on SES or console.log directly, so a third provider
// is a third class, not a rewrite of the send flow.

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
  ) {}

  async send(msg: EmailMessage): Promise<EmailResult> {
    try {
      const res = await sesSendEmail(this.region, this.accessKeyId, this.secretAccessKey, {
        FromEmailAddress: this.fromAddress,
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
export function getEmailProvider(): EmailProvider {
  const which = Deno.env.get('EMAIL_PROVIDER') ?? 'dev';
  if (which === 'ses') {
    const region = Deno.env.get('AWS_REGION');
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const from = Deno.env.get('SES_FROM_ADDRESS');
    if (region && accessKeyId && secretAccessKey && from) {
      return new SesEmailProvider(region, accessKeyId, secretAccessKey, from);
    }
    console.warn('[send-followups] EMAIL_PROVIDER=ses but AWS secrets are incomplete; using the dev provider.');
  }
  return new DevEmailProvider();
}
