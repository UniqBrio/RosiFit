# ADR-038 — A deployment reaches a session that is already running

**Status:** Accepted
**Date:** 09-Sep-2026 · **Deciders:** taken on the run's own recommendation in auto mode
(`requests/2026-09-09-refresh-on-every-deployment.md`, Q1–Q6), and reported for review.

## Context

ADR-032 settled what the worker may remember and ended with a promise: *no skipWaiting — a new
build activates on the next launch, never by swapping the JS bundle underneath somebody half
way through marking a register.* That promise is still right. Its unexamined half is the word
**launch**.

The app is installed, `display: standalone`, and resumed from the background. It is a tab that
is never closed. So "the next launch" can be days away, or never — and in between, every fix
that ships is invisible to the one person the app was installed for. A defect can be reported,
fixed, deployed, and reported again, all against a build that was replaced a week ago.

The requester asked for the app to refresh itself on every deployment.

## Decision

**A running session watches for a new build and reloads onto it — at a moment when the reload
costs nobody anything.**

1. **A build is identified by the bundle the export already names.** Every exported page
   references one content-hashed `/_expo/static/js/web/entry-<hash>.js`, and that hash changes
   when and only when the code changes. It IS the build id. Nothing is stamped, generated or
   written down, so there is nothing that can drift from what it claims to describe.
2. **The check is one small HTML document.** The start URL, fetched `no-store`. The worker
   passes it straight through — it is not a navigation, not build output and not an icon — so
   it is never answered from a cache.
3. **The reload waits for a safe moment, and takes the first one.** The app going into the
   BACKGROUND is the free moment and is taken outright: she comes back to the new version
   having never seen a page reload. Otherwise it takes an unbroken minute with no touch, no key
   and no pointer. Until then it waits, re-asking every fifteen seconds.
4. **Nobody is asked to press anything.** No banner, no *Update available*, no button, no new
   string anywhere. "Automatically" was the ask.
5. **The worker is unchanged.** Still no skipWaiting, still network-first, still no data cache.
   It is the PAGE that reloads; no bundle is ever swapped under a live document. ADR-032 stands
   in full — this amends only the reading of "launch".

## Options rejected

- **A version file written at export time** (`/version.json` and a matching build stamp in the
  bundle). Two artifacts that must agree about one fact, kept in step by a build script — and
  when they stop agreeing, the app either reloads forever or never. The bundle hash is the same
  fact with nothing to keep in step.
- **`EXPO_PUBLIC_BUILD_ID`.** A new public environment variable, plumbed through a build
  wrapper, to carry something the export already prints in every page.
- **skipWaiting, and reloading on `controllerchange`.** The direct route, and the one ADR-032
  refused. It swaps the bundle under a live document, which is the failure mode both records
  exist to prevent.
- **A banner: "A new version is available — Reload".** Honest, conventional, and not what was
  asked for. It also puts the decision on somebody standing in a studio holding a phone, mid
  register, which is the worst moment to be asked a question about JavaScript.
- **Reloading the instant a new build is seen.** Throws away whatever is typed and not yet
  saved. There is no undo on that, and this app is used one-handed while somebody talks.
- **Polling faster than five minutes.** A deployment nobody sees for five minutes is not the
  failure this record is about.

## Consequences

- A deployment that changes **no JavaScript at all** — an icon, the manifest, `sw.js` itself —
  is not seen by this check. It also needs no reload: the worker refreshes those on its own.
  Recorded in `KNOWN_LIMITATIONS.md`.
- A session left open with something typed and untouched for a minute can lose it to a reload.
  Nothing in this app auto-saves a draft, so this is a real, accepted cost of "automatically";
  the alternative is the banner rejected above.
- An unreachable or unreadable answer — offline, a captive portal, a CDN error page — is read
  as **no information**, never as a change. Reloading onto a captive portal is how this feature
  would become the outage.
- A server disagreeing with itself mid-rollout cannot cause a reload loop: the tab remembers in
  `sessionStorage` the build it last reloaded for and will not reload for that answer twice.
- Native does nothing at all. There is no `document` there and no native deployment.

## Honoured in

`src/pwa/deployment.ts` (the rules, pure), `src/pwa/deployment.test.ts` (nine cases, six of
them about not firing), `src/pwa/DeploymentRefresh.tsx` (the DOM wiring), `app/_layout.tsx`
(mounted once, renders nothing), `public/sw.js` (its update-policy comment now says where the
other half lives).
