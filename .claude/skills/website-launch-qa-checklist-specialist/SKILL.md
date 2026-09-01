---
name: website-launch-qa-checklist-specialist
description: Runs the definitive pre-launch QA pass across an entire B2B SaaS marketing website — link integrity, forms, redirects, metadata, Open Graph, analytics, structured assets, cross-page consistency, conversion journeys, mobile/cross-browser/SEO/accessibility/performance/security — producing a severity-scored issue inventory and a Go / Conditional-Go / No-Go launch recommendation.
when_to_use: Trigger this skill whenever a marketing website, redesign, domain migration, or production deployment needs a pre-launch QA pass, "is the site ready to go live" check, launch readiness review, or release sign-off before going into production.
---

# Website Launch QA & Checklist Specialist

## 0. Mission

**Launch QA is not "does the page load." It is proof that every customer-facing journey works correctly under real production conditions** — real domain, real HTTPS certificate, real Supabase project, real Edge Functions, real analytics IDs, real redirects — for the specific goal of converting Indian arts and sports academy owners into signups, demo bookings, and paying customers.

### 0.1 What "Launch-Ready" Actually Means

A site is launch-ready when:
- Every page in scope resolves with the correct HTTP status code in the **production** environment (not localhost, not a Vercel preview alias standing in for prod).
- Every navigational element, CTA, form, and download performs its intended action end-to-end, including the backend write (Supabase/Postgres) and any downstream notification (email, WhatsApp, CRM, webhook).
- Every social/meta surface (title, OG, Twitter Card, favicon, manifest) renders correctly when the URL is shared or bookmarked.
- Every analytics/tracking surface fires with **production** IDs, not staging or debug IDs.
- Mobile, cross-browser, SEO, accessibility, performance, and security have each cleared their respective gates (see §14–§18).
- No issue classified **Blocker** or unmitigated **Critical** remains open.

### 0.2 Acceptance Criteria

| Requirement | Condition to pass |
|---|---|
| Zero Blockers | 0 open Blocker-severity issues |
| Zero unmitigated Criticals | 0 open Critical issues, or each has a signed-off mitigation/rollback plan |
| Majors documented | Every Major issue has an owner and a fix timeline |
| Minor/Cosmetic logged | Captured in the backlog, not blocking |
| Evidence attached | Every failed check has a screenshot, HAR, or log reference |
| Sign-off recorded | Launch Sign-Off Checklist (§20) completed and dated |

### 0.3 Severity Levels

| Severity | Definition | Concrete example | Blocks launch? |
|---|---|---|---|
| **Blocker** | Breaks a core function, corrupts data, or exposes a security/privacy failure | Demo-booking form throws 500 on Supabase insert; API keys visible in client bundle; redirect loop on `/pricing` | **Always** — must fix before deploy |
| **Critical** | Breaks or materially degrades a primary conversion path | Signup CTA on homepage points to a 404; WhatsApp lead-capture Edge Function times out; GA4 fires the staging measurement ID in prod | **Always**, unless a documented, approved mitigation exists |
| **Major** | Significant but non-blocking defect on a secondary path or non-revenue page | Blog CTA visually broken on Safari iOS; coach testimonial image 404s; footer legal link 404s | Requires documented mitigation plan; can launch with sign-off |
| **Minor** | Cosmetic-adjacent defect with no functional impact | Inconsistent button padding on the Resources page; a typo in a footer disclaimer | Can launch; log for next sprint |
| **Cosmetic** | Pixel-level polish only | 2px misalignment on a card shadow | Can launch; log for backlog |

**Decision rule:** if fixing the issue requires a code or config change to restore a customer-facing function (form, navigation, payment/demo path, security header) → it is at minimum Critical. If it only requires a CSS or copy tweak with no functional effect → Major or below.

---

## 1. Scope

### 1.1 In Scope — the entire public marketing website
- **Core pages:** Home, Pricing, Features, Solutions, Landing pages, Blog/Resources, Contact, Demo booking, Signup/onboarding entry, Careers.
- **Legal pages:** Privacy Policy, Terms of Service, Refund/Cancellation Policy, Cookie Policy.
- **Structural elements:** Header navigation, footer, breadcrumbs, sidebar (if present), search, sitemap, robots.txt.
- **Interactive elements:** All forms, all CTAs, all downloads (PDFs, brochures), all media (images, video, WhatsApp status assets embedded on-page).
- **Public pre-login academy pages:** `uniqbrio.com/<slug>/join`, `?mode=onboard` slug-only onboarding entry points, abandoned-browse soft-lead capture surfaces.
- **Technical surfaces:** `sitemap.xml`, `robots.txt`, `manifest.json`, favicons, Apple touch icons, Open Graph/Twitter Card tags, structured data.
- **Cross-cutting:** analytics/tracking tags, redirects, custom 404, security headers, Core Web Vitals.

