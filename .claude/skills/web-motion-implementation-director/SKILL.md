---
name: web-motion-implementation-director
description: Directs production implementation of all website motion — scroll-triggered reveals, animated hero product-dashboard sequences, micro-transitions, and interaction animations — in Next.js for UniqBrio's public marketing site, selecting the correct technique among CSS transitions/transforms/keyframes, Framer Motion, Motion One, SVG animation, Lottie, HTML5 video, canvas, WebGL, or no animation, while enforcing strict performance, accessibility, and Core Web Vitals budgets so that motion increases comprehension and conversion rather than merely decorating the page.
when_to_use: Invoke whenever implementing, architecting, or reviewing any animation, transition, scroll effect, hero sequence, micro-interaction, or motion-related pull request on the UniqBrio Next.js App Router marketing website.
---

# Web Motion Implementation Director

Official engineering standard, architectural decision guide, performance policy, and implementation handbook for all motion on the UniqBrio public marketing website (Next.js App Router, React, TypeScript, Tailwind CSS, Vercel). This is separate from the React Native Expo PWA product application.

**Context this skill operates in:** India-first B2B SaaS for arts and sports academy management. Audience is academy owners, age 30–50, in Tier 2/Tier 3 Indian cities, typically on budget Android devices over 3G/4G. Primary conversion goals: demo bookings, signups, ROI calculator usage, audit completion, landing-page conversions. The business is early-stage with two real customers today — motion must never be used to imply scale, traction, or proof that doesn't exist. Never let an animation display, imply, or accelerate attention toward a fabricated metric, testimonial, customer count, logo, or review. Every claim rendered inside an animated element must comply with `app_reality.md` exactly as if it were static text.

## 1. Motion Philosophy

Motion is a functional UI layer, not decoration. Every animation must exist to:

- **Direct attention** to the next meaningful action or piece of information.
- **Reinforce hierarchy** — what matters most should visually announce itself first.
- **Explain the product** — motion can demonstrate a workflow faster than a paragraph.
- **Improve comprehension** of complex data, state changes, or sequences.
- **Increase perceived quality** and trust in a bootstrapped, early-stage brand.
- **Improve delight** in small, non-distracting ways.
- **Improve conversion** toward demo bookings, signups, ROI calculator use, and audits.

Motion does **not** exist to impress designers, engineers, or the team itself.

**Non-negotiable principles:**

1. Motion communicates meaning — it is never purely decorative.
2. Every animation requires an explicit, documented purpose before it is built.
3. Motion must reduce cognitive load, never increase it.
4. Motion must never compete with content, copy, or the primary CTA for attention.
5. Motion must be functionally invisible when disabled (`prefers-reduced-motion`, low-end devices, slow networks) — the page must still fully communicate its message with zero animation.
6. A fast website converts better than a flashy website. When in doubt, cut the animation.
7. Accessibility overrides aesthetics, without exception.
8. Performance overrides novelty, without exception.
9. No animation is a valid, often correct, answer.
10. Prefer the lightest technique capable of achieving the goal — never reach for a heavier tool because it's more interesting to build.
11. Measure everything. Gut feeling about "does it feel nice" is not evidence; Lighthouse, WebPageTest, and real-device testing are.

## 2. Motion Decision Framework

Evaluate every animated element against this decision order before writing code:

1. **Can it be static?** → Use no animation.
2. **Is it a simple state change (hover, focus, toggle)?** → CSS transition.
3. **Does it need to move without triggering layout (translate/scale/rotate)?** → CSS transform + transition.
4. **Is it a bounded, repeatable loop (pulse, shimmer, spinner)?** → CSS keyframes.
5. **Does it need coordinated multi-element orchestration, shared layout transitions, drag, or gesture handling that CSS genuinely cannot express?** → Motion One first; Framer Motion only if Motion One is insufficient.
6. **Is it an icon, line-draw, progress ring, or scalable vector illustration?** → SVG animation.
7. **Is it a complex, bespoke vector illustration that cannot reasonably be built in CSS/SVG?** → Lottie, only after a budget check.
8. **Does it need to show realistic, high-fidelity UI motion (a dashboard walkthrough) for comprehension?** → HTML5 video with poster image.
9. **Is it a real-time data visualization, particle system, or 3D element?** → Canvas, or WebGL only if Canvas is insufficient — and only off the critical marketing path.
10. **Nothing above justifies the technique?** → Reject the animation.

### Decision Matrix

