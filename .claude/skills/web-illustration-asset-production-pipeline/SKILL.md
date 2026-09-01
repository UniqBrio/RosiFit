---
name: web-illustration-asset-production-pipeline
description: Governs the hand-off from an APPROVED illustration or character design to a shipped web asset — candidate curation, raster-to-vector cleanup, format selection (SVG/Lottie/AVIF/WebP/PNG/sprite), SVG/Lottie hygiene, weight budgets, next/image wiring, theme variants, accessibility, and a provenance record for every generated asset. Use for "export this illustration for the site", "SVG or PNG", "can we animate this", "this hero image is too heavy", or "where do we store the generated asset".
when_to_use: Any AI-generated or designer-supplied illustration entering the repository, any motion asset needing a static fallback, or any asset failing its page/slot weight budget — i.e. after creative approval and before the asset is wired into a component.
---

# Web Illustration Asset Production Pipeline

## Purpose

Governs everything that happens **after** an illustration or brand-character concept is
creatively approved and **before** it is consumed by a production web component. This is not a
design skill — it does not decide what the illustration looks like. It is the production
discipline that turns an approved visual into a technically correct, optimized, accessible,
responsive, motion-safe, theme-aware, reproducible, provenance-documented, licence-clean,
repository-ready web asset.

It exists to close a specific failure mode: an assistant says "here is the prompt" or "here is
the render" and stops, leaving nobody responsible for what happens to the file next.

## Scope and Role Boundary

| | |
|---|---|
| **Owns** | Candidate curation gate, format decision, raster→vector cleanup, SVG/Lottie hygiene, static fallbacks, weight budgets, `next/image`/Lottie wiring, theme variants, asset-level accessibility, naming/directory conventions, provenance, the pre-commit gate, the hand-off contract |
| **Does not own** | Brand-character design (`uniqbrio-character-bible`) · image generation itself (`image-generation`) · full-page accessibility audits (`accessibility-specialist`) · page-level performance strategy (`performance-optimization-expert`) · Next.js architecture (`nextjs-architect`) — this skill operationalizes their hand-off, it does not replace them |
| **Starts** | After creative approval (an agreed sketch, mood board, or character sheet) |
| **Ends** | When the asset passes the gate in [CHECKLIST_AND_FAILURES.md](CHECKLIST_AND_FAILURES.md) and is handed off per the contract in [REPOSITORY_AND_PROVENANCE.md](REPOSITORY_AND_PROVENANCE.md) |

**Approved design ≠ production asset.** An approved sketch is a reference; a generated render is
a candidate; only a curated, optimized, gated, provenance-recorded file is a production asset.

## Trigger Conditions

"Export this illustration for the site" · "SVG or PNG?" · "Can we animate this?" · "This hero
image is too heavy" · "Where do we store the generated asset?" · any AI-generated or
designer-supplied illustration entering the repo · any motion asset needing a static fallback ·
a request to finalize output from `image-generation` or `uniqbrio-character-bible`.

## Core Principles

1. Approved design is not a production asset — it's a reference.
2. A render is a candidate, not a commit — human curation is mandatory, always.
3. Format follows measurable use-case constraints, never preference.
4. The smallest acceptable asset wins; optimize within the visual-quality floor.
5. Animation must earn its runtime cost, and every motion asset needs an intentional static fallback.
6. Every shipped asset has an accessibility classification and a provenance record — no exceptions.
7. Every asset fits a measurable weight budget or carries a documented, approved exception.
8. Licence ambiguity blocks production acceptance; never invent rights.
9. Visual quality and technical quality are separate, both-must-pass gates.
10. Do not ship an asset merely because it can technically be shipped — it must be implementation-ready.

*Why these are principles, not rules-of-thumb:* each one closes a failure mode observed in
practice (§ [CHECKLIST_AND_FAILURES.md](CHECKLIST_AND_FAILURES.md) Failure Modes) — an unreviewed
render, an unbudgeted hero image, an untraceable binary, a motion asset with no reduced-motion
path. Skipping one doesn't fail loudly; it fails quietly, later, in production.

## Workflow

```
APPROVED DESIGN → GENERATE CANDIDATES → HUMAN CURATION → PRODUCTION MASTER
   → FORMAT DECISION → OPTIMIZE/CONVERT → VALIDATE (run the script) → PACKAGE
   → IMPLEMENT (next/image or Lottie) → RECORD PROVENANCE → COMMIT
```

1. **Curate.** Apply the selection criteria and rejection reasons in
   [CURATION_AND_FORMATS.md](CURATION_AND_FORMATS.md) — reject and document before proceeding.
2. **Decide the format.** Walk the Format Decision Tree in
   [CURATION_AND_FORMATS.md](CURATION_AND_FORMATS.md); state the recommendation *and* the
   trade-off, never just the pick.
