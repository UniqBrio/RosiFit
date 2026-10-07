# Unsubscribe pages accept the Mumbai project too — 07-Oct-2026

**Asked (verbatim):** "Investigate and fix the hard-coded Singapore project URL in:
public/unsubscribe.html, public/unsubscribed.html ... 1. Accept the Singapore Supabase project URL.
2. Accept the Mumbai Supabase project URL. 3. Preserve the existing unsubscribe/resubscribe
behavior. 4. Do not weaken token validation."

**Class:** CHANGE (scoped). Blocker B1 of the move to Mumbai
(`requests/2026-10-06-move-production-to-mumbai.md`, branch `claude/funny-ramanujan-w7au8a`).
`public/unsubscribe.html`, `public/unsubscribed.html` and appended specs only. No function, no
schema, no secret, no data-layer change.

**Before:** both pages offered their button only when `fn` was exactly
`https://lhpzhkzbnquwjljmbylo.supabase.co/functions/v1/unsubscribe` (Singapore). Since unsubscribe
v9 (03-Oct) every opt-out and every resubscribe goes through these pages, so after cutover the
Mumbai function's own address would be refused and every link would show "This link did not work".

**After:** `fn` is accepted when it is exactly one of two addresses — Singapore's (links already
sent) or Mumbai's `https://lbyqipunsbzkcvdrxach.supabase.co/functions/v1/unsubscribe` — each as its
own anchored pattern, joined with `||`. Everything else is unchanged: the button still needs both
halves of the signed pair, posts them untouched to the function that sent the member there, and
clears them from the address bar. The function still decides validity; the pages never did.

**Safe to deploy before cutover:** while production is Singapore, only Singapore's address ever
arrives, and it is accepted exactly as before.

**Copy:** no user-visible string changed; the HTML comments name both projects.
**Spec:** `src/data/unsubscribeLanding.test.ts` — four tests appended (runs each page's own script
against both addresses, ten near-miss addresses, incomplete pairs, and exactly two patterns). No
existing assertion changed: Singapore's pattern is kept character for character, so the two
assertions that pin it still hold.
