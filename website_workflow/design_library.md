# DESIGN LIBRARY — reusable patterns & options (living document)
<!-- website_workflow/design_library.md
     RULES OF USE (standing, referenced by website_flow.md):
     1. Every owner-provided design reference gets a REF-xxx entry: source,
        captured design logic (the transferable principle, not the pixels).
        A live URL (not just a screenshot) goes through the SCOPE GATE and
        fetch/synthesis procedure in website_workflow/reference_site_analysis.md
        FIRST; that file writes the REF/ALT entries here in this format.
     2. For every REF added, Claude MUST independently add 1+ ALT-xxx
        entries: complementary or better approaches along the same lines
        (hierarchy, layout, interaction, usability, responsiveness,
        animation, spacing, composition, polish).
     3. Provenance is never mixed: REF = owner-provided (external reference),
        ALT = Claude-proposed alternative to a specific REF, IDEA = Claude-
        proposed complementary improvement arising from an ordinary design
        request rather than an external reference (rule 9). All three are
        OPTIONS — none is auto-applied.
     4. On any design decision, consult this library FIRST; matrix-score
        library options against the current state like any other option.
     5. "What are the alternatives for this section?" → return the TOP 5
        most relevant entries, ranked by: relevance to section purpose >
        visual quality > usability/clarity > consistency with existing site >
        responsiveness/implementation practicality. Mix REF and ALT.
     6. Any design request — owner-referenced or not — is the BASELINE, not
        the ceiling: implement what was asked AND explore complementary
        design improvements using the governing skill's principles (rule 9).
        No fixed count: as many genuinely relevant ideas as the request and
        the skill support — never an arbitrary or unrelated addition, and
        never a changed product direction uninvited.
     7. Every new entry: append, date, never delete (mark SUPERSEDED).
     8. Rule 5's "top 5" and decision_matrix.md's 4-option ceiling collide —
        resolved by the OPTION SELECTION FUNNEL below: screen every entry,
        rank the eligible, score current-state + top 3, name what's deferred.
     9. SKILL VALIDATION GATE (added 2026-08-24): before any design element,
        pattern, component, interaction, or visual idea is added or changed —
        the requested one AND every complementary idea from rule 6 — identify
        the governing website-design skill(s) via skills_map.md (phase table,
        situational table, PROJECT SKILLS table). Apply its principles/
        constraints to the work. A complementary idea that survives gets its
        own IDEA-xxx entry here, same format as a REF/ALT entry, skill(s) named
        in its Cautions line. If no governing skill can be identified, or the
        identified one is unavailable and skills_map.md §Fallback is exhausted:
        STOP — do not proceed as though the skill exists. Tell the owner
        plainly what TYPE of design skill is missing and why the work needs it
        (skills_map.md §Fallback step 3 governs the exact wording).
     {SITE_NAME} constraints that always apply: surfaces {BG_0}/{BG_1} at the
     site's {THEME_MODE} (SINGLE-DARK by default; see theme_system.md — do NOT
     assume dark, and never hardcode a polarity into an entry), {ACCENT_1} +
     {ACCENT_2} accents with the text-safe variant chosen BY MEASUREMENT
     (which accent is unsafe as text inverts with polarity), truth rules of
     app_reality.md, 3G-Android performance budget; the state-contrast rule
     applies to every pattern here, in every active theme.
     Entries below written before 2026-08-24 name dark values literally —
     read those as the DARK column of a paired token, not as a requirement
     that the site be dark.
     MOTION belongs to website_workflow/animation_library.md, not here — a
     REF/ALT/IDEA entry that involves animation (e.g. REF-005's sticky-stack,
     REF-007's hover reveal) states its trigger/timing informally for
     readability, but the canonical selection rules, the 8-category catalog,
     and the four-job gate live in that file. Don't re-derive motion timing
     ad hoc; cite it from there. -->

LAST UPDATED: 2026-08-24

## INDEX
| ID | Name | Source | Best for | Cost | Disqualifiers |
|---|---|---|---|---|---|
| REF-001 | Immersive 3D interior cube hero (Evolve360 Fitness) | owner | hero, product showcase | L | 3G-primary audience; no real interior/product media; hero LCP slot |
| ALT-001a | 3D-tilt product dashboard hero | Claude | hero | S | — |
| ALT-001b | Drag-to-pan panoramic strip | Claude | facility/product tour | M | <3 locations/views to show |
| ALT-001c | Cursor-parallax layered hero | Claude | hero (cheaper than 3D) | S | pointer-only effect adds nothing on touch-primary audiences |
| ALT-001d | Rollable image-dice hero | Claude | hero, multi-image browse | M | <4 images to browse; no click/scroll affordance budget in this hero |
| REF-002 | Confident-minimal dark + single accent system (Evolve360) | owner | whole-site art direction | S | — |
| ALT-002a | Accent-scarcity rule | Claude | art direction | S | — (always eligible; it's a constraint, not a layout) |
| REF-003 | Layered/stacked feature cards (Amazon SES) | owner | feature sections | M | <3 peer items; items not genuinely parallel |
| ALT-003a | Peek-stack with scroll-advance | Claude | feature sections | M | <3 peer items |
| ALT-003b | Deck-fan on hover | Claude | 3–5 item feature groups | S | >5 items; touch-primary (hover-dependent) |
| ALT-003c | Sticky-scroll feature cinema | Claude | flagship feature story | L | no single dominant flagship story; sticky-chrome budget spent |
| REF-004 | Pill sub-nav anchored to content card (Amazon SES) | owner | long pages, docs, pricing | S | page too short to need in-page nav |
| REF-005 | Sticky scroll-stack cards | owner | feature/story runs, 3–6 peer cards | M | <3 cards; sticky-chrome budget already spent by header+CTA; content must be scannable at a glance |
| ALT-005a | Scroll-stack w/ compressed history | Claude | feature runs | M | <3 cards |
| ALT-005b | Two-column pin: sticky claim + scrolling proof | Claude | flagship claim + proof run | M | no single dominant claim; <3 proof items |
| REF-006 | Horizontal scroll track | owner | wide peer sets: logos, integrations, quotes | S | conversion-critical content (CTA, price, core proof); <4 items; content the visitor must see ALL of |
| ALT-006a | Snap track + pagination, peek & "see all" | Claude | wide peer sets | S/M | conversion-critical content; <4 items |
| ALT-006b | Dual-mode: track on mobile, grid on desktop | Claude | wide peer sets, mobile-first | S | <4 items |
| REF-007 | Grayscale-to-color hover reveal | owner | persona/segment/feature cards (any grid or stack layout) | S | touch-only device with no tap/focus-equivalent trigger defined; illustration illegible or off-brand desaturated |
| ALT-007a | Color-on-scroll-into-view (touch equivalent) | Claude | same, mobile-first | S | single-card layouts (nothing sequential to reveal) |
| ALT-007b | Accent-duotone hover instead of full color | Claude | same, brand-palette-strict sites | S | source art has no natural/appropriate duotone read |
| REF-008 | Seed-color CSS-variable theme generator | owner | site-wide token derivation (any web stack) | S | tokens not yet run through Lane D fit-check (state-contrast/accent-scarcity) |
| ALT-008a | Framework-native token derivation checklist | Claude | site-wide token derivation | S | SUPERSEDED 2026-08-26 by color_system.md + tools/generate_palette.py |
| REF-009 | NativeWindUI theme generator (RN/NativeWind output) | owner | site-wide token derivation, RN/Expo stacks | S | web-only {STACK} (format mismatch); tokens not yet run through Lane D fit-check |
| ALT-009a | Stack-aware token export note | Claude | site-wide token derivation | S | — |
| REF-010 | tweakcn — shadcn/Tailwind visual theme editor | owner | site-wide tokens + per-component styling | S | {STACK} is not Tailwind/shadcn; tokens not yet run through Lane D fit-check |
| ALT-010a | Preset-as-starting-point, not as answer | Claude | site-wide token derivation | S | — |

---

## OPTION SELECTION FUNNEL (added 2026-08-24 — how N entries become a scored shortlist)
Prevents: the silent drop. The library returns 5 candidates and the matrix
seats 4; nothing said who cut the other two, so the cut was made on taste
inside a framework whose Second Directive forbids exactly that
(website_flow.md).

### Stage 0 — SCOPE: is the library in play?
IN PLAY on every request that creates or restructures a visitor-facing
section, layout, interaction, or media slot — STRATEGIC or MECHANICAL alike.
NOT IN PLAY for: copy-only edits, bug fixes, spacing corrections inside an
already-approved pattern, backend/API-only work.
Write one line either way: "LIBRARY: in play" / "not in play — <reason>".
An absent line is a Phase-1 FAIL, not a silent skip.

### Stage 1 — ELIGIBILITY SCREEN (every entry, every in-play request)
Every non-SUPERSEDED entry is screened on every in-play request. This is
cheap and mechanical, read straight off the INDEX row, never a judgment:
  a. Slot-job match — does "Best for" cover this slot's stated single job?
  b. Budget — does "Cost" exceed the slot's remaining weight/effort budget?
  c. Disqualifiers — is any listed disqualifier true for this slot?
Output one line per entry: ELIGIBLE, or OUT + the ONE disqualifying reason.
Screening is mandatory and complete; SCORING is not (Stage 3).

### Stage 2 — RELEVANCE RANK (eligible only)
Rank the eligible set by rule 5's existing order: relevance to section
purpose > visual quality > usability/clarity > consistency with existing
site > responsiveness/implementation practicality.

### Stage 3 — MATRIX (current state + top 3)
Score with decision_matrix.md: Option A = current state, B/C/D = the top 3
ranked eligible entries. That is the matrix's 4-option ceiling, reached by
procedure instead of by preference.

### Stage 4 — SHORTLIST PROVENANCE (what must appear in the output)
LIBRARY SCREEN — <slot>, job: <one sentence>
Screened: <n> entries. OUT: <ID — reason>, … . Eligible, ranked: <IDs>.
Scored: A current state, B/C/D <IDs>.
DEFERRED (eligible, ranked below 3rd, not scored — shortlist full): <IDs>

DEFERRED ≠ rejected. Those entries carry no loss record and are screened
fresh at the next slot. The owner may swap a deferred entry into the matrix
at GATE 1; that is an owner override, and it is logged as one.

### Honest limit of this procedure
The framework picks the best of the top 3 ELIGIBLE options, not the best of
all N. Naming the deferred entries is what keeps that limit visible and
overridable, instead of letting "we scored the options" imply "we considered
everything". Do not claim the winner is the best possible pattern — claim it
beat the current state and the two strongest eligible challengers, which is
what the evidence supports.

### SITE DEFAULTS (prevents matrix theatre)
When the same entry wins the same slot TYPE three times, declare it a site
default in this file, citing the three decisions. A site default is applied
without re-scoring. It is re-opened by: a new entry whose "Best for" covers
that slot type, a failed QA metric, or an owner request. Re-scoring a
settled pattern to look thorough is waste; applying one forever without a
re-open trigger is drift. Both are failures.

---

## REF-001 — Immersive 3D interior cube hero (owner, 2026-08-08)
Source: evolve360fitness.in (screenshot 2026-08-07 (2).png; live fetch blocked
by robots.txt — logic captured from screenshot).
What it does: hero = an interactive 3D cube textured with real interior
photos; "DRAG TO ROTATE · PINCH TO ZOOM" caption; page chrome recedes
(near-black, thin yellow accents) so the object is the hero.
Transferable logic:
- Make the PRODUCT/SPACE the hero object, not a headline collage.
- Interaction as proof: letting visitors manipulate something real builds
  credibility (fits our honesty rule — real screens only).
- One instruction line teaches the interaction; nothing else competes.
- Micro-affordance: a small pulsing dot invites the drag.
Cautions for {SITE_NAME}: 3D libs (three.js) are heavy — budget-gate it;
must degrade to a static/autorotate video on low-power devices; keyboard
+ reduced-motion fallbacks required.

## ALT-001a — 3D-tilt product dashboard hero (Claude, 2026-08-08)
Same "manipulable product" psychology at ~1% of the cost: the real
dashboard screenshot in a perspective card that tilts with pointer/gyro
(CSS transform only), subtle specular sweep, tap opens full demo video.
Pairs with our already-decided animated-dashboard hero. AA contrast, no
canvas, works on 3G Android.

## ALT-001b — Drag-to-pan panoramic strip (Claude, 2026-08-08)
A wide, real screenshot panorama (dashboard → attendance → fees) draggable
horizontally with snap points; progress dots; arrow-key accessible. Gives
"explore the product" without 3D. Good for a How-It-Works tour.

## ALT-001c — Cursor-parallax layered hero (Claude, 2026-08-08)
2–3 depth layers (dashboard base, floating WhatsApp receipt, floating fee
card) shifting at different rates on pointer move (max ~12px, transform
only, disabled for prefers-reduced-motion). Depth-as-polish for near-zero
weight.

## ALT-001d — Rollable image-dice hero (Claude, 2026-08-24)
Extends REF-001: instead of one textured cube the visitor free-rotates, each
of the 6 faces carries a DIFFERENT real image (dashboard, attendance view,
fee receipt, WhatsApp screen, facility photo, testimonial card). Interaction
is discrete, not free-drag: click a visible face, or scroll/swipe over the
cube, and it ROLLS 90° to the next face like a die — always landing flush on
a face, never mid-rotation. A small face-index dot row (like a carousel)
shows position and lets you jump directly to any face.
Transferable logic: keeps REF-001's "manipulable product" credibility while
solving what a single-texture cube can't — browsing MULTIPLE proof images in
one compact object instead of one static wrap.
Implementation: CSS 3D transforms (`transform-style: preserve-3d`, discrete
`rotateX/rotateY` steps) or a light three.js cube if depth/lighting must
match REF-001's reference; snap to the nearest 90° on release, never leave a
face at an angle. Keyboard: arrow keys roll one face at a time; Enter/Space
activates the focused face if it's also a link. `aria-live` region announces
the current face's label on roll ("Now showing: attendance view").
Cautions for {SITE_NAME}: heavier than ALT-001a — real weight/JS cost, so
score it against the hero's LCP budget, not just against REF-001; on 3G
Android prefer CSS-transform-only over three.js; `prefers-reduced-motion` →
crossfade between faces instead of rolling; each face still needs a REAL
{SITE_NAME} screenshot or photo (app_reality rule — no invented UI); a stuck
mid-roll frame is a state-contrast/Q8 failure like any other broken state.

## REF-002 — Confident-minimal dark + single accent system (owner, 2026-08-08)
Source: evolve360fitness.in.
Logic: near-black canvas; ONE saturated accent (their yellow) used only
for action + emphasis; uppercase letter-spaced micro-labels for nav; a
single high-contrast pill CTA; generous empty space; content islands float.
Transferable: our dual accent (orange/purple) should behave like their
single accent — scarce, purposeful, never decorative wallpaper.

## ALT-002a — Accent-scarcity rule (Claude, 2026-08-08)
Codify: per viewport, at most ONE orange action element + purple only as
support (borders/glows ≤20% opacity, text = {ACCENT_2_TEXT}). Everything else
zinc/white. Measurable in review: count accent instances per screen; >3 =
fail. Prevents the current gradient-everywhere drift; makes CTAs pop.

## REF-003 — Layered/stacked feature cards (owner, 2026-08-08)
Source: aws.amazon.com/ses (screenshot "Amazon SES snap.png").
What it does: white content cards stacked with slight vertical offsets and
soft shadows; back cards peek out beneath the front card, implying "more
below"; each card is one message + one arrow-link; depth via position,
scale and shadow — not decoration.
Transferable logic:
- Stack implies sequence and depth without consuming vertical space.
- Peeking edges are a scroll cue — progressive disclosure without JS tricks.
- One idea per card; the arrow is the only ornament.
- Adapts to mobile by collapsing to a swipeable deck or plain list.

## ALT-003a — Peek-stack with scroll-advance (Claude, 2026-08-08)
{SITE_NAME}-adapted: dark cards ({BG_1}, {ACCENT_1}/30 border) stacked with
8–12px offsets; scrolling (or clicking the peeking edge) promotes the next
card to front with a 200ms transform. IntersectionObserver + transforms
only. Mobile: horizontal snap-scroll deck. Ideal for the Benefits section's
6 features → 3 visible stacks.

## ALT-003b — Deck-fan on hover (Claude, 2026-08-08)
3–5 cards fanned like held playing cards (rotate -6°…+6°); hovered/tapped
card straightens and lifts. Distinctive, compact for small feature groups
(e.g., the 4 export bullets). Reduced-motion: plain grid.

## ALT-003c — Sticky-scroll feature cinema (Claude, 2026-08-08)
One sticky viewport-height panel; as the user scrolls, the SAME dashboard
screenshot stays put while captions and highlighted UI regions change
(fees → attendance → WhatsApp). Tells "one system, many jobs" — our core
claim — with real screens. Heavier build; reserve for the flagship section.

## REF-004 — Pill sub-nav anchored to content card (owner, 2026-08-08)
Source: aws.amazon.com/ses.
Logic: a rounded pill tab-bar (Overview · Features · Pricing…) sits half
overlapping the first content card, so navigation and content read as one
object; scrolling keeps orientation. Transferable to: pricing page tiers,
ROI calculator steps, a future docs/FAQ page. Mobile: pill becomes a
horizontal scroll chip row.

## REF-005 — Sticky scroll-stack cards (owner, 2026-08-24)
Source: aws.amazon.com/ses (screenshot 2026-08-24: Amazon SES customer-story
cards — "Amazon sends hundreds of billions of emails..." / Netflix card
scrolling up beneath it). Evidence caveat, stated honestly: a live WebFetch
of aws.amazon.com/ses returned only server-rendered markup — the stacking
behaviour is client-side and did not appear in the fetch. Logic is captured
from the owner's screenshot, same provenance caveat as REF-001.
What it does: each card pins near the viewport top as it arrives on scroll;
the next card scrolls up and over it, leaving the previous card's edge
visible beneath — sequence and depth without spending N × viewport-height.
Transferable logic:
- The peeking edge doubles as a progress cue — no extra UI needed.
- One idea per card; the pinned card holds full attention while on top.
- Works for any run of 3+ genuinely parallel items (features, testimonials,
  case-study beats).
Implementation: `position: sticky` with an increasing `top` offset per card;
stick the INNER content element, not the card wrapper (avoids double-scroll
bugs — CSS-Tricks stacked-cards pattern); `will-change: transform` so
repaints stay on their own compositor layer.
Cautions for {SITE_NAME}: sticky repaint cost matters on low-power Android —
profile INP, not just LCP; sticky content can obscure a keyboard-focused
element and break skip links, so focus must scroll the pinned card clear
before landing inside it; `prefers-reduced-motion` → plain stacked list, no
pinning; must not fight the existing sticky header + sticky CTA (Q3
interplay — total pinned chrome has a budget); state-contrast applies to any
overlapped card edge.
Sources: CSS-Tricks "Stacked Cards with Sticky Positioning"
(https://css-tricks.com/stacked-cards-with-sticky-positioning-and-a-dash-of-sass/);
sticky accessibility/performance guidance via MDN `position` reference and
TestMu sticky-positioning tutorial (fetched 2026-08-24).

## ALT-005a — Scroll-stack with compressed history (Claude, 2026-08-24)
Same trigger as REF-005, cheaper: outgoing cards scale down and dim as
they're covered (transform + opacity only) instead of leaving the flow, so
it reads as progress rather than occlusion — no sticky repaint cost at all.
`prefers-reduced-motion` → static grid, no scale/dim.

## ALT-005b — Two-column pin: sticky claim + scrolling proof (Claude, 2026-08-24)
Pins ONE element instead of N (a fraction of REF-005's repaint cost): a
short claim/headline stays fixed in the left column while proof cards
(screenshots, stats, quotes) scroll past on the right. Maps directly to
"one system, many jobs." No pinning at all below 768px — the claim simply
sits above the stacked proof cards. Distinct from ALT-003c: there the
screenshot is the fixed element and captions change around it; here the
CLAIM is fixed and the proof is what moves.

## REF-006 — Horizontal scroll track (owner-directed, 2026-08-24)
Logic: a snap-scrolling row of cards; the vertical page continues normally
around it. Compresses a wide set of genuine peers (logos, integrations,
short quotes) into fixed vertical space; snap points make the interaction
feel deliberate; native scroll runs on the compositor thread, so no JS
slider library is needed.
Implementation: `scroll-snap-type: x mandatory` on the container,
`scroll-snap-align: start` on each card; mandatory snapping for
one-at-a-time browsing, `proximity` for multi-item lists.
Cautions — this pattern carries the heaviest cautions in the library:
- Discoverability is the core risk: content past the edge is content many
  visitors never see. NEVER place conversion-critical content (primary CTA,
  price, core proof) inside a horizontal track — encoded as an INDEX
  disqualifier, not just advice.
- Container needs `tabindex="0"` to be keyboard-scrollable, custom arrow-key
  handling, and a skip link past the region.
- Mouse-wheel-only users are effectively stuck unless they know Shift+wheel;
  offer a vertical "see all" equivalent.
- Tap targets ≥44px with real gaps between cards.
- Must never cause horizontal scroll on the PAGE itself — Q8 requires "no
  horizontal scroll anywhere"; the overflow is scoped to the container, and
  the Phase 2 plan must say so explicitly or QA correctly reads it as a
  violation.
- Framing caution from the strongest source found: horizontal scrolling
  containers are not a content strategy — a compression tool, never a way to
  fit more content in.
Sources: Adrian Roselli, "Horizontal Scrolling Containers Are Not a Content
Strategy" (http://adrianroselli.com/2025/08/horizontal-scrolling-containers-are-not-a-content-strategy.html);
Cerovac, "Consider accessibility when using horizontally scrollable regions"
(https://cerovac.com/a11y/2024/02/consider-accessibility-when-using-horizontally-scrollable-regions-in-webpages-and-apps/);
Ryan Mulligan, "A Horizontal Scroll List and Custom Keyboard Navigation"
(https://ryanmulligan.dev/blog/project-keyboard-navigation/) (fetched 2026-08-24).
Cross-ref: ALT-001b (drag-to-pan panorama) is adjacent — one continuous
panoramic image vs. a track of discrete cards. Not duplicates; screen both.

## ALT-006a — Snap track + pagination, peek & "see all" (Claude, 2026-08-24)
Fixes REF-006's two worst risks at near-zero extra cost: always shows a
partial next card (discoverability cue), real `<button>` prev/next controls
(keyboard + screen-reader reachable), a dot counter, and a "See all N" link
to a plain vertical list. Expect this to beat bare REF-006 in most matrices
— recorded here so the screen doesn't keep re-deriving it.

## ALT-006b — Dual-mode: track on mobile, grid on desktop (Claude, 2026-08-24)
Takes the horizontal track's benefit exactly where swiping is native and
vertical space is scarce (≤768px), and drops it exactly where the
mouse-wheel problem lives (≥768px becomes a plain wrapping grid). Zero JS.

## REF-007 — Grayscale-to-color hover reveal (owner, 2026-08-24)
Source: chessplay.io screenshot 2026-08-24 (three ICP-segment cards — Chess
Coaches / Chess Academies / Schools — each a card-illustration over a cream
surface; the cursor-hovered "Chess Coaches" card renders its illustration in
warm full color while the other two stay in monochrome line art).
What it does: every card's illustration ships desaturated/grayscale by
default; on hover the SAME image transitions to full color; move off and it
reverts. Only one card is "alive" in color at a time, so hover itself
becomes the way the visitor picks which persona/segment applies to them.
Transferable logic:
- Hover as reveal-and-reward: color is the payoff for engaging, not a
  decorative default — makes the interaction legible without new copy or UI.
- Single-property transition (`filter: grayscale()` → `none`) — near-zero
  weight if it's ONE asset with a CSS filter, not two separate images.
- Composes with layout, it isn't one: apply it to REF-003's stacked cards,
  REF-005's scroll-stack, or a plain grid — screen it as an interaction
  layer alongside whichever layout pattern wins that slot.
Implementation: `filter: grayscale(100%)` default, transition to
`grayscale(0%)` on `:hover` — and, critically, also on `:focus-within` so
keyboard users get the identical reveal tabbing through the cards, not just
mouse users. `transition-duration` short (150–250ms); under
`prefers-reduced-motion` keep the color CHANGE (it's not motion) but drop to
an instant swap rather than an eased transition.
Cautions for {SITE_NAME}: touch has no hover — MUST pair with a non-hover
trigger (ALT-007a, or color-on-tap/focus) or the majority-mobile India
audience never sees the reveal at all; the grayscale state's title/label
text still needs its own contrast pass — Q-STATE-CONTRAST covers this
directly, since a filter change IS a state that alters the background
under the text; if the illustration is (or becomes) a locked brand
character, its grayscale state must still pass the character's silhouette
legibility, not just the color state (brand-character-mascot-designer §9).

## ALT-007a — Color-on-scroll-into-view, touch equivalent (Claude, 2026-08-24)
REF-007's hover has no equivalent on touch. Swap the trigger for an
IntersectionObserver: each card colorizes as it crosses ~50% into the
viewport (sequential reveal scrolling down), reverting when it scrolls back
out above the fold. Same visual payoff, no gesture required. Use ALONGSIDE
REF-007, not instead of it — hover on pointer devices, scroll-trigger on
touch, so neither audience gets a flat, colorless page.

## ALT-007b — Accent-duotone hover instead of full color (Claude, 2026-08-24)
Rather than reveal photographic/full color, overlay a duotone mapped to
{ACCENT_1}/{ACCENT_2} on hover (CSS `mix-blend-mode` over the grayscale
art, or a duotone-filter SVG). Keeps every illustration inside the brand's
two-accent system (pairs directly with ALT-002a's accent-scarcity rule)
instead of introducing arbitrary photo colors the rest of the site never
uses, and needs no "does the full-color version look on-brand" judgment
call — the palette is fixed by definition.

## REF-010 — tweakcn, shadcn/Tailwind visual theme editor (owner-directed, 2026-08-24)
Source: tweakcn.com (open source, `jnsahaj/tweakcn`, ~6k stars). Live
WebFetch returned only the tagline (client-rendered app); function confirmed
via WebSearch per reference_site_analysis.md STEP 2 item 2a — allshadcn.com
and tailkits tool listings, fetched 2026-08-24.
What it does: visual no-code theme editor for shadcn/ui + Tailwind (v3 and
v4), 16+ presets, OKLCH/HSL colour modes, real-time light/dark preview,
typography controls, per-component styling, and **built-in accessibility
contrast checking** — the capability REF-008 lacks. Exports Tailwind/CSS
variables.
Transferable logic: same seed-to-system idea as REF-008/009, but with the
contrast check moved INSIDE the tool rather than left to a later gate. That
ordering is the real lesson — catching a failing token while still choosing
it is strictly cheaper than catching it at Q-STATE-CONTRAST.
Cautions for {SITE_NAME}: its contrast check does NOT know this framework's
accent-scarcity rule or the {ACCENT_2_TEXT} convention, so Lane D's
fit-check still applies in full — output is a CANDIDATE, never a
site_profile.md edit. Presets are designed to look good generically; a
preset adopted wholesale imports someone else's brand decisions.

## ALT-010a — Preset-as-starting-point, not as answer (Claude, 2026-08-24)
Use a tweakcn preset only as Option B in a matrix whose Option A is the
current token set, and record WHICH preset and what was changed from it.
A preset applied unmodified means the site's palette is a stranger's default
— the opposite of the brand ownership REF-002 and ALT-002a are protecting.

## REF-008 — Seed-color CSS-variable theme generator (owner-directed, 2026-08-24)
Source: zippystarter.com/tools/shadcn-ui-theme-generator. Live WebFetch was
inconclusive (client-rendered tool; returned only nav/changelog text) —
function and output confirmed instead via WebSearch per
reference_site_analysis.md STEP 2 item 2a: allshadcn.com's tool listing and
zippystarter's own blog post ("Why use Zippystarter's shadcn theme
generator?"), fetched 2026-08-24.
What it does: pick one seed color (or a preset) → the tool derives a full
light+dark palette and exports as CSS custom properties, framework-agnostic
(works with or without shadcn/ui specifically); real-time preview across
components/dashboards/charts as you adjust color, typography, spacing.
Transferable logic:
- ONE seed decision (not five separate token choices) collapses the token
  table down to a single owner decision, then derives the rest
  algorithmically — worth adopting as a WORKFLOW even without using this
  specific tool: pick {ACCENT_1} first, derive supporting shades from it
  rather than hand-picking each one.
- Light/dark preview side-by-side catches a token that only works in one
  mode before it ships — directly useful given this framework's own
  Q-STATE-CONTRAST rule.
Cautions for {SITE_NAME}: the tool has no knowledge of THIS framework's
constraints — accent scarcity (one {ACCENT_1} action element per viewport)
and the {ACCENT_2_TEXT} convention ({ACCENT_2} must never be a text color on
dark) are not something a generic generator enforces. Never paste its output
straight into site_profile.md — run every derived value through
reference_site_analysis.md's Lane D fit-check first; a value that fails
state-contrast is logged as NOT ADOPTABLE AS-IS, not silently accepted
because it "looked right in the tool."

## ALT-008a — Framework-native token derivation checklist (Claude, 2026-08-24) — SUPERSEDED 2026-08-26
SUPERSEDED by website_workflow/color_system.md and tools/generate_palette.py,
which implement this idea as a working generator rather than a checklist.
Kept per rule 7 (append, never delete). Original text follows.
Rather than adopt an external tool, replicate its ONE-DECISION workflow
inside this framework: owner picks {ACCENT_1} only; Claude derives
{ACCENT_2}, {ACCENT_2_TEXT}, hover/focus/active shades, and both light+dark
variants FROM it, checks each against state-contrast, and presents the full
derived table for one owner approval — same seed-to-palette logic as
REF-008, but the derivation happens inside the rules that already govern
this site instead of importing values that were never checked against them.

## REF-009 — NativeWindUI theme generator, RN/NativeWind output (owner-directed, 2026-08-24)
Source: theme.nativewindui.com, fetched 2026-08-24 (live fetch succeeded).
What it does: configure primary/secondary/accent/muted colors + light/dark
variants; exports ready-to-paste `globals.css` and `colors.ts` — targeted at
React Native + NativeWind (Tailwind for RN) specifically, not just web.
Transferable logic: the exact same seed-to-palette, dual-format export
pattern as REF-008, but proves the pattern generalizes across STACKS — this
framework's {STACK} token varies per site clone (some may be RN/Expo, not
Next.js), and a token-generation approach should not assume web-only output.
Relevant when a site clone's {STACK} includes React Native/Expo
(site_profile_TEMPLATE.md lists {STACK} as a per-site token).
Cautions for {SITE_NAME}: identical to REF-008's — no external generator
knows this framework's accent-scarcity or {ACCENT_2_TEXT} rules; route
through Lane D's fit-check before adopting anything. Additionally: a
`colors.ts` export is a TypeScript source file, not just CSS — verify it
doesn't collide with an existing single-source-of-truth brand file
(website_flow.md's REPO MAP) rather than creating two competing color
sources.

## ALT-009a — Stack-aware token export note (Claude, 2026-08-24)
Whichever token workflow wins (REF-008/009 or ALT-008a), record the EXPORT
FORMAT as part of the decision, not just the color values: a Next.js/
Tailwind site wants CSS custom properties + a Tailwind config extension; a
React Native/Expo site wants a `colors.ts`-style module, since RN has no
CSS. Pick the format that matches {STACK}, and note it in site_profile.md's
own token table so a later session doesn't regenerate in the wrong format.

---

## HOW TO ADD AN ENTRY (for future runs)
1. Owner gives a reference:
   - URL → run website_workflow/reference_site_analysis.md: it asks the
     SCOPE GATE question (whole site / named part / explicit-add), fetches,
     and synthesizes before anything is written here.
   - Screenshot only (fetch blocked, or nothing live to fetch) → capture the
     screenshot evidence directly and write REF-xxx with "transferable
     logic" (principles, not pixels) + {SITE_NAME} cautions, same format.
2. Immediately author ALT entries: distinct, implementable, budget-aware.
3. Update INDEX + LAST UPDATED; log in decisions_log.md; README update-log
   line only if the library's RULES changed.
