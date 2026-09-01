import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { ToastProvider } from '../src/components/Toast';

function Nav() {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: theme.shell },
        headerTitleStyle: { color: theme.fgStrong, fontWeight: '800' },
        headerTintColor: theme.accentInk,
        contentStyle: { backgroundColor: theme.bg },
      }}>
        <Stack.Screen name="index"  options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="register"      options={{ title: 'Register' }} />
        <Stack.Screen name="set-pin"       options={{ title: 'Your PIN' }} />
        <Stack.Screen name="forgot-pin"    options={{ title: 'Forgot PIN' }} />
        <Stack.Screen name="courses"       options={{ title: 'Courses' }} />
        <Stack.Screen name="course/edit"   options={{ title: 'Course' }} />
        <Stack.Screen name="course/rules"  options={{ title: 'Follow-up rules' }} />
        <Stack.Screen name="member/[id]"   options={{ title: 'Member' }} />
        <Stack.Screen name="member/edit"   options={{ title: 'Member' }} />
        <Stack.Screen name="sessions"      options={{ title: 'Sessions' }} />
        <Stack.Screen name="holiday"       options={{ title: 'Add holiday' }} />
        <Stack.Screen name="templates"     options={{ title: 'Templates' }} />
        <Stack.Screen name="staff/index"   options={{ title: 'Staff & access' }} />
        <Stack.Screen name="staff/add"     options={{ title: 'Add staff' }} />
        {/* the PIN is shown once and only here; there is no way back to it */}
        <Stack.Screen name="staff/pin"     options={{ title: 'PIN issued', headerBackVisible: false }} />
        <Stack.Screen name="reports"       options={{ title: 'Reports' }} />
        <Stack.Screen name="audit"         options={{ title: 'Audit log' }} />
        <Stack.Screen name="change-mobile" options={{ title: 'Mobile number' }} />
        <Stack.Screen name="send/index"    options={{ title: 'Send' }} />
        <Stack.Screen name="send/review"   options={{ title: 'Review & send' }} />
        <Stack.Screen name="send/result"   options={{ title: 'Result' }} />
        <Stack.Screen name="appearance"    options={{ title: 'Appearance' }} />
        <Stack.Screen name="profile"       options={{ title: 'Your profile' }} />
        <Stack.Screen name="help"          options={{ title: 'Help & support' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider><Nav /></ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
