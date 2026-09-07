import { useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN } from '../theme/tokens';
import { MESSAGE_TOKENS, EVERYDAY_TOKENS } from '../data/message';
import { Icon } from './Icon';
import { chipScroll, nextChipOffset } from './chipScroll';

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
 *
 * SEVEN FIRST, THIRTEEN ON REQUEST
 * Offering all thirteen at once turned out to be its own defect. Somebody who
 * opened this to change a sentence read the row as thirteen suggestions and
 * tapped along it, and the wording came out as "RosiFit Academy Main — 0 —":
 * every token resolved exactly as designed, and the message was worse for each
 * one. The row now opens on the seven the academy's default template already
 * uses -- the ones that make a follow-up read as a follow-up -- and the six
 * figures sit behind one more chip.
 *
 * NOTHING IS REMOVED, and that is the difference between this and shortening
 * the list. Wording already written with `{{attendance_pct}}` still resolves
 * everywhere; the token is simply not pressed on somebody who did not ask for
 * it. The count of what is hidden is ON the chip ("6 more details"), so the
 * row still says out loud that it continues -- which is the belief this
 * component exists to correct.
 *
 * WHY THE ARROWS
 * Listing the details fixed only half of the problem. The row is a horizontal
 * scroller with its scrollbar hidden, and at the dialog's width it shows five
 * of them -- so a reader who does not think to drag a row sideways still
 * concludes those five are all there are, which is the exact belief this
 * component was built to correct. The arrows are the row saying, without
 * being dragged, that it continues.
 *
 * They step a PAGE at a time and they are never decorative: absent entirely
 * when every chip already fits, and disabled at the end they point at. An
 * arrow that is tappable and does nothing is the same silence in a new shape.
 * Dragging the row still works exactly as before -- the arrows are a second
 * way in, not a replacement.
 */
export function TokenChips({ label, onInsert, testIDPrefix }: {
  /** names the field these insert into -- read aloud, and never hidden state */
  label: string;
  onInsert: (token: string) => void;
  testIDPrefix: string;
}) {
  const { theme } = useTheme();
  const row = useRef<ScrollView>(null);
  // All three start unmeasured. `chipScroll` reads that as "no arrows yet"
  // rather than "a row of width zero" -- see the note in chipScroll.ts.
  const [offset, setOffset] = useState(0);
  const [content, setContent] = useState(0);
  const [view, setView] = useState(0);
  // Starts closed on every open of the form. A row that remembered would show
  // thirteen chips to the next person for a reason they never saw.
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? MESSAGE_TOKENS : EVERYDAY_TOKENS;
  const hidden = MESSAGE_TOKENS.length - EVERYDAY_TOKENS.length;

  const { overflows, canLeft, canRight } = chipScroll(offset, content, view);

  const move = (direction: -1 | 1) => {
    const to = nextChipOffset(direction, offset, content, view);
    // Set it here as well as in `onScroll`: the arrow that just went dead
    // should look dead the moment it is tapped, not when the animation ends.
    setOffset(to);
    row.current?.scrollTo({ x: to, animated: true });
  };

  const arrow = (direction: -1 | 1, icon: string, name: string, live: boolean) => (
    <Pressable
      testID={`${testIDPrefix}-${direction < 0 ? 'left' : 'right'}`}
      disabled={!live}
      onPress={() => move(direction)}
      accessibilityRole="button"
      accessibilityState={{ disabled: !live }}
      accessibilityLabel={`${label}: ${name}`}
      style={({ pressed }) => ({
        width: TAP_MIN, height: TAP_MIN, borderRadius: RADIUS.sm,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.surface,
        borderWidth: 1, borderColor: live ? theme.lineStrong : theme.line,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={22} color={live ? theme.fgStrong : theme.dim} />
    </Pressable>
  );

  return (
    <View style={{ marginTop: SPACE.sm, flexDirection: 'row', alignItems: 'center', gap: 6 }}
      accessibilityRole="toolbar" accessibilityLabel={label}>
      {overflows ? arrow(-1, 'chevron_left', 'earlier details', canLeft) : null}
      <ScrollView
        ref={row}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        scrollEventThrottle={16}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
          setOffset(e.nativeEvent.contentOffset.x)}
        onLayout={(e: LayoutChangeEvent) => setView(e.nativeEvent.layout.width)}
        onContentSizeChange={w => setContent(w)}
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 6, paddingRight: SPACE.md }}>
        {shown.map(t => (
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
        {/* The last chip in the row, not a control beside it: it is reached by
            the same drag and the same arrows as the details it reveals, and it
            NAMES the number it is hiding. "More" alone would leave the reader
            guessing whether it is worth a tap. */}
        {hidden > 0 ? (
          <Pressable testID={`${testIDPrefix}-more`}
            onPress={() => setShowAll(v => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAll }}
            accessibilityLabel={showAll
              ? `${label}: show the everyday details only`
              : `${label}: show ${hidden} more details`}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 4,
              height: TAP_MIN, paddingHorizontal: SPACE.md, borderRadius: RADIUS.sm,
              justifyContent: 'center',
              backgroundColor: theme.control,
              borderWidth: 1, borderColor: theme.lineStrong,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Icon name={showAll ? 'expand_less' : 'expand_more'} size={16} color={theme.accentInk} />
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>
              {showAll ? 'Fewer' : `${hidden} more`}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {overflows ? arrow(1, 'chevron_right', 'more details', canRight) : null}
    </View>
  );
}
