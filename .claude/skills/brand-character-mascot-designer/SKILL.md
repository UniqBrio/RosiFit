---
name: brand-character-mascot-designer
description: Designs, silhouette-tests, locks, and governs a proprietary B2B SaaS brand character as an identity-and-reassurance layer — distinct from realistic human personas and from generic image-prompt craft — enforcing a rigorous mascot-vs-no-mascot decision gate, bounded emotion and pose systems, colour discipline, cultural-fit review, and strict non-substitution for product proof, through to a versioned production handoff. Trigger whenever a B2B SaaS brand is deciding whether to create, is actively designing, is locking, is auditing generated assets against, is scaling across sizes, or is retiring/redesigning a proprietary mascot or brand character for a marketing website.
---

# Brand Character / Mascot Designer

## 1. Purpose & Scope

This skill designs and **locks** a proprietary brand character for a B2B SaaS marketing website. Its job is to earn recognition, warmth, and brand memory in a category saturated with interchangeable dashboard screenshots — without the character degrading into decorative stock art, a generic cute mascot, or a substitute for product proof.

The governing principle: **the character earns attention; the product earns trust; the evidence earns conversion.** Never reverse those roles.

This skill owns the full mascot lifecycle: strategic decision → concept derivation → silhouette validation → shape/form design → canonical lock → emotion/pose budgets → scalability rules → colour discipline → cultural-fit review → consistency governance → retirement criteria → production handoff.

It does **not** own page composition, hero conversion architecture, illustration production execution, motion coding, or accessibility auditing of a finished page — it hands off to the skills that do, without letting them redefine the character.

## 2. Explicit Boundaries From Adjacent Skills

**`uniqbrio-character-bible`** locks two **realistic human personas** (Vijay and Ananya) for video/social production. It is explicitly **not** a mascot system. Never treat a human persona as a mascot, and never let this skill's outputs be treated as a human persona. If a request needs Vijay or Ananya, route there — do not derive, blend, or visually echo their likeness in the mascot (see Hard Role Boundary on real-person resemblance).

**`image-generation`** covers prompt craft across genres. It provides no identity locking, no silhouette discipline, no emotion/pose governance, no drift detection, and no mascot-specific role boundaries. This skill defines **what the character is**; `image-generation` is one possible renderer of an already-locked character, constrained by the parameters this skill hands it. It must never be used to invent or redefine the character.

## 3. Role Definition & Trigger Conditions

Act as a senior brand strategist, character-system designer, and production governor combined. Reject vague creative language ("make it appealing," "keep it consistent," "use good judgment") in favor of measurable, inspectable criteria throughout.

Trigger this skill when a request involves: deciding whether a mascot is warranted; designing or evolving a brand character; creating or updating a locked reference sheet; defining expressions or poses; reviewing AI-generated assets for drift; preparing a production handoff; or judging whether a character belongs in a specific page context (e.g., hero, pricing, onboarding). Do not trigger merely because a request involves any illustration or image.

## 4. Canonical Operating Context (Default Example Environment)

- **Product:** UniqBrio, by **UniqBotz Infotech** — India-first B2B SaaS for arts and sports academy management.
- **Audience:** Indian arts and sports academy owners, typically overwhelmed by scheduling, fee collection, and attendance chaos; anxious about looking unprofessional and about software complexity; migrating from pen-and-paper or WhatsApp.
- **Site:** Public pre-login marketing site. Conversion goals: signups, demo bookings, paid customers.
- **Stack:** React Native Expo PWA + Next.js + Supabase (PostgreSQL + Edge Functions) + Vercel.
- **Brand accents:** Purple `#6708C0`, Orange `#DE7D14`.
- **Strategic tension:** differentiate from generic SaaS dashboard sites while preserving credibility and conversion clarity. The character may create recognition, warmth, and reassurance — it must never become evidence of product functionality.

Use this context by default unless another project is explicitly supplied.

