# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: member status in the Edit Course flow — the roster card's Active/Inactive
  pill on `app/course/[id].tsx`, and the Status control on the Edit member dialog
  (`app/member/edit.tsx`) that the card's Edit button opens. Behind both:
  `set_member_status` (0031), `members.status` (0006) and `follow_up_candidates()` (0009).
- CURRENT BEHAVIOUR: `members.status` is a bare present-tense flag with no date of its own.
  `status_changed_at` records WHEN somebody pressed the control, never when the member
  actually comes off the register — the two are the same moment by construction, because the
  only thing the control can say is "now". So a member who is active today and leaving next
  month can only be recorded twice: left active and remembered, or marked inactive a month
  early and left out of a follow-up rule she is still owed. Every status reading in the app —
  the roster pill, the member pop-up's Status row, `isFollowable` — answers for today and for
  every other day identically, so stepping the course roster's week strip back three weeks
  shows her present-tense status over a historical week.
- DESIRED BEHAVIOUR: requester's exact words —
  "Enhance course member status handling to support an inactive date. In the Edit Course flow,
  allow the user to set when a member should become inactive. Example: A member is active
  today but wants to leave next month. The user should be able to set a future inactive date.
  The member should remain active until that date and become inactive from that date onward.
  Make sure this works correctly with existing joined-date and active/inactive logic,
  including historical date views and attendance."
  Read as: the Inactive choice carries a DATE. She is active on every day before it and
  inactive from it onward, and every reading of her status — including one taken over a past
  day — answers for the day it is about.
- WHY: stated in the request as the example. A departure is known before it happens; the
  register can only be told about it on the day, which means somebody has to remember to come
  back and press a button.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. In particular —
  * what inactive MEANS (0031): it stops follow-up. It is not a departure and it moves no
    enrolment, session, expectation or attendance record. An inactive date is therefore a
    date the FOLLOW-UP stops, not a date she is unenrolled — ending an enrolment is
    `update_member`/`delete_course` business and is a different act.
  * `set_member_status` stays the ONLY write path for the column, and goes on stamping
    `status_changed_at` and `updated_by` from the signed-in actor.
  * attendance and expectation: `expected_members_for_session` (0007) resolves offering
    schedule → enrolment window → member override, and none of those is `members.status`.
    A scheduled inactive date must leave every expectation and every attendance record
    exactly where it is, past and future.
  * `joined_on` is not writable from the Edit form and does not become writable here.
  * the roster pill goes on being a one-tap "now" control; the DATE is set on the Edit form.
  * every existing row: `inactive_from` is null on all of them and null goes on meaning
    "inactive, with no date on record" — the same reading those rows have today.
- CORRECTION ROUND: 1. Related, not previous attempts at this:
  [2026-09-05-inline-actions-and-member-status.md](./2026-09-05-inline-actions-and-member-status.md)
  (the roster pill) and [2026-09-06-member-status-in-edit-form.md](./2026-09-06-member-status-in-edit-form.md)
  (the Edit form's Status pick). Both shipped a status with no date in it.

## DESIGN SURFACE
- VISUAL?: yes — a date field the Status control does not have today, and a status reading
  that can now differ between two days.
- SCREENS & STATES TOUCHED: `/member/edit?id=` — Active picked (no date), Inactive picked
  (date shown, defaulting to today), a date that is refused, saving, the refusal line.
  `/course/[id]` — the roster pill over the selected day, its confirmation, and a member whose
  date is still in the future. `/member/[id]` — the Status row on Her details. Both themes.
  The ADD form is not touched: `create_member` (0016) inserts 'active' and takes no status.
- STRINGS ADDED OR ALTERED: NEW — "Inactive from", its hint and its refusals; the
  scheduled-departure note on the roster pill, the confirmation and the details row. Nothing
  existing is reworded.
- PERMISSIONS: no change. The date is written by `set_member_status`, behind the gate it
  already restates — `is_active_app_user() and is_subscription_writable()`.
- RUN MODE: `auto`.

## DECIDED (the `unknown`s this request would otherwise carry)
1. **Where the date is stored.** A new nullable `members.inactive_from`, not a second status
   row and not `member_enrollments.effective_to`. The enrolment window decides EXPECTATION;
   status decides FOLLOW-UP, and 0031 is explicit that the two are different acts. Reusing
   the enrolment window would silently unenrol her and change her expected count — the one
   thing MUST NOT CHANGE names twice.
2. **What the pair means.** `status` stays the stated answer; `inactive_from` says from when
   it applies. Effective status on a date D:
   `status = 'active'` → active; otherwise `inactive_from is not null and D < inactive_from`
   → active; otherwise the stored status. Null `inactive_from` therefore reads exactly as
   today, which is what every pre-existing row needs.
3. **Which date the follow-up engine judges on.** `current_date`, not the report period —
   the list drives a send that leaves NOW, so who may be written to is a question about
   today even when the figures beside it are a month old.
4. **Validation.** The date may not fall before `joined_on` (she cannot leave before she
   arrived) and may not be set at all while the pick is Active. A PAST date is allowed:
   backdating a departure somebody forgot to record is the same act as scheduling one.

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact analysis with
  the sibling call-site sweep (B2) BEFORE proposing, produce the plan with regression risks
  (B4) — confirm mode waits for approval; auto mode (default) logs it and applies — touching
  only what DESIRED BEHAVIOUR requires. Every changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan may add to it,
  never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to the touched
  area: states, both themes in semantic tokens, the string table, the permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why (B1). If the miss was the process's fault, flag `/framework-update` too.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing merges
  without a PASS.
