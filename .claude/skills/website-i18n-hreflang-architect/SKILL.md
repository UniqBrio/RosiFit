---
name: website-i18n-hreflang-architect
description: Designs and governs a production-ready bilingual (English + Tamil) marketing website architecture for UniqBrio on Next.js App Router, covering locale routing, hreflang/canonical strategy, locale-aware metadata and structured data, language-switcher UX, translation governance, SEO safeguards, and integration handoffs, so the site never ships half-translated pages or creates duplicate-indexing problems.
when_to_use: Use when planning, implementing, auditing, or extending bilingual English/Tamil locale routing, hreflang/canonical tags, locale-aware metadata, language-switcher UX, or translation governance for the UniqBrio public marketing website.
---

# Website i18n & Hreflang Architect

## Overview

The UniqBrio marketing website (public, pre-login, built on Next.js App Router + TypeScript + Tailwind, deployed on Vercel, backed by Supabase) must serve Tamil-first arts and sports academy owners — mostly aged 30–50 in Tier 2/3 Indian cities — in both **English** and **Tamil**, without sacrificing SEO or trust. Bilingual architecture must be designed **before** any localized page ships. Retrofitting locale routing, hreflang, canonicals, and translation governance after content already exists creates irreversible SEO debt, mixed-language experiences, and credibility damage that is far harder to undo than to prevent.

### SEO risks of poor i18n

| Risk | What happens | Consequence |
|---|---|---|
| Duplicate content | English and Tamil pages seen as near-duplicates without proper signals | Ranking dilution, possible manual action |
| Canonical conflicts | A Tamil page's canonical points to its English twin (or vice versa) | The non-canonical language is dropped from the index entirely |
| Mixed-language pages | Tamil body copy inside English navigation, or partial translations | Low quality signals, user distrust, high bounce |
| Index fragmentation | Same query cluster returns English for some pages, Tamil for others | Destroyed topical authority, inconsistent SERP presence |
| Crawl budget waste | Broken alternates, redirect loops, indexed staging/preview URLs | Important pages crawled less often |
| Incorrect language detection | Aggressive Accept-Language or geo-IP auto-redirects | Users trapped in the wrong language with no way out; crawlers blocked from indexing the other locale |
| User trust issues | Tier 2/3 academy owners hit a raw machine-translated or half-Tamil page | Immediate abandonment, lost demo bookings |

### Translation vs. Localization vs. Transcreation

| Discipline | Definition | Use it for |
|---|---|---|
| **Translation** | Direct, literal linguistic conversion | UI chrome, legal disclaimers, system messages, short labels, blog body copy |
| **Localization** | Adapting content to locale norms — currency (₹), date formats, cultural references, imagery | Pricing pages, navigation, feature descriptions, contact details |
| **Transcreation** | Creative recreation of intent, tone, and persuasion rather than literal wording | Homepage hero, value propositions, taglines, CTAs, campaign slogans |

Never machine-translate transcreation-tier content (headlines, value props). Machine translation is acceptable only as a first-pass draft for translation-tier UI strings, and only when followed by native-speaker review before publish. Every marketing claim — in either language — must remain consistent with `app_reality.md`: never fabricate testimonials, customer counts, or localized success stories, and never translate a claim that has not been explicitly approved for publication in that language.

---

## Responsibilities

### This skill owns

- Locale architecture and URL strategy (`/en`, `/ta`, and future extensibility)
- Next.js App Router folder structure, middleware, layouts, and locale detection logic
- The complete hreflang matrix, including `x-default`
- Canonical strategy (strictly language-specific, never cross-language)
- Locale-aware metadata generation: title, description, Open Graph, Twitter Cards, robots, JSON-LD
- Locale discovery: cookie persistence, `Accept-Language` handling, manual override behavior
- Language-switcher UX specification: placement, states, persistence, deep-link preservation, accessibility
- Translation readiness gates and the untranslated-page fallback policy
- Mixed-language prevention
- Locale QA and the full pre-publish/post-publish checklist
- Integration contracts with downstream localization and SEO skills
- SEO safeguards: sitemaps, robots.txt, indexation monitoring, analytics segmentation

