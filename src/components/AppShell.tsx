import { useState } from 'react';
import { View, Text, Pressable, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter, type Href } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { DropdownPanel, DropdownList } from './Dropdown';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from './Toast';
import { RADIUS, SPACE, TAP_MIN } from '../theme/tokens';
import { useAcademy, ALL_BRANCHES } from '../state/academy';
import { useFilterOptions } from '../data/hooks';

/**
 * The canvas' navigation shell, which the first build left out.
 *
 * The prototype's own caption calls it "seven tabs", and its `showTabs` list
 * names them: home, members, courses, weekly, calendar, reports, more. They
 * are not seven slots in one bar. They are a persistent academy header
 * carrying a quick-nav chip row (Overview · Members · Courses · Weekly ·
 * Attendance) above a three-item floating bar (Home · Reports · More). Upload is NOT a
 * tab in the canvas -- it is reached from Home's "what needs you" card and
 * from the header's + button, which is why it moved out of the bar here.
 *
 * The branch chosen in this header drives every figure below it (C-84/86),
 * so it lives in AcademyProvider rather than in the dashboard.
 */

/**
 * The quick-nav chips.
 *
 * Overview leads, and it is the dashboard's OWN chip. Home is reachable from
 * the floating bar too, but the bar sits at the bottom of a long scroll and
 * reads as a separate place -- so from Members or Courses there was no
 * one-tap way back to the figures, which is the screen people switch to and
 * from most. A chip in the same row as the others makes that a sideways move
 * rather than a trip.
 *
 * Attendance replaces the month calendar that used to sit here: the register
 * people read is a filterable list of attendance facts, not a grid of days.
 */
const CHIPS: { href: Href; match: string; icon: string; label: string }[] = [
  { href: '/(tabs)',           match: '/',           icon: 'space_dashboard', label: 'Overview' },
  { href: '/(tabs)/members',   match: '/members',    icon: 'group',      label: 'Members' },
  { href: '/(tabs)/courses',   match: '/courses',    icon: 'school',     label: 'Courses' },
  { href: '/(tabs)/weekly',    match: '/weekly',     icon: 'favorite',   label: 'Weekly' },
  { href: '/(tabs)/attendance',match: '/attendance', icon: 'fact_check', label: 'Attendance' },
];

/** The three destinations the floating bar shows. */
const NAV: { href: Href; match: string; icon: string; label: string; also?: string[] }[] = [
  { href: '/(tabs)',         match: '/',        icon: 'space_dashboard', label: 'Home',
    also: ['/members', '/courses', '/weekly', '/attendance'] },
  { href: '/(tabs)/reports', match: '/reports', icon: 'pie_chart',       label: 'Reports' },
  { href: '/(tabs)/more',    match: '/more',    icon: 'more_horiz',      label: 'More' },
];

