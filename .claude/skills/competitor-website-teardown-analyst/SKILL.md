---
name: competitor-website-teardown-analyst
description: Performs deep structural teardowns of 5-10 competitor and adjacent-category SaaS websites to extract reusable website architecture, IA, navigation, messaging hierarchy, CTA, conversion, pricing-presentation, trust-signal, and CRO patterns, then converts them into an evidence-based reusable pattern library and prioritized recommendations for UniqBrio's pre-login marketing website — explicitly NOT a feature-by-feature product comparison.
when_to_use: Trigger this skill whenever planning a new marketing website, redesigning UniqBrio's public pre-login site, or benchmarking website structure/messaging/CRO mechanics against 5-10 competitor or adjacent-category SaaS sites before design or copy work begins.
---

# Competitor Website Teardown Analyst

## 1. Purpose

This skill performs systematic, evidence-based teardowns of competitor and adjacent-category SaaS websites to extract **website intelligence** — reusable patterns in structure, information architecture (IA), navigation, messaging hierarchy, positioning, CTAs, conversion mechanics, pricing presentation, trust-building, proof mechanisms, lead capture, demo/trial funnels, content strategy, UX, and CRO tactics.

**What this skill DOES:**
- Tears down 5–10 competitor/adjacent SaaS websites, page by page.
- Documents IA, navigation, message hierarchy, CTAs, pricing display, trust signals, and conversion mechanics with evidence (observed elements, not opinion).
- Extracts *why* a pattern works, *when* to copy it, and *when to avoid it*.
- Synthesizes cross-site findings into a reusable pattern library and a prioritized, actionable recommendation set for UniqBrio's marketing website.

**What this skill does NOT do:**
- It does **not** perform feature-by-feature product/functionality comparison (that belongs to `competitive-research-specialist`).
- It does **not** audit backend technology, product roadmaps, or in-app/post-login UX.
- It does **not** produce final visual designs, hero copy, or a finished pricing page (those are downstream skills — see Cross-References).
- It does **not** make financial, fundraising, or market-sizing judgments.
- It does **not** reproduce competitor copy verbatim — see Attribution Guidance.

**Core distinction:** This is a **website teardown**, not a product teardown. Every finding must map to something observable on the public, pre-login marketing site — a page, a section, a CTA, a pricing table, a trust badge — never an internal feature capability.

## 2. Inputs

The skill works with partial inputs and applies sensible defaults (documented below) rather than blocking on missing data.

|
Input
|
Description
|
Default if Missing
|
|
---
|
---
|
---
|
|
Competitor names
|
Direct + adjacent-category brands
|
Infer 5–10 from category context (academy/studio/class management SaaS)
|
|
Website URLs
|
Public marketing site root URL per competitor
|
Use best-known canonical domain
|
|
Target audience
|
Arts/sports academy owners, dance/music schools, coaching academies, training institutes, SMB owners
|
UniqBrio's stated ICP
|
|
Industry / adjacent categories
|
Academy management, studio/membership management, scheduling SaaS, education-ops SaaS, fitness-studio SaaS
|
Use adjacent categories to widen the pattern pool
|
|
Research goals
|
e.g., improve homepage clarity, fix pricing page, raise trust
|
Default to UniqBrio's 7 website goals (below)
|
|
Number of competitors
|
5–10
|
6–8
|
|
Known strong/weak competitors
|
Named examples of "gold standard" or "cautionary" sites
|
Flag during discovery
|
|
Website redesign goals
|
Reduce friction, clarify messaging, improve conversion
|
Same as research goals default
|
|
Existing sitemap / IA
|
Current UniqBrio site structure
|
Treat as "current state" baseline for gap analysis
|
|
Business stage
|
Early-stage bootstrapped, part-time 2-person team
|
Assume lean, low-maintenance, high-leverage patterns are preferred over complex/expensive ones
|
|
Brand positioning
|
India-first, Tier 2/3 city academy owners, trust + simplicity
|
Apply throughout pattern filtering
|
|
Conversion goals
|
Demo bookings, trial signups, paid subscriptions
|
Primary KPI lens for all recommendations
|
|
Accessibility/compliance needs
|
WCAG 2.1 AA, DPDP Act 2023
|
Flag if observed pattern conflicts
|

