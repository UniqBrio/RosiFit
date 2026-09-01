import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, H2, Body, Muted, Label, Button } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../src/theme/tokens';
import {
  DECISION_ROWS, OUTCOME_META, MATCH_ACTIONS, MATCH_QUESTION, type MatchKind,
} from '../src/data/mock';

/** Which status ink each outcome borrows. */
const TONE: Record<MatchKind, keyof typeof STATUS> = {
  matched: 'present', noEmail: 'awaiting', possible: 'holiday',
  ambiguous: 'absent', unmatched: 'absent',
};
const ICON: Record<MatchKind, string> = {
  matched: 'check_circle', noEmail: 'mail_off', possible: 'help',
  ambiguous: 'call_split', unmatched: 'person_off',
};

export default function MatchReview() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();

  const [index, setIndex] = useState(0);
  const [remember, setRemember] = useState(true);

  const done = index >= DECISION_ROWS.length;
  const decided = Math.min(index, DECISION_ROWS.length);
  const remaining = DECISION_ROWS.slice(index);
  const blocking = remaining.filter(r => OUTCOME_META[r.kind].blocks).length;

  const advance = (what: string) => {
    flash(what);
    setIndex(i => i + 1);
  };

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  if (done) {
    const okInk = ink('present');
    return (
      <Screen>
        <Muted>{`All ${DECISION_ROWS.length} decided`}</Muted>
        <View style={{
          marginTop: SPACE.lg, padding: SPACE.xl, borderRadius: RADIUS.lg,
          backgroundColor: statusSurface(okInk).bg, borderWidth: 1, borderColor: statusSurface(okInk).border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
            <Icon name="check_circle" size={24} color={okInk} />
            <H2 style={{ flex: 1 }}>Ready to import</H2>
          </View>
          <Body style={{ marginTop: SPACE.md, fontSize: 13, lineHeight: 20 }}>
            The file can import now. 18 rows will be written against Fri 22 Aug only, and every decision
            above is in the audit log with the display names before and after.
          </Body>
        </View>
        <Button label="Import the file" style={{ marginTop: SPACE.lg }}
          onPress={() => { flash('18 rows imported against Fri 22 Aug'); router.replace('/(tabs)'); }} />
        <Button label="Back to upload" variant="secondary" style={{ marginTop: SPACE.sm }}
          onPress={() => router.replace('/(tabs)/upload')} />
      </Screen>
    );
  }

  const cur = DECISION_ROWS[index];
  const meta = OUTCOME_META[cur.kind];
  const tone = ink(TONE[cur.kind]);
  const box = statusSurface(tone);

  return (
    <Screen>
      <Muted style={{ fontVariant: ['tabular-nums'] }}>
        {`Decision ${decided + 1} of ${DECISION_ROWS.length} · ${blocking} block the import`}
      </Muted>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: SPACE.md, marginBottom: SPACE.lg }}>
        {DECISION_ROWS.map((_, i) => (
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
              : advance(`Row ${cur.row} matched to ${c.name}`)}
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
            onPress={() => advance(`Row ${cur.row}: ${a.label.toLowerCase()}`)}
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
    </Screen>
  );
}
