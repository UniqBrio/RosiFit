---
name: email-capture-nurture-bridge-designer
description: Designs UniqBrio's on-site email/WhatsApp capture layer and the value-first nurture bridge that carries visitors from anonymous interest through DPDP-aware consent, lead-magnet delivery, and a welcome/nurture sequence into a demo-ready, CRM-qualified lead — owning only on-site capture and immediate nurture (not paid ads or outbound), and never claiming anything beyond UniqBrio's current reality as an early-stage platform with two real customers.
when_to_use: Use whenever designing, auditing, or implementing capture placements, forms, consent microcopy, lead magnets, welcome emails/WhatsApp sequences, channel routing, or lead-qualification rules on the UniqBrio marketing website for Indian arts and sports academy owners.
---

# Email Capture & Nurture Bridge Designer

Owns everything between **anonymous visitor → interested visitor → captured lead → nurtured lead → demo-ready lead** on the UniqBrio marketing website. Does **not** own paid ads or outbound outreach — only the on-site capture layer and the immediate (first ~14-day) nurture bridge.

## Context

- Company: UniqBrio — https://www.uniqbrio.com — academy management platform
- Audience: arts, sports, coaching, dance, music, martial arts, football, cricket academies; India-first, especially Tier 2/3 cities; decision maker is the academy owner, roughly age 30–50
- Stack: Next.js App Router, React, React Native Expo PWA, Supabase, PostgreSQL, Edge Functions, Vercel
- Stage: early, bootstrapped, two real customers

## Core Philosophy & App Reality Rule

Visitors exist across many readiness levels. Most are interested but not ready to book a demo — they should never leave the site without entering a value-first, permission-based nurture journey. Capture exists to help visitors solve a real problem *first*; the demo ask comes later, earned through delivered value.

Optimize for: trust, permission, genuine value exchange, progressive qualification, low friction, long-term conversion, and honesty over short-term capture volume.

**`app_reality.md` rule (binding on every surface — forms, thank-you pages, emails, WhatsApp, landing pages, nurture content):**
- Only two real customers exist today — no fake testimonials, customer counts, usage metrics, urgency, awards, trust badges, or reviews.
- If something cannot be honestly claimed today, it does not appear anywhere in this pipeline.
- Where source material suggests a testimonial/case-study touch, replace it with an honest framing (e.g., "here's how academies typically solve this" or "what changes when you move off a spreadsheet") rather than fabricated social proof.

## 1. Visitor Intent Segmentation

| Stage | Signals | What They Should See | Capture Approach |
|---|---|---|---|
| **Curiosity-stage** | First visit, homepage/blog skim, short session, high bounce | Light-touch, problem-first value; no demo ask | Low-friction asset, email-only, or no gate at all |
| **Research-stage** | Multiple pages, feature-page depth, blog reading | Problem-solving guides/templates matched to the page topic | Inline or resource-page capture, 1–2 fields |
| **Comparison-stage** | Pricing views, competitor comparisons, feature matrix, repeat visits | Evaluation tools (ROI calculators, comparison checklists) | Contextual, slightly higher-intent forms; both channels offered |
| **Demo-ready** | Repeated pricing visits, deep feature engagement, prior demo-click abandonment | Demo CTA primary and frictionless; soft capture secondary only | Minimal fields, direct path to booking — do not gate the demo behind a form |
| **Returning visitors** | Known cookie/prior capture, repeat sessions | Personalized next step ("pick up where you left off"), not a repeat of the same popup | Prefill known data; progressive profiling; preference center |

Capture intensity should rise with readiness — curiosity-stage visitors get soft, optional value offers; demo-ready visitors get a clear, unblocked path to booking with no unnecessary gate in front of it.

## 2. Lead Magnet Strategy

**Why they exist:** to create a fair value exchange that starts a relationship, not to bait a sales conversation.

**Principles**
- Problem-first framing in the title ("Stop losing track of student fees," not "Free guide").
- Value-first: the asset must be genuinely usable without ever talking to sales.
- Match asset to intent stage (see table above).
- Do **not** gate core trust-building content: basic how-tos, feature explanations, pricing page, about/company info.
- Gate only high-effort, high-utility operational resources.

**Asset examples matched to academy-owner pain points**
- *Calculators:* Academy ROI / admin-time-savings calculator, fee-collection savings estimator
- *Checklists:* Yearly academy operations checklist, software-migration checklist, DPDP-ready consent checklist, parent-onboarding checklist
- *Templates:* Class-scheduling template, new-batch launch playbook, staff roster/payroll planning sheet, WhatsApp broadcast policy template
- *Guides/playbooks:* "5 mistakes academy owners make when choosing software," student-retention guide, SOP for enrolling new students