### This skill intentionally does NOT own

- Writing or creating actual Tamil translations or transcreated copy (owned by `tamil-script-transcreation` and `on-page-seo-copywriter`)
- Tamil typography, font loading, or text-overlay rendering on images/video (owned by `tamil-text-overlay-typography`)
- Full technical SEO audits beyond i18n/hreflang scope (owned by `seo-technical-audit-specialist`)
- Core Next.js application architecture outside locale concerns (owned by `nextjs-architect`)
- Product feature decisions or the contents of `app_reality.md`
- Backend Supabase schema, Edge Functions, or database localization
- React Native Expo PWA (authenticated, in-app) localization — this skill covers the **public marketing site only**
- Legal review of translated Terms/Privacy content (translation execution only; legal sign-off is a separate governance step)

---

## Locale Strategy

### Recommended structure

```
/en   → English (default)
/ta   → Tamil (primary target for Tier 2/3 academy owners)
```

Root `/` permanently redirects to `/en` or to the user's remembered locale if a valid cookie preference exists.

### Future extensibility

Reserve a typed, allow-listed `[locale]` segment so additional Indian languages (Hindi `/hi`, Telugu `/te`, Kannada `/kn`, Malayalam `/ml`) can be added without any URL scheme redesign — only the locale allow-list, middleware, and translation files change.

```ts
export const locales = ['en', 'ta'] as const;
export const defaultLocale = 'en';
export type Locale = (typeof locales)[number];
```

### Subpath vs. subdomain vs. country domain

| Criterion | Subpath (`/en`, `/ta`) | Subdomain (`en.`, `ta.`) | Country domain (`.in`) |
|---|---|---|---|
| SEO | Consolidates all authority on one domain | Splits authority; needs separate geo-targeting config | Strong geo-signal but fragmented authority |
| Maintenance | Lowest — single codebase, single deploy | Medium — SSL certs, DNS, cross-domain cookies | Highest — multiple domains/codebases |
| Deployment | One Vercel project | Multiple projects or wildcard config | Multiple projects and domains |
| Analytics | Simple path-based segmentation | Requires cross-domain tracking setup | Fragmented, multi-property |
| Crawl budget | Unified sitemap, clear hierarchy | Multiple sitemaps, fragmented budget | Multiple domains, fragmented budget |
| Scalability | Add a new locale segment | Provision a new subdomain per locale | Acquire/maintain a new domain per country |

**Decision: use subpath routing (`/en`, `/ta`)** for UniqBrio. It keeps 100% of link equity on one domain, requires only one Vercel deployment, keeps sitemap/hreflang generation trivial, and scales cleanly to more Indian languages later.

---

## Next.js App Router Architecture

### Folder organization

```
app/
├── [locale]/
│   ├── layout.tsx            # <html lang>, locale-aware metadata, switcher
│   ├── page.tsx               # homepage
│   ├── pricing/page.tsx
│   ├── features/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── demo/page.tsx
│   ├── blog/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   └── sitemap.ts             # per-locale sitemap
├── api/                        # unlocalized API routes
├── middleware.ts               # locale detection & routing
├── robots.ts
└── i18n/
    ├── config.ts                # locales, default, readiness manifest
    ├── messages/{en,ta}/*.json  # translation namespaces
    └── utils.ts                 # metadata + translation helpers
```

### Middleware — locale detection

Priority order: **explicit cookie → `Accept-Language` (soft signal only) → default (`en`)**. Never override a user's manual, previously-stored choice.

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALES = ['en', 'ta'] as const;
const DEFAULT = 'en';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (hasLocale) return NextResponse.next();

  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const locale = LOCALES.includes(cookieLocale as any) ? cookieLocale! : DEFAULT;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
