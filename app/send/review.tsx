import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Body, Muted, Label, Button } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, STATUS, statusSurface } from '../../src/theme/tokens';
import {
  TEMPLATES, WEEK, flaggedMembers, hasEmail, primaryEmail, reasonFor,
  GLOBAL_RULE, AVATAR_TINTS, initials,
} from '../../src/data/mock';

/**
 * Step 2 of 3: REVIEW. Both lists are shown — who will receive, and who is
 * excluded and why. C-76: a member with no address is counted and named here,
 * never silently dropped from the send.
 */
export default function ReviewSend() {
  const { theme } = useTheme();
  const router = useRouter();
  const { template } = useLocalSearchParams<{ template?: string }>();

  const tpl = TEMPLATES.find(t => t.id === template) ?? TEMPLATES[0];
  const flagged = flaggedMembers();
  const recipients = flagged.filter(hasEmail);
  const excluded = flagged.filter(m => !hasEmail(m));
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;
  const okInk = ink('present');
  const badInk = ink('absent');

  return (
    <Screen>
      <Muted>{`${tpl.name} · week ${WEEK.label}`}</Muted>

      <Label style={{ marginTop: SPACE.lg }}>{`Will receive · ${recipients.length}`}</Label>
      <View style={{ gap: SPACE.md, marginTop: SPACE.md }}>
        {recipients.map((m, i) => (
          <View key={m.id} style={{
            padding: SPACE.lg, borderRadius: RADIUS.lg, backgroundColor: theme.surface,
            borderWidth: 1, borderColor: theme.line,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
              <View style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: AVATAR_TINTS[i % AVATAR_TINTS.length],
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>{initials(m.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: theme.fgStrong }}>{m.name}</Text>
                <Text style={{ fontSize: 11.5, color: theme.muted, fontVariant: ['tabular-nums'] }}>
                  {primaryEmail(m)}
                </Text>
              </View>
              <Icon name="check_circle" size={19} color={okInk} />
            </View>
            {/* her REAL figures, from the engine -- never a placeholder */}
            <Text style={{
              fontSize: 11.5, color: theme.muted, marginTop: SPACE.sm,
              fontVariant: ['tabular-nums'], lineHeight: 17,
            }}>{reasonFor(m, GLOBAL_RULE)}</Text>
          </View>
        ))}
      </View>

      <Label style={{ marginTop: SPACE.xl }}>
        {`Excluded · ${excluded.length} · counted, not dropped`}
      </Label>
      <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
        {excluded.map(m => (
          <View key={m.id} style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
            padding: SPACE.md, borderRadius: RADIUS.md,
            backgroundColor: statusSurface(badInk).bg,
            borderWidth: 1, borderColor: statusSurface(badInk).border,
          }}>
            <Icon name="mail_off" size={18} color={badInk} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>{m.name}</Text>
              <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>
                No email on file — she stays in the report
              </Text>
            </View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: badInk }}>EXCLUDED</Text>
          </View>
        ))}
      </View>

      <View style={{
        marginTop: SPACE.xl, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
          <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: theme.fg }}>
            {`Template · ${tpl.name}`}
          </Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button"
            accessibilityLabel="Change template">
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>Change</Text>
          </Pressable>
        </View>
        <Body style={{ marginTop: SPACE.md, fontSize: 13 }}>
          {`Subject: ${tpl.subject.replace('{{first_name}}', recipients[0]?.name.split(' ')[0] ?? 'her')}`}
        </Body>
        <Muted style={{ marginTop: SPACE.md }}>
          The wording is fixed. Only her own figures change, and they come from the attendance engine —
          never a placeholder.
        </Muted>
      </View>

      <Button label={`Send to ${recipients.length} members`} style={{ marginTop: SPACE.lg }}
        onPress={() => router.push({ pathname: '/send/result', params: { template: tpl.id } })} />
    </Screen>
  );
}