**Bridge to demo without manipulation:** the free asset should genuinely solve the immediate problem. The nurture sequence's job is to show what happens *after* the spreadsheet/checklist approach starts breaking at scale — framed honestly ("many academies use this sheet until they outgrow it; here's what changes inside the platform"), never "you need our software to do this" when the free asset already does it.

## 3. Capture Placement Map

| Placement | Objective | Recommended CTA | Visitor Mindset | Intrusiveness | When NOT to Show |
|---|---|---|---|---|---|
| Hero (soft) | Primary value entry | "Get the free fee tracker" | First impression | Low | Demo-ready traffic, or if a hard-demo CTA test is running |
| Blog posts | Contextual capture | "Download the checklist academies use" | Research | Low–medium | Thin/short content pages |
| Comparison pages | Capture comparison shoppers | "Get the side-by-side implementation checklist" | High intent | Medium | Never suppress — this is a strong-fit placement |
| Pricing page | Soft alternative to demo | "Not ready yet? Get the ROI planner first" | Evaluation | Medium | Must stay secondary to the primary demo CTA |
| Feature pages | Deepen engagement | "Get the feature implementation guide" | Research | Low | Thin feature pages |
| Footer | Always-available, low-pressure | "Academy resources" / newsletter | Any | Very low | Never remove |
| Sticky bar (mobile) | Persistent soft offer | Short value line + "Get it" | Scrolling | Medium | After capture, on thank-you page, on demo pages |
| Inline CTAs | Contextual, in-content | Matches surrounding content | Engaged reader | Low | Above the fold on short pages |
| Exit intent (desktop only) | Last-chance capture | High-value asset offer | Leaving | High | Mobile (never), after any prior capture this session, on demo-ready paths |
| Timed prompts | Progressive reveal | Value-based ask after engagement | Engaged | Medium | First ~45–60s of session; low-scroll pages |
| Scroll-depth triggers | Reward deep engagement | "You're deep in this — go further with [asset]" | Highly engaged | Low | Shallow pages |
| Resource pages | Centralized hub | Clear per-asset buttons | Research-oriented | Low | N/A |
| Content gates | Standard "unlock the rest" | "Get the full [asset]" | Interested enough to click | Medium | Never on core product/feature content |
| Thank-you pages | Confirm + set next step | "While you wait, set your communication preference" | Just converted | Low | Never aggressive or upsell-heavy |

**Intrusiveness rules**
- Maximum one interruptive element (popup/exit-intent) per session.
- No exit-intent or aggressive popups on mobile — use sticky bars or inline CTAs instead.
- No stacked/overlapping popups.
- Always provide a clear, visible dismiss/close.
- Progressive disclosure: softest offer first; a stronger offer only after engagement signals justify it.
- Prefer inline and contextual placements over overlays wherever the objective allows it.

## 4. Form UX

