import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN } from '../theme/tokens';
import { MESSAGE_TOKENS } from '../data/message';

/**
 * The details a person can drop into a course's wording, as things to TAP.
 *
 * WHY THIS EXISTS
 * The wording supports thirteen `{{token}}` substitutions and, until this
 * component, the app listed them NOWHERE -- `MESSAGE_TOKENS` was exported and
 * read only by its own spec. The one hint on the screen was the subject
 * placeholder. So personalising a message required already knowing a syntax
 * that nothing taught, and the two safety nets around it (the live preview and
 * the stray-token warning) both catch only a token you have already guessed.
 * Neither helps somebody who does not know `{{consecutive_missed}}` exists.
 *
 * WRITTEN FOR SOMEBODY WHO IS NOT TECHNICAL, which decided three things:
 *
 *   1. The chip says "Her first name", never `{{first_name}}`. The token is
 *      the machine's business. `means` -- the fuller phrase -- goes to the
 *      accessibility label, so what a screen reader hears is not the clipped
 *      version a chip row has room for.
 *   2. ONE ROW PER FIELD, each inserting into the field directly above it.
 *      A single shared row targeting "whichever field you touched last" is
 *      one row shorter and carries hidden state, and hidden state is exactly
 *      what this component exists to remove.
 *   3. Tapping SPACES the token correctly (see `insertToken`), because
 *      somebody who types "Hi," and taps a chip means "Hi, Divya".
 *
 * The chips are deliberately NOT toggles. They mirror the frequency-day chips
 * in the same form for shape, size and border, and drop the selected state --
 * a token can be inserted many times or not at all, and there is nothing here
 * that is "on".
 */
export function TokenChips({ label, onInsert, testIDPrefix }: {
  /** names the field these insert into -- read aloud, and never hidden state */
  label: string;
  onInsert: (token: string) => void;
  testIDPrefix: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ marginTop: SPACE.sm }} accessibilityRole="toolbar" accessibilityLabel={label}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ gap: 6, paddingRight: SPACE.md }}>
        {MESSAGE_TOKENS.map(t => (
          <Pressable key={t.token} testID={`${testIDPrefix}-${t.token.slice(2, -2)}`}
            onPress={() => onInsert(t.token)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${t.means}`}
            style={({ pressed }) => ({
              height: TAP_MIN, paddingHorizontal: SPACE.md, borderRadius: RADIUS.sm,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: theme.surface,
              borderWidth: 1, borderColor: theme.lineStrong,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.fg }}>{t.chip}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
