import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { View, Text, Pressable, ScrollView, useWindowDimensions, Platform } from 'react-native';
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
 * WHY IT DRAWS ITS OWN SCRIM AND CARD
 * It used to be `flex: 1` on `theme.bg` and lean on `presentation: 'modal'`
 * for the dialog part. A native stack gives that a sheet; a browser gives it
 * a WHOLE PAGE -- edge to edge, nothing behind it, indistinguishable from
 * having navigated away. Every claim in this file was true only on a phone.
 *
 * So the card is drawn here: a scrim over whatever is behind, a centred panel
 * bounded at DIALOG_MAX_W, and a body that scrolls inside it. The route pairs
 * this with `presentation: 'transparentModal'` (app/_layout.tsx) so the
 * screen underneath stays MOUNTED and VISIBLE -- which is what makes "over
 * the member screen" true rather than a description of an intention.
 *
 * On a narrow screen the panel takes the width it is given and the scrim
 * collapses to almost nothing, so the phone behaviour is unchanged.
 *
 * WHY THE BACKDROP IS BLURRED, NOT JUST DIMMED
 * The scrim's job is to say "this is over something", and it can only say it
 * about something you can SEE. It was saying it about a flat near-black field:
 * the Stack painted every screen `theme.bg`, dialog routes included, so the
 * screen the form was opened FROM was mounted and completely hidden (the
 * third half, now in `DIALOG_SCREEN` -- app/_layout.tsx). With the screen
 * showing through, the blur is what keeps it BACKDROP rather than competing
 * content: you can tell where you are without being able to read it.
 */
const DIALOG_MAX_W = 560;
/** Never taller than this share of the viewport: the footer must stay on screen. */
const DIALOG_MAX_H = 0.9;
/**
 * Web only, and deliberately so. `backdrop-filter` is a CSS property that
 * react-native-web passes through (it is in the library's own prefix table);
 * React Native itself has no equivalent, so native gets the scrim alone --
 * exactly what it rendered before this. A browser too old for the property
 * ignores it and lands in the same place. Nothing depends on the blur being
 * there, which is what makes it safe to ship without a native module.
 */
const BACKDROP_BLUR = (Platform.OS === 'web'
  ? { backdropFilter: 'blur(14px)' }
  : null) as ViewStyle | null;

export function FormDialog({
  title, subtitle, onClose, children, hint, cancelLabel = 'Cancel',
  confirmLabel, onConfirm, confirmDisabled, confirmTestID, closeTestID,
  cancelTestID, footer, overlays,
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
  cancelTestID?: string;
  /** replaces the Cancel/Save pair entirely, for a dialog that ends differently */
  footer?: ReactNode;
  /** Sheets and pickers this dialog opens. They render OUTSIDE the card --
   *  a bottom sheet belongs to the viewport, not to a scrolling form body. */
  overlays?: ReactNode;
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const close = onClose ?? (() => router.back());

  return (
    <View style={[{
      flex: 1, backgroundColor: theme.scrim,
      alignItems: 'center', justifyContent: 'center', padding: SPACE.lg,
    }, BACKDROP_BLUR]}>
      {/* Tapping beside the dialog leaves it, the way tapping beside any
          dialog does. It is the SAME action as the close button, never a
          quiet save -- nothing typed is kept by walking away from it. */}
      <Pressable testID="dialog-scrim"
        accessibilityRole="button" accessibilityLabel="Close without saving"
        onPress={close}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />

      <View style={{
        width: '100%', maxWidth: DIALOG_MAX_W, maxHeight: height * DIALOG_MAX_H,
        backgroundColor: theme.bg, borderRadius: RADIUS.lg,
        borderWidth: 1, borderColor: theme.lineStrong, overflow: 'hidden',
      }}>
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

      <ScrollView style={{ flexGrow: 0 }}
        contentContainerStyle={{ padding: SPACE.lg, paddingBottom: SPACE.lg }}>
        {children}
      </ScrollView>

      {footer ?? (onConfirm ? (
        <View style={{
          padding: SPACE.lg, borderTopWidth: 1, borderTopColor: theme.line,
          backgroundColor: theme.shell,
        }}>
          <View style={{ flexDirection: 'row', gap: SPACE.md }}>
            <Button testID={cancelTestID ?? 'dialog-cancel'} label={cancelLabel} variant="secondary"
              onPress={close} style={{ flex: 1 }} />
            <Button testID={confirmTestID ?? 'dialog-confirm'} label={confirmLabel ?? 'Save'}
              onPress={onConfirm} disabled={confirmDisabled} style={{ flex: 1 }} />
          </View>
          {hint ? <Muted style={{ marginTop: 9, textAlign: 'center' }}>{hint}</Muted> : null}
        </View>
      ) : null)}
      </View>
      {overlays}
    </View>
  );
}