## 5. Required Inputs

- Positioning statement, ICP definition, category/competitive visual landscape.
- Audience anxieties, frustrations, aspirations, and buying psychology.
- Existing brand palette, typography, and any current visual/illustration language.
- Target page contexts (hero, onboarding, navigation, pricing, empty states, etc.).
- If a character already exists: current lock version, prior assets, known failure history.

If information is missing, make a reasonable, stated assumption and proceed — do not stall the workflow for optional detail.

## 6. Outputs / Deliverables

Mascot decision record → concept rationale → silhouette test report → form/shape rationale → LOCKED design sheet → emotion budget → pose library → scalability rules → colour spec → cultural-fit review → consistency-drift checklist → retirement criteria → production handoff package → Final Mascot System Lock checklist.

---

## 7. Decision Gate: Mascot vs. No-Mascot

**Default posture is skepticism.** Never assume every SaaS brand needs a mascot.

### 7.1 Scoring Matrix

Score each 0–5 (0 = strongly against, 5 = strongly for):

| Factor | What to ask |
|---|---|
| Identity value | Is the brand currently interchangeable with competitors' dashboard-screenshot visuals? |
| Emotional reassurance | Does the ICP feel operational anxiety, onboarding fear, or overwhelm a warm identity could ease? |
| Differentiation | Is the category visually saturated with sameness a character could cut through? |
| Memorability | Is there a long consideration cycle or multiple stakeholders who need brand recall between visits? |
| Category fit | Do category leaders already succeed with pure product/photography, or is personality welcomed? |
| Implementation cost | Does a pipeline exist (or can one exist) to maintain a locked system without drift? |
| Perceived maturity | Would a character read as sophisticated for *paid* B2B software, or would it read as juvenile? |

**Decision rule:** 28–35 → **GO** (subject to role-boundary review). 21–27 → **CONDITIONAL** (record exact deployment limits). 0–20 → **NO-GO**.
**Override:** any severe hard-boundary risk (see §12) overrides the numeric score — reject regardless of a high score if the only apparent value depends on implying a product claim.

### 7.2 When a Mascot Is the Wrong Answer (B2B Counter-Examples)

- High-compliance, high-stakes categories (core banking, cybersecurity, clinical/diagnostic, defense-adjacent) where personality can read as a lack of seriousness.
- Brands whose differentiation already comes from a distinctive product UI, data visualization, or photographic identity.
- Any situation where the character would need to sit near product-proof evidence and could be mistaken for that evidence.
- Teams without the bandwidth to maintain a locked reference and run drift checks — an unmaintained mascot degrades faster than no mascot.
- Using a character to visually paper over a lack of real testimonials, screenshots, or case studies ("the juvenile cover-up").

### 7.3 Decision Output

Always output exactly one of:
- **GO** — proceed to Concept Derivation; document the rationale.
- **NO-GO** — stop; recommend an alternative identity system (distinctive illustration style, data visualization language, typographic lockup, photography).
- **CONDITIONAL** — proceed only within named limits, e.g., "GO for onboarding, navigation, and transition moments only; NO mascot on pricing or product-proof viewports."

---

## 8. Concept Derivation

Never derive from "make it cute." Derive from strategy:

```
Positioning → ICP anxieties/aspirations → desired brand perception →
character metaphor → physical form → signature identity
```

### 8.1 Process

1. Name the ICP's specific fear or frustration relevant to the purchase decision (for UniqBrio: fear of scheduling chaos, fee-collection panic, looking unprofessional to parents, fear that software will be too complex for staff).
2. Name the aspiration the brand should evoke (calm, orderly, competent operation).
3. State what the character **represents** — 1–3 strategic concepts only (e.g., "calm operational support," "organized progress," "approachable technical competence").
4. State what the character **deliberately does NOT represent** — at least 4 explicit exclusions (e.g., not a student, not a coach, not a parent, not a customer, not a guarantee of business outcomes, not an AI employee).
5. Write a concept rationale of roughly 80–120 words that survives handoff to designers, illustrators, animators, and developers without further interpretation.

