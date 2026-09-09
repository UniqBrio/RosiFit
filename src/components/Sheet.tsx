import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput, Platform, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE, TAP_MIN } from '../theme/tokens';
import { Icon } from './Icon';
import { AnchoredPanel } from './AnchoredPanel';
import type { Anchor } from './datePanel';
import { pickerMatches, pickerKey } from './pickerSearch';
import { blurOpener, useAutoFocus } from './openingFocus';
import { MenuRow } from './Dropdown';
import { confirmButtonStyles, isFilled, type ConfirmEmphasis, type ConfirmButtonStyle } from './confirmEmphasis';

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
  const card = useRef<View>(null);

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
   *
   * The two things `blurOpener` knows that this effect did not -- that a
   * SHUT sheet has no opener to blur, and that the caret inside the sheet's
   * own search box is not an opener either -- are written out in
   * openingFocus.ts. Both are the difference between a first field that
   * keeps the caret and one that loses it a frame later.
   */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    blurOpener(open, card.current);
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
          ref={card}
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
export type PickerOption = {
  label: string;
  meta?: string;
  value?: string;
  /**
   * A second line under the label -- what tells two rows with the SAME label
   * apart. The member picker puts her email address here, because a name is
   * not an identity: the register holds two live members called "Kavitha
   * Ramesh" and the sheet this row sits in commits a merge.
   *
   * Optional, and no other picker passes one: a course or a branch is
   * identified by its label and gains nothing from a second line.
   */
  sub?: string;
  /**
   * Text the QUERY may match but the row never prints. Every address a member
   * holds goes here, so searching by an address she does not show still finds
   * her. Absent, the row is searched by its label exactly as before.
   */
  search?: string;
};

/**
 * The search box, the "Add …" row and the nothing-matches note are ONE set of
 * pieces shared by the sheet picker and the anchored picker below. The host
 * owns where the pieces sit; the pieces own how each one looks.
 *
 * The ROW is the one piece the two hosts no longer share, since 08-Sep-2026
 * (requests/2026-09-08-form-dropdown-list-ui.md). A picker that fills a FORM
 * FIELD draws `MenuRow` — a flat row, a hairline, the chosen one tinted and
 * ticked — because that is what the requester asked every form's dropdown to
 * look like. `PickerChoice` below is what the merge sheet keeps: it is opened
 * from a list row rather than a form field, and its tap STAGES a choice for a
 * second confirming tap rather than settling one, so its rows stay the cards
 * they shipped as. Same reason the register gives for that sheet not moving
 * under a field at all.
 */

/** What the query does to the options. */
function usePickerQuery(options: PickerOption[], onAdd?: (label: string) => void) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  // The match itself lives in pickerSearch.ts, tested against the two live
  // members who share a name -- see the note there.
  const results = useMemo(
    () => options.filter(o => pickerMatches(o, q)),
    [options, q]);
  const canAdd = !!onAdd && q.length >= 2 && !options.some(o => o.label.toLowerCase() === q);
  const empty = q.length > 0 && results.length === 0 && !canAdd;
  return { query, setQuery, results, canAdd, empty };
}

function PickerSearch({ query, onChange, placeholder, testID }:
  { query: string; onChange: (q: string) => void; placeholder: string; testID?: string }) {
  const { theme } = useTheme();
  // A picker is only rendered while it is open, so "on mount" is "on open":
  // the caret is in the search box as the list appears, in both hosts.
  const focusRef = useAutoFocus<TextInput>(true);
  // The box carries the focus, not a ring inside it -- see Field.tsx.
  const [focused, setFocused] = useState(false);
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
      height: 50, borderRadius: RADIUS.md, backgroundColor: theme.shell,
      borderWidth: 1, borderColor: focused ? theme.accent : theme.lineStrong,
      paddingHorizontal: SPACE.lg,
    }}>
      <Icon name="search" size={20} color={theme.muted} />
      <TextInput
        ref={focusRef}
        testID={testID}
        value={query} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={theme.muted} accessibilityLabel={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        selectionColor={theme.accent}
        style={{ flex: 1, color: theme.fgStrong, fontSize: 14.5, fontWeight: '600',
          outlineWidth: 0, outlineStyle: 'solid' }} />
    </View>
  );
}

