# THEME SYSTEM — polarity, paired tokens, and theme-aware contrast proof
<!-- website_workflow/theme_system.md — added 2026-08-24 via framework_update.md.
     ESCALATED, not patched. This failure class appeared twice:
     (1) 2026-08-24 UniqBotz run, finding M-01 "The framework assumes a DARK
         theme, and says so in rules, not just examples" — root-caused, a
         5-point master edit set proposed, never applied.
     (2) the owner's request for a runtime light/dark toggle.
     M-01's fix (a {THEME_POLARITY} variable, one polarity per site) would
     have been insufficient: {BG_0} still held ONE hex, so a site running
     BOTH themes remained inexpressible. framework_update.md step 6 requires
     redoing root cause rather than re-patching, so this file replaces the
     single-valued colour model outright. -->

## ROOT CAUSE THIS FILE CLOSES
The colour tokens were single-valued AND dark was written as a rule, not a
default: design_library.md said "constraints that ALWAYS apply: dark theme",
reference_site_analysis.md fit-checked every pattern against "dark theme",
and {ACCENT_2_TEXT} was defined as "legal as text ON DARK" — a dark-theme
rule wearing a contrast rule's clothes. M-01 proved the rule genuinely
inverts: purple #6708C0 measures 8.85:1 on white (legal) while orange
#DE7D14 measures 2.98:1 (illegal) — the exact opposite of the dark guidance.
A rule that names a colour instead of a measurement is not a contrast rule.

## {THEME_MODE} — the switch that governs everything below
Set in site_profile.md. One of:
- **SINGLE-DARK** — DEFAULT for a new site. One dark palette. No toggle.
  Everything in this file except §PAIRED TOKENS applies trivially (one
  column filled).
- **SINGLE-LIGHT** — one light palette. No toggle.
- **DUAL** — light AND dark ship, with a runtime toggle. OPT-IN, because a
  toggle is real recurring cost: every token doubles, every asset needs a
  theme-safe treatment, and the evidence gate doubles. Choose it because
  the audience needs it, not because it looks modern. Score it like any
  other option (decision_matrix.md) rather than assuming it.
A site is SINGLE-DARK unless the owner says otherwise.

## PAIRED TOKENS (site_profile.md carries both columns when {THEME_MODE}=DUAL)
Every colour token is a PAIR. In SINGLE modes, fill one column and write
"n/a" in the other — never leave it blank, so a later switch to DUAL shows
exactly what is missing.

| Token | Role | Inverts? |
|---|---|---|
| {BG_0} | page background | yes |
| {BG_1} | card / raised surface | yes |
| {FG_0} | primary text | yes |
| {FG_1} | secondary / muted text | yes |
| {BORDER} | dividers, input outlines | yes |
| {ACCENT_1} | primary action fill | often the SAME hex both themes |
| {ACCENT_1_ON} | text/icon placed ON an {ACCENT_1} fill | yes |
| {ACCENT_2} | secondary accent | often same hex |
| {ACCENT_2_TEXT} | measured text-safe variant of {ACCENT_2} | yes |
| {FOCUS_RING} | focus indicator | yes |
| {SHADOW} | elevation | **inverts in KIND, not just value** |

Two traps this table exists to catch:
- **{ACCENT_1_ON}** — nothing previously forced anyone to measure the label
  sitting ON the primary button. That is how a 2.98:1 white-on-orange CTA
  reached an approved plan (UniqBotz M-02). The most important text on the
  page had no token.
- **{SHADOW}** — a black drop shadow tuned for a light theme is invisible on
  dark. Dark themes signal elevation with a lighter surface or a subtle
  glow, not a darker shadow. Copying the light value across is a silent
  loss of all depth cues.

## WHERE THE VALUES COME FROM
This file governs POLARITY and VALIDATES the result. It does not author
colour values: those are DERIVED from {BRAND_SEED} by
website_workflow/color_system.md and its generator. The paired table below
describes the token SHAPE; the generator fills it.

