/**
 * What the app ASKS before it ends the session.
 *
 * "Ask for confirmation when user click on signout"
 * (requests/2026-09-08-confirm-before-sign-out.md). Sign out used to take
 * effect on the first tap: `signOut()` revoked the session and the root Stack
 * was reset to the PIN screen, with nothing in between and no way back.
 *
 * WHY THE WORDING LIVES HERE AND NOT IN THE SCREENS
 * There are TWO sign-out controls -- the row in the App group on More, and the
 * button at the foot of the profile screen -- and they are the same act. Two
 * copies of one question is how the Members tab's card and the course roster's
 * card ended up saying different things after the same write, which is the
 * objection `memberRemoval.ts` was extracted against. One question, one file,
 * both screens import it.
 *
 * WHAT THE QUESTION HAS TO SAY, and why each half is in it:
 *
 *   - WHAT IT COSTS. The session is indefinite until Sign Out (ADR-031), so
 *     the way back in is the mobile number and the PIN -- not a tap. That is
 *     the whole reason a second step is worth having here.
 *   - WHAT SURVIVES. `signOut()` is `scope: 'local'`, deliberately: signing
 *     out of the academy laptop at closing time must not sign her out of her
 *     own phone. A person about to sign out of a shared device is entitled to
 *     know which sessions this ends, exactly as the removal confirmation
 *     states the attendance it keeps.
 *
 * THE CANCEL SAYS WHAT IT DOES, rather than taking `ConfirmDialog`'s default
 * "Not yet". "Not yet" answers a question about something being sent; the
 * question here is whether to leave, and the answer to it is staying. Same
 * reason the roster's status pill spells out the act rather than naming the
 * state.
 */
export const SIGN_OUT_PROMPT = {
  title: 'Sign out?',
  body:
    'You will need your mobile number and PIN to sign back in. '
    + 'Only this device is signed out: anywhere else you are signed in stays that way.',
  /** the way out, and it says what staying means */
  cancel: 'Stay signed in',
  confirm: 'Sign out',
  /**
   * The revocation is a server call, so there is a moment between the tap and
   * the sign-in screen. A confirm button that still reads "Sign out" during it
   * invites a second tap on a request already in flight.
   */
  busy: 'Signing out…',
} as const;
