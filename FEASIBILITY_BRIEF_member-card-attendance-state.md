# Feasibility Brief — Attendance state on the member card

**Date:** 07-Sep-2026 · **Verdict:** **Build now**

---

## Summary

Three chips on each roster card — Present · Absent · Yet to mark — showing and setting one
member's state for the day selected in the week strip. The read half needs nothing new: the
screen already loads the week's attendance rows and they carry `member_id`. The write half needs
one new `security definer` RPC, because no client may write attendance today and that is
deliberate. Everything the RPC has to do already exists as a tested database helper. **Build now.**

## Approach

**One migration adding `set_attendance(p_member_id, p_date, p_status)`**, modelled line-for-line
on `set_member_status` (0031) and reusing the session handling `commit_csv_import` (0024) already
proved:

1. Re-check the caller inside the function — `current_app_user_id()`, `is_active_app_user()`,
   `is_subscription_writable()`. `security definer` bypasses RLS, so the predicates the table's
   own policy carries are restated or the function is a hole through them (0031 says this in its
   own comment; it is the pattern, not an embellishment).
2. Resolve her live enrolment → the offering (one active enrolment, 0006), so no branch or course
   is passed in from the client and none can be forged.
3. Find-or-create the session for `(offering_id, p_date)` exactly as 0024 does, including the
   `expectation_mode` choice — `schedule` when the offering's schedule covers that date,
   `all_enrolled` when it does not. `sessions_unique_live` stops a rival session existing.
4. Derive `expected` from `expected_members_for_session()`, never from the client. That is what
   satisfies `absent_must_be_expected` and `extra_is_not_expected` without the screen having to
   know they exist: a "present" on a day she was not expected is stored as `extra`, and an
   "absent" on such a day is refused in words.
5. Upsert on `(session_id, member_id)`; when a row already exists and the status changes, write
   `original_status` (first time only), `correction_reason`, `corrected_by`, `corrected_at` —
   Gate 1 Q3's answer, in the four columns 0008 created for it.
6. `refresh_session_counts(v_session_id)` and `recompute_member_stats(array[p_member_id])`, so the
   card's own *Missed / consecutive* line, the dashboard count and `follow_up_candidates()` all
   move together. **One member, not all** — the array argument is why this stays cheap.
7. `revoke all … from public, anon; grant execute … to authenticated, service_role` (0011/0012
   posture).

**Why the alternatives lost.** *An Edge Function* (the CSV import's shape) buys nothing here:
there is no file to parse, no third party to call and no secret to hold, and it would put the
same invariants in a second place to drift from — the exact failure CP-004/CP-005 exist to
prevent. *Widening the table grant* so the client can UPDATE directly is refused outright: RC-007
is the S1 incident where every narrow grant turned out to be a no-op, and the guarantee
"authenticated holds no write grant on the engine tables" is what makes a stolen anon key
harmless. *Display-only chips* answers half the request.

## Effort and cost

| | |
|---|---|
| Build effort | ~1 day equivalent. Migration `0035` + `supabase/tests/25_set_attendance.sql`; `setAttendance` in `src/data/repository.ts`; a chip group in `MemberCard`; per-member day derivation (pure, unit-tested); RBAC_MATRIX + FEATURE_TRUTH rows |
| One-time cost | £0 — no dependency, no vendor, no new service |
| Recurring cost | £0. One PostgREST call per tap, on the Supabase project that already serves every read |
| **Cost at 10× volume** | Still £0 and still one round trip. The only thing that scales with the academy is `recompute_member_stats`, and it is called **for one member**. Called with `null`, as the import does, it walks every member — that is the ceiling, and the design steps around it rather than discovering it |

## Manual and configuration actions

| Action | Who | Lead time |
|---|---|---|
| Review the raw SQL of `0035` and give an explicit go-ahead before it is applied to production | repo owner | your call — **binding, CLAUDE.md** |
| Apply `0035` to the live project, one migration, reporting the result | after the go-ahead | minutes |

No vendor approval, no DNS, no credential, no compliance sign-off. **One dependency worth
naming:** `0031_member_status.sql` is written and tested but **not yet applied to production**
(FEATURE_TRUTH). It is unrelated code, but it means the migration ledger and the live project
have already drifted by one, and the Gate 4 parity check must reconcile that before `0035` goes
anywhere near production.

## Constraints and ceilings

- **Request timeouts / payload:** irrelevant at this size — one row in, one row out.
- **`recompute_member_stats(null)`** is the binding ceiling and is avoided (above).
- **`absent_must_be_expected` / `extra_is_not_expected`** are the real constraints, and they are
  *design* inputs rather than risks: they decide what the chips may offer on a day the course
  does not run (Gate 1 Q6).
- **KL-002 / KL-003** (react-native-web): `aria-checked` written directly, and Space handled by
  `spaceSelects`, or the chip group is keyboard- and reader-incomplete on the only platform that
  ships.
- **Offline / not configured** (`dataSource !== 'live'`): the card must say what it did and did
  not do, as the Active pill already does. This is CP-003 and RC-008 territory, not an edge case.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A confirmation appears for a write that did not happen (RC-008 / RC-017 — the recorded class in exactly these files) | Medium — every other "saves" in this app was written that shape | High: a register that lies is worse than one that is empty | The chip's state changes only on the resolution of the RPC; a refusal is rendered on the card and says nothing was changed |
| Marking creates a session on a day the class never ran | Medium — find-or-create makes it one tap | Medium: a phantom session lands in the calendar and in everyone's expected count | `expectation_mode = 'all_enrolled'` off-schedule (0024's own answer), a future date cannot be marked at all, and `sessions_unique_live` prevents duplicates |
| The follow-up numbers move under the reader without explanation | High — it is the feature working | Low, if it is visible | The card's *Missed / consecutive* line re-reads in the same beat as the chip; guardrail 1 keeps one source |
| An absent mark pushes a member into the weekly follow-up list | Medium | Medium — she becomes a candidate for a send | Accepted at Gate 1 Q8: sending remains its own deliberate flow, nothing goes out because of a tap here |
| `0035` is applied to production before `0031` | Low | Medium — a partially-applied ledger | Gate 4 parity check, and migrations are applied one at a time, in order, each reported |

## Alternatives

Not required — the verdict is Build now. Recorded anyway, because Q2 is the decision most likely
to be revisited: **phase it** by shipping the three chips read-only first (no migration, half a
day) and adding the RPC after. Rejected because it ships a control that looks tappable and is
not, and the read half has no independent value — the screen's day strip already states the same
facts one row higher.

## Recommendation

**Build now.** The write path is one function, in the shape this repository already uses twice,
against invariants the database has enforced since 0008 — and the four correction columns sitting
unused in `attendance_records` are evidence this was always the intended next step. The next step
is Gate 3: the design of the chip group on a card that already carries an avatar, two lines of
text, a status pill and an edit button, at phone width, in both themes.
