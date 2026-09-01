# RESOURCE REGISTRY — standing external references, and the trigger that earns each one
<!-- website_workflow/resource_registry.md
     Added 2026-08-24 via framework_update.md.
     Root cause it closes: the framework had two homes for outside knowledge
     and standing resources fit neither. skills_map.md routes INTERNAL skills
     to phases. reference_site_analysis.md handles an owner-supplied URL as a
     ONE-OFF intake event — its own words: "each reference gets its own scope
     gate" — which is correct for a one-off and structurally wrong for a
     resource consulted on every third request (it would spam design_library.md
     with duplicate REF entries for the same source). Result: standing
     resources were either ignored or consulted indiscriminately. -->

## PRIME RULE — name the trigger, or don't open it
These are OPTIONAL and trigger-gated. Consulting all of them on every request
is the failure this file prevents; so is forgetting they exist.
- Before consulting, write ONE line: `RESOURCE: <name> — trigger: <which>`.
  No trigger fired → don't open it, and don't mention it.
- Every consult ends in a recorded artifact (a library entry, a token
  candidate, a cited finding) OR an explicit "consulted, nothing applicable".
  A consult that vanishes is the same failure class as Q-OPTION-SET's silent
  drop: work done, then lost.

## CONSULT LADDER — stop at the first rung that answers the question
1. **LOCAL** — design_library.md, animation_library.md, responsive_matrix.md,
   and the installed `ui-ux-pro-max` skill. Free, offline, and already
   fit-checked against this site's constraints. ALWAYS the first rung.
2. **ONE triggered registered resource** below — not all of them.
3. **Ad-hoc research** (WebSearch/WebFetch) under strategy_audit.md's
   evidence mandate, when the question is outside every registered resource.

Rung 1 is not a formality. Evidence: on 2026-08-24 the charting-library
question was researched externally while `.claude/skills/ui-ux-pro-max/data/
charts.csv` sat locally with per-data-type library recommendations. The answer
was already in the repo.

---

