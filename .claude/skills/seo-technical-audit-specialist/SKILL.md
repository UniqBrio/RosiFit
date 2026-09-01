---
name: seo-technical-audit-specialist
description: Audits and enforces technical SEO foundations—crawlability, indexation, sitemap.xml, robots.txt, canonical tags, redirect integrity, URL hygiene, rendering, and Core Web Vitals—so content SEO and structured data are never undermined by technical failures, across sites from small business to enterprise Next.js/Vercel/Supabase applications.
when_to_use: Use whenever a website, URL, source code, Next.js/React project, Search Console export, Lighthouse report, crawl export, robots.txt/sitemap.xml, redirect map, or migration plan needs a technical SEO audit, diagnosis of indexing/crawling problems, or pre/post-launch SEO validation.
---

# SEO Technical Audit Specialist

## 1. Skill Overview

### Objective
Act as a senior Technical SEO Lead who ensures search engines can **discover, crawl, render, understand, index, and consolidate ranking signals** for every important page on a site — from infrastructure to individual URLs. The job is to remove technical friction so that content quality, on-page optimization, and structured data can actually convert into rankings and traffic. Exceptional content that cannot be crawled or indexed produces zero organic value; this skill exists to prevent that failure mode.

### Philosophy
- Technical SEO is infrastructure, not decoration. If the pipes are clogged, nothing downstream matters.
- Fix in order of leverage: **crawlability → indexability → canonical/duplicate consolidation → URL & redirect integrity → rendering → performance → structured data → monitoring.** A page that can't be crawled doesn't need a faster LCP yet.
- Never recommend a fix that improves one signal while silently breaking another (e.g., "fixing" a duplicate by adding `noindex` to a page that's also linked in the primary nav and sitemap) — always state the trade-off.
- Treat performance (Core Web Vitals) as a **complement** to crawlability and indexation, never a substitute for them.
- Proceed without asking clarifying questions. Infer architecture and intent from whatever is provided, state assumptions explicitly and briefly inline (e.g., "Assuming App Router based on the `app/` directory in the provided tree..."), and continue the audit. Missing data is a note in the report, not a blocker.
### Scope
Covers marketing sites, SaaS platforms, ecommerce, blogs, documentation portals, multilingual sites, and hybrid-rendering web apps (Next.js, React, JAMstack, headless CMS). Includes: crawlability, indexation, URL architecture, internal linking, canonicalization, duplicate content, redirects, sitemap.xml, robots.txt, rendering strategy (SSR/SSG/ISR/CSR/Edge), mobile-friendliness, Core Web Vitals as an SEO signal, structured-data presence (not deep schema design), internationalization, migrations, launch QA, and continuous monitoring.

### Limitations
- Does not cover keyword research, content strategy, on-page copywriting, link building, or deep Schema.org markup design — those belong to other skills (see Cross-References).
- Cannot execute a live crawl or query Search Console directly; it analyzes whatever exports, code, HTML, or reports are supplied and tells the user what additional data (e.g., a Screaming Frog export, a GSC Coverage export) would sharpen the findings.
- Cannot access authenticated/staging environments without provided credentials or exports.
- When inputs are partial, state assumptions and confidence level rather than halting.
### Expected Outputs
- A prioritized, severity-classified findings report (Critical → Opportunity)
- Root-cause explanations, not just symptoms
- Concrete implementation fixes, including framework-specific code where relevant (primarily Next.js App Router)
- Validation steps to confirm each fix worked
- A monitoring plan with cadence
- Explicit pointers to complementary skills where this skill's boundary ends
### Audit Methodology
```
Discovery → Architecture Review → Crawlability → Rendering → Indexability →
Canonicalization → Duplicate Detection → Redirect Integrity → URL Hygiene →
Internal Linking → Sitemap Validation → robots.txt Validation → Structured Data
(presence check) → Internationalization → Core Web Vitals (SEO lens) →
Mobile-Friendliness → Reporting → Prioritization → Monitoring Plan
```
Depth adapts to input: a single URL gets a focused page-level pass plus inferred site-wide risk; a full codebase or crawl export gets a comprehensive, evidence-backed audit.

---

## 2. Supported Inputs

Claude should actively extract signal from whatever is given, and combine sources when several are present.

| Input | What to extract | How it's used |
|---|---|---|
| **URL** | Status code, headers, redirects, rendered vs. raw HTML, robots/sitemap presence | Establish audit starting point; test canonical, meta robots, load behavior |
| **HTML** | `<meta robots>`, canonical, hreflang, title/headings, structured data, internal links | On-page signal validation, duplicate detection |
| **Source code / React** | Routing, hydration behavior, client-side-only content, lazy loading, dynamic imports | Identify CSR-only content invisible to crawlers pre-render |
| **Next.js project** | `app/` vs `pages/`, `generateMetadata`, `generateStaticParams`, `sitemap.ts`, `robots.ts`, `middleware.ts`, `next.config.js` (redirects, rewrites, headers, trailingSlash, i18n) | Full-stack SEO audit; SSR/SSG/ISR classification; redirect/rewrite validation |
| **Vercel deployment info** | `vercel.json`, Edge Function config, cache headers, preview vs. production URLs, deployment logs | Validate production config, cache strategy, Edge middleware SEO impact |
| **sitemap.xml** | XML validity, URL count, `lastmod`, `changefreq`, `priority`, compression, segmentation | Validate accuracy, freshness, 200-only/canonical-only inclusion |
| **robots.txt** | Directives, wildcards, `Sitemap:` line, blocked paths | Validate crawl permissions, catch accidental blocks |
| **Search Console export** | Coverage status, URL Inspection results, sitemap status, performance/query data | Validate real-world indexation, find "Discovered/Crawled – not indexed," soft 404s |
| **Lighthouse report** | LCP, INP, CLS, TTFB, render-blocking resources, accessibility flags | Fold CWV into technical SEO findings |
| **Crawl report (Screaming Frog / custom)** | Status codes, internal/external links, crawl depth, orphan pages, duplicate titles/meta | Bulk-scale detection of crawlability and duplication issues |
| **Migration documents** | Old→new URL maps, redirect strategy, rollback plan | Validate 1:1 redirect coverage, flag gaps |
| **Deployment logs** | Build errors, function timeouts, CDN purge events | Correlate infra issues with crawl/index errors |
| **Server / CDN configuration** | `.htaccess`, nginx, Cloudflare/Vercel edge rules, cache-control, HSTS | Validate redirects, header hygiene, HTTPS enforcement |
| **Edge Functions / middleware** | Rewrite/redirect logic, geo-routing, auth gating | Ensure dynamic logic doesn't create crawl traps or inconsistent responses to bots vs. users |
| **Partial/incomplete information** | Whatever is available | Proceed, state assumptions, flag what additional export would remove uncertainty |

---

## 3. Technical SEO Audit Workflow

### Stage 1 — Discovery
**Goal:** Understand stack, rendering model, and business-critical pages before diagnosing anything.
**Validate:** Framework (Next.js/React/CMS), hosting (Vercel/other), rendering strategy (SSR/SSG/ISR/CSR), CMS or headless backend, i18n setup, and which pages are revenue-critical (demo booking, trial signup, pricing, checkout).
**Common issues:** Unknown/undocumented architecture; inconsistent domain usage (www vs. apex, http leftovers).
**Fix:** Build a one-paragraph architecture inventory before deeper stages; state assumptions explicitly.

### Stage 2 — Crawlability
**Goal:** Confirm search engines can reach every page that should rank.
**Validate:** robots.txt permissions, blocked CSS/JS, crawl depth, orphan pages, navigation completeness, faceted-nav explosion, pagination discoverability, crawl traps.
**Common issues:** Blocked JS/CSS breaking rendering; infinite filter/sort parameter combinations; hash-based routing (`/#/page`) instead of real routes.
**Fix:** Allow rendering-critical assets; convert hash routing to real paths; cap faceted navigation with canonical/noindex/parameter rules.
**Example:** A `/academies?sort=name&page=2&ref=fb` URL should canonicalize to `/academies` (or paginate cleanly) rather than being crawled as a unique page.

### Stage 3 — Rendering Verification
**Goal:** Confirm SEO-critical content and metadata exist in the HTML a crawler actually receives, not only after client-side hydration.
**Validate:** SSR/SSG/ISR delivering full HTML vs. CSR requiring JS execution; metadata present pre-hydration; React Router or client-only navigation not gating unique content behind JS.
**Common issues:** Metadata injected only client-side; primary content behind a JS-rendered shell with no SSR fallback.
**Fix:** Move SEO-critical routes to SSR/SSG/ISR; use Next.js `generateMetadata` (App Router) so `<head>` is server-rendered.

### Stage 4 — Indexability
**Goal:** Only the right pages are indexed — no accidental blocks, no accidental duplicate indexing.
**Validate:** `<meta name="robots">`, `X-Robots-Tag` header, canonical vs. noindex conflicts, GSC Coverage states.
**Common issues:** Conflicting `noindex` + self-canonical; indexable duplicate parameter URLs; soft 404s returning 200.
**Fix:** Resolve conflicting directives in favor of one clear signal per URL; convert soft 404s to real 404/410.

### Stage 5 — URL Architecture & Internal Linking
**Goal:** Clean hierarchy, minimal crawl depth to priority pages, no orphans.
**Validate:** Depth to key pages (target ≤3 clicks from home), presence of orphaned but sitemap-listed pages, anchor text quality, nav/footer completeness, breadcrumb use.
**Fix:** Add internal links from high-authority pages to orphans; flatten unnecessarily deep hierarchies; avoid generic anchor text ("click here").

### Stage 6 — Canonicalization
**Goal:** Every indexable page has one unambiguous canonical signal.
**Validate:** Self-referencing canonicals, canonical vs. redirect conflicts, canonical vs. noindex conflicts, canonical chains/loops, cross-domain canonicals.
**Fix:** See dedicated **Canonical Tag Audit** section and decision tree below.

### Stage 7 — Redirect Validation
**Goal:** Every redirect is a single, correct hop that preserves link equity.
**Validate:** Chain length, loops, mixed redirect types, migration map completeness.
**Fix:** See **Redirect Audit** section.

### Stage 8 — Duplicate Detection
**Goal:** No two URLs compete for the same query with unconsolidated signals.
**Validate:** Protocol/host/case/trailing-slash variants, parameter duplicates, CMS-generated duplicates (tag/archive pages), near-duplicate template pages, AI-generated content that duplicates itself across locations.
**Fix:** See **Duplicate Content Resolution** section.

### Stage 9 — Sitemap & robots.txt Validation
See dedicated sections below.

### Stage 10 — Structured Data (presence check)
**Goal:** Confirm structured data exists, is syntactically valid, and matches visible content — not to design the schema itself.
**Validate:** JSON-LD present for key templates (Product, Organization, Article, FAQPage, Course, LocalBusiness as relevant); no mismatch between markup and visible content.
**Fix:** Flag gaps and hand off deep schema design to `schema-structured-data-architect` (see Cross-References).

### Stage 11 — Mobile-Friendliness & Rendering Parity
**Goal:** Mobile-first indexing means the mobile-rendered version is what gets indexed.
**Validate:** Responsive viewport meta, tap-target sizing (≥44–48px), font legibility, content parity between mobile and desktop render, no separate `m.` subdomain fragmenting signals.

### Stage 12 — Core Web Vitals (SEO lens)
**Goal:** Confirm performance isn't silently suppressing crawl budget or rankings, without duplicating a full performance audit.
**Validate:** LCP, INP, CLS, TTFB against thresholds (below). Cross-reference `core-web-vitals-optimizer` for deep remediation.

### Stage 13 — Internationalization (if applicable)
**Goal:** Localized content is targeted correctly, not treated as duplicate content.
**Validate:** hreflang correctness (including `x-default`, bidirectional/self-referencing), canonical per locale (never all locales canonicalizing to one default), URL strategy (subdirectory preferred for most cases).

### Stage 14 — Reporting & Prioritization
Consolidate findings using the **Severity Classification** and **Reporting Template** below.

### Stage 15 — Monitoring
Hand off to the **Continuous Monitoring** cadence so regressions are caught pre- and post-release.

---

## 4. Crawlability Audit Checklist

**robots.txt**
- [ ] Exists, returns HTTP 200, correct syntax
- [ ] No accidental `Disallow: /`
- [ ] `Sitemap:` directive present with absolute URL
- [ ] JS/CSS/fonts/images required for rendering are not blocked
- [ ] Staging robots.txt (blocking everything) never ships to production; production robots.txt never leaks to staging
**Rendering & assets**
- [ ] Critical content renders without requiring JS execution (verify via "View Source" vs. rendered DOM)
- [ ] Images are crawlable (real `<img>`/`next/image`, not background-image-only for meaningful content)
- [ ] Lazy-loaded content has a crawlable fallback / is present in initial DOM for above-the-fold or SEO-critical elements
- [ ] No broken assets (404s on CSS/JS/images) degrading render
**Navigation & architecture**
- [ ] Primary nav is real HTML links, not JS-only click handlers
- [ ] No orphan pages (in sitemap but unlinked internally)
- [ ] Crawl depth to priority pages ≤ 3 clicks
- [ ] Pagination uses real, discoverable URLs (not solely infinite scroll with no paginated fallback)
- [ ] Faceted navigation / filters don't generate unbounded URL combinations (crawl trap)
**URL-level traps**
- [ ] No session IDs or tracking parameters creating unique crawlable URLs
- [ ] No hash-based routing (`/#/page`) for indexable content
- [ ] No infinite calendar/search/filter URL generation
- [ ] Duplicate URL variants (case, trailing slash, parameters) are normalized
**Rendering model & framework**
- [ ] Rendering strategy identified: SSR / SSG / ISR / CSR / Edge — and matched to content type (SSR/SSG/ISR for indexable marketing/content pages; CSR acceptable only for post-login/non-indexable app surfaces)
- [ ] Next.js routing (App Router dynamic segments, catch-all routes) resolves to clean, unique URLs
- [ ] React hydration doesn't delay or replace SEO-critical metadata
**Status codes & infra**
- [ ] Correct use of 200 / 301 / 404 / 410 / 5xx (no soft 404s returning 200)
- [ ] No unexpected 5xx spikes from serverless/Edge Function cold starts or timeouts
- [ ] CDN doesn't serve stale/incorrect cached responses to crawlers
- [ ] Authentication doesn't block public marketing/demo pages
- [ ] Rate limiting doesn't throttle legitimate crawler activity
- [ ] Crawl budget is spent on canonical, valuable URLs — not duplicates or parameter noise
---

## 5. Indexation Audit

**Check for every important template:**
- Is the page indexable? (no `noindex`, no `X-Robots-Tag: noindex`, no conflicting canonical)
- `nofollow` used only where intentional (sponsored/UGC/untrusted links), never on primary internal navigation
- No canonical conflicts (chains, loops, canonical-to-redirect, canonical-to-noindex)
- Parameter URLs, redirected URLs, 404s, soft 404s, and 5xx pages are excluded from indexable/sitemap sets
**Search Console workflow (when export/access is available):**
1. Read the Coverage report states: Valid, Excluded (noindex, duplicate, crawl anomaly), Error (5xx, redirect error), Valid with warnings.
2. Use URL Inspection to confirm live vs. indexed status for sample priority URLs.
3. Distinguish **"Discovered – currently not indexed"** (crawl budget/priority issue — improve internal linking, reduce duplicate noise) from **"Crawled – currently not indexed"** (content-quality signal — check for thin/duplicate content) from **Soft 404** (return a proper 404/410 or add real content).
**Indexation KPIs to report:**
- Indexed pages ÷ submitted sitemap URLs (target > 90–95% for priority templates)
- Trend of "Discovered/Crawled – not indexed" over time (should shrink, not grow)
- Average time-to-index for new priority pages
---

## 6. sitemap.xml Validation

**Checklist**
- [ ] Valid XML, UTF-8 encoded
- [ ] ≤ 50,000 URLs and ≤ 50MB uncompressed per file; use a sitemap index + segmentation beyond that
- [ ] Gzip compression supported for large sitemaps
- [ ] Every URL is absolute, HTTPS, and matches the canonical domain (consistent www/non-www)
- [ ] Every URL returns 200 — no 3xx, 4xx, 5xx, or `noindex` pages included
- [ ] `lastmod` reflects real modification dates (not a static build timestamp on every entry)
- [ ] `priority`/`changefreq` used sparingly — Google largely ignores them; don't over-engineer
- [ ] Image/video/news sitemap extensions used where relevant to content type
- [ ] Sitemap URLs match canonical tags (no sitemap entry canonicalizing elsewhere)
**Next.js App Router generation** (`app/sitemap.ts`):
```typescript
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
const baseUrl = 'https://uniqbrio.com'
const academies = await getPublicAcademySlugs() // only published, indexable academies

const academyUrls = academies.map((a) => ({
url: `${baseUrl}/${a.slug}`,
lastModified: a.updatedAt ?? new Date(),
changeFrequency: 'weekly' as const,
priority: 0.7,
}))

return [
{ url: baseUrl, lastModified: new Date(), priority: 1.0 },
{ url: `${baseUrl}/pricing`, lastModified: new Date(), priority: 0.9 },
{ url: `${baseUrl}/demo`, lastModified: new Date(), priority: 0.9 },
...academyUrls,
]
}
```
**Common mistakes:** including redirected or noindexed URLs; forgetting to exclude unpublished/soft-deleted academy slugs; static `lastmod` that never changes (signals staleness to crawlers); not regenerating on ISR content updates.

---

## 7. robots.txt Validation

**Checklist**
- [ ] Correct directive syntax: `User-agent`, `Allow`, `Disallow`, `Sitemap` (wildcards `*` and `$` used correctly)
- [ ] `Crawl-delay` has no effect on Google (Bing/Yandex only) — don't rely on it for Google crawl-rate control
- [ ] Admin/auth/API routes disallowed; public marketing routes explicitly allowed
- [ ] Static assets required for rendering (JS/CSS/fonts) are not disallowed
- [ ] `Sitemap:` line present with full absolute URL
- [ ] Tested via Search Console's robots.txt tester before and after deployment
- [ ] Search-engine differences understood (Bing/Yandex honor `Crawl-delay`; Google does not)
**Example (Next.js/Vercel, UniqBrio-style):**
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /app/
Disallow: /_next/data/

Sitemap: https://uniqbrio.com/sitemap.xml
```
**Common mistakes:** `Disallow: /` shipped to production after a staging copy-paste; blocking `/_next/static/` (breaks rendering); missing `Sitemap:` directive; unsupported directives (`Host`, `Visit-time`).

---

## 8. Canonical Tag Audit

**Rules**
- Every indexable page has exactly one canonical, ideally self-referencing.
- Canonical URLs are absolute, HTTPS, and use the single agreed-upon host (www vs. non-www) and trailing-slash convention.
- Parameter/filter/sort pages canonicalize to the clean base URL.
- Paginated series: prefer self-referencing canonical per page (Google no longer requires `rel=next/prev`); do not canonicalize all paged URLs to page 1 if the content differs.
- Product/language/locale variants: canonicalize each true duplicate to the "primary" variant; each locale should self-canonicalize (do not collapse all locales into one canonical — that suppresses non-primary-language indexing).
- **Canonical vs. redirect:** a redirected URL should never carry its own canonical tag — the redirect already handles consolidation.
- **Canonical vs. noindex:** never combine `noindex` on a page with a canonical pointing elsewhere; pick one signal. A noindexed page shouldn't be relied upon to pass equity via canonical.
- Cross-domain canonicals are valid only for intentional syndication, and only if the target is indexable and doesn't canonicalize back (which creates a loop).
**Next.js App Router implementation:**
```tsx
export async function generateMetadata({ params }: { params: { slug: string } }) {
return {
alternates: {
canonical: `https://uniqbrio.com/${params.slug}`,
},
}
}
```

**Decision tree — Canonical Conflict**
```
Does <link rel="canonical"> exist?
├─ No → Add a self-referencing canonical
└─ Yes
├─ Canonical == current URL → OK
└─ Canonical points elsewhere
├─ Target is indexable and doesn't loop back → OK (intentional consolidation)
├─ Target is noindexed → Conflict: change canonical to an indexable URL
├─ Target redirects → Conflict: point canonical to the final destination
├─ Target returns 404/5xx → Conflict: fix target or change canonical
└─ Target canonicalizes back to source → Loop: pick one true canonical
```

---

## 9. Duplicate Content Resolution

**Sources of duplication:** protocol (http/https), host (www/non-www), trailing slash, case sensitivity, tracking/UTM/session parameters, sort/filter parameter combinations, search-result pages, printer-friendly versions, tag/archive/category overlap, CMS-templated near-duplicates (e.g., near-identical city or variant landing pages), AI-generated content that duplicates itself across multiple published locations.

**Consolidation strategy (pick the right tool):**
- **301 redirect** — for true exact duplicates (protocol, host, trailing slash, case). Removes the duplicate URL from crawl space entirely.
- **Canonical tag** — for near-duplicates or parameter variants that must remain accessible to users (e.g., `?color=red` product variants) but should consolidate ranking signals to one URL.
- **Parameter handling / robots.txt / noindex** — for low-value, high-volume faceted-navigation combinations that would otherwise explode crawl budget.
- **Content consolidation/merge** — for near-duplicate template or archive pages where the right fix is editorial (merge two thin pages into one comprehensive one) rather than technical.
**Next.js normalization example:**
```javascript
// next.config.js
module.exports = {
trailingSlash: false, // pick one convention and enforce it everywhere
async redirects() {
return [
{
source: '/:path*',
has: [{ type: 'host', value: 'www.uniqbrio.com' }],
destination: 'https://uniqbrio.com/:path*',
permanent: true,
},
]
},
}
```

---

## 10. Redirect Audit

**Status code selection**
- **301** — permanent move; passes link equity; default choice for migrations/restructures.
- **302 / 307** — temporary only (A/B tests, maintenance windows); does not fully pass equity; do not leave in place long-term for permanent moves.
- **308** — like 301 but strictly preserves HTTP method; use for API endpoints/form actions.
- **Meta refresh / JS redirects** — avoid for SEO-relevant redirects; slower, weaker equity pass, and can be missed by some crawl paths.
**Validation rules**
- No chains (A→B→C): point A directly to the final destination.
- No loops (A→B→A).
- Internal links should point directly to final URLs — never link to a URL that itself redirects.
- Every migrated legacy URL has exactly one mapped destination (avoid mass-redirecting everything to the homepage — this reads as a soft-404 pattern to search engines).
**Redirect audit table template**
| Old URL | New URL | Status | Chain length | Notes |
|---|---|---|---|---|
| `/old-blog` | `/blog` | 301 | 1 | OK |
| `/product/123` | `/category/456` | 301 (via `/products/456`) | 2 | Collapse to a direct 301 |
| `/about` | *(none)* | 404 | — | Missing redirect — fix |

**Decision tree — Redirect Chain**
```
Identify the full chain: A → B → C → D
Is D the final, correct destination?
├─ Yes → Repoint A and B directly to D; update internal links to D
└─ No (D redirects further) → Trace to the true final URL and repoint the entire chain
Any hop using 302/307 for what is actually a permanent move? → Convert to 301/308
```

---

## 11. URL Hygiene

- Clean, descriptive, human-readable slugs: `/academies/sports/coimbatore` beats `/p?id=1294&cat=4`.
- Lowercase only; redirect mixed-case variants to lowercase.
- Hyphens to separate words — never underscores or spaces.
- Consistent trailing-slash policy, enforced via framework config, not ad hoc.
- Shallow, logical hierarchy reflecting site structure; avoid unnecessary depth (`/a/b/c/d/e/product`).
- Strip tracking parameters from canonical/indexable URLs; handle via canonical tag or GSC parameter tools rather than letting them multiply indexed URLs.
- Locale prefixes (`/en/`, `/ta/`) kept consistent and paired with correct hreflang + self-referencing canonicals.
- URLs stay stable over time — don't churn slugs without a permanent redirect plan.
---

## 12. Core Web Vitals SEO Integration

Performance is a ranking signal that **complements** crawlability and indexation — a fast page that's blocked by robots.txt still won't rank, and a slow page that's perfectly crawlable will underperform its potential. Always fix crawl/index blockers before chasing marginal CWV gains.

| Metric | Good threshold | Typical cause | Next.js/Vercel fix |
|---|---|---|---|
| **LCP** | < 2.5s | Large hero images, slow TTFB, render-blocking resources | `next/image` with `priority` on the hero; SSG/ISR + Vercel Edge to cut TTFB; preload critical fonts via `next/font` |
| **INP** | < 200ms | Heavy JS, long main-thread tasks | Code-split, defer non-critical JS, `useTransition`/`useDeferredValue` for heavy state updates, keep Edge Functions fast |
| **CLS** | < 0.1 | Images/embeds without reserved dimensions, FOUT/FOIT, injected banners | Always set width/height (or `next/image` auto-sizing), `next/font` to avoid layout-shifting font swaps, reserve space for dynamic content |
| **TTFB** | < 800ms (SSR) / < 200ms (edge/static) | Cold starts, uncached SSR, distant origin | Vercel Edge network, ISR for semi-static marketing pages, aggressive caching of static assets |

Set a performance budget, monitor via Lighthouse CI or Vercel Analytics, and alert on regression. For deep remediation beyond the SEO-relevant surface, hand off to **`core-web-vitals-optimizer`**.

---

## 13. Site Migration Technical SEO

**Applies to:** domain changes, protocol changes (http→https), folder restructures, CMS/framework migrations (e.g., legacy site → Next.js).

**Pre-migration**
- Crawl and fully inventory the existing site's URLs.
- Build a 1:1 old→new URL redirect map — never rely on mass-redirect-to-homepage.
- Stage the new site with `noindex` + a robots.txt that blocks all crawlers until launch.
- Update internal links, sitemap, robots.txt, canonical tags, structured data, and hreflang to reference new URLs before go-live.
**Launch**
- Remove staging `noindex` / `Disallow: /` simultaneously with DNS/deploy cutover.
- Activate all mapped 301 redirects.
- Submit the new sitemap in Search Console; use the GSC "Change of Address" tool for domain moves.
- Purge CDN cache.
**Post-launch**
- Day 1–3: watch for 404 spikes and crawl errors.
- Day 1–7: monitor Coverage report for indexation of new URLs and de-indexation of old ones.
- Week 2–4: expect a temporary traffic dip; investigate only if it exceeds normal migration variance (commonly cited as 2–4 weeks to stabilize) or if redirects/indexation checks fail.
- Month 1–3: update external backlinks where feasible.
**Rollback planning:** keep old infrastructure/DNS reachable (redirecting) for at least 30 days; have a clear DNS/deploy rollback trigger (e.g., >20% organic traffic drop in week 1 with no other explanation).

**Migration validation table**
| Old URL | New URL | Redirect | Canonical OK | Indexed | Notes |
|---|---|---|---|---|---|
| `/blog/old-post` | `/blog/new-post` | 301 ✅ | ✅ | Yes | OK |
| `/product/123` | `/category/456` | 301 ✅ | ✅ | No | Needs re-indexing push (internal links, sitemap) |
| `/about-us` | `/about` | 404 ❌ | — | — | Missing redirect — fix immediately |

---

## 14. Launch QA Checklist

**Pre-launch (staging)**
- [ ] `noindex, nofollow` present on all staging pages
- [ ] robots.txt blocks all crawlers on staging
- [ ] Staging protected (basic auth or IP allowlist) if publicly reachable
- [ ] Canonical tags point to the intended production domain
**Production launch**
- [ ] Staging `noindex`/robots block removed
- [ ] robots.txt allows crawling and points to the correct sitemap
- [ ] Self-referencing canonicals verified on all templates
- [ ] Host/protocol/trailing-slash policy enforced via redirects
- [ ] Sitemap submitted to Search Console (and Bing Webmaster Tools)
- [ ] Structured data validated (Rich Results Test)
- [ ] Redirect map fully deployed and spot-tested
**Post-launch (week 1–4)**
- [ ] Monitor Coverage report for crawl errors (404/5xx)
- [ ] Confirm indexation of priority URLs
- [ ] Check field CWV data (CrUX) as it becomes available
- [ ] Watch organic traffic/rankings for anomalies beyond normal variance
---

## 15. Continuous Monitoring

| Cadence | Activities |
|---|---|
| **Daily** | Watch for 5xx/404 spikes, crawl anomalies, server uptime |
| **Weekly** | Review new 404s → create redirects; check sitemap validity; scan for new orphan pages; review Coverage trend |
| **Monthly** | Full or partial crawl (Screaming Frog or similar) for broken links, canonical drift, duplicate metadata; review CWV field data; validate robots.txt/sitemap still correct |
| **Quarterly** | Architecture-level review: crawl budget allocation, URL structure debt, redirect-map cleanup, indexation trend analysis |
| **Release-based** | Pre-deploy: Lighthouse CI on the changed routes; post-deploy: validate metadata, robots, sitemap, canonical, redirects, and structured data on affected pages |

---

## 16. Severity Classification

| Severity | Business impact | SEO impact | Urgency | Recommended SLA |
|---|---|---|---|---|
| **Critical** | Revenue-impacting; site or major section effectively invisible to search | Site-wide crawl block, indexing failure, or 5xx on core acquisition pages | Immediate | < 24 hours |
| **High** | Significant lost opportunity | Broken canonicals on core pages, massive redirect chains, key template not indexed | Urgent | 2–7 days |
| **Medium** | Moderate inefficiency | Orphan pages, sitemap/robots inconsistencies, minor duplicate clusters, sub-optimal canonicals | Normal | 1–2 weeks |
| **Low** | Minor/edge-case | URL hygiene inconsistencies, non-critical 404s | Low | Next sprint / ~1 month |
| **Opportunity** | No current harm; future upside | Schema expansion, internal-linking improvements, CWV headroom | Planned | Roadmap |

---

## 17. Reporting Template

```markdown
## Executive Summary
Overall technical health: [X/10] — [Critical issues: N] [High: N] [Medium: N] [Low: N]

### [Finding Title]
- Severity: Critical / High / Medium / Low / Opportunity
- Category: Crawlability / Indexation / Canonical / Redirect / Sitemap / robots.txt / Performance / Structured Data
- Description: [what's wrong]
- Evidence: [affected URLs / counts / headers / snippets]
- Risk: [business + SEO consequence if unaddressed]
- Recommendation: [specific fix]
- Implementation notes: [code, config, or process change]
- Estimated impact: [e.g., "recovers ~15% of wasted crawl budget"]
- Owner: [Engineering / Content / DevOps]
- Validation steps: [how to confirm the fix worked]
- Status: To Do / In Progress / Done
```

---

## 18. Decision Trees

**Page not indexed**
```
Blocked by robots.txt? → Yes: unblock → No:
Has noindex / X-Robots-Tag: noindex? → Yes: remove if it should rank → No:
Canonicalized to another URL? → Yes: fix/verify canonical target → No:
Check GSC reason:
"Discovered – not indexed" → improve internal linking, reduce competing duplicates
"Crawled – not indexed" → likely thin/duplicate content, improve quality
"Soft 404" → serve a real 404/410 or add substantive content
```

**Blocked by robots.txt**
```
Is the block intentional (admin/API/staging)? → Yes: leave it → No:
Update Allow/Disallow rules → redeploy → re-test in robots.txt tester → request re-crawl via URL Inspection
```

**Duplicate without canonical**
```
Is one version clearly authoritative? → Yes: add self-canonical to it + canonical-to-it on duplicates
→ No: pick the version with the best links/traffic/URL as authoritative
Are duplicates truly identical (host/protocol/slash/case)? → 301 redirect instead of canonical
```

**Large sitemap**
```
> 50,000 URLs or > 50MB uncompressed? → Split into multiple sitemaps + a sitemap index file
Segment logically (e.g., by content type: academies, blog, static pages)
```

**Migration issues (traffic drop post-launch)**
```
Check in order: redirect map completeness → canonical correctness → internal links updated →
Coverage report for new errors → rendering parity vs. old site → CWV regression
```

---

## 19. Framework-Specific Guidance

**Next.js App Router**
- Use `generateMetadata()` per route for title, description, canonical, Open Graph — server-rendered, not client-injected.
- Use `app/sitemap.ts` and `app/robots.ts` for automatic, code-driven generation instead of static files that drift from reality.
- Understand App Router caching layers (fetch cache, Router Cache, Full Route Cache) — dynamic pages that must not be cached should explicitly opt out (`export const dynamic = 'force-dynamic'`), but weigh the TTFB cost of doing so on indexable marketing pages.
- Prefer SSG for stable content (pricing, docs), ISR for frequently-but-not-instantly-updated content (academy listings), SSR only where personalization truly requires it, and CSR only for non-indexable, post-login app surfaces.
**Vercel deployment**
- Set cache headers and security headers via `next.config.js` `headers()` or `vercel.json`.
- Use Edge Middleware for lightweight geo-routing/auth redirects to keep TTFB low; avoid heavy database calls inside Edge Functions.
- Validate that preview deployments never leak into indexation (they shouldn't be publicly linked or should carry `noindex`).
**Supabase-backed applications**
- Ensure auth middleware strictly gates authenticated app routes (e.g., `/app/*`) with a clean redirect to login for unauthenticated crawlers/users, and that those routes are disallowed in robots.txt.
- When serving images from Supabase Storage via `next/image`, confirm bucket policies allow public read for marketing assets and use signed URLs (never crawlable) for private ones.
- Database-driven public pages (e.g., academy profile pages) should be SSR/ISR so crawlers receive fully-rendered HTML, not a client-side Supabase fetch shell.
**CDN caching**
- Confirm cache invalidation on content updates so crawlers don't see stale HTML indefinitely.
- Validate `stale-while-revalidate` and TTL settings don't serve outdated redirects or removed pages.
---

## 20. UniqBrio Reference Implementation

Primary example environment: React Native Expo PWA + Next.js App Router + Supabase PostgreSQL/Edge Functions + Vercel, serving an India-first B2B SaaS marketing site whose job is acquiring arts and sports academy owners via demo bookings, trial signups, and paid subscriptions.

Applied recommendations:
- Server-render all acquisition-critical pages (home, pricing, demo, academy showcase pages) — never let the pitch depend on client-side hydration.
- Generate canonical URLs via `generateMetadata`, keyed to `https://uniqbrio.com/<slug>` patterns (e.g., academy public join pages).
- Auto-generate `sitemap.ts` from published, slug-bearing academies only — exclude unpublished/soft-deleted ones.
- Keep the authenticated dashboard (`/app/*`, staff routes, OTP-gated owner flows) out of the index via robots.txt + `noindex`.
- Keep demo-booking and pricing pages within a shallow crawl depth from the homepage.
- Watch TTFB closely given the India-first, sometimes-lower-bandwidth user base — Vercel Edge + ISR over pure SSR where content allows.
- Treat unauthenticated PII-adjacent endpoints (e.g., lookup-by-phone type edge functions) as an SEO-adjacent security concern too: they should never be crawlable or linked publicly.
### Sample findings
- **Finding:** Canonical on `/academies/8592afac` points to a URL that 301-redirects elsewhere. **Severity:** High. **Fix:** Point canonical directly to the final 200 URL.
- **Finding:** `robots.txt` disallows `/_next/static/`. **Severity:** Critical. **Fix:** Remove the disallow; this asset path is required for correct rendering.
- **Finding:** Sitemap includes academy slugs for soft-deleted academies (404 on visit). **Severity:** High. **Fix:** Regenerate sitemap filtered to `status = published`.
- **Finding:** Marketing homepage redirects `http → https → www → final`, a 3-hop chain. **Severity:** Medium. **Fix:** Collapse to a single 301 straight to the canonical HTTPS host.
---

## 21. Anti-Patterns

- Canonical pointing to a redirected or noindexed URL
- `noindex` + canonical-elsewhere on the same page (conflicting signals)
- Blocking CSS/JS in robots.txt
- Hash-based routing for indexable content
- Meta-refresh or JS-only redirects for permanent moves
- Mass-redirecting all dead URLs to the homepage during a migration
- Infinite crawlable parameter combinations from faceted navigation
- Mixed URL casing without normalization
- Session-ID-bearing crawlable URLs
- Sitemaps containing 404s, redirects, or noindexed URLs
- Static/never-changing `lastmod` values across an entire sitemap
- Separate `m.` mobile subdomain fragmenting signals in a mobile-first-indexing world
---

## 22. Troubleshooting Guide

**Rankings/traffic declined** → check recent deployments, redirects, robots.txt, canonical changes, sitemap validity, Search Console Coverage, and rendering parity, in that order.
**Pages disappeared from search** → check `noindex`, robots.txt, canonical target, HTTP status, and URL Inspection "reason" field.
**Crawl budget seems wasted** → check for duplicate URLs, crawl traps, redirect chains, and unbounded parameter combinations.
**"Discovered — currently not indexed" is growing** → usually an internal-linking/priority problem, not a blocking problem; strengthen links from high-authority pages.

---

## 23. Automation Opportunities

- CI/CD: run Lighthouse CI (or similar) on PRs touching indexable routes; fail the build on regression past budget.
- Auto-generate `sitemap.xml` from the database on build/ISR revalidation rather than maintaining a static file.
- Log 404s server-side (e.g., via an Edge Function) into a table for weekly redirect-creation review.
- Include a lightweight test asserting `<title>`, `<meta name="description">`, and `<link rel="canonical">` exist on all server-rendered priority routes.
- Automate periodic robots.txt/sitemap diffing between deploys to catch accidental regressions (e.g., a stray `Disallow: /`).
---

## 24. Measurable Success Criteria

- ≥ 90–95% of intended public URLs indexed (per GSC Coverage)
- "Crawled/Discovered – not indexed" trend flat or shrinking, not growing
- Zero Critical/High severity technical findings outstanding
- All redirects resolve in a single hop; zero redirect loops
- Sitemap contains only canonical, 200-status, indexable URLs
- robots.txt blocks only intentional paths — no rendering assets blocked
- Core priority pages meet CWV "Good" thresholds in field data (CrUX)
- No net organic traffic loss attributable to a migration or release, once post-launch monitoring windows close
---

## 25. Cross-References & Skill Boundaries

- **`nextjs-architect`** — Use for deep Next.js application-architecture decisions (server/client component split, data-fetching patterns, general routing design) beyond their direct SEO implications. This skill flags the SEO consequence; `nextjs-architect` designs the underlying implementation.
- **`schema-structured-data-architect`** — Use for designing and expanding Schema.org/JSON-LD markup (Product, Organization, Course, FAQPage, etc.). This skill only validates that structured data exists, is syntactically correct, and matches visible content — it does not design the semantic markup itself.
- **`core-web-vitals-optimizer`** — Use for deep performance engineering (bundle analysis, advanced caching, rendering-pipeline optimization). This skill treats CWV only through an SEO lens (thresholds, ranking relevance, crawl-budget interaction).
- **`website-launch-qa-checklist-specialist`** — Use for full release-readiness validation spanning engineering, UX, analytics, and accessibility. This skill supplies the SEO-specific slice of that checklist, not the whole launch gate.
When an audit surfaces findings squarely inside one of these adjacent domains, note the finding here (since it may still block indexation or crawlability) but explicitly hand off deep remediation to the matching skill.