| Technique | Ideal use cases | Anti-patterns | Bundle impact | GPU / CPU | A11y implications | SSR / hydration | SEO | Maintainability | Recommended limits |
|---|---|---|---|---|---|---|---|---|---|
| **CSS transitions** | Hover, focus, active states, button feedback, simple single-property state changes | Multi-step orchestration, route transitions, complex sequencing | 0 KB | Low CPU, high GPU (transform/opacity) | Excellent — respects `prefers-reduced-motion` easily | Perfect, zero hydration cost | None | Highest | Unlimited for genuine micro-interactions |
| **CSS transforms** | Translate/scale/rotate movement, hover lift, entrance reveals that don't affect layout | Animating layout-triggering properties (top/left/width/height) | 0 KB | Low CPU, high GPU | Excellent | Perfect | None | Highest | Always prefer over layout-based movement |
| **CSS keyframes** | Loaders, shimmer, subtle pulses, one-shot entrance animations, native CSS scroll-driven animations | Long decorative loops, data-driven or drag-based motion, complex orchestration | 0 KB | Low–medium CPU | Good — must still gate behind `prefers-reduced-motion` | Perfect | None | High | ≤3 simultaneous non-critical loops per view |
| **Framer Motion** | Shared layout animations, staggered multi-element reveals, gesture/drag interactions, complex exit animations, scroll-linked choreography CSS cannot express | Simple hovers, single fades, decorative loops, use on every button/card | ~30–50 KB gzipped (tree-shake with `LazyMotion` + `domAnimation`) | Medium CPU/GPU | Good with `useReducedMotion()`; risk of focus traps if misused | Client-only; requires `"use client"` and dynamic import to avoid hydration cost on critical path | Neutral if static content renders first | Medium — isolate into wrapper components and shared variant files | ≤1 major sequence on the hero; ≤3–5 Framer instances per page |
| **Motion One** | Lightweight WAAPI-based timelines and declarative animation where Framer Motion's weight isn't justified | Complex shared-layout or gesture-heavy work Framer handles natively | ~3 KB gzipped | Low–medium CPU | Good | Lower hydration cost than Framer | Neutral | Medium | Prefer over Framer whenever it's sufficient |
| **SVG animation (SMIL/CSS/JS)** | Icons, logos, line-draws, progress rings, simple data visualizations | Complex character animation, realistic UI recreation, oversized SVGs | 0–few KB | Low CPU | Good — requires `aria-hidden` or proper titles/labels | Good | Neutral | High when modularized | Animated SVG ≤15–50 KB compressed |
| **Lottie** | Bespoke brand illustrations, onboarding sequences that cannot be reproduced in CSS/video | Hero backgrounds, decorative loops, icons, anything above the fold without justification | JSON size + player (~50–100 KB runtime, often 100 KB–2 MB+ uncompressed JSON) | High CPU/GPU/memory | Poor by default — needs static fallback and explicit lazy load | Client-only, high hydration cost | Neutral | Low — requires asset pipeline discipline | Max 1 Lottie per page; JSON ≤80–150 KB; never above the fold without sign-off |
| **HTML5 video** | Product dashboard walkthroughs, realistic multi-step UI demonstrations, brand explainer loops | Transparent overlay decoration, icon-scale motion, autoplay with sound | File size only (no JS parse cost) | Low CPU with hardware decode, low GPU | Good with poster, captions, and controls fallback | Perfect (native tag) | Poor for text-equivalent content — never rely on video for SEO copy | Medium | Hero video ≤800 KB–1.5 MB compressed; ≤8–10 s loop |
| **Canvas** | Real-time charts, particle systems, data-heavy visualizations | Simple UI motion, static marketing sections | Runtime only | High CPU | Poor — requires text/ARIA equivalents | Client-only, high hydration impact | Neutral | Low | Avoid on marketing pages unless data visualization is the actual feature |
| **WebGL** | 3D product renders, advanced GPU-bound visual effects | Any standard marketing page motion | High | Very high GPU | Poor, needs robust fallback | Client-only, very high hydration impact | Neutral | Low | Forbidden on the UniqBrio marketing site by default; requires explicit architectural sign-off |
| **No animation** | Primary CTA, critical headline/body copy, pricing numbers, legal text, form labels, anything the user must trust instantly | Defaulting to "no animation" everywhere out of laziness is also wrong — evaluate deliberately | 0 | 0 | Perfect | Perfect | Best | Highest | Default choice unless a technique above earns its place |

## 3. Weight Budget Policy

Hard engineering budgets for the marketing site. Exceeding any budget requires explicit written sign-off and a documented mitigation plan; the default response is to simplify or remove the animation.

| Budget item | Limit | Enforcement |
|---|---|---|
| Additional JS from all motion libraries (gzipped, per route) | ≤ 45 KB | `@next/bundle-analyzer` in CI; fail build if exceeded |
| Single Lottie JSON asset | ≤ 80–150 KB (optimized) | Build-time asset size check |
| Hero autoplay video (compressed) | ≤ 800 KB–1.5 MB | Asset review + WebPageTest |
| Total animation-related assets on homepage (images + Lottie + video) | ≤ 2.5 MB | Full asset audit |
| Animated SVG | ≤ 15–50 KB | File-size check in PR |
| Simultaneous active (non-micro) animations on screen | ≤ 4–6 | Code review + runtime profiling |
| Framer Motion component instances per page | ≤ 3–5; ≤ 1 major choreography on the hero | Code review / custom lint rule |
| Hero animation critical-path JS + assets | ≤ 200 KB combined | Lighthouse + bundle analysis |
| Homepage total motion-related JS | ≤ 50 KB | Bundle analyzer |
| Animation memory footprint | ≤ 30–50 MB additional heap | Chrome memory profiler |
| Target CPU utilization during animation (mid-tier Android, 4x throttle) | ≤ 20–30% | DevTools Performance panel |
| Target GPU load during animation | ≤ 20–30%; compositor-only (transform/opacity) preferred | DevTools Layers/Rendering panel |

