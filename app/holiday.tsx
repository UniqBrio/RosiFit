import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Muted, Label, Button } from '../src/components/ui';
import { Field } from '../src/components/Field';
import { DateField, formatDate } from '../src/components/DateTimePicker';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../src/theme/tokens';

/**
 * C-91: a holiday is a CLOSURE over a date range, not a cancellation. The
 * screen shows the impact before anything is applied, and says out loud what
 * it will NOT do -- the three guarantees C-92 makes.
 */
const SCOPES = [
  { key: 'All branches', label: 'All branches',
    desc: 'Every branch closes on these dates — a public holiday.' },
  { key: 'Coimbatore', label: 'Coimbatore only',
    desc: 'Other branches keep running. A local closure.' },
];

export default function Holiday() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [scope, setScope] = useState('All branches');

  const reversed = !!(start && end && end < start);
  const valid = name.trim().length > 0 && start.length > 0 && !reversed;
  const count = scope === 'All branches' ? 14 : 6;
  const impact = scope === 'All branches'
    ? [{ label: 'Prenatal Flow · Coimbatore', n: 6 },
       { label: 'Postnatal Core · Madurai', n: 5 },
       { label: 'Trimester 3 Gentle · Chennai', n: 3 }]
    : [{ label: 'Prenatal Flow · Coimbatore', n: 6 }];

  const holidayInk = theme.isDark ? STATUS.holiday.fgDark : STATUS.holiday.fgLight;
  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;
  const cancelInk = theme.isDark ? STATUS.cancelled.fgDark : STATUS.cancelled.fgLight;

  const apply = () => {
    if (!valid) { flash('A name and a start date are needed', 'warn'); return; }
    router.back();
    flash(`${name.trim() || 'Holiday'} applied · ${count} sessions marked Holiday`);
  };

  return (
    <Screen>
      <Muted style={{ marginBottom: SPACE.lg }}>A closure, not a cancellation</Muted>

      <Field label="Name or reason" value={name} onChange={setName} placeholder="e.g. Diwali" />

      {/* Pickers, not typed dates. Both values are ISO yyyy-mm-dd, which is
          what holidays.start_date / end_date take, so there is no format to
          get wrong and no parse to fail. The end picker will not offer a day
          before the start, which is the same rule as the CHECK constraint --
          stated once in the control instead of only caught at save. */}
      <View style={{ flexDirection: 'row', gap: SPACE.md }}>
        <View style={{ flex: 1 }}>
          <DateField label="Start date" value={start} onChange={setStart}
            placeholder="First day" testID="holiday-start-date" />
        </View>
        <View style={{ flex: 1 }}>
          <DateField label="End date" value={end} onChange={setEnd}
            placeholder="Last day" min={start || undefined} testID="holiday-end-date"
            error={reversed ? 'The end date falls before the start date. Fix it and the impact recalculates.' : undefined} />
        </View>
      </View>
      {!reversed && (
        <Muted style={{ marginTop: -4 }}>
          {start && !end
            ? `One day only? Put ${formatDate(start)} in both.`
            : 'One day? Choose the same date in both.'}
        </Muted>
      )}

      <Label style={{ marginTop: SPACE.xl }}>Scope</Label>
      <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
        {SCOPES.map(s => {
          const on = scope === s.key;
          const box = statusSurface(holidayInk);
          return (
            <Pressable key={s.key} onPress={() => setScope(s.key)}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              accessibilityLabel={`${s.label}. ${s.desc}`}
              style={{
                flexDirection: 'row', gap: SPACE.md, padding: SPACE.lg, minHeight: TAP_MIN,
                borderRadius: RADIUS.lg, backgroundColor: on ? box.bg : theme.surface,
                borderWidth: 1.5, borderColor: on ? holidayInk : theme.line,
              }}>
              <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'}
                size={20} color={on ? holidayInk : theme.muted} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: theme.fgStrong }}>{s.label}</Text>
                <Text style={{ fontSize: 12, color: theme.muted, marginTop: 3, lineHeight: 17 }}>{s.desc}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* the impact, BEFORE the act -- what will be marked and what will not */}
      <View style={{
        marginTop: SPACE.xl, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
      }}>
        <Label>Before you apply</Label>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm, marginTop: SPACE.md }}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: holidayInk, fontVariant: ['tabular-nums'] }}>
            {count}
          </Text>
          <Text style={{ flex: 1, fontSize: 13, color: theme.fg }}>
            scheduled sessions will be marked as Holiday
          </Text>
        </View>
        <View style={{ marginTop: SPACE.md, gap: 7 }}>
          {impact.map(i => (
            <View key={i.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, fontSize: 12.5, color: theme.fg }}>{i.label}</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
                {i.n}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: SPACE.lg, gap: 7, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: theme.line }}>
          {['No completed session is affected.',
            'No member’s recurring schedule is changed — these dates only.',
            'Not expected, not missed, no streak, no follow-up.'].map(t => (
            <View key={t} style={{ flexDirection: 'row', gap: SPACE.sm, alignItems: 'flex-start' }}>
              <Icon name="check" size={15} color={okInk} />
              <Muted style={{ flex: 1 }}>{t}</Muted>
            </View>
          ))}
        </View>
      </View>

      {/* C-93: cancellation is a different act and stays one */}
      <View style={{
        marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
        flexDirection: 'row', gap: SPACE.md,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <Icon name="block" size={19} color={cancelInk} />
        <Muted style={{ flex: 1 }}>
          Cancelling one session is a different thing — do that from the session itself on the Attendance
          tab. Both are non-countable; they are recorded separately.
        </Muted>
      </View>

      <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.xl }}>
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
        <Button label="Apply holiday" onPress={apply} disabled={!valid} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}
