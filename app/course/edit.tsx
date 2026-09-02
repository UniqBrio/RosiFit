import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Label, Button, Skeleton, ErrorState } from '../../src/components/ui';
import { Field } from '../../src/components/Field';
import { TimeField } from '../../src/components/DateTimePicker';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../../src/theme/tokens';
import { useCourses } from '../../src/data/hooks';
import { createCourse, updateCourse, dataSource } from '../../src/data/repository';

/**
 * C-56/C-57: a course is WHAT you teach, not when. The default time here is
 * only a default for new offerings; weekdays and fees live on the offering,
 * and this screen says so instead of collecting them.
 *
 * WHAT WAS WRONG HERE
 * Save flashed "<name> saved" and called router.back(). It never wrote
 * anything: no Supabase call, no Edge Function, not even a change to the
 * fixture list. The course was reported saved and was gone the moment the
 * list refetched, which is the single worst shape a form can have -- it is
 * indistinguishable from a working one until somebody looks for the record.
 *
 * It now writes through repository.createCourse / updateCourse, waits for
 * the answer, and says what actually happened. A refusal (RLS: super admin
 * only, subscription writable) is SHOWN, because the person needs to know
 * the course is not there.
 */
export default function CourseEdit() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // Editing reads the same list every other screen reads, rather than a
  // second, fixtures-only copy -- the old COURSE_LIST lookup meant the edit
  // form could never open a course that came from the database.
  const courses = useCourses();
  const existing = courses.data?.find(c => c.id === id);
  const loadingExisting = !!id && courses.state === 'loading';

  const [name, setName] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [freq, setFreq] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // null means "not edited yet", so the loaded course shows through without
  // an effect that would clobber a half-typed name on every refetch.
  const nameValue = name ?? existing?.name ?? '';
  const startValue = start ?? existing?.start_time ?? '';
  const endValue = end ?? existing?.end_time ?? '';
  const freqValue = freq ?? existing?.frequency ?? 3;

  const reversedTimes = !!(startValue && endValue && endValue <= startValue);
  const valid = nameValue.trim().length >= 2 && !reversedTimes;
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setFailure(null);
    const input = {
      name: nameValue.trim(),
      start_time: startValue || null,
      end_time: endValue || null,
      frequency: freqValue,
    };
    try {
      if (existing) {
        await updateCourse(existing.id, input);
      } else {
        await createCourse(input);
      }
      // The write notifies every mounted course list (repository.onCoursesChanged),
      // so the Courses tab shows the course because it is IN the database,
      // not because this screen said so.
      router.back();
      flash(dataSource === 'live'
        ? `${input.name} saved · add an offering to give it a schedule`
        : `${input.name} saved on this device only — the academy database is not configured`,
        dataSource === 'live' ? 'ok' : 'warn');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'The course could not be saved. Nothing has been changed.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) return <Screen><Skeleton lines={4} /></Screen>;

  return (
    <Screen>
      <Muted style={{ marginBottom: SPACE.lg }}>What you teach, not when</Muted>

      <Field label="Course name" value={nameValue} onChange={setName} placeholder="e.g. Gentle Recovery Yoga" />

      <View style={{ flexDirection: 'row', gap: SPACE.md }}>
        <View style={{ flex: 1 }}>
          <TimeField label="Start time" value={startValue} onChange={setStart}
            placeholder="6:00 AM" testID="course-start-time" />
        </View>
        <View style={{ flex: 1 }}>
          <TimeField label="End time" value={endValue} onChange={setEnd}
            placeholder="7:00 AM" testID="course-end-time"
            error={reversedTimes ? 'The end time must be after the start time.' : undefined} />
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
        <Stepper value={freqValue} onChange={setFreq} min={1} max={7} />
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

      {/* A refused write is shown here rather than flashed away: the course is
          NOT saved, and the person has to be able to read why. */}
      {failure ? (
        <View style={{ marginTop: SPACE.lg }}>
          <ErrorState message={failure} onRetry={save} />
        </View>
      ) : null}

      <Button label={saving ? 'Saving…' : existing ? 'Save Course' : 'Add Course'}
        onPress={save} disabled={!valid || saving} style={{ marginTop: SPACE.xl }} />
      <Muted style={{ marginTop: 9, textAlign: 'center' }}>
        {!valid ? 'A course name of at least two characters is needed'
          : existing ? 'Changing the default time never touches an offering that already exists'
          : 'Saved with no offerings — it has no schedule until it runs somewhere'}
      </Muted>
    </Screen>
  );
}

function Stepper({ value, onChange, min, max }:
  { value: number; onChange: (n: number) => void; min: number; max: number }) {
  const { theme } = useTheme();
  const btn = (label: string, delta: number, disabled: boolean) => (
    <Pressable onPress={() => onChange(value + delta)} disabled={disabled}
      testID={`course-frequency-${delta > 0 ? 'up' : 'down'}`}
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
