import { View, Text, Pressable, Linking } from 'react-native';
import { Screen, H1, Body, Muted } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, STATUS } from '../src/theme/tokens';
import { SUPPORT_PHONE } from '../src/data/mock';

export default function Help() {
  const { theme } = useTheme();
  const { flash } = useToast();

  const call = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() =>
      // a device with no dialler is a real case on the web build, so it says
      // what to do instead of failing silently
      flash(`Call ${SUPPORT_PHONE} — this device cannot start the call`, 'warn'));
  };

  const onDeep = theme.isDark ? theme.onDeep : theme.fgStrong;
  const panel = theme.isDark ? 'rgba(12,4,9,0.5)' : theme.surface;
  const panelLine = theme.isDark ? 'rgba(255,255,255,0.18)' : theme.line;

  return (
    <Screen deep>
      <H1>Help &amp; support</H1>
      <Body style={{ marginTop: SPACE.sm, color: onDeep }}>
        Call us. A person picks up — there is no ticket queue to wait in.
      </Body>

      <Pressable onPress={call}
        accessibilityRole="button"
        accessibilityLabel={`Call RosiFit support on ${SUPPORT_PHONE.split('').join(' ')}`}
        style={({ pressed }) => ({
          marginTop: SPACE.xxl, paddingVertical: SPACE.xxl, paddingHorizontal: SPACE.xl,
          borderRadius: 22, backgroundColor: panel, borderWidth: 1, borderColor: panelLine,
          alignItems: 'center', opacity: pressed ? 0.85 : 1,
        })}>
        <Text style={{
          fontSize: 10.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase',
          color: theme.accentInk,
        }}>Tap to call</Text>
        <Text style={{
          fontSize: 31, fontWeight: '700', color: theme.fgStrong, marginTop: 11,
          fontVariant: ['tabular-nums'], letterSpacing: 0.5,
        }}>{SUPPORT_PHONE}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 }}>
          <Icon name="call" size={19} color={theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: theme.fg }}>Call RosiFit support</Text>
        </View>
      </Pressable>

      {/* C-90: naming the ONE channel is the anti-phishing control. Anything
          else claiming to be support is, by this statement, not support. */}
      <View style={{
        marginTop: SPACE.lg, padding: 15, borderRadius: RADIUS.lg,
        backgroundColor: panel, borderWidth: 1, borderColor: panelLine,
      }}>
        <Muted style={{ lineHeight: 18 }}>
          This is the only support channel. If someone offers you another number, an email address or a link
          for RosiFit support, it did not come from us.
        </Muted>
      </View>
    </Screen>
  );
}
