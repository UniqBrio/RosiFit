# ADR-030 — The member card READS attendance; it does not write it

**Status:** Accepted
**Date:** 07-Sep-2026 · **Deciders:** the requester, directly
**Supersedes:** the CLIENT-CONTROL half of [ADR-021](021-attendance-gets-a-client-write-path-and-it-is-one-rpc.md).
Its server half — that if attendance is ever written from a client it goes through one
`security definer` RPC and not a table grant — stands untouched.

## Context

ADR-021 was taken on a delegated choice. The requester had asked for three labels on a member
card and for "the correct state" to be selectable, and when the selection half turned out to
sit on top of the sentence the security posture is built on, the run raised it as a hard stop
and was told *"you decide best approach as super senior dev"*. It decided to build it, through
`set_attendance` (0035).

The requester has now made the choice directly, and the other way
(`requests/2026-09-07-member-card-attendance-is-a-reading.md`):

> "on member card there is present absent and yet to mark they are not button they are just
> status ... dont make is clickable and manual action"

Said twice in one sentence. There is nothing to weigh: a delegated decision is only ever held
until the person who delegated it says otherwise.

It is also the answer that makes the screen honest today. 0035 has never been applied — the
harness needs PostgreSQL 16, which this machine does not have, and production's ledger is
TD-033 — so what a coach actually meets on the live site is a chip that looks tappable, and a
warning strip when she taps it. The requester's screenshot is exactly that.

## Options considered

### Option A — Keep the controls, disable them until 0035 is applied
**Pros:** no design work; the capability is one migration away.
**Cons:** it answers a question nobody asked. The requester did not say "not yet", she said the
labels *are not buttons*. And a row of three permanently-disabled controls is worse than the
warning it replaces: nothing on it says why, and a disabled control is an invitation to keep
tapping.
**Cost:** the ask, ignored.

### Option B — Keep the controls and apply 0035 first
**Pros:** ships the capability ADR-021 argued for.
**Cons:** it is the opposite of the instruction, and 0035 cannot be rehearsed on this machine
anyway. Applying an unrehearsed migration to production to enable a feature the requester has
just asked to have removed is not a trade, it is a mistake with extra steps.
**Cost:** an unrehearsed production migration, for negative value.

### Option C — The row becomes three readings (chosen)
No `Pressable`, no `onPress`, no radiogroup, no `setAttendance` on the screen. Which reading is
filled is `dayAttendance`'s answer, unchanged and still covered by its 13 specs.

**What it costs:** the correction path ADR-021 was written for. A member who joined the class
from another device is still missing from the Meet export, still recorded absent, still counted
towards the follow-up rule. That was ADR-021's whole argument and it is still true — but the
correction it wanted has a route that does not need a per-member control on a roster card: the
day's register can be re-uploaded, and since 0037 a second file REPLACES the day and says so
first (ADR-027). The academy corrects a day the way it created it.

**What it does not cost:** anything server-side. `set_attendance` (0035), its 24 assertions and
its RBAC row stay exactly as they are. This decision withdraws the CALLER, not the function.

## Decision

Option C.

Three details the requester did not state, decided here and logged as assumptions:

1. **A day the course does not run reads "Not expected", not "Yet to mark".** The requester's
   condition was "when there is session on that day". *Yet to mark* on a day with no session
   promises an upload that is never coming. `STATUS.none` — the word and the icon — is what the
   day strip already puts on that same day one line above.
2. **"Yet to mark" wears the `awaiting` amber.** The requester asked for it "highlighted", and
   the strip's own cell for a session with no file is amber. Same fact, same colour.
3. **The unfilled readings are drawn at full opacity.** They used to be dimmed to 0.45 as
   *disabled controls*, which WCAG exempts from contrast. They are static text now, and static
   text has to clear 4.5:1 — guardrail 2, and the reason the dimming did not survive the change.

## Consequences

- `setAttendance` in `src/data/repository.ts` and the `set_attendance` RPC (0035) are now
  **defined and called by nothing**. Recorded as **TD-040**. They are deliberately not deleted:
  0035 is additive, rehearsed nowhere and applied nowhere, so deleting it changes no
  environment, and the reasoning in ADR-021 is the expensive part of the work. Whoever revives
  per-member correction should start there.
- RBAC_MATRIX's `set_attendance` row is amended: the grants are unchanged, and the sentence
  claiming "the three chips on a course roster card are the control" is not true any more.
- FEATURE_TRUTH's *Mark one member present or absent* row becomes a READ row, and says what it
  used to be.
- The warning strip in the requester's screenshot — *"The academy database cannot record
  attendance by hand yet"* — cannot occur any more, because nothing asks.
- Reversing this is reversing a UI decision, not a schema one: the RPC and its tests are still
  there. It would need this ADR superseded in turn, and the requester's instruction is explicit
  enough that it should not happen without her.
