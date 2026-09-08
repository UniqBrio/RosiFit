import React from 'react';
import { View, Text, Pressable, ScrollView, Platform, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE, TAP_MIN } from '../theme/tokens';
import { Icon } from './Icon';
import { RequiredMark } from './RequiredMark';

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

/**
 * The press BESIDE an open panel, which is one of its two ways out.
 *
 * It has to reach well beyond the row it lives in, and the two platforms need
 * opposite tools for that. On the web it is `fixed`: an absolutely positioned
 * child stretched out with negative insets still counts towards the
 * scroller's content, so every open filter would grow the page by its own
 * overshoot and hand the screen a scrollbar of empty space. On native there
 * is no `fixed`, and an absolutely positioned child does NOT contribute to a
 * ScrollView's content size, so the negative insets are exactly the way to
 * reach the edges of the screen from inside the row.
 *
 * What it covers on the web is the screen's CONTENT AREA, not the whole
 * window -- react-navigation's screen container carries a transform, which
 * makes it the containing block for a fixed child. Measured, not assumed:
 * 420x603 at y=178 in a 420x780 window. That is the better region anyway.
 * The panel and everything it floats over live inside it, while the
 * persistent header's controls and the tab bar stay above it and go on
 * working -- so a press meant for Settings or another tab still lands there
 * rather than being spent closing a filter.
 *
 * It is UNTINTED, and that is the point. These panels exist so the figures
 * they narrow stay on screen; a scrim over them would dim the very counts
 * the filter is being chosen against -- the same reason the panel hung under
 * a form field does not dim its form (CP-014).
 */
