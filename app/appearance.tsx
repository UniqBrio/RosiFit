import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { Screen, H2, Body, Muted, Label, Card } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme, CUSTOM_KEY, type ThemeMode } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, customAccent, customShades, hueFromHex } from '../src/theme/tokens';

export default function Appearance() {
  const { theme, mode, setMode, accentKey, setAccentKey, accents, hue, setHue, isCustom, customRatio } = useTheme();
  const { flash } = useToast();

  const custom = customAccent(hue);
  const shades = customShades(hue);

  /* The typed hex is DRAFT state: it has to hold half-typed values while
   * somebody types, without the accent flickering through every prefix. Only
   * a complete, hue-bearing value moves the colour. */
  const [hexDraft, setHexDraft] = useState('');
  const [hexError, setHexError] = useState<string | null>(null);

  const onHexChange = (raw: string) => {
    setHexDraft(raw);
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === '#') { setHexError(null); return; }

    const h = hueFromHex(trimmed);
    if (h !== null) {
      setHexError(null);
      setHue(h);
      if (!isCustom) setAccentKey(CUSTOM_KEY);
      return;
    }
    // Six characters in and still no hue means it is finished and wrong --
    // either not hex at all, or a grey. Anything shorter is still being
    // typed, and shouting at a half-typed value is noise.
    const digits = trimmed.replace('#', '');
    if (digits.length < 6) { setHexError(null); return; }
    setHexError(/^[0-9a-f]{6}$/i.test(digits)
      ? 'That is a grey — it has no hue to take. Try a colour.'
      : 'Six hex digits, like D6157F.');
  };

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
      <H2 style={{ marginTop: 6 }}>Choose a colour that represents your academy</H2>
      <Muted style={{ marginTop: 6 }}>
        Either way the whole app repaints at once: buttons, badges, headers and the tab bar.
      </Muted>

      {/* Numbered, as the canvas has it. Two ways to reach the same setting
          read as two unrelated controls without the ordinals -- somebody
          picks a preset, then drags the hue, and cannot tell that the second
          replaced the first. */}
      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.fgStrong, marginTop: SPACE.lg }}>
        1. Choose a preset colour
      </Text>
      <Muted style={{ marginTop: 4 }}>
        Six shortcuts to the colours academies ask for most.
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.xl }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.line }} />
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: theme.muted }}>or</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.line }} />
      </View>

      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.fgStrong, marginTop: SPACE.lg }}>
        2. Choose a custom colour
      </Text>

      <View style={{
        marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
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

        {/* A typed hex contributes its HUE and nothing else. The generator
            darkens that hue until white text clears 4.5:1 and
            check-contrast.ts verifies all 360, so accepting a hex verbatim
            would walk straight round guardrail 2 -- a pure yellow taken
            verbatim ships white labels at about 1.07:1. The field says so
            rather than silently changing what was typed. */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.md,
          height: TAP_MIN, borderRadius: RADIUS.sm, paddingHorizontal: 13,
          backgroundColor: theme.surface2, borderWidth: 1,
          borderColor: hexError ? theme.danger : theme.lineStrong,
        }}>
          <Icon name="tag" size={16} color={theme.muted} />
          <TextInput
            testID="appearance-hex"
            value={hexDraft}
            onChangeText={onHexChange}
            placeholder={custom.value.replace('#', '')}
            placeholderTextColor={theme.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            accessibilityLabel="Accent colour as a hex value"
            accessibilityHint="Type a six-digit hex colour. Its hue is taken; the shade is measured for contrast."
            style={{
              flex: 1, color: theme.fgStrong, fontSize: 14, fontWeight: '700',
              fontVariant: ['tabular-nums'],
            }} />
        </View>
        {hexError ? (
          <Text accessibilityLiveRegion="polite"
            style={{ fontSize: 11.5, color: theme.danger, marginTop: 5, lineHeight: 17 }}>
            {hexError}
          </Text>
        ) : (
          <Muted style={{ marginTop: 5 }}>
            Paste a hex and RosiFit takes its hue. Greys have no hue to take.
          </Muted>
        )}

        <Muted style={{ marginTop: SPACE.md }}>
          Drag the hue or type a colour. The tint, header and avatar shades are derived for you, and the
          colour is darkened automatically until white text clears 4.5:1 — so no custom pick can fail contrast.
        </Muted>
      </View>

      {/* ---------------------------------------------------- live preview */}
      <Card style={{ marginTop: SPACE.xl }}>
        <Label>{`How your academy looks with this colour · ${mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'} · ${accentName}`}</Label>
        <H2 style={{ marginTop: SPACE.sm }}>Here is this week at a glance.</H2>
        <Muted style={{ marginTop: 4 }}>3 members missed 4 or more sessions</Muted>
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
        {/* Said plainly because the numbers above are illustrative. A preview
            that looked like live data would have somebody acting on "3
            members" from the settings screen. */}
        <Muted style={{ marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: theme.line }}>
          This colour is used across your academy in the app. The preview is for illustration — real
          screens may vary.
        </Muted>
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
