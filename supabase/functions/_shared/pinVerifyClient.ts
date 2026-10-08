/**
 * Mumbai's side of the authenticated check with Singapore (protocol: pinVerifyProtocol.ts).
 *
 * Called ONLY from server-side Edge Function code (auth-login, recovery-check) and only for a
 * credential still at version 0. The browser never sees PIN_VERIFY_KEY, the request, or anything
 * Singapore says beyond what the calling function decides to tell it.
 *
 * FAIL-CLOSED. Anything other than a well-formed signed answer -- no key, a network error, a
 * timeout, a redirect, a non-200, an unexpected body -- comes back as 'unavailable', and every
 * caller treats 'unavailable' as "cannot sign in right now": no credential is migrated, no attempt
 * is counted, nothing is assumed valid.
 *
 * Nothing here logs, returns or throws the PIN, an answer, the key or the request body.
 * Pure apart from the injected env reader and fetch, so src/data tests run this exact file.
 */
import {
  buildSignedRequest, keyUsable, parseVerifyResponse, SIGNATURE_HEADER, SINGAPORE_PIN_VERIFY_URL,
  type RecoveryAnswer, type VerifyResult,
} from './pinVerifyProtocol.ts';

export type RemoteResult = VerifyResult | 'unavailable';

export type ClientDeps = {
  readEnv: (name: string) => string | undefined;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
};

export const DEFAULT_TIMEOUT_MS = 8_000;

async function call(
  payload: { kind: 'pin'; app_user_id: string; pin: string } | { kind: 'recovery'; app_user_id: string; answers: RecoveryAnswer[] },
  deps: ClientDeps,
): Promise<RemoteResult> {
  const key = deps.readEnv('PIN_VERIFY_KEY');
  if (!keyUsable(key)) {
    console.error('[pin-verify client] PIN_VERIFY_KEY is not configured; version-0 credentials cannot be checked');
    return 'unavailable';
  }
  try {
    const { body, signature } = await buildSignedRequest(key, payload, (deps.now ?? Date.now)());
    const res = await (deps.fetchImpl ?? fetch)(SINGAPORE_PIN_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [SIGNATURE_HEADER]: signature },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(deps.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    const result = parseVerifyResponse(res.status, await res.text());
    if (result === null) {
      console.error(`[pin-verify client] Singapore answered HTTP ${res.status} without a usable result`);
      return 'unavailable';
    }
    return result;
  } catch (err) {
    // The error's NAME only: a message could, in principle, echo part of a request.
    console.error(`[pin-verify client] Singapore could not be reached (${err instanceof Error ? err.name : 'error'})`);
    return 'unavailable';
  }
}

export function verifyPinWithSingapore(appUserId: string, pin: string, deps: ClientDeps): Promise<RemoteResult> {
  return call({ kind: 'pin', app_user_id: appUserId, pin }, deps);
}

export function verifyAnswersWithSingapore(appUserId: string, answers: RecoveryAnswer[], deps: ClientDeps): Promise<RemoteResult> {
  return call({ kind: 'recovery', app_user_id: appUserId, answers }, deps);
}
