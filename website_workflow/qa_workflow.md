# QA WORKFLOW — generate → execute → RCA → fix → regress → validate
<!-- website_workflow/qa_workflow.md — added 2026-08-24 via framework_update.md.
     Owns the TEST LIFECYCLE. It does NOT restate what other files already own:
       responsive_matrix.md  device tiers, the responsive RCA loop, RF-xxx
       theme_system.md       computed contrast + token parity
       qa_evidence_gate.md   the artifact rules for Phase 5
       interrogation_checklist.md  the 10 questions + Q-xxx axes
       templates/website_bug.md    root-cause-before-fix discipline
     Those are the WHAT and the HOW-TO-PROVE. This file is the
     WHICH-CASES-EXIST, DID-THEY-RUN, and WHEN-ARE-WE-DONE. -->

## ROOT CAUSE THIS FILE CLOSES
The framework could prove a specific claim (screenshots, contrast tables,
Playwright output) but had no notion of a test-case POPULATION. Phase 5 said
"add/extend specs covering the change" — with no rule for deriving what
"covering" means, no register saying which cases exist, no record that each
one ran, and no completion definition beyond "every checked box has an
artifact". So coverage was whatever the session thought to write down, and
absence of a test was indistinguishable from a passing one.
(Cautionary precedent from the 2026-08-24 Webstudio review: their PR
template requires updating a `test-cases.md` that returns 404. A register
that does not exist is worse than none — it reads as coverage. This file
ships its template so that cannot happen here.)

## 1 — WHAT IS TESTED (dimensions; responsiveness is primary)
| Area | Code | Owned by | Primary? |
|---|---|---|---|
| Responsiveness | RESP | responsive_matrix.md (TIER 1/2/3) | **PRIMARY** |
| Theme & contrast | THEME | theme_system.md (computed table, parity) | **PRIMARY** |
| Functionality / flows | FUNC | this file + supabase_review.md when data-touching | high |
| UI consistency | UI | interrogation Q3/Q4, design_library.md | high |
| Accessibility | A11Y | qa_evidence_gate §5, Q-STATE-CONTRAST | high |
| Browser compatibility | COMPAT | responsive_matrix TIER 1/2 engines | high |
| Performance | PERF | qa_evidence_gate §3 budgets | high |
| Content & copy | COPY | interrogation Q10, app_reality.md truth rules | medium |
RESPONSIVENESS IS PRIMARY: every FUNC, UI, A11Y and THEME case names the
viewport profile it runs at. A functional case that passes only at desktop
width is not a pass — it is an untested case at every other profile.

## 2 — WHERE TEST CASES COME FROM (systematic derivation, not invention)
Generate at Phase 2 (from the approved plan), before any code. Six sources;
each is mechanical, so coverage stops depending on what someone remembered:
1. **REQUIREMENTS** — every MUST-HAVE line in the request file → ≥1 case.
   TRACEABILITY RULE: a MUST-HAVE with no case is incomplete generation, not
   a passing test. Unmapped requirement = Phase 2 FAIL.
2. **COMPONENTS** — every new/changed component → its applicable states:
   default · hover · focus · active · selected · disabled · loading · error ·
   empty · success. Skip a state only with a written "not applicable" reason.
3. **USER FLOWS** — every flow the change touches → happy path + ≥1 negative
   (bad input, API failure mocked) + ≥1 interruption (back button, reload
   mid-flow, double submit).
4. **VIEWPORTS** — responsive_matrix.md TIER 1 × every changed page, plus any
   triggered TIER 2 profile.
5. **THEMES** — × every active theme ({THEME_MODE}). SINGLE = ×1, DUAL = ×2.
6. **DEFECT HISTORY** — every defect ever fixed leaves a PERMANENT case
   (§4.5). The register only grows here; this is what stops recurrence.
7. **SAFETY MECHANISMS** (degraded_paths.md) — every fallback, default,
   guard, sentinel, optional-data consumer, or owner-supplied input in scope
   generates a DEGRADED case that deliberately triggers the mechanism using
   the PRODUCER'S real shape (a declared-but-empty env var, not merely an
   unset one). A mechanism exercised only on the happy path is an untested
   assumption. Area code DP.
Derivation is combinatorial, so apply responsive_matrix.md's sampling
discipline: full profile sweep at rest, full state sweep at the narrowest
profile, and cross-product only where colours/layout actually differ.
Skills: functional-test-planner, edge-case-generator,
negative-scenario-specialist, smoke-test-expert, regression-test-planner.

