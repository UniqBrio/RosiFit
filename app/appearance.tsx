import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { Screen, H2, Body, Muted, Label, Card } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme, CUSTOM_KEY, type ThemeMode } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, customAccent, customShades } from '../src/theme/tokens';

export default function Appearance() {
  const { theme, mode, setMode, accentKey, setAccentKey, accents, hue, setHue, isCustom, customRatio } = useTheme();
  const { flash } = useToast();

  const custom = customAccent(hue);
  const shades = customShades(hue);

  const modes: { key: ThemeMode; label: string; icon: string }[] = [
    { key: 'dark',   label: 'Dark',   icon: 'dark_mode' },
    { key: 'light',  label: 'Light',  icon: 'light_mode' },
    { key: 'system', label: 'System', icon: 'devices' },
  ];

  const accentName = isCustom ? 'custom colour' : (accents.find(a => a.key === accentKey)?.label ?? '');

  return (
    <Screen>
      <Muted style={{ marginBottom: SPACE.lg }}>
        {`${mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'} · ${accentName} · yours only`}
      </Muted>

      <Label>Theme</Label>
      <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md }}>
        {modes.map(m => {
          const on = mode === m.key;
          return (
            <Pressable key={m.key} onPress={() => { setMode(m.key); flash(`${m.label} theme applied`); }}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              accessibilityLabel={`${m.label} theme`}
              style={{
                flex: 1, padding: SPACE.md, borderRadius: RADIUS.lg,
                borderWidth: 1.5, borderColor: on ? theme.accent : theme.line,
                backgroundColor: on ? theme.control : theme.surface,
              }}>
              <ThemePreview mode={m.key} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACE.md }}>
                <Icon name={m.icon} size={16} color={on ? theme.accentInk : theme.muted} />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: theme.fgStrong }}>{m.label}</Text>
                <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'}
                  size={16} color={on ? theme.accentInk : theme.dim} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md, alignItems: 'flex-start' }}>
        <Icon name="devices" size={16} color={theme.accentInk} />
        <Muted style={{ flex: 1 }}>
          Every theme is live. Your choice is remembered on your account — the app never just follows the phone.
        </Muted>
      </View>

      <Label style={{ marginTop: SPACE.xxl }}>Accent colour</Label>
      <Muted style={{ marginTop: 6 }}>
        Six shortcuts to the colours academies ask for most — or mix your own below. Either way the whole app
        repaints at once: buttons, badges, headers and the tab bar.
      </Muted>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE.md }}>
        {accents.map(a => {
          const on = !isCustom && accentKey === a.key;
          return (
            <Pressable key={a.key}
              onPress={() => { setAccentKey(a.key); flash(`${a.label} applied across the app`); }}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              accessibilityLabel={a.label}
              style={{
                flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: SPACE.sm,
                paddingVertical: SPACE.md, paddingHorizontal: 6, borderRadius: RADIUS.lg,
                borderWidth: 1.5, borderColor: on ? a.value : theme.line,
                backgroundColor: on ? theme.control : theme.surface,
              }}>
              <View style={{
                width: 34, height: 34, borderRadius: 17, backgroundColor: a.value,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {/* the tick is on the swatch, but the row is also named and
                    announced as selected -- the colour alone never says which */}
                {on ? <Icon name="check" size={19} color={theme.onAccent} /> : null}
              </View>
              <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: '700', color: theme.fg }}>{a.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ------------------------------------------------------- custom hue */}
      <View style={{
        marginTop: SPACE.xl, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface, borderWidth: 1.5,
        borderColor: isCustom ? custom.value : theme.line,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
          <View style={{
            width: 36, height: 36, borderRadius: 18, backgroundColor: custom.value,
            alignItems: 'center', justifyContent: 'center',
          }}>
            {isCustom ? <Icon name="check" size={19} color={theme.onAccent} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.fgStrong }}>Any colour you like</Text>
            {/* the measured ratio is shown, not promised -- it is what the
                generator actually produced for this hue */}
            <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, fontVariant: ['tabular-nums'] }}>
              {`${custom.value} · white text ${customRatio}`}
            </Text>
          </View>
          <Pressable
            onPress={() => { setAccentKey(CUSTOM_KEY); flash('Custom colour applied across the app'); }}
            disabled={isCustom}
            accessibilityRole="button"
            accessibilityState={{ disabled: isCustom }}
            style={{
              minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: 13,
              borderRadius: RADIUS.sm, borderWidth: 1,
              backgroundColor: isCustom ? theme.control : custom.value,
              borderColor: isCustom ? theme.lineStrong : custom.value,
            }}>
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: isCustom ? theme.muted : '#FFFFFF' }}>
              {isCustom ? 'In use' : 'Use this'}
            </Text>
          </Pressable>
        </View>

        <Slider
          value={hue}
          minimumValue={0}
          maximumValue={359}
          step={1}
          onValueChange={h => { setHue(h); if (!isCustom) setAccentKey(CUSTOM_KEY); }}
          minimumTrackTintColor={custom.value}
          maximumTrackTintColor={theme.lineStrong}
          thumbTintColor={custom.value}
          accessibilityLabel="Accent hue"
          accessibilityHint="Slide to mix your own accent colour"
          style={{ width: '100%', height: 40, marginTop: SPACE.md }} />

        <View style={{ flexDirection: 'row', gap: 6, marginTop: SPACE.sm }}>
          {shades.map(s => (
            <View key={s.label} style={{ flex: 1 }}>
              <View style={{ height: 26, borderRadius: 8, backgroundColor: s.color, borderWidth: 1, borderColor: theme.line }} />
              <Text style={{ fontSize: 9.5, color: theme.muted, marginTop: 5, textAlign: 'center' }}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Muted style={{ marginTop: SPACE.md }}>
          Drag the hue. The tint, header and avatar shades are derived for you, and the colour is darkened
          automatically until white text clears 4.5:1 — so no custom pick can fail contrast.
        </Muted>
      </View>

      {/* ---------------------------------------------------- live preview */}
      <Card style={{ marginTop: SPACE.xl }}>
        <Label>{`Live preview · ${mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'} · ${accentName}`}</Label>
        <H2 style={{ marginTop: SPACE.sm }}>3 members need you</H2>
        <Muted style={{ marginTop: 4 }}>Missed 3 of 6 sessions this week</Muted>
        <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
          <View style={{
            flex: 1, height: 44, borderRadius: 13, backgroundColor: theme.accent,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: theme.onAccent }}>Reach out</Text>
          </View>
          <View style={{
            width: 44, height: 44, borderRadius: 13, backgroundColor: theme.surface2,
            borderWidth: 1, borderColor: theme.line, alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="edit" size={19} color={theme.accentInk} />
          </View>
        </View>
      </Card>
    </Screen>
  );
}

/** A miniature of the app at that theme, so the choice is visible before it is made. */
function ThemePreview({ mode }: { mode: ThemeMode }) {
  const { theme } = useTheme();
  const light = mode === 'light' || (mode === 'system' && !theme.isDark);
  const bg = light ? '#FBF7F9' : '#0C0409';
  const text = light ? '#33073A' : '#FFFFFF';
  const muted = light ? '#8B7784' : '#A78E9E';
  const card = light ? '#F1E7EE' : '#170A14';
  return (
    <View style={{
      height: 74, borderRadius: 12, backgroundColor: bg, padding: 9,
      borderWidth: 1, borderColor: light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.10)',
    }}>
      <View style={{ width: '44%', height: 7, borderRadius: 99, backgroundColor: text }} />
      <View style={{ width: '66%', height: 5, borderRadius: 99, backgroundColor: muted, marginTop: 7 }} />
      <View style={{ width: '100%', height: 22, borderRadius: 8, backgroundColor: card, marginTop: 9 }} />
      <View style={{ width: '52%', height: 12, borderRadius: 6, backgroundColor: theme.accent, marginTop: 7 }} />
    </View>
  );
}