## CONTRAST IS COMPUTED, NOT PHOTOGRAPHED
The gate's PRIMARY evidence is an assertion over the token matrix, not a
screenshot. Screenshots spot-check; the computation proves.
1. Enumerate every (foreground token × surface token) pair that actually
   occurs in the UI — {FG_0}/{FG_1}/{ACCENT_2_TEXT} on {BG_0}/{BG_1};
   {ACCENT_1_ON} on {ACCENT_1}; {BORDER} and {FOCUS_RING} against both
   surfaces.
2. Compute the WCAG ratio for each, in EVERY active theme:
   relative luminance L per channel c in {R,G,B}: c_srgb = c/255;
   c_lin = c_srgb/12.92 if c_srgb <= 0.03928 else ((c_srgb+0.055)/1.055)^2.4;
   L = 0.2126*R_lin + 0.7152*G_lin + 0.0722*B_lin;
   ratio = (L_lighter + 0.05) / (L_darker + 0.05).
3. Thresholds: **4.5:1** body text · **3:1** large text (>=24px, or >=18.66px
   bold) · **3:1** UI component boundaries and focus indicators (WCAG 1.4.11).
4. Output a table: pair · theme · measured ratio · PASS/FAIL. Any FAIL blocks
   the gate. A ratio is a number — never round one up to make it pass, and
   never substitute "looks fine".
5. TOKEN PARITY (DUAL only): every token defined in one theme MUST have its
   counterpart. A missing pair is an automatic FAIL — this single check
   catches the most common theming bug, a colour added for one theme only.

## WHAT DOES NOT AUTO-UPDATE ON TOGGLE (the real failure list)
A CSS-variable swap updates less than people assume. Each item below has to
be handled deliberately, and each is a known invisible-text source:
- **Charts** — most libraries read colours ONCE at init and ignore later
  CSS-variable changes; the chart keeps light-theme axis/label colours on a
  dark page. Re-initialise or re-theme on toggle. (Also see
  resource_registry.md R-05: a marketing site often needs no chart library.)
- **Canvas / WebGL** — same problem; nothing is CSS-driven.
- **SVG ICONS with hardcoded `fill`/`stroke`** — use `currentColor` or
  per-theme variables. Functional glyphs carry no brand identity, so
  recolouring them is correct.
- **SVG LOGOS / WORDMARKS** — the opposite rule: **NEVER recolour the mark.**
  `currentColor` on a logo is recolouring. See §LOGO CONTRAST below; the fix
  is the background behind it, not the mark itself.
- **Images with a baked background** — need a transparent-background version,
  a per-theme variant, or a container that never inverts. Route through
  web-illustration-asset-production-pipeline, which already owns theme
  variants.
- **`<meta name="theme-color">`** — browser chrome stays the old colour.
- **Scrollbars** — set `color-scheme` so native scrollbars/controls follow.
- **Native form controls** — `accent-color`, and date/select popups.
- **Focus rings** — a ring tuned to one surface can vanish on the other; it
  is a 3:1 requirement, not decoration.
- **Shadows** — see the token table; they invert in kind.
- **Third-party embeds** (maps, video, widgets) — often cannot be themed;
  give them a neutral frame rather than pretending they switch.
- **`prefers-color-scheme` media-query assets** — an asset chosen by media
  query ignores an explicit user toggle that disagrees with the OS.

## LOGO CONTRAST — fix the background, never the mark
A logo's colours are a brand asset (often trademark-relevant). The mark is
FIXED; what changes per theme is what sits BEHIND it.

**WCAG does not require this.** SC 1.4.3 exempts logotypes, and 1.4.11
exempts "parts of a logo or brand name" — so an invisible logo can pass an
accessibility audit cleanly. This framework requires it anyway, because an
invisible logo fails the visitor regardless of what the audit says. Do not
"correct" this rule by citing WCAG at it.

### Decision order (cheapest first; measured, never assumed)
1. **Bare surface** — measure every logo colour against the theme's {BG_0}/
   {BG_1}. If all clear >=3:1, ship as-is. Best outcome: no added chrome.
