import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, H2, Body, Muted, Label, Button } from '../src/components/ui';
import { Field } from '../src/components/Field';
import { Icon } from '../src/components/Icon';
import { Sheet, SearchPicker } from '../src/components/Sheet';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../src/theme/tokens';
import {
  DECISION_ROWS, OUTCOME_META, MATCH_ACTIONS, MATCH_QUESTION,
  type MatchKind, type MatchRow,
} from '../src/data/mock';
import { peekStagedImport, clearStagedImport } from '../src/data/pending';
import { csvCommit, type ImportDecision, type PreviewRow } from '../src/data/api';
import { useMembers } from '../src/data/hooks';

/** Which status ink each outcome borrows. */
const TONE: Record<MatchKind, keyof typeof STATUS> = {
  matched: 'present', noEmail: 'awaiting', possible: 'holiday',
  ambiguous: 'absent', unmatched: 'absent',
};
const ICON: Record<MatchKind, string> = {
  matched: 'check_circle', noEmail: 'mail_off', possible: 'help',
  ambiguous: 'call_split', unmatched: 'person_off',
};

/** The staged live rows in the shape this screen already draws. Course,
 *  branch, known display names and last-attended come from the preview
 *  because outcome C can only prevent a duplicate if the person deciding
 *  can see who the candidate actually is. */
function toMatchRows(rows: PreviewRow[]): MatchRow[] {
  return rows.map(r => ({
    row: r.row, kind: r.kind as MatchKind, raw: r.raw_name,
    first_seen: r.first_seen ?? '—', minutes: r.minutes,
    candidates: r.candidates.map(c => ({
      member_id: c.member_id, name: c.full_name, code: c.member_code,
      course: c.course_name, branch: c.branch_name,
      last_attended: c.last_present_date ?? undefined,
      aliases: c.aliases.length ? c.aliases.map(a => `“${a}”`).join(', ') : undefined,
      hint: c.hint, hintTone: c.hint_tone,
    })),
  }));
}

