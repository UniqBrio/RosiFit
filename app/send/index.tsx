import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Body, Muted, Button } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, STATUS, statusSurface } from '../../src/theme/tokens';
import { TEMPLATES, WEEK, flaggedMembers, hasEmail } from '../../src/data/mock';

/**
 * C-68/C-69, step 1 of 3: CHOOSE A TEMPLATE.
 *
 * There is no free-form composing anywhere in this flow. A staff member picks
 * a stored template; the wording is fixed and only the member's own figures
 * change. That is the whole reason arbitrary text cannot reach a member.
 */
export default function ChooseTemplate() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();

  const flagged = flaggedMembers();
  const sendable = flagged.filter(hasEmail);
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  return (
    <Screen>
      <Muted>{`${sendable.length} members selected · week ${WEEK.label}`}</Muted>

      <Body style={{ marginTop: SPACE.md }}>
        Pick one of your saved templates. You cannot type a message here — the wording is agreed once,
        in Settings, so nobody sends something unreviewed at 9 pm.
      </Body>

      <View style={{ gap: SPACE.md, marginTop: SPACE.lg }}>
        {TEMPLATES.map(t => {
          const off = !t.active;
          const stateInk = off ? theme.dim : ink('present');
          return (
            <Pressable key={t.id}
              onPress={() => off
                ? flash(`${t.name} is switched off in Settings`, 'warn')
                : router.push({ pathname: '/send/review', params: { template: t.id } })}
              accessibilityRole="button"
              accessibilityState={{ disabled: off }}
              accessibilityLabel={`${t.name}, ${off ? 'switched off' : 'active'}. ${t.preview}`}
              style={({ pressed }) => ({
                padding: SPACE.lg, borderRadius: RADIUS.lg, backgroundColor: theme.surface,
                borderWidth: 1, borderColor: theme.line, opacity: pressed ? 0.75 : 1,
              })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                <Icon name={t.icon} size={19} color={off ? theme.dim : theme.accentInk} />
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: off ? theme.muted : theme.fgStrong }}>
                  {t.name}
                </Text>
                {/* an inactive template is LISTED and says why it cannot be
                    used, rather than vanishing from the picker */}
                <View style={{
                  paddingVertical: 3, paddingHorizontal: 8, borderRadius: RADIUS.pill,
                  backgroundColor: statusSurface(stateInk).bg,
                  borderWidth: 1, borderColor: statusSurface(stateInk).border,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: stateInk }}>
                    {off ? 'OFF' : 'ACTIVE'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12.5, color: theme.muted, marginTop: 7, lineHeight: 18 }}>
                {t.preview}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button label="Manage templates in Settings" variant="secondary" style={{ marginTop: SPACE.lg }}
        onPress={() => router.push('/templates')} />
    </Screen>
  );
}
