---
name: saas-pricing-model-strategist
description: Defines the business-model decision layer for B2B SaaS pricing — philosophy, discovery, segmentation, tier packaging, feature entitlement, freemium/trial/demo strategy, localization, psychological pricing, billing, expansion revenue, grandfathering, governance, and metrics — before any pricing page is designed.
when_to_use: Use before designing, redesigning, or evolving pricing tiers, packaging, feature gating, trials, or localization for a B2B SaaS product, always prior to pricing-page copywriting, UI, or frontend implementation.
---

# SaaS Pricing Model Strategist

## Purpose

This skill defines the commercial decision layer that must be resolved **before** any pricing page, marketing copy, or frontend implementation begins. It determines what is sold, how it is packaged, who each plan serves, how pricing evolves over time, and how it is localized across markets.

It defines:
- Pricing philosophy and monetization strategy
- Packaging architecture and feature segmentation
- Market positioning and upgrade paths
- Pricing localization
- Experimentation and governance policy

It does **not** define:
- Pricing page layout, copy, or visual hierarchy (→ `pricing-page-strategist`)
- Frontend implementation, billing UI, or checkout flows
- Payment gateway integration

**Default context:** India-first B2B SaaS (reference implementation: UniqBrio, an Arts & Sports Academy Management Platform on React Native Expo PWA, Next.js, Supabase, Vercel). The framework generalizes to any B2B SaaS product; substitute the customer/segment specifics accordingly.

---

## 1. Pricing Strategy Philosophy

Pricing is a product and business decision, not a marketing afterthought. Optimize for:

1. Long-term recurring revenue over short-term conversion spikes
2. Customer success and time-to-value
3. Perceived value alignment (price should feel justified by outcomes delivered)
4. Expansion revenue as the primary growth lever after initial acquisition
5. Retention and predictable renewal behavior
6. Simplicity — if a customer cannot explain their own plan in one sentence, packaging has failed

**Balance continuously across:**

|
Tension
|
Guidance
|
|
---
|
---
|
|
Affordability vs. perceived value
|
Price low enough to convert Tier 2/3 city buyers, high enough to signal professional-grade software
|
|
Willingness to pay vs. cost-plus
|
Anchor to ROI delivered (time saved, revenue protected), never purely to infrastructure cost
|
|
Feature differentiation vs. simplicity
|
Differentiate on 3-5 meaningful axes, not a long feature checklist
|
|
Operational/support cost vs. price
|
Higher-touch tiers must recover their support cost through price or volume
|
|
Competitive positioning vs. transparency
|
Compete on value narrative, not opaque pricing tricks
|
|
Scalability vs. customer trust
|
Usage limits must scale predictably as the customer grows, never punish success
|

---

## 2. Pricing Discovery Framework

Complete this discovery **before** proposing any numbers or tiers.

1. **Target customer & buying committee** — Who uses it, who approves the purchase, who signs the contract? (Solo owner vs. operations manager vs. procurement.)
2. **Jobs-to-be-done** — What operational job is the customer hiring this software to do? (e.g., stop chasing fee payments on WhatsApp, replace a spreadsheet, centralize multi-branch reporting.)
3. **Buying triggers** — What event causes them to start looking? (Staff growth, a new branch, a compliance deadline, WhatsApp chaos, manual error causing lost revenue.)
4. **ROI drivers** — Quantify hours saved, revenue protected (late-fee recovery), churn reduction, error reduction. Willingness to pay should be derived from this, not guessed.
5. **Operational pain points** — Map the specific friction the product removes per segment.
6. **Competitive alternatives** — Include non-software alternatives (spreadsheets, WhatsApp, paper registers, local custom software) as well as direct competitors.
7. **Switching costs** — Data migration effort, staff retraining, contract lock-in with incumbents. High switching cost justifies strong onboarding investment, not a lower price.
8. **Perceived value** — What will the customer *believe* they are paying for, independent of what engineering considers valuable?

Document every assumption explicitly; do not silently guess willingness to pay from competitor pricing alone.

---

## 3. Customer Segmentation Framework

