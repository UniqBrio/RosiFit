import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Label, Button, Skeleton, EmptyState, ErrorState } from '../src/components/ui';
import { FormDialog } from '../src/components/FormDialog';
import { Field } from '../src/components/Field';
import { DateField, formatDate } from '../src/components/DateTimePicker';
import { normaliseRange, rangeLabel } from '../src/data/holiday';
import { Icon } from '../src/components/Icon';
import { ConfirmDialog } from '../src/components/Sheet';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../src/theme/tokens';
import { useHolidays, useFilterOptions } from '../src/data/hooks';
import { createHoliday, deleteHoliday, previewHoliday, dataSource, type Holiday }
  from '../src/data/repository';
import { ALL_BRANCHES } from '../src/state/academy';

/**
 * C-91: a holiday is a CLOSURE over a date range, not a cancellation. The
 * screen shows the impact before anything is applied, and says out loud what
 * it will NOT do -- the three guarantees C-92 makes.
 *
 * WHAT WAS WRONG HERE
 * `apply` flashed "<name> applied · N sessions marked Holiday" and called
 * router.back(). Nothing was written, and the N was the literal 14 or 6 --
 * not a count of anything. This is the `holiday` row of TD-012, the same
 * defect as Add Course (RC-008): a form that reports a save it never
 * attempted is indistinguishable from a working one until somebody looks.
 *
 * And there was nowhere to REMOVE one. C-92 promises that removing a holiday
 * returns its sessions to `scheduled`, remove_holiday() has done exactly that
 * since 0007, and nothing could reach it -- no list, no delete grant, no
 * policy. Both halves are closed here: the list below is the thing you delete
 * from, and 0017 is what makes the delete land.
 */