### 1.2 Out of Scope
- The authenticated in-app product (post-login dashboard, staff `/staff` login, owner OTP flow) — covered by `functional-test-planner`, `mobile-testing-expert`, `integration-test-architect`.
- Database schema correctness and RLS policy audits — covered by `supabase-safety-reviewer`, `rls-risk-auditor`, `multi-tenant-data-isolation-expert`.
- Deep, exhaustive SEO content/keyword strategy — covered by `seo-technical-audit-specialist` (this skill only verifies technical SEO hygiene, §15).
- Full accessibility conformance audit — covered by `accessibility-specialist` (this skill only runs launch-blocking spot checks, §16).
- Load/stress testing and penetration testing.
- Internal admin tooling, `KNOWN_LIMITATIONS.md`, or CI pipeline correctness.

---

## 2. Pre-Launch Workflow (ordered, end to end)

1. **Freeze & environment confirm** — confirm the build under test is the actual production deployment (correct Vercel project, correct domain, correct Supabase PROD project ref, not TEST).
2. **Full-site crawl** (§3) — inventory every URL, detect orphans, duplicates, non-indexable pages.
3. **Navigation validation** — header, footer, breadcrumbs, sidebar, mobile menu.
4. **Link integrity validation** (§4) — internal, external, anchor, CTA, download, tel/mailto/WhatsApp/social.
5. **Redirect & 404 validation** (§5) — redirect maps, chains, loops, custom 404.
6. **Form validation** (§6) — every form, end-to-end, including Supabase Edge Function and DB persistence.
7. **Metadata & Open Graph validation** (§7–§8).
8. **Analytics & tracking validation** (§9).
9. **Structured asset validation** (§10) — favicon, manifest, robots.txt, sitemap.xml.
10. **Cross-page consistency review** (§11).
11. **Conversion journey validation** (§12) — full funnels, not isolated pages.
12. **Mobile / cross-browser / SEO / functional cross-reference** (§13–§15).
13. **Accessibility spot checks** (§16).
14. **Performance sanity review** (§17).
15. **Security sanity checks** (§18).
16. **Regression review** — re-verify anything touched by the last fix cycle.
17. **Compile findings, severity-score, produce deliverables** (§19).
18. **Launch sign-off** (§20) — Go / Conditional Go / No Go.

---

## 3. Full-Site Crawl Methodology

1. Start from `sitemap.xml` if present; otherwise crawl breadth-first from the homepage and primary navigation.
2. Follow every discoverable link to a crawl depth of at least 3 clicks from the homepage; any critical conversion page (Pricing, Demo, Signup) must be reachable within 2 clicks.
3. Respect `robots.txt` disallow rules while noting anything unexpectedly blocked.
4. Build a URL inventory recording: URL, HTTP status, indexable Y/N, canonical target, discovered-via (which page linked to it).

**Orphan pages** — pages that exist (e.g. in the CMS/route tree) but have no internal inbound link. Flag and confirm intentional (e.g. a legacy campaign landing page) vs missing navigation.

**Crawl depth** — deeper pages get less link equity and are harder for users/search engines to find; anything conversion-critical belongs at depth ≤ 2.

**Canonical URLs** — every indexable page must self-reference (or point to) exactly one canonical URL; verify `<link rel="canonical">` matches the resolved URL after any trailing-slash/case normalization.

**Duplicate URLs** — the same content reachable at multiple URLs (`/pricing`, `/pricing/`, `/Pricing`) must canonicalize to one, and non-canonical variants must 301 to it, not just carry a canonical tag while serving 200.

**Pagination** — paginated blog/resource lists should use `rel="next"/"prev"` or self-canonicalize each page; verify page 2+ isn't orphaned or duplicated in the index.

**Indexable vs non-indexable** — confirm marketing pages are indexable (no accidental `noindex`) and intentionally non-indexable pages (thank-you pages, internal test academy sandboxes) carry `noindex` or are blocked in `robots.txt`.

---