Segment by **operational scale and maturity**, using measurable dimensions — never by an arbitrary feature wishlist.

**Preferred segmentation dimensions (in order of relevance for academy-management SaaS):**
- Active students
- Branches / locations
- Instructors / staff seats
- Monthly transaction volume or revenue processed
- Storage / media usage
- Automation and AI feature usage
- Support tier required

**Reference segments:**

|
Segment
|
Profile
|
Primary Metric
|
Purchase Behavior
|
|
---
|
---
|
---
|
---
|
|
Solo
|
Owner-operated, one location
|
<100 students, 1 branch
|
Self-serve, price-sensitive
|
|
Small Academy
|
Small staff, single branch
|
100–500 students
|
Self-serve, occasional demo
|
|
Growing
|
Growing enrollment, some automation need
|
500–2,000 students, 1–3 branches
|
Sales-assisted self-serve
|
|
Multi-Branch / Business
|
Centralized management across locations
|
3–10 branches
|
Sales-led
|
|
Franchise / Enterprise
|
Large, multi-site, compliance and procurement needs
|
10+ branches, custom SLAs
|
Enterprise sales, contracts
|

Never segment primarily by removing arbitrary features between adjacent tiers — segment boundaries should mirror where operational complexity genuinely changes.

---

## 4. Tier Packaging Framework

**Recommended structure:** Starter → Growth → Professional → Business → Enterprise (four to five self-serve/sales tiers maximum; more fragments confuse the buying decision).

|
Tier
|
Serves
|
Customer Maturity
|
Upgrade Motivation
|
Business Objective
|
|
---
|
---
|
---
|
---
|
---
|
|
Starter
|
Solo / micro academies
|
First digitization of records
|
Outgrows student/branch limit, wants automation
|
Acquisition, land
|
|
Growth
|
Small, established academies
|
Full core workflow adopted
|
Needs reporting, comms automation, more seats
|
Core recurring revenue
|
|
Professional
|
Growing, multi-instructor operations
|
Operational maturity, wants efficiency
|
Needs integrations, advanced analytics, permissions
|
Expansion revenue
|
|
Business
|
Multi-branch organizations
|
Centralized governance needed
|
Needs cross-branch reporting, custom workflows
|
Retain larger accounts
|
|
Enterprise
|
Franchises, large institutions
|
Procurement-driven, compliance-heavy
|
Custom contracts, SLAs, security review
|
Strategic, high-ACV accounts
|

### Packaging philosophy
Package around **value delivered, workflow maturity, automation depth, scale, and operational complexity** — never around cosmetic or arbitrary restrictions.

### Limit types
- **Hard limits** — enforced caps, appropriate where marginal infrastructure cost scales directly or abuse prevention matters (storage, AI credits, API calls).
- **Soft limits** — usage warnings with graceful upgrade prompts, appropriate for student/branch/seat counts where blocking access would damage trust.
- **Seat limits** — only when a seat represents real incremental cost or value; don't charge for occasional/view-only users.
- Other quota types to define explicitly per tier: branch limits, student limits, storage limits, API limits, automation-run limits, integration counts.

---

## 5. Feature Entitlement & Gating Logic

Classify every capability into one category before assigning it to a tier:

|
Category
|
Definition
|
Default placement
|
|
---
|
---
|
---
|
|
Core value features
|
Required for the product to be usable at all
|
All plans
|
|
Differentiating features
|
Improve efficiency/workflow but aren't essential
|
Growth+
|
|
Expansion features
|
Directly tied to scale (more branches, more automation)
|
Professional/Business+
|
|
Operational features
|
Needed for day-to-day running regardless of size (basic reporting, mobile access)
|
All plans
|
|
AI / automation features
|
Usage-cost-sensitive, high perceived value
|
Tiered by usage credits, not simple on/off
|
|
Integrations / API
|
Enable ecosystem connections
|
Limited count on lower tiers, unlimited/custom on top tiers
|
|
Analytics
|
Basic on entry tiers, advanced/predictive on higher tiers
|
Escalating depth by tier
|
|
Enterprise-only
|
SSO, audit logs, custom contracts, dedicated infrastructure, compliance reviews
|
Enterprise only
|

