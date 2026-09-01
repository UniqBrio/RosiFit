---
name: exit-intent-recovery-designer
description: Designs ethical, trust-preserving exit-intent popups, abandoned-form recovery flows, and multi-channel (on-page, email, WhatsApp) re-engagement sequences that recover visitors leaving signup, pricing, demo, or trial pages on B2B SaaS marketing websites without resorting to manipulative or dark-pattern UX.
when_to_use: Use this skill whenever designing, auditing, or optimizing exit-intent popups, form-abandonment recovery flows, lead re-engagement sequences, recovery copy, trigger logic, experimentation plans, or analytics for a SaaS marketing website's pre-login pages (homepage, pricing, features, signup, trial, demo, contact).
---

# Exit Intent Recovery Designer

## Purpose

Design exit-intent popups, abandoned-form recovery flows, and visitor re-engagement experiences that recover potential customers who are leaving signup, demo-request, pricing, or trial pages without converting — while preserving user trust, maintaining a premium experience, and avoiding manipulative UX. The objective is never to stop every exit; it is to recover **qualified hesitation**, not to trap **genuine rejection**.

**Primary implementation context:** React Native Expo PWA · Next.js · Supabase · PostgreSQL · Edge Functions · Vercel.

**Business context:** India-first B2B SaaS platform for arts and sports academy management, serving owners of sports academies, dance academies, music schools, art institutes, coaching academies, and training centers, on the **public marketing website** (pre-login).

**Primary goals:** increase signups, free trial registrations, demo bookings, and paid subscriptions — without harming long-term brand trust.

---

## 1. Exit Intent Philosophy

### Why Visitors Abandon

|
Reason
|
Description
|
Example
|
|
---
|
---
|
---
|
|
Uncertainty
|
Unclear fit, value, or pricing
|
"Will this really work for my dance academy?"
|
|
Commitment anxiety
|
Perceived cost, time, or migration effort
|
"I don't have time to move my student data right now."
|
|
Distraction
|
Interrupted mid-decision
|
Phone call, notification, competing tab
|
|
Task completion
|
Already got what they came for
|
Found the pricing number, leaving satisfied
|
|
Comparison shopping
|
Evaluating multiple vendors in parallel
|
Repeated tab switching between competitors
|
|
Rejection
|
Concluded it's genuinely not a fit
|
Wrong audience size, wrong price band
|

### Hesitation vs. Rejection

Most exits are **hesitation**, not rejection. Treat exit as a moment of consideration, not a verdict.

- **Hesitation** — the visitor wants the outcome but lacks confidence, information, or a low-friction next step. *Recoverable.* Respond with clarity, proof, or a smaller commitment.
- **Rejection** — the visitor has decided this isn't for them (wrong size, wrong budget, wrong need). *Rarely recoverable in the moment.* Let them go gracefully; forcing recovery here creates negative brand association and trains people to distrust your popups.

### Core Principles

Optimize for: **clarity, reassurance, transparency, confidence, assistance, simplicity.**
Do not optimize solely for: popup CTR, email capture volume, or discount redemption — these are vanity signals if recovered users churn or resent the brand. Long-term trust always outweighs a short-term conversion tick.

### Good Recovery vs. Aggressive Interruption

A useful mental model: good recovery acts like a **helpful concierge** ("Before you go — here's a quick checklist to see if we're the right fit"). Aggressive interruption acts like a **desperate salesperson** ("WAIT! DON'T LEAVE! 90% OFF RIGHT NOW!") — and desperation signals low quality.

|
Good Recovery
|
Aggressive Interruption
|
|
---
|
---
|
|
"Need help comparing plans?"
|
"Wait! Don't leave!"
|
|
Shown once per session
|
Shown on every page
|
|
Close button always visible
|
Close button hidden or delayed
|
|
Offers genuinely useful content
|
Generic, unearned discount
|
|
Respects the user's choice to leave
|
Blocks or guilts the exit
|
|
Assists a decision already in progress
|
Pressures a decision not yet made
|

**The governing question:** "What prevented this visitor from continuing?" — not "How do we stop this visitor from leaving?"

---

## 2. Detecting Exit Intent

Never trigger on a single weak signal — combine signals into a confidence score before firing.

### Desktop Signals

|
Signal
|
Implementation Note
|
Confidence
|
|
---
|
---
|
---
|
|
Cursor leaves viewport (top edge)
|
Track
`mouseleave`
/
`mouseout`
toward the top ~50px, on
`window`
/
`document`
|
★★★★★
|
|
Cursor moves toward browser chrome (close/back/tab bar)
|
Track trajectory and velocity toward window edges
|
★★★★☆
|
|
Rapid upward cursor acceleration
|
Supporting signal only
|
★★★☆☆
|
|
Prolonged inactivity
|
No mouse/keyboard for 30–60s
|
★★★☆☆
|
|
Repeated tab switching
|
`visibilitychange`
fired multiple times — suggests comparison shopping
|
★★★☆☆
|
|
Browser close signal (
`beforeunload`
)
|
Extremely limited by modern browsers; use only as a weak secondary signal, never to block navigation
|
★★☆☆☆
|

