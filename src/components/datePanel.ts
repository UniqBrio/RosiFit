/**
 * Where the date panel sits.
 *
 * The calendar hangs under the field it belongs to, which is the whole point
 * of it -- but a field near the right edge of a window, or one near the
 * bottom of a phone, would open a panel half off the screen, and a calendar
 * whose last week cannot be reached is the failure the anchoring was meant
 * to end, not a new one to introduce.
 *
 * Pure geometry, in its own module, because the arithmetic is the part that
 * can be wrong in a way nobody sees until a form is a hundred pixels lower
 * than the one it was tried on. `src/components/datePanel.test.ts` holds it
 * to the four cases: under the field, pulled in from the right edge, flipped
 * above when there is no room below, and clamped when there is room in
 * neither direction.
 */

/** Where the field is, in window coordinates. */
export type Anchor = { x: number; y: number; w: number; h: number };
export type Size = { width: number; height: number };
export type Placement = { left: number; top: number };

/** The breath between the field and its panel. */
export const PANEL_GAP = 6;
/** The closest the panel comes to the window's own edge. */
export const PANEL_EDGE = 8;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

/**
 * `null` means there is nothing to anchor to yet -- the first frame on a
 * device, where measuring is asynchronous. The caller centres the panel
 * then, which is a place rather than a guess at one.
 */
export function placePanel(anchor: Anchor | null, win: Size, panel: Size): Placement | null {
  if (!anchor) return null;

  const lastLeft = Math.max(PANEL_EDGE, win.width - panel.width - PANEL_EDGE);
  const left = clamp(anchor.x, PANEL_EDGE, lastLeft);

  const below = anchor.y + anchor.h + PANEL_GAP;
  const above = anchor.y - panel.height - PANEL_GAP;
  // Below the field is the default and the readable one: the eye is already
  // there. Above only when below does not fit and above does -- a flip that
  // itself ran off the top would be trading one lost week for another.
  const fitsBelow = below + panel.height <= win.height - PANEL_EDGE;
  const fitsAbove = above >= PANEL_EDGE;
  const wanted = fitsBelow || !fitsAbove ? below : above;

  return { left, top: clamp(wanted, PANEL_EDGE, Math.max(PANEL_EDGE, win.height - panel.height - PANEL_EDGE)) };
}
