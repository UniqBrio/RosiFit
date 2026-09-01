# Website Development Framework
<!-- C:\Website_development_framework — the reusable master. Site work
     never happens here; /winit copies this into each site's repo. -->
LAST UPDATED: 2026-08-26 (colour system: one seed, generated tokens, measured contrast)

## What this is
A complete, site-agnostic workflow for building ANY website from scratch to
professional quality: evidence-based strategy → gated build → state-aware
QA → release, plus a growing design-pattern library and brand-locked image
prompts. All brand/site facts live in ONE file (site_profile.md); workflow
files reference {TOKENS} resolved at init.

## Start a new website
1. Run **/winit <target repo> <site name>** — copies everything, interviews
   you for the site profile (brand colors, ICP, stack, REAL customer
   count), instantiates truth files, verifies zero unresolved tokens.
2. Fill **app_reality.md** (feature truth). The site may never claim more.
3. **/wrequest** your first change → review → **/website** to build.

## Commands (.claude/commands/)
| Command | Use for |
|---|---|
| /winit | Bootstrap a new site repo from this framework |
| /wrequest | Draft a change request (owner approves before build) |
| /website | Run an approved request through the pipeline (Phases 0→7) |
| /waudit <scope> | Strategy audit of any page — report only |
| /brainstorm | Explore options before committing to a request |

## Files (website_workflow/)
| File | Purpose |
|---|---|
| site_profile_TEMPLATE.md | ALL brand/site tokens — single source |
| app_reality_TEMPLATE.md | Truth file — claims may never exceed it |
| website_flow.md | Pipeline: intake → strategy → build → QA → release |
| strategy_audit.md | Phase S: fresh competitor research + claim checks |
| decision_matrix.md | Conversion-first scoring (500 pts); current state = Option A |
| design_library.md | REF (owner) / ALT (Claude) reusable patterns — grows per site |
| animation_library.md | Motion SELECTION: four-job gate, 8-category catalog, reduced-motion + ambient ceiling |
| responsive_matrix.md | Device tiers (chromium+webkit), the responsive RCA loop, RF-xxx failure patterns |
| resource_registry.md | Standing external references + the trigger each one needs; consult ladder |
| theme_system.md | {THEME_MODE}, paired colour tokens, COMPUTED contrast + token parity, toggle failure modes |
| color_system.md | ONE {BRAND_SEED} → L1 ramps → L2 semantic tokens, generated + contrast-corrected |
| tools/generate_palette.py | The generator: seed → CSS/TS tokens + a PASS/FAIL contrast report |
| qa_workflow.md | Test lifecycle: generate from 7 sources → register → execute → RCA → fix → regression → completion |
| degraded_paths.md | Absence semantics, producer-shaped triggering, DP-xxx catalogue; untested degraded path = FAIL |
| reference_site_analysis.md | Intake for an owner-supplied URL: 6 scope-gate lanes (incl. code-repo licence gate), fetch, synthesize into design_library.md |
| image_prompts.md | Brand-locked image-generation templates |
| skills_map.md | Which skill per phase + fallback rule (swap domain skills per site) |
| checklists/ | Interrogation (incl. Q-STATE-CONTRAST) + QA evidence gate |
| templates/ | Request templates: new / correction / bug + test_register_TEMPLATE.md |
| framework_update.md | Fix the workflow itself (gated, logged) |
| supabase_review.md | Backend-touching change review (skip if stack differs) |
| decisions_log.md | Per-site decision log (kept EMPTY in this master by design) |

## Non-negotiable rules (inherited by every site)
1. Truth: no claim beyond app_reality.md; no fabricated social proof,
   counters, popups, testimonials — at any customer count.
2. Evidence: every strategic decision web-researched + matrix-scored;
   ties go to the simpler option; losers logged, never re-litigated
   without new evidence.
3. Contrast in ALL states (default/hover/focus/active/selected/disabled/
   animated) AND every active theme — theme is an AXIS, not a state:
   ≥4.5:1 body, ≥3:1 large text and UI/focus indicators; background changes
   flip text in the same transition. Which accent is unsafe as text INVERTS
   with polarity — measure it, never assume (theme_system.md).
4. Accent scarcity: one primary-accent action per viewport.
5. Command duplicates (.claude/commands ↔ website_workflow/commands) stay
   byte-identical.
6. SEO skills mandatory on structural/page changes.
7. Every workflow change updates BOTH README sections — the Files table
   (if a file was added/removed/renamed) AND the Update log — plus
   decisions_log in a site repo. Naming only "the README" let the Files
   table go stale while the Update log stayed current (animation_library.md
   was added 2026-08-24 and missing from the table until the same day).
8. Different brand/site → its own cloned workflow; truth files never mix.

## Provenance
Battle-tested on UniqBrio-Landing (2026-07 → 2026-08): decisions carried
in as defaults — conversion-first matrix weights, honest-early-stage
social-proof substitutes, state-contrast rule, out-of-scope guard.

