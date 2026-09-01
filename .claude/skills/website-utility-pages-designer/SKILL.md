---
name: website-utility-pages-designer
description: Designs the UniqBrio marketing website's utility pages (404, 500/error, maintenance, thank-you/confirmation, unsubscribe) as conversion-preserving, brand-consistent, honest experiences with correct HTTP behavior, analytics, accessibility, and SEO correctness instead of dead ends.
when_to_use: Use when designing, implementing, auditing, or refactoring any 404, error, maintenance, thank-you/confirmation, or unsubscribe page for the UniqBrio Next.js App Router marketing site.
---

# Website Utility Pages Designer

## Purpose & Core Philosophy

Utility pages — 404, 500/error, maintenance, thank-you/confirmation, unsubscribe — are **funnel checkpoints, not dead ends or isolated technical pages**. Every visitor who reaches one has already invested attention and acquisition effort; the goal is **interruption recovery**, not error presentation. This skill treats every utility page as part of the conversion funnel: reduce abandonment, preserve trust, recover lost users, maintain brand personality, provide clear next actions, support analytics, preserve SEO quality, avoid accidental indexing problems, remain accessible, and work mobile-first.

## Project Context & Constraints

- Public marketing website, **pre-login only**; India-first B2B SaaS academy-management software for arts and sports academies (dance/music schools, sports academies), mostly Tier 2/3 Indian cities; decision-makers ~30–50, heavy mobile + WhatsApp usage.
- Stack: Next.js App Router, React, TypeScript, Tailwind CSS, React Native Expo PWA, Supabase (PostgreSQL + Edge Functions), Vercel.
- Early-stage: **only two real customers exist today.**

### The `app_reality.md` Principle (Mandatory, Non-Negotiable)
Never invent or fabricate: testimonials, customer counts, awards, reviews, certifications, logos, media mentions, adoption statistics, "live" activity. If a trust claim cannot be truthfully made, **explicitly avoid it** and substitute honest alternatives: product education, transparent process explanation, documentation, feature walkthroughs, onboarding guidance. Honesty converts better than fabricated trust, and it is a hard requirement, not a style preference.

## Responsibilities, Inputs, Outputs

**Responsibilities**: utility-page UX and information architecture; copywriting and CTA strategy; recovery-flow design; HTTP status correctness; SEO indexability and crawl-budget protection; analytics event design and KPI mapping; accessibility and responsive behavior; Next.js App Router implementation patterns; coordination with related skills.

**Not owned by this skill** (delegate instead): full design-system tokens (`existing-ui-consistency-checker`), in-product component-level error/empty states (`error-state-specialist`, `empty-state-specialist`), broader conversion optimization (`conversion-ux-specialist`), full pre-launch site QA (`website-launch-qa-checklist-specialist`).

**Inputs**: brand voice/design tokens, existing component library, primary conversion goals (demo booking, email capture, WhatsApp), analytics provider, support channels, status-page URL (if any), high-value pages for recovery links.

**Outputs**: page anatomy/wireframe, recommended copy blocks, HTTP status/header requirements, analytics event schema, accessibility checklist results, Next.js implementation code, QA verification list, decision matrix for edge cases.

## Core Design Principles

| Principle | Requirement |
|---|---|
| Clarity | Explain what happened simply, in 1–3 sentences |
| Confidence | Never create panic; never blame the user |
| Recovery | Always provide at least one clear next action |
| Honesty | Never exaggerate, never fabricate proof or urgency |
| Accessibility | Everyone can recover — keyboard, screen reader, low vision |
| Consistency | Feels like the same product/brand, in success and failure alike |
| Performance | Loads fast even under degraded network/server conditions |
| Mobile-first | Designed for phones first, ≥44–48 px touch targets |
| Analytics | Every utility page is measurable |
| SEO correctness | Proper status codes, indexing directives, no soft 404s |

## HTTP Status Codes & Technical SEO

