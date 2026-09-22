# RUN — a suppressed address is invisible, so saving it again does nothing

Track C · request `requests/2026-09-22-saved-email-not-reflecting.md` · opened 22-Sep-2026
`SCALE: scoped` — additive schema (one NEW function, no body restated), one data-shape change
that the compiler propagates.

---

## The root cause (C1, settled)

> A member's address that carries a suppression is dropped on the way out of the read, so the
> app has no way to show it and no way to ask for it to be changed — and the update path treats
> "a row for this address already exists" as "there is nothing to do". The address the operator
> types is already there, so the save writes nothing and truthfully reports success.

| # | Piece | Where | Confirmed? |
|---|---|---|---|
| 1 | The read discards suppressed rows instead of carrying them | `src/data/repository.ts:302` | **Yes** — the client is built from this repo |
| 2 | The Edit form is seeded from that filtered list, so it opens blank | `app/member/edit.tsx:206` | **Yes** — same |
| 3 | `update_member`'s `exists` branch sets `is_primary` and never `status` | `0027_update_member.sql:272-287` | **No** — see below |

Class: **RC-023** (a rule that lives in one place, invisible from where it has to be obeyed),
with **RC-031**'s prevention read backwards — *carry the stored value and derive the label from
it, never the reverse*. Under C2b it is also **claimed success** (RC-008, RC-017): the toast
asserts the act, nothing asserts the effect.

### Piece 3 is unconfirmed, and the fix is built so that it does not matter

T-120 (18-Sep-2026) measured `update_member` at **9,625 bytes on production against 11,213 in
the harness replay** — one of the 15 functions that differ. T-400's rule applies: *"the function
does X, because the source says so"* is unfounded for these.

**This plan does not touch `update_member`.** It adds a new function beside it. So:

- No existing body is restated → the RC-047 / T-125 revert hazard cannot arise.
- The production read stays worth doing, but it **verifies the diagnosis**; nothing in the fix
  waits on it. What it would change is the root-cause entry's wording, not a line of code.
- An ordinary Save still must not un-suppress an address, and today it doesn't — under the repo
  body *and* under any live body that still has the `exists` branch. Leaving it alone is the
  conservative choice, not a deferral.

### Sweep (C1)

- **Drop-a-row-on-read: 1 site.** `grep -n "continue;" src/data/repository.ts` → 10 hits; nine
  are null-guards and loop bookkeeping. Every `.filter(` / `.neq(` / `status ===` in the file
  (40 hits) scopes or counts; none discards a stored fact from a record. Two lines below the
  defect, `repository.ts:348` does it the blessed way — an unrecognised member status is
  *mapped*, not dropped.
- **exists-then-skip: 1 site.** `create_member` (0016:146) always inserts;
  `bulk_import_members`, `merge_member_into` and `addMemberAlias` do not write this column.
- **Adjacent, recorded not fixed:** `attendanceResetPreview`'s offline branch derives
  `has_email` from the filtered list (`repository.ts:3793`) while the live RPC counts a bounced
  address as an address on purpose (`0056:157`, `0057:121`). Fixtures hold no suppressed
  addresses, so the two cannot disagree today. → TECH_DEBT row.

---

## The plan

### Decisions taken (requester, 22-Sep-2026)

1. **Bounced yes, unsubscribed never.** A bounce is often a typo the academy can fix, so it gets
   a Reinstate action. An opt-out is the member's own decision and the app offers no way to undo
   it — the same rule `ses-feedback` already enforces (`index.ts:130`) and
   `47_unsubscribe_and_ses_feedback.sql:141-165` already pins.
2. **Read production's `update_member` before building against it** — honoured by not building
   against it at all (above).

### One open sub-decision, flagged not assumed

`'complained'` is filtered by nobody and refused by nobody: an address that filed a spam report
is treated today as perfectly sendable. The new predicate has to place it. **Recommendation:
treat it as suppressed and reinstatable** — sending again after a spam complaint is the worst
available outcome, and AWS acts on complaint rates at 0.1%. It is called out here because it
changes who the send goes to, which is beyond the reported symptom.

### Task 1 — carry the state instead of dropping it

`src/data/mock.ts` · `src/data/repository.ts`

- `Member.emails` becomes `{ address, primary, status }[]`, `status` mirroring the 0006 CHECK
  (`unknown | valid | bounced | complained | unsubscribed`). An unrecognised value reads as
  suppressed — the safe answer withholds mail rather than sending it, exactly as `repository.ts:348`
  reasons for `members.status`.