const DISMISS_FILL: ViewStyle = Platform.OS === 'web'
  // `fixed` is a real react-native-web position and not in React Native's own
  // union, which is why it arrives through a cast rather than as a literal.
  ? { position: 'fixed' as unknown as 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
  : { position: 'absolute', top: -9999, left: -9999, right: -9999, bottom: -9999 };

/**
 * The row of fields plus whichever panel is open.
 *
 * `dismiss` is what replaced the panels' "Done" button. A filter applies on
 * the tick itself, so nothing was left for that button to confirm -- but a
 * multi-choice panel must NOT close on a tick either, or a second branch
 * could never be added to the first. So the way out is the press that means
 * "not in here": the field again, or anywhere beside the panel. Given
 * without it, a reader who has ticked two branches and scrolled down to read
 * the numbers has to scroll back up to the field to be rid of the panel
 * (ADR-035).
 */
export function DropdownRow({ open, children, style, dismiss }:
  { open: boolean; children: React.ReactNode; style?: ViewStyle;
    /** The press beside the panel. The testID travels with the handler so
     *  the layer can never ship as an untestable one. */
    dismiss?: { onPress: () => void; testID: string } }) {
  return (
    <View style={[
      // lifted only while a panel is out, so nothing else on the screen has
      // to know about this row's z-order
      { zIndex: open ? 40 : 0 },
      style,
    ]}>
      {/* First, so the fields and the panel after it are pressed rather than
          this. A shut row draws nothing at all -- a full-window layer left
          mounted would swallow every press on the screen. */}
      {open && dismiss ? (
        <Pressable
          testID={dismiss.testID}
          onPress={dismiss.onPress}
          accessibilityRole="button"
          accessibilityLabel="Close the open filter"
          style={DISMISS_FILL} />
      ) : null}
      {children}
    </View>
  );
}

/** The closed field: its label, its current value, and the caret. */
export function DropdownField({ label, value, open, highlight, onPress, testID, style, required }:
  { label: string; value: string; open: boolean; highlight?: boolean;
    onPress: () => void; testID: string;
    /** how the field sits in its row — one of three across, or half of a
     *  wrapping grid. The rest of the field is the same everywhere. */
    style?: ViewStyle;
    /** Marks the choice mandatory. Optional: the filter dropdowns on the
     *  list screens choose nothing that has to be chosen. */
    required?: boolean }) {
  const { theme } = useTheme();
  const lit = open || !!highlight;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${label}${required ? ', required' : ''}, ${value}`}
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
      }}>{label}{required ? <RequiredMark /> : null}</Text>
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
export function DropdownPanel({ children, maxHeight = 340, inset = 0, flow = false, menu = false }:
  { children: React.ReactNode; maxHeight?: number;
    /** pulls the panel in from the row's edges, to line it up with a
     *  padded header rather than with the screen */
    inset?: number; flow?: boolean;
    /** The MENU panel — see `MenuRow`. Its rows are flat and reach the
     *  panel's own edges, so the panel gives up its padding and the gap
     *  between rows, and clips to its radius: a tinted row under a rounded
     *  corner is a square corner without it. */
    menu?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={{
      ...(flow
        ? { marginHorizontal: inset }
        : { position: 'absolute', top: '100%', left: inset, right: inset }),
      marginTop: 6,
      backgroundColor: theme.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: theme.lineStrong,
      ...(menu ? { padding: 0, overflow: 'hidden' as const } : { padding: SPACE.sm }),
      elevation: 8,
    }}>
      <ScrollView style={{ maxHeight }} contentContainerStyle={menu ? undefined : { gap: 4 }}
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

/* ------------------------------------------------------------------ menus
 *
 * The dropdown a FORM FIELD opens, which is a different thing from the
 * filters above even though both hang a list under a control.
 *
 * A filter narrows figures that stay on screen, and its rows are cards: each
 * one bordered, gapped from its neighbours, carrying a radio or a checkbox
 * because a filter may take several values and the glyph is the promise about
 * which. A form field takes exactly ONE value and the list exists to be read
 * down and dismissed, so the requester asked for the plainer thing
 * (requests/2026-09-08-form-dropdown-list-ui.md, with a reference image):
 * flat rows filling the panel edge to edge, a hairline between them, and the
 * chosen row TINTED with its label in the accent and a check at the end.
 *
 * Fifteen borders and fifteen gaps is a list of cards; a list of choices is
 * rows. That is the whole of the difference, and it is why this is a second
 * row component rather than a flag on `DropdownItem`: the two are used in
 * different places for different reasons, and the filter rows are explicitly
 * out of scope of that request.
 *
 * The chosen row still says **Selected** in words beside the check (CP-010) —
 * the reference image carries the state in the tint and the tick alone, and a
 * state this app draws must survive greyscale.
 */

/** One choice in a form field's dropdown. */
export function MenuRow({ label, sub, meta, selected, divided, onPress, testID }:
  { label: string;
    /** a second line under the label — what tells two rows with the same
     *  label apart. Only the member picker passes one. */
    sub?: string;
    meta?: string; selected: boolean;
    /** the hairline above this row. Every row but the first has one; a rule
     *  above the first would double the panel's own top border. */
    divided: boolean;
    onPress: () => void; testID: string }) {
  const { theme } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={meta ? `${label}, ${meta}` : label}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        minHeight: TAP_MIN + 6,
        paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
        // Transparent, not `surface`: the row is drawn ON the panel and has
        // no edge of its own, so the panel's own fill is what shows through.
        backgroundColor: selected ? theme.control : 'transparent',
        borderTopWidth: divided ? 1 : 0, borderTopColor: theme.line,
      }}>
      {/* minWidth 0 so a long second line shortens itself rather than pushing
          the check off the row. */}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={{
          fontSize: 14, fontWeight: selected ? '800' : '600',
          color: selected ? theme.accentInk : theme.fgStrong,
        }}>{label}</Text>
        {sub ? (
          // ellipsized in the MIDDLE for the reason PickerChoice gives: the
          // two addresses this line exists to separate differ just before
          // the @, which is the first thing tail-truncation eats.
          <Text numberOfLines={1} ellipsizeMode="middle"
            style={{ fontSize: 11.5, color: theme.muted }}>{sub}</Text>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{
        fontSize: 11.5, color: selected ? theme.accentInk : theme.muted, maxWidth: '46%',
      }}>{selected ? 'Selected' : meta ?? ''}</Text>
      {/* A fixed slot, drawn empty on the rows without a check, so every
          label in the list ends at the same place. */}
      <View style={{ width: 18, alignItems: 'center' }}>
        {selected ? <Icon name="check" size={18} color={theme.accentInk} /> : null}
      </View>
    </Pressable>
  );
}

/** A form field's list of choices — branches, senders, templates. */
export function DropdownMenuList({ options, value, onSelect, testID }:
  { options: DropdownOption[]; value: string; onSelect: (label: string) => void; testID: string }) {
  return (
    <>
      {options.map((o, i) => (
        <MenuRow key={o.label} label={o.label} meta={o.meta}
          selected={o.label === value} divided={i > 0}
          onPress={() => onSelect(o.label)}
          testID={`${testID}-${o.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} />
      ))}
    </>
  );
}

