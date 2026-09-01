import { useEffect, useState } from 'react';

export type ScreenState = 'loading' | 'ready' | 'error';

/**
 * Stands in for the fetch each screen will do once the Edge Functions exist.
 * It exists now so the loading and error paths are BUILT and reviewable rather
 * than bolted on later -- a screen that has only ever been seen with data
 * tends to have no honest empty or error state at all.
 *
 * `?state=loading|error` in the URL forces a state, so every branch can be
 * shown to a reviewer without breaking anything on purpose.
 */
export function useScreenState(forced?: string): [ScreenState, () => void] {
  // ALWAYS start at 'loading', on both the server prerender and the client.
  // Reading the forced state during the first render made the client's HTML
  // disagree with the statically exported HTML, and React threw away the
  // prerendered markup (hydration error #418). The forced state is applied
  // after mount instead, where a difference is legitimate.
  const [state, setState] = useState<ScreenState>('loading');

  useEffect(() => {
    if (forced === 'loading') return;                      // pinned for review
    if (forced === 'error') { setState('error'); return; }
    const t = setTimeout(() => setState('ready'), 420);
    return () => clearTimeout(t);
  }, [forced]);

  const retry = () => {
    setState('loading');
    setTimeout(() => setState('ready'), 420);
  };
  return [state, retry];
}
