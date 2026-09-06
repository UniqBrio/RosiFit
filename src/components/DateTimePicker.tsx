import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { RequiredMark } from './RequiredMark';
import { AnchoredPanel, useAnchor } from './AnchoredPanel';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE, TAP_MIN } from '../theme/tokens';
import { iso, parseISO } from '../data/period';
import { monthCells, isOutside } from './monthGrid';

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
 * dates a RANGE inside a dropdown rather than one day inside a panel. One
 * grid, two hosts -- a second copy is how two calendars end up disagreeing
 * about which day is today or where the week starts.
 *
 * The grid sizes itself and stops (`CELL`, `GRID_MAX`). It used to take
 * whatever width its host had and draw SQUARE cells, so in a filter dropdown
 * as wide as a desktop window each day was a 260px tile and six rows of them
 * were four times the height of the panel: the month arrived cut off after
 * one row of empty cells. A day is now a fixed-height cell in a grid capped
 * at seven of them and centred, which is the same calendar on a phone as on
 * a 27-inch screen.
 */

/** One day cell. 48 leaves a 44pt tap target inside its 2px gutter (TAP_MIN). */
const CELL = 48;
/** Seven cells, and no wider however much room the host offers. */
const GRID_MAX = CELL * 7;

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

function PickerRow({ label, display, placeholder, icon, hint, error, onPress, testID, required, anchorRef }:
  { label: string; display: string; placeholder: string; icon: string;
    hint?: string; error?: string; onPress: () => void; testID: string;
    required?: boolean;
    /** The field the calendar hangs under. It is the ROW that is measured,
     *  not the label above it or the hint below, because the panel opens
     *  against the control the person just pressed. */
    anchorRef?: React.Ref<View> }) {
  const { theme } = useTheme();
  const filled = display.length > 0;
  return (
    <View style={{ marginBottom: SPACE.md }}>
      <Text style={{
        fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
        color: theme.muted, marginBottom: 6,
      }}>{label}{required ? <RequiredMark /> : null}</Text>
      <Pressable
        ref={anchorRef}
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}${required ? ', required' : ''}. ${filled ? display : 'Nothing chosen'}. Opens a picker`}
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
  /** The month and year list, in place of the days. A joining date four
   *  years back is 48 taps of the month arrow otherwise. */
  const [jump, setJump] = useState(false);

  // Six Monday-start weeks, the neighbouring months' days included. The
  // arithmetic lives in `monthGrid.ts` under its own spec: a grid off by one
  // day is off by one identically every month, so nothing looks wrong -- it
  // only shows as a person choosing the wrong date.
  const cells = useMemo(() => monthCells(cursor.year, cursor.month), [cursor]);

  const step = (delta: number) => setCursor(c => {
    const d = new Date(c.year, c.month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const blocked = (value: string) => (!!min && value < min) || (!!max && value > max);

  const arrow = (icon: string, name: string, onPress: () => void, unit: string) => (
    <Pressable testID={`${testID}-${name.toLowerCase()}${unit === 'year' ? '-year' : ''}`} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={`${name} ${unit}`}
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
    <View style={{ width: '100%', maxWidth: GRID_MAX, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
        {/* The month name is the way INTO the year, the way image two's
            header works. It stays the live region either way, so the month
            on show is announced however it was reached. */}
        <Pressable testID={`${testID}-jump`} onPress={() => setJump(j => !j)}
          accessibilityRole="button" accessibilityState={{ expanded: jump }}
          accessibilityLabel={`${MONTHS[cursor.month]} ${cursor.year}. ${jump ? 'Closes' : 'Opens'} the month and year list`}
          style={({ pressed }) => ({
            flex: 1, minHeight: TAP_MIN, borderRadius: RADIUS.md,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 2,
            paddingHorizontal: SPACE.sm,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Text accessibilityLiveRegion="polite" style={{
            fontSize: 15.5, fontWeight: '800', color: theme.fgStrong,
          }}>{`${MONTHS[cursor.month]} ${cursor.year}`}</Text>
          <Icon name={jump ? 'arrow_drop_up' : 'arrow_drop_down'} size={20} color={theme.muted} />
        </Pressable>
        {/* The month steps UP and DOWN, as in the calendar the requester
            pointed at -- the pair sits together on the right rather than
            bracketing the month name, so the name has the row's left edge
            to start at and stops moving as its length changes. */}
        {arrow('arrow_upward', 'Previous', () => step(-1), 'month')}
        {arrow('arrow_downward', 'Next', () => step(+1), 'month')}
      </View>

      {jump ? (
        <View style={{ marginTop: SPACE.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            {arrow('chevron_left', 'Previous', () => setCursor(c => ({ ...c, year: c.year - 1 })), 'year')}
            <Text accessibilityLiveRegion="polite" style={{
              flex: 1, textAlign: 'center', fontSize: 15.5, fontWeight: '800',
              fontVariant: ['tabular-nums'], color: theme.fgStrong,
            }}>{cursor.year}</Text>
            {arrow('chevron_right', 'Next', () => setCursor(c => ({ ...c, year: c.year + 1 })), 'year')}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACE.sm }}>
            {MON_SHORT.map((short, i) => {
              const on = i === cursor.month;
              return (
                <View key={short} style={{ width: '25%', height: CELL, padding: 2 }}>
                  <Pressable testID={`${testID}-month-${i + 1}`}
                    onPress={() => { setCursor(c => ({ ...c, month: i })); setJump(false); }}
                    accessibilityRole="radio" accessibilityState={{ selected: on }}
                    accessibilityLabel={`${MONTHS[i]} ${cursor.year}`}
                    style={({ pressed }) => ({
                      flex: 1, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: on ? theme.accent : theme.surface2,
                      borderWidth: 1, borderColor: on ? theme.accent : theme.line,
                      opacity: pressed ? 0.7 : 1,
                    })}>
                    <Text style={{
                      fontSize: 13, fontWeight: on ? '800' : '600',
                      color: on ? theme.onAccent : theme.fgStrong,
                    }}>{short}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
      <>
      <View style={{ flexDirection: 'row', marginTop: SPACE.md }}>
        {DOW.map(d => (
          <Text key={d} style={{
            flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: '700',
            letterSpacing: 0.5, color: theme.muted,
          }}>{d}</Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACE.sm }}>
        {cells.map(value => {
          const day = Number(value.slice(8));
          const isEnd = value === from || (!!to && value === to);
          const inside = !!to && value > from && value < to;
          const isToday = value === iso(today);
          const off = blocked(value);
          /** A day of the month either side of the one on show. */
          const outside = isOutside(value, cursor.year, cursor.month);
          // The two ends carry the accent and the days between carry the
          // softer control tint, so a span reads as a span rather than as
          // separate picks -- both are measured pairs (guardrail 2). A day
          // belonging to a neighbouring month is drawn without a tile at
          // all: it is legible, and it is plainly not part of this month
          // without the month having to be read.
          const bg = isEnd ? theme.accent : inside ? theme.control
            : off || outside ? 'transparent' : theme.surface2;
          const ink = isEnd ? theme.onAccent : inside ? theme.accentInk
            : off ? theme.dim : outside ? theme.muted : theme.fgStrong;
          // the range membership is spoken, not left to the fill alone
          const edge = value === from ? ', start of the range'
            : (!!to && value === to) ? ', end of the range'
            : inside ? ', inside the range' : '';
          return (
            <View key={value} style={{ width: `${100 / 7}%`, height: CELL, padding: 2 }}>
              <Pressable
                testID={`${testID}-day-${value}`}
                /* Picking a neighbouring day brings its month into view as
                   well as choosing it: the range picker stays open after a
                   pick, and a chosen day the grid no longer shows is a
                   selection nobody can see. */
                onPress={() => {
                  if (outside) {
                    const [y, m] = value.split('-').map(Number);
                    setCursor({ year: y, month: m - 1 });
                  }
                  onPick(value);
                }}
                disabled={off}
                accessibilityRole="button"
                accessibilityState={{ selected: isEnd || inside, disabled: off }}
                accessibilityLabel={`${formatDate(value)}${isToday ? ', today' : ''}${edge}${off ? ', not available' : ''}`}
                style={({ pressed }) => ({
                  flex: 1, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: bg, borderWidth: 1,
                  borderColor: isEnd ? theme.accent : isToday ? theme.accentInk
                    : inside ? theme.control : outside ? 'transparent' : theme.line,
                  opacity: off ? 0.4 : pressed ? 0.7 : 1,
                })}>
                <Text style={{
                  fontSize: 13.5, fontWeight: isEnd ? '800' : outside ? '500' : '600',
                  fontVariant: ['tabular-nums'], color: ink,
                }}>{day}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      </>
      )}
    </View>
  );
}

/** The card: the grid, its gutters, and its own border. */
const PANEL_W = GRID_MAX + SPACE.md * 2 + 2;
/** What the card takes when the month needs six rows. Its real height is its
 *  own; this is what the placement reserves so the last week is never off
 *  the bottom of the window. */
const PANEL_H = 430;

/*
 * The calendar hangs under the field it belongs to, in an `AnchoredPanel`
 * (its own module, since the course, branch, role and question pickers hang
 * the same way). The calendar is the one host that names its own width: the
 * grid is seven cells wide wherever it opens, so the panel is PANEL_W rather
 * than the field's width.
 */

/**
 * One day, in a panel under the field. `value` and `onChange` speak ISO
 * `yyyy-mm-dd`; '' means nothing is chosen yet, which is a real state and
 * not the same as today.
 */
export function DateField({ label, value, onChange, placeholder = 'Choose a date', hint, error, min, max, testID, required }:
  { label: string; value: string; onChange: (value: string) => void;
    placeholder?: string; hint?: string; error?: string;
    min?: string; max?: string; testID: string;
    /** Marks the date mandatory. TimeField deliberately has no such prop:
     *  no time field in this app blocks a save, and a prop nothing passes is
     *  a promise nothing keeps. */
    required?: boolean }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const row = useAnchor();
  const today = new Date();

  const pick = (chosen: string) => { onChange(chosen); setOpen(false); };

  const openPanel = () => { row.measure(); setOpen(true); };

  const footer = (name: string, text: string, spoken: string, onPress: () => void) => (
    <Pressable testID={`${testID}-${name}`} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={spoken}
      style={({ pressed }) => ({
        flex: 1, minHeight: TAP_MIN, borderRadius: RADIUS.md,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: theme.lineStrong,
        opacity: pressed ? 0.75 : 1,
      })}>
      <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.fg }}>{text}</Text>
    </Pressable>
  );

  return (
    <>
      <PickerRow label={label} display={formatDate(value)} placeholder={placeholder}
        icon="calendar_today" hint={hint} error={error} required={required}
        onPress={openPanel} testID={testID} anchorRef={row.ref} />

      <AnchoredPanel open={open} onClose={() => setOpen(false)} label={label}
        anchor={row.anchor} testID={testID} width={PANEL_W} height={PANEL_H}>
        <MonthCalendar from={value} onPick={pick} min={min} max={max} testID={testID} />

        {/* Clear on the left, Today on the right, as in the calendar the
            requester pointed at. Both are the words they always were. */}
        <View style={{
          flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md,
          width: '100%', maxWidth: GRID_MAX, alignSelf: 'center',
        }}>
          {footer('clear', 'Clear', `Clear ${label}`, () => { onChange(''); setOpen(false); })}
          {footer('today', 'Today', 'Choose today', () => pick(iso(today)))}
        </View>
      </AnchoredPanel>
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
