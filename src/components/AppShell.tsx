import { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter, type Href } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';

/** Just the one method the tab row and the pill need from the navigator. */
type TabNavigation = { navigate: (name: string) => void };
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE, TAP_MIN } from '../theme/tokens';
import { useNotifications } from '../data/hooks';
import { NotificationBell, NotificationsSheet } from './Notifications';

/**
 * The canvas' navigation shell.
 *
 * TWO structures, not one, and the canvas' own "Where to tap" caption names
 * both: "Overview and Attendance are the two tabs under the academy name;
 * Home · Reports · More sit in the footer."
 *
 * So the academy header carries the name, the tagline, the bell and a
 * settings gear, with a two-tab underline row beneath it; and a floating
 * three-item pill sits at the bottom. The header row previously held a
 * BRANCH dropdown and five scrolling chips, which is two departures from the
 * canvas in one strip -- and the caption rules the first one out directly:
 * "Branch is a filter, not a header control."
 */

/**
 * The two tabs the canvas puts under the academy name.
 *
 * WHAT WAS WRONG HERE
 * This was a scrolling row of FIVE pill chips -- Overview, Members, Courses,
 * Weekly, Attendance. The canvas has two, as an underline row, and its own
 * "Where to tap" caption says so in as many words: "Overview and Attendance
 * are the two tabs under the academy name; Home · Reports · More sit in the
 * footer."
 *
 * Attendance is a SECTION, not one screen. The canvas' tab is active for the
 * course list, a course's detail, the member list, the weekly review and the
 * register alike -- they are all the same workspace, reached from inside it
 * rather than from five slots competing for a phone's width. Its landing
 * screen is the course list, because that is what the canvas' Attendance tab
 * opens.
 */
const TABS: { route: string; match: string; label: string; also: string[] }[] = [
  { route: 'index', match: '/', label: 'Overview', also: [] },
  { route: 'courses', match: '/courses', label: 'Attendance',
    also: ['/members', '/weekly', '/attendance'] },
];

/** The three destinations the floating bar shows. */
const NAV: { href: Href; match: string; icon: string; label: string; also?: string[] }[] = [
  { href: '/(tabs)',         match: '/',        icon: 'space_dashboard', label: 'Home',
    also: ['/members', '/courses', '/weekly', '/attendance'] },
  { href: '/(tabs)/reports', match: '/reports', icon: 'pie_chart',       label: 'Reports' },
  { href: '/(tabs)/more',    match: '/more',    icon: 'more_horiz',      label: 'More' },
];

