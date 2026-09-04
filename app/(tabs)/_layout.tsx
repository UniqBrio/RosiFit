import { Tabs } from 'expo-router';
import { AcademyHeader, NavPill } from '../../src/components/AppShell';

/**
 * The canvas' shell.
 *
 * The screens share ONE chrome: the academy header with its two-tab underline
 * row (Overview · Attendance) on top, and a floating three-item pill (Home ·
 * Reports · More) at the bottom.
 *
 * Members, Courses, Weekly and Attendance are real routes that the bottom
 * pill does not list -- `href: null` keeps them navigable while leaving the
 * pill at three. They are all reached from inside the Attendance workspace,
 * which is what the canvas' second tab opens.
 *
 * Upload has no chrome in the canvas at all, so it lives outside this group
 * (app/upload.tsx). Its URL is unchanged.
 */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <NavPill {...props} />}
      screenOptions={{
        // the header needs the navigator to switch tabs without stacking
        header: props => <AcademyHeader navigation={props.navigation} />,
        sceneStyle: { backgroundColor: 'transparent' },
      }}>
      <Tabs.Screen name="index"    options={{ title: 'Home' }} />
      <Tabs.Screen name="reports"  options={{ title: 'Reports' }} />
      <Tabs.Screen name="more"     options={{ title: 'More' }} />
      {/* Courses is the Attendance TAB's landing screen, so it must stay
          switchable: `href: null` removes a route from the navigator's
          navigable set entirely, and nothing -- router.push, router.navigate
          or navigation.navigate -- can then switch to it. It stacks instead,
          which mounted a second copy of the whole shell. The pill renders
          from its own three-item list, so nothing here needs hiding. */}
      <Tabs.Screen name="courses"  options={{ title: 'Courses' }} />
      {/* Drill-downs inside the Attendance workspace. Stacking is correct
          for these -- they are pushed from within it and come back. */}
      <Tabs.Screen name="members"  options={{ title: 'Members',  href: null }} />
      <Tabs.Screen name="weekly"   options={{ title: 'Weekly',   href: null }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', href: null }} />
    </Tabs>
  );
}
