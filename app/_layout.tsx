import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { ToastProvider } from '../src/components/Toast';
import { AcademyProvider } from '../src/state/academy';

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
        <Stack.Screen name="upload"        options={{ title: 'Upload attendance' }} />
        <Stack.Screen name="register"      options={{ title: 'Register' }} />
        <Stack.Screen name="set-pin"       options={{ title: 'Your PIN' }} />
        <Stack.Screen name="forgot-pin"    options={{ title: 'Forgot your PIN' }} />
        <Stack.Screen name="course/[id]"   options={{ headerShown: false }} />
        {/* The canvas presents Add/Edit Course as a DIALOG over the
            Attendance workspace, not as a page you travel to. */}
        <Stack.Screen name="course/edit"   options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="offering/edit" options={{ title: 'Where and when' }} />
        <Stack.Screen name="member/[id]"   options={{ title: 'Member' }} />
        {/* A dialog over the workspace, like course/edit -- see the note at
            the top of app/member/edit.tsx. */}
        <Stack.Screen name="member/edit"   options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="holiday"       options={{ title: 'Add holiday' }} />
        <Stack.Screen name="branches"      options={{ title: 'Branches' }} />
        <Stack.Screen name="staff/index"   options={{ title: 'Staff & access' }} />
        <Stack.Screen name="staff/add"     options={{ title: 'Add staff' }} />
        {/* the PIN is shown once and only here; there is no way back to it */}
        <Stack.Screen name="staff/pin"     options={{ title: 'PIN issued', headerBackVisible: false }} />
        <Stack.Screen name="audit"         options={{ title: 'Audit log' }} />
        <Stack.Screen name="change-mobile" options={{ title: 'Mobile number' }} />
        <Stack.Screen name="send/index"    options={{ headerShown: false }} />
        <Stack.Screen name="send/result"   options={{ title: 'Result' }} />
        <Stack.Screen name="match"         options={{ title: 'Match review' }} />
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
        <AcademyProvider>
          <ToastProvider><Nav /></ToastProvider>
        </AcademyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
