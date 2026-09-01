# IMAGE GENERATION PROMPTS — brand-locked templates ({SITE_NAME} website)
<!-- website_workflow/image_prompts.md — added 2026-08-09 via framework
     update (prevents: unbranded/improvised asset prompts; gap exposed by
     the UniqBotz plan review). Use WITH the image-generation skill.
     Every generated asset also passes existing gates: app_reality truth
     rules (no fake people/counts/ratings), state-contrast, weight budget. -->

## BASE STYLE BLOCK (prepend to every prompt)
"{SITE_NAME} brand style: near-black background ({BG_0}) with dark card
surfaces ({BG_1}); accents ONLY saturated orange ({ACCENT_1}) and purple
({ACCENT_2}, light variant {ACCENT_2_TEXT} for fine lines/text); clean modern
vector/flat illustration, subtle depth and soft glows; generous negative
space; no watermark, no text unless specified, no stock-photo look, no
fake humans presented as customers, no invented UI numbers."
THEME: the block above describes a DARK surface, which is the default
({THEME_MODE}=SINGLE-DARK). For a SINGLE-LIGHT site, swap the background to
white with dark zinc (#18181B) text/linework and the same two accents — the
parallel case, not an afterthought.
For a DUAL site, an asset must be THEME-SAFE: prefer a transparent
background so it sits on either surface, or produce TWO variants (one per
theme) and record both in the provenance record. An asset with a baked
background is a known toggle failure (theme_system.md §WHAT DOES NOT
AUTO-UPDATE) — it will not invert and will look pasted-on in one theme.
For LIGHT-surface assets (email headers, print): white background,
text/linework dark zinc (#18181B), same two accents.

## NEGATIVE RULES (append to every prompt)
"Avoid: clutter, more than two accent colors, gradients covering >30% of
frame, either accent used as text where it measures below 4.5:1 against the
active {BG_0} (which accent that is INVERTS with polarity — measure, never
assume), fake testimonials/star ratings, decorative stock mascots or generic
3D corporate characters (an APPROVED brand character built per §MASCOT is
exempt), illegible small text, purple text on dark backgrounds."

## TEMPLATES
1. HERO PRODUCT VISUAL
"[BASE]. A realistic laptop/phone mockup displaying the actual {SITE_NAME}
dashboard screenshot [attach real screenshot], floating at a slight
perspective tilt over a dark stage; one soft orange rim light left, faint
purple ambient glow right; tiny floating UI chips (WhatsApp receipt, fee
paid tick) around it. Composition leaves top-left third empty for headline."

2. SECTION ICON (repeat per feature)
"[BASE]. Minimal line icon of [subject: e.g., attendance ledger / WhatsApp
bubble with rupee tick / batch calendar], 2.5px consistent stroke, rounded
joints, orange primary stroke with one purple secondary element, on
transparent background, 1:1, crisp at 48px."

3. PROCESS / FLOW GRAPHIC
"[BASE]. Horizontal 4-step flow: [steps]; each step a dark rounded card
with a single icon and connector arrows in {ACCENT_2_TEXT}; step numbers in orange;
even spacing; readable at 800px wide."

4. OG / SOCIAL SHARE IMAGE (1200x630)
"[BASE]. Bold left-aligned headline area (leave empty for overlay text),
right side the real product screenshot in a tilted card with orange edge
glow; {SITE_NAME} logo bottom-left safe zone; high contrast, mobile-legible."

5. BEFORE/AFTER OPERATIONS ILLUSTRATION
"[BASE]. Split composition: left, cluttered paper registers and Excel grid
in desaturated zinc tones; right, one clean glowing dashboard card in brand
accents; a single orange arrow bridging them; no humans' faces."

6. TEXTURE / SECTION BACKGROUND
"[BASE]. Extremely subtle geometric mesh of thin {ACCENT_2_TEXT} lines at 5-8%
opacity on {BG_0}, corner-weighted, must not reduce text contrast."

7. BRAND CHARACTER — DESIGN SHEET (RENDERING AID ONLY — the character is
   DESIGNED by brand-character-mascot-designer, never invented by this prompt.
   Run only after that skill has issued GO/CONDITIONAL and supplied the
   concept, identity anchors and silhouette-test result. A render is a
   CANDIDATE for the lock, never the lock itself.)
"[BASE]. Character design sheet for {SITE_NAME}'s brand character, rendering
the concept and identity anchors supplied by brand-character-mascot-designer
[paste anchors: geometry, proportions, signature contour features, hex
allocation — do not improvise any of these];
clean modern flat/vector illustration, bold readable silhouette, simple
shapes, no gradients on the body, orange primary with one purple secondary;
front / three-quarter / side turnaround on a plain neutral background,
plus a 48px thumbnail test crop; consistent 2.5px linework; no text,
no logo, no realistic human faces, not a photo, not 3D."

8. BRAND CHARACTER — IN-SCENE (repeat per slot, character locked)
"[BASE]. The APPROVED {SITE_NAME} brand character [attach the approved design
sheet — never re-describe from memory], [pose/action tied to the slot's job:
e.g. handing over a completed attendance card], expression [one of the ≤3
shipped emotions], beside/behind a real {SITE_NAME} UI element [attach real
screenshot], generous negative space on the [left/right] third for headline;
character occupies at most one third of the frame; transparent background
where the asset will sit on a section surface."

