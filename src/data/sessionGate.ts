/**
 * NO PROTECTED READ BEFORE THE SESSION IS KNOWN.
 *
 * A browser that lands on a tab with no valid session -- a stale bookmark, a
 * PWA reopened after the account was disabled, a token GoTrue refuses to
 * refresh -- used to send the whole fan-out anyway: every `useAsync` reader
 * on the screen fired on mount, each request went out with no usable JWT,
 * and PostgREST answered 401 while Postgres logged "permission denied"
 * thirty times in a second, a moment before the guard sent the person to
 * sign in (docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md §5, 3 Oct
 * 18:53:41: 33 x 401/403 in a day). Nothing waited for the answer to "is
 * anybody signed in".
 *
 * This is that wait. `sessionKnown()` resolves true once the signed-in
 * identity has been read back from the server under RLS -- currentAppUser(),
 * the same question useIdentity asks, shared with it (sharedRead, T-405) so
 * the gate costs no request of its own -- and false when there is nobody.
 * The answer is kept until the auth state changes (sign-in, sign-out, a
 * refresh that fails), so a focus return or a bus bump asks nothing again.
 *
 * What it does NOT do: redirect. The guards that already send a signed-out
 * person to sign in (AdminRouteGuard, the screens' own `signedOut` branches)
 * keep that job, so there is no second opinion to loop against. A reader
 * whose gate answers false simply does not ask -- it fails with a sentence
 * instead of a 401 -- and the redirect lands over it.
 *
 * In fixtures mode there is no project and no session; everything is open.
 */
import { supabase, isConfigured } from '../lib/supabase';
import { currentAppUser } from './session';

let known: Promise<boolean> | null = null;

/** True when a signed-in, active account is known; false when the server
 *  answered that there is none, or could not be asked. */
export function sessionKnown(ask: () => Promise<unknown> = currentAppUser): Promise<boolean> {
  if (!isConfigured) return Promise.resolve(true);
  if (!known) known = ask().then(user => user !== null).catch(() => false);
  return known;
}

/** The auth state moved: the next reader asks again. */
export function forgetSession(): void {
  known = null;
}

/** The sentence a reader fails with instead of sending a request nobody is
 *  signed in for. Readable, because it can reach a screen for the moment
 *  before the redirect lands. */
export const SIGNED_OUT_MESSAGE = 'Sign in to load this.';

if (isConfigured) {
  // SIGNED_IN, SIGNED_OUT, USER_UPDATED and a failed refresh (which GoTrue
  // reports as SIGNED_OUT) all change who is signed in. INITIAL_SESSION is
  // the client announcing what it found in storage on start-up, not a
  // change, and TOKEN_REFRESHED is the same person with a newer token;
  // forgetting on those would only re-ask a question whose answer holds.
  supabase.auth.onAuthStateChange(event => {
    if (event !== 'INITIAL_SESSION' && event !== 'TOKEN_REFRESHED') forgetSession();
  });
}
