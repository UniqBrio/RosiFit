# Framework Adoption Log

> **Newest first. Append-only.** The template says this file is written by `upgrade.mjs --apply`;
> here it was written by hand, because **RosiFit was never scaffolded** — `upgrade.mjs` and
> `lineage.mjs` have no seed to diff against and were deliberately not run.
>
> The "deferred and why" line is the whole point of this file. At two-digit app counts, the real
> failure is not tooling — it is an app stuck on an old version **with nobody remembering why**.
> This file is the cheap fix, and it only works if it is kept from the first upgrade.

**Skew policy** (framework `docs/22-FRAMEWORK-EVOLUTION.md`): stay within **2 MINOR** versions of
current; adopt a **MAJOR** within one quarter.

---

## v1.3.0 — adopted 02-Sep-2026 (from: nothing — this is the first adoption)

### What kind of adoption this is

**Half A (PROCESS) only.** RosiFit was bootstrapped from a *copy* of the framework and then
diverged; it was not produced by `new-app.mjs`. There is no `starter/`, no `fixtures/`, no
`design/tokens.json`, no `.baselines/` and no `.framework/lineage.json`.

That single fact drives every decision below. The framework's day-one promise is *nothing is
blocked that was not already broken*, and honouring it on an adopted app means wiring only what
can execute and recording the rest, rather than switching on gates whose inputs do not exist.

**Scope held: adopt + baseline + registers. No application code was changed.** Nothing under
`app/`, `src/`, `supabase/`, `assets/`, `db/`, `design/` or `.harness/` was touched.

### Auto-applied

- **0 files.** There is no lineage to compare against, so nothing could be auto-applied. `npm run
  lineage` and `npm run upgrade` were not wired and not run — inert without a seed.

### Wired

Ten npm scripts, each pointing only at something that can actually execute here:
`gate` · `theme:contrast` · `audit:colors` · `audit:testids` · `audit:rules` · `audit:columns` ·
`audit:deadweight` · `audit:all` · `guard:test` · `guard:install`.

The nine pre-existing app scripts were not modified, and `npm run check` is byte-for-byte
unchanged.

### Deferred, with the condition that revives each (4)

| Deferred | Why | Revived when |
|---|---|---|
| `conformance` | Framework self-test; needs `fixtures/` and `starter/` | never, for an app repo — it belongs to the framework |
| `audit:compat` | Same. Worse than absent here: it exits 0 while printing `INERT`, a false green | the framework separates skipped from passed (F-3) |
| `theme:build` / `theme:check` | Needs `design/tokens.json`; colour is `src/theme/tokens.ts` (ADR 001) | RosiFit adopts a JSON token source, or the framework accepts a TypeScript one |
| `theme:assets` | Needs declared per-theme assets; RosiFit declares none | the first per-theme brand asset is introduced |

Wiring any of them would add a script whose only possible outcome is BLOCKED, which is how a gate
teaches people to ignore it.

### New gates baselined at current state

Adoption step 2 of `docs/17-ENFORCEMENT-RATCHETS.md` §8 — see the damage, freeze it, then the
gates block only *new* violations.

| Ratchet | `src/` | `app/` |
|---|---|---|
| Hard-coded colours | 7 files | 13 files |
| testID coverage | 6 files / 22 elements | 29 files / 93 elements |
| Column control | 0 — **clean gate** | 0 — **clean gate** |
| Rule coverage | 1 (RC-003) | — |
| Dead weight | 0 — **clean gate** | — |

Three of the eight are already clean gates and can never regress silently.

`--dir` is single-valued, so every audit that takes one runs **twice**. `src/` holds the *default*
baseline paths because `gate-runner.mjs` passes no `--dir` and would otherwise find no baseline at
all; `app/` uses distinct paths. `npm run audit:all` covers both trees and is what CI runs.

**The testID figures are the whole backlog, not a sample:** every interactive element in the
repository lacks one. Paying that down is deliberately *not* in this pass. The ratchet is what
turns it into a later, gated queue instead of a cleanup sprint — and because the ratchet is
two-sided, the list can only shrink.

### Registers

- `CANONICAL_PATTERNS.md` — framework `CP-1…CP-21` **superseded, not deleted** (ADR 002). All 21
  rows kept verbatim in `_archive/CANONICAL_PATTERNS.framework-v1.md`, marked
  SUPERSEDED-AT-ADOPTION. Twenty of the twenty-one named files that do not exist here. RosiFit's
  own patterns start at **CP-001**; sixteen blessed, each naming a file that exists today.
