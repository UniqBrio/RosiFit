---
name: seo-rank-tracking-specialist
description: Operates a recurring keyword rank-tracking, organic-traffic attribution, competitor-monitoring, and SEO reporting system for UniqBrio's public marketing website, turning ranking and traffic data into diagnosed causes and revenue-linked decisions.
when_to_use: Trigger this skill whenever the task involves tracking keyword rankings or organic traffic over time, diagnosing why rankings or traffic moved, producing a weekly/monthly/quarterly SEO report, comparing UniqBrio against SEO competitors, or deciding what SEO action to take next.
---

# SEO Rank Tracking & Organic Traffic Attribution Specialist

## 0. Mission and Scope

This skill runs SEO performance monitoring as an ongoing operational system, not a one-off analysis. It tracks keyword rankings and organic traffic for **UniqBrio** — an India-first B2B SaaS platform for arts and sports academy management — attributes every meaningful movement to a specific cause, benchmarks against competitors, and reports progress against the content SEO strategy in a way that ties directly to business outcomes: demo bookings, free trial signups, and paid conversions.

**Scope:** the public marketing website only (pre-login experience) — Next.js marketing site, deployed on Vercel, backed by Supabase PostgreSQL and Edge Functions where needed for logging/attribution data. The React Native Expo PWA (post-login product) is out of scope.

**Primary audience to keep in view at all times:** Indian arts academy owners (dance, music, fine art) and Indian sports academy owners (cricket, football, badminton, swimming, martial arts, multi-sport). Most are non-technical SMB owners in Tier 1–3 cities, frequently searching on mobile.

**Operating principle:** every ranking number and every traffic chart must answer two questions before it is reported — "what caused this?" and "does it matter to revenue?" A #1 ranking for a zero-intent keyword is not a win. A quiet 4-position climb on a transactional term mapped to `/book-demo` is.

This skill is tool-agnostic. It assumes access to some combination of Google Search Console (GSC), Google Analytics 4 (GA4), a rank tracker (Ahrefs/Semrush/similar), a crawler (Screaming Frog or similar), PageSpeed Insights/CrUX, and Vercel Analytics/deployment logs — but no methodology below depends on a single named vendor. If a tool isn't available, substitute the nearest equivalent data source and note the substitution in the report.

---

## 1. Keyword Taxonomy & Categorization

Every tracked keyword is tagged across four independent dimensions simultaneously. Never track a keyword with only one dimension — aggregate numbers without this taxonomy hide the real story.

```
[Keyword] ─┬─ Intent: Transactional / Commercial / Informational / Navigational
           ├─ Branding: Branded / Non-branded
           ├─ Geography: National / Local (city or state modified)
           └─ Funnel stage: Awareness / Consideration / Conversion / Retention
```

### 1.1 Search Intent

| Intent | What it signals | UniqBrio examples |
|---|---|---|
| **Transactional** | Ready to act now | "UniqBrio free trial", "sports academy software demo", "buy academy management software" |
| **Commercial** | Comparing options before deciding | "best sports academy management software India", "UniqBrio vs [competitor]", "dance studio software reviews" |
| **Informational** | Researching a problem, not yet solution-aware | "how to manage academy attendance", "how to collect fees from parents automatically", "how to grow a dance studio in India" |
| **Navigational** | Looking for a specific known destination | "UniqBrio login", "UniqBrio pricing", "UniqBrio support" |

### 1.2 Branded vs. Non-Branded

Always split reporting into a **branded index** (any variant of "UniqBrio", including misspellings) and a **non-branded index** (category and feature terms with no brand mention). Blending them hides the true state of organic acquisition: branded search volume tracks marketing/PR/word-of-mouth, not SEO content or technical health. A rising branded index next to a flat or falling non-branded index is not an SEO win — see Diagnostic 11.6.

### 1.3 Local SEO Keywords

Because academy owners often search with a city or region modifier, maintain a parallel **local keyword set** distinct from the national set:
- National core: "cricket academy management software"
- Local: "cricket academy software Chennai", "dance school management app Mumbai", "sports academy CRM Bangalore", "academy management software Coimbatore"