**UniqBrio's 7 Website Goals (used as the evaluation lens for every finding):**
1. Increase demo bookings
2. Increase free trial signups
3. Increase paid subscriptions
4. Improve visitor trust
5. Improve conversion rate
6. Reduce friction
7. Improve messaging clarity

## 3. Outputs

A complete teardown produces the following deliverables:

1. **Executive Summary** — top 5–10 insights, highest-leverage opportunities, and a one-paragraph synthesis per competitor.
2. **Website Inventory** — every analyzed site, URL, audience, and one-line positioning.
3. **Page Inventory** — full page list per competitor (Homepage, Features, Solutions, Industries, Pricing, Product, About, Resources, Blog, Customers, Case Studies, Testimonials, Careers, Contact, FAQ, Help Center, Security, Compliance, Integrations, Docs, API, Legal, Footer).
4. **Navigation Analysis** — top nav, mega menu, footer, utility nav, breadcrumbs, search, page depth.
5. **Homepage Decomposition** — section-by-section teardown using the Homepage Analysis Framework.
6. **Message Hierarchy** — layered first/second/third message extraction per site.
7. **CTA Inventory** — every CTA variant, wording, placement, and funnel stage.
8. **Pricing Comparison** — tier structure, naming, feature gating, billing psychology.
9. **Trust Signal Inventory** — proof elements catalogued and scored for relevance to Indian SMB academy owners.
10. **Conversion Mechanic Catalog** — every lead-capture and conversion system observed.
11. **Content & Resource Strategy** — blog/resource/SEO cluster analysis.
12. **Comparison Matrix** — cross-site, filled-in template (see §13).
13. **Reusable Pattern Library** — categorized, reusable patterns with adaptation guidance (see §14).
14. **Anti-Pattern Log** — mistakes observed and why they hurt conversion (see §15).
15. **Recommendations** — Adopt / Adapt / Avoid / Experiment / Future, scored by impact × effort (see §16).
16. **Implementation Priorities & Action Plan** — phased roadmap with quick wins first.
17. **Decision Log** — assumption, evidence, rationale, and status per decision.

All outputs are Markdown-first (tables + structured headings), optionally exportable as CSV (inventories/matrices) or JSON (pattern library) for downstream tooling.

## 4. Website Teardown Methodology

A repeatable 14-step process, applied per competitor and then across the full set.

**Step 1 — Website Discovery**
Identify 5–10 direct competitors and adjacent-category players. Capture first-impression notes: tone, visual design, obvious positioning. Balance market leaders with fast-growing challengers so patterns aren't biased toward one company's idiosyncrasies.

**Step 2 — Site Crawl**
Manually traverse the entire public, pre-login site — do not rely solely on automated crawlers, since dynamic content and anti-scraping measures can hide real structure. Visit every page type in scope. Build a sitemap skeleton and canonical page list.

**Step 3 — Navigation Mapping**
Document top nav, mega menus, dropdowns, footer groups, utility nav (login/signup/language), secondary nav, breadcrumbs, search, page depth, internal linking density, content grouping, and naming conventions (benefit-led vs. feature-led labels).

**Step 4 — Homepage Decomposition**
Apply the Homepage Analysis Framework (§5) section by section. Screenshot or note each section's copy, layout, and visual weight.

**Step 5 — Message Hierarchy Extraction**
Apply the Message Hierarchy Template (§6) to homepage and top landing pages: first/second/third message, primary promise, pain point, aspiration, tone, proof, objection handling, closing message.

**Step 6 — CTA Analysis**
Catalog every CTA using the framework in §8: type, wording, color/contrast, placement, frequency, page context, expected user intent, funnel stage.

**Step 7 — Pricing Analysis**
Apply the Pricing Page Framework (§10): layout, tiers, naming, feature gating, billing toggle psychology, guarantees, objection handling, CTA placement.

**Step 8 — Trust Signal Extraction**
Inventory every proof element (§11): logos, certifications, testimonials, metrics, security/compliance badges, founder story, community signals.

**Step 9 — Lead Capture Analysis**
Map every lead-capture and demo/trial mechanism (§9): forms, chat, calendars, calculators, exit-intent, gated content, progressive disclosure, multi-step forms.

**Step 10 — Content Strategy Analysis**
Evaluate blog, resource hub, guides, case studies, webinars, docs, knowledge base, SEO clusters, internal linking, lead magnets, topic authority, and evergreen content depth (§12).