export function AcademyHeader({ navigation }: { navigation?: TabNavigation }) {
  const { theme } = useTheme();
  const router = useRouter();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const [notifsOpen, setNotifsOpen] = useState(false);
  // ONE load for the bell's count and the sheet's list. Two calls would let
  // the number on the bell and the rows under it be a fetch apart.
  const notifications = useNotifications();

  return (
    <View style={{ backgroundColor: theme.shell, paddingTop: insets.top }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 11,
        paddingHorizontal: SPACE.xl, paddingTop: SPACE.sm, paddingBottom: 10,
      }}>
        <Image source={require('../../assets/rosifit-logo.png')}
          accessibilityIgnoresInvertColors
          style={{ width: 36, height: 36, resizeMode: 'contain' }} />

        {/* The academy name and the tagline, and NOT a branch control. The
            canvas' own caption is explicit -- "Branch is a filter, not a
            header control" -- and this header carried a branch dropdown whose
            subtitle sat where the tagline belongs. Branch scope is chosen on
            Overview, beside the figures it narrows, which is the only place it
            can be read against what it changes. */}
        <Pressable testID="shell-academy"
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="RosiFit Academy. Open your profile"
          style={({ pressed }) => ({ flex: 1, minHeight: TAP_MIN, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '800', color: theme.fgStrong }}>
              RosiFit Academy
            </Text>
            <Icon name="edit" size={16} color={theme.accentInk} />
          </View>
          <Text numberOfLines={1} style={{ fontSize: 12, color: theme.muted }}>
            Preparing, Thriving and Beyond
          </Text>
        </Pressable>

        {/* The canvas puts a bell in the shell beside the add button. It was
            not here at all, so a session that ran with no attendance file
            announced itself nowhere -- it had to be gone looking for. */}
        <NotificationBell feed={notifications} onPress={() => setNotifsOpen(true)} />

        {/* A settings gear, as the canvas has it -- not an add button. Every
            add the canvas offers now lives where the thing being added is:
            Add Course on the Attendance workspace, Add Member and Bulk Import
            inside a course, Upload Attendance on the session. An add sheet in
            the shell was a sixth way to reach five screens. */}
        <Pressable testID="shell-settings"
          onPress={() => router.push('/(tabs)/more')}
          accessibilityRole="button" accessibilityLabel="Settings and more"
          style={({ pressed }) => ({
            width: 34, height: 34, borderRadius: 11,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name="settings" size={19} color={theme.fg} />
        </Pressable>
      </View>

      {/* The canvas' underline tab row: two tabs at flex:1, a 2.5px accent
          rule under the active one, and the row's own hairline beneath. Two
          labels divide a phone's width comfortably, which is why this can be
          a fixed row where five chips had to scroll. */}
      <View accessibilityRole="tablist"
        style={{ flexDirection: 'row', paddingHorizontal: SPACE.xl,
                 borderBottomWidth: 1, borderBottomColor: theme.line }}>
        {TABS.map(t => {
          const on = path === t.match || t.also.includes(path) || path.startsWith('/course/');
          return (
            <Pressable key={t.label}
              /* The NAVIGATOR's navigate, not router.push or router.navigate.
                 Both of those STACK a second copy of this whole shell on top
                 of the first -- two headers, two tab rows, and the previous
                 screen still mounted underneath, because `href: null` makes
                 these routes non-tab as far as the router is concerned. The
                 five-chip row this replaces had exactly the same defect; it
                 was simply harder to see with five chips than with two tabs.
                 NavPill has always done it this way and has always worked. */
              onPress={() => navigation?.navigate(t.route)}
              testID={`nav-tab-${t.label.toLowerCase()}`}
              accessibilityRole="tab" accessibilityState={{ selected: on }}
              accessibilityLabel={t.label}
              style={({ pressed }) => ({
                flex: 1, alignItems: 'center', gap: 9,
                paddingTop: 6, opacity: pressed ? 0.7 : 1,
              })}>
              <Text numberOfLines={1} style={{
                fontSize: 15.5, letterSpacing: -0.15,
                // the weight carries the state as well as the colour, so the
                // active tab is not colour-only (guardrail 3)
                fontWeight: on ? '800' : '600',
                color: on ? theme.accentInk : theme.muted,
              }}>{t.label}</Text>
              <View style={{
                width: '100%', height: 2.5, borderRadius: 2,
                backgroundColor: on ? theme.accent : 'transparent',
              }} />
            </Pressable>
          );
        })}
      </View>

      <NotificationsSheet feed={notifications} open={notifsOpen} onClose={() => setNotifsOpen(false)} />

    </View>
  );
}

/**
 * The canvas' floating three-item bar. It is a pill that hovers over the
 * scroll rather than a full-width bar, so every scrolling screen keeps its
 * 96pt bottom padding to clear it.
 */
export function NavPill({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const path = usePathname();
  const insets = useSafeAreaInsets();

  const active = (n: typeof NAV[number]) =>
    path === n.match || (n.also?.includes(path) ?? false);

  return (
    <View pointerEvents="box-none" style={{
      position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 18,
      alignItems: 'center',
    }}>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 4, padding: 7,
          borderRadius: RADIUS.pill, backgroundColor: theme.shell,
          borderWidth: 1, borderColor: theme.lineStrong,
        }}>
        {NAV.map(n => {
          const on = active(n);
          const name = n.match === '/' ? 'index' : n.match.slice(1);
          const route = state.routes.find(r => r.name === name);
          return (
            <Pressable key={n.label}
              onPress={() => { if (route) navigation.navigate(route.name); }}
              accessibilityRole="tab" accessibilityState={{ selected: on }}
              accessibilityLabel={n.label}
              style={({ pressed }) => ({
                width: 78, height: 54, borderRadius: RADIUS.pill,
                alignItems: 'center', justifyContent: 'center', gap: 2,
                backgroundColor: on ? theme.control : 'transparent',
                opacity: pressed ? 0.7 : 1,
              })}>
              <Icon name={n.icon} size={21} color={on ? theme.accentInk : theme.muted} />
              <Text style={{
                fontSize: 9.5, fontWeight: '800',
                color: on ? theme.accentInk : theme.muted,
              }}>{n.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * The per-screen title block the canvas draws BELOW the shell header on every
 * tabbed screen: an optional back button, the screen's own name, a line of
 * context, and whatever action that screen owns.
 */
export function ScreenHeader({ title, subtitle, right, onBack }:
  { title: string; subtitle?: string; right?: React.ReactNode; onBack?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.md,
    }}>
      {/* Passed by the screens that were PUSHED and can genuinely pop. It is
          deliberately not derived from router.canGoBack(): inside the tab
          group that answers about the STACK the tabs sit in, so Overview,
          Reports and More would each grow a back button that left the app
          for the sign-in screen. A back button that goes somewhere unexpected
          is worse than none. */}
      {onBack ? (
        <Pressable testID="screen-back" onPress={onBack}
          accessibilityRole="button" accessibilityLabel="Go back"
          style={({ pressed }) => ({
            width: 38, height: 38, borderRadius: RADIUS.md,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name="arrow_back" size={21} color={theme.fgStrong} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 21, fontWeight: '800', color: theme.fgStrong, letterSpacing: -0.4 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: theme.muted, marginTop: 3 }}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
