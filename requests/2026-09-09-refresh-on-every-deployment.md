# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS

- FEATURE / SCREEN: **The deployed web app itself** — no screen. The update path a running
  session takes when a new build is deployed: `public/sw.js` (the worker's update policy),
  `app/+html.tsx` (which registers it) and `app/_layout.tsx` (the root every session mounts).

- CURRENT BEHAVIOUR (read in the files, 09-Sep-2026):
  1. **A launch gets the newest build.** The worker is network-first on navigations, so opening
     the app fetches the current HTML, which names the current content-hashed bundle.
  2. **A session already running never learns anything.** There is no update check anywhere in
     the app. `sw.js` says so in its own words — *"a new deployment takes effect the next time
     the app is launched"* — and deliberately does not skipWaiting.
  3. **The installed PWA is a tab that is never closed.** `display: standalone`, resumed from the
     background for weeks. (2) and (3) together are the defect: a deployment can go unseen
     indefinitely by exactly the person the app was installed for.

- DESIRED BEHAVIOUR: requester's exact words —

  *"On every deployment app should refresh automatically so that its has the new version lates
  updates from latest deployment"*

  Read as: a running session notices a new deployment on its own and reloads onto it, without
  anybody being told to close the app, hard-refresh, or clear anything.

- WHY: `unknown` — not stated. The evident one: fixes shipped are not reaching the person using
  the app, so a defect can be reported again after it was fixed.

- MUST NOT CHANGE: everything not named above. Named explicitly because the ask touches their
  edges: **guardrail 1** — nothing here caches, stores or re-reads member data, and the probe is
  one HTML document; **guardrail 4** — no new environment variable, public or otherwise, and no
  build stamp to plumb; the worker's caching strategy, its cache name, its KILL_SWITCH and its
  refusal to skipWaiting; the installability the head tags carry
  (`requests/2026-09-07-installable-pwa.md` and its spec); every screen, string and permission.

- CORRECTION ROUND: **1** — first round on the update path. Prior round on this surface:
  `2026-09-07-installable-pwa.md`, which added the worker and wrote the update policy this
  amends. Nothing here reverses it — see Q2.

## ANSWERS TAKEN AT INTAKE

None — the ask was one sentence and no questions were put back. Everything below is a reading,
recorded as such.

## OPEN QUESTIONS — readings taken, not settled by the requester

- **Q1. What identifies "a new deployment"?** Not stated. Reading: **the name of the exported JS
  bundle**, `/_expo/static/js/web/entry-<hash>.js`, which every exported page references and
  which changes when and only when the code changes. Verified in `dist/`: `index.html`,
  `attendance.html` and `audit.html` all name the same one. The alternative — a build stamp
  written at export time into a version file — is a second thing to keep in step with the thing
  it claims to describe, and it can drift; the hash cannot.
  **Consequence, accepted:** a deployment that changes no JavaScript at all (an icon, the
  manifest, `sw.js` itself) is not seen by this check. It also does not need a reload — the
  worker refreshes those on its own.
- **Q2. Does "automatically" mean immediately?** This is the load-bearing one. Reading: **no —
  automatically, but never under her fingers.** A reload throws away whatever is typed and not
  yet saved, and this app is used standing up, mid register. So the new build is noticed at once
  and taken when the app is BACKGROUNDED (the common case: she comes back to the new version
  having never seen a reload) or after an unbroken minute with no touch, key or pointer. Until
  then it waits. Nobody is asked to press anything: there is no banner and no button.
- **Q3. Does the worker start skipWaiting?** Reading: **no**, and its spec still forbids it. It
  is the page reloading that puts the new build on screen; swapping a bundle under a live
  document is the thing the worker exists not to do.
- **Q4. How often does it ask?** Not stated. Reading: on the app becoming visible or hidden, on
  window focus, on coming back online, and every five minutes otherwise. The probe is one small
  HTML document fetched `no-store`; the worker passes it straight through, uncached.
- **Q5. What if the answer is unreadable — a captive portal, a CDN error page, an offline
  fetch?** Reading: **do nothing.** No bundle named in the answer means no information, never a
  change. Reloading onto a captive portal is how this feature would become the outage.
- **Q6. What if the server disagrees with itself mid-rollout?** Reading: the tab remembers, in
  `sessionStorage`, the build it last reloaded for and will not reload for that same answer
  twice — a reload loop is unrecoverable for whoever is holding the phone.
- **Q7. Native?** Reading: **out of scope, no-op.** There is no `document` on native and no
  native deployment; the ask is about the deployed web app.
- **Q8. Permissions.** Not mentioned. Reading: unchanged.

## DESIGN SURFACE

- VISUAL?: **no** — nothing is drawn. No banner, no toast, no button, no new string anywhere.
- SCREENS & STATES TOUCHED: none. One component mounted at the root that renders `null`.
- STRINGS ADDED: none.
- PERMISSIONS: **no**.
- USAGE: the installed PWA on Vercel, `display: standalone`, resumed from the background.
- RUN MODE: `auto`.
- SCALE: micro-plus — one pure module with its spec, one mount, one comment amended in `sw.js`.