### 8.2 Worked Example (UniqBrio)

> The character is a compact, geometric companion representing calm operational support for academy owners overwhelmed by administrative chaos. Its rounded-but-structured form embodies orderly flow and quiet competence — the relief of a system that simply works. It does not represent a student, coach, parent, or any customer; it makes no claim about attendance accuracy, revenue growth, or feature performance. It exists to be recognized and to reassure, never to demonstrate.

---

## 9. Silhouette Test (Mandatory Gate)

The character must remain recognisable as a **solid black silhouette at 64px**. No visual refinement proceeds until this passes.

### 9.1 Procedure

1. Render the design as pure flat black (`#000000`) on white, no internal lines, no colour, no shading, no texture.
2. Scale to 64x64px (also check 48px and 128px for context).
3. Show it to 3-5 people unfamiliar with the project for <=3 seconds each; ask "what is this?" and "would you recognise it again?"
4. **Pass criteria:** >=4/5 correctly identify the subject or its unique signature feature; >=3/5 say they would recognise it again later.

### 9.2 Failure Modes (Automatic Reject)

Generic humanoid silhouette with no distinctive contour · excessive internal detail that collapses to noise · indistinguishable/merged limbs · overly complex accessories that blob together · weak or absent negative space · identity that depends on colour, texture, or facial detail rather than outline alone.

**Corrective action:** simplify mass, increase negative space around limbs/appendages by a visible margin, and concentrate identity into one or two signature contour features rather than many small details.

---

## 10. Form & Shape-Language Rationale

Use shape psychology **deliberately**, not decoratively. Every major shape choice needs a stated communication function.

| Shape family | Reads as | Use for |
|---|---|---|
| Rounded / soft curves | Approachable, safe, human-centric | Head/core mass — tempered so it doesn't read as childish alone |
| Squares / stable rectangles / trapezoids | Structural reliability, security, professionalism | Body/base mass — grounds the character in B2B credibility |
| Controlled angles / triangular accents | Precision, technical competence, energy | Sparse accents only (a collar edge, a visor line) — never dominant, never spiky/hostile |

**Proportion guidance:** roughly 1:1.5 to 1:2 head-to-body ratio — mature enough to avoid a chibi/infantile 1:1 ratio, approachable enough to avoid a heroic/imposing 1:3+ ratio. Keep a low, grounded visual mass to imply stability. Avoid noodle-limbs or anatomy that distorts identity when posed.

**Signature features:** select 1-3 stable identity anchors (a distinctive head geometry, a unique shoulder or collar shape, one consistent negative-space cut). Do not create ten small details — recognition improves with *few, stable* anchors, not many decorative ones.

**Sophistication threshold — reject:** oversized cartoon eyes, exaggerated smiles, childish proportions, toy-like gloss/plastic materials, random accessories, generic humanoid-robot tropes (antennae, glowing eyes, floating dashboards), emoji-style faces. A character can be warm without being childish, approachable without being cute, expressive within budget without being theatrical.

Coordinate with `shape-psychology-expert` for deeper form-to-personality validation; this skill owns the final selection and lock.

---

## 11. LOCKED Design Sheet (Single Source of Truth)

### 11.1 Minimum Required Views

Front view · three-quarter view · side view · 48px thumbnail/crop.

Recommended additions: pure silhouette, approved-emotion set, approved-pose set, colour/material swatches, scale comparison examples.

### 11.2 Identity Anchors — Immutable (require a formal re-lock to change)

Silhouette contour · proportions and visual mass · face/feature geometry and placement · signature features/accessories · primary material/surface language · core palette and its allocation ratios · baseline rendering style.

### 11.3 Variable Within Guardrails

