// `Fragment` is imported as a VALUE, not for tidiness: the filter row is
// pushed into the page scroller's children list keyed but UNWRAPPED, and a
// plain View around it would put its open panel back behind the table.
import { Fragment, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Muted, Label, Skeleton, EmptyState, ErrorState } from '../src/components/ui';
import { ScreenHeader, ShellScreen } from '../src/components/AppShell';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN } from '../src/theme/tokens';
import { DropdownRow, DropdownField, DropdownPanel, DropdownItem, DropdownList } from '../src/components/Dropdown';
import { PeriodPanel, periodFieldValue } from '../src/components/PeriodFilter';
import { resolvePeriod, type PeriodChoice } from '../src/data/period';
import { ALL_BRANCHES } from '../src/state/academy';
import { useAudit, useRemarks, useFilterOptions } from '../src/data/hooks';
import { addRemark, REMARK_MAX } from '../src/data/repository';
import type { Remark } from '../src/data/mock';
import { toCsv } from '../src/data/csvFormat';
import { swipeHint } from '../src/components/tableScroll';
import { downloadCsv } from '../src/data/csv';
import {
  visibleEntries, isSessionAction, whenText, stampText, CATEGORY_CHIPS,
  type AuditCategory, type PlainEntry,
} from '../src/data/auditPlain';
import { groupRows, type PlainGroup, type PlainRow } from '../src/data/auditGroups';

/**
 * The audit log, rebuilt for the one person allowed to open it: the academy
 * owner, who does not read databases.
 *
 * WHAT WAS WRONG WITH THE TABLE THIS REPLACES
 * Nothing about the RECORD -- the rows were right, complete and immutable.
 * The screen simply printed them as the database stores them: the action as
 * a code (`member.insert`), the changed field as a COLUMN name (`full_name`),
 * and the one field that says who the entry is about -- `entity_id` -- as a
 * UUID. So the column headed "action name" read `communication.batc...` and
 * the line under it, meant to name the member, read
 * `a98a2d1a-32de-45f4-8b67-6...`. Every translation now happens in
 * src/data/auditPlain.ts, which is tested for TOTALITY: no future action can
 * reach this screen as a code.
 *
 * WHAT IT NOW SHOWS, AND WHAT IT DOES NOT
 * Changes only. Signing in and out is still recorded, still permanent and
 * still readable in the table -- it is not a CHANGE, and with fifty rows on
 * screen it was pushing real activity off the end. Nothing is deleted and no
 * write path was touched; `visibleEntries` decides what is LISTED and says so
 * in one line under the heading.
 *
 * ONE LINE PER CHANGED FIELD, FIVE COLUMNS
 * PREVIOUS VALUE and NEW VALUE are columns of their own, keeping the names
 * this screen has always used. A rule change with three thresholds is three
 * lines under one heading, the way it was -- with the fix that the FIELD is
 * now named on every line, including the first, which the old table left
 * unlabelled.
 *
 * ONE TABLE AT EVERY WIDTH
 * A phone gets the same five columns and scrolls sideways to reach them.
 * This screen briefly drew cards below 768pt and the cards dropped the
 * column names, which is precisely the labelling somebody reading a log is
 * looking for -- "previous value" and "modified at" are the question, not
 * decoration.
 *
 * THE HEADER IS FROZEN, AND FOLLOWS THE COLUMNS
 * `stickyHeaderIndices` on the page scroller, pinned to the column header's
 * position in the children array -- which is why the children are built as an
 * explicit list below rather than written inline: the index has to be the one
 * React actually sees, in every state. Because the header is a child of the
 * PAGE and the rows are in their own sideways scroller, the two are separate
 * scroll containers: the body reports its offset and the header is moved to
 * match, or the header would sit still while its own columns slid under it.
 */

/* The five columns the screen has always had, keeping the names the reader
 * already knows -- PREVIOUS VALUE and NEW VALUE are two columns rather than
 * one "Details" cell, because the question the log answers is "what was it,
 * and what is it now", and two values in one cell make that a sentence to
 * read instead of a pair to compare.
 *
 * Flex weights, not pixel widths, over a minimum: on a phone the row is
 * TABLE_MIN wide and scrolls sideways; on a desktop it fills whatever is
 * there. One table at every width -- the cards this screen briefly used
 * dropped the column names, which is exactly the labelling the reader was
 * looking for. */
const COLS = [
  { key: 'what',    label: 'What changed',   flex: 2.6 },
  { key: 'was',     label: 'Previous value', flex: 1.5 },
  { key: 'now',     label: 'New value',      flex: 1.5 },
  { key: 'who',     label: 'Modified by',    flex: 1.3 },
  { key: 'when',    label: 'Modified at',    flex: 1.4 },
  /* LAST, and last on purpose. A remark is written after reading the row,
   * so it sits at the end of the row it is about -- and being last means
   * adding it pushed no existing column sideways. */
  { key: 'remarks', label: 'Remarks',        flex: 2.5 },
] as const;

/**
 * The width the columns need to stay readable. Below it the table scrolls
 * sideways -- five columns squeezed into 358pt is five unreadable columns,
 * and a table nobody can read is not a table.
 */
