import React from 'react';
import { View, Text, Pressable, ScrollView, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE, TAP_MIN } from '../theme/tokens';
import { Icon } from './Icon';

/**
 * The filter dropdowns.
 *
 * These filters used to open a full-screen bottom sheet with a search box in
 * it -- a modal, over the figures it was about to change, for a choice
 * between three branches. The scrim hid the numbers being filtered, and
 * every change cost an open, a pick and a dismiss.
 *
 * A dropdown opens IN PLACE, directly under the field it belongs to, so the
 * chart and the counts stay on screen while the choice is made. The panel is
 * absolutely positioned, which is why the row that holds it owns the
 * stacking context (`DropdownRow`) -- without it the panel is painted
 * underneath the cards below.
 *
 * Only one may be open at a time, so `open` is held by the SCREEN rather
 * than by each field: two overlapping panels have no honest z-order.
 */

export type DropdownOption = { label: string; meta?: string };

/** The row of fields plus whichever panel is open. */
export function DropdownRow({ open, children, style }:
  { open: boolean; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[
      // lifted only while a panel is out, so nothing else on the screen has
      // to know about this row's z-order
      { zIndex: open ? 40 : 0 },
      style,
    ]}>{children}</View>
  );
}

/** The closed field: its label, its current value, and the caret. */
export function DropdownField({ label, value, open, highlight, onPress, testID, style }:
  { label: string; value: string; open: boolean; highlight?: boolean;
    onPress: () => void; testID: string;
    /** how the field sits in its row — one of three across, or half of a
     *  wrapping grid. The rest of the field is the same everywhere. */
    style?: ViewStyle }) {
  const { theme } = useTheme();
  const lit = open || !!highlight;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${label}, ${value}`}
      accessibilityHint={open ? 'Closes the list' : 'Opens the list'}
      style={[{
        flex: 1, minHeight: TAP_MIN, justifyContent: 'center', gap: 2,
        paddingVertical: 9, paddingHorizontal: 11, borderRadius: 13,
        backgroundColor: lit ? theme.control : theme.surface,
        borderWidth: 1, borderColor: lit ? theme.accent : theme.line,
      }, style]}>
      <Text style={{
        fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6,
        textTransform: 'uppercase', color: theme.muted,
      }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: theme.fgStrong }}>
          {value}
        </Text>
        <Icon name={open ? 'arrow_drop_up' : 'arrow_drop_down'} size={16} color={theme.muted} />
      </View>
    </Pressable>
  );
}

/**
 * The open panel. It hangs below the whole row rather than below one field,
 * because a third of a phone's width is not enough to read a date range in,
 * and it caps its own height so a long branch list cannot run off the
 * bottom of the screen.
 *
 * `flow` makes it push the content below it down instead of floating over
 * it. That is for the app header: it is drawn by the navigator rather than
 * by the screen, so a floating panel can be clipped at the header's edge,
 * and a dropdown nobody can reach is worse than one that moves the page.
 */
export function DropdownPanel({ children, maxHeight = 340, inset = 0, flow = false }:
  { children: React.ReactNode; maxHeight?: number;
    /** pulls the panel in from the row's edges, to line it up with a
     *  padded header rather than with the screen */
    inset?: number; flow?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={{
      ...(flow
        ? { marginHorizontal: inset }
        : { position: 'absolute', top: '100%', left: inset, right: inset }),
      marginTop: 6,
      backgroundColor: theme.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: theme.lineStrong,
      padding: SPACE.sm, elevation: 8,
    }}>
      <ScrollView style={{ maxHeight }} contentContainerStyle={{ gap: 4 }}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * One choice. The chosen row says "Selected" as well as showing a filled
 * radio, so the state never rests on the glyph alone (guardrail 3).
 */
export function DropdownItem({ label, meta, selected, onPress, testID, expandable, expanded }:
  { label: string; meta?: string; selected: boolean; onPress: () => void; testID: string;
    /** an item that opens more of the panel rather than settling the choice */
    expandable?: boolean; expanded?: boolean }) {
  const { theme } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole={expandable ? 'button' : 'radio'}
      accessibilityState={expandable ? { expanded } : { selected }}
      accessibilityLabel={meta ? `${label}, ${meta}` : label}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        minHeight: TAP_MIN, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm,
        borderRadius: RADIUS.md, borderWidth: 1,
        borderColor: selected ? theme.accent : theme.line,
        backgroundColor: selected ? theme.control : theme.surface2,
      }}>
      <Icon
        name={expandable ? (expanded ? 'expand_less' : 'expand_more')
          : selected ? 'radio_button_checked' : 'radio_button_unchecked'}
        size={19} color={selected || expanded ? theme.accentInk : theme.dim} />
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>
        {label}
      </Text>
      <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.muted, maxWidth: '46%' }}>
        {selected ? 'Selected' : meta ?? ''}
      </Text>
    </Pressable>
  );
}

/** A plain list of choices — branches, courses, anything named. */
export function DropdownList({ options, value, onSelect, testID }:
  { options: DropdownOption[]; value: string; onSelect: (label: string) => void; testID: string }) {
  return (
    <>
      {options.map(o => (
        <DropdownItem key={o.label} label={o.label} meta={o.meta}
          selected={o.label === value} onPress={() => onSelect(o.label)}
          testID={`${testID}-${o.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} />
      ))}
    </>
  );
}
