/**
 * Whether a horizontal chip row can move, and how far one arrow tap moves it.
 *
 * WHY THIS IS A MODULE AND NOT THREE LINES INSIDE THE COMPONENT
 * Every decision here is made from two NUMBERS THE APP DID NOT MEASURE YET.
 * `onLayout` and `onContentSizeChange` both fire after the first render, and
 * on the prerendered page of the static web export they may not fire at all
 * before the reader sees the row -- so the honest starting state is "widths
 * unknown", not "widths are zero". Zero is what TD-021 mistook for a real
 * measurement, and a 2px dialog shipped from it. Here the same mistake would
 * put two arrows on a row that fits, both of them dead.
 *
 * So: an unmeasured row does not overflow, and an unmeasured row cannot
 * scroll either way. The arrows appear when there is something to reach.
 *
 * Kept free of any react-native import so `node --test` runs it directly.
 */

/**
 * Sub-pixel slack. Web layout widths are fractional (a 312.5px row inside a
 * 312.5px viewport), and `content > viewport` on two floats that mean the
 * same width is how a row with nothing hidden grows a pair of arrows.
 */
export const CHIP_EPSILON = 1;

/**
 * How much of the old view survives an arrow tap. A page that moved the FULL
 * visible width would leave the reader with thirteen unfamiliar chips and no
 * landmark; keeping roughly one chip's edge on screen is what says "this is
 * the same row, further along".
 */
export const CHIP_OVERLAP = 48;

/** A width that was actually measured: finite and not negative. */
function measured(width: number): boolean {
  return Number.isFinite(width) && width > 0;
}

/** How far the row can travel before its last chip is flush with the edge. */
export function maxChipOffset(contentWidth: number, viewportWidth: number): number {
  if (!measured(contentWidth) || !measured(viewportWidth)) return 0;
  return Math.max(0, contentWidth - viewportWidth);
}

/** Is any chip out of sight? Only then do the arrows exist at all. */
export function chipsOverflow(contentWidth: number, viewportWidth: number): boolean {
  return maxChipOffset(contentWidth, viewportWidth) > CHIP_EPSILON;
}

/**
 * One tap's travel: a page less the overlap, but never less than half the
 * view -- on a narrow phone `viewport - 48` can be a few pixels or negative,
 * and an arrow that advances four pixels is an arrow that does nothing.
 */
export function chipStep(viewportWidth: number): number {
  if (!measured(viewportWidth)) return 0;
  return Math.max(viewportWidth - CHIP_OVERLAP, viewportWidth / 2);
}

export type ChipScroll = {
  /** the arrows are rendered only when this is true */
  overflows: boolean;
  /** there are chips off the left edge */
  canLeft: boolean;
  /** there are chips off the right edge */
  canRight: boolean;
};

export function chipScroll(offset: number, contentWidth: number, viewportWidth: number): ChipScroll {
  const max = maxChipOffset(contentWidth, viewportWidth);
  const at = Number.isFinite(offset) ? Math.min(Math.max(offset, 0), max) : 0;
  const overflows = max > CHIP_EPSILON;
  return {
    overflows,
    canLeft: overflows && at > CHIP_EPSILON,
    canRight: overflows && at < max - CHIP_EPSILON,
  };
}

/**
 * Where the row lands after an arrow tap, clamped to its own ends. Clamping
 * here rather than trusting the platform is what keeps the arrow's disabled
 * state and the row's actual position telling the same story.
 */
export function nextChipOffset(
  direction: -1 | 1,
  offset: number,
  contentWidth: number,
  viewportWidth: number,
): number {
  const max = maxChipOffset(contentWidth, viewportWidth);
  const at = Number.isFinite(offset) ? Math.min(Math.max(offset, 0), max) : 0;
  return Math.min(Math.max(at + direction * chipStep(viewportWidth), 0), max);
}
