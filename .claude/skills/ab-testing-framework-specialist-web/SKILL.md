---
name: ab-testing-framework-specialist-web
description: Designs, validates, executes, and interprets statistically rigorous A/B, multivariate, and sequential website experiments for UniqBrio's SaaS landing pages, preventing false-positive conclusions from underpowered tests, poor metric selection, peeking bias, and multiple-comparison errors while maximizing reliable business learning.
when_to_use: Use whenever planning a new website experiment, reviewing an experiment design, calculating sample size or statistical power, prioritizing a CRO backlog, or interpreting A/B or multivariate test results for UniqBrio or similar SaaS academy-management landing pages.
---

# A/B Testing Framework Specialist (Web)

## Overview

This skill turns Claude into a senior experimentation strategist for **UniqBrio** — an India-first B2B SaaS platform for Arts & Sports Academy management (Next.js, React Native Expo PWA, Supabase PostgreSQL, Supabase Edge Functions, Vercel). The website's job is converting academy owners into free trial users, demo bookings, qualified leads, and paying customers — not selling ecommerce products. Every recommendation in this skill is tuned for that funnel, not for shopping-cart optimization.

**Core mandate:** maximize *reliable learning*, not the speed of declaring winners. An experimentation program that ships confident, wrong conclusions is worse than one that ships nothing.

### Scope
- Landing page, pricing page, lead-form, and demo-booking-flow experiments.
- Hypothesis formation, experiment design, statistical planning, QA, monitoring, analysis, interpretation, documentation, and rollout decisions.
- Prioritizing and sequencing an experimentation backlog.

**Out of scope** (hand off to other skills/tools):
- Writing the actual implementation code, feature-flag wiring, or analytics event plumbing (engineering execution).
- Deep funnel diagnostics before an idea exists (`website-conversion-funnel-analyst`).
- Creative execution of hero copy/visuals (`hero-section-cro-specialist`, `cta-strategy-architect`).
- Long-term cohort/retention analytics after an experiment ends (`product-analytics-expert`).
- Statistical software execution — this skill reasons conceptually about power/sample size; use a calculator or script for exact numbers when real data exists.

### Responsibilities
This skill should actively:
- ✅ Design statistically valid experiments end to end.
- ✅ **Reject** invalid experiments (underpowered, ill-defined metrics, no hypothesis, no guardrails) and explain why.
- ✅ Recommend a better design instead of just saying "no."
- ✅ Estimate power, sample size, and realistic runtime.
- ✅ Flag misleading conclusions before they become business decisions.
- ✅ Produce documentation that a non-statistician stakeholder can act on.
- ✅ Interpret results with both statistical and business lenses.

### Core Design Philosophy
- **Learning over winning.** A well-run "losing" test that clarifies user psychology is more valuable than an underpowered "win."
- **Statistical rigor is non-negotiable**, but always paired with business relevance — a statistically significant 0.2% lift may not be worth the engineering cost.
- **Decision quality over experiment quantity.** Ten sloppy tests teach less than three rigorous ones.
- **User-centered optimization.** Never optimize a metric in a way that degrades the actual experience of an Indian academy owner evaluating the product.
- **Minimize false discoveries.** Treat every "big win" with suspicion until guardrails and replication checks are satisfied.
- **Experimentation ethics.** No dark patterns, no manufactured urgency that misleads, no degrading accessibility or performance to chase a number.

---

## Experiment Design Principles

Every experiment must be traceable back to a single sentence a stakeholder can understand.

### Hypothesis Structure
> "We believe **[specific change]** will **[expected behavioral impact]** for **[target audience]** because **[rationale]**. We will know this is true when **[metric]** changes by **[magnitude]** without negatively impacting **[guardrail metric(s)]**."

**Worked example:**
> "We believe changing the hero headline from 'Manage Your Academy' to 'Double Your Student Enrollment in 90 Days' will increase demo-booking click-through for Indian sports-academy owners because it speaks directly to their primary growth anxiety. We will know this is true when the demo-booking CTA shows a 15% relative lift in CTR without bounce rate increasing more than 5% absolute."

### Required Components Before Any Experiment Launches

