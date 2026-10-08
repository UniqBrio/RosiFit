# Singapore's unsubscribe forwarder re-signs old links for Mumbai — 08-Oct-2026

**Asked (verbatim):** "Proceed with Blocker 2(a): build the unsubscribe re-signing forwarder. ...
Existing unsubscribe links generated before the Mumbai migration must continue to work after
production moves to Mumbai. ... STOP after implementation and tests."

**Class:** CHANGE (scoped), approved as part of the production move to Mumbai. Follows
`requests/2026-10-07-singapore-unsubscribe-forwarder.md` (B2) and **supersedes its "What it cannot
do" and "Deploy" sections**: the forwarder now reads two keys, and ships with two shared files.

**Why:** Mumbai's `unsubscribe` checks links under Mumbai's own `UNSUBSCRIBE_SECRET`, which is not
Singapore's. B2 only redirected, so every link in every email sent before cutover would reach
Mumbai with a signature Mumbai refuses ("This link did not work").

**What changed (no other file):**
- `supabase/forwarders/unsubscribe/forward.ts`: `forward()` is unchanged. New `resignQuery()` and
  `forwardResigned()`: the pair is checked under Singapore's key with the shared constant-time check
  (`_shared/unsubscribe-token.ts`, the one the real function uses). Only when it holds is the SAME
  `member_emails` id signed under Mumbai's key and put in place of the first `t`; every other byte
  of the query is kept. `e` and `t` are read as Mumbai reads them (the first of each), so the id
  checked is the id Mumbai acts on.
- `supabase/forwarders/unsubscribe/index.ts`: reads `UNSUBSCRIBE_SECRET` (Singapore's, unchanged)
  and `UNSUBSCRIBE_SECRET_NEXT` (Mumbai's) once, through `unquoteSecret`, and serves
  `forwardResigned`. With either missing it logs the two NAMES once and forwards without
  re-signing, i.e. exactly B2.
- `src/data/unsubscribeForwarderResign.test.ts` (new, 21 tests) and one assertion in
  `src/data/unsubscribeForwarder.test.ts` (owner-approved reversal, see TEST_SUMMARY).

**Behaviour:**
| Request to Singapore's `unsubscribe` | Answer |
|---|---|
| GET, pair valid under Singapore's key | **307** to `https://lbyqipunsbzkcvdrxach.supabase.co/functions/v1/unsubscribe?<query, t re-signed for Mumbai>` |
| POST (press, Resubscribe, RFC 8058 one-click), pair valid | **308** to the same, method and body kept |
| GET / POST, pair NOT valid (wrong, tampered, malformed, missing, other member's) | 307 / 308 with the query **byte for byte** (B2's behaviour); Mumbai answers it with its existing failure page, or the quiet 200 for one-click. No token is made. |
| other path / other method / query > 2,048 / non-ASCII | 404 / 405 / 414 / 400, no Location (B2, unchanged) |

It never logs a token or a key, never writes, never builds a database client and never fetches.
The opt-out is still written by Mumbai's function alone. Mumbai's `unsubscribe` is unchanged.

## Deploy — AT CUTOVER ONLY, after Vercel Production points to Mumbai (separate approval)

**1. The secret (owner, locally; never pasted into chat, never committed).** On Singapore
`lhpzhkzbnquwjljmbylo`, set `UNSUBSCRIBE_SECRET_NEXT` to exactly Mumbai's `UNSUBSCRIBE_SECRET`,
from the same local source Mumbai's was set from, with `secrets set --env-file <file>` so the value
never appears on a command line. Do NOT touch Singapore's `UNSUBSCRIBE_SECRET`. Verify by digest
only (`secrets list -o json`): Singapore `UNSUBSCRIBE_SECRET_NEXT` == Mumbai `UNSUBSCRIBE_SECRET`,
and Singapore `UNSUBSCRIBE_SECRET` unchanged from the 08-Oct-2026 snapshot. The current Singapore
function does not read the new name, so setting it early changes nothing.

**2. The function.** Target Singapore, slug `unsubscribe`, `verify_jwt: false`. In a scratch
workdir, lay out `supabase/functions/unsubscribe/{index.ts,forward.ts}` from
`supabase/forwarders/unsubscribe/` and `supabase/functions/_shared/{unsubscribe-token.ts,
from-address.ts}`, byte for byte. The import `../../functions/_shared/` resolves to the same
`supabase/functions/_shared/` from either folder. Deploy with `--use-api --no-verify-jwt`, read the
bundle back and diff it against the four files.

**3. Verify, nothing written anywhere.**
`curl -si "https://lhpzhkzbnquwjljmbylo.supabase.co/functions/v1/unsubscribe?e=x&t=y"` → `307`,
`location: https://lbyqipunsbzkcvdrxach.supabase.co/functions/v1/unsubscribe?e=x&t=y` (unchanged:
not a valid pair). Then a GET of one real pre-cutover link from an email: `307` whose `t` differs
from the link's; following it with a GET reaches Mumbai's question page (`303` to `/unsubscribe`),
which writes nothing.

**Rollback:** redeploy B2 (`supabase/forwarders/unsubscribe/` at `dac3429`), or the Singapore
`unsubscribe` live before the deploy from `supabase/functions/unsubscribe/`, `verify_jwt: false`.
`UNSUBSCRIBE_SECRET_NEXT` can then be unset; nothing else reads it.
