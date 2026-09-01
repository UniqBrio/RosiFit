---
name: core-web-vitals-optimizer
description: A production-grade engineering playbook for diagnosing and optimizing Largest Contentful Paint, Cumulative Layout Shift, and Interaction to Next Paint on the UniqBrio Next.js/Vercel marketing website, covering images, fonts, third-party scripts, rendering, budgets, CI enforcement, and SEO impact.
when_to_use: Use when auditing, building, or reviewing any page on the UniqBrio public marketing site (not the authenticated app) to diagnose or improve LCP, CLS, INP, Lighthouse, or PageSpeed Insights scores ahead of a demo/trial/subscription-conversion goal.
---

# Core Web Vitals Optimizer — UniqBrio Marketing Site Playbook

Scope: the **public marketing site only** (`uniqbrio.com`, Next.js on Vercel). Not the authenticated React Native Expo PWA app. The marketing site's job is converting visitors into demo bookings, trial signups, and paid subscriptions — performance is a conversion and SEO lever, not an aesthetic nice-to-have.

## 1. Targets (non-negotiable "Good" thresholds)

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| LCP | ≤ 2.5s | 2.5–4.0s | > 4.0s |
| CLS | ≤ 0.1 | 0.1–0.25 | > 0.25 |
| INP | ≤ 200ms | 200–500ms | > 500ms |
| Lighthouse Performance | ≥ 90 | 50–89 | < 50 |
| TTFB | ≤ 0.8s | — | — |

Always test on **mobile, throttled 4G/Slow-3G**, from a location representative of the India-first audience (Tier 2/3 cities) — lab scores on a fast desktop connection are not representative of the real user base.

## 2. Diagnostic Workflow (repeatable, tool-by-tool)

Run in this order — synthetic first to get a controlled baseline, then field data to confirm it matches reality:

1. **Lighthouse (Chrome DevTools)** — run Mobile + Desktop. Read "Opportunities" (what to fix) separately from "Diagnostics" (why it's slow).
2. **PageSpeed Insights** — compare **lab data** vs **field data (CrUX)**. If field is worse than lab, the gap is real-world network/device conditions (low-end Android, patchy 4G) — prioritize fixes that help low-end devices, not just fixes that move the lab number.
3. **WebPageTest** — run "Mobile, Slow 4G/3G" from a nearby test location. Use the **waterfall view** to find what blocks the LCP element and what precedes it in the critical path. Record TTFB, FCP, LCP, CLS, Speed Index.
4. **Chrome Performance Panel** — record a real interaction (menu open, form focus, scroll) and look for Long Tasks (>50ms) blocking the main thread; this is where INP problems live.
5. **Chrome Coverage tab** — find unused JS/CSS bytes shipped on first load; a primary source of INP and LCP regressions.
6. **Core Web Vitals overlay** (DevTools → Rendering → Core Web Vitals) — live CLS scoring while interacting; pinpoint the exact DOM mutation causing a shift.
7. **Vercel Analytics / Speed Insights** — real-user field data, segmented by device and geography; find which routes are actually poor for real Indian users, not just the homepage.
8. **Google Search Console → Core Web Vitals report** — this is what Google's crawler considers "poor" and prioritizes for the ranking signal. Fix flagged URLs first.
9. **CrUX Dashboard / BigQuery** — origin-level trend over time, useful for detecting slow regressions CI didn't catch.

**Isolating the bottleneck**: for LCP, find the LCP marker in the Performance panel and trace every request/render that happens *before* it. For CLS, reproduce the shift live with the overlay. For INP, record the specific interaction and look at Long Tasks — is it hydration cost, an event handler, or a third-party script?

## 3. LCP — Largest Contentful Paint

The hero image or the primary headline is almost always the LCP element on a marketing page.

**Rules:**
- Mark the true LCP element with `priority` on `next/image` — this makes Next.js emit `fetchpriority="high"` and a preload `<link>` automatically. Never `priority` more than one image per page (fighting the preload scanner defeats the point).
- Never lazy-load the LCP element. `loading="lazy"` on an above-the-fold hero is a direct regression.
- Serve AVIF → WebP → JPEG fallback via the image CDN (Vercel's Image Optimization API handles this automatically through `next/image`).
- Set `sizes` correctly so the browser requests the right resolution per breakpoint — an oversized image at any breakpoint is wasted LCP time.
- Keep Server Components as the default for marketing pages so HTML (including the LCP element) streams as soon as possible; don't wrap the LCP element itself in a `Suspense` boundary with a slow fallback — stream everything *else* around it instead.
- Preconnect to the image CDN / font origin: `<link rel="preconnect" href="https://<cdn-domain>" />`.
- Cache static assets at the edge: `Cache-Control: public, max-age=31536000, immutable`. Cache HTML pages with a short TTL plus `stale-while-revalidate` via ISR rather than pure SSR — an ISR page pre-rendered at the edge beats a cold SSR render every time for LCP.
- Avoid render-blocking CSS/JS ahead of the LCP element in the document `<head>`.

**Good vs poor:**
```jsx
// ❌ Poor — no priority, no format optimization, no responsive sizing
<img src="/hero-large.jpg" alt="Hero" />

// ✅ Good
<Image
  src="/hero-image.jpg"
  alt="UniqBrio academy management dashboard"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority
  placeholder="blur"
  blurDataURL={heroBlurData}
  className="object-cover"
/>
```

## 4. CLS — Cumulative Layout Shift

- **Every image** must have explicit `width`/`height`, or if using `fill`, the parent container must have a fixed `aspect-ratio` or fixed height (`position: relative` + reserved space) so the box exists before the image decodes.
- **Fonts**: use `next/font` for every typeface. It self-hosts, sets `font-display: swap` automatically, and generates a metrics-matched fallback (`size-adjust`, `ascent-override`, `descent-override`) so the swap from fallback to webfont causes near-zero shift. Never load fonts via a render-blocking `<link>` to Google Fonts directly.
- **Dynamic/late content** (promo banners, pricing widgets fetched client-side, cookie-consent banners, embeds): reserve space with a fixed `min-height` container before the content resolves. Never let content pop in and push the layout.
- **Embeds** (YouTube, calendars, chat widgets): wrap in an aspect-ratio-locked container (`aspect-video` + `absolute inset-0` iframe), never an unconstrained `<iframe>`.
- **Animations**: only animate `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, `margin`, or `padding` — these trigger layout, not just paint.
- **Skeleton loaders**: use for any content whose final size is unpredictable (testimonials carousel, dynamic pricing cards) so the skeleton occupies the same footprint as the resolved content.
- Watch for **hydration mismatches** — content that renders differently server vs client is a common, hard-to-spot CLS source; verify server and client markup produce identical layout on first paint.

**Good vs poor:**
```jsx
// ❌ Poor — no dimensions, dynamic banner with no reserved space
<img src="/thumb.jpg" />
{showBanner && <PromoBanner />}

// ✅ Good
<div className="relative aspect-video">
  <Image src="/thumb.jpg" fill alt="..." />
</div>
<div style={{ minHeight: '100px' }}>
  {showBanner && <PromoBanner />}
</div>
```

## 5. INP — Interaction to Next Paint

- Minimize Client Components. Every `"use client"` boundary adds hydration cost; default to Server Components and push interactivity only to the leaf components that truly need it.
- **Code-split** anything not needed for the first interaction: `dynamic(() => import('./Map'), { ssr: false })`.
- **Break up long tasks** (>50ms) — chunk heavy synchronous work with `setTimeout`/`requestIdleCallback`/`scheduler.yield()` so the main thread stays free for input.
- Use `startTransition` for state updates that aren't part of the user's immediate visual feedback (e.g., updating a background counter), and `useDeferredValue` to deprioritize expensive re-renders (e.g., filtering a large list) behind higher-priority input handling.
- **Memoize** with `React.memo`, `useMemo`, `useCallback` to prevent expensive re-renders on every keystroke/click.
- **Event delegation**: attach one listener to a parent rather than N listeners to N children (relevant for FAQ accordions, pricing toggles, testimonial grids).
- **Debounce/throttle** scroll, resize, and input handlers.
- Treat **third-party JS as the default suspect** for poor INP — chat widgets, session replay, and heatmap scripts routinely dominate main-thread time on marketing sites. Audit with the Coverage tab before assuming first-party code is at fault.

## 6. Image Strategy (deep dive)

- Always use `next/image`, never a bare `<img>`, for any content image.
- Responsive sizing: rely on Next.js's automatic `srcset` generation, but hand-write an accurate `sizes` attribute per breakpoint — this is the single most commonly wrong setting and silently defeats the entire responsive-image pipeline.
- Format order: AVIF → WebP → JPEG fallback, handled automatically by the Vercel Image Optimization API; verify `next.config.js` `images.formats` includes both.
- Compression: rely on the optimization pipeline rather than pre-compressing manually, but never upload source images larger than ~2x the largest rendered size — oversized sources still cost decode time even after resizing.
- Placeholder strategy: `placeholder="blur"` with a real `blurDataURL` (not a generic gray box) for hero and above-the-fold imagery; improves perceived performance and reduces perceived CLS even where actual CLS is already zero.
- Art direction: use `<picture>`-style art direction (different crops per breakpoint) only when the composition genuinely differs on mobile vs desktop — otherwise a single responsive image is simpler and equally performant.
- SVGs/icons/logo: inline critical small SVGs (nav logo, icons above the fold) to avoid an extra request; lazy-load large decorative SVGs.
- Caching: all optimized image URLs should be immutable and cached at the edge (`max-age=31536000, immutable`); never cache-bust images by changing query params on every deploy — use content-hashed filenames.
- Decoding: leave `decoding="async"` as default (Next.js handles this) except for the single LCP image, which should decode synchronously with the rest of the critical render path.

## 7. Font Strategy

Use **`next/font`** for every typeface — self-hosted (no third-party request to Google Fonts' CDN), automatic `font-display: swap`, automatic preload, and automatic fallback-metric matching to minimize the reflow when the swap occurs.

| Decision | Recommendation | Why |
|---|---|---|
| Self-host vs Google Fonts CDN | Self-host via `next/font/google` (downloads at build time) | Removes a third-party DNS/connection hop entirely; `next/font` does this automatically even when importing from `next/font/google`. |
| `font-display` | `swap` | Prevents FOIT (invisible text); text renders immediately in the fallback and swaps in place. |
| Subsetting | `subsets: ['latin']` (add others only if the marketing copy needs them) | Cuts font file size substantially; don't ship Cyrillic/Greek glyphs nobody reads. |
| Variable fonts | Prefer a single variable font file over multiple static weight files | One request instead of 4–6; smaller total payload for multi-weight designs. |
| Fallback stack | Let `next/font` generate the metric-matched fallback; don't hand-roll a generic `sans-serif` fallback | Hand-rolled fallbacks cause a visible reflow on swap — this is the #1 preventable CLS source from fonts. |
| Preload | Automatic via `next/font` | Manual `<link rel="preload">` for fonts is unnecessary and error-prone once `next/font` is in place. |

**Tradeoff to state explicitly**: `font-display: optional` gives the *best* CLS (browser may skip the swap entirely) but risks the fallback font being used permanently on slow connections — not recommended for a brand-critical marketing site; `swap` is the correct default here.

## 8. Third-Party Script Governance

Marketing sites accumulate scripts fast: GA4, GTM, Meta Pixel, LinkedIn Insight, a chat widget, session replay/heatmaps, a cookie-consent banner, an A/B testing tool, CRM embeds. Each one is a tax on INP and LCP. Govern them explicitly:

**Loading tiers (via `next/script`):**
- `beforeInteractive` — reserve for scripts that must exist before hydration (rare on a marketing site; avoid unless truly required).
- `afterInteractive` (default) — GTM/GA4 container, consent-management platform.
- `lazyOnload` — chat widgets, session replay, heatmaps, social widgets, marketing automation embeds. These should never block or compete with the initial render.
- **Interaction-triggered** (best for chat/support widgets) — don't even load the script until the user clicks the chat bubble placeholder:
```jsx
<button onClick={() => import('./initChat').then(m => m.open())}>Chat with us</button>
```

**Rules:**
- **Consent-gate** everything non-essential — scripts should not execute until cookie consent is granted (DPDP Act compliance is also relevant here for an India-first product).
- **Execution budget**: total third-party JS < 100KB gzipped, and no single third-party script may add more than 50ms of Total Blocking Time.
- **Consolidate**: don't run GA4 both directly and via GTM; don't run two heatmap tools simultaneously. Every additional tag is measurable INP cost with diminishing marketing value.
- **Audit cadence**: re-run PageSpeed Insights quarterly (or after adding any new tag) specifically to catch third-party creep; treat a new script addition as a performance PR, not a marketing-only change.

## 9. Next.js Optimization Patterns

- **Server Components by default** for all marketing routes; reach for a Client Component only for genuine interactivity (pricing toggle, FAQ accordion, forms).
- **Static Generation (SSG) + ISR** is the default rendering strategy for marketing pages — `export const revalidate = 3600` (or shorter for frequently-changing pages like pricing). Reserve SSR for genuinely per-request personalization; a marketing site rarely needs it.
- **Streaming with `Suspense`**: stream secondary, slower content (testimonials fetched from a CMS, a footer with dynamic social proof counts) *around* the LCP element, never gating the LCP element itself behind a slow data fetch.
```jsx
<Suspense fallback={<HeroSkeleton />}> {/* Only if Hero itself needs data */}
  <Hero />
</Suspense>
<Suspense fallback={null}>
  <TestimonialsFromCMS /> {/* Slow, non-critical, streams in later */}
</Suspense>
```
- **Dynamic imports** for anything below the fold and non-critical: interactive maps, video embeds, heavy chart libraries on a comparison page.
- **Metadata**: define per-route `metadata`/`generateMetadata` for SEO but keep it derived from already-fetched data — don't trigger a second data fetch just for `<head>` tags.
- **Edge Runtime**: use for latency-sensitive routes (e.g., geo-based redirects, A/B test bucketing at the edge) but keep the bulk of page rendering on the default Node runtime unless there's a specific edge-latency win.

## 10. Vercel & Edge Optimization

- Deploy behind Vercel's global Edge Network; verify static assets and optimized images use `Cache-Control: public, max-age=31536000, immutable`.
- Use `stale-while-revalidate` + ISR for HTML so pages serve instantly from cache while regenerating in the background.
- Verify cache invalidation on deploy: confirm new deploys bust the correct cache keys (Next.js does this automatically for build-hashed assets; double-check ISR revalidation windows are appropriate per page type).
- Use **Vercel Speed Insights / Analytics** as the primary field-data (RUM) source; it's already wired into the deploy pipeline and segments by real device/geography — prefer it over standing up a separate RUM tool.
- **Deployment verification step**: after every deploy, run a synthetic Lighthouse pass against the production URL (not just preview) before considering the deploy "done" — preview deployments can have different edge cache behavior than production.

## 11. Performance Budgets

| Resource | Budget |
|---|---|
| JavaScript (initial, gzipped) | < 200 KB |
| CSS (gzipped) | < 50 KB |
| Images (total per page) | < 500 KB |
| Fonts | < 100 KB |
| Third-party JS | < 100 KB / < 50ms TBT per script |
| Total page weight | < 1.5 MB |
| Initial requests | < 30 |
| Lighthouse Performance | ≥ 90 |
| LCP | ≤ 2.5s |
| CLS | ≤ 0.1 |
| INP | ≤ 200ms |

**Enforcement**: budgets are meaningless without CI gates — see Section 12. Any PR that regresses a budgeted metric should fail the build, not just log a warning.

## 12. CI/CD Enforcement

Wire **Lighthouse CI** into the GitHub Actions / Vercel pipeline so regressions fail the PR rather than reach production:

```yaml
# .github/workflows/performance.yml
name: Performance Check
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: https://staging.uniqbrio.com/
          budgetPath: ./lighthouse-budget.json
```

```json
{
  "budgets": [{
    "path": "/*",
    "resourceCounts": [
      { "resourceType": "script", "budget": 15 },
      { "resourceType": "image", "budget": 25 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "budget": 200 },
      { "resourceType": "image", "budget": 300 }
    ],
    "timings": [
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "cumulative-layout-shift", "budget": 0.1 },
      { "metric": "interaction-to-next-paint", "budget": 200 },
      { "metric": "total-blocking-time", "budget": 200 }
    ]
  }]
}
```

- **Build fails** if any budget is breached by more than 5%.
- Track trend over time via a dashboard (Vercel Analytics or a Lighthouse CI server) — a single-PR check catches spikes but not slow creep across many small PRs.
- Alert the team when a merged PR degrades field CWV data (Search Console / Vercel Analytics), not just lab data — lab and field can diverge.

## 13. SEO Relationship — what CWV does and doesn't influence

**Influences:**
- Crawl efficiency: faster pages let Googlebot crawl more URLs within the same crawl budget.
- Mobile-first ranking signal: Core Web Vitals is a confirmed page-experience ranking factor, more so on mobile search.
- Bounce rate / engagement: slow pages measurably increase bounce rate, which indirectly hurts rankings and directly hurts conversion.

**Does NOT influence:**
- Content quality, topical relevance, or keyword targeting — CWV is a tie-breaker/experience signal, not a substitute for good content or the primary ranking factor.
- Backlink profile or domain authority.
- Structured data / schema correctness (that's `seo-technical-audit-specialist` territory, not this skill's).

## 14. Accessibility — a hard constraint, not a tradeoff

**Performance work must never reduce accessibility.** If a proposed optimization removes an `aria-label`, drops semantic HTML in favor of a `<div>` soup for marginal bundle savings, breaks keyboard focus order, or removes screen-reader text to save bytes — reject the optimization. Accessibility takes precedence over raw performance metrics: use `next/font` and semantic HTML to get both good CWV *and* good accessibility rather than trading one for the other. Always verify `alt` text remains meaningful on the hero image even after art-direction/format changes, and confirm `prefers-reduced-motion` is respected before shipping new animations introduced "for perceived performance."

## 15. Troubleshooting Playbook

| Symptom | Likely Cause | Fix |
|---|---|---|
| Poor LCP | Render-blocking resources ahead of hero | Defer/async non-critical CSS/JS; move critical CSS inline |
| Poor LCP | Slow TTFB | Optimize backend/DB queries feeding the page; switch SSR → ISR; add CDN caching |
| Poor LCP | Unoptimized/lazy hero image | `next/image` + `priority` + AVIF/WebP |
| Poor CLS | Missing image dimensions | Add `width`/`height` or `fill` + aspect-ratio container |
| Poor CLS | Web font swap causes reflow | `next/font` with metric-matched fallback |
| Poor CLS | Late-inserted dynamic content (banners, ads, consent UI) | Reserve `min-height` before content resolves |
| Poor INP | Heavy JS blocking main thread | Code-split, break up long tasks, move work off the main thread |
| Poor INP | Expensive re-renders on interaction | `memo`/`useMemo`/`useCallback`, `useTransition` |
| Poor INP | Synchronous third-party scripts | Switch to `lazyOnload` or interaction-triggered loading |
| Field data worse than lab data | Real users on low-end Android / slow networks | Prioritize fixes validated on throttled mobile, not just desktop Lighthouse |

## 16. Prioritization Framework

Rank every proposed fix by **impact × confidence ÷ effort**. As a rule of thumb on a marketing site, this order almost always holds:

1. Compress/convert the hero image to AVIF + `priority` (highest impact, lowest effort)
2. Switch all fonts to `next/font`
3. Add missing image `width`/`height` across the site (fast CLS win)
4. Move non-essential third-party scripts to `lazyOnload`/interaction-triggered
5. Code-split below-the-fold interactive widgets
6. Reduce Client Component surface area / hydration cost
7. Backend/query optimization affecting TTFB (higher effort, coordinate with backend work)

## 17. Review Checklists

**Pre-deployment LCP checklist**
- [ ] Hero/LCP element uses `<Image priority>` (or equivalent `fetchpriority="high"`)
- [ ] No render-blocking CSS/JS delays the initial shell
- [ ] LCP element is in the initial server-rendered payload, not behind a slow `Suspense` fallback
- [ ] Image CDN + font origin are preconnected

**Pre-deployment CLS checklist**
- [ ] Every image has explicit dimensions or an aspect-ratio-locked container
- [ ] All fonts loaded via `next/font` with `display: swap`
- [ ] Dynamic widgets/embeds/consent banners have reserved space
- [ ] No hydration mismatches between server and client markup

**Pre-deployment INP checklist**
- [ ] Client Component surface area is minimized
- [ ] Heavy third-party scripts are `lazyOnload` or interaction-triggered
- [ ] No Long Tasks (>50ms) during a recorded interaction in DevTools
- [ ] Expensive interactions use `startTransition`/`useDeferredValue` where appropriate

**General release gate**
- [ ] Lighthouse ≥ 90 (mobile) on the changed route
- [ ] Budgets pass in Lighthouse CI
- [ ] Vercel Analytics field data checked 24–48h post-deploy for regressions
- [ ] Accessibility checklist unaffected (alt text, semantic HTML, keyboard, contrast)

## 18. Cross-Skill Collaboration Boundaries

This skill owns rendering, asset delivery, and client-side execution performance for the **marketing site specifically**. Defer or coordinate as follows:

- **`performance-audit-expert`** — owns the initial discovery/baseline audit and cross-cutting performance review across the whole platform (including the app, not just marketing). This skill executes CWV-specific fixes on top of that baseline.
- **`performance-optimization-expert`** — owns deep backend/query optimization (Supabase, TTFB-affecting work) and low-end-Android-focused work on the **React Native Expo app**; coordinate when a marketing-site LCP issue traces back to a slow API/DB query.
- **`seo-technical-audit-specialist`** (or equivalent SEO skill) — owns metadata, structured data, canonical tags, and crawlability; coordinate to ensure CWV fixes never break schema markup or robots directives.
- **`nextjs-architect`** — owns architectural decisions (routing strategy, Server/Client Component boundaries at a system level, caching architecture); this skill optimizes performance *within* that established architecture rather than re-deciding it.
- **`accessibility-specialist` / `accessibility-implementation-expert`** — final authority whenever a performance fix and an accessibility requirement appear to conflict; this skill never overrides that call.

## 19. Deliverables This Skill Produces

When invoked, this skill should be able to: review a marketing page or PR and flag CWV risks; diagnose why a specific route is scoring poorly using the workflow in Section 2; recommend concrete, prioritized fixes (Section 16); review a Lighthouse/PageSpeed report and translate it into an action list; propose an implementation plan with code; define/enforce performance budgets; and produce a Go/No-Go performance verdict for a release, escalating to the cross-referenced skills above when the root cause sits outside this skill's boundary.
