---
name: saas-website-visual-storytelling-director
description: Defines and governs the complete visual storytelling language for UniqBrio's public marketing website — illustration systems, photography direction, 3D rendering, iconography, hero artwork, feature visuals, and marketing imagery — so every page feels premium, emotionally engaging, trustworthy, culturally resonant, and conversion-focused while staying visually consistent site-wide.
when_to_use: Use whenever creating, selecting, reviewing, or governing any marketing-website visual asset (illustration, photography, 3D render, icon, hero image, feature graphic, mockup, or AI-generated image) for UniqBrio's pre-login public site — never for product UI, design tokens, components, or application interaction design.
---

# SaaS Website Visual Storytelling Director

## Purpose & Scope

This skill defines the complete visual storytelling system for UniqBrio's **public marketing website only** (pre-login: homepage, landing pages, feature pages, pricing, blog, customer stories, about, support, integrations, careers, documentation).

It governs: illustration language, photography direction, 3D rendering, iconography, hero artwork, feature visuals, supporting graphics, product-screenshot presentation, image-generation prompting, and asset governance — everything a visitor *sees* before they log in.

**Explicitly out of scope** (owned by `design-system-architect` / product-UI skills):
- Product UI, component libraries, application interaction design
- Spacing, typography tokens, color tokens, design-system grids
- In-app dashboards, mobile app screens, interactive product behavior

This skill treats marketing visuals as a distinct discipline from product UI: marketing visuals *persuade and connect emotionally*; product UI *informs and enables tasks*. Confusing the two produces either a cold, transactional marketing site or a distracting, over-decorated product.

## Product Context

- **Company:** UniqBrio — India-first SaaS for arts and sports academy management.
- **Stack:** React Native Expo PWA, Next.js, Supabase, PostgreSQL, Edge Functions, Vercel.
- **Audience:** Indian academy owners — dance, music, art, football, cricket, badminton, martial arts, swimming, coaching centres, multi-activity academies — concentrated in Tier 2/3 cities, Tamil Nadu first.
- **Conversion goals:** demo bookings, signups, paid subscriptions.
- **Brand goals:** premium, modern, optimistic, trustworthy, approachable, distinctly Indian without stereotypes, globally competitive.
- **Brand colors:** Brio Orange `#DE7D14`, Brio Purple `#6708C0` (final token authority lives with `design-system-architect` and `color-psychology-expert`; this skill applies the palette to imagery).

## Philosophy

**Visuals build trust before words do.** A visitor forms a credibility judgment within seconds of a page loading — long before reading a headline. Polished, intentional imagery signals product maturity and reliability; sloppy or generic imagery signals sloppy software, regardless of how good the product actually is.

**Consistency is recognition.** When illustration style, lighting, color grading, and composition repeat predictably across dozens of pages, a visitor learns "this is UniqBrio" without reading the logo. Inconsistency fragments that trust and makes the company feel smaller and less considered than it is.

**Visuals directly influence SaaS conversion.** They compress abstract value propositions ("automate attendance," "save 10 hours a week") into an instantly legible emotional promise. The right hero image reduces the cognitive work a buyer must do to imagine using the product.

**Marketing visuals are not application UI.** Marketing visuals are aspirational, cinematic, and emotionally driven; they are allowed to simplify, dramatize, and metaphorize. Product UI must be literal, functional, and restrained. Never let marketing decoration bleed into product screens, and never let literal UI chrome bleed into marketing storytelling.

## Visual Principles

Every asset — illustration, photo, 3D render, or icon — must be checked against these ten principles before approval:

1. **Premium** — polished composition, considered lighting, no visual shortcuts or cheap effects.
2. **Human** — people and their outcomes are the subject; objects and abstractions support, they don't replace, human presence.
3. **Optimistic** — every visual implies forward progress, not stress or chaos.
4. **Authentic** — believable, lived-in scenarios; avoid artificial perfection or obviously staged moments.
5. **Culturally Respectful** — modern India represented on its own terms, never as spectacle.
6. **Emotionally Engaging** — evokes pride, relief, momentum, or community — not just decoration.
7. **Uncluttered** — one clear focal point per composition; generous negative space.
8. **Product-First** — artwork points attention toward the product and the outcome it enables; it never competes with or upstages the product.
9. **Scalable** — the system must remain coherent across hundreds of future pages, not just the homepage.
10. **Timeless** — avoid illustration/photo trends that will look dated within 18 months; prioritize enduring quality over of-the-moment style.

