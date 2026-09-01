---
name: scroll-engagement-pacing-designer
description: Engineers section rhythm, information density, and scroll-depth pacing across long-form marketing pages (landing, pricing, product, feature, comparison, enterprise, and solution pages) so visitors experience continuous momentum, sustained attention, and progressive trust-building that carries them to the primary CTA instead of abandoning mid-page.
when_to_use: Activate whenever a user says a page feels too long, dense, or overwhelming; asks to improve scroll depth, section rhythm, or reduce scroll fatigue; wants to redesign a long-form landing/pricing/product/comparison/enterprise page; or whenever Claude is building or auditing any long-form conversion-focused marketing page.
---

# Scroll Engagement Pacing Designer

## Purpose

Long pages fail not because they are long, but because they are exhausting. This skill engineers the psychological rhythm of long-form marketing pages — pacing, density, visual breaks, and narrative sequencing — so that every scroll delivers enough perceived value to justify the next one, carrying visitors continuously toward the primary conversion goal (demo booking, trial signup, paid subscription).

Applies to: landing pages, pricing pages, product pages, feature pages, comparison pages, enterprise pages, solution pages, industry pages, long-form sales pages, and general SaaS marketing sites.

This skill redesigns **cadence, density, and flow** — it does not own CTA copywriting, typographic scale, or funnel analytics (see Section 19, Collaboration).

## Core Philosophy

- **Momentum over completeness.** A page that feels shorter than it is outperforms a page that says everything upfront.
- **Rhythm is retention.** The brain habituates to repetition; deliberate variation in density and visuals renews attention.
- **Every section must earn the next scroll.** If a section doesn't advance curiosity, trust, or clarity, cut or compress it.
- **Value-to-effort ratio must trend upward.** Visitors subconsciously track `Value Gained / Effort Required`; pacing decisions exist to keep this ratio rising.
- **Mobile is the primary canvas**, not an afterthought — pacing must be designed mobile-first, then adapted upward.

---

## 1. Scroll Psychology

Users stop scrolling when perceived effort exceeds perceived value. Page structure directly drives each failure mode below:

| Mechanism | What happens | Structural trigger | Structural fix |
|---|---|---|---|
| **Cognitive fatigue** | Working memory exhausted by continuous dense information | Long unbroken text blocks, back-to-back feature lists | Chunk into scannable units; alternate with low-density recovery |
| **Decision fatigue** | Every section forces evaluation ("is this relevant to me?") | Too many competing claims, options, or CTAs per screen | Reduce simultaneous choices; sequence one decision at a time |
| **Attention decay** | Focus naturally declines with depth, and faster once the page becomes predictable | Repeated layouts, uniform visual rhythm | Introduce visual novelty every 2–4 sections |
| **Motivation decay** | Visitor stops believing "the next section is worth it" | Reward-free stretches; no proof or payoff for several screens | Deliver progressive reward (stat, quote, visual) every 400–900px |
| **Curiosity collapse** | Page answers everything immediately, leaving nothing to pull the visitor forward | Fully resolved headlines, no open loops | Use curiosity loops — tease the next section's payoff before revealing it |
| **Expectation mismatch** | Visitor expected increasing relevance/confidence; page interrupts with unrelated content | Sudden topic shifts, generic stock sections | Maintain narrative continuity; every section must escalate the prior one |
| **Perceived effort vs. value** | Subconscious cost-benefit calculation turns negative | Dense sections with no visual anchor | Pair every high-effort section with a low-effort visual reward |

**Micro-accomplishments:** visitors need recurring "I understand / I'm making progress" moments — progress indicators, section recaps, and answered-question payoffs sustain scroll motivation the same way small wins sustain habit loops.

**Visual novelty:** the brain is wired to notice change. Rotate layout direction, background treatment, media type (illustration → screenshot → quote → diagram), and color temperature at regular intervals to prevent habituation.

---

## 2. Page Rhythm Framework

### The Engagement Model

Curiosity → Interest → Understanding → Trust → Confidence → Commitment → Conversion