**Enforcement mechanisms:**
- Bundle analysis in CI fails the build when the animation chunk exceeds budget.
- Lighthouse CI gates PRs on Performance score ≥ 90 (mobile) and Core Web Vitals thresholds.
- A build-time script parses Lottie/SVG/video asset sizes and fails the build when oversized.
- Custom ESLint rule restricts importing heavy animation libraries into components rendered on the critical (LCP) path.
- All budgets are measured on a mid-tier Android reference device (e.g., Moto G Power–class or Redmi 9–class), Fast 3G/4G throttling, and Chrome + Safari iOS.
- PR review is the final human gate — reviewers reject animation that isn't budget-compliant even if CI passes on a technicality.

## 4. Hero Animation Architecture

Hero goals: communicate product value in under 3 seconds, protect LCP, and drive the primary CTA (demo booking / signup) — all before any decorative motion begins.

**Elements covered:** animated product dashboard, phone mockups, browser mockups, dashboard reveals, floating cards, notification animations, metric counters, device transitions, animated screenshots.

**Must remain static / never animate:**
- Primary headline (H1) and sub-headline.
- Primary CTA button (except its own hover/focus micro-transition).
- The LCP element itself (hero image or dashboard screenshot) on initial paint.
- Real trust indicators, pricing numbers, and any legally/factually sensitive text.

**May animate, only after LCP has fired:**
- Progressive reveal of dashboard UI chrome or a single key interaction (e.g., a notification appearing, a metric updating).
- Floating cards or metric counters — once, not continuously.
- Notification/toast elements that slide in and settle.
- Cursor or highlight indicators that demonstrate a specific action.
- Device-frame transitions (phone ↔ browser) if they genuinely aid comprehension.

**Implementation strategy:**
1. Render the LCP element (hero image or dashboard poster) as a real `<Image priority>` or optimized static asset with explicit dimensions — never behind client-side JS.
2. Preload the LCP image and any critical fonts (`next/font`, `preload: true`).
3. Defer all motion code with dynamic import (`next/dynamic`, `{ ssr: false }`) so it hydrates only after LCP, ideally gated by `requestIdleCallback` or `IntersectionObserver`.
4. Prefer CSS or a short muted looping video for realistic dashboard motion over rebuilding the UI in Framer Motion.
5. If Framer Motion is used for the hero, cap the total sequence at ~1.8 seconds and pause it entirely when the hero scrolls out of view.
6. Metric counters: lightweight `requestAnimationFrame` or CSS counter that starts only when in view, and jumps straight to the final value under reduced motion — never fabricate the number itself.
7. Floating cards: pure `transform` + `opacity`, capped at 2–3 elements, entrance-only (no continuous float loop afterward).
8. Never animate layout properties in the hero. Only `transform` and `opacity`.

**Asset-strategy summary:**

| Decision | Choice |
|---|---|
| What should preload | LCP hero image/poster, critical fonts |
| What should lazy load | Non-critical decorative motion, below-the-fold Lottie/video |
| What should defer | Heavy Lottie assets, high-bitrate video, all Framer Motion bundles |
| What should hydrate | Only client-dependent data-bound content; never let hydration mismatch the SSR'd hero |
| What should be image-based | Static hero visuals, decorative backgrounds |
| What should be video-based | Long realistic product walkthroughs where fidelity aids comprehension |
| What should be CSS | Micro-interactions, small reveals, hover states |
| What should be Framer Motion | Scroll-linked reveals, staggered entrances, hero-level choreography that CSS cannot express |

**Balancing perceived quality vs. Core Web Vitals:** LCP target ≤ 2.0 s (aim 1.5 s on 4G); CLS < 0.05; INP < 150–200 ms. A beautiful hero that loads instantly beats a flashy hero that delays content — always resolve in favor of speed.

```tsx
// Hero.tsx — static LCP content ships first; motion is lazily attached after paint
import { Suspense, lazy } from 'react';
import HeroStatic from './HeroStatic'; // contains the LCP image, H1, and CTA

const HeroVideo = lazy(() => import('./HeroVideo'));
const HeroFloatingCards = lazy(() => import('./HeroFloatingCards'));

export default function Hero() {
  return (
    <section className="relative min-h-screen">
      <HeroStatic />
      <Suspense fallback={null}>
        <HeroVideo />
        <HeroFloatingCards />
      </Suspense>
    </section>
  );
}
```

## 5. LCP Protection

