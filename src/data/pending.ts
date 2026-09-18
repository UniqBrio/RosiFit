/**
 * Two short-lived hand-offs between screens, held in memory only.
 *
 * Registration collects the name, number and recovery answers on one screen
 * and the PIN on the next; recovery passes a token from the questions screen
 * to the new-PIN screen. Neither may travel as a route parameter -- a
 * security answer or a recovery token in a URL is in the address bar, in
 * history, and in any log that records paths. Neither is persisted either:
 * if the app reloads mid-flow the draft is gone, and the screen says so and
 * sends her back to the start rather than half-completing.
 */
export type RegistrationDraft = {
  name: string;
  phone: string;
  answers: { question_id: number; answer: string }[];
};

/** A PIN that was just issued, on its way to the show-once screen. Held here
 *  rather than passed as a route parameter so it never reaches the address
 *  bar, browser history, or anything that logs a path. */
export type IssuedPinHandoff = { pin: string; name: string; phone: string; role: string };

/* THE STAGED CSV IMPORT IS GONE.
 *
 * It carried the classified rows from the upload wizard to `/match`, the
 * review screen, because they were two routes and a route parameter could not
 * hold them. There is no second route any more -- the rows that need a person
 * are resolved on the upload's own last step, in the state that already holds
 * the preview -- so the hand-off has nothing to hand off
 * (requests/2026-09-06-upload-flow-shorter-no-email-resolution.md).
 */

let registration: RegistrationDraft | null = null;
let recoveryToken: string | null = null;
let issuedPin: IssuedPinHandoff | null = null;
let sendResult: import('./api').SendResult | null = null;

/** The per-recipient outcome of a send, on its way to the result screen.
 *  Kept whole: "sent" is claimed per address, never for the batch, and an
 *  excluded member is named with her reason rather than dropped. */
export const setSendResult = (r: import('./api').SendResult) => {
  sendResult = r;
  // A send either ran or was refused as already submitted; it is never both.
  // Clearing the other here is what stops a 409 from an earlier attempt
  // leaving its banner over a result that really did just send.
  sendAlready = null;
};
export const peekSendResult = (): import('./api').SendResult | null => sendResult;
export const clearSendResult = () => { sendResult = null; };

/**
 * A send the server REFUSED as already submitted, on its way to the same
 * result screen (T-017).
 *
 * It travels beside the per-recipient result rather than as one, because
 * there are no per-recipient rows to show: the batch the key already wrote
 * was made by an earlier attempt, and its figures are all this attempt can
 * honestly report. `batch` is null when the lookup itself failed -- the
 * screen then says the send was already submitted and that the figures could
 * not be read, which is the truth and is still not "nothing was sent".
 */
let sendAlready: { batch: import('./sendBatch').BatchSummary | null } | null = null;

export const setSendAlready = (batch: import('./sendBatch').BatchSummary | null) => {
  sendAlready = { batch };
  sendResult = null;
};
export const peekSendAlready = () => sendAlready;
export const clearSendAlready = () => { sendAlready = null; };

export const setIssuedPin = (p: IssuedPinHandoff) => { issuedPin = p; };
export const takeIssuedPin = (): IssuedPinHandoff | null => {
  const p = issuedPin;
  issuedPin = null;
  return p;
};

export const setRegistrationDraft = (d: RegistrationDraft) => { registration = d; };
export const takeRegistrationDraft = (): RegistrationDraft | null => {
  const d = registration;
  registration = null;
  return d;
};
export const peekRegistrationDraft = (): RegistrationDraft | null => registration;

export const setRecoveryToken = (t: string) => { recoveryToken = t; };
export const takeRecoveryToken = (): string | null => {
  const t = recoveryToken;
  recoveryToken = null;
  return t;
};
export const peekRecoveryToken = (): string | null => recoveryToken;