const TABLE_MIN = 980;

/**
 * How many members a collapsed import names before it offers the rest.
 * The requester set it: "if more that 3 show +more on hit they can see full
 * list". Three is enough to recognise the file you just imported without the
 * row growing back into the wall of entries this collapse exists to remove.
 */
const NAMES_SHOWN = 3;

/**
 * One row of the table: ONE changed field, carrying the entry it belongs to.
 *
 * The entry is flattened rather than folded into a single cell because
 * PREVIOUS and NEW are columns — three changes stacked inside one cell would
 * put three values under a heading that says "new value", with nothing
 * saying which is which.
 */
type Line = {
  key: string;
  /** null on a collapsed run, which stands for many entries and is none */
  entry: PlainEntry | null;
  /** set only on a collapsed run */
  group?: PlainGroup;
  /** the field that changed, or null when the entry recorded no fields */
  label: string | null;
  from: string | null;
  to: string | null;
  /** true on the first line of an entry — the one that heads it */
  first: boolean;
  /** true on the last line of an entry — where the entry can sign off */
  last: boolean;
};

function toLines(rows: PlainRow[]): Line[] {
  const lines: Line[] = [];
  for (const row of rows) {
    // A collapsed run is ONE line. It has no per-field breakdown to lay out:
    // that is the whole point of it, and the entries it stands for are still
    // there to be expanded.
    if (row.kind === 'group') {
      lines.push({ key: row.key, entry: null, group: row.group,
                   label: null, from: null, to: null, first: true, last: true });
      continue;
    }
    const entry = row.entry;
    if (entry.changes.length === 0) {
      // An action that recorded no field changes is still something somebody
      // did. It gets a line rather than vanishing.
      lines.push({ key: entry.id, entry, label: null, from: null, to: null,
                   first: true, last: true });
      continue;
    }
    entry.changes.forEach((c, i) => lines.push({
      key: `${entry.id}-${i}-${c.label}`,
      entry, label: c.label, from: c.from, to: c.to,
      first: i === 0, last: i === entry.changes.length - 1,
    }));
  }
  return lines;
}

