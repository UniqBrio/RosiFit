# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this request.

> **Origin.** Items A and B of the triage run of 06-Sep-2026, unblocked by the requester's own
> answers later that day. It was held because the remedy depended on whether a new number may
> register itself. It may not — see WHAT SHOULD HAPPEN.

## FIELDS
- WHERE: Sign-in → Continue (`app/index.tsx`), and the registration form it opens (`app/register.tsx`).
- WHAT HAPPENS: An unrecognised number is sent to the registration form, which cannot succeed.
  The requester, verbatim: *"I entered a number completed registration process and set new pin
  and it did not move further screen to dashboard and but that when i login with same number
  again it brough me back to registration page."* The form also shows *"This academy is already
  registered. Sign in with your mobile number and PIN instead."* at the top while still
  inviting the whole form to be filled in.
- WHAT SHOULD HAPPEN: A number with no account must NOT be offered registration. The requester,
  verbatim: *"There is no registration page for staff — super admin inside app creates pin and
  shares with staff, staff enter that pin and changes their pin when they login for the first
  time, after that they will login with same pin everytime."* So an unrecognised number should
  be told to ask the academy admin, and stay on the sign-in screen.
- WHEN IT STARTED: 05-Sep-2026, when Continue began validating the number before the PIN step
  (`eb5315b`, ADR 016 / `docs/decisions/008`). Before that, Continue always went to the PIN step.
- WHO IS AFFECTED: every number that is not already in `app_users` — which, given there is no
  self-registration, is everyone who mistypes a digit and everyone who is not yet staff. The
  academy admin who registered first is unaffected: her number IS registered, so she goes to
  the PIN step.
- REPRO STEPS:
  1. Sign in with any 10-digit number that has no account.
  2. Continue → the registration form opens (with the "already registered" notice).
  3. Fill it in, pick a PIN on the next screen.
  4. Nothing moves to the dashboard — `auth-bootstrap` refuses with a 409 because
     `bootstrap_completed` is already `true`, and `app/set-pin.tsx` shows that as a toast and
     resets the keypad. No account is created.
  5. Enter the same number on sign-in again → `auth-lookup` correctly answers `registered:
     false` → back to the registration form. The loop.
- WAS WORKING BEFORE?: No. This is the first behaviour that path has had.
- CORRECTION ROUND: 1 for the loop. **But the destination itself was a deliberate decision the
  requester made on 05-Sep-2026** and is now reversed by their answer above:
  `requests/2026-09-05-mobile-number-not-validated.md` records "**Not recognised** → the
  registration screen, unconditionally — including after the academy is already registered
  (requester confirmed at the Track C gate on 05-Sep-2026, having been shown that registration
  is a one-time bootstrap and the screen will say 'This academy is already registered')".
  Track C must read that file and state what it missed before proposing anything: it was
  approved on the understanding that the notice was a sufficient dead-end message, and it is
  not — a form that cannot succeed is not made safe by a sentence above it.

## STANDING INSTRUCTIONS (do not edit)
- Track C order is binding: search `docs/registers/ROOT_CAUSE_REGISTER.md` for the same class;
  state the ROOT CAUSE, distinct from the symptom, BEFORE any fix; reproduce with a failing
  test, fix at the root, make it pass; if the cause is a pattern, sweep EVERY sibling site;
  append the root-cause entry; then the test gate.
- WHO IS AFFECTED is evidence — a fix whose mechanism does not explain the stated selectivity
  has not found the root cause.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why. A recurring "fixed" bug is a process finding — flag `/framework-update`.
- Data-store-level cause → STOP, propose the change, wait for approval. Production is never
  touched automatically.
