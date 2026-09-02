import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Label, Button, Skeleton, ErrorState } from '../../src/components/ui';
import { TimeField, DateField } from '../../src/components/DateTimePicker';
import { DropdownRow, DropdownField, DropdownPanel, DropdownList } from '../../src/components/Dropdown';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../../src/theme/tokens';
import { DAY_NAMES } from '../../src/data/mock';
import { useOfferingEditor } from '../../src/data/hooks';
import { createOffering, setOfferingSchedule, dataSource } from '../../src/data/repository';

/**
 * WHERE a course runs, and on WHICH DAYS.
 *
 * WHAT WAS MISSING
 * The course form collects a frequency -- "3 sessions per week" -- and says,
 * correctly, that weekdays live on the offering and to "create an offering and
 * set its days there". There was no such screen, and no write path either:
 * 0005 left offering_schedules with a read policy and deliberately no
 * INSERT/UPDATE policy, noting that writes must go through an RPC that
 * validates against completed sessions. That RPC did not exist until 0018.
 *
 * So frequency was orphaned intent. A course could say "3 per week" and never
 * acquire the days it meant, which meant no sessions, no expected attendance
 * and no follow-up -- the whole engine downstream of it had nothing to run on.
 *
 * C-59/CR-07 hold here: the course's frequency and the offering's weekdays are
 * BOTH stored and neither is reconciled into the other. A mismatch warns; it
 * never silently rewrites one to match the other.
 */
const DAYS = [1, 2, 3, 4, 5, 6, 7];