Track local keywords against dedicated local/regional landing pages where they exist, and against the nearest national page otherwise. Local intent SERPs often surface Map Pack / Local Pack results — treat these as a distinct SERP feature to monitor (see 3.3).

### 1.4 Primary vs. Secondary Keywords & Keyword Ownership by Page

Every indexable URL gets **exactly one** primary keyword and 3–5 secondary keywords. This "one page, one primary keyword" rule is the single most effective safeguard against cannibalization.

| URL | Page type | Primary keyword | Secondary keywords |
|---|---|---|---|
| `/` | Homepage | academy management software | sports academy software, arts academy software, academy management system India |
| `/solutions/sports-academy` | Vertical LP | sports academy management software | cricket academy software, football academy management, sports coaching app |
| `/solutions/arts-academy` | Vertical LP | arts academy management software | dance studio software India, music school management app, performing arts school software |
| `/features/fee-collection` | Feature page | academy fee collection software | automated fee reminders, online fee payment for academies, GST-compliant academy receipts |
| `/features/attendance` | Feature page | academy attendance management app | QR attendance tracking, coaching class attendance app |
| `/pricing` | Conversion page | UniqBrio pricing | academy software cost India, academy management system pricing |
| `/book-demo` | Conversion page | book a demo | UniqBrio demo, schedule academy software demo |
| `/blog/grow-dance-studio` | Informational | how to grow a dance studio in India | dance studio marketing, get more students dance class |

Maintain this mapping as a living document (spreadsheet or CMS field). Any new page must be checked against it before publishing to avoid creating a second owner for an existing keyword.

### 1.5 Keyword Cannibalization Detection

**Detection procedure (run monthly, or immediately after any ranking anomaly):**
1. Pull a rolling 28-day GSC Performance report filtered to the keyword in question, grouped by page.
2. If ≥2 distinct URLs each receive more than ~5% of that keyword's total impressions, cannibalization is present.
3. Calculate a **Cannibalization Index**: `CI = Impressions(secondary URL) / Impressions(primary/target URL)`. A `CI > 0.15` is worth resolving; `CI > 0.5` (URLs effectively swapping ranks week to week) is urgent.

**Resolution:**
- *Same intent, redundant pages:* consolidate content into the stronger URL, 301-redirect the weaker one.
- *Different intent, false overlap:* keep both, but sharpen differentiation — rewrite title/H1 on each, and repoint internal links/anchor text so each page's anchor text matches its own primary keyword, not the other's.
- Always re-check the keyword-ownership map (1.4) after resolving so ownership stays unambiguous going forward.

---

## 2. Keyword List Lifecycle Management

```
[Discovery] → [Prioritization] → [Mapping: page / cluster / funnel] → [Active Tracking] → [Retirement]
```

### 2.1 Initial List Creation & Ongoing Discovery
- Seed the list with 20–30 core keywords describing the product and its two verticals (arts, sports).
- Expand using a rank tracker's keyword-suggestion / "also rank for" features and competitor gap reports.
- Mine GSC weekly for queries with impressions but average position >20 (near-miss discovery) and for entirely new queries not yet in the tracked list.
- Target a working list of roughly 100–200 keywords — enough for coverage, small enough to review by hand monthly.

### 2.2 Prioritization: Business Value × Volume

Score every keyword: `Priority Score = Search Volume Score (1–5) × Business Intent Weight (WI)`, where:
- WI = 5.0 — transactional, core-feature terms (e.g., "online fee collection software for academies")
- WI = 4.0 — category/generic high-intent terms (e.g., "sports academy software")
- WI = 2.5 — high-intent informational terms close to conversion (e.g., "how to automate fee collection from parents")
- WI = 1.0 — loose informational/definitional terms (e.g., "types of classical dance styles")

Rank the tracked list by this score and review the top and bottom deciles monthly — top decile gets content/technical investment first; bottom decile is reviewed for retirement.

### 2.3 Mapping to Landing Pages, Content Clusters, and Conversion Funnels

