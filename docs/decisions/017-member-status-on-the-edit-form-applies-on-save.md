# ADR-025 — Her status is a FIELD on the edit form, written by Save

**Status:** Accepted
**Date:** 06-Sep-2026 · **Deciders:** requester (chose the mechanism at the
first gate), this run

## Context

ADR-018 made a member's Active/Inactive a stored fact — `members.status`, the
column `follow_up_candidates()` (0009) had always filtered on and nothing
wrote — and gave it a control: the pill on a course roster row, which asks a
confirmation and then writes immediately through `set_member_status` (0031).

That control is in the only place ADR-018's request asked for it, and it has
one property nobody noticed at the time: it is reachable **only from inside a
course she is on**. Her own record — the Edit member dialog, the screen whose
whole job is "change something about this member" — says nothing about her
status at all. The requester's words: *"For member there is no active and
inactive status setting screen enable user to mark member as active and in
active in edit member form"* (`requests/2026-09-06-member-status-in-edit-form.md`).

Adding the control is not the decision. **When it takes effect is.**

## Options considered

### Option A — Mirror the roster pill: write on the tap, behind a confirmation
Put the same pill on the form. Tapping it opens the same `ConfirmDialog` and
the same RPC fires; Save and Cancel have nothing to do with it.
· **Pros:** one mechanism and one confirmation wording in both places; reuses
the shipped write path unchanged; no second write in the save path, so no
partial-save state to describe.
· **Cons:** it is the one control on a form with a **Save Changes** button
that does not wait for it. Cancel would leave the form having already changed
her — which is precisely the thing a Cancel button promises it has not done.
· **Cost:** ~30 lines.

### Option B — A field like every other field, written by Save (chosen)
The pick is pending state. Cancel discards it. Save writes it, after
`update_member` and only when it differs from her record.
· **Pros:** the form keeps ONE promise about what Save and Cancel mean, and
the promise is the one the footer already makes. A pick can be reconsidered
before it costs anything, which suits a decision about whether the academy
writes to somebody at all.
· **Cons:** two writes behind one button. `update_member` (0027) does not
touch the column and `set_member_status` (0031) is the only thing that may,
so a refusal on the second leaves her details saved and her status not — a
state that has to be **said**, not swallowed.
· **Cost:** ~90 lines including the consequence notice and the split refusal.

**Chosen: B**, by the requester, asked as a direct question before anything
was built.

## Consequences

- Two controls now write `members.status`, with two mechanisms: the roster
  pill on the tap, the edit form on Save. They share the one write path
  (`set_member_status`), so the audit row, the actor and `status_changed_at`
  are identical whichever was used. **The mechanisms differ because the
  surroundings differ** — a pill on a list row has no Save button to belong
  to; a field on a form does.
- The confirmation moves with the mechanism. The pill asks a `ConfirmDialog`
  because the tap IS the act. The form states the consequence in a notice the
  moment the pick differs — *"Saving leaves her out of the follow-up rule…"* —
  because the Save button is the confirmation, and a dialog in front of a
  pending field would be confirming something that has not happened yet.
- **A partial failure is reported as one.** If her details save and her status
  is refused, the form stays open, the pick snaps back to what her record
  holds, and the message says her other details were saved and which status
  she is still on. Rolling the details back instead would need a transaction
  across two RPCs, which is a migration and a bigger claim than this makes.
- `'paused'` — the third value the 0006 CHECK allows and no screen has ever
  offered — reads as Inactive here, exactly as the roster pill draws it, and
  **leaving that pick alone writes nothing**. Only moving the pick to Active
  and back would make a paused member `'inactive'`. Offering a third word
  would invent a distinction the engine does not make: `follow_up_candidates()`
  passes `'active'` and nothing else.
- ~~The Add form does not ask. `create_member` (0016) inserts `'active'`, and a
  form that is welcoming somebody has no reason to raise the question.~~
  **AMENDED 07-Sep-2026** — the requester asked for the opposite: *"While
  adding member show active and inactive toggle by default it should be
  active"* (`requests/2026-09-07-add-member-status-toggle-default-active.md`).
  The Add form now SHOWS the status — a toggle drawn on, reading Active, with
  the word and the icon the Edit rows use — and still does not ASK: it is not
  pickable, and the same sentence names Edit as where to turn it off
  (confirmed when the question was put directly: *"toggle on by default, on
  edit they can toggle off"*).

  So the mechanism decided above is untouched. `create_member` still inserts
  `'active'` and still takes no status, `set_member_status` (0031) is still
  the only write, and no second write joins the create — which is precisely
  why this control states rather than offers: a create that landed while a
  status write was refused would leave a member on the register in the state
  the form had just claimed she was not in. That is the partial failure this
  ADR had to describe for Edit, and Edit at least has her record to reconcile
  against.

  What was wrong in the bullet is its premise, not its logic. A form welcoming
  somebody DOES raise the question — silently, by saying nothing about the
  column that decides whether the academy ever writes to her. Answering it
  cost one sentence and a shape; leaving it unasked cost a correction round.

## Options rejected, and why they may come back

**"Just fold status into `update_member`."** One write, one transaction, no
partial state — genuinely better, and it is a migration: 0027's signature
changes and every caller with it. Worth doing the next time `update_member`
is opened for another reason. It was not worth opening it for this.

**"Make the roster pill wait for a Save too."** There is no Save on a roster
row to wait for. Inventing one would put a form's ceremony on a list.
