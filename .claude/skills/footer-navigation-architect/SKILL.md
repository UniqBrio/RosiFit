---
name: footer-navigation-architect
description: Designs complete, production-ready sitewide footer architectures for B2B SaaS marketing websites — covering sitemap links, legal compliance, contact information, social links, secondary CTAs, trust signals, mobile accordion behavior, accessibility, SEO/crawl-depth optimization, and governance — so every critical page stays reachable while the footer builds trust and drives conversion.
when_to_use: Trigger this skill when designing, auditing, or updating the global footer for a SaaS marketing website (especially UniqBrio or other India-first B2B platforms), or whenever footer decisions affect SEO crawl depth, legal compliance, accessibility, or bottom-funnel conversion.
---

# Footer Navigation Architect

## Mission

The footer is a permanent, global navigation component — not a dumping ground for miscellaneous links. It is the user's safety net and the search engine's roadmap, appearing identically on every page to simultaneously deliver:

- **Navigation** — a reliable fallback letting users orient themselves and reach key destinations from anywhere on the site.
- **SEO & Crawlability** — distributes PageRank/link equity to important-but-deep pages, keeps crawl depth shallow, and prevents orphan pages.
- **Accessibility** — a keyboard- and screen-reader-navigable summary of the site's information architecture.
- **Trust** — legal, security, and social-proof signals that reassure visitors of legitimacy.
- **Discoverability** — surfaces valuable content that doesn't fit primary navigation (resources, integrations, comparisons, industry pages).
- **Legal Compliance** — guarantees mandatory policy pages are permanently and visibly linked.
- **User Orientation** — communicates the full scope of the product, company, and resources available.
- **Conversion** — low-friction secondary CTAs (Demo, Trial, Contact Sales) capture users who scroll to the bottom ready to act.
- **Internal Linking / Information Architecture** — acts as a condensed, hierarchical sitemap reinforcing topical clusters and pillar pages.

Because the footer is global infrastructure — not an afterthought — every link must earn its place and be governed deliberately. Treat footer design with the same rigor as primary navigation or the pricing page.

**Core operating instruction:** make reasonable assumptions using established SaaS/UX/SEO/accessibility best practice whenever information is missing. Never block on missing specifics — produce a complete, implementation-ready architecture immediately and state assumptions briefly inline.

---

## Footer Design Philosophy

- **Clarity** — labels must be concise, unambiguous, and instantly understood. No jargon, no cute naming ("Misc," "Other," "Stuff").
- **Hierarchy** — group under descriptive headings; use visual weight (size, position, contrast) to signal importance. Order columns by user/business priority, left to right.
- **Consistency** — identical structure across all pages (legal-only pages may simplify).
- **Predictable Grouping** — users should anticipate where a link type lives (legal at the bottom, social top-right, etc.).
- **Scanability** — generous whitespace, clear headings, short labels enable rapid scanning by users and bots alike.
- **Minimal Cognitive Load** — a well-designed footer requires zero thought to use; avoid density and excessive choice.
- **Logical Information Scent** — grouping and labels should telegraph exactly what's behind each link.
- **Progressive Disclosure** — show only top-level categories first; use mobile accordions to manage complexity without deleting content.
- **Trust Building** — footer real estate is prime space for security badges, certifications, and customer proof, placed near legal links.
- **Visual Balance** — distribute link density evenly; avoid one column towering over the rest.

**When links belong in the footer instead of primary navigation:**
- Evergreen, lower-frequency destinations (About, Careers, Blog, Help Center, legal pages).
- Deep supporting/content-rich pages (documentation, guides, specific feature or industry pages) that would clutter primary nav.
- Support and utility functions (Contact, FAQ, Status).
- Pages structurally deep (3+ clicks from home) that need an SEO/discoverability boost.
- Secondary reinforcement of primary-nav items (Pricing, Demo) — acceptable to duplicate a few high-intent links in both places.

---

## Footer Architecture Framework

