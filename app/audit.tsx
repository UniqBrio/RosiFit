import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Muted, Label, Skeleton, EmptyState, ErrorState } from '../src/components/ui';
import { ScreenHeader, ShellScreen } from '../src/components/AppShell';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, STATUS } from '../src/theme/tokens';
import { useAudit } from '../src/data/hooks';
import { toCsv } from '../src/data/csvFormat';
import { downloadCsv } from '../src/data/csv';
import type { AuditEntry } from '../src/data/mock';

/**
 * C-94/C-96, as the canvas now draws it: a TABLE, five columns, newest first,
 * and nothing editable.
 *
 * WHY A TABLE RATHER THAN THE CARDS THIS SCREEN HAD
 * The cards stacked WHO, WHAT, WHEN, PREVIOUS and CURRENT vertically, one
 * card per entry. That reads a single change well and answers the question
 * the log exists for -- "what changed here, and when did it start" -- badly:
 * comparing the same field across six entries meant scrolling past five
 * cards' worth of labels. The columns put the values under each other, which
 * is the comparison, and the table scrolls sideways rather than reflowing,
 * because a column that changes width between two rows stops being a column.
 *
 * ONE ROW PER CHANGE, NOT PER ENTRY
 * An audit entry carries a LIST of changed fields -- the follow-up rule entry
 * in the fixtures changes three at once. The canvas draws one old/new pair per
 * row, so an entry with three changes becomes three rows under one action.
 * Flattening keeps every value visible; folding them into one cell would hide
 * two-thirds of what the entry recorded.
 */

/** A flattened table row: one changed field, carrying its entry's identity. */
type AuditRow = {
  key: string;
  action: string;
  subject: string;
  field: string;
  old: string | null;
  now: string | null;
  who: string;
  when: string;
  /** True on the first row of an entry. The table heads only that row with
   *  the action, so the eye reads three changed fields as one act rather than
   *  as three -- while every row still KNOWS its action, which is what the
   *  export needs once a spreadsheet sorts the rows out of order. */
  first: boolean;
};

function flatten(entries: AuditEntry[]): AuditRow[] {
  const rows: AuditRow[] = [];
  for (const a of entries) {
    const shared = { action: a.action, subject: a.subject, who: a.who, when: a.when };
    if (a.changes.length === 0) {
      // A creation records no PREVIOUS value for anything. It is still an
      // action somebody took, so it gets a row rather than vanishing.
      rows.push({ ...shared, key: a.id, field: a.entity, old: null, now: null, first: true });
      continue;
    }
    a.changes.forEach((c, i) => rows.push({
      ...shared,
      key: `${a.id}-${i}-${c.field}`,
      field: c.field, old: c.old, now: c.new,
      first: i === 0,
    }));
  }
  return rows;
}

/** The five column widths the canvas states, in order. */
const COLS = [
  { label: 'Action name',   width: 170 },
  { label: 'Value existed', width: 150 },
  { label: 'New value',     width: 180 },
  { label: 'Modified by',   width: 130 },
  { label: 'Modified at',   width: 160 },
] as const;

const TABLE_WIDTH = COLS.reduce((w, c) => w + c.width, 0);

