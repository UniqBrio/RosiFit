---
name: integrations-directory-page-architect
description: Provides a complete framework for architecting a B2B SaaS integrations/marketplace directory and individual integration listing pages so technical evaluators can quickly confirm stack fit, while maximizing SEO, trust, and conversion.
when_to_use: Use this skill whenever designing, auditing, or improving an integrations/marketplace directory page, category pages, individual integration listing templates, or a request-an-integration flow for a B2B SaaS website such as UniqBrio.
---

# Integrations Directory Page Architect

**Context used throughout:** UniqBrio — India-first Arts & Sports Academy Management SaaS, built on React Native Expo PWA, Next.js, Supabase (PostgreSQL + Edge Functions), Vercel. Public marketing site is pre-login. Primary objectives: signups, demo bookings, paid conversion. Primary buyers: academy owners, administrators, coaches, arts institutes, sports academies.

---

## 1. Why Integration Directories Matter

An integrations directory is not a feature list — it is a **technical trust engine and conversion asset**. Treat it with the same rigor as the pricing page.

- **Reduces buying friction.** Technical evaluators (owners with a tech-savvy admin, or an outsourced IT person) ask "will this work with what we already use?" before they'll take a sales call. The directory answers that instantly, self-serve.
- **Increases trust.** A comprehensive, current, well-categorized directory signals product maturity and an active ecosystem — the opposite of a single-tenant, closed tool.
- **Reduces sales objections.** "Does it talk to Razorpay / Tally / Google Calendar?" is neutralized before it's ever asked.
- **Improves enterprise/multi-branch readiness perception.** Academy chains and larger institutes read integration depth (SSO, webhooks, data export) as a proxy for platform seriousness.
- **Accelerates technical evaluation.** Evaluators use the directory to judge API quality, auth methods, and webhook support without reading full docs first.
- **Accelerates purchase decisions.** Shortens the gap between "researching" and "booking a demo" by removing a discrete, checkable blocker.
- **Improves SEO.** Each integration page is a unique, high-intent long-tail landing page (e.g., "UniqBrio Razorpay integration," "UniqBrio WhatsApp Business integration").
- **Powers partner marketing.** Individual integration pages are co-marketing assets vendors will link to and share, creating backlink and referral flywheels.

---

## 2. Information Architecture

### 2.1 Page Hierarchy

/integrations → Master directory
/integrations/categories/[category-slug] → Category landing page
/integrations/[integration-slug] → Individual integration page
/integrations/request → Request-an-integration (also as modal)

Use `/integrations` as canonical; treat `/marketplace` and `/partners` as 301-redirected aliases if used in early marketing.

### 2.2 Navigation & Breadcrumbs

- Add "Integrations" to primary header nav and footer (footer discoverability is often overlooked but drives evaluator return visits).
- Cross-link from feature pages, pricing page, and docs into relevant integration pages (e.g., the Fee Collection feature page links to Razorpay/PhonePe).
- Breadcrumbs on every page: `Home > Integrations > [Category] > [Integration Name]`.

### 2.3 Master Directory Layout (top to bottom)

1. **Hero** — H1 ("Integrations & Marketplace"), one-line value prop ("Connect UniqBrio with the tools you already use — built for Indian arts & sports academies"), prominent search bar, primary CTA ("Browse All"), secondary CTA ("Request an Integration").
2. **Featured Integrations** — carousel or 6-card grid.
3. **Category grid** — visual tiles with icon + name + count (e.g., "Payments (8)").
4. **Alphabetical index (A–Z strip)** — for evaluators who know the exact tool name.
5. **Filterable/searchable full grid** — the main body.
6. **"Recently Added" / "Popular this month" rail.**
7. **Request-an-integration teaser** band.
8. **Trust signal footer strip** (security badges, customer count, uptime).

### 2.4 Sorting & Pagination

- Default sort: Relevance (when searching) or Popularity (when browsing).
- Additional sort options: Alphabetical, Newest.
- Prefer **numbered pagination with `rel="prev"/"next"`** over infinite scroll once the catalog exceeds ~40–50 items — infinite scroll hurts SEO indexation and is harder to make accessible. Use "Load More" only for small catalogs (<100 items).
- Persist filter/sort state in the URL query string (`?category=payments&status=verified&sort=popular`) so results are shareable, bookmarkable, and crawlable.

### 2.5 Responsive Behavior