- **Landing page mapping:** every keyword maps to exactly one owning URL (see 1.4).
- **Content cluster mapping:** group keywords into topic clusters anchored by a pillar page (e.g., a "Fee Collection" cluster: pillar `/features/fee-collection`, supported by blog posts on GST receipts, late-fee reminders, UPI collection).
- **Funnel mapping:** tag every keyword with a funnel stage so traffic and conversion data can be read in context.

| Funnel stage | Intent | Example keyword | Typical owning page |
|---|---|---|---|
| Awareness | Informational | "challenges running a sports academy" | Blog |
| Consideration | Commercial | "best academy management software India" | Comparison/blog |
| Conversion | Transactional | "UniqBrio free trial", "book academy software demo" | `/signup`, `/book-demo` |
| Retention/Navigational | Navigational | "UniqBrio login" | App/login (monitor only, not an acquisition target) |

### 2.4 Keyword Retirement

Retire (move to a passive archive, stop active tracking) when **any** of the following holds for a sustained period (recommend 2 consecutive quarterly reviews):
- Near-zero search volume and zero GSC impressions for 6 consecutive months.
- The underlying feature or vertical has been permanently discontinued (e.g., dropping support for a niche sport).
- Intent has drifted to pure consumer/B2C search (parents/students looking for classes) with no B2B academy-owner signal.

Keep a dated retirement log — this prevents accidentally "re-discovering" and re-adding a keyword that was deliberately dropped.

---

## 3. Ranking Segmentation

Never report a single blended average position. Segment first, then aggregate.

### 3.1 Geographic Segmentation
Track a national-India profile plus dedicated profiles for the highest-density academy hubs: Tamil Nadu (Chennai/Coimbatore), Maharashtra (Mumbai/Pune), Karnataka (Bangalore), Delhi NCR, Telangana (Hyderabad). Local-modified keywords (1.3) should be tracked in their specific city profile, not the national one.

### 3.2 Device Segmentation
Track Desktop and Mobile as separate ranking sets. Given the audience's mobile-heavy usage patterns, weight mobile monitoring more heavily — mobile SERPs differ structurally (more People Also Ask, snippet-dominant, smaller visible title/description). A mobile-only ranking change is a strong signal of a mobile-specific technical issue (see Diagnostic 11.5) rather than a general SEO problem.

### 3.3 Search Engine / SERP Feature Segmentation
Google (localized to India) is primary; optionally monitor Bing for diversification. Track SERP feature ownership per keyword bucket:
- **Featured snippets** — especially for definitional/FAQ-style informational queries.
- **People Also Ask (PAA)** — informational entry points worth targeting with FAQ schema.
- **Local Pack / Maps** — relevant for city-modified local keywords.
- **AI Overviews / SGE-style summaries** — track whether these push organic results down and reduce clicks even when rank holds (zero-click risk, see 11.3).

---

## 4. Ranking Metrics & Formulas

### 4.1 Position Distribution
Bucket every tracked keyword weekly into: **Top 1**, **Top 3**, **Top 10** (page 1), **Top 20** (page 2 — "striking distance"), **Top 100** (indexed with some visibility), **Not ranking**. Report the *count of keywords moving between buckets*, not just the raw average position — a jump from position 14 to 11 (still "Top 20") matters less than one from 11 to 9 (crossing into Top 10).

### 4.2 Share of Voice (SoV)
Estimate UniqBrio's share of available clicks in a keyword bucket relative to tracked competitors:

`SoV = Σ(estimated CTR at position_i × search volume_i) / Σ(search volume_i)`

Use a standard CTR-by-position curve (roughly: pos 1 ≈ 27–31%, pos 2 ≈ 14–16%, pos 3 ≈ 9–10%, pos 4 ≈ 6–7%, pos 5 ≈ 4–5%, pos 6–10 ≈ 1–2% each, pos 11–20 ≈ <1% each), adjusted down when a SERP feature (snippet, ads, AI overview) is present above the organic result.

### 4.3 Visibility Score
A single index (0–100%) summarizing overall ranking health across the tracked list:

`Visibility Score = (Σ weight_k) / (total keywords tracked)`, where weight by position ≈ 1.00 (pos 1), 0.85 (pos 2), 0.70 (pos 3), 0.55 (pos 4), 0.45 (pos 5), 0.25 (pos 6–10), 0.10 (pos 11–20), 0 (pos 21+).

Track this score separately for the branded index, non-branded index, and each vertical (arts/sports) — a rising blended score can mask a falling non-branded score.

### 4.4 Ranking Volatility Index (RVI)
`RVI = Σ|position_this_week − position_last_week| / total keywords tracked`, computed weekly over the top ~100–200 non-branded keywords.
- RVI ≤ 1.2 → normal week-to-week noise.
- 1.2 < RVI ≤ 3.0 → moderate volatility; check for a minor/localized update or a recent content or technical change.
- RVI > 3.0 → high volatility; check for a confirmed Google algorithm update, a sitewide technical fault, or a tracking-tool error before concluding it's algorithmic.

---

## 5. Attribution Methodology — Repeatable, Not Guesswork

Never attribute a ranking or traffic change to a cause without checking the evidence for that cause. Work through causes in this order for any flagged shift.

### 5.1 Root Cause Reference Matrix

| Cause | What to check | Where to check it |
|---|---|---|
| Content update | Diff of body copy, headings, added/removed sections | CMS version history / git diff / Wayback Machine |
| New content published | New URL in a cluster, publish date | Sitemap timestamp, CMS log, Vercel deploy log |
| Internal linking change | New/removed inbound internal links and anchor text | Crawler "inlinks" report before/after |
| Technical SEO change | Server response codes, rendering method, schema | Vercel logs, GSC URL Inspection, Rich Results Test |
| Core Web Vitals change | LCP / INP / CLS by device | CrUX, PageSpeed Insights, Vercel Speed Insights |
| Site architecture change | URL depth, nav/menu restructuring | Crawler crawl-depth comparison |
| Metadata change | Title tag / meta description edits | Git commit diff, page-source diff |
| Structured data change | Schema added/removed/broken | Schema validator, GSC Enhancements report |
| Redirect change | New 301/302, redirect chains/loops | `vercel.json` / redirect config diff |
| Backlink change | New or lost high-authority referring domains | Backlink monitoring tool alerts |
| Competitor activity | Competitor content/backlink/technical changes on outranking pages | Manual SERP + competitor page diff |
| Algorithm update | Broad, multi-page/multi-keyword movement coinciding with an industry-confirmed date | Industry update trackers, GSC performance annotations |
| Seasonal demand | Recurring yearly pattern (school terms, festival calendar) | YoY Google Trends / internal historical traffic |
| Search intent shift | SERP composition changed (more videos, more local pack, etc.) for the same query | SERP layout history |
| Indexing/crawl issue | Sudden drop in indexed URL count, soft 404s | GSC Page Indexing report |
| Canonical issue | Declared vs. Google-selected canonical mismatch | GSC URL Inspection |
| Server incident | 5xx errors, timeouts during the crawl window | Server/Edge Function logs |
| Deployment regression | Any of the above introduced by a specific release | Vercel deployment history cross-referenced by date |

### 5.2 Attribution Workflow

Run this sequence whenever visibility or traffic for a page/cluster moves meaningfully (rule of thumb: visibility score change >10% relative, or traffic change >15–20%):

1. **Isolate the footprint.** Is it one URL, a subfolder/cluster, or sitewide? Mobile-only, desktop-only, or both? Branded, non-branded, or both? (Narrowing the footprint eliminates most candidate causes immediately.)
2. **Check technical/crawl flags first** — this is the cheapest check and rules out the most damaging causes. GSC URL Inspection (canonical, indexing, mobile usability), recent 5xx/429 patterns in server/Edge Function logs.
3. **Cross-reference the deployment timeline.** Line up the exact date of the shift against Vercel's git deployment history; inspect the diff for that release for template, meta, schema, or CWV-relevant changes.
4. **Review content and internal-link change logs** for the affected page(s) in the prior 14 days.
5. **Check backlink velocity** for sudden gains or losses on the affected URL(s).
6. **Analyze the external SERP environment last** — only once internal causes are ruled out: has a competitor changed their page, has a SERP feature expanded, is there a confirmed algorithm update, is this a known seasonal pattern?
7. **Record the conclusion** in a running change log (date, page, metric moved, cause identified, confidence level, action taken). This log is what makes future attribution faster and is required input for the monthly/quarterly reports.

