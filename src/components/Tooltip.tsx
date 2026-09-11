import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE } from '../theme/tokens';
import { HOLD_MS, isShowing, nextReveal, wantsTimer, type Reveal } from './tooltipReveal';

/**
 * A SENTENCE SAYING WHY A CONTROL CANNOT BE USED YET.
 *
 * Requested for Reset: *"add a tooltip as this will be enable only after first
 * upload of attendance file"*. A disabled button that is merely grey answers
 * "no" and nothing else; the person is left to guess whether it is broken,
 * whether they lack the permission, or whether something has to happen first.
 * Here it is always the third, and the tooltip is where that gets said.
 *
 * WHY IT WRAPS THE CONTROL RATHER THAN LIVING ON IT, which is the whole
 * reason this is a component and not a `title` attribute:
 *
 * React Native Web 0.21 gives a `disabled` Pressable `pointerEvents: 'box-none'`,
 * passes `disabled` into `useHover` so no enter/leave listener is ever
 * attached, and sets `tabIndex: -1`. Read together that means a disabled
 * control **cannot be hovered, cannot be focused and does not receive pointer
 * events at all** -- so a tooltip hung on the button itself can never be
 * triggered, and neither can the browser's own `title` bubble. Verified in
 * `node_modules/react-native-web/dist/exports/Pressable/index.js`; recorded as
 * KL-006 because it is the platform's, not ours.
 *
 * The wrapper is how it is reached. `pointerenter` fires on an element when
 * the pointer moves into it OR any descendant, and `pointerdown` bubbles, so
 * a View around the dead button sees both even though the button sees
 * neither. Those props reach the DOM untouched -- RN Web forwards the whole
 * pointer family on a View (`modules/forwardedProps`), which is what makes
 * this possible without touching the button's own disabled state.
 *
 * THE BUBBLE IS DECORATION, DELIBERATELY. It carries `aria-hidden` and takes
 * no pointer events. What a screen reader reads is the control's own
 * `accessibilityLabel`, which already carries the same reason and carried it
 * before this component existed. Announcing it twice would be worse than
 * once, and a tooltip that swallows the press aimed at the control under it
 * is a tooltip that has broken the control.
 *
 * `text` is the reason, and `null` means there is nothing to explain: the
 * children are then rendered bare, with no wrapper and no listeners, so a
 * control that works carries none of this.
 */
export function Tooltip({ text, testID, children }: {
  /** why the control cannot be used yet, or `null` when it can */
  text: string | null;
  /** the bubble gets `<testID>`, so a check can name the sentence it means */
  testID: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const [state, setState] = useState<Reveal>('hidden');
  const on = (event: Parameters<typeof nextReveal>[1]) =>
    setState(s => nextReveal(s, event));

  /*
   * THE REASON STOPPED BEING TRUE. A bubble opened by a tap outlives the tap,
   * which is its job -- but not the state it was describing. Tick a member and
   * Reset comes alive underneath a sentence still saying it is dead.
   */
  useEffect(() => {
    if (text === null) setState(s => nextReveal(s, 'resolved'));
  }, [text]);

  /* The auto-dismiss, for a TAPPED bubble only (see tooltipReveal). Cleared on
   * every state change, so re-tapping restarts the clock rather than stacking
   * a second timer that closes the bubble early. */
  useEffect(() => {
    if (!wantsTimer(state)) return;
    const t = setTimeout(() => setState(s => nextReveal(s, 'timeout')), HOLD_MS);
    return () => clearTimeout(t);
  }, [state]);

  if (text === null) return <>{children}</>;

  return (
    <View
      // Hover on a desktop, tap on a phone. Both land here rather than on the
      // control, for the reason in the header.
      onPointerEnter={() => on('pointerEnter')}
      onPointerLeave={() => on('pointerLeave')}
      onPointerDown={() => on('tap')}
      style={{ position: 'relative' }}>
      {children}

      {isShowing(state) ? (
        <View
          testID={testID}
          // Decoration. The control's own label is what is announced.
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          {...({ 'aria-hidden': true } as object)}
          style={{
            position: 'absolute',
            /*
             * ABOVE the control, and that is a STACKING decision before it is
             * a visual one.
             *
             * Below was the obvious choice and it did not work. React Native
             * Web gives every `View` `position: relative` AND `z-index: 0`,
             * so practically every node is its own stacking context. A bubble
             * hanging below the control is drawn over the member cards, which
             * are LATER siblings several levels up; at equal z-index later
             * wins, and no z-index inside the row can reach past the ancestor
             * that contains both. Lifting the bubble to 20, the wrapper to 30
             * and the row to 5 all changed nothing: the bubble was present,
             * correctly sized, inside the window, and completely behind a
             * card. Screenshots are what showed it; `.harness/reset-tooltip.mjs`
             * now samples the pixel so a check can.
             *
             * Upward, the same rule works FOR it: what is above this row came
             * earlier in the document, so the bubble paints over it with no
             * z-index at all. It covers part of the day strip while it shows,
             * which is the ordinary cost of a tooltip and is undone the moment
             * the pointer leaves.
             *
             * Pinned RIGHT because the control is right-aligned in its row, so
             * a left-anchored bubble would hang off a phone's screen.
             */
            bottom: '100%', right: 0, marginBottom: 6,
            /*
             * AN EXPLICIT WIDTH, not a maxWidth, and the browser is what
             * taught me the difference. `maxWidth: 260` did nothing: an
             * absolutely positioned box is laid out against its CONTAINING
             * BLOCK, which here is the wrapper, and the wrapper is only as
             * wide as the Reset button. The bubble shrank to **82px** and the
             * sentence came out as a tall thin column of broken words. A
             * source-reading spec cannot see that; `.harness/reset-tooltip.mjs`
             * measures it.
             *
             * 240 with `right: 0` grows LEFTWARDS out of the wrapper, which an
             * absolutely positioned box may do. It still clears the left edge
             * of the narrowest phone this app is used on: the control sits at
             * the right of its row, so 240 back from there is inside a 320pt
             * screen with its gutters.
             */
            width: 240,
            paddingVertical: SPACE.sm, paddingHorizontal: SPACE.md,
            borderRadius: RADIUS.sm,
            // `control` under `fg` is a pair the contrast sweep already
            // measures on every theme, so this introduces nothing unmeasured
            // (guardrail 2).
            backgroundColor: theme.control,
            borderWidth: 1, borderColor: theme.lineStrong,
          }}>
          <Text style={{ fontSize: 11.5, lineHeight: 16, color: theme.fg }}>
            {text}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