| Page Type | Status | Caching | Robots / Indexing | Notes |
|---|---|---|---|---|
| 404 Not Found | `404` | `no-store` | Generally allow crawl, don't force-index | Never return 200 with "not found" copy (soft 404) |
| 410 Gone (intentional permanent removal) | `410` | `no-store` | `noindex` | Search engines de-index faster than plain 404 |
| 500 Internal Error | `500` | `no-store` | `noindex, nofollow` | Temporary; don't let bots overwrite good cached indexes |
| 502 Bad Gateway | `502` | `no-store` | `noindex, nofollow` | Upstream/proxy failure; include retry guidance |
| 503 Maintenance/Unavailable | `503` + `Retry-After` | `no-store` | `noindex, nofollow` | Mandatory for both emergency and scheduled maintenance |
| Thank-you / Confirmation | `200` | `no-store` (dynamic) | `noindex, nofollow` (usually) | Prevents false conversion counts from organic search hits |
| Unsubscribe | `200` after update | `no-store` | `noindex, nofollow` | — |

**Critical rules**
- **Never** return `200 OK` for a missing page ("soft 404") — it wastes crawl budget, pollutes the index, and hides broken links from your own reporting.
- Use `410` instead of `404` for content you intentionally and permanently retired (old campaigns/landing pages) — search engines drop 410s faster.
- `Retry-After` (seconds or HTTP-date) must accompany every `503`, e.g. `Retry-After: 3600` or `Retry-After: Fri, 31 Jul 2026 04:00:00 GMT`.
- Do not invent canonical tags pointing error pages at the homepage; don't apply blanket `noindex` overrides to 404s beyond what's needed.
- Redirects: `301`/`308` for permanent moves, `302`/`307` for temporary; avoid redirect chains.

## Utility Page Specifications

### 404 — Not Found

**Goal**: recover the visitor quickly, protect SEO, surface broken-link intelligence, never blame the user.

**Anatomy**: minimal top nav (logo, primary links) → simple on-brand illustration/icon → calm headline → 1–2 sentence explanation → primary CTA → secondary CTA(s)/text links → search (if the site has enough content to justify it) → popular destinations / top-nav shortcuts → optional sitemap link → contextual recommendation (based on path/referrer) → support contact (WhatsApp/email) → footer.

**Headline strategy**
- Good: "We couldn't find that page," "Page not found," "This page doesn't exist," "Looks like this link is outdated."
- Poor/avoid: "Error 404!!", "Oopsie!", "You broke it," "LOL," sarcasm, jokes about hamsters/monkeys, anything blaming the user or undermining B2B credibility.

**Tone**: calm, helpful, professional, reassuring — never sarcastic, childish, or blaming. Academy owners are serious decision-makers; joke-heavy 404 copy measurably reduces trust in an early-stage, unproven product.

**Primary CTA** (pick one): "Go to Homepage," "Book a Demo," "Explore Features/Product." Never bare "Back" with no destination context.

**Secondary CTAs**: Pricing, Features, Contact/WhatsApp, Blog/Resources, FAQ, Sitemap — chosen from real analytics-driven popular pages, not arbitrary picks.

**Search**: recommended if the site has enough content (docs, blog, multiple product pages) to return useful results; track queries and successful-recovery rate. Skip if the site is small enough that search would mostly return nothing.

**Navigation recovery**: preserve top nav and footer; use contextual suggestions when the broken path hints at intent (`/pricing/...` → suggest Pricing; `/blog/...` → suggest Blog). "Recently viewed" recovery is optional and only where session storage is used responsibly — never persist sensitive data.

**Illustrations/icons**: simple, calm, on-brand, minimalist. Avoid chaotic mascots, memes, crying characters, or anything culturally mismatched with the Indian B2B audience.

**Good messaging examples**
- "We couldn't find that page. The link may be outdated or mistyped — let's get you back on track."
- "This page doesn't exist. Try the homepage or search for what you need."

**Poor messaging examples**
- "You obviously typed it wrong." / "Oopsie Daisy!" / "Our server hamsters fell asleep." / "HTTP 404 Not Found — the requested resource could not be located." (too technical for this audience)