## 4. Link Integrity Validation

| Link type | Validate | Failure = |
|---|---|---|
| Internal links | Resolves to 200/expected page | 404/500/soft-404 |
| External links | Resolves, no timeout | 404/500/timeout/redirect to unrelated domain |
| Anchor / hash links | Target element ID exists on page | Missing ID, dead scroll |
| CTA buttons | Destination matches intended funnel step | Wrong destination, dead button |
| Image links / logo links | Href resolves; logo returns to home | Broken href |
| Breadcrumbs, header nav, footer nav, sidebar | Every item resolves | Any broken item |
| Pagination controls | Next/prev resolve | Broken or looping pagination |
| Downloads / PDFs | File exists, correct content-type, opens | 404, wrong MIME type, corrupted file |
| `mailto:` | Valid email format, opens mail client | Malformed address |
| `tel:` | Valid E.164/local format | Malformed number |
| WhatsApp (`wa.me`/`api.whatsapp.com`) links | Valid number, pre-filled message renders correctly | Invalid number, broken deep link |
| Social links | Resolve to the live, correct profile | 404, wrong/parked profile |
| Deep links (slug-based, `?mode=onboard`) | Resolve without token-gating per current design | Token-gate regression, broken slug resolution |
| Images/media | All render, no broken `<img>` icons | Broken src, missing alt |

**Expected HTTP responses:** 200 (active page), 301/308 (permanent — old→new, protocol/host normalization), 302/307 (temporary — campaign redirects only), 404 (intentionally removed, must be a real 404 not a 200 "soft 404"), 410 (permanently gone, preferred over 404 for deliberately retired content), 403 (auth-gated, expected only for non-public routes).

**Redirect chains** (2+ hops, e.g. `/old → /interim → /new`): Major severity — collapse to a single direct redirect to the final canonical URL.

**Redirect loops** (`/a → /b → /a`): Blocker severity — fix immediately, this fully breaks the page.

**Reporting a failure** must include: source page URL → element/link text → destination URL → HTTP status observed → failure type (broken/chain/loop/timeout) → severity → suggested fix.

---

## 5. Redirect Verification & Custom 404

### 5.1 Redirect Map Validation
Validate every entry in the redirect map/config for: `http→https`, `www↔non-www` (whichever is canonical), trailing-slash normalization, case normalization, retired/migrated marketing URLs, old blog slugs, campaign short-links. Every redirect must be a single-hop 301 to the final canonical destination — no chains, no loops (see §4).

| Redirect type | Expected status |
|---|---|
| HTTP → HTTPS | 301 |
| www ↔ non-www (canonical direction) | 301 |
| Trailing slash normalization | 301 |
| Case normalization | 301 |
| Retired/old URL → new URL | 301 |
| Marketing campaign URL (time-limited) | 302 |

### 5.2 Custom 404 Validation
- Must return a real **HTTP 404** status code — never a 200 "soft 404" (a page that looks like an error but reports success, which silently poisons SEO and analytics).
- Must include: clear "page not found" messaging, a link back to the homepage, working global navigation, search (if the site has one), and at least one CTA (e.g. "Book a demo" / "Explore Pricing") so a broken inbound link doesn't dead-end a prospective customer.
- Test with: unknown random URLs, deliberately misspelled real URLs, and known broken inbound links (old campaign/social links).

---

## 6. Form Validation (extremely detailed — validate every form independently, end to end)

### 6.1 Forms in scope
Contact · Demo booking · Newsletter signup · Lead magnet download · Signup/onboarding · Waitlist · Support · Feedback · Referral · Careers application.

### 6.2 Client-side checklist (per form)
- [ ] Required vs optional fields correctly marked and enforced
- [ ] Email format validated; phone validated for Indian formats (+91, 10-digit)
- [ ] File upload (if present) validates size/type
- [ ] Character limits enforced; inline validation on blur and on submit
- [ ] Error messages are specific, visible, and accessible (`aria-describedby`, not color-only)
- [ ] Success message or redirect displays without a full page flash/reload glitch
- [ ] Loading/disabled state on submit button prevents double-submission
- [ ] Works fully via keyboard alone (tab order, Enter to submit)
- [ ] Correct mobile keyboard (numeric pad for phone, email keyboard for email field)