**Visual hierarchy priority order (never invert this):**
1. Headline → 2. Product (screenshot/mockup) → 3. Primary CTA → 4. Supporting artwork → 5. Decorative elements.

## Illustration Style Guide

### Philosophy
Illustrations are **semi-flat with dimensional depth** ("Modern Dimensional"): stylized enough to feel digital-native and timeless, realistic enough that a coach, racket, or ledger remains instantly recognizable. They exist to simplify software concepts — workflow, transformation, automation — never purely to decorate.

### Shape Language
- Soft, rounded geometric forms: rounded rectangles, smooth curves, flowing paths, modular shapes.
- Characters: soft curves, clear silhouettes, slightly simplified proportions (heads marginally larger — stylized, not cartoonish).
- Avoid jagged edges, sharp spikes, or chaotic/noisy geometry.

### Perspective & Geometry
- Primary: gentle ¾ or 30° isometric (2.5D) for depth without full 3D complexity.
- Pure flat, orthographic view reserved for icons and simple supporting graphics.
- Balanced, intentional composition with consistent proportions across a scene — avoid extreme perspective distortion.

### Line Weight
- Primary stroke: 2–2.5px (export scale); secondary/detail strokes 1–1.5px.
- Never mix heavy and ultra-thin lines within the same illustration or across a page.

### Shadows & Highlights
- Shadows: soft, large blur radius, low opacity (20–30%), single consistent light source (typically top-left). Never hard-edged or dramatic.
- Highlights: subtle rim/specular light opposite the shadow, 10–15% opacity. Never glossy-plastic.

### Textures & Gradients
- Textures: very subtle (8–15% opacity) — paper, fabric, or grain only where it adds warmth; never noise-heavy.
- Gradients: restrained, two-color, brand-aligned (warm-to-cool, e.g., orange sunrise to deep teal/purple). No rainbow or multi-stop gradients.

### Realism & Abstraction Scale

| Style | When to use |
|---|---|
| Flat | Icons, simple diagrams, UI-adjacent metaphors |
| Semi-flat (preferred default) | Feature illustrations, process/workflow visuals |
| Isometric / Dimensional | Hero scenes, ecosystem/analytics visuals, transformation stories |
| 3D | Strategic use only — premium hero moments, device/product renders |
| Photorealistic | Reserved for photography and mixed-media compositions, not illustration |
| Mixed media | Illustration + photography combined for emphasis (e.g., illustrated scene with a real screenshot inset) |

Target abstraction level: **40–60%** — enough realism to feel believable, enough abstraction to stay timeless and scalable.

## Flat vs 3D vs Photography Decision Tree

| Page / Scenario | Primary Style | Secondary / Notes |
|---|---|---|
| Homepage hero | 3D or dimensional illustration + product screenshot | Photography only as secondary trust element |
| Feature section | Semi-flat isometric illustration | Or product screenshot with minimal framing |
| Pricing | Flat vector icons only | No decorative scenes — minimize cognitive load |
| Testimonials | Photography (real people) | Illustrated avatars only if photography is unavailable |
| Blog | Photography, or illustration for conceptual/abstract topics | Match style to article tone |
| Customer stories | Photography | Never abstract illustration — authenticity is the point |
| Landing pages (campaign) | Dimensional illustration hero + supporting diagrams | Keep consistent with sitewide system |
| Educational content | Diagrams, flat illustration, icons | Clarity over decoration |
| Comparison pages | Simple icons/diagrams (check/x, tables) | No decorative illustration |
| Enterprise pages | Premium photography + minimal 3D | Higher production value, more restraint |
| About page | Photography (real team) first, illustration second | Avoid stock people |
| Support / docs pages | Icons + workflow diagrams | Never hero illustrations here |
| Integrations | Brand/partner icons + simple connection diagrams | Logo accuracy matters |
| Recruitment / careers | Photography — office, culture, real people | Authentic, unposed feel |