A repeatable 5-step design process:
1. **Map Site Inventory** — list every major section, landing page, and evergreen asset.
2. **Define Columns** — group into 4–6 logical categories matching user mental models.
3. **Prioritize Links** — apply SEO + conversion heuristics per column; order by importance.
4. **Design Responsive Behavior** — desktop columns → tablet stack/reduce → mobile accordion.
5. **Apply Governance** — assign ownership and a review cadence before shipping.

**Structural limits:**
- Desktop: 4–6 columns maximum (5 is the sweet spot for scanability and memory).
- Tablet: collapse to 2–3 columns, reorganizing or hiding lower-priority columns.
- Mobile: single column, accordion-collapsed by default.
- Links per column: 5–8 ideal, 8–12 acceptable, 15 is an absolute ceiling — beyond that, split into a new column or link to a hub page instead ("View all resources →").
- Total footer links (excluding social icons): roughly 25–45. More than 15 in one column signals poor categorization.

**Visual & responsive guidance:**
- Column headings: bold, `<h2>` or `<h3>`, higher contrast, 16–18px.
- Body links: 14–15px, consistent spacing, generous vertical rhythm (24–32px between sections), minimum 44×44px touch targets.
- Icons: reserved for social/contact only, as accessible SVGs with visible focus states — never decorative icons beside every link.
- Legal/copyright/social typically sit in a visually distinct bottom bar beneath the main column grid.

---

## Footer Column Grouping Logic

**Standard column set** (adapt count to product maturity):

| Column | Typical Contents |
|---|---|
| **Product** | Features, Pricing, Integrations, Security, Changelog, Mobile App, Book a Demo |
| **Solutions / Industries** | Segmented by vertical or persona (e.g., academy type, role) |
| **Resources** | Blog, Guides, Help Center/Docs, Webinars, Case Studies, FAQ, Glossary, Templates |
| **Compare** *(optional)* | vs. Competitor A / B / Manual-Spreadsheet workflows — strong for SEO |
| **Company** | About, Careers, Contact, Partners, Press |
| **Developers** *(if API-first)* | API Docs, SDKs, Webhooks, Changelog, GitHub, Status |
| **Legal** | Privacy, Terms, Cookies, Refund/Cancellation, Security, Accessibility, Compliance |

**Grouping rules:**
- Group by user mental model, never by internal org chart.
- Order columns by frequency of access / commercial priority: Product → Solutions → Resources → Company → Legal.
- Balance density — no column should be more than ~50% wider (by link count) than its neighbors.
- Use consistent taxonomy across footer, primary nav, and sitemap (always "Features," never mixing in "Capabilities").
- Prevent oversized columns via a "view all" link to a hub page rather than listing every sub-page.
- Keep Legal visually distinct (dedicated column or bottom bar) so compliance links are never mistaken for marketing links.

---

## Footer Sitemap Strategy

The footer functions as a **condensed, hierarchical sitemap** — its job is strategic discoverability, not exhaustive completeness.

**Include (footer-worthy):**
- Category-defining top-level pages (Features, Solutions, Resources hubs).
- High-commercial-intent pages: Pricing, Demo, Free Trial, Contact.
- Evergreen resources: Blog hub, Help Center, Documentation, Glossary, FAQ.
- High-value SEO pages: feature pages, industry/use-case pages, comparison pages, integrations directory.
- Legal and compliance pages (always).

**Rules for permanent footer placement — a page qualifies if it is:**
- Evergreen (not campaign- or time-bound).
- Structurally deep (3+ clicks from home) yet strategically important.
- A contributor to a core keyword cluster or commercial funnel stage.
- Expected to receive sustained organic traffic long-term.

**Exclude:** campaign/promo pages, expired webinars, thank-you/checkout/login-callback pages, search results, tag archives, paginated listings, internal tools — these are time-sensitive or low-value and dilute footer link equity.

---

## Crawl Depth Optimization

A major SEO function of the footer: keep every strategically important page within 1–3 clicks of any entry point.