export default function MatchReview() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();

  // Taken once at mount: the staged rows must not vanish from under the
  // screen on a re-render, and re-reading an emptied slot would empty it.
  const [staged] = useState(() => peekStagedImport());
  const allRows = useMemo(
    () => (staged ? toMatchRows(staged.rows) : DECISION_ROWS),
    [staged]);
  // Matched rows need no decision -- a clean match is not a question.
  const decisionRows = useMemo(() => allRows.filter(r => r.kind !== 'matched'), [allRows]);

  const [index, setIndex] = useState(0);
  const [remember, setRemember] = useState(true);
  const [decisions, setDecisions] = useState<ImportDecision[]>([]);
  const [emailFor, setEmailFor] = useState<MatchRow | null>(null);
  const [emailValue, setEmailValue] = useState('');
  const [linking, setLinking] = useState<MatchRow | null>(null);
  const [importing, setImporting] = useState(false);
  const members = useMembers();

  const done = index >= decisionRows.length;
  const decided = Math.min(index, decisionRows.length);
  const remaining = decisionRows.slice(index);
  const blocking = remaining.filter(r => OUTCOME_META[r.kind].blocks).length;

  const advance = (what: string, decision?: ImportDecision) => {
    if (decision) setDecisions(d => [...d.filter(x => x.row !== decision.row), decision]);
    flash(what);
    setIndex(i => i + 1);
  };

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  const runImport = async () => {
    if (!staged) {
      flash('Rows imported against this session');
      router.replace('/(tabs)');
      return;
    }
    setImporting(true);
    try {
      const result = await csvCommit(staged.import_id, decisions);
      clearStagedImport();
      flash(`${result.present_or_extra} present · ${result.new_members} new member${result.new_members === 1 ? '' : 's'}`);
      router.replace('/(tabs)');
    } catch (err) {
      // The whole file failed together -- nothing landed -- so say that
      // rather than leaving anyone to wonder which half went in.
      flash(err instanceof Error ? err.message : 'The import did not run. Nothing was written.', 'warn');
    } finally {
      setImporting(false);
    }
  };

  if (done) {
    const okInk = ink('present');
    const total = allRows.length + (staged?.dropped_count ?? 0);
    return (
      <Screen>
        <Muted>{`All ${decisionRows.length} decided`}</Muted>
        <View style={{
          marginTop: SPACE.lg, padding: SPACE.xl, borderRadius: RADIUS.lg,
          backgroundColor: statusSurface(okInk).bg, borderWidth: 1, borderColor: statusSurface(okInk).border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
            <Icon name="check_circle" size={24} color={okInk} />
            <H2 style={{ flex: 1 }}>Ready to import</H2>
          </View>
          <Body style={{ marginTop: SPACE.md, fontSize: 13, lineHeight: 20 }}>
            {`The file can import now. ${total} row${total === 1 ? '' : 's'} will be written against `}
            {staged ? staged.session_label : 'Fri 22 Aug'}
            {' only, and every decision above is in the audit log with the display names before and after.'}
          </Body>
        </View>
        <Button label={importing ? 'Importing…' : 'Import the file'} disabled={importing}
          style={{ marginTop: SPACE.lg }} onPress={() => void runImport()} />
        <Button label="Back to upload" variant="secondary" style={{ marginTop: SPACE.sm }}
          onPress={() => router.replace('/(tabs)/upload')} />
      </Screen>
    );
  }

  const cur = decisionRows[index];
  const meta = OUTCOME_META[cur.kind];
  const tone = ink(TONE[cur.kind]);
  const box = statusSurface(tone);

  /**
   * Each action names what it will DO, and each maps to exactly one decision
   * the import understands. "Add as new member" on a row that HAS a
   * candidate carries the duplicate acknowledgement (C-80) -- the operator
   * has just been shown that member and is saying this is someone else.
   */
  const act = (label: string) => {
    const said = `Row ${cur.row}: ${label.toLowerCase()}`;
    switch (label) {
      case 'Add as new member':
        return advance(said, {
          row: cur.row, action: 'add_as_new',
          confirm_different_person: cur.candidates.length > 0,
        });
      case 'Keep unmatched':
        return advance(said, { row: cur.row, action: 'keep_unmatched' });
      case 'Not a member — leave this row out':
        return advance(said, { row: cur.row, action: 'not_a_member' });
      case 'Skip this row':
        return advance(said, { row: cur.row, action: 'skip' });
      case 'Continue without email':
        // C-76: attendance imports either way; she is excluded from sends
        // with the reason shown, never dropped from the file.
        return advance(said, { row: cur.row, action: 'continue_without_email' });
      case 'Add email to existing member':
        setEmailValue('');
        setEmailFor(cur);
        return;
      case 'Link to an existing member':
        setLinking(cur);
        return;
      default:
        return advance(said);
    }
  };

  return (
    <Screen>
      <Muted style={{ fontVariant: ['tabular-nums'] }}>
        {`Decision ${decided + 1} of ${DECISION_ROWS.length} · ${blocking} block the import`}
      </Muted>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: SPACE.md, marginBottom: SPACE.lg }}>
        {decisionRows.map((_, i) => (
          <View key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            backgroundColor: i < index ? theme.accent : i === index ? theme.accentInk : theme.line,
          }} />
        ))}
      </View>

      <View style={{
        padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, flexWrap: 'wrap' }}>
          {/* the outcome letter AND its word — the five outcomes are never
              distinguished by colour alone (C-79) */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingVertical: 5, paddingHorizontal: 10, borderRadius: RADIUS.pill,
            backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
          }}>
            <Icon name={ICON[cur.kind]} size={14} color={tone} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: tone, letterSpacing: 0.3 }}>
              {meta.tag.toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontSize: 11.5, color: theme.muted, fontVariant: ['tabular-nums'] }}>
            {`Row ${cur.row} · ${cur.first_seen} · ${cur.minutes} min`}
          </Text>
        </View>

        {/* the raw CSV text, verbatim — this is what was actually in the file */}
        <Text style={{
          fontSize: 22, fontWeight: '800', color: theme.fgStrong, marginTop: SPACE.md,
          fontVariant: ['tabular-nums'],
        }}>{cur.raw}</Text>

        <View style={{
          flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md, padding: SPACE.md,
          borderRadius: RADIUS.md, backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
        }}>
          <Icon name={cur.kind === 'noEmail' ? 'error' : ICON[cur.kind]} size={19} color={tone} />
          <Body style={{ flex: 1, fontSize: 12.5, lineHeight: 19 }}>{meta.note}</Body>
        </View>
      </View>

      <H2 style={{ marginTop: SPACE.xl }}>{MATCH_QUESTION[cur.kind]}</H2>

      <View style={{ gap: SPACE.md, marginTop: SPACE.md }}>
        {cur.candidates.map(c => (
          <Pressable key={c.member_id}
            onPress={() => cur.kind === 'noEmail'
              ? flash('Already matched · choose an action below', 'warn')
              : advance(`Row ${cur.row} matched to ${c.name}`, {
                  row: cur.row,
                  // D lists several candidates and needs an explicit pick;
                  // C has one and asks "is this her?" -- different questions,
                  // so they stay different decisions in the audit log.
                  action: cur.kind === 'ambiguous' ? 'select_member' : 'use_existing',
                  member_id: c.member_id,
                  remember_alias: cur.kind === 'possible' ? remember : true,
                })}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, ${c.code}, ${c.course}, ${c.branch}. ${c.hint ?? ''}`}
            style={({ pressed }) => ({
              padding: SPACE.lg, borderRadius: RADIUS.lg, backgroundColor: theme.surface,
              borderWidth: 1, borderColor: cur.kind === 'noEmail' ? statusSurface(ink('present')).border : theme.lineStrong,
              opacity: pressed ? 0.75 : 1,
            })}>
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: theme.fgStrong }}>{c.name}</Text>
            <Text style={{ fontSize: 12, color: theme.muted, marginTop: 3 }}>
              {`${c.code} · ${c.course} · ${c.branch}`}
            </Text>
            {c.last_attended ? (
              <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, fontVariant: ['tabular-nums'] }}>
                {`Last attended ${c.last_attended}${c.attendance ? ` · ${c.attendance} this month` : ''}`}
              </Text>
            ) : null}
            {c.aliases ? (
              <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>
                {`Known display names: ${c.aliases}`}
              </Text>
            ) : null}
            {c.hint ? (
              <Text style={{
                fontSize: 11.5, marginTop: 5, fontWeight: '700',
                color: c.hintTone === 'sure' ? ink('present') : ink('awaiting'),
              }}>{c.hint}</Text>
            ) : null}
          </Pressable>
        ))}

        {cur.kind === 'possible' && (
          <Pressable onPress={() => setRemember(v => !v)}
            accessibilityRole="checkbox" accessibilityState={{ checked: remember }}
            accessibilityLabel={`Remember “${cur.raw}” as a display name for this member`}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: TAP_MIN,
              padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: theme.surface2,
              borderWidth: 1, borderColor: theme.line,
            }}>
            <View style={{
              width: 22, height: 22, borderRadius: 7,
              backgroundColor: remember ? theme.accent : 'transparent',
              borderWidth: 1.5, borderColor: remember ? theme.accent : theme.lineStrong,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {remember ? <Icon name="check" size={14} color={theme.onAccent} /> : null}
            </View>
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: theme.fg }}>
              {`Remember “${cur.raw}” as a display name for this member`}
            </Text>
          </Pressable>
        )}

        {MATCH_ACTIONS[cur.kind].map(a => (
          <Pressable key={a.label}
            onPress={() => act(a.label)}
            accessibilityRole="button" accessibilityLabel={`${a.label}. ${a.note}`}
            style={({ pressed }) => ({
              flexDirection: 'row', gap: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
              backgroundColor: a.primary ? theme.control : theme.surface2,
              borderWidth: 1, borderColor: a.primary ? theme.accent : theme.line,
              opacity: pressed ? 0.75 : 1,
            })}>
            <Icon name={a.icon} size={20} color={a.primary ? theme.accentInk : theme.muted} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>{a.label}</Text>
              {/* every action says what it will DO before it is taken */}
              <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 17 }}>{a.note}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Muted style={{ marginTop: SPACE.lg, textAlign: 'center' }}>
        {blocking === 0
          ? 'One row still needs a decision, but it does not block — attendance imports either way.'
          : `${blocking} of ${remaining.length} remaining decisions block the import. Nothing is written until they are made.`}
      </Muted>

      {/* Outcome B: the address is added to the member RECORD, which is the
          only place an email ever comes from -- never from the file (C-75). */}
      <Sheet open={emailFor !== null} onClose={() => setEmailFor(null)}
        title={emailFor ? `Add an email for ${emailFor.candidates[0]?.name ?? 'her'}` : ''}>
        <Muted style={{ marginTop: 9 }}>
          Her attendance imports either way. An address here makes her eligible for follow-up sends.
        </Muted>
        <View style={{ marginTop: SPACE.lg }}>
          <Field label="Email address" value={emailValue} onChange={setEmailValue}
            placeholder="name@example.com" keyboardType="email-address"
            hint="Saved on her member record, not on the file." />
        </View>
        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.lg }}>
          <Button label="Cancel" variant="secondary" onPress={() => setEmailFor(null)} style={{ flex: 1 }} />
          <Button label="Add email" style={{ flex: 1 }}
            disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailValue.trim())}
            onPress={() => {
              const row = emailFor;
              setEmailFor(null);
              if (!row) return;
              advance(`Row ${row.row}: email added`, {
                row: row.row, action: 'add_email', email: emailValue.trim(),
              });
            }} />
        </View>
      </Sheet>

      {/* Outcome E: link to somebody already on the register, searched by
          the operator -- nothing is guessed from the name. */}
      <SearchPicker
        open={linking !== null} onClose={() => setLinking(null)}
        title="Link to an existing member" placeholder="Search by name or member ID"
        options={(members.data ?? []).map(m => ({ label: `${m.name} · ${m.code}` }))}
        onSelect={labelText => {
          const row = linking;
          setLinking(null);
          if (!row) return;
          const chosen = (members.data ?? []).find(m => `${m.name} · ${m.code}` === labelText);
          if (!chosen) return;
          advance(`Row ${row.row} linked to ${chosen.name}`, {
            row: row.row, action: 'link_existing', member_id: chosen.id, remember_alias: true,
          });
        }}
        emptyNote="No member matches that. Add her as a new member instead — course and branch come from the session being imported." />
    </Screen>
  );
}