### Decision rules (apply in order)
1. Does removing this feature make the product fundamentally unusable? → **Never gate it; all plans.**
2. Does this feature primarily serve customers operating at greater scale/complexity? → **Higher tier.**
3. Does this feature reduce operational effort in a way that creates clear upgrade motivation? → **Mid tier (Growth/Professional).**
4. Does this feature carry meaningful, scaling infrastructure cost (AI, storage, messaging)? → **Usage-based quota, not a flat gate.**
5. Does this feature require dedicated support, custom contracts, or security review to deliver? → **Enterprise only.**

---

## 6. Packaging Anti-Patterns — Never Do These

- Punishing upgrades: removing a feature the customer already had access to
- Arbitrary feature removal between adjacent tiers with no operational rationale
- Confusing, overlapping limits that blur tier boundaries
- Pricing cliffs — large unexplained jumps between adjacent tiers (e.g., 3x+ price jump for marginal feature gain)
- Inconsistent entitlements across similar customers with no documented reason
- Hidden fees, setup costs, or surprise overage charges
- Excessive fragmentation — more than 4–5 self-serve tiers
- Gating basic reporting, security, or platform maintenance as "premium"

---

## 7. Freemium vs. Free Trial vs. Demo Framework

|
Model
|
Advantages
|
Disadvantages
|
Ideal use case
|
Typical conversion
|
Abuse risk
|
|
---
|
---
|
---
|
---
|
---
|
---
|
|
Freemium
|
Low friction, organic/viral growth, large top-of-funnel
|
High support cost, delayed monetization, low intent signal
|
Simple products, strong network effects, high-volume SMB acquisition
|
2–5%
|
High
|
|
Free Trial (full-featured, time-boxed)
|
Clear "aha moment," qualified intent, faster sales cycle
|
Urgency pressure, requires strong onboarding to avoid churn at expiry
|
Products with clear ROI needing some setup
|
15–30%
|
Medium
|
|
Guided Demo
|
High qualification, objection handling, tailored narrative
|
Not scalable, resource-intensive
|
Mid-market, moderately complex sales
|
30–50%
|
Low
|
|
Self-Serve Demo (sandbox/video)
|
Scalable, low cost, always available
|
Lower personalization, lower conversion
|
Standard product education at scale
|
5–10%
|
Low
|
|
Sales Demo
|
Highest qualification and win rate for large deals
|
Highest cost, slowest cycle
|
Enterprise, strategic accounts
|
40–60%
|
Low
|
|
Pilot
|
Real-world validation, lowers enterprise buying risk
|
Resource-intensive, time-bound, requires success criteria upfront
|
Enterprise, multi-branch rollouts
|
70–80%
|
Low
|
|
POC
|
Technical/integration validation
|
Most expensive, slowest
|
Deep technical/integration-heavy enterprise deals
|
60–75%
|
Low
|

### Decision tree
1. Is the core value demonstrable within minutes with near-zero setup? → Consider **Freemium** (capped, e.g., 1 branch / limited students) alongside a full-featured trial.
2. Is the product moderately complex and does the buyer need hands-on setup to see value? → **Time-boxed Free Trial** (full features of the target tier, not the entry tier).
3. Is the sale mid-market with real objections to handle? → **Guided Demo.**
4. Is the buyer enterprise/franchise with procurement involvement? → **Sales Demo → Pilot/POC** as needed.

**India-first recommendation:** hybrid model — a generous 14–30 day full-featured trial as the primary acquisition motion for small/growing academies, plus guided demos for Business/Enterprise prospects. Reserve pure freemium for markets with strong organic distribution, given its higher support overhead per free user.

---

## 8. Trial Design Framework

