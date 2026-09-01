# SKILLS MAP — which skill to invoke at each phase, and the fallback rule
<!-- website_flow.md references this file. All skills below were verified
     available in Claude Cloud on 2026-07-30. Also invoked by
     design_library.md rule 9 (SKILL VALIDATION GATE) for ANY design
     change, not only the phase-mapped rows below. -->

## Phase → skills
| Phase | Skills |
|---|---|
| 0 Intake | sdlc-pipeline-orchestrator, blast-radius-analyzer |
| S Strategy Audit | market-research-specialist, competitive-research-specialist, jobs-to-be-done-expert, academy-owner-psychology-expert, conversion-ux-specialist, customer-trust-expert, behavioral-design-expert, objection-handling-content-writer (claim/counter-claim copy), roi-validation-specialist (quantified claims) |
| S4 Media-format decision | animation-style-selector (style choice), gif-and-cinemagraph-brief (cinemagraph slots), data-visualization-academy + dataviz (charts), image-generation (asset production — prompts from image_prompts.md), thumbnail-strategy (video poster frames), video-hook-writing (if video wins), brand-character-mascot-designer (OWNS the mascot-vs-no-mascot gate and the lock — invoke FIRST if the brand-character format is scored), shape-psychology-expert (form→personality validation), character-consistency-checker + emotions + character-positioning-action (within the lock only), web-illustration-asset-production-pipeline (every approved asset → shipped file) |
| S5 Conversion architecture | conversion-ux-specialist, cognitive-load-reduction-expert, lead-magnet-asset-builder, free-landing-page-campaign-content, customer-trust-expert |
| 1 Interrogation | design-reviewer, visual-hierarchy-expert, spacing-grid-system, conversion-ux-specialist, simplicity-auditor, existing-ui-consistency-checker, color-psychology-expert, typography-expert, accessibility-specialist, academy-owner-psychology-expert, image-generation (only if an asset must be produced), cognitive-load-reduction-expert |
| 2 Design & Plan | code-planning-specialist, change-impact-analysis, component-reusability-expert, nextjs-architect, information-architecture-expert, design-system-architect |
| 3 Supabase | supabase-safety-reviewer, supabase-environment-awareness, rls-risk-auditor, security-review-expert, multi-tenant-data-isolation-expert, api-design-expert, typescript-supabase-patterns, migration-planning-expert, schema-impact-analyzer, supabase-performance-expert, error-handling-expert, dummy-data-generator (test data) |
| 4 Build | clean-code-expert, form-ux-specialist, form-validation-expert, loading-state-specialist, error-state-specialist, empty-state-specialist, micro-interaction-specialist |
| 5 QA Evidence | responsive-layout-expert, responsiveness-testing-expert, mobile-first-ux-evaluator, performance-audit-expert, performance-optimization-expert, functional-test-planner, smoke-test-expert, edge-case-generator, negative-scenario-specialist, regression-test-planner, cross-browser-testing-expert, accessibility-implementation-expert, test-summary-generator |
| 6 Release | deployment-checklist-expert, vercel-deployment-expert, environment-validation-expert, rollback-planning-expert, release-readiness-expert, post-release-monitoring-expert, release-notes-generator |
| 7 Close / framework | framework: use website_workflow/framework_update.md; logging is plain text |
| Brainstorm (Track F) | conversion-ux-specialist, academy-owner-psychology-expert, behavioral-design-expert, competitive-research-specialist, customer-trust-expert, market-research-specialist + strategy_audit.md §S7 lightweight mode |

