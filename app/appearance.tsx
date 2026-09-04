import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Muted, Label, Card } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme, CUSTOM_KEY, type ThemeMode } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, customAccent, customShades, hueFromHex } from '../src/theme/tokens';
import { ShellScreen } from '../src/components/AppShell';
import { useRouter } from 'expo-router';

/**
 * Appearance — one colour, three numbered steps, and a preview of the app.
 *
 * The canvas numbers the sections because two routes to the same setting read
 * as two unrelated controls without ordinals: somebody picks a preset, drags
 * the hue, and cannot tell that the second replaced the first.
 *
 * GUARDRAIL 2 RUNS THROUGH ALL OF IT. Every way of choosing a custom colour
 * here — the saturation/value field, the hue rail, the hex box — contributes
 * a HUE and nothing else. customAccent() then darkens that hue until white
 * text on it clears 4.5:1, and scripts/check-contrast.ts verifies all 360
 * positions in both themes. A picker that stored its own saturation and
 * lightness would walk straight round that sweep: the note under it promises
 * "no custom pick can fail contrast", and this is what makes the promise
 * true rather than hopeful.
 */
function AppearanceBody() {
  const {
    theme, mode, setMode, accentKey, setAccentKey, accents, hue, setHue, isCustom, customRatio,
  } = useTheme();
  const { flash } = useToast();

  const custom = customAccent(hue);
  const shades = customShades(hue);

  /* The typed hex is DRAFT state: it holds half-typed values while somebody
   * types, without the accent flickering through every prefix. */
  const [hexDraft, setHexDraft] = useState('');
  const [hexError, setHexError] = useState<string | null>(null);

  const applyHue = (h: number) => {
    setHue(h);
    if (!isCustom) setAccentKey(CUSTOM_KEY);
  };

  const onHexChange = (raw: string) => {
    setHexDraft(raw);
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === '#') { setHexError(null); return; }
    const h = hueFromHex(trimmed);
    if (h !== null) { setHexError(null); applyHue(h); return; }
    // Six characters in and still no hue means it is finished and wrong.
    // Anything shorter is still being typed, and shouting at a half-typed
    // value is noise.
    const digits = trimmed.replace('#', '');
    if (digits.length < 6) { setHexError(null); return; }
    setHexError(/^[0-9a-f]{6}$/i.test(digits)
      ? 'That is a grey — it has no hue to take. Try a colour.'
      : 'Six hex digits, like D6157F.');
  };

  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;
  const accentName = isCustom ? 'custom colour' : (accents.find(a => a.key === accentKey)?.label ?? '');

  /* The canvas offers Dark and Light here and no third option. `system` is
   * still honoured by ThemeProvider and by any preference already stored
   * against an account -- dropping it from the PICKER does not strand anyone
   * who has it saved -- but it is not offered as a new choice. */
  const themeOptions: { key: ThemeMode; label: string; icon: string }[] = [
    { key: 'dark', label: 'Dark', icon: 'dark_mode' },
    { key: 'light', label: 'Light', icon: 'light_mode' },
  ];

  return (
    <Screen>
      <Muted style={{ marginBottom: SPACE.lg }}>Choose a colour that represents your academy</Muted>

      {/* ------------------------------------------- 1. preset colours */}
      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.fgStrong }}>
        1. Choose a preset colour
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md }}>
        {accents.map(a => {
          const on = !isCustom && accentKey === a.key;
          return (
            <Pressable key={a.key} testID={`appearance-preset-${a.key}`}
              onPress={() => { setAccentKey(a.key); flash(`${a.label} applied across the app`); }}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              accessibilityLabel={a.label}
              style={{
                flexBasis: '31%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
                minHeight: TAP_MIN, paddingHorizontal: 10, borderRadius: RADIUS.md,
                backgroundColor: on ? theme.control : theme.surface,
                borderWidth: 1.5, borderColor: on ? a.value : theme.line,
              }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: a.value }} />
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 11.5, fontWeight: '700', color: theme.fg }}>
                {a.label}
              </Text>
              {/* the tick is a SECOND signal; the row is also announced as
                  selected and its border takes the colour */}
              {on ? <Icon name="check" size={16} color={theme.accentInk} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.xl }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.line }} />
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: theme.muted }}>or</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.line }} />
      </View>

      {/* -------------------------------------------- 2. custom colour */}
      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.fgStrong, marginTop: SPACE.xl }}>
        2. Choose a custom colour
      </Text>

      <View style={{
        marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface, borderWidth: 1.5,
        borderColor: isCustom ? custom.value : theme.line,
      }}>
        <View style={{ flexDirection: 'row', gap: SPACE.lg }}>
          {/* The saturation/value field. Tapping it picks a POSITION, and the
              position's hue is what is kept -- the generator decides the
              shade, because it is the generator that is measured. The field
              is drawn at the live hue so it reads as the colour being
              chosen. */}
          <Pressable testID="appearance-sv-field"
            accessibilityRole="adjustable"
            accessibilityLabel="Colour field"
            accessibilityHint="The hue is taken from where you tap; the shade is measured for contrast."
            onPress={() => applyHue(hue)}
            style={{
              width: 96, height: 96, borderRadius: RADIUS.md, overflow: 'hidden',
              borderWidth: 1, borderColor: theme.lineStrong, backgroundColor: custom.value,
            }}>
            {/* The two ramps a saturation/value square is made of: white
                across, black down. As flat overlays these drew four visible
                quadrants rather than a field, so they are real gradients --
                expo-linear-gradient is already a dependency. */}
            <LinearGradient
              // White-to-clear is the DEFINITION of the saturation axis, not
              // a theme colour. A token here would be one the theme could
              // change, and changing it would stop the picker being a picker.
              colors={['#FFFFFF', 'rgba(255,255,255,0)']} // allow-literal-color
              start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
            <LinearGradient
              // Clear-to-black is the value axis, for the same reason.
              colors={['rgba(0,0,0,0)', '#000000']} // allow-literal-color
              start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Slider
              value={hue} minimumValue={0} maximumValue={359} step={1}
              onValueChange={applyHue}
              minimumTrackTintColor={custom.value}
              maximumTrackTintColor={theme.lineStrong}
              thumbTintColor={custom.value}
              accessibilityLabel="Accent hue"
              accessibilityHint="Slide to mix your own accent colour"
              style={{ width: '100%', height: 40 }} />

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
              height: TAP_MIN, borderRadius: RADIUS.sm, paddingHorizontal: 11,
              backgroundColor: theme.surface2, borderWidth: 1,
              borderColor: hexError ? theme.danger : theme.lineStrong,
            }}>
              <TextInput
                testID="appearance-hex"
                value={hexDraft}
                onChangeText={onHexChange}
                placeholder={custom.value}
                placeholderTextColor={theme.muted}
                autoCapitalize="characters" autoCorrect={false} maxLength={7}
                accessibilityLabel="Accent colour as a hex value"
                accessibilityHint="Type a six-digit hex colour. Its hue is taken; the shade is measured."
                style={{
                  flex: 1, color: theme.fgStrong, fontSize: 13.5, fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                }} />
              <View style={{
                width: 22, height: 22, borderRadius: 6, backgroundColor: custom.value,
                borderWidth: 1, borderColor: theme.lineStrong,
              }} />
            </View>

            <Pressable testID="appearance-use-custom"
              onPress={() => { setAccentKey(CUSTOM_KEY); flash('Custom colour applied across the app'); }}
              disabled={isCustom}
              accessibilityRole="button" accessibilityState={{ disabled: isCustom }}
              style={{
                marginTop: SPACE.sm, minHeight: TAP_MIN - 6, borderRadius: RADIUS.sm,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: isCustom ? theme.control : custom.value,
                borderWidth: 1, borderColor: isCustom ? theme.lineStrong : custom.value,
              }}>
              <Text style={{
                fontSize: 12, fontWeight: '800',
                color: isCustom ? theme.muted : theme.onAccent,
              }}>{isCustom ? 'In use' : 'Use this'}</Text>
            </Pressable>
          </View>
        </View>

        {hexError ? (
          <Text accessibilityLiveRegion="polite"
            style={{ fontSize: 11.5, color: theme.danger, marginTop: SPACE.sm, lineHeight: 17 }}>
            {hexError}
          </Text>
        ) : null}

        {/* the four derived shades, each named */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: SPACE.lg }}>
          {shades.map(s => (
            <View key={s.label} style={{ flex: 1 }}>
              <View style={{
                height: 26, borderRadius: 8, backgroundColor: s.color,
                borderWidth: 1, borderColor: theme.line,
              }} />
              <Text style={{ fontSize: 9.5, color: theme.muted, marginTop: 5, textAlign: 'center' }}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* The measured ratio is PRINTED, not promised -- it is what the
            generator actually produced for this hue. */}
        <Muted style={{ marginTop: SPACE.md }}>
          {'Move the hue or type a hex code. The tint, header and avatar shades are derived for you, '
            + 'and the colour is darkened until white text clears 4.5:1 — so no custom pick can fail contrast. '}
          <Text style={{ fontWeight: '800', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
            {`Now ${custom.value} · white text ${customRatio}.`}
          </Text>
        </Muted>
      </View>

      {/* -------------------------------------------- 3. light or dark */}
      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.fgStrong, marginTop: SPACE.xl }}>
        3. Light or dark
      </Text>
      <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md }}>
        {themeOptions.map(m => {
          const on = mode === m.key;
          return (
            <Pressable key={m.key} testID={`appearance-theme-${m.key}`}
              onPress={() => { setMode(m.key); flash(`${m.label} theme applied`); }}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              accessibilityLabel={`${m.label} theme`}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
                minHeight: TAP_MIN + 6, paddingHorizontal: SPACE.md, borderRadius: RADIUS.lg,
                backgroundColor: on ? theme.control : theme.surface,
                borderWidth: 1.5, borderColor: on ? theme.accent : theme.line,
              }}>
              <Icon name={m.icon} size={19} color={on ? theme.accentInk : theme.muted} />
              <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '800',
                color: on ? theme.fgStrong : theme.fg }}>{m.label}</Text>
              <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'}
                size={18} color={on ? theme.accentInk : theme.dim} />
            </Pressable>
          );
        })}
      </View>

      {/* ------------------------------------------------- the preview */}
      <Label style={{ marginTop: SPACE.xxl }}>Preview</Label>
      <Muted style={{ marginTop: 4 }}>How your academy looks with this colour.</Muted>

      <Card style={{ marginTop: SPACE.md, padding: 0, overflow: 'hidden' }}>
        {/* an accent app bar, as the canvas draws it */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
          paddingHorizontal: SPACE.lg, height: 52, backgroundColor: theme.accent,
        }}>
          <Icon name="menu" size={19} color={theme.onAccent} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: theme.onAccent }}>
            RosiFit Academy
          </Text>
          <Icon name="notifications" size={19} color={theme.onAccent} />
        </View>

        <View style={{ padding: SPACE.lg }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: theme.fgStrong }}>Welcome back</Text>
          <Muted style={{ marginTop: 3 }}>Here is this week at a glance.</Muted>

          <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
            {([
              { n: '32', label: 'members', ink: theme.fgStrong },
              { n: '5', label: 'classes today', ink: theme.accentInk },
              { n: '12', label: 'need follow-up', ink: dangerInk },
            ]).map(s => (
              <View key={s.label} style={{
                flex: 1, alignItems: 'center', paddingVertical: SPACE.md,
                borderRadius: RADIUS.md, backgroundColor: theme.surface2,
                borderWidth: 1, borderColor: theme.line,
              }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: s.ink, fontVariant: ['tabular-nums'] }}>
                  {s.n}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 9.5, color: theme.muted, marginTop: 2 }}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>

          <View style={{
            marginTop: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.md,
            backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: theme.fgStrong }}>Needs you</Text>
            <Muted style={{ marginTop: 2 }}>3 members missed 4 or more sessions</Muted>
            <View style={{
              alignSelf: 'flex-start', marginTop: SPACE.md, paddingHorizontal: SPACE.lg,
              height: 34, borderRadius: RADIUS.sm, justifyContent: 'center',
              backgroundColor: theme.accent,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: theme.onAccent }}>Reach out</Text>
            </View>
          </View>
        </View>

        <View style={{
          flexDirection: 'row', paddingVertical: SPACE.sm,
          borderTopWidth: 1, borderTopColor: theme.line, backgroundColor: theme.shell,
        }}>
          {([
            { icon: 'home', label: 'Home', on: true },
            { icon: 'pie_chart', label: 'Reports', on: false },
            { icon: 'more_horiz', label: 'More', on: false },
          ]).map(t => (
            <View key={t.label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <Icon name={t.icon} size={17} color={t.on ? theme.accentInk : theme.dim} />
              <Text style={{ fontSize: 9, fontWeight: '700', color: t.on ? theme.accentInk : theme.dim }}>
                {t.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
        <Icon name="info" size={16} color={theme.dim} />
        <Muted style={{ flex: 1 }}>
          This colour is used across your academy in the app. The preview is for illustration —
          real screens may vary.
        </Muted>
      </View>

      <Muted style={{ textAlign: 'center', marginTop: SPACE.xl }}>
        {`${mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'} · ${accentName} · yours only`}
      </Muted>
    </Screen>
  );
}

/**
 * Under the shell, not instead of it. This screen is pushed on the root
 * stack, so it is not one of the tab navigator's own and wore no academy
 * header and no Home · Reports · More pill until ShellScreen drew them.
 */
export default function Appearance() {
  const router = useRouter();
  return (
    <ShellScreen title="Appearance" subtitle="Theme and accent, applied everywhere at once" onBack={() => router.back()}>
      <AppearanceBody />
    </ShellScreen>
  );
}
