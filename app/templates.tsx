import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Label, Skeleton, EmptyState, ErrorState } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../src/theme/tokens';
import { TOKENS, CANDIDATES, renderTemplate, toCandidate } from '../src/data/mock';
import { useTemplates, useFollowUp } from '../src/data/hooks';
import { setTemplateActive } from '../src/data/repository';

/**
 * C-68/C-69: templates are the ONLY way anything reaches a member, and this
 * screen is the only place their wording changes. Toggling or editing one is
 * an audited act.
 */
export default function Templates() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();
  const templates = useTemplates(forced);
  const followUp = useFollowUp(forced);
  const [off, setOff] = useState<string[] | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const list = templates.data ?? [];
  // Until something is toggled, "off" IS what the stored templates say.
  const offIds = off ?? list.filter(t => !t.active).map(t => t.id);
  const activeCount = list.length - offIds.length;
  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;

  // The preview renders with a REAL member's figures where there is one, so
  // what is previewed is what she would receive -- never a placeholder.
  const rules = followUp.data?.rules;
  const first = followUp.data?.flagged[0];
  const sample = first && rules
    ? toCandidate(first, rules.byCourseName[first.course] ?? rules.global)
    : CANDIDATES[0];

  const toggle = async (id: string, name: string) => {
    const isOff = offIds.includes(id);
    setOff(isOff ? offIds.filter(x => x !== id) : [...offIds, id]);
    try {
      await setTemplateActive(id, isOff);
      flash(`${name} switched ${isOff ? 'on' : 'off'} · audited`);
    } catch (err) {
      setOff(offIds);                                  // put it back as it was
      flash(err instanceof Error ? err.message : 'That did not save.', 'warn');
    }
  };

  if (templates.state === 'loading') return <Screen><Skeleton lines={4} /></Screen>;
  if (templates.state === 'error') {
    return (
      <Screen>
        <ErrorState onRetry={templates.retry}
          message={templates.error ?? 'The templates could not be loaded. Nothing has been changed.'} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Muted>{`${activeCount} active of ${list.length} · wording is fixed here, not at send time`}</Muted>

      {list.length === 0 && (
        <EmptyState
          title="No templates yet"
          body="A follow-up email can only ever be one of these. Until one exists, the send flow has nothing to offer." />
      )}

      <View style={{ gap: SPACE.md, marginTop: SPACE.lg }}>
        {list.map(t => {
          const isOff = offIds.includes(t.id);
          const stateInk = isOff ? theme.dim : okInk;
          const stateBox = statusSurface(stateInk);
          const showing = previewing === t.id;
          return (
            <View key={t.id} style={{
              padding: SPACE.lg, borderRadius: RADIUS.lg, backgroundColor: theme.surface,
              borderWidth: 1, borderColor: theme.line,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                <Icon name={t.icon} size={19} color={isOff ? theme.dim : theme.accentInk} />
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: theme.fgStrong }}>{t.name}</Text>
                <Pressable onPress={() => void toggle(t.id, t.name)}
                  accessibilityRole="switch" accessibilityState={{ checked: !isOff }}
                  accessibilityLabel={`${t.name} is ${isOff ? 'off' : 'active'}`}
                  style={{
                    minHeight: TAP_MIN - 12, justifyContent: 'center', paddingHorizontal: 10,
                    borderRadius: RADIUS.pill, backgroundColor: stateBox.bg,
                    borderWidth: 1, borderColor: stateBox.border,
                  }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: stateInk }}>
                    {isOff ? 'OFF' : 'ACTIVE'}
                  </Text>
                </Pressable>
              </View>

              <Text style={{
                fontSize: 12.5, color: theme.fg, marginTop: SPACE.md, lineHeight: 19,
                fontVariant: ['tabular-nums'],
              }}>
                {showing
                  ? renderTemplate(`${t.subject}\n\n${t.body}`, sample)
                  : `Subject: ${t.subject}\n\n${t.body}`}
              </Text>

              <View style={{ flexDirection: 'row', gap: SPACE.lg, marginTop: SPACE.md }}>
                <Pressable onPress={() => setPreviewing(showing ? null : t.id)}
                  accessibilityRole="button"
                  accessibilityLabel={showing ? 'Show the raw template' : `Preview with ${sample.full_name.split(' ')[0]}’s figures`}
                  style={{ minHeight: TAP_MIN / 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: theme.accentInk }}>
                    {showing ? `Showing ${sample.full_name.split(' ')[0]}’s figures — tap for raw` : 'Preview'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => flash('Editing wording · change is audited')}
                  accessibilityRole="button" accessibilityLabel={`Edit ${t.name}`}
                  style={{ minHeight: TAP_MIN / 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: theme.accentInk }}>Edit</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{
        marginTop: SPACE.lg, padding: SPACE.lg, borderRadius: RADIUS.lg,
        flexDirection: 'row', gap: SPACE.md,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <Icon name="verified_user" size={19} color={okInk} />
        <Muted style={{ flex: 1 }}>
          There is no free-form email anywhere in the app. Every message sent comes from one of these
          templates plus her own figures, so nothing unreviewed can reach a member. Editing a template
          is audited.
        </Muted>
      </View>

      <View style={{
        marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
      }}>
        <Label>Values a template may use</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md }}>
          {TOKENS.map(k => (
            <View key={k} style={{
              paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8,
              backgroundColor: theme.control, borderWidth: 1, borderColor: theme.line,
            }}>
              <Text style={{ fontSize: 11, color: theme.fg, fontVariant: ['tabular-nums'] }}>{k}</Text>
            </View>
          ))}
        </View>
        <Muted style={{ marginTop: SPACE.md }}>
          Every value is filled from the attendance engine at send time. A template with a value the
          engine cannot fill does not send.
        </Muted>
      </View>
    </Screen>
  );
}
