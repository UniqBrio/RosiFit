import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, Modal, Platform, useWindowDimensions } from 'react-native';
import { placePanel, anchoredWidth, PANEL_GAP, type Anchor } from './datePanel';
import { useTheme } from '../theme/ThemeProvider';
import { blurOpener } from './openingFocus';
import { RADIUS, SPACE } from '../theme/tokens';

/**
 * A panel hanging under the field it belongs to.
 *
 * A form field used to open the bottom sheet, which on a desktop window is a
 * band the full width of the screen for a control a few hundred pixels wide,
 * and which covers the form the value is being entered into. This is the
 * dropdown's behaviour instead -- the panel opens where the field is -- but
 * drawn in a `Modal` rather than inline, because a form scrolls and an
 * inline panel is clipped by the scroller the moment it is taller than what
 * is left below the field.
 *
 * Written for the date field, and moved here when the course, branch, role
 * and question pickers asked for the same thing (requests/
 * 2026-09-06-pickers-open-under-their-field.md). One panel, several hosts:
 * a second copy is how two fields on one form end up opening differently.
 *
 * It keeps every rule the sheet keeps (CP-014): closed, it renders NOTHING;
 * opening it blurs the opener, so nothing focused is left inside the
 * `aria-hidden` subtree; and the way out beside the panel is a real,
 * labelled control.
 *
 * That way out is UNTINTED, which is the one thing this does not take from
 * the sheet. A value is entered into a form, and a scrim over that form dims
 * the very fields it is being chosen against -- twice over inside a dialog,
 * which paints a scrim of its own. The panel separates itself the way the
 * filter dropdowns do (`Dropdown.tsx`): its own surface, a border and a
 * lift, and nothing over the page.
 *
 * WIDTH: a `width` given is the panel's own (the calendar is seven cells
 * wide wherever it opens). Omitted, the panel is as wide as the field it
 * hangs under, which is what a list of names wants and what the reference
 * the requester pointed at draws. `height` is what the placement RESERVES so
 * the panel is never opened off the bottom; the panel's real height is its
 * content's, capped at that.
 */
export function AnchoredPanel({ open, onClose, label, anchor, testID, width, height = 340, header, bleed = false, children }:
  { open: boolean; onClose: () => void; label: string; anchor: Anchor | null;
    testID: string; width?: number; height?: number;
    /** Pinned ABOVE the scroller, never inside it: a search box that
     *  scrolled away with the rows it narrows would be gone exactly when
     *  the list is long enough to need it. */
    header?: React.ReactNode;
    /**
     * The panel gives up its padding, and clips to its own radius.
     *
     * For the one content that reaches the panel's EDGES: the flat menu rows
     * a form field's dropdown draws (`MenuRow`), whose tint and whose
     * hairlines are the full width of the panel. Everything else in such a
     * panel — the search box, the "Add …" row, the nothing-matches note —
     * takes the inset back for itself, so those pieces are unchanged.
     * Without the clip a tinted first row squares off the rounded corner.
     */
    bleed?: boolean;
    children: React.ReactNode }) {
  const { theme } = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();
  const panel = useRef<View>(null);

  /**
   * The opener is blurred so nothing focused is left inside the app root
   * that `accessibilityViewIsModal` hides (CP-014) -- but only once the
   * panel is actually OPEN, and never the panel's own search box, which is
   * exactly what should hold the caret while a picker is up. Both rules are
   * in openingFocus.ts, shared with the two other layers.
   */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    blurOpener(open, panel.current);
  }, [open]);

  if (!open) return null;

  // A window that reports nothing yet gives the panel its natural size rather
  // than a negative one. `useWindowDimensions` is 0 for the first render of a
  // page the browser is still hydrating, and `Math.min(360, 0 - 16)` is a
  // panel nobody can see.
  const w = width !== undefined
    ? (winW ? Math.min(width, winW - SPACE.lg) : width)
    : anchoredWidth(anchor, winW, FALLBACK_W);
  const h = winH ? Math.min(height, winH - SPACE.lg) : height;
  const at = placePanel(anchor, { width: winW, height: winH }, { width: w, height: h });
  // Flipped ABOVE the field, the panel is pinned by its BOTTOM edge. The
  // placement reserves `height` for the panel, and a list is usually
  // shorter than what was reserved; measured from the top it would float
  // that difference clear of the field it belongs to, which reads as a
  // panel for nothing. The reserved box sits entirely above the field only
  // when placePanel found room there, so the real, shorter panel does too.
  const above = !!at && !!anchor && at.top + h <= anchor.y;
  const placed = !at ? null
    : above ? { position: 'absolute' as const, left: at.left, bottom: winH - anchor!.y + PANEL_GAP }
    : { position: 'absolute' as const, ...at };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* No anchor yet (the first frame on a device, where measuring is
          asynchronous): the card is centred, which is a place, not a
          guess at one. */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable
          testID={`${testID}-scrim`}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={`Close ${label}`}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View
          ref={panel}
          accessibilityViewIsModal
          accessibilityLabel={label}
          testID={`${testID}-panel`}
          style={{
            width: w, maxHeight: h, ...(placed ?? {}),
            backgroundColor: theme.surface, borderRadius: RADIUS.lg,
            borderWidth: 1, borderColor: theme.lineStrong,
            ...(bleed ? { padding: 0, overflow: 'hidden' as const } : { padding: SPACE.md }),
            elevation: 8,
          }}>
          {header}
          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** What a field-width panel is while the field is not measured yet. */
const FALLBACK_W = 360;

/**
 * The field a panel hangs under: a ref to put on the row, the place it was
 * last measured at, and the measuring itself.
 *
 * Measured at the press, not at layout: the field's place in the window is
 * whatever the form has been scrolled to by the time it is tapped.
 */
export function useAnchor() {
  const ref = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const measure = () => {
    const node = ref.current as (View & { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void }) | null;
    node?.measureInWindow?.((x, y, w, h) => setAnchor(w || h ? { x, y, w, h } : null));
  };
  return { ref, anchor, measure };
}