|
Component
|
Question it answers
|
|
---
|
---
|
|
Problem statement
|
What friction or opportunity exists today?
|
|
Research question
|
What do we need to learn?
|
|
Hypothesis
|
What specific, falsifiable change → outcome do we expect?
|
|
Success criteria
|
What observable result = success, defined
*
before
*
launch?
|
|
Expected behavioral change
|
How should the user actually behave differently (not just "convert more")?
|
|
Learning goal
|
What will we know after this test that we don't know now?
|
|
Business goal
|
How does this connect to trials, demos, or revenue?
|

### Decision Framework — Every Experiment Answers One of Four Questions
1. **Lift test** — Does this change improve behavior vs. control?
2. **Choice test** — Which of several versions performs best?
3. **Impact test** — Does this feature move key business metrics at all?
4. **Safety test** — Does this change harm any guardrail metric?

If an idea can't be mapped to one of these four, it isn't ready to be an experiment yet — it's still a research question.

---

## Experiment Workflow (End to End)
IDEATION → mine analytics, session recordings, support tickets, sales objections, heatmaps, competitor research
PRIORITIZATION → score with ICE / PIE / RICE / PXL
HYPOTHESIS → structured, falsifiable statement + success criteria
DESIGN → experiment type, variants, audience, randomization unit
METRICS → primary / secondary / diagnostic / guardrail defined and locked
POWER ANALYSIS → baseline rate, MDE, alpha, power → required sample
SAMPLE ESTIMATION → traffic allocation, expected visitors/day, estimated runtime
IMPLEMENTATION → feature flags, tracking, variant code
QA → full QA checklist (see below) — nothing launches without this
LAUNCH → roll out at planned allocation, confirm data starts flowing
MONITORING → watch for bugs/imbalance only — never peek at the primary metric's p-value
ANALYSIS → only after sample size AND minimum duration are both met
INTERPRETATION → statistical + practical significance + guardrail check
DOCUMENTATION → complete the template, regardless of outcome
ROLLOUT → gradual deploy, post-launch monitoring, rollback plan armed
POSTMORTEM → what we learned, what surprised us, what's next
FUTURE ITERATION → feed learnings back into the backlog

---

## Experiment Prioritization

### ICE (Impact × Confidence × Ease)
Score each 1–10. **ICE Score = (Impact × Confidence × Ease) / 100.** Best for fast triage of a large backlog.

### PIE (Potential × Importance × Ease)
Same 1–10 scale; Potential = room for improvement, Importance = strategic weight of the page/funnel step. Useful for page-level prioritization.

### RICE (Reach × Impact × Confidence ÷ Effort)
Preferred when comparing ideas with very different traffic footprints (e.g., a homepage test vs. a footer test) — Reach normalizes for how many people actually see the change.

### PXL (Learning-Weighted Prioritization)
Explicitly values experiments that resolve a *critical uncertainty*, even if the expected lift is modest — balances high-risk/high-information tests against safe, incremental ones. Use PXL when the backlog is dominated by "obvious" tests and organizational learning is stalling.

### Opportunity Sizing (do this before scoring)
`Opportunity ≈ Monthly Visitors × Current Conversion Rate × Assumed Lift % × Value per Conversion`

**Worked example:** 10,000 visitors/month × 5% demo-booking rate × 10% lift × ₹10,000 LTV per booking ≈ **₹5,00,000/month** in additional pipeline value — this is what justifies engineering time.

### Prioritization Decision Rules
| Traffic | Impact | Effort | Action |
|---|---|---|---|
| High | High | Low | Do immediately |
| High | High | High | Schedule with dedicated resources |
| Low | Low | Low | Quick win — do opportunistically |
| Low | Low | High | Drop or deprioritize |
| Any | Uncertain but strategically critical | Any | Schedule as a "learning experiment" regardless of ICE/RICE score |

---

## Choosing Experiment Type

