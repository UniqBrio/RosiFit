import { View, Text, Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Screen, Muted, Label, Skeleton, EmptyState } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/AppShell';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../../src/theme/tokens';
import { SUPPORT_PHONE } from '../../src/data/mock';
import { useBranchUsage, useStaff } from '../../src/data/hooks';
import { useIdentity, signOut } from '../../src/data/session';

type Item = {
  icon: string; label: string; meta: string;
  to?: Href; onPress?: () => void; danger?: boolean;
  /**
   * Rows a staff account cannot READ at all, per the RLS policies:
   * app_users_read and audit_logs_read are `is_super_admin()`, and
   * security_questions_read (registration) is too. Offering them to staff
   * showed an admin-shaped app that answered every tap with an error.
   *
   * Rows that staff can read but not WRITE -- follow-up rules, holidays,
   * branches -- stay visible on purpose: seeing the rule is part of the job.
   */
  adminOnly?: boolean;
};

export default function More() {
  const { theme, mode, accentKey, accents, isCustom } = useTheme();
  const router = useRouter();
  const { identity, loading, signedOut } = useIdentity();

  /**
   * The counts on these rows are the LIVE counts, not the fixture's.
   *
   * They were String(BRANCHES.length - 1) and String(STAFF.length) -- module
   * constants from src/data/mock -- so this screen said "Branches 3" to an
   * academy that has one, and the Branches screen it opens said "1 branch".
   * A row that promises three of something and leads to one reads as a broken
   * list rather than as a wrong label, which is how it was reported.
   *
   * useBranchUsage also carries the branch-changed subscription, so adding or
   * removing a branch corrects this row without a remount.
   *
   * Staff is NOT fetched for a staff account: app_users_read is
   * is_super_admin(), so the request would only 403, and the row is
   * adminOnly anyway. 'loading' is what useAsync honours to skip a load.
   */
  const branches = useBranchUsage();
  const staff = useStaff(identity?.isSuperAdmin ? undefined : 'loading');

  // '' while a count is still unknown -- the row renders without a meta, and
  // its accessibilityLabel drops it too. A 0 would be a claim we cannot make
  // yet, and 0 branches is a real state this academy could be in.
  const count = (n: number | undefined) => (n === undefined ? '' : String(n));
  const branchCount = count(branches.data?.length);
  const staffCount = count(staff.data?.length);

  const leave = async () => {
    // Signing out has to end the SESSION, not just the route. Replacing the
    // route alone left a live session behind and the next launch walked
    // straight back in as the previous account.
    await signOut();
    router.replace('/');
  };

  const accentName = isCustom ? 'custom' : (accents.find(a => a.key === accentKey)?.label ?? '');
  const themeName = mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light';

  /**
   * The canvas' three groups, and only what it lists in them.
   *
   * WHAT CAME OUT, and why none of it is stranded:
   *   Follow-up rules      -> the course card on the Attendance workspace
   *   Message templates    -> Send, which is where a template is chosen
   *   Language             -> not in the canvas at all, and it only ever
   *                           flashed "Tamil is coming"
   *   First-time PIN setup -> Staff & access issues a PIN; your own is
   *                           changed from your profile
   *   PIN recovery questions -> Forgot PIN, on the sign-in screen
   *   Super admin registration -> sign-in sends an unknown number there
   *
   * The canvas is explicit about the first two: "A course's message wording,
   * sender and follow-up rule are edited in the course form itself -- there
   * is no separate Message Templates or Follow-up Rules screen in settings."
   *
   * HOLIDAYS is kept although the canvas drops it. The holiday feature stays
   * by an explicit decision of the repo owner, and with the shell's add sheet
   * gone this row is now its ONLY route -- removing it would leave a
   * migrated, tested feature unreachable rather than merely unlisted.
   */
  const groups: { title: string; items: Item[] }[] = [
    {
      title: 'Configuration', items: [
        { icon: 'apartment',   label: 'Branches',  meta: branchCount, to: '/branches' },
        { icon: 'event_busy',  label: 'Holidays',  meta: 'add',                       to: '/holiday' },
      ],
    },
    {
      title: 'Access', items: [
        { icon: 'badge',   label: 'Staff & access', meta: staffCount, to: '/staff', adminOnly: true },
        { icon: 'history', label: 'Audit log',      meta: 'today',              to: '/audit', adminOnly: true },
      ],
    },
    {
      title: 'App', items: [
        { icon: 'palette',       label: 'Appearance',     meta: `${themeName} · ${accentName}`, to: '/appearance' },
        { icon: 'support_agent', label: 'Help & support', meta: SUPPORT_PHONE, to: '/help' },
        { icon: 'logout',        label: 'Sign out',       meta: '', danger: true,
          onPress: () => { void leave(); } },
      ],
    },
  ];

  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;

  // Hidden until the role is KNOWN. Rendering admin rows during the load and
  // pulling them away a moment later would offer a staff member a tap that
  // was never hers to make.
  const visible = groups
    .map(g => ({ ...g, items: g.items.filter(i => !i.adminOnly || identity?.isSuperAdmin) }))
    .filter(g => g.items.length > 0);

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="More" subtitle="Your account, your academy, your rules"
        onBack={() => router.navigate('/')} />
        <Skeleton lines={8} />
      </Screen>
    );
  }

  if (signedOut || !identity) {
    return (
      <Screen>
        <ScreenHeader title="More" subtitle="Your account, your academy, your rules"
        onBack={() => router.navigate('/')} />
        {/* Being signed out is not a failure, so it does not get the error
            card's "Something went wrong / Try again" words. */}
        <EmptyState
          title="You are signed out"
          body="Your session has ended. Sign in with your mobile number and PIN to reach your account and settings."
          action="Sign in"
          onAction={() => router.replace('/')} />
      </Screen>
    );
  }

  return (
    <Screen>
      {/* More is a TAB ROOT, so there is no stack to pop -- router.back()
          inside the tab group answers about the stack the tabs sit in and
          would leave the app for the sign-in screen. The canvas draws a back
          arrow here all the same, and it means the same thing a hardware back
          means on a non-home tab: return to Overview. A named destination,
          not a guess. */}
      <ScreenHeader title="More" subtitle="Your account, your academy, your rules"
        onBack={() => router.navigate('/')} />

      <Pressable onPress={() => router.push('/profile')}
        accessibilityRole="button"
        accessibilityLabel={`${identity.name}, ${identity.roleLabel}. Open your profile`}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 14, padding: SPACE.lg,
          borderRadius: 20, backgroundColor: theme.accentDeep,
          borderWidth: 1, borderColor: theme.lineStrong, opacity: pressed ? 0.85 : 1,
        })}>
        <View style={{
          width: 52, height: 52, borderRadius: 26, backgroundColor: theme.accentAvatar,
          borderWidth: 2, borderColor: theme.lineStrong, alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: theme.onAccent }}>{identity.initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          {/* the deep header is the same dark plum in both themes, so the
              name is white in both -- theme.onDeep is the softer body ink */}
          <Text style={{ fontSize: 19, fontWeight: '800', color: '#FFFFFF' }}>{identity.name}</Text>
          <Text style={{ fontSize: 12, color: theme.onDeep, marginTop: 3, fontVariant: ['tabular-nums'] }}>
            {`${identity.roleLabel} · ${identity.phone}`}
          </Text>
        </View>
        <Icon name="chevron_right" size={22} color={theme.onDeep} />
      </Pressable>

      {visible.map(g => (
        <View key={g.title} style={{ marginTop: SPACE.xxl }}>
          <Label style={{ marginBottom: SPACE.sm }}>{g.title}</Label>
          <View style={{
            borderRadius: RADIUS.lg, backgroundColor: theme.surface,
            borderWidth: 1, borderColor: theme.line, overflow: 'hidden',
          }}>
            {g.items.map((i, ix) => {
              const ink = i.danger ? dangerInk : theme.fgStrong;
              return (
                <Pressable key={i.label}
                  onPress={() => (i.to ? router.push(i.to) : i.onPress?.())}
                  accessibilityRole="button"
                  accessibilityLabel={i.meta ? `${i.label}, ${i.meta}` : i.label}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 13,
                    minHeight: TAP_MIN + 10, paddingHorizontal: 15, paddingVertical: SPACE.md,
                    opacity: pressed ? 0.7 : 1,
                    borderBottomWidth: ix === g.items.length - 1 ? 0 : 1, borderBottomColor: theme.line,
                  })}>
                  <View style={{
                    width: 34, height: 34, borderRadius: RADIUS.sm,
                    backgroundColor: theme.control, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={i.icon} size={18} color={i.danger ? dangerInk : theme.accentInk} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: ink }}>{i.label}</Text>
                  {i.meta ? <Text style={{ fontSize: 12, color: theme.muted }}>{i.meta}</Text> : null}
                  <Icon name="chevron_right" size={20} color={theme.dim} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Muted style={{ textAlign: 'center', marginTop: SPACE.xxl, lineHeight: 20 }}>
        RosiFit staff · v1.4 (build 212){'\n'}Preparing, Thriving and Beyond
      </Muted>
    </Screen>
  );
}
