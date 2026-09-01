---
name: product-screenshot-mockup-specialist
description: Transforms raw UniqBrio application screenshots into polished, high-converting SaaS marketing visuals through professional device frames, browser chrome, annotation systems, visual hierarchy, accessibility-compliant presentation, and conversion-optimized composition standards.
when_to_use: Use whenever a raw screenshot needs to become a marketing-ready visual asset for UniqBrio's website — hero sections, feature pages, case studies, comparisons, pricing, blog, or mobile app showcases.
---

# Product Screenshot Mockup Specialist

## Overview

**Purpose.** This skill converts raw UniqBrio application captures (React Native Expo PWA + Next.js marketing site) into premium, trust-building marketing visuals that communicate product value clearly — without requiring a live demo. It bridges the gap between engineering artifacts and persuasive visual storytelling for an India-first B2B SaaS selling to arts and sports academy owners, dance schools, music academies, art institutes, and tuition centers.

**Scope.** Screenshot enhancement, cropping, device/browser framing, annotation, composition, background/shadow systems, accessibility, SEO, image optimization, and reusable prompt/editing specifications for every screenshot-bearing surface: hero sections, feature pages, pricing, FAQ, blog, documentation, release notes, case studies, and comparison pages.

**Design Philosophy.** Clarity over decoration — every visual element must earn its place by aiding comprehension. Trust through realism — mockups must look authentic, not artificially staged or impossibly rendered. Premium but restrained — clean, modern, accessible, brand-aligned. Outcome-first — screenshots should visually answer "why does this matter to the academy owner," not just "what does the UI look like." Conversion-focused — every asset should nudge a visitor toward signup, demo booking, or subscription.

**Intended Outputs.** Detailed image-generation/editing prompts, device- and browser-frame specifications, annotation layouts, cropping and composition guidance, accessibility metadata (alt text, captions), export specifications (format/size/compression), and QA checklists — sufficient for another agent or designer to produce a consistent asset without further clarification.

**Assumptions.** Screenshots originate from the UniqBrio PWA (production or TEST-sandboxed academy, e.g. Shahzain Tutors) captured at 2x/retina density. Brand tokens are owned by `design-system-architect`; this skill consumes them. Brand colors: **Brio Orange `#DE7D14`** and **Brio Purple `#6708C0`** — used for accents, callouts, and CTA emphasis, never as decorative noise. Production URLs follow the real slug pattern (`uniqbrio.com/<academy-slug>/join`, `app.uniqbrio.com/dashboard`); marketing assets default to placeholder or sanitized variants unless a specific live page is being documented. All customer-facing data in visuals is fictional or masked — never real production PII.

**Success Criteria.** Visually consistent assets across the entire site; measurable lift in feature comprehension and time-on-page; WCAG 2.1 AA-compliant presentation; passing Core Web Vitals (LCP/CLS) after optimization; assets that read as "produced by a mature company," not "grabbed from a dev environment."

---

## Responsibilities

### This skill owns
- Screenshot cleanup, cropping, and composition
- Device and browser frame selection and application
- Annotation design language (callouts, arrows, spotlights, badges, etc.)
- Visual hierarchy and reading-order design within a single asset
- Background, shadow, and elevation systems for screenshot presentation
- Light/dark theme pairing decisions for screenshot assets
- Privacy-safe data representation within captured UI (masking, sample data)
- Accessibility metadata for screenshots (alt text, captions, contrast)
- SEO and performance specification for screenshot image files
- Reusable, production-ready prompt templates for framing/annotating/composing