2. **CONTRAST PLATE** — put the logo on a solid light container (white or a
   near-white brand neutral), applied ONLY in the theme that needs it,
   padded to the brand's minimum clear space ({LOGO_CLEARSPACE}) so it reads
   as an intentional lockup rather than a cramped patch. The plate is a
   token: {LOGO_PLATE_DARK} / {LOGO_PLATE_LIGHT}, "none" where step 1 passed.
3. **Official reversed/mono variant** — ONLY if the brand actually publishes
   one ({LOGO_REVERSED_VARIANT}). This is not recolouring; it is an approved
   asset. Never invent one.
4. **None of the above works** → STOP and escalate to the owner. Never
   improvise a colour for a brand mark.

### REJECT (all of these recolour the mark)
`filter: invert()` · `brightness()` · `hue-rotate()` · overriding `fill` ·
`currentColor` on a logo · `mix-blend-mode` tricks that shift brand hue.
On a MULTI-COLOUR mark `invert()` is especially wrong — it produces colours
the brand never authorised, and it does so differently for every hue.

### Measurement rule
Measure EVERY distinct colour in the mark against whatever sits behind it,
in EVERY active theme. **The worst pair governs** — not the average, and not
the dominant colour. A two-colour logo yields two ratios per theme; both
must clear >=3:1.

### Same class, commonly missed
Favicon (light and dark browser chrome) · `<meta name="theme-color">` · the
OG/social share image (renders on someone else's surface, so it needs its
own opaque background) · email headers (many clients force a white or dark
background regardless of intent).

## SWITCHING IMPLEMENTATION (DUAL only)
- **No flash of the wrong theme.** With SSR (this framework's default stack
  is Next.js App Router), the server cannot know the client's stored choice.
  Resolve the theme before first paint via a blocking inline script that
  sets the theme attribute on the root element — hydrating afterwards
  produces a visible flash and, in React, a hydration mismatch.
- **Initial default** = `prefers-color-scheme`, then an explicit user choice
  overrides and PERSISTS across navigation and reload.
- **The toggle is a control**, so it obeys the same rules as any other:
  >=44px tap target, keyboard reachable, focus visible, an accessible name
  that states what it does, and `aria-pressed`/equivalent state.
- **The transition itself** is motion: animation_library.md's rules apply,
  including `prefers-reduced-motion` (switch instantly rather than
  cross-fading) and mid-transition contrast under Q-STATE-CONTRAST.

## VALIDATION MATRIX — sampling rule (prevents combinatorial theatre)
Naively, 6 profiles x 2 themes x 7 states = 84 captures per component. That
rule would be ignored within a week, so it is not the rule. Instead:
1. **Computed contrast table** — ALL pairs, ALL active themes. Exhaustive
   and cheap. This is the proof.
2. **Token parity assertion** — DUAL only. Cheap.
3. **At-rest screenshots** — full TIER 1 profile sweep (responsive_matrix.md)
   PER THEME. 6 for SINGLE, 12 for DUAL.
4. **State sweep** — default/hover/focus/active/disabled per theme, at the
   320 profile ONLY (breaks concentrate at the narrowest width), for each
   new/changed interactive component.
5. **Transition capture** — one mid-transition frame per direction (2), DUAL
   only.
6. **Any component whose colours differ between themes** gets its own
   at-rest capture in both, regardless of the above.
7. **LOGO VALIDATION (required before the change is complete)** — a measured
   table of every logo colour against its actual backdrop in EVERY active
   theme, plus a screenshot of the logo in each theme. Also confirm the mark
   itself is unmodified: no filter, no fill override, no `currentColor`.
   A logo that is legible only because it happens to sit on a plate that was
   never measured is not verified.
Anything not covered above is spot-checked, and the verdict says so.

## HANDOFF
- Tokens and {THEME_MODE} live in site_profile.md.
- Contrast/parity results and screenshots land in the Phase 5 evidence
  folder and are linked from the GATE 5 verdict (qa_evidence_gate.md).
- Q-STATE-CONTRAST (interrogation_checklist.md) treats theme as an AXIS:
  the matrix is states x themes, not states within one theme.
