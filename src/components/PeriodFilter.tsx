import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE, TAP_MIN } from '../theme/tokens';
import { Icon } from './Icon';
import { DropdownItem } from './Dropdown';
import { MonthCalendar, formatDate } from './DateTimePicker';
import {
  PERIOD_PRESETS, CUSTOM_PERIOD, presetPeriod, resolvePeriod, iso,
  type PeriodChoice,
} from '../data/period';

/**
 * The date filter, in one place so every screen that has one offers the same
 * ranges (C-58/C-29) -- the four named ones AND a range somebody dates
 * themselves. "This week" and "This month" only answer the questions we
 * anticipated; a term, a camp, a month that already ended are all real
 * questions the named list cannot ask.
 *
 * The custom range is not applied until BOTH ends are picked. A half-picked
 * range would otherwise leave the screen labelled "Custom range" while it
 * still counted the previous period -- the exact drift C-84 exists to stop.
 *
 * The day that COMPLETES the range is the whole answer: it applies the range
 * and closes the panel, exactly as tapping one of the named ranges does.
 * There used to be a confirming button after it, and it confirmed nothing --
 * the range had already been applied by the tap before it, so all the button
 * did was ask for the same choice a second time (ADR-035).
 */

/** What the closed field shows: the name, or the dates when they are custom. */
export function periodFieldValue(choice: PeriodChoice): string {
  return choice.key === CUSTOM_PERIOD ? resolvePeriod(choice).label : choice.key;
}

export function PeriodPanel({ choice, onChange, onDone, testID }:
  {
    /**
     * The range in force, or `null` for "none of these is chosen".
     *
     * Null exists for the Audit log, the one screen whose honest default is
     * no date filter at all: it offers "Any date" above this panel, and
     * without a null the panel would go on marking a preset as Selected
     * beside it — two items claiming to be the choice in one radio group,
     * which is a false statement to the eye and to a screen reader alike.
     * Every other caller passes a real choice and renders exactly as before.
     */
    choice: PeriodChoice | null; onChange: (next: PeriodChoice) => void;
    onDone: () => void; testID: string }) {
  const { theme } = useTheme();
  const isCustom = choice?.key === CUSTOM_PERIOD;

  // The half-picked range lives here, not in the screen's applied choice.
  const [draft, setDraft] = useState<{ from: string; to: string }>(
    () => (choice && choice.key === CUSTOM_PERIOD)
      ? { from: choice.from, to: choice.to }
      : { from: '', to: '' });
  const [dating, setDating] = useState(isCustom);

  const pick = (day: string) => {
    // No start yet, a finished range, or a day before the start: this tap is
    // the new start. Otherwise it closes the range -- and the same day twice
    // is a single day, which is a range like any other.
    const next = (!draft.from || !!draft.to || day < draft.from)
      ? { from: day, to: '' }
      : { from: draft.from, to: day };
    setDraft(next);
    // Applied AND gone on the day that finishes the range. A start with no
    // end still changes nothing, which is the half of this that matters.
    if (next.to) {
      onChange({ key: CUSTOM_PERIOD, from: next.from, to: next.to });
      onDone();
    }
  };

  return (
    <>
      {PERIOD_PRESETS.map(key => (
        <DropdownItem key={key} label={key} meta={presetPeriod(key).label}
          selected={choice?.key === key}
          onPress={() => { setDating(false); onChange({ key }); onDone(); }}
          testID={`${testID}-${key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} />
      ))}

      <DropdownItem
        label={CUSTOM_PERIOD}
        meta={isCustom && choice ? resolvePeriod(choice).label : 'Pick any two days'}
        selected={isCustom}
        expandable expanded={dating}
        onPress={() => setDating(d => !d)}
        testID={`${testID}-custom`} />

      {dating ? (
        <View style={{
          marginTop: 2, padding: SPACE.md, borderRadius: RADIUS.md,
          backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
        }}>
          {/* what is chosen so far, in words -- an unfinished range says so
              rather than looking like a finished one */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.md }}>
            <Icon name="date_range" size={17} color={theme.accentInk} />
            <Text accessibilityLiveRegion="polite" style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: theme.fgStrong }}>
              {draft.from
                ? `${formatDate(draft.from)} → ${draft.to ? formatDate(draft.to) : 'pick the last day'}`
                : 'Pick the first day'}
            </Text>
          </View>

          <MonthCalendar from={draft.from} to={draft.to} onPick={pick}
            max={iso(new Date())} testID={`${testID}-calendar`} />

          <Text style={{ fontSize: 11.5, color: theme.muted, lineHeight: 17, marginTop: SPACE.md }}>
            Tap the first day, then the last. One day? Tap it twice. Days after today
            cannot be counted yet, so they are not offered.
          </Text>

          {/* Clear, and nothing beside it. The button that used to sit here
              only re-asked for a range the second tap had already applied. */}
          <View style={{ flexDirection: 'row', marginTop: SPACE.md }}>
            <Pressable
              testID={`${testID}-custom-clear`}
              onPress={() => setDraft({ from: '', to: '' })}
              accessibilityRole="button" accessibilityLabel="Clear the dates"
              style={({ pressed }) => ({
                flex: 1, minHeight: TAP_MIN, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: theme.lineStrong, opacity: pressed ? 0.75 : 1,
              })}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.fg }}>Clear</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </>
  );
}
