# ENHANCEMENT REQUEST
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - the B3 questions cover it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Why ENHANCE and not BUG.** Nothing is broken. `app/(tabs)/more.tsx` already
> withholds Staff & access and Audit log from a staff account, and has since the
> `adminOnly` rows were added. What is missing is the OTHER half of the same
> decision: the Overview tab, the screen it opens, and the admin-only routes a
> staff member can still reach by typing them. This changes who-sees-what on a
> shipped shell, which is Track B.

## FIELDS
- WHAT CHANGES: A staff account no longer sees Overview. The shell it does see
  is otherwise the super admin's, unchanged.
- ONE-LINE GOAL: "For user logging in as staff should not be seeing the overview
  and staff access they should only see attendance and more without staff access
  and audit log."
- WHO USES IT: staff accounts (`app_users.kind = 'staff'`). The super admin's app
  is untouched.
- MUST-HAVE:
  1. The Overview tab is not offered to staff, in the academy header's tab row.
  2. Home in the bottom pill lands a staff account on Attendance.
     *(Requester at Gate B3: "bring it under home attendance same as super admin
     just hiding overview" — so the pill keeps its three items and its labels;
     only where Home GOES changes.)*
  3. Staff & access and Audit log stay withheld on More. **Already true** — see
     WHAT ALREADY EXISTS.
  4. A staff account that reaches a withheld route by URL is sent to Attendance.
     *(Requester at Gate B3: "Redirect to Attendance".)*
- MUST NOT CHANGE:
  - Reports. The requester bound the pill to "same as super admin", so Reports
    stays on it for staff, reading the attendance data staff already work with.
  - The super admin's shell in any respect — same tabs, same pill, same landing.
  - Every screen inside the Attendance workspace, which staff already reach.
  - The RLS policies. This is the chrome agreeing with the database, not a new
    permission boundary; `app_users_read` and `audit_logs_read` are already
    `is_super_admin()`.
- EXPLICITLY OUT: any change to what staff can WRITE, and the notification bell's
  contents. Neither was asked for.
- KNOWN CONSTRAINTS: "Implement at earliest" — the requester's words. RUN MODE: auto.

## DESIGN SURFACE
- SCREENS / ENTRY POINTS: `src/components/AppShell.tsx` (the header tab row and
  both nav pills), `app/(tabs)/index.tsx` (Overview itself), `app/audit.tsx`,
  `app/staff/index.tsx`, `app/staff/add.tsx`, `app/staff/pin.tsx` (the withheld
  routes), `app/index.tsx` and `app/set-pin.tsx` (where sign-in lands),
  `app/(tabs)/more.tsx` (its back arrow, which today names Overview).
- STATES REQUESTER CARES ABOUT: `unknown`. Two matter and are answered in the
  plan rather than assumed: what a staff account sees while its role is still
  LOADING (nothing role-dependent — the admin shape must never flash), and what
  a SIGNED-OUT visitor sees (unchanged; the redirect does not fire, because
  sending a signed-out person to Attendance would only trade one dead screen
  for another).
- VISIBLE STRINGS STATED: none. The freeze rule applies — this change adds no
  string and alters none.

## WHAT ALREADY EXISTS (dedupe, 06-Sep-2026 — read from the files, not from memory)
- `app/(tabs)/more.tsx` already carries an `adminOnly` flag on Staff & access and
  Audit log, filters on `identity?.isSuperAdmin`, and hides BOTH rows until the
  role is known. MUST-HAVE 3 is done and is not net-new work.
- `src/data/session.ts` already resolves `Identity.isSuperAdmin` from
  `app_users.kind`, and already reports the fixtures persona as super admin — so
  the prototype keeps its whole app.
- `app/member/import.tsx` is the precedent for a typed-URL guard: it computes
  `denied` from the same `isSuperAdmin` and says no rather than showing a form
  that would error. This request chooses a redirect over that empty state, on
  the requester's instruction.
- `app/branches.tsx` is the precedent for the opposite call — staff CAN read
  branches, so the row stays and only the write half is withheld. Branches is
  therefore untouched here.

So the net-new part is: the shell's two navigation lists becoming role-aware,
and a guard on the routes the lists stop pointing at.

## STANDING INSTRUCTIONS (do not edit)
- Follow Track B end-to-end: B1 read what exists → B2 impact → B3 questions →
  B4 plan → build → B6 diff review → test gate.
- Surgical discipline: minimum change for the ask; every changed line traces here.
- Both themes verified, not assumed. No new colour, no new token.
- `npm run check` green before this is called done.