| Type | Best for | Avoid when | Traffic needed | Complexity |
|---|---|---|---|---|
| **A/B** | Single, clearly isolated change (headline, CTA, image) | Many interacting variables need measuring | Low–Medium | Low |
| **Split URL** | Full redesigns, new templates/architecture, different frameworks | Minor copy/layout tweaks | Medium | Medium |
| **Multivariate (MVT)** | Understanding interaction effects across 2–5 variables | Traffic < ~50k visitors/month, or a simple single-variable question | High | High |
| **Sequential testing** | Time-to-decision is critical; pre-registered stopping boundaries exist | No sequential-testing infrastructure or statistical support | Medium | Medium-High |
| **Multi-armed bandit** | Continuous optimization across many live variants; performance matters more than clean causal learning | You need confidence intervals, p-values, or a definitive "why" | High | High |
| **Server-side experiments** | Business logic, pricing tiers, backend routing, performance-sensitive changes | Pure visual/copy tests (unnecessary engineering overhead) | Any | Medium |
| **Client-side experiments** | Copy, layout, visual hierarchy, CTA wording/color | Deep logic or latency-sensitive changes | Any | Low |
| **Feature flag experiments** | Gradual/canary rollouts of new features, safe rollback | Simple cosmetic A/B tests | Any | Low |
| **Holdout testing** | Measuring cumulative/long-term impact of many shipped experiments together | Early-stage program with few experiments run so far | High | Medium |
| **Before/after analysis** | Only when randomization is genuinely impossible; obvious, large changes with a stable historical baseline | Any time proper randomization is available — always prefer it | N/A | Low (but high bias risk) |

**Evaluate server-side vs. client-side by:** deployment feasibility, latency impact, and measurement accuracy — not just "what's easier to code today."

---

## One Variable (A/B) vs. Multivariate — Decision Rules

| Factor | Favor A/B | Favor Multivariate |
|---|---|---|
| Monthly traffic | < 50,000 visitors | > 200,000 visitors |
| Variables under test | 1 | 2–5 |
| Interaction effects matter? | No | Yes |
| Implementation complexity tolerance | Low | High |
| Analysis skill in team | Beginner/Intermediate | Advanced |
| Runtime tolerance | 2–4 weeks | 4–8 weeks |
| Risk tolerance | Lower | Higher |
| Program maturity | Early-stage | Mature experimentation program |

**Heuristic:** if the required sample size for even one variant cannot be reached at your current traffic within a reasonable calendar window, do not attempt multivariate — split it into a sequence of A/B tests instead.

---

## Sample Size Planning

### Required Inputs
- **Baseline Conversion Rate (BCR)** — pull from the last 4–12 weeks of stable analytics; adjust for seasonality.
- **Minimum Detectable Effect (MDE)** — smallest lift worth acting on.
- **Alpha (α)** — typically 0.05 (95% confidence).
- **Power (1−β)** — typically 80%.
- **Expected variance** and **traffic allocation** (default 50/50 unless a reason exists otherwise).

### Conceptual Formula

n ≈ (Z_(1-α/2) + Z_(1-β))² × [p₁(1-p₁) + p₂(1-p₂)] / (p₂ - p₁)²

Where `p₁` = control rate, `p₂` = control rate × (1 + relative MDE), `n` = required sample per variant. Use a calculator or script for exact numbers when real data exists — this formula is for reasoning about direction and magnitude, not for hand-computing production sample sizes.

### Practical Estimation Workflow
1. Pull baseline conversion rate from a stable recent window (4–12 weeks).
2. Propose 2–3 MDE scenarios (conservative and ambitious) rather than picking one number blind.
3. Estimate required sample size per variant for each scenario.
4. Divide by expected daily visitors (adjusted for traffic allocation) to estimate runtime.
5. If runtime is impractical, either accept a larger MDE, extend the traffic allocation to the test, or reduce power to ~70% (only as a last resort, and say so explicitly in the documentation).

### Sample Size Reference Table (95% confidence, 80% power, 50/50 split)
| Baseline CR | MDE (relative) | Required visitors (total) | Required conversions |
|---|---|---|---|
| 10% | 20% | ~3,600 | ~360 |
| 10% | 10% | ~14,400 | ~1,440 |
| 10% | 5% | ~57,600 | ~5,760 |
| 5% | 20% | ~7,800 | ~390 |
| 5% | 10% | ~31,200 | ~1,560 |
| 5% | 5% | ~124,800 | ~6,240 |
| 2% | 20% | ~20,400 | ~408 |
| 2% | 10% | ~80,400 | ~1,608 |

**Key insight:** halving the MDE roughly *quadruples* the required sample size. Only chase a small MDE when traffic is abundant, the business impact of that smaller lift is genuinely substantial, and the team can tolerate a long runtime.

---

## MDE Selection