```

### Static params + locale-aware layout

```tsx
// app/[locale]/layout.tsx
export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ta' }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return getLocaleMetadata(locale as Locale); // see Locale-aware Metadata
}

export default async function RootLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <html lang={locale}>
      <body>
        <LanguageSwitcher currentLocale={locale as Locale} />
        <main>{children}</main>
      </body>
    </html>
  );
}
```

### Cookie persistence

- Set `NEXT_LOCALE` (SameSite=Lax, Secure, ~30–365 day max-age) only when the user **manually** switches language.
- Respect it on every subsequent visit; never silently overwrite it based on IP or browser headers.

### Trade-offs

- Middleware runs on every request — keep the locale-check logic minimal.
- Static-generating both locales roughly doubles build output but is trivial at current page counts.
- Path-prefix adds one segment to every URL, which is an acceptable, industry-standard cost for the SEO clarity it buys.

---

## URL Strategy

| Page | English | Tamil |
|---|---|---|
| Home | `/en` | `/ta` |
| Pricing | `/en/pricing` | `/ta/pricing` |
| Features | `/en/features` | `/ta/features` |
| Feature detail | `/en/features/attendance` | `/ta/features/attendance` |
| Blog | `/en/blog` | `/ta/blog` |
| Blog post | `/en/blog/5-tips-academy-growth` | `/ta/blog/5-tips-academy-growth` |
| Demo | `/en/demo` | `/ta/demo` |

### Slug translation policy: **keep all slugs in English**

| Option | Verdict |
|---|---|
| English-only slugs | **Adopted** — stable, single source of truth, no duplicate-URL risk |
| Translated Tamil slugs | Rejected for v1 — doubles maintenance, complicates hreflang, fragments analytics, risks imperfect transliteration |

Rationale:
- Academy owners already navigate an English-labeled product UI; the path segment is not a trust signal — the page content is.
- English slugs stay easy to share correctly over WhatsApp/SMS (the dominant Indian sharing channels) without encoding/truncation issues.
- One slug tree means zero URL-mapping complexity when a page is renamed, and zero risk of a Tamil slug silently drifting out of sync with its English counterpart.
- Tamil-ness lives in the page's visible copy and metadata, not the URL.

This policy applies to every future locale added under the same architecture.

---

## hreflang Strategy

Every page must emit a **complete, self-referencing, bidirectional** hreflang set plus `x-default`.

```html
<link rel="alternate" hreflang="en" href="https://uniqbrio.com/en/pricing" />
<link rel="alternate" hreflang="ta" href="https://uniqbrio.com/ta/pricing" />
<link rel="alternate" hreflang="x-default" href="https://uniqbrio.com/en/pricing" />
```

```ts
// generateMetadata
alternates: {
  canonical: `https://uniqbrio.com/${locale}/pricing`,
  languages: {
    en: 'https://uniqbrio.com/en/pricing',
    ta: 'https://uniqbrio.com/ta/pricing',
    'x-default': 'https://uniqbrio.com/en/pricing',
  },
},
```

### Language codes

| Code | Use |
|---|---|
| `en` | The global English version — default for all English content |
| `ta` | The Tamil version |
| `en-IN` / `ta-IN` | **Do not emit** unless a genuinely distinct India-only regional variant page exists. Emitting a regional code with no corresponding regional page is a common, harmful mistake. |
| `x-default` | Always points to the English homepage/page — the language-agnostic fallback for unmatched user languages |

### Common mistakes to avoid

- Missing the self-reference (a page must list itself as one of its own alternates)
- Asymmetric alternates (English references Tamil but Tamil doesn't reference English back)
- Emitting `en-IN`/`ta-IN` without real regional content behind them
- hreflang URLs that return 404 or redirect
- Mismatched trailing slashes or protocol (http vs https) between the hreflang URL and the canonical

---

## Canonical Strategy

**Rule 1 — Self-referencing:** every page's canonical points to itself, including its locale prefix.
**Rule 2 — Never cross-language:** a Tamil page's canonical must never point to its English twin, and vice versa. Doing so tells search engines to ignore the non-canonical language entirely, which is the single most damaging i18n SEO mistake.
**Rule 3 — Parameter cleanup:** tracking/query parameters canonicalize to the clean locale URL (e.g., `/en/pricing?ref=fb` → `/en/pricing`).
**Rule 4 — Pagination:** use `rel="next"/"prev"` within the same locale only; canonical still points to the current page.
**Rule 5 — Regional landing pages:** if state-specific pages are introduced later (e.g., a Tamil Nadu–specific page), they get their own self-canonical unless the content is truly non-unique, in which case don't create the page at all rather than canonicalizing it away.

| URL | Canonical |
|---|---|
| `https://uniqbrio.com/en/pricing` | `https://uniqbrio.com/en/pricing` |
| `https://uniqbrio.com/ta/pricing` | `https://uniqbrio.com/ta/pricing` |
| `https://uniqbrio.com/en/pricing?ref=facebook` | `https://uniqbrio.com/en/pricing` |

