import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN } from '../theme/tokens';
import { blurOpener } from './openingFocus';
import { Field } from './Field';
import { Icon } from './Icon';
import {
  RESUBSCRIBE_SOURCES, resubscribeChoiceProblem, type ResubscribeSource,
} from '../data/staffResubscribe';

/**
 * TURN FOLLOW-UPS BACK ON — the explicit confirmation, with how the member
 * asked (requests/2026-10-01-resubscribe-recovery-and-gmail-one-click.md).
 *
 * Built on MarkActiveDialog's shape -- same Modal, inert scrim, card and
 * footer -- because it is the same kind of question: a decision with a control
 * in the middle of it. The source is chosen every time and never remembered:
 * a pre-selected answer is how a source nobody heard gets recorded.
 */
export function StaffResubscribeDialog({
  open, onClose, address, saving, refusal, onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  address: string;
  saving: boolean;
  /** the database's refusal, in its own words, shown inside the dialog */
  refusal: string | null;
  onConfirm: (source: ResubscribeSource, note: string) => void;
}) {
  const { theme } = useTheme();
  const [source, setSource] = useState<ResubscribeSource | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) { setSource(null); setNote(''); }
  }, [open]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    blurOpener(open, null);
  }, [open]);

  if (!open) return null;

  const problem = resubscribeChoiceProblem(source, note);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26 }}>
        <View testID="resubscribe-scrim" onStartShouldSetResponder={() => true}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.scrim }} />

        <View testID="resubscribe-dialog" accessibilityViewIsModal style={{
          width: '100%', maxWidth: 460, maxHeight: '86%', borderRadius: 24, padding: 22,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
        }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.fgStrong, lineHeight: 26 }}>
            Turn follow-ups back on?
          </Text>

          <ScrollView style={{ marginTop: SPACE.md }} contentContainerStyle={{ paddingBottom: 2 }}>
            <Text style={{ fontSize: 13, color: theme.muted, lineHeight: 20 }}>
              {`The member unsubscribed ${address} from follow-ups. Do this only because the member asked to get attendance follow-ups again. It is recorded with your name and how the member asked.`}
            </Text>

            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
              color: theme.muted, marginTop: SPACE.lg, marginBottom: 6 }}>
              How did the member ask?
            </Text>
            <View accessibilityRole="radiogroup" style={{ gap: SPACE.sm }}>
              {RESUBSCRIBE_SOURCES.map(s => {
                const on = source === s.key;
                return (
                  <Pressable key={s.key} testID={`resubscribe-source-${s.key}`}
                    onPress={() => setSource(s.key)} disabled={saving}
                    accessibilityRole="radio" accessibilityState={{ selected: on }}
                    accessibilityLabel={s.label}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                      minHeight: TAP_MIN, paddingHorizontal: SPACE.md, borderRadius: RADIUS.md,
                      borderWidth: 1, borderColor: on ? theme.accent : theme.line,
                    }}>
                    <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'}
                      size={19} color={on ? theme.accentInk : theme.dim} />
                    <Text style={{ fontSize: 14, fontWeight: on ? '700' : '500', color: theme.fgStrong }}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: SPACE.lg }}>
              <Field label="Note" value={note} onChange={setNote} multiline
                required={source === 'other'}
                placeholder={source === 'other' ? 'How the member asked' : 'Optional'}
                error={source && problem ? problem : undefined} />
            </View>

            {refusal ? (
              <Text testID="resubscribe-refusal" accessibilityLiveRegion="polite"
                style={{ fontSize: 13, color: theme.danger, lineHeight: 19 }}>
                {refusal}
              </Text>
            ) : null}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: SPACE.xl }}>
            <Pressable testID="resubscribe-cancel" onPress={onClose} disabled={saving}
              accessibilityRole="button" accessibilityLabel="Cancel, keep follow-ups off"
              style={({ pressed }) => ({
                flex: 1, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: theme.lineStrong,
                opacity: saving ? 0.5 : pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>Cancel</Text>
            </Pressable>
            <Pressable testID="resubscribe-confirm"
              onPress={() => { if (!problem && !saving && source) onConfirm(source, note); }}
              disabled={saving || !!problem}
              accessibilityRole="button"
              accessibilityState={{ disabled: saving || !!problem }}
              accessibilityLabel={problem ?? `Turn follow-ups back on for ${address}`}
              style={({ pressed }) => ({
                flex: 1.3, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
                backgroundColor: theme.accent,
                opacity: (saving || !!problem) ? 0.5 : pressed ? 0.85 : 1,
              })}>
              <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '800', color: theme.onAccent }}>
                {saving ? 'Saving…' : 'Turn follow-ups back on'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
