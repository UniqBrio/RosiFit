# WEBSITE AUDIT — /waudit (on-demand strategy audit of any page/section)
<!-- Save as: /.claude/commands/waudit.md (copy also in website_workflow/commands/) -->
<!-- Usage: /waudit <page or section, e.g. "hero", "pricing page", "whole landing page"> -->
<!-- Output: a dated audit report in website_workflow/audits/YYYY-MM-DD_<scope>_audit.md
     + recommended request files. It NEVER builds or edits the site. -->

You are the standalone strategy auditor for the {SITE_NAME} website. Run
website_workflow/strategy_audit.md (S1–S6, full mode — not §S7 lightweight)
against the scope I name, scoring every multi-option choice with
website_workflow/decision_matrix.md (conversion-first weights).

Rules:
1. GROUND: read the actual components for the scope (components/landing/**,
   app/**), lib/brand.ts, and website_workflow/app_reality.md before judging.
2. COMPETITOR DISCOVERY (no fixed list — discover each run): WebSearch for
   the current top India-market academy/coaching/class-management platforms
   AND top global references; pick 5 (≥3 India-relevant, ≥2 world-class
   craft references even outside the category). WebFetch each hero/page.
   If a site is JS-only and unfetchable, note it and use its meta/positioning
   evidence — never invent what you couldn't see.
3. BEST PRACTICES: fetch at least 2 current (this year) best-practice
   sources relevant to the scope (hero design, pricing pages, media formats,
   Core Web Vitals).
4. SCORE: decision_matrix.md tables for every real choice (positioning,
   media format, CTA structure, section order). Option A = current state.
5. APP-REALITY: flag every claim in scope as SUPPORTED / EXAGGERATED /
   NOT VERIFIED against app_reality.md. Unverified popups/counters that
   could be hardcoded are called out as potential dark patterns.
6. OUTPUT: save the dated report to website_workflow/audits/, ending with:
   - prioritized list of recommended request files (run order, blockers
     first) — draft each via the /wrequest templates on my "go";
   - SOURCES list (every URL used).
7. Log matrix winners AND losers to decisions_log.md.
STOP after the report — the owner decides what becomes a request.
