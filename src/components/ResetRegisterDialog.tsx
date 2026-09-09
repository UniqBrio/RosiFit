import { useEffect } from 'react';
import { View, Text, Pressable, Modal, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../theme/tokens';
import { Icon } from './Icon';
import { blurOpener } from './openingFocus';
import {
  resetWarning, type ResetPreview, type ResetTarget,
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
}: {
  open: boolean;
  onClose: () => void;
  /** "Tue 8 Sept" — the day this is about, in the roster's own words */
  dayWords: string;
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

  // NO TICK STATE LEFT. This dialog held a Set of members to delete and the
  // effect that seeded it from the roster's selection; both went with the
  // delete half in 0057. What it confirms now is a single reversible act, so
  // there is nothing to remember between openings.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    blurOpener(open, null);
  }, [open]);

  if (!open) return null;

  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;
  // A day with nothing SELECTED on it has nothing to reset, and the button
  // says so rather than being drawn and doing nothing.
  const nothingToDo = !loading && !error && (preview?.marks ?? 0) === 0;

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

                {/* THE PERMANENT HALF LEFT THIS DIALOG (0057).
                    It used to live here: a list of the day's addressless
                    members with a tick beside each, and one press that both
                    cleared the day and deleted whoever was ticked.

                    The requester separated the two -- "enable multi selection
                    for no email section and enable delete option i.e bulk
                    delete ask for confirmation before delete" -- and the
                    separation is right on its own terms. One press carrying
                    both a reversible act and an irreversible one means the
                    dialog has to be read at the size of its worst half every
                    time, including the ordinary times when nothing is ticked.
                    Bulk delete is now its own control on the roster's no-email
                    section, with its own confirmation naming who goes.

                    So this dialog does one thing, and its button can say
                    exactly what that is. */}
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

            {/* ONE ACT, so the label can name it exactly. It used to have to
                cover a reset and a variable number of deletions in one
                string; since 0057 it clears the marks of the members who were
                selected and does nothing else, and it says how many. */}
            <Pressable testID="reset-confirm"
              onPress={() => onConfirm([])}
              disabled={busy || loading || !!error || nothingToDo}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flex: 1.3, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: 8,
                backgroundColor: theme.accent,
                opacity: (busy || loading || !!error || nothingToDo) ? 0.5 : pressed ? 0.85 : 1,
              })}>
              <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '800', color: theme.onAccent }}>
                {busy ? 'Resetting…'
                  : nothingToDo ? 'Nothing to reset'
                  : (preview?.members ?? 0) === 1
                    ? 'Reset 1 member'
                    : `Reset ${preview?.members ?? 0} members`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
