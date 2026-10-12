# A Subscription section under More, and RosiFit renews on 24 Sep 2027 — 12-Oct-2026

**Asked (verbatim):** "Enable subscription section under more section and set End date for Rosifit as
24 sept 2027 as next renewal date before that get me the ui snap of subscribtion section"

**Clarified with the requester (12-Oct-2026), before any work:**
- There was no Subscription section in the app, the design canvas or any branch. The "UI snap" is a
  mockup of the new screen, shown in both themes before it ships. → **Mockup first.**
- The end date is a change to the LIVE project. → **An additive migration, tested in the harness; the
  raw SQL is shown and applied to production only after an explicit go-ahead** (CLAUDE.md).
- Visibility → **super admin and staff** (RBAC_MATRIX: `app_subscription_read` is both roles).
- Editing → **read-only.** Renewal stays a back-office change; no client write path is added.

**Class:** CHANGE (scoped).

**What changes:**
- `app/subscription.tsx` (new): plan, start date, end date (next renewal), grace period, and the
  state from `subscription_state()` as a word and an icon. Registered in `app/_layout.tsx`.
- `app/(tabs)/more.tsx`: a **Subscription** row under Configuration, meta "Renews <date>".
- `src/data/subscription.ts` (new, pure), `fetchSubscription` in `repository.ts`, `useSubscription`
  in `hooks.ts`.
- `supabase/migrations/0093_rosifit_renews_on_24_sep_2027.sql`: `expires_at` → 2027-09-24 on the
  singleton row; the previous date is appended to `renewal_history`. Nothing else on the row moves.

**Not changed:** `subscription_state()`, `is_subscription_writable()`, grants, RLS, start date,
grace days, status, plan.

**Specs:** `src/data/subscription.test.ts` (4); `supabase/tests/70_rosifit_renews_on_24_sep_2027.sql`.