3. **Produce to standard.** Apply SVG hygiene, Lottie budgets, static-fallback rules, weight
   budgets, `next/image` wiring, and theme handling from
   [PRODUCTION_STANDARDS.md](PRODUCTION_STANDARDS.md).
4. **Name, place, and record.** Follow the directory/naming convention and complete the
   provenance record per [REPOSITORY_AND_PROVENANCE.md](REPOSITORY_AND_PROVENANCE.md).
5. **Validate.** Run `scripts/validate_asset.py --asset <path> --slot <slot> --provenance <path>`.
   It must exit `0`. A prose checklist is followed probabilistically; this script is not.
6. **Hand off.** Package per the contract in
   [REPOSITORY_AND_PROVENANCE.md](REPOSITORY_AND_PROVENANCE.md) and commit.

If the script reports a `FAIL`, or a mandatory gate item can't be satisfied, **stop and report
it** — do not ship an asset that fails its own gate, and do not silently loosen a budget or
skip curation to make a deadline.

## Reference Files

| File | Read it for |
|---|---|
| [CURATION_AND_FORMATS.md](CURATION_AND_FORMATS.md) | Generation hand-off, candidate selection/rejection criteria, raster-to-vector workflow, the Format Decision Tree with per-format trade-offs |
| [PRODUCTION_STANDARDS.md](PRODUCTION_STANDARDS.md) | SVG hygiene, Lottie production/runtime budget, static fallback & `prefers-reduced-motion`, weight budgets, `next/image` wiring, theme variants, accessibility rules |
| [REPOSITORY_AND_PROVENANCE.md](REPOSITORY_AND_PROVENANCE.md) | Naming/directory/versioning conventions, the provenance record schema, reproducibility rules, the repository hand-off contract |
| [CHECKLIST_AND_FAILURES.md](CHECKLIST_AND_FAILURES.md) | The full pre-commit checklist, failure-mode diagnostics and remediation, worked examples, glossary |
| `scripts/validate_asset.py` | The bundled, deterministic gate — weight budget, naming, SVG hygiene, Lottie budget, provenance completeness. Run it; don't re-derive it by eye. |

## Cross-References

- **`image-generation`** → produces the candidate renders this skill curates and ships; this
  skill starts where that one's output stops.
- **`uniqbrio-character-bible`** → supplies the approved character reference and canonical
  identity this skill validates candidates against.
- **`accessibility-specialist`** → owns full-page/site accessibility audits; this skill supplies
  correct per-asset alt text and SVG accessibility going in.
- **`performance-optimization-expert`** → owns page-level performance budgets; this skill's
  per-asset weight budgets are the inputs that roll up into that page budget.
- **`nextjs-architect`** → owns app architecture; this skill supplies the `next/image`/Lottie
  wiring pattern that fits it.
- **Not yet installed in this account, referenced here as future hand-off points once they
  exist:** a dedicated brand-character/mascot design skill, a visual-storytelling-direction
  skill, a Core Web Vitals-specific skill, a web-motion-choreography skill, and a synthetic-media
  provenance/labelling skill. Until then, their responsibilities are covered by the skills above
  plus this one — see the Step 0 collision note in this skill's creation record.

## Agent Behavior Requirements

Inspect the actual supplied asset before assuming anything about it. Preserve approved creative
intent through every transformation. Never auto-commit a candidate render. Keep source/master
files distinct from shipped files. Base format calls on measurable constraints, not habit —
state the trade-off, not just the pick. Calculate or credibly estimate weight impact before
recommending a format. Flag uncertainty (licence, reproducibility, weight) explicitly rather than
guessing. Reject assets that fail a mandatory gate. Never invent licence rights. Prefer
deterministic, reproducible transformations. Avoid unnecessary conversion and overengineering —
a simple flat icon does not need a Lottie pipeline.

## Completion Criteria

An asset is production-ready when `scripts/validate_asset.py` exits `0`, the provenance record
is complete and licence-verified, the package sits in the correct repository location under the
naming convention, implementation notes are attached, and the hand-off contract is signed off.

## Acceptance Check

*Scenario:* "This hero illustration for the homepage looks too heavy — can we fix it and get it
shipped?" → This skill fires on the trigger phrase. It reads
[CURATION_AND_FORMATS.md](CURATION_AND_FORMATS.md) to confirm the right format was chosen (likely
AVIF if photographic/textured, SVG if flat/vector), reads
[PRODUCTION_STANDARDS.md](PRODUCTION_STANDARDS.md) for the hero weight budget (150 KB) and
`next/image` sizing guidance, re-encodes or re-vectorizes accordingly, runs
`scripts/validate_asset.py --asset <file> --slot hero --provenance <file>`, and only calls it
shipped once that exits `0` and the hand-off contract in
[REPOSITORY_AND_PROVENANCE.md](REPOSITORY_AND_PROVENANCE.md) is filled in.