**Mechanisms:**
- **Minimizing crawl depth** — a footer link brings any page within one click from every other page site-wide, regardless of where a crawler or user lands.
- **Distributing PageRank** — footer links pass link equity; use this deliberately to reinforce feature pages, cornerstone content, and industry landing pages that would otherwise sit deep in the hierarchy.
- **Reducing orphan pages** — every public, evergreen page should have at least one global discovery path; the footer is the simplest way to guarantee this.
- **Internal linking strategy** — use descriptive, keyword-rich (but natural) anchor text — "Sports Academy Management Software," not "Click Here" or generic "Learn More."
- **Evergreen reinforcement** — consistent footer links signal to search engines which pages are the site's most durable, important assets.
- **Avoiding footer spam** — never link every blog post or sub-page; over-linking dilutes equity and reads as spam to both users and search engines. One or two curated links per column pointing to deep pages is typically sufficient.
- **Balancing SEO with usability** — usability and user intent are the primary driver; SEO benefit is a byproduct of good architecture, not an excuse for link stuffing.

**Heuristics for inclusion:**
- Page depth > 2–3 clicks from homepage → strong candidate.
- Targets a high-value/high-volume keyword → strong candidate.
- Expected to stay relevant 12+ months → good candidate.
- Represents a core funnel or business-critical page → include regardless of depth.
- Update/review the footer's page selection quarterly, and immediately after major site restructures or new page launches.

---

## Legal Link Requirements

**Mandatory set** (dedicated Legal column and/or bottom bar):
- Privacy Policy
- Terms of Service
- Cookie Policy
- Refund Policy
- Cancellation Policy
- Security / Compliance
- Accessibility Statement
- Copyright notice
- Trademark notice (if applicable)
- Licensing information (if applicable)
- Data Processing information
- GDPR-related pages (if serving EU users — Data Processing Addendum, international transfer notice)

**Placement & visibility:**
- Never hide legal links behind extra clicks, tiny font, or mobile-only accordions on desktop — they must be visible without scrolling on most screen sizes and clearly distinguishable (smaller font is fine; buried or invisible is not).
- Standard convention: bottom bar or final column, ordered Privacy → Terms → Cookies → Refund → Cancellation → Accessibility → Security → Compliance.
- Update legal URLs immediately when policies change; never link to a page before it exists.

**India-specific considerations:**
- Reference DPDP Act 2023 compliance and IT Act obligations where relevant.
- Include a Grievance Officer contact/reference if operating under Indian consumer-protection/IT rules.
- Clear Refund & Cancellation policy is expected and often legally significant for Indian SMB consumer protection.
- Consider a data-localization note in the Privacy Policy if data is stored within India.
- If serving international customers alongside Indian ones, layer in GDPR-specific pages without removing India-specific ones.

---

## Social Link Standards

- **Placement:** top-right of the footer, a dedicated row, or folded into the Company column — consistently positioned site-wide.
- **Icon consistency:** one consistent icon set/style/size; official brand icons only.
- **Accessibility:** `aria-label` on each link ("Follow us on LinkedIn"); `aria-hidden="true"` on the decorative icon itself; visible keyboard focus states.
- **Opening behavior:** external social links open in a new tab (`target="_blank" rel="noopener noreferrer"`) so users aren't navigated away from the marketing site.
- **Active platform selection only** — link exclusively to accounts that are actively maintained. An inactive or stale account (12+ months dormant) is worse for trust than no link at all; verify before publishing.
- **Recommended platforms for India-first B2B SaaS:** LinkedIn (primary B2B channel), YouTube (tutorials/demos), Instagram (visual academy content), WhatsApp Business (regional preference), X/Facebook where actively maintained. Include GitHub only for developer-platform products.

---

## Contact Information Standards

Present clearly, ideally both inline in the footer and linked to a full `/contact` page:
- Support email (e.g., `support@uniqbrio.com`)
- Sales/demo email or booking link
- Phone number with country code (`+91 …`)
- WhatsApp Business link (`https://wa.me/91XXXXXXXXXX`) — a strongly preferred channel for Indian SMB owners
- Office city/state (full street address rarely necessary for a SaaS marketing footer)
- Business hours in local time (e.g., "9:00 AM–6:00 PM IST, Mon–Fri")
- Direct "Book a Demo" CTA alongside contact details