9. CINEMAGRAPH — SOURCE STILL (generate in Qwen, then animate; see §CINEMAGRAPH)
"[BASE]. [SUBJECT: the single real thing in frame — e.g. an academy front
desk at dusk, a coach's hands closing a register, a phone showing the real
{SITE_NAME} fee-receipt screen]. COMPOSITION: [framing + where the empty
third sits for headline/CTA overlay; state the focal point explicitly].
STATIC ELEMENTS (must remain perfectly still — name them, because everything
unnamed is a candidate for unwanted motion): [e.g. desk, walls, signage,
the person's body and face, all UI text]. INTENDED MOTION (ONE loopable
element only, subtle, seamless): [e.g. steam drifting from a cup / a slow
ceiling-fan rotation / light glinting once across a screen edge]. VISUAL
STYLE: [cinematic realism | flat vector | brand-illustration], lighting
[soft key from left, orange rim, faint purple ambient], colour restricted to
the BASE palette. ASPECT RATIO: [16:9 hero | 4:5 mobile-first | 1:1 card].
PLACEMENT: [exact site slot, e.g. homepage hero right-third]. No text in the
frame. No fake humans presented as customers. No invented UI — attach a REAL
screenshot for any product surface."
Owner step: generate this still in **Qwen**, curate the best candidate, THEN
apply the loop (the motion pass is a separate step — Qwen produces the
source frame, not the finished loop). Record the tool + prompt in the
provenance record; a render is a candidate, never a commit.

## CINEMAGRAPH GATE (a cinemagraph is MOTION — it clears these before it exists)
Do NOT commission one by default. Most marketing-site cinemagraphs are
ambient texture, which animation_library.md defaults to REJECT.
1. FORMAT DECISION FIRST: cinemagraph is one scored option in
   strategy_audit.md §S4, against static image / product shot / video /
   animation. It wins only when the slot's job is EMOTION or ATMOSPHERE that
   a still cannot carry, and only when a still genuinely loses something —
   not because motion feels premium.
2. FOUR-JOB TEST (animation_library.md PRIME RULE): name which of hierarchy /
   interaction feedback / storytelling-state-communication / loading-wait it
   serves. A cinemagraph usually serves storytelling or nothing. If the
   honest answer is "atmosphere", it is category 8 ambient — one per
   viewport maximum, explicit written reason, and a Q9 professional pass.
