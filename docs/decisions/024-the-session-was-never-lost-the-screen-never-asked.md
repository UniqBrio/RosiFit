# ADR-031 — The session was never lost; the screen never asked

**Status:** Accepted
**Date:** 07-Sep-2026 · **Deciders:** the requester, directly, on a presented trade-off
**Relates to:** guardrail 4 (secrets never reach the bundle) · [ADR-008](008-continue-validates-the-number.md)

## Context

The report was *"every time the user revisits/reloads the RosiFit URL, they are asked to enter
their mobile number and 4-digit PIN again"*, and the request that carried it specified a
remedy in some detail: a database session table, a cryptographically random session id stored
as a **hash**, an **HttpOnly / Secure / SameSite** cookie, a `GET /api/auth/session` endpoint,
and cookie-validated protected routes. It also said, twice, *"do not introduce JWT just for
this requirement."*

Inspection found something the report could not have known: **none of that was missing, and
the one part that was missing was fifteen lines.**

- The PIN is verified server-side by the `auth-login` Edge Function and has never been stored:
  it is peppered with `PIN_PEPPER`, keyed on the immutable `app_users.id`, and used as the
  password of a shadow GoTrue user (0003).
- GoTrue then issues a session whose refresh token is **a row in `auth.refresh_tokens`** —
  server-side, per device, individually revocable, rotating. That *is* a database-backed
  session table with a hashed, cryptographically random token, and it has been there since 0003.
- `src/lib/supabase.ts` has always persisted it: `storage: AsyncStorage` (`localStorage` on
  web), `persistSession: true`, `autoRefreshToken: true`. It survives the tab, the window and
  the process.

`app/index.tsx` is the route for `/`, which is also the PWA's `startUrl`. It rendered the
mobile-number field **unconditionally** — no `getSession()`, no `useIdentity`, nothing. Every
reload arrived at a number field laid over a session that was live the entire time.

The bug was not a missing session system. It was a screen that never asked.

## The specified mechanism, and why it is not buildable here

Three facts, each independently fatal:

**1. There is no server on the app's own origin.** `vercel.json` is a pure static export —
`npx expo export --platform web` into `dist`, `cleanUrls`, and rewrites. There is no `api/`
directory, no middleware, no SSR; verified. There is nowhere for `GET /api/auth/session` to
run and nothing that can read a cookie on a request.

**2. A cookie set by the API would be third-party.** PostgREST and the Edge Functions live on
`*.supabase.co`, a different registrable domain from the app's. `SameSite=Lax` or `Strict` —
which the request asks for — would mean the cookie is *never sent from the app at all*. The
only workable value is `SameSite=None; Secure`, which Safari's ITP blocks outright. For an
installable PWA whose main install target is iOS, that reproduces the exact bug being fixed,
intermittently and only for some users.

**3. Authorization is RLS, and RLS reads the JWT.** `current_app_user_id()`,
`is_active_app_user()` and `is_super_admin()` (0003) all resolve `auth.uid()`, and every policy
in 0003–0040 is built on them. PostgREST cannot see a cookie of ours. Making the cookie the
credential means re-keying the entire authorization model — which is the rewrite the request's
own §11 forbids.

And on *"do not introduce JWT"*: there is nothing to introduce. The JWT is already here and
load-bearing. **Removing it is the rewrite.** The instruction was written to prevent someone
reaching for a token library to solve a persistence problem; honouring its intent means using
the sessions that exist, not building a second system beside them.

## Options considered

### Option A — Ask the server on `/`, inside the architecture that exists *(chosen)*
**Pros:** fixes the actual defect. Works on iOS Safari, which the cookie cannot. Touches no
policy, no migration and no grant. The session it resumes is already server-side, revocable
and per-device, so §§9 and 10 of the request are satisfied by what is there rather than by
something new beside it.
**Cons:** does not deliver an HttpOnly cookie, so the refresh token stays readable by
JavaScript. That is a real, unclosed exposure — see "What this does not fix".
**Cost:** one new pure module, one screen gated, two lines in `session.ts`.

### Option B — Vercel serverless function + session table + HttpOnly cookie
**Pros:** the literal request. Would close the XSS exposure for the cookie's own credential.
**Cons:** the cookie is still third-party to Supabase, so **RLS keeps needing the JWT** — the
app would carry two parallel authentication systems that must agree, and the one that
authorizes anything would still be the one in `localStorage`. Nothing is closed and a whole
system is added. Breaks on iOS. A new session table cannot even take the obvious name:
`public.sessions` is class sessions (0007).
**Cost:** a large, load-bearing addition that makes the security posture worse, not better,
by splitting it in two.

