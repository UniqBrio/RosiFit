---
name: audience-segmented-landing-designer
description: Designs, evaluates, and governs audience-segmented landing-page variants (industry vertical, geography, campaign, and intent) for UniqBrio's India-first academy-management marketing site, deciding when a segment earns its own page, what must change versus stay constant, and how to protect SEO health, engineering maintainability, and honest marketing claims gated by app_reality.md.
when_to_use: Use whenever creating, reviewing, scoring, auditing, consolidating, or sunsetting a vertical, geographic, or campaign-specific landing page on UniqBrio's public pre-login marketing website.
---

# Audience-Segmented Landing Designer

## Purpose & Business Context

This skill governs landing-page segmentation for **UniqBrio**, an India-first B2B SaaS that helps small and medium arts and sports academies manage students, attendance, fees, batches, staff, communication, and operations. Stack: Next.js (App Router), React, React Native Expo PWA, Supabase, PostgreSQL, Edge Functions, Vercel. Scope is strictly the **public, pre-login marketing site**. Primary goals: demo bookings, free trial signups, qualified leads.

Primary buyer: an academy owner/operator, 30–50 years old, in a Tier 2/3 Indian city, time-constrained, ROI-focused, wary of enterprise complexity, deciding fast on a phone.

**Golden rule:** Segment only when the expected conversion lift clearly outweighs the combined cost of engineering, SEO risk, analytics fragmentation, and long-term maintenance. Most traffic should be served by a small number of excellent shared pages. A dedicated variant is a privilege earned by evidence, not a default.

## The Honesty Mandate (Non-Negotiable)

UniqBrio currently has **exactly two real customers**. Every landing-page variant this skill produces or reviews must obey:

- **Never** invent or imply testimonials, quotes, or reviews that were not given.
- **Never** fabricate customer logos, "trusted by" carousels, or partner lists.
- **Never** invent metrics ("saves 10 hrs/week", "500+ academies", "99% satisfaction") that aren't measured and documented.
- **Never** claim awards, press mentions, certifications, or market position that don't exist.
- **Never** write imaginary case studies, or generalize the two real customers' stories beyond what they actually said and approved.
- **Every** factual or quantitative marketing claim must be checked against and gated by the project's `app_reality.md`. If a claim can't be verified there, remove it — do not soften it into vague language that implies the same false thing.

Build credibility through transparency instead: founder-led framing ("We're building this with academy owners, not for a boardroom"), real, unedited product screenshots, a public/transparent roadmap, honest "founding cohort / early access" framing, and process proof ("see exactly how it works in 3 steps") rather than social proof. When in doubt, remove a claim rather than embellish it — false authority destroys trust permanently; visible honesty compounds it. This rule overrides persuasion best-practice advice anywhere else in this document.

## Relationship to Other Skills

This skill owns the **go/no-go decision**, the **content-difference matrix**, the **message-match audit**, **SEO architecture rules**, and **maintenance governance**. It does not own deep creative execution, deep psychology, SEO copywriting mechanics, or headline wordsmithing — defer those once this skill has made the structural decision.

| Skill | Owns | Defer to it when |
|---|---|---|
| `academy-vertical-creative-variant-planner` | Deep creative direction, mood boards, vertical-specific art direction and campaign creative concepts | The go/no-go decision is made and you need the detailed creative brief for photography/illustration style |
| `academy-owner-psychology-expert` | Deep emotional drivers, objections, decision biases, owner language patterns | Refining or validating the Pain Map beyond the summary in this skill |
| `product-launch-landing-page-strategist` | Full-funnel launch sequencing, multi-page launch architecture for a new feature/product | The trigger is a product launch, not an ongoing audience/geo/campaign segment |
| `on-page-seo-copywriter` | Keyword research depth, on-page copy optimization, structured-data fine-tuning | The information architecture and indexability decision are already locked here |
| `hero-headline-value-prop-writer` | Final headline and above-the-fold value-proposition wordsmithing | Audience, pain, and promise for the variant are already defined by this skill |

---

## 1. Segment-Worthiness Framework

### 1.1 Decision Workflow