3. ONE MOTION ELEMENT. Two or more moving things is a video, not a
   cinemagraph, and gets scored as video (with video's LCP evidence burden).
4. SEAMLESS LOOP, no visible cut, no motion that draws the eye off the CTA.
5. FORMAT & WEIGHT: ship MP4/WebM with a poster frame — **never an animated
   GIF** (order-of-magnitude heavier for the same seconds). Autoplay muted,
   `playsinline`, `loop`, `preload="none"` unless it IS the LCP element.
   Counts against the Q8 budget; route through
   web-illustration-asset-production-pipeline like any other asset.
6. STATIC FALLBACK IS MANDATORY: `prefers-reduced-motion` renders the poster
   frame, and the slot must still work with zero motion. If the slot fails
   without the loop, the loop is carrying meaning it shouldn't.
7. TRUTH: app_reality.md governs. No fabricated customers, no invented UI,
   no implied scale.
NOTE: the mapped skill `gif-and-cinemagraph-brief` is NOT installed in this
repo (checked 2026-08-24). Until it is, this template plus the gate above is
the procedure — skills_map.md §Fallback is satisfied by naming that here
rather than stopping the pipeline for a format the framework can specify
itself.

## MASCOT QUALITY BAR (a character asset fails Phase 1 without all seven)
AUTHORITY: brand-character-mascot-designer is the source of truth for 1-4 and 6.
This bar is the checkable summary the flow's gates read — where the two differ,
the SKILL wins and this bar is corrected via framework_update.md.
1. SILHOUETTE TEST: solid black at 64px; ≥4/5 naive viewers identify it in
   ≤3s, ≥3/5 would recognise it again (skill §9). "Looks distinctive" is not
   a result — record the actual tally.
2. LOCKED DESIGN: a versioned lock exists (front / three-quarter / side / 48px /
   silhouette) with immutable identity anchors written down (skill §11).
   Every later asset attaches it; character-consistency-checker verifies drift.
   Changing an identity anchor = formal re-lock + major version, never a tweak.
3. EMOTION BUDGET: at most 3 expressions ship site-wide, each with a named
   communication job. POSE BUDGET: only poses in the locked library.
4. SCALE: legible at 48px (nav/footer) and at hero without redraw. More canvas
   ≠ more detail — no new parts appear because the frame grew (skill §14).
5. FORMAT & PRODUCTION: decided by web-illustration-asset-production-pipeline,
   not by preference. Vector master (SVG) is the canonical identity; the lock
   may never depend on a flattened JPEG. Raster ships only with the written
   trade-off that skill requires. Weight counts against the Q8 budget.
6. ROLE: the character never carries a claim, never stands in for proof, never
   appears in the same viewport as the product-proof visual, never depicts or
   implies a customer, and never resembles a named real person (including the
   uniqbrio-character-bible personas — no blending, no visual echo).
7. PROVENANCE: every shipped character asset has a provenance record (source
   render/master, lock version, tool, prompt, licence, alt-text decision) and
   a filename per skill §20.3: [brand]-mascot-[view|pose|emotion]-[scale]-
   v[major].[minor].[ext]. "mascot_final.png" is an automatic FAIL.
Motion: only via web-motion-implementation-director, within approved poses;
prefers-reduced-motion must render a static frame.

## USAGE RULES
- Always attach REAL app screenshots for any product depiction — never let
  the model invent UI (app_reality rule).
- Generated asset → hand to web-illustration-asset-production-pipeline BEFORE
  commit: human curation gate, format decision, optimize, provenance record.
  A render is a candidate, never a commit. Hero images ≤120KB, icons as SVG
  where possible. No asset enters the repo unrouted through that skill.
- Log each generated asset's prompt + file path + provenance record in
  decisions_log.md.
- New recurring asset type → add a template here (append-only).
- Brand character: the approved design sheet path is recorded in
  site_profile.md and referenced by every subsequent character prompt.