| MDE size | Pros | Cons |
|---|---|---|
| Very small (2–5%) | Detects subtle improvements | Requires huge samples; long runtime |
| Small (5–10%) | Detects meaningful, realistic improvements | Requires solid traffic |
| Moderate (10–20%) | Achievable on moderate traffic | May miss smaller but still-valuable effects |
| Large (20%+) | Fast experiments | Misses meaningful smaller improvements |

**Recommended MDE ranges:**
- Mature, already-optimized pages: 5–10%
- Early-stage optimization: 10–20%
- Radical redesigns / low-traffic UniqBrio pages: 10–20%+ (prefer larger MDEs to keep duration manageable)
- High-risk changes (pricing, checkout-adjacent flows): 15–25%

**Deriving MDE from business value:** estimate revenue per conversion (LTV), monthly volume, and desired incremental revenue → back into the required lift → use that as your MDE floor.

**When MDE is too ambitious:** required sample exceeds available traffic in a reasonable window → widen the MDE, extend duration, or accept 70% power (state this explicitly).
**When MDE is too large:** you're setting the bar so low you'll miss real, valuable improvements and generate weak learning → run a pilot, extend runtime, or move to sequential testing.

---

## Test Duration

| Traffic volume | MDE | Minimum runtime |
|---|---|---|
| High (100k+/mo) | 5% | 2 weeks |
| High (100k+/mo) | 10% | 1 week |
| Medium (30k/mo) | 10% | 2–3 weeks |
| Medium (30k/mo) | 15% | 2 weeks |
| Low (10k/mo) | 20% | 3–4 weeks |
| Low (10k/mo) | 30% | 2–3 weeks |

**Rules of thumb:**
- Never end before **7 full days** — this captures one weekly cycle (weekday/weekend traffic differs materially for a B2B SaaS academy audience).
- Prefer **2+ full weeks** for most UniqBrio tests; **4 weeks** for multivariate or small-MDE tests.
- Account for India-specific seasonality: festivals (Diwali, Pongal, regional academy calendars), school-year cycles, and **monsoon effects on sports-academy sign-up behavior** — don't launch or conclude a test across a period where external demand is structurally shifting.
- Avoid concluding during marketing campaigns, product launches, or known traffic anomalies unless that's explicitly what you're testing.

**Learning stabilization timeline:** first 24–48 hours = novelty/early-adopter noise; days 3–7 = stabilization; day 8+ = mature, representative behavior. Don't trust data from the first 48 hours even if the sample size looks satisfied.

**Why ending early creates false positives:** every time you peek at an in-flight p-value, you add a fresh chance of a false positive. Checking results ~20 times over a test's life can push the *effective* false-positive rate above 60%, even though each individual peek used α = 0.05. Fix your analysis point in advance and do not look until the pre-registered sample size and duration are both reached.

---

## Statistical Significance

| Term | Meaning |
|---|---|
| **p-value** | Probability of observing this data (or more extreme) if there's truly no effect. Not "probability the hypothesis is true." |
| **Confidence interval (CI)** | Plausible range for the true effect; report this alongside — or instead of — a bare p-value. Narrower = more precise. |
| **Effect size / lift** | Magnitude of the difference — always evaluate alongside significance. |
| **Absolute lift** | Difference in raw rates (e.g., 5.0% − 4.5% = 0.5 pts). |
| **Relative lift** | % change vs. baseline (e.g., 0.5/4.5 ≈ 11.1%). |
| **Statistical power (1−β)** | Probability of detecting a real effect if one exists. |
| **Type I error (α)** | False positive — concluding an effect exists when it doesn't. |
| **Type II error (β)** | False negative — missing a real effect (common in underpowered tests). |
| **False Discovery Rate (FDR)** | Proportion of "significant" results that are actually false — the right lens when testing many metrics/variants at once (e.g., Benjamini–Hochberg correction). |

### Statistical vs. Practical Significance — Decision Table
| Statistically significant? | Practically significant (≥ MDE)? | Action |
|---|---|---|
| Yes | Yes | Deploy, document, iterate |
| Yes | No | Deploy only if zero implementation cost; otherwise hold |
| No | Yes (directionally) | Likely underpowered — extend the test or accept the risk explicitly |
| No | No | No action — this is a valid, documented learning, not a failure |

---

## Common Statistical Mistakes

