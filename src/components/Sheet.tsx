import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE, TAP_MIN } from '../theme/tokens';
import { Icon } from './Icon';

/**
 * The canvas' bottom sheet: scrim, rounded top, grab handle. Dismissing by
 * tapping the scrim is a real control, so it carries a label rather than
 * being an unnamed hit area.
 */
export function Sheet({ open, onClose, title, children, placement = 'bottom' }:
  {
    open: boolean; onClose: () => void; title: string; children: React.ReactNode;
    /**
     * WHERE the card sits. 'bottom' is the canvas' sheet and the default, so
     * the five callers that had no opinion keep exactly what they shipped.
     *
     * 'top' exists for ONE caller: the No email group's "add this name to an
     * existing member", which the requester asked to open "as pop up dialog
     * on top of screen". It is opt-in rather than a change of the default
     * because requests/2026-09-05-dialog-opens-at-top.md deliberately scoped
     * sheets and pickers OUT of the dialog-placement change -- moving them
     * all would be reversing a decision nobody asked to reverse.
     */
    placement?: 'bottom' | 'top';
  }) {
  const { theme } = useTheme();
  const top = placement === 'top';

  /**
   * Two halves of the same accessibility bug, both from react-native-web's
   * Modal:
   *
   *  - OPEN: `accessibilityViewIsModal` puts aria-hidden on the app root, but
   *    the button that opened the sheet is IN that root and still holds
   *    focus -- "aria-hidden on an ancestor of a focused element". Blurring
   *    the opener as the sheet opens leaves nothing focused inside the
   *    hidden subtree.
   *  - CLOSED: a closed Modal stays mounted as a display:none container whose
   *    buttons and search field are still in the DOM and still focusable.
   *    Not rendering it at all (below) is the fix -- a closed sheet has no
   *    DOM, so it cannot hold focus or be tabbed into.
   */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body && typeof active.blur === 'function') active.blur();
  }, [open]);

  if (!open) return null;

  return (
    <Modal visible transparent animationType={top ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: top ? 'flex-start' : 'flex-end' }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.scrim }} />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '76%', backgroundColor: theme.surface,
            // A card at the top is a card: it is bordered and rounded on every
            // side, and it clears the status bar. A sheet is anchored to the
            // bottom edge, so only its top corners are its own.
            ...(top ? {
              marginTop: SPACE.xxl, marginHorizontal: SPACE.lg,
              borderRadius: 24, borderWidth: 1,
              paddingTop: SPACE.xl, paddingBottom: SPACE.xl,
            } : {
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              borderTopWidth: 1,
              paddingTop: SPACE.md, paddingBottom: SPACE.xxl,
            }),
            borderColor: theme.line,
            paddingHorizontal: SPACE.xl,
          }}>
          {top ? null : (
            <View style={{ width: 42, height: 4, borderRadius: 99, backgroundColor: theme.lineStrong, alignSelf: 'center', marginBottom: SPACE.lg }} />
          )}
          <Text style={{ fontSize: 19, fontWeight: '800', color: theme.fgStrong }}>{title}</Text>
          {children}
        </View>
      </View>
    </Modal>
  );
}

/**
 * `value` is the option's IDENTITY, when its label is not one.
 *
 * onSelect used to hand back the label, and callers matched on it to find the
 * row again. That is only safe while every label is unique -- and the member
 * picker's labels stopped being unique the moment the member code came out of
 * them, so two members sharing a name would both have matched the first.
 * Linking an attendance row to the wrong person, silently.
 */
export type PickerOption = { label: string; meta?: string; value?: string };

/**
 * Search-and-pick sheet used for the role, course and branch pickers. When
 * `onAdd` is given, a query that matches nothing existing can be added as a
 * new label -- the canvas' behaviour, and the reason the empty state says
 * what to do rather than just "no results".
 */