Each section should move the visitor exactly one stage forward — never stall, never skip a stage.

### Rhythm Cycle (default pattern for most long-form SaaS pages)

High-impact open (Hero, emotional + dense)
→ Light relief (visual, problem validation)
→ Medium build (solution overview + visuals)
→ High-density peak (features/benefits + proof)
→ Light recovery (testimonial, whitespace)
→ Medium comparison (differentiation + social proof)
→ High-density close (pricing/security)
→ Light, high-visibility close (final CTA)

### Cadence Rule

Never chain more than **three consecutive high/medium-dense sections** without a low-density recovery beat. Preferred alternation:

Dense → Light → Medium → Visual → Medium → Dense → Recovery

### Alternation Table

| Heavy element | Pair with |
|---|---|
| Feature list | Product screenshot |
| Paragraph of copy | Illustration or icon grid |
| Diagram / architecture visual | Whitespace |
| Metrics block | Customer quote |
| Benefits copy | Short animation or GIF |
| Pricing table | Testimonial or FAQ teaser |

**Why rhythm matters:** predictable variation prevents habituation while preserving narrative coherence — visitors feel guided, not battered. A visual or density shift every 500–900px of scroll height is the practical target on desktop (30–40% shorter on mobile).

---

## 3. Section Length & Density Guidelines

| Section | Density | Desktop height | Mobile height | Notes |
|---|---|---|---|---|
| Hero | Low–Medium | 80–110vh | 70–90vh | Promise + hook; minimal text, strong visual |
| Problem | Medium | 50–90vh (1.5–2 screens) | Shorter cards, stacked | Empathy + validation, not exhaustive |
| Solution overview | Medium | 60–90vh | Stacked, single column | Visual summary before detail |
| Features | Medium–High | 80–140vh (2–4 screens) | Card/accordion groups | Never exceed 3 dense screens unbroken |
| Benefits | Medium | 60–100vh | Condensed bullets | Outcome-framed, not spec-framed |
| Social proof / logos | Low | 40–70vh | Horizontal scroll ok | Recovery section |
| Testimonials | Low | 50–90vh | Single column, 2–3 max visible | Distribute across page, don't cluster |
| Pricing | Medium–High | 80–140vh | Stacked cards, sticky mobile CTA | Segment visually, don't wall-of-numbers |
| Comparison | Medium–High | 70–110vh | Collapsed by default | Highlight differentiators only |
| Security / trust | Low | 50–80vh | Compact | Reassurance, not documentation |
| Implementation | Medium | 60–100vh | Condensed steps | Visual timeline preferred |
| Integrations | Medium | 60–90vh | Logo grid | Low reading effort |
| FAQ | Medium (collapsible) | Variable | Accordion, default-collapsed | Cap visible items at 5–7 |
| CTA (final) | Low, high visual weight | 50–80vh | Prominent, thumb-reachable | Highest visual priority on page |
| Footer | Low | Minimal | Compact | Navigation + legal only |

**General rule:** no section exceeds ~4–5 screen heights on desktop without a major visual break; reduce all figures by roughly 30–40% for mobile.

---

## 4. Information Density Framework

| Density | Characteristics | Use for | Text:visual ratio |
|---|---|---|---|
| **Low** | Large imagery, generous whitespace, 1–2 sentence blocks | Hero, testimonials, logo walls, final CTA, recovery beats | ~20:80 |
| **Medium** | Balanced text + visuals, scannable bullets, 3–5 sentence blocks | Problem, solution, benefits, implementation, FAQ | ~50:50 |
| **High** | Dense bullets, tables, specs, comparisons | Features, pricing, comparison, technical detail | ~80:20 |

**Density evolution across scroll** (recommended default arc):

Hero: Low–Medium (hook)
↓
Problem/Solution: Medium (context)
↓
Features: High (buffered by recovery before/after)
↓
Social proof: Low (trust reset)
↓
Pricing/Comparison: High (decision detail)
↓
FAQ: Medium (objection handling)
↓
Final CTA: Low, high visual weight (decision moment)