Pose (from the approved library only) · expression (from the approved budget only) · crop/framing · scale · lighting consistent with the brand system · environment/background context.

**Rule:** a variable attribute must never modify an immutable anchor.

### 11.4 Versioning & Update Protocol

Use semantic versioning, e.g. `uniqbrio-mascot-v1.0`, `v1.1`, `v2.0`.

- **Patch/minor** (`v1.0 -> v1.1`): production corrections, small technical cleanup, controlled secondary refinement. No identity-anchor change.
- **Major** (`v1.0 -> v2.0`): only when silhouette, proportions, face geometry, signature features, or palette architecture change — requires documented evidence (§17) and a full re-run of the lock checklist.
- Never silently modify the canonical reference. Change requests must state: problem → evidence → impact → proposed change → affected anchors → version decision → new reference sheet → regression review → new lock.
- All character-generation work must start from the **current locked reference**, never from memory, a prior generated asset, or a text description alone.

---

## 12. Bounded Emotion Budget

Ship **at most 3** expressions.

**Why bounded:** an unlimited expression set invites cartoon exaggeration, dilutes recognition, multiplies production cost, and risks undermining B2B credibility. A small, purposeful vocabulary reads as more professional and is easier to keep recognisably "the same character."

### 12.1 Recommended Default Set (adapt to the brand's actual communication jobs)

1. **Calm confidence / neutral** — default identity state; trust, navigation, general presence.
2. **Warm reassurance** — onboarding, welcome, activation, form/checkout adjacency.
3. **Focused attentiveness** — exploration, transitions, section support.

### 12.2 Rules

- Reject: extreme surprise, cartoon shock, giant smiles, crying, exaggerated fear, slapstick, or celebratory poses that imply a business outcome.
- Every expression must keep the same eye/feature geometry family, same head angle range, and same silhouette contribution as the locked neutral state — intensity may shift only within a small, stated range (e.g., brow angle +/-10-15 degrees).
- A fourth expression requires a formal lock revision, not an ad-hoc addition.

---

## 13. Pose Library Tied to Page Jobs

Never generate arbitrary poses. Build a bounded library; every pose maps to a named communication job.

| Pose ID | Job | Typical placement | Prohibited implication |
|---|---|---|---|
| P01 Identity | Brand anchor | Nav, footer, 48px marks | Any proof adjacency |
| P02 Reassurance | Calm support | Near anxiety-reducing copy, forms | Implying the form/payment already succeeded |
| P03 Onboarding warmth | Welcome | Signup, first-use | Demonstrating a feature working |
| P04 Navigation | Soft wayfinding | Section dividers, secondary nav | Pointing at a claim or metric |
| P05 Transition | Continuity | Between content blocks | Outcome or performance framing |
| P06 Section support | Decorative identity | Explanatory sections | Any customer or coach role-play |

**New pose approval criteria:** serves a named, already-defined communication job · preserves every immutable anchor · does not imply a product claim, customer outcome, or feature performance · passes 48px legibility · reproducible without inventing a new expression.

**Prohibited pose logic (reject on sight):** the character celebrating a metric, "fixing" a payment, standing beside a growth chart in a way that implies causation, holding/operating UI, dressed as or acting as a coach/parent/student/employee.

---

## 14. Scalability: 48px to Hero

| Tier | Purpose | Must survive | May disappear |
|---|---|---|---|
| 48px (nav/brand mark) | Compact identity | Silhouette, primary mass, signature feature, dominant colour relationship | Micro-detail, secondary accessories, texture, fine gradients |
| Small UI / supporting | Cards, secondary moments | Face geometry, silhouette, primary accessory, core colour allocation | Environmental context, subtle highlights |
| Section-level | Explanatory content | All of the above, plus approved pose/expression | — |
| Hero-scale | High-impact identity | Full material language, larger silhouette, restrained lighting | Nothing required to disappear, but nothing new may be added purely because the canvas is larger |

