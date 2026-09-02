import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE, TAP_MIN } from '../theme/tokens';
import { iso, parseISO } from '../data/period';

/**
 * The date and time pickers the forms were missing.
 *
 * Every date field in this app was a free TextInput with a `dd-MMM-yy`
 * placeholder, which puts the burden of the format on the person typing and
 * accepts "20/10/26", "tomorrow" and "" alike. A picker removes the format
 * question entirely: the value the screen holds is always ISO (`yyyy-mm-dd`
 * for dates, `HH:MM` 24-hour for times, which is what Postgres `date` and
 * `time` take), and what is READ is the local, unambiguous long form.
 *
 * Built from React Native primitives rather than a native module, because
 * this is a PWA first: @react-native-community/datetimepicker renders
 * nothing on web, and a picker that silently does not open on the platform
 * the academy actually uses is worse than the text field it replaced.
 *
 * `MonthCalendar` is the grid itself, exported because the period filter
 * dates a RANGE inside a dropdown rather than one day inside a sheet. One
 * grid, two hosts -- a second copy is how two calendars end up disagreeing
 * about which day is today or where the week starts.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** '2026-10-20' -> '20 Oct 2026'. An empty value stays empty. */
export function formatDate(value: string): string {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return `${d} ${MON_SHORT[m - 1]} ${y}`;
}

