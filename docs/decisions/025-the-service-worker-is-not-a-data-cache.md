# ADR-032 — The service worker is a shell, not a data cache

**Status:** Accepted
**Date:** 07-Sep-2026 · **Deciders:** taken on the run's own recommendation in auto mode
(`requests/2026-09-07-installable-pwa.md`, Gate 1 Q2 and Q7), and reported for review.

## Context

The app has called itself a PWA since it was bootstrapped, and was never installable. The
`expo.web` keys in `app.json` — `name`, `shortName`, `themeColor`, `display`, `startUrl` —
are options of the retired `@expo/webpack-config` PWA pipeline; this app exports through
Metro, which does not read them. They emitted no manifest and no head tags, and read in a
diff exactly like configuration that works.

Making the app installable needs a manifest, icons, and — on Chromium — a **service worker
with a fetch handler**. That last requirement is the whole reason a worker exists here. It
arrives as a side effect of wanting an install button, and a service worker is a proxy that
sits in front of every request the app makes, forever, with its own lifetime independent of
the deployment that installed it. What it is allowed to remember is therefore a real
decision, not a configuration detail.

## Decision

**The worker caches the app shell and nothing else.**

1. Only same-origin GETs are ever intercepted. Supabase is a different origin, so every
   read, write and Edge Function call passes through untouched — the worker never sees the
   member list, never stores it, and cannot serve it.
2. Non-GET methods are never intercepted at all.
3. Documents are **network-first**: a live network always wins, so a deployment is visible on
   the next launch and no screen is served from yesterday while the network is fine. The
   cached shell is a fallback for when the network is gone.
4. Build output under `/_expo/static/` is cache-first, because it is content-hashed and
   therefore immutable.
5. No `skipWaiting()`. A new build activates on the next launch, never by swapping the JS
   bundle underneath somebody half way through marking a register.

Offline, the app opens and its screens render their existing error state (CP-002, CP-003):
*we could not reach the server, and nothing was changed by it.*

## Why

Guardrail 1 says the follow-up list is derived from the member list and never stored as a
second list, because two lists is exactly how the dashboard count and the weekly list drift
apart. **A cached API response is a second list.** It would be a copy of the member data,
with its own age, sitting in the browser, invisible to every query in `src/data/repository.ts`
and to CP-001's rule that one module decides where data comes from.

The failure that buys is worse than an error message. A coach opens the app on a bad
connection at the counter, sees a register that looks completely normal, and marks attendance
against yesterday's roster. Nothing about that screen says it is stale. An offline app that
says "we could not reach the server" is a smaller product than one that works offline, and a
much more honest one.

Offline attendance is a genuine feature and a reasonable thing to want. It is not this one.
It needs a sync model, conflict rules and a visible staleness state, and it starts with a
`/request` of its own — not with a cache that quietly makes the app appear to have it.

## Consequences

- Installable on Chromium and on iOS. The install itself is the browser's own control; the
  app renders no install UI (Gate 1 Q3).
- Offline, the app **shell** loads on any route, visited or not. The data does not.
- The rung is `src/pwa/manifest.test.ts`, which fails if the worker starts intercepting
  cross-origin requests or non-GET methods, or if `skipWaiting()` appears.
- A service worker outlives the deployment that installed it, so deleting the files from the
  server does not remove it from a browser that already has one. `public/sw.js` therefore
  carries a documented `KILL_SWITCH`: flip it to `true` and deploy, and the worker clears its
  caches and unregisters itself. That is the rollback path.