**Rule:** more canvas != more detail. Identity anchors must remain visually dominant at every tier. At hero scale, preserve clear negative space and avoid clutter behind the character — detail expansion should come from material/lighting depth, not new decorative parts. Crop rules: 48px prefers centred, high-contrast, minimal ambiguity; hero scale may crop aggressively only if the silhouette and signature feature remain unmistakable. Never crop away every identity anchor.

---

## 15. Colour Discipline

Stay inside the existing two-accent brand palette plus neutrals — never expand the palette "to make it fun."

For UniqBrio: **Purple `#6708C0`** as the primary/dominant accent (character body/core identity), **Orange `#DE7D14`** as a controlled signature accent (one focal feature — an eye, a badge, a highlight), and neutral values (near-white/near-black/greys) for structure, shading, and separation.

**Allocation guidance:** primary accent should visibly dominate; the secondary accent should read as a deliberate focal point, not compete for dominance; neutrals should never become a de facto third brand colour.

**Accessibility:** meet WCAG AA contrast for any text or interactive element near the character; the character must remain identifiable in grayscale/monochrome by shape alone, not only by colour, for colour-blind users. Coordinate final checks with `color-psychology-expert` and `accessibility-specialist`.

The result must feel native to the brand system — not like a separately purchased illustration pack.

---

## 16. Hard Role Boundaries (Mandatory, Non-Negotiable)

1. The character **NEVER** carries a product claim.
2. The character **NEVER** substitutes for product proof.
3. The character **MUST NEVER** appear in the same viewport as the primary product-proof visual when doing so creates ambiguity about what constitutes evidence.
4. The character **MUST NEVER** depict or imply a customer.
5. The character **MUST NEVER** resemble a named real person (including the `uniqbrio-character-bible` personas — never blend or echo their likeness).
6. The character **MUST NEVER** visually imply a feature works unless actual product proof is separately and independently shown.
7. The character must **never become a spokesperson** whose visual behaviour communicates claims that copy or product evidence has not established.
8. The mascot is an **identity/reassurance layer**, not a **product-demonstration layer** — full stop.

### 16.1 Interaction With `saas-website-visual-storytelling-director`

That skill owns overall visual narrative, scene sequencing, and where proof lives on the page. This skill owns character identity and constraints. Hand off the locked character plus its approved pose/emotion library; the storytelling director decides *where and whether* the character supports a given section's narrative. It may not redefine the character, and it must never assign the character a proof-bearing job.

### 16.2 Interaction With `hero-section-cro-specialist`

The CRO specialist owns hierarchy, CTA priority, and proof placement in the hero. The character may appear there only as identity/reassurance support — never as the primary visual, never competing with the CTA or the proof block. If the character's presence creates any ambiguity about what counts as evidence, or draws attention away from the value proposition/CTA, it must be reduced, repositioned, cropped, or removed. Placement decisions in the hero are the CRO specialist's call; character *design* constraints are this skill's call — the CRO specialist may not stretch the character into a proof role to solve a conversion problem.

---

## 17. Cultural-Fit Review (India-First B2B)

Mandatory gate. Explicitly assess:

- **Childishness / toy-likeness** — would this undermine a paid-software purchase decision in front of parents, staff, or a board?
- **Juvenile proportions or exaggerated cuteness.**
- **Over-Westernization** — tropes (mascot costumes, Western holiday iconography, slang gestures) with no strategic link to the brand.
- **Cultural awkwardness or superficial "Indianisation"** — reject token traditional clothing, bindis, turbans, or festive ornaments bolted onto an unrelated character purely to "look local."
- **Unseriousness relative to enterprise-adjacent B2B buying norms.**

Heritage or regional visual language may be used only when it is strategically justified (not decorative) — deeply integrated into the character's structural geometry rather than applied as surface decoration — and only in coordination with `heritage-visual-language-india`. Default posture: sophisticated, contemporary, calm competence over cultural signaling.

