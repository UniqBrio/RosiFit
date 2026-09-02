# 002 — Framework `CP-1…CP-21` superseded at adoption rather than amended

**Status:** Accepted · **Date:** 02-Sep-2026

## Context

`docs/registers/CANONICAL_PATTERNS.md` arrived as the framework seed copy. RosiFit was **adopted**
from a copy of the framework, not scaffolded by `new-app.mjs`, so `starter/` was never copied in
and none of the reference files those rows name were ever created.

`node scripts/audits/check-rule-coverage.mjs --report` scored it: **27 rules, 20 dead rungs.**
CP-2 through CP-21 each pointed at a file that does not exist in this repository.

Twenty dead rungs is not honest debt. It is twenty rules claiming enforcement none of them had —
the exact condition the rule-coverage audit was written to detect.

## Decision

Supersede, do not amend and do not delete.

- All 21 framework rows are preserved verbatim in
  `docs/registers/_archive/CANONICAL_PATTERNS.framework-v1.md`, headed **SUPERSEDED-AT-ADOPTION**,
  with a pointer back from the live file.
- RosiFit's own patterns start clean at **CP-001**. The framework's `CP-N` and RosiFit's `CP-NNN`
  are distinct ID spaces, so no ID is ever reused.
- Sixteen rows were blessed, each naming a file that exists in this repository today.

## Consequences

- Rule coverage went from 20 dead rungs to **1** (RC-003 — see ADR 003 and TECH_DEBT).
- The register is append-only **from adoption day forward**. The reset itself is recorded here and
  in `docs/FRAMEWORK_ADOPTION.md`, so a later reader can see it was a decision and not a lapse.
- `check-rule-coverage.mjs` parses a **literal three-path register list** and performs no directory
  descent, verified by reading the source, so nothing under `_archive/` is counted.

**One standing constraint on `_archive/`:** never archive a file whose basename matches a
rung-claimed **source** file. The audit's rung-existence check falls back to a basename-anywhere
walk of the repository, which would then report a dead rung as live. Markdown archives are safe.

## Options rejected

**Amend the 21 rows in place.** Rejected: it destroys the record of what the framework actually
shipped, and a future framework upgrade would have nothing to diff against.

**Keep them and baseline 20 dead rungs.** Rejected: the ratchet would carry twenty permanent
entries that can never be paid down, because the files they name will never exist here. A baseline
that cannot shrink is an allowlist wearing a ratchet's clothes. Contrast with RC-003 (ADR 003),
where the same trade at **n=1** is cheap enough to accept.