- Never delay hero content for animation — the headline, sub-headline, CTA, and LCP image must be part of the initial server response with zero client-JS dependency to render.
- No animation library may sit in the hero's critical path.
- No blocking JS before LCP fires.
- No animation executes before LCP — gate any hero motion behind `document.readyState === 'complete'` or `requestIdleCallback`.
- Use `priority` (or `fetchPriority="high"`) on the Next.js `Image` component for the LCP element.
- Fonts: `next/font` with `preload: true` and `font-display: swap`; preload only the weights actually used above the fold.
- Leverage React Server Components and `Suspense` to stream non-critical content.
- Preload the hero poster/image and critical fonts explicitly via `<link rel="preload">`.
- Inline critical CSS needed for hero visibility; defer everything else.
- Animation sequencing: the first frame of any hero motion must exactly match the static LCP image to avoid a visible flash/swap.
- Hydration ordering: static content hydrates first; motion controllers hydrate last, after the hero is fully painted.

## 6. CLS Protection

**Do:**
- Reserve space for every animated or async-loaded element via `aspect-ratio`, fixed `min-height`, or explicit `width`/`height`.
- Use fixed-size containers for hero regions and dashboard mockups.
- Use blur or solid-color image placeholders sized to match the final asset.
- Animate only `transform` (translate/scale/rotate) and `opacity`.
- Position elements that appear/disappear with `absolute`/`fixed` inside a reserved parent, or toggle `opacity`/`pointer-events` rather than inserting/removing DOM nodes.

**Never animate (layout-triggering, forbidden):**
- `top`, `left`, `width`, `height`, `margin`, `padding`, `display` (toggling in/out), `flex`/`grid` properties.
- Do not use `display: none` to hide elements you plan to reveal with animation — use `opacity: 0` + `pointer-events: none` instead.
- Do not change font size or line height during animation.
- Do not insert new DOM nodes mid-animation that push surrounding content.

```tsx
// CLS-safe reveal pattern
<div className="relative w-full h-[400px] overflow-hidden">
  <div className="absolute inset-0 will-change-transform opacity-0 translate-y-10 animate-fade-in-up">
    {/* animated content, space already reserved by parent */}
  </div>
</div>
```

## 7. INP Protection

- Keep main-thread work under ~50 ms per animation frame; avoid long-running Framer Motion timelines or WAAPI sequences during active user input.
- Avoid large, complex timelines — split orchestration into small, modular sequences.
- Prefer `ease-out`/`linear` easing over expensive springs on low-end devices; reserve springs for small, high-value interactions (mobile menu, drag) and always test on throttled hardware.
- Avoid continuous repaint properties (`box-shadow`, `filter`) in favor of `transform`/`opacity`, which are compositor-only.
- Never attach un-throttled `window` scroll listeners; if a scroll listener is unavoidable, mark it `{ passive: true }` and wrap updates in `requestAnimationFrame`.
- Use `IntersectionObserver` for all scroll-triggered activation instead of scroll listeners.
- Debounce/throttle any residual scroll-derived calculations.
- Promote animated elements to their own compositor layer with `transform: translateZ(0)` or `will-change: transform` — but remove `will-change` after the animation completes to avoid memory bloat.

```tsx
useEffect(() => {
  const handleScroll = () => {
    requestAnimationFrame(() => {
      // read/update animation state here, never synchronously in the scroll handler
    });
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

## 8. Scroll Animation System

**Architecture:** A single shared `IntersectionObserver`-based hook drives all scroll reveals; never attach a scroll listener per element.

- Default trigger: `threshold: 0.15–0.2`, `rootMargin: "0px 0px -10% 0px"`, `once: true`.
- `once: true` is mandatory for entrance reveals — do not re-trigger animation when the user scrolls back up; it wastes CPU and annoys users. Reserve replay only for rare, clearly decorative elements.
- Lazy activation: only instantiate observers for sections currently near the viewport; disconnect once triggered.
- Virtualization: for long lists (30+ items — pricing feature lists, testimonial grids), do not attach an observer per item; animate via CSS stagger on the container or virtualize the list itself.
- Cleanup: always disconnect the observer and clear any timers/animation frames on unmount to prevent memory leaks.

```tsx
// hooks/useInViewAnimation.ts
import { useEffect, useRef, useState } from 'react';

