import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { Muted, Skeleton, EmptyState, ErrorState } from './ui';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../theme/tokens';
import type { Async } from '../data/hooks';
import { actionableCount, type Notification } from '../data/notifications';

/**
 * The canvas' NOTIFICATIONS sheet, and the bell that opens it.
 *
 * WHAT THE CANVAS DOES AND THIS DOES NOT
 * The canvas builds its list from the pending sessions plus two HARDCODED
 * entries -- "1 check-in email sent" naming a member and a template, and "1
 * email could not be sent" naming another. As literals those are a tray that
 * says the same thing on every device forever, and a person would act on it.
 * All three kinds are readable facts, so fetchNotifications reads all three
 * (see its comment); nothing here is invented.
 *
 * WHY THE COUNT IS NOT A BADGE OF UNREAD
 * There is no read state anywhere -- no table, no column, no per-device
 * store. A badge that never clears is worse than no badge, so the number
 * counts what is still ACTIONABLE: sessions awaiting upload. A finished send
 * is in the list to be read, and it is not counted, because there is nothing
 * to do about it.
 */

/** Each kind's own ink, icon and word. Colour is never the only signal. */
function toneFor(kind: Notification['kind'], isDark: boolean) {
  const pick = (k: keyof typeof STATUS) => isDark ? STATUS[k].fgDark : STATUS[k].fgLight;
  switch (kind) {
    case 'awaiting':
      return { ink: pick('awaiting'), icon: 'cloud_upload', word: 'Awaiting upload' };
    case 'sent':
      return { ink: pick('present'), icon: 'mark_email_read', word: 'Sent' };
    case 'excluded':
      return { ink: pick('absent'), icon: 'mail_off', word: 'Not sent' };
  }
}

/** Where a notification takes you. Each one is the screen that can act on it. */
const DESTINATION: Record<Notification['kind'], string> = {
  awaiting: '/upload',
  sent: '/audit',
  excluded: '/(tabs)/weekly',
};

export function NotificationsSheet({ open, onClose, feed }:
  { open: boolean; onClose: () => void; feed: Async<Notification[]> }) {
  const { theme } = useTheme();
  const router = useRouter();
  // The load is the SHELL's, passed in. Calling useNotifications here as well
  // would run the query twice and let the bell's count and the list under it
  // be a fetch apart -- the same drift the follow-up list is derived to
  // avoid.
  const { state, data, error, retry } = feed;
  const list = data ?? [];

  return (
    <Sheet open={open} onClose={onClose} title="Notifications">
      {state === 'loading' ? <Skeleton lines={4} /> : null}

      {state === 'error' ? (
        <ErrorState onRetry={retry}
          message={error ?? 'The notifications could not be loaded. Nothing has been changed.'} />
      ) : null}

      {state === 'ready' && list.length === 0 ? (
        <EmptyState
          title="Nothing needs you"
          body="Every session has its attendance file and every send has finished. This fills up on its own — there is nothing to check." />
      ) : null}

      {state === 'ready' && list.length > 0 ? (
        <>
          <Muted style={{ marginBottom: SPACE.md }}>
            {`${list.length} ${list.length === 1 ? 'item' : 'items'} · the ones awaiting upload are the ones still to act on`}
          </Muted>
          <View style={{ gap: 9 }}>
            {list.map(n => {
              const tone = toneFor(n.kind, theme.isDark);
              const box = statusSurface(tone.ink);
              return (
                <Pressable key={n.id} testID={`notification-${n.id}`}
                  onPress={() => { onClose(); router.push(DESTINATION[n.kind] as never); }}
                  accessibilityRole="button"
                  // The kind reaches a screen reader as a WORD; on screen it
                  // is an icon and a colour, neither of which it can read.
                  accessibilityLabel={`${tone.word}. ${n.title}. ${n.body}${n.when ? ` ${n.when}` : ''}`}
                  style={({ pressed }) => ({
                    flexDirection: 'row', gap: 11, padding: 13, minHeight: TAP_MIN,
                    borderRadius: RADIUS.lg, backgroundColor: theme.surface2,
                    borderWidth: 1, borderColor: box.border,
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <View style={{
                    width: 34, height: 34, borderRadius: 11,
                    alignItems: 'center', justifyContent: 'center', backgroundColor: box.bg,
                  }}>
                    <Icon name={tone.icon} size={18} color={tone.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={{
                      fontSize: 13.5, fontWeight: '800', color: theme.fgStrong,
                    }}>{n.title}</Text>
                    <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 17 }}>
                      {n.body}
                    </Text>
                    {n.when ? (
                      <Text style={{
                        fontSize: 10.5, color: theme.dim, marginTop: 5,
                        fontVariant: ['tabular-nums'],
                      }}>{n.when}</Text>
                    ) : null}
                  </View>
                  <Icon name="chevron_right" size={19} color={theme.dim} />
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

/**
 * The bell, with the count of what is still actionable. Renders no badge at
 * all when that count is zero rather than a "0" nobody needs to read.
 */
export function NotificationBell({ onPress, feed }:
  { onPress: () => void; feed: Async<Notification[]> }) {
  const { theme } = useTheme();
  // The same rule the tray's own module states, not a second copy of it.
  const actionable = actionableCount(feed.data ?? []);

  return (
    <Pressable testID="shell-notifications" onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={actionable === 0
        ? 'Notifications, nothing awaiting upload'
        : `Notifications, ${actionable} session${actionable === 1 ? '' : 's'} awaiting upload`}
      style={({ pressed }) => ({
        width: TAP_MIN, height: TAP_MIN, borderRadius: TAP_MIN / 2,
        alignItems: 'center', justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name="notifications" size={21} color={theme.fg} />
      {actionable > 0 ? (
        <View style={{
          position: 'absolute', top: 6, right: 5,
          minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: RADIUS.pill,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: theme.accent,
          // The ring is the shell behind it, so the badge reads as separate
          // from the glyph it overlaps rather than merging into it.
          borderWidth: 2, borderColor: theme.shell,
        }}>
          <Text style={{
            fontSize: 9, fontWeight: '800', color: theme.onAccent,
            fontVariant: ['tabular-nums'],
          }}>{actionable > 9 ? '9+' : String(actionable)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