---

## Locale-Aware Metadata

| Field | Localize? |
|---|---|
| `title`, `description` | Yes — transcreate for marketing pages (home, features), translate for blog/legal/support |
| Open Graph title/description | Yes — mirror the localized title/description |
| Twitter title/description | Yes |
| `og:locale` | Yes — `en_IN` / `ta_IN`, with `alternateLocale` set to the other |
| JSON-LD user-visible strings (`name`, `description`, FAQ answers) | Yes |
| Brand name ("UniqBrio"), logo, favicon | **No** — stays identical across locales for brand consistency |
| Product/feature proper nouns | **No**, unless marketing explicitly approves a localized name |
| `robots` directive | Shared logic, but must always `noindex,nofollow` on staging/preview deployments regardless of locale |

```ts
export function getLocaleMetadata(locale: Locale) {
  const copy = {
    en: {
      title: 'UniqBrio — Academy Management Software for Arts & Sports',
      description: 'Manage class schedules, attendance, payments, and student tracking for your academy.',
    },
    ta: {
      title: 'UniqBrio — கலை மற்றும் விளையாட்டு அகாடமி மேலாண்மை மென்பொருள்',
      description: 'உங்கள் அகாடமிக்கான வகுப்பு அட்டவணை, வருகைப் பதிவு மற்றும் கட்டண வசூலை எளிதாக்குங்கள்.',
    },
  }[locale];

  return {
    title: copy.title,
    description: copy.description,
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: `https://uniqbrio.com/${locale}`,
      locale: locale === 'ta' ? 'ta_IN' : 'en_IN',
      alternateLocale: locale === 'ta' ? ['en_IN'] : ['ta_IN'],
    },
    twitter: { card: 'summary_large_image', title: copy.title, description: copy.description },
    alternates: {
      canonical: `https://uniqbrio.com/${locale}`,
      languages: { en: 'https://uniqbrio.com/en', ta: 'https://uniqbrio.com/ta', 'x-default': 'https://uniqbrio.com/en' },
    },
  };
}
```

---

## Structured Data

Emit separate, fully localized JSON-LD per locale. Keep `@id`/URLs locale-specific. Use `alternateName` to carry the Tamil brand rendering without creating a second brand entity — never change the primary `name` field.

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "UniqBrio",
  "alternateName": "யூனிக்பிரியோ",
  "url": "https://uniqbrio.com/ta",
  "address": { "@type": "PostalAddress", "addressCountry": "IN" }
}
```

- **SoftwareApplication**: localize `description`; keep `applicationCategory`, `operatingSystem` shared.
- **BreadcrumbList**: localize each item's `name`; keep item `url` in the current locale.
- **FAQPage**: publish only for pages whose FAQ content is fully approved in that language — never a partial or machine-translated FAQ set.
- **Product**: localize `name`/`alternateName`/`description`; currency stays `INR` in both locales.
- **Review**: only real, approved reviews. Never invent or transcreate a Tamil review that wasn't given in Tamil by the actual reviewer — this is a hard `app_reality.md` boundary.