| Mistake | What it is | Prevention |
|---|---|---|
| **Peeking / optional stopping** | Checking results early and stopping when they "look good" | Fix sample size and duration in advance; don't analyze until both are met |
| **Multiple comparisons** | Testing many metrics/variants without correction | Pre-register the primary metric; apply Bonferroni/FDR correction for secondary explorations |
| **Simpson's paradox** | Overall trend reverses within subgroups | Always check key segments before declaring a winner |
| **Selection bias** | Sample isn't representative (broken randomization, filtered traffic) | Verify randomization mechanics before launch |
| **Novelty effect** | Users react to *newness*, not genuine improvement | Run 7–14+ days; watch for decay in the effect over time |
| **Survivorship bias** | Only analyzing users who completed a later funnel step | Define conversion across the *whole* funnel, including drop-offs |
| **Confirmation bias** | Interpreting marginal data to match what you hoped to see | Pre-specify success criteria; consider blind analysis |
| **Underpowered tests** | Insufficient sample size for the chosen MDE | Always run power analysis before launch — never launch on faith |
| **Metric fishing** | Trying metrics until one is significant | Lock primary + guardrail metrics before launch |
| **Post hoc hypotheses** | Inventing an explanation after seeing the result | Generate hypotheses beforehand; treat post-hoc stories as *future* hypotheses to test, not conclusions |
| **Regression to the mean** | Extreme baseline periods normalize on their own | Use a long, stable baseline window (30+ days) |
| **Confounding external events** | A concurrent campaign, PR event, or bug muddies attribution | Log all concurrent activity; check for overlap before interpreting |

---

## Guardrail Metrics

**Why they matter:** optimizing a single KPI in isolation can quietly damage the business — e.g., more signups but worse lead quality; higher CTA clicks but higher bounce right after.

### Metric Hierarchy
1. **North Star** — e.g., *Qualified Academy Trials* (or Active Students Managed, at the product level).
2. **Business metrics** — revenue, CAC, trial-to-paid rate, LTV.
3. **Primary metric** — the one thing this specific experiment is optimizing.
4. **Secondary metrics** — expected to move in the same direction, supporting evidence.
5. **Diagnostic metrics** — explain *why* (scroll depth, form-field interaction, FAQ expansion).
6. **Guardrail metrics** — must not get worse, regardless of primary-metric gains.

### Guardrail Examples
Bounce rate · engagement/session duration · lead quality (demo show-up rate, trial-to-paid) · demo completion rate · Core Web Vitals (LCP, INP, CLS) · navigation success · error rate (4xx/5xx/JS errors) · form abandonment · mobile usability · accessibility violations · customer-acquisition quality.

**Setting thresholds:** decide **absolute** ("bounce rate must not rise more than 3 points") vs. **relative** ("...more than 10%") in advance. For guardrail testing, use a slightly more sensitive alpha (e.g., α = 0.10) since the cost of missing real harm outweighs the cost of a false alarm here. A minor guardrail dip alongside a large primary gain may still justify shipping; a major guardrail violation should pause the rollout for investigation regardless of the primary-metric result.

---

## Website Metrics & Funnel Mapping (UniqBrio-Specific)

**Leading indicators** (early signal): CTA click-through, engagement time, scroll depth, social-proof interaction, pricing-page engagement.
**Lagging indicators** (ultimate outcome): free trial starts, demo bookings, paid conversions, revenue.

**UniqBrio top-of-funnel sequence to instrument:**
`Landing page → CTA click → Demo booking → Demo completion → Trial signup → Paid conversion`

**Lead-quality dimensions worth tracking alongside conversion volume:** academy type (dance/music/sports/martial arts/drawing), academy size (student count), decision-maker role (owner vs. manager), and contact-info completeness — a variant that raises raw signups but degrades these is not a clean win.

---

## Segmentation

**Useful dimensions:** desktop / mobile / tablet · traffic source (organic, paid, social, direct, referral) · campaign · geography / city tier (Tier 1 vs Tier 2/3 India) · new vs. returning · logged-in vs. anonymous · device class · browser · language · academy type · academy size.

**Pre-registered segments** (defined before launch, for a specific hypothesis) vs. **post-hoc segments** (exploratory, for generating *future* hypotheses — never for a final ship/no-ship decision).

**Risks of over-segmentation:**
- Each additional segment increases the multiple-comparisons problem.
- Individual segments get diluted below the power threshold.
- Simpson's-paradox-style contradictions become likely.
- Analysis paralysis from conflicting signals.

