# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS

- FEATURE / SCREEN: the **sign-in screen** — `app/index.tsx`, which is the route for `/` and
  therefore the PWA's `startUrl` (`app.json`). Also `src/data/session.ts` (who is signed in)
  and `src/lib/supabase.ts` (where the session is kept).

- CURRENT BEHAVIOUR (read in the files, 2026-09-07):

  **The session has always persisted. The screen never asked whether it had.**

  `src/lib/supabase.ts` builds the browser client with `storage: AsyncStorage`
  (`localStorage` on web), `persistSession: true` and `autoRefreshToken: true`. A successful
  PIN goes to the `auth-login` Edge Function, which verifies it against the shadow GoTrue
  credential and hands back a real session; `adoptSession` (`src/data/api.ts:79`) calls
  `supabase.auth.setSession`, and GoTrue writes the refresh token to storage and a row to
  `auth.refresh_tokens`. That token survives the tab, the window and the process.

  `app/index.tsx` then renders the mobile-number field **unconditionally**. It contains no
  call to `supabase.auth.getSession()`, no `useAppUser`, no `useIdentity` — verified by grep.
  So every reload, every revisit and every launch from the home-screen icon lands on the
  number field on top of a session that was live the whole time.

  Two further things follow from persistence never having been exercised:
  - `signOut()` (`src/data/session.ts:132`) calls `supabase.auth.signOut()` with supabase-js'
    default scope, `'global'` — which revokes **every** session the account holds anywhere.
  - `is_active` is checked by `auth-login` on every entry, and nowhere else. Entry was the
    only door, so that was sufficient.

- DESIRED BEHAVIOUR: requester's words — *"we want the user to remain logged in until they
  explicitly click Sign Out, subject to reasonable server-side session expiry/security
  rules"*, and *"do not introduce JWT just for this requirement"*.

  Read as:
  1. `/` asks the **server** whether a session is live before it shows a number field, and
     sends a confirmed one straight to the shell that account has.
  2. Signing out ends **this device's** session server-side and requires the number and PIN
     again.
  3. A session that outlives the browser does not outlive the account: a disabled or deleted
     account is refused on the way back in, as it is on the way in.

- WHY: stated — *"every time the user revisits/reloads the RosiFit URL, they are asked to
  enter their mobile number and 4-digit PIN again"*.

- MUST NOT CHANGE: everything not named above. Specifically —
  - The PIN flow itself: `auth-login`, `auth-lookup`, `auth-bootstrap`, the security
    questions, `set-pin`, `forgot-pin`, `pin-issue`, `pin-reset`. None are touched.
  - The authorization model. RLS keyed on `auth.uid()` stays the boundary; no policy,
    migration or grant changes.
  - The prototype. With no project configured the app runs on fixtures and must still be able
    to reach its own sign-in screen.
  - `public.sessions` (0007) is **class sessions** and is not auth. Nothing here goes near it.

## THE ASK AS SPECIFIED VS THE ASK AS BUILT

The request specified a mechanism: a new session table, a session id in an **HttpOnly
cookie**, and `GET /api/auth/session`. That mechanism was inspected and not built, and the
requester chose that on 07-Sep-2026 after being shown why. The reasoning is
[ADR-031](../docs/decisions/024-the-session-was-never-lost-the-screen-never-asked.md);
the short form is that this app has no server on its own origin to set such a cookie or serve
such an endpoint, and the API that would set one is on a different registrable domain, so the
cookie would be third-party and dead on iOS.

**Session lifetime — chosen by the requester, 07-Sep-2026: indefinite until Sign Out**, and
configurable rather than hardcoded, which it already is: it is the Supabase project's Auth
setting, not a constant in this repo. See the ADR's "Session lifetime" section.