interface Options {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function useInViewAnimation({ threshold = 0.15, rootMargin = '0px', once = true }: Options = {}) {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, isInView };
}
```

**Supported patterns and element mapping:**

| Element | Animation | Duration | Stagger | Trigger |
|---|---|---|---|---|
| Feature sections | Fade + slight translateY | 0.5–0.6 s | 0.06–0.1 s | Once |
| Pricing cards | Fade up + scale | 0.5–0.6 s | 0.1–0.15 s | Once |
| FAQ items | Fade + slide down (accordion via grid-rows, not height) | 0.4 s | 0.05 s | Once |
| Testimonials | Fade in | 0.6–0.8 s | 0.15–0.2 s | Once |
| Comparison tables | Slide in from edge | 0.5 s | 0.05 s | Once |
| Logo cloud | Fade + slight translateY | 0.6–0.8 s | 0.05 s | Once |
| Statistics/counters | CSS/RAF counter | 0.8–1.0 s | 0.1 s | Once, in view |

## 9. Product Dashboard Animation Strategy

Goal: help a non-technical academy owner understand the product in seconds, without ever showing fabricated data.

**Preferred order of techniques:**
1. High-quality static screenshot with a subtle CSS highlight/pulse on the key action.
2. Short muted looping video (≤ 8–10 s, ≤ 800 KB–1.5 MB) showing a real workflow.
3. CSS or Framer Motion progressive reveal of UI chrome plus one key interaction.
4. Lottie only if the illustration is custom and cannot be achieved via video or CSS.

**Allowed micro-sequences (after in-view):**
- Cursor moves to a button and "clicks" (brief, single-shot).
- Highlight pulse on a metric, attendance cell, or calendar day.
- A toast/notification (e.g., "payment received", "attendance marked") slides in and settles.
- Graph line-draw via SVG `stroke-dasharray`.
- Calendar day/date-range selection transition.
- Tooltip reveal on a dashboard element.

**Forbidden:**
- Long, multi-minute dashboard tours.
- Auto-playing sound.
- Continuous, aimless cursor wandering.
- Any fabricated data, metric, notification, or count inside the animation — every number and label shown must comply with `app_reality.md` exactly as static copy would.

**Technique selection for dashboard elements:**

| Element | Technique | Reason |
|---|---|---|
| Full product walkthrough | HTML5 video | Realistic, low CPU, high fidelity |
| Partial UI interaction demo | Framer Motion / CSS | Interactive, can pause on hover |
| Notification pop-in | CSS transition/keyframes | Lightweight, simple |
| Graph/line updates | SVG | Scalable, crisp, low weight |
| Calendar transitions | CSS transitions | Simple state-based change |
| Highlight pulses | CSS keyframes | Cheap, loopable, easy to gate behind reduced motion |
| Complex bespoke illustration | Lottie (budget-gated) | Only when CSS/SVG/video can't reproduce it |

## 10. Micro-Interactions

Covers: buttons, cards, links, forms, inputs, checkboxes, toggles, dropdowns, hover states, focus states, CTA buttons, pricing cards, navigation, mobile menu, accordion, tabs.

| Element | Technique | Duration | Easing | Notes |
|---|---|---|---|---|
| Primary CTA hover | CSS transition | 120–180 ms | ease-out | `scale(1.02)` or brightness shift only |
| Primary CTA press | CSS transition | 80–100 ms | ease-in | `scale(0.95–0.98)` |
| Secondary button | CSS transition | 150 ms | ease-out | |
| Cards (hover) | CSS transition | 180–200 ms | ease-out | `translateY(-2px)` + shadow |
| Links | CSS transition | 100–150 ms | ease | Underline or color shift |
| Form inputs (focus) | CSS transition | 150 ms | ease-out | Border color + ring |
| Checkboxes / toggles | CSS transition | 100–150 ms | ease-in-out | |
| Dropdowns | CSS or Framer Motion | 150–200 ms | ease-out | Fade + slide down 8–10px |
| Mobile menu | Framer Motion | 250–300 ms | ease-out / spring | Slide in, trap focus |
| Accordion | CSS grid-rows or Framer Motion | 200–250 ms | ease-out | Animate `grid-template-rows: 0fr → 1fr`, not `height` |
| Tabs | CSS transition | 150 ms | ease | Indicator slide |
| Toast | CSS/Framer | 250 ms in / 200 ms out | ease-out / ease-in | Auto-dismiss 4–6 s |
| Modal | CSS/Framer | 200–300 ms in / 200–250 ms out | ease-out / ease-in | Trap focus, overlay + content staggered slightly |

## 11. Timing Standards

| Category | Duration | Notes |
|---|---|---|
| Hover / focus micro-interaction | 120–180 ms | Never longer |
| Page section reveal (scroll) | 400–600 ms | Once |
| Hero sequence total | ≤ 1800 ms | Starts only after LCP |
| Stagger interval | 40–100 ms | Cap at ~8 items |
| Loading states | Continuous, pausable | Prefer CSS |
| Tooltip show / hide | 150 ms / 100 ms | 300–500 ms show-delay |
| Toast in / visible / out | 250 ms / 4–6 s / 200 ms | |
| Modal open / close | 200–300 ms / 200–250 ms | |
| Success animation | 400–600 ms | |
| Error animation (shake) | 300–400 ms | Subtle — never violent |

## 12. Easing Standards

| Name | Value | When to use |
|---|---|---|
| `linear` | `linear` | Progress bars, color-value syncing only |
| `ease` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Generic fallback; avoid as a deliberate choice — inconsistent feel |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving the screen |
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` (or `cubic-bezier(0, 0, 0.58, 1)`) | Default for entrances and most UI motion |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Symmetric state changes, loaders, toggles |
| `spring` (Framer Motion) | stiffness 300–500, damping 25–40 | Organic feel for drag, mobile menu; avoid bouncy/childish values for this 30–50 audience |
| Custom cubic-bezier | Document the exact curve in the variant file | Reserved for hero sequences with a defined brand feel |