Never cluster two high-density sections back-to-back without a low-density buffer between them.

---

## 5. Progressive Disclosure

Reveal complexity in layers, not all at once:

1. **Level 1 — Promise**: one-line outcome statement.
2. **Level 2 — Key benefit**: what changes for the user.
3. **Level 3 — Supporting explanation**: how it works, briefly.
4. **Level 4 — Feature detail**: specifics, behind a toggle/tab/expand.
5. **Level 5 — Technical documentation**: linked out, not inline.

**Mechanisms:** accordions, tabs, expandable "Learn more" panels, tooltips, hover-reveal detail, layered diagrams, secondary pages for deep technical content.

**Curiosity generation:** end a section with an open question or teaser ("But how does it handle 10 branches?") that the next section resolves — this is the single strongest lever for sustaining scroll momentum across a density transition.

**Sequencing rule:** order = outcome → mechanism → technical detail → proof. Never lead with mechanism.

---

## 6. Visual Break Strategy

Recovery elements to rotate through: illustrations, product screenshots, device mockups, background/color-temperature shifts, cards, pull-quotes, short animations, icon grids, statistic call-outs, timelines, comparison tables (used sparingly), customer logo walls, and deliberate empty space.

**Spacing rules:**
- Insert a visual break at least every 500–900px of scroll on desktop; every 350–600px on mobile.
- Never exceed 3 consecutive dense sections without a visual break.
- Minimum padding around a break: 40–60px mobile, 80–120px desktop.
- A visual break should not merely decorate — it should either reduce cognitive load (whitespace), reinforce trust (quote, logo), or demonstrate the product (screenshot, mockup).

---

## 7. Pattern Interrupt System

Deploy interrupts at predictable attention-drop points (typically ~30%, ~55%, and ~75% scroll depth), and roughly every 20–35% of total page length:

| Interrupt type | Example | Why it restores attention |
|---|---|---|
| Bold/unexpected statement | "92% of academy owners waste hours on manual fee tracking." | Violates prediction; triggers re-orientation |
| Mini headline | "Here's the surprising part." | Resets expectation, signals new value incoming |
| Metric reveal (animated) | Counter or stat card | Concrete, low-effort proof |
| Testimonial callout | Short quote mid-flow | Emotional/social reset |
| Success story / customer win | 2–3 line case vignette | Aspirational momentum |
| Interactive block | ROI calculator, savings estimator | Active engagement resets passive fatigue |
| Comparison moment | Quick before/after | Contrast sharpens clarity |
| Unexpected visual/layout shift | Full-bleed image, layout inversion | Novelty resets habituation |

---

## 8. Re-engagement Hooks

| Hook | Placement rule |
|---|---|
| Mid-page CTA / secondary CTA | After a major value cluster (features, benefits) |
| Micro CTA | Low-commitment action (poll, "learn more") between dense sections |
| Social proof injection | Before pricing, after feature explanation |
| Trust reset | Immediately before sensitive decisions (pricing, signup) |
| Benefit recap / value summary | Before final CTA, before pricing |
| Customer quote / mini case study | After social proof, before pricing |
| Product highlight | When visitor may be evaluating alternatives |
| Momentum headline | Roughly at 50% scroll depth ("Still with us? Here's what changes next.") |
| Progress indicator | Mid-page, to reduce perceived remaining effort |
| Section transition copy | Every section boundary — never let sections just "stop and start" |

**Placement discipline:** no more than one prominent CTA per 2–3 screens; contextual relevance outweighs frequency.

---

## 9. Scroll-Depth Benchmarks

| Page type | Healthy average scroll depth | Warning threshold |
|---|---|---|
| Landing page | 65–85% | <40–45% |
| Pricing page | 70–90% | <50% |
| Feature / product page | 55–75% | <40% |
| Comparison page | 60–80% | <45% |
| Enterprise / solution page | 55–70% | <40% |