**Step 11 — Conversion Path Mapping**
Trace 2–3 realistic user journeys per competitor (e.g., small dance-studio owner researching software → homepage → pricing → demo request). Identify friction points, drop-off risks, and moments of delight.

**Step 12 — Cross-Site Comparison**
Populate the Comparison Matrix (§13). Look for convergent patterns (used by 4+ sites = likely a category norm) vs. outlier/differentiating moves.

**Step 13 — Pattern Extraction**
Build the Reusable Pattern Library (§14): for every recurring or notably effective element, document purpose, examples, when it works/fails, and adaptation guidance for UniqBrio.

**Step 14 — Recommendations**
Synthesize into Adopt / Adapt / Avoid / Experiment / Future-consideration buckets, each scored by impact and effort, and sequenced into an implementation roadmap (§16).

**Optional Step 15 — Knowledge Transfer & Handoff**
Package outputs for consumption by the related skills listed in §18, with clear notes on which findings belong to which downstream skill.

## 5. Homepage Analysis Framework

Evaluate each homepage section using this structure. For every section, capture: **Purpose · Questions to Ask · Evaluation Criteria · Common Strengths · Common Weaknesses · Reusable Ideas.**

|
Section
|
Purpose
|
Key Questions
|
Evaluation Criteria
|
Common Strengths
|
Common Weaknesses
|
Reusable Ideas
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
---
|
|
**
Hero (headline)
**
|
Capture attention, state core value in seconds
|
Is the value prop clear in 3–5 seconds? Who is it for?
|
Clarity, specificity, benefit-orientation
|
Benefit-driven, <10-word headline
|
Vague/generic ("The Best Software")
|
Outcome-first formula: "[Audience] can [outcome] without [pain]"
|
|
**
Subheadline
**
|
Elaborate the mechanism
|
Does it explain
*
how
*
the promise is delivered?
|
Complements H1, adds specificity
|
Explains the "how" concisely
|
Repeats the headline
|
One-sentence mechanism explainer
|
|
**
Primary CTA
**
|
Drive the main conversion action
|
Is the next step obvious?
|
Contrast, action wording, placement above the fold
|
Action + value copy ("Start Free Trial")
|
Generic "Submit"/"Learn More", low contrast
|
Verb + outcome CTA copy
|
|
**
Secondary CTA
**
|
Capture hesitant visitors
|
Is there a lower-friction option?
|
Distinct from primary, low commitment
|
"Watch Demo" / "See Pricing"
|
Missing entirely, or competes visually with primary
|
Pair one high-intent + one low-intent CTA
|
|
**
Hero media
**
|
Visualize product or outcome
|
Does it show the real product or the result?
|
Relevance, load speed, mobile rendering
|
Annotated UI screenshot or short looped clip
|
Generic stock photography
|
Real (blurred/sample) product screenshot
|
|
**
Problem statement
**
|
Build empathy, agitate the pain
|
Does the visitor feel understood?
|
Specificity, relatability, accuracy
|
Names a concrete pain ("chasing fee payments on WhatsApp")
|
Generic platitudes
|
Domain-specific pain naming
|
|
**
Value proposition
**
|
State the core benefit
|
Why should they care right now?
|
Uniqueness, clarity, brevity
|
Time/money-saved framing
|
Feature-centric framing
|
Quantified benefit statement
|
|
**
Differentiators
**
|
Separate from alternatives
|
Why this over competitor X?
|
Concreteness, local relevance
|
Localized proof (e.g., India-first support/pricing)
|
"Best-in-class" fluff with no substance
|
Anchor differentiation in audience-specific reality
|
|
**
Feature overview
**
|
Summarize capabilities
|
Are features tied to benefits, not just named?
|
Scannability, benefit-linkage
|
Icon + benefit + one sentence
|
Long undifferentiated bullet dumps
|
Benefit-led feature grid (3–6 items)
|
|
**
Social proof / logos
**
|
Build immediate credibility
|
Would this audience recognize these names?
|
Relevance to ICP, visual consistency
|
Uniform grayscale logo bar of relevant customers
|
Irrelevant, oversized, or inconsistent logos
|
"Trusted by N academies across [region]"
|
|
**
Testimonials
**
|
Peer validation
|
Is it specific and attributable?
|
Name, role, academy, concrete result
|
Quotes with named metric ("cut fee-collection time by 60%")
|
Anonymous or vague praise
|
Photo + name + academy + specific result
|
|
**
Statistics / metrics
**
|
Quantify value at a glance
|
Is the number specific and believable?
|
Precision, relevance
|
"10,000+ students managed"
|
Vague "many users"
|
Bold stat blocks tied to audience outcomes
|
|
**
Process explanation
**
|
Demystify onboarding
|
Is it simple enough to scan in seconds?
|
3-step clarity
|
"Sign up → Import students → Automate fees"
|
Complex technical diagrams
|
Numbered 3-step visual flow
|
|
**
Benefits section
**
|
Emotional + functional payoff
|
How does the owner's life improve?
|
Emotional resonance + functional clarity
|
"Spend more time teaching, less on admin"
|
Feature list disguised as benefits
|
Pair emotional + functional benefit per item
|
|
**
Pricing teaser
**
|
Set expectations, reduce anxiety
|
Is a starting price or "free" visible?
|
Transparency
|
Visible starting price or free-tier mention
|
Hidden pricing, "Contact us" only
|
Simple 3-tier visual preview with entry price
|
|
**
FAQ
**
|
Preempt objections
|
Does it answer the top 3–5 real concerns?
|
Relevance, clarity, brevity
|
Addresses pricing/migration/data-safety
|
Only trivial questions
|
Accordion FAQ targeting known objections
|
|
**
Resources teaser
**
|
Establish authority
|
Is there a path to deeper research?
|
Quality, discoverability
|
Links to a genuinely useful guide/case study
|
Broken or decorative links
|
Contextual resource link near relevant section
|
|
**
Footer
**
|
Comprehensive fallback navigation
|
Can visitors find legal, contact, and sitemap info?
|
Organization, completeness
|
Clear grouped columns + social + legal
|
Cluttered, missing key links
|
Grouped footer: Product / Resources / Company / Legal
|
|
**
Exit CTA
**
|
Final conversion attempt
|
Is there a last, low-friction offer?
|
Relevance, non-intrusiveness
|
Offers a resource or reiterates trial CTA
|
Aggressive, irrelevant, or immediate popup
|
Exit-intent offering a free checklist/guide
|