### Mobile Signals

No cursor exists on mobile — combine several weaker signals:

|
Signal
|
Implementation Note
|
Confidence
|
|
---
|
---
|
---
|
|
Rapid upward scrolling
|
Often precedes navigating away or to the top nav
|
★★★☆☆
|
|
Back-button / gesture intent
|
`popstate`
interception inside PWA
|
★★☆☆☆ (unreliable)
|
|
Tab/app switching
|
`visibilitychange`
|
★★★★☆
|
|
Prolonged inactivity
|
45–120s with no touch/scroll
|
★★★☆☆
|
|
Keyboard dismissal mid-form
|
User closes the keyboard without submitting
|
★★★☆☆
|
|
Navigation-away intent
|
Fired just before a route transition
|
★★★☆☆
|

### Combining Signals (Confidence Scoring Example)

Don't fire on one signal alone. Example composite rule:

> Rapid upward scroll **+** on Pricing page **+** 80% scroll depth reached **+** returning visitor → **high confidence**, safe to trigger.
> Single tab switch on Homepage with 10s time-on-page → **low confidence**, suppress.

### Limitations

- Exit-intent detection is inherently probabilistic; expect false positives — always allow instant, easy dismissal.
- Browser privacy and performance constraints limit some signals (e.g., `beforeunload` cannot reliably block or delay navigation).
- Mobile detection is categorically less reliable than desktop; favor shorter delays and inline/anchored recovery over full-screen interruption on mobile.
- Never use detection logic to trap or delay a user's actual exit — the goal is a helpful offer, not a blockade.

---

## 3. Trigger Timing

### Timing Types

|
Type
|
Description
|
Best for
|
|
---
|
---
|
---
|
|
Immediate
|
Fires on first qualifying signal
|
Abandoned forms, trial/demo/signup pages
|
|
Delayed
|
Waits 20–60s (desktop) or a few seconds (mobile) before allowing a trigger
|
Educational/content pages
|
|
Contextual
|
Tied to page content viewed (pricing tier, feature, FAQ)
|
Feature and pricing pages
|
|
Behavioral
|
Tied to actions: viewed pricing twice, compared plans, watched a demo video
|
High-quality, well-qualified triggers
|
|
Intent-driven
|
Cursor/scroll exit while a form or comparison is mid-flow
|
Highest-priority trigger — combine with page context
|
|
Page-specific
|
Unique timing rules per page type
|
All pages (see table below)
|

### Page-Specific Trigger Guidance

|
Page
|
Priority
|
Suggested Timing
|
Minimum Engagement
|
|
---
|
---
|
---
|
---
|
|
Homepage
|
Low/rare
|
Delayed, 20–30s
|
≥20% scroll
|
|
Pricing
|
High
|
Immediate on exit signal
|
≥10% scroll or ≥15s dwell
|
|
Features
|
Medium
|
Delayed, 15–20s
|
≥15% scroll
|
|
Signup
|
Very high
|
Immediate
|
Any partial field entry
|
|
Trial
|
Very high
|
Immediate
|
Account created but not activated
|
|
Demo
|
Very high
|
Immediate
|
Form started, not submitted
|
|
Contact
|
Medium
|
Short delay, 5–10s
|
Field focus without submit
|
|
Blog
|
Low
|
Long delay, 30–60s
|
≥30% scroll
|
|
Comparison pages
|
High
|
Contextual, on exit after viewing 2+ competitors
|
≥20% scroll
|

### Pages Where Exit Popups Should Never Appear

- Checkout / payment / billing pages
- Post-conversion "thank you" / confirmation pages
- Authenticated dashboard or logged-in app areas
- Login / password-reset flows
- Customer support / help-center pages
- Privacy policy, terms of service, legal, cookie policy, accessibility statement
- Error pages
- Careers pages

---

## 4. Frequency Capping

Popup fatigue destroys both conversion and trust — cap aggressively by default and loosen only with evidence.

|
Rule
|
Default
|
Notes
|
|
---
|
---
|
---
|
|
Session limit
|
1 popup per session
|
A closed and reopened browser counts as a new session
|
|
Daily limit
|
2 popups per visitor per day
|
Across all pages/channels combined
|
|
Weekly limit
|
3–4 popups per visitor per week
|
Resets weekly
|
|
Suppression after conversion
|
Permanent for that journey (signup, demo, trial)
|
Never show recovery for an already-completed goal
|
|
Suppression after dismissal
|
24–72h cooldown (7 days if dismissed 3+ times)
|
Escalate the suppression window with repeated "no"
|
|
Cooldown between any two popups
|
15–30 minutes minimum
|
Prevents back-to-back interruptions
|
|
Remembered preferences
|
Persist via cookie/localStorage, and Supabase profile for returning/authenticated-adjacent visitors
|
Honor an explicit "don't show this again"
|

