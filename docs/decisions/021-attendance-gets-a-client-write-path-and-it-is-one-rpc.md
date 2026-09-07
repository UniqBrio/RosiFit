# 021 — Attendance gets a client-reachable write path, and it is one `security definer` RPC

**Status:** Accepted
**Date:** 07-Sep-2026 · **Deciders:** requester (delegated — *"you decide best approach as super
senior dev"*), this run

## Context

The requester asked for three labels on a member card — Present, Absent, Yet to mark — and for
the correct one to be selectable
(`requests/2026-09-07-member-card-attendance-state.md`).

The display half was cheap. The selection half runs into a guarantee this repository states as a
promise. `RBAC_MATRIX` has said since adoption, of *Write attendance*: **"Nobody, through the
client. `authenticated` holds no write grant on the engine tables; attendance arrives only via
server-side code running as `service_role`. A stolen anon key cannot forge attendance."** The
anon key is compiled into the bundle — guardrail 4 — so that grant is the whole of what stops
anybody who installs the PWA from writing anything they like into the register. **RC-007** is the
S1 incident where every narrow grant in `0002`–`0010` turned out to be a no-op over Supabase's
default privileges, `0015` repaired it, and 135 assertions had been passing over the hole.

So this is a hard-to-reverse decision, and it was raised as a hard stop at Gate 1 rather than
taken quietly. The requester delegated the choice.

Four invariants also sit on this write, and none of them is the client's to hold:

- `expected` decides whether a row counts towards her attendance percentage and towards the
  follow-up rule that sends her email.
- `absent_must_be_expected` and `extra_is_not_expected` (0008) would otherwise be met by a CHECK
  violation with a constraint name for a message.
- An attendance record hangs off a **session**, and `0024` exists because "a session already
  existed to upload against" was the wrong assumption.
- `corrected_by` needs the actor's `public.app_users` id; the client holds an auth uid.

## Options considered

### Option A — Widen the table grant and let the client UPDATE `attendance_records`
**Pros:** no new object; PostgREST does it in one line.
**Cons:** it hands all four invariants above to the client, and it reverses the one sentence the
security posture is built on. The RLS policy would have to re-derive `expected` in a predicate,
which it cannot do without the session. And a policy that allows a row allows **every column on
it** — the same trap `guard_app_users()` exists to close on `app_users`.
**Cost:** the anon-key guarantee, permanently.

### Option B — A new Edge Function running as `service_role`
**Pros:** the existing shape for attendance writes — `csv-import` is one.
**Cons:** buys nothing here. There is no file to parse, no third party to call, no secret to
hold. It puts the same invariants in a second place to drift from the first, which is exactly
what CP-004/CP-005 exist to prevent, and it adds a deploy step to a change that otherwise needs
one migration.
**Cost:** a second implementation of one rule, and a slower path for one round trip.

### Option C — One `security definer` RPC, `set_attendance` (chosen)
`0035`, modelled line-for-line on `set_member_status` (0031) and reusing the session handling
`commit_csv_import` (0024) already proved.

**What it keeps out of the client's hands:** the offering (read from the enrolment in force on
that date), the session (found or created, with 0024's own `expectation_mode` rule), `expected`
(derived from `expected_members_for_session()`), and the actor (`current_app_user_id()`). The
caller may say only *present* or *absent*, about one member, on one date. It cannot delete a
record, cannot mark a future date, and is refused on a cancelled class and a holiday.

**What it does not change:** no table grant moves. `authenticated` still holds `select` and
nothing else on `attendance_records`, and `27_set_attendance.sql` asserts exactly that alongside
`anon` holding no execute grant. The sentence in RBAC_MATRIX stays true in the form that matters;
what changed is that there is now one audited, constrained doorway through it, and the register
says so in a row of its own.

**Cost:** one more `security definer` function to keep honest. `security definer` bypasses RLS,
so the predicates the table's policies carry are restated inside it — the discipline 0031's own
comment spells out, and the thing to check first if this function is ever edited.

## Decision

Option C. The capability the requester asked for is worth having: without it, a member who
joined the class from another device is missing from the Meet export, recorded absent, counted
towards the follow-up rule and emailed about a class she attended, and nobody can correct it
anywhere in the app. The four correction columns sitting unused in `attendance_records` since
`0008` — `original_status`, `correction_reason`, `corrected_by`, `corrected_at` — are evidence
that this was always the intended next step.

## Consequences

- RBAC_MATRIX gains a row for the new capability, and the *Write attendance* row is amended to
  say what it is now about — the grant, which has not moved.
- **`0035` is not applied anywhere yet.** The harness needs PostgreSQL 16, which this machine
  does not have, so it has been rehearsed nowhere; and CLAUDE.md requires the raw SQL in front
  of the requester before production. Until it is applied, the chips read correctly and a tap
  says *"The academy database cannot record attendance by hand yet — migration 0035 has not been
  applied. Nothing has been saved."* — a state the app states rather than fakes.
- Marking a member absent moves her `missed` and `streak`, the dashboard count and the weekly
  follow-up list, because those are derived from attendance (guardrail 1). That is the feature
  working. Nothing is sent by it; sending remains its own deliberate flow.
- If this is ever reversed, the reversal is `drop function public.set_attendance(uuid, date,
  text)`. Rows a person created before that stay, and they are valid rows in the shape the import
  already writes.
