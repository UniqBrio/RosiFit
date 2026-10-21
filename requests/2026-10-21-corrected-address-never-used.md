# A corrected address was never used: the bounced one stayed primary — 21-Oct-2026

**Reported (verbatim):** "The user sent mail and it was showing 3 emails bounced may be before 3 days
now when she was lookinng for bounced emails on that day it shows count 0 . Investigate whats the
issue" — then: "go ahead . and nothing should be pointing to singapore only to mumbai"

**Class:** BUG.

**Root cause (production, read-only):** Anju k coimbatore, Anish s chennai aug and Keerthana mettur
oct (all Postnatal) bounced. On 12-13 Oct each was given a corrected address in Edit. The form made a
new address primary only when the list was empty (`app/member/edit.tsx`), so the corrected address
was saved as a SECOND address and the bounced one stayed PRIMARY. `send-followups` writes only to
the primary (`load.ts`: `is_primary = true`), so the 17-Oct send skipped all three with "Primary
email has bounced". The course's Bounced filter (`emailIssueFor`) and every "will be emailed" reading
(`isReachable`) asked whether ANY address works, so they showed 0. The screens and the send
disagreed.

**Fix:**
- `src/data/emailStatus.ts`: `sendingAddress` (the primary, as the send reads it) and
  `promoteWorkingOverBounced` (the newest working address takes over from a BOUNCED primary; an
  unsubscribed or spam-reported primary is never routed around).
- `isReachable` (followup.ts) and `emailIssueFor` (emailIssues.ts) now ask about the primary
  address, as the send does.
- `app/member/edit.tsx` applies the promotion as a record opens, as an address is added, and on save.
- `supabase/migrations/0096_…`: repairs the 3 members already saved this way. The 1 member with an
  unsubscribed primary is left as it is.

**Singapore (the second instruction):** checked. The app and every function run on Mumbai. Two
dependencies remain, each named to the requester:
1. **The PIN check.** 8 accounts and 12 recovery answers still need Singapore's pin-verify until
   each person signs in once. The requester chose "for now resolve the bounced email issue".
2. **Old emails' unsubscribe links.** They name Singapore's address and carry Singapore-signed
   tokens, which only Singapore's forwarder can re-sign for Mumbai. They cannot be redirected
   without it.

Plus one item outside the repo: the AWS SNS topic still delivers SES events to Singapore's
`ses-feedback`. The requester must remove that subscription in the AWS console.
