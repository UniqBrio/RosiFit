---
name: saas-website-sitemap-architect
description: Owns the complete public, pre-login marketing website sitemap, URL hierarchy, navigation architecture, and page inventory for UniqBrio (India-first B2B SaaS for arts and sports academies), producing SEO-friendly, conversion-first, scalable site structures while staying strictly separate from in-app information architecture.
when_to_use: Trigger this skill whenever someone asks about website pages needed, sitemap creation, marketing site structure, public website architecture, URL structure, navigation menu architecture, or marketing site planning for UniqBrio's public website — before wireframing or Next.js implementation begins.
---

# SaaS Website Sitemap Architect

## Core Mission

This skill is the single source of truth for the **public, pre-login marketing website's** information architecture for UniqBrio — an India-first B2B SaaS platform for Arts & Sports Academy Management, built on React Native Expo PWA, Next.js, Supabase, PostgreSQL, Edge Functions, and Vercel.

**This skill owns:**
- The complete public marketing website sitemap (every page, section, sub-section)
- URL hierarchy, taxonomy, and naming conventions
- Navigation architecture: primary, secondary, utility, mobile, mega menus, breadcrumbs
- Page grouping and content organization by audience, topic, and funnel stage
- Funnel-stage mapping for every page
- Footer architecture handoff (structure and grouping, not visual implementation)
- Page relationships: parent-child hierarchy, cross-links, topic clusters
- Discoverability and future scalability of the site tree
- SEO-friendly structure: crawlability, indexability, keyword clustering
- Navigation consistency: uniform labeling, grouping, and depth rules

**Explicitly out of scope (owned by other skills):**
- In-app navigation and dashboard IA (post-login) — `information-architecture-expert`
- Product UX flows, application menus, internal routing — product/app-side skills
- Deep-link mechanics and route-level technical wiring — `navigation-deep-linking-expert`
- Visual footer design and component implementation — `footer-navigation-architect`
- Positioning, messaging, and brief-level strategy — `saas-website-strategy-brief-architect`
- File-system routing, rendering strategy, middleware — `nextjs-architect`

This skill decides **what pages exist, where they live in the hierarchy, what their URLs are, and how they're grouped and linked.** It hands off visual, messaging, and code-level execution to the skills above.

---

## Design Philosophy

1. **Simplicity** — Every page reachable within 3 clicks from the homepage. Clear, scannable labels. Minimal cognitive load.
2. **Scalability** — The tree must absorb 3–5 years of growth (new industries, new modules, new regions) without restructuring existing URLs.
3. **Logical Grouping** — Pages are grouped by buyer intent and topic, never by internal org chart or engineering convenience.
4. **Minimal Navigation Depth** — Maximum hierarchy depth of 3 levels (Section → Page → Sub-page), with rare, justified exceptions (e.g., blog category → post).
5. **SEO-First** — Keyword-relevant, flat-where-possible URLs; strong internal linking; topical authority through clustering.
6. **Conversion-First** — Every page exists to move a visitor toward Free Trial, Book Demo, Contact Sales, or Paid Subscription.
7. **Buyer-Journey Alignment** — Content placement mirrors Awareness → Consideration → Evaluation → Decision → Retention/Expansion.
8. **Information Scent** — Navigation labels and page titles match the exact language a Tier 2/3 Indian academy owner would search or expect.
9. **Consistency** — Identical naming conventions, singular/plural rules, and grouping logic applied everywhere, with zero exceptions.
10. **Predictable, Stable URL Design** — URLs are human-readable, hierarchy-reflective, and never change once published (redirect instead).
11. **Mobile-First Thinking** — Since UniqBrio's ICP browses primarily on Android phones in Tier 2/3 cities, navigation must collapse gracefully and load fast on low-end devices and unstable networks.

---

## Inputs

Before producing or revising a sitemap, this skill expects (and will assume sensible defaults for) the following inputs:

- **Product description** — modules: attendance, fee/payment collection, WhatsApp automation, scheduling, multi-branch management, EMS (Enquiry Management System), parent communication, reporting.
- **ICP** — owners/admins of dance, music, painting/drawing, martial arts, cricket, football, tennis, yoga, fitness, and multi-sport academies in Tier 2/3 Indian cities.
- **Positioning** — "India-first, mobile-first academy operations platform" vs. generic global school-management software.
- **Competitors** — other academy/school management SaaS (domestic and international); used to shape differentiation in Solutions/Industries copy, not duplicated here.
- **Pricing model** — subscription tiers with a free-trial or free-tier entry motion.
- **Product modules** — mapped 1:1 to Feature pages.
- **Industries served** — the 11+ verticals listed above, each meriting a dedicated Industry/Solution page.
- **Target countries** — India first; architecture must reserve clean paths for future regional/language expansion without breaking existing URLs.
- **SEO goals** — rank for academy-management, attendance-app, fee-collection-software, and industry-specific long-tail terms in English and (later) regional languages.
- **Conversion goals** — Free Trial, Book Demo, Contact Sales, Paid Subscription (in that funnel order for a bootstrapped, largely self-serve motion).
- **Launch stage** — early-growth, two-person team; architecture must be lean to build but structurally ready for scale.
- **Future roadmap** — Academy (education/content hub), partner ecosystem, developer/API surface, customer portal, community.

---

## Deliverables

Every invocation of this skill should be able to produce, on request:

1. **Complete Sitemap** — full hierarchical page tree (visual + flat inventory).
2. **Navigation Hierarchy** — primary, secondary, utility, mobile, mega-menu structures.
3. **URL Taxonomy** — full path conventions with worked examples.
4. **Page Inventory** — every page with purpose, audience, CTA, and funnel stage.
5. **Section Grouping** — logical clustering rules for each top-level bucket.
6. **Footer Structure** — grouped link inventory handed off for visual design.
7. **Redirect Strategy** — legacy URL and migration planning.
8. **Funnel Mapping** — page-to-funnel-stage table.
9. **Page Ownership Matrix** — goal, audience, CTA, owner, dependencies per page.
10. **Navigation Rules** — depth limits, dropdown limits, naming conventions.
11. **Internal Linking Plan** — hub-and-spoke and topic-cluster map.
12. **Expansion Plan** — how the tree accommodates future growth without breakage.

---

## Complete Website Page Inventory

Use this exhaustive category list as the default page-discovery checklist. For each category, the "why" is the buyer-journey or governance reason the page must exist.

