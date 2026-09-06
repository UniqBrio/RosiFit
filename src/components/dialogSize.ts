/**
 * How tall a form dialog's card is allowed to be.
 *
 * The card is capped at 90% of the viewport so a long form scrolls inside it
 * rather than running off the screen. The cap was applied unconditionally,
 * and `useWindowDimensions()` reports a height of ZERO twice in this app:
 * on the prerendered page of the static web export, before the client has
 * measured anything, and -- the one people actually hit -- for as long as a
 * `Modal` is mounted over the dialog, which is every picker in every form.
 *
 * `0 * 0.9` is `0`, and the card carries `overflow: hidden`, so the whole
 * form was clipped to a 2px sliver: open a date field on `/holiday` and the
 * card went from 811px to 2px and the form behind the calendar vanished
 * (TD-021, measured at 1280x900 on the built app).
 *
 * A viewport of zero is not a small viewport, it is an unknown one, and
 * there is nothing to be 90% of yet. The cap is simply not applied until
 * there is a real height to apply it to -- the card then takes its natural
 * size, which is what it does on a tall screen anyway.
 */

/** 90% of the viewport, so a full-height card still shows it is a dialog. */
export const DIALOG_MAX_H = 0.9;

/**
 * `undefined` means "no cap", which is what a `maxHeight` style wants when
 * the viewport is not known. Anything that is not a usable positive number
 * -- 0, NaN, a negative from a bad measurement -- is treated the same way.
 */
export function dialogMaxHeight(viewportHeight: number): number | undefined {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return undefined;
  return viewportHeight * DIALOG_MAX_H;
}
