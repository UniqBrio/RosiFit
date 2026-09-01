# RESPONSIVE MATRIX — device coverage, the RCA loop, and the failure-pattern library
<!-- website_workflow/responsive_matrix.md
     Referenced by checklists/qa_evidence_gate.md §1, website_flow.md Phase 5,
     and interrogation_checklist.md Q8. Added 2026-08-24 via framework_update.md.
     Root cause it closes: qa_evidence_gate.md said "Otherwise: list of failures
     → back to Phase 4", while templates/website_bug.md required "root cause
     written and confirmed BEFORE the fix (no symptom-patching)" plus a
     regression spec. Same defect class, two rigor levels, decided purely by
     who noticed first. This file gives the gate the missing half. -->

## PRIME RULE — the gate is automated evidence, never a manual eyeball
A responsive claim needs a captured, repeatable artifact (screenshot + a
passing/failing assertion). "I checked it at a few widths" is the same
failure class as "it looks fine" — which website_flow.md's PRIME DIRECTIVE
already rejects.

## TIER 1 — MANDATORY on every changed page
Six profiles, two engines. Verified present in the installed Playwright
device registry (207 profiles available) on 2026-08-24 — use these exact
names; do not invent device names.

| Profile | Viewport | DPR | Engine | Why this one |
|---|---|---|---|---|
| `Galaxy S9+` | 320×658 | 4.5 | chromium | narrowest realistic Android; survive 320 and you survive most |
| `iPhone SE` | 320×568 | 2 | **webkit** | shortest iOS — catches vertical cramping nothing else does |
| `Pixel 7` | 412×839 | 2.625 | chromium | mainstream modern Android |
| `iPhone 15` | 393×659 | 3 | **webkit** | mainstream modern iOS; notch/safe-area context |
| `iPad (gen 7)` | 810×1080 | 2 | webkit | tablet portrait — the classic "neither mobile nor desktop" break |
| `Desktop Chrome` | 1280×720 | 1 | chromium | plus ONE wide check at 1440×900 or 1920×1080 |

NOTE the current framework baseline of 360×800 matches **no real device** —
the real narrowest is 320. Keep 360 only as an extra if a site's analytics
justify it; it does not replace a 320 profile.

Engine coverage is the point, not device count: chromium (Android + most
desktop) **and** webkit (iOS + Safari) are both mandatory. A matrix of six
chromium widths tests one engine six times.

## TIER 2 — SITUATIONAL (trigger listed; run when it applies)
| Profile | Trigger |
|---|---|
| `Galaxy S9+ landscape`, `iPhone 15 landscape` | ANY full-height section, hero, modal, sticky bar, or `vh`-based spacing — landscape mobile height is ~350-430px |
| `iPad Pro 11` (834×1194) + landscape | tablet often lands in a DESKTOP breakpoint while still being touch-only |
| `Galaxy Tab S4` (712×1138, chromium) | Android tablet — different engine from the iPad profiles |
| `Desktop Firefox` (gecko) | third engine; form controls and flex/grid edge cases |
| `Desktop Edge` | chromium, but Windows-default for the ICP |

## TIER 3 — WHAT AUTOMATION CANNOT PROVE (state this honestly, never imply coverage)
Emulation is layout + engine, not hardware. It CANNOT verify:
- **Playwright WebKit ≠ Safari.** It is the WebKit engine, not Apple's
  browser. Real iOS dynamic-toolbar behavior, iOS input-focus zoom, and true
  notch insets on physical hardware are approximations at best.
- **OS-level font scaling** — a user with large-text accessibility settings.
- **Real touch/gesture behavior**, momentum scrolling, or on-device
  performance under thermal load.
- **Real Android fragmentation** — WebView versions, vendor skins.
A change that depends on any of the above needs a real-device check, and the
verdict must say "not verified by emulation" rather than passing silently.

### responsivetesttool.com — placement
Verified 2026-08-24: five presets, custom sizes, rotate, QR/share, and **no
API, CLI, or programmatic automation**. It is an iframe-based manual visual
tool. Two hard consequences:
- It produces **no repeatable artifact**, so it can never satisfy this gate.
- `100vh` inside an iframe resolves to the IFRAME's height, so it
  **structurally cannot reproduce RF-002**, the most common mobile
  responsive bug. Its own page warns "Trouble loading this site?" — the
  X-Frame-Options / mixed-content symptom you will hit on localhost and on
  any deploy that sets security headers.
USE IT FOR: fast manual triage, and its share-link/QR to show the owner a
break. NEVER as the evidence.

## THE RCA LOOP (runs on every responsive failure, whoever found it)
Identical rigor whether the owner filed a bug or our own gate caught it —
that symmetry IS the fix this file exists for.
1. **DOCUMENT** — profile name, viewport, screenshot, and the failing
   assertion. A described failure with no artifact is not yet a finding.
2. **ROOT CAUSE — before any fix.** Name the CSS/DOM cause, not the symptom.
   Match it to an RF-xxx below; if none matches, it is a NEW pattern and gets
   a new RF-xxx entry in step 5.