**Soft 404s, crawl budget, indexability**: soft 404s (200 + "not found" copy) cause search engines to index broken pages, waste crawl budget, and degrade site-quality signals. Always return a real `404`. Monitor Search Console 404 reports; fix high-volume broken URLs at the source (redirect or restore content) rather than only polishing the 404 page.

### 500 / Internal Server Error & Generic Error Pages

**Goal**: preserve confidence, never expose internals, always offer retry + escalation.

**Anatomy**: minimal chrome → calm headline → user-safe explanation → retry/refresh action → homepage link → support contact → optional status-page link → optional opaque error-reference ID (for support triage, not technical detail).

**Messaging**: "Something went wrong on our end. Please try again in a moment." / "We're experiencing technical difficulties — your data is safe." Never expose stack traces, database errors, file paths, or framework internals. For this audience specifically, reassure that student records, attendance, and billing data are unaffected — server errors can trigger real anxiety about data loss for a small business owner.

**Recovery actions**: primary "Try again" (reset error boundary / reload), secondary "Homepage," tertiary "Contact support" (WhatsApp preferred for this audience) and/or status page.

**Accessibility**: focus moves to the heading or retry button on load; use `role="alert"`/`aria-live="assertive"` on client error boundaries so screen readers announce the failure immediately.

### Maintenance Pages (Unplanned & Scheduled)

**Goal**: maintain trust through radical transparency.

**Include**: honest explanation of what's happening, expected duration/ETA (only if genuinely known), status updates, status-page link if one exists, contact/emergency methods (WhatsApp/email/phone), explicit timezone (state IST for this audience).

**Never**: fake countdown timers, "back in 5 minutes" claims you can't guarantee, "almost done" when just starting, silently declaring "maintenance complete" before confirmed.

**Scheduled maintenance** additionally states: start date/time and expected end time (IST), affected vs. unaffected services/features, and what's being improved — without promising exact recovery times you cannot guarantee.

**Trust-building language**: "We understand this may be inconvenient — thank you for your patience." "If you need urgent help with today's class schedule, contact us on WhatsApp at [number]."

### Thank-You & Confirmation Pages — "Next-Step Engines"

**Core principle**: the moment right after conversion is the highest-engagement moment a visitor will ever have. Never end it with only "Thanks!" — guide the user to the next highest-value action, and set realistic expectations about what happens next.

**Recommended next-step options** (choose based on the triggering action): book/confirm a demo (with calendar link and IST-appropriate time slots), schedule onboarding with a visible progress indicator, download a genuinely available resource, join a WhatsApp updates/onboarding group, verify email (with resend + "check spam" guidance), watch a short product-education video, explore documentation/getting-started guide, share with a colleague (referral, only if a real mechanism exists), confirm newsletter frequency/topic expectations.