/** '18:30' -> '6:30 PM'. The 24-hour value is what is stored. */
export function formatTime(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function PickerRow({ label, display, placeholder, icon, hint, error, onPress, testID }:
  { label: string; display: string; placeholder: string; icon: string;
    hint?: string; error?: string; onPress: () => void; testID: string }) {
  const { theme } = useTheme();
  const filled = display.length > 0;
  return (
    <View style={{ marginBottom: SPACE.md }}>
      <Text style={{
        fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
        color: theme.muted, marginBottom: 6,
      }}>{label}</Text>
      <Pressable
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${filled ? display : 'Nothing chosen'}. Opens a picker`}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
          minHeight: TAP_MIN + 8, paddingHorizontal: SPACE.lg,
          borderWidth: 1, borderRadius: RADIUS.md,
          borderColor: error ? theme.danger : theme.lineStrong,
          backgroundColor: theme.surface,
          opacity: pressed ? 0.75 : 1,
        })}>
        <Icon name={icon} size={19} color={theme.accentInk} />
        <Text style={{
          flex: 1, fontSize: 15,
          fontWeight: filled ? '700' : '400',
          color: filled ? theme.fgStrong : theme.muted,
        }}>{filled ? display : placeholder}</Text>
        <Icon name="arrow_drop_down" size={20} color={theme.muted} />
      </Pressable>
      {error
        ? <Text accessibilityLiveRegion="polite" style={{ fontSize: 12, color: theme.danger, marginTop: 5 }}>{error}</Text>
        : hint ? <Text style={{ fontSize: 12, color: theme.muted, marginTop: 5, lineHeight: 17 }}>{hint}</Text> : null}
    </View>
  );
}

/**
 * A month grid. `value` and `onChange` speak ISO `yyyy-mm-dd`; '' means
 * nothing is chosen yet, which is a real state and not the same as today.
 */

/**
 * A Monday-start month grid, one day or a span of them.
 *
 * `from`/`to` are ISO and may be the same day; `to` empty means only a start
 * is chosen, which is a real state during a range pick and is drawn as such
 * rather than as a finished one-day range.
 */
export function MonthCalendar({ from, to = '', onPick, min, max, testID }:
  { from: string; to?: string; onPick: (value: string) => void;
    /** ISO bounds. A day outside them is shown, unpressable, so the reason
     *  it cannot be chosen is visible rather than the day being missing. */
    min?: string; max?: string; testID: string }) {
  const { theme } = useTheme();
  const today = new Date();
  const [cursor, setCursor] = useState(() => {
    const start = parseISO(from) ?? today;
    return { year: start.getFullYear(), month: start.getMonth() };
  });

  // Monday-start, because every week in this app runs Mon-Sun.
  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const pad = (first.getDay() + 6) % 7;
    const days = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const out: (string | null)[] = Array.from({ length: pad }, () => null);
    for (let d = 1; d <= days; d++) out.push(iso(new Date(cursor.year, cursor.month, d)));
    return out;
  }, [cursor]);

  const step = (delta: number) => setCursor(c => {
    const d = new Date(c.year, c.month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const blocked = (value: string) => (!!min && value < min) || (!!max && value > max);

  const arrow = (icon: string, delta: number, name: string) => (
    <Pressable testID={`${testID}-${name.toLowerCase()}`} onPress={() => step(delta)}
      accessibilityRole="button" accessibilityLabel={`${name} month`}
      style={({ pressed }) => ({
        width: TAP_MIN, height: TAP_MIN, borderRadius: RADIUS.md,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={22} color={theme.fgStrong} />
    </Pressable>
  );

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
        {arrow('chevron_left', -1, 'Previous')}
        <Text accessibilityLiveRegion="polite" style={{
          flex: 1, textAlign: 'center', fontSize: 15.5, fontWeight: '800', color: theme.fgStrong,
        }}>{`${MONTHS[cursor.month]} ${cursor.year}`}</Text>
        {arrow('chevron_right', +1, 'Next')}
      </View>

      <View style={{ flexDirection: 'row', marginTop: SPACE.md }}>
        {DOW.map(d => (
          <Text key={d} style={{
            flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: '700',
            letterSpacing: 0.5, color: theme.muted,
          }}>{d}</Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACE.sm }}>
        {cells.map((value, i) => {
          if (!value) return <View key={`pad${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }} />;
          const day = Number(value.slice(8));
          const isEnd = value === from || (!!to && value === to);
          const inside = !!to && value > from && value < to;
          const isToday = value === iso(today);
          const off = blocked(value);
          // The two ends carry the accent and the days between carry the
          // softer control tint, so a span reads as a span rather than as
          // separate picks -- both are measured pairs (guardrail 2).
          const bg = isEnd ? theme.accent : inside ? theme.control : off ? 'transparent' : theme.surface2;
          const ink = isEnd ? theme.onAccent : inside ? theme.accentInk : off ? theme.dim : theme.fgStrong;
          // the range membership is spoken, not left to the fill alone
          const edge = value === from ? ', start of the range'
            : (!!to && value === to) ? ', end of the range'
            : inside ? ', inside the range' : '';
          return (
            <View key={value} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
              <Pressable
                testID={`${testID}-day-${value}`}
                onPress={() => onPick(value)} disabled={off}
                accessibilityRole="button"
                accessibilityState={{ selected: isEnd || inside, disabled: off }}
                accessibilityLabel={`${formatDate(value)}${isToday ? ', today' : ''}${edge}${off ? ', not available' : ''}`}
                style={({ pressed }) => ({
                  flex: 1, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: bg, borderWidth: 1,
                  borderColor: isEnd ? theme.accent : isToday ? theme.accentInk : inside ? theme.control : theme.line,
                  opacity: off ? 0.4 : pressed ? 0.7 : 1,
                })}>
                <Text style={{
                  fontSize: 13.5, fontWeight: isEnd ? '800' : '600',
                  fontVariant: ['tabular-nums'], color: ink,
                }}>{day}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * One day, in a sheet. `value` and `onChange` speak ISO `yyyy-mm-dd`; ''
 * means nothing is chosen yet, which is a real state and not the same as
 * today.
 */
export function DateField({ label, value, onChange, placeholder = 'Choose a date', hint, error, min, max, testID }:
  { label: string; value: string; onChange: (value: string) => void;
    placeholder?: string; hint?: string; error?: string;
    min?: string; max?: string; testID: string }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const today = new Date();

  const pick = (chosen: string) => { onChange(chosen); setOpen(false); };

  return (
    <>
      <PickerRow label={label} display={formatDate(value)} placeholder={placeholder}
        icon="calendar_today" hint={hint} error={error} onPress={() => setOpen(true)} testID={testID} />

      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ marginTop: SPACE.lg }}>
          <MonthCalendar from={value} onPick={pick} min={min} max={max} testID={testID} />
        </View>

        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.lg }}>
          <Pressable testID={`${testID}-today`} onPress={() => pick(iso(today))}
            accessibilityRole="button" accessibilityLabel="Choose today"
            style={({ pressed }) => ({
              flex: 1, minHeight: TAP_MIN, borderRadius: RADIUS.md,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm,
              backgroundColor: theme.control, borderWidth: 1, borderColor: theme.lineStrong,
              opacity: pressed ? 0.75 : 1,
            })}>
            <Icon name="today" size={18} color={theme.accentInk} />
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.fgStrong }}>Today</Text>
          </Pressable>
          <Pressable testID={`${testID}-clear`} onPress={() => { onChange(''); setOpen(false); }}
            accessibilityRole="button" accessibilityLabel={`Clear ${label}`}
            style={({ pressed }) => ({
              flex: 1, minHeight: TAP_MIN, borderRadius: RADIUS.md,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: theme.lineStrong,
              opacity: pressed ? 0.75 : 1,
            })}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.fg }}>Clear</Text>
          </Pressable>
        </View>
      </Sheet>
    </>
  );
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/**
 * Hour · minute · AM/PM, in three columns. `value` and `onChange` speak
 * 24-hour `HH:MM`, which is what `time` columns take; nothing here parses a
 * typed string, so there is no format to get wrong.
 */