/** One choice in the MERGE sheet — the last host that draws these cards. The
 *  chosen row says "Selected" as well as showing a filled radio, so the state
 *  is not carried by the glyph alone (guardrail 3). */
function PickerChoice({ option, on, onPress, testID }:
  { option: PickerOption; on: boolean; onPress: () => void; testID?: string }) {
  const { theme } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
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
      {/* minWidth 0 so a long address shortens itself rather than pushing the
          meta off the row -- the name and the address are both left-aligned
          under each other, which is how the roster card and the send list
          already print a member. */}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>{option.label}</Text>
        {/* ellipsize in the MIDDLE, not at the tail. The two addresses this
            row exists to separate are kavitha+rf-000105@example.com and
            kavitha+rf-000106@example.com -- they differ in three characters
            just before the @, which is the first thing tail-truncation eats.
            Tail-ellipsized at phone width both rows read "kavitha+rf-0001…"
            and we are back to two identical rows. */}
        {option.sub ? (
          <Text numberOfLines={1} ellipsizeMode="middle"
            style={{ fontSize: 11.5, color: theme.muted }}>{option.sub}</Text>
        ) : null}
      </View>
      <Text style={{ fontSize: 11.5, color: theme.muted }}>{on ? 'Selected' : option.meta ?? ''}</Text>
    </Pressable>
  );
}

/** The row that turns a query nothing matches into a new label. */
function PickerAddRow({ label, meta, onPress, testID }:
  { label: string; meta?: string; onPress: () => void; testID?: string }) {
  const { theme } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        minHeight: TAP_MIN + 6, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
        borderRadius: RADIUS.md, borderWidth: 1, borderColor: theme.accent,
        backgroundColor: theme.control,
      }}>
      <Icon name="add_circle" size={19} color={theme.accentInk} />
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: theme.fgStrong }}>
        {`Add “${label}”`}
      </Text>
      <Text style={{ fontSize: 11.5, color: theme.accentInk }}>{meta ?? 'New label'}</Text>
    </Pressable>
  );
}

function PickerEmpty({ note }: { note?: string }) {
  const { theme } = useTheme();
  return (
    <Text style={{ paddingVertical: SPACE.lg, paddingHorizontal: SPACE.xs, fontSize: 12.5, color: theme.muted, lineHeight: 19 }}>
      {note ?? 'Nothing matches that.'}
    </Text>
  );
}