**Structure**: success confirmation (headline + short body) → realistic "what happens next" (specific: "We'll call you at your chosen time from an Indian mobile number") → primary next-step CTA → secondary/tertiary supporting actions (progressive disclosure — don't show five equal-weight CTAs) → optional onboarding progress indicator (Step 1 ✓ → Step 2 → Step 3).

**Rules**: never invent social proof ("Join 10,000 academies"); state real, verifiable timelines only ("Our team will respond within 24 hours," honestly reflecting a two-person team); keep success tone warm but professional, not overly celebratory for a serious B2B buyer.

### Unsubscribe Pages

**Goal**: preserve goodwill, stay compliant, leave the door open — never punish the user for leaving.

**Include**: immediate respectful confirmation, preference management (not just a binary unsubscribe) — reduce frequency, select topics, temporary pause (30/60/90 days) — optional low-friction feedback ("Why are you leaving?" never required), one-click resubscribe.

**Never**: guilt language ("We're sad to see you go," "You'll miss out"), dark patterns hiding the unsubscribe action, multiple obstructive confirmation steps, pre-checked "keep me subscribed" tricks.

**Good patterns**: "You're unsubscribed. You can resubscribe anytime." / "Prefer fewer emails? Choose a lower frequency instead of leaving completely."

**Compliance**: honor the request immediately; confirm which email address is being updated; respect applicable regulations (India's DPDP Act and, if relevant audiences exist, GDPR/CAN-SPAM); provide a clear, unambiguous success state.

## Analytics Instrumentation

Every utility page must emit structured events so the team can detect broken campaigns, dead backlinks, navigation issues, and abandoned flows — not just count pageviews.

### Core Event Schema

| Event | Key Properties | Purpose |
|---|---|---|
| `utility_page_viewed` | `page_type`, `path`, `referrer`, `status_code`, `utm_*` | Baseline volume & source |
| `error_404_viewed` | `requested_path`, `referrer`, `utm_*` | Broken links / campaigns |
| `error_500_viewed` | `path`, `error_id` (opaque) | Reliability signal |
| `maintenance_viewed` | `type` (scheduled/emergency), `expected_end` | Impact measurement |
| `thank_you_viewed` | `source_form`, `conversion_type` | Conversion confirmation |
| `unsubscribe_completed` | `action` (full/frequency/topic/pause), `reason` (optional) | List health |
| `utility_cta_clicked` | `page_type`, `cta_id`, `destination` | Recovery effectiveness |
| `utility_search_used` | `query`, `results_count`, `page_type` | Search-recovery value |
| `support_clicked` / `retry_attempted` | `page_type`, `channel` | Escalation / persistence |

### What analytics should surface
- Spike in 404s tied to specific UTMs → a broken marketing campaign or landing page.
- 404s with internal referrers → internal linking debt to fix in navigation/footer.
- 404s with external referrers → broken backlinks to redirect or reach out about.
- Low CTA click-through on 404 → weak recovery design needing iteration.
- High maintenance-page traffic + long duration → a communication gap, not just a technical one.
- Thank-you views with no subsequent onboarding events → drop-off after form submission.

**Recommended dashboards/KPIs**: 404 volume by path/referrer with recovery-CTA click-through rate; thank-you → next-step completion rate; unsubscribe reason distribution; support-click volume from error pages; target 404 recovery rate trending up, 404 rate <2% of total visits, 500 error rate <0.1%, thank-you → next-step CTR >40%, unsubscribe "downgrade instead of full exit" rate >15%.

## Accessibility

Semantic HTML (single `<h1>`, `<main>`/`<nav>` landmarks) · full keyboard navigability with visible focus rings · screen-reader-friendly link text and `aria-hidden` on decorative illustrations · contrast ≥4.5:1 body text (≥3:1 large text) · focus moves to the main heading (or retry button on errors) after load · respects `prefers-reduced-motion` (no auto-playing animation) · touch targets ≥44–48 px on mobile · labeled form controls on preference/unsubscribe pages · correct `lang` attribute; copy kept concise and translation-ready for eventual localization.

## Brand Consistency

Utility pages must feel like the same product as the rest of the marketing site: matching typography, spacing, color tokens, illustration/iconography style, and CTA hierarchy (one primary + one secondary max on most utility pages). Tone varies appropriately by state — calm/reassuring on failure, warm/encouraging on success — but voice, vocabulary, and visual language stay consistent across both. Never let a utility page look like a template bolted onto a different product.

## Next.js App Router Implementation

**File conventions**: `app/not-found.tsx` (real 404 status, not a soft 200), `app/error.tsx` (segment-level boundary), `app/global-error.tsx` (root-level catastrophic failure — keep this lightweight and independent of complex context providers, since if a data provider itself crashes, a heavy error page can fail to render at all).

```tsx
// app/not-found.tsx
import Link from 'next/link';
export const metadata = { title: 'Page Not Found', robots: { index: false, follow: true } };
export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">We couldn't find that page</h1>
      <p className="text-slate-600 mb-6">The link may be outdated or mistyped.</p>
      <div className="flex gap-3">
        <Link href="/" className="px-5 py-3 rounded-lg bg-indigo-600 text-white">Go to Homepage</Link>
        <Link href="/contact" className="px-5 py-3 rounded-lg border">Contact Support</Link>
      </div>
    </main>
  );
}
```

```tsx
// app/error.tsx
'use client';
import { useEffect } from 'react';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Unhandled error:', error); }, [error]);
  return (
    <main role="alert" aria-live="assertive" className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      <p className="text-slate-600 mb-6">An unexpected error occurred. Your data is safe. Please try again.</p>
      <button onClick={() => reset()} className="px-5 py-3 rounded-lg bg-indigo-600 text-white">Try Again</button>
    </main>
  );
}
```

**Practices**: ensure `not-found.tsx` results in a real 404, not a cached 200; implement maintenance via Edge Middleware or a feature-flagged route capable of returning `503`; keep error/maintenance pages lightweight (minimal client JS) since they must render reliably even when core services fail; never cache dynamic error/maintenance responses (`Cache-Control: no-store`) so a resolved incident doesn't keep serving a stale error page; fire analytics client-side after hydration or via server-side logging for 5xx; verify status codes with `curl -I`, not just visual inspection.

## Common Mistakes & Anti-Patterns

Returning `200` for missing pages (soft 404) · joke-heavy/meme copy on error states · dead ends with no recovery path · exposing stack traces or internal error details · fake "back in 5 minutes" maintenance claims · fake countdown timers · guilt-trip unsubscribe copy · thank-you pages that say only "Thanks" with no next step · missing analytics instrumentation on utility pages · caching error/maintenance pages so a fix doesn't reach users · inventing social proof, customer counts, or urgency · multiple competing primary CTAs · desktop-only layouts breaking on mid-range Android.

## QA Checklist (Run for Every Utility Page)

**HTTP & technical**: correct status code verified via `curl -I`; no soft 404; `Retry-After` present on 503 when ETA known; no stack traces/sensitive data in HTML; page loads under degraded network/server conditions.

**Content & UX**: non-blaming, clear headline; ≥1 primary recovery/next-step CTA; secondary paths present (support, homepage, search); zero invented claims or social proof; tone matches brand; mobile layout usable and hierarchical.

**Accessibility**: semantic structure, single `<h1>`; keyboard navigable with visible focus; sufficient contrast; decorative images hidden from screen readers; touch targets adequate.

**Analytics**: pageview event fires with correct properties; CTA clicks instrumented; referrer/path captured on 404.

**SEO**: status code correct; no accidental indexing of temporary content; no broken internal links introduced by the utility page itself.

**Cross-device**: tested on mobile Chrome (Android) and Safari iOS; works with reduced-motion preference; readable at 320px without horizontal scroll.

## Decision Frameworks

**410 vs 404**: use `410` for intentional, permanent removal (old campaigns, deprecated pages); use `404` for unknown/temporary absence.

**Add search on 404?**: yes if the site has substantial content (blog, docs, many product pages); skip on a small site where search would return little.

**Primary CTA on 404**: high-intent traffic → "Book a demo"/"See pricing"; broad/organic traffic → "Go to homepage" + popular links.

**Thank-you next-step priority**: 1) highest-value conversion action available (demo, WhatsApp) → 2) realistic expectation-setting → 3) educational/resource content → 4) soft referral or share.

**Is this maintenance planned or emergency?**: planned → scheduled-maintenance page with explicit IST windows; unplanned → generic maintenance page with honest, evolving status updates.

## Coordination with Related Skills

| Related skill | Handoff |
|---|---|
| `error-state-specialist` | In-product, component-level, or inline validation/error states (this skill owns full-page, pre-login utility experiences) |
| `empty-state-specialist` | Zero-data/first-use views inside the authenticated product dashboard |
| `conversion-ux-specialist` | Broader CTA hierarchy, funnel psychology, and micro-copy coordination |
| `website-launch-qa-checklist-specialist` | Final pre-launch verification of routing, HTTP responses, analytics, accessibility, SEO |
| `existing-ui-consistency-checker` | Confirming typography, spacing, components, and tone match the wider marketing site |

## Success Criteria

A utility page succeeds when: users recover or continue in one or two clicks; trust is preserved or increased, never eroded; analytics reveal actionable broken paths; HTTP behavior is correct for crawlers and browsers; accessibility requirements are met; no fabricated claims appear anywhere on the page; and the page contributes positively to the overall conversion funnel rather than acting as a dead end.