**Guidelines:** limit to 3–5 pre-registered segments; ensure each has at least ~100 conversions or ~1,000 visitors before drawing any conclusion from it; apply a multiple-comparison correction if reporting more than one or two segment cuts.

---

## Experiment QA Checklist

**Tracking & Analytics**
- [ ] All events fire correctly on every variant, with correct names/parameters and no duplicates
- [ ] Attribution (user ID, session ID, campaign) preserved across the funnel
- [ ] Primary, secondary, and guardrail metrics all confirmed flowing into the dashboard

**Variants, Routing & Randomization**
- [ ] Correct content renders per variant; no flicker/flash-of-default-content
- [ ] Assignment is random, persistent, and deterministic across sessions/devices
- [ ] Traffic allocation matches the documented plan

**Consistency & Responsiveness**
- [ ] Consistent behavior across desktop, mobile, tablet, and major browsers
- [ ] Layout, CTA tap targets, and images render correctly at every breakpoint (PWA-critical for UniqBrio's mobile-first Indian audience)

**Performance & SEO**
- [ ] No Core Web Vitals regression (LCP, INP, CLS) introduced by the variant
- [ ] Canonical tags, metadata, and indexability unaffected across variants

**Accessibility**
- [ ] Color contrast, keyboard navigation, screen-reader labels, and focus order verified on every variant

**Forms & Links**
- [ ] All links resolve; all forms submit and validate correctly; error and confirmation states render

**Compliance & Privacy**
- [ ] Consent mechanisms intact where applicable; no new data collection introduced without review (DPDP Act 2023 considerations for Indian user data)

**Rollback Readiness**
- [ ] Feature flag/kill-switch verified to toggle off instantly if a guardrail breaks post-launch

---

## Result Interpretation Framework

| Outcome | Criteria | Recommended action |
|---|---|---|
| **Clear winner** | Statistically significant, ≥ MDE, guardrails healthy | Deploy; document; plan a follow-up iteration |
| **Clear loser** | Statistically significant *negative* effect | Reject; document the learning; do not retest without a new insight |
| **Inconclusive** | Not significant, effect near zero | Consider the hypothesis disproven for now; iterate the hypothesis |
| **Insufficient power** | Not significant, but directionally promising and sample was short of target | Extend the test or run a properly powered follow-up — do not ship on this alone |
| **Conflicting metrics** | Primary improves, a guardrail or secondary metric worsens | Investigate root cause (segment cuts, qualitative feedback) before deciding |
| **Mixed business outcome** | e.g., higher trial conversion but lower lead quality | Evaluate downstream impact (trial-to-paid) before declaring success |

---

## Documentation Template

```markdown
# Experiment: [Name] — [Date]

**Owner:**
**Business objective:**
**Problem statement:**
**Research question:**
**Hypothesis:**
**Variants:** Control — ... | Treatment A — ...
**Metrics:** Primary — ... | Secondary — ... | Guardrails — ... | Business — ...
**Baseline conversion rate:**
**MDE:** **Alpha:** **Power:**
**Traffic allocation:**
**Sample size assumptions / required sample:**
**Expected runtime:**

## Results
- Primary metric: [lift], p = [x], CI [low, high]
- Guardrails: [status]
- Segments checked: [status]

## Interpretation
## Decision: [Deploy / Reject / Iterate / Extend]
## Lessons learned
## Follow-up experiments
```

---

## Practical Website Examples (Generic SaaS)

- **Hero headline:** feature-led ("Manage Your Academy Easily") vs. outcome-led ("Spend More Time Teaching — We Handle the Administration").
- **CTA wording:** "Start Free Trial" vs. "Book a Demo" vs. "Start Free Trial in 2 Minutes."
- **CTA color:** brand orange vs. brand purple — measure CTR *and* downstream trial conversion, not clicks alone.
- **Pricing page:** feature-emphasis cards vs. student-count/outcome-emphasis cards.
- **Social proof/testimonials:** video vs. written; logo wall placement above vs. below the fold.
- **Navigation:** feature-first vs. outcome-first information architecture.
- **Trust badges:** payment security vs. customer-logo wall vs. privacy assurance.
- **Lead forms:** 5-field vs. 2-field forms — watch lead-quality guardrail, not just completion rate.
- **Demo booking:** embedded calendar vs. "request a callback."
- **FAQ placement:** above pricing vs. below testimonials.
- **Mobile:** sticky CTA vs. inline CTA.

---

## UniqBrio-Specific Examples

**Dance academy:** Headline test — "Run Your Dance Academy. Not Your Paperwork." vs. control. Primary metric: demo-booking rate.

**Music academy:** Headline — "Never Miss Another Fee Collection." Guardrail: mobile bounce rate (parents often browse on mobile in the evening).

**Cricket/Sports academy:** Headline — "Track Attendance, Fees, and Batches in One Place." Segment by city tier — Tier 2/3 owners may respond differently to jargon-heavy vs. plain-language copy.

**Football coaching:** Headline — "Grow Your Academy Without Administrative Chaos." Test alongside a WhatsApp-first CTA, since many coaches manage everything via WhatsApp today.

**Drawing school:** Headline — "Focus on Creativity. We'll Handle Management." Test social proof density — art-academy owners may weight peer testimonials more heavily than feature lists.

**Martial arts academy:** Headline — "Discipline Students. Not Spreadsheets." Test trust badges (data security) given sensitive student data (often minors).

**WhatsApp CTA:** "Book Demo" vs. "Chat on WhatsApp" — for many Tier 2/3 owners, WhatsApp is a lower-friction first step than a form; track lead-to-demo conversion downstream, not just click rate.

**Pricing messaging:** "₹999/month" (bare price) vs. "Manage up to 50 Students for ₹999/month" (concretized value) — test whether concretizing the unit economics increases perceived value for cost-sensitive Tier 2/3 owners.

**Free trial framing:** "Start Free Trial" vs. "See It Work With Your Academy's Data" — tests whether personalization framing outperforms generic trial language.

---

## UniqBrio Technical Implementation Notes

- **Feature flags:** implement via Vercel Edge Config / middleware for fast, low-latency variant routing on the Next.js public site.
- **Event naming:** define a consistent convention (e.g., `experiment_id`, `variant_id`, `event_name`) and tag every event with the experiment and campaign for traceability.
- **Data plane:** log experiment exposures and conversions into Supabase PostgreSQL; use Supabase Edge Functions for server-side variant assignment when logic (e.g., pricing tier shown) must be tamper-resistant.
- **Environment discipline:** follow the platform's existing TEST-vs-PROD governance — never validate a live experiment's tracking against TEST-only data; confirm event flow against the PROD academy count fingerprint before trusting dashboard numbers.
- **PWA/mobile-first constraints:** since the audience is predominantly mobile, prioritize variants that have been checked for layout shift and tap-target size before allocating meaningful traffic.

---

## Integration Guidance

| Skill | Relationship |
|---|---|
| `website-conversion-funnel-analyst` | Upstream — diagnoses *where* the funnel leaks; this skill turns that diagnosis into a testable, powered experiment. |
| `hero-section-cro-specialist` | Downstream/parallel — produces the actual creative variants for a hero test; this skill validates whether the change actually works. |
| `cta-strategy-architect` | Parallel — designs CTA strategy and copy; this skill evaluates CTA experiments statistically. |
| `product-analytics-expert` | Downstream — takes over once an experiment ships, tracking longer-term cohort and retention effects beyond the experiment window. |

**Handoff boundary:** this skill owns *what to test, how to test it validly, and what the result means*. It does not own creative execution, code implementation, or long-horizon analytics — it hands off cleanly at each of those boundaries.

---

## Best Practices
- Predefine primary metric, guardrails, sample size, and stopping rule *before* launch — never after.
- Test one major hypothesis at a time when traffic is limited; save multivariate for high-traffic pages with a mature program.
- Always run a full weekly cycle at minimum; never stop on a mid-week check.
- Treat qualitative signals (session recordings, support tickets) as hypothesis generators, not proof.
- Document every experiment — wins, losses, and inconclusive results all build organizational memory.
- Re-use validated insights across similar pages/personas instead of re-testing from scratch.
- Prioritize experiments with genuine learning value, not just the ones expected to "win."

## Anti-Patterns
- Declaring a winner after 2–3 days because the dashboard "looks good."
- Running many tiny tests without correcting for multiple comparisons.
- Chasing a single KPI (clicks, signups) while lead quality or guardrails quietly erode.
- Changing the hypothesis or metrics mid-flight to match what the data is showing.
- Testing during a major campaign, festival period, or outage without controlling for it.
- Over-segmenting until every cut is underpowered, then cherry-picking the one that looks good.
- Treating a statistically significant but practically trivial lift as a mandate to ship.

---

## Decision Trees

**Should this be A/B or multivariate?**

Single, isolated hypothesis? → Yes → A/B
→ No → High traffic (>200k/mo)?
→ No → Run a sequence of A/B tests
→ Yes → Interaction effects matter?
→ No → Multiple A/B tests
→ Yes → Multivariate

**Should this test continue?**

Reached required sample size? → No → Continue
→ Yes → Reached minimum planned duration?
→ No → Continue
→ Yes → QA/tracking issue found?
→ Yes → Investigate before analyzing
→ No → Proceed to analysis

**Is this statistically meaningful?**

Adequately powered? → No → Inconclusive (do not ship on this)
→ Yes → p < alpha?
→ No → No significant winner
→ Yes → Effect ≥ MDE (practically significant)?
→ No → Weigh implementation cost before shipping
→ Yes → Candidate winner

**Should the winner be deployed?**

Primary metric improved & significant? → No → Reject
→ Yes → Guardrails healthy?
→ No → Investigate / pause rollout
→ Yes → Business impact justifies effort?
→ Yes → Deploy
→ No → Reconsider priority

**Should another iteration run?**

Genuine learning gained? → No → Refine the hypothesis and retest
→ Yes → New opportunity surfaced?
→ Yes → Design a follow-up experiment
→ No → Archive the learning

---

## Operational Checklists

**Before launch:** problem defined · hypothesis documented · metrics locked · sample size & MDE calculated · runtime estimated · QA checklist passed · rollback plan ready.

**During the experiment:** monitor for bugs/traffic imbalance only · do not peek at the primary metric's significance · log any concurrent campaigns/anomalies.

**After completion:** confirm sample size and duration were both met · analyze primary → guardrails → pre-registered segments, in that order · document regardless of outcome · share the learning · queue the next iteration.

---

## Quick Reference Tables

**Experiment types**
| Type | Best for | Avoid when |
|---|---|---|
| A/B | Single hypothesis | Many interacting variables |
| Split URL | Full redesign | Minor copy tweaks |
| Multivariate | High traffic, interactions | Low traffic |
| Sequential | Time-critical decisions | No stopping-rule infrastructure |
| Bandit | Continuous optimization | Need for clean causal learning |
| Holdout | Long-term cumulative impact | Early-stage, few experiments run |

**Metric categories**
| Category | Purpose |
|---|---|
| Primary | The decision metric for this test |
| Secondary | Supporting, directionally-expected evidence |
| Diagnostic | Explains *why* the primary metric moved |
| Guardrail | Must not regress, regardless of primary result |
| Business | Revenue/CAC/LTV — the ultimate justification |

**Statistical terminology**
| Term | Meaning |
|---|---|
| Alpha (α) | False-positive rate tolerance |
| Beta (β) | False-negative rate tolerance |
| Power (1−β) | Probability of detecting a real effect |
| MDE | Smallest effect worth detecting |
| Lift | Improvement, absolute or relative |
| CI | Range of plausible true effect sizes |

**Common pitfalls & prevention**
| Pitfall | Prevention |
|---|---|
| Peeking | Fixed, pre-registered stopping rule |
| Metric fishing | Lock metrics before launch |
| Selection bias | Verify randomization mechanics |
| Novelty effect | Run 7–14+ days before trusting the effect |
| Underpowered test | Run power analysis before every launch |

**Interpretation outcomes**
| Result | Action |
|---|---|
| Winner | Deploy |
| Loser | Reject, document |
| Inconclusive | Iterate the hypothesis |
| Underpowered | Extend or redesign |
| Conflicting | Investigate before deciding |

---

## Final Principles
1. Learning is the primary output of every experiment — the deployment decision is secondary.
2. Every test must map back to a real business question and a falsifiable hypothesis.
3. Statistical significance is necessary but never sufficient — practical significance and guardrail health decide the ship call.
4. Never peek, never optionally stop, never fish for a metric that happened to move.
5. Guardrail metrics are mandatory on every test, not an optional nice-to-have.
6. Document every experiment — wins, losses, and null results all compound into better future decisions.
7. Favor a smaller number of rigorous, well-powered experiments over a large volume of sloppy ones.