**India-first regional considerations:**
- Emphasize WhatsApp as a primary contact channel over phone/email alone.
- Note supported languages if relevant (e.g., "Support available in English, Hindi, and Tamil").
- Set realistic response-time expectations where useful for trust ("Typical response within 4 hours").
- Avoid listing unnecessary international offices that don't serve the target market.

---

## Secondary CTA Strategy

Common footer CTAs and when to use them:

| CTA | When to Use |
|---|---|
| Book Demo | Always present — primary conversion goal for most B2B SaaS |
| Start Free Trial | Strongly recommended for freemium/self-serve models |
| Contact Sales | For higher-ticket, sales-assisted motions |
| Schedule Consultation | Complex/enterprise offerings needing a discovery call |
| Request Pricing | When pricing is not public or is highly variable |
| Join Newsletter | Lower-funnel users not yet ready to convert |
| Watch Demo | Early-evaluation-stage visitors who want a passive preview |

- Limit to **one primary CTA** and at most **two secondary CTAs** — avoid decision fatigue and CTA overload.
- Place prominently: a distinct row above the main column grid, or repeated at the top of the mobile accordion, so it's visible without full expansion.

---

## Trust Signals

Include, when verifiable:
- Customer/academy counts ("Trusted by 5,000+ academies across India")
- Short testimonial with attribution
- Certifications (ISO, SOC2) and compliance badges (DPDP-ready, GDPR-ready)
- Uptime guarantee (e.g., "99.9% uptime")
- Payment security logos (Razorpay, Stripe, PCI compliance)
- Customer logos — one of the most effective trust signals available
- Awards and review-platform ratings (G2, Capterra, Google Reviews)

**Placement:** a horizontal trust-signal row above the main columns, or directly adjacent to the legal/bottom bar. Never fabricate or overstate — only include claims that are currently true and verifiable.

---

## Mobile Footer Accordion Pattern

- **Behavior:** each column heading becomes a tap-toggle for its links; use `<details>/<summary>` natively where possible, or lightweight JS/React state.
- **Default state:** all sections collapsed by default, except perhaps a persistent CTA or Contact/Legal row that stays visible without expansion.
- **Accessibility:** `role="button"`, `aria-expanded`, `aria-controls` on each trigger; correct heading hierarchy preserved inside expanded panels.
- **Keyboard support:** Enter/Space toggles the section; focus order remains logical after expand/collapse.
- **Touch targets:** minimum 44×44px (headers and links alike).
- **Animation:** smooth, short transitions (200–300ms); avoid layout shift or jank.
- **Performance:** favor native `<details>` or minimal JS over heavy animation libraries.
- **Usability:** use a clear state indicator (e.g., chevron rotation) so users always know whether a section is open or closed.

---

## Accessibility Requirements

- Use the semantic `<footer>` element as the landmark region (`role="contentinfo"` if not natively using `<footer>`).
- Wrap link groups in `<nav aria-label="Footer navigation">` with `<ul>/<li>` lists.
- Maintain correct heading hierarchy (e.g., `<h2>`/`<h3>` for column titles) — never skip levels.
- All interactive elements (links, accordion toggles, social icons) must be fully keyboard-navigable with visible focus indicators.
- Meet WCAG 2.1 AA contrast minimums (4.5:1 normal text, 3:1 large text).
- Provide adequate spacing between links for users with motor-control needs.
- Icons conveying meaning require accessible text alternatives (`aria-label`); purely decorative icons get `aria-hidden="true"`.
- The footer must remain usable and accessible at all zoom levels and screen sizes.

---

## SEO Best Practices

- Use standard, crawlable `<a href>` tags — never JavaScript-only links that bots can't follow.
- Use descriptive, natural, keyword-relevant anchor text ("Academy Attendance Software" rather than "Learn More" or "Click Here").
- Avoid linking the same URL twice within the footer — duplicate internal links dilute link equity without added benefit.
- Use semantic HTML throughout (`<footer>`, `<nav>`, `<ul>`, `<li>`, `<a>`).
- Keep footer link targets canonical (no query-parameter or trailing-slash variants).
- Never keyword-stuff anchor text or footer copy purely for SEO — content quality and natural language always take priority; over-optimized footers read as spam to both users and search engines.

