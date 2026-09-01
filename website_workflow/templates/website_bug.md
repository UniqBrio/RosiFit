# WEBSITE REQUEST — BUG (broken / erroring / wrong output)
<!-- Filled by /wrequest. Run with: /website website_workflow/requests/<this file> -->

REQUEST ID: WEB-BUG-<yyyymmdd>-<slug>
DATE:
REQUESTED BY:

## WHERE
Page/section/flow: <e.g. Demo booking → OTP step>

## WHAT HAPPENS (owner's exact words, errors in quotes)
"<exact error text / wrong behavior>"

## EXPECTED INSTEAD
<or "unknown">

## WHO IS AFFECTED / SELECTIVITY
<all visitors? only mobile? only one browser? only one form? — selectivity
is the best root-cause clue; "unknown" if not stated>

## WHEN / SINCE
<since when; "was working before?" yes/no/unknown — if yes, check recent
deploys, promo config changes, and Supabase migrations/status FIRST>

## REPRO STEPS
<owner-provided only; otherwise "unknown — derive during Phase 0">

## SUPABASE SUSPECTED?
yes/no/unknown → if the flow writes/reads data, run MCP get_logs (read-only)
during Phase 0 diagnosis before touching code.

## STANDING INSTRUCTIONS (verbatim — do not edit)
Run website_workflow/website_flow.md on this file. Bugs still pass gates:
root cause written and confirmed BEFORE the fix (no symptom-patching);
Phase 5 must include a regression Playwright spec that fails before the fix
and passes after. If the bug is a RESPONSIVE/layout failure, run the RCA
loop in website_workflow/responsive_matrix.md — it is the same procedure at
the same rigor, with the failure-pattern library (RF-xxx) naming the
workaround to reject for each known cause. The defect itself is recorded in
the test register (qa_workflow.md §4) and leaves a PERMANENT case there, so
the same failure cannot return unnoticed. Interrogation may mark N-A for design questions with
reasons, but Q8 (performance/responsiveness) and Q10 (copy of any changed
message) are never N-A. Unknown stays unknown; never invent repro details.
