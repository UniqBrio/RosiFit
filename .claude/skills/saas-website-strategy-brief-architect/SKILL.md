---
name: saas-website-strategy-brief-architect
description: Owns the strategic planning phase of a SaaS marketing website — defining business objectives, conversion goals, ICPs, buyer committees, funnel strategy, KPIs, page inventory, and stakeholder alignment — so every downstream sitemap, IA, design, copy, and development decision is strategically justified.
when_to_use: Use at the start of any new SaaS marketing website project, major redesign, or strategic refresh, before any sitemap, wireframe, copywriting, or development work begins.
---

# SaaS Website Strategy Brief Architect

## 1. Overview

This skill owns the strategic planning phase of a public, pre-login SaaS marketing website. It exists to eliminate the single most common and expensive website failure: **building pages before defining what the website is supposed to achieve.**

The output is a **Website Strategy Brief** — a single source of truth that every downstream skill (sitemap, IA, UX, design, copywriting, SEO, development) consumes without needing to re-litigate strategic questions. It converts business strategy into a website-specific strategy that is measurable, prioritized, and stakeholder-approved.

**Assumed default product context** (override freely for other SaaS products):
- **Product:** UniqBrio — India-first B2B SaaS academy management platform.
- **ICPs:** Arts, sports, dance, music, martial arts academies; coaching institutes; training centers.
- **Stack (informs feasibility, not strategy):** React Native Expo PWA, Next.js, Supabase, PostgreSQL, Edge Functions, Vercel.
- **Scope:** Public, pre-login marketing website only. Excludes in-app/post-login product experience.
- **Core business outcomes:** free signups, demo bookings, paid subscriptions, qualified inbound leads, brand trust, organic discovery.

## 2. Purpose

Define **WHAT** the website must accomplish before anyone decides navigation, sitemap, page hierarchy, layout, design, branding, messaging, copywriting, visual assets, or development.

This skill aligns the strategic chain:

Business Strategy
↓
Website Strategy
↓
Marketing Strategy
↓
Customer Journey
↓
Website Architecture
↓
Page Strategy
↓
Content Strategy
↓
Design
↓
Implementation

Never reverse this order. Every layer below must be traceable to a decision made above it.

## 3. Core Philosophy

> **Never design pages before agreeing on strategy.**
> **Never write copy before agreeing on goals.**
> **Never build navigation before understanding buyer journeys.**
> **Never create page inventories without conversion priorities.**
> **Every page must exist because it contributes to a measurable business outcome.**
> **Every website decision must be justified strategically — "because it looks good" is not a justification.**

A website is not a collection of pages. It is a measurable business system. Every CTA supports a defined conversion; every navigation choice supports buyer progression; every content decision supports education, trust, or persuasion at the correct funnel stage.

## 4. Responsibilities

This skill SHALL:
- Facilitate business-understanding discovery: goals, product maturity, competitive position, growth targets.
- Define primary, secondary, and micro/macro conversion goals aligned to business outcomes.
- Build detailed ICP profiles (primary, secondary, future, negative) and firmographic/behavioral characteristics.
- Map the full buyer committee, their goals, pains, questions, and decision criteria.
- Map website content and CTAs to customer awareness stages and full funnel stages.
- Define the KPI framework, formulas, benchmarks, and success targets.
- Build a prioritized page inventory with explicit business/user/conversion justification for every page.
- Run stakeholder alignment sessions and produce a formal sign-off package.
- Document strategic risks, open assumptions, and a decision log.
- Produce reusable templates/worksheets for ongoing governance.

## 5. Non-Responsibilities

This skill does **NOT**:
- Create sitemaps or information architecture → `saas-website-sitemap-architect`.
- Map detailed user flows/funnels beyond the strategic layer → `user-journey-funnel-mapper`.
- Conduct primary market or competitive research → `market-research-specialist`, `competitive-research-specialist`.
- Prioritize product features/roadmap → `feature-prioritization-expert`.
- Design wireframes, UI, or visual assets.
- Write final website copy or messaging.
- Implement analytics, SEO tactics, or code.
- Own post-login product/dashboard strategy.

