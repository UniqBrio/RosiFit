import { Tabs } from 'expo-router';
import { AcademyHeader, NavPill } from '../../src/components/AppShell';

/**
 * The canvas' shell, restored.
 *
 * `showTabs` in the prototype lists seven screens -- home, members, courses,
 * weekly, calendar, reports, more -- and they all share ONE chrome: the
 * academy header with its four quick-nav chips on top, and a floating
 * three-item bar (Home / Reports / More) at the bottom. Members, Courses,
 * Weekly and Sessions are therefore real tab routes that the bar itself does
 * not list; `href: null` keeps them navigable while leaving the bar at three.
 *
 * Upload has no chrome in the canvas at all, so it lives outside this group
 * now (app/upload.tsx). Its URL is unchanged.
 */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <NavPill {...props} />}
      screenOptions={{ header: () => <AcademyHeader />, sceneStyle: { backgroundColor: 'transparent' } }}>
      <Tabs.Screen name="index"    options={{ title: 'Home' }} />
      <Tabs.Screen name="reports"  options={{ title: 'Reports' }} />
      <Tabs.Screen name="more"     options={{ title: 'More' }} />
      {/* reached from the header chips, not from the bar */}
      <Tabs.Screen name="members"  options={{ title: 'Members',  href: null }} />
      <Tabs.Screen name="courses"  options={{ title: 'Courses',  href: null }} />
      <Tabs.Screen name="weekly"   options={{ title: 'Weekly',   href: null }} />
      <Tabs.Screen name="sessions" options={{ title: 'Sessions', href: null }} />
    </Tabs>
  );
}
