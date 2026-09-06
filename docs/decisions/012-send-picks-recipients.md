# ADR 012 — The send draft picks its recipients, and marks who has already had one

**Status:** Accepted · **Date:** 06-Sep-2026 · **Decision log:** 020
**Track:** B (`requests/2026-09-06-send-dialog-pick-recipients.md`)
**Reverses:** the "no per-member selection" design shipped in `app/send/index.tsx` on
05-Sep-2026 (never an ADR — a decision that lived only in a file comment, which is part of why
it is being revisited rather than defended).

## The question, as asked

> "only show list of member dont show template in send communication section. check box should
> be enables for selection of member. if communication sent then it should indicate that
> communication is already sent for this person. bring a best ui as senior design engineer with
> simplified ui. minimal steps"

## What was actually true before deciding

The dialog showed, in this order: the flagged members with an address, the members excluded for
having none, then a card rendering the stored template — its name, its from-address, and the
subject and body filled against the first recipient — followed by two paragraphs of explanation.

Three facts decided the shape of the answer:

1. **The template card is the same on every send.** It is authored on the course
   (`app/course/edit.tsx`, ADR 011), it cannot be changed from this dialog, and nothing on the
   screen acts on it. On the requester's own screenshot it consumed more than half the card and
   pushed the recipient list into a scroll.
2. **Selection existed once and was removed on purpose.** The reasoning, in the file comment:
   ticking a subset made the rule's answer advisory — you could send to three of seven and
   nothing recorded that the other four were skipped or why.
3. **"Already sent" was recorded and never shown.** `email_messages.status = 'sent'` under a
   batch whose context names the period (0009) is written by `send-followups` on every send.
   Nothing in the app read it back, so the only thing preventing a member getting the same
   email twice in one week was somebody remembering that Tuesday's send had happened.

## Decision

**The dialog is the recipient list and nothing else.** Each member carries a checkbox; the
already-sent ones are marked with the date; the footer sends to what is ticked.

**The template card is removed.** Not the template — the PREVIEW of it. `template_id` still
comes from the course's resolved message and is still the only thing sent, there is still no
compose field on this path, and guardrail 5 is untouched. One line survives the card: *"The
wording belongs to this course and is edited there. Every send is recorded with the wording it
used."*

**Everyone who has not already been written to this period starts ticked.** That is what keeps
"minimal steps" true — the ordinary send is still one tap, with no ticking at all. A member who
has already had this week's message starts **unticked**: a second one is possible, and is a
deliberate act.

**Point 2's objection is answered rather than dismissed.** The subset is never silent:
- the heading states `N of M selected`, so a short send says so before it is sent;
- the confirmation names how many flagged members are not ticked and will not be contacted, and
  how many of the ticked have already had this week's message;
- a member with no address is still excluded, named, and counted (C-76) — she is not a
  checkbox, because there is nothing to tick.

**The already-sent fact has two sources, merged** (`src/data/sent.ts`): the server's history for
the period (`repository.fetchSentForPeriod`) and this session's own sends. The session log is
what makes the mark appear the instant a send returns rather than at the next refetch, and it is
the only source on fixtures. It records what the send REPORTED as sent, never what it was asked
to send.

## Rejected, and why — the part worth reading in six months

**Keeping the template behind a "Show wording" disclosure.** The middle option, and it fails the
ask ("dont show template") while keeping the cost that matters: a control nobody presses, on the
screen it was asked to be removed from. The wording is one tap away on the course, where it can
also be changed.

**Hiding already-sent members instead of marking them.** It makes the list disagree with the
follow-up count on the dashboard and the weekly screen for no stated reason, which is exactly
the drift guardrail 1 exists to prevent. A member who is flagged is on the list; whether she has
been written to is a mark on her row, not a filter.

**Reading `member_stats.last_emailed_at` for the mark.** Already fetched, already on `Member` as
`last`. Rejected: it is the last email of ANY kind at ANY time, so a member mailed for something
else last month would read as already handled this week. The batch's period is the question
being asked, so the batch is what is queried.

**Matching on the message's `sent_at` instead of the batch's period.** A week is normally mailed
after it ends, so "sent during the week" would mark almost nobody and would quietly get worse
the later in the week somebody sends.

**Blocking a resend outright.** A second message is sometimes the right call — a bounced-then-
fixed address, a member who asked. The design makes it visible and deliberate instead of
impossible.

## Consequences

A failed history read costs the mark and nothing else: `fetchSentForPeriod` logs and returns
`{}`, so the draft still lists everybody and still sends. The dialog waits for it in the
skeleton, which is what stops the checkboxes flipping under a finger a moment after opening.

`recipientSplit` and its spec (`src/data/recipients.test.ts`) are unchanged — the split is still
the whole of who CAN be written to. Selection sits on top of it and does not touch the
derivation, so the flagged count on this screen and the one on the dashboard still come from the
one member list and the one rule.

The old file comment's claim — "NO PER-MEMBER SELECTION, and that is the substantive change" —
is deleted with the behaviour it described. Its concern is preserved above.