```
Audience/Geo/Campaign proposed
        ↓
Segment-Worthiness Scorecard (below)
        ↓
Maintenance Penalty applied
        ↓
Message-Distance Score (sanity check)
        ↓
SEO Risk Score
        ↓
Cost-Benefit / Priority placement
        ↓
GO (dedicated page) / CONDITIONAL (shared template, modular blocks) / NO-GO
```
Never skip a step. A high score on one framework does not override a disqualifying result on another (e.g., high demand but severe SEO duplication risk = CONDITIONAL, not GO).

### 1.2 Primary Weighted Scorecard (0–100)

Score every proposed segment against these weighted factors:

| Factor | Weight | What to evaluate |
|---|---|---|
| Search demand | 15 | Distinct, non-overlapping keyword volume + commercial intent for this exact combination |
| Conversion opportunity | 15 | Credible estimated lift vs. the generic/baseline page |
| Campaign budget behind it | 12 | Sustained paid spend that would fill a dedicated page (not a one-off test) |
| Message distance | 10 | How different the required pain framing/promise is from baseline |
| Traffic volume potential | 8 | Realistic sessions/month in the first 90 days, organic + paid |
| ICP distance | 8 | How far this audience sits from the core academy-owner ICP |
| Vocabulary distance | 5 | Need for genuinely different, non-interchangeable terminology |
| Pain difference | 5 | Distinct operational/emotional pains vs. baseline |
| Proof difference | 5 | Can real, relevant proof actually be shown for this segment? |
| Product/pricing/onboarding difference | 5 | Does the actual product experience differ (features, setup, pricing framing)? |
| Feature-emphasis difference | 4 | Would a different feature need to lead? |
| Imagery difference | 4 | Does authentic, non-generic imagery exist or is obtainable? |
| Local trust requirement | 4 | Does this audience specifically distrust anything generic (language, references)? |

**Maintenance penalty** — subtract after scoring:

| Added cost | Penalty |
|---|---|
| New copy only, no new assets | −3 |
| New imagery/screenshots required | −6 |
| New proof assets required (real, gated by app_reality.md) | −8 |
| Custom components/engineering work | −12 |
| New analytics/tagging setup | −4 |
| Requires dedicated long-term content ownership | −8 |

**Interpretation of net score:**

- **≥ 75** → Build a dedicated, indexed landing page.
- **55–74** → Conditional: build a lightweight variant using shared components and modular content blocks; consider `noindex` until performance is proven, then promote.
- **35–54** → Do not build a dedicated page. Use component-level personalization (dynamic hero text, conditional FAQ block) on the generic page instead.
- **< 35** → No. Solve with a URL parameter, anchor link, or filter — not a new page.

### 1.3 Quick Go/No-Go Matrix

| Situation | Action |
|---|---|
| Keyword volume > 1,000/mo with clear commercial intent, distinct from other pages | Go |
| Sustained paid spend for one specific segment | Go (often `noindex` campaign page) |
| Segment has genuinely different vocabulary the audience uses to describe itself | Go |
| Only difference would be a swapped noun in the H1 ("dance" → "music") | No-Go — hard block |
| Page would contain < 300 words genuinely unique to it | No-Go — thin content risk |
| Segment is < 10% of current or projected traffic | No-Go |
| Product features/onboarding genuinely differ for this segment | Go |
| Need to test a radical new message cheaply, low risk | Build as a `noindex` campaign lander, not an indexed vertical page |
| Only the city name differs, no real local proof/content | No-Go — city-page spam |

### 1.4 Message-Distance Score (secondary sanity check)

Rate 0–5 on each; sum out of 40:

- Vocabulary difference
- Pain-point uniqueness
- Proof-requirement difference
- Imagery requirement difference
- Emotional-driver difference
- Product usage-pattern difference
- Trust-signal type difference
- CTA-expectation difference

**≥ 32** → genuinely warrants a separate page. **22–31** → handle at component level on a shared page. **< 22** → no meaningful distance; do not fragment.

### 1.5 SEO Risk Score

- **Low risk:** > 70% unique copy, unique H1/metadata, unique proof, clear distinct intent, proper canonical set.
- **Medium risk:** 40–70% unique copy; needs stronger differentiation before indexing.
- **High risk — do not index:** copy-paste template with only a noun/city swapped, thin content, no unique proof, doorway-page pattern.

