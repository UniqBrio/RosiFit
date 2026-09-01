import { useEffect, useState } from 'react';
import { View, Text, Pressable, Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Body, Muted, Button } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../../src/theme/tokens';
import { takeIssuedPin } from '../../src/data/pending';

const APP_LINK = 'https://rosifit.app/staff';

export default function StaffPin() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const params = useLocalSearchParams<{ pin?: string; name?: string; phone?: string; role?: string }>();

  // The whole screen is derived from a hand-off that does not exist during
  // the static web export's first render. Painting it straight away made
  // the client disagree with the server (React #418) -- and, worse, briefly
  // rendered a placeholder that looked like a real PIN. So nothing that
  // depends on it is drawn until after mount.
  const [ready, setReady] = useState(false);
  // Taken ONCE, at mount: a re-render must not re-read a slot that has
  // already been emptied, or the screen would flip to "already shown".
  const [issued] = useState(() => takeIssuedPin());
  useEffect(() => setReady(true), []);

  // In memory first (the live path, so the PIN never reaches the URL); route
  // params remain for the fixtures walkthrough, which has no function call
  // to carry it.
  const rawPin = (issued?.pin ?? params.pin ?? '').replace(/\D/g, '');
  const pin = rawPin.slice(0, 4);
  const name = issued?.name ?? params.name ?? 'She';
  const phone = issued?.phone ?? params.phone ?? '';
  const role = issued?.role ?? params.role ?? '';

  if (!ready) return <Screen deep><View /></Screen>;

  // A PIN is shown exactly once, from the staff list. Landing here without
  // one means the moment has passed -- say so rather than showing filler
  // that reads like a credential.
  if (pin.length !== 4) {
    return (
      <Screen deep>
        <Body>
          This PIN has already been shown once and cannot be retrieved. Generate a new one from
          Staff &amp; access.
        </Body>
        <Button label="Back to staff" onPress={() => router.replace('/staff')} style={{ marginTop: SPACE.lg }} />
      </Screen>
    );
  }

  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;
  const okBox = statusSurface(okInk);
  const panel = theme.isDark ? theme.surface : theme.surface2;

  const copyPin = async () => {
    await Clipboard.setStringAsync(pin);
    flash('PIN copied — clear your clipboard once she has it');
  };
  const copyLink = async () => {
    await Clipboard.setStringAsync(APP_LINK);
    flash(`App link copied · ${APP_LINK.replace('https://', '')}`);
  };
  const share = async () => {
    // The PIN is deliberately NOT in the shared payload. Sharing the link and
    // reading out the PIN keeps the credential off whatever channel is picked.
    try {
      await Share.share({ message: `Sign in to RosiFit here: ${APP_LINK}` });
    } catch {
      flash('Sharing is not available on this device', 'warn');
    }
  };

  return (
    <Screen deep>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        padding: SPACE.md, borderRadius: RADIUS.md,
        backgroundColor: okBox.bg, borderWidth: 1, borderColor: okBox.border,
      }}>
        <Icon name="check_circle" size={20} color={okInk} />
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: theme.fgStrong }}>
          {`${name} can sign in now`}
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginTop: SPACE.xxl }}>
        <Text style={{
          fontSize: 11.5, fontWeight: '700', letterSpacing: 1,
          textTransform: 'uppercase', color: theme.accentInk,
        }}>Her PIN — shown once</Text>

        {/* Read as a single unit: four separate digits would be announced as
            four unrelated numbers, which is unusable for anyone reading it out. */}
        <View
          accessible
          accessibilityLabel={`Her PIN is ${pin.split('').join(' ')}`}
          style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.lg }}>
          {pin.split('').map((d, i) => (
            <View key={i} style={{
              width: 62, height: 80, borderRadius: RADIUS.lg,
              backgroundColor: panel, borderWidth: 1, borderColor: theme.lineStrong,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{
                fontSize: 36, fontWeight: '700', color: theme.fgStrong,
                fontVariant: ['tabular-nums'],
                ...Platform.select({ web: { fontFamily: 'ui-monospace, Menlo, monospace' }, default: {} }),
              }}>{d}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 12.5, color: theme.muted, marginTop: SPACE.md, fontVariant: ['tabular-nums'] }}>
          {[phone && `+91 ${phone}`, role].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <View style={{
        marginTop: SPACE.xxl, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: panel, borderWidth: 1, borderColor: theme.line,
      }}>
        <Body style={{ fontSize: 12.5, lineHeight: 20 }}>
          Read it out to her in person, or send it on WhatsApp from your own phone. It will not be shown
          again — if it is lost, reset it from Staff &amp; access.
        </Body>
      </View>

      <View style={{ gap: 9, marginTop: SPACE.lg }}>
        <SecondaryRow icon="content_copy" label="Copy the PIN" meta="just the 4 digits" onPress={copyPin} />
        <SecondaryRow icon="link" label="Copy the app link" meta="no PIN inside" onPress={copyLink} />
      </View>

      <Button label="Share — you choose where" onPress={share} style={{ marginTop: 9 }} />

      <Muted style={{ marginTop: SPACE.md, textAlign: 'center' }}>
        Send the PIN and the link on different channels. Nothing is sent for you.
      </Muted>

      <Button label="Done — back to staff" variant="secondary"
        onPress={() => router.replace('/staff')} style={{ marginTop: SPACE.xl }} />
    </Screen>
  );
}

function SecondaryRow({ icon, label, meta, onPress }:
  { icon: string; label: string; meta: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${meta}`}
      style={({ pressed }) => ({
        minHeight: TAP_MIN + 8, borderRadius: RADIUS.lg,
        backgroundColor: theme.isDark ? theme.surface : theme.surface2,
        borderWidth: 1, borderColor: theme.lineStrong,
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        paddingHorizontal: SPACE.lg, opacity: pressed ? 0.75 : 1,
      })}>
      <Icon name={icon} size={19} color={theme.accentInk} />
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>{label}</Text>
      <Text style={{ fontSize: 11, color: theme.muted }}>{meta}</Text>
    </Pressable>
  );
}