## 6. Message Hierarchy Extraction Template

Apply per competitor to the homepage and key landing pages:

|
Element
|
What to Capture
|
Example
|
|
---
|
---
|
---
|
|
First message (H1)
|
The immediate hook/promise
|
"The all-in-one platform for dance & sports academies"
|
|
Second message (subhead)
|
Supporting tagline/mechanism
|
"Automate attendance, fees, and parent communication"
|
|
Third message
|
Secondary value prop or proof
|
"Trusted by 500+ academies across India"
|
|
Primary promise
|
The core outcome delivered
|
"Grow your academy without the admin chaos"
|
|
Primary pain point
|
The key problem being solved
|
"Stop chasing fee payments on WhatsApp"
|
|
Primary aspiration
|
What the owner wants to become
|
"Run a professional, modern academy"
|
|
Audience assumptions
|
Who the copy assumes is reading
|
Tier 2/3 city academy owner, non-technical
|
|
Tone
|
Emotional register
|
Warm, confident, supportive vs. corporate/clinical
|
|
Emotional appeals
|
Feelings invoked
|
Relief, pride, confidence, belonging
|
|
Functional appeals
|
Practical/logical benefits
|
Time saved, revenue recovered, error reduction
|
|
Differentiators
|
Stated uniqueness
|
Local-language support, India-first pricing
|
|
Supporting proof
|
Evidence backing claims
|
Testimonials, stats, logos, case studies
|
|
Risk reduction
|
Anxiety-lowering language
|
"No credit card required", "Cancel anytime"
|
|
Urgency
|
Time-based pressure
|
"Start your free trial today"
|
|
Scarcity
|
Availability-based pressure
|
"Limited onboarding slots this month"
|
|
Objection handling
|
Preemptive rebuttals
|
"Free data migration", "24/7 WhatsApp support"
|
|
Closing message
|
Final CTA framing
|
"Start your 14-day free trial — no card needed"
|

## 7. Navigation Analysis Framework

