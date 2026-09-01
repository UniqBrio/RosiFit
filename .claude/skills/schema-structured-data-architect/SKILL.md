---
name: schema-structured-data-architect
description: Design, generate, validate, implement, and maintain production-ready Schema.org JSON-LD structured data across a Next.js SaaS website to maximize Google Rich Results eligibility and machine-readability while strictly preventing spam, fabrication, and search-compliance violations.
when_to_use: Use whenever JSON-LD needs to be planned, generated, implemented in Next.js App Router, validated, or audited for any page on a production SaaS website such as UniqBrio.
---

# Schema Structured Data Architect

## Overview

This skill governs the design, generation, implementation, validation, and long-term maintenance of Schema.org JSON-LD structured data across a modern SaaS marketing site. It exists to make the site's key facts — who the organization is, what the product does, what it costs, what customers genuinely say about it, and how pages relate to one another — machine-readable to search engines, while remaining strictly compliant with Google's structured data policies.

**Target implementation:** UniqBrio, an India-first B2B SaaS platform for arts and sports academy management, built on React Native Expo PWA + Next.js App Router + React + TypeScript + Supabase/PostgreSQL + Supabase Edge Functions + Vercel. The public pre-login marketing site must convert Indian academy owners into free trial signups, demo bookings, and paid subscriptions. Every recommendation below is directly implementable in that stack, and generalizes to any modern SaaS site.

## Objectives

- Determine the correct Schema.org type(s) for every page, without guesswork.
- Generate valid, production-ready JSON-LD from a small set of reusable builder functions.
- Maximize eligibility for Google Rich Results (FAQ, Review, Software App, Breadcrumb, Knowledge Graph) without ever risking a manual action.
- Improve semantic completeness and entity linking so the site behaves as a coherent knowledge graph, not a pile of disconnected pages.
- Keep schema synchronized with the website as content, pricing, and features evolve.
- Integrate cleanly into Next.js Server Components with negligible performance cost.

Optimize for: **correctness > semantic completeness > SEO impact > maintainability > scalability > developer experience.** Never trade correctness for rich-result eligibility.

## Responsibilities

- **Audit** — assess existing schema coverage, correctness, and rich-result performance.
- **Design** — decide which schema types belong on new page templates before code is written.
- **Generate** — produce JSON-LD via typed, reusable builder/factory functions, never hand-written inline objects.
- **Validate** — confirm technical validity (JSON, required properties) and policy compliance (no fabrication) before every deploy.
- **Maintain** — keep schema synchronized with content/CMS changes and with Schema.org/Google's evolving requirements.
- **Escalate** — hand off content-strategy or data-architecture decisions to the companion skills listed in Cross-References, rather than absorbing their scope.

## Guiding Principles

1. **Visible-content parity.** JSON-LD must describe only what a user can actually see on that exact page. Anything hidden, gated behind JS interaction, or absent from the DOM must not appear in schema.
2. **Never fabricate.** Reviews, ratings, review counts, and aggregate scores must always trace back to real, first-party, verifiable data. This is non-negotiable and is covered exhaustively below.
3. **Canonical truth.** Every `url`, `mainEntityOfPage`, and `@id` must match the page's canonical URL — never a tracking parameter, staging domain, or non-canonical variant.
4. **Stable identifiers, not duplication.** Give recurring entities (Organization, Brand, Product) a persistent `@id` URI and reference it everywhere via `{"@id": "..."}` rather than repeating the full object. This builds a real entity graph instead of a duplicated blob.
5. **Most specific type wins.** Prefer `SoftwareApplication` over generic `Product`; prefer `BlogPosting` over generic `Article` where it fits.
6. **Restraint over coverage.** Not every page needs schema. Thin, legal, or authentication pages should intentionally omit it (see Decision Trees).
7. **Evolvable by design.** Code structure must let a schema change (new field, new type, deprecated property) be made once in a builder function and propagate everywhere, not be hunted down page by page.

