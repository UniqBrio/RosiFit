import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { SPACE, RADIUS, TAP_MIN } from '../theme/tokens';
import { freshnessOf, JUST_NOW_MS } from '../data/freshness';
import { isWriteInFlight } from '../data/inFlight';

/**
 * HOW OLD IS WHAT YOU ARE LOOKING AT — one line, one wording, every screen.
 *
 * THE REGRESSION THIS CLOSES. `asyncState.ts` made a failed REFRESH keep the
 * last good answer instead of blanking the screen. That is right, and it is
 * what was asked for: losing the register because a background refresh could
 * not reach the server is the worse trade. But it was SILENT. Nineteen
 * screens read `.error` only behind a `state === 'error'` guard, so on every
 * one of them a refresh that failed left data of unbounded age on screen,
 * presented exactly as though it were current. A fallback whose output cannot
 * be told from a good one is worse than the staleness it was protecting
 * against.
 *
 * WHY PER SCREEN AND NOT ONE BANNER OVER THE APP. That was the first answer
 * here, and the fresh-context review took it apart: a single banner has to
 * aggregate every MOUNTED read, and `app/(tabs)/_layout.tsx` is a `Tabs`
 * navigator that keeps a tab alive once visited, with dialogs keeping the
 * screen beneath them live too. So "Last updated 9:40 AM" could be the age of
 * an invisible Overview read while the Attendance screen in front of you said
 * "Updated just now" — two contradictory claims on one screen — and a retry
 * could make the stated age jump BACKWARDS as more reads failed. A timestamp
 * is a claim about one read. It belongs next to that read.
 *
 * THE FOUR STATES are decided once, in `src/data/freshness.ts`, so a screen
 * cannot invent a fifth and two screens cannot word one differently.
 *
 * Renders nothing at all when there is nothing honest to say — before the
 * first answer lands, and on a first load that failed, which has its own
 * error screen and needs no second opinion from this line.
 *
 * COLOUR IS NEVER THE ONLY SIGNAL (guardrail 3): the sentence says
 * "Couldn't refresh" in words, and the icon repeats it.
 */
export function FreshnessLine({ read, testID }: {
  read: {
    state: 'loading' | 'ready' | 'error';
    error: string | null;
    isRevalidating: boolean;
    fetchedAt: number | null;
    retry: () => void;
  };
  testID?: string;
}): React.ReactElement | null {
  const { theme } = useTheme();
  const [now, setNow] = useState(() => Date.now());

  /* "Updated just now" becomes "Updated at 12:54 PM" as time passes, and a
     screen nobody touches never re-renders — so without this the line would
     be computed once and frozen on a claim that stops being true. Tied to the
     boundary it renders (JUST_NOW_MS) so the label can never be more than one
     step behind the rule that decides it. The tick moves a string; it fetches
     nothing. */
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), JUST_NOW_MS);
    return () => clearInterval(tick);
  }, []);

  const freshness = freshnessOf(read, now);
  if (!freshness.label) return null;

  const stale = freshness.kind === 'stale';
  const tone = stale ? theme.warning : theme.muted;

  return (
    <View
      testID={testID ?? 'freshness-line'}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
        marginTop: SPACE.md,
      }}>
      {/* The word carries the meaning; the icon is the second encoding and
          never the only one (CP-010). */}
      <Icon name={stale ? 'cloud_off' : 'schedule'} size={13} color={tone} />
      <Text style={{ flex: 1, fontSize: 12, fontWeight: stale ? '700' : '400', color: tone }}>
        {freshness.label}
      </Text>
      {stale ? (
        <Pressable
          testID={`${testID ?? 'freshness-line'}-retry`}
          accessibilityRole="button"
          accessibilityLabel="Try refreshing this data again"
          disabled={read.isRevalidating}
          onPress={() => {
            /* A PERSON ASKING STILL DOES NOT MAKE IT SAFE. An import is one
               transaction that writes a row per named member, sweeps the rest
               of the register absent, then reconciles the override; a read
               landing between those steps sees a register that was never
               true. `isWriteInFlight()` outranks the automatic path (T-021)
               and it outranks this one for the same reason. The write
               announces itself on the bus the moment it commits, so nothing
               is lost by declining here. */
            if (isWriteInFlight()) return;
            read.retry();
          }}
          style={({ pressed }) => ({
            minHeight: TAP_MIN, justifyContent: 'center',
            paddingHorizontal: SPACE.md, borderRadius: RADIUS.sm,
            opacity: pressed || read.isRevalidating ? 0.6 : 1,
          })}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: theme.accentInk }}>
            {read.isRevalidating ? 'Trying…' : 'Try again'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
