# ADR-034 — A dialog leaves by its own controls; a picker still leaves by its backdrop

**Status:** Accepted
**Date:** 07-Sep-2026 · **Deciders:** requester, this run
**Request:** `requests/2026-09-07-dialogs-close-only-on-close-control.md`

## Context

Every form in this app is a dialog. `FormDialog` is worn by eleven screens —
add and edit member, add and edit course, the offering editor, a member's
record, the importer and its help pop-up, the attendance upload, add staff,
the holiday form, the send draft and its result, change mobile — and
`ConfirmDialog` fronts seven irreversible acts beside them.

All of them dismissed on a press anywhere on the backdrop. The comment in
`FormDialog` said why, and it was not an oversight: *"Tapping beside the
dialog leaves it, the way tapping beside any dialog does. It is the SAME
action as the close button, never a quiet save."* Both halves of that were
true. The trouble is the second half. A close here is not a save, so the
press that lands beside a card holding a half-typed member — her name, her
email, her course, her joining date — discards all of it, with no undo, no
confirmation, and nothing on screen that was aimed at.

The requester asked for the change in those terms: *"when user click away
from opened dialog dont close the dialog … all should be closed only on click
of close icon and not by clicking away from dialog."*

Worth recording: the framework this app was bootstrapped from ships a starter
dialog described in `COMPONENT_LIBRARY.md` as *"Input dialog (focus,
unsaved-changes, no backdrop dismiss)"*. The behaviour being removed here was
never the blessed one; it arrived when `FormDialog` was written from scratch
to draw its own card.

## Options considered

### Option A — Remove backdrop dismissal from the dialogs only (chosen)
`FormDialog` and `ConfirmDialog`. The pickers — `Sheet`, `AnchoredPanel` —
keep theirs.
· **Pros:** answers the request where the loss actually happens, which is a
form with typing in it; leaves every layer that has no other way out able to
be closed.
· **Cons:** two modal layers in one app now behave differently on the same
gesture, which has to be written down (CP-014) or it reads as an inconsistency
somebody will later "fix".
· **Cost:** two elements, one spec, one amended pattern.

### Option B — Remove it everywhere, on the plain reading of "all"
· **Pros:** one rule, no exception to explain; literally what the word "all"
says.
· **Cons:** it traps people. `AnchoredPanel` draws no close button at all,
and `Notifications` is a bare `Sheet` holding a title and a list — there is
nothing in either to press. Shipping this means a reader opens the bell and
cannot shut it without a page reload. The consistency is real and the price
is a dead end on a screen the shell reaches from everywhere.
· **Cost:** the same two lines, plus close buttons designed and added to two
hosts and their callers — which is a different request, not this one.

### Option C — Confirm before discarding, instead of ignoring the press
Keep the dismissal; when the form is dirty, ask "discard your changes?".
· **Pros:** keeps a fast way out of a form nothing has been typed into; it is
what the framework starter's "unsaved-changes" note describes.
· **Cons:** it is not what was asked for. It also puts a second dialog over a
dialog to protect against a gesture nobody makes on purpose, and it needs a
dirty-check in eleven forms that do not have one — every one of which is a
place for the check to be wrong in the direction that loses the work anyway.
· **Cost:** a dirty-state contract across eleven screens.

### Option D — Delete the backdrop element altogether
If it does nothing, remove it.
· **Pros:** the smallest possible diff; no dead element to explain.
· **Cons:** it does something. `presentation: 'transparentModal'` leaves the
screen underneath mounted, visible and LIVE (`docs/decisions/009-upload-and-match-are-dialogs.md`, and the whole point of
the blurred backdrop). The element is what stops a press beside the card
landing on a member row on the list behind it. Removing it trades a dialog
that closes by accident for one that acts on the screen behind it by accident.
· **Cost:** small, and wrong.

## Decision

Option A. Nothing visual moves — same `theme.scrim`, same 14px web blur, same
geometry — and the layer stays in place. It loses its `onPress`, and with it
its `accessibilityRole="button"` and the label "Close without saving", because
a thing announced to a screen reader as a button that does nothing is worse
than no control at all. That label still names the close button in the header,
where it is still true.

**What actually swallows the press, stated precisely, because three drafts of
this got it wrong.** It is the element FILLING THE SPACE and taking pointers
— on web a `<div>` the click lands on, on native a view the hit test picks
first. It is not the `onStartShouldSetResponder` claim: react-native-web's
responder system never calls `preventDefault`, and RN redelivers an unclaimed
touch to ANCESTORS, never to a sibling underneath. The claim is there to say
out loud that the press is deliberately absorbed. The attribute that would
really break this is `pointerEvents="none"`, and that is what the spec
refuses. (In `FormDialog` the dim and the blur are on the element's PARENT;
the backdrop element itself has never painted anything. In `ConfirmDialog`
the same element paints its own scrim. Both keep exactly what they had.)

The pickers are deliberately untouched, and the reason is not "smaller diff"
— it is that `Sheet` and `AnchoredPanel` have no second way out between them.
The distinction is not modal-vs-modal, it is what the layer is over: a dialog
holds something typed and its close is never a save, so a press beside it is
a MISS; a picker holds nothing to lose, and its backdrop is the way out.

Escape and Android Back are unchanged, and were never uniform to begin with:
`onRequestClose` stays wired on the three real `Modal` hosts — `Sheet`,
`AnchoredPanel`, `ConfirmDialog` — while the eleven `FormDialog` screens are
expo-router routes with no such prop, so on web Escape has never closed one
and still does not. Either way these are acts aimed at the dialog, not clicks
away from it, and the request was about the latter. Making Escape close a form
dialog is a real gap and a separate ask.

## Consequences

**Positive:** a half-typed form cannot be discarded by a stray press. Eleven
form screens and seven confirmations get it from two changed elements,
because the chrome is shared — which is what `FormDialog` was extracted for.

**Negative:** two modal layers now answer the same gesture differently. That
is written into CP-014 rather than left to be discovered, and
`src/components/dialogDismiss.test.ts` asserts BOTH directions — the dialogs
must not close on their backdrop, and the pickers must. One half without the
other is how the consistency argument wins by default six months from now and
takes Notifications with it.

**What this forecloses:** a fast keyboard-free dismissal of a form that has
nothing in it. Closing now costs a press on the header × rather than a press
anywhere. That is the trade the request bought.

## Revisit when

A picker gains a close control of its own — the moment `Sheet` and
`AnchoredPanel` have one, Option B stops trapping anybody and the exception
in CP-014 can go. Or when a form grows a dirty check for its own reasons, at
which point Option C becomes cheap and is the better answer for a form nothing
has been typed into.
