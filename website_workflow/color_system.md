# COLOUR SYSTEM — one seed, three layers, generated not hand-maintained
<!-- website_workflow/color_system.md — added 2026-08-26 via framework_update.md.
     theme_system.md decides POLARITY and validates the result; this file
     decides where colour VALUES come from. Generator:
     website_workflow/tools/generate_palette.py (tested, see §VERIFIED). -->

## ROOT CAUSE THIS FILE CLOSES
Four gaps, none closed by theme_system.md:
1. **No canonical config artifact in code.** site_profile.md is a MARKDOWN
   table — an app cannot import it. website_flow.md's REPO MAP named four
   possible homes ("lib/brand.ts, lib/config/promo.ts, tailwind.config.ts,
   app/globals.css") without saying which is canonical or that they must
   agree. The hand-copy from doc to code was ungoverned, and that is where
   drift entered.
2. **Nothing forbade raw hex in components.** Q4 said "colors from the brand
   palette only" with no mechanism; a grep of every checklist found zero
   mentions of hex or hardcoding.
3. **The token set was too small to build a UI from.** Eleven tokens, no
   ramps, no semantic states, no hover/active/disabled. A developer needing a
   hover shade had NO token, so they hardcoded one. The table's
   incompleteness CAUSED the hardcoding gap 2 could not catch.
4. **Derivation existed only as an unapplied library option** (ALT-008a,
   now SUPERSEDED) that said "Claude derives…" with no algorithm.
   Hand-deriving ~28 tokens per theme and measuring ~30 contrast pairs is
   precisely the rule that gets skipped — so this file ships a generator
   rather than a checklist.

## THE ONE INPUT
`{BRAND_SEED}` in site_profile.md — a single hex. Change it, regenerate,
and the entire system moves with it. Nothing else is hand-authored.
`{THEME_MODE}` (theme_system.md) decides which themes are emitted.

## THREE LAYERS
**L1 — PRIMITIVES (generated).** Ramps 50→950 for: `brand` (seed hue),
`neutral` (seed hue at very low chroma, so greys harmonise with the brand
instead of reading as flat grey), and `success` / `warning` / `error` /
`info`. Derived by stepping OKLCH lightness at fixed hue, chroma tapered at
both ends so extremes don't go neon or muddy.

**L2 — SEMANTIC (generated, per theme).** What components actually use:
`bg-0/1/2` · `fg-0/1` · `border` · `divider` · `accent-1` +
`-hover/-active/-disabled/-on/-text` · `accent-2` + `-text` · `focus-ring` ·
`shadow` · `success|warning|error|info` + `-bg` + `-on`.

**L3 — COMPONENT (optional).** Only when a component genuinely needs its own
alias. Maps to L2, never to L1.

### THE PROPAGATION RULE
**Components consume L2 SEMANTIC tokens ONLY — never an L1 primitive, never
a raw hex, never a colour keyword.** That single rule is what makes changing
one seed propagate everywhere. A component referencing `--brand-600`
directly survives a seed change but not a polarity change; one referencing
`#7454C2` survives neither.

## GENERATED FILE IS CANONICAL
The generator's output is the ONLY place colour values live in code. It
carries a do-not-hand-edit header. To change a colour you change the seed
and regenerate — editing the generated file is drift by definition, and the
next regeneration silently reverts it.
Where it lands depends on {STACK} (ALT-009a): CSS custom properties for a
web stack (works with or without Tailwind); `--format ts` for React
Native/Expo, which has no CSS.

## AUTO-CORRECTION, AND ITS HONEST LIMIT
Every pair that must meet a threshold is measured; if the intended ramp step
fails, the generator walks to the nearest step that passes.
- Thresholds: 4.5:1 body text · 3:1 large text · 3:1 UI boundaries and focus
  indicators.
- `accent-1-on` (the label ON the primary button) is MEASURED, never assumed
  — it comes out white on some fills and near-black on others. That is the
  UniqBotz M-02 defect (a 2.98:1 white-on-orange CTA in an approved plan)
  solved by computation.
- **DRIFT is the real risk, not failure.** Correction almost always finds
  SOME passing step, so a naive tool would always report success. A token
  dragged more than 2 ramp steps no longer reads as the seed shade, so the
  report flags it as DRIFT and makes it an owner decision: accept the
  shifted shade, or choose a seed whose lightness suits that surface. Never
  ship drift silently.
  (This limit was found by testing the generator's own degraded path per
  degraded_paths.md — the FAIL branch turned out to be effectively
  unreachable, which would have made a green report meaningless.)

## VERIFIED (2026-08-26)
`python tools/generate_palette.py --seed "#4C1D95" --mode DUAL --report`
→ seed resolves to OKLCH L=0.3796 C=0.1783 H=293.7°; **32 contrast pairs,
0 FAIL, 0 DRIFTED**, 2 one-step corrections (borders), exit 0.
A hostile near-white seed (`#FFFCE0`) also returns 0 FAIL. Bad input
(`notahex`) exits 1 with a clear error rather than emitting a broken file.

## RUNNING IT
```
python website_workflow/tools/generate_palette.py \
    --seed "{BRAND_SEED}" --mode {THEME_MODE} --report      # gate artifact
python website_workflow/tools/generate_palette.py \
    --seed "{BRAND_SEED}" --mode {THEME_MODE} --out <canonical file>
```
`--report` exits non-zero on FAIL, so it can gate CI.

## WHERE THIS RUNS
- **Phase 2** — seed chosen/confirmed; generator run; the report reviewed and
  any DRIFT decided by the owner; the canonical output path named in the plan.
- **Phase 4** — components consume L2 only. A raw hex or an L1 reference in a
  component is a build-rule violation, not a style preference.
- **Phase 5** — the report is the contrast artifact for qa_evidence_gate §4b,
  replacing hand-measurement. Re-run after any seed or token change.