Never skip straight to "must be an algorithm update" — that is the single most common attribution error (see 13).

---

## 6. Organic Traffic, Funnel, and Conversion Reporting

### 6.1 Metric Definitions (GA4-aligned, tool-agnostic in principle)

| Metric | Definition |
|---|---|
| Organic sessions | Sessions where the acquisition channel is organic search |
| Users / New users | Unique visitors from organic search / those visiting for the first time |
| Engaged sessions | Sessions lasting 10+ seconds, OR with a conversion event, OR with 2+ pageviews |
| Engagement rate | Engaged sessions ÷ total sessions |
| Bounce rate | 100% − engagement rate (where the platform defines it this way) |
| Average engagement time | Average active foreground time per session |
| Landing pages | First page of the organic session — the unit most attribution work happens at |
| Conversions | Demo bookings, trial signups, and (downstream) paid conversions |
| Assisted conversions | Sessions/pages that contributed to a conversion without being the final touch |
| Conversion rate | Conversions ÷ sessions, always reported per landing page and per keyword-intent bucket, never only sitewide |
| Revenue attribution | Revenue traced back to an organic first-touch or last-touch source, synced from the product's own conversion event (e.g., subscription-activated) back into the analytics/attribution layer |

### 6.2 Funnel Progression

`Organic session → Engaged session → Lead (trial signup / demo request) → Demo attended → Paid customer`

Track drop-off rate at each stage, segmented by landing page and by keyword funnel-stage tag (2.3). A healthy top-of-funnel blog post should show strong engagement but a much lower conversion rate than a bottom-of-funnel feature or pricing page — don't compare their conversion rates directly; compare each against its own historical baseline and against pages of the same funnel stage.

### 6.3 Attribution Models for Organic Leads

- **First-touch attribution** — full credit to the first organic landing page. Use to value top-of-funnel content (blog, informational pages).
- **Last non-direct touch attribution** — full credit to the final organic page before conversion. Use to value bottom-of-funnel pages (pricing, demo, feature pages).
- **Linear attribution** — credit spread evenly across all organic touches in the user's session window. Use for a balanced view of the whole content funnel's contribution, especially in the monthly/quarterly strategic reports.

Report all three where possible rather than picking one — first-touch and last-touch tell very different (both true) stories about which content matters.

---

## 7. Reporting Templates

### 7.1 Weekly SEO Report (operational pulse)
```
WEEKLY SEO REPORT — UniqBrio | [date range]

Topline: organic sessions [X] ([±%] WoW) | engaged sessions [X] |
demo bookings [X] | trial signups [X]

Position distribution: Top 3 [n] | Top 10 [n] | Top 20 [n] | RVI [value]

Top 3 keyword winners: [kw, Δposition, page]
Top 3 keyword losers: [kw, Δposition, page]

Technical/crawl anomalies this week: [count of new 4xx/5xx, indexing changes]

Action items opened: [list]
```

### 7.2 Monthly SEO Report
```
MONTHLY SEO REPORT — UniqBrio | [month]

1. KPI scorecard (MoM and YoY): organic sessions, engaged sessions,
   demo bookings, trial signups, organic conversion rate, visibility score
   (branded / non-branded / by vertical), average position, RVI.

2. Keyword movement summary: biggest winners/losers with attributed cause
   (from the change log in 5.2), cannibalization flags raised/resolved.

3. Organic traffic summary: top 10 landing pages by sessions and by
   conversion volume; funnel drop-off by stage.

4. Technical SEO progress: CWV pass rate, indexing coverage, crawl errors,
   outstanding issues handed to seo-technical-audit-specialist.

5. Competitor snapshot: SoV vs. top 2–3 competitors, newly won/lost
   keyword opportunities, SERP feature shifts.

6. Next month's priorities: top 3 actions, owner, expected impact.
```