|
Category
|
Representative Pages
|
Why It Exists
|
|
---
|
---
|
---
|
|
**
Home
**
|
`/`
|
Primary entry point; narrative + hero + proof + CTA for all traffic sources
|
|
**
Product
**
|
`/product`
,
`/product/overview`
|
Explains what UniqBrio is as a whole platform
|
|
**
Features
**
|
`/features`
,
`/features/attendance`
,
`/features/fee-collection`
,
`/features/whatsapp-automation`
,
`/features/scheduling`
,
`/features/multi-branch`
,
`/features/enquiry-management`
,
`/features/reports-analytics`
|
Capability-led discovery for Product/Solution-aware visitors; each maps 1:1 to a product module
|
|
**
Solutions
**
|
`/solutions/academy-owners`
,
`/solutions/coaches`
,
`/solutions/multi-branch-academies`
|
Role- and need-based framing distinct from industry framing
|
|
**
Industries
**
|
`/industries/dance-academies`
,
`/industries/music-academies`
,
`/industries/painting-drawing-schools`
,
`/industries/martial-arts-academies`
,
`/industries/cricket-academies`
,
`/industries/football-academies`
,
`/industries/tennis-academies`
,
`/industries/yoga-centers`
,
`/industries/fitness-coaching`
,
`/industries/multi-sport-academies`
|
Vertical-specific SEO landing pages matching exact search intent ("software for dance academy")
|
|
**
Use Cases
**
|
`/use-cases/fee-collection`
,
`/use-cases/attendance-tracking`
,
`/use-cases/parent-communication`
|
Job-to-be-done framing that cuts across industries
|
|
**
Roles
**
|
`/solutions/for-owners`
,
`/solutions/for-coaches`
,
`/solutions/for-admin-staff`
|
Speaks directly to the specific decision-maker or user persona
|
|
**
Pricing
**
|
`/pricing`
|
Self-serve qualification and conversion; must answer "what does it cost" with zero friction
|
|
**
Customers
**
|
`/customers`
,
`/customers/case-studies`
,
`/customers/testimonials`
|
Social proof hub building trust for a first-generation India-first brand
|
|
**
Case Studies
**
|
`/customers/case-studies/[slug]`
|
Deep-dive proof, industry-specific where possible
|
|
**
Testimonials
**
|
`/customers/testimonials`
|
Quick-scan trust signals for skimmers
|
|
**
Resources
**
|
`/resources`
,
`/resources/blog`
,
`/resources/guides`
,
`/resources/templates`
,
`/resources/webinars`
|
Top-of-funnel education and SEO authority hub
|
|
**
Blog
**
|
`/resources/blog/[category]/[slug]`
|
Ongoing SEO content engine, categorized by industry and topic
|
|
**
Guides
**
|
`/resources/guides/[slug]`
|
In-depth, downloadable/long-form educational assets
|
|
**
Documentation entry points
**
|
`/docs`
(public landing only, deep docs may live in a subdomain/app)
|
Signals product maturity to technical buyers/partners without exposing in-app IA
|
|
**
Academy (education hub)
**
|
`/academy`
|
UniqBrio's own branded learning hub for academy-business best practices — distinct from the product's "academy" customer entity; disambiguate clearly in navigation copy
|
|
**
Events
**
|
`/resources/events/[slug]`
|
Live engagement and lead capture
|
|
**
Webinars
**
|
`/resources/webinars/[slug]`
|
Recorded/on-demand education assets, MOFU
|
|
**
Templates
**
|
`/resources/templates/[slug]`
|
Lead-magnet downloads (fee receipt templates, attendance sheets, etc.)
|
|
**
Downloads
**
|
`/resources/downloads`
|
Generic asset hub if templates/guides grow large enough to need one index
|
|
**
Company
**
|
`/company/about`
,
`/company/careers`
,
`/company/partners`
,
`/company/contact`
,
`/company/press`
,
`/company/media-kit`
|
Trust, culture, and PR surface
|
|
**
Trust
**
|
`/security`
,
`/security/compliance`
|
Enterprise/parent-facing confidence signals (data safety for student/parent PII)
|
|
**
Integrations
**
|
`/integrations`
,
`/integrations/[name]`
|
Ecosystem breadth signal; also future revenue channel
|
|
**
API overview
**
|
`/developers`
|
Public-facing developer/partner entry point (deep API docs can live elsewhere)
|
|
**
Legal
**
|
`/legal/privacy`
,
`/legal/terms`
,
`/legal/cookies`
,
`/legal/refund`
,
`/legal/dpa`
,
`/legal/accessibility`
|
Compliance-mandatory, especially given India's DPDP Act 2023 obligations and student/minor data handling
|
|
**
Sitemap
**
|
`/sitemap`
(HTML) +
`/sitemap.xml`
|
Discoverability for users and search engines
|
|
**
404
**
|
custom 404 page
|
Recovery path with search + nav, avoids dead ends
|
|
**
Search
**
|
`/search`
|
Site-wide content discovery once Resources/Blog grows large
|
|
**
Landing/Campaign pages
**
|
`/lp/[campaign-slug]`
|
Ad-traffic and outbound-DM landing pages, kept outside primary nav to avoid nav bloat
|
|
**
Regional pages
**
|
reserved pattern, e.g.
`/tamil-nadu`
or state-level slugs if warranted
|
Tier 2/3 India go-to-market may justify state-specific proof/pricing framing later
|
|
**
Future expansion
**
|
`/enterprise`
,
`/partners`
,
`/marketplace`
,
`/community`
|
Reserved slugs so growth doesn't collide with existing taxonomy
|

---

## Sitemap Construction Methodology

Follow this repeatable, five-step framework whenever building or auditing a sitemap:

1. **Define top-level sections first.** Start from the primary navigation, not from a brainstormed page list. Top-level sections for UniqBrio: `Product`, `Solutions`/`Industries`, `Pricing`, `Customers`, `Resources`, `Company`.
2. **Attach child pages by buyer intent, not by feature count.** Every child page must answer a specific question a visitor has at a specific funnel stage.
3. **Add grandchild pages only when justified.** A third level (e.g., `/resources/blog/attendance/[slug]`) is acceptable; a fourth level is not — flatten it instead.
4. **Enforce a 3-level depth ceiling.** Home → Section → Page → (rare) Sub-page. If content requires deeper nesting, it's a sign the top-level taxonomy needs a new section, not deeper folders.
5. **Validate no orphans and no duplication.** Every page must have at least one inbound link from a discoverable parent or hub; no two URLs may serve near-identical content (use canonical tags if unavoidable).

Additional construction rules:
- **Cross-link at construction time, not as an afterthought.** When adding a page, immediately identify 2–3 sibling or parent pages it should link to.
- **Design for future growth from day one.** Reserve slugs (e.g., `/industries` as a plural hub) so a new academy vertical is a new child page, never a taxonomy change.
- **Separate "Solutions" (role/need-based) from "Industries" (vertical-based)** to avoid mixed-audience pages that try to speak to everyone and end up speaking to no one.

---

## URL Architecture

