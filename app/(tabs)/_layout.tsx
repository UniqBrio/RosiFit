import { Tabs } from 'expo-router';
import { AcademyHeader, NavPill } from '../../src/components/AppShell';

/**
 * The canvas' shell, restored.
 *
 * The screens all share ONE chrome: the academy header with its quick-nav
 * chips on top, and a floating three-item bar (Home / Reports / More) at the
 * bottom. Overview, Members, Courses, Weekly and Attendance are therefore
 * real tab routes that the bar itself does not list; `href: null` keeps them
 * navigable while leaving the bar at three.
 *
 * The month calendar that sat at /sessions is gone: the register people
 * actually read is a filterable LIST of attendance facts, which is what
 * /attendance now is.
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
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', href: null }} />
    </Tabs>
  );
}