export function SearchPicker({ open, onClose, title, placeholder, options, value, onSelect, onAdd, addMeta, emptyNote, placement, confirmLabel, confirmNote, busy }:
  {
    open: boolean; onClose: () => void; title: string; placeholder: string;
    options: PickerOption[]; value?: string;
    /** the option's `value` when it has one, otherwise its label */
    onSelect: (chosen: string) => void;
    onAdd?: (label: string) => void;
    addMeta?: string;
    emptyNote?: string;
    /** passed through to `Sheet` — see the note there. Default 'bottom'. */
    placement?: 'bottom' | 'top';
    /**
     * TWO STEPS instead of one: tapping a name only SELECTS it, and this
     * button is what commits.
     *
     * Given only where the act is worth a second look. A course or a branch
     * picker is a field you are filling in and tap-to-pick is right for it;
     * merging one member into another moves her attendance and retires a
     * record, and "I tapped the wrong row" is not a recoverable mistake there.
     * Omitted, the picker behaves exactly as it always has.
     */
    confirmLabel?: string;
    /** what the confirm will DO, in a sentence, once there is something to do it to */
    confirmNote?: (chosen: PickerOption) => string;
    /** the confirm is in flight — the label says so and the button is inert */
    busy?: boolean;
  }) {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [staged, setStaged] = useState<string | null>(null);
  const twoStep = confirmLabel !== undefined;

  // A picker reopened must not still be holding the last answer, and the
  // options themselves change under it once a merge removes a member.
  useEffect(() => { if (!open) setStaged(null); }, [open]);

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () => options.filter(o => o.label.toLowerCase().includes(q)),
    [options, q]);

  const canAdd = !!onAdd && q.length >= 2 && !options.some(o => o.label.toLowerCase() === q);
  const empty = q.length > 0 && results.length === 0 && !canAdd;

  const stagedOption = staged === null ? null
    : options.find(o => (o.value ?? o.label) === staged) ?? null;

  const close = () => { setQuery(''); setStaged(null); onClose(); };

  return (
    <Sheet open={open} onClose={close} title={title} placement={placement}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.md,
        height: 50, borderRadius: RADIUS.md, backgroundColor: theme.shell,
        borderWidth: 1, borderColor: theme.lineStrong, paddingHorizontal: SPACE.lg,
      }}>
        <Icon name="search" size={20} color={theme.muted} />
        <TextInput
          value={query} onChangeText={setQuery} placeholder={placeholder}
          placeholderTextColor={theme.muted} accessibilityLabel={placeholder}
          style={{ flex: 1, color: theme.fgStrong, fontSize: 14.5, fontWeight: '600' }} />
      </View>

      {/* flexShrink so a pinned footer below cannot be pushed off the card's
          own maxHeight -- the list gives way, the confirm stays reachable. */}
      <ScrollView style={{ marginTop: SPACE.md, flexShrink: 1 }} contentContainerStyle={{ gap: 7 }} keyboardShouldPersistTaps="handled">
        {results.map(o => {
          const on = twoStep ? staged === (o.value ?? o.label) : o.label === value;
          return (
            <Pressable key={o.label}
              onPress={() => {
                if (twoStep) { setStaged(o.value ?? o.label); return; }
                setQuery(''); onSelect(o.value ?? o.label);
              }}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                minHeight: TAP_MIN + 6, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                borderRadius: RADIUS.md, borderWidth: 1,
                borderColor: on ? theme.accent : theme.line,
                backgroundColor: on ? theme.control : theme.surface2,
              }}>
              <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'}
                size={19} color={on ? theme.accentInk : theme.dim} />
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>{o.label}</Text>
              {/* the selected row says "Selected" as well as showing a filled
                  radio, so the state is not carried by the glyph alone */}
              <Text style={{ fontSize: 11.5, color: theme.muted }}>{on ? 'Selected' : o.meta ?? ''}</Text>
            </Pressable>
          );
        })}

        {canAdd ? (
          <Pressable
            onPress={() => { const v = query.trim(); setQuery(''); onAdd!(v); }}
            accessibilityRole="button"
            style={{
              flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
              minHeight: TAP_MIN + 6, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
              borderRadius: RADIUS.md, borderWidth: 1, borderColor: theme.accent,
              backgroundColor: theme.control,
            }}>
            <Icon name="add_circle" size={19} color={theme.accentInk} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: theme.fgStrong }}>
              {`Add “${query.trim()}”`}
            </Text>
            <Text style={{ fontSize: 11.5, color: theme.accentInk }}>{addMeta ?? 'New label'}</Text>
          </Pressable>
        ) : null}

        {empty ? (
          <Text style={{ paddingVertical: SPACE.lg, paddingHorizontal: SPACE.xs, fontSize: 12.5, color: theme.muted, lineHeight: 19 }}>
            {emptyNote ?? 'Nothing matches that.'}
          </Text>
        ) : null}
      </ScrollView>

      {/* WHAT IT WILL DO, before it is done -- and only once there is
          something to say it about. A sentence describing a merge with no
          member picked would have to say "her", which is the ambiguity this
          two-step exists to remove. */}
      {twoStep ? (
        <View style={{ marginTop: SPACE.md, borderTopWidth: 1, borderTopColor: theme.line, paddingTop: SPACE.md }}>
          <Text style={{ fontSize: 12, color: theme.muted, lineHeight: 19, minHeight: 38 }}>
            {stagedOption && confirmNote ? confirmNote(stagedOption) : 'Pick the member she is, then confirm.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: SPACE.md }}>
            <Pressable testID="picker-cancel" onPress={close} accessibilityRole="button"
              style={({ pressed }) => ({
                flex: 1, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: theme.lineStrong, opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="picker-confirm"
              onPress={() => { if (stagedOption && !busy) onSelect(stagedOption.value ?? stagedOption.label); }}
              disabled={!stagedOption || busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: !stagedOption || !!busy }}
              style={({ pressed }) => ({
                flex: 1, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: stagedOption && !busy ? theme.accent : theme.surface2,
                borderWidth: 1, borderColor: stagedOption && !busy ? theme.accent : theme.line,
                opacity: pressed ? 0.85 : 1,
              })}>
              <Text style={{
                fontSize: 14, fontWeight: '800',
                color: stagedOption && !busy ? theme.onAccent : theme.muted,
              }}>{busy ? 'Saving…' : confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

/**
 * The canvas' centred confirmation dialog. Sending email is the one
 * irreversible act in this app, so the prototype puts a modal in front of it
 * that restates the count AND the exclusions before anything leaves. "Not
 * yet" is the canvas' own wording for the way out.
 */
export function ConfirmDialog({ open, onClose, title, body, cancelLabel = 'Not yet', confirmLabel, onConfirm }:
  {
    open: boolean; onClose: () => void; title: string; body: string;
    cancelLabel?: string; confirmLabel: string; onConfirm: () => void;
  }) {
  const { theme } = useTheme();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body && typeof active.blur === 'function') active.blur();
  }, [open]);

  if (!open) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26 }}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={`Close ${title}`}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.scrim }} />
        <View accessibilityViewIsModal style={{
          width: '100%', maxWidth: 420, borderRadius: 24, padding: 22,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
        }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.fgStrong, lineHeight: 26 }}>{title}</Text>
          <Text style={{ fontSize: 13, color: theme.muted, lineHeight: 20, marginTop: SPACE.md }}>{body}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: SPACE.xl }}>
            <Pressable onPress={onClose} accessibilityRole="button"
              style={({ pressed }) => ({
                flex: 1, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: theme.lineStrong, opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>{cancelLabel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} accessibilityRole="button"
              style={({ pressed }) => ({
                flex: 1, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1,
              })}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: theme.onAccent }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