|
Element
|
What to Document
|
|
---
|
---
|
|
Top navigation
|
Primary menu items and their order/grouping
|
|
Mega menu
|
Presence, column structure, organization quality
|
|
Dropdowns
|
Sub-items per top-level category
|
|
Footer navigation
|
Grouping (Product / Resources / Company / Legal / Help)
|
|
Utility navigation
|
Login, signup, language switcher, account, support — placement
|
|
Secondary navigation
|
Sidebars or in-page nav on inner pages
|
|
Breadcrumbs
|
Presence and depth shown (e.g., Home > Features > Scheduling)
|
|
Search
|
Presence, placement, result quality
|
|
Page depth
|
Clicks required to reach the deepest relevant page (target: ≤3)
|
|
Internal linking
|
Density and pattern of cross-links between content types
|
|
Hierarchy / content grouping
|
By feature, by industry/audience, or by user type
|
|
Naming conventions
|
Benefit-led ("Grow Your Academy") vs. feature-led ("Modules") labels
|
|
Mobile navigation
|
Hamburger vs. bottom nav; parity with desktop IA
|

## 8. CTA Analysis & Catalog

Catalog every CTA type observed, with these attributes: **Type · Page · Wording · Color/Contrast · Placement · Frequency · Page Context · Expected User Intent · Funnel Stage.**

CTA types to track: Primary, Secondary, Sticky, Floating, Header, Footer, Inline, Pricing, Exit, Resource, Newsletter, Contact, Demo, Trial.

|
CTA Type
|
Typical Wording Pattern
|
Placement
|
Funnel Stage
|
Notes
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
Primary (hero)
|
"Start Free Trial" / "Book a Demo"
|
Hero, above fold
|
Top of funnel
|
Highest contrast, single dominant action
|
|
Secondary (hero)
|
"Watch Demo" / "See Pricing"
|
Next to primary, lower contrast
|
Top of funnel
|
Low-commitment alternative
|
|
Sticky/floating
|
"Get Started"
|
Persistent header/corner while scrolling
|
Mid-funnel
|
Should not obstruct content on mobile
|
|
Header (global)
|
"Sign Up" / "Login"
|
Top-right, every page
|
All stages
|
Consistent across the site
|
|
Pricing CTA
|
"Choose Plan" / "Start with Pro"
|
Within each pricing tier
|
Bottom of funnel
|
Tied to specific plan
|
|
Exit CTA
|
"Wait — get our free checklist"
|
Exit-intent modal or page bottom
|
Any stage
|
Should offer value, not just repeat the ask
|
|
Resource/newsletter CTA
|
"Download the Guide" / "Subscribe"
|
End of blog/resource content
|
Mid-funnel
|
Lead-capture, lower intent
|
|
Demo/Trial CTA
|
"Book a Demo" / "Start 14-Day Trial"
|
Feature pages, pricing page
|
Mid–bottom funnel
|
Should state time/effort required
|

**Evaluate for each:** button wording strength, color/contrast usage, placement logic, frequency (too many competing CTAs is a common failure), and whether copy matches the visitor's likely intent at that funnel stage.

## 9. Conversion Mechanics Catalog

Document every conversion/lead-capture system observed:

- **High-intent mechanics:** demo booking (calendar widgets), trial signup (with/without credit card), pricing calculators, ROI/cost-savings calculators, product tours, interactive demos.
- **Mid-intent mechanics:** lead forms, gated guides/templates/downloads, webinars, comparison pages, customer story pages, email capture, live chat/chatbot.
- **Friction reducers:** progressive disclosure, multi-step forms (breaking a long form into short steps), "no credit card required," free migration/onboarding assistance, money-back guarantees, transparent cancellation policy.
- **Retention/return mechanics:** exit-intent popups offering value (not just a discount), newsletter capture, retargeting-friendly content.

For each mechanic, record: page found, description, user intent, funnel stage, friction level (low/medium/high), and observed effectiveness signals (e.g., prominence, repetition across multiple competitors).

## 10. Pricing Page Framework

