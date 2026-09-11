/**
 * WHEN A TOOLTIP IS SHOWING, as a rule rather than as three handlers.
 *
 * A tooltip that only answers to hover is a tooltip nobody on a phone ever
 * sees, and this app is used standing up in a studio. So it answers to a TAP
 * as well -- and the moment it does, "show on enter, hide on leave" stops
 * working, because a touch fires `pointerenter` and then `pointerleave`
 * within a few milliseconds of each other. Written the obvious way, the
 * bubble appears and vanishes in the same frame and the person sees a flicker.
 *
 * So there are two ways of being shown and they are not the same state:
 *
 *   hover  -- a pointer is over the control. It goes when the pointer goes.
 *   held   -- somebody TAPPED. It survives the pointer leaving, because on a
 *             touch screen the pointer always leaves, and it is dismissed by
 *             time or by a press somewhere else.
 *
 * Pure, and a state machine rather than a pile of booleans, because "showing"
 * and "why it is showing" are two facts and a single boolean can only hold
 * one of them. The component owns the timer and the DOM; everything that can
 * be got wrong is here, where a spec can reach it without a browser.
 */

/** How long a TAPPED tooltip stays up before it withdraws on its own. */
export const HOLD_MS = 6000;

export type Reveal = 'hidden' | 'hover' | 'held';

export type RevealEvent =
  /** a pointer moved over the control (mouse hover, or the start of a touch) */
  | 'pointerEnter'
  /** the pointer left -- including the instant end of a tap */
  | 'pointerLeave'
  /** a deliberate press ON the control */
  | 'tap'
  /** HOLD_MS elapsed since the tap */
  | 'timeout'
  /** a press somewhere else on the screen */
  | 'awayPress'
  /** the control has nothing left to explain (it became usable) */
  | 'resolved';

export function nextReveal(state: Reveal, event: RevealEvent): Reveal {
  switch (event) {
    // A TAP ALWAYS WINS, from any state. It is the one event that is certainly
    // deliberate: a pointer can cross a control on its way somewhere else, but
    // nobody taps a dead button by accident, and somebody who does is asking
    // exactly the question the tooltip answers.
    case 'tap': return 'held';

    case 'pointerEnter': return state === 'held' ? 'held' : 'hover';

    // THE LINE THIS MODULE EXISTS FOR. A held tooltip ignores the pointer
    // leaving; a hovered one is the pointer leaving. Collapse the two and the
    // touch case dismisses itself before it has been read.
    case 'pointerLeave': return state === 'held' ? 'held' : 'hidden';

    // Both dismissals apply only to the held state. A timer that could close a
    // HOVERED tooltip would take it away from under a reader's cursor.
    case 'timeout':
    case 'awayPress': return state === 'held' ? 'hidden' : state;

    // Nothing to explain any more, so nothing is shown -- whatever was showing
    // and however it got there. Without this a tooltip left open by a tap
    // stays open beside a button that has since come alive, explaining a
    // reason that is no longer true.
    case 'resolved': return 'hidden';
  }
}

/** Is the bubble drawn? The component asks this rather than comparing strings. */
export function isShowing(state: Reveal): boolean {
  return state !== 'hidden';
}

/** Does this state want the auto-dismiss timer running? Only a tap does. */
export function wantsTimer(state: Reveal): boolean {
  return state === 'held';
}