**Field strategy**
- Absolute minimum on first capture: email **or** mobile (visitor's choice where possible) — 2–3 fields max.
- Recommended progressive order:
  1. Email or WhatsApp number (primary)
  2. Academy name (high value, low friction)
  3. Role (owner / manager / teacher) — optional or progressive
  4. City/state — progressive only, later touch
- Never ask for password, company size, or "how did you hear about us" on the first form.
- **Progressive profiling:** ask for more only after value has been delivered and engagement is proven (e.g., second download, or after a reply).

**India-first mobile**
- `inputmode="email"` / `type="email"` and `inputmode="tel"` / `type="tel"` on the right fields.
- Support both `+91` and 10-digit local formats; normalize on blur.
- Touch targets ≥44–48px; single-column layouts on mobile; labels above fields, not placeholder-only.
- `autocomplete="email"`, `autocomplete="tel"`, `autocomplete="organization"` for autofill.
- Design for slow/3G connections: optimistic UI, immediate loading feedback, no heavy blocking assets.

**Validation, errors, states**
- Real-time inline validation; explicit, understandable error copy ("Please enter a valid email address").
- Loading state: disable submit + spinner while submitting.
- Success state: immediate, clear confirmation → route to thank-you page.
- Errors announced to assistive tech (`aria-live` / `role="alert"`), not just visually.

## 5. WhatsApp Capture

**Offer WhatsApp when:** visitor is on mobile; the asset is operational (checklist/tracker) that benefits from quick follow-up; the visitor has already shown higher intent; the visitor is from a Tier 2/3 city (behavioral signal of channel preference).

**Prefer email when:** content is long-form/reference material; visitor is on desktop; preference is unknown; communication is legal/compliance-heavy.

**Collect both when possible, require neither.** Consent for WhatsApp is separate and explicit from email consent — never bundled into one checkbox. State expected frequency and the opt-out mechanism (reply STOP) at the point of consent.

Why preference varies: WhatsApp feels immediate and personal with higher open rates but a higher expectation of brevity and relevance; email suits longer-form resources and is easier to manage via a preference center with lower perceived intrusion for some owners.

## 6. DPDP-Aware Consent

**Required elements**
- Purpose stated in plain language before the submit button — what is collected, why, how it's used, who (if anyone) it's shared with.
- Separate, un-pre-ticked toggle for marketing/nurture consent, distinct from any WhatsApp-specific consent.
- Transactional messages (asset delivery, account/download confirmations) don't require marketing consent, but must still be transparent about the sender.
- Withdrawal must be as easy as opting in: unsubscribe link in every email, "reply STOP" in every WhatsApp message, and a preference-management link in both.
- No pre-ticked boxes, no consent buried in dense paragraph text.

**Compliant microcopy examples**
- "I agree to receive helpful academy management tips and occasional product updates. I can unsubscribe anytime."
- "Send me the tracker on WhatsApp. I understand I can reply STOP to opt out."
- "We'll only use your details to deliver this resource and related helpful content. See our privacy notice."
- "Message frequency: a few messages over the next two weeks, then only when we have something useful to share."

**Never hide:** the purpose of data collection, the right to withdraw, or the expected frequency of contact.

## 7. Capture Microcopy Library

**Headlines (problem-first, no hype)**
- "Stop losing track of student fees"
- "Plan your next batch without spreadsheet chaos"
- "Know exactly who's attending — and who isn't"
- "One checklist to onboard parents without endless WhatsApp threads"

**Supporting copy**
- "Free to use. No credit card. No demo required."
- "Built for academy owners in Tier 2 and Tier 3 cities."
- "Works offline in Google Sheets or Excel."

**CTA buttons**
- "Get the free tracker" / "Send me the checklist" / "Download the planner" / "Get it on WhatsApp" / "Email it to me"

**Reassurance / privacy**
- "No spam. Unsubscribe in one click."
- "We respect your time and your data."
- "Your data stays with UniqBrio and is never sold or shared with third parties."

**Avoid entirely:** "Limited time," "Join [N] academies," "Don't miss out," "Act now," or any other manufactured urgency or unverifiable social proof.

## 8. Welcome Experience

**Immediate layer (0–60 seconds)**
1. On-page confirmation or success-state modal.
2. Thank-you page: delivery confirmation, expectation setting ("You'll also get a few short, practical emails over the next two weeks"), optional preference center (channel + frequency), and — only if genuinely relevant — one soft secondary offer.

**3–5 touch nurture sequence** — stays educational throughout; never uses scarcity or pressure language.

| Touch | Timing | Objective | Psychological Goal | CTA |
|---|---|---|---|---|
| 1 — Delivery + Orientation | Immediate (<5 min) | Deliver the asset, set expectations | Reciprocity, clarity | "Use the asset" / reply with questions |
| 2 — Quick Win | Day 2–3 | Help them get one concrete result from the asset | Progress, competence | Reply with your result or blocker |
| 3 — Deeper Operational Insight | Day 5–7 | Address a related pain (attendance, parent comms, staffing) | Authority through usefulness | Download related resource / reply |
| 4 — Implementation Reality | Day 9–12 | Honestly bridge from free tool to platform capability | Future pacing | Soft "See a 15-minute walkthrough" — only if engagement is high |
| 5 — Preference + Open Door | Day 14 | Respect attention, keep the door open | Autonomy, long-term permission | Update preferences / book when ready |

Example (Touch 1, email): *"Hi [First Name], here's your [Asset Name]: [link]. It's built to help with [specific problem]. Over the next two weeks we'll send a few practical tips — nothing more. Reply anytime with questions."* WhatsApp variant: shorter, same content, ends with "Reply STOP anytime to opt out."

Every message includes an unsubscribe/STOP path and a preference-management link.

## 9. Email vs. WhatsApp Routing Logic

```
IF visitor explicitly chose WhatsApp only        → WhatsApp sequence
ELSE IF visitor explicitly chose email only       → Email sequence
ELSE IF both provided AND mobile-heavy behavior   → Primary WhatsApp, email as backup
ELSE IF both provided AND desktop / long-form use → Primary email, WhatsApp for time-sensitive items only
ELSE                                              → Email default; offer a WhatsApp upgrade in Touch 1
```

Honor explicit stated preference above all behavioral signals. Re-confirm channel preference after ~30 days of inactivity.

**Tradeoffs:** WhatsApp — higher open/reply rates, more personal, expects brevity and relevance, harder to scale respectfully. Email — better for longer resources, easier preference management, more asynchronous, generally lower perceived intrusion.

## 10. Lead Qualification

**Behavioral signals:** multiple visits, pricing-page views/repeat views, feature-page depth, resource downloads, email opens/clicks, WhatsApp replies (strong signal), repeat sessions within 7 days, high-intent actions (calculator completion, checklist re-visit).

**Example scoring model** (starting point, tune with real data):

| Signal | Points |
|---|---|
| Site visit | +1 |
| Feature-page view | +2 |
| Pricing-page view | +3 |
| Email open | +1 |
| Email click | +3 |
| Resource download | +5 |
| WhatsApp reply | +5 |
| Demo-page visit | +10 |

- **Soft lead:** captured + asset delivered
- **Warm:** + engagement on Touch 1–2 or a return visit
- **Qualified:** warm + pricing/comparison behavior or an explicit reply about the product
- **Demo-ready:** qualified + a positive reply or repeated high-intent actions (e.g., score crosses an agreed threshold, such as ~20 points)

**Invite a demo** after demonstrated value (asset used or replied to) and behavioral proof of evaluation — never on Touch 1. Prefer "Would a 15-minute walkthrough of how academies replace this sheet be useful?" over "Book a demo now."

**Do not invite** when there's no engagement after two touches, an explicit "just looking" signal, or only curiosity-stage behavior.

## 11. Demo Handoff

1. Update the lead record (Supabase) with stage = "demo-ready" and the triggering touch/asset.
2. Send a personalized invitation via the lead's preferred channel, referencing the specific asset or pain point discussed.
3. Link directly to the existing demo-booking flow.
4. If no booking within 48 hours, one polite follow-up, then return the lead to the standard long-term nurture cadence rather than repeated demo pressure.
5. Surface context to the founder/sales side: which magnet, which touches engaged, any replies — so the demo conversation starts from real context, not a cold intro.

Automation logic lives in Supabase Edge Functions; the tone stays human throughout.

## 12. Measurement (KPIs)

Visitor-to-lead conversion · capture rate (by placement) · lead-magnet downloads · form start→completion rate · email open/click rates by touch · WhatsApp delivery/read/reply rates · unsubscribe/STOP rate (target <2%) · time-to-first-demo-invitation · demo-book rate from nurtured leads · qualified-lead rate.

Evaluate the full funnel together, not any single metric in isolation — a lower capture rate paired with higher demo conversion and lower unsubscribe is a better outcome than high-volume, low-quality capture.

## 13. Analytics Events

| Event | Why it matters |
|---|---|
| `form_started` | Detects where intent begins |
| `form_completed` | Primary conversion metric |
| `capture_abandoned` | Reveals form friction |
| `lead_magnet_downloaded` | Measures per-asset performance |
| `welcome_email_opened` / `_clicked` | Nurture engagement quality |
| `whatsapp_opt_in` | Channel-preference signal |
| `whatsapp_message_opened` / `_replied` | WhatsApp engagement depth |
| `resource_consumed` | Content engagement beyond the initial asset |
| `demo_invited` | Marks the nurture→sales handoff point |
| `demo_booked` | Ultimate funnel goal |
| `preference_updated` / `unsubscribed` | Consent-health tracking |

Feed these into product analytics and lead-scoring/CRM stage movement together, not as isolated dashboards.

## 14. Experimentation Roadmap

Priority order: headline (problem- vs. benefit-framed) → primary CTA label → number of fields (1 vs. 2) → email-only vs. WhatsApp-first vs. visitor choice → placement (inline vs. sticky vs. exit-intent) → trust/reassurance microcopy → lead-magnet type for the same traffic source → timing of the first demo invitation → stated frequency expectations.

Run one primary variable at a time; guard every test against unsubscribe/complaint-rate regressions, not just conversion lift.

## 15. Accessibility

Full keyboard operability · visible focus states, correctly managed in modals · semantic `<label>` on every field · errors announced via `aria-live`/`role="alert"` · contrast ≥4.5:1 · touch targets ≥44px · respects `prefers-reduced-motion` · no interaction that depends on hover alone.

## 16. Mobile-First India Guidance

Design for 320–360px width baselines · tolerate 3G/flaky networks with optimistic UI and immediate loading feedback · one-handed, thumb-friendly control placement · Indian mobile number formats (+91 and 10-digit local) with on-blur normalization · keep OTP flows (if used) short and low-friction · avoid heavy video/imagery on capture surfaces.

## 17. Anti-Patterns

Forcing a demo as the only CTA · more than 2–3 fields on first capture · fake scarcity/urgency · fabricated testimonials, counts, or trust badges · pre-ticked consent boxes · hidden or hard-to-find unsubscribe · multiple/stacked popups · exit-intent on mobile · bait-and-switch lead magnets (asset doesn't match the promise) · misleading outcome promises · collecting data with no immediate use · overriding an explicit stated channel preference.

## 18. Cross-Skill Collaboration

| Skill | Boundary | Coordination |
|---|---|---|
| `lead-magnet-asset-builder` | Builds the actual asset file/calculator | This skill defines the offer, positioning, and delivery promise; the builder produces the artifact |
| `whatsapp-integration-expert` | Technical sending, templates, webhooks | This skill defines consent language, sequence content, and routing rules |
| `dm-outreach-lead-tracker` | Outbound/DM sequences, CRM pipeline | Leads stay in this nurture bridge until demo-ready; only then may they hand off to outbound if needed |
| `objection-handling-content-writer` | Long-form objection content | Nurture emails can link out to objection pages; never duplicate full arguments inline |
| `cookie-consent-privacy-banner-specialist` | Site-wide cookie/privacy banner | Capture-form consent language must stay consistent with, and never contradict, the site banner and preference center |

This skill owns the on-site capture surface and the first ~14-day bridge only. Long-term dormant-lead nurture and post-demo flows are out of scope.

## 19. Deliverables (produced when this skill runs)

Capture placement strategy · form field specification + progressive-profiling plan · full consent microcopy set (email + WhatsApp) · CTA/headline library · welcome + nurture architecture with sample copy · routing decision tree · lead-qualification rules/scoring heuristic · analytics event list · experimentation roadmap (first 3 tests) · implementation checklist (Next.js/Supabase/Edge Functions notes) · QA checklist · developer handoff notes.

## 20. Implementation Checklist

1. Design capture UX: forms, buttons, copy, per the placement map.
2. Implement DPDP-compliant consent (explicit, un-pre-ticked, purpose-stated).
3. Build the welcome experience: thank-you page + immediate confirmation.
4. Build the nurture sequence: email + WhatsApp templates and scheduling.
5. Implement routing logic (channel decision tree).
6. Implement lead scoring and qualification thresholds.
7. Implement demo-handoff triggers + CRM/lead-record updates.
8. Instrument all analytics events.
9. QA across devices, browsers, and accessibility.
10. Launch, monitor KPIs, and queue the first experiment.

## 21. QA Checklist

- [ ] Consent flows are explicit, un-pre-ticked, and purpose-stated
- [ ] Forms work correctly on mobile (India-first: number formats, keyboards, autofill)
- [ ] Routing sends to Email, WhatsApp, or both per stated preference
- [ ] Asset delivery fires correctly on successful capture
- [ ] Full welcome + nurture sequence sends in the correct order and timing
- [ ] Demo-handoff triggers and CRM/lead-record updates fire correctly
- [ ] Unsubscribe/STOP works on every channel and updates preferences immediately
- [ ] Accessibility: keyboard nav, screen reader labels, contrast, touch targets
- [ ] No copy anywhere violates `app_reality.md` (no fabricated proof, counts, or urgency)

## 22. Developer Handoff Notes

- **Data model:** lead record with channel preference, consent state (marketing/WhatsApp, each separately timestamped), lead score, nurture stage, source asset/touch.
- **Routing:** implement the decision tree in section 9 as a pure function callable from the Edge Function that processes new captures.
- **Scheduling:** nurture touches driven by a scheduled Edge Function job keyed off capture timestamp + current stage.
- **Analytics:** emit the section 13 event set from both client (form/UX events) and server (delivery/CRM events) sides to avoid double-counting.
- **Consent storage:** store marketing and WhatsApp consent as separate boolean+timestamp fields, never a single combined flag, to satisfy DPDP granularity requirements.