|
Element
|
What to Document
|
|
---
|
---
|
|
Layout
|
Cards vs. table; number of visible tiers (typically 3–4)
|
|
Tier naming
|
e.g., Starter/Pro/Enterprise vs. Basic/Growth/Scale — does naming convey value?
|
|
Feature comparison
|
Table clarity, checkmark usage, feature grouping
|
|
Recommended plan
|
"Most Popular" / "Best Value" highlighting and visual weight
|
|
Visual hierarchy
|
Color, size, spacing used to guide the eye to the target plan
|
|
Billing frequency
|
Monthly vs. annual toggle; annual discount % shown
|
|
Free trial / free plan
|
Duration, feature limits, credit-card requirement
|
|
Enterprise/contact tier
|
Custom-quote pattern for large accounts
|
|
Usage metrics & limits
|
Students, branches, staff, storage, messages — what's metered
|
|
Add-ons
|
Upsell items priced separately (e.g., WhatsApp credits, extra branches)
|
|
Support tiers
|
What support level is bundled per plan
|
|
Guarantees
|
Money-back, cancel-anytime, uptime SLA
|
|
Trust builders on pricing
|
Logos, testimonials, or stats placed near the price
|
|
Objection handling
|
FAQ addressing billing, migration, data ownership
|
|
Purchase flow
|
Click → signup → payment steps and friction
|
|
CTA placement
|
Above/below each tier; wording per tier
|
|
Upgrade/expansion messaging
|
How moving to a higher tier or adding seats is framed
|

## 11. Trust Signal Inventory

|
Category
|
Examples to Catalog
|
Relevance Test for UniqBrio's Audience
|
|
---
|
---
|
---
|
|
Customer proof
|
Logos, counts ("500+ academies"), testimonials, case studies
|
Are examples recognizable to Tier 2/3 Indian academy owners?
|
|
Certifications & compliance
|
ISO, SOC 2, GDPR/DPDP mentions, payment security badges
|
Locally relevant compliance (e.g., DPDP Act 2023) carries more weight than foreign certifications alone
|
|
Ratings & reviews
|
G2/Capterra scores, app-store ratings
|
Credible third-party validation
|
|
Metrics
|
Years in business, customers served, countries, uptime %
|
Specific and verifiable beats vague claims
|
|
Security & privacy
|
Encryption statements, data-handling policy links
|
Should be visible near signup/payment, not buried
|
|
Guarantees
|
Money-back, free migration, cancel-anytime
|
Directly reduces switching risk for SMB owners
|
|
Founder/team story
|
Founder narrative, team bios, mission statement
|
Builds trust for a bootstrapped, relationship-driven ICP
|
|
Community & ecosystem
|
Integrations, partner logos, events, community size
|
Signals staying power and interoperability
|
|
Awards/media mentions
|
Press logos, award badges
|
Lower priority for this ICP unless locally recognized
|

## 12. Content Strategy Analysis

Evaluate: blog cadence and relevance, resource/learning hub structure, guides/templates/downloads, case studies, webinars/videos/podcasts, documentation/knowledge base depth, SEO topic clusters and internal linking, lead-magnet gating strategy, topic authority (does the site "own" a specific problem space?), and evergreen vs. time-bound content mix. Note which content types are gated (email required) vs. open, and whether gating matches the content's perceived value.

## 13. Comparison Matrix Template

|
Competitor
|
Target Audience
|
Homepage Structure
|
Hero Strength
|
Primary/Secondary CTA
|
Navigation
|
Pricing Clarity
|
Trust Signals
|
Lead Capture
|
Content Strategy
|
Demo/Signup Flow
|
Strengths
|
Weaknesses
|
Unique Idea
|
Reusable Idea
|
Avoid
|
Priority for UniqBrio
|
Notes
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
*
(one row per competitor)
*
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|
|

Populate one row per analyzed site; use High/Medium/Low or 1–10 scoring for qualitative columns (Hero Strength, Pricing Clarity) to keep the matrix comparable.

## 14. Reusable Pattern Library

Categorize every extracted pattern under: Homepage, Navigation, Hero, Messaging, Pricing, Proof/Trust, CTAs, Forms, Footer, Resources, Comparison pages, Product pages, About pages, Feature pages, Security pages, Blog, Case studies, Visual hierarchy, Typography, Content blocks, Lead generation.

**Pattern entry template:**

- **Pattern name:**
- **Category:**
- **Purpose:** what problem it solves for the visitor or the business
- **Observed examples:** which analyzed sites use it (described generically, not quoted verbatim)
- **When it works:** conditions/audience where it's effective
- **When it fails:** conditions where it backfires
- **Benefits:**
- **Risks:**
- **Recommended adaptation for UniqBrio:** how to apply it to an India-first academy-owner audience
- **Priority:** High / Medium / Low
- **Attribution guidance:** adapt-don't-copy note