### 7.3 Quarterly SEO Report
Same structure as monthly, plus: quarter-over-quarter visibility and revenue trend charts, content ROI (`organic revenue attributed ÷ content production cost`), a "wins vs. learnings" retrospective, and updated keyword list health (added/retired counts).

### 7.4 Executive Summary (for leadership)
2–4 sentences: what organic search contributed to pipeline this period, the single biggest win, the single biggest risk, and the one decision leadership needs to make or approve.

### 7.5 Leadership Dashboard
Cards: organic sessions trend (3–6 months), organic conversion rate trend, demo bookings from organic, revenue from organic, Top 3 rankings count, SoV vs. top competitors.

### 7.6 Marketing / Content Dashboard
Table: keyword, current position, Δposition, search volume, owning page, funnel stage. Chart: visibility score trend split branded/non-branded and by vertical. Table: content performance (sessions, engagement rate, conversion rate) per page.

### 7.7 Technical SEO Progress Report
CWV pass/fail rate over time (by device), indexed-URL count trend, crawl error count trend, canonical/redirect issue log, list of fixes shipped this period and their dated ranking/traffic impact (linking back to the attribution log).

---

## 8. Competitor Monitoring

Maintain a short list of direct (other India-focused academy-management SaaS) and indirect (generic ERP/billing tools, spreadsheet templates, local directories) competitors.

- **Keyword overlap:** % of the tracked list where a competitor also ranks in the top 20.
- **Relative position / SoV comparison:** UniqBrio's SoV vs. each competitor's, per keyword bucket and per vertical.
- **SERP feature comparison:** who owns featured snippets, PAA, and local packs on shared high-value terms.
- **Content gap tracking:** keywords where 2+ competitors rank top 10 and UniqBrio doesn't rank in the top 50 — feed these directly to `content-seo-strategist` as content brief candidates.
- **Emerging competitor detection:** flag any new domain entering the top 10 for a primary keyword that wasn't there last quarter.
- **Lost/won opportunities:** keywords where UniqBrio overtook a competitor (won) or was overtaken (lost) in the period, with attributed cause where known.

Cadence: keyword-overlap and SoV weekly at a glance; full content-gap and competitor-page-change review monthly.

---

## 9. Alert Thresholds & Required Actions

| Alert | Threshold | Immediate action |
|---|---|---|
| Significant ranking drop | A primary/transactional keyword falls >3 positions, or drops out of Top 10, within 48 hours | Run the attribution workflow (5.2) starting with technical/crawl checks on the specific page |
| Significant ranking gain | A tracked keyword gains >3 positions in a week | Run attribution workflow to identify the cause and replicate it elsewhere; document in the change log |
| Sudden traffic decline | Organic sessions drop >20–25% WoW | Check indexing/robots/noindex first, then GA4 tag health, then GSC manual actions, then Vercel deploy log |
| Sudden traffic increase | Organic sessions rise >25% WoW unexpectedly | Verify it's real (not a tracking bug or bot traffic) before reporting it as a win; identify the driving page/keyword |
| Index coverage change | Valid indexed URLs drop >10% in one cycle | Check GSC Page Indexing report for soft 404s, blocked robots.txt rules, or broken redirect loops |
| CTR decline | CTR on a stable-ranking keyword drops >15–30% MoM | Check for new SERP features (ads, AI overviews, expanded PAA) and check if Google has rewritten the displayed title |
| Impression decline | Impressions fall without a ranking change | Check search-volume/seasonality first, then check for query deduplication or SERP layout changes |
| High-value keyword loss | A primary transactional keyword falls out of Top 10 | Treat as highest priority — full attribution workflow, page audit, competitor check |
| Landing page traffic collapse | A single page loses the majority of its sessions while others are stable | Check canonical/indexing status first, then cannibalization (1.5) |
| Core Web Vitals regression | "Poor" URL share increases, or LCP/INP/CLS moves from Good to Poor | Identify the deploying commit; fix and redeploy; monitor for recovery over the following 1–2 crawl cycles |
| Crawl anomaly | Spike in 4xx/5xx in crawl or GSC | Check server/Edge Function health and recent deploys immediately |