export function AcademyHeader() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const { branch, chooseBranch } = useAcademy();
  const options = useFilterOptions();
  const [sheet, setSheet] = useState<null | 'add'>(null);
  // The branch is a filter, not an action, so it opens in place under the
  // name it changes rather than as a sheet over the figures it drives.
  const [branchOpen, setBranchOpen] = useState(false);

  const branches = options.data?.branches ?? [ALL_BRANCHES];
  // The canvas spells the flagship branch out in the header and nowhere else.
  const branchLabel = branch === 'Coimbatore' ? 'Coimbatore · RS Puram' : branch;

  const addItems: { icon: string; label: string; note: string; to: Href }[] = [
    { icon: 'person_add',   label: 'Member',     note: 'Joins a course at a branch', to: '/member/edit' },
    { icon: 'school',       label: 'Course',     note: 'What you teach, not when',   to: '/course/edit' },
    { icon: 'badge',        label: 'Staff',      note: 'Access is a separate step',  to: '/staff/add' },
    { icon: 'cloud_upload', label: 'Attendance', note: 'Upload a Meet CSV',          to: '/upload' },
    // Home's quick action is now Upload attendance, so the holiday flow keeps
    // its one-tap route from the shell rather than losing one (C-90).
    { icon: 'event_busy',   label: 'Holiday',    note: 'Close a date range',        to: '/holiday' },
  ];

  return (
    <View style={{ backgroundColor: theme.shell, paddingTop: insets.top }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 11,
        paddingHorizontal: SPACE.xl, paddingTop: SPACE.sm, paddingBottom: 10,
      }}>
        <Image source={require('../../assets/rosifit-logo.png')}
          accessibilityIgnoresInvertColors
          style={{ width: 36, height: 36, resizeMode: 'contain' }} />

        <Pressable testID="shell-branch-field"
          onPress={() => setBranchOpen(o => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: branchOpen }}
          accessibilityLabel={`RosiFit Academy, showing ${branchLabel}. Change branch`}
          style={({ pressed }) => ({ flex: 1, minHeight: TAP_MIN, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '800', color: theme.fgStrong }}>
              RosiFit Academy
            </Text>
            <Icon name="edit" size={16} color={theme.accentInk} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text numberOfLines={1} style={{ fontSize: 12, color: theme.muted }}>{branchLabel}</Text>
            <Icon name={branchOpen ? 'arrow_drop_up' : 'arrow_drop_down'} size={16} color={theme.muted} />
          </View>
        </Pressable>

        <Pressable onPress={() => setSheet('add')}
          accessibilityRole="button" accessibilityLabel="Add something"
          style={({ pressed }) => ({
            width: TAP_MIN, height: TAP_MIN, borderRadius: TAP_MIN / 2,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1,
          })}>
          <Icon name="add" size={22} color={theme.onAccent} />
        </Pressable>
      </View>

      {branchOpen ? (
        <DropdownPanel inset={SPACE.xl} flow>
          <Text style={{ fontSize: 12, color: theme.muted, marginBottom: SPACE.sm, lineHeight: 18 }}>
            Every figure follows this. Picking one branch switches Home to Branch wise.
          </Text>
          <DropdownList testID="shell-branch"
            options={branches.map(label => ({
              label, meta: label === ALL_BRANCHES ? 'every branch' : '',
            }))}
            value={branch}
            onSelect={b => {
              chooseBranch(b);
              setBranchOpen(false);
              flash(b === ALL_BRANCHES ? 'Showing every branch' : `Showing ${b}`);
            }} />
        </DropdownPanel>
      ) : null}

      {/* Five chips no longer divide a phone's width into readable thirds, so
          the row scrolls instead of truncating every label to "Attend...".
          Sized by content, it fits whole on a tablet and slides on a phone. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        style={{ borderBottomWidth: 1, borderBottomColor: theme.line }}
        contentContainerStyle={{ gap: 7, paddingHorizontal: SPACE.lg, paddingBottom: 10 }}>
        {CHIPS.map(c => {
          const on = path === c.match;
          return (
            <Pressable key={c.label} onPress={() => router.push(c.href)}
              testID={`nav-chip-${c.label.toLowerCase()}`}
              accessibilityRole="tab" accessibilityState={{ selected: on }}
              accessibilityLabel={c.label}
              style={({ pressed }) => ({
                height: 36, borderRadius: RADIUS.pill,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                paddingHorizontal: 13,
                backgroundColor: on ? theme.accent : 'transparent',
                borderWidth: 1, borderColor: on ? theme.accent : theme.line,
                opacity: pressed ? 0.75 : 1,
              })}>
              <Icon name={c.icon} size={16} color={on ? theme.onAccent : theme.muted} />
              <Text numberOfLines={1} style={{
                fontSize: 11.5, fontWeight: '800',
                color: on ? theme.onAccent : theme.muted,
              }}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Sheet open={sheet === 'add'} onClose={() => setSheet(null)} title="Add something">
        <View style={{ gap: 7, marginTop: SPACE.md }}>
          {addItems.map(a => (
            <Pressable key={a.label}
              onPress={() => { setSheet(null); router.push(a.to); }}
              accessibilityRole="button" accessibilityLabel={`${a.label}. ${a.note}`}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                minHeight: TAP_MIN + 12, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
                borderRadius: RADIUS.md, backgroundColor: theme.surface2,
                borderWidth: 1, borderColor: theme.line, opacity: pressed ? 0.7 : 1,
              })}>
              <Icon name={a.icon} size={20} color={theme.accentInk} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: theme.fgStrong }}>{a.label}</Text>
                <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{a.note}</Text>
              </View>
              <Icon name="chevron_right" size={20} color={theme.dim} />
            </Pressable>
          ))}
        </View>
      </Sheet>
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
      {onBack ? (
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back"
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
