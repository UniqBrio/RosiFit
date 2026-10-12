import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Label, Skeleton, ErrorState } from '../src/components/ui';
import { ScreenHeader, ShellScreen } from '../src/components/AppShell';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { SPACE, RADIUS, STATUS, type StatusKey } from '../src/theme/tokens';
import { useSubscription } from '../src/data/hooks';
import { businessTodayIso } from '../src/data/businessDate';
import { SUPPORT_NAME, SUPPORT_PHONE_DISPLAY } from '../src/data/mock';
import {
  longDate, stateSentence, STATE_WORD, type SubscriptionState,
} from '../src/data/subscription';

/**
 * More > Subscription: the academy's plan and its next renewal date.
 *
 * READ-ONLY. There is no write path to app_subscription from the client
 * (authenticated holds SELECT only), so this screen states the dates and says
 * who to call -- it does not offer a control that would be refused.
 *
 * Both roles see it: a staff member has to be able to find out why the app
 * went read-only (RBAC_MATRIX, app_subscription_read).
 */

/** Each state borrows a measured STATUS ink and keeps its own word and icon. */
const STATE_TONE: Record<SubscriptionState, { tone: StatusKey; icon: string }> = {
  active:    { tone: 'present',   icon: 'check' },
  grace:     { tone: 'awaiting',  icon: 'schedule' },
  expired:   { tone: 'absent',    icon: 'close' },
  suspended: { tone: 'cancelled', icon: 'block' },
};

function SubscriptionBody() {
  const { theme } = useTheme();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();
  const sub = useSubscription(forced);

  const header = (
    <ScreenHeader title="Subscription" subtitle={sub.data ? `${sub.data.plan} plan` : undefined}
      onBack={() => router.back()} />
  );

  if (sub.state === 'loading' || (!sub.data && sub.state !== 'error')) {
    return <Screen>{header}<Skeleton lines={6} /></Screen>;
  }
  if (sub.state === 'error' || !sub.data) {
    return (
      <Screen>
        {header}
        <ErrorState onRetry={sub.retry}
          message={sub.error ?? 'The subscription could not be loaded. Nothing has been changed.'} />
      </Screen>
    );
  }

  const s = sub.data;
  const tone = STATE_TONE[s.state];
  const ink = theme.isDark ? STATUS[tone.tone].fgDark : STATUS[tone.tone].fgLight;
  const endDate = longDate(s.endDate);

  const rows: { icon: string; label: string; value: string }[] = [
    { icon: 'workspace_premium', label: 'Plan',         value: s.plan },
    { icon: 'event',             label: 'Start date',   value: longDate(s.startDate) },
    { icon: 'event_repeat',      label: 'End date',     value: endDate },
    { icon: 'hourglass_empty',   label: 'Grace period', value: `${s.graceDays} ${s.graceDays === 1 ? 'day' : 'days'}` },
  ];

  return (
    <Screen>
      {header}

      {/* The next renewal date is the one figure this screen exists for, so it
          leads, with the state beside it in a word and an icon. */}
      <View testID="subscription-summary" style={{
        padding: SPACE.lg, borderRadius: RADIUS.lg, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: theme.line,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md }}>
          <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: theme.fgStrong }}>{s.customer}</Text>
          <View accessibilityLabel={`Status: ${STATE_WORD[s.state]}`} style={{
            flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4,
            borderRadius: RADIUS.pill, borderWidth: 1, borderColor: ink,
          }}>
            <Icon name={tone.icon} size={14} color={ink} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: ink, letterSpacing: 0.3 }}>
              {STATE_WORD[s.state]}
            </Text>
          </View>
        </View>

        <Label style={{ marginTop: SPACE.lg }}>Next renewal</Label>
        <Text testID="subscription-renewal" style={{
          fontSize: 28, fontWeight: '800', color: theme.fgStrong, marginTop: 4,
          fontVariant: ['tabular-nums'], letterSpacing: -0.3,
        }}>{endDate}</Text>
        <Muted style={{ marginTop: SPACE.sm }}>{stateSentence(s, businessTodayIso())}</Muted>
      </View>

      <Label style={{ marginTop: SPACE.xxl, marginBottom: SPACE.sm }}>Details</Label>
      <View style={{
        borderRadius: RADIUS.lg, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: theme.line, overflow: 'hidden',
      }}>
        {rows.map((r, ix) => (
          <View key={r.label} accessible accessibilityLabel={`${r.label}, ${r.value}`} style={{
            flexDirection: 'row', alignItems: 'center', gap: 13,
            paddingHorizontal: 15, paddingVertical: SPACE.md,
            borderBottomWidth: ix === rows.length - 1 ? 0 : 1, borderBottomColor: theme.line,
          }}>
            <View style={{
              width: 34, height: 34, borderRadius: RADIUS.sm,
              backgroundColor: theme.control, alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={r.icon} size={18} color={theme.accentInk} />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: theme.fgStrong }}>{r.label}</Text>
            <Text style={{ fontSize: 14, color: theme.muted, fontVariant: ['tabular-nums'] }}>{r.value}</Text>
          </View>
        ))}
      </View>

      <Muted style={{ marginTop: SPACE.lg, lineHeight: 19 }}>
        Renewals are handled by {SUPPORT_NAME}. To renew or change the plan, call {SUPPORT_PHONE_DISPLAY}.
      </Muted>
    </Screen>
  );
}

/** Pushed on the root stack, so it wears the shell like Branches does. */
export default function Subscription() {
  return <ShellScreen><SubscriptionBody /></ShellScreen>;
}