## Workflow

1. **Page intent analysis** — identify the page's primary purpose (convert, inform, navigate, support).
2. **Page type detection** — classify the route into a known category (see table below).
3. **Schema selection** — choose primary + optional schema per the Selection Strategy matrix; apply the Decision Trees for edge cases.
4. **Data collection** — pull required fields from Supabase/PostgreSQL, Edge Functions, or component props — never hardcode dynamic facts.
5. **JSON-LD generation** — call the relevant builder function(s); combine multiple schemas into a single `@graph` block where practical.
6. **Validation** — run local lint + type checks, then Google Rich Results Test / Schema Markup Validator before merge.
7. **Implementation** — embed via a shared `<SchemaScript>` Server Component in `layout.tsx` or `page.tsx`.
8. **Monitoring** — track Search Console's Enhancements reports on a defined cadence; treat new errors as release blockers.

## Decision Framework

### Page Type Detection

Classify by route pattern:

| Route pattern | Page type |
|---|---|
| `/` | Homepage |
| `/product`, `/software/[slug]` | Product page |
| `/pricing` | Pricing |
| `/features` | Features |
| `/solutions/[industry]` | Solutions / industry page |
| `/lp/[campaign]` | Landing page |
| `/about` | About |
| `/contact` | Contact |
| `/blog/[slug]` | Blog article |
| `/docs/[...slug]` | Documentation |
| `/faq` | FAQ |
| `/reviews`, `/testimonials` | Reviews |
| `/case-studies/[slug]` | Case study |
| `/legal/*` (terms, privacy) | Legal |
| `/auth/*`, `/login`, `/signup` | Authentication |

### Schema Selection Strategy — Page-by-Page Matrix

| Page | Primary schema | Optional schema | Avoid | Rationale |
|---|---|---|---|---|
| Homepage | `Organization`, `WebSite` | `BreadcrumbList` | `Product` as primary | Establishes the root entity; everything else links back to it via `@id`. |
| Product page | `SoftwareApplication` | `BreadcrumbList`, `AggregateRating`, `Review`, `FAQPage` | Generic `Product` alone | Most specific type; enables Software App rich results. |
| Pricing | `SoftwareApplication` (or `Product`) with `Offer` | `BreadcrumbList`, `FAQPage` (billing FAQs) | Per-plan `Offer` spam | One clear offer entity beats a wall of near-duplicate offers. |
| Features | `SoftwareApplication` or `WebPage` | `BreadcrumbList`, `ItemList` for feature groups | `FAQPage` unless real Q&A exists | Feature lists aren't naturally FAQ content — don't force it. |
| Solutions / industry pages | `SoftwareApplication` (industry-scoped) | `BreadcrumbList`, `Organization` (provider) | Duplicate `SoftwareApplication` `@id` per industry page | Reuse the same product `@id`; vary only descriptive text. |
| Landing pages (campaign) | Matches the promoted page's type | `Organization` | `FAQPage` unless genuine Q&A is visible | Landing pages are conversion surfaces, not content hubs — don't over-mark them. |
| About | `Organization`, `Person` (founder/team) | `BreadcrumbList` | — | Supports Knowledge Graph and E-E-A-T signals. |
| Contact | `Organization` with `ContactPoint` | `BreadcrumbList` | — | Makes phone/email/hours machine-readable. |
| Blog post | `Article` / `BlogPosting` | `BreadcrumbList`, `Person` (author), `Organization` (publisher) | `Product` schema | Standard article markup with clear authorship. |
| Documentation | `TechArticle` or `HowTo` | `BreadcrumbList`, `Organization` | `Review` | Instructional content, not a reviewable entity. |
| FAQ page | `FAQPage` | `BreadcrumbList` | — | Only where the page is genuinely a Q&A list. |
| Reviews / testimonials | `AggregateRating` + `Review`, attached to `SoftwareApplication` | `BreadcrumbList` | Any fabricated or unverifiable score | See the Review & Rating Accuracy section — this is the highest-risk schema on the site. |
| Case study | `Article` | `BreadcrumbList`, `Organization` (publisher) | `Review` unless the customer explicitly reviewed the product | Case studies are narrative, not star ratings. |
| Legal pages | *No schema* | — | Everything | No consumer rich-result value; adding schema here is clutter, not benefit. |
| Auth pages (login/signup) | *No schema* | — | Everything | No indexable value; these pages shouldn't be indexed at all (`noindex`). |