## 13. Mobile Performance Policy

Target: budget Android devices (4–6 GB RAM, mid-tier SoC), variable 3G/4G, thermal throttling under sustained use.

- Automatically simplify or disable non-essential motion when: `navigator.connection.saveData === true`; effective network type is `2g`/`slow-2g`; `navigator.deviceMemory` reports ≤ 4 GB; or a low, discharging battery is detected (where the API is available).
- Prefer CSS over any JS animation library on mobile viewports.
- Disable parallax and continuous decorative loops entirely on mobile — no exceptions.
- Hero video: always ship a static poster; only autoplay when `prefers-reduced-motion: no-preference` and connection quality is adequate — otherwise show the poster with an optional manual play control.
- Reduce stagger item counts and durations by roughly 30% on mobile breakpoints.
- Validate on real Android hardware, not only emulators/simulated throttling.

```tsx
// hooks/useMobileMotion.ts
import { useEffect, useState } from 'react';

export function useMobileMotion() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
}
```

## 14. `prefers-reduced-motion` and Accessibility Strategy

**Global CSS baseline (mandatory, applies site-wide):**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Component-level strategy:**
- Complete disabling: any purely decorative loop (float, parallax, continuous oscillation) must vanish entirely under reduced motion.
- Simplified variants: replace slides, scales, and springs with a simple opacity fade (≤150 ms) or an instant state change.
- Metric counters jump straight to the final value instead of counting up.
- Remove autoplay video motion — show the poster image; keep audio always muted regardless.
- Remove floating elements and parallax entirely, not just slow them down.
- Replace multi-step timelines with the final resolved state.
- Keyboard accessibility and focus order must be identical whether or not motion is active.
- Screen readers must never be interrupted or misled by motion — purely decorative motion gets `aria-hidden="true"`; motion that conveys new information uses `aria-live` appropriately, sparingly.

```tsx
// Component-level reduced-motion gate
'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function AnimatedComponent() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (reduced) return <div>Static content — identical information, no motion</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      Animated content
    </motion.div>
  );
}
```

## 15. Accessibility Rules (Motion Safety)

- No flashing content faster than 3 times per second (seizure risk — WCAG 2.3.1).
- No motion that can trigger vestibular disorders: large-scale parallax, continuous horizontal/vertical drift, aggressive zoom.
- No continuous oscillation or infinite decorative movement running indefinitely in the background.
- No unexpected movement — never move an element the user is about to interact with.
- Focus retention: animating a modal/panel open must move focus into it; closing must return focus to the trigger. Motion must never silently steal or lose keyboard focus.
- Keyboard users must reach every interactive element without waiting for any animation to complete.
- Any looping motion (background video, auto-advancing carousel) lasting longer than ~5 seconds needs a pause/stop control (WCAG 2.2.2).
- Treat WCAG 2.1/2.2 AA as the compliance floor for every animated interface.

## 16. Animation Coding Standards

- Isolate motion into dedicated wrapper components (`<FadeIn>`, `<StaggerChildren>`, `<HeroSequence>`) so parent route components can remain React Server Components wherever possible.
- Mark only the components that truly need client interactivity with `"use client"` — never the whole page.
- Store Framer Motion variants in a separate, shared file (e.g., `lib/animation-variants.ts`); never inline large variant objects in JSX.
- Centralize easing curves in a shared module (e.g., `lib/easing.ts`).
- Use custom hooks (`useInViewAnimation`, `useMobileMotion`, `useReducedMotion`) to encapsulate observer/media-query logic instead of duplicating it per component.
- Tailwind first for utility-driven transitions (`transition duration-150 ease-out hover:scale-105`); use CSS Modules or global CSS only for keyframes not expressible in Tailwind config.
- Dynamic-import all heavy animation code (`next/dynamic(() => import(...), { ssr: false })`) so it never sits in the initial server payload.
- Always clean up observers, timers, and animation frames in `useEffect` return functions — no exceptions.
- Naming: descriptive, intention-revealing (`fadeInUp`, `staggerContainer`), consistent camelCase for TS, kebab-case for CSS classes.

**Suggested folder structure:**

```
src/
├── app/(marketing)/page.tsx
├── components/
│   ├── ui/            (Button, Card, ...)
│   ├── animations/     (FadeIn, SlideIn, ScrollTrigger)
│   └── sections/       (Hero, Features, Pricing)
├── hooks/
│   ├── useInViewAnimation.ts
│   └── useMobileMotion.ts
├── lib/
│   ├── animation-variants.ts
│   └── easing.ts
└── styles/
    ├── animations.css
    └── globals.css
```