- `DESIGN_RULES.md` — **created.** `check-rule-coverage.mjs` expects it and the repo lacked it. It
  restates CLAUDE.md's five binding guardrails in the form the audit can read, each naming its rung.
- `ROOT_CAUSE_REGISTER.md` — left as-is. RC-001…006 are inherited framework history and the
  registers are append-only; RC-003's one dead rung is baselined (TD-009). Deliberately different
  from the CP decision **on cost, not principle**: one dead rung is cheap to carry, twenty was not.
- `FEATURE_TRUTH.md` · `RBAC_MATRIX.md` · `ENVIRONMENTS.md` · `TEST_ACCOUNTS.md` — filled from
  facts already in this repo. See the commit for what each one found.
- `DECISION_LOG.md` — 12 entries, `docs/decisions/` ADRs 001–004 created.
- `TECH_DEBT.md` — 10 rows, one per accepted-unverifiable class plus the baselined backlog.

**Rule coverage went from 20 dead rungs to 1.**

### Post-adoption gate verdict

**`npm run gate` → FAIL, exit 2.** 5 pass, 5 fail, 1 blocked.

*The upgrade is done when the gate gives a verdict, not when files land.* This one gives FAIL, and
that is the honest state rather than a failure of the adoption: five of the eleven steps have no
input in this repository, and the runner reports "input absent" as "code broken".

| | |
|---|---|
| Genuinely green | G4 colours · G5 types · G9 testIDs · G11 columns |
| Correctly BLOCKED | G6 lint (no ESLint) |
| Input absent, misreported as FAIL | G1 · G2 · G3 (no `design/tokens.json`) · G7 · G8 (no test scripts) |
| **Green but meaningless** | **G10 — printed `INERT`, exited 0, compared nothing** |

Each has a DECISION_LOG entry and a TECH_DEBT row. An unrecorded blocked gate is
indistinguishable from a forgotten one.

**The verdict that can be quoted:** `npm run check` green (types + 2,800 contrast pairs + 71
icons) and `npm run audit:all` green across both trees. `.claude/commands/gate.md` carries an
addendum recording exactly this, so its documented contract and its observed behaviour no longer
disagree silently.

### Three framework defects found — `/promote` candidates, not patched locally

Found by running the gate rather than reading it. All three live in Half A, which an app may not
edit; the framework's own rule is that needing to edit a process file is the signal to run
`/promote`, not to fork.

- **F-1 — a missing input is reported as a broken codebase.** `theme-build.mjs` and its two
  siblings throw a raw `ENOENT` and exit 1; `gate-runner.mjs`'s `UNAVAILABLE` list does not match
  `Error: ENOENT`, so the step is classified FAIL. The runner's own header says that distinction
  "is not pedantry: a FAIL says *your code is broken* when the truth is *this machine cannot check
  it*."
- **F-2 — `--silent` hides the string the classifier greps for.** G7/G8 run
  `npm run --silent test:unit`. npm's `Missing script:` **is** in `UNAVAILABLE`, but `--silent`
  suppresses it, so `.gate-logs/G7.log` and `G8.log` come back **empty** and a missing suite is
  reported as a failing one.
- **F-3 — an inert gate reports PASS.** `check-backward-compat.mjs` prints `this gate is INERT and
  is telling you so` and exits 0, which the runner reads as PASS. Root cause: `RATCHET_SKIP = 0`
  is right for a commit guard that must never block on a tooling gap, and wrong under a runner
  that maps 0 to PASS. Two consumers, one exit code.
- **F-4 — `gate-runner.mjs` cannot gate an app whose code is not all under `src/`.** It passes no
  `--dir`, and `--dir` is single-valued anyway. RosiFit's 30 screens live in `app/`, so the gate
  never sees roughly two-thirds of the codebase. It should accept a repeatable `--dir` or read its
  roots from configuration (ADR 004, TD-008).

### Known gaps in the adoption itself

- **`guard:install` was wired but not executed.** The `.claude/settings.json` PreToolUse hook
  already runs the guard in every session; installing the git hook as well is a separate,
  reversible action left to the repo owner.
- **The DB harness could not be run.** Neither `psql` nor Docker is on PATH on the adopting
  machine, so `bash db/harness/test.sh` aborts in `reset.sh` and the 124 assertions were not
  executed. This was already true before the pass and nothing here touched `supabase/` or
  `db/harness/`. TD-010.

---