### Schema Relationships

- `SoftwareApplication` is a subtype of `Product` — prefer the specific type.
- `Organization` is typically the `publisher`, `brand`, and `author` of `SoftwareApplication` and `Article` entities — link via `@id`, don't nest a full copy.
- `AggregateRating` and `Review` are always properties **of** a `SoftwareApplication`/`Product` — they never stand alone.
- `BreadcrumbList` is independent but should mirror the page's actual visible navigation trail.
- `FAQPage.mainEntity` is an array of `Question` objects, each containing exactly one `acceptedAnswer` (`Answer`).
- `Article`/`BlogPosting` can reference a `SoftwareApplication` or `Organization` as its subject via `about` or `mentions`.

## JSON-LD Architecture & Best Practices

**Why JSON-LD:** it's the format Google explicitly recommends, it's fully decoupled from the DOM (no microdata attribute pollution), and it's trivial to generate server-side in Next.js.

- **Placement:** inject via a `<script type="application/ld+json">` rendered from a Server Component, in `<head>` (root layout) for site-wide entities, or inline at the top of the page body for page-specific entities. Never render structured data from a Client Component — it should not depend on hydration.
- **Single vs. multiple blocks:** prefer one `@graph`-wrapped block per page combining all applicable entities; only split into multiple `<script>` tags when entities are generated by genuinely separate components (e.g., a shared layout Organization block plus a page-level Product block).
- **Deduplication:** never emit the same primary entity (e.g., `Organization`) fully twice on one page. If it must appear in two components, both should reference the same `@id` and only one should carry the full object body.
- **Entity linking & `@id`:** give the Organization a stable URI, e.g. `https://uniqbrio.com/#organization`, and reference it everywhere as `{"@id": "https://uniqbrio.com/#organization"}` for `publisher`, `brand`, `author`, and `seller`.
- **Canonical URLs:** `url` and `mainEntityOfPage` must exactly equal the page's canonical `<link rel="canonical">` value — including protocol and trailing slash convention.
- **Core properties to get right on every entity:** `sameAs` (verified official social/profile URLs only), `url`, `identifier`, `publisher`, `image` (absolute URL, real dimensions), `logo` (as `ImageObject`, square, ≥112×112px), `brand`, `mainEntity`, `mainEntityOfPage`, `isPartOf` (for articles, linking to the parent `WebSite`), and `potentialAction` where a real action exists (e.g., `SearchAction` on the homepage `WebSite`).
- **Nested vs. linked entities:** nest only for properties inherently local to that entity (e.g., an `Offer` inside a `SoftwareApplication`); link via `@id` for anything reused elsewhere (Organization, Brand).

## Next.js Implementation

### Folder structure

```
lib/
  schema/
    config.ts                  # central site/entity configuration
    generators/
      organization.ts
      softwareApplication.ts
      breadcrumbs.ts
      faq.ts
      review.ts
    types/
      schema-org.ts             # strict TS interfaces per Schema.org type
    utils/
      validate-schema.ts
      get-canonical-url.ts
components/
  seo/
    SchemaScript.tsx             # shared render component
```

### Shared render component (Server Component)