---

## 10. Dashboard Recommendations

- **Trend line:** organic sessions and visibility score over time, with deployment dates annotated (so spikes/drops can be visually matched to releases).
- **Position-distribution stacked bar:** Top 3 / Top 10 / Top 20 / Top 100 counts per week or month.
- **Heatmap:** keyword × week position, colored by movement, to spot volatility clusters visually.
- **Funnel chart:** sessions → engaged sessions → leads → demos → paid, with conversion % at each step.
- **Competitor SoV comparison bar chart:** UniqBrio vs. top 2–3 competitors, by keyword bucket.
- **Scorecards:** single-number KPI tiles for the leadership dashboard (see 7.5).
- **Table with conditional formatting:** keyword movement summary, red/green by Δposition.

---

## 11. Diagnostic Playbooks

### 11.1 "Why did organic traffic drop?"
1. Check global indexation first: sitemap crawl, GSC Index Coverage, accidental `noindex` or robots.txt block, especially after a recent deploy.
2. Check server/API health: 5xx or timeout patterns in Edge Function logs during the crawl window — if bots see broken/empty pages, rankings and traffic both fall sitewide.
3. Check RVI: if uniformly high across non-branded terms, suspect a confirmed algorithm update; if isolated to a cluster, suspect a content/competitive cause in that niche.
4. Check seasonality before concluding anything is "wrong" — academy search demand can follow school-term and festival calendars.

### 11.2 "Why did rankings improve?"
1. Check the change log and git/CMS history for the winning URL(s) for on-page changes (added structured, semantically relevant copy; schema additions) in the preceding 1–3 weeks.
2. Check backlink monitoring for new authoritative referrers in the same window.
3. Check whether a previously outranking competitor dropped or broke something — sometimes a "win" is really a competitor's loss, which matters for how sustainable it is.
4. Document the cause so the tactic can be repeated on other pages in the same cluster.

### 11.3 "Why are impressions increasing but clicks decreasing?"
1. Compare current vs. historical SERP layout for the affected keywords — an expanded featured snippet, AI overview, or PAA accordion can absorb clicks even while your rank holds (zero-click growth).
2. Check GSC's CTR-by-position data for the specific URL/query — if CTR fell at a stable rank, check whether the displayed title/description has been auto-rewritten or truncated (title over ~60 characters is a common cause).
3. If the query has simply grown in volume (more impressions) but at a low position, this is expected and not itself a problem — check whether the position needs to move up, not just the CTR.

### 11.4 "Why are clicks increasing but conversions falling?"
1. Identify which keywords/pages are driving the new clicks. If it's top-of-funnel informational content, a lower conversion rate is expected — check that it links clearly to a conversion page rather than assuming something is broken.
2. If it's a transactional/bottom-funnel page, audit the conversion path itself: form errors, slow load, broken signup/demo-booking widget, unclear pricing — a UX or technical blocker, not a traffic-quality problem.
3. Check audience fit: is the new traffic academy owners (B2B) or parents/students (B2C, wrong ICP)? Query and landing-page mismatch here is common for generic sports/arts informational terms.

### 11.5 "Why did only mobile rankings change?"
1. Check mobile-specific Core Web Vitals (INP, CLS especially) via CrUX/PageSpeed/Vercel Speed Insights — desktop can look fine while mobile regresses.
2. Check GSC Mobile Usability report for text-too-small, tap-targets-too-close, or viewport issues.
3. Check for intrusive interstitials/large sticky banners on mobile that don't appear on desktop — these are a known mobile-ranking penalty trigger.

### 11.6 "Why are only branded keywords improving?"
1. Check for external, non-SEO drivers of brand awareness: recent PR, offline events, paid campaigns, social pushes — these lift branded search volume without reflecting organic SEO health.
2. Filter the dashboard to non-branded terms only and check that trend independently — if non-branded visibility is flat or falling while branded rises, the two are telling different stories and should never be reported as one blended "SEO is improving" number.

