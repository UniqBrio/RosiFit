# REFERENCE SITE ANALYSIS — steal-the-principle intake for an owner-supplied reference
<!-- website_workflow/reference_site_analysis.md
     Triggered whenever the owner supplies a URL (or a screenshot of one) to
     watch, learn from, or compare against — inside /wrequest, /brainstorm,
     strategy_audit.md §S2, or ad hoc mid-conversation. Generalizes the
     "steal the principle, not the pixels" rule already used in every
     design_library.md REF entry and in §S2; THIS file is the INTAKE
     procedure that produces those REF/ALT entries. Added 2026-08-24. -->

PRIME RULE (inherited from website_flow.md's PRIME DIRECTIVE): findings are
OPTIONS added to design_library.md — never auto-applied to the live site,
and never a reproduction of the reference. Extract the transferable logic;
leave the pixels behind.

## STEP 1 — SCOPE GATE (ask before analyzing — every time)
Classify what the owner said about the reference into exactly one of six
lanes. Never skip this step because the URL "looks simple" or because a
similar site was analyzed before — each reference gets its own scope gate.

A. EXPLICIT ELEMENT REQUEST — the owner named a specific thing and said to
   ADD it ("add their sticky pricing CTA", "use a rabbit mascot like
   Jackrabbit's", "copy their footer layout"). This is a REQUIREMENT, not
   inspiration.
   → Skip the question below. Still capture one REF-xxx entry for
     provenance (STEP 4), but route the request itself through the NORMAL
     gates — /wrequest classification, decision_matrix.md if an alternative
     exists, app_reality.md truth check, full interrogation. An explicit ask
     skips the scope question, never the build gates.

B. A PART WAS NAMED, not an explicit add ("look at their hero", "how do
   they do pricing cards", "check out their footer/animations/nav") →
   default scope = that part only. STILL ask, phrased as a confirm with the
   named part preset:
     "I'll look at [their PART] on [URL] for design learnings — want the
      whole site instead, or keep it to [PART]?"
   No response / "just do it" / "go ahead" → proceed on the named-part
   default. This satisfies "ask before analyzing" without turning an
   already-scoped request into a blocking round-trip.

C. URL ONLY, nothing named → ask the open question, unprompted, before
   fetching anything beyond the homepage:
     "Would you like me to analyze the entire website for useful design
      learnings, or focus only on a specific part you have in mind?"

D. DESIGN-TOKEN SOURCE — the reference is a theme/token GENERATOR tool
   (e.g. a shadcn/ui theme generator, a NativeWindUI-style theme picker),
   not a page of sections to browse. Its output is COLOR/RADIUS/TYPE
   TOKENS, not a layout pattern — skip lane B/C's "whole site vs named
   part" question (there is no "part" of a generator to scope) and confirm
   instead: "I'll treat [tool] as a token/palette source, run its output
   against our contrast and accent-scarcity rules, and log it as a
   candidate — never write it into site_profile.md directly. Go ahead?"
   No response / "go ahead" → proceed.

E. TEMPLATE MARKETPLACE — the reference is a commercial template/theme
   MARKETPLACE (e.g. ThemeForest, Envato, a template shop). A marketplace
   CATEGORY or search-results LISTING PAGE is never itself a reference —
   it has no single design logic, only a directory of unrelated products.
   Do not fetch a listing page and write a REF entry for it. Ask instead:
   "That's a marketplace category with [N] templates, not one design to
   learn from — name 1-3 specific templates (by URL) you want analyzed, or
   tell me criteria (niche, style) and I'll shortlist candidates from the
   listing before analyzing any of them."
   Once specific template PAGES are named, each is fetched and scoped like
   any B/C reference — but STEP 3/4 carry the licensing caveat below.

F. CODE REPOSITORY — the reference is a source-code repo (GitHub/GitLab)
   offered as an implementation or architecture reference. Its hazards are
   different from a design reference's, and one is irreversible:
   **LICENCE FIRST, before reading any source.** Check LICENSE at the root
   AND the per-package `license` fields (monorepos often license a runtime
   SDK permissively while the app is copyleft — verify, never assume).
   - COPYLEFT (AGPL / GPL / SSPL) → **CONCEPTS ONLY. Copy no files, no code,
     no verbatim text.** State this explicitly in the report. Copying would
     attach the copyleft obligations — for AGPL, including network-use
     source disclosure — to the entire derivative work, which for a
     commercial site is a business decision far above a workflow change.
     Ideas and patterns are not copyrightable; their expression is. Extract
     the principle and write it in our own words — which is already this
     file's PRIME RULE.
   - PERMISSIVE (MIT / Apache-2.0 / BSD) → file reuse is allowed, but the
     REF entry MUST record the source repo, the licence, and the required
     attribution, and any copied file keeps its original licence header.
   - NO LICENCE FILE → treat as all-rights-reserved. Concepts only.
   Then scope like lane B/C. Also assess, and state plainly, whether the
   reference is even the same KIND of artefact as ours — a product codebase
   and a process framework may share almost nothing, and a small honest
   yield beats an inflated one.
   Precedent: 2026-08-24, webstudio-is/webstudio reviewed on request. Root
   LICENSE plus the sdk / sdk-components-react / css-engine / design-system
   packages are ALL AGPL-3.0-or-later — no permissive escape hatch — so the
   verdict was: adopt 3 process ideas in our own words, copy zero files.

MIXED INPUT rule (mirrors wrequest.md's own MIXED INPUT rule): if the owner
combines an explicit element request with a broader learning ask in the same
message, classify EACH part into its own lane — run lane A for the explicit
element and the appropriate B/C question for the rest. Never let one lane
swallow the other.

## STEP 2 — FETCH
1. WebFetch the URL — whole site: homepage + up to 4 linked pages relevant
   to the scope; named part: the page containing it, deep-linked where
   possible.
2. If fetch fails (robots.txt, JS-only render, paywall) → say so, then ask
   for a screenshot of the scope in question. Never guess at markup that
   was not actually seen (this file's precedent: design_library.md's
   REF-001, "live fetch blocked by robots.txt — logic captured from
   screenshot").
   2a. Exception for a TOOL/PRODUCT page that renders client-side but is
       independently documented elsewhere (its own blog, a listing site, a
       demo video): before asking for a screenshot, run ONE WebSearch for
       the tool's name + what it does/outputs; if it returns citable
       sources confirming function and output format, that satisfies the
       evidence requirement — cite those sources in place of a screenshot.
       This is for CONFIRMING A TOOL'S FUNCTION, not for layout/visual
       details, which still need an actual screenshot or a working fetch.
       (Precedent: 2026-08-24, zippystarter.com's theme generator — WebFetch
       returned only nav/changelog text; WebSearch found allshadcn.com's
       tool listing and the vendor's own blog post confirming free/CSS-
       variable/framework-agnostic output, which is what actually got
       recorded — never invented from the tool's name alone.)
3. Skills: html-design-extractor (structural extraction from markup/DOM),
   design-gap-analyzer (diff against the current implementation),
   competitive-research-specialist (only when the reference is a
   competitor, not just a craft reference).

## STEP 3 — SYNTHESIZE (steal the principle, not the pixels)
For each pattern worth carrying forward, within scope:
1. WHAT IT DOES — plain description of the observed pattern (layout,
   interaction, component, motion, copy structure — whatever the scope
   covers).
2. TRANSFERABLE LOGIC — the underlying principle, stripped of the source
   site's specific pixels/brand/copy. Same standard as every REF entry in
   design_library.md.
3. FIT CHECK against standing constraints — a pattern that fails this is
   STILL logged (the option is never silently dropped) but flagged NOT
   ADOPTABLE AS-IS with a compliant ALT proposed instead of the raw idea:
   - app_reality.md truth rules (no fabricated proof/counts the pattern
     implies)
   - brand tokens: the site's {THEME_MODE} surfaces (SINGLE-DARK by default,
     never assumed — theme_system.md), accent scarcity (one primary-accent
     action per viewport). A reference built for the opposite polarity is
     NOT disqualified: extract the principle and restate it in this site's
     tokens, per this file's PRIME RULE.
   - state-contrast rule (>=4.5:1 in every state)
   - performance budget (3G-Android; asset weight budgets from Phase 2)
   - accessibility (keyboard, reduced-motion, screen reader)
   - a brand-character/mascot pattern in scope does NOT get decided here —
     it routes to brand-character-mascot-designer's own GO/CONDITIONAL/
     NO-GO gate; this file only notes "worth evaluating as a character
     pattern" and hands off.
4. Skills: saas-website-visual-storytelling-director (style/illustration
   fit), product-screenshot-mockup-specialist (product-shot presentation
   patterns), conversion-ux-specialist, academy-owner-psychology-expert
   (audience lens on every pattern).
5. LANE-SPECIFIC FIT:
   - Lane D (token source): the fit check is the token values themselves,
     not a layout. Run every generated color against the state-contrast
     rule (>=4.5:1 in every state) and the accent-scarcity rule (one
     primary-accent action per viewport) BEFORE proposing it as a
     site_profile.md candidate. A generator optimizes for looking good in
     isolation; it has no idea this site's {ACCENT_2} must never be a text
     color on dark ({ACCENT_2_TEXT} exists precisely because a generator
     won't know that). Flag any generated value that fails, same as any
     other NOT ADOPTABLE AS-IS pattern.
   - Lane E (marketplace template): TRANSFERABLE LOGIC only, same as every
     other lane — but state explicitly whether a licence was purchased.
     Unpurchased = inspiration only; the REF entry may never describe
     copying the template's actual code, images, or fonts, and Claude must
     say so even if asked, the same way app_reality.md blocks a fabricated
     claim. Purchased = still logged as transferable logic per the two-
     layer rule; reusing the literal purchased files is a separate,
     explicit request the owner makes knowingly, not something this file
     grants by default.

## STEP 4 — RECORD (feeds design_library.md's existing REF/ALT mechanism)
1. One REF-xxx entry per adopted pattern, written directly into
   design_library.md in its existing format: Source = URL + date fetched
   (or "screenshot, fetch blocked"), scope = whole-site / part / explicit-
   element, What it does, Transferable logic, Cautions for {SITE_NAME}.
   Two-layer rule applies exactly as it already does (design_library.md
   rule 2): every REF gets 1+ Claude ALT entries.
2. Lane A (explicit element) additionally gets flagged CANDIDATE
   REQUIREMENT in the entry and cross-linked to the request file once
   /wrequest drafts one — the REF entry is provenance; the request file is
   the actual build instruction.
3. Update design_library.md's INDEX + LAST UPDATED, per its own rule 7.
4. Findings are OPTIONS. Nothing on the live site changes from this file
   alone — matrix-score against the current state like any other library
   entry (design_library.md rule 4) before anything is built.
5. Lane D and E record differently from a layout REF:
   - Lane D: the REF entry's "Best for" is the TOKEN SYSTEM (e.g. "seed-
     color palette generation"), not a page slot; body includes the raw
     generated values as a CANDIDATE table, each row marked PASS/FAIL
     against state-contrast + accent-scarcity. A FAIL value is never
     silently rounded to PASS. Writing a PASSED candidate into
     site_profile.md is a separate, owner-gated edit — this file only
     produces the candidate, exactly like every other REF/ALT.
   - Lane E: no REF entry for a listing/category page — only for a named
     candidate template's own page. The entry records price + licence type
     alongside the usual fields.

## STEP 5 — REPORT
Tell the owner: what was analyzed (scope + lane), URL/screenshot evidence,
the new REF/ALT entries added (IDs + one line each), any pattern flagged
NOT ADOPTABLE AS-IS and why, and — lane A only — confirmation that a
request file is the next step (draft it via /wrequest on the owner's go;
never auto-start /website from here).

## CROSS-REFERENCES (do not duplicate this procedure elsewhere — point here)
- strategy_audit.md §S2 competitor teardown: its initial 5 references keep
  their own table format (hero/subhead/CTA/proof/media/better/worse). If the
  owner names ONE additional reference mid-flow, run STEP 2/3 of this file
  for it instead of an ad hoc lookup — same synthesis standard, output still
  lands in design_library.md via STEP 4.
- /brainstorm step 3 (RESEARCH): if the situation names a specific reference
  URL rather than "find current best practice," run this file instead of
  the generic 3-lookup research step.
- /wrequest CLASSIFY: a URL with no other request content classifies as
  REFERENCE (this file), not NEW/CORRECTION/BUG — unless it is lane A,
  which still produces a real request file per STEP 4.2.
