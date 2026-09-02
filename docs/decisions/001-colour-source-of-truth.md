# 001 — Colour stays in `src/theme/tokens.ts`; `design/tokens.json` is not adopted

**Status:** Accepted · **Date:** 02-Sep-2026

## Context

The framework's theme half (gate steps G1–G3) is built around `design/tokens.json` as the single
file containing a colour, with `scripts/theme-build.mjs` generating typed tokens and CSS
variables from it and `--check` blocking hand-edited output.

RosiFit predates that arrangement. Colour lives in `src/theme/tokens.ts` as hand-authored
TypeScript, and the app already carries a stronger guarantee than the framework's own: the
custom-hue accent is darkened until white-on-accent clears 4.5:1 for **all 360 hues in both
themes**, and `scripts/check-contrast.ts` measures **2,800 pairs** at build time and fails the
build. The framework's `check-contrast.mjs` checks the declared pairs of a token file that does
not exist here.

## Decision

Keep `src/theme/tokens.ts` as the source of colour. Do **not** migrate to `design/tokens.json`
and do **not** restructure the theme.

`scripts/check-contrast.ts` (2,800 pairs) and `scripts/check-icons.ts` (71 glyphs) are the
**substitute rungs** for G1–G3. Both run in `npm run check` and both fail the build. `npm run
theme:contrast` is an alias onto the app's real rung so the framework's name resolves to
something true.

## Consequences

- G1, G2 and G3 can never pass in this repository. They are recorded as accepted-unverifiable
  classes in ADR 003, with a TECH_DEBT row each naming the substitute rung.
- The guarantee is not weaker for it. It is measurably stronger: 2,800 measured pairs against a
  seed token file's declared pairs.
- If RosiFit ever adopts `design/tokens.json`, this record is superseded, not deleted.

## Options rejected

**Migrate the theme to `design/tokens.json`.** Rejected: it is a large change to shipped app code
for the purpose of turning three gate steps green, and it would replace a measured 360-hue
guarantee with the framework's declared-pairs one. Turning a gate green by weakening what it
proves is the failure the framework exists to prevent.

**Delete G1–G3 from `gate-runner.mjs`.** Rejected: `gate-runner.mjs` is Half A (PROCESS). Editing
it forks the framework locally, and the framework's own rule is that needing to edit a process
file is the signal to run `/promote`. See ADR 004.