### 6.3 Server-side / backend checklist (per form)
- [ ] Spam protection active (honeypot/CAPTCHA) and not blocking legitimate submissions
- [ ] Rate limiting configured and does not false-positive on normal use
- [ ] Duplicate-submission handling defined (dedupe key, idempotency, or explicit "already submitted" message)
- [ ] **Supabase Edge Function** invoked: correct URL, correct headers, valid request schema, expected response shape, handles errors gracefully, uses production environment variables (not TEST project ref), completes within timeout
- [ ] **Database persistence:** record actually appears in Postgres/Supabase with correct field values, timestamps, and any expected trigger side-effects (e.g. WhatsApp notification, branch auto-creation)
- [ ] Confirmation email (if applicable) sends, renders correctly, and isn't caught in spam
- [ ] CRM/webhook integration (if applicable) fires and the downstream system receives the record
- [ ] Analytics event fires on successful submission (e.g. `demo_booking_submit`, `signup_complete`)
- [ ] Failure path: if the Edge Function/DB write fails, the user sees a clear, non-technical error — never a raw stack trace or silent failure

### 6.4 Form failure scenarios and expected behavior

| Scenario | Expected behavior | Severity if wrong |
|---|---|---|
| Empty required field | Inline validation error, no submit | Major |
| Invalid email/phone format | Inline validation error | Major |
| Duplicate submission | Graceful dedupe or clear message | Major |
| Edge Function timeout/error | User-friendly error, no data loss silently | Critical |
| DB write fails | User-friendly error; submission not falsely reported as success | Blocker |
| Spam filter false-positives on legit user | Legit submission blocked | Critical |
| Success but no confirmation email | Investigate email service config | Major |
| Success but no analytics event | Add tracking | Major |

---

## 7. Metadata Validation

| Element | Rule |
|---|---|
| Title tag | Unique per page, ~50–60 characters, descriptive |
| Meta description | Unique per page, ~120–160 characters, compelling |
| Canonical | Points to the resolved, normalized URL |
| Robots meta | `index,follow` on public pages; `noindex` only where intentional |
| Viewport | `width=device-width, initial-scale=1` |
| Language | Correct `lang` attribute |
| Charset | UTF-8 |
| Theme color | Matches brand (Brio Orange `#DE7D14`) for mobile browser chrome |
| Manifest link | Present and correctly referenced |
| Apple touch icon | Present, correct sizes (180×180, 152×152, 120×120, 76×76) |
| Favicon | Present in multiple sizes (16×16, 32×32, 48×48), renders in tab/bookmark/history |
| Alternate/hreflang | Only if multilingual variants exist (currently English + Tamil content strategy — verify if/when Tamil pages ship) |

**Consistency rules:** no duplicate title tags or meta descriptions across pages; title and description should match on-page content (no bait-and-switch); length recommendations above are guidelines, not hard cutoffs — truncation in SERPs/social previews is the real failure mode to catch.

---

## 8. Open Graph & Social Preview Validation

| Tag | Requirement |
|---|---|
| `og:title` | Matches title tag intent, doesn't truncate awkwardly |
| `og:description` | Matches meta description intent |
| `og:image` | Absolute URL, min 1200×630, 1.91:1 aspect ratio, <1MB, no blur/pixelation |
| `og:url` | Canonical URL |
| `og:type` | `website` (or `article` for blog posts) |
| `og:site_name` | Full brand name |
| `twitter:card` | `summary_large_image` |
| `twitter:title` / `description` / `image` | Match OG equivalents |

**Verification workflow:** paste the live URL into Facebook's Sharing Debugger, Twitter's Card Validator, and LinkedIn's Post Inspector — confirm the rendered preview shows the correct image, title, and description with no broken-image icon. Confirm a **fallback image** exists for any page that has no custom OG image (never let a page fall back to a broken image icon on social share). Check messaging/brand consistency: no OG description should contradict the page's actual content.

---

## 9. Analytics & Tracking Verification

Verify presence, correct firing, and **production (not staging/debug) IDs** for each tag in use:

- Google Analytics 4 — pageview + custom events (`demo_booking_click`, `signup_submit`) fire with the correct Measurement ID
- Google Tag Manager — container loads, triggers fire, no duplicate tag firing
- Google Ads — conversion ID/label correct if running paid campaigns
- Meta Pixel — standard events (`PageView`, `ViewContent`, `Lead`) fire correctly
- LinkedIn Insight Tag — fires if used for B2B retargeting
- Microsoft Clarity — session recording script loads
- Consent mode / cookie banner — trackers respect consent state; nothing fires before consent if consent-gating is implemented
- **Environment separation** — verify zero staging/TEST measurement IDs or debug flags are present in the production bundle
- Tag sequencing — no race conditions causing duplicate or missed events

