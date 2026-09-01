import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useTheme } from '../../src/theme/ThemeProvider';

const icon = (glyph: string) => ({ color }: { color: ColorValue }) =>
  <Text style={{ fontSize: 19, color }}>{glyph}</Text>;

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
      <Tabs.Screen name="index"   options={{ title: 'Home',    tabBarIcon: icon('◆') }} />
      <Tabs.Screen name="weekly"  options={{ title: 'Weekly',  tabBarIcon: icon('◱') }} />
      <Tabs.Screen name="upload"  options={{ title: 'Upload',  tabBarIcon: icon('↑') }} />
      <Tabs.Screen name="members" options={{ title: 'Members', tabBarIcon: icon('☺') }} />
      <Tabs.Screen name="more"    options={{ title: 'More',    tabBarIcon: icon('⋯') }} />
    </Tabs>
  );
}
