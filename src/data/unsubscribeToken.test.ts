import test from 'node:test';
import assert from 'node:assert/strict';
import {
  signUnsubscribeId, constantTimeEquals, unsubscribeTokenValid, buildUnsubscribeUrl,
} from '../../supabase/functions/_shared/unsubscribe-token.ts';

// The rule these pin: a member_emails id ALONE must never be enough to opt
// somebody out. There are 687 live addresses on this project and the
// unsubscribe endpoint has, by design, no session -- so if the signature
// could be skipped, guessed or reused across ids, a stranger could walk
// UUIDs and silently cut members off from their academy.
//
// This imports the module the Edge Functions import. A copy of the signing
// code kept here would pass while production failed, which is the failure
// mode the exercise is about (the same reasoning fromAddress.test.ts records).

const SECRET = 'a-long-random-unsubscribe-secret-value';
const ID = '11111111-2222-3333-4444-555555555555';
const OTHER_ID = '99999999-8888-7777-6666-555555555555';

// ------------------------------------------------------------- the signature
test('a token verifies against the id it was minted for', async () => {
  const token = await signUnsubscribeId(ID, SECRET);
  assert.equal(await unsubscribeTokenValid(ID, token, SECRET), true);
});

test('a token minted for one id does not verify against another', async () => {
  // The whole point: holding your own link must not let you opt out anybody
  // else, and ids are sequentially guessable in a way secrets are not.
  const token = await signUnsubscribeId(OTHER_ID, SECRET);
  assert.equal(await unsubscribeTokenValid(ID, token, SECRET), false);
});

test('a tampered token is refused', async () => {
  const token = await signUnsubscribeId(ID, SECRET);
  const flipped = (token[0] === 'A' ? 'B' : 'A') + token.slice(1);
  assert.equal(await unsubscribeTokenValid(ID, flipped, SECRET), false);
});

test('a token minted under a different secret is refused', async () => {
  const token = await signUnsubscribeId(ID, 'some-other-secret');
  assert.equal(await unsubscribeTokenValid(ID, token, SECRET), false);
});

test('signing is deterministic, so a link keeps working after a redeploy', async () => {
  // Links live in email already sent. A token that changed per call would
  // make every previously delivered unsubscribe link dead.
  assert.equal(await signUnsubscribeId(ID, SECRET), await signUnsubscribeId(ID, SECRET));
});

// ------------------------------------------------- what must never validate
test('a missing token, id or secret is refused rather than waved through', async () => {
  const token = await signUnsubscribeId(ID, SECRET);
  assert.equal(await unsubscribeTokenValid(ID, '', SECRET), false);
  assert.equal(await unsubscribeTokenValid('', token, SECRET), false);
  // The one that matters most: a deployment with no UNSUBSCRIBE_SECRET must
  // refuse every link, not accept every link.
  assert.equal(await unsubscribeTokenValid(ID, token, ''), false);
});

// ------------------------------------------------------------------ encoding
test('the token is base64url: no +, / or = to be mangled in a query string', async () => {
  const token = await signUnsubscribeId(ID, SECRET);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  // HMAC-SHA256 is 32 bytes -> 43 base64 characters once the padding is cut.
  assert.equal(token.length, 43);
});

// -------------------------------------------------------- constant-time compare
test('constantTimeEquals answers the same as === for equal and unequal strings', () => {
  assert.equal(constantTimeEquals('abc', 'abc'), true);
  assert.equal(constantTimeEquals('abc', 'abd'), false);
  assert.equal(constantTimeEquals('abc', 'ab'), false);
  assert.equal(constantTimeEquals('', ''), true);
});

// ------------------------------------------------------------------- the link
test('the link carries both the id and its token, and one trailing slash cannot double it', async () => {
  const url = await buildUnsubscribeUrl(ID, SECRET, 'https://example.supabase.co/functions/v1/');
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, 'https://example.supabase.co/functions/v1/unsubscribe');
  assert.equal(parsed.searchParams.get('e'), ID);
  assert.equal(await unsubscribeTokenValid(ID, parsed.searchParams.get('t') ?? '', SECRET), true);
});

// ------------------------------------------ nothing stored keeps the link
// requests/2026-09-30-resubscribe-button.md: since the Resubscribe button the
// signed link can undo an opt-out, so no stored copy may keep it.
import { withoutUnsubscribeLinks, UNSUBSCRIBE_LINK_REMOVED } from '../../supabase/functions/_shared/unsubscribe-token.ts';

test('an SES notification keeps everything but the unsubscribe link', async () => {
  const link = await buildUnsubscribeUrl('7d1c1c2e-0000-4000-8000-000000000001', 'k', 'https://ref.supabase.co/functions/v1');
  const ses = {
    notificationType: 'Bounce',
    bounce: { bounceType: 'Permanent', bouncedRecipients: [{ emailAddress: 'a@example.com' }] },
    mail: {
      messageId: 'm-1',
      headers: [
        { name: 'Subject', value: 'We missed you' },
        { name: 'List-Unsubscribe', value: `<mailto:unsubscribe@getfit.rosifit.com>, <${link}>` },
      ],
    },
  };
  const kept = withoutUnsubscribeLinks(ses);
  const text = JSON.stringify(kept);
  assert.ok(!text.includes('/functions/v1/unsubscribe?'), 'the signed link must not survive');
  assert.ok(text.includes(UNSUBSCRIBE_LINK_REMOVED), 'and it says what was taken out');
  assert.equal(kept.mail.headers[1].value,
    `<mailto:unsubscribe@getfit.rosifit.com>, <${UNSUBSCRIBE_LINK_REMOVED}>`);
  assert.deepEqual(kept.bounce, ses.bounce, 'the bounce itself is untouched');
  assert.equal(kept.mail.headers[0].value, 'We missed you');
});

test('a payload with no link comes back as it was', () => {
  const plain = { notificationType: 'Complaint', mail: { messageId: 'm-2' } };
  assert.equal(withoutUnsubscribeLinks(plain), plain);
  assert.equal(withoutUnsubscribeLinks(null), null);
});

// ------------------------------------------- the headers Gmail reads (RFC 8058)
// Appended 01-Oct-2026 (requests/2026-10-01-resubscribe-recovery-and-gmail-one-click.md).
import { listUnsubscribeHeaders } from '../../supabase/functions/_shared/unsubscribe-token.ts';

test('List-Unsubscribe carries the signed HTTPS link ONLY, with the one-click flag beside it', async () => {
  const url = await buildUnsubscribeUrl(ID, SECRET, 'https://x.supabase.co/functions/v1');
  assert.deepEqual(listUnsubscribeHeaders(url), [
    { name: 'List-Unsubscribe', value: `<${url}>` },
    { name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' },
  ]);
});

test('no mailto: a mail client can only reach the endpoint that writes the opt-out', async () => {
  // The mailto used to lead the header and pointed at a mailbox nothing
  // reads -- an opt-out sent there was lost.
  const url = await buildUnsubscribeUrl(ID, SECRET, 'https://x.supabase.co/functions/v1');
  for (const h of listUnsubscribeHeaders(url)) assert.doesNotMatch(h.value, /mailto:/i);
});