## 6. Inputs

- Business strategy documents: mission, revenue targets, growth objectives, GTM strategy, pricing.
- Product knowledge: features, differentiators, roadmap, technical constraints.
- Existing customer data: CRM records, interviews, support tickets, win/loss analysis.
- Market and competitive intelligence (existing or supplied by upstream skills).
- Current website analytics, heatmaps, and conversion data (if redesigning).
- Brand guidelines (tone, positioning, visual identity — high level only).
- Stakeholder access: leadership, marketing, sales, product, engineering, legal.

## 7. Outputs & Deliverables

The primary deliverable is the **Website Strategy Brief**, containing:

1. Executive Summary
2. Business Goals Summary
3. Conversion Objectives (primary/secondary/micro/macro)
4. ICP Definitions (primary, secondary, future, negative)
5. Buyer Committee Map
6. Customer Awareness & Funnel Strategy
7. Website KPI Framework & Success Targets
8. Page Inventory & Priority Matrix
9. Stakeholder Approval Checklist
10. Strategic Risks & Open Assumptions
11. Decision Log
12. Implementation Readiness Assessment

Supporting artifacts: Goals Worksheet, ICP Worksheet, Buyer Committee Worksheet, KPI Worksheet, Page Inventory Worksheet, Stakeholder Approval Template, Risk Register.

## 8. Expected Consumers

- `saas-website-sitemap-architect` (IA/sitemap)
- `user-journey-funnel-mapper` (detailed flow mapping)
- UX/UI designers, visual/brand designers
- Copywriters and content strategists
- SEO specialists and analytics architects
- Developers/engineering teams
- Marketing, Sales, Product, and Customer Success leadership
- Executive leadership (sign-off)

## 9. Dependencies

- Access to decision-makers (CEO, CMO, Head of Sales/Product).
- Optional upstream inputs from `market-research-specialist`, `competitive-research-specialist`, and `feature-prioritization-expert`.
- Basic product and customer knowledge; existing analytics if this is a redesign.

## 10. Success Criteria

- 100% relevant-stakeholder sign-off on the brief.
- Every page in the inventory has a documented business, user, and conversion purpose.
- A single, unambiguous primary conversion goal is defined.
- KPIs have baselines, formulas, and targets — not vague aspirations.
- Downstream teams report high confidence executing from the brief alone, without re-opening strategic questions.
- Reduced redesign/rework cycles during IA, design, and copy phases.

## 11. Guiding Principles

1. Strategy before tactics — never execute before strategy is locked.
2. Customer before company — buyer psychology drives structure, not org chart.
3. Problems before features — pain-first, not feature-first, messaging.
4. Outcomes before pages — no page without a measurable job.
5. Measurement before launch — if it can't be measured, it isn't a goal.
6. Trust before conversion — proof precedes the ask.
7. Simplicity before completeness — fewer, sharper CTAs beat comprehensive clutter.
8. Every decision requires a documented justification.

## 12. Why Website Strategy Must Come First

**Before Information Architecture:** Without strategy, navigation reflects internal org structure ("Products / Solutions / Company") instead of buyer thinking, producing poor discoverability and abandoned journeys.

**Before Design:** A beautiful website can still fail. Design amplifies strategy; it cannot replace it. Visual polish on top of an undefined strategy produces a site that looks credible but converts nothing.

**Before Copywriting:** Copy without a strategic position becomes generic, feature-first, and forgettable. "Our platform has 50 features" is not persuasive; "Stop losing 10 hours a week to fee follow-ups" is.

**Before SEO:** Ranking for irrelevant keywords produces vanity traffic with no business impact. SEO must target the ICP's actual awareness-stage questions.

**Before Development:** Building the wrong website faster is still failure — it just fails at higher velocity and cost.

### Common Failure Scenarios & Downstream Impact