### Option C — Move token storage to `expo-secure-store`
**Pros:** `expo-secure-store` is already a dependency. On native it is the Keychain/Keystore.
**Cons:** **on web it is `localStorage` again** — the platform this request is about. It would
read as hardening and change nothing where it matters.
**Cost:** the appearance of a fix.

## Decision

Build Option A.

`/` asks the server before it shows a number field. The answer is not "is there a token" —
anyone can put a string in `localStorage` — but two server acts in order: GoTrue refreshes the
session (a revoked or expired refresh token fails the exchange and there is no session), and
the identity is then read back through PostgREST **under RLS**, where `app_users_read` is
`is_super_admin() or auth_user_id = auth.uid()`. That query can only answer for the account the
presented JWT actually belongs to. The database resolves the owner; the app never claims one.

Three states, kept apart because they mean different things:

| state | what it means | what happens |
|---|---|---|
| `active` | the server confirmed her | resume — to `set-pin` if a first PIN is owed, else to her role's home |
| `none` | the server answered, and there is nothing | sign-in screen; the dead session is cleared |
| `closed` | the server answered, and this account may not come in | sign-in screen; her session is **ended**, not merely refused |
| `unverified` | the server did not answer | sign-in screen; **the stored token is left alone** |

`unverified` not resuming is the whole principle restated: if the server did not say yes, the
answer is not yes. It is also not a lock-out — the token is untouched, so the next visit that
reaches the server resumes without a PIN. Collapsing it into `none` would sign a coach out of
her own phone every time the academy wifi blinked.

`closed` is **the check persistence makes necessary**. A disabled account used to meet
`is_active` at `auth-login` on every single entry, because entry was the only door. A session
that survives the browser would carry her past that check indefinitely.

### Two things this also corrects

**Sign out is now this device's, not every device's.** `supabase.auth.signOut()` defaults to
`scope: 'global'`, which revokes every session the account holds anywhere — so signing out of
the academy laptop at closing time also signed her out of her own phone. It is now
`scope: 'local'`. Both revoke server-side; only the scope differs. Every-device revocation
still exists and is still used where it *means* something: `signOutEverywhere()` in
`supabase/functions/_shared/identity.ts`, called by `pin-reset`, because a PIN that has just
been reset should not leave old devices holding a live session.

**The first paint tells the truth.** `restoring` starts true whenever the app is configured, so
that sheet is what `expo export` prerenders into `dist/index.html` — the first paint *every*
visitor gets, signed in or not, before any effect runs. The first wording was "Signing you back
in…", which tells a first-time visitor something untrue for as long as the check takes. It
reads "Checking if you are already signed in…", which is true either way.

## Session lifetime

**Indefinite until Sign Out** — chosen by the requester on 07-Sep-2026, from a presented choice
that offered 30 days sliding as the recommendation.

The request asked that indefinite sessions be **configurable rather than hardcoded**. They
already are, and not in this repo: the lifetime is enforced by GoTrue from the Supabase
project's Auth configuration — *Time-box user sessions* and *Inactivity timeout*, both unset,
which is what "indefinite" means here. Changing the policy is a project setting, takes effect
server-side for every device at once, and needs no code change and no deploy.

That is deliberate and worth stating plainly: **there is no session-lifetime constant in this
codebase, and there must not be one.** A client-side expiry is a client-trusted expiry — the
device deciding when its own credential has died — which is the class of thing this whole
record is about not doing.

## What this does not fix

The refresh token lives in `localStorage`, where JavaScript can read it. **An XSS on this
origin can steal a session.** An HttpOnly cookie is the standard answer and it is the one thing
the requested design would genuinely have bought — and, for the three reasons above, it cannot
be bought cross-origin here.

This is not closed by this record and should not be read as accepted-and-forgotten. What
actually reduces it is reducing XSS surface (this app builds no HTML from user input and loads
no third-party scripts, which is why the exposure is theoretical today) and, if it is ever to
be closed properly, moving the app and its API behind **one origin** — a reverse proxy or a
Vercel function layer in front of Supabase — at which point the cookie becomes first-party and
Option B becomes buildable for the first time. That is a platform change, not a login change,
and it is not this request.
