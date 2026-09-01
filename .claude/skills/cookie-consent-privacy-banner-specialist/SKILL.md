---
name: cookie-consent-privacy-banner-specialist
description: Architects, implements, reviews, troubleshoots, and validates GDPR/DPDP-compliant cookie-consent banners and preference centers that block all non-essential tracking (GTM, GA4, Consent Mode v2, ad pixels, embeds) until explicit consent, while preserving Core Web Vitals, accessibility, SEO, and conversion rate.
when_to_use: Trigger this skill for any request involving cookie consent banners, GDPR/DPDP compliance, consent management platforms, script/tag gating, Google Consent Mode v2, GTM/GA4 consent wiring, preference centers, consent storage/revocation, or privacy UX audits on a public marketing site.
---

# Cookie Consent & Privacy Banner Specialist

You are acting as a privacy engineer, frontend architect, analytics engineer, and compliance-focused UX designer simultaneously. Your job is not to define what a cookie banner is — it is to make the specific, opinionated engineering and UX decisions required to ship one that is legally defensible, fast, accessible, and does not tank conversion. Default stack assumed unless told otherwise: **React Native Expo PWA (mobile shell) + Next.js App Router (marketing site) + Supabase Postgres/Edge Functions + Vercel + GTM + GA4**, India-first, pre-login public pages, audience = arts/sports academy owners, conversion goals = demo bookings, free trials, paid subscriptions.

**Golden rule that governs every decision in this skill:** nothing that is not "strictly necessary" may write to storage, set a cookie, or fire a network request until the user has taken an affirmative, unambiguous action. Everything downstream (architecture, UX, GTM config, testing) exists to enforce that rule without destroying performance or conversion.

---

## 1. Regulatory Foundation

### GDPR (EU) — core operative principles
- Consent must be **freely given, specific, informed, unambiguous**, and given by a **clear affirmative act** — pre-ticked boxes, "continued scrolling," or "closing this banner" never count as consent.
- Consent must be **as easy to withdraw as to give** — if accepting is one click, rejecting/withdrawing must also be one click, from the same surface.
- Consent must be **granular per purpose** — a single "I agree" covering analytics + marketing + personalization together is not valid; each category needs its own toggle.
- **Legitimate interest cannot be used to justify non-essential tracking/advertising cookies** — it is a narrow basis (e.g. fraud prevention, network security), not a shortcut around consent for GA4 or ad pixels.
- You must be able to **prove** consent was given: what was shown, what was agreed to, when, under which policy version.

### India's Digital Personal Data Protection (DPDP) Act, 2023
- Consent must be **free, specific, informed, unconditional, and unambiguous**, given through a clear affirmative act — structurally very close to GDPR, but:
- The **notice must be presented independently of the request for consent** (i.e., the "what and why" must be clear before or alongside the ask, in plain language, not buried in a linked policy).
- Notice/consent language should support **English + the user's likely regional language** where feasible — for an India-first product, prioritize English + Hindi + Tamil (matching your existing Tamil-first localization work) rather than the full 22-language mandate that applies to larger platforms.
- **Consent Managers** are an institutional concept for registered intermediaries; a bootstrapped B2B SaaS academy platform does not need to implement one — treat this as an enterprise-tier concern, not a v1 requirement.
- DPDP treats a **cookie ID that can be linked to a person as personal data**, same practical effect as GDPR — do not treat DPDP as "GDPR lite" when deciding what needs gating.
- Right to **withdraw consent as easily as it was given**, and a **grievance/DPO-style contact** must be discoverable (this is a `legal-pages-generator` deliverable, cross-reference below).

### GDPR vs DPDP — decision-relevant differences

| Aspect | GDPR | DPDP (India) |
|---|---|---|
| Affirmative consent required | Yes | Yes |
| Legitimate interest for marketing cookies | Not valid | Not valid |
| Consent as easy to withdraw as to give | Explicit requirement | Explicit requirement |
| Notice must precede/accompany consent ask | Implied via "informed" | Explicit statutory requirement |
| Language requirements | Local language of user | English + practical regional language(s) |
| Children | Consent age 16 (13 in some states) | Verifiable parental consent under 18 |
| Penalties | Up to €20M / 4% global turnover | Up to ₹250 crore per instance |
| Cross-border transfer | Adequacy-decision model | Blacklist model (government-notified restricted countries) |

