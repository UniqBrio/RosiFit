---
name: cta-strategy-architect
description: Designs and audits a complete, opinionated sitewide call-to-action architecture — hierarchy, page-by-page placement, cadence, sticky behavior, mobile accessibility, and microcopy — that maximizes conversions for B2B SaaS marketing websites while preventing CTA fatigue, banner blindness, and competing conversions, using UniqBrio as the reference implementation.
when_to_use: Use whenever designing, auditing, or optimizing the CTA strategy for an entire SaaS marketing website (or any individual marketing page within one) — especially when the site suffers from competing CTAs, generic microcopy, banner blindness, unclear conversion goals, or aggressive sales pressure.
---

# CTA Strategy Architect

**Domain:** Conversion Rate Optimization · UX Architecture · SaaS Marketing Websites
**Reference Implementation:** UniqBrio — India-first B2B SaaS for Arts & Sports Academy Management (Next.js, React Native Expo PWA, Supabase, PostgreSQL, Edge Functions, Vercel)
**Reusability:** Every framework here is product-agnostic. UniqBrio examples illustrate the pattern; substitute your own product's funnel, audience, and business goals.

---

## Overview

CTA architecture is the invisible nervous system of a conversion-focused website. It is not "button design" — it is the system that decides *what* a visitor is asked to do, *when*, *how often*, *with what visual weight*, and *in what words*, across every page of the site simultaneously.

### Why it matters

