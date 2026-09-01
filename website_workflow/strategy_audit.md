# STRATEGY AUDIT — Phase S (runs BEFORE Phase 1 for strategic changes)
<!-- Save as: /website_workflow/strategy_audit.md -->
<!-- Triggered when a request touches: positioning/messaging, hero section,
     pricing presentation, a new page/section, CTAs, lead magnets, or any
     change where the QUESTION is "what should this say/show" rather than
     "how do we build what we already decided". Copy-only typo fixes and
     bug fixes SKIP this phase. /brainstorm runs a lightweight version of
     this file automatically (see §7). -->

PRIME RULE: no strategic decision may be made from memory or taste alone.
Every step below that says RESEARCH requires actual WebSearch/WebFetch
evidence captured in the output. "I believe" is not evidence; a URL + quoted
finding is.

## S1 — POSITIONING VERIFICATION
Goal: verify the page's core claim is the RIGHT claim, not just a fine one.
1. State the current positioning in one sentence (e.g. "Manage Your Academy
   without Spreadsheets and Stress" = escape-the-spreadsheet positioning).
2. Skills: academy-owner-psychology-expert (what the ICP actually fears/wants),
   jobs-to-be-done-expert (the job being hired for), market-research-specialist.
3. RESEARCH: current positioning of 3–5 direct competitors (see S2) + 2–3
   world-class SaaS landing pages in adjacent categories. What claim does
   each own? Which claims are crowded, which are open?
4. Generate 2–4 alternative positionings (different angle: outcome, enemy,
   identity, speed, trust). Current positioning is always Option A.
5. Score all options with decision_matrix.md. Winner declared with scores.

## S2 — COMPETITOR TEARDOWN & CREATIVE SYNTHESIS
1. DISCOVER, don't assume (owner rule: no fixed competitor list): WebSearch
   for the CURRENT top India-market academy/coaching/class-management
   platforms and top global references, then WebFetch 5 — minimum 3
   India-relevant + minimum 2 world-class craft references (category
   leaders like Jackrabbit/Sawyer, or best-in-class SaaS heroes like
   Linear/Stripe for craft, regardless of category).
2. For each: capture hero headline, subhead, CTA(s), proof elements, media
   type (photo/video/animation/product shot), and one thing they do BETTER
   than us, one thing they do WORSE.
3. SYNTHESIS rule (competitive-research-specialist): never copy. Extract the
   underlying principle behind what works, then express it in {SITE_NAME}'s
   voice for OUR ICP ({ICP}). Output: a "steal the
   principle, not the pixels" table → feeds the options in S1/S4.
4. If the owner names ONE additional reference mid-flow beyond the 5
   discovered above (e.g. "also check how X does pricing") → run
   website_workflow/reference_site_analysis.md for that reference instead of
   an ad hoc lookup; same synthesis standard, output lands in
   design_library.md as REF/ALT entries per its STEP 4.

## S3 — APP-REALITY SYNC
Source of truth: website_workflow/app_reality.md (owner-maintained).
1. List every claim the proposed page/section makes (features, numbers,
   outcomes, "10 minutes", "100+ academies", automations).
2. Check each against app_reality.md: SUPPORTED / FALSE / EXAGGERATED /
   UNVERIFIED / NOT IN APP.
3. Severity handling (only the failing CLAIM is blocked, never the whole
   change — a design improvement must not wait on unrelated claim fixes):
   - FALSE (contradicts owner-confirmed ground truth, e.g. "100+ academies"
     with 2 real customers) → P0: the claim must be removed/replaced in the
     same request, using the "Early-stage honesty rule" substitutes in
     app_reality.md. Fabricated social-proof popups are removed, not tuned.
   - EXAGGERATED / NOT IN APP → rewrite to truth or drop.
   - UNVERIFIED → the claim may stay AS-IS temporarily but may not be
     amplified/expanded; log it in the report's "owner to verify" list.
4. Early-stage honesty rule applies while customer count < 25 (see
   app_reality.md): no invented counters, popups, testimonials, or scale
   implications. Truthful founding-academy framing is the approved pattern.
5. If app_reality.md is stale (>60 days old header date) → ask owner to
   refresh it before passing this step.

## S4 — MEDIA-FORMAT DECISION (image vs product shot vs brand character vs video vs cinemagraph vs animation vs chart)
0. INVENTORY FIRST: list every media slot from (a) the request file's
   CONTENT INPUTS, (b) any source plan/spec document the request cites —
   read in full, checking specifically for a dedicated asset/prompt section
   — and (c) the section-by-section page plan being built. A slot present
   in the source material but missing from this inventory is not "not
   needed" by default; it needs an explicit BUILD / DEFER / CUT decision
   with a reason, logged like any other.
For EVERY media slot in the change, decide the format by framework, not habit:
1. State the slot's single job (proof? emotion? orientation? explanation?).
2. Candidate formats and when each wins:
   - Static image: instant load, one emotion/proof moment. Default for LCP-
     critical hero slots.
   - Product screenshot/UI shot: proof the app is real; must be current UI.
   - Short video/demo: explaining a flow; NEVER autoplay with sound; weight
     & LCP cost must be scored.
   - Cinemagraph/subtle motion: emotion + polish at near-image cost. Wins
     only when the slot's job is emotion/atmosphere a still cannot carry.
     Governed by image_prompts.md §CINEMAGRAPH GATE (four-job test, ONE
     moving element, MP4/WebM never GIF, mandatory static fallback); source
     still is generated in Qwen per template 9. The gif-and-cinemagraph-brief
     skill is NOT installed — that gate is the procedure.
   - Animation/kinetic type: abstract concepts, numbers in motion
     (animation-style-selector skill decides the style).
   - Chart/data visual: quantified claims (data-visualization-academy,
     dataviz skills).
   - Brand character / mascot illustration: IDENTITY and warmth in a
     category where every competitor ships the same dashboard screenshot
     (category evidence: Workfast.ai's meditating-monk figure, Jackrabbit
     Class's rabbit). Wins only when the slot's job is recognition,
     reassurance or explanation-by-guide — never when the job is PROOF.
     Hard conditions: passes the §MASCOT quality bar in image_prompts.md
     (silhouette test, one locked design, ≤3 shipped emotions, legible at
     48px, SVG/Lottie preferred); never occupies the same viewport as the
     product-proof visual; never depicts a customer or implies scale
     (app_reality.md still governs); motion only via
     web-motion-implementation-director with prefers-reduced-motion respected.
     GATE BEFORE SCORING: run brand-character-mascot-designer §7 first and
     record GO / CONDITIONAL / NO-GO with its 7-factor score. NO-GO removes
     the format from the matrix entirely — do not score a rejected option to
     make the table look thorough. CONDITIONAL enters the matrix carrying its
     named deployment limits (e.g. "onboarding + nav only, never pricing or
     proof viewports"), and those limits bind Phase 1 and Phase 5.
     Skills: brand-character-mascot-designer (OWNS the decision and the lock),
     shape-psychology-expert, color-psychology-expert,
     heritage-visual-language-india (India-facing), character-consistency-checker,
     image-generation (renders a locked character only),
     web-illustration-asset-production-pipeline (production).
     uniqbrio-character-bible is NOT part of this chain.
3. RESEARCH: at least one current best-practice reference for the chosen
   format in a hero/section context (Core Web Vitals impact included). If
   the brand-character option is scored, the research must include at least
   one B2B SaaS site where a character is load-bearing AND one where the
   category leader deliberately uses none — mascot-vs-no-mascot is itself a
   scored decision, never an aesthetic preference.
4. Score the top 2–3 candidate formats with decision_matrix.md — performance
   cost (Q8 budgets) is a weighted criterion, not an afterthought.

## S5 — CONVERSION ARCHITECTURE
1. CTA count & hierarchy: one primary action per screen. Two buttons are
   allowed ONLY if they serve different readiness stages (e.g. "Start Free"
   = high intent, "Get A Demo" = needs reassurance) AND are visually ranked
   (primary vs secondary). Three+ equal-weight CTAs = FAIL
   (conversion-ux-specialist, cognitive-load-reduction-expert).
2. Lead capture ladder: does the site offer a low-commitment step for
   not-ready visitors (free tool, checklist, calculator, blog subscribe)
   before demo/signup? Skills: lead-magnet-asset-builder,
   free-landing-page-campaign-content. If missing and relevant to the
   request, propose ONE ladder rung as a follow-up request file — do not
   scope-creep the current change.
3. Trust path: proof elements ordered to answer "Is it real? → Is it for
   me? → Will it work for me?" (customer-trust-expert).

## S6 — VERDICT
Output one STRATEGY VERDICT block:
- Decision(s) made, each with its decision_matrix.md score table.
- Research evidence list (URLs + one-line findings).
- App-reality check result.
- Claims/copy that must change.
- What would change our mind (falsifier).
GATE S (owner): approve verdict before Phase 1 interrogation begins.

## S7 — LIGHTWEIGHT MODE (used inside /brainstorm)
/brainstorm runs S1–S5 proportionally to the question: minimum 3 web
lookups, competitor check only if the question is positioning/section-level,
and ALWAYS the decision matrix on the final 2–4 options. The full Phase S
still runs at pipeline time if the resulting request is strategic.
