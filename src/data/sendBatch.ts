/**
 * ONE send, however many times the button is pressed (T-017).
 *
 * `email_batches.client_batch_id` is `text not null unique`
 * (0009_communication.sql:168), so the database has always been able to
 * refuse a second batch for one attempt. Nothing gave it the chance: no
 * caller passed a key, and the Edge Function mints its own when the caller
 * omits one -- a key that by construction collides with nothing. Every retry
 * was a new batch and a second set of emails, which cannot be recalled
 * (RV-06, A:F-05, B:F-05, C:RF-05).
 *
 * WHY THE KEY IS NOT COMPONENT STATE. C:RF-05 names the paths that press Send
 * twice without anybody deciding to: a dropped response on a slow connection,
 * a page refresh, and the PWA's own auto-reload, which fires on 60s idle or
 * `hidden` and can land in the middle of a send (RV-30, C:RF-20). The first
 * survives the component; the other two do not survive the document. So the
 * key is held in `sessionStorage` under the screen and the period, and a
 * remount picks the same one back up.
 *
 * WHY sessionStorage AND NOT localStorage. The scope wanted is exactly one
 * tab's one visit: a key that outlived the tab would refuse a send made
 * tomorrow for the same week, and one shared between tabs would tie together
 * two drafts the operator opened deliberately.
 *
 * THIS FILE IMPORTS NOTHING. It is the half of the send that can be specced
 * under plain node -- `api.ts` reaches the Supabase client, and a spec that
 * imports it gets AsyncStorage and a GoTrue session restore. The same reason
 * `_shared/pageAll.ts` has no Deno dependency.
 */

/** What `send-followups` answers with. The per-recipient rows are the point:
 *  "sent" is claimed per address, never for the batch. */
export type SendResult = {
  batch_id: string; requested: number; sent: number; failed: number; excluded: number;
  results: { member_id: string; name: string; status: 'sent' | 'failed' | 'excluded'; reason?: string }[];
};

/** Template only. There is no subject or body here, and adding one would be
 *  the API half of the free-form compose that C-68 removed (guardrail 5). */
export type SendFollowUpsInput = {
  member_ids: string[];
  template_id: string;
  period_from: string;
  period_to: string;
  /** REQUIRED, and that is the fix: optional is what let two call sites omit
   *  it while every check stayed green. */
  client_batch_id: string;
};

/** An existing batch, read back by its key so a refused second attempt can
 *  say what the first one did rather than only that it happened. */
export type BatchSummary = {
  id: string;
  requested: number;
  sent: number;
  failed: number;
  excluded: number;
  status: string;
  createdAt: string | null;
};

/**
 * An Edge Function's refusal, carrying the status it came with.
 *
 * The status is what makes a 409 recognisable. Matching on the sentence would
 * tie the client to wording the function is free to change, and wording is
 * the thing most likely to change.
 */
export class FunctionError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'FunctionError';
    this.status = status;
  }
}

/** 409 is the unique index on `client_batch_id` doing its job: this exact
 *  attempt already reached the server. */
export function isAlreadySubmitted(err: unknown): boolean {
  return err instanceof FunctionError && err.status === 409;
}

/**
 * A fresh idempotency key.
 *
 * `crypto.randomUUID` needs a secure context, so it is simply absent on an
 * `http://192.168.x.x` origin -- which is how the academy reaches a dev build
 * from a phone. An unguarded call there is a TypeError thrown while the draft
 * renders, so the fallbacks are not decoration. `getRandomValues` has no
 * secure-context requirement; the last resort is for a runtime with no web
 * crypto at all, and is still unique enough for a per-tab dedupe key.
 */