## Update log
- 2026-08-09: Framework extracted and tokenized; /winit added.
- 2026-08-23: Brand character / mascot made a scored option. strategy_audit
  S4 gains the format + a mascot-vs-no-mascot research requirement;
  image_prompts.md gains templates 7-8 and the §MASCOT quality bar (and its
  blanket anti-mascot negative is now scoped to decorative stock characters);
  skills_map.md maps the character skills to S4 and records the known skill
  gaps (no mascot-design skill, no SVG/Lottie production skill).
  Prevents: improvised, inconsistent character art with no quality bar —
  and the previous rule that silently forbade a proven category pattern.
- 2026-08-23: Skills index source of truth moved to GitHub
  (UniqBrio/uniqbrio-skills-cloud). skills_map.md gains a SKILL INDEX block:
  repo = canonical, C:\Explorations\... = working copy, plus a sync obligation
  (an unpushed index edit must be reported, never claimed as done) and a
  TRANSITION paragraph to delete once a push route exists. Prevents: a session
  editing a local-only copy and reporting the index as updated.
- 2026-08-23: Push route settled after testing. Claude writes into the clone;
  the owner commits and pushes. The TRANSITION paragraph is replaced by HOW A
  CHANGE REACHES THE REPO, which records the three routes that were tried and
  why each failed (cloud GitHub API 403; device bridge has no network and cannot
  unlink .git/index.lock; GitKraken plugin's MCP runs in the Linux workspace so
  a Windows gk login never reaches it). Prevents: re-spending hours rediscovering
  that Claude cannot commit from here.
- 2026-08-24: The two skill gaps recorded on 2026-08-23 are CLOSED —
  brand-character-mascot-designer and web-illustration-asset-production-pipeline
  now exist at .claude/skills/. Root cause of this update: the 2026-08-23 entry
  hard-coded workarounds for skills that did not exist, and those workarounds
  outlived the gap. Changes: skills_map.md S4 + situational rows now route
  mascot work to the owning design skill and drop uniqbrio-character-bible from
  the mascot chain (a human persona may never serve as a mascot); the KNOWN
  SKILL GAPS block is replaced by GAPS CLOSED, which REVOKES the standing
  permission that "character assets ship raster and must justify weight".
  strategy_audit.md S4 now gates the brand-character format behind the skill's
  GO / CONDITIONAL / NO-GO score, and a CONDITIONAL verdict's deployment limits
  bind Phases 1 and 5. image_prompts.md template 7 is demoted to a rendering
  aid (the character is designed, never invented by a prompt) and §MASCOT grows
  from six points to seven (provenance + filename convention added).
  website_flow.md Phase 2 gains a mandatory PRODUCTION HAND-OFF item and Phase 5
  an ASSET GATE; interrogation Q6 and qa_evidence_gate §3 now require the
  provenance artifact. site_profile_TEMPLATE.md gains {MASCOT_LOCK} — a field
  image_prompts.md already referenced without it existing anywhere.
  framework_update.md's blast-radius list gains .claude/skills/<name>/ and the
  templates, and its step 6 no longer sends framework-master entries into the
  deliberately-empty decisions_log.md.
  Prevents: (a) mascot work routed to a skill that forbids the role; (b) a
  revoked raster dispensation still readable as live permission; (c) untraceable
  generated binaries entering a repo with nobody owning the hand-off.
  NOT DONE — carried as a known limitation: the illustration skill ships as a
  lone SKILL.md; the four reference files it links and scripts/validate_asset.py
  do not exist. No gate cites that script, deliberately — an unsatisfiable rule
  gets skipped. Owner action: author them, or fold their rules into SKILL.md.
  Also fixed this run: that skill's file was named <skill-name>.md, so it never
  loaded at all; renamed to SKILL.md.
- 2026-08-24: OPTION SELECTION FUNNEL added. Root cause: design_library.md's
  rule 5 returns the "top 5" alternatives for a section, but decision_matrix.md
  seats only current-state + 3 challengers — nothing said who cut the other
  two, so a real choice was being made silently, violating the Second
  Directive (website_flow.md) in the one step that was never written down.
  design_library.md gains a 4-stage funnel (scope → screen every entry, cheap
  and mechanical → rank eligible → score current-state + top 3) and a
  SHORTLIST PROVENANCE output (screened/OUT/eligible/DEFERRED), a SITE
  DEFAULTS clause so a 3x winner stops re-scoring, and rule 5's re-litigation
  ban is scoped to "same slot" so an append-only library stops killing itself
  as it grows. decision_matrix.md gains rule 7 (shortlist provenance
  mandatory); website_flow.md's standing instruction + GATE 1 and
  interrogation_checklist.md (new Q-OPTION-SET) both now require the
  LIBRARY SCREEN block. brainstorm.md (both copies) now screens the library
  BEFORE inventing options — it previously generated options next to a
  library built to supply them.
  Same run, owner-directed content: three new library entries, each with
  matrix-eligibility metadata (Cost/Disqualifiers added to the INDEX) —
  REF-005/ALT-005a/ALT-005b (sticky scroll-stack cards, from an Amazon SES
  screenshot), REF-006/ALT-006a/ALT-006b (horizontal scroll track, with the
  horizontal-scroll accessibility/discoverability cautions the pattern
  requires), and ALT-001d (rollable image-dice hero, extending REF-001 to
  browse multiple images via click/scroll roll instead of free-rotate).
  Prevents: an unscored cut between library candidates 3 and 4 passing as a
  scored decision; the library's own growth eventually making every entry
  unusable under a literal reading of the re-litigation ban.
  Honest limit recorded in the funnel itself: this procedure finds the best
  of the top-3 ELIGIBLE candidates, not the best of all N — never claim more
  coverage than that.