- `repository.ts:302` stops discarding. Both offline writers (`:3019`, `:3291`) carry `'unknown'`,
  which is what both RPCs insert.

### Task 2 — make every call site answer the right question

`src/data/mock.ts` · `src/data/followup.ts` · ~12 call sites the compiler will name

`hasEmail` is **removed**, not widened. It currently means two different things depending on who
asks, and the whole defect is one question with more than one answer. Two named functions
replace it, so TypeScript makes all 38 references pick:

- `hasEmailOnFile(m)` — any live address, usable or not. Drives *"is there anything to show"*.
- `isReachable(m)` — a **usable** address. Already exists in `followup.ts:143` as the predicate
  the send splits on; it gains the status test and stays the one the send obeys (CP-011).

`primaryEmail(m)` keeps its meaning (the address to *display*) and is not overloaded.

### Task 3 — the card stops lying

`app/member/[id].tsx:500-521`

Three states where there were two, each with its own word and icon, colour never alone
(guardrail 3), copy gender-neutral about "the member":

| State | Word | Line under it |
|---|---|---|
| usable | Email on file | the address |
| on file, bounced | Address bounced | the address · follow-ups are not reaching the member · fix it on Edit |
| on file, unsubscribed | Member unsubscribed | the address · the member opted out · the academy may not write to them |
| none | No email on file | excluded from every send, never quietly dropped (C-76) |

Copy-lock added in the same commit, pinning each string.

### Task 4 — the Edit form shows what is there

`app/member/edit.tsx`

The suppressed address renders in the list, marked, and cannot be made primary. Bounced (and
complained, pending the sub-decision above) carries **Reinstate**; unsubscribed is read-only with
no control. The operator can still *remove* it, which soft-deletes it exactly as today — the
two-save workaround made legible rather than secret.

Nothing else about the form's save changes: the suppressed address is submitted in the list, so
`update_member`'s soft-delete step leaves it alone and its `exists` branch leaves `status` alone.
**An ordinary save still cannot resurrect a suppression** — which is the property that must not
be lost while fixing this.

### Task 5 — the migration (additive, one new function)

`supabase/migrations/0078_reinstate_member_email.sql`

```
reinstate_member_email(p_member_email_id uuid) returns void
  · refuses 'unsubscribed'  — worded refusal, the member's own decision
  · refuses a soft-deleted or absent row
  · 'bounced' (and 'complained') → 'unknown'
  · audit_log_as(...) so the row names the acting user, never System (CP-2)
  · security definer · revoke execute from public, anon · grant to authenticated
```

That last line is not boilerplate: **RC-042 and RC-052 are the same defect shipped twice** — a
new SECURITY DEFINER function left executable by `anon`. `src/data/migrationGrants.test.ts`
already fails the build on it.

`update_member` is **not** restated. Nor is `follow_up_candidates` — see Out of scope.

### Task 6 — tests, failing first

| Test | Proves |
|---|---|
| `src/data/memberEmailStatus.test.ts` (new) | the read carries `status`; a suppressed-only member is `hasEmailOnFile` **true** and `isReachable` **false**; an unrecognised status reads as suppressed |
| `supabase/tests/57_reinstate_member_email.sql` (new, append-only) | bounced → unknown; unsubscribed **refused**; a soft-deleted row refused; the audit row names the actor; `anon` cannot execute |
| copy-lock in `src/data/` | the four card strings above |

Each is watched failing against the pre-fix tree and both outputs recorded in `TEST_SUMMARY.md`,
per C2.

### Task 7 — close out

Root-cause entry (next free RC number, newest first, never renumbered) · TECH_DEBT row for the
`attendanceResetPreview` divergence · `checklists/DEFINITION_OF_DONE.md` every item or an
explicit N/A · `npm run check` · `bash db/harness/test.sh` · `/gate`.

---

## Out of scope, deliberately

- **`follow_up_candidates`'s `has_email`** (`0009:107`, `0045:138`, `0072:165`) still reads
  `me.status <> 'bounced'`, so an *unsubscribed* address counts as reachable server-side. It is
  a real drift and it is a **separate row**: changing it changes who the send selects, which is
  beyond the reported symptom, and surgical discipline says that is a second PR. It is safe to
  touch when its turn comes — T-120 lists 15 divergent functions and this is not one of them.
- **`update_member`**, for the reason this plan is built around.
- **T-105** (*"Import-added addresses never validated; `unknown` status sent to and bounces"*)
  is adjacent, already tracked, and not this.

## What is NOT proven until the app is opened

The gate proves the code agrees with itself. `preview-smoke-verifier` after merge is the only
stage that proves a suppressed address now shows on a real member card.