| Scenario | Downstream Impact |
|---|---|
| Homepage designed first, with no agreed objective | Endless subjective revision cycles; no way to evaluate "is this good?" |
| Navigation mirrors internal departments | Buyers can't self-navigate to answers; higher bounce, lower trust |
| Every page has an identical, generic CTA | Diluted intent signal, reduced conversion, no funnel-stage nuance |
| Feature-first messaging | No emotional differentiation; commoditized positioning |
| Ten+ CTAs competing on one page | Decision paralysis, lower overall conversion |
| Page inventory built without conversion priorities | Feature bloat; resources spent on low-impact pages |
| Vanity metrics (raw traffic) treated as success | Budget misallocated toward volume instead of qualified pipeline |
| No stakeholder alignment upfront | Late-stage vetoes force rebuilds after design/dev investment |

## 13. Strategic Planning Workflow

A repeatable, end-to-end, phase-gated process:

| Phase | Step | Output |
|---|---|---|
| 1 | Business Understanding — goals, revenue targets, product maturity | Business Goal Summary |
| 2 | Market & Competitive Context — assumptions, differentiation | Market Assumptions |
| 3 | Customer Understanding — ICP draft, buyer committee draft | Initial ICP/Committee |
| 4 | Website Objectives — primary/secondary/micro conversions | Conversion Objectives Framework |
| 5 | ICP & Buyer Committee Finalization | ICP Definition, Buyer Committee Map |
| 6 | Awareness & Funnel Mapping | Customer Journey Map, Funnel Strategy |
| 7 | Conversion & CTA Strategy | CTA Hierarchy, Decision Tree |
| 8 | KPI & Success Metrics Definition | KPI Framework, Success Targets |
| 9 | Page Inventory & Prioritization | Page Inventory, Priority Matrix |
| 10 | Stakeholder Review & Alignment | Feedback, Refinements |
| 11 | Formal Approval | Signed Approval |
| 12 | Output Generation & Handoff | Final Website Strategy Brief |
| 13 | Governance Cadence | Review schedule, change log |

Never skip a phase gate to "save time" — skipped phases are exactly where the failure scenarios above originate.

## 14. Website Goal Framework

### Conversion Hierarchy

- **Primary Conversion Goal:** The single most important action for a high-intent visitor. The website's "North Star." *Example: Free trial signup.*
- **Secondary Conversion Goals:** Supports the primary goal or serves visitors not yet ready for it. *Example: Book a demo, Contact sales.*
- **Micro-Conversions:** Small actions indicating movement down-funnel. *Example: case study view, guide download, ROI calculator use, newsletter signup.*
- **Macro-Conversions:** The ultimate business event. *Example: paid subscription, plan upgrade.*

### Goal Breakdown

| Goal Type | Description | Example (UniqBrio) |
|---|---|---|
| Business Objectives | Ultimate financial/strategic value | $1M qualified pipeline/year |
| Marketing Objectives | Marketing outcomes feeding business goals | 5,000 qualified leads/year |
| Conversion Objectives | Specific measurable actions | 500 free trials/month (primary), 50 demos/month (secondary) |
| Customer Objectives | What the visitor needs to feel satisfied | "I can tell if this fits my academy within 5 minutes" |
| Brand Objectives | Perception to build | "The modern, trustworthy academy platform in India" |
| Lead Generation Objectives | How the site feeds the funnel | Nurture 80% of visitors via email sequences |
| Education Objectives | Knowledge to impart | How automated scheduling/fee collection saves staff hours |
| Trust-Building Objectives | Elements overcoming risk aversion | Customer stories, security certifications, support SLAs |
| Customer Enablement Objectives | Supporting existing customers | Help center, best-practice blog, community |

### Prioritization Model (apply to every proposed goal or page)

1. **Business Value & Impact** — direct revenue/pipeline contribution; strategic alignment.
2. **Customer Journey Fit** — does it match high-intent traffic and move visitors forward?
3. **Feasibility** — implementation cost, measurability, systems readiness.