**Debug workflow:** use GTM Preview mode and browser network tab to confirm each expected event fires exactly once per action, with correct payload, against production IDs.

---

## 10. Structured Asset Validation

| Asset | Checks |
|---|---|
| `favicon.ico` / `.svg` | Exists, multiple sizes, renders in browser chrome |
| `manifest.json` (PWA) | Valid JSON; includes `name`, `short_name`, `start_url`, `display`, icons, `theme_color`, `background_color`; correctly linked in `<head>` |
| `robots.txt` | Exists, valid syntax, allows indexable pages, blocks non-indexable ones, references `sitemap.xml`, doesn't accidentally block Pricing/Demo/Signup |
| `sitemap.xml` | Valid XML, includes all indexable URLs in absolute form, under size limits (<50MB / <50k URLs, else split with a sitemap index), `lastmod` reasonably accurate |
| RSS (if present) | Valid feed, resolves |
| `security.txt` (if present) | Valid, current contact info |
| `browserconfig.xml` (if present) | Valid, correct tile icons |
| Asset caching | Appropriate `Cache-Control` headers on static assets |
| Image optimization | Next.js `<Image>` or equivalent used; WebP/AVIF where supported; lazy-loaded below the fold |
| Compression | Brotli/Gzip enabled at the CDN/Vercel edge |

---

## 11. Cross-Page Consistency Review

Audit these dimensions across **every** page in scope, not just the homepage:

- **Branding:** logo, brand colors (Brio Orange `#DE7D14`, Brio Purple `#6708C0`), typography, spacing system consistent everywhere.
- **Navigation:** header/footer/breadcrumb structure, menu order, and labels identical across pages.
- **Components:** button styles (primary/secondary/tertiary), form field styles, card styles, modal styles, icon set — no drift between pages built at different times.
- **Content:** terminology, CTA wording, product/feature naming, pricing figures, phone numbers, email addresses, business hours, legal/copyright text — must match exactly everywhere they appear (a stale phone number in one footer instance is a common real-world defect).
- **Trust elements:** testimonials, case studies, and trust badges are current, correctly linked, and not orphaned from a prior redesign.

---

## 12. Conversion Journey Validation

Launch QA's central purpose: **validate complete funnels, not isolated pages.**

| Journey | Path | Must verify end-to-end |
|---|---|---|
| Landing → Demo booking | Landing page → CTA → Demo form → Confirmation | Form submits, DB record created, confirmation shown/emailed |
| Landing → Signup | Landing page → CTA → Signup/onboarding → Success | Slug-only onboarding resolves correctly, account created |
| Home → Pricing → Demo | Home → Pricing → CTA → Demo form | Pricing figures match reality, CTA carries context |
| Blog → CTA → Lead capture | Blog post → inline CTA → Lead form | CTA visible mid-scroll, form works |
| Pricing → Contact | Pricing → "Talk to us" → Contact form | Correct routing, no dead-end |
| Resource → Lead magnet | Resource page → gated download → Lead form → File delivered | File actually downloads post-submission |
| Public join page → Enquiry | `uniqbrio.com/<slug>/join` → EMS enquiry flow | Slug resolves, enquiry captured, abandoned-browse soft-lead capture fires if user exits mid-flow |

**Failure scenarios:**

| Scenario | Severity |
|---|---|
| CTA missing or unclickable | Blocker |
| CTA leads to wrong/broken destination | Blocker |
| Form validates but submission silently fails | Blocker |
| Success state missing after valid submission | Critical |
| Confirmation email not sent | Major |
| Analytics conversion event missing | Major |

---

## 13. Mobile Readiness

Perform launch-blocking mobile checks here; for exhaustive device-matrix testing, **cross-reference `mobile-testing-expert`**.

- [ ] Responsive layout with no horizontal scroll at 360px–428px widths
- [ ] Touch targets ≥44px with adequate spacing
- [ ] All forms, dropdowns, and modals usable one-handed
- [ ] Correct mobile keyboards per input type
- [ ] All conversion-critical journeys (§12) work on a low-end Android device (Redmi 9 class) and iOS Safari

## 14. Cross-Browser Readiness

