import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { spaceSelects } from './keyboard';
import { SPACE, TAP_MIN } from '../theme/tokens';

/**
 * Two or more panels of one record, switched in place
 * (requests/2026-09-07-member-dialog-two-tabs.md).
 *
 * WHY IT IS A COMPONENT AND NOT SIX LINES IN THE DIALOG
 * The app already has a tab language -- the academy header's row (AppShell):
 * the word, its WEIGHT, its colour and a bar under the live one. A second
 * hand-built strip inside a dialog is how one app ends up with two, drawn
 * differently, disagreeing about which one looks selected. This is that same
 * strip, at dialog scale.
 *
 * WHAT IT GUARANTEES
 *   1. The selected tab is never colour alone: the weight carries it and the
 *      bar under it carries it (guardrail 3).
 *   2. `accessibilityRole="tab"` with the selected state, so a screen reader
 *      announces "2 of 2, selected" rather than reading two buttons.
 *   3. Enter AND Space operate it. Space is the ARIA key for selecting a tab
 *      and this platform does not bind it (KL-003) -- `spaceSelects` is the
 *      shim, shared with the member form's radios rather than copied.
 */
export function TabStrip<K extends string>({ tabs, value, onChange, testIDPrefix }: {
  tabs: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  /** each tab gets `<prefix>-<key>`, so a check can name the one it means */
  testIDPrefix: string;
}) {
  const { theme } = useTheme();
  return (
    <View accessibilityRole="tablist"
      style={{
        flexDirection: 'row', paddingHorizontal: SPACE.lg,
        borderBottomWidth: 1, borderBottomColor: theme.line,
        backgroundColor: theme.shell,
      }}>
      {tabs.map(t => {
        const on = t.key === value;
        return (
          <Pressable key={t.key}
            testID={`${testIDPrefix}-${t.key}`}
            onPress={() => onChange(t.key)}
            {...spaceSelects(() => onChange(t.key))}
            accessibilityRole="tab" accessibilityState={{ selected: on }}
            /* AND the attribute itself. `accessibilityState={{ selected }}`
               is what RN wants and it reaches the DOM as NOTHING on this
               platform -- verified on the built page, where the shell's own
               tab row emits `role=tab` with no `aria-selected` beside it. A
               tab list that cannot say which tab is current is the one thing
               a tab list has to say, so the attribute is passed directly as
               well; RN Web 0.19+ takes ARIA props verbatim, and native reads
               the line above. (TD: the shell's row still has the gap.) */
            {...({ 'aria-selected': on } as object)}
            accessibilityLabel={t.label}
            style={({ pressed }) => ({
              flex: 1, alignItems: 'center', justifyContent: 'flex-end',
              // the strip is a control row, so it clears the 44pt target
              minHeight: TAP_MIN, paddingTop: SPACE.sm, gap: SPACE.sm,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Text numberOfLines={1} style={{
              fontSize: 13.5, letterSpacing: -0.1,
              fontWeight: on ? '800' : '600',
              color: on ? theme.accentInk : theme.muted,
            }}>{t.label}</Text>
            <View style={{
              width: '100%', height: 2.5, borderRadius: 2,
              backgroundColor: on ? theme.accent : 'transparent',
            }} />
          </Pressable>
        );
      })}
    </View>
  );
}