**Suppression evaluation order (conceptual):** converted? → suppress. Dismissed within cooldown? → suppress. 3+ dismissals in 7 days? → suppress for 7 days. Daily/weekly/session caps exceeded? → suppress. Otherwise → eligible to show.

---

## 5. Recovery Offer Selection

Offer **assistance before incentives**. Discounts are a last resort, not a first move.

### Offer Catalog — When Each Is Appropriate

|
Offer
|
Best Used When
|
|
---
|
---
|
|
No incentive / reminder
|
High-intent visitor, simple nudge is enough
|
|
Educational content / FAQ
|
Early-funnel, unclear value or objection
|
|
Case study / success story
|
Mid-funnel, trust not yet established
|
|
Video / product walkthrough
|
Feature confusion, "how does this work" hesitation
|
|
ROI calculator
|
Pricing-page hesitation driven by unclear value-for-money
|
|
Implementation / migration guide
|
Fear of setup complexity or data migration effort
|
|
Free consultation / demo
|
Warm lead not ready to self-serve
|
|
Live chat
|
Form abandonment mid-flow, needs a quick human answer
|
|
Email follow-up
|
Low urgency, wants to decide later
|
|
Template / toolkit / download
|
Blog/content readers, low-intent but engaged
|
|
Community
|
Peer-validation-seeking visitors (academy owner forums)
|
|
Comparison guide / decision checklist
|
Visitor actively comparing platforms
|
|
Extended trial / bonus onboarding
|
Genuine risk-reduction need, not price objection
|
|
Discount
|
Last resort — only when price is the
*
actual
*
, confirmed objection
|

### When NOT to Use Discounts