**Non-negotiable rules:**
1. **Lowercase only.** `/pricing`, never `/Pricing`.
2. **Hyphens for word separation.** `/fee-collection`, never `/fee_collection` or `/feeCollection`.
3. **Plural for collections, singular for unique entities.** `/features` (collection) vs. `/pricing` (single page).
4. **Concise slugs.** 2–4 words maximum; `/features/fee-collection`, not `/features/comprehensive-fee-and-payment-collection-system`.
5. **Hierarchy reflects folder structure.** `/industries/dance-academies` is a child of `/industries`.
6. **Avoid unnecessary nesting.** `/industries/dance-academies`, never `/solutions/industries/arts/dance/academies`.
7. **Stable and redirect-safe.** Once published, a URL is never changed without a 301 redirect from the old path.
8. **Human-readable over ID-based.** `/customers/case-studies/coimbatore-dance-academy`, never `/customers/case-studies/1043`.
9. **Keyword-relevant where natural.** Slugs should contain the term a buyer would search, without keyword-stuffing.
10. **Canonical per page.** Exactly one canonical URL per unique piece of content; use `<link rel="canonical">` for any necessary near-duplicates (e.g., paginated blog listings).

**Worked examples:**
- `/` — Home
- `/product` — Product overview
- `/features/attendance-tracking`
- `/features/whatsapp-automation`
- `/solutions/multi-branch-academies`
- `/industries/martial-arts-academies`
- `/pricing`
- `/customers/case-studies/[slug]`
- `/resources/blog/fee-collection/[slug]`
- `/resources/guides/[slug]`
- `/company/about`
- `/security`
- `/legal/privacy`
- `/integrations/[integration-name]`

---

## URL Taxonomy Standards

Reserve these top-level roots and never repurpose them for unrelated content:

- `/` — Home
- `/product` — Product-level overview (single hub, links out to Features)
- `/features` — Feature collection hub + individual feature pages
- `/solutions` — Role/need-based solution pages
- `/industries` — Vertical/industry-based landing pages
- `/pricing` — Pricing (flat, no deep children unless an `/pricing/enterprise` tier emerges)
- `/customers` — Social proof hub (case studies + testimonials)
- `/resources` — Education hub (blog, guides, templates, webinars, events)
- `/company` — About, careers, partners, contact, press
- `/security` — Trust/compliance hub
- `/legal` — Privacy, terms, cookies, refund, DPA, accessibility
- `/integrations` — Ecosystem/partner integrations
- `/developers` — Public API/partner entry point

**Child URL conventions:**
- Feature children: `/features/[feature-slug]` — one level only.
- Industry children: `/industries/[industry-slug]` — one level only; never nest a use-case under an industry (`/industries/dance-academies/attendance` is forbidden — link instead).
- Resource children: `/resources/blog/[category]/[slug]`, `/resources/guides/[slug]`, `/resources/templates/[slug]`, `/resources/webinars/[slug]`, `/resources/events/[slug]`.
- Legal children: `/legal/[document-slug]` — flat, one level.
- Company children: `/company/[page-slug]` — flat, one level.

---

## Navigation Architecture

**Primary navigation (5–7 items max):**
`Product` (or `Features`) · `Solutions`/`Industries` · `Pricing` · `Customers` · `Resources` · `Company`

**Secondary navigation (dropdowns/mega menus):**
- Under `Product`/`Features`: group by module family (Attendance & Scheduling / Payments & Fees / Communication & WhatsApp / Enquiry & Growth) rather than a flat alphabetical list.
- Under `Solutions`/`Industries`: split into "By Role" (Owners, Coaches, Admin Staff) and "By Vertical" (Dance, Music, Painting/Drawing, Martial Arts, Cricket, Football, Tennis, Yoga, Fitness, Multi-Sport).
- Under `Resources`: Blog, Guides, Templates, Webinars, Events.
- Under `Company`: About, Careers, Partners, Contact, Press.

**Utility navigation (top-right, persistent):**
- **Login** (in-app boundary handoff)
- **Book Demo** (secondary CTA)
- **Free Trial / Start Free** (primary CTA, visually dominant)

**Mobile navigation:**
- Collapsed hamburger with the same hierarchy as desktop, using accordions for dropdown sections.
- CTAs (`Free Trial`, `Book Demo`) remain visible/sticky given the ICP's mobile-first, often single-handed phone usage in Tier 2/3 cities.
- Design for low-end Android devices and patchy connectivity: keep the nav lightweight, avoid heavy mega-menu assets on first paint.

**Mega menus:**
- Use only where a section has 8+ children (e.g., Industries). Organize into labeled columns with short descriptors, not just bare links.
- Maximum 3–4 columns for readability; each column capped at 6–8 links.

