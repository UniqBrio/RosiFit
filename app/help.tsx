import { View, Text, Pressable, Linking } from 'react-native';
import { Screen, H1, Body, Muted, Label } from '../src/components/ui';
import { Icon, WhatsAppIcon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../src/theme/tokens';
import {
  SUPPORT_NAME, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_E164,
  SUPPORT_WHATSAPP_URL, POWERED_BY,
} from '../src/data/mock';
import { ShellScreen } from '../src/components/AppShell';
import { useRouter } from 'expo-router';

function HelpBody() {
  const { theme } = useTheme();
  const { flash } = useToast();

  /**
   * One number, two ways to reach it. A device with no dialler -- and a
   * browser with no WhatsApp -- is a real case on the web build, so a failed
   * hand-off says what to do instead of failing silently.
   */
  const open = (url: string, fallback: string) => {
    Linking.openURL(url).catch(() => flash(fallback, 'warn'));
  };
  const call = () => open(`tel:${SUPPORT_PHONE_E164}`,
    `Call ${SUPPORT_PHONE_DISPLAY} — this device cannot start the call`);
  const whatsapp = () => open(SUPPORT_WHATSAPP_URL,
    `Message ${SUPPORT_PHONE_DISPLAY} on WhatsApp — this device cannot open it`);

  const onDeep = theme.isDark ? theme.onDeep : theme.fgStrong;
  /**
   * The footer sits on the BARE gradient, not on a panel, so it takes the ink
   * that scripts/check-contrast.ts measures against all three deep stops in
   * both themes -- theme.onDeep -- rather than the local `onDeep` above, which
   * is the light theme's near-black and only clears on a surface.
   */
  const onGradient = theme.onDeep;
  const panel = theme.isDark ? 'rgba(12,4,9,0.5)' : theme.surface;
  const panelLine = theme.isDark ? 'rgba(255,255,255,0.18)' : theme.line;
  // The status green is measured against `control` in both themes, which is
  // what these two buttons are filled with -- guardrail 2, no new colour.
  const goInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;

  // Read out digit by digit: a screen reader says the whole number as one
  // quantity otherwise, which is unusable for writing it down.
  const spoken = SUPPORT_PHONE_DISPLAY.split('').join(' ');

  const action = (
    key: string, label: string, hint: string, onPress: () => void, icon: React.ReactNode,
  ) => (
    <Pressable key={key} onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint}
      style={({ pressed }) => ({
        flex: 1, minHeight: TAP_MIN + 8, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 7,
        paddingHorizontal: SPACE.md, borderRadius: RADIUS.md,
        backgroundColor: theme.control, borderWidth: 1, borderColor: theme.lineStrong,
        opacity: pressed ? 0.85 : 1,
      })}>
      {icon}
      {/* Colour is never the only signal: each button carries its own word. */}
      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.fgStrong }}>{label}</Text>
    </Pressable>
  );

  return (
    <Screen deep>
      <H1>Help &amp; support</H1>
      <Body style={{ marginTop: SPACE.sm, color: onDeep }}>
        Call or message us. A person picks up — there is no ticket queue to wait in.
      </Body>

      {/* The panel SHOWS the number and no longer is the button: with two ways
          to reach it, a whole-card tap could only ever have meant one of them. */}
      <View style={{
        marginTop: SPACE.xxl, paddingVertical: SPACE.xxl, paddingHorizontal: SPACE.xl,
        borderRadius: 22, backgroundColor: panel, borderWidth: 1, borderColor: panelLine,
        alignItems: 'center',
      }}>
        <Text style={{
          fontSize: 10.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase',
          color: theme.accentInk,
        }}>{SUPPORT_NAME}</Text>
        <Text accessibilityLabel={spoken} style={{
          fontSize: 31, fontWeight: '700', color: theme.fgStrong, marginTop: 11,
          fontVariant: ['tabular-nums'], letterSpacing: 0.5,
        }}>{SUPPORT_PHONE_DISPLAY}</Text>

        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.lg, alignSelf: 'stretch' }}>
          {action('call', 'Call', `Call ${SUPPORT_NAME} on ${spoken}`, call,
            <Icon name="call" size={19} color={goInk} />)}
          {action('whatsapp', 'WhatsApp', `Message ${SUPPORT_NAME} on WhatsApp at ${spoken}`, whatsapp,
            <WhatsAppIcon size={19} color={goInk} />)}
        </View>
      </View>

      {/* C-90: naming the ONE channel is the anti-phishing control. Anything
          else claiming to be support is, by this statement, not support. The
          two buttons above are two ways to reach the SAME number, so the
          claim is unchanged -- the wording just has to say so. */}
      <View style={{
        marginTop: SPACE.lg, padding: 15, borderRadius: RADIUS.lg,
        backgroundColor: panel, borderWidth: 1, borderColor: panelLine,
      }}>
        <Muted style={{ lineHeight: 18 }}>
          This one number, by call or by WhatsApp, is the only support channel. If someone offers you
          another number, an email address or a link for {SUPPORT_NAME}, it did not come from us.
        </Muted>
      </View>

      {/* The maker's mark. An attribution, not a third channel -- which is why
          it sits below the statement above rather than beside the number. */}
      <View style={{ marginTop: SPACE.xxl, alignItems: 'center' }}>
        <Label style={{ color: onGradient }}>Powered by {POWERED_BY.name}</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.sm }}>
          {POWERED_BY.sites.map((s, ix) => (
            <View key={s.url} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
              {ix > 0 ? <Text style={{ fontSize: 13, color: onGradient }}>·</Text> : null}
              <Pressable
                onPress={() => open(s.url, `Open ${s.label} — this device cannot open the link`)}
                accessibilityRole="link"
                accessibilityLabel={`Open ${s.label}`}
                style={({ pressed }) => ({
                  minHeight: TAP_MIN, justifyContent: 'center',
                  paddingHorizontal: SPACE.xs, opacity: pressed ? 0.85 : 1,
                })}>
                {/* underlined as well as tinted -- a link is not allowed to be
                    a colour alone any more than a status is */}
                <Text style={{
                  fontSize: 13, fontWeight: '700', color: onGradient, textDecorationLine: 'underline',
                }}>{s.label}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

/**
 * Under the shell, not instead of it. This screen is pushed on the root
 * stack, so it is not one of the tab navigator's own and wore no academy
 * header and no Home · Reports · More pill until ShellScreen drew them.
 */
export default function Help() {
  const router = useRouter();
  return (
    <ShellScreen title="Help & support" subtitle="How the academy reaches somebody who can help" onBack={() => router.back()}>
      <HelpBody />
    </ShellScreen>
  );
}