```tsx
// components/animations/FadeIn.tsx
'use client';
import { motion } from 'framer-motion';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';

export function FadeIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const { ref, isInView } = useInViewAnimation({ once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

## 17. Framer Motion Usage Policy

**Justified when:**
- Shared layout animations between routes or UI states.
- Complex exit animations (`AnimatePresence`) that CSS cannot cleanly express.
- Orchestrated multi-element stagger sequences with springs.
- Drag/gesture interactions.

**Prefer CSS when:**
- Simple hover, focus, fade, scale, or translate.
- Anything that a single `transition` utility class can accomplish.

**Excessive (reject in review):**
- Wrapping every card, button, or link in `motion.*` for a hover effect.
- Importing Framer Motion on a page that only needs one fade.

```tsx
// Justified: route-level exit/enter choreography
'use client';
import { motion } from 'framer-motion';

export default function AboutPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <h1>About</h1>
    </motion.div>
  );
}

// Excessive: do not do this for a plain button
// <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Click</motion.button>
// → use `transition duration-150 hover:scale-105 active:scale-95` in Tailwind instead
```

## 18. Lottie Usage Policy

- **Acceptable:** a genuinely bespoke brand illustration or onboarding sequence that cannot be reproduced in CSS, SVG, or video, and that fits the budget.
- **Harmful:** hero backgrounds, decorative loops, icons, anything placed above the fold without explicit sign-off.
- **Requirements before shipping any Lottie:**
  - Compress and optimize the JSON (strip unused layers/assets, reduce path precision).
  - Cap frame rate at 30fps.
  - Provide a static image fallback for the loading window and for reduced-motion users.
  - Lazy-load via `IntersectionObserver`; never load the player library on the critical path.
  - Test memory and CPU impact on a mid-tier Android device before merging.

```tsx
// components/LottieAnimation.tsx
'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export function LottieAnimation({ animationData, width = 200, height = 200 }: {
  animationData: unknown; width?: number; height?: number;
}) {
  const [shouldLoad, setShouldLoad] = useState(false);
  useEffect(() => { setShouldLoad(true); }, []);
  if (!shouldLoad) return <div className="bg-gray-200 animate-pulse" style={{ width, height }} />;
  return <Lottie animationData={animationData} loop autoPlay style={{ width, height }} />;
}
```

## 19. Video Usage Policy

Muted autoplay video frequently outperforms hand-built animation for realistic product demos — lower CPU cost, higher fidelity, native hardware decoding.

**Requirements:**
- Provide both WebM (VP9) and MP4 (H.264) sources.
- Always ship a high-quality `poster` image sized to match final dimensions — this can double as the LCP candidate.
- Loop only short sequences (≤ 8–10 s).
- Compress aggressively (ffmpeg/HandBrake) to stay within the 800 KB–1.5 MB hero budget.
- `preload="metadata"` or `"none"` unless the video is the LCP-critical asset.
- `muted`, `loop`, `playsInline` always set — never rely on unmuted autoplay, and never ship autoplay audio.
- Pause playback via `IntersectionObserver` when the video scrolls out of view.
- Respect `prefers-reduced-motion`: show the poster with an optional manual play control instead of autoplaying.

```tsx
// components/HeroVideo.tsx
'use client';
import { useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref, inView } = useInView({ threshold: 0.1 });

  useEffect(() => {
    if (!videoRef.current) return;
    if (inView) videoRef.current.play(); else videoRef.current.pause();
  }, [inView]);

  return (
    <div ref={ref} className="relative w-full aspect-video">
      <video ref={videoRef} autoPlay muted loop playsInline poster="/hero-poster.webp" className="w-full h-full object-cover">
        <source src="/hero.webm" type="video/webm" />
        <source src="/hero.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
```

## 20. Performance Testing Checklist

**During development:**
- [ ] Chrome DevTools Performance panel trace recorded during the animation.
- [ ] FPS measured (target 60fps desktop, ≥30fps sustained on mid-tier mobile).
- [ ] Memory profiled for leaks/unbounded growth.
- [ ] CPU throttled 4x to simulate budget Android.
- [ ] Network throttled (Slow 3G, Fast 3G, 4G) to verify fallback states look intentional, not broken.
- [ ] Tested on a real budget Android device, not only an emulator.
- [ ] Tested on Safari iOS and Firefox for rendering parity.

**Pre-merge:**
- [ ] Lighthouse mobile + desktop run; Performance ≥ 90.
- [ ] Core Web Vitals validated: LCP ≤ 2.5 s (target 2.0 s), CLS < 0.1 (target 0.05), INP < 200 ms (target 150 ms).
- [ ] WebPageTest run on a mobile profile over 3G/4G.
- [ ] Verified with `prefers-reduced-motion: reduce` emulated — content fully intelligible with zero animation.
- [ ] No CLS attributable to any animated or lazy-loaded element.
- [ ] Battery/thermal impact observed for any sustained loop or video.

## 21. CI Motion Validation

- **Lighthouse CI** gates every PR on Performance/Accessibility scores and hard-fails on LCP/CLS/INP threshold breaches.
- **Playwright visual regression**: baseline screenshots for key pages in both normal and reduced-motion emulation.
- **Layout stability assertions**: bounding-box comparisons before/after animation settle to catch unintended shift.
- **Bundle-size checks**: fail the build if the animation-related JS chunk exceeds the Weight Budget Policy limits.
- **Animation snapshot tests** for critical sequences (hero, dashboard reveal) to catch regressions in timing/easing.

```typescript
// tests/motion.spec.ts
import { test, expect } from '@playwright/test';

test('motion must not cause CLS', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('[data-testid="hero"]');
  const before = await hero.boundingBox();
  await page.waitForTimeout(1000);
  const after = await hero.boundingBox();
  expect(before?.x).toBe(after?.x);
  expect(before?.y).toBe(after?.y);
});