/**
 * One choice in a CHECKBOX list.
 *
 * A checkbox rather than a radio because these filters take any number of
 * values at once, and the glyph is the promise: a round radio that accepted
 * a second tick would be lying about what the control does. The ticked row
 * says "Selected" in words as well (guardrail 3), so the state survives
 * greyscale and colour blindness exactly as the radio row's did.
 */
export function DropdownCheckItem({ label, meta, checked, onToggle, testID }:
  { label: string; meta?: string; checked: boolean; onToggle: () => void; testID: string }) {
  const { theme } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onToggle}
      accessibilityRole="checkbox"
      // `aria-checked`, not `accessibilityState`. React Native Web 0.21 drops
      // the latter on the floor -- verified in the built page, where the row
      // rendered role="checkbox" with no checked state at all, so a screen
      // reader announced every ticked branch as unticked. The visible row
      // says "Selected" in words either way (guardrail 3); this is the same
      // fact reaching the accessibility tree.
      aria-checked={checked}
      accessibilityLabel={meta ? `${label}, ${meta}` : label}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        minHeight: TAP_MIN, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm,
        borderRadius: RADIUS.md, borderWidth: 1,
        borderColor: checked ? theme.accent : theme.line,
        backgroundColor: checked ? theme.control : theme.surface2,
      }}>
      <Icon name={checked ? 'check_box' : 'check_box_outline_blank'}
        size={19} color={checked ? theme.accentInk : theme.dim} />
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>
        {label}
      </Text>
      <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.muted, maxWidth: '46%' }}>
        {checked ? 'Selected' : meta ?? ''}
      </Text>
    </Pressable>
  );
}

/**
 * A list where any number of options may be ticked, headed by the "All …"
 * row that clears the lot.
 *
 * "All" is the EMPTY selection, not an option with a name: a branch that
 * happened to be called "All branches" would otherwise switch the filter off
 * by being chosen. It is drawn ticked when nothing else is, because
 * "narrowed to nothing" and "narrowed to everything" are the same set and the
 * control should say so rather than showing an empty list of ticks.
 */
export function DropdownCheckList({ options, allLabel, selected, onToggle, onAll, testID }:
  { options: DropdownOption[]; allLabel: string; selected: string[];
    onToggle: (label: string) => void; onAll: () => void; testID: string }) {
  const chosen = new Set(selected);
  const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <>
      <DropdownCheckItem label={allLabel} checked={chosen.size === 0}
        meta={chosen.size === 0 ? undefined : 'Clears the tick marks'}
        onToggle={onAll} testID={`${testID}-all`} />
      {options.map(o => (
        <DropdownCheckItem key={o.label} label={o.label} meta={o.meta}
          checked={chosen.has(o.label)} onToggle={() => onToggle(o.label)}
          testID={`${testID}-${slug(o.label)}`} />
      ))}
    </>
  );
}