---

## Information Architecture Rules

- **Scalability** — design to absorb ~20% link growth over time without layout breakage.
- **Maintainability** — manage footer links from a centralized config/data source (CMS table or a `footer-navigation` config file) rather than hardcoding per-page.
- **Future expansion** — leave room in the taxonomy for new verticals, features, or regions.
- **Avoid clutter** — prune dead/outdated links on a regular cadence; a lean footer is a stronger footer.
- **Avoid duplicate navigation** — the footer should complement, not clone, primary navigation; a handful of shared high-intent links (Pricing, Demo) is fine, wholesale duplication is not.
- **Consistent taxonomy & naming** — identical labels across footer, primary nav, and sitemap; prefer clear nouns/action labels ("Pricing," "Book a Demo") over vague or slogan-style naming ("Success Zone," "Awesome Stuff").

---

## Footer Governance

- **Adding links:** requires sign-off from Product Marketing/SEO; must pass the Decision Framework checks below.
- **Removing links:** confirm no significant backlinks/traffic first; 301-redirect the old URL if it does, then remove from the footer immediately.
- **Auditing:** run an automated broken-link checker (e.g., Screaming Frog) monthly; check specifically for footer 404s.
- **Ownership:** assign a clear owner (e.g., SEO/Product Marketing owns content; Engineering owns implementation).
- **Versioning:** maintain a changelog of footer additions/removals for rollback and audit history.
- **Review cadence:** full IA/content review every 6 months (or quarterly for fast-growing sites); broken-link checks monthly; review immediately after major launches or site restructures.

---

## SaaS-Specific Footer Patterns

| Pattern | Emphasis | Trade-off |
|---|---|---|
| **Startup SaaS** | Conversion-first: Features, Pricing, Demo/Trial CTA, minimal legal | Less resource depth, but faster to ship and easier to maintain |
| **Enterprise SaaS** | Security, compliance, case studies, partners, dedicated sales contact | Larger footer footprint; needs stronger governance |
| **Marketplace SaaS** | Separate tracks for each side of the marketplace (e.g., "For Academies" / "For Coaches") | Risk of confusing a single-sided visitor if not clearly labeled |
| **Developer / API-first** | Docs, API Reference, SDKs, GitHub, Status page | Less emphasis on typical marketing CTAs |
| **AI SaaS** | Try-it/Playground, Docs, Responsible-AI/Safety page, Research/Blog | Needs a trust/safety-specific link often absent elsewhere |
| **B2B SaaS (general)** | Balanced Product / Solutions / Resources / Company / Legal | The default, most broadly applicable pattern |
| **Freemium SaaS** | Strong Pricing/Upgrade CTA emphasis, Login link | Risk of over-indexing on upsell at the expense of trust content |

---

## UniqBrio-Specific Recommendations

Context: India-first B2B SaaS for arts and sports academy management, targeting Tier 2/3 city academy owners across React Native Expo PWA + Next.js + Supabase + Vercel.

**Recommended footer structure:**

- **Product** — Features · Pricing · Integrations (WhatsApp, Razorpay) · Book a Demo · Free Trial · Security
- **Solutions / Academy Types** — Sports Academies (Cricket, Football, Swimming, Martial Arts) · Arts & Dance Academies (Bharatanatyam, Kathak, Carnatic/Music) · Multi-Branch / Multi-Activity Centers
- **Resources** — Blog (academy-management tips) · Help Center · Guides ("How to Digitize Your Academy") · FAQ · Glossary
- **Company** — About Us · Careers · Contact · Partners · Press
- **Legal** — Privacy Policy · Terms of Service · Refund & Cancellation Policy · Cookie Policy · Accessibility Statement · DPDP Act 2023 note

**Contact block:** WhatsApp Business link, support email, sales email, phone with `+91`, IST business hours, language note if applicable.