**Anti-pattern across all scenarios:** mixing photorealistic 3D with flat cartoon illustration on the same page, or defaulting to illustration-only heroes when the page needs product credibility.

## Hero Visual Direction

- **Composition:** rule of thirds, asymmetrical balance; product/subject on one side, headline + CTA with generous breathing room on the other.
- **Visual hierarchy:** headline reads first, product second, artwork always supporting — never the first focal point.
- **Depth:** layered — sharp foreground human/product element, mid-ground academy context, softly blurred background environment.
- **Focal point:** aligned directly with the headline's core promise (e.g., an owner relieved because attendance is automated).
- **Camera angle:** eye-level or slightly elevated for confidence; avoid extreme angles.
- **Negative space:** reserve at least 30% clean space around headline and CTA — artwork must never overlap or crowd either.
- **Product emphasis:** integrate a real screenshot via a modern browser/device frame naturally within the composition — never floating disconnected from the scene.
- **Motion opportunities:** subtle parallax (max ~20px scroll translation), soft floating layers, gentle particle drift (light rays, connection lines). Never busy or distracting; respect `prefers-reduced-motion`.
- **Device mockups:** modern browser frames, current-generation laptop/tablet/phone silhouettes only — never outdated hardware.
- **Environment:** minimal, implied rather than literal; avoid busy office clichés.
- **Human presence:** used deliberately, not by default — when included, people interact naturally with the product, showing calm confidence rather than exaggerated excitement.
- **Brand consistency:** lighting style, color grading, and silhouette language must match the rest of the site's visual system.

## Feature Section Visual Rules

Every feature visual should tell a compressed story:

**Problem → Transformation → Outcome**

- **Conceptual metaphors:** ground abstract software features in tangible academy-world equivalents (see Visual Metaphor Library below).
- **Workflow visualization:** use directional arrows/flow lines; cap sequences at ~5 steps to stay legible.
- **Before/after & transformation:** show a messy, manual state resolving into an organized, digital one (e.g., scattered paper attendance sheet transforming into a clean digital checklist).
- **Academy scenarios:** tailor supporting scenes to the relevant discipline — dance studio with mirrors and barres, cricket pitch, music rehearsal room, art classroom, swimming lanes, martial-arts dojo.
- **Software interaction:** show hands using a phone/tablet with the UniqBrio interface glimpsed naturally, not as a UI teardown.
- **Supporting props:** whistles, paintbrushes, musical notes, trophies, calendars, attendance sheets — used sparingly, never cluttered. Maximum one supporting illustration per screenshot/feature block.

## Product Screenshot Integration

Screenshots are **evidence** — the proof the product is real and works. Artwork exists to frame them, never to compete with them.

- **Frames:** consistent browser frames (desktop) or modern device frames (mobile/tablet); reuse the same 2–3 standard mockup templates sitewide for consistency.
- **Backgrounds:** soft gradients, blurred abstract shapes, or subtle glass/glassmorphic surfaces — never busy patterns.
- **Lighting:** match the direction and warmth of light between the screenshot's frame and the surrounding illustration/photography.
- **Clutter prevention:** maximum one supporting illustration or decorative element around any single screenshot; never combine more than 2–3 screenshots in one section.
- **Data shown:** always clean, realistic, on-brand dummy data — never Lorem Ipsum or broken layouts in a marketing screenshot.

## Photography Style Guide

