# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: **Add a course / Edit course** — `app/course/edit.tsx`, the
  *Wording for this course* card under the **Message template** field, shown in the
  requester's screenshot of the Add a course dialog (dark theme, phone width).

- CURRENT BEHAVIOUR (read in the file, 2026-09-06): the card is always fully open. Under
  the heading it shows the Subject box, the "Tap a detail to add it" note, a chip row, the
  Message box, a second chip row, then the Preview against a real member, then the
  not-a-token warning. On a phone that is roughly two screens of editor before the
  requester sees what a member will read — and most courses never change the template's
  words at all.

- DESIRED BEHAVIOUR: requester's exact words — *"under course email first just show the
  template preview with and edit icon on edit show the section"*.

  Read as: the card opens showing only the **preview** (subject and message as a member
  will read them) with an **edit** control on its heading. Tapping edit reveals the
  section as it is today. The preview keeps showing while editing, so nothing the
  requester relied on disappears.

- WHY: `unknown` as stated. Evident from the ask: the form is for naming a course and
  choosing its days; the wording is a rarely-touched detail that should not dominate it.

- MUST NOT CHANGE: what is saved and how. `subject`/`body` stay `null` while the course
  follows its template and become the course's own only when typed or a chip is tapped;
  choosing a different template still clears them; **Reset** still returns them to the
  template. The `course-subject`, `course-body`, `course-reset-wording` and token-chip
  testIDs stay. The not-a-token warning stays visible whether or not the editor is open —
  a stray token is a defect in every email the course sends, so hiding it behind an edit
  tap would be a regression. Both themes. Guardrail 3 binds: the edit control carries a
  word and an icon.

- CORRECTION ROUND: 1 on this surface.

## OPEN QUESTIONS — the requester did not settle these; taken at the gate
- **Q1. Does the editor start open when the course already has its own wording?** The
  ask says "first just show the preview" without exception. **Taken: always starts
  closed**; the preview shows the course's own words, and Reset stays on the heading
  whenever they differ from the template, so the override is still visible.
- **Q2. How does the editor close again?** **Taken: the same control** — *Edit* with a
  pencil when closed, *Done* with a tick when open. Closing changes nothing; the words
  typed stay exactly as they are and the preview shows them.

## DESIGN SURFACE
Visual and interactive → the B4 correction design pass runs, scoped to this card.