- Value has not yet been understood (discounting confusion doesn't fix confusion)
- First-time, cold visitors (trains discount-seeking behavior)
- Enterprise prospects (signals desperation, undermines premium positioning)
- Trial or demo pages (cheapens a free experience)
- When annual pricing is already the discount lever

### Offer Decision Framework

Ask in order:
1. **Is value understood?** No → educate (guide, video, FAQ).
2. **Is trust missing?** Yes → social proof (case study, success story).
3. **Is complexity feared?** Yes → implementation/migration guide.
4. **Is ROI unclear?** Yes → ROI calculator.
5. **Is commitment feared?** Yes → demo, live chat, or extended trial.
6. **Is price the confirmed objection — and only after 1–5 are ruled out?** Only then → discount or bonus onboarding.

---

## 6. Offer Hierarchy

### By Assistance Level (default ordering — start at Level 1)

1. **No incentive** — FAQ, implementation explainer, video
2. **Confidence builders** — case study, ROI calculator, success story, academy-specific checklist
3. **Human help** — demo, consultation, live chat, WhatsApp support
4. **Value additions** — templates, toolkits, onboarding workbook
5. **Commercial incentives** — extended trial, onboarding bonus, discount (last resort)

### By Visitor Segment

|
Segment
|
Preferred Offer
|
|
---
|
---
|
|
Cold / first-time visitor
|
Educational content, academy growth guide
|
|
Warm visitor (2+ visits)
|
Demo or comparison guide
|
|
Pricing-page visitor
|
ROI calculator or comparison guide
|
|
Enterprise / multi-branch visitor
|
Consultation, dedicated demo
|
|
SMB / single-location visitor
|
Onboarding support, extended trial
|
|
Existing lead (in CRM)
|
Human assistance (chat, WhatsApp, sales)
|
|
Trial user (inactive)
|
Guided onboarding session
|
|
Demo requester (form incomplete)
|
Resume-booking prompt, WhatsApp reminder
|
|
Organic traffic
|
Educational content
|
|
Paid traffic
|
Offer aligned to the ad's specific promise
|
|
Referral traffic
|
Social proof, testimonials
|
|
Direct traffic
|
Reminder / continue-where-you-left-off
|

### By Academy Type

|
Academy Type
|
Recovery Emphasis
|
|
---
|
---
|
|
Sports academy
|
Batch/team scheduling, attendance, tournament management
|
|
Dance academy
|
Attendance tracking, fee collection, progress/portfolio tracking
|
|
Music school
|
Lesson scheduling, instructor management, invoicing
|
|
Art institute
|
Portfolio management, workshop scheduling
|
|
Coaching academy
|
Session management, client tracking, billing
|
|
Training center
|
Batch management, certification tracking, migration checklist
|

---

## 7. Exit Popup UX

### Layout Principles

- Centered modal (desktop) or bottom sheet / slide-up (mobile).
- One primary decision per popup — do not stack multiple offers or asks.
- Visual hierarchy: **Headline → supporting value → primary CTA → secondary/dismiss CTA.**

### Component Guidance

|
Element
|
Guidance
|
|
---
|
---
|
|
Headline
|
Benefit-first, 20–30 characters. E.g. "Need help choosing the right plan?"
|
|
Supporting text
|
1–2 sentences, explains value, no marketing fluff
|
|
Primary CTA
|
Single, specific action — "Book Demo," "Continue Signup," "Compare Plans"
|
|
Secondary CTA
|
Always a graceful, non-shaming exit — "Maybe later," "Continue browsing"
|
|
Close button
|
Always visible, minimum 44×44px touch target, never hidden or delayed
|
|
Imagery
|
Product screenshots or real academy photos; avoid generic stock or distracting visuals
|
|
Spacing
|
Generous — 24–32px between sections, 16–20px within
|
|
Animation
|
150–250ms fade/slide only; never bounce, shake, autoplay sound, or flash
|
|
Motion reduction
|
Respect
`prefers-reduced-motion`
; provide a static fallback
|
|
Loading performance
|
Popup should render within ~100ms of trigger; lazy-load images; never block the main thread
|

### Accessibility Essentials (see also Section 20)

Keyboard operable, focus trapped while open (and restored on close), Escape closes immediately, ARIA `role="dialog"` and `aria-modal="true"` with a labelled heading, screen-reader-friendly, WCAG AA contrast (≥4.5:1 for text).

### Mobile Optimization

See Section 21 for full mobile guidance — default to bottom sheets/slide-ups over full-screen modals.

---

## 8. Copywriting Frameworks

|
Framework
|
Template
|
|
---
|
---
|
|
Value reminder
|
"You were just one step away from simplifying [academy type] management."
|
|
Risk reduction
|
"No credit card required. Cancel anytime."
|
|
Objection handling
|
"Worried about setup time? Most academies are live in under 7 days."
|
|
Social proof
|
"Trusted by 500+ academy owners across India."
|
|
Opportunity reminder
|
"See how much admin time you could save this month."
|
|
Time savings
|
"Automate attendance and fee reminders in minutes, not hours."
|
|
Implementation simplicity
|
"Migrate your existing student data in one guided step."
|
|
Support reassurance
|
"Not sure where to start? Book a 15-minute walkthrough."
|
|
Decision confidence
|
"Compare plans side by side to find the right fit."
|
|
Curiosity
|
"See how similar academies cut admin work in half."
|
|
Gentle urgency (use sparingly, only if true)
|
"Book a demo this week to reserve an onboarding slot."
|
|
Loss aversion (use with care)
|
"Don't miss the chance to see your potential time savings."
|

**Trust-building emotions:** confidence, reassurance, clarity, empowerment, curiosity.
**Manipulative and to avoid:** guilt, shame, fake fear, fake scarcity ("Only 2 spots left!" unless objectively true), confirmshaming dismiss-button copy (e.g., "No thanks, I don't want to grow my academy").

---

## 9. Abandoned Signup Recovery

Design recovery per stage of drop-off, matched to how much the visitor has already invested:

|
Stage Reached
|
Recovery Message
|
CTA
|
|
---
|
---
|
---
|
|
Email only entered
|
"Save your progress — we'll remind you."
|
"Remind me"
|
|
Email + name entered
|
"Complete your account to unlock your dashboard."
|
"Continue"
|
|
Contact info entered
|
"Finish setup to schedule your onboarding call."
|
"Finish setup"
|
|
Onboarding started, stalled
|
"We can have a specialist help you get started."
|
"Book specialist"
|
|
80%+ complete
|
"Almost there — finish in under 2 minutes."
|
"Complete now"
|

Apply the same staged logic to: started free trial, started demo request, started contact form, started pricing inquiry, started onboarding. Track progress state (e.g., in Supabase) so recovery messaging can reference exactly where the visitor stopped, and offer to resume rather than restart.

---

## 10. Recovery Channels

|
Channel
|
Speed
|
Typical Open/Response
|
Best For
|
|
---
|
---
|
---
|
---
|
|
On-page popup
|
Instant
|
High CTR ceiling, high dismissal
|
First-line recovery
|
|
Email
|
1–24h
|
~40–60% open (transactional-style)
|
Nurture, documents, case studies
|
|
WhatsApp
|
Minutes
|
~85–90%+ read rate
|
India-first reminders, support, scheduling
|
|
SMS (optional)
|
Seconds
|
Very high open, low engagement depth
|
Time-critical reminders only, use sparingly
|
|
Browser notification
|
Instant
|
~15–25%
|
Opt-in re-engagement
|
|
Retargeting ads
|
Hours–days
|
Low CTR, high reach
|
Brand recall for visitors with no captured contact
|
|
CRM task
|
Manual
|
N/A
|
Sales follow-up for high-value/enterprise leads
|
|
Sales follow-up (call)
|
Variable
|
~30–50% pickup
|
Enterprise / multi-branch accounts
|

**Sequencing priority:** on-page → WhatsApp (if opted in, India-first) → email → retargeting → CRM/sales task for high-value leads.

---

## 11. Recovery Sequencing

### Example: Trial Abandonment

|
Touch
|
Timing
|
Channel
|
Content
|
|
---
|
---
|
---
|
---
|
|
1
|
Immediate
|
Popup
|
"Need help getting started?" → live chat link
|
|
2
|
1 hour
|
Email
|
"Your free trial starts here" → setup guide
|
|
3
|
24 hours
|
WhatsApp
|
"How's the trial going? Reply for support."
|
|
4
|
3 days
|
Email
|
Case study from a similar academy
|
|
5
|
7 days
|
Email
|
"Your trial ends in 7 days — here's what you'd be leaving behind."
|
|
6
|
14 days
|
Email
|
Final helpful check-in, then stop
|

### Example: Pricing Page Exit

|
Touch
|
Timing
|
Channel
|
Content
|
|
---
|
---
|
---
|
---
|
|
1
|
Immediate
|
Popup
|
ROI calculator or comparison guide
|
|
2
|
2 hours
|
Email
|
Pricing breakdown with real academy examples
|
|
3
|
24 hours
|
WhatsApp
|
"Have a question about pricing? We can help."
|
|
4
|
3 days
|
Email
|
ROI calculator reminder
|
|
5
|
7 days
|
Retargeting
|
Light brand-recall ad
|
|
6
|
14 days
|
Email
|
Final, low-pressure check-in
|

### Example: Signup Abandonment

Immediate popup (resume prompt) → 1 hour WhatsApp reminder → 24 hour email with case study → 3 day implementation guide → 7 day demo invitation → 14 day final nudge, then stop.

### Stopping Conditions

Stop the sequence immediately if **any** of the following occur: the visitor converts on any channel; they unsubscribe or opt out; they request no further contact; support resolves their blocker directly; they've dismissed 3+ attempts; or the sequence reaches its final scheduled touch (typically day 14) with no engagement.

---

## 12. WhatsApp Recovery (India-First)

- **Permission first:** explicit opt-in captured at the point of interest (checkbox or reply-based consent) — never message without it.
- **Templates:** use only pre-approved WhatsApp Business template messages for the first outbound touch; freeform messaging only within an open human conversation window.
- **Tone:** support-first, not sales-first. Roughly 70% support/help framing, 30% promotional.
- **Timing:** business hours only, generally 10 AM–8/9 PM IST; avoid late-night sends.
- **Frequency:** 1–2 messages per week per contact, maximum.
- **Human escalation:** always provide a clear path to a human ("Reply HELP" or similar) and escalate immediately on request — never leave a user stuck in a bot loop.
- **Avoid spam:** stop immediately on silence after 2 automated messages; never send unsolicited promotional blasts.

**Example templates:**
- Demo reminder: "Hi [Name], you were exploring our academy management platform. Want a 15-minute personalized demo? Reply YES to book."
- Support follow-up: "Hi [Name], you started signing up but paused. Can we help with anything? Reply HELP for support."
- Trial nudge: "Hi [Name], your free trial ends in 3 days. Want help setting it up? Reply YES."

---

## 13. Email Recovery

**Subject line ideas:** "Still deciding? We can help," "Continue where you left off," "How [Similar Academy] saved 8 hours a week," "Questions before you get started?"

**Preview text:** reinforce the value or the saved-progress angle, e.g. "We've saved your progress — pick up in under a minute."

**Structure:** greeting → context (what they were doing) → helpful content or proof → single primary CTA → secondary CTA (FAQ/support) → unsubscribe/trust footer.

**CTA hierarchy:** one primary action (continue/resume/book) and one low-friction secondary (learn more, talk to us).

**Social proof:** one short, specific testimonial or stat per email — not a wall of quotes.

**Objection handling:** address the single most likely blocker directly and briefly, in the body, not buried in an FAQ link.

**Plain-text vs. HTML:** plain-text (or plain-styled) for early, low-key nudges; richer HTML for later-stage or higher-value proof emails.

**Frequency:** cap the full recovery sequence at 3–5 emails total; stop on any conversion or unsubscribe.

**Trust:** always include a one-click unsubscribe, real contact info, and a no-spam/privacy reassurance line.

---

## 14. Behavioral Personalization

Adapt recovery based on: page viewed, time spent, scroll depth, pricing plan viewed, feature interest, academy type/industry, traffic source, returning-visitor status, device, and overall engagement level.

|
Signal
|
Adaptation Example
|
|
---
|
---
|
|
Pricing page, 3+ minutes
|
ROI calculator, "Estimate your monthly savings"
|
|
Feature page, low scroll
|
Short explainer video rather than a dense guide
|
|
Dance academy visitor
|
Highlight scheduling, attendance, and progress tracking
|
|
Sports academy visitor
|
Highlight batch/team and tournament management
|
|
Returning visitor (4th pricing visit)
|
Case study + consultation offer, not a generic reminder
|
|
Mobile device
|
Shorter copy, video link over multi-page PDF
|
|
Organic search traffic
|
Educational framing
|
|
Paid ad traffic
|
Offer that matches the specific ad promise clicked
|

---

## 15. Recovery Decision Matrix

Use behavior to select offer, channel, and timing together — not independently.

|
Behavior Signal
|
Offer
|
Channel
|
Timing
|
CTA
|
|
---
|
---
|
---
|
---
|
---
|
|
Pricing exit, high scroll depth
|
ROI calculator
|
Popup → Email
|
Immediate → +2h
|
"Estimate your savings"
|
|
Signup abandoned mid-form
|
Resume signup
|
Popup → WhatsApp
|
Immediate → +1h
|
"Continue signup"
|
|
Demo form 60% complete
|
Resume booking
|
Popup → WhatsApp
|
Immediate → +1h
|
"Schedule demo"
|
|
Trial created, not activated
|
Onboarding session
|
Email → WhatsApp
|
+24h → +3d
|
"Resume trial"
|
|
Comparison-page visitor
|
Comparison guide
|
Popup
|
Immediate
|
"Compare plans"
|
|
Returning visitor, low contact info
|
Success story
|
Email
|
+24h
|
"Read case study"
|
|
Contact form abandoned
|
Direct support
|
WhatsApp
|
Immediate
|
"Chat with us"
|

---

## 16. Analytics

|
Metric
|
Definition
|
Why It Matters
|
|
---
|
---
|
---
|
|
Recovery rate
|
Recovered conversions ÷ total exit events
|
Core effectiveness measure
|
|
Recovered conversions / revenue
|
Signups, demos, trials, or revenue attributable to recovery
|
Business impact
|
|
Popup CTR / dismissal rate
|
Clicks vs. total shown / closes without action
|
UX and offer relevance
|
|
Offer acceptance rate
|
Acceptance by offer type
|
Guides offer-hierarchy decisions
|
|
Signup / demo completion
|
Post-click completion rate
|
Detects friction after the CTA
|
|
Email open / click
|
Standard email engagement
|
Channel health
|
|
WhatsApp response rate
|
Replies ÷ sent
|
Channel health, India-specific
|
|
Revenue lift / incrementality
|
Compare recovered-cohort vs. holdout/control group
|
Confirms genuine causal lift, not just correlation
|
|
Bounce impact
|
Change in overall bounce rate after shipping recovery
|
Guards against regressions from intrusive UX
|
|
User satisfaction
|
Post-recovery CSAT/NPS, or qualitative feedback
|
Guards long-term trust, not just short-term conversion
|

**Always measure incrementality with a holdout/control group** — a raw "recovery rate" without a control can overstate impact from visitors who would have converted anyway.

---

## 17. Experimentation

Every test needs a hypothesis, a single primary success metric, and a plan for interpreting results before launch.

**Test ideas:** offer type, headline, CTA wording, timing/delay, layout/design, imagery, copy length, discount presence, social-proof format, frequency cap, dismiss-button behavior, mobile vs. desktop treatment, sequential vs. single-touch recovery, multi-armed bandit allocation for high-traffic pages.

**Framework:**
1. **Hypothesis** — e.g., "Offering an ROI calculator instead of a discount will improve recovered demo bookings without hurting brand perception."
2. **Success metric** — one primary metric only (e.g., recovered signup rate); track 2–3 secondary/guardrail metrics (dismissal rate, bounce, satisfaction).
3. **Minimum sample thinking** — avoid ending tests early on noisy early results; run long enough to cover day-of-week effects (generally 1–2+ weeks) and reach a meaningful sample per variant, especially on lower-traffic pages.
4. **Avoid conflicting experiments** — never run two overlapping tests on the same popup/audience/metric simultaneously; use feature flags to isolate.
5. **Interpreting results** — check both statistical *and* practical significance; check for segment effects (mobile vs desktop, traffic source); watch for hidden costs like increased bounce or lower satisfaction even when the primary metric improves.

---

## 18. Anti-Patterns

|
Anti-Pattern
|
Why It's Harmful
|
Do Instead
|
|
---
|
---
|
---
|
|
Too many popups
|
Fatigue, brand damage
|
Strict frequency capping (Section 4)
|
|
Aggressive countdown timers / fake urgency
|
Manipulative, destroys credibility if noticed
|
Use only genuine, verifiable urgency
|
|
Hidden or delayed close buttons
|
Deceptive, an accessibility failure
|
Always-visible, instant close
|
|
Forced choices ("Accept or leave")
|
Coercive
|
Always offer a graceful "no thanks"
|
|
Manipulative wording / confirmshaming
|
Guilt-based, erodes trust
|
Neutral, respectful decline copy
|
|
Repeated interruptions / popup loops
|
Annoyance, drives users away entirely
|
Honor dismissals and caps absolutely
|
|
Blocking navigation
|
Traps the user
|
Escape/back always works
|
|
Misleading discounts
|
Breaks trust the moment it's discovered
|
Honest, verifiable pricing only
|
|
Excessive animation / autoplay sound
|
Distracting, hurts performance and accessibility
|
Minimal, motion-safe transitions
|
|
Privacy violations
|
Legal risk, trust destruction
|
Explicit consent, clear data use
|

A single dark pattern can produce a short-term conversion bump while quietly increasing churn and reducing referral revenue over time — the trade is rarely worth it for a B2B relationship business.

---

## 19. Ethical Guardrails

Always prioritize: respect for users, transparency, accessibility, privacy, explicit consent, legal compliance (including India's DPDP Act and applicable WhatsApp Business policy), user autonomy, trust, long-term relationships, and brand reputation. Recovery experiences must **assist**, never **pressure**.

**Quick ethical review checklist:**
- Does this popup help or pressure?
- Is the close button clearly visible and instant?
- Is this genuine value, or manipulation dressed as value?
- Are frequency limits respected?
- Do we have explicit consent for this channel (especially WhatsApp/email)?
- Is this accessible to all users?
- Would we feel good receiving this ourselves?

---

## 20. Accessibility

- Follow WCAG 2.1/2.2 AA as the baseline.
- Full keyboard operability; visible focus states.
- Focus trapped within the popup while open, restored to the triggering element on close.
- Escape key closes immediately.
- Screen-reader support via correct ARIA roles (`dialog`, `aria-modal="true"`, `aria-labelledby` pointing to the headline).
- Respect `prefers-reduced-motion`; provide a non-animated fallback.
- Minimum 44×44px touch targets.
- Responsive layouts at all breakpoints.
- Readable typography (≥16px body, generous line height).
- Contrast ratio ≥4.5:1 for body text, ≥3:1 for large text/icons.

---

## 21. Mobile-Specific Guidance

- Prefer **bottom sheets** or **slide-ups** over full-screen modals; consider **inline recovery** embedded in page content for lower-friction contexts.
- Intercept back-button/gesture navigation thoughtfully — never block it outright, offer a gentle prompt instead.
- Keep primary CTAs within comfortable thumb reach (lower half of the screen).
- Be mindful of on-screen keyboard covering CTAs during form-based recovery.
- Keep DOM and animation lightweight; prioritize fast rendering on low-end Android devices and unstable networks.
- Touch targets ≥44px, ideally 48px.
- Allow internal scrolling within the sheet if content requires it.

---

## 22. Implementation Considerations

*(Architectural guidance only — no production code.)*

- **Next.js / React:** implement trigger logic as a client-side hook layer (cursor/scroll/visibility listeners) with cleanup on unmount; render popups via portals, client-side only, to avoid hydration mismatches; keep suppression/frequency state in a small shared client store.
- **Supabase / PostgreSQL:** persist recovery events (shown, clicked, dismissed), conversion outcomes, consent/opt-in status, and frequency-cap counters in dedicated tables keyed by an anonymous visitor ID; use this data to drive both personalization and analytics.
- **Edge Functions:** good fit for real-time offer/trigger decisioning, event enrichment, and orchestrating outbound email/WhatsApp sends without blocking the client.
- **Vercel:** use feature flags / Edge Config for gradual rollout of new triggers, offers, or sequences without redeploying; enables fast kill-switches if an experiment misbehaves.
- **Cookies / session storage:** session storage for single-session suppression and in-progress form state; cookies (with consent) for cross-session frequency capping and remembered dismissals.
- **Feature flags:** gate every new recovery experiment behind a flag; roll out gradually; keep an emergency kill-switch.
- **Analytics:** unify recovery events into the same event taxonomy as the rest of the funnel so recovered conversions can be attributed correctly.
- **Consent management:** gate all WhatsApp/email/SMS recovery sends behind explicit, auditable consent records; honor unsubscribe/opt-out signals immediately across all channels.
- **Authentication boundary:** always verify the visitor is unauthenticated/pre-login before rendering marketing-site exit recovery; never show it inside the logged-in product.

---

## 23. AI Collaboration

This skill owns **abandonment recovery** specifically — the moment after a visitor shows exit intent. It defers ownership of adjacent concerns to these complementary skills:

**`cta-strategy-architect`**
- *Responsibility:* overall CTA hierarchy, placement, and micro-copy strategy sitewide.
- *Boundary:* this skill consumes CTA guidance for popup buttons but does not redefine sitewide CTA strategy.
- *Defer to it when:* final button copy/styling or sitewide CTA hierarchy decisions are needed.

**`free-trial-signup-flow-designer`**
- *Responsibility:* the end-to-end signup/trial/onboarding flow design.
- *Boundary:* this skill only designs recovery *after* an interruption in that flow — it assumes the flow itself already exists.
- *Defer to it when:* the abandonment point traces back to a flow/UX problem in signup or onboarding itself, not just a need for recovery messaging.

**`website-conversion-funnel-analyst`**
- *Responsibility:* funnel diagnosis, drop-off quantification, and prioritization of which pages/steps most need attention.
- *Boundary:* this skill implements recovery once a drop-off point has been identified; it does not perform funnel-wide diagnostics.
- *Defer to it when:* deciding which page or step deserves recovery investment first, or when interpreting broader funnel analytics.

**`form-ux-specialist`**
- *Responsibility:* field-level usability, validation, and completion optimization within forms.
- *Boundary:* this skill assumes the form's fields and validation are already well-designed and focuses only on recovering users who left it.
- *Defer to it when:* abandonment is actually caused by poor field UX, confusing validation, or form-length friction — the fix belongs in the form itself, not in recovery messaging.

---

## 24. Deliverables

When invoked, this skill should produce as many of the following as are relevant to the request:

1. Exit recovery strategy (overview tying triggers, offers, and channels together)
2. Trigger and timing rules (per-page, per-signal)
3. Frequency-cap plan
4. Offer recommendations (with decision-framework rationale)
5. Popup UX specification (layout, copy, accessibility notes)
6. Copywriting variants (headline, body, CTA, secondary CTA)
7. Recovery decision matrix (offer × channel × timing × CTA)
8. Multi-touch recovery sequence (email/WhatsApp/on-page)
9. Email flow (subject lines, structure, CTA hierarchy)
10. WhatsApp flow (India-first templates and escalation logic)
11. Analytics/measurement plan (metrics + control-group design)
12. Experiment roadmap (hypotheses, primary/secondary metrics)
13. Accessibility review
14. Ethical compliance review
15. Recovery optimization plan (prioritized next steps)

---

## Realistic Examples

**Pricing page exit (SMB dance academy):** Viewed pricing for 3+ minutes, no click. → Popup: "Not sure which plan fits your dance school?" with an interactive ROI/pricing calculator; primary CTA "Get my estimate," secondary "Continue browsing." Follow-up: email in 2 hours with a pricing breakdown using a comparable dance-academy example.

**Demo abandonment:** Form 60% complete, exits. → Immediate popup: "Save your spot — finish booking in 30 seconds." → WhatsApp in 1 hour: "Hi [Name], saw you were checking our demo calendar — want help finding a slot that works for your academy?"

**Trial abandonment:** Account created, never logged back in. → Email at 24h with a same-vertical case study; WhatsApp at 3 days offering a free onboarding session; stop sequence on activation.

**Signup abandonment:** Stopped at password field. → Popup: "Continue where you left off — your progress is saved." Email at 1h with a direct resume link.

**Contact form abandonment:** Started an inquiry, closed the tab. → Popup offering direct WhatsApp support instead of the form: "Prefer to just message us? Chat here."

**Returning visitor recovery:** 4th visit to pricing page. → Skip generic reminders; go straight to a customer case study plus a consultation-booking offer — repeated visits signal high intent, not confusion.

**High-intent visitor recovery:** Pricing + demo page + comparison page, returning visitor. → Offer a direct implementation consultation booking, not another educational asset — they've already done the research.

**Low-intent visitor recovery:** Single blog article, short dwell time. → Offer a newsletter signup or an academy-growth guide download; avoid any sales-forward messaging, which would feel mismatched and pushy at this stage.

---

## Final Pre-Ship Checklist

Before shipping any exit-recovery experience, confirm it:

- Assists rather than pressures
- Uses the least intrusive intervention that fits the situation
- Matches the visitor's actual stage and intent
- Offers genuinely relevant value, not a generic template
- Provides an instant, clearly visible way to dismiss
- Meets WCAG AA accessibility requirements
- Honors consent, privacy, and all frequency caps
- Has a defined success metric and a control/holdout for measuring true lift
- Protects long-term brand trust above short-term conversion gains