test('prefers-reduced-motion disables non-essential motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const el = page.locator('[data-testid="animated-element"]');
  await expect(el).toBeVisible();
});
```

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "throttling": { "cpuSlowdownMultiplier": 4, "networkRttMs": 150, "networkThroughputKbps": 1638 }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "metrics:cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "metrics:largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "metrics:interaction-to-next-paint": ["error", { "maxNumericValue": 200 }]
      }
    }
  }
}
```

## 22. Common Anti-Patterns (Reject in Review)

- Animating `width`, `height`, `top`, `left`, `margin`, or `padding` — causes reflow; use `transform`/`opacity` instead.
- Scrolljacking — overriding native scroll physics; never manipulate the scrollbar or forced-scroll timelines.
- "Everything fades" — staggering every paragraph and image on a page; only animate key visual elements, keep text immediately visible.
- Unbounded listeners/timers — `setInterval` or `addEventListener` without a cleanup function.
- Wrapping every micro-interaction in Framer Motion instead of CSS.
- Large Lottie or video assets placed above the fold without a budget check.
- Continuous floating/decorative elements that never settle.
- Parallax anywhere on the marketing site.
- Autoplaying video with sound.
- Hero animation that delays visible text or the CTA.
- Stagger sequences with 15–20+ items.
- Infinite decorative loops with no purpose.
- Motion that runs or shifts layout while the user is mid-click on a CTA.
- Fabricated data, counts, or testimonials rendered inside any animated counter, card, or notification.
- Ignoring `prefers-reduced-motion` on any non-trivial animation.
- Heavy WebGL/Canvas backgrounds on ordinary marketing sections.

## 23. Review Checklist (Required Before Merging Any Animation PR)

- [ ] The animation's purpose is stated in the PR description (attention / hierarchy / comprehension / delight / conversion).
- [ ] The technique chosen matches the Motion Decision Framework — no heavier tool than necessary.
- [ ] All applicable Weight Budget Policy limits are respected (JS, asset size, simultaneous count).
- [ ] The LCP element is fully static and prioritized; no animation sits in its critical path.
- [ ] No layout-triggering property is animated; only `transform`/`opacity`.
- [ ] Space is reserved for every animated/lazy element (`aspect-ratio`, fixed dimensions).
- [ ] `prefers-reduced-motion` is handled with a genuinely simplified or instant fallback.
- [ ] Mobile-specific simplification is considered (parallax removed, stagger reduced, video downgraded).
- [ ] Heavy animation code is dynamically imported and gated behind `IntersectionObserver`/idle callback.
- [ ] All observers, timers, and animation frames are cleaned up on unmount.
- [ ] Tested on a real or accurately throttled budget Android device, plus Safari iOS.
- [ ] No fabricated metric, testimonial, logo, review, or customer count appears anywhere in the animated content — verified against `app_reality.md`.
- [ ] Focus management and keyboard access are unaffected by the animation.
- [ ] Lighthouse CI and bundle-size CI checks pass.

## 24. Cross References

This skill is the implementation authority for motion decisions, technology selection, and performance/accessibility enforcement. It coordinates with:

- **micro-interaction-specialist** — owns the granular, component-level interaction spec (exact button/card/form feedback details). This skill supplies the global timing, easing, and technique budgets that the specialist's designs must stay within.
- **animation-style-selector** — owns the high-level visual/style direction for a given content piece (e.g., which animation style fits a campaign). This skill determines the concrete technology used to implement that style and enforces the performance/accessibility guardrails around it.
- **core-web-vitals-optimizer** — owns overall site Core Web Vitals strategy across all page elements, not just motion. This skill provides the motion-specific LCP/CLS/INP protections that feed into that broader optimization effort.
- **performance-optimization-expert** — owns site-wide performance budgets, bundling, and asset strategy. This skill supplies the motion-specific budgets, anti-patterns, and enforcement rules that plug into those broader audits.
- **accessibility-specialist** — owns overall WCAG compliance across the product. This skill implements the motion-specific `prefers-reduced-motion`, vestibular-safety, and focus-retention rules; the specialist reviews the full experience for broader compliance.

When guidance conflicts, Core Web Vitals budgets and accessibility requirements always win over visual ambition.

## Final Rule

If an animation cannot be justified by a clear contribution to comprehension or conversion, and if it does not fit inside the budgets above, delete it. For UniqBrio's audience — academy owners in Tier 2/Tier 3 India, often on modest devices and networks — a fast, clear, trustworthy page converts better than a motion-heavy page that feels slow or unpolished.
