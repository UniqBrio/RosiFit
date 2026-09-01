# WEBSITE FLOW — master pipeline for {SITE_REPO}
<!-- Save as: /website_workflow/website_flow.md -->
<!-- This is THE starting file. Everything begins here. -->
<!-- Entry points that feed this file:
     /wrequest  → produces a filled website_new.md / website_correction.md / website_bug.md
     /brainstorm → Track F; its DECISION SUMMARY calls this file when a build is decided
     /website   → runs this file directly on an already-filled request file -->

You are the pipeline runner for the {SITE_NAME} marketing website
(Next.js App Router + Tailwind + Supabase, deployed on Vercel).
Input: exactly ONE filled request file (website_new.md, website_correction.md,
or website_bug.md). If you were given rough words instead of a filled file,
STOP and tell the owner to run /wrequest first. If you were given a dilemma
with no clear action, STOP and route to /brainstorm.

## PRIME DIRECTIVE — QUESTION EVERYTHING BEFORE CREATE/MODIFY
No pixel, image, phrase, section, or query is added or changed until it has
survived the INTERROGATION (checklists/interrogation_checklist.md). "It looks
fine" is not evidence. Every gate below requires written answers, and QA gates
require captured evidence (screenshots / test output). A step with missing
evidence is FAILED, not "probably fine".

## SECOND DIRECTIVE — DECIDE BY FRAMEWORK, NOT TASTE
Whenever 2+ genuine options exist (this image vs that image, image vs video
vs animation, headline A vs B, layout X vs Y), the choice is made with
decision_matrix.md — scored, evidenced, winner declared, losers logged.
Strategic questions additionally require the web research mandated in
strategy_audit.md. An unscored choice between real alternatives is a
framework violation.

## REPO MAP (ground truth — verify before trusting)
- Pages: app/page.tsx (landing), app/audit, app/demo, app/pricing, app/pay,
  app/payments, app/checkout/[orderId], app/paymentSuccess/[orderId],
  app/feedback, app/delete-account, app/[academy-slug]/join, legal pages.