**Contextual navigation:**
- Every Feature page links to 2–3 related Industry pages and vice versa (e.g., `/features/attendance-tracking` → `/industries/martial-arts-academies`).
- Every Blog post links to its parent Resources category and to 1–2 related Feature or Solution pages.

**Sticky navigation:** Primary nav bar remains visible on scroll on both desktop and mobile so CTAs stay one tap away at all times.

**Breadcrumbs:** Present on all pages below depth 1 (e.g., Home > Resources > Blog > [Post Title]) — critical for both SEO and orienting users inside deep content sections like Blog/Guides.

**Grouping rules:**
- Group by buyer intent, never by internal team ownership.
- Never place the same destination under two different primary nav items.
- Order primary nav items by funnel priority: product understanding → vertical relevance → price → proof → resources → company.

---

## Footer Architecture (Handoff)

This skill defines the **content and grouping**; visual design, responsive behavior, and component implementation are handed off to `footer-navigation-architect`.

**Recommended footer column grouping:**
- **Product** — Features, Integrations, Pricing, Security
- **Solutions** — Key industry links (Dance, Cricket, Martial Arts, Yoga, etc. — pick the 5–6 highest-intent verticals; link to `/industries` for the rest)
- **Resources** — Blog, Guides, Templates, Webinars, Academy
- **Company** — About, Careers, Partners, Contact, Press, Media Kit
- **Legal** — Privacy, Terms, Cookies, Refund, DPA, Accessibility
- **Social & Regional** — Social icons, language/region selector (reserved for future use)

**Bottom bar:** Copyright notice + condensed legal links (Privacy · Terms · Security · Status).

**Handoff contract with `footer-navigation-architect`:** this skill supplies the link inventory, grouping logic, and rationale; the receiving skill owns column widths, responsive collapse behavior, iconography, and visual hierarchy.

---

## Funnel Mapping

Every page must be tagged to a funnel stage so content ownership and CTA placement are unambiguous.

|
Funnel Stage
|
Example Pages
|
Primary CTA
|
|
---
|
---
|
---
|
|
**
Awareness
**
|
Home, Blog, Industry landing pages
|
Learn More / Explore
|
|
**
Problem Aware
**
|
Blog (pain-point posts), Guides
|
Read Guide / Subscribe
|
|
**
Solution Aware
**
|
Solutions (by role/need), Use Cases
|
See How It Works
|
|
**
Product Aware
**
|
Product overview, Feature pages
|
Book Demo
|
|
**
Evaluation
**
|
Feature deep-dives, Integrations, Security
|
Start Free Trial
|
|
**
Comparison
**
|
Pricing (with tier comparison)
|
Compare Plans
|
|
**
Decision
**
|
Pricing, Case Studies, Testimonials
|
Start Free Trial / Contact Sales
|
|
**
Purchase
**
|
Pricing → checkout (in-app handoff)
|
Subscribe
|
|
**
Expansion
**
|
(in-app; out of scope)
|
—
|
|
**
Referral
**
|
Partners, future referral program page
|
Refer & Earn (future)
|
|
**
Retention
**
|
Resources/Academy, Help Center link
|
Explore Resources
|

---

## Internal Linking Strategy

- **Hub-and-spoke model:** `/industries` and `/features` act as hubs; each individual industry/feature page is a spoke that links back to its hub and sideways to 2–3 related spokes.
- **Topic clusters:** Group Blog content into pillar + cluster structures (e.g., pillar `/resources/blog/fee-collection` with cluster posts on GST receipts, WhatsApp payment reminders, late-fee policies), all interlinked.
- **Cross-links between Solutions and Industries:** A role-based Solutions page (e.g., "For Academy Owners") should link to the 3–4 most relevant Industry pages, and vice versa.
- **CTA pathways:** Educational content (Blog/Guides) links forward to Product/Feature pages, which link forward to Pricing, which links forward to Free Trial/Book Demo.
- **Resource linking:** Case studies link to the specific Feature pages that solved the customer's problem; Feature pages link to relevant case studies as proof.
- **SEO clusters:** Build keyword clusters around each Industry page (e.g., all "dance academy" content interlinks) to build topical authority per vertical.

---

## SEO Architecture

