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
            // BELOW, and pinned to the control's RIGHT edge. Below, because
            // above is the row this control sits on and a bubble there covers
            // the very day it is talking about. Right, because this control is
            // itself right-aligned in its row, so a left-anchored bubble would
            // hang off the screen on a phone.
            top: '100%', right: 0, marginTop: 6,
            // Wide enough for the sentence, never wider than a narrow phone's
            // content column (360pt screen less its gutters).
            maxWidth: 260, minWidth: 0,
            paddingVertical: SPACE.sm, paddingHorizontal: SPACE.md,
            borderRadius: RADIUS.sm,
            // `control` under `fg` is a pair the contrast sweep already
            // measures on every theme, so this introduces nothing unmeasured
            // (guardrail 2).
            backgroundColor: theme.control,
            borderWidth: 1, borderColor: theme.lineStrong,
            // Over the cards beneath it, which are drawn after this row.
            zIndex: 20, elevation: 6,
          }}>
          <Text style={{ fontSize: 11.5, lineHeight: 16, color: theme.fg }}>
            {text}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