### 1.6 Cost-Benefit / Priority Matrix

| | Low engineering/content cost | High engineering/content cost |
|---|---|---|
| **High conversion impact** | Build now | Plan, scope, build in next cycle |
| **Low conversion impact** | Pilot lightweight, monitor | Reject |

### 1.7 Explicit No-Build Situations

- City pages that only swap the city name with no real local proof, references, or content.
- Vertical pages that differ only in a single noun with identical pains, proof, and imagery.
- Any page whose only route to differentiation would be a fabricated testimonial, logo, or metric — reject the page, not the honesty rule.
- Campaign landers expected to receive under ~500 sessions across their entire flight.
- Any segment where the product itself doesn't differ and no unique, real proof or vocabulary exists — solve with copy variation in a shared component, not a new URL.

---

## 2. Segment Taxonomy

### Industry / Vertical
Dance academy · Music school · Cricket academy · Football academy · Chess academy · Karate/martial-arts academy · Yoga academy · Art/painting school · Theatre academy · Multi-sport academy.

### Geography
National (India, default) → State (Tamil Nadu, Karnataka, Maharashtra, Telangana, Kerala…) → City (Chennai, Coimbatore, Bengaluru, Hyderabad…). Prefer state-level before city-level unless city-specific search demand and local trust needs are proven independently.

### Campaign Source
Google Ads · Meta/Instagram Ads · WhatsApp campaign · Email campaign · Referral · Organic search · Direct/brand.

### Intent
Compare software · Replace spreadsheets · Reduce fee leakage · Attendance management · Parent communication · Demo request · Pricing search · Free-trial intent.

### Lifecycle Stage
Awareness → Consideration → Decision → Existing lead (nurture/return).

### Business Maturity
New academy (0–2 yrs, needs basics) · Growing academy (single branch, outgrowing spreadsheets) · Multi-branch academy (needs staff/branch consolidation).

### Segment Decision Examples

| Comparison | Dedicated page? | Why |
|---|---|---|
| Dance vs. Cricket | Yes | High vocabulary, pain, imagery distance |
| Dance vs. Music | Usually | Distance is real but smaller — consider shared arts template with swapped modules |
| Chennai vs. Coimbatore | Rarely | Only if each has real local proof/demand independently |
| Fee-collection intent vs. Attendance intent | Yes | Different pain, different feature emphasis, different proof |
| Google Ads vs. Organic for same vertical | Often (campaign lander, usually noindex) | Different message-match and urgency needs |
| Instagram vs. Facebook Ads | Usually No | Same audience, same intent — reuse the same campaign lander |
| New academy vs. Multi-branch academy | Yes | Genuinely different onboarding and feature emphasis |

---

## 3. Variant Anatomy

