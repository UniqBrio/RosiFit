# 004 — `gate-runner.mjs` is not edited locally; its `src`-only default is carried as debt

**Status:** Accepted · **Date:** 02-Sep-2026

## Context

`gate-runner.mjs` invokes the three ratcheted audits (G4 colours, G9 testIDs, G11 columns) with
**no `--dir` argument**. They therefore fall back to `appPath(ROOT, 'src')` and to the default
baseline paths under `.baselines/`.

RosiFit is an Expo Router app: **`app/` holds all 30 screens**, and `src/` holds shared components
and data. `app/` is where 13 of the 20 colour-literal files and 29 of the 35 testID-gap files
live. As shipped, `npm run gate` never looks at it.

`--dir` is single-valued, so covering both trees requires two runs with distinct `--baseline`
paths — which is not something the runner can express.

## Decision

Do not edit `gate-runner.mjs`. It is Half A (PROCESS), and the framework's own rule is that
needing to edit a process file is the signal to run `/promote`, not to fork.

Instead:

- `src/` keeps the **default** baseline paths, so `npm run gate` finds a baseline and its three
  ratcheted steps are real.
- `app/` gets distinct baseline paths (`*-app-baseline.txt`).
- `npm run audit:colors`, `audit:testids` and `audit:columns` each run **twice**, covering both
  trees, and `npm run audit:all` chains them. CI runs `audit:all`, not `gate`.

## Consequences

- **`npm run gate` under-covers this repository.** Its G4/G9/G11 verdicts describe `src/` only.
  Recorded as a TECH_DEBT row, and stated in `.claude/commands/gate.md`'s addendum so nobody reads
  a gate PASS as covering `app/`.
- `npm run audit:all` is the complete check and is what CI runs. Anyone quoting coverage should
  quote that.
- A `/promote` candidate goes upstream: `gate-runner.mjs` should accept a repeatable `--dir`, or
  read the audited roots from configuration, so an app whose code is not all under `src/` can be
  gated without forking the runner.

## Options rejected

**Add `--dir app` to the runner locally.** Rejected: forks Half A, and the next framework upgrade
either overwrites it or reports the file as divergent — and the underlying gap stays unfixed for
every other adopting app.

**Move `app/` under `src/`.** Rejected: `app/` is Expo Router's file-based route root. Moving it
would break routing, and it is shipped app code this pass may not touch.