export default function HolidayScreen() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();

  const holidays = useHolidays(forced);
  const options = useFilterOptions(forced);

  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [branch, setBranch] = useState<string | null>(null);   // null = all branches
  const [impact, setImpact] = useState<{ label: string; n: number }[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Holiday | null>(null);

  // Real branches, not a hardcoded 'Coimbatore'. A scope naming a branch the
  // academy does not have is refused by createHoliday, because branch_id null
  // means EVERY branch -- a typo would silently widen the closure.
  const branches = (options.data?.branches ?? [ALL_BRANCHES]).filter(b => b !== ALL_BRANCHES);

  const reversed = !!(from && to && to < from);
  // ONE range rule for the preview, the save and the label -- an empty end
  // date is a one-day closure, and it must mean that in all three or the
  // impact shown is not the impact applied.
  const range = normaliseRange(from, to);
  const valid = name.trim().length >= 2 && from.length > 0 && !reversed;

  // The impact comes from preview_holiday() -- the SAME query apply_holiday()
  // runs -- so the number shown and the number marked cannot disagree (C-91).
  useEffect(() => {
    let cancelled = false;
    if (!from || reversed) { setImpact(null); return; }
    previewHoliday(range.from, range.to, branch)
      .then(rows => { if (!cancelled) setImpact(rows); })
      .catch(() => { if (!cancelled) setImpact(null); });
    return () => { cancelled = true; };
  }, [from, to, branch, reversed]);

  const count = (impact ?? []).reduce((n, i) => n + i.n, 0);

  const holidayInk = theme.isDark ? STATUS.holiday.fgDark : STATUS.holiday.fgLight;
  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;
  const cancelInk = theme.isDark ? STATUS.cancelled.fgDark : STATUS.cancelled.fgLight;
  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;

  const apply = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setFailure(null);
    try {
      await createHoliday({ name: name.trim(), from: range.from, to: range.to, branch });
      // The list below is refetched by the write itself (onHolidaysChanged),
      // so the holiday appears because the row exists -- not because this
      // screen said so.
      setName(''); setFrom(''); setTo('');
      flash(dataSource === 'live'
        ? `${name.trim()} applied · ${count} session${count === 1 ? '' : 's'} marked Holiday`
        : `${name.trim()} applied on this device only — the academy database is not configured`,
        dataSource === 'live' ? 'ok' : 'warn');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'The holiday could not be applied. Nothing has been changed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (holiday: Holiday) => {
    setConfirmDelete(null);
    setFailure(null);
    try {
      await deleteHoliday(holiday.id);
      flash(dataSource === 'live'
        ? `${holiday.name} removed · ${holiday.sessions} session${holiday.sessions === 1 ? '' : 's'} back to scheduled`
        : `${holiday.name} removed on this device only — the academy database is not configured`,
        dataSource === 'live' ? 'ok' : 'warn');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'The holiday could not be removed. Nothing has been changed.');
    }
  };

  return (
    <FormDialog
      title="Add holiday"
      subtitle="A closure, not a cancellation"
      confirmLabel={saving ? 'Applying…' : 'Apply holiday'}
      confirmTestID="holiday-apply"
      confirmDisabled={!valid || saving}
      onConfirm={apply}
      hint={!valid ? 'A name and a start date are needed'
        : 'Removing it later puts every one of these sessions back to scheduled'}>

      <Field label="Name or reason" value={name} onChange={setName} placeholder="e.g. Diwali" />

      {/* Pickers, not typed dates. Both values are ISO yyyy-mm-dd, which is
          what holidays.start_date / end_date take, so there is no format to
          get wrong and no parse to fail. The end picker will not offer a day
          before the start, which is the same rule as the CHECK constraint --
          stated in the control instead of only caught at save. */}
      <View style={{ flexDirection: 'row', gap: SPACE.md }}>
        <View style={{ flex: 1 }}>
          <DateField label="Start date" value={from} onChange={setFrom}
            placeholder="First day" testID="holiday-start-date" />
        </View>
        <View style={{ flex: 1 }}>
          <DateField label="End date" value={to} onChange={setTo}
            placeholder="Last day" min={from || undefined} testID="holiday-end-date"
            error={reversed ? 'The end date falls before the start date. Fix it and the impact recalculates.' : undefined} />
        </View>
      </View>
      {!reversed && (
        <Muted style={{ marginTop: -4 }}>
          {from && !to
            ? `Leave the end date empty for a one-day closure on ${formatDate(from)}.`
            : 'One day? Leave the end date empty, or choose the same date in both.'}
        </Muted>
      )}

      <Label style={{ marginTop: SPACE.xl }}>Scope</Label>
      <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
        {[{ key: null, label: 'All branches', desc: 'Every branch closes on these dates — a public holiday.' },
          ...branches.map(b => ({
            key: b as string | null, label: `${b} only`,
            desc: 'Other branches keep running. A local closure.',
          }))].map(s => {
          const on = branch === s.key;
          const box = statusSurface(holidayInk);
          return (
            <Pressable key={s.label} testID={`holiday-scope-${s.key ?? 'all'}`}
              onPress={() => setBranch(s.key)}
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
        {!from ? (
          <Muted style={{ marginTop: SPACE.md }}>
            Choose a start date and this counts the sessions it would mark.
          </Muted>
        ) : impact === null ? (
          <View style={{ marginTop: SPACE.md }}><Skeleton lines={2} /></View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm, marginTop: SPACE.md }}>
              <Text style={{ fontSize: 34, fontWeight: '800', color: holidayInk, fontVariant: ['tabular-nums'] }}>
                {count}
              </Text>
              <Text style={{ flex: 1, fontSize: 13, color: theme.fg }}>
                {count === 1 ? 'scheduled session will be marked as Holiday'
                             : 'scheduled sessions will be marked as Holiday'}
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
              {impact.length === 0 ? (
                <Muted>No scheduled session falls in this range. The holiday is still recorded.</Muted>
              ) : null}
            </View>
          </>
        )}
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

      {/* A refused write is shown, not flashed away: the holiday is NOT saved
          and the person has to be able to read why. */}
      {failure ? (
        <View style={{ marginTop: SPACE.lg }}>
          <ErrorState message={failure} onRetry={() => setFailure(null)} />
        </View>
      ) : null}

      {/* ------------------------------------------------- the existing ones */}
      <View style={{
        marginTop: SPACE.xxl, paddingTop: SPACE.lg,
        borderTopWidth: 1, borderTopColor: theme.line,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Label>Holidays</Label>
          <Muted>{holidays.data ? `${holidays.data.length} recorded` : ''}</Muted>
        </View>

        {holidays.state === 'loading' ? (
          <View style={{ marginTop: SPACE.md }}><Skeleton lines={3} /></View>
        ) : holidays.state === 'error' ? (
          <View style={{ marginTop: SPACE.md }}>
            <ErrorState onRetry={holidays.retry}
              message={holidays.error ?? 'The holidays could not be loaded. Nothing has been changed.'} />
          </View>
        ) : (holidays.data ?? []).length === 0 ? (
          <View style={{ marginTop: SPACE.md }}>
            <EmptyState title="No holidays recorded"
              body="Add one above. Every closure you record here is removable, and removing it returns its sessions to scheduled." />
          </View>
        ) : (
          <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
            {(holidays.data ?? []).map(h => {
              const box = statusSurface(holidayInk);
              return (
                <View key={h.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                  padding: SPACE.md, borderRadius: RADIUS.md,
                  backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
                }}>
                  <View style={{
                    width: 38, height: 38, borderRadius: 12,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
                  }}>
                    <Icon name={STATUS.holiday.icon} size={18} color={holidayInk} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>
                      {h.name}
                    </Text>
                    <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>
                      {/* the scope is a word, never an absence: "all branches"
                          is a decision, not a missing value */}
                      {`${rangeLabel(h.from, h.to)} · ${h.branch ?? 'all branches'} · ${h.sessions} session${h.sessions === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                  <Pressable testID={`holiday-delete-${h.id}`}
                    onPress={() => setConfirmDelete(h)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${h.name}, ${rangeLabel(h.from, h.to)}. Returns ${h.sessions} sessions to scheduled`}
                    style={({ pressed }) => ({
                      width: 38, height: 38, borderRadius: 11,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: theme.control, borderWidth: 1, borderColor: theme.line,
                      opacity: pressed ? 0.7 : 1,
                    })}>
                    <Icon name="delete" size={18} color={dangerInk} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Removing a holiday changes attendance expectations for everyone in
          the range, so it states the consequence in sessions rather than
          asking "are you sure?" about a name. */}
      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={confirmDelete ? `Remove ${confirmDelete.name}?` : ''}
        body={confirmDelete
          ? `${confirmDelete.sessions === 0
              ? 'No session is currently marked by this holiday, so nothing changes on the calendar.'
              : `${confirmDelete.sessions} session${confirmDelete.sessions === 1 ? '' : 's'} will go back to scheduled and start counting as expected again.`}`
            + ' Completed and cancelled sessions are untouched. The removal is recorded in the audit log.'
          : ''}
        cancelLabel="Keep it"
        confirmLabel="Remove holiday"
        onConfirm={() => { if (confirmDelete) void remove(confirmDelete); }} />
    </FormDialog>
  );
}