```tsx
// components/seo/SchemaScript.tsx
export default function SchemaScript({
  schema,
}: {
  schema: Record<string, any> | Record<string, any>[];
}) {
  const graph = Array.isArray(schema) ? schema : [schema];
  const payload =
    graph.length > 1
      ? { "@context": "https://schema.org", "@graph": graph }
      : graph[0];

  return (
    <script
      type="application/ld+json"
      // Content is generated server-side from trusted builder functions only.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
```

### Central configuration

```ts
// lib/schema/config.ts
export const SCHEMA_CONFIG = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://uniqbrio.com",
  organization: {
    name: "UniqBrio",
    logo: "https://uniqbrio.com/assets/logo.png",
    sameAs: [
      "https://www.linkedin.com/company/uniqbrio",
      "https://twitter.com/uniqbrio",
    ],
    contact: { email: "support@uniqbrio.com", phone: "+91-XXXXXXXXXX" },
  },
  softwareApplication: {
    name: "UniqBrio Academy Management",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
  },
} as const;
```

### Factory function example

```ts
// lib/schema/generators/organization.ts
import { SCHEMA_CONFIG } from "../config";

export function generateOrganizationSchema() {
  const { siteUrl, organization } = SCHEMA_CONFIG;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: organization.name,
    url: siteUrl,
    logo: { "@type": "ImageObject", url: organization.logo },
    sameAs: organization.sameAs,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi", "Tamil"],
      email: organization.contact.email,
      telephone: organization.contact.phone,
    },
  };
}
```

### Page-level usage (App Router)

```tsx
// app/software/[slug]/page.tsx
import SchemaScript from "@/components/seo/SchemaScript";
import { generateOrganizationSchema } from "@/lib/schema/generators/organization";
import { generateSoftwareApplicationSchema } from "@/lib/schema/generators/softwareApplication";
import { generateBreadcrumbSchema } from "@/lib/schema/generators/breadcrumbs";
import { getProductBySlug } from "@/lib/products";

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);

  const schema = [
    generateOrganizationSchema(),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Software", url: "/software" },
      { name: product.name, url: `/software/${product.slug}` },
    ]),
    generateSoftwareApplicationSchema(product),
  ];

  return (
    <>
      <SchemaScript schema={schema} />
      {/* page content */}
    </>
  );
}
```

### Rendering strategy notes

- **Server Components** should always own schema generation — fetch data directly, no client waterfalls.
- **Metadata API** (`generateMetadata`) handles `<title>`/`<meta>`/canonical; JSON-LD is separate and lives alongside it, sourced from the same data fetch to guarantee parity.
- **SSG/ISR** pages generate schema at build/revalidate time — set `revalidate` to match how often the underlying reviews/pricing/FAQ data changes.
- **SSR** pages generate schema per request — keep the Supabase query it depends on cheap and indexed.
- **Edge Runtime:** ensure any Edge Function feeding schema data returns synchronously-awaitable JSON; never stream partial JSON-LD.
- **TypeScript:** every builder function's input should be a strict interface matching the Schema.org type's required fields, so missing data fails at compile time, not in production.
- **Environment variables:** `NEXT_PUBLIC_SITE_URL` must differ correctly across Preview/Production Vercel environments so `@id`/`url` values never leak a preview domain into indexed schema — hard-fail the build if `NEXT_PUBLIC_SITE_URL` is unset in Production.
- **Performance:** schema generation and serialization should add negligible (<50ms) server render time; avoid heavy synchronous work inside builder functions.

## Dynamic Schema (CMS/Database-Driven)

- **Supabase/PostgreSQL** is the source of truth for reviews, FAQ entries, pricing, and feature lists — schema builders must query the same tables (and same `is_approved`/`is_published` filters) that render the visible content, never a separate or looser dataset.
- **Supabase Edge Functions** can aggregate review data (average rating, count) server-side so the page doesn't need to compute it client-side or expose raw table structure.
- **Cache invalidation:** tie schema regeneration to the same `revalidateTag`/ISR window as the visible content. If a review is deleted or a price changes, the schema must update in the same revalidation cycle — a lag here creates a mismatched-content violation.
- **Stale data prevention:** use database triggers or webhook-driven cache flushes for high-impact changes (rating recalculation, price changes) rather than relying solely on time-based ISR.
- **Dynamic breadcrumbs:** derive from the URL path or the content's category hierarchy in the database; `position` values must be sequential integers starting at 1.

