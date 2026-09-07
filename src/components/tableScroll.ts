/**
 * Which columns of a sideways-scrolling table the reader cannot see yet.
 *
 * WHY THIS EXISTS
 * The Audit log is one table at every width: five columns over a 760pt
 * minimum, scrolling sideways on a phone (app/audit.tsx). That was the right
 * call -- five columns squeezed into 358pt is five unreadable columns, and
 * the cards it replaced dropped the column NAMES, which is the labelling
 * somebody reading a log is looking for.
 *
 * But it shipped with no way to KNOW. A 390pt phone shows "What changed" and
 * half of "Previous value"; the other three and a half columns are one swipe
 * to the right, and on a touch screen the scrollbar is an overlay that is
 * invisible until you are already scrolling. So the table reads as a list,
 * and the requester asked where "new value previous value modified at and
 * modified by" had gone -- they had gone nowhere, and nothing on screen said
 * so.
 *
 * The fix is a line that NAMES what is still off the edge, and keeps naming
 * it as the reader swipes. Not a fade and not a bare arrow: a fade is
 * colour, and colour is never the only signal in this app (guardrail 3). The
 * words are the signal; the glyph beside them is decoration.
 *
 * It is pure arithmetic over the flex weights so it can be tested without a
 * renderer -- this project has no component harness, and the claim is about
 * which columns fall outside a box, not about pixels.
 */

export type ScrollCol = { label: string; flex: number };

export type SwipeHint = {
  /** the table is wider than the window it sits in */
  overflows: boolean;
  /** columns whose right edge is past the right edge of the window */
  right: string[];
  /** columns whose left edge is before the left edge of the window */
  left: string[];
  /** the sentence the bar prints, or null when there is nothing to say */
  text: string | null;
};

/** A pixel of rounding is not a hidden column. Layout arithmetic in
 *  react-native-web lands on fractions, and a half-pixel sliver of "Modified
 *  at" is not something to send somebody swiping for. */
const EPS = 1;

/** "A", "A and B", "A, B and C" -- the way the sentence would be spoken. */
function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function swipeHint(
  cols: readonly ScrollCol[],
  scrollX: number,
  viewportW: number,
  contentW: number,
): SwipeHint {
  const none: SwipeHint = { overflows: false, right: [], left: [], text: null };

  // Before the first layout both are 0. Nothing is hidden by a table that
  // has not been measured, and a hint that flashes on mount and vanishes is
  // worse than no hint at all.
  if (!(contentW > 0) || !(viewportW > 0)) return none;
  if (contentW - viewportW <= EPS) return none;

  const total = cols.reduce((sum, c) => sum + c.flex, 0);
  if (total <= 0) return none;

  const viewLeft = scrollX;
  const viewRight = scrollX + viewportW;

  const right: string[] = [];
  const left: string[] = [];
  let start = 0;
  for (const c of cols) {
    const width = (c.flex / total) * contentW;
    const end = start + width;
    // A column counts as unseen when ANY of it is outside the window --
    // half a value is not a value anybody can read.
    if (end > viewRight + EPS) right.push(c.label);
    else if (start < viewLeft - EPS) left.push(c.label);
    start = end;
  }

  const text = right.length
    ? `Swipe the table sideways for ${list(right)}`
    : left.length
      ? `That is every column \u2014 swipe back for ${list(left)}`
      : null;

  return { overflows: true, right, left, text };
}
