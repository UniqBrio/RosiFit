/**
 * The two decisions the sign-in screen makes before it has a session.
 *
 * Both live here rather than inside the component because both are claims
 * about a person's account, and a claim computed inside a render body is one
 * nobody can test. `routeAfterFailure` in particular decides whether somebody
 * is sent to registration -- getting it wrong either strands the first admin
 * on a screen she can never pass, or walks a member with a mistyped PIN into
 * creating a second academy.
 */

/**
 * '8056329742' -> '80563 29742'. Non-digits never survive.
 *
 * A pasted number keeps its country or trunk code, and the field sits beside
 * a fixed '+91' label -- so '+91 80563 29742' pasted whole used to become
 * '91805 63297', a plausible-looking number belonging to nobody. Anything
 * longer than the ten local digits has its 91 or its leading 0 taken off
 * first. Only when it is longer: '91234 56789' IS a real ten-digit number.
 */
function localDigits(raw: string): string {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  else if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
}

export function groupPhone(raw: string): string {
  const d = localDigits(raw);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}

/** What is sent to auth-login: the ten local digits, no separator. */
export function phoneDigits(raw: string): string {
  return localDigits(raw);
}

export function isCompletePhone(raw: string): boolean {
  return phoneDigits(raw).length === 10;
}

/**
 * Whether auth-login's refusal means "no account exists anywhere yet" rather
 * than "that number and PIN do not match".
 *
 * THE CANVAS' LOOKUP IS NOT COPIED LITERALLY, deliberately. The prototype
 * checks its three hardcoded accounts on Continue and jumps to registration
 * for anything else. Against the real project that needs a public "does this
 * number have an account" endpoint, which is a staff-enumeration oracle:
 * anyone could dial numbers until one came back registered. auth-login is
 * built the other way round -- an unknown number and a wrong PIN answer
 * IDENTICALLY once the academy is set up, and the one case it will name is
 * the global fact that nobody has registered at all, which the register
 * screen states out loud anyway.
 *
 * So Continue always moves to the PIN step, and the server decides the
 * destination on the answer. Matched on the sentence auth-login sends
 * (supabase/functions/auth-login/index.ts) -- callFn throws that sentence
 * verbatim, and the message is the only part of it that reaches this side.
 */
export function needsRegistration(message: string): boolean {
  return /has not been registered yet/i.test(String(message ?? ''));
}
