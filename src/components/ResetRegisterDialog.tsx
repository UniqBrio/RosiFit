import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../theme/tokens';
import { Icon } from './Icon';
import { blurOpener } from './openingFocus';
import {
  resetWarning, deleteWarning, type ResetPreview, type ResetTarget,
} from '../data/attendanceReset';

/**
 * RESETTING ONE DAY'S REGISTER — the question, and the ticks inside it.
 *
 * NAMED FOR THE REGISTER, NOT FOR ATTENDANCE, and not by preference: the
 * course screen carries a spec (memberCardAttendanceReadOnly) that forbids the
 * substring `setAttendance` anywhere in it, which is how ADR-030 keeps a write
 * path off the roster card. `ResetAttendanceDialog` contains that substring by
 * accident. The guard is right and the name was wrong; "register" is this
 * repo's own word for a day's attendance in any case.
 *
 * WHY THIS IS NOT ConfirmDialog. That dialog takes a `body` string and offers
 * two buttons, which is the right shape for "send this" and "delete her". This
 * question has a LIST in the middle of it: the requester asked for "select and
 * deselct option" over the members a reset may also delete, and a list of
 * checkboxes is not a sentence.
 *
 * WHY THE TICKS ARE HERE AND NOT ON THE ROSTER CARD. ADR-030 made the card's
 * attendance a READING and not a control, at the requester's own asking —
 * "nothing on the row is tappable". Putting a checkbox back on the card would
 * reverse that decision as a side effect of an unrelated request. Inside this
 * dialog the ticks are about THIS reset and disappear with it, so the roster
 * is left exactly as ADR-030 leaves it.
 *
 * NOTHING IS TICKED WHEN IT OPENS, deliberately. The delete is permanent
 * (0051) and the reset is not; defaulting the ticks ON would make the
 * irreversible half the path of least resistance, which is precisely backwards
 * for the one write in this app that cannot be undone. "Select all" is one tap
 * away for somebody who wants it.
 *
 * THE TWO HALVES ARE DRAWN AS TWO PANELS, never folded into one paragraph.
 * Clearing a day and deleting a member are different sizes of write and only
 * one of them is permanent; a single block covering both lets the permanent
 * half be read as part of the reversible one. The second panel carries the
 * `absent` danger ink and says "permanently" in words, because colour is never
 * the only signal (guardrail 3).
 */
