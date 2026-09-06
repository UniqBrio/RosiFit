# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: **Add a course / Edit course** — `app/course/edit.tsx`, the
  *Follow-up trigger* section, shown in the requester's screenshot of the dialog.

- CURRENT BEHAVIOUR (read in the file, 2026-09-06): the form runs Course name → Branch →
  Frequency → From email ID → Message template → Wording for this course → **Follow-up
  trigger**. Under the trigger heading are the two rule cards, then a **separate card**
  titled *Missed sessions in a week* / *in a row* with "Between 1 and 7." and a − 4 +
  stepper, then the "one or the other" note.

- DESIRED BEHAVIOUR: requester's exact words — *"bring follow up trigger above email
  section and the count should be just beside heading follow up no need of seperate
  setion beside follow up show +number- thats it"*.

  Read as: the whole Follow-up trigger section moves up to sit after Frequency and before
  From email ID. The separate count card goes. The − 4 + stepper sits on the same row as
  the *Follow-up trigger* heading, on its right.

- WHY: `unknown` as stated. Evident from the ask: the trigger belongs with the schedule
  it counts against, not after the email wording; the count is one number, not a section.

- MUST NOT CHANGE: what is saved. Rule, threshold, clamp 1–7, the two rule cards and their
  live labels, the "one or the other" note, all testIDs (`course-threshold-minus`,
  `course-threshold-value`, `course-threshold-plus`, `course-rule-*`). Both themes.
  Guardrail 3 binds: the stepper ends keep their icon and accessibility label.

- CORRECTION ROUND: 1 on this surface.

## OPEN QUESTIONS — the requester did not settle these; taken at the gate
- **Q1. The card also warned when a weekly count exceeds the days the course runs**
  ("can never be reached — nobody will ever be followed up"). Dropping the card would
  drop the warning. **Taken: the warning stays as a one-line note under the rule cards,
  shown only when it is true.** It is the one thing the card said that the stepper cannot.
