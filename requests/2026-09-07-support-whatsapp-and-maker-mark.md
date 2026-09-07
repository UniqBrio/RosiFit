# CHANGE REQUEST — modify something that ships
<!-- Filed direct from the requester's words, 07-Sep-2026. Track B, small surface. -->

## FIELDS
- FEATURE / SCREEN: **Help & support** — `app/help.tsx`, reached from More → App →
  Help & support (`app/(tabs)/more.tsx`).

- CURRENT BEHAVIOUR (read in the file, 07-Sep-2026): the whole panel is one Pressable
  that dials `tel:9994871158`. It shows the kicker *TAP TO CALL*, the bare ten digits,
  and one row reading *Call RosiFit support* beside the `call` glyph. Below it, the C-90
  card names that number as the only support channel. There is no maker's mark.

- DESIRED BEHAVIOUR: requester's exact words — *"under more under help and support add
  show number with phone icon and whatsapp leading them to call and whatsapp and the
  support name is UniqBrio support add +91 before phone number. and at bottom show as
  powered by Uniqbrio and add both websites uniqbrio.com and uniqbotz.com"*.

  Read as five things:
  1. The number is shown **+91 9994871158**, not `9994871158`.
  2. Two actions on that one number — **Call** (phone icon) and **WhatsApp**.
  3. The desk is named **UniqBrio support**, not *RosiFit support*.
  4. A **Powered by UniqBrio** mark at the foot of the screen.
  5. Both sites — **uniqbrio.com** and **uniqbotz.com** — reachable from that mark.

- WHY: `unknown` — the requester did not say. Read at intake as an attribution and a
  second, cheaper way to reach the same desk; nothing in the code required the change.

- MUST NOT CHANGE:
  - **The number itself.** `SUPPORT_PHONE` stays `9994871158`; +91 is added as a dial
    code, not typed into the constant, so `tel:` / `wa.me` / display each derive it.
  - **The C-90 anti-phishing control.** Two buttons on ONE number is still one channel,
    so the card stays and its claim stays true — the wording only says so out loud.
  - Guardrails 2 and 3: no colour literal, no unmeasured pair, every icon a real glyph
    beside its own word. `check-contrast` and `check-icons` stay green.
  - Everything else on the screen and everywhere else in the app.

- CORRECTION ROUND: 1 on this surface.

## DESIGN SURFACE
- VISUAL?: yes. Both themes verified in the exported web build, not assumed.
- SCREENS & STATES TOUCHED: Help & support (the one ready state — it reads constants and
  has no load, error or permission state) and the **More** row's meta, which showed the
  bare digits and now shows the same `+91` form as the profile row above it.
- STRINGS ADDED OR ALTERED:
  - kicker *TAP TO CALL* → **UNIQBRIO SUPPORT** (the panel is no longer the button)
  - *Call RosiFit support* → two buttons, **Call** and **WhatsApp**
  - lede gains *"or message"*; the C-90 card opens *"This one number, by call or by
    WhatsApp, is the only support channel"* and names **UniqBrio support**
  - new: **Powered by UniqBrio**, *uniqbrio.com* · *uniqbotz.com*
- PERMISSIONS: no change — Help is reachable by every signed-in role, as before.
- RUN MODE: auto.

## DECISIONS TAKEN WHILE BUILDING
- **The panel stopped being a button.** With two destinations, a whole-card tap could
  only ever have meant one of them. The number is now text; the two actions are two
  targets of 52pt, above the 44pt floor.
- **The WhatsApp mark is not a Material Symbol.** Neither Material Icons nor the canvas'
  Material Symbols has one, so it comes from `MaterialCommunityIcons` through a separate
  `WhatsAppIcon`, behind the same font gate as `Icon`. It is deliberately NOT aliased
  through `iconAlias.ts`: that map and `scripts/check-icons.ts` are a statement about the
  canvas' Material vocabulary, and aliasing a brand to the nearest speech bubble would
  have made the button render `chat` while claiming to say WhatsApp.
- **No brand green.** Both icons take `STATUS.present`, which `check-contrast.ts` already
  measures against `control` in both themes. WhatsApp's own #25D366 is an unmeasured
  literal and guardrail 2 does not allow one.
- **The footer takes `theme.onDeep`, not the screen's local `onDeep`.** It sits on the
  bare gradient rather than on a panel; the local variable is the light theme's near-black
  and only clears on a surface. See OBSERVED below.

## OBSERVED AT INTAKE — not part of this ask
- **The light theme's Help heading and lede are near-black on the deep purple gradient.**
  `app/help.tsx` sets `const onDeep = theme.isDark ? theme.onDeep : theme.fgStrong`, and
  `<H1>` takes `theme.fgStrong` too, so in light mode both sit on a dark ground the
  contrast gate never measures them against — it measures `theme.onDeep` on the deep
  stops, which is `#FFFFFF` in light. Pre-existing, unchanged by this request, and NOT
  fixed here because nobody asked. Carried for the requester's call.
- **React error #418 (hydration) fires on every route of the static web export**, `/help`,
  `/appearance`, `/branches` and `/audit` alike. Pre-existing and not introduced here.