- **Duration:** 14 days default; extend to 21–30 days for higher-complexity segments or qualified enterprise-track leads.
- **Feature availability:** Grant access to the *target* tier's features (e.g., Growth/Professional), not the entry tier — let the prospect experience the upgrade-worthy capability, not a crippled version.
- **Activation milestones:** Define 3–5 concrete in-product actions correlated with conversion (e.g., add first students, schedule first class, send first fee reminder, invite a second staff member).
- **Onboarding cadence:** Structured touchpoints — Day 1 welcome + quick-start, Day 3 feature tip, mid-trial check-in, Day 10–12 urgency reminder, final-day nudge.
- **Trial extensions:** Offer selectively to prospects showing active engagement but incomplete activation — never as a blanket policy.
- **Conversion triggers:** Approaching a usage limit, completing a key milestone, inviting additional users.
- **Expiry behavior:** Never hard-delete data or lock out abruptly. Downgrade to a restricted/read-only state with clear, low-friction upgrade prompts and a short grace period.
- **Post-trial experience:** For non-converters showing partial engagement, trigger a human/sales touch or a limited-time reactivation offer rather than silent abandonment.
- **Success metrics to track:** trial starts, activation rate, milestone completion rate, trial-to-paid conversion, time-to-activation.

---

## 9. Pricing Localization Framework

### Core principle
Match localization strategy to market maturity and purchasing power — do not default to naive currency conversion.

|
Approach
|
When appropriate
|
|
---
|
---
|
|
Direct currency conversion
|
Product is commoditized, target market has comparable purchasing power, or maintaining a single global price list is a strategic priority
|
|
Purchasing-power-parity (PPP) localization
|
Significant income differential between markets; local competitors price well below a converted USD rate
|
|
Fully independent regional pricing
|
Market has distinct competitive dynamics, regulatory requirements, or strategic importance (e.g., India vs. US for an India-first SaaS)
|

### India-first recommendations
- **Primary currency: INR.** Never force USD pricing on the domestic market.
- Price using local willingness-to-pay research, not a converted USD figure — a directly converted price is frequently a poor fit for Tier 2/3 city academy owners.
- **GST:** Decide and consistently apply inclusive vs. exclusive display. B2B buyers who claim input credit often prefer exclusive pricing with GST shown clearly at checkout; SMB owners often prefer all-inclusive simplicity. Whichever is chosen, make the final payable amount unambiguous before checkout.
- **Payment methods:** Support UPI, net banking, and cards as primary rails; support offline/invoice payment (NEFT/RTGS/cheque) for Business/Enterprise tiers, since credit-card penetration is low among the target SMB segment.
- **Rounding psychology differs by tier:** charm pricing (₹999, ₹1,999) works for Starter/Growth tiers aimed at price-sensitive SMBs; rounded, "clean" pricing (₹5,000, ₹10,000) signals quality and is more appropriate for Business/Enterprise. Avoid pricing so low it signals low quality for a professional B2B tool.
- **Billing cadence preference:** Indian SMBs often favor shorter commitments (monthly/quarterly) even when annual is nominally cheaper — offer both, and use annual discounting to *encourage*, not force, commitment.

### International expansion
- Maintain independent regional price lists once expanding beyond India (e.g., USD for US/global, GBP/EUR as needed) rather than mechanically converting the INR list.
- Adjust regional messaging and case studies to local operational pain points — do not just translate copy.

---

## 10. Psychological Pricing Guidance

|
Technique
|
Use when
|
Avoid when
|
|
---
|
---
|
---
|
|
Anchoring
|
Displaying a high-value tier first to reframe mid-tier as reasonable
|
Product is simple/commoditized
|
|
Decoy pricing
|
Nudging toward the recommended plan via a deliberately less-attractive adjacent option
|
It would create confusion rather than clarity
|
|
Charm pricing (₹999 vs ₹1,000)
|
Entry/SMB tiers, consumer-adjacent psychology
|
Enterprise/prestige positioning
|
|
Rounded pricing (₹5,000 vs ₹4,999)
|
Enterprise and prestige tiers, signaling confidence and quality
|
Highly price-sensitive entry tiers
|
|
Prestige pricing
|
Enterprise, custom-quote tiers
|
Self-serve, price-sensitive segments
|
|
Annual discount (typically 15–25%)
|
Encouraging commitment, improving cash flow and reducing churn
|
Never so large it devalues the monthly price
|
|
"Most Popular" / recommended-plan highlighting
|
Guiding buyers toward the plan that best fits typical customer value, not necessarily the most expensive one
|
Don't manipulate toward a plan mismatched to actual usage
|
|
"Contact Us" / custom pricing
|
Enterprise tiers with negotiated terms, procurement, or highly variable scope
|
Self-serve tiers where transparency drives trust
|