function AuditBody() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();
  const { state, data, error, retry } = useAudit(forced);
  const entries = data ?? [];
  const rows = flatten(entries);

  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;

  /**
   * A real file, not a toast. The canvas' Export flashed "Exporting the audit
   * log · Excel (.xlsx)" and produced nothing -- the same defect as a form
   * that reports a save it never attempted. CSV rather than xlsx because it
   * needs no dependency and Excel opens it; the toast says which it is.
   */
  const exportLog = () => {
    try {
      downloadCsv(
        `rosifit-audit-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(
          ['Action', 'Subject', 'Field', 'Value existed', 'New value', 'Modified by', 'Modified at'],
          // The same flattened rows the table draws, so the file and the
          // screen agree line for line -- but with the action on EVERY row,
          // because a spreadsheet gets sorted and a row that inherited its
          // action from the one above it would lose it.
          rows.map(r => [r.action, r.subject, r.field, r.old ?? 'NA', r.now ?? 'NA', r.who, r.when]),
        ),
      );
      flash(`Exported ${rows.length} ${rows.length === 1 ? 'row' : 'rows'} · CSV, opens in Excel`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'The audit log could not be exported.', 'warn');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: SPACE.lg, paddingBottom: 96 }}>
      <ScreenHeader
        title="Audit log"
        subtitle={state === 'ready'
          ? `${entries.length} ${entries.length === 1 ? 'action' : 'actions'} · newest first`
          : undefined}
        onBack={() => router.back()}
        right={state === 'ready' && rows.length > 0 ? (
          <Pressable testID="audit-export" onPress={exportLog}
            accessibilityRole="button"
            accessibilityLabel={`Export ${rows.length} audit rows as CSV`}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 5,
              height: 36, paddingHorizontal: 12, borderRadius: 11,
              backgroundColor: theme.control, borderWidth: 1, borderColor: theme.lineStrong,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Icon name="download" size={16} color={theme.accentInk} />
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>Export</Text>
          </Pressable>
        ) : undefined} />

      <Muted style={{ marginBottom: SPACE.lg }}>
        Every change to a member, course, rule, schedule, holiday, branch or account. Append-only —
        entries cannot be edited or deleted by anyone, including the system.
      </Muted>

      {state === 'loading' && <Skeleton lines={5} />}

      {state === 'error' && (
        <ErrorState onRetry={retry}
          message={error ?? 'The audit log could not be loaded. Nothing has been changed.'} />
      )}

      {state === 'ready' && rows.length === 0 && (
        <EmptyState
          title="Nothing recorded yet"
          body="Every change writes an entry here as soon as it happens. An empty log means nothing has changed yet, not that anything is missing." />
      )}

      {state === 'ready' && rows.length > 0 && (
        <>
          {/* The table scrolls SIDEWAYS as one piece. Reflowing the columns
              to fit would put a different set of fields on each row, which is
              the one thing a table is for stopping. */}
          <ScrollView horizontal showsHorizontalScrollIndicator
            style={{
              borderRadius: RADIUS.lg, borderWidth: 1, borderColor: theme.lineStrong,
              backgroundColor: theme.surface,
            }}
            contentContainerStyle={{ minWidth: TABLE_WIDTH }}>
            <View style={{ minWidth: TABLE_WIDTH }}>
              <View accessibilityRole="header" style={{
                flexDirection: 'row', paddingVertical: 11,
                backgroundColor: theme.surface2,
                borderBottomWidth: 1, borderBottomColor: theme.lineStrong,
              }}>
                {COLS.map(c => (
                  <Text key={c.label} numberOfLines={1} style={{
                    width: c.width, paddingHorizontal: 12,
                    fontSize: 9.5, fontWeight: '800', letterSpacing: 0.7,
                    textTransform: 'uppercase', color: theme.muted,
                  }}>{c.label}</Text>
                ))}
              </View>

              {rows.map(r => (
                <View key={r.key} style={{
                  flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
                  borderBottomWidth: 1, borderBottomColor: theme.line,
                }}>
                  <View style={{ width: COLS[0].width, paddingHorizontal: 12 }}>
                    {/* A continuation row carries the FIELD in the action
                        column instead of repeating the action: the entry is
                        one act, and the field is what distinguishes its rows. */}
                    <Text numberOfLines={1} style={{
                      fontSize: 12.5, fontWeight: '800',
                      color: r.first ? theme.fgStrong : theme.fg,
                    }}>{r.first ? r.action : r.field}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 10.5, color: theme.muted, marginTop: 2 }}>
                      {r.first ? r.subject : 'same action'}
                    </Text>
                  </View>

                  {/* 'NA' is the word for "there was no previous value" --
                      a creation, not a blank. It is dim BUT it is a word, so
                      the distinction survives greyscale. */}
                  <Text numberOfLines={1} style={{
                    width: COLS[1].width, paddingHorizontal: 12, fontSize: 11.5,
                    color: r.old === null ? theme.dim : theme.muted,
                    fontVariant: ['tabular-nums'],
                  }}>{r.old ?? 'NA'}</Text>

                  <Text numberOfLines={1} style={{
                    width: COLS[2].width, paddingHorizontal: 12, fontSize: 11.5, fontWeight: '700',
                    color: r.now === null ? theme.dim : okInk,
                    fontVariant: ['tabular-nums'],
                  }}>{r.now ?? 'NA'}</Text>

                  <Text numberOfLines={1} style={{
                    width: COLS[3].width, paddingHorizontal: 12, fontSize: 11.5, color: theme.fg,
                  }}>{r.who}</Text>

                  <Text numberOfLines={1} style={{
                    width: COLS[4].width, paddingHorizontal: 12, fontSize: 11, color: theme.muted,
                    fontVariant: ['tabular-nums'],
                  }}>{r.when}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <Muted style={{ marginTop: 9 }}>
            Scroll the table sideways for the remaining columns. A row reading{' '}
            <Text style={{ fontVariant: ['tabular-nums'], color: theme.fg }}>NA</Text> under “value
            existed” is a new record, not a missing one.
          </Muted>
        </>
      )}

      <View style={{
        marginTop: SPACE.lg, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <Label>What is never recorded</Label>
        <Muted style={{ marginTop: SPACE.sm }}>
          PINs, security answers, passwords and provider keys never reach this log — not in
          readable form and not hashed. That is enforced when the entry is written, not by
          remembering to leave them out.
        </Muted>
      </View>
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
