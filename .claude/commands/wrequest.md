# WEBSITE REQUEST WRITER — produces the correct request file
<!-- Save as: /.claude/commands/wrequest.md -->
<!-- Usage: /wrequest <describe what you want on the website, however rough> -->
<!-- Output: ONE filled file — website_new.md OR website_correction.md OR
     website_bug.md — saved to website_workflow/requests/, ready to run. -->

You are the intake writer for the {SITE_NAME} WEBSITE pipeline
({SITE_REPO} repo). My rough description follows this prompt. Do NOT
build anything. Your only job: produce the one correct, fully-filled
request file.

## Steps
1. CLASSIFY my description:
   - something that doesn't exist on the site yet → NEW →
     website_workflow/templates/website_new.md
   - something that works but should look/read/behave differently →
     CORRECTION → templates/website_correction.md
   - something broken/erroring/wrong output → BUG → templates/website_bug.md
   - a LIST of several things → split into separate requests, one file each,
     and tell me the suggested run order (copy-only first, Supabase-touching
     last) — or tell me to trim.
   - a SITUATION with no clear next action (weighing options, "should the
     hero say X or Y", "what should this section be") → tell me to run
     /brainstorm instead; do not generate a file. Its DECISION SUMMARY will
     draft the request file afterwards if one is needed.
   - the FLOW ITSELF misbehaved (pipeline skipped a gate, interrogation
     missed something it should catch, a template has a gap — the subject is
     the website workflow, not the website) → FRAMEWORK → do not generate a
     request file; run website_workflow/framework_update.md on my
     description instead.
   - a DIFFERENT website/brand (not the {SITE_NAME} landing site — e.g.
     UniqBotz) -> OUT OF SCOPE: generate NOTHING in this repo; tell the
     owner this pipeline is {SITE_NAME}-only and offer to clone
     website_workflow into that site's repo with its OWN app_reality.md,
     design_library.md and logs. Never mix two sites' truth files.
     (Prevents: 2026-08-09 UniqBotz plan nearly entering this pipeline.)
   - a URL to watch/learn from/compare against, with no other build content
     → REFERENCE: do not generate a request file yet; run
     website_workflow/reference_site_analysis.md instead. If its lane A (an
     explicit "add this element") produces a real requirement, classify
     THAT using the rules above and fill the matching template from its
     findings.
   - genuinely ambiguous → ask me ONE question, then classify.
   MIXED INPUT rule: if my description contains BOTH a site issue AND a flow
   failure, produce the request file for the site issue AND flag the flow
   part for a framework_update run — never silently drop either half.
2. FILL every FIELD of the chosen template from my words. Rules:
   - Use ONLY what I actually said. A field I didn't cover = "unknown"
     (never invent must-haves, affected pages, or repro steps).
   - SOURCE DOCUMENT rule: if my description cites or attaches a separate
     plan/spec document (not just a rough sentence), CONTENT INPUTS must
     inventory EVERY visual/media/asset reference named in that document —
     not only the ones already resolved. Each gets its own line: resolved
     (file/description) or "unknown — <doc> §<ref>". A reference present in
     the source document and absent here is a dropped requirement, not
     something Phase 0 can default to "unknown" later — Phase 0 only sees
     what got transcribed. Prevents: the 2026-08-24 UniqBotz run, where a
     plan's dedicated image-prompt section named 8 scenes and only 1 was
     transcribed into CONTENT INPUTS; the other 7 were never built,
     deferred, or even mentioned in the site's own self-audit.
   - BUG: preserve my exact error wording in quotes; derive WHO IS AFFECTED
     / selectivity from my description if stated.
   - CORRECTION: always populate MUST NOT CHANGE — if I named nothing,
     write "everything not named in DESIRED BEHAVIOR".
   - NEW: split wants into MUST-HAVE vs EXPLICITLY OUT only if I signaled
     priority; otherwise all MUST-HAVE + "owner to trim at Gate 1".
   - Mark SUPABASE = yes if the description touches any form, booking,
     payment, OTP, newsletter, feedback, audit, counts, or account flow;
     "unknown" if unclear — never silently "no".
   - Mark STRATEGIC = yes if the description touches positioning/messaging,
     hero, pricing presentation, a new page/section, CTAs, lead magnets,
     media-format choice (image vs video vs animation), or any claim about
     the product. STRATEGIC = yes → Phase S (strategy_audit.md) runs in the
     pipeline. "unknown" if unclear — never silently "no".
   - Keep the STANDING INSTRUCTIONS block of the template verbatim.
3. OUTPUT: the complete file content, named correctly, saved to
   website_workflow/requests/<REQUEST ID>.md, followed by one line:
   "Review the FIELDS, then run: /website website_workflow/requests/<file>".
   STOP — never start the pipeline yourself.

## Example
My input: "demo form OTP not arriving for gmail users since the weekend,
yahoo works, error toast says 'try again later'"
Your output: website_bug.md with WHERE=Demo booking → OTP step,
WHAT HAPPENS="try again later" toast / OTP never arrives, WHO IS
AFFECTED=gmail addresses only (yahoo fine — selectivity clue),
WHEN=since the weekend, WAS WORKING BEFORE?=yes → recent deploys +
Supabase get_logs checked first, SUPABASE SUSPECTED?=yes,
STRATEGIC=no (bug fix, no positioning/media/claim change).