3. **FIX THE CAUSE.** The "wrong fix" column below lists the workaround to
   REJECT for each pattern. A fix that only hides the symptom fails this gate
   the same way symptom-patching fails templates/website_bug.md.
4. **RE-RUN** the full Tier-1 matrix plus any Tier-2 profile the trigger
   touches — never only the profile that failed. A fix at 320 that breaks 810
   is a net loss, and only a re-run proves it did not happen.
5. **RECORD + PREVENT** — add the guarding assertion to the spec so it fails
   before and passes after (same standard website_bug.md already sets), and
   append/extend the RF-xxx entry. A root cause that produced no permanent
   guard will recur; that is the whole point of this step.

## RESPONSIVE FAILURE PATTERNS (RF-xxx) — append-only, grows per site
Each: symptom → root cause → correct fix → the WRONG fix to reject → guard.

**RF-001 — Horizontal overflow from a flex/grid child**
Symptom: horizontal scrollbar at narrow widths. Cause: flex/grid items
default to `min-width: auto`, so a long child refuses to shrink below its
content size. Fix: `min-width: 0` (or `min-inline-size: 0`) on the child.
REJECT: `overflow-x: hidden` on body — hides the bar, content still
unreachable. Guard: `documentElement.scrollWidth <= clientWidth` at every
Tier-1 profile.

**RF-002 — `100vh` overflows on mobile**
Symptom: full-height section overflows; CTA pushed below the fold; layout
jumps as the toolbar hides. Cause: mobile `100vh` = the LARGEST viewport
(toolbar hidden), not the current one. Fix: `100dvh` (or `100svh`) with a
`100vh` fallback. REJECT: hardcoded `calc(100vh - 60px)` magic numbers —
correct on one device, wrong on all others. Guard: hero fits within
`window.innerHeight`; primary CTA inside the initial viewport at mobile
profiles.

**RF-003 — iOS zooms in on input focus**
Symptom: tapping a form field zooms the page; layout looks broken after.
Cause: iOS Safari auto-zooms when an input's font-size is < 16px. Fix:
`font-size: 16px` (≥1rem) on input/select/textarea. REJECT:
`user-scalable=no` / `maximum-scale=1` — breaks pinch-zoom, a WCAG 1.4.4
failure; never trade accessibility for a layout symptom. Guard: computed
font-size ≥16px on every focusable field at webkit profiles.

**RF-004 — Safe-area / notch collision**
Symptom: sticky header or bottom CTA under the notch or home indicator.
Cause: no `env(safe-area-inset-*)`, and/or missing `viewport-fit=cover`.
Fix: pad with `env(safe-area-inset-*)`. REJECT: a fixed pixel pad tuned to
one device. Guard: **TIER 3** — emulation cannot fully verify this; say so
in the verdict rather than claiming a pass.

**RF-005 — Windows scrollbar eats the viewport**
Symptom: layout breaks at exactly the breakpoint on Windows, fine on macOS.
Cause: Windows classic scrollbars consume layout width (~15-17px) where
macOS overlay scrollbars do not; `100vw` INCLUDES the scrollbar while `100%`
does not. Fix: avoid `100vw` for full-bleed; use `width: 100%` or
`scrollbar-gutter: stable`. REJECT: subtracting a hardcoded 15px. Guard: run
the suite on Windows (Playwright tests the HOST OS — "testing Windows"
means running there) and assert `documentElement.clientWidth` vs
`window.innerWidth`.

**RF-006 — Touch target below 44px**
Cause: sized by font/line-height alone with no minimum tap area. Fix:
`min-height`/`min-width: 44px` or padding. REJECT: enlarging only the visual
box while the hit area stays small. Guard: bounding box ≥44×44 for every
interactive element at mobile profiles.

**RF-007 — Landscape-mobile vertical collapse**
Symptom: hero or modal unusable in landscape. Cause: vertical rhythm tied to
`vh` or fixed values that assume portrait. Fix: height-based media query
(`@media (max-height: 480px)`) or content-driven heights. Guard: Tier-2
landscape profiles; no clipped content; modals scrollable.

**RF-008 — Long unbreakable string overflows**
Cause: an unbroken URL/email/ID with no wrapping rule. Fix:
`overflow-wrap: anywhere`. REJECT: ellipsis truncation when the content
carries meaning (silent data loss). Guard: overflow check with a
long-token fixture.

**RF-009 — Image overflow / layout shift**
Cause: no intrinsic dimensions and/or no `max-width: 100%`. Fix: width+height
or `aspect-ratio`, `max-width: 100%`, correct `next/image` sizing. Guard: CLS
<0.1 (already in qa_evidence_gate §3) plus no image exceeding its container.

**RF-010 — Sticky-chrome collision**
Cause: multiple independently positioned fixed/sticky layers (header, CTA,
popups) with no shared height budget. Fix: ONE layout token for total pinned
chrome; sections offset by it. Guard: assert headline and primary CTA are not
occluded at every Tier-1 profile.

**RF-011 — px type ignores user font scaling**
Cause: `px` font sizes don't respond to OS/browser text-size settings. Fix:
`rem` for type. Guard: **TIER 3** — emulation cannot verify; flag honestly.
