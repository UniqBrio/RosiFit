import { useCallback } from 'react';
import { useNavigation } from 'expo-router';
import { signInRootState } from '../data/access';

/**
 * The one way a screen reaches the sign-in screen.
 *
 * Not `router.replace('/')`: that pathname is also Overview's, and from inside
 * the tab group the router picks Overview (RC-022). The app's root Stack --
 * app/_layout.tsx, which expo-router hands back as `useNavigation('/')` -- is
 * RESET to the sign-in route alone, so the shell and whatever was pushed over
 * it are gone rather than one step back.
 *
 * That Stack, and not the navigation container: expo-router mounts the app
 * inside an internal root navigator whose only routes are the app slot, the
 * sitemap and not-found. A container-level `resetRoot` to `index` is refused
 * by that navigator -- silently, in production -- and the screen stays put.
 * That was the first version of this hook, and the walk on an exported build
 * is what caught it.
 *
 * Used by Sign out (More, profile), by the signed-out "Sign in" card, and by
 * every "Back to sign in" on the pre-session screens.
 * `src/data/signInRoute.test.ts` fails if a screen goes back to the pathname.
 */
export function useGoToSignIn(): () => void {
  const root = useNavigation('/');
  return useCallback(() => {
    root.dispatch({ type: 'RESET', payload: signInRootState() });
  }, [root]);
}