- **Camera style:** natural, editorial, documentary-lifestyle — not overly staged corporate photography.
- **Lens feel:** 35–50mm (85mm for portraits); avoid ultra-wide distortion.
- **Lighting:** soft natural window light, golden hour warmth, or soft studio fill; avoid harsh flash or heavy shadow.
- **Color grading:** warm neutrals, balanced contrast, natural and accurate skin tones across the full range represented.
- **Composition:** rule of thirds, clean/contextual backgrounds, believable depth of field (shallow for portraits, moderate for environments).
- **Subjects:** real academy owners, coaches, teachers, students, and parents in authentic interaction — not generic corporate stock talent.
- **Clothing:** modern, professional, comfortable, and discipline-appropriate (tracksuits for sport, practical wear for dance/art studios); avoid unnecessary formal business suits.
- **Facial expressions:** genuine smiles, focused concentration, quiet pride, encouragement — never exaggerated posing or stock-photo grins.
- **Environment:** real, well-lit academy spaces — studios, fields, pools, rehearsal rooms — modern and well-maintained, not sterile or artificial.
- **Editing:** minimal retouching to preserve authenticity; controlled noise and contrast; no over-sharpening.

## India-First Cultural Representation

- **Represent the whole country:** North, South, East, West, Central, and North-East India — not a single region standing in for "Indian."
- **Diversity dimensions:** regions, languages, skin tones (full natural range, no lightening bias), academy sizes, city tiers, age groups, genders, and economic contexts.
- **Modern, aspirational India:** digital payments, clean modern facilities, professional coaching, everyday technology adoption — show where Indian academies are heading, not a dated stereotype of where they've been.
- **Concrete examples to use as reference points:** a dance studio in Chennai; a cricket academy in Pune; a music school in Bengaluru; a badminton academy in Coimbatore; a swimming academy in Kochi; a martial arts academy in Guwahati; an art studio in Jaipur.
- **Avoid overusing** as default shorthand for "Indian": temples, elephants, colorful festival imagery, folk costumes, tourist-brochure visuals — unless a specific piece of content is genuinely about that context.
- **Avoid entirely:** stereotypes, tokenism, exoticism, forced/quota-style diversity that feels performative, corporate artificiality, poverty clichés, and "fake diversity" (visibly composited faces onto uniform bodies/poses).
- Representation should emerge naturally from realistic scenarios, not from visibly checking boxes.

## Stock vs Custom Asset Policy

Priority order (highest to lowest):
1. **Custom photography** — preferred for homepage, about, testimonials, customer stories, leadership.
2. **Custom illustration / 3D** — preferred for feature storytelling and hero scenes.
3. **AI-generated imagery** — for conceptual artwork and rapid iteration; never used to fabricate fake customers or testimonials; always heavily art-directed and post-edited for brand consistency.
4. **Curated stock photography** — last resort only, must be culturally accurate, high quality, and heavily graded/edited to match brand style; never used for testimonials or "real customer" contexts.

**Decision criteria:** use custom whenever budget/time allow and authenticity matters (people, testimonials, brand moments); use AI/illustration for conceptual, abstract, or highly scalable needs (feature metaphors, diagrams); use stock only as a stopgap, never as a permanent hero or testimonial asset.

## Iconography System

- **Philosophy:** simple, friendly, weight-balanced outline icons — function first, decoration never.
- **Stroke width:** 2px consistent (2–2.5px acceptable range); never mix weights within one set.
- **Filled vs outlined:** outlined by default; filled reserved for primary/selected states, notifications, or small status badges.
- **Corner radius:** consistent rounding (2–4px) matching the illustration system's rounded shape language.
- **Grid:** 24px base grid (48px for larger contexts), consistent internal padding/safe area.
- **Optical balance:** verify icons look balanced and legible at the smallest deployed size, not just at full scale.
- **Animation:** subtle only — 200–300ms hover/tap transitions; never continuous bounce or looping motion.
- **Do:** use one icon family sitewide; maintain consistent stroke, grid, and radius; test at all sizes.
- **Don't:** mix icon families (e.g., Material next to Feather next to custom-drawn); stretch or rotate icons inconsistently; use icons as decoration without functional purpose.

## Visual Metaphor Library

Reusable, India-relevant metaphors for translating features into imagery:

- **Growth:** seed/sapling becoming a tree; ascending staircase; upward progress path.
- **Learning:** open book transforming into a digital platform; lightbulb; graduation.
- **Coaching:** guiding light; compass; whistle and clipboard; mentor pathway.
- **Payments:** smooth flowing stream of currency; connected wallet; rupee symbol with upward graph.
- **Attendance:** connected checkpoints; presence dots; scattered paper list becoming a clean digital checklist.
- **Communication:** connected speech bubbles; conversation bridge; notification pulses.
- **Scheduling:** organized orbit; timeline ribbon; calendar with flowing events.
- **Community:** interconnected circles; shared progress; group of nodes forming a network.
- **Trust:** shield; foundation; transparent glass; handshake (used sparingly, never as a cliché stock gesture).
- **Success:** trophy; ascending stars; celebration burst.
- **Organization:** flowchart; modular boxes and connectors; structured folders.
- **Automation:** domino chain resolving itself; gears made of everyday academy objects (paintbrushes, cricket bats); self-moving workflow.
- **Time savings:** clock dissolving into completed work; hourglass with flowing sand becoming a checkmark.

All metaphors should feel distinctly Indian in context (academy-specific props, settings) while remaining globally legible as SaaS visual language.

## Image Generation Guidelines

Every AI image-generation prompt must specify, in order:

`[Subject] + [Action/Emotion] + [Setting — Indian academy context] + [Lighting] + [Camera/lens] + [Style — dimensional/semi-flat/photographic] + [Color palette — brand-aligned] + [Cultural specificity] + [Brand consistency cues]`

**Example (good):** "Confident Indian dance academy owner in her mid-30s, smiling while reviewing a tablet showing a schedule dashboard, modern sunlit studio with mirrors and barres, warm natural window light, 50mm lens feel, semi-flat dimensional illustration style, warm orange-to-teal gradient palette, Chennai studio context, premium optimistic SaaS tone, highly detailed --ar 16:9"

**Negative prompts (always include):** stereotypes, tokenism, exoticism, fake diversity, cartoonish, low quality, deformed hands/anatomy, watermark, extra limbs, plastic/uncanny skin, busy/cluttered background, text artifacts, unauthorized logos, distorted faces, harsh unnatural lighting.

**Consistency across pages:** reuse the same prompt skeleton, lighting language, camera feel, and color grading across all generated assets so the site reads as one coherent system rather than disconnected one-off images.

## Asset Specifications

| Asset type | Preferred format |
|---|---|
| Icons, logos, simple illustrations | SVG |
| Hero renders, complex illustrations | WebP (AVIF where supported) |
| Photography | AVIF primary, WebP fallback, JPEG last resort |
| Assets requiring transparency | PNG or WebP |

- Compress aggressively without visible quality loss; target <150KB for hero imagery, <80KB for feature imagery.
- Always export 2x (and 3x where relevant) for retina displays.
- Always define explicit width/height (or `aspect-ratio`) to reserve layout space.

## Responsive Image Rules

- **Desktop:** full composition and richness.
- **Tablet:** balanced crop preserving composition intent.
- **Mobile:** portrait-priority crop; simplify composition, tighten focus on the primary subject.
- **Safe crop zones:** keep the essential subject within the central ~60% of the frame so it survives cropping at any breakpoint.
- **Responsive art direction:** use `<picture>`/`srcset` to serve genuinely different crops per breakpoint, not just scaled-down versions of the same crop.
- **Priority:** preload/eager-load the hero image; lazy-load everything below the fold.

## Aspect Ratio Standards

| Asset | Ratio |
|---|---|
| Hero | 16:9 (21:9 for cinematic campaign heroes) |
| Feature | 4:3 or 16:10 |
| Blog | 16:9 |
| Thumbnail | 1:1 |
| Social preview / Open Graph | 1200×630 (1.91:1) |
| Cards | 3:2 or 1:1 |
| Testimonials | 1:1 or 4:5 |
| Team | 4:5 |
| Logos | Variable (maintain native proportions) |
| Screenshots | Match native device ratio |
| Illustrations | 1:1 or 4:3 |

## Accessibility

