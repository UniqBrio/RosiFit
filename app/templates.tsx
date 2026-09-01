import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Screen, Muted, Label } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../src/theme/tokens';
import { TEMPLATES, TOKENS, CANDIDATES, renderTemplate } from '../src/data/mock';

/**
 * C-68/C-69: templates are the ONLY way anything reaches a member, and this
 * screen is the only place their wording changes. Toggling or editing one is
 * an audited act.
 */
export default function Templates() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const [off, setOff] = useState<string[]>(TEMPLATES.filter(t => !t.active).map(t => t.id));
  const [previewing, setPreviewing] = useState<string | null>(null);

  const activeCount = TEMPLATES.length - off.length;
  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;
  const sample = CANDIDATES[0];

  const toggle = (id: string, name: string) => {
    const isOff = off.includes(id);
    setOff(p => isOff ? p.filter(x => x !== id) : [...p, id]);
    flash(`${name} switched ${isOff ? 'on' : 'off'} · audited`);
  };

  return (
    <Screen>
      <Muted>{`${activeCount} active of ${TEMPLATES.length} · wording is fixed here, not at send time`}</Muted>

      <View style={{ gap: SPACE.md, marginTop: SPACE.lg }}>
        {TEMPLATES.map(t => {
          const isOff = off.includes(t.id);
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
                <Pressable onPress={() => toggle(t.id, t.name)}
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
