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
        <Stack.Screen name="upload"        options={{ headerShown: false }} />
        <Stack.Screen name="register"      options={{ title: 'Register' }} />
        <Stack.Screen name="set-pin"       options={{ title: 'Your PIN' }} />
        <Stack.Screen name="forgot-pin"    options={{ title: 'Forgot your PIN' }} />
        <Stack.Screen name="course/[id]"   options={{ headerShown: false }} />
        {/* The canvas presents Add/Edit Course as a DIALOG over the
            Attendance workspace, not as a page you travel to.

            transparentModal, not modal. `modal` gives a native stack a sheet
            and a BROWSER A WHOLE PAGE -- edge to edge, nothing behind it,
            which is exactly "opening as another page". transparentModal keeps
            the screen underneath mounted and visible, and FormDialog draws
            the scrim and the card over it. The two halves only work together:
            change one and the dialog stops being a dialog. */}
        <Stack.Screen name="course/edit"   options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false }} />
        <Stack.Screen name="offering/edit" options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false }} />
        {/* ONE HEADING PER SCREEN. These three draw their own -- member/[id] a
            gradient header carrying her name, audit and branches a
            ScreenHeader -- and each has its own back button. Leaving the
            stack header on top of that rendered the title TWICE, one bar
            above the other ("Audit log" over "Audit log"), with two back
            controls that did the same thing. course/[id] and send/index are
            the same shape and already turn it off; this makes the rule
            uniform rather than a thing three screens happened to get right. */}
        <Stack.Screen name="member/[id]"   options={{ headerShown: false }} />
        {/* EVERY FORM IS A DIALOG. A form is a decision taken OVER a screen,
            not a place you travel to: pushed as a page it wears the stack's
            header, so the only way out is in the chrome and the save sits
            below however much has been typed. They share one shell --
            src/components/FormDialog.tsx -- so two of them cannot end up
            disagreeing about where Cancel goes.

            Not converted, deliberately: register / set-pin / forgot-pin are
            the pre-session auth flow and own the whole screen; upload and
            match are multi-step reviews, not forms; branches, staff/index,
            audit, appearance, profile and help are places, not decisions. */}
        <Stack.Screen name="member/edit"   options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false }} />
        <Stack.Screen name="holiday"       options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false }} />
        <Stack.Screen name="branches"      options={{ headerShown: false }} />
        <Stack.Screen name="staff/index"   options={{ headerShown: false }} />
        <Stack.Screen name="staff/add"     options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false }} />
        {/* the PIN is shown once and only here; there is no way back to it */}
        <Stack.Screen name="staff/pin"     options={{ headerShown: false }} />
        <Stack.Screen name="audit"         options={{ headerShown: false }} />
        <Stack.Screen name="change-mobile" options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false }} />
        <Stack.Screen name="send/index"    options={{ headerShown: false }} />
        <Stack.Screen name="send/result"   options={{ headerShown: false }} />
        <Stack.Screen name="match"         options={{ headerShown: false }} />
        <Stack.Screen name="appearance"    options={{ headerShown: false }} />
        <Stack.Screen name="profile"       options={{ headerShown: false }} />
        <Stack.Screen name="help"          options={{ headerShown: false }} />
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