- 2026-08-24: Added REFERENCE SITE ANALYSIS. Root cause: design_library.md's
  §HOW TO ADD AN ENTRY assumed the owner had already scoped their reference
  before handing it over; nothing asked whether a URL should be analyzed
  whole-site, one named part, or was actually a direct "add this" instruction
  rather than inspiration — so a narrow ask risked a full-site trawl, and a
  real requirement risked getting buried as just another library option.
  New file website_workflow/reference_site_analysis.md owns the SCOPE GATE
  (ask before fetching, every time — three lanes: whole site / named part
  default-scoped-but-confirmed / explicit element that skips the question
  but never the build gates) and the fetch → synthesize → record procedure,
  writing REF/ALT entries into design_library.md in its existing format.
  Cross-referenced from: design_library.md (rule 1 + HOW TO ADD AN ENTRY),
  website_flow.md (STANDING INSTRUCTIONS), strategy_audit.md §S2 (one extra
  mid-flow reference), skills_map.md (situational row, replacing the
  narrower "Reverse-engineering a reference design" row), and both
  wrequest.md / brainstorm.md command copies (identical edits, verified by
  diff). waudit.md and winit.md were left untouched — waudit's contract is
  report-only with its own 5-reference procedure at a different granularity;
  forcing a merge would have contradicted its explicit "never edits the
  site, owner decides what becomes a request" rule.
  Prevents: (a) an unscoped whole-site trawl on a narrowly-asked question;
  (b) a direct "add their X" instruction diluting into an optional library
  entry instead of reaching /wrequest; (c) the scope question turning an
  already-named-part request into an unnecessary blocking round-trip.
- 2026-08-24: Owner-directed content only (no rule change; logged for master-
  repo traceability, since decisions_log.md stays empty here): REF-007 /
  ALT-007a / ALT-007b added to design_library.md — grayscale-to-color hover
  reveal for persona/segment cards (chessplay.io screenshot: hovered card
  renders in color, the other cards stay monochrome), plus a scroll-trigger
  touch equivalent (hover has no touch analogue) and an accent-duotone
  variant that keeps the reveal inside the two-accent palette instead of
  arbitrary photo color. Added via §HOW TO ADD AN ENTRY's screenshot lane.
- 2026-08-24: Skill Validation Gate + Proactive Design Exploration added.
  Root cause: the framework let a design element, pattern, component, or
  interaction be added without ever naming which website-design skill
  governed it, and never proactively looked beyond the literal ask for
  complementary improvements the same skill would support — both gaps
  meant "unskilled" design work could pass silently and a request stayed
  a ceiling instead of a baseline. Changed: design_library.md rule 3 gets
  a third provenance type, IDEA (Claude-proposed complementary improvement
  arising from an ordinary design request, not an external reference);
  rule 6 rewritten to drop the old "one enhanced variant" cap and make any
  design request a BASELINE, not a ceiling — implement what was asked AND
  explore complementary ideas via the governing skill, no fixed count, no
  arbitrary or unrelated addition; new rule 9 (SKILL VALIDATION GATE)
  requires the governing skill(s) be identified via skills_map.md before
  any design element (requested or complementary) is added, with
  surviving complementary ideas recorded as their own IDEA-xxx entries.
  skills_map.md's header comment now notes rule 9 invokes it for ANY
  design change, not only the phase-mapped rows, and §Fallback step 3 is
  rewritten to also cover the case where no table row matches at all —
  STOP and state plainly what TYPE of skill is needed, don't proceed
  unskilled. website_flow.md STANDING INSTRUCTIONS gets a matching SKILL
  VALIDATION GATE bullet. checklists/interrogation_checklist.md gets a new
  Q-SKILL-VALIDATION check (governing skill named and actually applied,
  missing skill disclosed before proceeding, every surviving complementary
  idea recorded as IDEA-xxx). Both wrequest.md and brainstorm.md command
  copies untouched by scope (wrequest.md was already updated for reference
  site analysis routing); brainstorm.md's step 4 (SCREEN, THEN GENERATE)
  gets one clause: a newly invented option is validated against its
  governing skill per rule 9 before being recorded as an ALT entry
  (verified byte-identical across both copies).
  Prevents: (a) a design change landing with no skill backing it at all —
  the exact failure class the owner's request named directly; (b) a
  complementary idea being silently generated and then silently dropped,
  never recorded, never offered to the owner; (c) proceeding as though an
  unavailable or unidentified skill exists instead of stopping and naming
  what type of skill the work actually needs.