**Interpretation:**
- A steep drop within the first 15–25% signals hero/opening failure — fix first, since early losses compound downstream.
- A drop concentrated around 45–55% usually signals density overload or a missing recovery beat.
- A drop just before pricing indicates insufficient trust-building beforehand.
- Healthy pages show gradual, evenly distributed decline with small recoveries after each visual break — not cliff-edge drop-offs.

**Optimization priority order:** (1) Hero, (2) first 25% of page, (3) mid-page density peaks, (4) pricing section, (5) final CTA.

---

## 10. Mobile Scroll Fatigue

- **Thumb ergonomics:** place primary actions within natural thumb reach (lower half of screen); minimum 44–48px tap targets.
- **Tap fatigue:** minimize taps needed to reach information; auto-expand the most important content, collapse the rest.
- **Vertical pacing:** shorten every section by ~30–40% versus desktop; stack rather than place side-by-side.
- **Collapsible content:** accordions for FAQ, technical detail, and comparison tables.
- **Sticky / floating CTA:** persistent but unobtrusive; must not obscure content or trap scroll.
- **Card layouts:** replace long lists with card grids for scannability.
- **Typography & spacing:** minimum 16px body text, 1.2–1.6 line height, generous padding (20–30px), max 3–4 lines per paragraph.
- **Reduced cognitive load:** bullets over prose, one idea per card, progressive disclosure by default rather than exception.

---

## 11. CTA Placement Cadence

| CTA type | Placement |
|---|---|
| Early / soft CTA | Hero or immediately after (low commitment: "Watch demo") |
| Mid CTA | After a major value cluster (~40–60% of content) |
| Late / primary CTA | Final section (80–100%), highest visual priority |
| Repeated CTA | Every 20–30% of content, subtle, non-intrusive |
| Contextual CTA | Directly tied to the claim just made ("See how this works →") |
| Sticky CTA | Persistent, mobile-priority, non-obstructive |
| Exit CTA | Placed at the likely abandonment zone (~70–85% scroll) |
| Secondary CTA | Paired with primary for a different intent (e.g., "Contact sales" beside "Start free trial") |

**Spacing guidance:** minimum 2–3 sections (or ~300–500px desktop / ~200–300px mobile) between prominent CTAs. Never leave more than ~1,000px without any link, button, or interactive element ("CTA desert").

---

## 12. Narrative Architecture

Design the page as a story, not a document:

Problem → Stakes → Possibility → Solution → Evidence → Proof → Confidence → Decision → Action

- **Problem:** establish the visitor's real pain, specifically and empathetically.
- **Stakes:** what happens if it stays unsolved.
- **Possibility:** paint the transformed state.
- **Solution:** introduce the product as the bridge.
- **Evidence:** features/benefits that support the claim.
- **Proof:** testimonials, case studies, metrics.
- **Confidence:** security, integrations, implementation ease.
- **Decision:** pricing, comparison — framed as a choice, not a wall of options.
- **Action:** the final CTA, with urgency and minimal friction.

Every transition should read as an emotional beat progression: frustration → hope → confidence → urgency — never an abrupt topic jump.

---

## 13. Momentum Mapping

| Page zone | Typical visitor state | Risk | Intervention |
|---|---|---|---|
| Hero | Curious | — | Sustain with strong promise |
| Problem | Emotional | Attention dip if too long | Keep tight, empathetic |
| Solution | Interested | Curiosity collapse if over-explained | Tease, don't over-resolve |
| Features | Evaluating | Highest fatigue risk | Buffer with recovery beats |
| Proof | Trusting | Skepticism if proof is generic | Use specific, quantified proof |
| Pricing | Comparing | Friction/anxiety spike | Simplify, reassure, segment |
| FAQ | Seeking reassurance | Drop-off if FAQ is exhaustive | Cap visible items, collapse rest |
| CTA | Ready | Loss if CTA is weak/hidden | Maximize visual priority, reduce friction |