---

## 11. Billing Strategy

|
Parameter
|
Recommendation
|
|
---
|
---
|
|
Cadences offered
|
Monthly, quarterly, annual as standard; semi-annual optional for entry/mid tiers; multi-year reserved for Enterprise
|
|
Discount structure
|
Annual discount only (avoid stacking multiple discount types, which erodes clarity)
|
|
Renewal
|
Automatic renewal by default, opt-out available, with clear advance notice
|
|
Prepaid vs. recurring
|
Recurring subscription is the default; prepaid/invoice billing available for Business/Enterprise
|
|
Invoice billing
|
Offer for Business+ and mandatory for Enterprise; not necessary for self-serve tiers
|
|
Offline/regional payment
|
Support UPI/net banking/cards domestically; NEFT/RTGS/cheque for larger accounts; region-appropriate rails (SEPA, direct debit) if expanding internationally
|
|
Proration
|
Upgrades/downgrades should prorate automatically and transparently
|

---

## 12. Expansion Revenue Strategy

Design packaging so growth naturally increases spend without feeling punitive:

- More students / instructors / branches → natural tier or usage-based upgrade
- Automation adoption → unlocks at Growth/Professional, framed as time-savings, not a fee
- AI features → usage-credit model that scales with value delivered
- Premium modules / add-ons → optional, clearly priced, never bundled forcibly
- Additional storage → soft-limit with clear usage visibility before hard enforcement
- Higher support tiers → priced separately from feature access where possible

**Never:** surprise customers with overage charges, make downgrades destructive to data, hide the benefit of an upgrade, or silently start charging for a feature that was previously included.

---

## 13. Grandfathering Policy

- Existing customers keep their current price for a defined protection window (recommended: 12–24 months) after any list-price increase.
- Feature additions should never be removed from customers who already have them; if a feature must be deprecated, offer a substitute or migration path.
- Legacy plans remain supported for a defined sunset window (recommended: 18–24 months) with advance notice before forced migration.
- Offer an incentive (e.g., a limited-time discount) for customers who voluntarily migrate to new plans early.
- Document exact entitlements per customer/plan version so support and sales can answer "why do I have this" questions accurately.

---

## 14. Price Change Communication Framework

Principles: transparency, advance notice, and value justification — never a silent change.

- **Notice period:** minimum 30 days for standard customers, 60 days for Enterprise/contracted accounts.
- **Explain why:** tie the change to added value (new features, expanded capability) or clear market/cost rationale — never present it as unexplained.
- **State grandfathering terms explicitly** in the same communication.
- **Multi-channel delivery:** email + in-app banner + (for Enterprise) direct account-manager outreach; brief support and sales teams before the announcement goes out.
- **Provide a clear action path:** what happens if they do nothing, how to migrate, who to contact with questions.

---

## 15. Pricing Governance

- **Versioning:** every pricing structure gets an explicit version identifier and effective date.
- **Documentation of record:** pricing strategy doc, feature-entitlement matrix, localization matrix, and grandfathering ledger, each with a named owner.
- **Approval workflow:** proposal → business review (finance/sales/marketing) → executive approval → implementation → post-launch monitoring.
- **Review cadence:** quarterly tactical review; annual full strategy review; ad hoc competitive review triggered by material competitor pricing moves.
- **Experimentation:** run pricing/packaging A/B tests one variable at a time; define success criteria and a rollback trigger *before* launching any test; never run simultaneous unrelated pricing experiments that would confound results.
- **Rollback planning:** every experiment needs a pre-defined rollback threshold and a communication plan if rolled back.

---

## 16. Metrics Framework

Pricing decisions should be evaluated against, not just:

- MRR / ARR and their growth rate
- LTV and LTV:CAC ratio (target >3:1)
- CAC and CAC payback period (target <12 months for mid-market)
- ARPU trend by segment
- Expansion revenue as a % of total MRR
- Net Revenue Retention (target >100%, ideally >110%) and Gross Revenue Retention
- Gross margin by tier (ensure high-touch tiers remain profitable)
- Trial-to-paid conversion rate and activation rate
- Upgrade rate and downgrade rate
- Logo churn and revenue churn, tracked separately

Never optimize a single metric (e.g., raw signups) in isolation from retention and margin.

---

## 17. Decision Checklists

**Packaging Checklist**
- [ ] Each tier has one clear target customer profile
- [ ] Feature progression is logical with no overlap between adjacent tiers
- [ ] Limits are tied to genuine operational/cost drivers, not arbitrary caps
- [ ] Upgrade path feels like a natural next step, not a forced penalty

**Tier Validation Checklist**
- [ ] No pricing cliffs between adjacent tiers
- [ ] Entitlements are documented and consistent across customers in the same tier
- [ ] Annual vs. monthly pricing difference is clearly justified and displayed

**Localization Checklist**
- [ ] Primary currency and GST/tax treatment decided and consistently applied
- [ ] Regional payment methods supported
- [ ] Pricing reflects local purchasing power, not naive conversion
- [ ] Messaging is localized to real operational pain points, not just translated

**Trial Strategy Checklist**
- [ ] Correct acquisition model chosen via the decision tree (freemium/trial/demo/pilot)
- [ ] Activation milestones defined and instrumented
- [ ] Expiry behavior preserves data and offers a graceful downgrade
- [ ] Reminder cadence and success metrics defined

**Pricing Change Checklist**
- [ ] Advance notice period met (30/60 days)
- [ ] Grandfathering terms defined and included in the communication
- [ ] Support and sales briefed before announcement
- [ ] Value justification is clearly articulated

**Launch Checklist**
- [ ] Pricing strategy doc and entitlement matrix finalized and approved
- [ ] Billing cadences and proration rules implemented
- [ ] Metrics instrumentation in place before go-live
- [ ] Handoff to `pricing-page-strategist` and `feature-entitlement-plan-architect` completed

---

## 18. Required Output Format

When this skill is invoked, structure the response as:

1. **Assumptions** — explicit, stated up front
2. **Recommended Pricing Architecture** — tiers, target segments, illustrative price points, entitlements
3. **Justification** — why this structure, tied back to discovery and segmentation
4. **Trade-offs & Alternatives Considered** — what was rejected and why
5. **Risks** — what could go wrong and mitigations
6. **Implementation Priorities** — sequencing for engineering/ops
7. **Future Evolution** — what triggers a pricing revisit (e.g., ARR threshold, new segment emergence)
8. **Metrics to Track**

Never respond with bare price numbers absent this reasoning.

---

## 19. Cross-Skill Responsibilities

|
Skill
|
Role
|
Handoff point
|
|
---
|
---
|
---
|
|
`pricing-page-strategist`
|
Owns pricing page layout, copy, visual hierarchy, CTAs, conversion optimization
|
Invoked
*
after
*
this skill's architecture is finalized
|
|
`roi-validation-specialist`
|
Validates proposed pricing against quantified customer ROI and payback
|
Invoked during discovery, especially for Business/Enterprise pricing
|
|
`feature-cost-estimator-inr`
|
Estimates infrastructure/support/AI cost per feature in INR terms
|
Invoked when deciding whether a feature needs a hard usage limit
|
|
`feature-entitlement-plan-architect`
|
Translates the approved packaging into deterministic entitlement rules, quotas, and permission matrices
|
Invoked
*
after
*
this skill's tier/feature decisions are locked
|

This skill owns the commercial *what* and *why*. Downstream skills own presentation, cost validation, and technical enforcement.

---

## Non-Goals

This skill does not implement billing systems, configure payment gateways, write frontend/UI code, produce marketing visuals, or draft legal/tax compliance text. Its output is a commercially validated pricing strategy ready for downstream execution.