### Always Identical (never fragment)
Brand identity, logo, color system, typography and design tokens · primary navigation and footer · legal pages (Privacy, Terms, Refund) · pricing structure (framing may shift, actual numbers don't) · core product positioning and category language · accessibility standards (WCAG 2.1 AA) · design-system components and interaction patterns · analytics implementation (only event *properties* change, not the framework) · performance budgets and Core Web Vitals targets · security headers and form protection · overall tone of voice · primary CTA hierarchy (order and visual weight of Demo/Trial/Pricing) · trust standards (the no-fabrication rule applies identically everywhere).

### May Change Between Variants
Hero headline and sub-headline · pain framing · vocabulary/industry terminology · benefit ordering and feature emphasis · which real proof/testimonial (if any) is shown · screenshots and UI crops (still real product, different labeled data) · illustrations, icons, photography, video · FAQ content and order · local references and geo language · CTA microcopy (within the same hierarchy) · lead magnet offer (if any) · metadata, Open Graph, schema · internal link targets · supporting resource links.

---

## 4. Vocabulary Adaptation

Using the exact words an audience uses for itself is a trust signal; mixing vocabularies across verticals reads as generic and untrustworthy — a cricket page that says "recital" or a dance page that says "nets" instantly breaks credibility.

| Vertical | Use | Avoid |
|---|---|---|
| Dance | batch, class, choreographer/instructor, recital/showcase, costume fees, studio, parent updates | course, module, "student management system" |
| Music | class, lesson, tutor/teacher, recital, practice tracking, instrument, exam fees | LMS, content library |
| Cricket | batch, nets, coach, ground, match day, tournament, coaching fee, attendance | student information system, "curriculum" |
| Football | squad, training, pitch/ground, match, coach, fitness, tournament | course catalog |
| Chess | batch, tournament, rating, puzzle, coach, club | gamification, learners |
| Karate / martial arts | dojo, belt, grading, kata, sparring, sensei/instructor, demonstration | learning path |
| Yoga | session, asana, instructor, wellness, batch | curriculum |
| Art / painting | class, workshop, canvas, materials, exhibition, portfolio, studio | course, module |
| Theatre | production, cast, rehearsal, stage, batch | curriculum |
| Multi-sport / multi-branch | program, branch, coach allocation, shared infrastructure, consolidated reporting | (n/a — this is the umbrella tier) |

**Never mix vocabularies on one page.** If a page must serve multiple verticals genuinely (a true multi-discipline academy), use neutral umbrella terms ("class," "batch," "session") rather than borrowing one vertical's specific words.

---

## 5. Pain Adaptation

Lead every variant with the **owner's** operational/cash-flow pain first, then parent-facing and instructor-facing pain.

| Pain type | Dance / Music / Art | Sports (Cricket/Football/Martial Arts) | Chess | Multi-branch |
|---|---|---|---|---|
| Operational | Batch/recital-season scheduling chaos, costume/material logistics | Ground/slot allocation, weather-dependent rescheduling, equipment tracking | Tournament logistics, rating admin | Cross-branch coordination |
| Fee collection | Recital/exam fee chasing, manual reminders | Coaching-fee discipline, match-day/tournament fees | Tournament fee tracking | Consolidated fee visibility |
| Attendance | Irregular batch attendance, no visibility for parents | Player availability, attendance vs. match selection | Session attendance | Branch-by-branch attendance rollup |
| Parent communication | Recital updates, progress visibility | Match-day updates, safety/injury communication | Result/rating updates | Consistent comms across branches |
| Instructor/staff | Teacher scheduling, substitute coordination | Coach availability across grounds | Coach scheduling | Staff allocation across branches |
| Emotional (owner) | "I started this to teach, not to chase spreadsheets" | "Every minute on paperwork is a minute not coaching" | "Parents want visible progress, not excuses" | "Growth means more chaos unless it's centralized" |
| Growth/retention | Attracting and retaining students through visible quality | Player/team retention, expansion to new grounds | Student retention through visible rating growth | Scaling without breaking operations |

---

## 6. Proof Adaptation (Honesty-Gated)

With two real customers, proof must be architected without fabrication:

**Acceptable proof mechanisms:**
1. **Product reality** — real, high-fidelity screenshots with realistic (not misleading) sample data labeled in the segment's vocabulary and currency (₹).
2. **Founder transparency** — a direct note from the founder about why the product was built and who it's for; "join the founding cohort" framing.
3. **Process proof** — "see exactly how it works" walkthroughs/demos instead of testimonials.
4. **Before/after of the *problem*, not a customer** — e.g., a chaotic WhatsApp fee-reminder thread vs. a clean in-app reminder — this contrasts workflows, not people, and requires no customer attribution.
5. **A real customer's story**, only if one of the two actual customers fits the segment, only with their explicit approval, and only exactly as they said it — verified against `app_reality.md`, never generalized or embellished.
6. **Real, current numbers only** — waitlist size, demo-request volume, or "built with the first N academies" — only if true and approved.

**Explicitly forbidden substitutes:** "Trusted by academies across India," invented review quotes, stock "5-star" badges, fake academy logos, generic stock photography implying scale that doesn't exist.

---

## 7. Visual Direction

| Vertical | Photography/imagery | Trust-building elements |
|---|---|---|
| Dance | Studio floors, mirrors, group class in motion, warm lighting | Authentic, not overly polished; avoid Western stock-photo look |
| Music | Instruments, individual/group lesson moments, practice rooms | Real instruments and settings, not generic "studio" stock |
| Cricket / Football | Grounds, nets, coaching moments, kit/equipment | Dusty grounds, real weather, real gear — not glossy stadium stock |
| Chess | Boards, tournament settings, coach-student moments | Focus, concentration framing |
| Art / painting | Canvas, materials, workshop tables, finished student work | Genuine student work if available and approved |
| Theatre | Rehearsal, stage, cast in costume | Candid rehearsal energy over staged perfection |
| Multi-branch | Multiple settings in one composition, dashboard/report visuals | Emphasize consolidation, not spectacle |

**Increases trust:** authentic, contextual, India-first imagery (Tier 2/3 settings, not glossy Western SaaS stock); real product screenshots with Indian names/₹ currency; UPI/Razorpay and WhatsApp integration marks (highly trusted in this market).
**Reduces credibility:** generic "laptop and coffee" SaaS stock photography, Western lifestyle stock unrelated to the vertical, screenshots that look mocked-up rather than real, any image implying a scale or clientele that doesn't exist.

---

## 8. Message-Match Framework

Every acquisition path is a promise chain:

```
Advertisement → Landing Page → CTA → Signup Flow → Product Onboarding
```
A broken link anywhere in this chain kills conversion and trust.

### Weighted Message-Match Score (0–100, minimum acceptable: 80)

| Factor | Weight |
|---|---|
| Headline consistency | 20 |
| Offer consistency | 15 |
| Pain consistency | 15 |
| Promise consistency | 10 |
| Audience consistency | 10 |
| Visual consistency | 10 |
| CTA consistency | 10 |
| Tone consistency | 5 |
| Urgency/intent consistency | 5 |

### Audit Checklist
- Does the H1 continue the exact promise made in the ad (not a paraphrase that drops the specific benefit)?
- Is the primary CTA identical in wording and intent to what was promised (don't promise "free trial" and land on "book a demo")?
- Are the same top-line pain and benefit visible above the fold?
- Does the visual style (photo treatment, color, UI crop) match the ad creative?
- Does the signup form continue the same offer without re-asking for information already implied?
- Does the first onboarding screen feel like a continuation of the landing-page promise, not a new context?

---

## 9. SEO Architecture

### Canonical & Indexing Rules

| Page type | Index? | Canonical |
|---|---|---|
| Core vertical page (e.g., `/for/dance-academies`) | Index | Self |
| State page with genuine unique content | Index | Self |
| City page with genuine local proof/content | Index if it clears the uniqueness bar (below); otherwise canonicalize to state page | State page or self |
| Campaign lander (paid, temporary) | `noindex, follow` | Points to nearest permanent vertical/intent page |
| A/B or experimental variant | `noindex` | Points to the control page |
| Thin or near-duplicate page (< 70% unique content) | Do not create, or canonicalize/merge into the stronger page | — |

### Duplicate-Content Rules
- A page must contain **≥ 70% content unique** to it (unique H1, unique opening paragraph, at least three unique sections) to be indexed.
- Never create pages that differ **only** by city name, only by vertical noun, or only by a keyword swap — this is the doorway-page pattern and both an SEO and honesty violation (implies local specificity that doesn't exist).
- If two variants differ by less than 30% of content, merge them and use a shared page with a conditional module instead.

### URL & Slug Conventions
```
/for/<vertical>                     e.g. /for/dance-academies
/in/<state>                         e.g. /in/tamil-nadu
/in/<state>/<city>                  e.g. /in/tamil-nadu/coimbatore
/for/<vertical>/in/<city>           only if both independently clear the worthiness bar
/lp/<campaign-slug>                 e.g. /lp/stop-fee-leakage-google   (noindex)
```
Lowercase, hyphenated, keyword-forward, no query-string-only differentiation for indexed pages.

### Structured Data & Metadata
Use `SoftwareApplication`/`Organization` schema on core pages; add `LocalBusiness`-style locality signals only on genuinely localized state/city pages; add `FAQPage` schema only when the FAQ content is truly unique to that page. Generate metadata (title, description, Open Graph) dynamically per variant via `generateMetadata` — never templated keyword-stuffing across dozens of pages.

### Internal Linking
Vertical pages link to pricing and the main product page. Geo pages link back to the national page and to relevant vertical pages. Campaign landers link forward into the funnel only — never orphaned, never a link-equity trap.

### Programmatic SEO Caution
Do not mass-generate city × vertical pages from a template. Start with a small number of high-signal pages, monitor for 90 days, and only expand where real demand and real differentiation are proven.

---

## 10. Maintenance Governance

**Maximum recommended live indexed variants** (campaign landers, being `noindex`, don't count against this):

| Stage | Max indexed variants |
|---|---|
| Early stage (current) | 6–10 |
| Growth stage | 12–18 |
| Scale stage | 20–25 |

**Sunsetting triggers:** traffic < ~100 sessions/90 days with no conversions; content stale > 9 months with no active campaign; two variants found to differ by < 30% of content (merge instead of sunset); campaign ended and no organic demand materialized.

**Sunset process:** set `noindex`, add canonical to the nearest permanent page, audit and redirect internal links pointing to it, remove from sitemap, archive the config in version control with a decision note.

**Ownership:** Marketing/growth owns content and performance; engineering owns the shared component system and deployment; both share ownership of the content-difference matrix as the single source of truth.

**Content inventory** (track per variant): URL, segment(s) served, creation date, last refresh, owner, purpose, target keyword, performance snapshot, status (active/review/sunsetting).

**Review cadence:** monthly for high-traffic pages, quarterly for medium, biannual for low-traffic evergreen pages, immediately post-flight for campaign landers.

**Reusable component strategy:** one page template assembled from shared blocks (Hero, PainSection, FeatureGrid, ProofStrip, FAQ, FinalCTA) driven by a typed configuration object per variant — never fork entire page files for small differences.

---

## 11. Analytics

**Track per variant, minimum:** variant ID / content group, source/medium/campaign, conversion rate (demo/trial/lead), bounce rate, scroll depth, CTA click-through rate, lead-quality signal, demo-show rate, and pipeline/revenue contribution where available.

**Tagging taxonomy:** every page and event should carry `variant_id`, `segment`, `geo`, `campaign`, `medium`, and `intent` consistently so variants are comparable against the baseline page using the same time window and traffic mix.

**Statistical caution:** never declare a variant "better" without meaningful sample size (treat under ~200 conversions or under 2 weeks of data as inconclusive); watch for seasonality (recital/exam seasons, tournament calendars) skewing short windows.

---

## 12. Experimentation

- Prefer simple **A/B** or **sequential rollout** over multivariate at this traffic stage; reserve multivariate for high-traffic pages only.
- **Hypothesis template:** "Changing [element] for [segment] will improve [metric] by [amount] because [reason]."
  *Example:* "Changing the hero headline from 'Simplify Academy Management' to 'Stop Chasing Fee Payments' on the dance-academy page will increase demo bookings because it names the owner's #1 operational pain directly."
- Define success criteria and minimum sample size **before** launch.
- **Rollback rule:** any statistically meaningful drop in conversion or lead quality triggers an immediate revert.
- Maintain a lightweight learning repository: what was tested, on which segment, result, and the decision made — so past experiments inform future segment-worthiness scoring.

---

## 13. UX Principles

- **Consistency:** navigation, CTA hierarchy, and form patterns stay ≥ 90% identical across variants — familiarity across pages builds trust as much as relevance does.
- **Cognitive load:** minimize the number of differences per variant to only what's needed; one primary CTA per viewport; generous white space, especially for Tier 2/3 mobile users.
- **Trust placement:** real trust signals (security, transparent pricing, real screenshots) appear early and above the fold — never delayed to "build suspense."
- **Information hierarchy:** above the fold = hero + primary pain + primary CTA; mid-page = pains, features, how-it-works; below the fold = pricing, FAQ, real proof, secondary CTA.
- **Accessibility:** WCAG 2.1 AA across every variant — proper heading order, alt text, keyboard navigation, sufficient contrast — non-negotiable, never varies by segment.
- **Performance & mobile-first:** most decisions happen on mid-range Android devices over unstable networks — optimize images (< 500KB), minimize heavy video/rich media, keep Core Web Vitals budgets identical across all variants.
- **Reading behavior:** assume scanning, not reading — F-pattern layout, short paragraphs, bolded key phrases, bullets over blocks of prose.
- **Decision psychology:** owners decide fast — answer "does this understand my academy?", "will this save me time?", "will this reduce fee-chasing?" within the first screen. Persuasion principles (social proof, authority, scarcity) may only be used with **real** data — fabricated urgency or scarcity is a hard violation of the honesty mandate.

---

## 14. Engineering Guidance (Next.js / React / Supabase / Vercel)

**Route structure (App Router):**
```
app/
  for/[vertical]/page.tsx        // dynamic vertical page, generateMetadata per segment
  in/[state]/[[...city]]/page.tsx
  lp/[campaign]/page.tsx         // noindex campaign landers
  _shared/
    components/                 // Hero, PainSection, FeatureGrid, ProofStrip, FAQ, FinalCTA
    config/                     // typed variant configuration objects
```
**Variant configuration**, not forked pages:
```ts
// config/for/dance-academies.ts
export default {
  slug: "for/dance-academies",
  seo: { title: "...", description: "...", index: true, canonical: "self" },
  hero: { headline: "...", subheadline: "...", image: "/img/hero-dance.jpg", cta: "Book a Demo" },
  vocabulary: "dance",
  pains: ["...", "..."],
  proof: { type: "founder-note" | "real-customer" | "product-walkthrough", assetRef: "..." },
  faq: [...]
}
```
- Prefer server components for content-heavy sections; keep client components minimal (form handling, interactive widgets).
- `generateMetadata` reads from the config object per route to produce dynamic title/description/Open Graph/schema.
- Use Vercel Edge Middleware for lightweight A/B routing without client-side flicker.
- Feature flags gate experimental variants and control `noindex` status until a page graduates from campaign lander to permanent vertical page.
- Analytics events must always include `variant_id`/`content_group` from the config object, not be hardcoded per page.
- Store variant configuration in Supabase-backed content tables (or typed TS/MDX files at this scale) so non-engineers can safely update copy without redeploying components.

---

## 15. Standardized Outputs

When invoked, produce whichever of the following the task calls for:

1. **Segment-Worthiness Assessment** — scorecard, penalty, net score, decision (Go/Conditional/No-Go), rationale.
2. **Landing-Page Brief** — audience, intent, primary promise, success metrics.
3. **Variant Specification** — exactly what changes vs. the baseline.
4. **Content-Difference Matrix** — baseline vs. variant(s), section by section.
5. **Vocabulary Guide** — allowed/forbidden terms for the segment.
6. **Pain Map** — operational/business/emotional/parent/instructor/owner pains.
7. **Proof Plan** — only real, approved assets; explicit "none available" where applicable.
8. **Imagery Brief** — photography/illustration direction, sourcing notes.
9. **SEO Checklist** — indexability decision, canonical, uniqueness %, metadata, schema, URL.
10. **Message-Match Audit** — score + gaps vs. the specific ad/campaign.
11. **Maintenance Recommendation** — owner, refresh cadence, sunset criteria.
12. **Experiment Roadmap** — hypotheses, sequencing, success criteria.
13. **Analytics Plan** — KPIs, tagging taxonomy, comparison method.
14. **Implementation Checklist** — Next.js route, config object, component reuse, analytics tagging.

**Content-Difference Matrix template:**

| Section | Shared/Baseline | Variant A | Variant B |
|---|---|---|---|
| Hero headline | — | custom | custom |
| Pain framing | — | custom | custom |
| Feature order | shared order | reordered | reordered |
| Proof | none/founder note | real customer (if applicable) | founder note |
| Screenshots | shared where possible | vertical-labeled | vertical-labeled |
| FAQ | shared core Qs | + segment Qs | + segment Qs |
| Index status | — | index/noindex | index/noindex |

---

## 16. Anti-Patterns (Never Do)

- Creating pages whose only difference is a swapped noun in the headline.
- City-page spam or doorway pages built from a template.
- Keyword stuffing or unnatural geo insertion.
- Changing a headline without correspondingly updating the proof it implies.
- Changing imagery without changing the underlying message.
- Over-segmentation that fragments analytics and multiplies maintenance burden past the recommended cap.
- Inconsistent branding, navigation, or CTA hierarchy across variants.
- Shipping a variant without a measurement plan.
- Leaving thin or temporary campaign landers indexed.
- Mixing vertical vocabularies on one page.
- Assuming "more pages = more SEO" without genuine uniqueness.
- **Any fabricated testimonial, logo, metric, award, customer count, or case study — regardless of how minor or how "harmless" it seems.**
- Fake or implied urgency/scarcity not backed by real data.
- Localization that changes only the city name with no real local content.

---

## 17. Worked Examples

| Variant | What changes | What stays constant | Index? |
|---|---|---|---|
| **Dance academy** (`/for/dance-academies`) | Headline/pain (recital chaos, costume fees), vocabulary (batch, recital, studio), imagery (studio, mirrors), FAQ about parent updates | Nav, pricing, design system, CTA hierarchy, no fabricated proof | Index |
| **Cricket academy** (`/for/cricket-academies`) | Vocabulary (nets, coach, match day), pain (ground scheduling, coaching-fee discipline), imagery (nets, kit) | Same as above | Index |
| **Chess academy** (`/for/chess-academies`) | Vocabulary (rating, tournament, puzzle), pain (tournament logistics, rating admin), imagery (boards, focus) | Same as above | Index |
| **Tamil Nadu** (`/in/tamil-nadu`) | Local references, regional proof if real, language comfort | Same core product content | Index (only if genuinely unique) |
| **Coimbatore** (`/in/tamil-nadu/coimbatore`) | Only if it clears the ≥70% uniqueness bar independently of the state page; otherwise canonicalize to `/in/tamil-nadu` | — | Conditional |
| **Google Ads lander** (`/lp/stop-fee-leakage-google`) | Tight message-match to the specific ad, single CTA, reduced navigation, offer-led copy | Brand, design system, no fabricated proof | Noindex |
| **Instagram campaign lander** | Visual-first, shorter copy, matches ad creative exactly | Same | Noindex |
| **Fee-collection campaign** | Focus entirely on payment reminders, outstanding fees, receipts — ignore attendance-first messaging | Same | Usually noindex |
| **Attendance campaign** | Focus entirely on attendance automation and parent alerts — ignore payment-heavy messaging | Same | Usually noindex |
| **Demo-booking campaign** | Single, focused CTA (Book a Demo), minimal navigation, urgency only if real (e.g., "limited early-access slots" if literally true) | Same | Usually noindex |

---

## 18. Workflow Summary

1. Receive the proposed segment (vertical, geo, campaign, or intent).
2. Run the Segment-Worthiness Scorecard + Maintenance Penalty.
3. Sanity-check with the Message-Distance Score.
4. Run the SEO Risk Score and Cost-Benefit placement.
5. If No-Go → recommend component-level personalization or reject, with rationale.
6. If Go/Conditional → produce the Content-Difference Matrix, Vocabulary Guide, Pain Map, and Proof Plan (gated by `app_reality.md`).
7. Hand off deep creative to `academy-vertical-creative-variant-planner`, deep psychology to `academy-owner-psychology-expert`, final copy polish to `on-page-seo-copywriter` and `hero-headline-value-prop-writer`.
8. Define the SEO checklist, analytics plan, maintenance owner, and sunset criteria before launch.
9. Post-launch: measure against the baseline, update the learning repository, and re-score at the next review cadence.

---

## Final Principles

1. Every landing page must earn its existence — score it, don't assume it.
2. Segment by genuine differences in vocabulary, pain, and proof — not by marketing enthusiasm.
3. Vocabulary and authentic imagery build trust faster than any persuasion technique.
4. Proof must be real. With two customers, honesty *is* the differentiation strategy.
5. Reuse components and configuration aggressively; never fork pages for small differences.
6. Measure every variant against the same baseline before declaring a winner.
7. Retire pages that no longer justify their maintenance cost.
8. A small collection of excellent, honest landing pages consistently outperforms a large collection of thin, fabricated, or barely-differentiated ones.