---

## 18. Consistency-Drift Checklist

Run on **every new asset** before acceptance. All generation work must start from the current locked reference — never from a prior generated asset or from memory.

- [ ] Silhouette matches the lock at 64px
- [ ] Proportions match exactly (no head/limb creep)
- [ ] Face/feature geometry and placement match
- [ ] Colour uses only approved hex values, in approved allocation
- [ ] Material/surface language matches (no unintended gloss, texture, or flattening)
- [ ] Signature accessories present and unaltered; no new accessories added
- [ ] Expression is one of the <=3 approved states, at approved intensity
- [ ] Pose is from the approved library and maps to a named page job
- [ ] Perspective is plausible and consistent with the locked views
- [ ] Lighting is brand-system consistent, single coherent source
- [ ] Rendering style matches (no drift toward realism, gloss, or cartoon exaggeration)
- [ ] Crop/framing preserves the signature contour
- [ ] Personality reads as the same character (no sudden aggression, childishness, or theatricality)

**Common AI-generation drift patterns to watch for:** head/eye-spacing shifts, limb proportion drift, extra or missing limbs, accessory multiplication or substitution, unrequested new colours or hues, material/gloss changes, face drifting toward human- or animal-like, sudden unapproved smiling or exaggeration, silhouette bloating at larger scales, generic "SaaS 3D illustration" styling creeping in.

**Rejection vs. acceptable adaptation:** reject any change to an immutable anchor (silhouette, proportions, face geometry, signature feature, palette architecture). Accept camera-angle changes, in-budget lighting variation, approved-pose changes, background changes, crop changes that preserve recognisability, and scale-appropriate detail simplification.

---

## 19. Retirement & Redesign Criteria

Never redesign for novelty or subjective boredom. Breaking the lock requires **evidence**, not preference.

**Valid triggers:** weak unassisted recognition in testing · statistically significant negative conversion contribution over a sustained A/B test window · explicit audience rejection or "childish/unprofessional" feedback · confirmed cultural mismatch · visual ageing relative to the wider brand system · production burden that consistently exceeds value · inability to scale cleanly across required sizes · material brand repositioning the current concept can't support.

**Decision states:** **Freeze** (performing adequately, no action) · **Refine** (minor version bump for production-only fixes) · **Redesign** (major version, full re-lock, requires documented evidence) · **Retire** (no measurable strategic role, or net-negative).

Before breaking a lock, document: problem → evidence → impact → proposed change → affected identity anchors → version impact → expected improvement. "It feels dated" is not sufficient; "user testing shows repeated misclassification as a children's product after our shift toward larger academy chains" is.

---

## 20. Asset-Production Handoff Contract

### 20.1 Required Deliverables

Locked design sheet (front, 3/4, side, 48px, silhouette) · identity-anchor specification (ratios, hex values, geometry notes) · approved emotion set · approved pose library with job mappings · colour/material spec · immutable vs. variable attribute lists · explicit prohibited-variation list · version identifier · usage boundaries (where the character may/may not appear) · production notes.

### 20.2 File Formats

Vector masters (SVG, source format as required) for infinite scaling · transparent-background PNG/WebP raster exports at defined tiers · a Markdown/PDF documentation package for the lock itself. The canonical identity must never depend on a flattened JPEG.

### 20.3 Naming Convention

`[brand]-mascot-[view|pose|emotion]-[scale]-v[major].[minor].[ext]`

Correct: `uniqbrio-mascot-front-master-v1.0.svg`, `uniqbrio-mascot-pose-reassurance-section-v1.0.svg`, `uniqbrio-mascot-emotion-warm-v1.0.svg`.
Incorrect: `mascot_final.png`, `mascot-new2.png`, `final-final.png` — no descriptive meaning, no version, breaks pipeline traceability.

### 20.4 Downstream Contracts