Map your specific page against this table to locate where attention naturally drops, where curiosity should be re-ignited, and where CTA readiness peaks — then place recovery beats and hooks accordingly.

---

## 14. Long-Page Audit Framework

**Step 1 — Diagnose:** collect scroll depth, exit rate by depth, CTA visibility/click data, and session recordings if available.

**Step 2 — Identify symptoms:** e.g., abandoned pricing, skipped proof section, ignored CTA, high exit at a specific %.

**Step 3 — Root cause:** map symptom → cause (excessive density, poor rhythm, repetition, weak transition, missing hook).

**Step 4 — Score and prioritize:**

Priority Score = Severity (1–5) × Impact (1–5) × Confidence (1–5)

**Step 5 — Recommend fixes**, ordered highest score first, each tagged with expected impact (e.g., "reduces feature-section drop-off, estimated +8–12pp scroll depth").

| Symptom | Likely root cause | Fix |
|---|---|---|
| Drop before 25% | Weak hero / unclear promise | Sharpen headline, add visual hook |
| Drop 25–50% | Feature/benefit overload | Add recovery beat, condense copy |
| Drop 50–75% | Density peak with no relief | Insert visual break, split section |
| Drop before pricing | Insufficient trust built | Add proof/testimonial immediately prior |
| Low CTA CTR | Poor visibility or placement | Increase visual weight, add contextual CTA |

---

## 15. Anti-Patterns & Fixes

| Anti-pattern | Fix |
|---|---|
| Wall of text | Break into bullets, cards, and visuals every 150–200 words |
| Feature dumping | Reframe around outcomes, not specs |
| Large empty deserts (purposeless whitespace) | Replace with a recovery element that adds value |
| Repeated layouts | Vary layout direction, media type, background every 2–3 sections |
| CTA deserts (>1,000px with no action) | Insert contextual or micro CTA |
| Testimonial clustering | Distribute across the page instead of grouping |
| Visual monotony | Alternate illustration/screenshot/quote/diagram |
| Long uninterrupted sections (>2 viewport heights) | Split with a visual break or sub-headline |
| Poor transitions | Add explicit bridging copy between sections |
| Too many cards | Group, prioritize, or collapse into tiers |
| Dense pricing | Segment tiers, highlight recommended plan, simplify comparison |
| Endless FAQ | Cap visible items (5–7), collapse the rest |
| Repetitive screenshots | Mix in diagrams, animations, illustrations |

---

## 16. Deliverables

When invoked, this skill should be able to produce:

- Pacing audit (scroll depth, density, and rhythm diagnosis)
- Scroll rhythm / cadence analysis
- Engagement report with prioritized findings
- Redesigned page outline (section order + density targets)
- CTA cadence map
- Visual rhythm recommendations
- Density heatmap (Low/Medium/High by section)
- Attention recovery plan (where to insert breaks/hooks)
- Scroll optimization checklist
- Implementation roadmap (phased, with owners/priority)

---

## 17. Review Checklists

**Design:** consistent rhythm · balanced density · adequate whitespace · clear visual hierarchy · recovery moments present · CTA visually prominent.

**UX:** logical section sequence · progressive disclosure applied · low cognitive load per section · intuitive transitions.

**CRO:** CTA cadence matches momentum map · proof placed before decision points · objections pre-handled · narrative builds continuously.

**Mobile:** thumb-reachable CTAs · sticky CTA non-obstructive · collapsible dense content · shortened section heights.

**Accessibility:** semantic heading structure · color contrast (4.5:1 text, 3:1 UI) · keyboard navigation · alt text · reduced-motion support · screen reader compatibility.

**Performance:** lazy-loaded media · compressed images · minimal layout shift · efficient/optional animations.

**Launch:** analytics + heatmaps configured · CTA click events verified · responsive QA complete · Core Web Vitals targets met.

---

## 18. Metrics & Interpretation