## 3 — THE REGISTER (execution is tracked or it did not happen)
Every generated case lands in `website_workflow/qa/test_register.md` (site
repo; template at templates/test_register_TEMPLATE.md) BEFORE execution.
ID: `TC-<AREA>-<nnn>` — e.g. TC-RESP-014, TC-A11Y-003.
Each row carries: ID · area · title · source (which of the six) · traced
requirement · profile(s) · theme(s) · severity · automated? · result ·
evidence link.
RULES:
- A case exists in the register BEFORE it runs. Cases invented afterwards to
  match what passed are not coverage.
- Every case ends EXECUTED with PASS / FAIL / BLOCKED / N-A+reason.
  **NOT-RUN is not a terminal state** — an unrun case blocks the gate.
- PASS needs an artifact per qa_evidence_gate.md. A claim without an
  artifact is a FAIL, unchanged.
- The register is append-only; a superseded case is marked SUPERSEDED with
  its replacement ID, never deleted.
SEVERITY: **S1** blocker (feature unusable, data loss, site broken at a
TIER 1 profile, WCAG violation) · **S2** major (core flow degraded, contrast
FAIL, budget breach) · **S3** minor · **S4** cosmetic.

## 4 — DEFECT HANDLING (one procedure, regardless of who found it)
1. **RECORD** — a failing case gets a defect ID `DEF-<nnn>` linked to it,
   with the artifact that shows the failure.
2. **ROOT CAUSE BEFORE FIX** — no symptom-patching. Same standard
   templates/website_bug.md sets for an owner-reported bug and
   qa_evidence_gate.md's GATE 5 verdict sets for a gate-found one. If it is
   a layout/responsive defect, follow responsive_matrix.md's RCA loop and
   match it to an RF-xxx pattern, whose "REJECT" column names the workaround
   that is not allowed.
3. **FIX THE CAUSE** — a fix that only hides the symptom fails the gate.
4. **RE-RUN** the failed case AND the regression set in §5.
5. **PERMANENT CASE** — every fixed defect leaves a case in the register
   that fails before the fix and passes after. If the root cause is a new
   class, also add an RF-xxx (layout) or a checklist question (systemic).
   A defect that leaves no permanent guard will recur — that is the entire
   point of this step.

## 5 — REGRESSION SCOPE (what "related and impacted" means, concretely)
Never "re-run everything" (too slow, so it gets skipped) and never "re-run
the one case" (too narrow, so regressions ship). After ANY fix, re-run:
- (a) the failed case itself;
- (b) every case touching the same component;
- (c) every case on pages inside the blast radius (Phase 0 classification +
  blast-radius-analyzer — shared components in components/ui, brand tokens,
  promo config, popups, sticky CTA, i18n are the usual carriers);
- (d) the FULL responsive_matrix TIER 1 sweep if the fix touched layout, CSS,
  or tokens — a fix at 320 that breaks 810 is a net loss, and only a re-run
  proves it did not happen;
- (e) the computed contrast + parity check if the fix touched any colour;
- (f) the S1 smoke set, always.
Record the regression set actually run. "Re-tested" with no list is not a
regression run.

## 6 — COMPLETION CRITERIA (QA-complete is a defined state, not a feeling)
QA is complete when ALL of:
1. Every register case is EXECUTED — zero NOT-RUN, including every DP case.
   An untested degraded path is a FAIL for that safety mechanism, however
   green the happy-path suite is (degraded_paths.md §5).
2. Every requirement traces to ≥1 executed case (§2 rule 1).
3. **Zero open S1. Zero open S2.** Non-negotiable.
4. Every S3/S4 is either fixed OR **explicitly accepted by the owner** in
   writing, with the reason and a follow-up entry. Silent tolerance is not
   acceptance — an accepted defect is a decision, and it is logged like one.
5. Every fixed defect has its permanent regression case (§4.5).
6. qa_evidence_gate.md GATE 5 passes on its own terms (artifacts linked).
7. The QA SUMMARY is written: cases generated / executed / passed / failed,
   defects by severity, accepted defects with reasons, regression sets run,
   and — stated honestly — what was NOT covered (TIER 3 emulation limits,
   sampled rather than exhaustive cross-products). Overclaiming coverage is
   itself a gate failure; the framework never implies more than it verified.
Skills: test-summary-generator, release-readiness-expert.

## WHERE THIS RUNS
- **Phase 2** — generate cases from the approved plan; register created; the
  traceability check runs at GATE 2. No code before the cases exist.
- **Phase 4** — cases run as the build progresses; defects logged.
- **Phase 5** — execution completed, defects closed, regression sets run,
  QA SUMMARY written; feeds qa_evidence_gate.md's GATE 5.
- **Phase 7** — the register and summary are linked from decisions_log.md.
