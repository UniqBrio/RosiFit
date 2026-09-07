# RUN — Installable PWA (Track A, scoped)

Request: [requests/2026-09-07-installable-pwa.md](requests/2026-09-07-installable-pwa.md)
**RUN MODE:** auto · **SCALE:** scoped · **Date:** 07-Sep-2026

## FIELDS — from your request, correct anything wrong
- FEATURE NAME: Installable PWA
- ONE-LINE GOAL: A user opening RosiFit in a browser can install it to their home screen or desktop and launch it as a standalone app.
- WHO USES IT: unknown → Gate 1 Q1
- MUST-HAVE in v1: the app is installable from the browser ("downloadable as pwa")
- EXPLICITLY OUT of v1: unknown → Gate 1 Q3 settles the only candidate
- KNOWN CONSTRAINTS: none stated; observed — Expo SDK 57 Metro static export on Vercel
- MARKET / REGION: unknown (does not bear on this change)
- RUN MODE: auto

## Step 0 — grounding
`CLAUDE.md` (guardrails 1–5 all read) · `KNOWN_LIMITATIONS` KL-001..004 — none touch this ·
`CANONICAL_PATTERNS` CP-001 (one data module), CP-008 (colour from tokens), CP-015 (hydration
parity) are the three that bind here · `ROOT_CAUSE_REGISTER` RC-013 (a dependency's Node build
bundled into the app, build stayed green) — this run adds **no dependency**.
Branch `main`. Writable target: the local tree and a Vercel **preview** only.

## Gate 1 — questions, recommendations, and the answers taken (auto mode)

| # | Question | Why it matters | Options | Recommendation → **ANSWER TAKEN** |
|---|---|---|---|---|
| Q1 | Which platforms must be able to install? | iOS Safari ignores `display`/`theme_color` and needs its own meta+link tags; Chromium needs a service worker. Covering one is not covering the other. | (a) Chromium only (b) Chromium + iOS Safari (c) other | **(b)** — staff are on phones at the counter and a desktop in the office; iOS is a large share of the phone install base and costs three extra tags. |
| Q2 | What may be served from cache when offline? | This is the one decision that can do harm. A cached API response is a second copy of the member list. | (a) app shell only (b) shell + API responses (c) nothing | **(a)** — and it is not really a choice: guardrail 1 and CP-001 forbid (b). No Supabase request is ever cached. Offline navigation falls back to the cached shell and the screens render their existing error state (CP-002/CP-003). |
| Q3 | An in-app "Install" button, or the browser's own control? | An in-app button is a new screen element, a new string and a new state. | (a) browser control only (b) custom install prompt | **(a)** — minimum change for the ask. No new screen, no new string, no design surface. A custom prompt is a later `/request` if wanted. |
| Q4 | Icon artwork source? | A manifest without a 192 and a 512 icon is not installable. | (a) `assets/icon.png` 1024² (b) `rosifit-logo.png` 268×300 (c) new art | **(a)** for `purpose: any`; `assets/android-icon-foreground.png` (512², authored inside the maskable safe zone) over `android-icon-background.png` for `purpose: maskable`. (b) is too small to upscale. |
| Q5 | Manifest colours? | CP-008: no colour literal ships unmeasured. | (a) reuse app.json's stated values (b) new | **(a)** — `theme_color #5C0F63`, `background_color #130D18`. `#5C0F63` is the RosiFit preset's `deep` stop, `src/theme/tokens.ts:39`. A manifest is static JSON outside the token module's reach, so a **unit test asserts the manifest colour still equals the token** — the link is enforced, not just written down. |
| Q6 | Display mode / orientation? | Decides whether the installed app shows browser chrome. | (a) `standalone` + `portrait` (b) `fullscreen` (c) `minimal-ui` | **(a)** — matches the intent already stated in `app.json` (`display`, and `orientation: portrait`). |
| Q7 | Service-worker update policy? | `skipWaiting` swaps the JS bundle under a session in progress. | (a) activate on next launch (b) `skipWaiting` + immediate claim | **(a)** — no `skipWaiting`. A new build takes effect the next time the app is launched; old caches are deleted on activate. Swapping the bundle mid-way through marking a register is exactly the failure worth avoiding. |
| Q8 | Any permission or role change? | RBAC_MATRIX's five questions. | — | **No new capability, no existing permission changes meaning, no role visibility change.** Installing is a browser action; the installed app authenticates identically. |

