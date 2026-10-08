# Cutover build: the app after production moves to Mumbai — 08-Oct-2026

**Asked (verbatim):** "Remove the Singapore region pin from the post-cutover application ... This
must not remain in the final Mumbai application. Prepare this change during A10. Do not deploy the
production cutover build yet." (owner decision D3); "pin-reset-request JWT = ON ... Do not change it
to OFF during this migration." (owner decision D2).

**Class:** CHANGE (scoped), part of `requests/2026-10-06-move-production-to-mumbai.md` (Phase 3).
**Merge ONLY during the cutover**, after Vercel Production's two variables point to Mumbai: merging
to `main` is what deploys it.

**Changes:**
- `src/data/functionRegion.ts`: `csv-import` is no longer forced to `ap-southeast-1`. With the
  database in Mumbai, the default region (nearest the caller, ap-south-1) is already beside it.
  `functionTarget` stays as the one place a future pin would go, with an empty map.
- `supabase/config.toml`: `project_id` → `lbyqipunsbzkcvdrxach`, so a CLI deploy without
  `--project-ref` can never land on Singapore again; `pin-reset-request` recorded as
  `verify_jwt = true`, as deployed (D2), so a redeploy cannot silently make it public.

**Kept on purpose:** both unsubscribe pages still accept Singapore's function address (B1). After
cutover Singapore runs the B2 forwarder and never sends members to these pages; the pattern is what
a rollback (Singapore `unsubscribe` v9 restored) needs. Remove it when the rollback window closes.

**Spec:** `src/data/functionRegion.test.ts` — one existing assertion reversed under the owner-approved
behaviour-reversal exemption (CLAUDE.md, 01-Oct-2026): test 1's expectation `'ap-southeast-1'` →
`null` and its title; the request path assertion and the other three tests are unchanged.
