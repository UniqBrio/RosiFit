# SITE PROFILE — the single source for every {TOKEN} in this workflow
<!-- Copy to website_workflow/site_profile.md in the site repo and fill.
     Every workflow file references these tokens; nothing else defines
     brand or audience facts. Filled by /winit. -->

| Token | Value | Notes |
|---|---|---|
| {SITE_NAME} | | product/company name |
| {SITE_REPO} | | repo folder name |
| {SITE_DOMAIN} | | production domain |
| {ICP} | | one-line ideal customer profile |
| {BRAND_SEED} | | THE one colour input — a single hex. Change it, regenerate, the whole palette moves (color_system.md). |
| {THEME_MODE} | SINGLE-DARK | SINGLE-DARK (default) · SINGLE-LIGHT · DUAL (runtime toggle — opt-in; see theme_system.md) |
| {FONT_HEAD} / {FONT_BODY} | | |
| {STACK} | | e.g. Next.js + Vercel + Supabase |
| {CUSTOMER_COUNT} | | REAL number — drives the honesty rules |
| {PERF_BUDGET} | | e.g. LCP<2.5s on mid Android/3G, hero ≤120KB |
| {MASCOT_LOCK} | | path + version of the LOCKED character design sheet, or "none" (set by brand-character-mascot-designer; every character asset cites it) |

## COLOR TOKENS — GENERATED, not hand-filled
DERIVED from {BRAND_SEED} by website_workflow/tools/generate_palette.py.
Do not hand-author these values; change the seed and regenerate. The table
below is a RECORD of what the generator produced (paste its output), kept
here so the profile stays the single readable source. theme_system.md
governs polarity and validates the result; color_system.md governs
derivation. In DUAL both columns are mandatory — a missing counterpart is
an automatic gate FAIL (token-parity check).

| Token | DARK value | LIGHT value | Role |
|---|---|---|---|
| {BG_0} | | | page background |
| {BG_1} | | | card / raised surface |
| {FG_0} | | | primary text |
| {FG_1} | | | secondary / muted text |
| {BORDER} | | | dividers, input outlines |
| {ACCENT_1} | | | primary action fill (max ONE action per viewport) |
| {ACCENT_1_ON} | | | text/icon placed ON an {ACCENT_1} fill — MEASURE IT; this is the most important text on the page and previously had no token |
| {ACCENT_2} | | | secondary accent (support only) |
| {ACCENT_2_TEXT} | | | measured text-safe variant of {ACCENT_2} |
| {FOCUS_RING} | | | focus indicator (≥3:1 against both surfaces) |
| {SHADOW} | | | elevation — inverts in KIND: a black shadow tuned for light is invisible on dark |

## LOGO TOKENS — the mark is fixed; the background behind it is what changes
theme_system.md §LOGO CONTRAST governs. NEVER recolour the mark.

| Token | Value | Notes |
|---|---|---|
| {LOGO_COLORS} | | EVERY distinct colour in the mark, comma-separated — this is what gets measured; the WORST pair governs |
| {LOGO_PLATE_DARK} | | background behind the logo in DARK theme, or "none" if the bare surface already clears >=3:1 |
| {LOGO_PLATE_LIGHT} | | same for LIGHT theme, or "none" |
| {LOGO_CLEARSPACE} | | brand minimum clear space — the plate's padding, so it reads as a lockup not a patch |
| {LOGO_REVERSED_VARIANT} | | path to an OFFICIAL reversed/mono asset, or "none". Never invent one. |

MEASURED CONTRAST TABLE (fill during Phase 2; re-verified at Gate 5):
| Pair | Theme | Ratio | PASS/FAIL |
|---|---|---|---|
| {FG_0} on {BG_0} | | | |
| {FG_0} on {BG_1} | | | |
| {FG_1} on {BG_0} | | | |
| {ACCENT_2_TEXT} on {BG_0} | | | |
| {ACCENT_1_ON} on {ACCENT_1} | | | |
| {FOCUS_RING} on {BG_0} / {BG_1} | | | |
| each {LOGO_COLORS} on its backdrop (plate or bare surface) | | | |

## Standing constraints (inherited by every site)
- Truth: the site may never claim more than app_reality.md (honesty rules
  scale with {CUSTOMER_COUNT}; no fabricated social proof, ever).
- Contrast: ≥4.5:1 body text, ≥3:1 large text, ≥3:1 UI boundaries and focus
  indicators — in EVERY state AND every active theme. Which accent is unsafe
  as text DEPENDS ON POLARITY and must be measured, never assumed: purple
  #6708C0 is 8.85:1 on white (legal) but orange #DE7D14 is 2.98:1 (illegal),
  the exact inverse of the dark-theme guidance this framework used to state
  as a rule. Compute both accents against {BG_0}; whichever falls below
  4.5:1 gets a `_TEXT` variant and may never be used as text in raw form.
- Accent scarcity: one {ACCENT_1} action element per viewport.
- Competitors discovered fresh each audit — no fixed list.