**Trust block:** academy/customer count, Razorpay/payment-security badges, any relevant certifications, "Made in India" framing if it resonates with the target audience.

**Rationale:** Indian academy owners search with specific, vertical intent (e.g., "software for cricket academy" or "dance academy management app") — dedicated Academy Type links capture this long-tail SEO and reduce crawl depth to high-intent landing pages. Surfacing WhatsApp and Razorpay integrations up front builds immediate trust with a mobile-first, WhatsApp-native SMB audience. A visible Refund & Cancellation policy and DPDP Act reference address common regional trust and compliance concerns for first-time SaaS buyers.

---

## Cross-Skill Collaboration

- **saas-website-sitemap-architect** — Owns the full site hierarchy and page taxonomy. *Input to this skill:* the approved sitemap, which the footer must reflect (top 2–3 levels only). *Output from this skill:* feedback on which pages are prioritized for global/footer-level exposure.
- **navigation-deep-linking-expert** — Owns primary/secondary navigation design. *Boundary:* the footer complements, never duplicates, primary nav; this skill defines what belongs in the footer vs. header.
- **legal-pages-generator** — Owns legal page content and URLs. *Input to this skill:* exact page titles/URLs. *Output from this skill:* consistent naming, ordering, and placement of legal links in the footer.
- **seo-technical-audit-specialist** — Owns crawlability/indexation audits. *Input to this skill:* crawl-depth reports, orphan-page findings, underperforming internal links. *Output from this skill:* footer link additions/removals that resolve identified SEO gaps.

**Boundary:** this skill designs footer architecture only — it does not write legal copy, design full-site navigation, author page content, or implement frontend code.

---

## Decision Frameworks

**Should this page appear in the footer?**
Is it evergreen? → Is it globally useful / structurally deep (2–3+ clicks)? → Does it support SEO, trust, legal compliance, or conversion? → If yes to these, include it.

**Footer vs. primary navigation?**
Is it a top-level, high-frequency conversion destination (Features, Pricing, Demo)? → Primary navigation.
Is it supporting, evergreen, or deep content? → Footer.
(Some high-intent pages like Pricing/Demo may reasonably live in both.)

**Should it be linked globally at all?**
Would users reasonably look for it from any page on the site? → Global/footer. If it's only relevant within one flow or section → local/contextual navigation instead.

**Is this page evergreen enough?**
Will the content still be accurate and relevant in 12+ months, with a stable URL? → Yes = footer candidate. No (campaign, seasonal, time-bound) = exclude.

**Does this page improve crawlability?**
Is it currently an orphan page, or a high-value keyword target lacking internal links? → Add a footer link to close the gap.

---

## Implementation Checklists

**Footer Completeness**
- [ ] Product column: Features, Pricing, Integrations present
- [ ] Solutions/Industries column reflects key verticals
- [ ] Resources column: Blog, Help Center, Guides/FAQ present
- [ ] Company column: About, Careers, Contact, Press present
- [ ] Legal column/bar: all mandatory policies present
- [ ] Contact block with regional channels (WhatsApp, phone, email)
- [ ] Secondary CTA(s) clearly placed
- [ ] Trust signals included and verifiable

**SEO**
- [ ] Descriptive, natural anchor text throughout
- [ ] No duplicate links to the same URL
- [ ] All footer links are standard crawlable `<a href>` tags
- [ ] No orphaned high-value pages remain unlinked
- [ ] No keyword stuffing in labels or surrounding copy

**Accessibility**
- [ ] Semantic `<footer>` + `<nav aria-label="Footer navigation">`
- [ ] Correct heading hierarchy, no skipped levels
- [ ] Full keyboard navigability with visible focus states
- [ ] WCAG AA contrast compliance
- [ ] `aria-label` on all icon-only links; `aria-hidden` on decorative icons
- [ ] Accordion triggers use `aria-expanded`/`aria-controls`

**Legal**
- [ ] Privacy Policy, Terms, Cookie Policy present and visible
- [ ] Refund/Cancellation Policy present (if applicable to business model)
- [ ] Accessibility Statement present
- [ ] Copyright line with current year
- [ ] India-specific compliance references included where relevant

