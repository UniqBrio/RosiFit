import { useCallback, useRef } from 'react';

/**
 * Who holds the caret when a surface opens.
 *
 * WHY THIS IS ONE MODULE AND NOT A PROP HERE AND A PROP THERE
 * "Wherever there is an input field, the cursor is in the first one"
 * (requests/2026-09-07-autofocus-first-input-field.md) is a single rule
 * spread across a dozen screens, and it has an OPPONENT already in the tree:
 * `Sheet`, `AnchoredPanel` and `ConfirmDialog` each blur whatever is focused
 * when they open, to keep a focused element out of an `aria-hidden` subtree
 * (CP-014). Both halves have to agree about the same moment, so both halves
 * live here.
 */

/** Anything that can take the caret: a DOM node on web, a TextInput on native. */
type Focusable = { focus?: (options?: { preventScroll?: boolean }) => void };

/**
 * A ref that focuses itself once, when the field it is on first appears.
 *
 * WHY A CALLBACK REF AND NOT AN EFFECT ON MOUNT
 * "On mount" is the screen's mount, and a screen that fetches renders a
 * SKELETON first: the course detail's member search does not exist until the
 * course does, so an effect keyed on mount ran against a ref holding null
 * and quietly focused nothing. This fires when the FIELD arrives, whenever
 * that is, and once -- a screen flipping through loading and error states
 * does not keep pulling the caret back.
 *
 * `preventScroll` is the reason this is a hook rather than React's own
 * `autoFocus` attribute. The browser scrolls an autofocused element into
 * view, and not every first field is at the top of its screen -- the member
 * search on a course sits below the course's own header, and autofocusing it
 * the plain way opens the screen already scrolled PAST the course you tapped.
 * The caret is what was asked for; the scroll was not. Browsers without the
 * option ignore it and land exactly where the plain attribute would, and
 * native ignores the argument altogether.
 *
 * `enabled` false means this field is not the first one -- the hook is still
 * called (hooks are not optional), it simply does nothing.
 */
export function useAutoFocus<T>(enabled: boolean | undefined) {
  const taken = useRef(false);
  return useCallback((node: T | null) => {
    if (!enabled || taken.current || !node) return;
    taken.current = true;
    (node as Focusable).focus?.({ preventScroll: true });
  }, [enabled]);
}

/**
 * Whether a layer that just rendered should blur what is focused.
 *
 * Two answers this returns that the raw effect did not:
 *
 *  - CLOSED: the effect is keyed on `open`, so it also ran on MOUNT, when
 *    the sheet is shut and there is nothing to protect. Every form in the
 *    app renders its pickers closed alongside its fields, so that mount-time
 *    blur landed on the first field a moment after it took the caret -- the
 *    autofocus above would have looked like it simply did not work.
 *  - INSIDE: a picker's own search box is the thing that should hold the
 *    caret while the picker is open. Blurring it because it happens to be
 *    what is focused is the layer cancelling its own field. Focus moving
 *    INTO the layer already satisfies what the blur was for: the opener no
 *    longer holds it, so nothing focused is left in the hidden subtree.
 */
export function shouldBlurOpener(
  open: boolean,
  active: unknown,
  layer: { contains?: (node: unknown) => boolean } | null | undefined,
): boolean {
  if (!open) return false;
  if (!active) return false;
  if (layer?.contains?.(active)) return false;
  return true;
}

/**
 * The rule above, wired to the live document -- the web half only, exactly
 * as the three effects it replaces were. `layer` is the layer's own card, so
 * the caret inside it can be told from the caret behind it.
 */
export function blurOpener(open: boolean, layer: unknown): void {
  // Reached through `globalThis` rather than the `document` global: the rule
  // above is a spec (openingFocus.test.ts) and specs are typechecked under
  // scripts/tsconfig.json, which has no DOM lib because it is node's config.
  // The narrow shape below is all this function ever asks of a document.
  const doc = (globalThis as { document?: {
    activeElement: ({ blur?: () => void } | null); body: unknown;
  } }).document;
  const active = doc?.activeElement;
  if (!doc || !active || active === doc.body) return;
  if (!shouldBlurOpener(open, active, layer as { contains?: (node: unknown) => boolean } | null)) return;
  if (typeof active.blur === 'function') active.blur();
}
