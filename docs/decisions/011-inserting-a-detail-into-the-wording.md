# ADR 011 — A detail is TAPPED into the wording, not typed

**Status:** Accepted · **Date:** 05-Sep-2026 · **Decision log:** 019
**Track:** E (brainstorm) → B (`requests/2026-09-05-insert-a-detail-chips.md`)

## The question, as asked

> "Under we have template format which has variable from which it identifies member name and
> course name … if they want to customize the template even then they have to set variables
> like in meta right … should we show user a format with i icon and give same section as in
> meta to add variables?"

Followed by the constraint that decided the design: *"the design should be user friendly as
users are not tech persons they should be easily understand the format and it should not
affect app flow as well."*

## What was actually true before deciding

The premise needed one correction. **Manual drafting already worked.** `app/course/edit.tsx`
has free-text Subject and Message fields per course, saved into `course_communication`; a
template can be picked and its wording overridden, with Reset to go back.

What did not exist was any way to LEARN the vocabulary. Thirteen `{{token}}` substitutions are
supported, and `MESSAGE_TOKENS` — the list of them — was exported from `src/data/message.ts`
and read **only by its own spec**. Nothing in the app displayed it. The single hint on the
screen was the subject placeholder, `We missed you this week, {{first_name}}`.

The form had two safety nets: a live preview against a real enrolled member, and a
stray-token warning (*"{{fist_name}} is not a token — it will be sent exactly as written"*).
**Both are detection after the fact.** They catch a token you guessed wrong; neither helps
somebody who does not know `{{consecutive_missed}}` is available. So the problem was never
capability. It was discoverability, and the safety nets' existence disguised that.

## The fork that had to be settled first

The request could be read two ways, and they have opposite answers:

| Reading | Answer |
|---|---|
| Make the EXISTING course-time authoring discoverable | Yes — this ADR |
| Let somebody compose an email at SEND time | **No.** Guardrail 5 |

CLAUDE.md, binding: *"Messages go out through stored templates only. There is no free-form
send path anywhere"*, **Honoured in:** `app/send/`. The guardrail is about the send path
carrying no composition — authoring into `course_communication` is stored wording and sits on
the right side of it.

Beyond the rule, the reason holds independently: wording is authored once and goes to
everyone in the course, so moving composition to send time converts one careful review into a
hurried weekly one. Changing this would need its own ADR, not a request.

## Decision

**Tap-to-insert chips under both the Subject and the Message field**, on
`app/course/edit.tsx` only.

- The chip reads **"Her first name"**, never `{{first_name}}`. The token is the machine's
  business. The fuller phrase (`means`) goes to the accessibility label, so a screen reader is
  not given the clipped version a chip row has room for.
- **One row per field**, each inserting into the field directly above it.
- Tapping inserts **at the cursor** and spaces the token correctly — somebody who types "Hi,"
  and taps a chip means "Hi, Divya", not "Hi,Divya".
- One line of copy explains the substitution **by example**, once, and points at the preview
  that was already there.

## Rejected, and why — the part worth reading in six months

**An `i` panel listing the tokens** (the option the requester proposed). Strictly weaker than
chips for the same screen space: it answers discoverability and leaves every token to be typed
letter-perfect, so the typo class the stray-warning exists to catch survives untouched. Chips
subsume it — they are the reference AND the insertion.

**A single shared chip row targeting "whichever field you touched last."** One row shorter,
and it carries hidden state. Hidden state is the exact thing this change exists to remove, and
for a non-technical audience "which field will this land in?" is a question that should never
have to be asked. The vertical cost of the second row is the price of that, and it is worth it.

**Autocomplete on typing `{{`.** Highest cost — a menu positioned at the caret inside a
multiline `TextInput` fights the repo's canonical Dropdown, which opens under a *field*. And it
is self-defeating: undiscoverable by construction, since it only helps somebody who already
knew to type `{{`.

**Do nothing.** The status quo is the reported problem.

**Send-time composition.** Refused, not deferred — see the fork above.

## Consequences

`MESSAGE_TOKENS` gains a short `chip` label beside `means`, and gets its first consumer in the
application rather than only in a test. Its ORDER and token names are untouched: `message.test.ts`
locks both against the Edge Function's `vars` map, and a chip that inserted a token the sender
cannot build would send literal braces to every member of the course.

The chips are 44pt tall because `TAP_MIN` is not negotiable, which is what made the
one-row-per-field cost real enough to be worth stating above.

**Not addressed here:** the field still shows raw `{{first_name}}` after insertion. Rendering
it as a styled pill inside the text would need a rich-text editor, which is a different and
much larger thing. The mitigation is the explainer plus the preview directly beneath — teaching
the substitution rather than hiding it.