**Engineering takeaway:** build to the **stricter of the two** on every point (explicit opt-in, granular categories, equally prominent reject, easy withdrawal) — this single implementation satisfies both regimes and avoids maintaining parallel consent logic per region.

### Lawful bases — quick decision map
- **Explicit consent** → analytics, personalization, marketing, advertising, social/third-party embeds. No exceptions for a pre-login marketing site.
- **Contractual necessity** → cookies required to deliver a requested transaction (e.g., session token after the user submits a demo-booking form) — does not extend to analytics on that same page.
- **Legal obligation** → fraud prevention, tax/invoicing records — not applicable to marketing-site tracking cookies.
- **Legitimate interest** → strictly-necessary security/session cookies only. Never cite this for GA4, GTM, or ad pixels — regulators and DPAs have consistently rejected this argument.

### Cookie categories — what needs consent

**No consent required (Strictly Necessary):**
Session/auth tokens, CSRF/security tokens, load-balancer cookies, the consent-preference cookie itself, shopping-cart/demo-booking-flow state, basic UI prefs (language toggle) *if* stored without a persistent cross-session identifier.

**Consent required (all must default OFF and load only post-consent):**
Functional (chat widgets, embedded calendars/Calendly, non-essential UI personalization), Analytics (GA4, Hotjar, Clarity, first-party analytics with persistent IDs), Personalization (recommendation engines, A/B testing tools that persist a visitor ID), Marketing/Advertising (Google Ads, Meta Pixel, LinkedIn Insight Tag, remarketing), Social (share widgets, embedded YouTube/Vimeo in default non-privacy mode), Third-party embeds (Maps, video, anything that sets a third-party cookie or fingerprints on load).

---

## 2. Consent Architecture

### State shape (single source of truth)

```typescript
type ConsentCategory = 'necessary' | 'functional' | 'analytics' | 'personalization' | 'marketing' | 'social';

interface ConsentState {
  necessary: true;               // always true, never persisted as a "choice"
  functional: boolean;
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
  social: boolean;
  version: string;                // policy/schema version — bump on category changes
  timestamp: string;               // ISO 8601
  consentId: string;               // stable id for audit trail
  method: 'explicit' | 'implied';  // implied should never appear post-launch
}
```

### Storage strategy — layered, not either/or
1. **`localStorage`** — primary read path for client components; fastest, largest capacity.
2. **First-party cookie** (`SameSite=Lax; Secure; max-age=365d`) — required so **Server Components / middleware** can read consent state without a client round-trip (avoids banner flash — see §5).
3. **Server persistence (Supabase)** — the audit-grade record. Every grant/withdrawal is a new row, never a mutation, for real auditability.
4. **`sessionStorage`** — only for transient UI state (e.g., "preference center open"), never for the consent decision itself.

Multi-device consideration: for **authenticated users**, sync consent to their Supabase user row so preference travels across devices; for **anonymous visitors**, the device-local cookie/localStorage pair is the only source of truth — do not attempt fingerprinting to unify anonymous consent across devices, that itself becomes a compliance problem.

### Next.js App Router specifics
- **Read consent in Middleware** (from the cookie) so you can make routing/rendering decisions (e.g., skip injecting a GTM `<script>` tag server-side entirely for `analytics: false`) without waiting for client hydration.
- **Consent Provider must be a Client Component** (`'use client'`) — it needs `useState`/`useEffect` and browser storage; nest it near the root but do not force the entire tree client-side.
- **Static Generation / ISR is unaffected** by consent — consent is a per-visitor runtime concern layered on top of a statically generated page; do not let it force `dynamic = 'force-dynamic'` on marketing pages.
- **Edge Middleware** is the right place to set an initial `consent_default` cookie if none exists (`denied` for everything non-necessary) so there's never a window where the app doesn't know the default state.
- Use **`next/script`** with `strategy="afterInteractive"` for consent-gated analytics (never `beforeInteractive` for anything non-essential) and `strategy="lazyOnload"` for marketing pixels that don't need to fire early.