- Sections/components: components/landing/** (sections/, elements/, popups,
  header), components/ui/** (shared), components/legal/**.
- Supabase touchpoints: lib/supabase.ts, app/api/** (book-demo, check-email,
  otp, newsletter-subscribe, feedback, audit-email, create-order, daily-counts,
  demo-bookings-count, payment-academy-phone, send-checklist, delete-account,
  ems), supabase/migrations/**, supabase/functions/**, supabase_setup.sql.
- Config/brand: ONE canonical GENERATED token file is the only place colour
  values live (color_system.md; produced by tools/generate_palette.py from
  {BRAND_SEED}). Name it in the Phase 2 plan — typically app/globals.css for
  a web stack. It carries a do-not-hand-edit header: change the seed and
  regenerate, never edit the output. Other config (lib/brand.ts,
  lib/config/promo.ts, tailwind.config.ts) may REFERENCE those tokens but
  must not define colour values of its own.
  Prevents: four plausible homes for a brand colour with none canonical, and
  a hand-copy from site_profile.md into code that nothing verified. Tests: tests/**, playwright.config.ts.
- Truth files: website_workflow/app_reality.md (what the app really does —
  the site may never claim more than this file).

## GATE REVIEW DEPTH (every gate names what it is asking the owner for)
A gate that only says "approve" invites a rubber stamp. Each gate below
states which depth it needs, and the request to the owner must name it:
- CONCEPTUAL — is this the right thing to do at all? (scope, classification,
  strategy, option choice)
- DETAILED — read every line of the proposed change as written.
- EVIDENCE — artifacts exist, were actually inspected, and support the claim.
Default by gate: GATE 0 conceptual · GATE S conceptual · GATE 1 conceptual +
detailed · GATE 2 detailed · GATE 3 detailed + evidence · GATE 5 evidence.
The owner may always escalate a gate's depth; Claude may never quietly
lower it.

## PHASES (run in order; each gate blocks the next)

### PHASE 0 — INTAKE & CLASSIFY
1. Read the request file completely. List every "unknown" field. If the
   request cites or is derived from an external plan/spec document, read
   THAT document too — do not rely on the request file's summary of it.
   Cross-check CONTENT INPUTS > Images against every visual/media reference
   the source document itself names (a dedicated image-prompt section is
   common in owner-authored plans). A named asset absent from both is a
   dropped requirement, flagged now — never discovered after Phase 5.
   Prevents: the 2026-08-24 UniqBotz run, where the owner's plan named 8
   AI-generation scenes for the locked brand character and the request
   file's Images field captured 1; the other 7 were never built, deferred,
   or even mentioned in the site's own 13-point self-audit, because nothing
   after intake re-read the source document.
2. Classify blast radius: copy-only / single-section / multi-page /
   Supabase-touching / config-brand-touching.
3. If Supabase-touching → supabase_review.md becomes MANDATORY at Phase 3.
4. Classify STRATEGIC or MECHANICAL:
   STRATEGIC = touches positioning/messaging, hero, pricing presentation,
   new page/section, CTAs, lead magnets, media-format choice, or any claim
   about the product → strategy_audit.md (Phase S) becomes MANDATORY.
   MECHANICAL = typo, bug fix, spacing fix, executing an already-decided
   spec → Phase S skipped (but S3 app-reality check still applies to any
   change that alters a product claim).
5. GATE 0 (owner): confirm scope + classification, unknowns resolved or
   explicitly deferred.

### PHASE S — STRATEGY AUDIT (only if STRATEGIC)
Run strategy_audit.md in full: S1 positioning verification, S2 competitor
teardown (mandatory WebSearch/WebFetch evidence), S3 app-reality sync
against app_reality.md, S4 media-format decision matrix, S5 conversion
architecture, S6 verdict. All multi-option choices scored with
decision_matrix.md. Skills: market-research-specialist,
competitive-research-specialist, jobs-to-be-done-expert,
academy-owner-psychology-expert, conversion-ux-specialist,
customer-trust-expert, animation-style-selector (media slots),
lead-magnet-asset-builder (ladder rungs).
GATE S (owner): STRATEGY VERDICT approved. No design work before this gate.

### PHASE 1 — INTERROGATION (the 10 questions)
Run checklists/interrogation_checklist.md against the PROPOSED change,
question by question, in writing. Skills to invoke here:
design-reviewer, visual-hierarchy-expert, spacing-grid-system,
conversion-ux-specialist, simplicity-auditor, existing-ui-consistency-checker,
color-psychology-expert, typography-expert, academy-owner-psychology-expert
(audience lens), accessibility-specialist.
Output: INTERROGATION VERDICT — for each of the 10 questions:
PASS / FAIL+fix / N-A+reason. Any FAIL loops back to redesign before code.
Plus the LIBRARY SCREEN block (design_library.md Stage 4) for every design
slot in scope.
GATE 1 (owner): approve the verdict + the exact element/content list + the
shortlist. The owner may promote a DEFERRED entry into the matrix here —
logged as an owner override, which is the intended escape hatch from the
top-3 cap, not a framework breach.

### PHASE 2 — DESIGN & PLAN
1. code-planning-specialist: component tree, files touched, state, props.
2. blast-radius-analyzer / change-impact-analysis: what else could break
   (shared components in components/ui, brand tokens, promo config, popups,
   sticky CTA, i18n in lib/ems/i18n.tsx).
3. Positioning & spacing spec: exact Tailwind classes, breakpoints
   (mobile-first: 360px, 768px, 1024px, 1440px), grid alignment with
   neighbouring sections.
4. Media plan (if any media involved): the FORMAT was already decided in
   Phase S4 (or via decision_matrix.md for mechanical swaps). Here, spec the
   asset: purpose, subject, format (WebP/AVIF preferred; video poster +
   preload strategy if video), dimensions, next/image sizing, alt text,
   lazy/priority decision, estimated weight budget (<150KB hero image,
   <80KB others; video only with explicit LCP evidence plan).
5. PRODUCTION HAND-OFF (mandatory for any generated or supplied illustration,
   icon set, or character asset — web-illustration-asset-production-pipeline):
   name who renders, who curates (a render is a candidate, never a commit),
   the format decision + its trade-off, target path and filename convention,
   theme variants, alt-text/decorative classification, and where the
   provenance record will live. If a brand character is involved, name the
   lock version every asset is checked against.
   Prevents: "here is the prompt" ending the conversation, leaving nobody
   responsible for the file — and untraceable binaries landing in the repo.
6. COLOUR TOKENS (website_workflow/color_system.md) — if the seed, theme
   mode, or any colour is in scope: run tools/generate_palette.py, review the
   contrast report, get an owner decision on any DRIFT flag, and name the
   canonical output path. No hand-authored colour values.
7. ABSENCE SEMANTICS (website_workflow/degraded_paths.md) — list every
   failure-sensitive input (anything optional, owner-supplied, env-driven or
   externally fetched), enumerate what "missing" can look like FROM THE REAL
   PRODUCER, and name the ONE shared resolver every consumer will use. A
   per-consumer emptiness check is a build-rule violation; deciding this at
   Phase 2 is what makes it cheap.
7. TEST-CASE GENERATION (website_workflow/qa_workflow.md §2) — derive cases
   from all six sources (requirements, components, user flows, viewports,
   themes, defect history) into website_workflow/qa/test_register.md, using
   templates/test_register_TEMPLATE.md. Every MUST-HAVE must trace to >=1
   case; an unmapped MUST-HAVE is incomplete generation, not a passing test.
   Cases exist BEFORE code — a case written afterwards to match what already
   passed is not coverage.
GATE 2: written plan approved AND the register exists with traceability
complete. Review depth: DETAILED. No code before this gate.

### PHASE 3 — SUPABASE REVIEW (only if Supabase-touching)
Run supabase_review.md in full. Code-first: schema changes exist ONLY as
files in supabase/migrations/; never direct SQL against prod. MCP tools are
for READ-ONLY verification (list_tables, get_advisors, get_logs,
generate_typescript_types). Skills: supabase-safety-reviewer,
rls-risk-auditor, supabase-environment-awareness, api-design-expert,
typescript-supabase-patterns, error-handling-expert.
GATE 3: Supabase checklist signed; advisors show no NEW warnings.

### PHASE 4 — BUILD
Implement exactly the approved plan. Rules:
- Reuse components/ui primitives; no new one-off variants without a written
  reason (component-reusability-expert).
- Colour: components consume L2 SEMANTIC tokens ONLY — never an L1 primitive
  ramp value, never a raw hex, never a colour keyword (color_system.md).
  A hardcoded colour is a build-rule violation, not a style preference: it
  survives neither a seed change nor a polarity change.
- Every fetch/API call: loading state, error state, empty state
  (loading-state-specialist, error-state-specialist, empty-state-specialist).
- Forms: client + server validation, honest error copy, no data loss on
  failure (form-ux-specialist, form-validation-expert).
- Copy: plain words, short sentences, benefit-first, no jargon; CTA verbs
  concrete ("Book free demo", not "Submit"). Q10 of the checklist applies to
  every visible phrase. No claim beyond app_reality.md.
- No console errors, no TypeScript errors, `npm run build` must pass.

### PHASE 5 — QA EVIDENCE GATE (critical — see checklists/qa_evidence_gate.md)
Performance and responsiveness are CRITICAL here. Required evidence, attached:
1. Responsiveness per website_workflow/responsive_matrix.md: TIER 1 (six
   profiles across chromium AND webkit) mandatory, TIER 2 when triggered,
   TIER 3 limits declared honestly. Screenshots per profile (light + any
   theme variants). Any failure runs that file's RCA loop — root cause
   before fix, cause not symptom, full-matrix re-run, guarding assertion,
   RF-xxx recorded. Skills: responsive-layout-expert,
   responsiveness-testing-expert, mobile-first-ux-evaluator.
2. Playwright: run existing specs (tests/**) + add/extend specs covering the
   change; paste the run summary. Skills: functional-test-planner,
   smoke-test-expert, edge-case-generator, negative-scenario-specialist.
3. Performance: Lighthouse (or equivalent) on changed pages — LCP < 2.5s,
   CLS < 0.1, INP < 200ms, total image weight within budget; paste scores
   before/after. Skills: performance-audit-expert,
   performance-optimization-expert, nextjs-architect.
4. Accessibility spot-check: keyboard nav, focus visible, contrast, alt text.
4b. ASSET GATE (any new/changed illustration, icon or character asset):
   provenance record complete + licence stated, filename per convention,
   within its weight budget, theme variants present, motion asset has an
   intentional static fallback. Character assets additionally: drift-checked
   against the named lock version (character-consistency-checker), emotion/
   pose within budget, and any CONDITIONAL deployment limit from Phase S4
   still honoured on the built page. Missing record = FAIL.
5. Re-run the 10-question INTERROGATION against the BUILT result (not the
   plan). Any drift from the approved plan = FAIL.
6. If Phase S ran: verify the built result still matches the STRATEGY
   VERDICT (winning option, claims, CTA hierarchy). Drift = FAIL.
7. QA COMPLETION (qa_workflow.md §6): every register case EXECUTED (zero
   NOT-RUN — an unrun case blocks the gate), zero open S1/S2, every S3/S4
   fixed or explicitly owner-accepted in writing with a reason, every fixed
   defect carrying its permanent regression case, regression sets recorded
   per §5, and the QA SUMMARY written — including what was NOT covered.
   Overclaiming coverage is itself a gate failure.
GATE 5 (owner): evidence reviewed. Review depth: EVIDENCE. No evidence → no
pass.

### PHASE 6 — RELEASE
1. deployment-checklist-expert + vercel-deployment-expert: env vars present
   (.env.example updated if new ones), preview deploy verified, then promote.
2. If migrations exist: apply to staging/branch first, verify, then prod —
   in the same release as the code that needs them, never after.
3. rollback-planning-expert: one-paragraph rollback plan written BEFORE
   promoting (git revert target + migration down-path or forward-fix).
4. Post-release: check Vercel analytics/logs and Supabase logs (MCP get_logs)
   for 24h-equivalent window; post-release-monitoring-expert.

### PHASE 7 — CLOSE
Append one entry to website_workflow/decisions_log.md: date, request file,
what shipped, interrogation verdicts that mattered, decision-matrix winners
AND losers (with scores), evidence links, follow-ups.
If the FLOW itself misbehaved during this run → run framework_update.md.
If any workflow file, rule, or command changed this run → update
website_workflow/README.md (LAST UPDATED date + one Update-log line).

## STANDING INSTRUCTIONS (apply to every phase)
- STATE CONTRAST (global): readable text in every visual state of every
  element, existing or new, without separate instruction. Verified via
  Q-STATE-CONTRAST (interrogation) + QA state screenshots.
- DESIGN LIBRARY (website_workflow/design_library.md): consult FIRST on any
  design decision; matrix-score its relevant entries as options. Every
  owner-provided design reference → new REF entry + at least one Claude ALT
  entry (two-layer rule). Owner input = baseline, not ceiling: also record
  one enhanced variant. "Alternatives for this section?" → top 5 library
  entries ranked per the library's rules.
- REFERENCE SITE ANALYSIS (website_workflow/reference_site_analysis.md):
  when the owner supplies a URL to watch, learn from, or compare against,
  run its SCOPE GATE before fetching anything — whole site / the part named
  / treat-as-explicit-requirement. Findings feed design_library.md's REF/ALT
  entries; an explicit "add this" element additionally needs a real request
  file and the normal build gates — the scope question is skipped for it,
  never the gates.
- RESOURCE REGISTRY (website_workflow/resource_registry.md): standing
  external references (ui-ux-pro-max LOCAL, tweakcn, awwwards, Looker
  Studio) are OPTIONAL and TRIGGER-GATED. Consult the local rung first;
  then at most ONE triggered resource — never all of them. Name the trigger
  in one line before opening anything, and end every consult in a recorded
  artifact or an explicit "nothing applicable".
- MOTION LIBRARY (website_workflow/animation_library.md): consult FIRST
  whenever motion/animation is being added or reviewed. Default posture is
  skepticism — motion ships only if it serves hierarchy, interaction
  feedback, storytelling/state-communication, or loading/wait-communication;
  anything else is decoration and gets rejected, stated explicitly, not
  silently added or silently dropped. Screen the local catalog before
  referring to the live source. 2+ genuine candidate patterns for the same
  job → decision_matrix.md, same as any other design choice.
- SKILL VALIDATION GATE (design_library.md rules 6 & 9;
  checklists/interrogation_checklist.md Q-SKILL-VALIDATION): before any
  design element, pattern, component, interaction, or visual idea is added
  or changed, name the governing skill(s) via skills_map.md and apply its
  principles to both the requested change and every complementary idea
  explored under rule 6. No governing skill identifiable, or the identified
  one unresolvable via skills_map.md §Fallback → STOP and tell the owner
  plainly what TYPE of design skill is needed; never proceed as though it
  exists.
  On every in-play request run the OPTION SELECTION FUNNEL (design_library.md):
  screen EVERY entry (cheap, mechanical, off the INDEX), rank the eligible,
  score current-state + top 3, and publish the LIBRARY SCREEN block naming
  what was OUT and what was DEFERRED. Screening is complete; scoring is
  capped. Stage 0 applies to MECHANICAL requests too — one line saying
  in-play or not. A missing LIBRARY SCREEN block = Phase 1 FAIL.
- Never invent requirements; "unknown" stays unknown until the owner answers.
  That rule is a MECHANISM, and mechanisms are tested: its degraded path must
  be deliberately exercised, not assumed (degraded_paths.md). A blank that
  renders as though it were real data is the failure this prevents.
- Never touch pages outside the approved blast radius.
- Never commit secrets; .env.local is read-only context.
- Prefer boring, consistent solutions over novel ones (Q9: professional).
- Decide by framework: 2+ options → decision_matrix.md, always.
- Strategic claims/choices require current web-research evidence (Phase S);
  never decide positioning, media format, or competitive claims from memory.
- The website may never claim more than app_reality.md supports.
- Skills: use the mapped skill for each phase (see skills_map.md). If a
  mapped skill is unavailable in Claude Cloud, follow the local fallback in
  skills_map.md §Fallback. If it exists nowhere, STOP and report the gap.