**Example entries:**

|
Pattern
|
Category
|
When It Works
|
When It Fails
|
UniqBrio Adaptation
|
Priority
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
Problem-first hero
|
Hero/Messaging
|
Audience has a strong, specific, felt pain
|
Problem is overstated or generic
|
"Tired of chasing fee payments over WhatsApp?"
|
High
|
|
Benefit-led feature grid
|
Homepage
|
Visitor is time-poor and scanning
|
Grid becomes a feature dump without benefit framing
|
4–6 icon+benefit tiles tied to academy outcomes
|
High
|
|
Named recommended pricing tier
|
Pricing
|
3+ tiers exist and one is the intended default
|
Only 1–2 tiers, or all tiers are equally viable
|
Highlight the mid-tier as "Most Academies Choose This"
|
Medium
|
|
Local logo bar
|
Proof/Trust
|
You have 10+ recognizable regional customers
|
Logos are irrelevant or too few (looks sparse)
|
Feature the 10 PROD academies once volume supports it
|
Medium
|
|
Exit-intent value offer
|
CTA/Forms
|
Visitor is engaged but hasn't converted
|
Offer feels like a discount-only ploy
|
Offer a free "Academy Setup Checklist" download
|
Low
|

*(Expand this library iteratively as each new teardown is run — target 15–25+ entries across categories over time.)*

## 15. Anti-Patterns

|
Anti-Pattern
|
Why It Hurts Conversion
|
|
---
|
---
|
|
Overloaded hero
|
Competing messages cause decision paralysis; visitor leaves without acting
|
|
Weak/vague headline
|
Fails the 3-second clarity test; visitor bounces before understanding value
|
|
Too many CTAs
|
Dilutes attention, no clear "next step," lowers primary conversion rate
|
|
Poor/confusing navigation
|
Increases cognitive load, hides key pages (pricing, demo), raises bounce rate
|
|
Hidden pricing
|
Creates distrust and friction, especially for price-sensitive SMB buyers
|
|
Feature dumping
|
Fails to connect capabilities to outcomes; visitor can't self-qualify
|
|
Lack of proof
|
No social validation lowers trust, especially for a new/regional brand
|
|
No differentiation
|
Visitor can't articulate why to choose you over an incumbent
|
|
Long forms
|
Every extra field reduces form-completion rate
|
|
Weak/disorganized footer
|
Missed opportunity for secondary navigation and trust reinforcement
|
|
Poor mobile UX
|
Majority of this ICP researches on mobile; poor mobile UX directly kills conversion
|
|
Missing FAQs
|
Unanswered objections silently end the visit at the point of hesitation
|
|
Missing onboarding clarity
|
Visitor can't picture "day one," increasing perceived risk of switching
|
|
No trust signals near pricing/signup
|
Highest-friction moment lacks the reassurance needed to convert
|

## 16. Recommendations Framework

Group every recommendation into one of these buckets, each scored by **Impact (High/Med/Low) × Effort (High/Med/Low)**:

- **Adopt immediately** — proven pattern, low effort, directly matches a UniqBrio goal
- **Adapt carefully** — proven pattern, but needs localization/brand-fit work before use
- **Avoid** — pattern observed but conflicts with brand values, audience, or is an anti-pattern
- **Experiment** — promising but unproven for this audience; A/B test before full rollout
- **Future consideration** — valuable but blocked by current resourcing (2-person, part-time team) or missing prerequisites (e.g., needs more customer logos first)

Sequence into an **Implementation Roadmap**: Quick Wins (high impact, low effort) → High-Impact/Higher-Effort → Strategic/Experimental, respecting the bootstrapped team's limited weekly hours.

## 17. Attribution Guidance