## Situational skills (invoke when the trigger applies — added 2026-07-30)
| Trigger | Skills |
|---|---|
| Social-proof / results sections | testimonial-content-builder, before-after-content-builder (only with real, permitted data per app_reality.md) |
| Analytics & measuring conversion | product-analytics-expert, usage-analytics-expert, kpi-benchmark-diagnostic |
| PWA behaviors on the site | mobile-pwa-ux-specialist, pwa-testing-expert |
| Indian visual identity / bilingual | heritage-visual-language-india, shape-psychology-expert, tamil-script-transcreation, tamil-text-overlay-typography |
| Owner supplies a reference URL (watch/learn from/compare against) | website_workflow/reference_site_analysis.md governs intake (scope gate → fetch → synthesize → record); html-design-extractor + design-gap-analyzer (structural extraction / diff vs current site), competitive-research-specialist (only when the reference is a competitor, not just a craft reference), saas-website-visual-storytelling-director + product-screenshot-mockup-specialist (style / product-shot fit), conversion-ux-specialist + academy-owner-psychology-expert (fit lens). A brand-character pattern in scope still resolves through brand-character-mascot-designer's own GO/CONDITIONAL/NO-GO gate — this row hands off, never decides it. |
| Privacy / terms / compliance pages | regulatory-compliance-checker, security-privacy-by-design |
| Brand character / mascot on the site | brand-character-mascot-designer (FIRST — owns the GO/NO-GO/CONDITIONAL gate, silhouette test, LOCK, emotion/pose budgets, retirement criteria; nothing downstream may redefine the character), shape-psychology-expert (form → meaning), color-psychology-expert (accent allocation), heritage-visual-language-india (India-facing sites), image-generation (RENDERS a locked character only — never invents or redefines one), character-consistency-checker (drift vs the lock), web-illustration-asset-production-pipeline (locked design → shipped asset), web-motion-implementation-director (motion within approved poses only). uniqbrio-character-bible is OUTSIDE this chain — human personas for video/social, never a mascot, never blended into one. |
| Illustration/generated asset entering the repo | web-illustration-asset-production-pipeline (curation gate, format decision, SVG/Lottie hygiene, weight budget, next/image wiring, theme variants, alt text, provenance record) |
| Any hover/scroll/load/click animation being added or reviewed | website_workflow/animation_library.md governs SELECTION (four-job PRIME RULE, local catalog of 38 source patterns screened before referring live, mandatory prefers-reduced-motion + Q-STATE-CONTRAST + ambient-motion-ceiling checks); web-motion-implementation-director IMPLEMENTS the selected pattern — this row decides, that skill builds. |
| Responsiveness testing / a layout break at any viewport | website_workflow/responsive_matrix.md governs coverage (TIER 1/2/3) and the RCA loop (root cause before fix, full-matrix re-run, guarding assertion, RF-xxx recorded); responsive-layout-expert, responsiveness-testing-expert, mobile-first-ux-evaluator, cross-browser-testing-expert implement against it. |
| A chart or data visual is being considered | website_workflow/resource_registry.md R-05 governs LIBRARY selection (stack gate → decision_matrix.md PROFILE B → recorded licence findings); ui-ux-pro-max `--domain chart` for chart-TYPE choice (local, rung 1); data-visualization-academy + dataviz for chart design. A marketing site usually needs no charting library at all — score "no library" as Option A. |
| Theme work: a toggle, a palette change, or any new colour token | website_workflow/theme_system.md governs ({THEME_MODE}, paired tokens, COMPUTED contrast table + token parity, the what-does-not-auto-update list, the sampling rule); color-psychology-expert (accent allocation), accessibility-specialist + accessibility-implementation-expert (WCAG thresholds), ui-ux-pro-max `--domain color` (local, rung 1). Theme is an AXIS in Q-STATE-CONTRAST: the matrix is states x themes. LOGO visibility is governed by that file's §LOGO CONTRAST — fix the background, never the mark; measure every logo colour, worst pair governs. |
| Test planning, execution tracking, or "is QA done?" | website_workflow/qa_workflow.md owns the lifecycle (generate from 6 sources -> register -> execute -> RCA -> fix -> regression scope -> completion criteria); functional-test-planner, edge-case-generator, negative-scenario-specialist, smoke-test-expert, regression-test-planner generate cases; test-summary-generator + release-readiness-expert close it. Responsiveness is the PRIMARY dimension — responsive_matrix.md supplies the profiles every case names. |
| A fallback, default, guard, sentinel, or optional/owner-supplied input is added or touched | website_workflow/degraded_paths.md governs (one absence semantic, producer-shaped triggering, observable-symptom assertions, DP-xxx catalogue); qa_workflow.md source 7 generates the DP cases; error-handling-expert, empty-state-specialist, negative-scenario-specialist, edge-case-generator implement against it. Untested degraded path = FAIL for that mechanism. |
| Brand colour / palette / any new colour value | website_workflow/color_system.md governs derivation (ONE {BRAND_SEED} -> L1 ramps -> L2 semantic tokens, generated by tools/generate_palette.py with measured contrast + DRIFT flagging); theme_system.md governs polarity and validates. Components consume L2 ONLY — raw hex is a build-rule violation. color-psychology-expert, accessibility-specialist, ui-ux-pro-max `--domain color` (local, rung 1) advise; the generator decides values. |
| Building a new skill for a gap | skill-creator-v2 |

