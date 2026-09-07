import type { ViewStyle } from 'react-native';

/**
 * The twelve-key PIN pad's grid. Two screens draw this pad -- sign-in's
 * Enter PIN and set-pin's Pick/Change your PIN -- and they each carried their
 * own copy of the numbers.
 *
 * WHAT WENT WRONG. Both said `width: '31.5%'` on the key and `gap: 10` on the
 * row. A flex line breaks on WIDTHS PLUS GAPS, so three keys need
 * `3 x 31.5% + 2 x 10px` to fit, which only comes true once the row is about
 * 364px wide. Sign-in's card leaves `viewport - 40` and set-pin's Screen
 * leaves `viewport - 32`, so every phone from 320 to 393 got TWO keys to a
 * row -- and `flexGrow: 1` then stretched the pair to full width, which made
 * a wrap look like a decision.
 *
 * It did not stop at looking wrong. Two-up makes the pad six rows instead of
 * four, 374px instead of 246px, and on set-pin that squeezed the `flex: 1`
 * region above it below its own content height -- so the four PIN boxes were
 * drawn straight over the keys.
 *
 * THE FIX, AND WHY IT CANNOT COME APART AGAIN. The gutter is PADDING INSIDE
 * each cell rather than a gap between them. Padding does not enter the
 * line-breaking sum, so the only question a line ever asks is whether three
 * cells of 33.3333% fit in 100% -- and that is true at every width there is,
 * with no measurement, no breakpoint and no first-render mismatch to get
 * wrong. It is the same idiom the Overview's two-up grid uses (`Cell` in
 * `app/(tabs)/index.tsx`): exact percentage widths, half the gutter as
 * padding on each cell, and the container pulling the outer halves back with
 * a negative margin so the pad still sits flush to its screen edges.
 */

/** Three to a row -- the canvas' keypad, and what a phone keypad is. */
export const KEYPAD_COLUMNS = 3;

/** The visible space between two keys. Half of it pads each side of a cell. */
export const KEYPAD_GUTTER = 10;

/**
 * `33.3333`, not `100 / 3`. Three of the latter sum to 100.00000000000001%,
 * and a row that is a hair over full is a row that wraps -- which is the
 * whole defect this module exists to prevent.
 */
export const KEYPAD_CELL_WIDTH = '33.3333%' as const;

/**
 * The row. No `columnGap`: the gutter lives in the cells, deliberately, and
 * a gap added here would put the line-breaking sum back exactly as it was.
 * `rowGap` is safe -- it is the cross axis and takes no part in wrapping.
 */
export const keypadRow: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  rowGap: KEYPAD_GUTTER,
  marginHorizontal: -KEYPAD_GUTTER / 2,
};

/** One key's slot. The key itself fills it; the padding is the gutter. */
export const keypadCell: ViewStyle = {
  width: KEYPAD_CELL_WIDTH,
  paddingHorizontal: KEYPAD_GUTTER / 2,
};

/**
 * How many cells a flex line actually takes, given a row width, a cell width
 * and whatever gap sits between them. This is the arithmetic the browser and
 * Yoga both do, written down so a spec can assert on it -- the fault was
 * never visible in either screen's source, only in the sum.
 */
export function columnsThatFit(containerWidth: number, cellWidth: string, gap: number): number {
  const cell = (parseFloat(cellWidth) / 100) * containerWidth;
  if (!(cell > 0)) return 0;
  let n = 0;
  // A hair of tolerance: 33.3333% of 320 is 106.66656, and three of those
  // must be allowed to fit 320 rather than lose to floating-point dust.
  while ((n + 1) * cell + n * gap <= containerWidth + 0.01) n++;
  return n;
}