- Never reproduce competitor copy, layouts, or visual assets verbatim — every finding must be **described generically** (the pattern, not the exact wording/pixels) and then **re-authored** for UniqBrio's voice and audience.
- Synthesize across multiple competitors rather than cloning any single one; the strongest recommendations combine what 3+ sites converge on with what makes UniqBrio distinct (India-first, arts+sports combined, WhatsApp-native, founder-led trust).
- Document the *rationale* for each adaptation (why it fits UniqBrio's ICP and business stage), not just the source pattern.
- Respect licensing/brand guidelines — do not reference or reproduce competitor logos, screenshots, or proprietary assets in final deliverables; describe them in text only.

## 18. Cross-References & Responsibility Boundaries

|
Related Skill
|
Consumes From This Skill
|
Responsibility Boundary
|
|
---
|
---
|
---
|
|
`competitive-research-specialist`
|
N/A (parallel, not downstream)
|
Owns feature-by-feature product/functionality comparison; this skill never does feature comparison — hand off any product-capability observations there
|
|
`saas-website-strategy-brief-architect`
|
Full pattern library, comparison matrix, recommendations
|
Converts this skill's website intelligence into a complete website strategy brief (sitemap, IA, page-by-page brief)
|
|
`hero-section-cro-specialist`
|
Homepage Decomposition + Message Hierarchy outputs
|
Uses these findings to design/optimize UniqBrio's actual hero section copy and layout
|
|
`pricing-page-strategist`
|
Pricing Page Framework findings + Trust Signal Inventory
|
Uses these findings to design UniqBrio's actual pricing page structure and copy
|

**Boundary rule:** This skill stops at *intelligence and recommendations*. It never produces final hero copy, a finished pricing page, or final visual design — those are owned by the downstream skills above.

## 19. Best Practices

- **Evidence over opinion:** every claim must trace to an observable page element; avoid subjective design preferences.
- **Consistency:** apply the same frameworks (§5–§12) identically across every competitor for comparability.
- **Documentation discipline:** note the URL and approximate date of observation for every finding (sites change).
- **Objectivity & bias avoidance:** actively look for counter-examples; don't cherry-pick evidence that confirms an existing assumption.
- **Pattern validation:** treat a pattern as a strong signal only when observed across 3+ sites, or when it's a rare but clearly high-performing outlier — label which case applies.
- **Accessibility & mobile-first:** evaluate every pattern for mobile rendering and basic accessibility (contrast, tap targets, alt text) — this ICP is heavily mobile-first.
- **SEO awareness:** note heading structure, internal linking, and content-cluster patterns without doing full keyword research (that's a separate skill's job).
- **Performance awareness:** flag heavy hero media or scripts that could hurt load time on low-end Android devices common in Tier 2/3 India.
- **Design neutrality:** describe patterns functionally ("recommended-tier highlight") rather than aesthetically ("looks nice") so recommendations survive a visual redesign.
- **Decision documentation:** every recommendation needs a one-line rationale in the Decision Log.
- **Prioritization discipline:** given the 2-person, part-time (3–5 hrs/weekday) team, always sequence recommendations by leverage — cheap, high-impact changes first.

## 20. Deliverables & Templates

Standardized templates to produce for every teardown cycle:

- Executive Summary (1 page)
- Competitor Profile (1 page per site: overview, audience, positioning, snapshot table)
- Website Inventory (table)
- Page Inventory (table, per competitor)
- Navigation Map (per competitor)
- Homepage Teardown (§5 table, per competitor)
- Message Hierarchy (§6 table, per competitor)
- CTA Inventory (§8 table, per competitor)
- Pricing Breakdown (§10 table, per competitor)
- Trust Signal Inventory (§11 table, per competitor)
- Conversion Mechanic Inventory (§9 table, per competitor)
- Content Inventory (§12 notes, per competitor)
- Comparison Matrix (§13, cross-site)
- Reusable Pattern Library (§14, cumulative across all runs)
- Anti-Pattern Log (§15, cumulative)
- Recommendation Report (§16)
- Implementation Roadmap (phased, quick-wins-first)
- Decision Log (assumption → evidence → rationale → status)

## 21. Pre- and Post-Analysis Checklists

**Before starting:**
- [ ] Competitor set includes both direct and adjacent-category sites (5–10 total)
- [ ] UniqBrio's 7 website goals are stated and will be used as the evaluation lens
- [ ] Existing UniqBrio sitemap/IA (if any) is on hand as a baseline

**Before delivering:**
- [ ] Every section in §5–§12 completed for each competitor
- [ ] Comparison Matrix fully populated
- [ ] Pattern Library has entries spanning at least 6 categories
- [ ] Anti-patterns cross-checked against UniqBrio's current site (if applicable)
- [ ] Recommendations scored by impact × effort and sequenced into a roadmap
- [ ] No competitor copy/assets reproduced verbatim anywhere in the output
- [ ] Cross-reference handoff notes included for downstream skills (§18)