- 2026-08-24: SOURCE-DOCUMENT INVENTORY gap closed. Root cause, evidenced
  from a real build (site repo uniqbotz-website, request
  WEB-NEW-20260824-uniqbotz-launch): the owner's plan document
  (uniqbotz-website-plan-revised.md) named 8 AI-generation scenes for the
  locked brand character in its own dedicated section 43 image-prompt
  section; the filled request file's CONTENT INPUTS > Images field
  transcribed only 1 (the hero). The other 7 were never built, deferred, or
  even mentioned in the site's own 13-point self-audit
  (FRAMEWORK_MODIFICATIONS.md M-01..M-13) — a silent drop stronger than
  "unknown", because nothing after intake ever re-read the source document
  to check. wrequest.md (both copies) gains a SOURCE DOCUMENT rule: a cited
  plan/spec must have every visual/media reference it names individually
  resolved or marked "unknown - section ref", never summarized away.
  website_new.md's CONTENT INPUTS > Images field now requires one line per
  named asset, not a single "see attached". website_flow.md Phase 0 now
  re-reads a cited source document itself rather than trusting the request
  file's summary of it. strategy_audit.md S4 gains step 0, an inventory pass
  (request + source document + page plan) BEFORE "decide the format for
  every slot" — so "every slot" stops being vacuous over whatever survived
  intake. interrogation_checklist.md Q1 gains a cross-check bullet as a
  second line of defense on the way out.
  Prevents: a detailed owner-authored plan's own asset list being silently
  under-transcribed at intake, with no phase downstream positioned to notice
  the gap — confirmed absent from a real, otherwise-thorough 13-finding
  self-audit, which is why this needed the master fix rather than a one-off
  site patch.
- 2026-08-24: Two new reference_site_analysis.md SCOPE GATE lanes for
  reference types the existing 3 (explicit element / named part / whole
  site) don't fit: Lane D (a theme/token GENERATOR — output is colors/radius,
  not a layout to browse) and Lane E (a commercial template MARKETPLACE — a
  category listing is a directory of unrelated products, never one design
  to learn from; only a specifically named template page may become a REF
  entry, and it carries a licence caveat: unpurchased = inspiration only,
  never code/asset reuse). STEP 2 also gains a WebSearch fallback for a
  JS-rendered tool page that returns no usable content but is documented
  elsewhere — evidenced live this run: zippystarter.com's theme generator
  returned only nav text on WebFetch; WebSearch found citable confirmation
  instead of the analysis stalling or guessing.
  design_library.md gains REF-008/ALT-008a (zippystarter's seed-color
  generator + a framework-native version of the same one-decision workflow)
  and REF-009/ALT-009a (NativeWindUI's generator, proving the pattern
  generalizes to RN/Expo stacks, plus a stack-aware export-format note).
  Both REFs carry the same caution: no external generator knows this
  framework's accent-scarcity or {ACCENT_2_TEXT} rules, so raw output is a
  candidate requiring the Lane D fit-check, never a direct site_profile.md
  edit.
  Deliberately NOT added: a REF for uizard.io (a SaaS app behind signup,
  no exportable design system, and no visual evidence of its own marketing
  page beyond a function summary — writing a layout REF without having
  actually seen the layout would violate the same standard REF-001 already
  sets) or for the themeforest.net category page itself (that IS lane E's
  rule working correctly — a listing page is a directory, not a reference).
  Prevents: forcing a token-generator or a marketplace-directory reference
  through a lane built for browsable page sections, which would either
  silently mis-scope the analysis or fabricate a REF entry for content that
  was never actually examined as a single design.
