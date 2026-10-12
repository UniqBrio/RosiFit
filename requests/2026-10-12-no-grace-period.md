# RosiFit has no grace period — 12-Oct-2026

**Asked (verbatim):** "Grace period is not required"

**Clarified with the requester (12-Oct-2026), before any work:** hide it on the screen only, or
remove it entirely? → **Remove it entirely.** Production's `grace_days` goes from 14 to 0, so the
app becomes read-only (reads continue) on the day after the end date, 25-Sep-2027, with no buffer.

**Class:** CHANGE (scoped). Follows `requests/2026-10-12-subscription-section.md` (PR #73, merged).

**What changes:**
- `supabase/migrations/0094_rosifit_has_no_grace_period.sql`: `grace_days` → 0 on the singleton
  row. Raw SQL shown to the requester and applied to production only on an explicit go-ahead.
- `app/subscription.tsx`: the Grace period row is removed.
- `src/data/repository.ts`: the offline fixture's grace days → 0, matching production.

**Not changed:** `subscription_state()` and `is_subscription_writable()` (with 0 days the grace
branch is simply unreachable); the 'grace' state's words stay in `src/data/subscription.ts` so a
row given grace again by hand still reads correctly; existing specs, which set grace themselves.

**Specs:** `supabase/tests/71_rosifit_has_no_grace_period.sql`.