export function TimeField({ label, value, onChange, placeholder = 'Choose a time', hint, error, testID }:
  { label: string; value: string; onChange: (hhmm: string) => void;
    placeholder?: string; hint?: string; error?: string; testID: string }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  const [h24, mins] = value ? value.split(':').map(Number) : [9, 0];
  const hour12 = ((h24 + 11) % 12) + 1;
  const pm = h24 >= 12;

  const emit = (nextHour: number, nextMin: number, nextPm: boolean) => {
    const h = (nextHour % 12) + (nextPm ? 12 : 0);
    onChange(`${String(h).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`);
  };

  const column = (
    title: string,
    items: number[],
    current: number,
    label2: (n: number) => string,
    onPick: (n: number) => void,
    name: string,
  ) => (
    <View style={{ flex: 1 }}>
      <Text style={{
        fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase',
        color: theme.muted, textAlign: 'center', marginBottom: SPACE.sm,
      }}>{title}</Text>
      <ScrollView style={{ maxHeight: 210 }} contentContainerStyle={{ gap: 5 }}>
        {items.map(n => {
          const on = n === current;
          return (
            <Pressable key={n} testID={`${testID}-${name}-${n}`} onPress={() => onPick(n)}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              accessibilityLabel={`${title} ${label2(n)}`}
              style={({ pressed }) => ({
                minHeight: TAP_MIN, alignItems: 'center', justifyContent: 'center',
                borderRadius: RADIUS.sm,
                backgroundColor: on ? theme.accent : theme.surface2,
                borderWidth: 1, borderColor: on ? theme.accent : theme.line,
                opacity: pressed ? 0.75 : 1,
              })}>
              <Text style={{
                fontSize: 15, fontWeight: on ? '800' : '600', fontVariant: ['tabular-nums'],
                color: on ? theme.onAccent : theme.fgStrong,
              }}>{label2(n)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <>
      <PickerRow label={label} display={formatTime(value)} placeholder={placeholder}
        icon="schedule" hint={hint} error={error} onPress={() => setOpen(true)} testID={testID} />

      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <Text accessibilityLiveRegion="polite" style={{
          fontSize: 24, fontWeight: '800', color: theme.accentInk,
          marginTop: SPACE.md, fontVariant: ['tabular-nums'],
        }}>{value ? formatTime(value) : formatTime('09:00')}</Text>

        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.lg }}>
          {column('Hour', HOURS, hour12, n => String(n),
            n => emit(n, mins, pm), 'hour')}
          {column('Minute', MINUTES, mins, n => String(n).padStart(2, '0'),
            n => emit(hour12, n, pm), 'minute')}
          <View style={{ width: 74 }}>
            <Text style={{
              fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase',
              color: theme.muted, textAlign: 'center', marginBottom: SPACE.sm,
            }}>AM/PM</Text>
            <View style={{ gap: 5 }}>
              {([['AM', false], ['PM', true]] as const).map(([text, isPm]) => {
                const on = pm === isPm;
                return (
                  <Pressable key={text} testID={`${testID}-${text.toLowerCase()}`}
                    onPress={() => emit(hour12, mins, isPm)}
                    accessibilityRole="radio" accessibilityState={{ selected: on }}
                    accessibilityLabel={text}
                    style={({ pressed }) => ({
                      minHeight: TAP_MIN, alignItems: 'center', justifyContent: 'center',
                      borderRadius: RADIUS.sm,
                      backgroundColor: on ? theme.accent : theme.surface2,
                      borderWidth: 1, borderColor: on ? theme.accent : theme.line,
                      opacity: pressed ? 0.75 : 1,
                    })}>
                    <Text style={{
                      fontSize: 14, fontWeight: on ? '800' : '600',
                      color: on ? theme.onAccent : theme.fgStrong,
                    }}>{text}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.lg }}>
          <Pressable testID={`${testID}-clear`} onPress={() => { onChange(''); setOpen(false); }}
            accessibilityRole="button" accessibilityLabel={`Clear ${label}`}
            style={({ pressed }) => ({
              flex: 1, minHeight: TAP_MIN + 4, borderRadius: RADIUS.md,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: theme.lineStrong, opacity: pressed ? 0.75 : 1,
            })}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.fg }}>Clear</Text>
          </Pressable>
          <Pressable
            testID={`${testID}-done`}
            onPress={() => { if (!value) emit(9, 0, false); setOpen(false); }}
            accessibilityRole="button" accessibilityLabel={`Use this time for ${label}`}
            style={({ pressed }) => ({
              flex: 1, minHeight: TAP_MIN + 4, borderRadius: RADIUS.md,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1,
            })}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.onAccent }}>Done</Text>
          </Pressable>
        </View>
      </Sheet>
    </>
  );
}
