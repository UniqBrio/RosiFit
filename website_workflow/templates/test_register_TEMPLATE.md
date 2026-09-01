# TEST REGISTER — <REQUEST ID>
<!-- Copy to website_workflow/qa/test_register.md in the site repo, one file
     per request (or one running file with a request column). Governed by
     website_workflow/qa_workflow.md. Cases are created at Phase 2 BEFORE any
     code, executed through Phases 4-5, and append-only thereafter.
     NOT-RUN is not a terminal state. A case invented after the fact to match
     what already passed is not coverage. -->

REQUEST: <website_workflow/requests/...>
{THEME_MODE}: <SINGLE-DARK | SINGLE-LIGHT | DUAL>
GENERATED: <date>   LAST RUN: <date>

## TRACEABILITY — every MUST-HAVE maps to ≥1 case
| # | MUST-HAVE (verbatim from the request) | Case IDs |
|---|---|---|
| 1 | | |
| 2 | | |
An unmapped MUST-HAVE is incomplete generation, not a passing test → GATE 2 FAIL.

## CASES
Areas: RESP · THEME · FUNC · UI · A11Y · COMPAT · PERF · COPY · DP
Source: REQ · COMPONENT · FLOW · VIEWPORT · THEME · DEFECT · SAFETY
Severity: S1 blocker · S2 major · S3 minor · S4 cosmetic
Result: PASS · FAIL · BLOCKED · N-A+reason  (NOT-RUN blocks the gate)

| ID | Area | Title | Source | Traces | Profile(s) | Theme(s) | Sev | Auto? | Result | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-RESP-001 | RESP | | VIEWPORT | | Galaxy S9+ 320 | | S1 | y | | |
| TC-RESP-002 | RESP | | VIEWPORT | | iPhone SE 320 (webkit) | | S1 | y | | |
| TC-THEME-001 | THEME | Computed contrast table, all pairs | THEME | | n/a | all active | S1 | y | | |
| TC-A11Y-001 | A11Y | Keyboard path, focus visible | COMPONENT | | 320 + 1280 | | S1 | | | |
| TC-FUNC-001 | FUNC | Happy path | FLOW | | | | S1 | y | | |
| TC-FUNC-002 | FUNC | Negative: API failure mocked | FLOW | | | | S2 | y | | |
| TC-FUNC-003 | FUNC | Interruption: reload mid-flow | FLOW | | | | S2 | | | |
| TC-DP-001 | DP | Degraded: required value DECLARED-BUT-EMPTY (producer shape) | SAFETY | | | | S1 | y | | |
| TC-DP-002 | DP | Degraded: required value unset | SAFETY | | | | S1 | y | | |

## DEFECTS
| ID | From case | Severity | Root cause (cause, not symptom) | RF-xxx | Fix | Permanent case | Status |
|---|---|---|---|---|---|---|---|
| DEF-001 | | | | | | | OPEN / FIXED / ACCEPTED |
ACCEPTED requires the owner's written reason + a follow-up entry. Silent
tolerance is not acceptance.

## REGRESSION RUNS
| After | Set run (a-f per qa_workflow.md §5) | Case IDs | Result |
|---|---|---|---|
| DEF-001 fix | | | |
"Re-tested" with no list is not a regression run.

## QA SUMMARY (required for completion — qa_workflow.md §6)
- Cases: generated __ / executed __ / passed __ / failed __ / N-A __
- Open S1: __   Open S2: __   (both MUST be 0)
- Accepted S3/S4: <id — reason — follow-up>
- Regression sets run: <list>
- **NOT covered / limits:** <TIER 3 emulation limits, sampled cross-products,
  anything spot-checked rather than exhaustive. Overclaiming coverage is
  itself a gate failure.>
