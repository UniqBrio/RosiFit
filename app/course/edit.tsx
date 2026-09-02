import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Label, Button } from '../../src/components/ui';
import { Field } from '../../src/components/Field';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../../src/theme/tokens';
import { COURSE_LIST } from '../../src/data/mock';

/**
 * C-56/C-57: a course is WHAT you teach, not when. The default time here is
 * only a default for new offerings; weekdays and fees live on the offering,
 * and this screen says so instead of collecting them.
 */
export default function CourseEdit() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = COURSE_LIST.find(c => c.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [start, setStart] = useState(existing?.start_time ?? '');
  const [end, setEnd] = useState(existing?.end_time ?? '');
  const [freq, setFreq] = useState(existing?.frequency ?? 3);

  const valid = name.trim().length >= 2;
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  const save = () => {
    if (!valid) return;
    flash(`${name.trim()} saved · add an offering to give it a schedule`);
    router.back();
  };

  return (
    <Screen>
      <Muted style={{ marginBottom: SPACE.lg }}>What you teach, not when</Muted>

      <Field label="Course name" value={name} onChange={setName} placeholder="e.g. Gentle Recovery Yoga" />

      <View style={{ flexDirection: 'row', gap: SPACE.md }}>
        <View style={{ flex: 1 }}>
          <Field label="Start time" value={start} onChange={setStart} placeholder="6:00 AM" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="End time" value={end} onChange={setEnd} placeholder="7:00 AM" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: SPACE.sm, alignItems: 'flex-start', marginTop: -4 }}>
        <Icon name="schedule" size={15} color={theme.accentInk} />
        <Muted style={{ flex: 1 }}>
          Used as the default when you add this course at a branch. Existing offerings keep their own times.
        </Muted>
      </View>

      <Label style={{ marginTop: SPACE.xl }}>Frequency</Label>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.md,
        padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: theme.lineStrong,
      }}>
        <Text style={{ flex: 1, fontSize: 14, color: theme.fg }}>Intended sessions per week</Text>
        <Stepper value={freq} onChange={setFreq} min={1} max={7} />
      </View>

      <View style={{
        marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
        flexDirection: 'row', gap: SPACE.md,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <Icon name="rule" size={18} color={theme.accentInk} />
        {/* C-57: intent, never the denominator */}
        <Muted style={{ flex: 1 }}>
          Frequency states your intent. Attendance is never counted from it — it comes from the weekdays
          on each offering. If an offering runs fewer days, the offering screen says so and keeps counting
          the real days.
        </Muted>
      </View>

      <View style={{
        marginTop: SPACE.sm, padding: SPACE.lg, borderRadius: RADIUS.lg,
        flexDirection: 'row', gap: SPACE.md,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <Icon name="event_busy" size={18} color={ink('holiday')} />
        <Muted style={{ flex: 1 }}>
          No weekdays and no fee here. Create an offering — the course at one branch — and set its days there.
        </Muted>
      </View>

      <Button label={existing ? 'Save Course' : 'Add Course'} onPress={save} disabled={!valid}
        style={{ marginTop: SPACE.xl }} />
      <Muted style={{ marginTop: 9, textAlign: 'center' }}>
        {valid ? 'Saved with no offerings — it has no schedule until it runs somewhere'
               : 'A course name is needed'}
      </Muted>
    </Screen>
  );
}

function Stepper({ value, onChange, min, max }:
  { value: number; onChange: (n: number) => void; min: number; max: number }) {
  const { theme } = useTheme();
  const btn = (label: string, delta: number, disabled: boolean) => (
    <Pressable onPress={() => onChange(value + delta)} disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={delta > 0 ? 'Increase frequency' : 'Decrease frequency'}
      accessibilityState={{ disabled }}
      style={{
        width: TAP_MIN, height: TAP_MIN - 6, borderRadius: RADIUS.sm,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: disabled ? theme.control : theme.surface2,
        borderWidth: 1, borderColor: theme.lineStrong,
      }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: disabled ? theme.dim : theme.fgStrong }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
      {btn('−', -1, value <= min)}
      <Text
        accessibilityLiveRegion="polite"
        style={{ width: 34, textAlign: 'center', fontSize: 18, fontWeight: '800',
          color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      {btn('+', +1, value >= max)}
    </View>
  );
}