## Rich Results — Eligibility & Limitations

| Rich result | Eligibility requirements | Limitations |
|---|---|---|
| FAQ | Q&A fully visible in the rendered HTML; no promotional/offensive content | Google may still choose not to display it even when valid, and has restricted FAQ rich results to certain authoritative site types over time — verify current eligibility before relying on it |
| Review snippets | First-party, verifiable reviews visible on the same page | Heavily scrutinized; self-serving or third-party aggregator reviews are frequently ignored or penalized |
| Software App | `name`, `applicationCategory`, `operatingSystem`, and `offers`/`aggregateRating` present | Historically oriented toward app-store listings; validity for web SaaS should be periodically re-checked against current Google documentation |
| Breadcrumb | Valid `BreadcrumbList` matching visible navigation | Google may rewrite breadcrumbs using its own understanding of site structure regardless of markup |
| Knowledge Graph / Organization | Robust `Organization` schema with consistent NAP and verified `sameAs` links | Takes time and external signals (backlinks, press, citations) to materialize — schema alone doesn't guarantee it |

> **Caution:** structured data is a hint, not a guarantee. Never promise rich results as a deliverable outcome — only "eligibility."

## Review & Rating Accuracy — Critical Compliance Section

> ⚠️ This is the highest-risk schema type on the site. A violation here risks a Google manual action against the entire domain, not just the offending page.

**Absolute rules:**
- Never fabricate reviews.
- Never fabricate ratings.
- Never invent an aggregate score.
- Never inflate a review count.
- Only use first-party, verifiable data collected directly from real UniqBrio users.
- Only expose an `AggregateRating`/`Review` if it is genuinely displayed, in full, on that same page.

**Content alignment:** `reviewBody` and `ratingValue` in JSON-LD must match, word-for-word and star-for-star, what's rendered in the DOM. If a testimonial is edited or removed on the page, update or remove the schema in the same deploy.

**Freshness & lifecycle:** review data should be refreshed on a defined cadence (see Maintenance Cadence). When a review is deleted by a user or moderator, recalculate `AggregateRating` immediately — don't let `reviewCount` drift from the underlying table.

**Moderation:** only mark up reviews that have passed moderation (`is_approved = true` in Supabase). Never emit schema for unmoderated or pending user-generated content.

**Self-serving reviews:** Google devalues (and may penalize) reviews authored by the company, its employees, or incentivized reviewers presented as organic. Only genuine, unprompted customer reviews qualify.

**Eligibility & trust:** `Review`/`AggregateRating` should always attach to a specific `SoftwareApplication`/`Product` entity — never appear as a free-floating claim about "the company" in general.

## Validation Workflow

1. **Local development** — validate JSON structurally (`JSON.stringify`/`JSON.parse` round-trip) and check required fields via the strict TypeScript interfaces before committing.
2. **CI pipeline** — run a schema linter/validator step (e.g., a custom `validate-schema.ts` or a package like `schema-dts`) against generated output; fail the build on invalid JSON or missing required properties.
3. **Pre-deployment** — manually test representative URLs in the Google Rich Results Test and the Schema.org Markup Validator.
4. **Post-deployment** — submit/resubmit the sitemap in Google Search Console; monitor the Enhancements reports (FAQ, Review, Software App, Breadcrumb) for new errors or warnings.
5. **Regression testing** — after any schema-generator change, re-validate a sample of every affected page template, not just the one that was edited.
6. **Ongoing monitoring** — schedule automated checks (cron + Search Console API) to alert on new structured-data errors between manual reviews.
7. **Error vs. warning handling** — treat *errors* as release-blocking; triage *warnings* within one sprint, don't let them accumulate silently.