---

## Language Switcher UX

| Aspect | Rule |
|---|---|
| Placement (desktop) | Header, top-right, after nav, before the primary "Book demo" CTA |
| Placement (mobile) | Inside the hamburger drawer, plus a compact control in the sticky header |
| Current-language indication | Bold/checked state on the active language; never rely on flags (flags denote countries, not languages, and are ambiguous in a multilingual country like India) |
| Persistence | `NEXT_LOCALE` cookie, 30–365 day expiry |
| Deep-link preservation | Switching from `/en/pricing` lands on `/ta/pricing`, never the homepage |
| Auto-redirect | Never auto-redirect on repeat visits once a manual choice exists; a first-visit soft prompt based on `Accept-Language` is acceptable only if non-blocking and easily dismissed |
| Accessibility | Keyboard-operable (Tab/Enter/Escape), visible focus ring, `aria-label` in the current language ("Switch to Tamil" / "தமிழுக்கு மாற்று") |
| Focus after switch | Retain a sensible focus target (main content or the switcher) — prefer full navigation over client-side content swap so assistive tech re-announces the new language |

```tsx
function switchLanguage(newLocale: Locale) {
  const segments = pathname.split('/');
  segments[1] = newLocale;
  setCookie('NEXT_LOCALE', newLocale, { maxAge: 60 * 60 * 24 * 30, path: '/' });
  router.push(segments.join('/') || `/${newLocale}`);
}
```

**Good UX:** clicking "தமிழ்" on `/en/pricing` lands on `/ta/pricing`, same scroll position, switcher clearly shows the new active state.
**Poor UX:** IP-based auto-redirect loops; a switcher that only flips a cookie and reloads the same English page; flags instead of language names; switcher hidden on mobile; switching resets to the homepage.

---

## Untranslated Page Policy

Never publish a page that mixes English and Tamil in ways that weren't intentionally designed (e.g., translated body copy inside untranslated navigation chrome is fine; a paragraph that's half-English half-Tamil is not).

| Situation | Behavior | HTTP |
|---|---|---|
| Page never planned for Tamil | Omit from Tamil sitemap; switcher hides/disables the Tamil link | 404 if requested directly |
| Page planned, translation not yet approved | "Coming soon" interstitial in Tamil linking back to the English version | 200 |
| Partial/unapproved translation exists | Do not publish under any circumstance — hard gate | — |
| Entire Tamil locale temporarily disabled (emergency) | Redirect `/ta/*` → `/en/*` with a visible notice | 302 |
| Page permanently removed | Standard removal handling | 410 |

Maintain a readiness manifest as the single source of truth for what's safe to serve:

```ts
export const pageReadiness = {
  '/pricing': { en: true, ta: true },
  '/features': { en: true, ta: false },   // falls back per policy above
  '/blog/some-post': { en: true, ta: false },
} as const;
```

Strict publish gate: navigation, CTAs, forms, and legal pages must be **100% translated and approved** before a locale is considered "live" for that page. Blog posts may publish progressively with an explicit "Read in English" toggle instead of a partial Tamil version.

---

## Translation Governance

**Workflow:** Copywriting (English, checked against `app_reality.md`) → content freeze on that page → transcreation/translation request → native-speaker review → marketing + (for legal/pricing) legal approval → publish → regression QA → post-publish monitoring.

| Role | Responsibility |
|---|---|
| Copywriter | Writes and owns the English source, verified against `app_reality.md` |
| Transcreator | Produces emotion-equivalent Tamil for headlines/value props (never raw machine translation) |
| Translator | Produces literal Tamil for UI, legal, and pricing strings |
| Native reviewer | Checks accuracy, tone, and cultural fit |
| Approver | Marketing lead sign-off; legal sign-off for legal/pricing content |
| Developer | Implements strings, runs technical QA |
| SEO reviewer | Validates hreflang/canonical/metadata for the new content |