- **Crawlability:** Maintain an auto-generated `/sitemap.xml`; ensure `robots.txt` doesn't accidentally block Resources, Industries, or Features.
- **Indexability:** No unintentional `noindex` on money pages (Pricing, Industries, Features); campaign/landing pages (`/lp/*`) may be intentionally `noindex` if duplicative.
- **URL consistency:** Enforce one canonical domain form (https, non-www or www — pick one), no trailing-slash inconsistency, and no case-sensitivity issues.
- **Canonical URLs:** Every page declares its own canonical; paginated or filtered views canonicalize to the primary version.
- **Page depth:** Keep money pages (Industries, Features, Pricing) within 2 clicks of Home; deeper content (individual blog posts) can sit at depth 3.
- **XML sitemap readiness:** New pages must be automatically included; deprecated pages removed and redirected before removal from the sitemap.
- **Internal linking:** As detailed above — every page needs at least one strong contextual inbound link, not just a nav link.
- **Localization readiness:** Reserve URL space for future language/region variants (e.g., `/ta/` for Tamil) without needing to restructure the English tree.
- **Keyword clustering:** Map each Industry and Feature page to a primary keyword and 3–5 secondary keywords; avoid keyword cannibalization between similar pages (e.g., `/industries/multi-sport-academies` vs. individual sport pages must target clearly distinct queries).

---

## Navigation Rules