## PROJECT SKILLS — 52 website skills copied into the repo (2026-07-30)
All 52 website-build skills (incl. the full SEO group and the 8 newly
created ones) now live IN THIS REPO at .claude/skills/<name>/SKILL.md —
load them directly; no local-index fallback needed for these. Phase
additions:
| Phase | Project skills |
|---|---|
| S Strategy | saas-website-strategy-brief-architect, competitor-website-teardown-analyst, user-journey-funnel-mapper, audience-segmented-landing-designer |
| 1-2 Design/IA | saas-website-sitemap-architect, saas-website-visual-storytelling-director, product-screenshot-mockup-specialist, hero-section-cro-specialist, cta-strategy-architect, scroll-engagement-pacing-designer, exit-intent-recovery-designer, web-motion-implementation-director, footer-navigation-architect |
| Copy | hero-headline-value-prop-writer, feature-benefit-copywriter, saas-website-microcopy-specialist, faq-page-strategist, comparison-page-copywriter, case-study-page-writer, blog-content-seo-writer |
| Pages | pricing-page-strategist, saas-pricing-model-strategist, free-trial-signup-flow-designer, social-proof-wall-designer, review-aggregation-specialist, integrations-directory-page-architect, changelog-roadmap-page-writer, interactive-roi-calculator-designer, demo-booking-flow-optimizer, email-capture-nurture-bridge-designer, website-utility-pages-designer, product-launch-landing-page-strategist, referral-waitlist-page-designer |
| SEO (mandatory on structural changes) | seo-technical-audit-specialist, on-page-seo-copywriter, schema-structured-data-architect, content-seo-strategist, local-seo-specialist-india, link-building-outreach-strategist, seo-rank-tracking-specialist, social-share-preview-architect, website-i18n-hreflang-architect (bilingual) |
| Technical/QA | core-web-vitals-optimizer, cms-content-architecture-specialist, analytics-tag-management-architect, cookie-consent-privacy-banner-specialist, website-launch-qa-checklist-specialist, ab-testing-framework-specialist-web, website-conversion-funnel-analyst, heatmap-session-recording-analyst |
| Trust/legal | security-compliance-trust-center-specialist, legal-pages-generator |
Social-proof skills obey app_reality.md's early-stage honesty rule
(2 customers — no fabricated proof).

## GAPS CLOSED 2026-08-24 — both mascot/asset gaps are now real skills
Both previously-recorded gaps are filled and live at .claude/skills/:
- brand-character-mascot-designer — owns the mascot lifecycle: mascot-vs-no-
  mascot scoring gate (§7, GO 28-35 / CONDITIONAL 21-27 / NO-GO 0-20), 64px
  silhouette test, LOCKED design sheet with immutable identity anchors,
  ≤3-emotion budget, pose library, 48px→hero scalability, colour discipline,
  cultural-fit review, 8 hard role boundaries, retirement criteria, §20
  handoff contract. It is the ONLY skill permitted to define the character.
- web-illustration-asset-production-pipeline — owns approved-design → shipped-
  file: candidate curation, format decision, raster→vector, SVG/Lottie hygiene,
  weight budgets, next/image wiring, theme variants, alt text, provenance.
The raster-only dispensation is REVOKED: "character assets ship raster and must
justify weight" no longer applies. Format is decided by the pipeline skill's
Format Decision Tree, and a raster hero needs a written trade-off, not a shrug.

### INCOMPLETE SKILL PAYLOAD (verified 2026-08-24 — do not gate on the missing parts)
web-illustration-asset-production-pipeline's SKILL.md references four sibling
reference files (CURATION_AND_FORMATS, PRODUCTION_STANDARDS,
REPOSITORY_AND_PROVENANCE, CHECKLIST_AND_FAILURES) and scripts/validate_asset.py.
NONE of these exist in the folder yet. Until they do:
- Apply the skill's principles, workflow and completion criteria from SKILL.md.
- The HUMAN curation + weight-budget + provenance gate is mandatory regardless.
- Do NOT cite "validate_asset.py exited 0" as evidence — the script is absent.
  A fabricated script-pass is worse than an honest manual gate.
- Owner action queued: author the four reference files + the script, or fold
  their rules into SKILL.md.

## OPEN GAP — logo / wordmark DESIGN has no governing skill
Recorded as UniqBotz M-08 and still unfilled. theme_system.md §LOGO CONTRAST
governs how an EXISTING logo is DISPLAYED across themes; nothing governs
designing or evolving the mark itself (grid, clear space, minimum size,
reversed/mono variants, favicon derivation). Until a skill exists, a request
to design or redraw a logo hits §Fallback step 3: STOP and tell the owner
what type of skill is missing. brand-character-mascot-designer is NOT a
substitute — it owns a character, not a wordmark.