### 11.7 "Why did one landing page lose traffic?"
1. Run GSC URL Inspection on that specific page: is it still indexed? Has the canonical changed or started pointing elsewhere?
2. Check for cannibalization (1.5) — a newer page (often a blog post) may have started absorbing the same query's impressions.
3. Check for a recent content edit, redirect change, or internal-link removal specific to that page.

---

## 12. Key Performance Indicators (Reference List)

Keyword-level: position, Top 3 / Top 10 / Top 20 counts, average position, visibility score, RVI.
Acquisition: impressions, clicks, CTR, organic sessions, users, new users.
Engagement: engaged sessions, engagement rate, average engagement time, bounce rate (where used).
Business: organic conversions (demo bookings, trial signups), assisted conversions, conversion rate, funnel drop-off by stage, revenue attribution, content ROI.
Technical: CWV pass rate, indexed URL count, crawl error count, open technical-issue count.
Competitive: Share of Voice, keyword overlap %, SERP-feature-ownership count, content-gap keyword count.

---

## 13. Common Mistakes, Attribution Pitfalls, and Measurement Limitations

- **Jumping to "algorithm update"** before checking technical, content, and internal causes — the most common false attribution. Always work the checklist in 5.2 in order.
- **Vanity-metric chasing** — celebrating a #1 rank or high impression count for a keyword with no real business intent or search volume.
- **Blending branded and non-branded** into one visibility number, which masks whether actual organic acquisition is healthy.
- **Ignoring seasonality** — reacting to a MoM dip that is actually a normal annual pattern (school terms, festival calendars); always check YoY alongside MoM/WoW.
- **Over-trusting third-party rank trackers' exact positions** — they sample from specific IPs/locations and can diverge from what a real Indian searcher sees; treat GSC average position as the source of truth for real-world performance, and third-party trackers as a supplementary volatility/competitor signal.
- **Judging a change too early** — SEO changes (content or technical) typically need 2–6 weeks to show their full effect; don't declare success or failure inside the first week.
- **GA4 under-counting** — ad blockers and consent settings can undercount sessions; cross-reference with GSC click data when the two diverge significantly.
- **Over-crediting the last click** — relying solely on last-touch attribution undervalues top-of-funnel informational content; always report first-touch and linear views alongside it (6.3).

---

## 14. Governance, Cadence, and Documentation Standards

- **Cadence:** weekly pulse report → monthly full report and review meeting → quarterly strategic review with leadership.
- **Change log discipline:** every content edit, technical change, and deployment relevant to a tracked page must be logged with a date, so the attribution workflow (5.2) has something concrete to check against. This is the single highest-leverage governance habit for this skill.
- **Data quality validation:** monthly, verify GA4 conversion event definitions, GSC property/domain settings, and the rank tracker's keyword list are all still correctly configured; reconcile any GSC-vs-GA4 discrepancies before reporting.
- **Documentation standards:** keep the keyword-ownership map (1.4), the keyword retirement log (2.4), and the attribution change log (5.2) as living, dated documents — not one-off spreadsheets that go stale.
- **Continuous improvement:** every quarter, review what was mis-attributed or missed in the prior quarter and tighten the checklist accordingly.

---

## 15. Working With Adjacent Skills

- **`content-seo-strategist`** — hand off content-gap keywords, cannibalization findings, and cluster performance data so new content briefs and calendar priorities are evidence-based; receive the content calendar and keyword-to-cluster plan as the baseline this skill tracks against.
- **`seo-technical-audit-specialist`** — escalate any technical root cause found during attribution (indexing, CWV, schema, redirects, crawl errors) with the specific URLs and dates; receive confirmation of fixes and expected timelines so recovery can be monitored and reported.
- **`on-page-seo-copywriter`** — hand off pages with high impressions/low CTR (title/meta rewrite candidates) or pages stuck on page 2 needing on-page strengthening; receive updated copy/metadata so the resulting ranking and CTR impact can be tracked and attributed correctly.

Use this skill first to detect and diagnose; hand off root causes outside its control (content gaps, technical faults, on-page copy) to the relevant specialist skill; then use this skill again to verify and report the resulting impact.