| Metric | Signals | Good | Warning |
|---|---|---|---|
| Scroll depth | Overall pacing health | Rising, >65–70% avg | <40–45% |
| Engagement rate / avg. engagement time | Narrative effectiveness | Stable or rising with depth | Falling sharply mid-page |
| Bounce rate | Hero effectiveness | Low | High immediate exit |
| CTA visibility | Whether CTAs were ever seen | >80% | <60% |
| CTA click rate | Cadence + copy effectiveness | Improving after pacing changes | Static/declining |
| Exit rate by depth | Localizes abandonment | Evenly distributed, gradual | Sharp mid-page spikes |
| Heatmaps / session recordings | Qualitative friction | — | Clusters of hesitation, dead zones |
| Rage clicks | Confusion/frustration | Rare | Repeated clustering on one element |
| Conversion rate | Ultimate success metric | Improves after rhythm changes | Flat despite traffic |

---

## 19. Collaboration & Boundaries

This skill owns **pacing, rhythm, density, and engagement flow**. It does not own CTA copy, typographic system, or funnel/analytics strategy — those are handed off:

| Companion skill | Owns | Input from this skill | Output back |
|---|---|---|---|
| **cta-strategy-architect** | CTA messaging, copy, hierarchy | CTA cadence map, momentum readiness zones | Optimized CTA copy/placement decisions |
| **visual-hierarchy-expert** | Typography, spacing scale, emphasis | Density map, visual recovery plan | Refined visual hierarchy execution |
| **website-conversion-funnel-analyst** | Funnel bottlenecks, experiment strategy | Pacing audit, engagement report | Funnel optimization roadmap |
| **heatmap-session-recording-analyst** | Behavioral evidence, click patterns | Hypotheses about drop zones | Evidence-backed validation of pacing fixes |

**Handoff workflow:**
1. Diagnose pacing issues and produce density/rhythm map.
2. Recommend section sequencing and recovery beats.
3. Hand CTA-specific decisions to `cta-strategy-architect`.
4. Hand visual system execution to `visual-hierarchy-expert`.
5. Validate hypotheses with `heatmap-session-recording-analyst`.
6. Prioritize follow-on experiments with `website-conversion-funnel-analyst`.
7. Iterate based on real analytics.

---

## Implementation Guidance

**Reusable across any SaaS product** — this methodology does not hardcode business specifics. For **UniqBrio** specifically, prioritize:

- Academy-owner pain points (admin time, fee collection, parent communication, WhatsApp reliance) as emotional anchors in the narrative arc.
- Trust signals relevant to Indian SMB buyers: security/compliance reassurance, local success stories, transparent rupee-denominated pricing.
- Mobile-first pacing as the default design surface, not an adaptation — most academy-owner traffic is mobile.
- Component-based execution in Next.js/React (reusable `HeroBlock`, `VisualBreak`, `PatternInterruptCard`, `CTABlock` components) for scalable rhythm control across pages.
- Performance: lazy-load below-the-fold media, compress screenshots/mockups, and keep Core Web Vitals within budget — perceived pacing quality collapses if load time introduces its own fatigue.
- Accessibility (WCAG 2.1 AA) applied identically regardless of density tier — visual breaks and progressive disclosure must remain screen-reader and keyboard navigable.

## Quality Gates

A page passes this skill's review only if:

- [ ] Every section has a clear, single narrative purpose.
- [ ] No more than 3 consecutive high/medium-density sections without a recovery beat.
- [ ] A visual or density shift occurs at least every 500–900px (desktop) / 350–600px (mobile).
- [ ] CTA cadence has no "desert" longer than ~1,000px and no more than one primary CTA per 2–3 screens.
- [ ] Narrative follows Problem → Stakes → Possibility → Solution → Evidence → Proof → Confidence → Decision → Action.
- [ ] Mobile pacing is independently verified, not just scaled down from desktop.
- [ ] Accessibility and performance budgets are met.
- [ ] Recommendations are prioritized using Severity × Impact × Confidence scoring.

The end goal: a page that feels shorter than it is, rewards every scroll, steadily accumulates trust, and guides visitors to the CTA with minimal cognitive friction.