- **Reduces decision friction.** Every competing action increases cognitive effort. Visitors who don't immediately know what to do next hesitate, and hesitation kills conversion.
- **Builds momentum.** The Goal Gradient Effect means people accelerate their actions as they perceive progress toward a goal — CTAs should mark that progress, not interrupt it.
- **Enables progressive commitment.** Ask for small yeses before big yeses (Commitment Consistency). A visitor who clicks "Watch Demo" is measurably closer to "Start Free Trial" than one who has done nothing.
- **Balances visibility with trust.** Under-asking leaves revenue on the table; over-asking (CTA walls, aggressive sales behavior) erodes the credibility that B2B buyers require before committing budget.
- **Minimizes cognitive overload.** A clear hierarchy — one dominant action, everything else subordinate — prevents choice paralysis (Hick's Law in practice).

### Conversion psychology this skill operationalizes

|
Principle
|
Application
|
|
---
|
---
|
|
Goal Gradient Effect
|
CTA urgency/specificity increases as the visitor nears conversion
|
|
Progressive Disclosure
|
Reveal higher-commitment CTAs only after value has been shown
|
|
Commitment Consistency
|
Sequence CTAs from low-friction to high-friction
|
|
Social Validation
|
Place trust-building actions immediately before intent-stage CTAs
|
|
Loss Aversion
|
Use sparingly, only with genuine scarcity/deadlines — never fabricated
|
|
Cognitive Load Theory
|
One primary goal per page; demote everything else visually
|

---

## Core Philosophy

1. **One page = one dominant conversion goal.** Every page has exactly one business objective. Every CTA on that page either serves it or explicitly supports a different, non-competing visitor journey (see exceptions below).
2. **Every CTA must justify its existence.** If you can't state which business goal and which visitor intent a CTA serves, remove it. No "just in case" buttons.
3. **Every CTA must match visitor intent.** Top-of-funnel visitors need education, not pricing tables. Bottom-of-funnel visitors need pricing, proof, and a fast path to action — not more explainers.
4. **Clarity over cleverness.** Microcopy must be understood instantly. "Let's Build Greatness" fails; "Book Your Free Demo" succeeds.
5. **Consistency over novelty.** A predictable visual and verbal CTA language across the site builds trust and speeds recognition. Save novelty for headlines, not action verbs.
6. **Progression instead of pressure.** Guide, don't push. Escalate commitment gradually; never force a visitor to leap from "Awareness" to "Purchase" in one click.
7. **Visibility should never become noise.** Strategic restraint signals confidence. A site that asks constantly reads as desperate; a site that asks at the right moments reads as competent.
8. **Reduce effort before increasing commitment.** Remove friction (form fields, unclear next steps, unnecessary account creation) before asking for a bigger yes.

---

## CTA Hierarchy Framework

A complete CTA system has eight tiers, each with distinct purpose, visual weight, placement logic, and wording register.

|
Tier
|
Purpose
|
Visual Weight
|
Typical Placement
|
Example Wording
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
**
1. Primary
**
|
The single most important action on the page
|
Highest contrast, largest size, solid fill
|
Above the fold; repeated at 2–3 key decision points
|
"Start Free Trial", "Book a Demo"
|
|
**
2. Secondary
**
|
Lower-commitment alternative for visitors not ready for Primary
|
Outline/ghost button, ~60–75% of Primary's visual weight
|
Adjacent to Primary, or at section transitions
|
"Watch Demo", "See Pricing"
|
|
**
3. Tertiary
**
|
Alternative path or additional context
|
Text link or subtle button, minimal emphasis
|
Below the fold, in-content, footer
|
"Compare Plans", "Read Documentation"
|
|
**
4. Support Actions
**
|
Contextual help, not conversion-focused
|
Small button/link, shown only when relevant
|
Near objections or complex sections
|
"Contact Sales", "Request Callback"
|
|
**
5. Passive Actions
**
|
Low-friction engagement, no explicit commitment
|
Minimal UI, inline or link-style
|
Global nav, footer, inline content
|
"Subscribe", "Follow Updates"
|
|
**
6. Educational Actions
**
|
Build knowledge before the ask, for low-intent visitors
|
Content-card style, resource-link style
|
Blog, resources, mid-funnel sections
|
"Read the Academy Management Guide", "Watch Product Tour"
|
|
**
7. Trust-Building Actions
**
|
Validate credibility, reduce evaluation anxiety
|
Testimonial carousels, logo rails, badges
|
Immediately before intent-stage CTAs
|
"See Case Studies", "Trusted by 500+ Academies"
|
|
**
8. Exit-Intent Actions
**
|
Capture value from an abandoning visitor
|
Modal/slide-in, dismissible
|
Triggered by exit signals (mouse-to-chrome, back-button, long idle)
|
"Get This as a PDF Before You Go", "Start Free — No Card Needed"
|

**Visual Priority Model:** Primary ★★★★★ · Secondary ★★★★☆ · Tertiary/Support ★★★☆☆ · Educational ★★☆☆☆ · Passive ★☆☆☆☆.

**Rules for changing tiers:**
- Visual emphasis decreases monotonically down the hierarchy — never let a Tertiary CTA visually outweigh a Secondary one.
- Wording escalates in commitment level as you go up: Passive/Educational use exploratory verbs ("Explore", "See"), Primary uses decisive verbs ("Start", "Book", "Get").
- Priority shifts by page type: a Documentation page's Primary may be "Create Account" (Tier 1 elsewhere is often Tier 3 here) — hierarchy tiers are fixed, but *which action occupies Tier 1* is page-dependent.

---

## One Primary Action Per Page Rule

**The rule:** Every page answers exactly one question — *"What is the single most important thing this visitor should do next?"* Every other CTA on the page supports that answer without competing for the same decision moment.

**Why it matters:** Multiple equally-weighted primaries split attention, create analysis paralysis, and measurably reduce conversion on *all* competing actions (not just the "losing" one).

**Acceptable exceptions** (two CTAs may coexist at equal-ish prominence only when they serve genuinely distinct, non-overlapping visitor journeys):

- **Pricing pages:** "Start Free" (self-serve) + "Talk to Sales" (enterprise) — different buyer types, not competing intents.
- **Comparison pages:** "Switch Today" + "Compare Plans" — one is the conversion, one is the research step that feeds it.
- **Segmented landing pages:** Clear user-type selectors (e.g., "For Sports Academies" / "For Dance Academies") — this is routing, not competition.

**How supporting CTAs should behave:**
- Visually subordinate at all times (see Visual Priority Model).
- Contextually placed so they answer the objection or question a hesitant visitor has *at that scroll position*.
- Never repeated with equal emphasis to the Primary in the same viewport.

**Scenario table:**

|
Page
|
Primary Goal
|
Primary CTA
|
Non-Competing Secondary
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
Homepage
|
Free signup
|
"Start Free Trial"
|
"Book a Demo" (for evaluators)
|
|
Pricing
|
Plan selection
|
"Start Free" per tier
|
"Talk to Sales" (enterprise only)
|
|
Features
|
Product trial
|
"Start Free Trial"
|
"Watch Demo" (low-intent)
|
|
Blog post
|
Lead capture
|
"Download the Guide" (content upgrade)
|
"Subscribe"
|
|
Landing page
|
Demo booking
|
"Book a Demo"
|
"See Pricing" (only if directly relevant to the ad's promise)
|

**Audit test:** For every CTA on a page, ask *"Does this directly serve the page's one conversion goal, or does it serve a genuinely separate visitor segment?"* If neither, remove or demote it.

---

## Sitewide CTA Architecture

Each page type below specifies Primary CTA, Secondary CTA, Optional/Tertiary CTA, CTA density (total visible CTAs), and recommended placement. UniqBrio examples shown; adapt wording to any SaaS vertical.

### Homepage
- **Primary:** "Start Free Trial" — hero, repeated after benefits and after testimonials
- **Secondary:** "Book a Demo" (next to Primary in hero, for evaluators) · "See Pricing" (nav/header)
- **Optional:** "Watch Demo" (inline), "Read Case Studies" (trust section)
- **Density:** 4–6 total CTAs across the page
- **Placement:** Header, hero, after each major value section, after testimonials, footer

### Pricing
- **Primary:** "Start Free" or "Select Plan" per pricing tier
- **Secondary:** "Talk to Sales" (enterprise tier only) · "Compare Features"
- **Optional:** "Calculate ROI"
- **Density:** 3–5 CTAs
- **Placement:** Hero, directly beneath each plan card, FAQ section, footer

### Features
- **Primary:** "Start Free Trial"
- **Secondary:** "Watch Demo" · "See Pricing"
- **Optional:** Contextual "Learn More" per individual feature block
- **Density:** 4–6 CTAs
- **Placement:** Header, after each feature section, after integrations, footer

### Solutions / Industry Pages (e.g., Dance Academy, Sports Coaching)
- **Primary:** "Book a Demo" (framed to the industry: *"Book a Demo for Your Dance Academy"*)
- **Secondary:** "Explore Features" · "See Pricing"
- **Optional:** Industry-specific case study CTA
- **Density:** 4–5 CTAs
- **Placement:** Hero, after solution benefits, after industry proof, footer

### Landing Pages (ad-driven, single-offer)
- **Primary:** Single dominant CTA matching the ad's specific promise ("Book a Demo", "Get the Guide", "Join Waitlist")
- **Secondary:** One low-friction alternative only ("Watch Demo")
- **Optional:** None — landing pages should be the leanest CTA environment on the site
- **Density:** 2–4 CTAs
- **Placement:** Hero, mid-page, immediately after social proof, footer

### Comparison Pages
- **Primary:** "Switch Today" / "Start Free Trial"
- **Secondary:** "Compare Plans" / "See Full Comparison Table"
- **Optional:** "Read Case Studies"
- **Density:** 3–4 CTAs
- **Placement:** Hero, comparison table, footer

### Blog
- **Primary:** Contextual content upgrade ("Download the Academy Management Playbook")
- **Secondary:** "Subscribe" · "Explore Platform"
- **Optional:** Inline contextual link mid-article
- **Density:** 2–3 CTAs per article — never more
- **Placement:** Sidebar, mid-article (after a key insight), end-of-article. **Never interrupt reading with a CTA wall.**

### Resources (guides, templates, webinars)
- **Primary:** "Download Guide" / "Watch Webinar" / "Use Template"
- **Secondary:** "Subscribe for More Resources"
- **Optional:** "Start Free Trial"
- **Density:** 2–3 CTAs
- **Placement:** Hero, resource card, footer

### Documentation
- **Primary:** "Create Account" / "Start Free Trial" (contextual, for evaluators reading docs)
- **Secondary:** "Contact Support" · "See Integrations"
- **Optional:** None
- **Density:** 1–2 CTAs
- **Placement:** Footer, sidebar only — never interrupt technical content

### FAQ
- **Primary:** "Start Free" (addresses the most common conversion-blocking question)
- **Secondary:** "Contact Sales" (for unresolved objections)
- **Density:** 1–2 CTAs
- **Placement:** Below the FAQ list, framed as "Still have questions?"

### Contact
- **Primary:** "Submit" (form completion)
- **Secondary:** "Book a Demo" instead of a form, if not already the form's purpose
- **Density:** 1–2 CTAs
- **Placement:** Form submit button, optional live-chat trigger

### About
- **Primary:** "Start Free Trial" (only if the story genuinely builds purchase-relevant trust)
- **Secondary:** "Meet the Team" · "Read Our Mission"
- **Density:** 1–2 CTAs
- **Placement:** End of page, footer

### Careers
- **Primary:** "View Openings"
- **Secondary:** "Learn About Our Culture"
- **Density:** 1–2 CTAs
- **Placement:** Hero, job listings, footer

### Legal Pages (Privacy, Terms)
- **Primary:** None
- **Secondary:** None
- **Optional:** "Continue to Site" (cookie consent only)
- **Density:** 0–1 CTAs. Legal pages are trust infrastructure, not conversion surfaces.

### Login
- **Primary:** "Sign In"
- **Secondary:** "Forgot Password?" · "Create Account" (for mistaken visitors)
- **Density:** Minimal — focus entirely on authentication flow

### Signup
- **Primary:** "Create Your Free Account"
- **Secondary:** "Already have an account? Sign In"
- **Optional:** "Watch a 2-Minute Demo" (for last-second hesitation)
- **Density:** High relative to page length — this page exists only to convert

### 404
- **Primary:** "Return Home"
- **Secondary:** "Search Site"
- **Optional:** "Start Free Trial" (soft, low-pressure)
- **Density:** 1–2 CTAs. Helpful navigation, not a sales moment.

### Thank-You Pages
- **Primary:** "Continue to Dashboard" / "Explore Next Steps" (post-signup) or "Download Now" (post-content-gate)
- **Secondary:** "Invite Your Team" · "Share on Social"
- **Density:** Moderate — reinforce momentum, never re-ask for the action just completed

---

## CTA Placement Strategy

|
Zone
|
Guidance
|
|
---
|
---
|
|
**
Above the fold
**
|
One Primary + at most one Secondary. Headline, supporting copy, and CTA must be readable without scrolling. Never overwhelm this zone.
|
|
**
Mid-page
**
|
Place after a key value proposition, feature cluster, or pricing explanation — never on a fixed timer, always after content has "earned" the ask.
|
|
**
Section transitions
**
|
Use contextual, content-bridging microcopy ("See how attendance automation works →") rather than a repeated generic button.
|
|
**
Feature sections
**
|
CTA tied to that specific feature's value, not a generic sitewide button.
|
|
**
Testimonials
**
|
CTA immediately follows social proof — this is a high-trust moment, capitalize on it.
|
|
**
Pricing
**
|
CTA directly beneath each plan card, not floating separately.
|
|
**
FAQ
**
|
CTA after objection-handling content, framed to resolve the last hesitation.
|
|
**
End of page
**
|
The strongest, most complete Primary CTA restatement — the "final call."
|
|
**
Footer
**
|
Persistent but low visual emphasis; include Primary + key navigation.
|
|
**
Navigation
**
|
Maximum one Primary CTA + one login/account action. Never stack multiple conversion actions in the nav.
|
|
**
Sticky navigation
**
|
Primary CTA only — never introduce a second competing action here.
|
|
**
Sidebar
**
|
Content-specific only (e.g., a related resource on a blog post).
|
|
**
Floating elements
**
|
Reserve for chat, support, or accessibility tools — never stack multiple floating widgets, and never use for a second sales CTA.
|
|
**
Contextual inline CTAs
**
|
Embedded naturally inside body copy ("...which is why over 500 academies now automate this with UniqBrio").
|
|
**
Content upgrade CTAs
**
|
Only after meaningful educational value has been delivered — never before.
|

---

## Long-Form Page Cadence

**Natural rhythm for a long-form page:**
1. Hero — value proposition + Primary CTA
2. After first proof point — reinforcement (varied wording)
3. After benefits/features — Secondary CTA
4. After testimonials — Primary CTA (capitalize on trust)
5. Pricing/comparison — Primary CTA per option
6. After FAQ — final objection-handling CTA
7. Footer — persistent low-emphasis close

**Repetition rules:**
- Repeat CTAs every roughly 700–1200px of scroll, or after each major narrative transition — never on a fixed pixel timer regardless of content.
- Repeat only after a value demonstration, objection resolution, or trust signal — never "just because a section ended."
- Vary wording, color, and surrounding context at each repetition; never show three visually identical CTAs in a row.
- Never more than 3 prominent (Primary/Secondary) CTAs visible in a single scroll session's "memory" — use Tertiary/inline for anything beyond that.

**Good repetition vs. bad repetition:**
- *Good:* "Start Free Trial" in the hero → "See why 500+ academies trust UniqBrio, Start Free" after testimonials → "Start Automating Today" at page end. Same action, evolving justification.
- *Bad:* Identical "Start Free Trial" button, same color, same copy, appearing after every 200px regardless of content.

**Attention reset:** Use a visually distinct section (a dark-mode testimonial band, a full-bleed image, a statistic callout) between CTA exposures to reset visual attention before the next ask.

---

## CTA Fatigue Prevention

**How visitors go blind to CTAs:**
- Identical buttons repeated without contextual variation
- More than 5 CTAs visible in a single viewport or scroll session
- Generic "Learn More" everywhere, regardless of destination
- Aggressive, non-dismissible sticky elements

**Warning signs:**
- Declining CTR on repeated buttons within the same page
- High scroll-past rate on CTA sections (via heatmaps/session recordings)
- Rising bounce rate on CTA-dense pages
- User feedback describing the site as "salesy" or "pushy"

**Audit checklist:**
- [ ] Count total CTAs per page — is it justified by page length and funnel stage?
- [ ] Is any CTA visually identical to another within the same scroll session?
- [ ] Is microcopy varied across repetitions of the same action?
- [ ] Does context (surrounding copy) change even when the CTA doesn't?
- [ ] Are sticky/floating elements dismissible and used sparingly?

**Rewrite techniques (rotate a single action's wording across a page):**
- "Start Free Trial" → "Try Free — No Card Needed" → "Get Started in Minutes"
- "Book a Demo" → "See It in Action" → "Schedule a Walkthrough"

**Rotation & variation strategies:**
- **Visual variation:** alternate button shape, border radius, shadow, size, and (within brand palette) accent color
- **Copy variation:** rotate verbs and benefit framing (see Microcopy System below)
- **Placement variation:** alternate inline, section-end, sticky, and card-attached CTAs
- **Context variation:** tailor wording to the immediately preceding content (feature-specific, objection-specific, proof-specific)

---

## Sticky CTA Strategy

|
Platform
|
Guidance
|
|
---
|
---
|
|
**
Desktop
**
|
Sticky header nav with Primary CTA is standard; a floating bottom-right button is optional and reserved for high-intent pages (Pricing, Solutions) — never stack both.
|
|
**
Tablet
**
|
Simplified sticky nav; reduce to icon + short label if space is constrained.
|
|
**
Mobile
**
|
Sticky bottom bar is strongly preferred over floating buttons — it sits in the natural thumb zone and doesn't obscure content mid-scroll.
|
|
**
Floating buttons
**
|
Reserve for chat/support, not a second sales CTA; bottom-right or bottom-left, subtle entrance animation only.
|
|
**
Sticky bottom bars
**
|
Full-width or near-full-width on mobile; single Primary CTA + minimal supporting copy.
|
|
**
Sticky top bars
**
|
Best for announcements or persistent nav CTA; avoid combining with a sticky bottom bar simultaneously on mobile.
|
|
**
Scroll-triggered appearance
**
|
Reveal after 25–40% scroll (after the hero, once the visitor has shown engagement) — never immediately on page load.
|
|
**
Dismissible banners
**
|
Always provide a clear dismiss control; respect the dismissal for the remainder of the session (don't reappear on next scroll).
|
|
**
Timing
**
|
Appear only after value has been demonstrated, not on load.
|
|
**
Animation
**
|
Subtle, fast (200–300ms), single entrance — no bouncing, pulsing, or looping motion.
|

**When NOT to use sticky CTAs:**
- Checkout or payment flows
- Long forms (they compete with form fields)
- Documentation and legal pages
- Onboarding flows already inside the product
- Any context where sticky elements would create accessibility conflicts (e.g., overlapping focus order)

---

## Mobile CTA Accessibility

- **Thumb zone:** Place the Primary CTA in the bottom-center to bottom-right region (natural reach for right-handed users); avoid top-left, the hardest zone to reach one-handed.
- **Safe reach:** Optimal zone is the bottom 50% of the viewport, within roughly 2–3 inches of the bottom edge.
- **Button sizing:** Minimum 44×44px tap target (Apple HIG) / 48×48px (Material Design); prefer full-width buttons on mobile for Primary CTAs.
- **Spacing:** Minimum 8px between adjacent tap targets to prevent accidental taps.
- **Sticky bottom CTA:** 50–60px height, Primary CTA + optional one-line value prop, dismissible where appropriate.
- **Scroll behavior:** Never trap scroll; consider hiding the sticky CTA on scroll-down and revealing on scroll-up to reduce visual noise.
- **Keyboard overlap:** Ensure the on-screen keyboard never obscures a CTA on a form page — reposition or scroll the CTA into view above the keyboard.
- **Safe areas:** Respect device notches and home-indicator zones; use `env(safe-area-inset-bottom)` padding for sticky elements.
- **Gesture navigation:** Avoid CTA placement or interactions that conflict with system back-swipe gestures.
- **WCAG-friendly recommendations:** Minimum 4.5:1 contrast ratio for text, 3:1 for icons/large text/UI graphics; visible focus states; full keyboard navigability; descriptive `aria-label`s (e.g., `aria-label="Start your free UniqBrio trial"`, never a bare "Click here").

---

## CTA Microcopy System

**Formula templates:**

|
Formula
|
Structure
|
Example
|
Best Funnel Stage
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
Verb + Outcome
|
Action + desired result
|
"Start Managing Your Academy"
|
Interest, Evaluation
|
|
Verb + Time
|
Action + time commitment
|
"Book a 15-Minute Demo"
|
Intent, Purchase
|
|
Verb + Confidence
|
Action + confidence signal
|
"Try Free with Confidence"
|
Evaluation, Intent
|
|
Verb + Risk Reduction
|
Action + risk-reducing clause
|
"Start Free — No Credit Card Required"
|
Intent, Purchase
|
|
Verb + Benefit
|
Action + direct benefit
|
"Save 10 Hours a Week"
|
Interest, Evaluation
|
|
Verb + Social Proof
|
Action + validation signal
|
"Join 500+ Academies"
|
Interest, Evaluation, Trust
|
|
Verb + Simplicity
|
Action + ease signal
|
"Set Up in Under 10 Minutes"
|
Interest, Evaluation
|

**Funnel-stage mapping:**

|
Stage
|
Goal
|
Example CTA
|
|
---
|
---
|
---
|
|
Awareness
|
Build recognition
|
"Explore the Platform"
|
|
Interest
|
Capture curiosity
|
"Watch a 2-Minute Demo"
|
|
Evaluation
|
Demonstrate value
|
"See Pricing", "Calculate ROI"
|
|
Intent
|
Drive commitment
|
"Book Your Personalized Demo"
|
|
Purchase
|
Convert
|
"Start Free Trial", "Select Plan"
|
|
Retention
|
Keep engaged
|
"Explore More Features", "Complete Setup"
|
|
Referral
|
Generate shares
|
"Invite Another Academy", "Refer a Friend"
|
|
Advocacy
|
Build loyalty
|
"Become a Case Study", "Leave a Review"
|

---

## SaaS CTA Library

|
CTA
|
Best Use
|
Funnel Stage
|
Tone
|
Strength
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
Book a Demo
|
High-touch/complex B2B sales
|
Intent
|
Professional, consultative
|
High
|
|
Start Free / Start Free Trial
|
Product-led growth, self-serve
|
Intent → Purchase
|
Direct, energetic
|
High
|
|
Try Free
|
Punchier alternative to "Start Free"
|
Intent
|
Friendly, direct
|
High
|
|
See Pricing
|
Evaluation-stage visitors
|
Evaluation
|
Neutral, informational
|
Medium
|
|
Compare Plans
|
Price-sensitive decision-makers
|
Evaluation
|
Helpful, analytical
|
Medium
|
|
Talk to Sales
|
Enterprise / high-ACV deals
|
Intent
|
Consultative
|
High
|
|
Schedule Demo
|
Concrete next step for warm leads
|
Intent
|
Professional
|
High
|
|
Calculate ROI
|
Financial/analytical buyers
|
Evaluation
|
Analytical
|
Medium
|
|
Watch Demo
|
Early-funnel, low-commitment
|
Interest
|
Educational
|
Medium
|
|
See Features
|
Product discovery
|
Interest
|
Informative
|
Medium
|
|
Explore Platform
|
Broad, low-pressure discovery
|
Awareness
|
Curious
|
Low
|
|
Get Started
|
General-purpose onboarding CTA
|
Intent
|
Simple, direct
|
High
|
|
Continue
|
Multi-step flows (signup, onboarding)
|
Progress
|
Neutral
|
Medium
|
|
Create Account
|
Signup pages
|
Purchase
|
Direct
|
High
|
|
Request Callback
|
High-touch, time-constrained visitors
|
Intent
|
Service-oriented
|
Medium
|
|
Contact Sales
|
Enterprise inquiries
|
Intent
|
Professional
|
High
|
|
Download Guide
|
Lead-magnet / content marketing
|
Awareness, Interest
|
Educational
|
Low
|
|
Join Waitlist
|
Pre-launch or limited-capacity offers
|
Interest
|
Optimistic, exclusive
|
Medium
|
|
Upgrade Now
|
Existing users, expansion revenue
|
Purchase
|
Direct
|
High
|
|
Renew Plan
|
Existing customers, retention
|
Retention
|
Practical, reassuring
|
High
|

---

## CTA Copywriting Principles

- **Clarity:** The visitor must understand the exact outcome of clicking, instantly.
- **Specificity:** "Download the Academy Management Playbook" beats "Download Guide."
- **Urgency:** Use only when genuine (a real deadline, real limited capacity) — never fabricated scarcity.
- **Relevance:** Match the CTA to the visitor's current funnel stage and the content immediately preceding it.
- **Confidence:** Use strong, decisive verbs (Start, Book, Get, Try) rather than passive or weak ones (Submit, Continue, Next).
- **Benefit-first writing:** Lead with what the visitor gains, not the mechanical action.
- **Friction reduction:** Remove stated obstacles directly in the microcopy ("No credit card required," "Cancel anytime").
- **Risk reduction:** Pair commitment-heavy CTAs with a reassurance clause.
- **Trust signals:** Third-party validation near high-commitment CTAs ("Rated 4.8/5," "Trusted by 500+ academies").
- **Emotion vs. logic:** Use emotional framing in surrounding headlines/value props; keep the CTA microcopy itself concrete and logical.

---

## Microcopy Anti-Patterns

|
Avoid
|
Why It Fails
|
Better Alternative
|
|
---
|
---
|
---
|
|
"Click Here"
|
Describes the mechanism, not the outcome
|
"Download the Guide"
|
|
"Submit"
|
Feels transactional, no benefit stated
|
"Request My Demo"
|
|
"Learn More" (no context)
|
Generic; destination and value unclear
|
"See How Attendance Automation Works"
|
|
"Continue"
|
No indication of what happens next
|
"Continue to Payment"
|
|
"Go" / "Next"
|
Meaningless outside a wizard's own context
|
Name the actual next step
|
|
"Do It"
|
Vague, no outcome, low trust
|
State the specific action and benefit
|
|
"Start" (alone)
|
Ambiguous — start what?
|
"Start Free Trial"
|
|
Equal-emphasis CTA walls
|
Multiple buttons of identical weight compete and cancel each other out
|
One Primary, everything else visually subordinate
|

---

## Decision Frameworks

**Should this page have one CTA or two?**
→ One business objective exists? One Primary CTA only.
→ Two genuinely distinct, non-overlapping visitor journeys exist (e.g., self-serve vs. enterprise)? One Primary + one clearly subordinate Secondary.
→ Otherwise: consolidate to one and remove the competing action.

**Should the CTA be sticky?**
→ Mobile + long page + high-intent conversion goal → Yes.
→ Checkout, long forms, documentation, legal, onboarding → No.

**Should the CTA repeat?**
→ After major value proof, objection resolution, pricing, or testimonials → Yes, with varied wording.
→ On a fixed pixel/section interval regardless of content → No.

**Should the wording change?**
→ Same underlying action, different surrounding context → Keep the action, vary the supporting copy and framing.
→ Visitor's funnel stage has shifted (e.g., they've now seen pricing) → Adjust the CTA's commitment level accordingly.

**Should the CTA appear after this section?**
→ Section just delivered value, resolved an objection, or built trust → Yes.
→ Section is purely navigational or mid-explanation → No, wait for the natural pause.

**Should the CTA use urgency?**
→ Genuine, verifiable scarcity/deadline exists → Yes, state it plainly ("Early-bird pricing ends Friday").
→ No real constraint exists → Never fabricate one; use benefit or social-proof framing instead.

---

## CTA Audit Checklist

- [ ] **Hierarchy:** One clear dominant goal per page; all other CTAs visibly subordinate
- [ ] **Visibility/Contrast:** Primary CTA meets WCAG AA contrast (4.5:1 text, 3:1 UI elements)
- [ ] **Placement:** CTAs appear above the fold, at section transitions, after proof, and at page end
- [ ] **Spacing:** No two visually-identical CTAs within the same scroll viewport
- [ ] **Consistency:** Same action uses consistent styling sitewide; only microcopy varies
- [ ] **Microcopy:** Specific, benefit-first, no anti-pattern wording present
- [ ] **Accessibility:** Keyboard-navigable, focus-visible, screen-reader labeled
- [ ] **Mobile usability:** Tap targets ≥44×44px, thumb-zone placement, no keyboard overlap
- [ ] **Conversion friction:** Minimal fields/steps before the ask; expectations clearly set
- [ ] **Repetition/fatigue:** CTAs vary in wording/visual treatment across repetitions
- [ ] **Scroll rhythm:** CTA cadence follows content pacing, not a fixed interval
- [ ] **Decision clarity:** A first-time visitor can state the page's one desired action within 3 seconds

---

## Common Mistakes

- Multiple primary buttons competing for the same decision moment
- CTA walls (rows of equal-emphasis buttons)
- Inconsistent wording for the same action across pages
- Visual clutter — too many colors, sizes, or styles of button
- Weak verbs ("Submit," "Go," "Next") on high-stakes CTAs
- Generic labels with no stated destination or benefit
- CTAs appearing before any value has been demonstrated (too early)
- No CTA until the very end of a long page (too late)
- Missing reinforcement — a single CTA with no repetition on long pages
- Ignoring mobile thumb zones and tap-target sizing
- Oversized, non-dismissible sticky banners
- Constant pulsing/bouncing animation on buttons

---

## Examples (Before / After)

**Homepage**
- *Before:* Nav has "Learn More," "Contact," "Pricing," "Watch," and "Get Started" — five competing actions, no hierarchy.
- *After:* Primary "Start Free Trial" in hero and repeated after testimonials; Secondary "Book a Demo" beside it; everything else demoted to nav text links.

**Pricing**
- *Before:* Three visually identical "Buy Now" buttons across tiers, no differentiation for enterprise buyers.
- *After:* "Start Free" per self-serve tier; "Talk to Sales" only on the enterprise tier; ROI calculator offered after the pricing table, not competing with it.

**Feature Page**
- *Before:* Single CTA buried in the footer; nothing reinforces intent while scrolling.
- *After:* Hero CTA → feature-specific CTA after each major capability → trust-building CTA after proof → footer CTA — a full cadence, not a single ask.

**Blog Article**
- *Before:* Five separate CTAs/popups interrupt the reading experience.
- *After:* One contextual content-upgrade CTA after the article's most valuable insight, one at the end — nothing else.

**Comparison Page**
- *Before:* A bare feature-comparison table with no path to action.
- *After:* Comparison table → advantage summary → proof/testimonial → single "Switch Today" CTA.

**Landing Page**
- *Before:* Three competing CTAs ("Book Demo," "Download Guide," "See Pricing") dilute the ad's single promise.
- *After:* One dominant CTA matching the ad's exact promise, with a single low-friction Secondary CTA offered only after objections are addressed.

---

## Collaboration With Other Skills

- **hero-section-cro-specialist** — Owns above-the-fold messaging, layout, and hero CTA execution. This skill defines *which* action the hero CTA should be and how it fits the sitewide hierarchy; the hero specialist owns the visual/copy execution of that single CTA.
- **saas-website-microcopy-specialist** — Owns tone, voice, and fine-grained wording refinement. This skill decides *where* CTAs appear, *why*, and which formula/funnel-stage tier applies; the microcopy specialist polishes the final phrasing within those constraints.
- **scroll-engagement-pacing-designer** — Owns narrative reading rhythm and content pacing. This skill defines CTA cadence rules (repetition frequency, spacing); the pacing designer ensures that cadence aligns with the page's storytelling rhythm.
- **conversion-ux-specialist** — Owns interaction quality, form usability, and overall conversion-flow friction. This skill governs the CTA architecture and hierarchy that feeds into that flow; the UX specialist optimizes what happens *after* the click.

**Boundary principle:** This skill is the architecture and governance layer — it decides the *system* (hierarchy, placement, cadence, page-level strategy). Downstream skills execute within that system without re-deciding its structure.

---

## Deliverables

When invoked, this skill produces:

1. **CTA Hierarchy Map** — Primary/Secondary/Tertiary/Support tier definitions with visual weight rules
2. **Page-by-Page CTA Strategy** — Primary/Secondary/Optional CTA, density, and placement for every page type in scope
3. **CTA Cadence Plan** — Scroll-based repetition schedule for long-form pages
4. **Sticky CTA Recommendations** — Desktop/tablet/mobile-specific rules
5. **CTA Placement Audit** — Review of an existing page against the placement strategy
6. **CTA Fatigue Report** — Identification of repetitive/blind-inducing patterns with fixes
7. **CTA Microcopy Recommendations** — Formula-based wording options per funnel stage
8. **Prioritized Improvement Roadmap** — Sequenced changes ordered by expected conversion impact
9. **Implementation Checklist** — Developer/designer-ready QA list before launch
10. **Rationale Document** — Psychology- and framework-backed justification for every recommendation

---

## Implementation Patterns

- Maintain a **centralized CTA taxonomy** (single source of truth) mapping every CTA action to its tier, funnel stage, and canonical wording.
- Build CTAs as a **single reusable design-system component** with variants (primary/secondary/tertiary), states (default/hover/focus/disabled), and built-in accessibility attributes — never one-off buttons per page.
- Use a **per-page CTA spec** (page type → primary/secondary/optional → placement → density → sticky behavior) as the contract between strategy and implementation.
- Instrument **analytics on every CTA** (page, section, tier, variant) to track click-through by placement and detect fatigue empirically, not just heuristically.
- Run **A/B tests** on major CTA wording/placement changes with a predefined hypothesis and success metric before sitewide rollout.
- Schedule **routine CTA audits** (quarterly, or after major page redesigns) using the Audit Checklist above.

---

## Default Workflow

When this skill is invoked:

1. Identify the business objective(s) in scope (signup, demo, upgrade, etc.).
2. Identify visitor intent and funnel stage for each page under review.
3. Define the one dominant conversion goal per page.
4. Assign CTA hierarchy tiers and visual weights.
5. Design page-specific placement using the Sitewide CTA Architecture and Placement Strategy sections.
6. Determine cadence for long-form pages.
7. Audit for repetition, fatigue, and banner blindness risk.
8. Select/rotate microcopy using the Formula and Funnel-Stage systems.
9. Validate mobile accessibility and WCAG compliance.
10. Produce the Deliverables list above, each with stated rationale.

---

## Success Criteria

- A first-time visitor can identify the page's one dominant action within 3 seconds
- No two visually identical CTAs compete within the same viewport
- CTA repetition on long-form pages follows content-driven cadence, not a fixed interval
- Measurable reduction in CTA fatigue signals (declining CTR on repeats, high scroll-past rate)
- Stronger progression from low-commitment (Educational/Passive) to high-commitment (Primary) CTAs across the funnel
- Mobile tap accuracy and reachability at parity with desktop conversion rates
- Consistent visual and verbal CTA hierarchy across every page template
- Measurable uplift in the target business metrics: free signups, demo bookings, paid subscriptions