## Testing

- Unit-test each builder function: given known input, assert exact expected JSON-LD output (including required fields and correct `@id` formatting).
- Snapshot-test the combined `@graph` payload per page template to catch accidental duplication or missing entities.
- Integration-test that dynamic values (rating, review count, price) in schema always match the same values rendered visibly on the page in the same request.
- Include a CI check that no page emits `Review`/`AggregateRating` without moderation-approved backing data.

## Schema Maintenance

- **Schema.org evolution:** review the Schema.org changelog and Google Search Central documentation on a quarterly cadence; retire deprecated types/properties promptly.
- **Scheduled audits:** run a full-site structured data audit at least twice a year (bi-annually), plus a lighter audit of the top 20 highest-traffic pages quarterly.
- **Content synchronization:** any CMS/content model change (new pricing tier, new FAQ category, new page template) must trigger a corresponding builder-function update in the same PR — never as a follow-up task.
- **Change management & ownership:** assign a named owner (engineer or SEO lead) responsible for Search Console monitoring and schema sign-off before releases.
- **Documentation:** maintain a living inventory of every schema type in use, which builder function produces it, and which pages consume it.

## Error Prevention — Common Mistakes

| Mistake | Consequence | Prevention |
|---|---|---|
| Invalid JSON (trailing commas, unescaped quotes) | Entire block ignored by Google | Always `JSON.stringify()`; never hand-concatenate strings |
| Wrong type for the page (e.g., `Article` on a product page) | Missed rich-result eligibility | Follow the Page Type Detection + Selection Strategy tables |
| Missing required fields | Validator errors, rich result denied | Enforce via strict TypeScript interfaces + CI schema checks |
| Incorrect nesting | Broken entity relationships | Understand what nests (Offer) vs. what links (`@id`) |
| Duplicate entities | Search engine confusion, diluted signal | One canonical `@id` per entity, referenced everywhere |
| Fake/inflated reviews or ratings | Manual action, domain-wide trust loss | Strict adherence to Review & Rating Accuracy rules above |
| Incorrect/non-canonical URLs | Broken entity linking, indexing confusion | Centralize URL generation via `getCanonicalUrl()` |
| Broken image URLs | Knowledge Graph / rich result failures | Validate `image`/`logo` URLs are absolute and resolve at build/deploy time |
| Orphaned `@id` references | Unresolved entity graph | Every referenced `@id` must be defined somewhere on the page or in the linked graph |
| Mismatched content | Rich results suppressed or penalized | Enforce 1:1 parity between JSON-LD and rendered DOM |
| Hidden content in schema | Spam policy violation | Never mark up content in `display:none`, unexpanded accordions, or JS-gated interactions |
| Keyword stuffing in `description`/`name` | Spam flag, reduced trust | Write natural, user-facing descriptions only |
| Obsolete schema types | Silently ignored by search engines | Retire per the Maintenance cadence above |
| Incorrect breadcrumb structure/order | Enhancement suppressed | Ensure sequential `position` values matching real navigation |

## Reusable Patterns

Centralize all schema logic behind: (1) a single `config.ts` holding site-wide constants, (2) one factory function per Schema.org type, (3) a shared `<SchemaScript>` render component, and (4) shared utilities (`getCanonicalUrl`, `validateSchema`). Never write a raw JSON-LD object inline in a page component — always call a builder function so a future change is made once, not N times.

```ts
// lib/schema/generators/faq.ts
export function generateFAQPageSchema(
  faqs: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
```

