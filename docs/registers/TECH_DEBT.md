# Technical Debt

> Debt nobody wrote down is not debt. It is a surprise with a delay fuse.
>
> Writing it down also makes the cost **arguable**, which is the only way it ever gets
> prioritised over the next feature.

| ID | What | Why accepted | What it costs | Paid down when | Added |
|---|---|---|---|---|---|
| TD-001 | **G1 Theme artifacts in sync** cannot run — no `design/tokens.json`. Reports FAIL. | Colour stays in `src/theme/tokens.ts` (ADR 001). Migrating shipped theme code to turn a gate green weakens what the gate proves. | No mechanical proof that generated theme output was not hand-edited. Low here: there is no generated theme output to edit. | RosiFit adopts `design/tokens.json`, or the framework supports a TypeScript token source. | 02-Sep-2026 |
| TD-002 | **G2 framework contrast gate** cannot run — no `design/tokens.json`. Reports FAIL. | **Substitute rung: `scripts/check-contrast.ts`** — 2,800 pairs, all 360 custom hues, both themes, fails the build. Strictly stronger than the step it replaces. | None in substance. The cost is that `npm run gate` shows a red step that is actually covered elsewhere, which trains readers to discount red. | The framework's contrast gate accepts a non-JSON token source. | 02-Sep-2026 |
| TD-003 | **G3 Theme assets per theme** cannot run — no declared asset set in `design/tokens.json`. Reports FAIL. | RosiFit declares no per-theme brand assets, so there is nothing for the step to check. | Nothing today. If a per-theme logo is ever added, its absence in one theme would ship unnoticed. | The first per-theme brand asset is introduced — at which point this becomes a real gap, not a formality. | 02-Sep-2026 |
| TD-004 | **G6 Lint** is BLOCKED — this project has no ESLint. | Never configured; the app relies on `tsc --noEmit` (G5, passing) for correctness rules. | The correctness rules a linter decides — unused bindings, exhaustive-deps, unreachable code — are unchecked. This is the largest genuine gap of the eight. | ESLint is added with a flat config and a `lint` script, then ratcheted rather than switched on clean. | 02-Sep-2026 |
| TD-005 | **G7 Unit + pure specs** — no `test:unit` script exists. Reports FAIL with an **empty log**. | The app has no JS test suite. `supabase/tests/*.sql` (124 assertions) is the only automated suite and the gate cannot see it. | No unit coverage of `followup.ts`, `period.ts`, `csv.ts` or `iconAlias.ts` — all pure, all trivially testable, all currently unproven in JS. | A runner is chosen and the four pure modules get specs. Highest-value of the unpaid rows. | 02-Sep-2026 |
| TD-006 | **G8 Functional / integration** — no `test:functional` script exists. Reports FAIL with an **empty log**. | No browser runner is configured. `.harness/*.mjs` route checks exist but are hand-run and not wired to the gate. | Route, render and both-theme checks are hand-run, so they are run when someone remembers. | `.harness/` is wired to a `test:functional` script, or Playwright is adopted. | 02-Sep-2026 |
| TD-007 | **G10 Backward compatibility reports PASS while inert.** It prints `this gate is INERT` and exits 0; the runner reads 0 as PASS. | Framework defect F-3 (ADR 003). Not fixable here without editing Half A. | **Worse than a red step: a false green.** Anyone reading the gate report sees `G10 - PASS` and concludes compatibility was checked. Nothing was compared. | The framework separates "skipped" from "passed" — `RATCHET_SKIP` must not be `0` under the runner. `/promote` candidate. | 02-Sep-2026 |
| TD-008 | **`npm run gate` covers `src/` only.** `gate-runner.mjs` passes no `--dir`, so G4/G9/G11 never see `app/` — where all 30 screens live. | `gate-runner.mjs` is Half A and is not edited locally (ADR 004). | A gate PASS reads as whole-repo when it covers roughly a third of the code. Mitigated by `npm run audit:all`, which covers both trees and is what CI runs. | `gate-runner.mjs` accepts a repeatable `--dir` or configurable roots. `/promote` candidate. | 02-Sep-2026 |
| TD-009 | **RC-003 claims `src/components/Dialog.tsx`, which does not exist here.** One baselined dead rung. | Q3: at n=1 the carrying cost is trivial, where CP-2…CP-21's twenty was not (ADR 002). The row is inherited framework root-cause history, and the registers are append-only. | One permanent entry in `.baselines/rule-coverage-baseline.txt` that can never be paid down, because the file it names will never exist here. | RC-003 is superseded by a RosiFit root-cause entry that names a real rung, or the row is retired with a declared reason. | 02-Sep-2026 |
| TD-010 | **The DB harness cannot run on the adopting machine** — no `psql` and no Docker on PATH. `bash db/harness/test.sh` aborts at `reset.sh`. | An environment gap, not a code one. It was already true before this pass; nothing here caused it. | The 124 SQL assertions cannot be executed locally, so a DB-adjacent change cannot be proven before commit on this machine. | Postgres 16 (or Docker) is installed, or the harness runs in CI. | 02-Sep-2026 |

---

## What counts

- A shortcut taken deliberately, with a known cost.
- A baselined ratchet entry — the accepted violations in `.baselines/` **are** recorded debt.
- A module everyone avoids editing.
- A test class that cannot currently be written, and why.
- A dependency that is unmaintained or pinned to an old version.

## What does not count

A bug. A missing feature. Something you dislike. Debt is a **decision** that traded future cost
for present speed — if there was no decision, it is just a defect, and it belongs in the
root-cause register or the backlog.

---

## The baselined backlog

`.baselines/` is recorded debt by the definition above. As frozen on 02-Sep-2026:

| Ratchet | `src/` | `app/` | Note |
|---|---|---|---|
| Hard-coded colours | 7 files | 13 files | `src/theme/tokens.ts` holds 96 of them and is the legitimate token home |
| testID coverage | 6 files / 22 elements | 29 files / 93 elements | **every** interactive element in the repo; there are zero testIDs |
| Column control | 0 | 0 | clean gate |
| Rule coverage | 1 (RC-003) | — | TD-009 |
| Dead weight | 0 | — | clean gate |

Paying these down is deliberately a **later, gated queue**. The ratchet is two-sided, so the
lists can only shrink: a new violation blocks, and a fixed-but-still-listed one blocks too.
