import type { Href } from 'expo-router';
import { homeHref } from './access';

/**
 * WHERE A RETURNING VISITOR LANDS.
 *
 * THE BUG THIS EXISTS FOR
 * The session was never the thing that was lost. GoTrue has persisted it since
 * the client was written -- `storage: AsyncStorage`, `persistSession: true`,
 * `autoRefreshToken: true` (src/lib/supabase.ts) -- and its refresh token is a
 * row in `auth.refresh_tokens`, revocable per device. What was missing is that
 * app/index.tsx answers to '/', which is also the PWA's `startUrl`, and it
 * rendered the number field WITHOUT EVER ASKING whether anybody was already
 * signed in. So every revisit asked for a mobile number and a PIN over the top
 * of a session that was live the whole time.
 *
 * WHY THE DECISION IS HERE AND NOT IN THE SCREEN
 * It is a claim about an account -- may this person skip the PIN, and to which
 * shell -- and a claim computed inside a render body is one nobody can test.
 * The same reasoning that put continueDestination in ./signin.
 *
 * THE DESTINATIONS ARE NOT A SECOND COPY of the ones sign-in already uses.
 * `submit()` in app/index.tsx sends a fresh sign-in to set-pin or to
 * homeHref(kind !== 'staff'); a RESUMED session must land in exactly the same
 * place, so both read it from here and from ./access rather than each
 * deciding. Two answers to "where does she land" is how a first PIN gets
 * skipped on the path nobody walked by hand.
 */

/**
 * What the SERVER said about the session this device had stored -- never what
 * the device believes about itself. `state` is the whole of the answer:
 * nothing here is read from a token's payload, because a token's payload is
 * the client's copy of a claim, not the server agreeing with it.
 */
export type RestoredSession =
  /** nothing stored, or GoTrue refused to refresh what was -- signed out */
  | { state: 'none' }
  /** something stored, but the server did not answer -- offline, a 5xx */
  | { state: 'unverified' }
  /** the server answered, and this account may not come in */
  | { state: 'closed' }
  | { state: 'active'; kind: 'super_admin' | 'staff'; mustChangePin: boolean };

/**
 * A first PIN, or one an admin reset, is changed before she goes anywhere --
 * `must_change_pin` is the server's word for it. 'first', not 'self': this is
 * a REPLACE, so set-pin has nothing behind it to go back to (the same reason
 * app/index.tsx spells it this way).
 */
export const FIRST_PIN_HREF = '/set-pin?for=first' as Href;

export type RestoreDestination =
  | { resume: false; reason: 'none' | 'unverified' | 'closed' }
  | { resume: true; href: Href };

/**
 * UNVERIFIED DOES NOT RESUME, deliberately.
 *
 * A stored token the server has not confirmed is exactly the thing this whole
 * change is supposed to stop trusting: the point is that the SERVER decides
 * who is signed in, so "the server did not answer" cannot mean yes. It is not
 * a lock-out either -- the token stays in storage untouched, so the next visit
 * that reaches the server resumes without a PIN. Offline she saw the sign-in
 * screen before this change too, and every screen behind it fetches, so
 * resuming into one would only trade a number field for an error card.
 *
 * CLOSED is the risk persistence ADDS and answers. Before this, a disabled
 * account met `is_active` at auth-login on every single entry; a session that
 * survives reloads would otherwise carry her past that check indefinitely.
 */
export function restoreDestination(restored: RestoredSession): RestoreDestination {
  if (restored.state !== 'active') return { resume: false, reason: restored.state };
  if (restored.mustChangePin) return { resume: true, href: FIRST_PIN_HREF };
  // `kind` is the server's word, not a guess from the number -- and a staff
  // account goes straight to Attendance rather than to Overview and off it
  // again a moment later.
  return { resume: true, href: homeHref(restored.kind !== 'staff') };
}
