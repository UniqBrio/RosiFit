import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Muted, Button } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, STATUS, statusSurface } from '../../src/theme/tokens';
import { flaggedMembers, hasEmail } from '../../src/data/mock';

/**
 * Step 3 of 3: RESULT, per member. "Sent" is claimed per address, never for
 * the batch -- a failed send names the member, the reason, and what to do,
 * because a silent failure here is a member nobody follows up.
 */
export default function SendResult() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();

  const flagged = flaggedMembers();
  const recipients = flagged.filter(hasEmail);
  const excluded = flagged.filter(m => !hasEmail(m));
  const sent = recipients.slice(0, 1);
  const failed = recipients.slice(1, 2);

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;
  const okInk = ink('present'); const badInk = ink('absent');

  return (
    <Screen>
      <Muted>Sent 8:42 pm · 22 Aug</Muted>

      <View style={{ flexDirection: 'row', marginTop: SPACE.lg, gap: SPACE.md }}>
        <Count n={sent.length} label="sent" color={okInk} />
        <Count n={failed.length} label="failed" color={badInk} />
        <Count n={excluded.length} label="excluded" color={theme.muted} />
      </View>

      <View style={{ gap: SPACE.md, marginTop: SPACE.lg }}>
        {sent.map(m => (
          <View key={m.id} style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.lg,
            borderRadius: RADIUS.lg, backgroundColor: statusSurface(okInk).bg,
            borderWidth: 1, borderColor: statusSurface(okInk).border,
          }}>
            <Icon name="check_circle" size={20} color={okInk} />
            <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: theme.fgStrong }}>{m.name}</Text>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: okInk }}>SENT</Text>
          </View>
        ))}

        {failed.map(m => (
          <View key={m.id} style={{
            padding: SPACE.lg, borderRadius: RADIUS.lg,
            backgroundColor: statusSurface(badInk).bg,
            borderWidth: 1, borderColor: statusSurface(badInk).border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
              <Icon name="error" size={20} color={badInk} />
              <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: theme.fgStrong }}>{m.name}</Text>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: badInk }}>FAILED</Text>
            </View>
            {/* the reason and the fallback, not just "failed" */}
            <Text style={{ fontSize: 12, color: theme.fg, marginTop: SPACE.sm, lineHeight: 18 }}>
              Mailbox full at her provider. Retry, or call her on +91 98431 20117.
            </Text>
            <Button label="Retry this one" variant="secondary" style={{ marginTop: SPACE.md }}
              onPress={() => flash(`Retrying ${m.name.split(' ')[0]} — result will replace this row`)} />
          </View>
        ))}

        {excluded.map(m => (
          <View key={m.id} style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.md,
            borderRadius: RADIUS.md, backgroundColor: theme.surface2,
            borderWidth: 1, borderColor: theme.line,
          }}>
            <Icon name="mail_off" size={18} color={theme.muted} />
            <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: theme.fg }}>{m.name}</Text>
            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.muted }}>EXCLUDED</Text>
          </View>
        ))}
      </View>

      <Button label="Back to home" variant="secondary" style={{ marginTop: SPACE.xl }}
        onPress={() => router.replace('/(tabs)')} />
    </Screen>
  );
}

function Count({ n, label, color }: { n: number; label: string; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={{
      flex: 1, padding: SPACE.lg, borderRadius: RADIUS.lg,
      backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
    }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>{n}</Text>
      <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
