import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN, statusSurface } from '../theme/tokens';
import { blurOpener } from './openingFocus';
import { DateField } from './DateTimePicker';
import { activeAgainFromProblem, dateInWords } from '../data/inactiveFrom';

/**
 * PUTTING A MEMBER BACK ON THE REGISTER — the question, and the date inside it.
 *
 * REQUESTED: "on click of inactive tag a pop up should be appearing as mark as
 * active same which is shown for clciking active but allow user to select
 * active from date in pop up and by default the date should be todays date"
 * (requests/2026-09-16-inactive-at-the-bottom-and-active-from.md).
 *
 * WHY THIS IS NOT ConfirmDialog. That dialog takes a `body` STRING and offers
 * two buttons, which is the right shape for "delete her" and for the other
 * half of this very pill — marking somebody inactive is still a ConfirmDialog
 * and is untouched. This question has a CONTROL in the middle of it, and a
 * date picker is not a sentence. `ResetRegisterDialog` is the precedent and
 * this is built to match it: same Modal, same inert scrim, same card, same
 * footer shape, so the two dialogs on this screen cannot disagree about where
 * Cancel goes.
 *
 * WHY THE DATE IS TODAY WHEN IT OPENS, and re-seeded every time. Today is what
 * the tap has always meant, so the default is the old one-tap behaviour and
 * the picker is what somebody reaches for only when it is NOT today. Seeding
 * it once would leave last week's answer in the field for the next member,
 * which is how a date nobody chose gets saved.
 *
 * WHY A PAST DATE AND A FUTURE ONE ARE BOTH ALLOWED. `inactive_from` (0045)
 * allows both for a reason that reads identically here: recording a return
 * somebody forgot to enter last month is the same act as scheduling one for
 * next month, and refusing either leaves the only way to say it being to mark
 * the member active today and misdate them by weeks. A future date is a
 * SCHEDULED return — the member stays off the register until the day, and
 * nobody has to press anything when it comes (0072's member_status_on).
 */
export function MarkActiveDialog({
  open, onClose, memberName, joinedOn, todayIso, saving, onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  memberName: string;
  /** the member's joining date, ISO — the one date a return may not precede */
  joinedOn: string | null;
  /** today, ISO — passed in rather than read, so this stays testable */
  todayIso: string;
  /** the write is running — the buttons are held rather than hidden */
  saving: boolean;
  onConfirm: (activeAgainFrom: string) => void;
}) {
  const { theme } = useTheme();
  const [value, setValue] = useState(todayIso);

  // Re-seeded on every opening, never once at mount: see the note above.
  useEffect(() => {
    if (open) setValue(todayIso);
  }, [open, todayIso]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    blurOpener(open, null);
  }, [open]);

  if (!open) return null;

  const problem = activeAgainFromProblem(value, joinedOn);
  const scheduled = !problem && value > todayIso;
  const backdated = !problem && value < todayIso;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26 }}>
        {/* Inert, exactly as ConfirmDialog's and ResetRegisterDialog's are: a
            press beside a dialog is a miss, not a decision. */}
        <View testID="mark-active-scrim" onStartShouldSetResponder={() => true}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.scrim }} />

        <View testID="mark-active-dialog" accessibilityViewIsModal style={{
          width: '100%', maxWidth: 460, maxHeight: '86%', borderRadius: 24, padding: 22,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
        }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.fgStrong, lineHeight: 26 }}>
            {`Mark ${memberName} active?`}
          </Text>

          <ScrollView style={{ marginTop: SPACE.md }} contentContainerStyle={{ paddingBottom: 2 }}>
            {/* THE DATE IS THE FIRST THING IN THE DIALOG, above the
                consequences, because it is the one thing being decided here
                that the other direction of this pill does not decide. */}
            <DateField
              label="Active from"
              testID="mark-active-date"
              value={value}
              onChange={setValue}
              required
              placeholder="Choose the day they are back"
              min={joinedOn ?? undefined}
              error={problem ?? undefined}
              hint={problem ? undefined
                : scheduled
                  ? `${memberName} stays off the register until ${dateInWords(value)}, then goes back on it with nobody pressing anything.`
                  : backdated
                    ? `Recorded as back on the register since ${dateInWords(value)}.`
                    : 'Today — which is what the pill has always meant.'} />

            <Text testID="mark-active-consequences" style={{
              fontSize: 13, color: theme.muted, lineHeight: 20, marginTop: SPACE.lg,
            }}>
              {/* The same consequences the one-tap version stated, with the
                  one clause the date adds. The enrolment sentence is kept
                  word for word: it is the reassurance that makes the tap
                  safe, and it is no less true for the act being dated. */}
              {scheduled
                ? 'From that day this member is back in the follow-up rule, and is listed and written to again after a missed session. Until then nothing is sent. Any inactive date on the record is cleared. The enrolment and the attendance history are unchanged — they never went anywhere.'
                : 'This member goes back into the follow-up rule, and is listed and written to again after a missed session. Any inactive date on the record is cleared. The enrolment and the attendance history are unchanged — they never went anywhere.'}
            </Text>
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: SPACE.xl }}>
            <Pressable testID="mark-active-cancel" onPress={onClose} disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={`Leave ${memberName} off the register`}
              style={({ pressed }) => ({
                flex: 1, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: theme.lineStrong,
                opacity: saving ? 0.5 : pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>Cancel</Text>
            </Pressable>

            {/* The button NAMES the day it is about, so the decision is stated
                in the same place it is taken -- and it is held, never hidden,
                while the date on the field cannot be saved. */}
            <Pressable testID="mark-active-confirm"
              onPress={() => { if (!problem && !saving) onConfirm(value); }}
              disabled={saving || !!problem}
              accessibilityRole="button"
              accessibilityState={{ disabled: saving || !!problem }}
              accessibilityLabel={problem
                ? 'The date cannot be saved yet'
                : `Mark ${memberName} active from ${dateInWords(value)}`}
              style={({ pressed }) => ({
                flex: 1.3, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
                backgroundColor: theme.accent,
                opacity: (saving || !!problem) ? 0.5 : pressed ? 0.85 : 1,
              })}>
              <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '800', color: theme.onAccent }}>
                {saving ? 'Saving…' : scheduled ? 'Schedule' : 'Mark active'}
              </Text>
            </Pressable>
          </View>

          {/* The one fact a reader cannot get from the field or the button:
              that a scheduled return has not happened yet. Drawn only when it
              applies, in the surface the rest of the screen uses for a
              standing note rather than as a colour on its own (guardrail 3). */}
          {scheduled ? (
            <View testID="mark-active-scheduled-note" style={{
              marginTop: SPACE.md, padding: 11, borderRadius: RADIUS.md,
              backgroundColor: statusSurface(theme.dim).bg,
              borderWidth: 1, borderColor: statusSurface(theme.dim).border,
            }}>
              <Text style={{ fontSize: 12, color: theme.fg, lineHeight: 18 }}>
                {`Until ${dateInWords(value)} the pill still reads Inactive, because that is what it is.`}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
