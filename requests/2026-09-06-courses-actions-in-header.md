# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: **The Attendance workspace header** — `app/(tabs)/courses.tsx`
  (`courses-add`, `courses-add-member`, `courses-bulk-import`), shown in the requester's
  screenshot of the Attendance tab on a wide window.

- CURRENT BEHAVIOUR (read in the file, 2026-09-06): the screen header carries **Add Course**
  on its right. **Add Member** and **Bulk Import** sit in a row of their own between the
  search box and the course list, each half the width of the screen and 46pt tall, so on a
  wide window they stretch across the whole screen as two long bars.

- DESIRED BEHAVIOUR: requester's exact words — *"bring add member and bulk import button next
  to add course and make shure its responsive in mobile view as well"*.

  Read as: the three buttons become one group in the header beside the title, in the same
  compact style Add Course already has; on a phone the group must still be usable, not
  squeezed beside a two-line title.

- WHY: `unknown` as stated. Evident from the ask: the three are the same kind of action
  (put something on the register) and belong together; two full-width bars on a desktop read
  as a separate section of the screen.

- MUST NOT CHANGE: what each button does and who sees it. Add Member and Bulk Import stay
  **owner-only** (hidden for staff, the RPC refuses them anyway); Add Course stays for
  everyone. The three testIDs stay. Both themes. Guardrail 3 binds: each button keeps its
  word and its icon.

- CORRECTION ROUND: 1 on this surface.

## OPEN QUESTIONS — the requester did not settle these; taken at the gate
- **Q1. What is "mobile view"?** The course detail screen already states the app's
  breakpoints in one place: below 768 is a phone. **Taken: the same 768**, measured the same
  hydration-safe way (width 0 on the first render, real width after mount).
- **Q2. Where do the buttons go on a phone?** Beside the title they truncate to one word
  each. **Taken: under the title**, as one full-width row that wraps; each button grows to
  share the line at a 44pt touch height, and whichever does not fit takes the next line.