## R-01 — ui-ux-pro-max (LOCAL, INSTALLED — rung 1)
**Location:** `.claude/skills/ui-ux-pro-max/` — SKILL.md, 11 data CSVs, and a
BM25 search engine. Verified running 2026-08-24.
**Trigger:** any Phase 1/2 design question — style selection, colour palette,
font pairing, UX/accessibility rules, touch targets, layout/responsive
guidance, chart-type choice, landing-page patterns.
**How:** `python scripts/search.py "<query>" --domain <style|color|chart|ux|
typography|landing|product> [--stack react|nextjs|html-tailwind]`
**Priority table (the skill's own):** 1 Accessibility CRITICAL · 2 Touch &
Interaction CRITICAL · 3 Performance HIGH · 4 Layout & Responsive HIGH ·
5 Typography & Colour · 6 Animation · 7 Style · 8 Charts.
**Do not** treat this as optional "visual polish" — its top two categories are
CRITICAL and map directly onto gates this framework already enforces (Q8,
contrast ≥4.5:1, tap targets ≥44px).
**Caution:** the vendored copy is STALE — see skills_map.md §VENDORED SKILL
VERSIONS. Its chart rows recommend Chart.js / Recharts / ApexCharts / D3 and
never Highcharts; that is data, not a decision — the library choice is still
scored (see R-05).

## R-02 — tweakcn.com (shadcn/Tailwind theme editor)
**What (verified 2026-08-24):** open-source visual theme editor for shadcn/ui
(`jnsahaj/tweakcn`, 6k+ stars). 16+ presets, Tailwind v3 & v4, OKLCH/HSL,
real-time light/dark preview, typography controls, and **built-in contrast
checking** — which REF-008 (zippystarter) lacks. Exports Tailwind/CSS
variables.
**Trigger:** the site's {STACK} includes shadcn/ui or Tailwind AND token or
per-component styling work is in scope.
**Lane:** reference_site_analysis.md **Lane D** (design-token source).
**Output goes to:** a token CANDIDATE table, each value PASS/FAIL against
state-contrast and accent-scarcity. NEVER straight into site_profile.md.
**Don't use when:** the stack isn't Tailwind/shadcn — its export format
won't fit (see ALT-009a on stack-aware export).

## R-03 — awwwards.com (visual craft inspiration)
**Trigger:** art-direction or craft inspiration — "make this feel premium", a
section that reads generic, a hero with no point of view.
**RECORDED BIAS (verified 2026-08-24 — read this before every use):** the
site surfaces WebGL/3D/animation-heavy showcase work, and **performance,
accessibility and usability are not named as judging criteria**. It therefore
systematically over-samples precisely what this framework restrains: Q8's 3G
budget and LCP <2.5s, Q9's "prefer boring, consistent solutions over novel
ones" and "would a skeptical owner trust this page with their money", and
animation_library.md's four-job gate.
**Use for:** principle extraction only, via reference_site_analysis.md Lane
B/C, landing as a design_library REF + its mandatory ALT.
**Never:** adopt an awwwards pattern wholesale, or cite "it won an award" as
evidence in a decision_matrix cell. Award ≠ conversion evidence.

## R-04 — Looker Studio visualization gallery
**What (verified 2026-08-24):** a gallery of visualizations for building BI
dashboards INSIDE Looker Studio. Community entries are explicitly "not
provided by Google". It is not a source of reusable chart code for external
sites.
**Trigger:** choosing a chart TYPE when R-01's `charts.csv` doesn't cover the
data shape.
**RECORDED CAUTION:** BI dashboards optimize for EXPLORATION across many
metrics; a marketing-site chart's job is to PROVE ONE CLAIM. Borrow the
chart-type reasoning, never the dashboard density.
**Truth rule still governs:** any chart on the site is a quantified claim and
may never exceed app_reality.md.

## R-05 — Charting libraries (decision path, not a resource)
There is no default chart library. When a chart is genuinely warranted:
1. STACK GATE — check {STACK} first. A React-only wrapper is ineligible on a
   non-React clone (this framework's {STACK} varies per site — see REF-009).
2. Score with **decision_matrix.md PROFILE B** (build-internal: the visitor
   never perceives the library, only its weight). Criterion 3 *visitor-side
   cost* carries the bundle weight against the 3G budget; criterion 5
   *reversibility & recurring cost — subscription/plan gating* carries
   licensing. Profile B was written for exactly this class of choice.
3. RECORDED FINDINGS (2026-08-24 — do not re-litigate without new evidence):
   - `kirjs/react-highcharts` — **do not adopt.** Superseded/unmaintained;
     its README targets Highcharts 6.x (current is v12).
   - Highcharts (any wrapper, incl. `highcharts-react-official`) — **requires
     a paid commercial licence.** From the wrapper's own README: "For
     commercial use, you need a valid Highcharts license." The wrapper being
     MIT does not make the engine free.
   - R-01's local data recommends Chart.js / Recharts / ApexCharts / D3.
4. A marketing site rarely needs a charting LIBRARY at all — a static,
   accessible SVG or the existing interactive-roi-calculator-designer covers
   most real cases at a fraction of the weight. Score "no library" as
   Option A, per decision_matrix rule 1.

---

## WHICH FILE HANDLES WHAT (do not duplicate procedures)
- **Standing resource, consulted repeatedly** → this file.
- **One-off owner-supplied URL** → reference_site_analysis.md (scope gate →
  fetch → synthesize → record). A registered resource still uses that file's
  LANES when its output becomes a library entry — the registry says *when to
  look*, that file says *how to record what you found*.
- **Internal skill routing per phase** → skills_map.md.
- **Adding a resource here:** it must have a named trigger, a recorded
  caution/bias, and a stated destination for its output. A resource with no
  trigger is a distraction; one with no recorded bias will eventually be
  applied where it does harm.