export default function OfferingEdit() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { courseId, offeringId, state: forced } =
    useLocalSearchParams<{ courseId?: string; offeringId?: string; state?: string }>();

  const editor = useOfferingEditor(courseId ?? '', forced);
  const course = editor.data?.course ?? null;
  const branches = editor.data?.branches ?? [];
  const existing = editor.data?.offerings.find(o => o.id === offeringId) ?? null;

  // null means "not edited yet", so a loaded value shows through without an
  // effect that would clobber a half-made choice on every refetch.
  const [branchId, setBranchId] = useState<string | null>(null);
  const [days, setDays] = useState<number[] | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const branchValue = branchId ?? existing?.branch_id ?? '';
  const dayValue = days ?? existing?.weekdays ?? [];
  const fromValue = from ?? existing?.effective_from ?? today;
  const startValue = start ?? existing?.start_time ?? course?.start_time ?? '';
  const endValue = end ?? existing?.end_time ?? course?.end_time ?? '';

  const branchName = branches.find(b => b.id === branchValue)?.name ?? '';
  const reversedTimes = !!(startValue && endValue && endValue <= startValue);
  const valid = !!branchValue && dayValue.length > 0 && !!fromValue && !reversedTimes;

  const toggle = (d: number) =>
    setDays(dayValue.includes(d) ? dayValue.filter(x => x !== d) : [...dayValue, d].sort((a, b) => a - b));

  const save = async () => {
    if (!valid || saving || !courseId) return;
    setSaving(true);
    setFailure(null);
    try {
      // Create first, then schedule. An offering with no schedule is a real,
      // legible state ("no offering yet -- so no schedule" is what the list
      // already says), so a failure between the two leaves something
      // recoverable rather than a half-written schedule.
      const id = existing?.id ?? await createOffering({
        course_id: courseId,
        branch_id: branchValue,
        start_time: startValue || null,
        end_time: endValue || null,
      });
      await setOfferingSchedule(id, dayValue, fromValue);
      router.back();
      flash(dataSource === 'live'
        ? `${branchName}: ${dayValue.length} day${dayValue.length === 1 ? '' : 's'} a week`
        : `Saved on this device only — the academy database is not configured`,
        dataSource === 'live' ? 'ok' : 'warn');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'The schedule could not be saved. Nothing has been changed.');
    } finally {
      setSaving(false);
    }
  };

  if (editor.state === 'loading') return <Screen><Skeleton lines={6} /></Screen>;
  if (editor.state === 'error') {
    return <Screen><ErrorState message={editor.error ?? 'Something went wrong.'} onRetry={editor.retry} /></Screen>;
  }
  if (!course) {
    return (
      <Screen>
        <ErrorState message="That course no longer exists, so it has nowhere to run."
          onRetry={() => router.back()} />
      </Screen>
    );
  }

  const stated = course.frequency ?? 0;
  const chosen = dayValue.length;
  const mismatch = stated > 0 && chosen > 0 && chosen !== stated;

  return (
    <Screen>
      <Muted style={{ marginBottom: SPACE.lg }}>
        {existing ? `${course.name} at ${existing.branch}` : `${course.name} — where it runs`}
      </Muted>

      {/* An offering cannot change branch: the course, the branch and the batch
          are what make it unique, so moving it is really a different offering. */}
      {existing ? (
        <>
          <Label>Branch</Label>
          <View style={{
            marginTop: SPACE.sm, padding: SPACE.lg, borderRadius: RADIUS.md,
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
          }}>
            <Icon name="apartment" size={18} color={theme.dim} />
            <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: theme.fgStrong }}>
              {existing.branch}
            </Text>
            <Icon name="lock" size={18} color={theme.dim} />
          </View>
          <Muted style={{ marginTop: SPACE.sm }}>
            A branch cannot be changed here — add a separate offering for another branch.
          </Muted>
        </>
      ) : (
        <DropdownRow open={open}>
          <DropdownField label="Branch" value={branchName || 'Choose a branch'}
            open={open} highlight={!!branchName}
            onPress={() => setOpen(o => !o)} testID="offering-branch" />
          {open ? (
            <DropdownPanel>
              <DropdownList
                options={branches.map(b => ({ label: b.name }))}
                value={branchName}
                onSelect={label => {
                  setBranchId(branches.find(b => b.name === label)?.id ?? null);
                  setOpen(false);
                }}
                testID="offering-branch" />
            </DropdownPanel>
          ) : null}
        </DropdownRow>
      )}

      <Label style={{ marginTop: SPACE.xl }}>Days it runs</Label>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: SPACE.md }}>
        {DAYS.map(d => {
          const on = dayValue.includes(d);
          return (
            <Pressable testID={`offering-day-${d}`}
              key={d} onPress={() => toggle(d)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={DAY_NAMES[d]}
              style={({ pressed }) => ({
                flex: 1, minHeight: TAP_MIN, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
                backgroundColor: on ? theme.accent : theme.surface,
                borderWidth: 1, borderColor: on ? theme.accent : theme.lineStrong,
              })}>
              {/* the tick is not left to colour alone: a selected day carries
                  its own mark as well as its fill */}
              <Text style={{
                fontSize: 11.5, fontWeight: '800',
                color: on ? theme.onAccent : theme.fg,
              }}>{DAY_NAMES[d]}</Text>
              <Text style={{ fontSize: 10, color: on ? theme.onAccent : theme.dim, marginTop: 1 }}>
                {on ? '✓' : '–'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Muted style={{ marginTop: SPACE.sm }}>
        {chosen === 0
          ? 'Pick at least one day — an offering with no days expects nobody.'
          : `${chosen} session${chosen === 1 ? '' : 's'} a week`}
      </Muted>

      {/* CR-07: both numbers are kept, neither is reconciled. */}
      {mismatch ? (
        <View style={{
          marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
          flexDirection: 'row', gap: SPACE.md,
          backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.lineStrong,
        }}>
          <Icon name="error" size={18} color={theme.isDark ? STATUS.awaiting.fgDark : STATUS.awaiting.fgLight} />
          <Muted style={{ flex: 1 }}>
            {`The course states ${stated} a week and you have picked ${chosen}. Both are kept — attendance is counted from these ${chosen} days, never from the stated ${stated}.`}
          </Muted>
        </View>
      ) : null}

      <Label style={{ marginTop: SPACE.xl }}>From</Label>
      <View style={{ marginTop: SPACE.sm }}>
        <DateField label="These days apply from" value={fromValue} onChange={setFrom}
          placeholder="Choose a date" testID="offering-effective-from"
          hint="Changing the days later opens a new version from that date. Weeks already marked keep what was expected of them." />
      </View>

      {!existing ? (
        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md }}>
          <View style={{ flex: 1 }}>
            <TimeField label="Start time" value={startValue} onChange={setStart}
              placeholder="6:00 AM" testID="offering-start-time" />
          </View>
          <View style={{ flex: 1 }}>
            <TimeField label="End time" value={endValue} onChange={setEnd}
              placeholder="7:00 AM" testID="offering-end-time"
              error={reversedTimes ? 'The end time must be after the start time.' : undefined} />
          </View>
        </View>
      ) : null}

      {failure ? (
        <View style={{ marginTop: SPACE.lg }}>
          <ErrorState message={failure} onRetry={save} />
        </View>
      ) : null}

      <Button testID="offering-save"
        label={saving ? 'Saving…' : existing ? 'Save Days' : 'Add Offering'}
        onPress={save} disabled={!valid || saving} style={{ marginTop: SPACE.xl }} />
      <Muted style={{ marginTop: 9, textAlign: 'center' }}>
        {!valid
          ? 'A branch, at least one day and a start date are needed'
          : 'Sessions are not created here — they appear as attendance is recorded'}
      </Muted>
    </Screen>
  );
}