const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * Search-and-pick sheet. Left for the ONE picker that is not filling a form
 * field: the course screen's "Who is …?" merge, which is opened from a list
 * row and confirms in two steps. The pickers that ARE form fields -- course,
 * branch, role, question -- open under their field instead (`AnchoredPicker`).
 * When `onAdd` is given, a query that matches nothing existing can be added
 * as a new label -- the canvas' behaviour, and the reason the empty state
 * says what to do rather than just "no results".
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
  const { query, setQuery, results, canAdd, empty } = usePickerQuery(options, onAdd);
  const [staged, setStaged] = useState<string | null>(null);
  const twoStep = confirmLabel !== undefined;

  // A picker reopened must not still be holding the last answer, and the
  // options themselves change under it once a merge removes a member.
  useEffect(() => { if (!open) setStaged(null); }, [open]);

  const stagedOption = staged === null ? null
    : options.find(o => (o.value ?? o.label) === staged) ?? null;

  const close = () => { setQuery(''); setStaged(null); onClose(); };

  return (
    <Sheet open={open} onClose={close} title={title} placement={placement}>
      <View style={{ marginTop: SPACE.md }}>
        <PickerSearch query={query} onChange={setQuery} placeholder={placeholder} />
      </View>

      {/* flexShrink so a pinned footer below cannot be pushed off the card's
          own maxHeight -- the list gives way, the confirm stays reachable. */}
      <ScrollView style={{ marginTop: SPACE.md, flexShrink: 1 }} contentContainerStyle={{ gap: 7 }} keyboardShouldPersistTaps="handled">
        {/* `o.value ?? o.label` is the fallback, and a two-step picker whose
            options carry NO value would mark BOTH of two same-label rows
            "Selected" -- the duplicate-key defect's twin, now that duplicate
            rows actually render. The one two-step caller passes a member id;
            a second one must too. */}
        {results.map((o, i) => (
          <PickerChoice key={pickerKey(o, i)} option={o}
            on={twoStep ? staged === (o.value ?? o.label) : o.label === value}
            onPress={() => {
              if (twoStep) { setStaged(o.value ?? o.label); return; }
              setQuery(''); onSelect(o.value ?? o.label);
            }} />
        ))}

        {canAdd ? (
          <PickerAddRow label={query.trim()} meta={addMeta}
            onPress={() => { const v = query.trim(); setQuery(''); onAdd!(v); }} />
        ) : null}

        {empty ? <PickerEmpty note={emptyNote} /> : null}
      </ScrollView>

      {/* WHAT IT WILL DO, before it is done -- and only once there is
          something to say it about. A sentence describing a merge with no
          member picked would have to say "her", which is the ambiguity this
          two-step exists to remove. */}
      {twoStep ? (
        <View style={{ marginTop: SPACE.md, borderTopWidth: 1, borderTopColor: theme.line, paddingTop: SPACE.md }}>
          <Text style={{ fontSize: 12, color: theme.muted, lineHeight: 19, minHeight: 38 }}>
            {stagedOption && confirmNote ? confirmNote(stagedOption) : 'Pick the right member, then confirm.'}
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

/** How many rows a list may reach before it is worth a search box. */
const SEARCH_FROM = 7;

/**
 * A picker that opens UNDER the field it fills, the way the date field does
 * (requests/2026-09-06-pickers-open-under-their-field.md).
 *
 * The sheet covered the form the value was being chosen for and, on a
 * desktop window, slid a band the full width of the screen up for a list of
 * two courses. This hangs the same rows off the field instead, as wide as
 * the field, with the rest of the form still in view around it.
 *
 * The search box is drawn only where it earns its height: when a label can
 * be typed in and added (`onAdd`), or when the list is long enough to need
 * narrowing. A two-item course list is just the two items.
 *
 * `label` is spoken, not drawn: the field the panel hangs under already
 * says what is being chosen.
 */
export function AnchoredPicker({ open, onClose, label, placeholder, options, value, onSelect, onAdd, addMeta, emptyNote, anchor, testID }:
  {
    open: boolean; onClose: () => void; label: string; placeholder: string;
    options: PickerOption[]; value?: string;
    /** the option's `value` when it has one, otherwise its label */
    onSelect: (chosen: string) => void;
    onAdd?: (label: string) => void;
    addMeta?: string;
    emptyNote?: string;
    /** where the field is -- `useAnchor().anchor`, measured at the press */
    anchor: Anchor | null;
    testID: string;
  }) {
  const { query, setQuery, results, canAdd, empty } = usePickerQuery(options, onAdd);
  const searchable = !!onAdd || options.length > SEARCH_FROM;
  const close = () => { setQuery(''); onClose(); };

  return (
    <AnchoredPanel open={open} onClose={close} label={label} anchor={anchor} testID={testID}
      /* The rows reach the panel's edges, so the panel keeps no padding of
         its own and the two pieces that are NOT rows take it back below. */
      bleed
      header={searchable ? (
        <View style={{ padding: SPACE.md, paddingBottom: SPACE.sm }}>
          <PickerSearch query={query} onChange={setQuery} placeholder={placeholder}
            testID={`${testID}-search`} />
        </View>
      ) : null}>
      <View accessibilityRole="radiogroup" accessibilityLabel={label}>
        {/* Flat rows with a hairline between them, the chosen one tinted and
            ticked -- `MenuRow`, shared with the dropdowns the course and
            offering forms open, so a form field's list looks the same
            whichever of the two components draws it
            (requests/2026-09-08-form-dropdown-list-ui.md).

            Not the merge picker's rows: `SearchPicker` is opened from a list
            row rather than a form field, stages a choice instead of taking
            one, and keeps the card rows it shipped with. */}
        {results.map((o, i) => (
          <MenuRow key={pickerKey(o, i)} label={o.label} sub={o.sub} meta={o.meta}
            selected={o.label === value}
            /* no hairline above the first row, and none above a row that
               follows the search box -- the box already ends in an edge */
            divided={i > 0}
            testID={`${testID}-option-${slug(o.label)}`}
            onPress={() => { setQuery(''); onSelect(o.value ?? o.label); }} />
        ))}
        {/* Unchanged, both of them, and given back the inset the panel gave
            up: the "Add …" row is a bordered card and an edge-to-edge card
            is not one. */}
        {canAdd ? (
          <View style={{ padding: SPACE.md }}>
            <PickerAddRow label={query.trim()} meta={addMeta} testID={`${testID}-add`}
              onPress={() => { const v = query.trim(); setQuery(''); onAdd!(v); }} />
          </View>
        ) : null}
        {empty ? (
          <View style={{ paddingHorizontal: SPACE.md }}><PickerEmpty note={emptyNote} /></View>
        ) : null}
      </View>
    </AnchoredPanel>
  );
}

/**
 * The canvas' centred confirmation dialog. Sending email is the one
 * irreversible act in this app, so the prototype puts a modal in front of it
 * that restates the count AND the exclusions before anything leaves. "Not
 * yet" is the canvas' own wording for the way out.
 */
export function ConfirmDialog({ open, onClose, title, body, cancelLabel = 'Not yet', confirmLabel, onConfirm, emphasis = 'confirm' }:
  {
    open: boolean; onClose: () => void; title: string; body: string;
    cancelLabel?: string; confirmLabel: string; onConfirm: () => void;
    /** Which answer is the filled one. Defaults to the confirm button, which
     *  is what every dialog here did before the member deletion asked for the
     *  other; see src/components/confirmEmphasis.ts. */
    emphasis?: ConfirmEmphasis;
  }) {
  const { theme } = useTheme();
  const painted = confirmButtonStyles(emphasis);

  /** The fill and the edge for one of the two buttons. A `safe` fill sits on
   *  a card it barely out-contrasts in the dark theme, so it is bordered:
   *  the button's edge is drawn rather than left to the fill to imply. */
  const buttonFace = (style: ConfirmButtonStyle): ViewStyle =>
    style === 'accent' ? { backgroundColor: theme.accent }
    : style === 'safe' ? { backgroundColor: theme.safeFill, borderWidth: 1, borderColor: theme.lineStrong }
    : { borderWidth: 1, borderColor: theme.lineStrong };

  const buttonInk = (style: ConfirmButtonStyle): string =>
    style === 'accent' ? theme.onAccent
    : style === 'safe' ? theme.onSafeFill
    : style === 'outline-danger' ? theme.danger
    : theme.fgStrong;

  // No field of its own, so there is never a caret inside to keep -- but a
  // dialog that is SHUT must not blur the form field behind it either.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    blurOpener(open, null);
  }, [open]);

  if (!open) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26 }}>
        {/* Inert, exactly as `FormDialog`'s backdrop is, and for the same
            reason: a press beside a dialog is a miss, not a decision. This
            one asks a question that cannot be un-asked once answered -- the
            send, the delete -- so walking away from it by accident is worse
            here, not better. The way out is `cancelLabel` below, which is
            always drawn and always says what it does. Unlike FormDialog's,
            this element paints the dim itself, and it still does; it keeps
            swallowing the press by filling the space, and just no longer
            acts on one. */}
        <View testID="confirm-scrim" onStartShouldSetResponder={() => true}
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
                ...buttonFace(painted.cancel),
                opacity: pressed ? (isFilled(painted.cancel) ? 0.85 : 0.7) : 1,
              })}>
              <Text style={{
                fontSize: 14, fontWeight: isFilled(painted.cancel) ? '800' : '700',
                color: buttonInk(painted.cancel),
              }}>{cancelLabel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} accessibilityRole="button"
              style={({ pressed }) => ({
                flex: 1, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                ...buttonFace(painted.confirm),
                opacity: pressed ? (isFilled(painted.confirm) ? 0.85 : 0.7) : 1,
              })}>
              <Text style={{
                fontSize: 14, fontWeight: isFilled(painted.confirm) ? '800' : '700',
                color: buttonInk(painted.confirm),
              }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