### This skill does NOT own
- Page-level narrative, layout, or illustration systems (`saas-website-visual-storytelling-director` owns overall page storytelling and where screenshots sit within it)
- Headline, body copy, and CTA wording (`feature-benefit-copywriter` owns messaging; this skill's annotations must reinforce, not duplicate or contradict, that copy)
- Customer narrative structure, quote selection, and ROI storytelling arc (`case-study-page-writer` owns the story; this skill supplies the supporting screenshot evidence, metrics overlays, and captions that visually validate it)
- Design tokens, typography scale, spacing grid, and component styling (`design-system-architect` owns the source of truth; this skill must reflect those tokens exactly, never invent new ones)
- Live product UI/UX changes, illustration or icon creation unrelated to screenshots, video/animation production, and legal/regulatory compliance beyond general privacy masking

### Collaboration boundaries

| Skill | They own | This skill supplies to them |
|---|---|---|
| `saas-website-visual-storytelling-director` | Page-level narrative, layout, illustration/graphic system | Framed, annotated screenshot assets ready to slot into the page narrative |
| `feature-benefit-copywriter` | Headlines, benefit copy, CTA text | Annotation labels and callout text that echo their exact terminology |
| `case-study-page-writer` | Customer story arc, quotes, ROI narrative | Evidence screenshots, metric overlays, before/after visuals, captions tied to the story's claims |
| `design-system-architect` | Color tokens, typography, spacing, shadows, component library | Consumes their tokens for every frame, callout, and background — never diverges |

When responsibilities appear to overlap (e.g. a hero screenshot also needs page-level layout), this skill produces the asset; the storytelling director decides its placement and surrounding copy context.

---

## Marketing Objectives

Polished screenshots directly serve conversion goals:
- **Credibility & trust** — realistic, non-gimmicky presentation signals a mature, reliable platform, not a side project.
- **Perceived product maturity** — consistent framing and finish differentiate UniqBrio from unpolished competitors and manual/Excel-based alternatives.
- **Feature comprehension** — annotations reduce the cognitive work of decoding a dashboard; visitors understand *what* and *why* in seconds.
- **Conversion rate** — clear visual proof of automation (WhatsApp reminders, fee collection, attendance) shortens the path from curiosity to demo booking.
- **Time-on-page & engagement** — well-composed visuals with intentional visual rhythm keep visitors scrolling and reading longer.
- **Visual hierarchy across the page** — screenshots act as anchor points and pacing devices in long-form feature and case-study pages.

---

## Device Frame Library

General rules across all frames: perspective is **front-facing only** — avoid dramatic 3D rotation, tilt, or exaggerated depth that reads as fake. Maintain consistent corner radius, shadow language, and safe margins (minimum 40–48px) throughout a single page or asset set. Never stretch or distort a screenshot to fit a frame — scale proportionally.

### Desktop
- **MacBook (default/primary):** Use for hero sections, dashboard showcases, and premium feature deep-dives. Front-facing, no dramatic angle. Padding 60–80px internal margin. Soft, large shadow (30–40px blur, 20–30% opacity). Corner radius 12–16px on the display.
- **Windows laptop:** Use only when explicitly signaling enterprise/Windows context or in direct competitor/legacy-system comparisons. Neutral modern bezel, medium shadow (30px blur, 30–35% opacity), 8px corner radius.
- **Monitor (standalone):** Use for analytics/reporting deep-dives where the data itself is the hero — minimal bezel, deep shadow (50px blur, 35–40% opacity), 0px corner radius for a clean, "wall-mounted" feel.
- **Ultrawide:** Reserve for multi-panel dashboards, Kanban-style workflows, or wide reporting views — only when content genuinely benefits from the extra width (21:9+). Generous padding (80px+) to avoid a cramped, stretched look.

### Browser Frames
- **Chrome:** Default for all web/PWA screenshots. Single tab, generic descriptive title ("Academy Dashboard"), no bookmarks bar, no visible extensions, scrollbars hidden.
- **Safari:** Use only for explicit Apple-ecosystem context.
- **Edge:** Use only for explicit enterprise-context messaging.
- **Generic/neutral chrome:** Use when the specific browser identity is irrelevant and would only add visual noise (most feature-page crops).

**Omit browser chrome entirely** when: the screenshot is a full-bleed hero visual, it's nested inside a device frame (phone/tablet), it's a floating/disembodied composition, or the interior UI itself is the intended hero.

### Mobile
- **iPhone (default for PWA/mobile-first features):** Portrait orientation for workflows (attendance, WhatsApp, notifications). Padding 25–30px, medium-soft shadow, corner radius ~40px (device), home indicator visible, notch accounted for.
- **Android (generic modern phone):** Use to signal broad device support or when representing the Indian Android-majority user base explicitly. Slightly thinner bezel, corner radius ~30px.
- **Generic modern phone:** Neutral fallback when platform identity doesn't matter.

### Tablet
- **iPad:** Use for attendance grids, calendar views, coach/admin dashboards viewed on tablet. Padding ~40px, medium shadow, corner radius ~20px, landscape or portrait per feature context.
- **Android tablet:** Use to reinforce cross-platform/Android-first market relevance.

### Avoiding unrealistic framing
- No impossible perspectives, exaggerated reflections, or lighting that doesn't match the stated background.
- No floating devices at physically implausible angles.
- Keep scaling pixel-accurate — never upscale a low-resolution capture to fill a large frame.
- One perspective and one frame family per page/section for consistency; don't mix a tilted phone with a flat laptop in the same composition unless intentionally building depth via layering.

---

## Browser Chrome Standards

- **Address bar:** Visible for feature pages, documentation, and blog; hidden for hero crops and full-bleed visuals.
- **URL content:** Use realistic, sanctioned patterns — `app.uniqbrio.com/dashboard`, `app.uniqbrio.com/attendance`, `uniqbrio.com/<academy-slug>/join`. Never show `localhost`, internal IPs, staging subdomains, TEST-project identifiers, or any Supabase/infra URLs.
- **Tabs:** Single tab, generic descriptive title ("Dashboard," "Attendance"), no distracting favicon clutter.
- **Toolbar:** Minimal; show only when demonstrating an extension or specific browser-level feature (rare).
- **Window controls:** Generic, neutral-colored — not OS-brand-specific unless the platform itself is the point.
- **Browser color:** Neutral light gray/white for light mode, matching neutral dark gray for dark mode — never colored chrome.
- **Scroll position:** Default to top-of-page unless the feature genuinely lives below the fold, in which case annotate that it's a scrolled state.
- **Browser width standards:** Desktop ≥1440px, tablet 768–1024px, mobile 390px — match capture width to the frame being used.
- **Omit chrome** whenever it would compete with annotations or when the device frame (phone/tablet) already supplies sufficient context.

---

## Device Mockup Decision Matrix

| Situation | Recommended presentation |
|---|---|
| Homepage hero | MacBook with a floating phone overlay (shows multi-platform reach) |
| Desktop-first feature (dashboard, reports, analytics) | MacBook or clean monitor, no browser chrome if content-focused |
| Mobile-first feature (attendance check-in, WhatsApp, notifications) | iPhone or Android frame, portrait |
| Cross-device workflow | Stacked or split laptop + phone |
| Tablet-context feature (coach dashboards, calendar) | iPad frame |
| Comparison / before-after | Split-screen, identical frame family on both sides |
| Multi-feature overview | Dashboard collage — 2–4 panels, consistent spacing and elevation |
| Small supporting detail | Floating screenshot, no frame, generous whitespace |
| Sequential workflow (e.g. onboarding steps) | Stacked or overlapping screenshots with step indicators |
| Case study evidence | Framed screenshot + metric-overlay annotation |
| Pricing page | Small floating preview, not full framed mockup — supporting role only |

---

## Screenshot Capture Standards

**Technical specs.** Minimum 1440px width for desktop, 2x/retina density baseline (3x optional for high-density mobile). Standard aspect ratios: 16:9/16:10 desktop, 9:19.5 mobile. Browser zoom 100%, OS scaling 100%. Cursor hidden unless demonstrating a specific interaction. Capture at defined responsive breakpoints: 1440px (desktop), 768–1024px (tablet), 390px (mobile).

**Theme.** Light mode is the default for marketing assets (higher readability, more "professional SaaS" read). Capture dark mode only when dark mode itself is the feature being shown, or for an explicit light/dark comparison.

**Clean state.** No error states, loading skeletons, empty notification badges, or stray toasts unless that state is the explicit point of the screenshot. Default filter/toggle states unless demonstrating configuration.

**Data standards — production vs. sample vs. placeholder vs. fake:**
- **Production data:** never used directly in public marketing assets. If a real production screenshot must be referenced internally, treat it as a source to be re-created with sanitized data, not published as-is.
- **Sample/fake data (default for all marketing assets):** consistent, realistic, fictional Indian names and academy names.
- Student names: Arjun Mehta, Priya Sharma, Ananya Iyer, Rohan Patel, Vikram Singh, Kavya Reddy, Diya Joshi, Aditya Kumar.
- Academy names: Bright Future Dance Academy, Champion Sports Coaching, Excel Music Academy, Creative Art Institute, Elite Football Academy, Star Tuition Center.
- Phone numbers: Indian format, fictional — `+91 98765 43210` (space after 5th digit), never a real number.
- Emails: fictional domains — `arjun.mehta@example.com`; mask real emails as `p*****@gmail.com` if a real capture must be reused.
- Financial values: realistic Indian-market ranges in ₹ — monthly fee ₹5,000–₹15,000, quarterly ₹12,000–₹40,000, registration ₹1,000–₹5,000. Round, never show a real customer's exact figure.
- Payment masking: card `**** **** **** 1234`, UPI `*****@upi` — show only last 4 digits, never CVV/expiry (PCI-DSS-aligned hygiene even for mockups).
- Notifications: 3–5 max, realistic — "Fee payment received from Arjun Mehta," "Attendance marked for Batch A," "New registration: Priya Sharma."
- Timestamps: recent and IST-plausible — "Today, 2:30 PM," "Yesterday, 10:15 AM," "2 hours ago."
- Avatars/logos: generic initials or neutral illustrated avatars; never a real person's photo without consent.
- **Privacy/GDPR/India DPDP Act 2023:** never expose real student data, payment identifiers, or contact information in any public-facing asset. Anonymize or fabricate consistently. Document any case where a real customer's data is used (requires explicit permission) — default assumption is fictional data only.

---

## Screenshot Quality Checklist
- Crisp edges, no visible pixelation or jagged anti-aliasing
- Exactly 100% scaling — no distortion from stretching
- Minimal compression artifacts (PNG for masters, WebP/AVIF for production delivery)
- Accurate color reproduction matching Brio Orange `#DE7D14` / Brio Purple `#6708C0` and design-system tokens
- Transparency preserved where the composition requires it (floating screenshots on gradient backgrounds)
- No stray OS chrome, desktop icons, or notification clutter from the capture environment

---

## Cropping Rules
- **Focal point:** the single most important UI element occupies 40–60% of the frame and is never split or clipped by the crop edge.
- **Whitespace:** minimum 20–40px padding around the focal element; hero crops get generous padding for text overlay, feature crops are tighter.
- **Never clip:** interactive controls (buttons, toggles, dropdowns) must be fully visible; if showing a dropdown, reveal at least 2–3 options.
- **Preserve hierarchy:** keep primary navigation/section headers intact unless deliberately isolating a component for a thumbnail.
- **Crop types:**
  - *Hero crop:* wide (16:9 or 2:1), generous whitespace for headline overlay.
  - *Feature crop:* tighter (4:3), focused on the specific control or panel being explained.
  - *Thumbnail crop:* near-square or 16:9, single focal element, minimal padding (≤10px).
  - *Responsive crops:* generate distinct crops per breakpoint rather than scaling one crop down.
- Asymmetric cropping is permitted for editorial dynamism as long as readability and hierarchy are preserved.

---

## Screenshot Composition
- **Balance:** distribute visual weight evenly — heavier UI content on one side balanced by whitespace or annotation on the other.
- **Negative space:** minimum 30% for standard compositions, up to 50% for hero layouts — space should be clean, not filled with distracting texture.
- **Contrast:** the screenshot must read clearly against its background; background never competes with foreground content.
- **Eye movement:** guide top-left → primary highlight → supporting detail → CTA/whitespace, mirroring natural reading order.
- **Alignment:** snap to a 12-column grid (desktop) or 4-column grid (mobile); keep gutters consistent (≥20px).
- **Depth & layering:** use shadow and subtle overlap (not exaggerated 3D) to create a sense of elevation between primary and secondary screenshots.
- **Visual rhythm:** repeat spacing patterns and framing choices across a page so screenshots feel like one coherent system, not ad hoc assets.

---

## Annotation System

**Component vocabulary:** numbered callouts, feature-highlight arrows/connector lines, spotlights and focus rings, dimmed/blurred backgrounds for emphasis, magnified zoom-insets for small details, step indicators for sequences, micro-labels for compact UI elements, tooltips, comparison markers, status badges ("New," "Beta"), and simulated notification overlays.

**Governing rules:**
- **Maximum 5 annotations per screenshot** (hard ceiling; 3 is the target for most feature crops — split into multiple images rather than overload one).
- Minimum 20–24px spacing between annotations; never let callouts overlap each other or obscure the element they describe.
- Hierarchical sizing: the primary callout is visually largest/boldest; secondary and tertiary annotations recede in size and weight.
- Use progressive disclosure — reveal complexity across multiple images rather than one overloaded screenshot.
- When in doubt, remove an annotation rather than add one.

---

## Callout Style Guide
- **Typography:** brand sans-serif (design-system default), 16–18px body, bold weight for labels, 1.4–1.5 line height.
- **Shape:** rounded rectangle, 8–12px corner radius, with a small pointer/tail toward the referenced UI element.
- **Padding:** 16–20px internal.
- **Color hierarchy:** primary callouts use Brio Purple `#6708C0` fill with white text; secondary callouts use white/light background with dark text and a subtle shadow; accent/urgency callouts use Brio Orange `#DE7D14`.
- **Contrast:** minimum 4.5:1 (WCAG AA) between callout text and its background in both light and dark contexts.
- **Icons:** simple outline icons only, one per callout, never decorative-only.
- **Responsive sizing:** scale typography and padding down ~15–20% for tablet, ~25–30% for mobile, or stack vertically.

---

## Visual Hierarchy
- **Primary emphasis:** largest screenshot/element, highest elevation (largest shadow), one primary callout — this is what grabs attention first.
- **Secondary emphasis:** medium size/elevation, 2–3 supporting callouts, provides context.
- **Tertiary emphasis:** smallest, lowest elevation, at most one callout, adds depth without competing.
- **Reading order:** primary → secondary → tertiary → annotations in numbered sequence.
- **Progressive disclosure:** show the full UI first, then use annotation to layer in detail — never front-load every explanation into one cluttered frame.

---

## Feature Highlight Patterns

Reusable annotation focus per feature area:
- **Dashboard:** KPI cards (students, attendance, revenue), export/report button.
- **Analytics:** primary chart/trendline, date-range filter, CSV export.
- **Payments:** payment status badges (Paid/Pending/Overdue), reminder automation, masked payment method.
- **Attendance:** today's attendance grid, quick check-in action, trend summary.
- **Calendar:** upcoming sessions, add-class action.
- **Notifications:** bell icon with badge count, notification categories, "mark as read."
- **Student profile:** progress, attendance history, payment status, edit action.
- **Course management:** course list, enrollment counts, add-course action.
- **Automation / WhatsApp integration:** broadcast composer, recipient selection, message template, scheduled send — always shown as a simulated conversation, never real phone numbers.
- **Reports:** report list, generate/export action, filter options.
- **Forms:** minimal required fields, inline validation states.
- **Settings:** simplified configuration panels, save-changes action.
- **Mobile workflow:** multi-step sequence with step indicators (1 of 3, 2 of 3…).
- **Comparison / before-after:** emphasize reduced complexity and time saved, quantified where possible ("12 hrs saved weekly").

---

## Light and Dark Theme Pairing
- Show both themes together only when theme-switching is itself the feature being demonstrated, or for an explicit design-consistency comparison.
- Otherwise default to light mode for all marketing assets.
- **Paired/split layouts:** identical device frame, identical crop and annotation style on both sides; only theme differs. Adjust callout contrast for dark backgrounds (lighter accent tones) while keeping the same color hierarchy.
- Maintain WCAG contrast independently for each theme variant.

---

## Background System
- **Solid:** white or light neutral gray (design-system default) for most feature/documentation contexts.
- **Gradient/mesh:** subtle brand-toned gradients (Brio Orange → Brio Purple, low saturation) reserved for hero sections — must not reduce screenshot legibility.
- **Abstract shapes/glassmorphism:** used sparingly (10–20% opacity) as decorative depth in hero compositions only.
- **Transparent:** for floating compositions layered directly onto a page's existing background.
- **Float vs. contained:** float the screenshot (centered, drop shadow, no frame) when emphasizing the interface itself in a minimal hero or feature callout; use a full device/browser frame when context and realism matter more (case studies, comparisons, product-page proof).

---

## Shadows and Elevation
Consistent shadow scale across the site:
- **Small:** 5–15px blur, 10% opacity — thumbnails, tertiary elements.
- **Medium:** 20–30px blur, 20–30% opacity — standard feature screenshots.
- **Large:** 40px blur, 30% opacity — hero and primary emphasis assets.
- **X-Large:** 50–60px blur, 35–40% opacity — highest-emphasis hero compositions only.

Use one shadow language per page; never mix hard box-shadows with soft diffused shadows in the same composition. Shadows should feel like natural elevation, not decoration.

---

## Comparison Layouts
- **Before vs. after / manual vs. automated / Excel vs. UniqBrio / paper vs. digital:** side-by-side or top-bottom, identical frame family and scale on both sides, clear "Before"/"After" labels, quantified annotation of the improvement (e.g. "100% faster," "0 manual entry").
- **Competitor comparison:** neutral, factual framing — never distort or degrade the competitor's UI to look worse than it is; let the feature gap speak for itself.
- **Layout rule:** always align comparison points on the same horizontal/vertical axis so the eye can scan across without re-orienting.

---

## Case Study Screenshot Standards
- Show the transformation: a "before" state (manual process, spreadsheet, or legacy system) paired with the UniqBrio "after" state.
- Overlay quantified metrics directly on or beside the screenshot (e.g. "30% fewer missed payments," "12 hrs saved weekly").
- Captions follow the pattern: *"[Owner name], [Academy name] | [specific, quantified outcome]."*
- Every claim visualized must be traceable to something the case-study narrative actually states — this skill does not invent metrics; it visualizes the ones supplied by `case-study-page-writer`.

---

## Feature Page Screenshot Standards
- **Hero:** largest, most framed asset on the page (MacBook + floating phone), 1–2 primary callouts max, brand-gradient background.
- **Feature section:** tighter crop, browser frame or floating, 2–3 callouts explaining the specific capability.
- **Pricing:** small supporting preview only — never the visual focus; pricing cards/copy lead.
- **FAQ:** rarely needs a screenshot; if used, a single small, unframed detail crop.
- **Blog/documentation:** inline, browser-framed, captioned for SEO and comprehension — literal, not heavily stylized.
- **Release notes:** small, focused crop of just the new feature, with a "New" status badge.

---

## Accessibility Standards
- **Alt text:** describe value and content, not just pixels. Decorative-only images get an empty `alt=""`; every informative screenshot gets a real description.
- **Alt text templates:**
  - Dashboard: *"UniqBrio dashboard showing today's attendance, upcoming classes, and pending payments for [academy type]."*
  - Feature: *"[Feature name] in UniqBrio, showing [key element] and [key benefit]."*
  - Case study: *"[Academy name] dashboard showing [specific improvement achieved with UniqBrio]."*
  - Comparison: *"Side-by-side comparison of a manual spreadsheet process versus UniqBrio's automated [workflow]."*
  - Mobile: *"UniqBrio mobile app showing the [feature] screen on a phone."*
- **Contrast:** all annotation text and callouts meet WCAG 2.1 AA (4.5:1 body text, 3:1 large text/icons) in both light and dark contexts.
- **Color independence:** never convey status (paid/overdue, success/error) through color alone — pair with icon or label.
- **Screen reader structure:** use semantic `<figure>`/`<figcaption>` markup where screenshots are embedded, with logical heading order around them.

---

## SEO Guidance
- **File names:** descriptive and keyword-relevant — `uniqbrio-attendance-dashboard.webp`, never `image-final-v3.png`.
- **Captions:** short, descriptive, keyword-natural — reinforce the page's target terms without stuffing.
- **Open Graph:** provide a dedicated OG image per page at standard 1200×630px with legible text at small preview sizes.
- **Structured data:** use `ImageObject` schema where appropriate on pages with hero/feature visuals.
- **Responsive images:** serve multiple sizes via `srcset`/Next.js `<Image>` rather than one oversized master.

---

## Image Optimization
- **Master format:** PNG (lossless) for the editing source of truth.
- **Production delivery:** WebP as default, AVIF where supported for further savings.
- **Compression:** balance visible quality against file size — target well under 200KB for most in-page assets, tighter for anything above the fold.
- **Next.js `<Image>`:** always use the component for automatic responsive sizing; mark the hero/LCP image with `priority`, lazy-load everything below the fold.
- **Performance targets:** protect LCP by keeping the hero image lean and correctly sized; avoid layout shift (CLS) by always specifying width/height or using fill with a sized container.

---

## Prompt Templates

**Browser frame:**
> "Place the provided screenshot inside a clean Chrome browser frame, single tab labeled '[Feature name]', address bar showing `app.uniqbrio.com/[route]`, no bookmarks or extensions, light theme, subtle drop shadow (20–30px blur, 25% opacity), centered on a neutral off-white background with 60px padding."

**Laptop mockup:**
> "Insert the screenshot into a modern MacBook frame, front-facing perspective, 60–80px internal padding, soft large shadow, neutral gradient background (Brio Orange to Brio Purple, low saturation), premium SaaS marketing aesthetic."

**Phone mockup:**
> "Place the screenshot inside a modern iPhone frame, portrait orientation, 25–30px padding, home indicator visible, medium-soft shadow, centered on a clean or brand-gradient background."

**Feature annotation:**
> "Add up to 3 numbered callouts highlighting [element 1], [element 2], [element 3]. Primary callout in Brio Purple (#6708C0) with white text; secondary callouts in white with dark text and subtle shadow. Use thin connector lines, 20px+ spacing, WCAG AA contrast, no overlap with UI controls."

**Case study visual:**
> "Present the screenshot with a metric overlay reading '[quantified outcome]', a small caption '[Owner], [Academy name]', and one supporting callout pointing to the relevant dashboard element. Maintain consistent framing with other case-study assets on the page."

**Comparison mockup:**
> "Create a side-by-side split: legacy/manual process on the left labeled 'Before', UniqBrio dashboard on the right labeled 'After'. Identical scale and frame type on both sides, aligned comparison points, one callout per side quantifying the improvement."

**Marketing hero visual:**
> "Produce a premium homepage hero: MacBook mockup of the main dashboard with a floating iPhone mockup showing the mobile attendance view, layered with soft shadows, brand-gradient background, 1 primary callout maximum, generous whitespace for headline overlay."

**Dashboard highlight:**
> "Highlight the top 2 KPI cards on the dashboard using a subtle spotlight/focus ring and dimmed surrounding UI. Keep all text legible; do not obscure any interface details."

**Mobile app showcase:**
> "Arrange three iPhone mockups in a staggered vertical layout showing attendance, student profile, and WhatsApp notification screens, consistent spacing and shadow, unified background."

**Feature callout set:**
> "Annotate the [feature] screenshot with numbered labels for [control 1] and [control 2], concise 3–6 word labels matching the page's existing copy tone, brand-accent color, minimum 24px spacing between labels."

---

## Editing Workflow

Raw screenshot → quality review (resolution, clean state, privacy check) → cleanup (remove noise, mask sensitive data) → cropping (focal point, whitespace, crop type) → frame selection (device/browser per decision matrix) → annotation (max 5, hierarchy-aware) → background & composition (float vs. contained, shadow system) → accessibility pass (alt text, contrast) → optimization (format, compression, responsive sizes) → SEO pass (filename, caption, OG) → final export.

**Review checkpoints:** after cleanup (privacy sign-off — never skip), after annotation (max-5 check, contrast check), before final export (full QA checklist below).

---

## Quality Assurance Checklist
- [ ] Consistent device/browser frame family across the page
- [ ] Brand colors and tokens match design system exactly
- [ ] Screenshot communicates its intended feature/benefit within 2 seconds
- [ ] Annotations ≤5, spaced, non-overlapping, WCAG-AA contrast
- [ ] Alt text present and descriptive; decorative images marked empty
- [ ] Resolution crisp at target display size; no scaling artifacts
- [ ] File optimized (WebP/AVIF), responsive sizes generated, LCP/CLS safe
- [ ] Filename and caption SEO-appropriate
- [ ] All data in-frame is fictional or properly masked — zero real PII
- [ ] Overall polish: no mixed shadow styles, no inconsistent perspective, no clutter

---

## Common Mistakes
- **Too many annotations →** cap at 5, ideally 3; split into multiple images instead of overloading one.
- **Busy/distracting backgrounds →** simplify to solid, subtle gradient, or minimal abstract shape.
- **Low resolution →** always capture at 2x/retina minimum before framing.
- **Clipped controls from over-tight cropping →** always preserve full interactive elements.
- **Incorrect/stretched scaling →** maintain proportional scale; never distort to fit a frame.
- **Fake realism (impossible angles/lighting) →** front-facing perspective, consistent light source.
- **Poor contrast in callouts →** verify against WCAG AA before shipping.
- **Privacy leaks (real names, numbers, URLs) →** enforce the sample-data standard on every capture.
- **Inconsistent shadows across a page →** use the single shared elevation scale.
- **Mixed design languages →** always pull from `design-system-architect` tokens, never improvise new colors/radii.

---

## Best Practices
- One primary message per screenshot; let surrounding assets carry supporting detail.
- Favor realism and restraint over decorative flourish — a Stripe/Linear/Notion-style clean aesthetic outperforms cluttered "designed" mockups.
- Tie every visual back to a business outcome (time saved, revenue protected, fewer manual errors), not just a feature name.
- Reuse a small library of composition templates rather than reinventing layout per page.
- Treat annotations as a conversation with the visitor's doubts, not a UI tour.
- Always test mobile responsiveness of any hero/feature composition before shipping.
- Review visuals in the context of the full page, not in isolation — composition should support surrounding copy, not compete with it.

---

## Examples
- **Homepage hero:** MacBook mockup of the main dashboard, floating iPhone showing mobile attendance, brand-gradient background, one callout: "Run your whole academy from one dashboard."
- **Feature page (payments):** Browser-framed payment dashboard, callouts on automated fee reminders and masked payment status.
- **Integrations:** Floating screenshot of the WhatsApp automation panel connected visually (thin line) to a small WhatsApp icon.
- **Attendance:** Tight feature crop of the daily attendance grid with one callout on the one-tap check-in action.
- **WhatsApp automation:** iPhone mockup showing a simulated fee-reminder conversation, one callout: "Sent automatically — zero manual follow-up."
- **Analytics:** Monitor frame, no browser chrome, KPI trendline with a single restrained callout on the growth number.
- **Reports:** Floating screenshot emphasizing the export button and a generated PDF preview.
- **Mobile app showcase:** Three staggered iPhone mockups — attendance, student profile, notifications.
- **Dashboard collage:** Four-panel MacBook + iPhone layout showing dashboard, calendar, payments, and reports together for an "everything in one place" narrative.
- **Case study:** Before (spreadsheet) vs. after (UniqBrio dashboard) with a metric overlay "30% fewer missed payments" and caption "Rajesh Kumar, Elite Sports Academy."
- **Comparison page:** Split-screen Excel spreadsheet vs. UniqBrio dashboard, aligned rows, callouts quantifying time saved.
- **Pricing page:** Small, unframed dashboard preview beside the pricing cards — supporting role only, not the visual focus.

---

## Guiding Principle
Every screenshot on the UniqBrio marketing site should function as a silent sales conversation — reducing doubt, proving the product is real and mature, and making the academy owner one step more confident in clicking "Start Free" or "Book a Demo."
