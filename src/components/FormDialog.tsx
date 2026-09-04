import type { ReactNode } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Muted, Button } from './ui';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, RADIUS } from '../theme/tokens';

/**
 * The chrome every form in this app wears.
 *
 * WHY IT EXISTS
 * A form is a DECISION TAKEN OVER a screen, not a place you travel to. Pushed
 * as a page it wears the stack's header, so the only way out is in the
 * chrome; the save sits below however much has been typed; and "Add Member"
 * from a course detail reads as navigating away from the course rather than
 * as doing something to it.
 *
 * course/edit and member/edit each grew their own copy of this. Four more
 * screens needed the same, and a fifth hand-built copy is how two dialogs end
 * up disagreeing about where Cancel goes.
 *
 * THREE THINGS IT GUARANTEES
 *   1. A title that says what is being decided, and a subtitle naming what it
 *      applies to -- so a dialog over a course says WHICH course.
 *   2. A close that leaves without saving, in the same place every time.
 *   3. A PINNED footer. The body scrolls; Cancel and Save do not, so the way
 *      out and the way on are one tap from anywhere in a form that grows with
 *      every field added to it.
 *
 * `presentation: 'modal'` in app/_layout.tsx does the rest.
 */
export function FormDialog({
  title, subtitle, onClose, children, hint, cancelLabel = 'Cancel',
  confirmLabel, onConfirm, confirmDisabled, confirmTestID, closeTestID,
  footer,
}: {
  title: string;
  /** what this dialog applies to -- the course, the member, the branch */
  subtitle?: string;
  /** defaults to router.back(); pass one when leaving needs to do more */
  onClose?: () => void;
  children: ReactNode;
  /** the line under the footer: what is missing, or what will happen */
  hint?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  confirmTestID?: string;
  closeTestID?: string;
  /** replaces the Cancel/Save pair entirely, for a dialog that ends differently */
  footer?: ReactNode;
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const close = onClose ?? (() => router.back());

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg, paddingBottom: SPACE.md,
        borderBottomWidth: 1, borderBottomColor: theme.line,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: '800', color: theme.fgStrong }}>{title}</Text>
          {subtitle ? (
            <Text numberOfLines={1} style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Pressable testID={closeTestID ?? 'dialog-close'} onPress={close}
          accessibilityRole="button" accessibilityLabel="Close without saving"
          style={({ pressed }) => ({
            width: 38, height: 38, borderRadius: RADIUS.md,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name="close" size={20} color={theme.fgStrong} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACE.lg, paddingBottom: 40 }}>
        {children}
      </ScrollView>

      {footer ?? (onConfirm ? (
        <View style={{
          padding: SPACE.lg, borderTopWidth: 1, borderTopColor: theme.line,
          backgroundColor: theme.shell,
        }}>
          <View style={{ flexDirection: 'row', gap: SPACE.md }}>
            <Button testID="dialog-cancel" label={cancelLabel} variant="secondary"
              onPress={close} style={{ flex: 1 }} />
            <Button testID={confirmTestID ?? 'dialog-confirm'} label={confirmLabel ?? 'Save'}
              onPress={onConfirm} disabled={confirmDisabled} style={{ flex: 1 }} />
          </View>
          {hint ? <Muted style={{ marginTop: 9, textAlign: 'center' }}>{hint}</Muted> : null}
        </View>
      ) : null)}
    </View>
  );
}