```ts
// lib/schema/generators/breadcrumbs.ts
export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${process.env.NEXT_PUBLIC_SITE_URL}${item.url}`,
    })),
  };
}
```

## Decision Trees

**Which primary schema belongs on this page?**
1. Is it the Homepage/About? → `Organization` (+ `WebSite`).
2. Is it a core product/pricing/feature page? → `SoftwareApplication`.
3. Is it a blog post or case study? → `Article`/`BlogPosting`.
4. Does it have a visible hierarchical path? → add `BreadcrumbList`.
5. Does it have visible Q&A? → add `FAQPage`.
6. Does it display verifiable customer reviews? → add `Review`/`AggregateRating`.
7. None of the above cleanly fits, and the page is thin/legal/auth? → omit schema entirely.

**Is `Review`/`AggregateRating` allowed?**
1. Are the reviews from real, verified UniqBrio users? If no → stop.
2. Are they visibly displayed on this exact page? If no → stop.
3. Is the average mathematically derived from the visible reviews, with an accurate count? If no → stop.
4. All yes → proceed.

**Is `FAQPage` appropriate?**
1. Does the page contain explicit question/answer pairs? If no → stop.
2. Is the answer text present in the initial HTML (not loaded only after a client-side interaction)? If no → stop.
3. Is the content genuinely informational, not disguised advertising? If no → stop.
4. All yes → proceed.

**When to omit schema entirely:** legal pages, authentication pages, thin/placeholder pages, redirects, and error pages.

## Examples

> Placeholder values below (ratings, counts, phone numbers) are illustrative only and must be replaced with real, verified UniqBrio data before deployment. Never ship a placeholder rating or review count to production.

**Organization**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://uniqbrio.com/#organization",
  "name": "UniqBrio",
  "url": "https://uniqbrio.com",
  "logo": { "@type": "ImageObject", "url": "https://uniqbrio.com/assets/logo.png" },
  "description": "India-first B2B SaaS platform for arts and sports academy management.",
  "areaServed": "IN",
  "sameAs": [
    "https://www.linkedin.com/company/uniqbrio",
    "https://twitter.com/uniqbrio"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "areaServed": "IN",
    "availableLanguage": ["English", "Hindi", "Tamil"]
  }
}
```

**SoftwareApplication**
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": "https://uniqbrio.com/product/#software",
  "name": "UniqBrio Academy Management",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android",
  "url": "https://uniqbrio.com/product",
  "brand": { "@id": "https://uniqbrio.com/#organization" },
  "offers": {
    "@type": "Offer",
    "price": "PLACEHOLDER_PRICE",
    "priceCurrency": "INR",
    "availability": "https://schema.org/InStock"
  }
}
```
*(`aggregateRating` is intentionally omitted from this example — add it only once a real, verified rating exists.)*

**BreadcrumbList**
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://uniqbrio.com/" },
    { "@type": "ListItem", "position": 2, "name": "Solutions", "item": "https://uniqbrio.com/solutions" },
    { "@type": "ListItem", "position": 3, "name": "Dance Academies", "item": "https://uniqbrio.com/solutions/dance-academies" }
  ]
}
```

**FAQPage**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Does UniqBrio support automated fee reminders for parents?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, UniqBrio sends automated WhatsApp fee reminders to parents on a configurable schedule."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a free trial available?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, UniqBrio offers a free trial period with no credit card required."
      }
    }
  ]
}
```
*(Use only questions/answers that are genuinely rendered on the FAQ page — do not invent content to fill this out.)*

**Review + AggregateRating** — *shown only as a structural template; do not populate with invented names, dates, or scores. Populate exclusively from moderation-approved rows in the Supabase `reviews` table, joined at build/request time.*
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": "https://uniqbrio.com/product/#software",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "REAL_AVERAGE_FROM_DB",
    "reviewCount": "REAL_COUNT_FROM_DB",
    "bestRating": "5",
    "worstRating": "1"
  },
  "review": [
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "REAL_MODERATED_REVIEWER_NAME" },
      "datePublished": "REAL_PUBLISH_DATE",
      "reviewBody": "REAL_MODERATED_REVIEW_TEXT_MATCHING_VISIBLE_PAGE",
      "reviewRating": { "@type": "Rating", "ratingValue": "REAL_STAR_VALUE", "bestRating": "5" }
    }
  ]
}
```