- 2026-08-24: New file website_workflow/animation_library.md — closes a gap
  where web-motion-implementation-director was mapped to "implement motion"
  with no file governing WHICH pattern, when one is warranted, or what job
  it must serve. Source: Prismic "Tailwind CSS Animations"
  (https://prismic.io/blog/tailwind-animations), 38 named examples fetched
  and sorted 2026-08-24 by JOB rather than Prismic's original by-
  implementation-type grouping (loading/processing, attention, hover-buttons,
  hover-cards, reveal/entrance, scroll-driven, interactive-toggle, ambient/
  decorative). PRIME RULE: motion ships only if it serves hierarchy,
  interaction feedback, storytelling/state-communication, or loading/wait-
  communication — default posture is skepticism, same discipline as
  brand-character-mascot-designer's mascot gate applied to a different
  medium. Ambient/decorative defaults to REJECT; a character animation in
  that category routes through brand-character-mascot-designer, never
  improvised here. Selection procedure: screen the local catalog first,
  refer live to the source only if nothing fits (same citation discipline as
  reference_site_analysis.md), then specify element/trigger/timing/intensity
  plus mandatory prefers-reduced-motion, Q-STATE-CONTRAST, and a new
  one-ambient-animation-per-viewport ceiling (accent-scarcity's discipline
  extended to motion).
  Wired in: website_flow.md (new MOTION LIBRARY standing instruction, same
  pattern as the DESIGN LIBRARY bullet), interrogation_checklist.md (new
  Q-MOTION-JUSTIFICATION), skills_map.md (new situational row — this file
  decides, web-motion-implementation-director builds), design_library.md
  (one cross-reference line: motion timing is canonical here, not
  re-derived ad hoc in REF-005/007).
  Prevents: motion added because "it looks more dynamic" with no job it
  actually serves, and — the failure this session's own instructions named
  directly — a decorative-by-default outcome from having 38 available
  patterns and no gate deciding which, if any, apply.

- 2026-08-24: THREE updates applied together (all owner-approved).
  (1) RESPONSIVE MATRIX. Root cause: templates/website_bug.md required "root
  cause written and confirmed BEFORE the fix (no symptom-patching)" plus a
  fails-before/passes-after regression spec, while qa_evidence_gate.md said
  only "Otherwise: list of failures -> back to Phase 4". Same defect class,
  two rigor levels, decided by who noticed first — the gate permitted exactly
  the visual workaround the bug template forbids. New responsive_matrix.md:
  TIER 1 six device profiles across chromium AND webkit (verified against a
  real 207-profile Playwright registry; the old 360x800 baseline matches no
  real device — real narrowest is 320), TIER 2 triggered, TIER 3 stating what
  emulation cannot prove. Adds the RCA loop and an append-only RF-001..011
  failure-pattern library where each entry names the WRONG fix to reject.
  responsivetesttool.com is placed as manual triage only — it has no API/CLI
  and 100vh inside its iframe cannot reproduce RF-002, the most common mobile
  bug, so it can never be the evidence.
  (2) RESOURCE REGISTRY. Root cause: skills_map.md routes internal skills and
  reference_site_analysis.md handles a ONE-OFF owner URL ("each reference gets
  its own scope gate"); a standing resource consulted repeatedly fit neither,
  so it was either ignored or used indiscriminately. New resource_registry.md:
  trigger-gated entries (ui-ux-pro-max LOCAL, tweakcn, awwwards, Looker
  Studio, plus the charting decision path), a consult ladder that puts LOCAL
  first, and the rule "name the trigger or don't open it". Records that
  ui-ux-pro-max was demoted to optional "visual polish" despite its own top
  two categories being CRITICAL, and that the vendored copy is v1.x-stale vs
  upstream v2.0 (MIT, so updating is unblocked). awwwards carries a recorded
  bias: performance/accessibility/usability are not its judging criteria.
  (3) CODE-REPO LANE F. reference_site_analysis.md gains a sixth scope lane
  for source-code repositories, licence checked FIRST, before reading source:
  copyleft = concepts only, copy zero files; permissive = reuse with recorded
  attribution; no licence = all-rights-reserved. Precedent recorded:
  webstudio-is/webstudio is AGPL-3.0-or-later across root AND the sdk /
  css-engine / design-system packages, so the verdict was 3 process ideas
  adopted in our own words and zero files copied. From it: GATE REVIEW DEPTH
  in website_flow.md (every gate now names conceptual / detailed / evidence,
  because a gate that only says "approve" invites a rubber stamp), and the
  README Files-table fix — animation_library.md had been added the same day
  and was missing from the table, so rule 7 now names BOTH README sections.
  Prevents: (a) a responsive defect fixed cosmetically because our own gate
  found it instead of the owner; (b) standing references applied
  indiscriminately or forgotten; (c) copyleft code entering a commercial site.

- 2026-08-24: CINEMAGRAPH GATE + template 9. Root cause: cinemagraph was
  already a scored S4 media format, but its mapped skill
  gif-and-cinemagraph-brief is NOT installed and no prompt template existed —
  a format the framework could choose but not execute, which under
  skills_map §Fallback would have stopped the pipeline. image_prompts.md
  gains template 9 (source still generated in Qwen: subject, composition,
  named static elements, ONE subtle motion, visual style, aspect ratio,
  intended placement) and the CINEMAGRAPH GATE: format decision first via
  S4, the four-job motion test, ONE moving element (two = it's a video),
  seamless loop, MP4/WebM never GIF, mandatory prefers-reduced-motion poster
  fallback, and app_reality truth rules. Default posture is REJECT — most
  marketing cinemagraphs are ambient texture, which animation_library.md
  already defaults to rejecting.
  Prevents: a cinemagraph commissioned because motion feels premium, shipped
  as a heavyweight GIF with no static fallback and no stated job.

- 2026-08-24: THEME SYSTEM — ESCALATED, not patched. framework_update.md
  step 6 fired: this failure class appeared twice. (1) The UniqBotz run's
  finding M-01, "The framework assumes a DARK theme, and says so in rules,
  not just examples" — root-caused, a 5-point master edit set proposed, and
  never applied; that run's own decisions_log records theme polarity losing
  a matrix, "D-04 Theme polarity: Light 440/500 vs Dark (the framework's
  baked-in default) 270". (2) The owner's request for a runtime light/dark
  toggle. Re-patching was forbidden, and M-01's fix would have been
  insufficient anyway: a {THEME_POLARITY} variable still left {BG_0} holding
  ONE hex, so a site running BOTH themes stayed inexpressible.
  Root cause redone: the colour tokens were single-valued AND dark was
  written as a RULE, not a default — design_library.md's "constraints that
  ALWAYS apply: dark theme", reference_site_analysis.md fit-checking every
  pattern against "dark theme", and {ACCENT_2_TEXT} defined as "legal as
  text ON DARK". That last one is a dark-theme rule wearing a contrast
  rule's clothes, and it genuinely inverts: purple #6708C0 is 8.85:1 on
  white (legal) while orange #DE7D14 is 2.98:1 (illegal).
  New theme_system.md: {THEME_MODE} = SINGLE-DARK (default, owner-chosen) /
  SINGLE-LIGHT / DUAL (opt-in, because a toggle doubles tokens, assets and
  evidence). Colour tokens become PAIRS, adding {ACCENT_1_ON} — the label on
  the primary button, the most important text on the page, which previously
  had no token and is how a 2.98:1 CTA reached an approved plan — and
  {SHADOW}, which inverts in KIND (a black shadow tuned for light is
  invisible on dark). Contrast becomes COMPUTED, not photographed: a WCAG
  ratio table over every foreground x surface pair in every active theme is
  the proof, screenshots are the spot-check. DUAL adds a token-parity
  assertion. Ships the what-does-NOT-auto-update list (charts and canvas
  read colour once at init; SVG hardcoded fills; baked-background images;
  meta theme-color; scrollbars; native control accents; focus rings;
  third-party embeds) and a sampling rule, because the naive matrix is
  6 profiles x 2 themes x 7 states = 84 captures per component and would be
  ignored within a week.
  Wired: site_profile_TEMPLATE.md (paired token table + measured-contrast
  table + polarity-neutral contrast constraint), design_library.md ("always
  dark" replaced; pre-2026-08-24 entries reinterpreted as the DARK column),
  interrogation_checklist.md (Q-STATE-CONTRAST: theme is an AXIS, matrix is
  states x themes), qa_evidence_gate.md (new §4b), image_prompts.md
  (theme-safe assets; the negative rule now names a measurement, not a
  colour), reference_site_analysis.md, skills_map.md, and README rule 3.
  Prevents: (a) a site whose own brand makes the framework's contrast rule
  backwards, with nothing noticing; (b) a hover state readable in one theme
  and invisible in the other, which the old state list could not express;
  (c) a toggle that flips CSS variables while charts, SVGs and images keep
  the old theme.

- 2026-08-24: QA WORKFLOW. Root cause: the framework could prove a specific
  CLAIM (screenshots, contrast tables, Playwright output) but had no notion
  of a test-case POPULATION. Phase 5 said only "add/extend spec(s) covering
  the change" — no rule for deriving what "covering" means, no register of
  which cases exist, no record that each ran, and no completion definition
  beyond "every checked box has an artifact". Coverage was therefore whatever
  the session happened to think of, and the absence of a test was
  indistinguishable from a passing one.
  New qa_workflow.md owns the lifecycle without restating what other files
  own (responsive_matrix.md device tiers + RCA, theme_system.md contrast,
  qa_evidence_gate.md artifacts, website_bug.md root-cause discipline):
  (1) WHAT is tested — 8 dimensions, with RESPONSIVENESS PRIMARY: every
  FUNC/UI/A11Y/THEME case must name the viewport profile it ran at, because
  a case passing only at desktop is untested everywhere else.
  (2) WHERE cases come from — six mechanical sources (requirements,
  components, user flows, viewports, themes, defect history) plus a
  TRACEABILITY rule: a MUST-HAVE with no case is incomplete generation, not
  a passing test.
  (3) TRACKING — a register at website_workflow/qa/test_register.md created
  at Phase 2 BEFORE code, with NOT-RUN explicitly not a terminal state.
  Cases invented afterwards to match what already passed are not coverage.
  (4) DEFECTS — root cause before fix, and every fixed defect leaves a
  PERMANENT case that fails before and passes after.
  (5) REGRESSION SCOPE — a concrete (a)-(f) selection rule, because
  "re-run everything" gets skipped and "re-run the one case" ships
  regressions; a full TIER 1 sweep is required whenever a fix touched
  layout, CSS or tokens.
  (6) COMPLETION — zero NOT-RUN, zero open S1/S2, every S3/S4 fixed or
  explicitly owner-accepted in writing (silent tolerance is not acceptance),
  and a QA SUMMARY that states what was NOT covered.
  Wired: website_flow.md (Phase 2 generation + GATE 2 traceability, Phase 5
  completion), qa_evidence_gate.md (new section 1b), interrogation_checklist.md
  (new Q-TEST-COVERAGE), templates/website_bug.md, skills_map.md, and a new
  templates/test_register_TEMPLATE.md.
  The template ships WITH the rule deliberately: the 2026-08-24 Webstudio
  review found their PR template requiring an update to a test-cases.md that
  returns 404 — a register that does not exist reads as coverage, which is
  worse than none.
  Prevents: (a) coverage defined by what someone remembered; (b) an unrun
  case being indistinguishable from a passing one; (c) "QA is done" as a
  feeling rather than a defined state.

- 2026-08-26: DEGRADED PATHS. Root cause: the framework mandates safety
  mechanisms everywhere ("unknown stays unknown", skill fallbacks,
  reduced-motion fallbacks, token parity, PENDING sentinels) and required
  evidence for essentially none of them. The only degraded-path checks that
  existed were for prefers-reduced-motion, and even those said "respected"
  rather than requiring the fallback be triggered and observed.
  qa_evidence_gate.md's "one negative path (bad input, API failure mocked)"
  covers a USER sending bad input — never the ENVIRONMENT supplying nothing,
  a different producer with a different input shape. And qa_workflow.md's six
  generation sources contained no safety-mechanism source, so a degraded path
  was tested only if someone happened to think of it — the same
  coverage-by-what-was-remembered failure that file was written to end,
  surviving in a form the file itself did not catch.
  Real incident generalised (2026-08-26, UniqBotz production): the PENDING
  sentinel implementing "unknown stays unknown" used
  `process.env.X ?? PENDING`. `??` falls back only on null/undefined, so an
  env block pasted into Vercel with blank values — exactly what you do for a
  variable you do not have yet — arrived as an EMPTY STRING, sailed through,
  and the UI took its "we have a value" branch with nothing in it. Live
  result: an empty href in the footer, an empty href on contact, and a
  Privacy & Grievance Officer block with blank name and blank address. The
  precise failure the mechanism existed to prevent, defeated by its own
  fallback operator — with build, types and 80 Playwright assertions all
  green, every one of them exercising the path where values were present.
  New degraded_paths.md: absence is a SEMANTIC condition, not a value
  (omitted / declared-but-empty / null / "" / whitespace-only, with
  legitimate 0 and false protected from being read as absent); ONE absence
  semantic defined at Phase 2 and used by every consumer; triggering with the
  PRODUCER'S real shape; assertions on the OBSERVABLE symptom rather than the
  internal helper; and an append-only DP-xxx catalogue (DP-001 nullish-misses-
  empty, DP-002 one-directional validation — the /winit token asymmetry
  recorded as UniqBotz M-13, DP-003 fallback depends on the missing thing).
  Gate rule: untested degraded path = FAIL for that mechanism, however green
  the happy-path suite.
  Wired: qa_workflow.md (7th generation source SAFETY MECHANISMS + a
  completion criterion), qa_evidence_gate.md (new section 1c),
  interrogation_checklist.md (new Q-DEGRADED-PATH), website_flow.md (Phase 2
  defines absence semantics once; the "unknown stays unknown" standing
  instruction now states that it is a mechanism and mechanisms are tested),
  templates/test_register_TEMPLATE.md (DP area + SAFETY source + two seeded
  DP cases), skills_map.md, and framework_update.md step 3, which now
  requires GENERALISING an incident (incident -> principle -> general rule ->
  gate -> evidence) rather than transcribing its specifics.
  Prevents: a safety mechanism that is only ever exercised on the happy path
  being mistaken for a working one.

- 2026-08-26: LOGO CONTRAST. Root cause: theme_system.md's what-does-not-
  auto-update list said of an SVG logo "use `currentColor` or per-theme
  variables" — which IS recolouring the mark. The framework identified the
  symptom correctly (a logo with fill="#111" disappears on dark) and
  prescribed the one fix that destroys brand integrity, naming "logo"
  explicitly so it could not be read as icon-only guidance. Second finding:
  the framework had NO logo governance at all — a grep returned only
  incidental hits ("logo-wall", "logo bottom-left safe zone").
  Fix: the SVG line is split. ICONS keep currentColor (functional glyphs
  carry no brand identity, so recolouring is correct); LOGOS/WORDMARKS get
  the opposite rule — never recolour, fix the background instead.
  New theme_system.md §LOGO CONTRAST, decision order cheapest-first and
  measured rather than assumed: (1) bare surface if every logo colour already
  clears >=3:1; (2) a CONTRAST PLATE — solid light container applied only in
  the theme that needs it, padded to the brand's minimum clear space so it
  reads as a lockup, not a patch; (3) an OFFICIAL reversed/mono variant if
  the brand publishes one (an approved asset, not recolouring); (4) otherwise
  STOP and escalate — never improvise a colour for a brand mark.
  REJECTED: filter invert/brightness/hue-rotate, fill overrides, currentColor
  on a logo, mix-blend-mode hue shifts. On a multi-colour mark invert() is
  especially wrong — it yields colours the brand never authorised, differently
  per hue.
  Recorded honestly: WCAG does NOT require logo contrast (1.4.3 exempts
  logotypes; 1.4.11 exempts parts of a logo or brand name), so an invisible
  logo can pass an accessibility audit cleanly. This framework requires it
  anyway, and the file says so explicitly so nobody later "corrects" the rule
  by citing WCAG at it.
  Measurement: every distinct colour in the mark against its actual backdrop,
  in every active theme — the WORST pair governs, not the average. Extends to
  favicon, meta theme-color, the OG image and email headers.
  Wired: site_profile_TEMPLATE.md ({LOGO_COLORS}, {LOGO_PLATE_DARK/LIGHT},
  {LOGO_CLEARSPACE}, {LOGO_REVERSED_VARIANT} + a measured-table row),
  qa_evidence_gate.md §4b (the explicit before-complete validation step —
  measured table + a screenshot per theme + confirmation the mark is
  unmodified), interrogation_checklist.md (a LOGO clause on Q-STATE-CONTRAST
  rather than a new question), theme_system.md's validation matrix (step 7),
  and skills_map.md — which also now records UniqBotz M-08 as an OPEN GAP:
  logo/wordmark DESIGN still has no governing skill. This file governs how an
  existing mark is DISPLAYED; designing one hits §Fallback step 3.
  Prevents: a logo recoloured to survive a theme switch, and an invisible
  logo passing because WCAG never asked about it.

- 2026-08-26: COLOUR SYSTEM. Root cause, four layers: (1) NO canonical config
  artifact in code — site_profile.md is a markdown table an app cannot
  import, while website_flow.md's REPO MAP named four possible homes
  ("lib/brand.ts, lib/config/promo.ts, tailwind.config.ts, app/globals.css")
  without saying which was canonical or that they must agree; the hand-copy
  from doc to code was entirely ungoverned. (2) NOTHING forbade raw hex in a
  component — Q4 said "colors from the brand palette only" with no mechanism,
  and a grep of every checklist found zero mentions of hex or hardcoding.
  (3) The token set was too SMALL to build a UI from — eleven tokens, no
  ramps, no semantic states, no hover/active/disabled — so a developer
  needing a hover shade had no token and hardcoded one; the incompleteness
  CAUSED the hardcoding that (2) could not catch. (4) Derivation existed only
  as an unapplied library option (ALT-008a) that said "Claude derives…" with
  no algorithm.
  New color_system.md + tools/generate_palette.py: ONE {BRAND_SEED} drives
  three layers — L1 primitive ramps (brand, brand-tinted neutrals, and
  success/warning/error/info) derived by stepping OKLCH lightness at fixed
  hue with chroma tapered at both ends; L2 semantic tokens per theme
  (bg-0/1/2, fg-0/1, border, divider, accent-1 + hover/active/disabled/on/
  text, accent-2 + text, focus-ring, shadow, and each semantic state with its
  -bg and -on); L3 component aliases optional. THE PROPAGATION RULE:
  components consume L2 ONLY — never an L1 primitive, never a raw hex. That
  one rule is what makes a seed change propagate.
  Contrast is measured and auto-corrected, not asserted. {ACCENT_1_ON} — the
  label on the primary button — is computed, and comes out white on some
  fills and near-black on others; that is the UniqBotz M-02 defect (a 2.98:1
  white-on-orange CTA in an approved plan) solved by arithmetic.
  Found by testing the generator's own degraded path per degraded_paths.md:
  the FAIL branch is effectively UNREACHABLE, because correction almost
  always finds some passing step — which would have made a green report
  meaningless. So the tool now flags DRIFT instead: a token dragged more than
  2 ramp steps no longer reads as the seed shade, and that becomes an owner
  decision rather than a silent shift.
  VERIFIED end-to-end: seed #4C1D95 (dark purple), mode DUAL → 32 contrast
  pairs, 0 FAIL, 0 DRIFTED, 2 one-step border corrections, exit 0. A hostile
  near-white seed also returns 0 FAIL; bad input exits 1 with a clear error.
  Wired: site_profile_TEMPLATE.md ({BRAND_SEED} added; the colour table is now
  a RECORD of generator output rather than hand-filled), website_flow.md (the
  REPO MAP now names ONE canonical generated token file and forbids other
  config from defining colour values; Phase 2 runs the generator; Phase 4
  forbids raw colour), interrogation_checklist.md (Q4 NO RAW COLOUR, answered
  by grep not eyeball), qa_evidence_gate.md (the generator report IS the
  contrast artifact and exits non-zero on FAIL), theme_system.md (states that
  it validates values it does not author), design_library.md (ALT-008a marked
  SUPERSEDED per rule 7, never deleted), skills_map.md.
  Prevents: a brand colour with four plausible homes and none canonical; a
  hardcoded hex surviving neither a seed change nor a theme switch; and a
  "derive the palette" rule with no tool, which is the class of rule this
  framework has already learned gets skipped.
