# DECISION MATRIX — how the flow declares "this option is best"
<!-- Save as: /website_workflow/decision_matrix.md -->
<!-- Used whenever there are 2+ genuine options. Two weighting profiles:
     A CONVERSION-FIRST (default) — anything the visitor perceives:
       positioning, hero media, section design, image vs video, CTA
       structure, layout, copy.
     B BUILD-INTERNAL — anything the visitor never perceives:
       instrumentation, data model, tooling, hosting, dependency choice.
     Referenced by strategy_audit.md, brainstorm.md, waudit.md, and
     website_flow.md. Profiles are owner-chosen; change only via
     framework_update.md. -->

## Rules
1. Minimum 2, maximum 4 options. Current state is ALWAYS scored as Option A
   (so "change nothing" must be beaten, not assumed worse).
2. Every score needs one line of written evidence (research finding, repo
   fact, checklist question, or skill-derived reason). Unevidenced score = 0.
3. At least one score per option must cite WEB RESEARCH captured this run.
4. Ties or winners within 5% → the CHEAPER/SIMPLER option wins (effort
   breaks ties, never taste).
5. The losing options and their scores are logged in decisions_log.md —
   future runs must not re-litigate without new evidence. SCOPE: a loss is
   recorded against THAT slot in THAT context, never site-wide. The same
   pattern is screened fresh for a different slot. A DEFERRED option (see
   design_library.md §OPTION SELECTION FUNNEL Stage 4) carries no loss at
   all — it was never scored. Prevents: an append-only library killing
   itself one entry at a time as it grows.
6. NAME THE PROFILE in the output header. If a decision has both visitor-facing
   and build-internal aspects, split it into two decisions and score each under
   its own profile — never average the two into one table.
   Prevents: the 2026-08-04 analytics decision, scored on improvised criteria
   because no profile fit, then filed beside a matrix-scored decision with
   nothing to distinguish them.
7. SHORTLIST PROVENANCE. Where the options came from is part of the output.
   If they came from design_library.md, paste the Stage-4 LIBRARY SCREEN
   block (screened count, OUT list + reasons, ranked eligible set, DEFERRED
   IDs) above the table. An option set with no stated derivation is invalid,
   exactly like an unevidenced score under rule 2 — the cut between
   candidate 3 and candidate 4 is itself a decision and must be evidenced.
   Prevents: the library returning 5 candidates into a 4-seat matrix with
   the two cuts made silently, on taste.

## PROFILE A — CONVERSION-FIRST (default; change only via framework_update.md)
| # | Criterion | Weight | What it measures |
|---|---|---|---|
| 1 | Conversion impact | 35 | Will more of the RIGHT visitors take the next step? Message clarity in <5s, CTA obviousness, friction removed, honest urgency (interrogation Q2/Q5/Q10; conversion-ux-specialist) |
| 2 | Audience psychology fit | 25 | Matches real fears/desires/trust triggers of {ICP}; claims backable per app_reality.md (academy-owner-psychology-expert, customer-trust-expert, Q9) |
| 3 | Performance / page speed | 15 | LCP/CLS/INP within Q8 budgets; weight budget; 3G reality |
| 4 | Effort & risk | 15 | Build cost, blast radius, maintenance (S/M/L → 5/3/1) |
| 5 | Brand consistency | 10 | Same website as every other section: palette, type scale, components/ui reuse, tone (Q4; existing-ui-consistency-checker) |

## PROFILE B — BUILD-INTERNAL (the visitor never perceives the choice)
| # | Criterion | Weight | What it measures |
|---|---|---|---|
| 1 | Fitness for purpose | 35 | Does it actually produce the decision-relevant answer, at the grain needed? Can it join to the data the success measure names? |
| 2 | Data integrity | 20 | Can the output be trusted and audited? Does it make fabrication easy or hard? (app_reality.md ethos — prevents another api/daily-counts) |
| 3 | Visitor-side cost | 20 | The one visitor-facing dimension: page weight, third-party JS, privacy/consent burden imposed on the visitor (Q8 budgets) |
| 4 | Effort & risk | 15 | Build cost, blast radius, maintenance (S/M/L → 5/3/1) |
| 5 | Reversibility & recurring cost | 10 | Switching cost, lock-in, subscription/plan gating |

## Scoring
Each criterion 1–5 per option. Weighted total = Σ(score × weight), max 500.
Both profiles use the same 1–5 scale, the same max 500, and rules 1–6 above.
Output format (the profile MUST be named — rule 6):

OPTION comparison [PROFILE A|B] — <decision being made>
| Criterion (wt) | A: <current> | B: ... | C: ... |
|---|---|---|---|
| Conversion (35) | 4 — evidence | ... | ... |
| Psychology (25) | | | |
| Performance (15) | | | |
| Effort/risk (15) | | | |
| Brand (10) | | | |
| TOTAL /500 | | | |
WINNER: <option> because <top 2 scoring reasons>.
FALSIFIER: what evidence would flip this decision.
