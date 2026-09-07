# NEW FEATURE REQUEST
<!-- Filled by workflows/request.md (/request) · Consumed by Track A: /feature requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - the Gate 1 questionnaire covers it. -->

Run **Track A** ([workflows/feature.md](../../workflows/feature.md)) with this request.

## FIELDS
- FEATURE NAME: Installable PWA
- ONE-LINE GOAL: A user opening RosiFit in a browser can install it to their home screen or desktop and launch it as a standalone app.
- WHO USES IT: unknown (requester said "this app" — no role named)
- MUST-HAVE in v1: the app is installable from the browser (requester's words: "downloadable as pwa") — requester to trim at Gate 1
- EXPLICITLY OUT of v1: unknown
- KNOWN CONSTRAINTS: none stated by the requester. Observed at intake, not stated: the web build is
  Expo SDK 57 Metro static export (`npx expo export --platform web`, `app.json` `web.bundler: "metro"`),
  deployed on Vercel per `vercel.json`.
- MARKET / REGION: unknown
- RUN MODE: auto (requester said "proceed", named no gate to wait at)

## USAGE PROFILE
- PRIMARY OBJECTIVE: Install RosiFit once and afterwards open it like an app rather than through a browser tab.
- PRIMARY WORKFLOW: unknown
- FREQUENCY OF USE: unknown (installing is once per device; how often the installed app is opened was not stated)
- OPERATING ENVIRONMENT: unknown — which browsers and devices must be able to install (Android/Chrome, iOS/Safari, desktop) was not stated
- ESSENTIAL INFO (visible immediately): unknown
- OPTIONAL INFO (progressively disclosed): unknown
- FREQUENT ACTIONS (immediate access): unknown
- OCCASIONAL ACTIONS (secondary access): unknown
- AUTOMATE (no interaction wanted): unknown
- MUST STAY MANUAL: unknown

## DESIGN SURFACE
- SCREENS / ENTRY POINTS: unknown. The requester named no screen. Whether the app shows its own
  install affordance, or relies solely on the browser's built-in install control, is a Gate 1 question.
- STATES REQUESTER CARES ABOUT: unknown. Notably, what the installed app should do with no network
  was not stated — a service worker is a technical prerequisite for installability on Chromium, and
  what it may serve from cache is a decision the requester has not made.
- VISIBLE STRINGS STATED: none

## INTAKE FINDINGS (observed, not stated — do not treat as binding)
Recorded because the requester's question was "why is this app not able to download as pwa" and the
answer is evidence the consuming track needs. These are observations, not requirements:
- `dist/` contains no `manifest.json` and no exported HTML contains `<link rel="manifest">`.
- The `expo.web` keys in `app.json` (`name`, `shortName`, `themeColor`, `backgroundColor`, `display`,
  `startUrl`, `description`) are legacy `@expo/webpack-config` / expo-pwa options. The build uses the
  Metro static export, which does not read them and emits no manifest. They are silently inert today.
- No service worker exists and no `public/` directory exists.
- `assets/` has `favicon.png` and `icon.png`; no 192x192 / 512x512 / maskable icons.
- `app/+html.tsx` does not exist, so there is no root document in which to inject PWA head tags.

## STANDING INSTRUCTIONS (do not edit)
- Follow Track A end-to-end: Gate 1 questions → Gate 2 feasibility → Gate 3 design → Gate 4
  plan → build → test gate. **Confirm mode stops at every gate; auto mode (default) logs each
  checkpoint's decisions to the ASSUMPTIONS ledger and proceeds — hard stops and the
  mechanical test gate bind in every mode.**
- Anything stated in FIELDS is binding and overrides assumptions; every `unknown` becomes a
  Gate 1 question with a reasoned recommendation — never a silent assumption.
- Ground first (Step 0): `CLAUDE.md`, `docs/registers/KNOWN_LIMITATIONS.md`,
  `docs/registers/CANONICAL_PATTERNS.md`, `docs/registers/ROOT_CAUSE_REGISTER.md`.
- The USAGE PROFILE is the information hierarchy: essential/frequent renders on the primary
  screen with the primary action immediately reachable; optional/occasional is progressively
  disclosed; automatable steps are eliminated, not rendered. The design translates it via
  docs/24 §3b — never invents what it does not state.
- **No application scaffolded yet (NEW-APP)?** Initialization runs first —
  `docs/02-PROJECT-INITIALIZATION.md`, `npm run new:app` — then this file moves into the new
  app's `requests/` and Track A runs **inside the new app**, scoped to the first shippable
  slice named above.
