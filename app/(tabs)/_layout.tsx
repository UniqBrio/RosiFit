import { Tabs } from 'expo-router';
import { type ColorValue } from 'react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Icon } from '../../src/components/Icon';

/**
 * The canvas splits navigation into a 3-item bar (Home / Reports / More) plus
 * four secondary tabs in the header. Five real tabs reach the same
 * destinations in one tap instead of two, and Upload -- a core weekly job in
 * the canvas' own "what needs you" list -- gets a permanent home rather than
 * living only inside Home. The icons are the canvas' own names.
 */
const icon = (name: string) => ({ color }: { color: ColorValue }) =>
  <Icon name={name} size={22} color={String(color)} />;

export default function TabLayout() {
  const { theme } = useTheme();
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: theme.shell },
      headerTitleStyle: { color: theme.fgStrong, fontWeight: '800' },
      tabBarStyle: { backgroundColor: theme.shell, borderTopColor: theme.line, height: 62, paddingBottom: 8 },
      // accentInk, not accent: on the light theme the raw accent measures
      // 3.74:1 as text, short of the 4.5 a tab label needs
      tabBarActiveTintColor: theme.accentInk,
      tabBarInactiveTintColor: theme.muted,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
    }}>
      <Tabs.Screen name="index"   options={{ title: 'Home',    tabBarIcon: icon('space_dashboard') }} />
      <Tabs.Screen name="weekly"  options={{ title: 'Weekly',  tabBarIcon: icon('favorite') }} />
      <Tabs.Screen name="upload"  options={{ title: 'Upload',  tabBarIcon: icon('cloud_upload') }} />
      <Tabs.Screen name="members" options={{ title: 'Members', tabBarIcon: icon('group') }} />
      <Tabs.Screen name="more"    options={{ title: 'More',    tabBarIcon: icon('more_horiz') }} />
    </Tabs>
  );
}