export function ResetRegisterDialog({
  open, onClose, dayWords, preview, loading, error, busy, onConfirm,
  initialTicked = [],
}: {
  open: boolean;
  onClose: () => void;
  /** "Tue 8 Sept" — the day this is about, in the roster's own words */
  dayWords: string;
  /**
   * Members already selected on the roster behind this dialog.
   *
   * The requester asked for the ticks in BOTH places — "enable select and
   * deselect option in members screen where we upload attendnace" — and two
   * selections that disagree would be worse than one. So the roster's
   * selection ARRIVES here as the starting ticks and can still be changed;
   * this dialog stays the last word, because it is the surface that states
   * what the deletion actually costs.
   *
   * Only ids that are genuinely deletable survive: the roster can select a
   * member with an address, and she is never a delete target.
   */
  initialTicked?: string[];
  /** what the reset would move. Null while it is still being counted. */
  preview: ResetPreview | null;
  loading: boolean;
  /** the preview could not be counted; the reset is not offered */
  error: string | null;
  /** the reset is running — the buttons are held rather than hidden */
  busy: boolean;
  onConfirm: (ticked: ResetTarget[]) => void;
}) {
  const { theme } = useTheme();
  const [ticked, setTicked] = useState<Set<string>>(new Set());

  // Every opening starts from what the ROSTER had selected, and from nothing
  // else. Without the reset, a dialog closed with three ticked and reopened on
  // a DIFFERENT day would carry those ticks onto members that day never named.
  //
  // `deletableKey` is in the dependencies, not `preview`: the object is rebuilt
  // on every fetch, so depending on it would re-run this on the server's reply
  // and silently discard ticks made in the moments before it landed.
  const deletableKey = (preview?.deletable ?? []).map(t => t.member_id).join(',');
  useEffect(() => {
    if (!open) return;
    const offered = new Set((preview?.deletable ?? []).map(t => t.member_id));
    // A member the roster selected who turns out to have an address is not a
    // delete target, and is dropped rather than silently deleted.
    setTicked(new Set(initialTicked.filter(id => offered.has(id))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dayWords, deletableKey, initialTicked.join(',')]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    blurOpener(open, null);
  }, [open]);

  if (!open) return null;

  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;
  const deletable = preview?.deletable ?? [];
  const chosen = deletable.filter(t => ticked.has(t.member_id));
  const allTicked = deletable.length > 0 && chosen.length === deletable.length;
  // A day with nothing on it has nothing to reset, and the button says so
  // rather than being drawn and doing nothing.
  const nothingToDo = !loading && !error && (preview?.marks ?? 0) === 0;

  const toggle = (id: string) => setTicked(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const deleteLine = deleteWarning(chosen);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26 }}>
        {/* Inert, exactly as ConfirmDialog's is: a press beside a dialog is a
            miss, not a decision, and this one cannot be un-asked. */}
        <View testID="reset-scrim" onStartShouldSetResponder={() => true}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.scrim }} />

        <View testID="reset-dialog" accessibilityViewIsModal style={{
          width: '100%', maxWidth: 460, maxHeight: '86%', borderRadius: 24, padding: 22,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
        }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.fgStrong, lineHeight: 26 }}>
            {`Reset ${dayWords}?`}
          </Text>

          <ScrollView style={{ marginTop: SPACE.md }} contentContainerStyle={{ paddingBottom: 2 }}>
            {loading ? (
              <View testID="reset-counting"
                style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.md }}>
                <ActivityIndicator color={theme.accentInk} />
                <Text style={{ fontSize: 13, color: theme.muted }}>
                  Counting what this would clear…
                </Text>
              </View>
            ) : error ? (
              <View testID="reset-error" style={{
                flexDirection: 'row', gap: SPACE.sm, padding: 13, borderRadius: RADIUS.md,
                backgroundColor: statusSurface(dangerInk).bg,
                borderWidth: 1, borderColor: statusSurface(dangerInk).border,
              }}>
                <Icon name="error" size={18} color={dangerInk} />
                <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: theme.fg }}>{error}</Text>
              </View>
            ) : (
              <>
                {/* ---------------------------------------- the reversible half */}
                <Text testID="reset-warning"
                  style={{ fontSize: 13, color: theme.muted, lineHeight: 20 }}>
                  {resetWarning(preview ?? { marks: 0, members: 0, keeping: 0, deletable: [] }, dayWords)}
                </Text>

                {/* ---------------------------------------- the permanent half */}
                {deletable.length > 0 ? (
                  <View style={{ marginTop: SPACE.lg }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <Icon name="mail_off" size={16} color={dangerInk} />
                      {/* the word, never the colour alone (guardrail 3) */}
                      {/* PUT AS A QUESTION, in the requester's own terms:
                          "also ask do you want to delete the member without
                          email imported". A heading that merely labels the
                          group would leave the ticks looking like a filter
                          rather than a decision. */}
                      <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '800', color: dangerInk }}>
                        {deletable.length === 1
                          ? 'Do you want to delete the member with no email?'
                          : `Do you want to delete the ${deletable.length} members with no email?`}
                      </Text>
                      <Pressable testID="reset-select-all"
                        onPress={() => setTicked(allTicked
                          ? new Set()
                          : new Set(deletable.map(t => t.member_id)))}
                        accessibilityRole="button"
                        accessibilityLabel={allTicked
                          ? 'Deselect every member' : 'Select every member'}
                        style={({ pressed }) => ({
                          minHeight: 30, paddingHorizontal: 10, borderRadius: RADIUS.sm,
                          justifyContent: 'center',
                          backgroundColor: theme.surface2,
                          borderWidth: 1, borderColor: theme.lineStrong,
                          opacity: pressed ? 0.7 : 1,
                        })}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: theme.fg }}>
                          {allTicked ? 'Deselect all' : 'Select all'}
                        </Text>
                      </Pressable>
                    </View>

                    <Text style={{ fontSize: 11.5, color: theme.muted, lineHeight: 17, marginTop: 6 }}>
                      They were imported by an upload and have no address on file. Tick the ones to
                      delete; leave one unticked to keep them — clearing the day does not remove them
                      by itself. Nothing here is deleted unless you tick it.
                    </Text>

                    <View style={{ gap: 6, marginTop: 9 }}>
                      {deletable.map(t => {
                        const on = ticked.has(t.member_id);
                        return (
                          <Pressable key={t.member_id} testID={`reset-tick-${t.member_id}`}
                            onPress={() => toggle(t.member_id)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: on }}
                            accessibilityLabel={`Delete ${t.name}${
                              t.other_days > 0
                                ? `, who has attendance on ${t.other_days} other ${
                                    t.other_days === 1 ? 'day' : 'days'}`
                                : ', who has attendance on no other day'}`}
                            style={({ pressed }) => ({
                              flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
                              minHeight: TAP_MIN, paddingHorizontal: 11, paddingVertical: 8,
                              borderRadius: RADIUS.md,
                              backgroundColor: on ? statusSurface(dangerInk).bg : theme.surface2,
                              borderWidth: 1,
                              borderColor: on ? statusSurface(dangerInk).border : theme.line,
                              opacity: pressed ? 0.75 : 1,
                            })}>
                            {/* The box is a SECOND encoding of the state, never
                                the only one: the row is a checkbox to a screen
                                reader and carries its checked state there. */}
                            <View style={{
                              width: 19, height: 19, borderRadius: 5,
                              alignItems: 'center', justifyContent: 'center',
                              backgroundColor: on ? dangerInk : 'transparent',
                              borderWidth: on ? 0 : 1.5, borderColor: theme.lineStrong,
                            }}>
                              {on ? <Icon name="check" size={13} color={theme.onAccent} /> : null}
                            </View>
                            <Text numberOfLines={1} style={{
                              flex: 1, fontSize: 13, fontWeight: '700', color: theme.fgStrong,
                            }}>{t.name}</Text>
                            {/* The number the delete owes her: it reaches every
                                one of those days, not just this one. */}
                            <Text style={{ fontSize: 11, color: theme.muted, fontVariant: ['tabular-nums'] }}>
                              {t.other_days === 0 ? 'this day only'
                                : `+${t.other_days} other ${t.other_days === 1 ? 'day' : 'days'}`}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {deleteLine ? (
                      <View testID="reset-delete-warning" style={{
                        flexDirection: 'row', gap: SPACE.sm, marginTop: 10, padding: 13,
                        borderRadius: RADIUS.md,
                        backgroundColor: statusSurface(dangerInk).bg,
                        borderWidth: 1, borderColor: statusSurface(dangerInk).border,
                      }}>
                        <Icon name="warning" size={18} color={dangerInk} />
                        <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 19, color: theme.fg }}>
                          {deleteLine}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: SPACE.xl }}>
            <Pressable testID="reset-cancel" onPress={onClose} disabled={busy}
              accessibilityRole="button" accessibilityLabel="Leave the register as it is"
              style={({ pressed }) => ({
                flex: 1, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: theme.lineStrong,
                opacity: busy ? 0.5 : pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>Keep it</Text>
            </Pressable>

            {/* The label names the WHOLE write, deletions included, because
                the two halves are answered by one press. */}
            <Pressable testID="reset-confirm"
              onPress={() => onConfirm(chosen)}
              disabled={busy || loading || !!error || nothingToDo}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flex: 1.3, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: 8,
                backgroundColor: chosen.length > 0 ? dangerInk : theme.accent,
                opacity: (busy || loading || !!error || nothingToDo) ? 0.5 : pressed ? 0.85 : 1,
              })}>
              <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '800', color: theme.onAccent }}>
                {busy ? 'Resetting…'
                  : nothingToDo ? 'Nothing to reset'
                  : chosen.length > 0
                    ? `Reset and delete ${chosen.length}`
                    : 'Reset the day'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
