# Decision Log

> Index of architecture decision records in `docs/decisions/`.
>
> Anything expensive to reverse gets a record. Template:
> [templates/docs/ADR.md](../../templates/docs/ADR.md).

| # | Decision | Status | Date | Supersedes |
|---|---|---|---|---|
| 001 | [Colour stays in `src/theme/tokens.ts`; `design/tokens.json` is not adopted](../decisions/001-colour-source-of-truth.md) | Accepted | 02-Sep-2026 | |
| 002 | [Framework `CP-1…CP-21` superseded at adoption rather than amended](../decisions/002-canonical-patterns-supersession.md) | Accepted | 02-Sep-2026 | |
| 003 | [G1 Theme artifacts in sync — accepted unverifiable; no `design/tokens.json`](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 004 | [G2 Framework contrast gate — accepted unverifiable; substitute rung is `scripts/check-contrast.ts`](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 005 | [G3 Theme assets per theme — accepted unverifiable; no declared asset set](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 006 | [G5 Types — NOT accepted as unverifiable: it runs and PASSES](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 007 | [G6 Lint — accepted unverifiable; this project has no ESLint](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 008 | [G7 Unit + pure specs — accepted unverifiable; no `test:unit` script exists](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 009 | [G8 Functional / integration — accepted unverifiable; no `test:functional` script exists](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 010 | [G10 Backward compatibility — accepted INERT, and its PASS must not be believed](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 011 | [`gate-runner.mjs` is not edited locally; its `src`-only default is carried as debt](../decisions/004-gate-runner-dir-gap.md) | Accepted | 02-Sep-2026 | |
| 012 | [The DB harness is unverifiable on the adopting machine (no `psql`, no Docker)](../decisions/003-accepted-unverifiable-gate-classes.md) | **Superseded by 013** | 02-Sep-2026 | |
| 013 | [The DB harness is runnable, and CI is what keeps it runnable](../decisions/005-db-harness-runnable.md) | Accepted | 02-Sep-2026 | 012 |

Status: `Proposed` · `Accepted` · `Superseded by NNN` · `Deprecated`

---

**Superseded records are never deleted.** The reasoning that was correct in 2026 explains why
the system is shaped as it is, and a reader who cannot find it will assume the shape was an
accident.

**The most valuable section of any record is "options rejected".** Six months from now, someone
will propose one of them again — and the reason it lost is the sentence that saves the
conversation.