### Avoiding the hydration/flash race condition
The single most common bug in this domain: GA4/GTM fires for a few hundred milliseconds before the banner mounts and reads localStorage. Fix with this sequencing, in order:
1. A **tiny inline blocking script in `<head>`** (not `next/script`, a raw `<script>` in the root layout `<head>`) sets `gtag('consent','default', {...all denied...})` synchronously, before GTM itself loads.
2. GTM container loads (`afterInteractive`), but every tag inside it is gated by **Consent Initialization trigger** — so even though GTM is present in the DOM, no tag fires.
3. Client Consent Provider mounts, reads stored consent (cookie/localStorage), and if a decision already exists, immediately calls `gtag('consent','update', {...})` — this happens in milliseconds and produces no visible re-render because the banner never had to show.
4. Only if **no stored decision exists** does the banner render.

This ordering eliminates both "analytics before consent" and "banner flash for returning visitors" as the same fix.

---

## 3. Google Consent Mode v2 + GTM/GA4

### Default state (must run before GTM loads)

```html
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',   // always allowed — session integrity
    wait_for_update: 500           // ms to hold tags for a fast consent read
  });
</script>
```

### Update on user decision

```javascript
gtag('consent', 'update', {
  ad_storage: hasConsentFor('marketing') ? 'granted' : 'denied',
  ad_user_data: hasConsentFor('marketing') ? 'granted' : 'denied',
  ad_personalization: hasConsentFor('personalization') ? 'granted' : 'denied',
  analytics_storage: hasConsentFor('analytics') ? 'granted' : 'denied',
  functionality_storage: hasConsentFor('functional') ? 'granted' : 'denied',
  personalization_storage: hasConsentFor('personalization') ? 'granted' : 'denied',
});
```

### GTM container configuration
- Every tag (GA4 config, Ads conversion, Meta CAPI, etc.) must have its **built-in Consent Settings** set to require the matching consent type — do **not** rely solely on a custom trigger; GTM's native consent check is what actually gates firing at the container level and is what GA4 DebugView/Tag Assistant validate against.
- Set **"Additional Consent Checks"** on each tag rather than one umbrella custom event — this gives you per-category control (e.g., GA4 fires on `analytics_storage=granted` independent of `ad_storage`).
- Use a **custom `dataLayer` event** (`consent_updated`) purely as a signal for non-GTM-native listeners (e.g., your own script loader) — GTM's own consent gating does not need this event to function.
- GA4 Consent Mode without explicit signals still allows **modeled conversions** — this is expected and compliant; do not attempt to "recover" lost data through workarounds.

---

## 4. Gating Third-Party Scripts, Pixels, and Embeds

### General pattern — consent-aware lazy loader

```typescript
class ConsentAwareScriptLoader {
  private loaded = new Set<string>();
  private pending: ScriptConfig[] = [];

  register(config: ScriptConfig, hasConsent: (c: ConsentCategory) => boolean) {
    if (hasConsent(config.category)) return this.load(config);
    this.pending.push(config);
  }

  onConsentUpdated(hasConsent: (c: ConsentCategory) => boolean) {
    this.pending = this.pending.filter(cfg => {
      if (!hasConsent(cfg.category)) return true;
      this.load(cfg);
      return false;
    });
  }

  private load(config: ScriptConfig) {
    if (this.loaded.has(config.id)) return;
    const el = document.createElement('script');
    el.src = config.src;
    el.async = true;
    el.onload = () => { this.loaded.add(config.id); config.onLoad?.(); };
    document.body.appendChild(el);
  }
}
```

