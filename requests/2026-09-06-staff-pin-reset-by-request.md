# NEW FEATURE REQUEST
<!-- Filled by workflows/request.md (/request) · Consumed by Track A: /feature requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - the Gate 1 questionnaire covers it. -->

Run **Track A** ([workflows/feature.md](../workflows/feature.md)) with this request.

> **Why NEW and not BUG.** The requester opened with "one more bugs", and there IS a defect:
> `app/forgot-pin.tsx` offers a staff member two security questions she can never pass.
> `recovery-check` filters `.eq('kind', 'super_admin')` and answers a staff number with a 404,
> but the screen only replaces its placeholder questions on SUCCESS — so the seeded fixture
> questions stay on screen and she is invited to answer them. That is the reported symptom.
> It is filed as NEW rather than BUG because the remedy the requester specified is not a
> repair of that screen: it is a reset-request queue, an admin notification and an admin
> action. Run as a bug, the design this needs would be skipped. The defect is MUST-HAVE 1
> below, and it disappears when this feature ships.

## FIELDS
- FEATURE NAME: Staff PIN reset by request
- ONE-LINE GOAL: A staff member who has forgotten her PIN asks the academy admin from inside the app, and the admin sees the request and issues her a new PIN.
- WHO USES IT: staff and the super admin (both stated).
- MUST-HAVE in v1 — **confirmed and extended by the requester at Gate 1, 06-Sep-2026**:
  1. Forgot PIN on a staff number must not ask security questions — "there is no such thing for staff".
  2. Tapping Forgot PIN as staff asks the super admin for a new PIN. *(Gate 1: "Just allow user to ask for reset pin to admin".)*
  3. The super admin's dashboard shows it under notifications, as "this staff requested for reset pin".
  4. **The staff list highlights her as having requested a reset** — *added at Gate 1: "in staff section as well it should highlight as requested for reset pin"*.
  5. The super admin resets and sends the PIN, **through the reset action already on Staff & access** — *Gate 1: "The reset pin section is already present in staff and access section follow same"*. No second way of doing it.
  6. The staff member changes it accordingly.
- EXPLICITLY OUT of v1: a staff self-registration path of any kind. *Gate 1, and it settles the
  open registration question too: "There is no registration page for staff — super admin inside
  app creates pin and shares with staff, staff enter that pin and changes their pin when they
  login for the first time, after that they will login with same pin everytime."*
- KNOWN CONSTRAINTS: "Do not complicate the flow make sure its user friendly" — the requester's words, binding on every Gate 1 answer.
- MARKET / REGION: `unknown`
- RUN MODE: auto (default — the description did not say how to run)

## DESIGN SURFACE
- SCREENS / ENTRY POINTS: `app/forgot-pin.tsx`, reached from the "Forgot PIN?" button on the sign-in PIN step (stated: "logged in with staff number and selected forget pin"). The super admin's notification tray (stated: "in super admin dashboard under notification"). The staff card on `app/staff/index.tsx` (Gate 1). **The admin ACTS from the existing "Reset her PIN?" sheet on the staff list** — bound at Gate 1, no reset action is added to the tray.
- STATES REQUESTER CARES ABOUT: `unknown`. Not stated, and several matter: what the staff member sees after asking, what she sees if she asks twice, and what the tray shows once the admin has issued the PIN.
- VISIBLE STRINGS STATED: "this staff requested for reset pin" — the requester's description of the notification, offered as its meaning rather than as final wording.

## WHAT ALREADY EXISTS (dedupe, 06-Sep-2026 — read from the files, not from memory)
MUST-HAVE 4 and 5 are **already built** and are not net-new work:
- `supabase/functions/pin-issue/` regenerates a staff PIN, sets `must_change_pin`, clears the
  lockout, and returns the PIN once. Super-admin-only (`requireSuperAdmin`), audited.
- `app/staff/index.tsx` is the admin's action: a "Reset her PIN?" sheet with an optional
  "Also sign her out everywhere", ending on `app/staff/pin.tsx`, which shows the PIN once.
- `app/index.tsx` sends anyone with `must_change_pin` to `/set-pin?for=self` at sign-in, so
  "staff changes accordingly" already happens.
- A notification tray already exists — `NotificationBell` and `NotificationsSheet` in
  `src/components/AppShell.tsx`, fed by `useNotifications()` and shaped by
  `src/data/notifications.ts`, whose kinds are `awaiting | sent | excluded` and whose badge
  counts only what is ACTIONABLE.

So the genuinely net-new part is **the request itself**: somewhere to record that a staff
member asked, a way for her to ask while signed OUT (she has forgotten her PIN — she has no
session), a fourth notification kind, and the link from the admin's existing reset action back
to closing the request.

## STANDING INSTRUCTIONS (do not edit)
- Follow Track A end-to-end: Gate 1 questions → Gate 2 feasibility → Gate 3 design → Gate 4
  plan → build → test gate. **Confirm mode stops at every gate; auto mode (default) logs each
  checkpoint's decisions to the ASSUMPTIONS ledger and proceeds — hard stops and the
  mechanical test gate bind in every mode.**
- Anything stated in FIELDS is binding and overrides assumptions; every `unknown` becomes a
  Gate 1 question with a reasoned recommendation — never a silent assumption.
- Ground first (Step 0): `CLAUDE.md`, `docs/registers/KNOWN_LIMITATIONS.md`,
  `docs/registers/CANONICAL_PATTERNS.md`, `docs/registers/ROOT_CAUSE_REGISTER.md`.
- **No application scaffolded yet (NEW-APP)?** Initialization runs first —
  `docs/02-PROJECT-INITIALIZATION.md`, `npm run new:app` — then this file moves into the new
  app's `requests/` and Track A runs **inside the new app**, scoped to the first shippable
  slice named above.