## Anti-Patterns

- Marking up an `AggregateRating` before any real reviews exist ("fake it till you make it").
- Copy-pasting the full `Organization` object on every page instead of `@id`-referencing it.
- Adding `FAQPage` to every page "just in case" a rich result appears.
- Letting schema go stale after a visible pricing or feature change ships.
- Generating schema client-side, creating hydration/timing mismatches with the crawled HTML.
- Using `Review`/`AggregateRating` sourced from a third-party aggregator without first-party verification.
- Applying identical `@id` values across genuinely different entities (e.g., reusing the Organization `@id` for a Product).

## Checklists

**Developer**
- [ ] Schema generated via typed builder functions, never inline objects
- [ ] `JSON.stringify()` used; no manual string concatenation
- [ ] All `@id`/`url` values are absolute, canonical URLs
- [ ] Dynamic fields fetched server-side from the same source as visible content
- [ ] Rendered via a Server Component, not a Client Component
- [ ] No duplicate primary entities on one page

**SEO**
- [ ] Page's primary intent matches its primary schema type
- [ ] Breadcrumbs present on all hierarchical pages
- [ ] `FAQPage` used only where genuine visible Q&A exists
- [ ] `sameAs` links point to verified, live official profiles
- [ ] No keyword stuffing in `name`/`description`

**Launch**
- [ ] Zero errors in Google Rich Results Test for representative URLs
- [ ] Zero errors in Schema.org Markup Validator
- [ ] CI schema-validation step passing
- [ ] Sitemap submitted/updated in Search Console

**Validation**
- [ ] Unit tests pass for all builder functions
- [ ] Snapshot tests pass for combined page-level `@graph`
- [ ] Manual spot-check on at least one page per template

**Maintenance**
- [ ] Quarterly Schema.org/Google documentation review completed
- [ ] Bi-annual full-site audit completed
- [ ] Search Console Enhancements reviewed on the defined cadence
- [ ] Named schema owner assigned and current

**Content**
- [ ] Reviews and ratings reflect current, moderation-approved data
- [ ] FAQ content is accurate and currently rendered on the page
- [ ] Pricing in schema matches pricing visibly displayed
- [ ] Organization contact info and logo are current

## Cross-References — Companion Skills

- **seo-technical-audit-specialist** — owns site-wide technical SEO: crawl budget, indexability, Core Web Vitals, canonicalization strategy. Defer to it for anything beyond structured data itself; feed it the schema inventory for inclusion in its audits.
- **faq-page-strategist** — owns FAQ *content* strategy: which questions to ask, keyword targeting, snippet-optimized phrasing. This skill only handles the `FAQPage` JSON-LD once that content is finalized — don't originate FAQ copy here.
- **review-aggregation-specialist** — owns the collection, moderation, and storage architecture for reviews. This skill only represents that already-verified data as `Review`/`AggregateRating` — never originates or moderates review content.
- **nextjs-architect** — owns broader Next.js App Router architecture: rendering strategy, caching, folder conventions beyond `lib/schema`. Consult it for ISR/Edge/performance decisions that affect where schema generation should live.

Use all four together when shipping a new page template that involves reviews, FAQs, or non-trivial rendering strategy — this skill supplies the structured-data layer on top of their decisions, not a replacement for them.

## Success Criteria

- Zero structured-data errors in Google Search Console across all templated pages.
- Measurable rich-result impressions (FAQ, Breadcrumb, Software App, Review) within a defined post-launch monitoring window, with no fabricated data behind any of them.
- Zero manual actions related to structured data.
- Any schema change is achievable by editing one builder function, not hunting across page components.
- Schema generation adds negligible render-time overhead and never blocks or delays page content.
