# The follow-up trigger, on the two screens that act on it

**Raised** 8 Sep 2026 · **Track** B (enhance) · **Status** built, ungated

## The words

> On clicking send communication and reach out show message of follow up
> triggere of that course and ask the follow up triggere for course is set 4 do
> you want to change or reset it and send communication. Build feature this
> should be visible in both send communication and reach out instead of nothing
> is there for follow up.

## What is true today

The follow-up trigger — the count of missed sessions that puts a member on the
follow-up list — is stored per course in `course_follow_up_config`, falls back
to the academy-wide `follow_up_config`, and is EDITABLE in exactly one place:
the Add/Edit Course form (`app/course/edit.tsx`).

The two screens where a person actually decides to write to somebody say
nothing about it:

- **Send communication** (`app/send/index.tsx`) lists whoever the rule flagged
  and never states the rule that produced the list. When it lists nobody it
  says "No member of X is over the follow-up threshold" — naming a threshold it
  does not show and cannot change.
- **Reach out** (`app/member/[id].tsx`) says "Rule is met" / "Rule is not met"
  and never says WHICH rule, or what number it turns on.

So the one number that decides who gets an email is invisible at the moment the
email is sent, and changing it means closing the dialog, finding the course,
opening its form, stepping the number, saving, and coming back.

## What is being built

One reading of the trigger, one panel, on both screens.

1. **State it.** "The follow-up trigger for *Prenatal Yoga* is set to 4 missed
   sessions in a week. Do you want to change or reset it?" — the requester's own
   sentence, generated from the values so it cannot drift from the rule (C-67).
   It says whether the number is the course's own or the academy's.
2. **Change it.** The same 1..7 stepper the course form uses, with the same
   bounds from the same module (`clampThreshold`, `MIN_THRESHOLD`,
   `MAX_THRESHOLD`).
3. **Reset it.** Back to the academy-wide weekly count — the value a course with
   no trigger of its own already follows.
4. **Then send.** Applying is a separate press from sending. Nothing about the
   send changes: same derivation, same stored wording, same confirmation.

### Where it appears

| Screen | How |
|---|---|
| Send communication (`/send`) | The panel, inline at the top of the draft — including when the draft lists nobody, which is the case a lower trigger exists to answer |
| Reach out (member pop-up) | The panel inline under her rule label, AND a prompt carrying the question in front of the send, exactly as asked |

## MUST NOT CHANGE

- **Guardrail 1.** The flagged set stays DERIVED. This panel changes the saved
  rule and lets the existing derivation answer again; it never filters a list
  itself.
- **Guardrail 5.** No free-form send path is opened. The panel touches the
  trigger only — never the wording, the template or the sender.
- **The already-sent warning** on Reach out still fires, after the trigger
  prompt, unchanged.
- **Every send is still confirmed** by the existing confirmation, with its
  counts and its "This cannot be recalled."
- **No new migration.** The write goes through `save_course` (0022 / 0030),
  which already owns this column, with every other field of the course passed
  back unchanged.

## Correction, 8 Sep 2026 (same day)

> As soon as Apply button is clicked after changing to the new number show the
> list of members with select/deselect option and then enable "Send
> communication" button. This time, the email should contain the new number
> mentioned in this custom screen.

Built as three things:

1. **Apply is the gate.** In the Reach out prompt, Send communication is
   DISABLED while the stepper holds a number that has not been applied, and
   says so. The list on the far side is derived from the SAVED rule, so
   sending with 1 on screen and 4 stored would be one rule shown and another
   acted on.
2. **Apply opens the list.** The prompt re-derives who the applied trigger
   flags — `flagged()` over her course, the same function as everywhere — and
   lists them with a tick each (select all / clear all), already-sent marks,
   and the no-address members named as excluded. Send communication then sends
   to the ticked members from the prompt, via the same `sendFollowUps` call the
   draft makes, after a confirmation step inside the same card. Nothing applied
   → Send communication still opens the draft as before.
3. **The email carries the number.** A new wording token
   `{{follow_up_trigger}}` resolves, in the Edge Function, to the trigger in
   force for her course at SEND time — read from the config snapshot the batch
   already records, never from anything the client posts. It is on the course
   form's token chips and in the preview. Where a course's wording uses the
   token, the email states the applied number.

Note on 3: the number appears in an email only where the wording INCLUDES the
token. No stored template was rewritten — that is a change to live wording and
is the academy's to make from the course form.

## Known consequence, stated on the panel

`save_course` stores ONE trigger. A course still stored under the retired
CONSECUTIVE trigger is converted to the weekly one by any save — which is
already true of the course form, and is said in the same words here before the
save rather than discovered afterwards from a follow-up list that moved.

## Not done in this change

Written, not tested, on instruction ("build feature and report, dont test dont
verify"). `npm run check`, the gate and the browser evidence are outstanding.