| Skill | Receives | Constraint |
|---|---|---|
| `web-illustration-asset-production-pipeline` | Locked vectors, version, pose/emotion, target dimensions, crop, background needs | Adapts for production; **must not** alter geometry, proportions, or palette |
| `image-generation` | Canonical reference, locked anchors, approved pose/emotion, framing/lighting/environment brief | Renders within constraints; any conflict with the lock is regenerated, never resolved by redefining the character |
| `character-consistency-checker` | Generated asset + canonical reference + the §18 checklist | Blocks publication on any identity-anchor failure |
| `web-motion-implementation-director` | Approved poses/expressions only, plus motion-safety constraints | Motion may add movement; it may never introduce a new personality, claim, or identity, or distort the locked silhouette |
| `accessibility-specialist` | Final visual, scale, placement, contrast context, motion behaviour | Validates WCAG compliance; feedback may require production adaptation but not silent redefinition of the character |

**Downstream production tools must not redefine the character.** Any conflict is resolved by returning to the lock, not by accepting drift.

---

## 21. Cross-Skill Orchestration

Ownership map (invoke only what's relevant to the current stage — this is not a mandatory sequence for every project):

```
Brand strategy
  -> brand-character-mascot-designer (decision, concept, form, lock)
    -> shape-psychology-expert        (validates form-to-personality mapping)
    -> heritage-visual-language-india (consulted only if cultural language is strategically justified)
    -> color-psychology-expert        (validates accent allocation and accessibility)
  -> Mascot System Lock
    -> saas-website-visual-storytelling-director (assigns placement within page narrative)
    -> hero-section-cro-specialist                (approves/limits hero presence)
  -> Production handoff
    -> web-illustration-asset-production-pipeline (executes production assets)
    -> image-generation                           (renders within locked constraints)
    -> character-consistency-checker              (drift QA gate)
    -> web-motion-implementation-director          (constrained animation)
    -> accessibility-specialist                    (final accessibility audit)
```

`uniqbrio-character-bible` sits outside this chain entirely — it owns the two realistic human personas for video/social; this skill and that one must never substitute for each other, and no asset from either system should be relabeled into the other's role.

---

## 22. Complete Workflow

1. **Intake** — gather positioning, ICP, anxieties, palette, competitive landscape, target page contexts. *Gate: if a mascot clearly isn't the right tool, stop here and recommend an alternative.*
2. **Mascot-vs-No-Mascot Decision** — score §7.1, output GO / NO-GO / CONDITIONAL. *Gate: NO-GO ends the workflow; CONDITIONAL requires named deployment limits before continuing.*
3. **Concept Derivation** — represents / does-not-represent + rationale. *Gate: reject if the concept's value depends on an implied product claim.*
4. **Form & Shape Exploration** — geometry, proportions, signature features (coordinate with `shape-psychology-expert`).
5. **Silhouette Test** — render, test at 64px. *Gate: must pass before any colour/material refinement.*
6. **Cultural-Fit Review** — run §17. *Gate: any significant mismatch blocks lock.*
7. **LOCKED Design Sheet** — front, 3/4, side, 48px; identity anchors documented; version assigned.
8. **Emotion Budget Lock** — <=3 expressions, each with a communication job.
9. **Pose Library Lock** — approved poses mapped to page jobs; prohibited-pose list confirmed.
10. **Scalability & Colour Rules** — 48px->hero rules; palette allocation within brand accents.
11. **Role-Boundary Review** — test against all 8 hard constraints in §16. *Gate: any violation blocks approval.*
12. **Handoff Package Assembly** — deliverables per §20.
13. **Regression QA** — every subsequent production asset is compared to the lock via §18; failures are rejected or regenerated, never silently accepted.

---

## 23. Examples (Reusable Reasoning Patterns)

**Good decision:** Category is saturated with identical dashboard screenshots; ICP feels real operational anxiety; a restrained, non-human, geometric character can create recognition and reassurance without claiming an outcome. -> **GO**, with poses confined to identity/onboarding/transition and explicitly excluded from pricing and proof viewports.

**Bad decision:** A compliance-heavy enterprise tool proposes a smiling cartoon character next to audit metrics. The page needs institutional trust and precise evidence; a character there raises doubt about seriousness. -> **NO-GO** — recommend product proof, data visualization, and trust signals instead.

**Concept rationale (pattern):** "Represents X, Y (max 3). Does not represent A, B, C, D. Exists because [category visual sameness / audience anxiety]. Appears in [contexts]. Never appears in [contexts]."

**Silhouette failure (pattern):** A humanoid-with-antenna-and-backpack design reduces to an ordinary humanoid blob at 64px — identity depends on surface detail, not contour. **Reject**; rebuild around one strong signature contour feature.

**Emotion budget (pattern):** E01 Calm confidence (trust/navigation), E02 Warm welcome (onboarding), E03 Focused attentiveness (exploration/transition). Not approved: shock, celebration, sadness, anger — unnecessary theatricality and drift risk.

**Pose-to-page-job (pattern):** Homepage hero -> P01 Identity, restrained stance, no pointing at claims. Onboarding -> P03 Welcome. Feature explanation -> P06 Section support, standing beside — never operating — the UI. Pricing -> no mascot unless testing shows zero evidence ambiguity.

**Role-boundary violation (pattern):** Character standing beside a payment screen holding a "Paid" badge. **Reject** — visually implies successful payment behaviour, i.e., a product claim the character is not entitled to make. Correct approach: show the real payment UI as proof; keep the character, if present at all, clearly secondary and non-interactive with that UI.

**Drift failure (pattern):** Locked reference has a compact body, single orange signature accent, neutral material. A generated asset arrives taller, with new blue highlights, an extra antenna, and an unapproved smiling mouth. **Reject** and regenerate from the current lock — do not "accept and update the lock" to match the drifted asset.

**Handoff naming (pattern):** Correct — `uniqbrio-mascot-pose-welcome-section-v1.0.svg`. Incorrect — `mascot_happy_final2.png` (no brand prefix, unapproved-sounding emotion, no version, breaks pipeline traceability).

---

## 24. Final Mascot System Lock Checklist

- [ ] Mascot-vs-no-mascot decision explicitly scored and recorded (GO/NO-GO/CONDITIONAL) with rationale
- [ ] Concept rationale states what the character represents and explicitly does not represent
- [ ] 64px silhouette test passed and documented, with no active failure mode
- [ ] Form/shape-language choices are justified by function, not aesthetics alone, and pass the B2B sophistication threshold
- [ ] Locked design sheet contains front, 3/4, side, and 48px views; version assigned
- [ ] Immutable identity anchors and allowed variable attributes are explicitly listed
- [ ] Emotion budget <=3, each mapped to a communication job
- [ ] Pose library is bounded, each pose mapped to a page job, and the prohibited-pose list is documented
- [ ] Scalability rules defined and verified across 48px, small UI, section, and hero tiers
- [ ] Colour usage strictly within the two brand accents plus approved neutrals; accessibility contrast confirmed
- [ ] All 8 hard role boundaries explicitly reviewed and confirmed with zero violations
- [ ] Cultural-fit review completed for the target audience with no unresolved concerns
- [ ] Consistency-drift checklist attached for downstream QA use
- [ ] Retirement/redesign criteria documented and evidence bar restated
- [ ] Full handoff package assembled: files, naming convention, per-skill contracts
- [ ] Cross-skill sequencing confirmed with `saas-website-visual-storytelling-director` and `hero-section-cro-specialist` for placement, and with production/QA/motion/accessibility skills for execution

**Status once all boxes are checked: LOCKED.** Downstream teams may adapt context (scale, crop, pose selection, motion) but may not redefine character identity.
