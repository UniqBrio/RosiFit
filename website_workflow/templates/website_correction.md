# WEBSITE REQUEST — CORRECTION (works today, should behave/look different)
<!-- Filled by /wrequest. Run with: /website website_workflow/requests/<this file> -->

REQUEST ID: WEB-COR-<yyyymmdd>-<slug>
DATE:
REQUESTED BY:

## CURRENT BEHAVIOR (what it does/looks like now)
<exact section/page/element and its current state>

## DESIRED BEHAVIOR
<exact target state — copy, layout, image, interaction, data>

## WHY THE CHANGE
<owner's reason; conversion, clarity, brand, correctness…>

## MUST NOT CHANGE
<everything not named in DESIRED BEHAVIOR — always populated; if the owner
named nothing, write exactly: "everything not named in DESIRED BEHAVIOR">

## WHERE
Files/pages if known: <e.g. components/landing/sections/Hero.tsx> or unknown

## SUPABASE
Touches data paths?: yes/no/unknown

## STANDING INSTRUCTIONS (verbatim — do not edit)
Run website_workflow/website_flow.md on this file, all phases, all gates.
Interrogate the DESIRED state (Q1–Q10) before touching code; re-interrogate
after build. Diff the result against MUST NOT CHANGE — any drift outside the
named change is a Gate 5 FAIL. Evidence required for responsiveness and
performance. Unknown stays unknown; never invent.