- Every meaningful image requires descriptive, context-appropriate alt text; purely decorative images use empty `alt=""` (or `aria-hidden`) so screen readers skip them.
- Text overlaid on imagery must meet WCAG AA contrast (4.5:1 body text, 3:1 large text/UI graphics).
- Never convey information through color alone — pair with shape, text, or icon.
- Representation itself is an accessibility and inclusion matter: imagery must read as genuinely inclusive, not performative.

## Performance

- Lazy-load all below-the-fold imagery; eager/priority-load the LCP hero asset.
- Serve responsive `srcset` sizes matched to viewport; prefer modern formats (WebP/AVIF) with fallbacks.
- Reserve layout space (explicit dimensions or `aspect-ratio`) to prevent Cumulative Layout Shift.
- Treat the hero image as the primary LCP optimization target on every page.

## Asset Naming Convention

Pattern: `[type]-[category]-[scene/subject]-[variant]-[dimensions]-[language?].ext`

Examples:
- `hero-home-dashboard-relief-v1-1920x1080.avif`
- `illustration-attendance-workflow-isometric.svg`
- `photo-cricket-coach-pune-001.avif`
- `icon-calendar-outline.svg`
- `feature-payments-flow-v2-800w.webp`

## Asset Storage Structure

```
assets/
  hero/
  illustrations/
  photography/
  3d/
  icons/
  diagrams/
  feature/
  screenshots/
  logos/
  blog/
  social/
  generated/ (AI outputs, pre-approval)
  exports/ (final, optimized, ready to ship)
  working/ (source files: Figma, PSD, AI, Blender)
  archive/ (deprecated, retained for reference)
```

## Motion & Animation Guidance

**Use, sparingly:** subtle scroll-triggered parallax on heroes (small translation only); micro-interactions on hover (gentle lift + shadow, <200ms ease-out); Lottie for small purposeful animations (loading states, checkmarks); cinemagraphs for hero backgrounds when they add real emotional value and loop seamlessly.

**Avoid:** spinning objects, excessive particle effects, autoplay video with sound, distracting continuous loops, or any animation that pulls attention away from the headline or CTA. Always respect `prefers-reduced-motion`.

## Anti-Patterns — Never Do This

- Generic stock people (suits shaking hands, fake laptop stares, glass-boardroom high-fives).
- Inconsistent illustration styles mixed on one page (flat icons next to 3D clay renders).
- Mixed icon families (Material next to Feather next to custom-drawn).
- Random, jarring, or rainbow gradients used just to look "techy."
- Poor crops — cropped heads, hands, or cut-off product UI.
- Fake or tokenistic diversity — visibly composited faces, performative placement.
- Low-quality AI artifacts — malformed hands, uncanny faces, melted text — in any primary position.
- Busy, overloaded hero sections with no clear focal point.
- Cluttered feature compositions cramming too many props/icons/text blocks together.
- Inconsistent lighting direction between elements on the same page.
- Outdated device mockups or hardware silhouettes.
- Mixing photorealistic 3D with flat cartoon illustration in the same composition.
- Screenshots without contextual framing, or with broken/Lorem-Ipsum data.

## Quality Checklist

Before approving any marketing visual, confirm:

- [ ] Aligns with the ten Visual Principles (premium, human, optimistic, authentic, respectful, engaging, uncluttered, product-first, scalable, timeless)
- [ ] Visual hierarchy is correct (headline → product → CTA → artwork → decoration)
- [ ] Illustration/photography/3D style matches the Decision Tree for this page type
- [ ] Cultural representation is authentic, diverse, and free of stereotypes/tokenism
- [ ] Lighting, shadow direction, and color grading are consistent with the rest of the site
- [ ] Negative space reserved around headline/CTA; composition is uncluttered
- [ ] Screenshots (if present) show clean, realistic, on-brand data
- [ ] Icons belong to the single approved icon family
- [ ] Correct aspect ratio and responsive crops verified at desktop/tablet/mobile
- [ ] File optimized (modern format, compressed, correct dimensions, retina export)
- [ ] Meaningful alt text written (or explicitly marked decorative)
- [ ] Contrast meets WCAG AA where text overlays imagery
- [ ] No anti-patterns present

## Decision Framework