Use MoSCoW (Must/Should/Could/Won't) or RICE (Reach × Impact × Confidence ÷ Effort) scoring to rank competing goals and pages.

## 15. ICP Framework

### ICP Tiers

- **Primary ICP** — highest-LTV, core target; optimize the website for them by default.
- **Secondary ICP** — valuable but not at the expense of the primary.
- **Future ICP** — the segment to win in 18–24 months; the site shouldn't repel them, but shouldn't be built for them yet.
- **Negative ICP** — poor-fit customers to explicitly avoid or de-emphasize in messaging.

### ICP Characteristics Framework

| Dimension | Questions to Answer | Example (UniqBrio Primary ICP) |
|---|---|---|
| Firmographics | Industry, size, location, revenue | Arts/sports/martial-arts academies, 1–10 branches, Tier 1/2/3 Indian cities |
| Technographics | Current tools | Spreadsheets, WhatsApp, legacy/manual systems |
| Behavioral | Research habits | Searches "automate fee collection for academy," reads blogs, asks in owner Facebook groups |
| Business Maturity | Growth stage, challenges | Scale-up phase; growth outpacing admin capacity |
| Digital Maturity | Tech adoption readiness | Owner willing, staff adoption is the real barrier — needs mobile-first simplicity |
| Budget/Decision Authority | Who approves spend | Owner or admin; budget often under ~₹50k/year; may need spouse/partner approval |
| Pain Points | Top 3 problems | Manual scheduling, manual attendance/fee tracking, poor parent communication |
| Buying Motivations | What drives switching | Time savings, better cash flow, professionalizing the academy |
| Success Metrics | How the customer measures success | Hours saved/week, on-time collection rate, enrollment growth |
| Risk Tolerance | Perceived risks | Data security, switching cost, staff resistance |
| Objections | Top reasons to say no | Price, complexity, "no time to learn new software" |
| Urgency Triggers | What forces action now | Competitor academy winning students via better comms; key staff quitting over admin overload |
| Buying Signals | Observable intent | Demo request, pricing page visits, ROI calculator use |

**Negative ICP examples:** hobbyist single-instructor tutors with <10 students; large universities needing custom enterprise IT/ERP integration.

## 16. Buyer Committee Mapping

| Role | Goals | Pain Points | Key Questions | Trust Requirements | Content Needs | Conversion Expectation |
|---|---|---|---|---|---|---|
| Academy Owner (Economic Buyer) | Grow revenue, professionalize brand | Overworked, losing control of ops | "Will this save 10+ hrs/week? What's the ROI?" | Peer case studies, transparent pricing | ROI calculator, testimonials, video walkthrough | Book a demo |
| Administrator (Champion/User) | Efficient enrollment/scheduling/comms | Manual spreadsheets, WhatsApp overload | "Can I automate fee collection? Will parents like it?" | Responsive support, easy migration | Feature comparison vs. legacy tools | Start free trial |
| Coach/Instructor (End User) | Less admin, simple class management | Hates manual attendance, fears complexity | "Is it easy? Can I use it on my phone?" | Free trial, intuitive mobile UX | Quick-start guide, video tutorials | Start free trial |
| Finance/Operations | Accurate reconciliation, standardized reporting | Manual reconciliation, poor visibility | "How accurate is fee tracking?" | Audit trail, reporting accuracy | Reporting feature pages | Influencer, not direct converter |
| Parents (Influencer) | Transparency, easy communication | Feel uninformed, frustrated by manual payments | "How does this help me? Another app to install?" | Data security, simple parent experience | Parent success stories, portal explainer | Indirect influence on owner's decision |
| Technical Evaluator | Security, integration confidence | Risk of vendor lock-in, data safety | "How is data secured? What integrations exist?" | Security page, compliance docs | Security/privacy documentation | Gatekeeper approval |

## 17. Customer Awareness Framework

| Stage | Visitor's Question | Intent | Appropriate Pages | Expected CTA | Expected Proof |
|---|---|---|---|---|---|
| Unaware | "What even is this category?" | Informational | Blog, problem-education guides | "Read more" / "Download the guide" | Stats on the underlying problem |
| Problem Aware | "I know I need to fix X, but how?" | Informational/Commercial | Checklists, "what to look for" guides | "Get the checklist" | Framework/criteria comparisons |
| Solution Aware | "Should I get UniqBrio or a competitor?" | Commercial | Feature pages, comparisons, integrations | "See features" / "Compare options" | Reviews, competitor comparisons |
| Product Aware | "Is this the right fit for my academy specifically?" | Commercial/Transactional | Industry/use-case pages, pricing, case studies | "Start free trial" / "Book a demo" | Case studies, ROI data, social proof |
| Most Aware | "I'm ready — what's the last step?" | Transactional | Pricing, signup, demo booking | "Start free trial" / "Get started" | Clear pricing, fastest path to action |

## 18. Funnel Strategy

| Funnel Stage | Traffic Source | Website Expectation | Content | CTAs | KPIs |
|---|---|---|---|---|---|
| Awareness | Organic, social, referral | Problem-focused education | Blog, guides, infographics | Soft CTA (subscribe, read more) | Organic traffic, new sessions |
| Consideration | Organic, paid, email, retargeting | Category-validating, trust-building | Comparisons, case studies, webinars | Secondary CTA (download, watch webinar) | Time on site, lead capture rate |
| Evaluation | Branded search, direct, email | Product validation, objection handling | Feature detail, pricing, testimonials | Primary CTA (start trial, book demo) | Signup rate, demo request rate |
| Decision | Direct, branded, retargeting | Frictionless, reassuring conversion path | Pricing, signup flow, demo flow | "Start free trial" / "Get started" | Conversion rate, funnel drop-off |
| Purchase/Activation | Email, in-app | Seamless post-signup value realization | Onboarding checklist, welcome flow | Cross-sell/upsell prompts | Activation rate |
| Expansion | Email, in-app | Premium feature visibility | Advanced case studies, plan comparison | "Upgrade" | Expansion revenue |
| Referral | Word-of-mouth, social | Easy advocacy path | Referral program, community page | "Refer a friend" | Referral traffic |

## 19. Website Conversion Strategy

### CTA Taxonomy

| CTA Type | Intent | Placement | Example |
|---|---|---|---|
| Primary (High-intent) | High | Hero, key product pages | "Start Your Free Trial" |
| Secondary (Med-intent) | Medium | After trust content | "Book a 15-min Demo" |
| Soft (Low-intent) | Low | Blog, educational content | "Subscribe to our Newsletter" |
| Micro (Very low-intent) | Very low | In-content links | "See how scheduling works" |
| Exit-intent | Very high | Exit pop-up | "Get the free ROI guide" |
| Contextual | Variable | Matches page content | On Scheduling page: "See how UniqBrio saves 10 hrs/week" |
| Persistent | Variable | Sticky header/footer | "Start Free Trial" always visible |

### CTA Decision Tree

Is the visitor new/unknown? → Soft or Secondary CTA
Is intent educational? → Soft CTA
Is intent comparative? → Secondary CTA
Is intent transactional? → Primary CTA
What funnel stage is the page?
Top-of-funnel (blog, home) → Soft CTA
Mid-funnel (features, compare) → Secondary CTA
Bottom-funnel (pricing, proof) → Primary CTA

**Best practices:** one dominant primary CTA per page; never mix high-intent and low-intent CTAs with equal visual weight; match CTA copy to the specific value proposition of the page, not a generic "Learn More."

## 20. Success Metrics & KPI Framework

| Category | Metric | Formula | Benchmark (starting point) |
|---|---|---|---|
| Acquisition | Organic traffic | Unique organic sessions | +15% MoM growth target |
| Acquisition | Paid / Direct / Referral traffic | Sessions by channel | Track share of mix |
| Engagement | Bounce rate | Single-page sessions ÷ total sessions | <45–50% |
| Engagement | Pages/session, time on page, scroll depth | — | >3 pages, >60% scroll on key pages |
| Conversion | Visit-to-signup rate | Signups ÷ sessions × 100 | 2–8% (varies by maturity) |
| Conversion | Visit-to-demo rate | Demo bookings ÷ sessions × 100 | 1–2%+ |
| Conversion | Visit-to-contact rate | Contact form submits ÷ sessions × 100 | — |
| Sales | Demo-to-paid, signup-to-paid | Paid conversions ÷ demos or signups × 100 | 10–30%+ |
| Quality | Lead quality (MQL/SQL rate) | Qualified leads ÷ total leads | 60%+ MQL |
| CTA | CTA click-through rate | CTA clicks ÷ page views | >3% |
| Revenue | Pipeline/revenue influence | Revenue tied to website-sourced leads | Track via CRM attribution |
| Business | CAC, LTV | Total acquisition cost ÷ new customers; LTV:CAC ratio | Target 3:1 LTV:CAC |
| SEO/Brand | Branded search volume, keyword rankings | — | Track trend, not absolute |

**Measurement stack:** GA4 + Google Tag Manager for event tracking; CRM integration (e.g., HubSpot/Salesforce) to connect website leads to pipeline/revenue; UTM parameters on all campaigns; funnel/path exploration for drop-off analysis.

## 21. Website Success Targets

| Target Type | Description | Example (UniqBrio) |
|---|---|---|
| Launch targets | Minimum viable success in first 90 days | 500 free trial signups |
| Quarterly targets | Near-term operating targets | 1,000 signups, 50 demos/quarter |
| Annual targets | Tied to company OKRs | 5,000 signups, 250 demos, $500K pipeline influenced |
| Growth targets | Aggressive 12-month stretch goals | 20,000 signups, 1,000 demos, $2M pipeline influenced |
| SEO / Brand targets | Organic visibility and branded search | +30% organic traffic YoY, top-3 ranking for core category terms |

## 22. Page Inventory Framework

Every page must document: **business purpose, user purpose, conversion purpose, priority, dependencies, and owner.** A page with no answer to all six is a candidate for removal.

| Category | Example Pages | Business Purpose |
|---|---|---|
| Core | Home, Platform Overview, About | Establish brand and value proposition |
| Conversion | Pricing, Signup, Demo, Contact | Drive primary/secondary conversions |
| Trust | Testimonials, Case Studies, About, Security | Build credibility, reduce risk |
| Proof | Success stories, awards, certifications | Third-party validation |
| Feature | Scheduling, Payments, Attendance, Reporting | Communicate functional value |
| Industry/Use-case | "For Dance Academies," "For Sports Academies" | Vertical-specific resonance |
| Persona | Owner, Administrator, Coach landing pages | Speak directly to each buyer committee role |
| SEO/Education | Blog, guides, resource hub | Attract top-of-funnel organic traffic |
| Support | Help Center, FAQ | Reduce pre-sale friction and post-sale tickets |
| Company | About, Careers, Press, Partners | Trust and employer/partner branding |
| Legal | Privacy, Terms, Cookies | Compliance and trust |
| Platform | Status, Roadmap, Release Notes, Integrations | Transparency and technical confidence |
| Comparison | vs. Competitor, vs. Spreadsheets | Solution/product-aware conversion support |
| Campaign/Landing | Paid campaign landing pages | Channel-specific conversion optimization |

## 23. Page Priority Sequencing

| Priority | Definition | Example (UniqBrio MVP) |
|---|---|---|
| Must-have (launch blocker) | Required for MVP launch | Home, Pricing, Demo, Signup, Contact, Core Features, Security |
| Should-have | Strongly recommended, not launch-blocking | Industries, Testimonials, Integrations, Case Studies |
| Nice-to-have | Adds value once core is stable | Comparison pages, extended blog library |
| Future | Deferred to growth/enterprise stage | Partner portal, marketplace, developer docs, community |

Sequence by product/company stage: **MVP** (conversion core only) → **Growth** (trust + SEO + industry depth) → **Enterprise** (integrations, security depth, partner ecosystem).

## 24. Stakeholder Alignment

| Stakeholder | Approval Focus |
|---|---|
| Executive/Leadership | Business goal alignment, ROI expectations, risk acceptance |
| Marketing | ICP accuracy, funnel coverage, brand consistency |
| Sales | Lead quality definition, demo flow, qualification criteria |
| Customer Success | Retention/enablement content accuracy |
| Product | Positioning and feature accuracy |
| Engineering | Technical feasibility of tracking/architecture implications |
| Design | Strategy completeness sufficient to start design |
| Legal | Privacy, compliance, and trust-page accuracy |
| SEO | Content/keyword opportunity alignment |
| Analytics | KPI instrumentation feasibility |
| Operations | Page ownership and maintenance plan |

Formalize with a **Stakeholder Approval Checklist** (name, role, approval status, date, conditions) before handoff to design/development.

## 25. Strategic Risks

- Wrong or poorly validated ICP.
- Too many competing CTAs causing decision paralysis.
- Conflicting objectives across departments (e.g., Sales wants demos, Marketing wants signups, with no arbitration).
- Undefined or unmeasurable success criteria.
- Missing stakeholders discovered late, forcing rework.
- Feature-first messaging instead of pain/outcome-first.
- Ignoring awareness/funnel stage when assigning content.
- Weak differentiation and lack of positioning.
- Vanity metrics (raw traffic) mistaken for business impact.
- Poor page prioritization leading to scope creep or an MVP that never ships.

## 26. Best Practices & Anti-Patterns

**Do:**
- Tie every recommendation to a measurable business/revenue outcome.
- Validate ICP and objections with real customer data (interviews, support tickets, CRM).
- Prioritize ruthlessly — a shorter, sharper MVP outperforms a bloated launch.
- Document every assumption explicitly, with a plan to validate it.
- Secure sign-off before design begins, not after.

**Don't:**
- Assume "everyone" is the target audience.
- Add a page without a documented purpose and owner.
- Set goals that can't be measured with existing or planned tooling.
- Duplicate the same generic CTA on every page regardless of funnel stage.
- Let design or engineering preferences override strategic prioritization.

**Anti-patterns:**
- Homepage that tries to explain everything to everyone.
- Navigation that mirrors the org chart instead of buyer mental models.
- Every page carrying every possible CTA "just in case."
- SEO content produced without tying to a business goal.
- Treating a competitor's site as the strategy instead of independent ICP-driven reasoning.

**Governance cadence:** Review the brief quarterly, after major product launches, after pricing changes, and before any redesign. Maintain a versioned change log.

## 27. Cross-References & Handoffs

| Skill | Exchange |
|---|---|
| `saas-website-sitemap-architect` | **Provides:** page inventory, priorities, conversion goals, funnel mapping. **Consumes:** produces IA/sitemap. |
| `user-journey-funnel-mapper` | **Provides:** goals, ICPs, awareness stages, buyer committee. **Consumes:** produces detailed flow diagrams. |
| `market-research-specialist` | **Provides:** ICP validation needs. **Consumes:** market intelligence, trends. |
| `competitive-research-specialist` | **Provides:** differentiation questions. **Consumes:** competitor positioning, gaps. |
| `feature-prioritization-expert` | **Provides:** business/roadmap context. **Consumes:** feature priorities feeding messaging. |

## 28. Checklists

**Website Strategy Readiness**
- [ ] Business goals documented and agreed
- [ ] ICP profiles (primary/secondary/negative) complete
- [ ] Buyer committee mapped
- [ ] Primary conversion goal agreed by all stakeholders
- [ ] KPIs defined with baselines and targets
- [ ] Page inventory drafted with priorities
- [ ] Risks and assumptions logged

**Conversion Checklist**
- [ ] One dominant primary CTA identified
- [ ] Secondary/soft/micro CTAs mapped to funnel stages
- [ ] CTA decision tree applied per page type

**ICP Checklist**
- [ ] Primary, secondary, future, and negative ICPs defined
- [ ] Pain points and objections documented with evidence

**KPI Checklist**
- [ ] Formulas documented
- [ ] Measurement tooling identified (GA4, CRM, UTM)
- [ ] Targets set for launch, quarterly, annual horizons

**Page Inventory Checklist**
- [ ] Every page has business/user/conversion purpose, owner, and priority

**Executive Approval Checklist**
- [ ] Objectives, risks, timeline, and ownership signed off

**Launch Readiness Checklist**
- [ ] Strategy approved → IA in progress → copy/design/analytics briefed

## 29. Templates

**Website Strategy Brief Template:** Executive Summary → Business Context → Objectives → ICP → Buyer Committee → Funnel → KPIs → Page Inventory → Risks → Stakeholder Approvals.

**Goals Worksheet:** Business Goal | Website Goal | Success Metric | Owner | Priority | Deadline

**ICP Worksheet:** Industry | Size | Revenue | Pain Points | Buying Signals | Objections | Budget | Decision Process

**Buyer Committee Worksheet:** Role | Goals | Pain | Questions | Required Proof | CTA | Decision Influence

**KPI Worksheet:** Metric | Formula | Baseline | Target | Owner | Frequency

**Page Inventory Worksheet:** Page | Purpose | Audience | Funnel Stage | CTA | Owner | Priority | Dependencies

**Stakeholder Approval Template:** Stakeholder | Approval Focus | Status | Date | Conditions

**Decision Log:** Decision | Reason | Owner | Impact | Date | Alternatives Considered

**Risk Register:** Risk | Probability | Impact | Mitigation | Owner | Status

## 30. Worked Example: UniqBrio

**Business Goals:** Achieve 500 paid subscribers in Year 1, driven primarily by inbound website acquisition; establish category authority for academy management software in India.

**Primary ICP:** Owners of arts/sports/dance/music/martial-arts academies with 1–10 branches, 10–25 staff, currently managing operations via spreadsheets and WhatsApp, growing but administratively overloaded.

**Primary Conversion:** Free trial signup (PWA).
**Secondary Conversions:** Book a demo, contact sales, download a buyer/ROI guide.

**Reasoning:** Academy owners are price-sensitive and self-serve-oriented but the buying decision often benefits from a guided demo before commitment — so the site supports both a low-friction self-serve path (signup) and a higher-touch path (demo) rather than forcing one.

**Key KPIs:** Visit-to-signup rate ≥4%, visit-to-demo rate ≥1.5%, signup-to-paid ≥12%, organic traffic +25% YoY, bounce rate <45%.

**MVP Page Inventory (must-have):** Home, Platform Overview, Pricing, Demo Booking, Free Signup, Contact, Core Feature pages (Scheduling, Payments, Communication), Security, About, Testimonials, Privacy, Terms.

**Should-have (Growth stage):** Industry pages (per academy type), Case Studies, Integrations, Blog/Resource Hub, Comparison pages.

**Future:** Partner program, community, developer docs, regional/franchise pages.

**Stakeholder Approvals Required:** Founder/CEO (business goals), Marketing (ICP/funnel), Sales (lead quality/demo flow), Product (feature accuracy), Design (readiness to start), Legal (privacy/security pages).

**Expected Outcomes:** Higher-quality inbound traffic, increased demo requests, stronger buyer trust through India-specific proof (local testimonials, security assurances), reduced CAC through organic discovery, and materially fewer strategy-driven revisions during design and development.

## 31. Final Principle

A SaaS marketing website should never begin with pages. It should begin with purpose. When strategy is correct, architecture becomes logical, messaging becomes persuasive, design becomes intentional, and implementation becomes efficient — turning the website into a measurable growth engine rather than a collection of webpages.