**Versioning:** each Tamil string carries a source-hash of its English original; when the English changes, the Tamil entry is automatically flagged stale and that section falls back to English until re-approved. **Content freeze:** no English copy changes in the 48 hours before a major Tamil launch without explicit re-approval. **Rollback:** reverting a translation's readiness flag immediately restores the English fallback with zero deploy needed.

---

## Integration Handoff

| Skill | Inputs from this skill | Outputs to this skill | Boundary |
|---|---|---|---|
| `tamil-script-transcreation` | Approved English source, tone/persona guidance, readiness status | Transcreated Tamil copy + approval record | This skill never writes Tamil copy itself |
| `tamil-text-overlay-typography` | Locale, font/rendering requirements for assets | Tamil-safe typography, font stacks, overflow rules | Typography/rendering only, not translation |
| `seo-technical-audit-specialist` | hreflang matrix, canonical matrix, sitemap spec | Audit findings, validation results | Broader technical SEO beyond i18n scope |
| `nextjs-architect` | Folder structure, middleware contract, metadata API usage | Implementation PRs, performance tuning | Core app architecture outside locale concerns |
| `on-page-seo-copywriter` | Metadata templates, keyword-separation rules per locale | Localized title/description drafts | Copywriting only, not technical implementation |

---

## SEO Safeguards

- **Duplicate content:** enforced via the hreflang + self-referencing canonical rules above — never rely on `noindex` as a substitute.
- **Sitemaps:** either per-locale sitemaps (`/en/sitemap.xml`, `/ta/sitemap.xml`) listing only *ready* pages, or one sitemap with `<xhtml:link>` alternate annotations per URL.
- **robots.txt:** allow `/en` and `/ta`; disallow staging/preview deployments and internal paths; never accidentally block an entire locale.
- **Canonical validation:** run an automated check that every live URL's canonical equals itself.
- **Indexation monitoring:** Google Search Console (watch the International Targeting / hreflang errors report) and Bing Webmaster Tools, checked on a regular cadence.
- **Analytics segmentation:** every pageview and conversion event carries a locale dimension; track English vs. Tamil funnels separately.
- **Keyword separation / anti-cannibalization:** track English and Tamil keyword sets independently; watch for the two locales unintentionally competing for the same query in the same market.

---

## Content Rules

| Content type | Must localize | May stay English |
|---|---|---|
| Navigation, CTAs, forms | Yes | — |
| Feature descriptions, pricing body | Yes | Currency symbols, plan codes |
| Legal (Terms, Privacy) | Yes, with legal sign-off | — |
| Support/help content | Yes | — |
| Blog | Only if fully transcreated | Otherwise stays English-only, not half-translated |
| Product/brand/feature proper nouns | — | Yes (unless explicitly approved otherwise) |
| Testimonials, customer counts, case studies | Only if the specific claim is approved in that language | Never fabricated or invented in either language |

---

## Visual Localization

- Text-free illustrations/icons can be shared across locales.
- English-UI product screenshots are acceptable on Tamil pages **only** with a clear Tamil caption, and only until localized screenshots exist.
- Once Tamil UI screenshots exist, store them under locale-specific asset paths and reference them only from Tamil pages — never mix locale-specific screenshots into the wrong language's page.
- Any text overlaid on images/video must go through `tamil-text-overlay-typography` — never ship auto-translated text baked into an image.

---

## Performance Considerations

- Statically generate (`generateStaticParams`) all marketing pages for both locales; use ISR only for frequently updated content (blog, pricing) with per-locale revalidation.
- Load Tamil fonts only on `/ta` routes, not globally.
- Split translation files by namespace/page so a page only loads the strings it needs — avoid one giant JSON bundle shipped to every route.
- Keep `generateMetadata` pure and cacheable.