export function newClientBatchId(): string {
  const webCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (webCrypto && typeof webCrypto.randomUUID === 'function') return webCrypto.randomUUID();
  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `rosifit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Where a key is held between mounts. */
export type KeyStore = {
  read(name: string): string | null;
  write(name: string, value: string): void;
  clear(name: string): void;
};

export type CountingKeyStore = KeyStore & { size(): number };

/** For specs, and for any runtime with no `sessionStorage` -- React Native
 *  proper, and the Node prerender `expo export` runs over every route. */
export function memoryKeyStore(): CountingKeyStore {
  const held = new Map<string, string>();
  return {
    read: name => held.get(name) ?? null,
    write: (name, value) => { held.set(name, value); },
    clear: name => { held.delete(name); },
    size: () => held.size,
  };
}

/**
 * The process-wide fallback. It is module-level rather than per-call so that
 * two mounts in one session still agree on the key when `sessionStorage` is
 * unavailable -- in-tab dedupe keeps working, it is only the survival across
 * a reload that is lost.
 */
const fallbackStore = memoryKeyStore();

let sessionStorageChecked = false;
let sessionStorageUsable: Storage | null = null;

/**
 * `sessionStorage` if it is really there and really writable.
 *
 * Presence is not enough: Safari in private browsing exposes the object and
 * throws on `setItem`, and a browser with site data blocked does the same. A
 * probe write is the only honest test, and it is done once.
 */
function usableSessionStorage(): Storage | null {
  if (sessionStorageChecked) return sessionStorageUsable;
  sessionStorageChecked = true;
  try {
    const store = (globalThis as { sessionStorage?: Storage }).sessionStorage;
    if (!store) return (sessionStorageUsable = null);
    const probe = '__rosifit_send_key_probe__';
    store.setItem(probe, '1');
    store.removeItem(probe);
    sessionStorageUsable = store;
  } catch {
    sessionStorageUsable = null;
  }
  return sessionStorageUsable;
}

export function sessionKeyStore(): KeyStore {
  const store = usableSessionStorage();
  if (!store) return fallbackStore;
  return {
    read: name => { try { return store.getItem(name); } catch { return null; } },
    write: (name, value) => { try { store.setItem(name, value); } catch { /* quota or blocked: in-tab dedupe still holds */ } },
    clear: name => { try { store.removeItem(name); } catch { /* nothing to do */ } },
  };
}

/**
 * The name a key is held under: the screen and the period it is for.
 *
 * The period is in the name because a key that spanned weeks would refuse
 * next week's send, and the screen is in it because two drafts opened
 * deliberately -- one course, then another -- are two sends.
 */
export function sendBatchName(scope: string, period: { from: string; to: string }): string {
  return `rosifit.sendKey.${scope}.${period.from}..${period.to}`;
}

/** The key for this draft: the one already held, or a new one. Called from a
 *  `useState` initialiser, so it runs once per mount and reads back whatever
 *  the mount before it left. */
export function openSendBatchKey(name: string, store: KeyStore = sessionKeyStore()): string {
  const held = store.read(name);
  if (held) return held;
  const minted = newClientBatchId();
  store.write(name, minted);
  return minted;
}

/**
 * Release the key at a TERMINAL outcome -- sent, or refused as already sent.
 *
 * Not on an ordinary failure: that is the retry case, and the whole point is
 * that the retry carries the same key. And not never, either. Once the
 * operator has been SHOWN what the send did, holding the key would refuse
 * every later send for this period for as long as the tab lives, so a member
 * flagged on Friday could not be written to at all. A deliberate second send
 * is a new batch, and it is D-6's server-side refusal (T-055) and the
 * already-sent mark on the row that guard it -- not a stale key.
 */
export function closeSendBatchKey(name: string, store: KeyStore = sessionKeyStore()): void {
  store.clear(name);
}

export type SendDeps = {
  send: (input: SendFollowUpsInput) => Promise<SendResult>;
  readBatch: (clientBatchId: string) => Promise<BatchSummary | null>;
};

export type SendAttempt =
  | { kind: 'sent'; result: SendResult }
  | { kind: 'already'; batch: BatchSummary | null };

/**
 * One attempt at a send, with the answer the operator is owed for each way it
 * can end.
 *
 * A 409 is NOT a failure and must not be shown as one: "something went wrong,
 * try again" is the sentence that sends the second set of emails. It means
 * this exact attempt already reached the server, so the honest answer is what
 * that attempt did -- which is why the batch is read back by the same key.
 *
 * THE ONE DISCARDED READ ERROR IN THIS FILE, and it is deliberate and local.
 * The lookup decorates the answer; it does not decide it. If it fails, the
 * operator is still told the send was already submitted, with the figures
 * missing rather than the fact (RV-18 / T-046 sweep: this is the annotation).
 */
export async function attemptSend(deps: SendDeps, input: SendFollowUpsInput): Promise<SendAttempt> {
  try {
    return { kind: 'sent', result: await deps.send(input) };
  } catch (err) {
    if (!isAlreadySubmitted(err)) throw err;
    let batch: BatchSummary | null = null;
    try {
      batch = await deps.readBatch(input.client_batch_id);
    } catch (lookup) {
      console.error('attemptSend: the already-submitted batch could not be read back:', lookup);
    }
    return { kind: 'already', batch };
  }
}