**Cardinality check:** no entity pair is touched — this change adds no table, column or relation. N/A.
**Limitation awareness:** no active KL entry applies.
**USAGE PROFILE unknowns** (frequency, essential/optional info, frequent/occasional actions,
automate, must-stay-manual): all N/A — Q3's answer means this feature renders **no UI at all**.
Nothing is designed, so there is nothing for the profile to subtract from.

## Gate 2 — feasibility (one paragraph; build-vs-buy is not a real question here)
Everything needed is already in the tree and verified by reading it, not assumed:
`expo export` copies a root `public/` folder verbatim into the output
(`node_modules/expo/node_modules/@expo/cli/build/src/export/exportApp.js:195` →
`export/publicFolder.js:64`, default folder name `public`), and expo-router supports a root
`app/+html.tsx` document (`getRoutesCore.js:102` excludes it from routing; the official template
ships at `@expo/cli/static/template/+html.tsx`). Icon sources are 1024² and 512², large enough.
**No new dependency.** Cost: zero recurring, zero at 10× scale — static files on the CDN already
serving the app. Manual action required of the requester: **none**. Verdict: **Build now.**

## Gate 3 — design essentials
This feature renders no application UI (Q3), so there is no screen, no state set, no string
table and no theme pass to run. What it *does* design is the installed app's identity:

| Surface | Light | Dark | Source |
|---|---|---|---|
| App icon (`any`) | `assets/icon.png` 1024², downscaled to 512 and 192 | same | one artwork, both themes — the icon sits on the OS launcher, not on an app surface |
| App icon (`maskable`) | foreground over the brand background plate, 512² | same | `android-icon-foreground.png` + `android-icon-background.png` |
| Splash / window background | `#130D18` | `#130D18` | `background_color`; matches the app.json value |
| OS chrome tint | `#5C0F63` | `#5C0F63` | `theme_color` = `ACCENTS.rosifit.deep` |

Accessibility: nothing new is focusable, so focus order, contrast pairs and the keyboard model
are unchanged. `theme:contrast` and `check:icons` remain the evidence for those areas.

## Gate 4 — implementation plan

| # | Task | Files | Acceptance |
|---|---|---|---|
| 1 | Generate the three PWA icons from existing artwork | `scripts/generate-pwa-icons.mjs` (new) → `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png` | Re-runnable; output dimensions exactly 192/512/512 |
| 2 | The manifest | `public/manifest.webmanifest` (new) | `name`, `short_name`, `start_url`, `scope`, `display`, `orientation`, `theme_color`, `background_color`, `description`, three `icons` |
| 3 | The service worker | `public/sw.js` (new) | Network-first for navigations with a cached-shell fallback; cache-first for `/_expo/static/**` only; every other origin, and every Supabase request, passes straight through untouched |
| 4 | Root document — manifest link, iOS tags, SW registration | `app/+html.tsx` (new) | The built head gains exactly the PWA tags; every pre-existing tag is byte-identical to `.evidence/pwa-head-before.txt` |
| 5 | The rung | `src/pwa/manifest.test.ts` (new) | Fails if the manifest loses a required field, an icon file goes missing, an icon's real dimensions stop matching its declared `sizes`, or `theme_color` drifts from `ACCENTS.rosifit.deep` |

**Root-cause compliance.** RC-013 (a Node build bundled into the app): no dependency added; the
icon script is a dev tool that runs once and commits its output, never imported by the app.
RC-015 (a divergence living only in a code comment): the manifest-to-token link is a test, task 5.
CP-015 (hydration parity): the SW registration is a plain `<script>` in the document head, not a
React effect, so it cannot make the first client render disagree with the export.
**Security:** the manifest and the worker are public static files containing no secret; the
worker never reads, stores or forwards a request body (guardrail 4). No endpoint is added.
**Performance budget:** three PNGs plus two text files, all CDN-cached; no change to the JS bundle.
**Rollback:** delete `public/` and `app/+html.tsx` and re-export. Because a service worker
outlives its deployment, `sw.js` also ships a kill switch — see the note in the file.

## Assumptions ledger (auto mode)
Every Gate 1 answer above was taken on the written recommendation and is logged there; Q2 and
Q7 are the two worth the requester's eye. Nothing here overrode a stated FIELD.

## A5 — what was built

