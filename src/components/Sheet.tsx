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
export function Sheet({ open, onClose, title, children }:
  { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { theme } = useTheme();

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
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.scrim }} />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '76%', backgroundColor: theme.surface,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            borderTopWidth: 1, borderColor: theme.line,
            paddingTop: SPACE.md, paddingHorizontal: SPACE.xl, paddingBottom: SPACE.xxl,
          }}>
          <View style={{ width: 42, height: 4, borderRadius: 99, backgroundColor: theme.lineStrong, alignSelf: 'center', marginBottom: SPACE.lg }} />
          <Text style={{ fontSize: 19, fontWeight: '800', color: theme.fgStrong }}>{title}</Text>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export type PickerOption = { label: string; meta?: string };

/**
 * Search-and-pick sheet used for the role, course and branch pickers. When
 * `onAdd` is given, a query that matches nothing existing can be added as a
 * new label -- the canvas' behaviour, and the reason the empty state says
 * what to do rather than just "no results".
 */
export function SearchPicker({ open, onClose, title, placeholder, options, value, onSelect, onAdd, addMeta, emptyNote }:
  {
    open: boolean; onClose: () => void; title: string; placeholder: string;
    options: PickerOption[]; value?: string;
    onSelect: (label: string) => void;
    onAdd?: (label: string) => void;
    addMeta?: string;
    emptyNote?: string;
  }) {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () => options.filter(o => o.label.toLowerCase().includes(q)),
    [options, q]);

  const canAdd = !!onAdd && q.length >= 2 && !options.some(o => o.label.toLowerCase() === q);
  const empty = q.length > 0 && results.length === 0 && !canAdd;

  const close = () => { setQuery(''); onClose(); };

  return (
    <Sheet open={open} onClose={close} title={title}>
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

      <ScrollView style={{ marginTop: SPACE.md }} contentContainerStyle={{ gap: 7 }} keyboardShouldPersistTaps="handled">
        {results.map(o => {
          const on = o.label === value;
          return (
            <Pressable key={o.label}
              onPress={() => { setQuery(''); onSelect(o.label); }}
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
