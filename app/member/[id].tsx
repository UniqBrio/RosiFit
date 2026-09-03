import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, H2, Muted, Label, Button } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../../src/theme/tokens';
import {
  MEMBERS, sessionsFor, attendancePct, primaryEmail, hasEmail,
  AVATAR_TINTS, initials,
} from '../../src/data/mock';

export default function MemberDetail() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const index = Math.max(0, MEMBERS.findIndex(x => x.id === id));
  const m = MEMBERS[index] ?? MEMBERS[0];
  const pct = attendancePct(m);
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  const pctColor = pct === null ? theme.muted
    : pct >= 70 ? ink('present') : pct >= 40 ? ink('awaiting') : ink('absent');

  /* The header gradient is the same dark plum in BOTH themes, so its strong
   * ink is white in both -- theme.onDeep is the softer body ink beside it.
   * Named once here rather than repeated as a literal at each use. */
  const onDeepStrong = '#FFFFFF';

  const mail = hasEmail(m);
  const mailInk = mail ? ink('present') : ink('absent');
  const mailBox = statusSurface(mailInk);

  return (
    <Screen>
      <LinearGradient
        colors={[theme.accentDeep, theme.accentDeep2, theme.accentDeep3]}
        locations={[0, 0.7, 1]}
        style={{
          marginHorizontal: -SPACE.lg, marginTop: -SPACE.lg,
          paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg, paddingBottom: SPACE.xxl,
          borderBottomWidth: 1, borderBottomColor: theme.lineStrong,
        }}>
        {/* This screen had no way back at all. It is reached from the member
            list, from Weekly and from a course roster, so the target cannot
            be a fixed route -- router.back() returns to whichever of them
            opened it. */}
        <Pressable testID="member-back" onPress={() => router.back()}
          accessibilityRole="button" accessibilityLabel="Go back"
          style={({ pressed }) => ({
            width: 38, height: 38, borderRadius: RADIUS.md,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: SPACE.md,
            backgroundColor: theme.accentDeep3, borderWidth: 1, borderColor: theme.lineStrong,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name="arrow_back" size={21} color={onDeepStrong} />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: AVATAR_TINTS[index % AVATAR_TINTS.length],
            borderWidth: 2, borderColor: theme.lineStrong,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: onDeepStrong }}>{initials(m.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: onDeepStrong, letterSpacing: -0.5 }}>{m.name}</Text>
            <Text style={{ fontSize: 13, color: theme.accentInk, marginTop: 3 }}>{m.course}</Text>
            <Text style={{ fontSize: 12, color: theme.onDeep, marginTop: 2 }}>{`${m.branch} · ${m.code}`}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: SPACE.lg }}>
        <Tile label="Expected" value={m.expected} color={theme.fgStrong} />
        <Tile label="Attended" value={m.attended} color={ink('present')} />
        <Tile label="Missed"   value={m.missed}   color={ink('absent')} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Tile label="Attendance this week" value={pct === null ? '—' : `${pct}%`} color={pctColor} sub />
        {/* streak and missed are DIFFERENT numbers; both are shown with their
            own label so neither can be read as the other */}
        <Tile label="Current missed streak" value={`${m.streak}`} unit="sessions" color={theme.fgStrong} sub />
      </View>

      <H2 style={{ marginTop: SPACE.xxl }}>Her sessions this week</H2>
      <View style={{ gap: 8, marginTop: SPACE.md }}>
        {sessionsFor(m).map((s, i) => {
          const tone = STATUS[s.status];
          const c = theme.isDark ? tone.fgDark : tone.fgLight;
          const box = statusSurface(c);
          return (
            <View key={i} accessible
              accessibilityLabel={`${s.date} ${s.time}. ${tone.word}. ${s.detail}`}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                paddingVertical: 12, paddingHorizontal: 14, borderRadius: RADIUS.md,
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
              }}>
              <View style={{
                width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
              }}>
                <Icon name={tone.icon} size={18} color={c} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>
                  {`${s.date} · ${s.time}`}
                </Text>
                <Text style={{ fontSize: 11.5, color: theme.muted }}>{s.detail}</Text>
              </View>
              {/* the word, always -- colour is never the only signal */}
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: c }}>{tone.word}</Text>
            </View>
          );
        })}
      </View>

      <View style={{
        marginTop: SPACE.lg, padding: 14, borderRadius: RADIUS.md,
        backgroundColor: mailBox.bg, borderWidth: 1, borderColor: mailBox.border,
        flexDirection: 'row', gap: SPACE.md,
      }}>
        <Icon name={mail ? 'mark_email_read' : 'mail_off'} size={20} color={mailInk} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: mailInk }}>
            {mail ? 'Email on file' : 'No usable email'}
          </Text>
          <Muted style={{ marginTop: 4 }}>
            {mail
              ? `${primaryEmail(m)} · verified 4 Aug`
              : 'She is shown and counted as excluded from every send, never quietly dropped.'}
          </Muted>
          <Muted style={{ marginTop: 6 }}>
            {`Last contacted ${m.last === '—' ? 'never' : m.last}`}
          </Muted>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: SPACE.lg }}>
        <Button label="Reach out" onPress={() => router.push('/send')} style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.push({ pathname: '/member/edit', params: { id: m.id } })}
          accessibilityRole="button" accessibilityLabel={`Edit ${m.name}`}
          style={({ pressed }) => ({
            width: 52, height: TAP_MIN + 8, borderRadius: RADIUS.lg,
            backgroundColor: theme.control, borderWidth: 1, borderColor: theme.lineStrong,
            alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name="edit" size={21} color={theme.fg} />
        </Pressable>
      </View>
    </Screen>
  );
}

function Tile({ label, value, color, unit, sub }:
  { label: string; value: string | number; color: string; unit?: string; sub?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={{
      flex: 1, padding: 14, borderRadius: RADIUS.md,
      backgroundColor: sub ? theme.surface2 : theme.surface,
      borderWidth: 1, borderColor: theme.line,
    }}>
      <Label>{label}</Label>
      <Text style={{
        fontSize: sub ? 26 : 30, fontWeight: '800', color, marginTop: 5,
        fontVariant: ['tabular-nums'],
      }}>
        {value}
        {unit ? <Text style={{ fontSize: 13, fontWeight: '600', color: theme.muted }}>{` ${unit}`}</Text> : null}
      </Text>
    </View>
  );
}
