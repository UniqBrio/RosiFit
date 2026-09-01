import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Body, Muted, Button, Skeleton, ErrorState, EmptyState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, STATUS, statusSurface } from '../../src/theme/tokens';
import { hasEmail } from '../../src/data/mock';
import { useTemplates, useFollowUp } from '../../src/data/hooks';
import { currentWeek } from '../../src/data/period';

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
  const { state: forced } = useLocalSearchParams<{ state?: string }>();
  const week = currentWeek();
  const templates = useTemplates(forced);
  const followUp = useFollowUp(forced, week);

  // The same derived list the dashboard and the weekly screen read -- one
  // member source, one rule, so these counts cannot disagree with theirs.
  const flagged = followUp.data?.flagged ?? [];
  const sendable = flagged.filter(hasEmail);
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  if (templates.state === 'loading' || followUp.state === 'loading') {
    return <Screen><Skeleton lines={4} /></Screen>;
  }
  if (templates.state === 'error' || followUp.state === 'error') {
    return (
      <Screen>
        <ErrorState onRetry={() => { templates.retry(); followUp.retry(); }}
          message={templates.error ?? followUp.error ?? 'The templates could not be loaded. Nothing has been sent.'} />
      </Screen>
    );
  }

  const list = templates.data ?? [];

  return (
    <Screen>
      <Muted>{`${sendable.length} members selected · week ${week.label}`}</Muted>

      <Body style={{ marginTop: SPACE.md }}>
        Pick one of your saved templates. You cannot type a message here — the wording is agreed once,
        in Settings, so nobody sends something unreviewed at 9 pm.
      </Body>

      {list.length === 0 && (
        <EmptyState
          title="No templates yet"
          body="Follow-up emails only ever go out from a saved template. Add one in Settings → Message templates before sending."
          action="Message templates" onAction={() => router.push('/templates')} />
      )}

      <View style={{ gap: SPACE.md, marginTop: SPACE.lg }}>
        {list.map(t => {
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