Perform launch-blocking spot checks (Chrome, Safari iOS, Firefox, Edge) for layout, form function, and JS errors; **cross-reference `cross-browser-testing-expert`** for the full compatibility matrix.

## 15. SEO Readiness

Verify technical SEO hygiene as part of launch (indexability, canonical correctness, heading structure `H1→H2→H3`, alt text present, structured data/JSON-LD for Organization/WebSite/BreadcrumbList renders without errors in Google's Rich Results Test); **cross-reference `seo-technical-audit-specialist`** for deep content/keyword strategy — that is out of scope here.

## 16. Functional Readiness

Confirm no console errors, all interactive widgets (accordions, tabs, carousels, search, filters) function without JS errors, and all Edge Function/API calls used by the marketing site succeed; **cross-reference `functional-test-planner`** for full E2E test-suite design.

---

## 17. Accessibility Spot Checks (launch-blocking only)

This is not a full WCAG audit (see `accessibility-specialist` for that) — only checks that would actively block a real user from converting:

- [ ] Every interactive element reachable and operable via keyboard alone, in a logical order
- [ ] Visible focus indicator on every focusable element
- [ ] All form fields have associated labels; errors are announced, not color-only
- [ ] All meaningful images have descriptive alt text; decorative images have empty alt
- [ ] Text contrast ≥4.5:1 (≥3:1 for large text)
- [ ] No keyboard traps in modals/dialogs
- [ ] Screen-reader basics: logical heading order, landmark roles (`header`, `main`, `footer`, `nav`) present

## 18. Performance Sanity Review

| Metric | Threshold | Note |
|---|---|---|
| LCP | ≤2.5s | On real production URLs, not dev/preview |
| CLS | ≤0.1 | Watch for late-loading fonts/images shifting layout |
| INP | ≤200ms | Especially on form interactions |

- [ ] Images optimized (WebP/AVIF, correctly sized, lazy-loaded below the fold)
- [ ] Fonts subset/preloaded, no FOIT/FOUT causing CLS
- [ ] Render-blocking CSS/JS minimized; critical CSS inlined where practical
- [ ] Caching headers correct on Vercel/CDN edge
- [ ] Brotli/Gzip compression enabled
- [ ] Third-party scripts (analytics, chat widgets) loaded async/deferred so they don't block LCP

## 19. Security Sanity Checks

- [ ] HTTPS enforced everywhere; no mixed content (HTTP assets on an HTTPS page)
- [ ] Valid, non-expired TLS certificate
- [ ] Security headers present: HSTS, Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- [ ] No console errors exposing stack traces, source paths, or internal endpoint names
- [ ] No API keys, Supabase service-role keys, or database credentials visible in client-side bundle or `view-source`
- [ ] No leftover debug/source maps exposed in production that reveal internal logic
- [ ] Only intended `NEXT_PUBLIC_*` environment variables are exposed client-side; nothing sensitive leaked
- [ ] Any unauthenticated public endpoint used by the marketing site (e.g. a phone-lookup or enquiry endpoint) has rate-limiting/anti-abuse controls appropriate to its exposure

---

## 20. Release Blockers — absolute launch stoppers

- [ ] Homepage or any core page (Pricing/Demo/Signup) returns 500 or fails to load
- [ ] HTTPS not enforced, or mixed-content warnings present
- [ ] Any conversion-critical form fails to submit or silently fails to persist
- [ ] Redirect loop present anywhere in scope
- [ ] Primary CTA on homepage or pricing page is broken or missing
- [ ] Supabase Edge Function backing a public form errors out or times out
- [ ] Analytics is firing staging/debug IDs instead of production IDs
- [ ] Security headers absent or API keys/service-role credentials exposed client-side
- [ ] Production environment variables point at the wrong Supabase project (TEST instead of PROD)
- [ ] Mobile layout broken on a core conversion page

---

## 21. Deliverables

Every launch QA pass produces:
1. **Executive summary** — overall Go/Conditional Go/No Go, issue counts by severity, top risks.
2. **Pass/fail report** — status per category (crawl, links, redirects, metadata, OG, forms, analytics, mobile, cross-browser, SEO, performance, security, accessibility).
3. **Issue inventory** — every issue with URL, description, severity, evidence, suggested fix, owner.
4. **Severity matrix** — counts of Blocker/Critical/Major/Minor/Cosmetic, open vs resolved.
5. **Launch recommendation** — Go / Conditional Go / No Go with justification.
6. **Risk assessment** — residual risk level and mitigation/rollback plan for anything shipped with open Major issues.
7. **Regression notes** — confirmation that fixes from a prior pass didn't reintroduce or shift issues elsewhere.

---

## 22. Launch Sign-Off Checklist (use immediately before deployment)

- [ ] Full-site crawl complete, no orphan/duplicate/non-canonical surprises
- [ ] All internal, external, CTA, download, tel/mailto/WhatsApp/social links pass
- [ ] All redirects single-hop to canonical destination; zero chains/loops
- [ ] Custom 404 returns real 404 status with helpful navigation
- [ ] Every form (Contact, Demo, Signup, Newsletter, Lead magnet, Waitlist, Support, Feedback, Referral, Careers) verified end-to-end including DB persistence and notifications
- [ ] Metadata (title/description/canonical/robots) unique and correct per page
- [ ] Open Graph/Twitter Card previews render correctly on Facebook/Twitter/LinkedIn debuggers
- [ ] Favicon, manifest, robots.txt, sitemap.xml all valid
- [ ] Analytics tags fire with production IDs only; no staging leakage
- [ ] Cross-page branding/content/terminology consistency confirmed
- [ ] All conversion journeys (§12) tested end-to-end on desktop and mobile
- [ ] Mobile, cross-browser, SEO, and functional spot checks cleared (or delegated skills' sign-off obtained)
- [ ] Accessibility launch-blocking checks cleared
- [ ] Core Web Vitals within threshold on production URLs
- [ ] Security headers present; no exposed secrets; HTTPS fully enforced
- [ ] Zero open Blockers; zero unmitigated Criticals
- [ ] Deliverables (§21) compiled and shared with stakeholders
- [ ] Final Go / Conditional Go / No Go recorded with date and sign-off name

---

## 23. Reporting Template

```markdown
# Website Launch QA Report

**Site:** [name]  **URL:** [production URL]  **Date:** [YYYY-MM-DD]  **QA Lead:** [name]
**Vercel deployment ID:** [id]  **Supabase project (PROD ref):** [ref]

## Executive Summary
Status: [GO / CONDITIONAL GO / NO GO]
Total issues: [n] — Blocker: [n] Critical: [n] Major: [n] Minor: [n] Cosmetic: [n]

## Category Pass/Fail
| Category | Status | Notes |
|---|---|---|
| Crawl & Inventory | | |
| Link Integrity | | |
| Redirects & 404 | | |
| Forms | | |
| Metadata | | |
| Open Graph | | |
| Analytics | | |
| Structured Assets | | |
| Cross-Page Consistency | | |
| Conversion Journeys | | |
| Mobile | | |
| Cross-Browser | | |
| SEO | | |
| Accessibility | | |
| Performance | | |
| Security | | |

## Issue Log
| # | Severity | Page/URL | Description | Evidence | Owner | Status |
|---|---|---|---|---|---|---|

## Launch Recommendation
[Go / Conditional Go / No Go] — [justification]

## Risk Assessment & Mitigation
[residual risks and rollback plan if applicable]
```

---

## 24. Best Practices for Sustained Launch Quality

- **Automate the crawl.** Wire a crawler/Lighthouse CI into the CI/CD pipeline so broken links and metadata regressions are caught on every PR, not just at launch.
- **Automate the critical journeys.** Script the highest-value conversion funnels (Demo booking, Signup) with Playwright/Cypress and run them against every preview deployment before merge.
- **Catch visual regressions.** Use a visual-diff tool on key pages so redesign PRs don't silently break layout on pages nobody thought to manually re-check.
- **Turn the sign-off checklist into a gate.** Represent §22 as a required CI check or PR template so launch approval isn't just a memory-dependent ritual.
- **Watch the first 24 hours.** Immediately after launch, monitor Vercel logs, Supabase logs, and any error-tracking tool for a spike in errors, failed Edge Function invocations, or unexpected 404/500 rates — cross-reference `post-release-monitoring-expert`.
- **Close the loop on every miss.** Any issue that reaches production and wasn't caught by this checklist should be logged, the checklist updated to catch it next time, and — where feasible — added to the automated test suite so it can't silently recur.
- **Keep environment discipline strict.** The single most common real-world launch defect category is environment leakage — staging analytics IDs, TEST Supabase project refs, or debug flags shipping to production. Make an explicit "production ID/environment confirmation" step non-optional in every pass.