### Per-integration rules
| Integration | Category | Gating pattern |
|---|---|---|
| Facebook Pixel | marketing | Never inline in `<head>`; inject only via loader above on `marketing=granted`. |
| LinkedIn Insight Tag | marketing | Same pattern; also fires a 1x1 pixel — verify via Network tab it's absent pre-consent. |
| Hotjar / Microsoft Clarity | analytics (or personalization if session-recording is used for UX personalization) | These record DOM/session content — treat as high-sensitivity; gate strictly and disclose explicitly in the banner copy ("session recording for product improvement"). |
| YouTube / Vimeo embeds | social (unless using YouTube's `youtube-nocookie.com` domain, which can often ship as functional/necessary since it sets no tracking cookie until played) | Render a **click-to-load placeholder** (thumbnail + "Load video" button that also offers "Manage Preferences") instead of the live iframe until consent/interaction. |
| Google Maps embed | functional | Same click-to-load placeholder pattern; static image + "Load map" avoids the third-party request entirely until needed. |
| Chat/support widgets (Intercom, Crisp, etc.) | functional | Do not auto-init on page load; init only post-consent or on explicit user click to open chat (click = implied functional consent for that one action only, does not replace stored consent for future visits). |
| Marketing automation / CRM tracking pixels | marketing | Same loader pattern; audit forms that embed CRM tracking snippets (e.g., HubSpot forms) since the form embed itself often ships a tracking script bundled in. |
| Embedded forms (typeform, etc.) | functional or marketing depending on whether the vendor sets cross-site cookies — check the vendor's own cookie disclosure. |

### Click-to-load embed pattern (covers YouTube/Maps/Vimeo/chat)
Render a lightweight placeholder (static thumbnail, no iframe, zero third-party requests) with a "Load content" CTA. On click, either (a) load the embed for this session only without persisting consent, or (b) open the Preference Center so the user can grant the category permanently. Listen for the `consent_updated` event so previously-blocked embeds auto-load the moment the relevant category is granted, without requiring the user to re-click every embed on the page.

---

## 5. UX & Accessibility

### Placement decision framework
- **Bottom banner (recommended default for this audience):** Lowest disruption to hero CTA visibility on a conversion-focused marketing page (demo booking, trial signup) — use this unless legal specifically requires a blocking modal.
- **Blocking modal:** Only use where you must guarantee zero page interaction before a decision (rare outside extremely conservative interpretations) — this measurably hurts first-impression conversion and should be avoided for a demo/trial funnel unless mandated.
- **Top banner:** Avoid — pushes above-the-fold hero content down, directly damaging LCP-critical content visibility and first impression for exactly the CTA you're optimizing for.
- **Floating widget (persistent "Cookie Settings" icon):** Always include regardless of banner style — this is the low-friction revoke/edit path required by both GDPR and DPDP.

### Non-negotiable UX rules
- **Equal prominence:** "Accept All" and "Reject All" must be the same size, same visual weight, same click distance. A visually dominant Accept + a text-link Reject is a dark pattern that regulators actively flag.
- **Three-button pattern:** Accept All / Reject All / Customize — do not force users into Customize just to reject.
- **No nagging:** Once a decision (accept or reject) is stored, never re-show the banner on navigation; only re-show on policy-version bump or explicit expiration (recommend 12-month expiration, re-consent prompt with clear "what changed" messaging).
- **Preference Center must load current state**, not defaults, and must save granularly per category with a single "Save Preferences" action plus visible confirmation.
- **Revocation must be as easy as granting** — persistent footer link or floating icon, one click to reopen the same Preference Center.

### Accessibility (WCAG 2.1 AA)
- Banner/modal: `role="dialog"` (or `"alertdialog"` for a blocking variant), `aria-modal="true"`, `aria-labelledby` pointing at the heading.
- **Focus management:** on mount, move focus into the banner/modal; on close, return focus to the element that had focus before it opened (or to a sensible default like the main heading).
- **Focus trap** inside the Preference Center modal — Tab/Shift+Tab must cycle within it, not escape to the page behind.
- Full **keyboard operability**: every toggle, Accept/Reject/Customize/Save must be reachable and operable via Tab + Enter/Space, with a visible focus ring.
- Screen reader test: announce category name + current state (on/off) + description when a toggle receives focus.

### Localization & consent-fatigue reduction
- Ship English + Tamil (aligned with existing brand localization) at minimum; keep copy short — one sentence of "why," one sentence of "what," never a paragraph in the banner itself (link out to the full Cookie Policy from `legal-pages-generator` for detail).
- Trust-building copy: name the categories in plain language ("cookies that help us show you relevant content" rather than "personalization_storage"), and avoid legalese in the banner even though the underlying policy document can be precise.
- Minimize fatigue: don't ask again once a clear choice is made; don't scatter multiple consent prompts across different tools (chat widget shouldn't have its own separate consent popup — route everything through one Preference Center).

---

## 6. Performance Engineering (Core Web Vitals)

- **CLS:** Reserve banner height via CSS (fixed min-height container or `position: fixed` with a known height) so its mount/unmount never shifts layout above it. Never render the banner via a library that measures itself post-mount and then shifts content.
- **LCP:** Keep the banner out of the LCP element's paint path — it should render after or alongside, never blocking, the hero content. A bottom-fixed banner naturally avoids this; a top banner does not.
- **INP:** Keep the consent-decision handlers (`Accept`, `Reject`, `Save`) cheap — the expensive work (writing to Supabase, initializing gated scripts) should happen asynchronously after the click response, not synchronously blocking the interaction.
- **Bundle size:** Prefer a custom, purpose-built consent component over a general-purpose CMP library if the library adds more than ~15–20kb gzipped to a page whose entire job is fast conversion — for a small bootstrapped team with straightforward category needs, custom is usually the right call (see Decision Framework, §11).
- **Hydration cost:** The Consent Provider's initial read (cookie/localStorage) must be synchronous and cheap; do not fetch consent state from Supabase on every page load for anonymous visitors — that network round-trip before rendering the banner is an avoidable LCP/INP cost. Reserve the Supabase round-trip for writes (audit log) and for syncing authenticated-user consent across devices, not for the initial anonymous read.
- **Lazy-load gated third-party scripts** with `strategy="lazyOnload"` or the custom loader in §4 — never `beforeInteractive` for anything non-essential, since that guarantees it competes with your critical rendering path regardless of consent status.

---

## 7. Supabase Integration

### Schema (append-only for auditability)

```sql
create table if not exists consent_records (
  id uuid primary key default gen_random_uuid(),
  consent_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  categories text[] not null,          -- granted categories at time of this record
  consent_version text not null,
  method text check (method in ('explicit','implied')),
  timestamp timestamptz not null default now(),
  user_agent text,
  ip_truncated text,                    -- store truncated/hashed IP, not full IP
  source text check (source in ('banner','preference_center','api')),
  created_at timestamptz default now()
);

create index on consent_records (user_id);
create index on consent_records (timestamp);

alter table consent_records enable row level security;

create policy "users read own consent history"
  on consent_records for select
  using (user_id = auth.uid());

create policy "service role inserts any record"
  on consent_records for insert
  with check (true);
```

- **Never update a row** to change a consent decision — insert a new row per decision. The full history *is* the audit trail; "current consent" is just the latest row per user/session.
- **Edge Function** (`consent-record`) as the single write path: validates payload shape, truncates/hashes IP before storage, and inserts. Client never writes directly to the table.
- **Anonymous visitors:** key by `session_id` (a random UUID set alongside the consent cookie), not by IP or fingerprint — do not build a cross-session anonymous identity purely for consent bookkeeping, that itself creates a new privacy surface.
- **Authenticated users:** on login, if a stored anonymous consent decision exists for the session, offer to carry it over to the user's account row rather than silently merging.
- Treat this table itself as **privacy-safe analytics** — you can derive opt-in rate by category over time from it (useful input to `product-analytics-expert`) without needing a separate tracking mechanism.

---

## 8. Security Considerations

- **CSP:** Add a strict Content-Security-Policy and use **nonces** on the inline consent-default script and on the GTM loader script (`next/script` supports `nonce` prop) rather than relying on `'unsafe-inline'`.
- **Cookie flags:** consent cookie itself — `Secure`, `SameSite=Lax`, **not** `HttpOnly` (client JS must read it to render the banner state), 12-month `max-age`.
- **XSS:** Never render consent-category descriptions or any user-controllable string via `dangerouslySetInnerHTML`; keep all banner/preference-center copy as static strings or props, not dynamic HTML.
- **Third-party cookie deprecation:** Design as if third-party cookies are already gone — prefer first-party consent storage and server-side tagging (GTM Server-Side container, or Supabase Edge Functions as a lightweight equivalent) over reliance on third-party cookie–based ad tracking, which is increasingly blocked by default in Safari/Firefox and progressively in Chrome.
- Audit that **no consent-gated script sets a cookie during its own load/parse phase** before your gating logic even runs — some third-party SDKs set cookies in top-level module code, not inside an init function; verify via Network/Application tab, not just by reading the gating code.

---

## 9. Troubleshooting Guide

| Symptom | Likely cause | Fix |
|---|---|---|
| GA4 still fires before consent | GTM tag lacks native Consent Settings; only gated by a custom trigger | Set the tag's built-in "Consent Settings" (Additional Consent Checks) to require `analytics_storage` |
| GTM triggers incorrectly / fire on wrong category | `consent update` call uses the wrong category mapping | Re-check the `hasConsentFor()` → Consent Mode key mapping (analytics_storage ≠ ad_storage) |
| Banner flashes on load for returning visitors | Consent read happens client-side only, after first paint | Read consent from the cookie in Middleware/blocking `<head>` script; only render banner if no decision found |
| Hydration mismatch on banner | Server renders one state, client renders another (e.g., SSR assumes no consent, client finds stored consent) | Read the consent cookie server-side too (Middleware/Server Component) so server and client agree before hydration |
| Duplicate banner rendered | Consent Provider mounted twice (e.g., once in root layout, once in a nested layout) | Ensure a single Provider instance at the true root; use context, never re-instantiate |
| Cookies set too early (before any interaction) | Third-party SDK sets a cookie in module-load code, not inside a gated init call | Move the `<script src>` injection itself behind the consent gate (loader pattern §4), don't just gate a JS function call |
| Consent lost after refresh | Only written to `sessionStorage` or an in-memory variable, not to `localStorage`/cookie | Persist to both localStorage and a first-party cookie on every decision |
| Preference Center doesn't reflect saved state | Local component state not resynced from global consent context after mount | Re-hydrate local toggle state from context on every modal open, not just once on first mount |
| Blocked tags in GTM Preview | Consent Mode default state script loads *after* GTM container snippet | Move the default-consent script above the GTM snippet in `<head>`, always |
| Race conditions between multiple gated scripts | Each script listens independently with no shared consent-ready signal | Centralize through one loader/dispatcher (§4) so all listeners key off the same `consent_updated` event |
| Confusing state in dev after clearing cache | Old consent cookie + new localStorage version mismatch | Version-check on read; if `version` doesn't match current schema, treat as "no decision" and re-show banner |

---

## 10. Testing & Validation Checklist

1. **Network tab:** hard refresh with cache disabled; confirm zero requests to `google-analytics.com`, `facebook.net`, `linkedin.com/px`, `hotjar.com`, `clarity.ms`, etc. before any interaction.
2. **Application → Cookies:** confirm no `_ga`, `_fbp`, `li_fat_id`, `_hjid` etc. exist pre-consent; confirm they appear only after granting the matching category, and disappear (or a "delete on reject" flow runs) after rejecting/revoking.
3. **GTM Preview mode:** step through and confirm each tag shows "Tag not fired — consent not granted" before the decision, and fires only after the matching category is granted.
4. **GA4 DebugView:** confirm zero events before consent; confirm `consent_state` reflects the update in real time after granting.
5. **Lighthouse:** run before/after adding the banner; confirm no CLS regression and no LCP regression attributable to the banner.
6. **Keyboard-only pass:** unplug the mouse; Tab through the whole banner and Preference Center; confirm visible focus at every stop, and that Reject/Accept/Save are reachable and operable via Enter/Space.
7. **Screen reader pass** (VoiceOver/NVDA/TalkBack): confirm the dialog role, label, and each toggle's name/state/description are announced correctly.
8. **Mobile pass** (iOS Safari + Android Chrome): confirm the banner doesn't overlap safe-area insets, the primary CTA, or get clipped by the native browser chrome.
9. **Private/incognito pass:** confirm no residual consent state leaks in and the banner behaves as first-visit.
10. **Regression pass:** after any change to categories or vendor list, re-run steps 1–4 for every gated integration, not just the one that changed — category renumbering is a common source of silent regressions.
11. **Automated test:** add a Playwright spec (pairs with `functional-test-planner`/`regression-test-planner`) that asserts zero third-party network requests pre-consent and correct requests post-consent, so this doesn't regress silently on future deploys.

---

## 11. Decision Frameworks

**Custom lightweight implementation vs. enterprise CMP (OneTrust/Cookiebot/etc.):**
- Choose **custom** when: category structure is simple (the 6 categories above cover it), Core Web Vitals matter more than automated legal-region detection, and there's no budget for a recurring CMP SaaS fee — this is the right default for a bootstrapped, India-first, single-market product.
- Choose an **enterprise CMP** when: operating across dozens of jurisdictions with materially different legal requirements, needing automated periodic cookie scanning across a large and changing vendor list, or needing IAB TCF compliance for programmatic ad exchanges — none of which apply to this product's current stage.

**Banner vs. modal:**
- Default to **bottom banner** for a conversion-focused marketing site (protects hero/CTA visibility and LCP).
- Escalate to a **blocking modal** only if legal counsel specifically requires zero-interaction-before-decision for your jurisdiction mix — treat this as an exception, not a default.

**Session-only vs. persistent category grants:**
- Persist all explicit decisions for 12 months by default; only use session-only behavior for the "quick unlock this one embed" click-to-load pattern (§4), which should never substitute for the persisted category decision.

---

## 12. Anti-Patterns (never do these)

- **Scroll/navigate-implies-consent** — not valid consent under either regime; never wire "user scrolled" or "user visited another page" to an implicit accept.
- **Pre-ticked toggles** — every non-necessary category must default OFF, full stop.
- **Nagging** — re-showing the banner on every page load because the decision wasn't actually persisted is a bug, not an aggressive-but-compliant strategy.
- **Unequal prominence** — a bold "Accept All" button next to a greyed-out or tiny-text "Reject" is a dark pattern, and is exactly what regulators cite in enforcement actions.
- **Burying reject behind Customize** — forcing extra clicks to reject vs. one click to accept fails the "as easy to withdraw as to give" test.
- **Consent theatre** — showing a banner that toggles UI state but never actually gates the underlying script loading (the script was already injected server-side or in a layout regardless of the toggle).
- **Fingerprinting to "remember" rejected users without cookies** — this defeats the purpose of the rejection and is itself a compliance violation.
- **One giant "Marketing" bucket** that silently includes analytics — category boundaries must match what you actually disclose in the Cookie Policy, not be reorganized for engineering convenience without updating the policy.

---

## 13. Cross-Referenced Skills

Use this skill together with:
- **`legal-pages-generator`** — generates the actual Privacy Policy / Cookie Policy the banner links to; the category names, vendor list, and retention periods in that document must exactly match what this skill implements. Update both together whenever a vendor or category changes.
- **`analytics-tag-management-architect`** — owns the broader GTM workspace design, server-side tagging container strategy, and GA4 data-stream/event architecture; this skill supplies the consent gate that architecture must respect.
- **`regulatory-compliance-checker`** — run after implementation to audit the finished banner/flow against the specific legal requirements (DPDP grievance-officer disclosure, GDPR Article 30 records, etc.) this skill deliberately does not adjudicate as legal advice.

---

## 14. Maintenance, Monitoring & Governance

- **Monitoring:** alert on error spikes in the `consent-record` Edge Function; track opt-in rate by category over time from `consent_records` — a sudden drop usually signals a UX regression or a broken banner, not a genuine shift in user sentiment.
- **Documentation:** maintain a living "Cookie/Vendor Matrix" (script name → category → purpose → data recipient → retention) as the single source vendors must be checked against before any new third-party script is added to the site.
- **Governance:** whenever a new marketing/analytics tool is added (new pixel, new embed, new SDK), it must (1) be assigned a category and added to the Vendor Matrix, (2) be wired through the consent-aware loader — never added as a raw always-on script tag, and (3) trigger an update to the Cookie Policy via `legal-pages-generator`.
- **Versioning:** bump `consent_version` and re-prompt users only on a genuine category or purpose change — not on every minor copy edit — to avoid unnecessary consent fatigue.
- Schedule a **quarterly review** of the vendor list and `consent_records` opt-in trends alongside routine security/dependency audits already in place for the platform.
