# 003 — Accepted unverifiable gate classes

**Status:** Accepted · **Date:** 02-Sep-2026

> An unrecorded blocked gate is indistinguishable from a forgotten one. Every class below is
> named, with the reason it cannot run and the substitute rung where one exists.

## Context

`npm run gate` was run end to end on the adoption branch. **Observed verdict: FAIL, exit 2 —
5 pass, 5 fail, 1 blocked.** The observed result, not the documented one:

| Step | Reported | Reality |
|---|---|---|
| G1 Theme artifacts in sync | FAIL | input absent — no `design/tokens.json` |
| G2 Contrast (all tokens) | FAIL | input absent — no `design/tokens.json` |
| G3 Theme assets per theme | FAIL | input absent — no `design/tokens.json` |
| G4 No hard-coded colours | PASS | genuine, ratcheted |
| G5 Types | **PASS** | genuine — `tsc --noEmit` clean |
| G6 Lint | BLOCKED | correct — no local ESLint |
| G7 Unit + pure specs | FAIL | script absent — no `test:unit` |
| G8 Functional / integration | FAIL | script absent — no `test:functional` |
| G9 Automation addressability | PASS | genuine, ratcheted |
| G10 Backward compatibility | **PASS** | **false** — the step printed `INERT` and exited 0 |
| G11 Wide tables configurable | PASS | genuine, ratcheted |

## Decision

Accept G1, G2, G3, G6, G7, G8 and G10 as classes that cannot be verified in this repository, and
record each with its own DECISION_LOG row (003–010) and its own TECH_DEBT row. Accept the DB
harness as unverifiable on the adopting machine (DECISION_LOG 012).

**G5 is explicitly NOT accepted as unverifiable.** It runs and it passes. Recorded so a future
reader does not sweep it in with its neighbours.

## Three framework defects found while doing this — findings, not fixes

These are defects in Half A code this app may not edit. All three are `/promote` candidates.

**F-1 — a missing input is reported as a broken codebase.** `theme-build.mjs`,
`check-contrast.mjs` and `check-theme-assets.mjs` throw a raw `ENOENT` and exit 1. The runner's
`UNAVAILABLE` pattern list does not match `Error: ENOENT: no such file or directory`, so the step
is classified FAIL. `gate-runner.mjs`'s own header says the distinction "is not pedantry: a FAIL
says *your code is broken* when the truth is *this machine cannot check it*." G1–G3 are that
sentence happening to the file that wrote it.

**F-2 — `--silent` hides the very string the classifier greps for.** G7 and G8 run
`npm run --silent test:unit`. When the script is absent npm prints `Missing script: test:unit` —
which **is** in the `UNAVAILABLE` list — but `--silent` suppresses it. The captured logs
(`.gate-logs/G7.log`, `G8.log`) are **empty**, the classifier sees nothing to match, and a missing
test suite is reported as a failing one.

**F-3 — an inert gate reports PASS.** `check-backward-compat.mjs` prints
`SKIPPED [BACKWARD COMPAT] - no fixtures/expected-verdicts.json yet. … this gate is INERT and is
telling you so` and **exits 0**. `gate-runner.mjs` reads exit 0 as PASS. The gate report therefore
states `G10 Backward compatibility - PASS` when nothing whatsoever was compared.

This is green-by-omission in the step designed to prevent it. The root cause is
`scripts/lib/ratchet.mjs`'s `RATCHET_SKIP = 0`: failing open is correct for a commit guard, which
must never block on a tooling gap, but wrong under a runner that maps exit 0 to PASS. The two
consumers need different exit codes and currently share one.

**Consequence for this repository: G10's PASS is not evidence of anything and must not be quoted
as one.** That is why it gets an acceptance record despite being green.

## Consequences

- `npm run gate` exits 2 (FAIL) here and will continue to until the omissions above are resolved
  upstream. It is still worth running: G4, G5, G9 and G11 are genuine, and three of those four are
  ratcheted.
- `.claude/commands/gate.md` carries a RosiFit addendum recording exactly this, so the command's
  documented contract and its observed behaviour no longer disagree silently.

## Options rejected

**Pass `--skip G1,G2,G3,G7,G8` to make the verdict BLOCKED instead of FAIL.** Rejected: it is
tempting, because BLOCKED is the honest word. But it launders a framework defect into local
configuration and the defect then never gets fixed upstream. The runner should classify these
correctly on its own; recording the finding is what makes that happen.

**Edit `gate-runner.mjs`'s `UNAVAILABLE` list.** Rejected: Half A. See ADR 004.