- **Maximum navigation depth:** 3 levels from Home.
- **Maximum dropdown/mega-menu size:** 8–10 links per column, 3–4 columns per mega menu.
- **Naming consistency:** Nav label, page `<title>`, and URL slug must all agree in terminology (don't call it "Solutions" in nav and "Use Cases" in the URL).
- **No duplicate destinations:** A single URL must not appear under two different nav labels.
- **No multiple URLs for the same content:** Merge or canonicalize instead of publishing near-duplicate pages.
- **Menu ordering:** Sequence primary nav by funnel priority (Product → Industries → Pricing → Customers → Resources → Company), not alphabetically.
- **CTA placement:** Primary CTA (`Free Trial`) must appear in utility nav on every page and repeat within page content on Pricing, Features, and Industry pages.

---

## Page Ownership Matrix

Every page in the inventory should be documented with these fields:

|
Field
|
Description
|
|
---
|
---
|
|
**
URL
**
|
Final canonical path
|
|
**
Goal
**
|
The single job this page must do
|
|
**
Primary audience
**
|
e.g., "Cricket academy owner, 35–50, Tier 2 city"
|
|
**
Secondary audience
**
|
e.g., "Coach evaluating on owner's behalf"
|
|
**
Primary CTA
**
|
e.g., Free Trial
|
|
**
Secondary CTA
**
|
e.g., Book Demo
|
|
**
Funnel stage
**
|
From the mapping table above
|
|
**
Content owner
**
|
Marketing/founder-led for a two-person team
|
|
**
Future dependencies
**
|
e.g., "Depends on staff-profile schema before Coaches solution page can show live testimonials"
|

**Worked example:**

|
Field
|
Value
|
|
---
|
---
|
|
URL
|
`/industries/dance-academies`
|
|
Goal
|
Convince a dance academy owner UniqBrio understands their specific operational pain
|
|
Primary audience
|
Dance academy owner
|
|
Secondary audience
|
Dance instructor evaluating on owner's behalf
|
|
Primary CTA
|
Start Free Trial
|
|
Secondary CTA
|
Book Demo
|
|
Funnel stage
|
Solution Aware → Evaluation
|
|
Content owner
|
Founder-led marketing
|
|
Future dependencies
|
Needs at least one dance-academy case study before launch for credibility
|

---

## Redirect Strategy

- **Legacy URLs:** Any URL that has ever been indexed or linked externally gets a permanent (301) redirect when restructured — never a silent removal.
- **URL migrations:** Batch-plan migrations; test redirects in TEST/staging before production DNS/Vercel cutover.
- **301 vs. 302:** Use 301 for permanent restructuring/consolidation; reserve 302 only for genuinely temporary redirects (e.g., a time-boxed campaign page).
- **Canonical replacements:** When two pages are merged, 301 the deprecated URL to the surviving canonical URL and update all internal links to point directly at the new URL (don't rely on the redirect chain long-term).
- **Content consolidation:** If two Industry pages overlap heavily (e.g., a future "Combat Sports" page vs. existing "Martial Arts"), consolidate deliberately rather than letting both rank weakly.
- **Sunsetting pages:** Announce deprecation, redirect, then remove from `/sitemap.xml` only after search engines have re-crawled the redirect.
- **Future restructuring:** Any planned taxonomy change must ship with a full old-URL → new-URL redirect map before go-live.

---

## Expansion Strategy

The sitemap must absorb the following growth vectors without breaking existing URLs:

- **Internationalization:** Reserve a locale-prefix pattern (e.g., `/ta/...`) rather than retrofitting later.
- **New verticals/products:** New Industry pages slot under `/industries/[new-vertical]`; a genuinely new product line gets its own top-level section, not a forced fit under Features.
- **Enterprise tier:** `/pricing/enterprise` or `/enterprise` as a dedicated page once multi-branch/enterprise buyers become a distinct segment.
- **Partner ecosystem:** `/partners` (Company-adjacent) and `/integrations` (Product-adjacent) as separate, clearly scoped sections.
- **Marketplace:** Reserve `/marketplace` as a future top-level section if a template/add-on marketplace emerges.
- **Developer portal:** `/developers` as the public entry point; deep API reference can live on a subdomain without disturbing marketing URL taxonomy.
- **Academy/education hub:** `/academy` for UniqBrio's own thought-leadership/education brand — keep naming distinct from the "academy" customer entity in nav copy and page titles to avoid buyer confusion.
- **Community:** `/community` reserved for a future forum/user-community surface.
- **Customer portal:** Any post-signup customer-only marketing surface (e.g., referral dashboard) is explicitly in-app IA and out of this skill's scope.

---

## Cross-Skill Coordination

- **`information-architecture-expert`** — Owns in-app/dashboard IA. This skill stops at the login boundary; anything behind auth is their domain.
- **`navigation-deep-linking-expert`** — Owns deep-linking mechanics, route guards, and technical navigation behavior across web/mobile. This skill defines *what the URLs and hierarchy are*; that skill defines *how routing/deep-linking technically executes* them.
- **`footer-navigation-architect`** — Receives this skill's footer link inventory and grouping rationale, then owns visual layout, responsive behavior, and component build.
- **`saas-website-strategy-brief-architect`** — Owns positioning, messaging, and ICP/competitive strategy that feeds into *why* pages say what they say. This skill consumes that strategy as an input but does not originate messaging.
- **`nextjs-architect`** — Owns file-system routing, rendering strategy (SSG/ISR/SSR), and Vercel deployment mechanics that implement the URL taxonomy this skill defines. This skill hands off a clean URL/page tree; that skill decides how it's built in the App Router.

**Ownership boundary in one line:** this skill decides *what pages exist and where they sit*; the coordinating skills decide *how they look, how they route, how they're worded, and how they're built.*

---

## Anti-Patterns

Avoid these mistakes at all costs:

- **Deep nesting** — anything beyond 3 levels (`/solutions/industries/sports/cricket/coaching`).
- **SEO-unfriendly URLs** — IDs, dates, query strings, or camelCase in public paths.
- **Duplicate pages** — two URLs serving near-identical content without canonicalization.
- **Navigation overload** — more than 7 primary nav items, or dropdowns with 15+ ungrouped links.
- **Feature dumping** — a flat, alphabetical feature list with no benefit-oriented grouping.
- **Poor grouping** — organizing by internal team structure instead of buyer intent.
- **Unclear labels** — nav items that don't match the page's actual content or the visitor's search term.
- **Mixed audiences** — a single page trying to speak to academy owners, coaches, and parents simultaneously.
- **Orphan pages** — any page with zero inbound links from a discoverable parent.
- **Broken hierarchy** — child pages whose parent has been removed or renamed without redirect.
- **Poor scalability** — a taxonomy that requires renaming existing top-level sections to fit new verticals.
- **Inconsistent slugs** — mixing singular/plural, hyphens/underscores, or casing across the same section.

---

## Quality Checklist

Run through this list before finalizing any sitemap or navigation deliverable:

- [ ] Every page reachable within 3 clicks from Home
- [ ] No orphan pages — every page has at least one inbound contextual or nav link
- [ ] No duplicate destinations across nav items
- [ ] All slugs lowercase, hyphenated, and consistently singular/plural
- [ ] Maximum navigation depth respected (3 levels)
- [ ] Primary nav capped at 5–7 items
- [ ] Dropdowns/mega menus capped at 8–10 links per column
- [ ] Every page tagged with a funnel stage
- [ ] Every page has a defined primary CTA
- [ ] Industries and Solutions are clearly differentiated, not overlapping
- [ ] Footer link inventory grouped and hand-off-ready
- [ ] Legal/compliance pages present (Privacy, Terms, Cookies, Refund, DPA, Accessibility) — important given India's DPDP Act and student/minor data
- [ ] Canonical URL defined for every page; no unintentional duplicate content
- [ ] XML sitemap and robots.txt reviewed for crawlability
- [ ] Redirect map exists for any changed/removed URL
- [ ] Breadcrumbs planned for all depth-2+ pages
- [ ] Mobile navigation collapses cleanly and keeps CTAs visible
- [ ] Reserved URL space exists for at least: enterprise, partners, developers, academy, community, localization
- [ ] No page tries to serve more than one primary audience
- [ ] Blog/Resources content organized into interlinked topic clusters, not an unstructured list
- [ ] Cross-links exist between related Industry and Feature pages
- [ ] Page Ownership Matrix completed for every net-new page

---

## Best Practices

- Treat the sitemap as a living document — version it alongside major roadmap milestones, not just at launch.
- For a lean two-person team, prioritize the smallest set of pages that covers the funnel end-to-end before building out every Industry vertical — ship Home, Product, top 3 Industries, Pricing, and one Case Study first; expand from there.
- Use India-specific proof points and terminology (₹, GST-compliant receipts, WhatsApp-first communication) throughout page purpose definitions, even though this skill doesn't write the copy itself.
- Keep the "Academy" (UniqBrio's education/content brand) and "academy" (the customer's business) naming disambiguated everywhere in navigation and page titles.
- Favor evergreen URLs (no dates, no version numbers) so content can be refreshed without link rot.
- Design the taxonomy so that adding a new sport/art vertical is always just one new child page under `/industries` — never a structural change.

---

## Examples

### Example: Full Sitemap Hierarchy (excerpt)

Home (/)
├── Product (/product)
│ └── Features (/features)
│ ├── /features/attendance-tracking
│ ├── /features/fee-collection
│ ├── /features/whatsapp-automation
│ ├── /features/scheduling
│ ├── /features/multi-branch
│ └── /features/enquiry-management
├── Solutions (/solutions)
│ ├── /solutions/academy-owners
│ ├── /solutions/coaches
│ └── /solutions/multi-branch-academies
├── Industries (/industries)
│ ├── /industries/dance-academies
│ ├── /industries/music-academies
│ ├── /industries/painting-drawing-schools
│ ├── /industries/martial-arts-academies
│ ├── /industries/cricket-academies
│ ├── /industries/football-academies
│ ├── /industries/tennis-academies
│ ├── /industries/yoga-centers
│ ├── /industries/fitness-coaching
│ └── /industries/multi-sport-academies
├── Pricing (/pricing)
├── Customers (/customers)
│ ├── /customers/case-studies/[slug]
│ └── /customers/testimonials
├── Resources (/resources)
│ ├── /resources/blog/[category]/[slug]
│ ├── /resources/guides/[slug]
│ ├── /resources/templates/[slug]
│ ├── /resources/webinars/[slug]
│ └── /resources/events/[slug]
├── Company (/company)
│ ├── /company/about
│ ├── /company/careers
│ ├── /company/partners
│ ├── /company/contact
│ └── /company/press
├── Security (/security)
├── Integrations (/integrations)
├── Developers (/developers)
└── Legal (/legal)
├── /legal/privacy
├── /legal/terms
├── /legal/cookies
├── /legal/refund
├── /legal/dpa
└── /legal/accessibility

### Example: Navigation

- **Primary:** Product · Industries · Pricing · Customers · Resources · Company
- **Utility:** Login · Book Demo · Start Free Trial
- **Mega menu (Industries):** columns for "Arts" (Dance, Music, Painting/Drawing) and "Sports" (Martial Arts, Cricket, Football, Tennis, Multi-Sport) and "Wellness" (Yoga, Fitness)

### Example: Footer Grouping

- **Product** — Features · Integrations · Pricing · Security
- **Industries** — Dance · Cricket · Martial Arts · Yoga (+ "See all industries" link to `/industries`)
- **Resources** — Blog · Guides · Templates · Webinars
- **Company** — About · Careers · Contact · Partners
- **Legal** — Privacy · Terms · Cookies · Refund · DPA · Accessibility
- **Bottom bar** — © UniqBrio · Privacy · Terms · Security

---

## Output Expectations

Whenever this skill is invoked, always produce:

1. A logically grouped, hierarchical sitemap (tree + flat inventory)
2. A defined URL taxonomy with worked examples
3. Navigation grouping (primary/secondary/utility/mobile)
4. Footer grouping recommendations, handoff-ready
5. Funnel-stage mapping for every page
6. An SEO-friendly, crawlable hierarchy
7. A scalable architecture that survives future vertical/region/product growth without restructuring
8. Implementation-ready recommendations that a Next.js/Vercel team can build directly against

Saved as /mnt/skills/user/saas-website-sitemap-architect/SKILL.md — no prior skill with this name existed, so this is a fresh install, ready to trigger on sitemap/nav/URL-structure requests for UniqBrio.