## REMAINING GAP
- image-generation produces PROMPTS, not files: rendering happens in an
  external tool (gpt-image-1 / Gemini Imagen / Midjourney) and the owner
  curates the output before it enters the repo. That hand-off is now OWNED by
  web-illustration-asset-production-pipeline and MUST be written into the
  Phase 2 media plan; it is still not automatic.

## Research tools (not skills — mandatory in Phase S and brainstorm)
WebSearch + WebFetch: competitor pages, current best-practice references,
Core Web Vitals guidance. Every strategic decision must cite at least one
current fetched source. No source = decision invalid.

## VENDORED SKILL VERSIONS (checked 2026-08-24 — a vendored copy goes stale silently)
- `.claude/skills/ui-ux-pro-max/` — INSTALLED and working (SKILL.md + 11 data
  CSVs + a BM25 search engine; verified running 2026-08-24). It is NOT
  optional "visual polish": its own priority table is 1 Accessibility
  CRITICAL, 2 Touch & Interaction CRITICAL, 3 Performance HIGH, 4 Layout &
  Responsive HIGH — all of which this framework gates on. Route to it FIRST
  for style/palette/typography/UX/accessibility/chart-type questions
  (resource_registry.md R-01, consult ladder rung 1).
  Query: `python scripts/search.py "<q>" --domain <style|color|chart|ux|
  typography|landing|product>`.
  STALE: local is v1.x (67 styles / 96 palettes / 57 font pairings / 13
  stacks / 99 UX guidelines) vs upstream v2.0 (79 / 192 / 74 / 22 / 119, plus
  "Intelligent Design System Generation"). Upstream is MIT, so updating is
  unblocked: github.com/nextlevelbuilder/ui-ux-pro-max-skill. Owner action —
  update the vendored copy, then re-verify the search script runs.
  Prevents: half the available design data sitting unused because nobody
  recorded that the copy was old.

Local repo skill also available inside this project: .claude/skills/ui-ux-pro-max
— may be used alongside Phase 1 skills for visual polish.

## SKILL INDEX — SOURCE OF TRUTH (changed 2026-08-23)
CANONICAL: the skills index lives in GitHub, repo `UniqBrio/uniqbrio-skills-cloud`,
file `Claude_Skills_List_Updated.xlsx` (with a `.csv` mirror alongside it, because
an .xlsx is a binary blob — no diffs, no reviewable history, unresolvable merge
conflicts). The repo copy is what other machines, future sessions and any
collaborator must read.
WORKING COPY: C:\Explorations\Pull-skill-research-MultiLLMs\Claude_Skills_List_Updated.xlsx
is a checkout, not the master. Any edit made there is UNPUBLISHED until pushed.
SYNC OBLIGATION: a session that appends or edits a skill row must, in the same
run, either push the change or state plainly that it could not and name the file
left dirty. "Updated the index" without a push is a false completion claim.
HOW A CHANGE REACHES THE REPO (verified 2026-08-23 — this is the whole route):
Claude WRITES files into the clone at C:\Explorations\uniqbrio-skills-cloud and
regenerates the CSV mirror (`python tools/export_index_csv.py`); the OWNER runs
`git add` / `git commit` / `git push`. Claude cannot commit. Three routes were
tested and failed, so do not re-litigate them without new evidence:
  - Cloud session GitHub API — 403, sessions are bound to attached repos only.
  - Device-bridge shell — no network (github.com unreachable), and git index
    operations die because .git/index.lock cannot be unlinked on the mount.
  - GitKraken plugin — its MCP runs in the Linux workspace, so a Windows
    `gk auth login` never reaches it; mutating git calls hit the same index.lock
    wall (reads like git_status work, git_add/git_checkout return exit 128).
Consequence for every session: after editing the index, hand the owner the exact
commit commands and state plainly that the change is unpushed until they run them.

## Fallback rule (when a mapped skill is NOT available in Claude Cloud)
1. Check the index (canonical: the GitHub copy above; operational read: the local
   working copy at
   C:\Explorations\Pull-skill-research-MultiLLMs\Claude_Skills_List_Updated.xlsx)
   — match by name, then by description / "when to use". If the working copy is
   dirty relative to the repo, say so before relying on it.
2. Load the matching skill folder from
   C:\Explorations\Pull-skill-research-MultiLLMs\output and apply its
   SKILL.md before proceeding with the phase.
3. If it exists in neither Claude Cloud nor the local repository, OR no row
   in this file's tables actually matches the design work at hand: STOP —
   do not proceed as though a skill exists. Report EITHER the missing
   skill(s) by name, OR, if none was ever identified, plainly state what
   TYPE of website-design skill the work needs (e.g. "a skill governing
   image-hover interaction states"). State why the work needs it, and
   wait — do not continue with an unskilled approximation.
