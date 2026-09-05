import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { ToastProvider } from '../src/components/Toast';
import { AcademyProvider } from '../src/state/academy';

/**
 * EVERY FORM IS A DIALOG -- and it takes THREE things, not the two this file
 * used to name.
 *
 *   1. `presentation: 'transparentModal'` keeps the screen underneath MOUNTED.
 *   2. `FormDialog` draws the scrim and the card over it.
 *   3. `contentStyle: transparent` is the one that was missing. The Stack's
 *      screenOptions paint EVERY screen `theme.bg`, dialog routes included --
 *      an opaque near-black panel over the mounted screen. So 1 and 2 were
 *      both true and the backdrop was still a flat black field: the form read
 *      as a page you travelled to, which is exactly what 1 and 2 exist to
 *      prevent. A global option silently cancelling a per-screen one leaves
 *      no trace at either site, which is why these are ONE named object here
 *      rather than three properties six screens each repeat and can each drop.
 *
 * The ground under the whole stack is the `View` in `Nav` -- so a dialog route
 * opened COLD (straight from a URL, nothing behind it) still lands on
 * `theme.bg` rather than the navigator's default white.
 */
const DIALOG_SCREEN = {
  presentation: 'transparentModal',
  animation: 'fade',
  headerShown: false,
  contentStyle: { backgroundColor: 'transparent' },
} as const;

function Nav() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: theme.shell },
        headerTitleStyle: { color: theme.fgStrong, fontWeight: '800' },
        headerTintColor: theme.accentInk,
        contentStyle: { backgroundColor: theme.bg },
      }}>
        <Stack.Screen name="index"  options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Upload and match are DIALOGS over the screen that opened them --
            the Attendance register, a day on a course, or the bell. As pages
            they replaced that screen with a full window of their own, so the
            register you were uploading FOR was gone while you uploaded for it.
            Both are FormDialogs and both take DIALOG_SCREEN, exactly as the
            forms below do -- including the `contentStyle: transparent` that
            RC-016 is about, without which the card would sit on an opaque
            panel and the register underneath would be mounted but invisible.
            Their URLs are unchanged. */}
        <Stack.Screen name="upload"        options={DIALOG_SCREEN} />
        <Stack.Screen name="register"      options={{ title: 'Register' }} />
        <Stack.Screen name="set-pin"       options={{ title: 'Your PIN' }} />
        <Stack.Screen name="forgot-pin"    options={{ title: 'Forgot your PIN' }} />
        <Stack.Screen name="course/[id]"   options={{ headerShown: false }} />
        {/* The canvas presents Add/Edit Course as a DIALOG over the
            Attendance workspace, not as a page you travel to.

            transparentModal, not modal. `modal` gives a native stack a sheet
            and a BROWSER A WHOLE PAGE -- edge to edge, nothing behind it,
            which is exactly "opening as another page". The three halves that
            make it a dialog are DIALOG_SCREEN's, above: change any one and it
            stops being one. */}
        <Stack.Screen name="course/edit"   options={DIALOG_SCREEN} />
        <Stack.Screen name="offering/edit" options={DIALOG_SCREEN} />
        {/* ONE HEADING PER SCREEN. These three draw their own -- member/[id] a
            gradient header carrying her name, audit and branches a
            ScreenHeader -- and each has its own back button. Leaving the
            stack header on top of that rendered the title TWICE, one bar
            above the other ("Audit log" over "Audit log"), with two back
            controls that did the same thing. course/[id] and send/index are
            the same shape and already turn it off; this makes the rule
            uniform rather than a thing three screens happened to get right. */}
        <Stack.Screen name="member/[id]"   options={{ headerShown: false }} />
        {/* The MEMBER import — file, validate, preview, confirm. A review,
            not a form, and it is not taken OVER a screen the way the
            attendance upload is: it stays under the shell. */}
        <Stack.Screen name="member/import" options={{ headerShown: false }} />
        {/* EVERY FORM IS A DIALOG. A form is a decision taken OVER a screen,
            not a place you travel to: pushed as a page it wears the stack's
            header, so the only way out is in the chrome and the save sits
            below however much has been typed. They share one shell --
            src/components/FormDialog.tsx -- so two of them cannot end up
            disagreeing about where Cancel goes.

            Not converted, deliberately: register / set-pin / forgot-pin are
            the pre-session auth flow and own the whole screen; branches,
            staff/index, audit, appearance, profile and help are places, not
            decisions.

            upload and match were ON that list -- "multi-step reviews, not
            forms". They came off it on 05-Sep-2026 (decision 009). A review
            of the register you are looking at is still something done TO
            that screen, not a place to travel to, and the rule that decided
            it is the requester's: no separate page with a back button for
            anything a button opens. */}
        <Stack.Screen name="member/edit"   options={DIALOG_SCREEN} />
        <Stack.Screen name="holiday"       options={DIALOG_SCREEN} />
        <Stack.Screen name="branches"      options={{ headerShown: false }} />
        <Stack.Screen name="staff/index"   options={{ headerShown: false }} />
        <Stack.Screen name="staff/add"     options={DIALOG_SCREEN} />
        {/* the PIN is shown once and only here; there is no way back to it */}
        <Stack.Screen name="staff/pin"     options={{ headerShown: false }} />
        <Stack.Screen name="audit"         options={{ headerShown: false }} />
        <Stack.Screen name="change-mobile" options={DIALOG_SCREEN} />
        {/* SEND is a DIALOG over the screen that opened it (05-Sep-2026, on
            request), not a page. Send communication is a decision taken ABOUT
            the register, the course or the member being looked at -- pushed
            as a page it replaced that screen, so the roster you were sending
            FOR was gone while you decided whether to send to it. The result
            takes the draft's place over the SAME screen (router.replace), so
            closing it returns where the send started rather than stepping
            back through a draft that has already gone out. */}
        <Stack.Screen name="send/index"    options={DIALOG_SCREEN} />
        <Stack.Screen name="send/result"   options={DIALOG_SCREEN} />
        <Stack.Screen name="match"         options={DIALOG_SCREEN} />
        <Stack.Screen name="appearance"    options={{ headerShown: false }} />
        <Stack.Screen name="profile"       options={{ headerShown: false }} />
        <Stack.Screen name="help"          options={{ headerShown: false }} />
      </Stack>
    </View>
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
