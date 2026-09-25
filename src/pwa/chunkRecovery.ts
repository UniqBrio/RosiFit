/**
 * A screen whose code chunk could not be loaded (T-407).
 *
 * With per-route bundles, opening a screen fetches that screen's chunk. Two
 * ways it fails, both reproduced against a build with one chunk removed:
 *   - the file is gone (a tab still on the previous deployment asks for a
 *     chunk the new deployment no longer serves), answered 404:
 *       AsyncRequireError: Loading module <url> failed.
 *   - something answers 200 with HTML instead of the script:
 *       SyntaxError: Unexpected token '<'   -> then "Requiring unknown module"
 * React.lazy remembers the failure, so "try again" cannot help; the page has to
 * be reloaded, which fetches the current build.
 *
 * ONCE, NOT FOREVER. If the reload comes back and fails the same way within
 * CHUNK_RELOAD_WINDOW_MS, the network is the problem and the screen says so
 * instead of reloading again. The note is a TIME, not a flag: an installed app
 * is a tab that is never closed, so a flag would spend the one reload for the
 * rest of the tab's life and every later deployment would need a tap.
 */
export const CHUNK_RELOAD_KEY = 'rosifit:reloaded-for-chunk';
export const CHUNK_RELOAD_WINDOW_MS = 60_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: unknown; message?: unknown };
  if (e.name === 'AsyncRequireError' || e.name === 'ChunkLoadError') return true;
  const message = typeof e.message === 'string' ? e.message : '';
  /* Anchored: JSON.parse of an HTML answer also says "Unexpected token '<'"
     (with more after it), and that is a data error, not a missing chunk.
     "expected expression, got '<'" is Firefox's wording of the chunk case. */
  return /Loading module .+ failed|Requiring unknown module|^Unexpected token '<'$|^expected expression, got '<'$/.test(message);
}

/** Did this tab reload for a chunk within the window? */
export function reloadedRecently(stored: string | null, now: number): boolean {
  if (stored === null) return false;
  const at = Number(stored);
  return Number.isFinite(at) && now - at >= 0 && now - at < CHUNK_RELOAD_WINDOW_MS;
}

type NoteStore = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * What the root boundary does next.
 *   'show'   -- show the error: not a chunk failure, already reloaded within
 *               the window, or no note can be recorded (a reload whose guard
 *               cannot be written is a reload that can loop).
 *   'wait'   -- a write is in flight (T-021). Reloading now would throw away
 *               its answer -- the batch id and the result (RV-12, RV-30) --
 *               exactly as DeploymentRefresh's reloadWhenIdle refuses to. Ask
 *               again shortly.
 *   'reload' -- the note is written AND read back; reload now.
 */
export function chunkRecoveryStep(
  error: unknown,
  store: NoteStore | null,
  now: number,
  writeInFlight: boolean,
): 'show' | 'wait' | 'reload' {
  if (!isChunkLoadError(error) || !store) return 'show';
  let stored: string | null;
  try { stored = store.getItem(CHUNK_RELOAD_KEY); } catch { return 'show'; }
  if (reloadedRecently(stored, now)) return 'show';
  if (writeInFlight) return 'wait';
  try {
    store.setItem(CHUNK_RELOAD_KEY, String(now));
    if (store.getItem(CHUNK_RELOAD_KEY) !== String(now)) return 'show';
  } catch {
    return 'show';
  }
  return 'reload';
}
