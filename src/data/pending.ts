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

let registration: RegistrationDraft | null = null;
let recoveryToken: string | null = null;
let issuedPin: IssuedPinHandoff | null = null;

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