- Desktop: 4-column card grid, sidebar filters.
- Tablet: 3-column grid.
- Mobile: single-column list cards; filters move into a bottom-sheet/drawer, not an inline sidebar.

### 2.6 Empty / Loading / Error States

- **Empty (no filter matches):** "No integrations match these filters yet. Broaden your filters or [Request this integration]" — always pair the empty state with the request CTA, never a dead end.
- **Loading:** Skeleton cards matching the final card layout (not a generic spinner) to reduce perceived wait.
- **Error:** Plain-language message + retry action + support contact link.

---

## 3. Directory Categorization

Use **multiple, overlapping taxonomies** — do not force a single hierarchy.

### 3.1 Functional Categories (primary browsing axis)

Payments · Messaging · Email · Calendar · CRM · Authentication/Identity · Storage · Analytics · Accounting · Marketing Automation · Communication · Productivity · AI · APIs/Webhooks · ERP · HR · Notifications · Cloud Infrastructure · Data Import/Export · Business Intelligence · Education Platforms · Sports Technologies · Arts-related Platforms · Custom Integrations.

**UniqBrio examples per category:**
- Payments: Razorpay, PhonePe, PayU, CCAvenue
- Messaging/Communication: WhatsApp Business API, Twilio SMS
- Calendar: Google Calendar, Outlook Calendar
- CRM: Zoho CRM, HubSpot, Salesforce
- Accounting: Tally, QuickBooks, Zoho Books
- Analytics: Google Analytics, Mixpanel
- Authentication/Identity: Google OAuth, Auth0
- Education Platforms: Google Classroom, Moodle
- Sports Technologies: Hudl, TeamSnap-style attendance/roster tools

### 3.2 Use-Case Categories (secondary axis — often converts better for non-technical academy owners)

Fee Collection · Attendance Tracking · Parent Communication · Class Scheduling · Student Progress & Certification · Event Management · Lead Generation · Financial Reporting.

### 3.3 Status Taxonomy (badges, not primary navigation)

| Status | Meaning | Where it works best |
|---|---|---|
| Verified | Tested and supported by UniqBrio | Trust signal on card + page |
| Native | Built and maintained in-house | Sets setup-complexity expectation |
| Partner | Built/maintained with a partner vendor | Co-marketing, case studies |
| API-based | Generic REST/webhook connection, not a packaged UI flow | Signals more technical setup |
| Beta | Available but not production-hardened | Manage expectations, avoid enterprise CTAs |
| Coming Soon | Announced, not live | Capture demand via "Notify me" |
| Deprecated | No longer supported | Archive/hide from directory; never leave live but broken |

### 3.4 When to Use Which

- **Functional + use-case categories** → always the primary navigation; they map to how an academy owner actually thinks ("I need to collect fees," not "I need a Payments API").
- **Status badges** → secondary filter/overlay only — never the main organizing principle.
- **Popularity / Newest** → sort options and curation levers for the Featured rail, not standalone categories.

---

## 4. Filtering System

| Filter | Options | Why it matters |
|---|---|---|
| Category | Functional taxonomy | Primary discovery axis |
| Use case | Fee Collection, Attendance, etc. | Matches non-technical buyer mental model |
| Integration type | Native / Partner / API-based / Webhook | Sets technical expectations |
| Verification status | Verified / Beta / Coming Soon / Deprecated | Trust and reliability signal |
| Setup complexity | 1-click / Configuration required / Custom dev required | Sets implementation-effort expectations |
| Authentication type | OAuth 2.0 / API Key / JWT / Basic Auth / None | Security and technical fit |
| Pricing | Free / Freemium / Paid / Contact Sales | Budget qualification |
| Region | India / Global / APAC | Data residency and compliance relevance |
| Industry | Arts / Sports / Multi-discipline | Vertical relevance |
| Data sync | One-way / Two-way / Real-time / Batch | Technical evaluation criterion |
| Supported plans | Starter / Growth / Enterprise | Avoids evaluator disappointment post-signup |

**UX best practices:**
- Progressive disclosure: show 3–4 common filters by default; put the rest behind "Advanced Filters."
- Show live result counts per filter option (e.g., "Payments (8)").
- Always show active filters as removable chips, plus a single "Clear all."
- Mobile: filters live in a bottom-sheet/drawer, never an always-visible sidebar.
- Sync filters to the URL so results are shareable and indexable.