function AuditBody() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();
  /**
   * The date range, and it starts UNSET.
   *
   * Every other screen with a period opens on one — This week, This month —
   * because they answer "how are we doing lately". This screen answers "what
   * has happened", and a default range would hide changes nobody asked it to
   * hide, on the one screen whose promise is that nothing is hidden. So the
   * field reads "Any date" until somebody chooses otherwise, and "Any date"
   * is offered inside the panel as the way back.
   */
  const [choice, setChoice] = useState<PeriodChoice | null>(null);
  const range = useMemo(() => (choice ? resolvePeriod(choice) : null), [choice]);

  /**
   * The branch, kept LOCAL to this screen rather than taken from the shell
   * scope Attendance uses (src/state/academy). The shell branch is "which
   * branch am I working in"; narrowing an audit log by a choice made two
   * screens ago would quietly shorten a list whose whole promise is
   * completeness. This one starts at All branches every time the screen opens.
   */
  const [branch, setBranch] = useState<string>(ALL_BRANCHES);
  const [open, setOpen] = useState<'period' | 'branch' | null>(null);

  const { state, data, error, retry } = useAudit(forced, range);
  const remarks = useRemarks(forced);
  const options = useFilterOptions(forced);
  const branchOptions = options.data?.branches ?? [ALL_BRANCHES];

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [category, setCategory] = useState<AuditCategory | 'all'>('all');

  /**
   * The remark being written, and the ROW it belongs to.
   *
   * One composer, not fifty: `composingFor` holds the id of the single entry
   * open for annotation, so opening a second closes the first. Fifty rows
   * each holding their own draft would keep half-written notes alive behind
   * a filter change, and the reader would have no way to see they were there.
   */
  /** Collapsed runs the reader has opened, by group key. Runs start closed:
   *  the whole reason the row exists is that the expanded form buried the
   *  log, so it opens only when somebody asks for it. */
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (!next.delete(key)) next.add(key);
    return next;
  });

  const [composingFor, setComposingFor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /**
   * The header scroller, driven by the body's.
   *
   * The header is a child of the PAGE scroller so the page can pin it, and
   * the body is its own sideways scroller — two different scroll containers
   * showing the same columns. Nothing keeps them lined up but this: the body
   * reports its offset and the header is moved to match. Without it the
   * header stays put while the columns under it slide, which is worse than
   * no frozen header at all.
   */
  const headScroll = useRef<ScrollView>(null);

  /**
   * What the reader has not seen yet, in words.
   *
   * The table is 760pt over a ~358pt phone, so four of the five columns
   * start off the right-hand edge -- and a touch scrollbar is an overlay
   * that appears only once you are ALREADY scrolling. The round-1 rebuild
   * got the table right and left the reader no way to find that out, which
   * is why this round was asked as "where is new value, previous value,
   * modified at and modified by" -- they were one swipe away, unannounced.
   *
   * Only the SENTENCE is state. The measurements live in a ref because they
   * change on every frame of a swipe and the screen must not re-render 50
   * rows to move a scrollbar; setting the same sentence twice is a bail-out
   * in React, so the common case of scrolling within one hint costs nothing.
   */
  const [hint, setHint] = useState<string | null>(null);
  const geom = useRef({ x: 0, viewport: 0, content: 0 });
  const showHint = () => {
    const g = geom.current;
    const next = swipeHint(COLS, g.x, g.viewport, g.content).text;
    setHint(prev => (prev === next ? prev : next));
  };

  const entries = useMemo(() => data ?? [], [data]);

  /** Remarks by the entry they are about. A free-standing remark (entryId
   *  null -- everything written before 0044) belongs to no row and is not
   *  listed here; it is still stored, and still readable in the table it
   *  lives in. */
  const remarksFor = useMemo(() => {
    const byEntry = new Map<string, Remark[]>();
    for (const r of remarks.data ?? []) {
      if (r.entryId === null) continue;
      const list = byEntry.get(r.entryId);
      if (list) list.push(r); else byEntry.set(r.entryId, [r]);
    }
    return byEntry;
  }, [remarks.data]);
  /** One clock for the whole render: fifty rows asking the OS the time
   *  separately can straddle midnight and disagree about "Today". */
  const now = useMemo(() => new Date(), [entries]);

  /** Everything this screen is willing to list, before the chip and the box. */
  const listed = useMemo(() => entries.filter(e => !isSessionAction(e.action)), [entries]);
  const rows = useMemo(
    () => visibleEntries(entries, {
      category, query, now,
      branch: branch === ALL_BRANCHES ? null : branch,
    }),
    [entries, category, query, branch, now],
  );
  /** The table's rows: one per changed field (see `toLines`). */
  /**
   * The rows the table draws: every entry, with each bulk import collapsed
   * into one. Grouping happens AFTER the filters, so a search or a chip
   * narrows the entries first and the run is then built from what survived
   * -- a group never claims members the current view has filtered away.
   */
  const grouped = useMemo(() => groupRows(rows), [rows]);
  const lines = useMemo(() => toLines(grouped), [grouped]);
  const narrowed = rows.length !== listed.length;
  /** Whether anything is narrowing the list right now. */
  const filtered = range !== null || branch !== ALL_BRANCHES || query.trim() !== '' || category !== 'all';
  /** What is narrowing it, named — so "nothing matches" says which control
   *  to reach for rather than leaving somebody to hunt for it. */
  const filterWords = [
    range ? `the dates ${range.label}` : null,
    branch !== ALL_BRANCHES ? `the branch ${branch}` : null,
    category !== 'all' ? `the ${(CATEGORY_CHIPS.find(c => c.key === category)?.label ?? category).toLowerCase()} filter` : null,
    query.trim() !== '' ? `the search “${query.trim()}”` : null,
  ].filter(Boolean).join(' and ') || 'the filters set';

  const subtitle = state !== 'ready' ? undefined
    : narrowed
      ? `${rows.length} of ${listed.length} shown · newest first`
      : `${listed.length} ${listed.length === 1 ? 'change' : 'changes'} · newest first`;

  /**
   * A real file, not a toast. Unfolded to one line per changed field, because
   * a spreadsheet sorts and filters columns and a cell holding three changes
   * can do neither -- and with the action repeated on every line, so a sorted
   * file never has a row that lost its heading. The words are the screen's.
   */
  const exportLog = () => {
    try {
      const lines = rows.flatMap(r => (r.changes.length
        ? r.changes.map(c => [r.title, r.subject ?? '', c.label, c.from ?? '', c.to ?? '',
                              r.who, r.role ?? '', stampText(r.at)])
        : [[r.title, r.subject ?? '', '', '', '', r.who, r.role ?? '', stampText(r.at)]]));
      downloadCsv(
        `rosifit-audit-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(['What changed', 'About', 'Detail', 'Before', 'After', 'Done by', 'Role', 'When'], lines),
      );
      flash(`Exported ${lines.length} ${lines.length === 1 ? 'row' : 'rows'} · CSV, opens in Excel`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'The audit log could not be exported.', 'warn');
    }
  };

  const tooLong = draft.trim().length > REMARK_MAX;
  const canSave = draft.trim().length > 0 && !tooLong && !saving;

  const saveRemark = async () => {
    if (!canSave || composingFor === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      await addRemark(draft, composingFor);
      setDraft('');
      setComposingFor(null);
      flash('Remark added');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'The remark could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------------ pieces */

  const cell = (i: number) => ({ flex: COLS[i].flex, paddingHorizontal: 12 });

  /** A recorded value. Absent is a WORD, not a blank: a creation had no
   *  previous value and a cleared field has no new one, and those are two
   *  different facts that an empty cell would render identically. */
  const value = (v: string | null, absent: string, strong: boolean) => (
    <Text style={{
      fontSize: 12, lineHeight: 18,
      color: v === null ? theme.dim : strong ? theme.fgStrong : theme.muted,
      fontWeight: v !== null && strong ? '700' : '400',
    }}>{v ?? absent}</Text>
  );

  /** The frozen column header. Its own child of the page scroller, so the
   *  page can pin it; it paints an opaque ground and its own top corners,
   *  because the rows pass UNDER it. Its sideways position is set by the
   *  body, never by the reader — it is not scrollable itself. */
  const headerRow = (
    <ScrollView ref={headScroll} horizontal scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      style={{
        backgroundColor: theme.surface2,
        borderWidth: 1, borderColor: theme.lineStrong,
        borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
      }}
      contentContainerStyle={{ minWidth: TABLE_MIN, flexGrow: 1 }}>
      <View accessibilityRole="header"
        style={{ flexDirection: 'row', paddingVertical: 11, minWidth: TABLE_MIN, flexGrow: 1 }}>
        {COLS.map((c, i) => (
          <Text key={c.key} numberOfLines={1} style={{
            ...cell(i),
            fontSize: 9.5, fontWeight: '800', letterSpacing: 0.7,
            textTransform: 'uppercase', color: theme.muted,
          }}>{c.label}</Text>
        ))}
      </View>
    </ScrollView>
  );

  /**
   * The swipe line. It sits UNDER the frozen column header and inside the
   * same sticky child, because it is about those columns and has to stay
   * with them: a hint that scrolls away is a hint you have to remember.
   *
   * It renders only when the table actually overflows, so a desktop never
   * gets an instruction that does nothing, and it names the columns rather
   * than drawing a fade -- colour is never the only signal here, and
   * "Modified at" is the answer the reader is looking for anyway.
   */
  const hintBar = hint === null ? null : (
    <View testID="audit-swipe-hint"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 7,
        backgroundColor: theme.surface2,
        borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
        borderColor: theme.lineStrong,
      }}>
      <Icon name="swipe" size={14} color={theme.accentInk} />
      <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: theme.fg }}>
        {hint}
      </Text>
    </View>
  );

  /**
   * What sits in the Remarks column: the notes already written about this
   * entry, and the way to add one.
   *
   * The composer opens IN the cell rather than in a dialog, because the
   * reason for writing a remark is the row beside it -- a dialog would cover
   * the change the note is about. One row is open at a time.
   *
   * Append-only is stated BEFORE anything is typed rather than after it is
   * saved: the note cannot be edited or deleted once it is in, and somebody
   * should know that while they are still choosing their words.
   */
  const remarksCell = (r: { id: string; title: string }) => {
    const mine = remarksFor.get(r.id) ?? [];
    const open = composingFor === r.id;
    return (
      <View>
        {mine.map(m => (
          <View key={m.id} testID={`audit-remark-${m.id}`} style={{ marginBottom: 6 }}>
            <Text style={{ fontSize: 11.5, color: theme.fgStrong, lineHeight: 16 }}>{m.body}</Text>
            <Text style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>
              {m.who} · {whenText(m.when, now)}
            </Text>
          </View>
        ))}

        {open ? (
          <View>
            <TextInput
              value={draft} onChangeText={setDraft} multiline autoFocus
              placeholder="Why was this done?"
              placeholderTextColor={theme.muted}
              accessibilityLabel={`Write a remark about ${r.title}`}
              selectionColor={theme.accent}
              style={{
                minHeight: 54, borderWidth: 1, borderRadius: RADIUS.sm,
                borderColor: saveError ? theme.danger : theme.accent,
                backgroundColor: theme.surface2, color: theme.fgStrong,
                fontSize: 12, paddingHorizontal: 8, paddingVertical: 6,
                textAlignVertical: 'top', outlineWidth: 0, outlineStyle: 'solid',
              }} />
            {saveError ? (
              <Text accessibilityLiveRegion="polite"
                style={{ fontSize: 10.5, color: theme.danger, marginTop: 4 }}>{saveError}</Text>
            ) : tooLong ? (
              <Text accessibilityLiveRegion="polite"
                style={{ fontSize: 10.5, color: theme.danger, marginTop: 4 }}>
                {draft.trim().length} of {REMARK_MAX} characters
              </Text>
            ) : (
              <Text style={{ fontSize: 10, color: theme.muted, marginTop: 4 }}>
                Saved for good — a remark cannot be edited or deleted.
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <Pressable testID={`audit-remark-save-${r.id}`}
                onPress={() => void saveRemark()} disabled={!canSave}
                accessibilityRole="button" accessibilityLabel="Save this remark"
                style={({ pressed }) => ({
                  minHeight: 28, paddingHorizontal: 10, borderRadius: RADIUS.sm,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: canSave ? theme.accent : theme.control,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <Text style={{
                  fontSize: 11, fontWeight: '800',
                  color: canSave ? theme.onAccent : theme.muted,
                }}>{saving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
              <Pressable testID={`audit-remark-cancel-${r.id}`}
                onPress={() => { setComposingFor(null); setDraft(''); setSaveError(null); }}
                accessibilityRole="button" accessibilityLabel="Discard this remark"
                style={({ pressed }) => ({
                  minHeight: 28, paddingHorizontal: 10, borderRadius: RADIUS.sm,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: theme.lineStrong,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.fg }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable testID={`audit-remark-add-${r.id}`}
            onPress={() => { setComposingFor(r.id); setDraft(''); setSaveError(null); }}
            accessibilityRole="button"
            accessibilityLabel={`Add a remark about ${r.title}`}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 4,
              minHeight: 26, opacity: pressed ? 0.7 : 1,
            })}>
            <Icon name="add" size={13} color={theme.accentInk} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.accentInk }}>
              {mine.length ? 'Add another' : 'Add remark'}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  /**
   * A whole import on one line.
   *
   * WHAT COLUMN GETS WHAT, and why it is not arbitrary: the members it added
   * are the NEW VALUE, because that is what the run produced. PREVIOUS VALUE
   * is "nothing before" for the same reason every creation says it. The
   * heading carries the count and the file, which is the fact the reader
   * came for.
   */
  const groupRow = (l: Line, g: PlainGroup) => {
    const open = expanded.has(l.key);
    const shown = open ? g.names : g.names.slice(0, NAMES_SHOWN);
    const hidden = g.names.length - shown.length;
    return (
      <View key={l.key} testID={`audit-row-${l.key}`} style={{
        flexDirection: 'row', alignItems: 'flex-start',
        paddingTop: 13, paddingBottom: 11,
        minWidth: TABLE_MIN, flexGrow: 1,
        borderBottomWidth: 1, borderBottomColor: theme.line,
      }}>
        <View style={cell(0)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name={g.icon} size={15} color={theme.accentInk} />
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '800', color: theme.fgStrong }}>
              {g.title}
            </Text>
          </View>
          {g.file ? (
            <Text style={{ fontSize: 11.5, color: theme.fg, marginTop: 2, marginLeft: 21 }}>
              {g.file}
            </Text>
          ) : null}
          {/* What the one row stands for. An audit log may summarise how it
              DISPLAYS entries; it may not leave somebody thinking eight
              records were one. */}
          <Text style={{ marginLeft: 21, marginTop: 5, fontSize: 10.5, color: theme.dim }}>
            {g.entryCount} {g.entryCount === 1 ? 'entry' : 'entries'} in this import
            {g.countIsReported ? '' : ' · counted from the entries shown'}
          </Text>
        </View>

        <View style={cell(1)}>{value(null, 'nothing before', false)}</View>

        <View style={cell(2)}>
          {shown.map(n => (
            <Text key={n} style={{ fontSize: 12, fontWeight: '700', color: theme.fgStrong, lineHeight: 17 }}>
              {n}
            </Text>
          ))}
          {hidden > 0 || open ? (
            <Pressable testID={`audit-group-more-${g.id}`}
              onPress={() => toggle(l.key)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={open
                ? `Show fewer of the ${g.names.length} members added`
                : `Show all ${g.names.length} members added`}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 3,
                minHeight: 24, marginTop: 3, opacity: pressed ? 0.7 : 1,
              })}>
              <Icon name={open ? 'expand_less' : 'expand_more'} size={14} color={theme.accentInk} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.accentInk }}>
                {open ? 'Show fewer' : `+${hidden} more`}
              </Text>
            </Pressable>
          ) : null}
          {g.names.length === 0 ? (
            <Text style={{ fontSize: 12, color: theme.dim }}>No members named</Text>
          ) : null}
        </View>

        <View style={cell(3)}>
          <Text style={{ fontSize: 11.5, color: theme.fg, fontWeight: '600' }}>{g.who}</Text>
          {g.role ? (
            <Text style={{ fontSize: 10.5, color: theme.muted, marginTop: 2 }}>{g.role}</Text>
          ) : null}
        </View>

        <View style={cell(4)}>
          <Text style={{ fontSize: 11.5, color: theme.muted }}>{g.when}</Text>
        </View>

        {/* The run is one act, so it takes one remark -- filed against the
            import’s own summary entry, which is the row the database wrote
            to say the import happened. */}
        <View style={cell(5)}>{remarksCell({ id: g.id, title: g.title })}</View>
      </View>
    );
  };

  const tableRow = (l: Line) => {
    if (l.group) return groupRow(l, l.group);
    const r = l.entry;
    if (!r) return null;
    return (
      <View key={l.key} testID={`audit-row-${l.key}`} style={{
        flexDirection: 'row', alignItems: 'flex-start',
        paddingTop: l.first ? 13 : 9, paddingBottom: 11,
        minWidth: TABLE_MIN, flexGrow: 1,
        // A continuation line is part of the act above it, not a new one.
        borderBottomWidth: 1, borderBottomColor: theme.line,
      }}>
        <View style={cell(0)}>
          {/* The heading line: what happened, and to whom. Only the first
              line of an entry carries it — the ones under it are the same
              act, and repeating it would read as three separate changes. */}
          {l.first ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name={r.icon} size={15} color={theme.accentInk} />
                <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '800', color: theme.fgStrong }}>
                  {r.title}
                </Text>
              </View>
              {r.subject ? (
                <Text style={{ fontSize: 11.5, color: theme.fg, marginTop: 2, marginLeft: 21 }}>
                  {r.subject}
                </Text>
              ) : null}
            </>
          ) : null}

          {/* The field itself, on EVERY line. The table this replaces named
              the field only on continuation lines, so the first line's two
              values sat under no label at all — the one row where you could
              not tell what had changed. */}
          {l.label ? (
            <Text numberOfLines={2} style={{
              marginLeft: 21, marginTop: l.first ? 4 : 0,
              fontSize: 10, fontWeight: '800', letterSpacing: 0.5,
              textTransform: 'uppercase', color: theme.muted,
            }}>{l.label}</Text>
          ) : (
            <Text style={{ marginLeft: 21, marginTop: 4, fontSize: 11, color: theme.dim }}>
              No field values recorded
            </Text>
          )}

          {/* What the summary left out, on the LAST line of the entry so it
              reads as a footnote to the whole act. The log promises nothing
              is hidden; a row that quietly prints one of six fields would
              break that promise without ever saying so. */}
          {l.last && r.hiddenCount > 0 ? (
            <Text style={{ marginLeft: 21, marginTop: 5, fontSize: 10.5, color: theme.dim }}>
              +{r.hiddenCount} more {r.hiddenCount === 1 ? 'field' : 'fields'} recorded, not shown
            </Text>
          ) : null}

          {/* WHAT WENT WITH IT. A permanent deletion records no changed
              fields — it writes an empty list and then removes the row — so
              this cell read "No field values recorded" about the most
              destructive act the app offers. The counts were in the entry all
              along: what was attached to her, how many days' figures moved,
              and, for a purge run by a migration, who ordered it. Capped at
              four lines because a purge note runs to a paragraph and the whole
              of it is still reachable through the search box. */}
          {l.last && r.detail ? (
            <Text numberOfLines={4} style={{
              marginLeft: 21, marginTop: 5, fontSize: 10.5, lineHeight: 15, color: theme.dim,
            }}>{r.detail}</Text>
          ) : null}
        </View>

        {/* "Nothing before" is a creation; "cleared" is a value taken away;
            "no longer on record" is the record itself being gone. All three
            are words, so the distinction survives a greyscale screen — and
            the third is a different fact from the second, which is why a
            deletion may not borrow "cleared": a cleared field leaves a row
            behind, and this does not. */}
        <View style={cell(1)}>{value(l.from, l.label ? 'nothing before' : '—', false)}</View>
        <View style={cell(2)}>
          {value(l.to, l.label ? (r.removal ? 'no longer on record' : 'cleared') : '—', true)}
        </View>

        <View style={cell(3)}>
          {l.first ? (
            <>
              <Text style={{ fontSize: 11.5, color: theme.fg, fontWeight: '600' }}>{r.who}</Text>
              {r.role ? (
                <Text style={{ fontSize: 10.5, color: theme.muted, marginTop: 2 }}>{r.role}</Text>
              ) : null}
            </>
          ) : null}
        </View>

        <View style={cell(4)}>
          {l.first
            ? <Text style={{ fontSize: 11.5, color: theme.muted }}>{r.when}</Text>
            : null}
        </View>

        {/* REMARKS. Only on the first line of an entry, like the actor and
            the time: a remark is about the ACT, not about one of the fields
            it changed, and repeating it down three continuation lines would
            read as three separate notes. */}
        <View style={cell(5)}>{l.first ? remarksCell(r) : null}</View>
      </View>
    );
  };

  /**
   * The two filters that narrow before the search does. They open in place,
   * under their own fields, so the list they are about stays in view while the
   * choice is made (CP-014).
   *
   * IT IS ITS OWN CHILD OF THE PAGE SCROLLER, AND THAT IS THE FIX.
   * react-native-web gives every `<View>` `position: relative; z-index: 0`, so
   * every View opens a stacking context. `DropdownRow` lifts itself to
   * `zIndex: 40` while a panel is out — but a lift only ranks a node against
   * its own SIBLINGS, so any plain View wrapped around it puts the panel back
   * at 0 and nothing about the code looks wrong. This row used to sit inside
   * two of them, one grouping it with the search box and one holding a margin,
   * and the open panel was therefore painted underneath the frozen column
   * header (which the scroller itself lifts to `zIndex: 10`) and underneath the
   * table below it. The filters opened, applied and closed correctly the whole
   * time; they were simply behind the log (RC-035).
   *
   * So it is pushed on its own, exactly as Overview, Attendance and Reports
   * mount theirs. Nothing here carries a z-index of its own — a number tuned to
   * out-rank the header would be the next thing to go wrong the day the header
   * changes.
   */
  const filters = (
    <DropdownRow open={open !== null} style={{ marginBottom: SPACE.sm }}
      dismiss={{ onPress: () => setOpen(null), testID: 'audit-filter-dismiss' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
        <DropdownField testID="audit-filter-period"
          label="Dates" value={choice ? periodFieldValue(choice) : 'Any date'}
          open={open === 'period'} highlight={choice !== null}
          onPress={() => setOpen(o => (o === 'period' ? null : 'period'))}
          style={{ flexBasis: '48%', flexGrow: 1 }} />
        <DropdownField testID="audit-filter-branch"
          label="Branch" value={branch}
          open={open === 'branch'} highlight={branch !== ALL_BRANCHES}
          onPress={() => setOpen(o => (o === 'branch' ? null : 'branch'))}
          style={{ flexBasis: '48%', flexGrow: 1 }} />
      </View>

      {open === 'period' ? (
        <DropdownPanel maxHeight={470}>
          {/* "Any date" sits ABOVE the shared panel rather than inside it.
              Adding an item to PeriodPanel itself would give every other
              screen a range option none of them wants, and this screen is
              the only one whose honest default is no range at all. */}
          <DropdownItem testID="audit-period-any"
            label="Any date" meta="Every change the log holds"
            selected={choice === null}
            onPress={() => { setChoice(null); setOpen(null); }} />
          {/* `null` means none of the presets is the choice — "Any date"
              above is. Passing a stand-in preset here made the panel mark
              that preset Selected beside an already-Selected "Any date":
              two radios claiming to be the answer, announced as two. */}
          <PeriodPanel testID="audit-period"
            choice={choice}
            onChange={setChoice} onDone={() => setOpen(null)} />
        </DropdownPanel>
      ) : null}
      {open === 'branch' ? (
        <DropdownPanel>
          <DropdownList testID="audit-branch"
            options={branchOptions.map(label => ({ label }))} value={branch}
            onSelect={l => { setBranch(l); setOpen(null); }} />
        </DropdownPanel>
      ) : null}
    </DropdownRow>
  );

  /* Everything that does NOT float. Kept apart from the filter row above so
   * that row can be its own child of the page scroller — see the note on
   * `filters`; a View grouping the two of them is precisely what trapped the
   * open panel underneath the table. */
  const controls = (
    <View style={{ marginBottom: SPACE.md }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        height: 46, borderRadius: RADIUS.md, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: searching ? theme.accent : theme.lineStrong,
        paddingHorizontal: 13,
      }}>
        <Icon name="search" size={19} color={theme.muted} />
        <TextInput
          value={query} onChangeText={setQuery}
          placeholder="A member, a course, a person or a value"
          placeholderTextColor={theme.muted}
          accessibilityLabel="Search the audit log"
          onFocus={() => setSearching(true)} onBlur={() => setSearching(false)}
          selectionColor={theme.accent}
          style={{ flex: 1, color: theme.fgStrong, fontSize: 13.5, fontWeight: '600',
            outlineWidth: 0, outlineStyle: 'solid' }} />
      </View>

      {/* Colour is never the only signal: each chip carries its word and its
          own glyph, and the selected one is stated to a screen reader. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACE.sm, paddingVertical: SPACE.md }}>
        {CATEGORY_CHIPS.map(c => {
          const on = category === c.key;
          return (
            <Pressable key={c.key} testID={`audit-chip-${c.key}`}
              onPress={() => setCategory(c.key)}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              accessibilityLabel={`Show ${c.label.toLowerCase()}`}
              style={{
                minHeight: TAP_MIN, flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 12, borderRadius: RADIUS.pill,
                backgroundColor: on ? theme.accent : theme.surface,
                borderWidth: 1, borderColor: on ? theme.accent : theme.lineStrong,
              }}>
              <Icon name={c.icon} size={15} color={on ? theme.onAccent : theme.fg} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: on ? theme.onAccent : theme.fg }}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  /* ----------------------------------------------------------- assembly
   * Built as an explicit list because the sticky index must be the position
   * React actually sees. A conditional written inline shifts every index
   * after it, and the symptom is a pinned SEARCH BOX rather than an error.
   */
  const children: React.ReactNode[] = [];
  let stickyAt: number | undefined;

  children.push(
    <ScreenHeader key="head"
      title="Audit log"
      subtitle={subtitle}
      onBack={() => router.back()}
      right={state === 'ready' && rows.length > 0 ? (
        <Pressable testID="audit-export" onPress={exportLog}
          accessibilityRole="button"
          accessibilityLabel={`Export ${rows.length} entries as CSV`}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 5,
            height: 36, paddingHorizontal: 12, borderRadius: 11,
            backgroundColor: theme.control, borderWidth: 1, borderColor: theme.lineStrong,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name="download" size={16} color={theme.accentInk} />
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>Export</Text>
        </Pressable>
      ) : undefined} />,
  );

  children.push(
    <Muted key="intro" style={{ marginBottom: SPACE.lg }}>
      Every change made in the app — members, courses, schedules, attendance, uploads, messages
      and accounts — with the name of whoever made it, staff included. Signing in and out is
      recorded too, but it changes nothing, so it is not listed here. Nothing on this page can
      be edited or deleted by anyone, including the system.
    </Muted>,
  );

  if (state === 'loading') children.push(<Skeleton key="skeleton" lines={5} />);

  if (state === 'error') {
    children.push(
      <ErrorState key="error" onRetry={retry}
        message={error ?? 'The audit log could not be loaded. Nothing has been changed.'} />,
    );
  }

  if (state === 'ready') {
    /**
     * A log with nothing in it and a log FILTERED to nothing are different
     * answers, and only one of them may say "nothing has been changed yet".
     * The dates narrow the query, so an empty result under a chosen range
     * means empty IN THAT RANGE — saying otherwise would be a false
     * statement about the academy's history.
     */
    if (listed.length === 0 && !filtered) {
      children.push(
        <EmptyState key="empty"
          title="No changes recorded yet"
          body="Every change writes an entry here as soon as it happens. Signing in is recorded separately and is not shown, so an empty list means nothing has been changed yet — not that anything is missing." />,
      );
    } else {
      // The filters render even when they have narrowed the list to nothing.
      // A filter that disappears with its own rows leaves somebody looking at
      // an empty month with no way to ask for another one.
      //
      // TWO children, not one wrapped in a View. The filter row's open panel
      // is absolutely positioned and ranks itself with a z-index, which only
      // counts against its own siblings — wrapping it put it behind the table
      // (see the note on `filters`).
      children.push(<Fragment key="filters">{filters}</Fragment>);
      children.push(<Fragment key="controls">{controls}</Fragment>);

      if (rows.length === 0) {
        children.push(
          <EmptyState key="no-match"
            title="Nothing matches"
            body={`No change matches ${filterWords}. Clear one of them to see the rest — nothing has been hidden permanently, and nothing has been deleted.`} />,
        );
      } else {
        // The frozen header. Its index is captured HERE, after every
        // conditional above it has decided.
        stickyAt = children.length;
        children.push(<View key="thead">{headerRow}{hintBar}</View>);
        children.push(
          <ScrollView key="tbody" horizontal
            showsHorizontalScrollIndicator
            onScroll={e => {
              const x = e.nativeEvent.contentOffset.x;
              headScroll.current?.scrollTo({ x, animated: false });
              geom.current.x = x;
              showHint();
            }}
            onLayout={e => { geom.current.viewport = e.nativeEvent.layout.width; showHint(); }}
            onContentSizeChange={w => { geom.current.content = w; showHint(); }}
            scrollEventThrottle={16}
            style={{
              borderWidth: 1, borderTopWidth: 0, borderColor: theme.lineStrong,
              borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg,
              backgroundColor: theme.surface,
            }}
            contentContainerStyle={{ minWidth: TABLE_MIN, flexGrow: 1 }}>
            <View style={{ minWidth: TABLE_MIN, flexGrow: 1 }}>
              {lines.map(tableRow)}
            </View>
          </ScrollView>,
        );
      }

      /* The remarks load has no section of its own any more, so its failure
       * is reported here. Without this the column renders empty on an error
       * and reads as "no remarks" -- which is a different, and false,
       * statement about the record. */
      if (remarks.state === 'error') {
        children.push(
          <View key="remark-error" style={{ marginTop: SPACE.md }}>
            <ErrorState onRetry={remarks.retry}
              message={remarks.error ?? 'The remarks could not be loaded. The log above is unaffected.'} />
          </View>,
        );
      }

      children.push(
        <Muted key="foot" style={{ marginTop: SPACE.md }}>
          A bulk import is one line, however many records it wrote — press “+ more” to see every
          member it added. Nothing is merged away: the row says how many entries it stands for,
          and Export writes every one of them separately, as it always has.
          One line per changed field; the lines under a heading are the same act.
          A record being CREATED lists only the fields that name it — everything else it
          was born with is still recorded, and the count of what is not printed is shown
          on the row. Remarks are your own words about a change: they sit in the last
          column, beside the change they are about, and cannot be edited or deleted.
          “Nothing before” is a record being created, “cleared” is a value taken away, and a
          dash means the record a value pointed at is no longer there. A permanent deletion
          reads “no longer on record”: it names who or what was removed, from the name the
          deletion itself wrote down before the row went, and says what went with them. On a
          narrow screen the table scrolls sideways and the header follows it.
          Only the fifty most recent changes are shown{range ? ' for the dates chosen' : ''}.
          {branch === ALL_BRANCHES ? '' : ` A change is matched to ${branch} by what it points at`
            + ' today, and changes that belong to no single branch — a setting, a message'
            + ' template, an account — are not listed while a branch is chosen.'}
        </Muted>,
      );
    }
  }

  children.push(
    <View key="never" style={{
      marginTop: SPACE.lg, padding: SPACE.lg, borderRadius: RADIUS.lg,
      backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
    }}>
      <Label>What is never recorded</Label>
      <Muted style={{ marginTop: SPACE.sm }}>
        PINs, security answers, passwords and provider keys never reach this log — not in
        readable form and not hashed. That is enforced when the entry is written, not by
        remembering to leave them out.
      </Muted>
    </View>,
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}
      stickyHeaderIndices={stickyAt === undefined ? undefined : [stickyAt]}
      contentContainerStyle={{ padding: SPACE.lg, paddingBottom: 96 }}>
      {children}
    </ScrollView>
  );
}

/**
 * Under the shell, not instead of it. This screen is pushed on the root
 * stack, so it is not one of the tab navigator's own and wore no academy
 * header and no Home · Reports · More pill until ShellScreen drew them.
 */
export default function Audit() {
  return <ShellScreen><AuditBody /></ShellScreen>;
}