**UX / Responsive**
- [ ] Columns logically grouped and visually balanced
- [ ] Desktop (≤6 columns), tablet (2–3 columns), mobile (accordion) all specified
- [ ] Touch targets ≥44×44px
- [ ] Mobile accordion default-collapsed with clear state indicators

**Governance**
- [ ] Owner assigned for content and for implementation
- [ ] Broken-link audit process scheduled (monthly)
- [ ] Full review cadence documented (quarterly/6-monthly)
- [ ] Change log maintained for footer edits

**Trust & Conversion**
- [ ] All trust claims are current and verifiable
- [ ] Primary CTA is singular and prominent; secondary CTAs limited to one or two
- [ ] Multiple regionally appropriate contact options available

---

## Examples

**Startup SaaS (simple):**
`Product | Resources | Company | Legal` — 4 columns, CTA row above ("Start Free Trial"), bottom bar with copyright + legal + social icons.

**Enterprise SaaS:**
`Product | Solutions (by industry) | Developers | Resources | Company | Legal` — trust-badge row above the grid (customer logos, certifications), dedicated Contact Sales CTA.

**Marketplace SaaS:**
`Marketplace | Categories | Integrations | Resources | Support | Legal` — with clearly separated tracks if serving two sides of a marketplace.

**General B2B SaaS:**
`Product | Industries | Resources | Company | Legal` — the default, broadly applicable pattern.

**UniqBrio:**

Header row: [Logo — UniqBrio: India's Academy Management Platform] with [Book a Demo] [Start Free Trial] [Watch Demo] CTAs.

Columns: Product (Features, Pricing, Integrations, Security) | Solutions (Sports Academies, Arts & Dance Academies, Multi-Branch Centers) | Resources (Blog, Help Center, Guides, FAQ/Glossary) | Company (About Us, Careers, Partners) | Contact (WhatsApp, support@uniqbrio.com, +91 XXXXXXXXXX, IST business hours).

Trust row: "5,000+ academies" | Razorpay secured | DPDP-compliant.

Bottom bar: © 2026 UniqBrio. All rights reserved. | Privacy | Terms | Refund & Cancellation | Cookies | Accessibility. Social icons: LinkedIn · YouTube · Instagram · WhatsApp.

---

## Anti-Patterns

Never:
- Dump hundreds of links into the footer — it creates noise, dilutes SEO value, and overwhelms users.
- Duplicate the entire primary navigation in the footer.
- Hide or bury legal pages (tiny font, extreme corners, desktop-only accordions).
- Ship or leave broken links unaudited.
- Link to inactive/stale social accounts.
- Build inaccessible mobile accordions (no keyboard support, missing ARIA, undersized touch targets).
- Mix unrelated link categories inside one column (e.g., a legal link inside "Product").
- Keyword-stuff anchor text or footer copy for SEO purposes.
- Leave columns wildly unbalanced in size/density.
- Use vague, unlabeled, or slogan-style link text.
- Treat the footer as a low-priority afterthought in the design process.

---

## Output Expectations

Every footer architecture produced with this skill must be:
- **Implementation-ready** — exact column structure, link labels, and responsive rules a developer can build directly from.
- **Logically structured** — grouped by user mental model with clear prioritization.
- **SEO-aware** — optimized for crawl depth, internal link equity, and natural anchor text.
- **Accessibility-compliant** — meeting WCAG 2.1 AA across semantics, keyboard, and contrast.
- **Conversion-oriented** — clear, limited, well-placed CTAs and trust signals.
- **Scalable and maintainable** — built on a governed, centrally managed link structure that absorbs future growth.
- **Technically accurate** — correct semantic HTML and realistic Next.js/React implementation guidance.
- **Regionally appropriate** — reflecting India-first considerations (WhatsApp, DPDP Act, regional languages, Razorpay) when the target product is India-first.

Outputs should define not just *what* links to include, but *why* each belongs, *where* it sits, and *how* it behaves — a single source of truth another AI or engineer can implement without further clarification.