| File | New / changed | What |
|---|---|---|
| `public/manifest.webmanifest` | new | the manifest |
| `public/sw.js` | new | shell-only worker, ADR-032 |
| `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | new (generated) | the icons |
| `app/+html.tsx` | new | the root document — CP-019 |
| `scripts/generate-pwa-icons.mjs` | new | the icon generator (dev tool, never imported) |
| `src/pwa/manifest.test.ts` | new | the rung, 7 cases |

Five source files, no schema change, no new navigation area, no new shared component, **no new
dependency** — the scoped lane holds. `app.json` deliberately untouched: its inert `expo.web`
keys are TD-042, not this change's to remove.

**Two Gate 1 answers were corrected by inspection, and the run says so rather than quietly
proceeding.** Q4 recommended `assets/icon.png` as the icon source; opening it showed it is the
unedited Expo scaffold placeholder — a blue "A" with construction guides — as are the favicon,
the splash icon and both Android layers (TD-044). The icons are built from
`assets/rosifit-logo.png`, the only real RosiFit artwork in the repo. Q5 recommended reusing
`app.json`'s `backgroundColor: #130D18`; that value matches no token in `src/theme/tokens.ts`,
so `background_color` is `DARK.bg` (`#08040A`) — what the app actually paints.

## Design QA verdicts — core six

| Area | Verdict | Evidence (one line) |
|---|---|---|
| User flow | PASS | The flow is the browser's own install control; the app adds no step and no screen (Gate 1 Q3). Install → the app opens standalone at `/`. |
| Visual hierarchy | PASS | No application UI changed. The only new visual is the installed identity: crest on `DARK.bg`, tinted `ACCENTS.rosifit.deep`. Icon inspected at 192 and 512. |
| Accessibility | PASS | Nothing new is focusable; focus order and the keyboard model are untouched. `check:contrast` 2840/2840, `check:icons` 75/75. |
| States | PASS | The state this change can produce is **offline**, and it was exercised, not assumed: `.evidence/pwa-installability.txt` — an offline navigation to a visited AND an unvisited route serves the real shell, and a cross-origin API request still fails rather than returning a cached body. |
| Simplicity | PASS | Subtraction pass: an in-app install button, an offline banner and a data cache were all considered and **removed** — the browser already offers the install, and the screens already have an error state that says the truth. |
| Overall | Production-ready | 15/15 browser checks; 7/7 unit cases; nothing in the app tree changed but one new root document. |

Areas not touched by this change: information architecture, navigation, forms, lists,
dashboards, copy, responsive, empty/loading, permissions, data density, motion, iconography —
one line, as the scoped lane allows: **not touched by this change.**

## Verification

| Check | Result |
|---|---|
| `npm run check` (typecheck · unit · contrast · icons) | **PASS** — 663 tests, 2840/2840 contrast pairs, 75/75 icons |
| `npm run export` | **PASS** — `public/` copied to `dist/` verbatim |
| Head-tag diff vs `.evidence/pwa-head-before.txt` | **PASS** — 0 pre-existing tags lost, exactly 7 PWA tags + the registration script added, on every route |
| Chromium installability, built `dist/` | **15/15 PASS** — `.evidence/pwa-installability.txt` |
| `npm run audit:colors` | **PASS** — 0 new; the head tag reads `ACCENTS`, so no literal ships |
| `npm run audit:testids` | **BLOCKED, and not this change's** — `app/forgot-pin.tsx` scores 2 against a baseline of 4. Reproduced identically with `app/+html.tsx` removed from the tree. |
| Hydration, 8 routes × 2 themes | **Unchanged by this change** — React #418 on 7 of 8 routes, byte-identical before and after. Pre-existing; logged as TD-043. |

**Fail-first evidence.** Two of the seven new cases were seen to fail first, for real: the
`skipWaiting` guard fired on the worker's own explanatory comment before being narrowed to the
call, and the `theme-color` case failed while the tag still carried a literal — which is also
what `audit:colors` blocked on, and why the tag now reads the token instead.

**Test dimensions.** Functional — covered, 15 browser checks against the built output.
Responsive — N/A, no UI. Performance — covered by inspection: 3 PNGs and 2 text files, no
change to the JS bundle. Security — covered: no secret, no endpoint, no request body read;
the worker's origin and method guards are asserted in `manifest.test.ts`.

**Business readiness: T1.** The changelog entry is written in the user's language; there is no
new screen to document, no new permission to explain and no operator action to schedule.

**The learning check.** *Would a correctly functioning process have caught this?* **No — and
that is the finding.** Nothing in the gate, the audits or the checklists asks whether the
product's own headline claim is true. `CLAUDE.md` opens with "Standalone women's fitness
academy PWA" and `KNOWN_LIMITATIONS` KL-001 reasons from it ("RosiFit is a PWA and every user
is on the web platform"), and the app was never installable — a claim repeated in two binding
documents and asserted nowhere. `FEATURE_TRUTH` now carries the row, so the claim has a
verdict and a rung behind it for the first time. Whether the framework should require that of
every headline claim is a `/promote` question, not an app one.