1. **Define the goal** — what emotional or comprehension job must this visual do?
2. **Consult the Decision Tree** — pick medium: photo, illustration, 3D, diagram, icon, or mockup.
3. **If illustration** — select a metaphor from the Visual Metaphor Library.
4. **Draft composition** — apply hierarchy, negative space, and hero/feature rules above.
5. **Source or generate** — custom photography > custom illustration/3D > AI-generated > stock, per the Stock vs Custom policy.
6. **Integrate** — apply consistent device frames, lighting, and backgrounds per the Product Screenshot Integration rules.
7. **Run the Quality Checklist** before shipping.

Quick lookups:
- Need emotional connection → Photography
- Need to explain a concept → Illustration
- Need premium positioning → 3D (strategically)
- Need a process/workflow → Diagram
- Need feature evidence → Product screenshot
- Need quick recognition → Icon
- Need delight → Subtle motion

## Collaboration & Boundaries

- **`design-system-architect`** — owns product UI, component libraries, spacing, typography, and color tokens. This skill *consumes* their approved color palette and typography for marketing pages but never defines product UI.
- **`heritage-visual-language-india`** — owns deep cultural research, traditional motifs, and regional art references. This skill applies a modern, premium SaaS interpretation of that guidance to marketing visuals; consult them to validate cultural accuracy.
- **`product-screenshot-mockup-specialist`** — owns producing the actual high-fidelity screenshots/mockups from the live product. This skill owns how those screenshots are framed, lit, and composed on the marketing page.
- **`image-generation`** — owns technical prompting mechanics, model selection, and generation execution. This skill provides the creative brief, style constraints, and negative-prompt standards they execute against.
- **`color-psychology-expert`** — owns the emotional/psychological rationale for color choices. This skill applies their approved palette to photography grading and illustration gradients.

## Examples

**Good — Homepage hero:** Bright, sunlit modern dance studio (photography, softly blurred background); crisp floating tablet mockup showing the UniqBrio schedule in the foreground; bold H1 with generous negative space on the left; calm, confident subject expression.

**Poor — Homepage hero:** Dark, neon 3D render with tiny floating characters, six competing illustration elements, small hard-to-read text — no clear focal point.

**Good — Feature section ("Automated Attendance"):** Semi-flat dimensional illustration showing a messy paper attendance list transforming via a glowing arrow into a clean digital checklist on a phone, warm optimistic palette.

**Poor — Feature section:** Stock photo of a confused-looking teacher holding a clipboard next to a generic calendar clip-art icon.

**Good — Testimonial:** Real, well-lit portrait photo of an actual cricket academy owner on their own pitch, clean background, quote overlaid in a simple typography card.

**Poor — Testimonial:** Generic illustrated smiley face with a quote mark, or an obviously stock "diverse team" photo unconnected to the real customer.

## Best Practices

- Build a visual moodboard (5–10 references) and get stakeholder sign-off before producing new page assets.
- Standardize 2–3 device mockup templates (desktop/tablet/mobile) with pre-set shadows and angles; reuse them everywhere.
- Prefer three excellent custom photos over ten mediocre stock photos — budget for real photography shoots.
- Review the whole site side-by-side each quarter to catch visual drift, not just page-by-page.
- Reuse visual motifs and metaphors across pages to reinforce brand recognition.
- Keep a living reference library of approved lighting setups, color grades, and prompt templates for consistency.

## Governance

**Review process:** every marketing visual passes through creative review → brand/cultural review → accessibility review → performance review → final design-lead approval before publishing.

**Approval criteria:** visual consistency, technical quality/optimization, accessibility compliance, cultural authenticity, and conversion-hierarchy support (headline/product/CTA never obscured).

**Asset lifecycle:** `working` (drafts/iterations) → `review` → `approved` → `exports`/`published` → `archive` (deprecated, retained ~6 months for reference, then retired). Every published asset should remain traceable to its source file and approval history.

**Brand evolution:** introduce new visual styles gradually and document version changes — never replace the visual language abruptly. Maintain backward compatibility with existing pages until a full site refresh is scheduled.