---

## Accessibility

- `<html lang="en">` / `<html lang="ta">` set dynamically on every route so screen readers pronounce content correctly.
- Language switcher is fully keyboard-operable with a localized `aria-label`.
- Prefer full-page navigation on language switch (not a client-side content swap) so assistive tech re-announces the document language; if a client-side swap is ever used, push the change through an ARIA live region.
- Tamil is LTR — no `dir` changes needed today, but keep the CSS approach RTL-ready for future languages.
- Focus lands on a logical point (main content or the switcher itself) after switching.

---

## QA Checklist

**Pre-publish**
- [ ] Every Tamil page string is 100% approved — no visible fallback keys
- [ ] No English body copy inside a Tamil page, and no Tamil copy inside an English page
- [ ] hreflang set is complete, self-referencing, bidirectional, absolute HTTPS URLs
- [ ] Canonical is self-referencing and language-specific on every page
- [ ] `generateMetadata` returns correct localized title/description/OG/Twitter per locale
- [ ] JSON-LD validates and every user-visible string matches the page's language
- [ ] Language switcher preserves the current path and works on mobile + desktop
- [ ] `NEXT_LOCALE` cookie is set correctly and respected on return visits
- [ ] Deep links (e.g., `/ta/features/attendance`) resolve without redirect loops
- [ ] Sitemap contains only ready URLs; robots.txt correctly scoped
- [ ] Correct 404 for a non-existent locale path
- [ ] Social previews (OG/Twitter) render in the correct language
- [ ] No fabricated claims, testimonials, or counts in either language

**Post-publish**
- [ ] Search Console shows zero hreflang errors for the new pages
- [ ] Only intended URLs are indexed (no staging/preview leakage)
- [ ] Analytics locale segmentation is live and reporting correctly
- [ ] Full regression pass triggered after any English-source copy change

---

## Anti-Patterns

- Raw machine-translated marketing copy published without native review
- Mixed English/Tamil content within a single page or component
- Cross-language canonicals (a Tamil page canonicalizing to its English twin, or vice versa)
- Missing or asymmetric hreflang, or hreflang pointing at a 404
- Emitting `en-IN`/`ta-IN` with no corresponding regional content
- Automatic, non-overridable language redirects based on IP or `Accept-Language`
- Locale-detection redirect loops
- Duplicate URLs via query-parameter language switching
- Indexing of staging, preview, or non-ready-locale routes
- Flags used as the sole language indicator
- Shipping a "Coming soon" page that itself contains English placeholder/lorem text passed off as Tamil

---

## Deliverables

When this skill is invoked, produce:

1. Locale architecture recommendation (subpath routing decision + allow-list)
2. Routing specification (folder tree, middleware contract, cookie behavior)
3. hreflang matrix — every page × every locale + `x-default`
4. Canonical matrix — self-canonical rule per URL
5. Metadata specification — localized vs. shared fields, with a worked `generateMetadata` example
6. Structured data specification per schema type (Organization, SoftwareApplication, Breadcrumb, FAQ, Product, Review)
7. Language switcher specification (placement, states, persistence, accessibility)
8. Untranslated-page decision table + readiness manifest
9. Translation governance plan (workflow, roles, versioning, freeze, rollback)
10. Integration handoff contracts for the five collaborating skills
11. SEO safeguards checklist (sitemaps, robots.txt, Search Console/Bing monitoring, analytics segmentation)
12. QA checklist (pre-publish + post-publish)
13. Deployment readiness checklist (caching/ISR config, environment parity, robots correctness per environment)

---

## Assumptions

- Production runs on a single apex domain; examples use `uniqbrio.com` as a placeholder.
- This is a green-field bilingual implementation — no conflicting legacy Tamil URLs exist yet.
- The in-app product UI (React Native Expo PWA, post-login) is out of scope; this skill governs the pre-login public marketing site only.
- `app_reality.md` is the single source of truth for every marketing claim in both languages.
