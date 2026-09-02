# Design Rules

> **RosiFit's five architecture guardrails, in the form the rule-coverage audit can read.**
>
> These are the same five rules stated as BINDING in [`CLAUDE.md`](../../CLAUDE.md); this file is
> where each one **names the thing that executes it**. `CLAUDE.md` is the statement of intent and
> stays the place a human reads them; this register is the machine-checkable half, parsed by
> `scripts/audits/check-rule-coverage.mjs`. The two must not drift — change one, change the other
> in the same commit.
>
> A rule here answers exactly one question: *name the path of the thing that runs you.* A rule
> with no rung is not wrong, it is **honest debt**, and it is counted so the ratchet can stop the
> count from growing. What is not allowed is implying enforcement that does not exist.
>
> Append-only. IDs are never reused. A rule is amended in place, dated, with the superseded
> language kept.

---

## DR-1 — One member source, follow-up derived

The follow-up list is **derived** from the member list and the saved rule, evaluated once. It is
never stored as a second list.

**Why:** two lists, populated by two queries, is exactly how the dashboard count and the weekly
list drift apart. When they disagree there is no way to tell which one is lying.

**Rung:** `src/data/followup.ts` — the single derivation (`ruleHits`, `isEligible`, `reasonFor`),
used identically by the fixtures and by live Supabase data. The database's equivalent is covered
by `supabase/tests/06_followup.sql`; that spec is a real rung but a `.sql` path, which this audit
does not count — see KNOWN_LIMITATIONS.

## DR-2 — Colour ships measured, never trusted

Every colour pair the UI renders is measured at build time. The custom-hue accent is darkened
until it clears 4.5:1 for all 360 hues, in both themes.

**Why:** three of the six original presets shipped white labels at 3.05–3.67:1. They looked
deliberate and were unreadable, and no amount of review caught it, because the eye is not a
photometer.

**Rung:** `scripts/check-contrast.ts` — 2,800 pairs, both themes, fails the build.

## DR-3 — Colour is never the only signal

Every status carries its own **word and icon**. Every canvas icon must resolve to a real glyph.

**Why:** a missing glyph renders as a blank box — invisible in review — and it removes a signal
this UI is not allowed to carry in colour alone.

**Rung:** `scripts/check-icons.ts` — 71 canvas glyphs, fails the build if a name stops resolving.

## DR-4 — Secrets never reach the bundle

Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` may be public. The
service-role key, `PIN_PEPPER` and the SES credentials are Edge Function secrets only. PINs and
recovery answers are never stored readable, never logged, and never audited in cleartext.

**Why:** anything prefixed `EXPO_PUBLIC_` is compiled into the app and is readable by anyone who
installs it. RLS is what actually protects the data: `authenticated` holds no write grants on the
engine tables, and the credential tables have no policies at all.

**Rung:** `src/lib/supabase.ts` — the one client, anon key only. The column-name guard in
`supabase/tests/01_auth.sql` is the database half; `.env.example` documents the split.

## DR-5 — Messages go out through stored templates only

There is no free-form send path anywhere in the product.

**Why:** a free-form path is one typo away from sending the wrong thing to a real member, and it
cannot be reviewed before the fact.

**Rung:** `supabase/functions/send-followups/index.ts` — the only sender; it reads stored
templates and has no arbitrary-body parameter.

---

## Adding a rule

1. State the rule as something a diff can be held up against, not as an aspiration.
2. Say **why** — the incident or the failure mode. That is what makes it survive six months.
3. Name the **cheapest workable** rung, in this order:
   automated check → checklist item → canonical-pattern row → prose (last resort).
4. Name it as a real path. The audit verifies the file exists: a rule pointing at a deleted spec
   claims enforcement it does not have, which is worse than claiming none.
5. If there is genuinely no rung, say so plainly. Prose-only is honest and is counted as debt.
