# 008 — Continue validates the number, and the enumeration oracle is accepted

**Status:** Accepted · **Date:** 05-Sep-2026

## Context

The sign-in screen asks for a mobile number, then a PIN. Until now **Continue did no lookup at
all**: it checked that ten digits had been typed and moved to the PIN step. The number was
validated only when the PIN was submitted, by `auth-login`.

That was deliberate, and it was written down in exactly one place — a comment in
`src/data/signin.ts`:

> THE CANVAS' LOOKUP IS NOT COPIED LITERALLY, deliberately. […] Against the real project that
> needs a public "does this number have an account" endpoint, which is a staff-enumeration
> oracle: anyone could dial numbers until one came back registered.

`auth-login` is built to match: once `bootstrap_completed` is true, an unknown number and a wrong
PIN both answer `That mobile number and PIN do not match.`, and the one thing the server will
name is the global fact that nobody has registered yet.

The design source of truth does the opposite. `design/RosiFit App.dc.html`'s `doContinue()`
matches the number against the account list on Continue — a hit goes to the PIN step, a miss goes
to super-admin registration.

So the app and the canvas disagreed, the app was right about the risk, and **the disagreement was
recorded only in a code comment.** No ADR, no register row. To the repo owner, using the app
against the live project (where `bootstrap_completed` is now `true`, so the registration path is
unreachable), it read as a straightforward defect: every number, real or invented, reached the PIN
screen, and nothing ever reached registration.

## Decision

**Continue validates the number against the accounts, and the enumeration oracle is accepted.**

`supabase/functions/auth-lookup` is a new public (`verify_jwt=false`) function taking a phone
number and answering one boolean, `registered`. Continue calls it:

- **registered** → the PIN screen, unchanged. **The PIN is still required.** Continue chooses a
  screen; it never signs anybody in.
- **not registered** → the registration screen, unconditionally — including after the academy is
  already registered, where `auth-bootstrap` will refuse and the register screen says so.
- **the lookup did not answer** → she stays on the number screen with the reason.

After a correct PIN nothing changes, because nothing needed to: super admin → `/(tabs)`; staff
with `must_change_pin` → change PIN, then `/(tabs)`; staff who has already set her PIN →
`/(tabs)`.

The repo owner was shown the trade-off in full — that this ships a public lookup anyone can dial
numbers through to discover which belong to the academy's staff — and chose it over keeping the
server-decides flow. **Rate-limiting the lookup was offered as a third option and not taken.**

## Consequences

- **Anyone can enumerate the academy's staff and super-admin numbers.** Dial numbers at
  `auth-lookup` until one answers `registered: true`. There is no rate limit. Recorded as
  **TD-017** so the cost is arguable rather than forgotten.
- What the oracle deliberately does **not** give: no name, no role, no `is_active`, no
  `pin_set_at`, no `bootstrap_completed`, and nothing that narrows a PIN guess. It reads
  `app_users.id` and returns a boolean. `auth-login`'s five-attempt lockout is untouched, so
  knowing a number is registered still leaves 10,000 PINs and five tries.
- **A disabled account answers `registered: true`.** `is_active` is not part of the question:
  sending a disabled staff member to register a new academy would be worse than the "this account
  has been disabled" sentence `auth-login` gives her at the PIN step.
- **Post-bootstrap, a mistyped digit now lands on the registration form** rather than failing on
  the PIN screen. That is the owner's explicit instruction, and it is why `app/register.tsx` gained
  a Back control on step 1: until now the form's only exit was the browser's own back button, and
  a form nobody typed a word into is a trap without one. Sign-in navigates there with
  `router.push`, not `replace`, for the same reason.
- **`needsRegistration` is kept**, though Continue now catches the case it was written for. It
  still fires correctly if an account is removed between Continue and the PIN, and its five tests
  still pin the distinction it exists to make. Deleting it would remove the guard and the proof.
- **`auth-lookup` must be deployed with `verify_jwt=false`.** It is the *sixth* public function;
  `docs/RosiFit_Implementation_Plan_V2.2.md` records "public remains exactly five", which this
  supersedes. A deploy that defaults `verify_jwt` to true leaves Continue answering "that number
  could not be checked" for everyone.
- No migration. Nothing about the schema changes — the function reads a column `auth-login`
  already reads.

## Options rejected

**Keep the server-decides flow and add a visible "Register your academy" link.** Rejected by the
owner. It was the recommendation: it leaks nothing, and it fixes the real reachability gap — that
the register screen has never had an affordance of its own, and could only be reached by failing
a sign-in. The owner wants the canvas behaviour, which cannot be had without the lookup.

**Rate-limit the lookup per IP and answer only "proceed to PIN" / "proceed to registration".**
Offered as a middle option and rejected. It narrows the oracle without closing it, and costs a
rate-limit store this project does not have. It remains the obvious way to pay down TD-017.

**Fold the lookup into `auth-login` as an `action: 'lookup'` branch.** Rejected: it would give the
sign-in endpoint a second, unauthenticated mode, and the enumeration behaviour would be a branch
inside a function whose header says it is the sign-in call. A separately named function is a
thing a reviewer can see.

**Answer `false` when the lookup fails.** Rejected, and it is the failure mode this decision most
wants to avoid. "Not registered" sends somebody to registration; doing that because a connection
dropped walks a real staff member into trying to create a second academy. A lookup that did not
happen is `null`, and `continueDestination(null)` stays put — `src/data/signin.ts`, three cases in
`src/data/signin.test.ts`.