---

## 5. Search Behavior

**What to index:** integration name, vendor name, short + long description, category tags, feature names, API/protocol names, use cases, known synonyms/aliases (e.g., "SMS" → Twilio, "FB" → Facebook), and misspellings.

**Capabilities:**
- Autocomplete with live suggestions as the user types.
- Fuzzy matching to tolerate typos ("Razorepay," "whatsap").
- Synonym mapping between internal category names and industry-standard terms.
- Highlight matched terms in result snippets.

**Ranking logic (in priority order):**
1. Exact name match
2. Partial name match
3. Synonym/alias match
4. Category/tag match
5. Popularity as a tiebreaker

**No-results handling:** never a dead end — always surface "closest matches," a link to browse by category, and the Request-an-Integration CTA.

---

## 6. Featured Integrations

**Selection criteria (combine, don't pick just one):**
- Highest real usage / adoption among current academies.
- Strategic partner relationships worth amplifying.
- Newest high-quality additions needing an awareness push.
- Seasonal relevance (e.g., promote fee-collection integrations at academic-year start).
- Integrations with the strongest historical correlation to signup/demo conversion.

**Placement:** homepage teaser section linking to `/integrations`; top of the master directory; occasionally referenced in the pricing page's "what's included" section and in post-signup onboarding checklists.

---

## 7. Integration Cards

### 7.1 Fields

| Field | Requirement |
|---|---|
| Logo (SVG preferred) | Required |
| Integration name | Required |
| Vendor name | Required |
| Short summary (1 line, benefit-first) | Required |
| Category badge(s) | Required |
| Status badges (Verified/New/Beta/Partner) | Recommended |
| Setup difficulty indicator | Recommended |
| Supported features (icon row) | Optional |
| Compatibility (plan tier) | Optional |
| CTA ("View Details") | Required |

### 7.2 Card Hierarchy

Logo + Name (primary, draws the eye) → Short summary + Vendor (secondary) → Badges/category (tertiary) → CTA (visually distinct, consistent placement).

### 7.3 Example

> **Razorpay** — *Accept UPI, cards, and wallets; auto-reconcile fees with student accounts.*
> Category: Payments · Badges: Native · Verified · Popular
> CTA: View Details

---

## 8. Individual Integration Page Template

URL: `/integrations/[slug]` (e.g., `/integrations/razorpay`)

1. **Hero** — both logos (UniqBrio + partner), H1 ("Razorpay Integration for UniqBrio"), benefit-driven subtitle, status badges, primary CTA ("Start Free Trial" / "Book Demo") + secondary CTA ("View Setup Guide"), breadcrumbs, a light trust signal ("Used by 200+ academies").
2. **Overview** — 2–3 sentences: what it does, who it's for.
3. **Key Benefits** — 3–6 bullets, benefit-first, quantified where possible ("Save 15 hours/month on fee reconciliation").
4. **Supported Workflows** — academy-specific flows (e.g., one-time camp fees, recurring monthly tuition, refunds).
5. **Features matrix** — checklist table of what syncs and how.
6. **Requirements & Prerequisites** — account type needed, required UniqBrio plan, admin permission level.
7. **Supported Plans / Regions** — explicit, to avoid post-signup disappointment.
8. **Authentication & Permissions** — auth type, exact scopes/permissions requested, plain-language security note.
9. **Setup Guide** — numbered steps, screenshots, optional embedded walkthrough video.
10. **Architecture/Data-flow diagram** — visual of how data moves between UniqBrio and the partner service.
11. **Typical Workflow scenario** — a realistic end-to-end story ("A student registers in UniqBrio → an invoice auto-creates in Tally").
12. **Example Use Cases** — segmented by role (academy owner, coach, administrator).
13. **Limitations & Known Issues** — state them plainly; transparency here builds more trust than omission (e.g., "Sync runs every 15 minutes, not real-time").
14. **Troubleshooting & FAQ** — accordion component; also target FAQ schema for SEO.
15. **Security, Privacy & Compliance** — data handling location, applicable certifications, link to integration-specific privacy note.
16. **API/Webhook reference** — key endpoints, supported events, rate limits (link out to full docs; don't duplicate them here — see §14 handoff).
17. **Version & Release History** — current version, last-updated date, link to changelog.
18. **Related Integrations** — cross-sell adjacent tools (e.g., viewing Razorpay → suggest Tally or QuickBooks).
19. **Related Documentation** links.
20. **Reinforced CTA** — sticky mobile CTA bar + final on-page CTA ("Ready to connect Razorpay? Start your free trial").

---

## 9. Ideal Onboarding / Setup Sequence

1. **Prerequisites check** — "You'll need a [Vendor] account. Don't have one? [Sign up here]."
2. **Authentication** — OAuth flow or API-key generation, with inline help text per field.
3. **Configuration** — field mapping, sync-frequency selection, webhook endpoint setup.
4. **Test connection** — an explicit "Test Connection" action before going live.
5. **Verification** — success state showing a live data preview, not just a green checkmark.
6. **Troubleshooting fallback** — visible link to docs/support if any step fails.

---

## 10. Integration Metadata Schema

**Required fields:** `name`, `slug`, `logo`, `vendor`, `vendor_url`, `category` (array), `description_short`, `description_long`, `compatibility`, `status` (verified/beta/partner/coming-soon/deprecated), `release_date`, `last_updated`, `documentation_url`.

**Recommended fields:** `authentication_type`, `webhook_support` (boolean), `api_version`, `pricing`, `support_contact`, `tags` (array), `industries` (array), `regions` (array), `setup_complexity`, `supported_editions`/`supported_plans`, `features` (array), `use_cases` (array), `maintainer`, `faqs` (array), `changelog` (array).

Store this in Supabase (Postgres table `integrations`) so the directory and individual pages can be generated programmatically via Next.js ISR rather than hand-authored per integration.

---

## 11. Trust Signals

Verified badge · Official Partner badge · customer/academy count ("Used by 200+ academies") · uptime stat · security certifications (SOC 2, ISO 27001, GDPR/DPDP-compliance note for India) · explicit privacy notes on data handling · case studies · testimonials · implementation-partner listings for complex setups.

---

## 12. Request-an-Integration Flow

**Placement:** persistent "Don't see your tool? Request it" CTA in the directory footer, in individual-page empty states, and available as both a modal (fast path) and a dedicated `/integrations/request` page (shareable, indexable).

**Form fields:** name, email, company/academy name, integration/tool name (autocomplete against existing catalog to catch duplicates and enable "vote" instead of a new submission), vendor URL, use case (free text), priority self-rating, existing-customer flag.

**Duplicate detection & voting:** if the tool already exists as a request, surface "12 people want this — add your vote" instead of creating a duplicate ticket.

**Triage workflow:** submission → confirmation email/thank-you page → internal CRM ticket created (auto-tag by requester type: existing customer vs. prospect) → product team scoring/prioritization → notify requester on build or on decline (with a brief reason and an alternative if one exists).

**Analytics:** track submission volume, most-requested tools, and conversion of "request" submitters into signups once the integration ships.

---

## 13. SEO Strategy

- **URL structure:** `/integrations`, `/integrations/categories/[category]`, `/integrations/[slug]`, `/integrations/request`.
- **Slugs:** kebab-case, vendor-first (`razorpay`, `whatsapp-business`, `google-classroom`).
- **Title tags:** `[Integration Name] Integration | UniqBrio` (individual); `[Category] Integrations | UniqBrio` (category).
- **Meta descriptions:** benefit-led, e.g., "Connect Razorpay to UniqBrio to automate academy fee collection and reconciliation."
- **Open Graph / Twitter Cards:** 1200×630 image including both logos + headline.
- **Canonical tags** on every integration and category page to prevent duplicate-content issues from filter/sort query parameters.
- **Schema markup (JSON-LD):**
- `BreadcrumbList` on every page.
- `SoftwareApplication` on individual integration pages.
- `FAQPage` on the Troubleshooting/FAQ accordion.

```json
{
"@context": "https://schema.org",
"@type": "SoftwareApplication",
"name": "UniqBrio Razorpay Integration",
"applicationCategory": "BusinessApplication",
"operatingSystem": "Web, Android, iOS",
"description": "Connect Razorpay to UniqBrio to automate fee collection and reconciliation for arts and sports academies.",
"url": "https://uniqbrio.com/integrations/razorpay"
}
```

- **Internal linking:** feature pages and blog posts should link into relevant integration pages; integration pages should cross-link to related integrations.
- **Image optimization:** SVG logos, WebP screenshots, descriptive alt text (not "logo.png").
- **Heading hierarchy:** H1 = integration name; H2 = major sections; H3 = sub-steps (e.g., setup steps).
- **Programmatic SEO:** generate category and integration pages from the Supabase metadata table via ISR — but ensure each generated page has enough unique content (benefits, use cases, screenshots) to avoid thin/duplicate-content penalties.
- **Pagination SEO:** use `rel="prev"/"next"`, or canonicalize paginated pages to the unfiltered directory if content overlaps heavily.
- **Indexation:** index `/integrations`, individual pages, and category pages; no-index parameterized filter-combination URLs to avoid index bloat.
- **XML sitemap:** include all live integration and category pages; exclude deprecated/coming-soon pages or mark them `noindex` until launch.

---

## 14. Conversion Optimization

- **Primary CTA** on every integration page: "Start Free Trial" or "Book Demo" — pick one consistent primary action sitewide.
- **Secondary CTA:** "View Documentation" / "Contact Sales" (for complex/enterprise integrations).
- **Sticky mobile CTA bar** that follows scroll.
- Route demo-booking CTAs on complex/enterprise integrations to a rep, where possible, rather than a generic form.
- Track integration-page-originated signups and demo bookings as a distinct conversion segment to prove the directory's ROI.

---

## 15. Accessibility (WCAG 2.1/2.2 AA)

- Full keyboard operability for search, filters, cards, and CTAs.
- Semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`) and correct ARIA labeling for custom filter/accordion components.
- Visible focus states on every interactive element.
- Minimum 4.5:1 text contrast (3:1 for large text/UI components).
- Touch targets ≥44×44px on mobile.
- Content must remain usable at 200% zoom without breaking layout.

---

## 16. Mobile UX

- Cards collapse to a single-column list with larger tap targets.
- Filters move to a bottom-sheet/drawer overlay, never an always-open sidebar.
- Search bar stays prominent and sticky near the top.
- Use accordions for FAQ, troubleshooting, and detailed configuration sections to avoid overwhelming a small screen.

---

## 17. Performance (Next.js on Vercel)

- Use `next/image` with lazy loading for all logos/screenshots below the fold.
- Generate integration and category pages with **Incremental Static Regeneration (ISR)** so metadata edits in Supabase propagate without a full rebuild.
- Leverage Vercel edge caching for global low latency (important for India-first + any diaspora traffic).
- Prefetch integration detail pages on card hover/viewport-enter.
- Code-split heavy client components (search/filter logic) so the initial directory shell loads fast.
- Monitor Core Web Vitals (LCP, INP, CLS) specifically on the directory and top individual integration pages, since these are frequent organic-search entry points.

---

## 18. Analytics to Instrument

Search queries (and failed/zero-result searches — these are a direct product-gap signal) · filter usage combinations · integration page views · CTA click-through · documentation link clicks · setup-completion rate · directory-attributed signup/demo conversion rate · request-an-integration submission volume and most-requested tools.

---

## 19. AI Personalization Opportunities

- Recommend related integrations based on what a similar academy profile already uses.
- Power fuzzy/typo-tolerant search and "did you mean" suggestions.
- Summarize long setup guides into a "quick start" version on demand.
- Power a setup-assistant chatbot embedded in the individual integration page for troubleshooting.
- Surface smart FAQ answers tailored to the visitor's likely role (owner vs. coach vs. admin).

---

## 20. Reusable Design System Components

`IntegrationCard` · `StatusBadge` (Verified/Beta/Partner/New) · `FilterChip` · `CategoryTile` · `Breadcrumbs` · `Accordion` (FAQ/troubleshooting) · `Tabs` (API reference/changelog) · `FeatureComparisonTable` · `EmptyState` · `CTABlock` (with sticky-mobile variant).

---

## 21. Copywriting Guidance

- **Benefit-first, not feature-first:** "Automate fee reconciliation" beats "REST API webhook sync."
- **Plain language over jargon** unless the audience segment is explicitly technical (API reference sections can be precise/technical; hero and benefits copy should not).
- **Scannability:** short paragraphs, bolded key phrases, bulleted benefits.
- **Microcopy matters:** button labels should be specific ("Connect Razorpay," not "Submit"); error messages should be actionable ("Invalid API key — check your credentials and try again," not "Error 403").
- **Enterprise credibility cues** in copy (security, reliability, support) matter even for a market of Tier 2/3 city academy owners evaluating on behalf of a growing multi-branch business.

---

## 22. Common Mistakes to Avoid

- Poor or single-axis categorization that ignores the use-case mental model.
- Missing or incomplete metadata (evaluators bounce when they can't find auth type or setup complexity).
- Weak or literal-only search that fails on synonyms/typos.
- Duplicate pages for the same integration under different slugs.
- Stale/outdated listings (wrong screenshots, dead setup steps).
- Broken documentation links.
- Overly technical copy in benefit sections with no plain-language translation.
- Missing or buried CTAs on individual pages.
- Thin, near-duplicate SEO pages generated programmatically without unique content.
- No request-an-integration flow — silently losing demand signal.
- Leaving deprecated integrations live and browsable instead of archiving them.

---

## 23. Worked Examples

**Payment gateway card:** Razorpay — *"Accept UPI, cards, and wallets; auto-reconcile fees."* Badges: Native, Verified, Popular. CTA: View Details.

**Messaging integration page (WhatsApp Business):** Hero — "UniqBrio WhatsApp Business Integration — Automate parent communication and payment reminders." Benefits: automated fee reminders, instant schedule-change alerts, two-way parent queries. CTA: Contact Sales (higher-touch due to WhatsApp Business API onboarding complexity).

**Calendar integration (Google Calendar):** Use case: two-way sync of class schedules; typical workflow: "Coach updates a class time in UniqBrio → parents' synced Google Calendars update automatically."

**CRM integration (Zoho CRM):** Use case: sync new-enquiry leads from UniqBrio's public join pages directly into the academy's existing CRM pipeline.

**Accounting integration (Tally):** Typical workflow: "Student fee payment recorded in UniqBrio → ledger entry auto-created in Tally," with an explicit limitation noted ("batch sync every 15 minutes, not real-time").

**Analytics integration (Google Analytics):** Use case: track marketing-site conversion funnels feeding into signup, separate from in-product usage analytics.

**Authentication provider (Google OAuth):** Use case: staff/owner login convenience; explicitly note this is separate from the product's core OTP-based owner auth flow.

---

## 24. Cross-References & Handoffs

- **`external-api-integration-expert`** — owns the actual technical implementation: retries, idempotency, webhook signature verification, rate-limit handling, and the real API/webhook reference content. Hand off once this skill has defined *which* auth type, permissions, and data-flow diagram to display — that skill fills in the engineering-accurate detail behind it.
- **`saas-website-sitemap-architect`** — owns overall site IA, ensures `/integrations` and all sub-pages are correctly slotted into global navigation, the sitemap.xml, and internal linking strategy at the site level (this skill owns the *internal* architecture of the integrations section only).
- **`on-page-seo-copywriter`** — owns final on-page copy polish: title tag/meta description wording, keyword targeting, and semantic SEO refinement. Hand off the structured content outline and schema requirements from §13 to that skill for final copy pass.

Collaborate rather than duplicate: this skill defines *structure, fields, and UX*; the cross-referenced skills define *technical accuracy*, *sitewide placement*, and *copy polish* respectively.

---

## 25. Implementation Checklist

- [ ] Define `integrations` metadata schema in Supabase
- [ ] Build `IntegrationCard`, `StatusBadge`, `FilterChip`, `CategoryTile` components
- [ ] Build master directory page with search, filters, sort, pagination
- [ ] Build category landing pages
- [ ] Build individual integration page template (ISR-driven from Supabase)
- [ ] Implement Request-an-Integration modal + dedicated page with duplicate detection
- [ ] Add BreadcrumbList, SoftwareApplication, and FAQPage JSON-LD schema
- [ ] Add canonical tags and no-index rules for filtered/paginated URLs
- [ ] Populate initial catalog (Payments, Messaging, Calendar, CRM, Accounting, Analytics, Auth at minimum)
- [ ] Instrument analytics: search, filter usage, CTA clicks, request submissions, conversion attribution
- [ ] Accessibility audit (keyboard nav, contrast, ARIA on custom components)
- [ ] Performance audit (Core Web Vitals on directory + top integration pages)
- [ ] Handoff technical API/webhook detail to `external-api-integration-expert`
- [ ] Handoff sitewide nav/sitemap placement to `saas-website-sitemap-architect`
- [ ] Handoff final copy pass to `on-page-seo-copywriter`
