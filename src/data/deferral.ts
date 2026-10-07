/**
 * WHEN A READER MAY PUT OFF ASKING AGAIN.
 *
 * `useAsync` (hooks.ts) re-runs its load when its question changes (`deps`),
 * when a write announces itself on a bus (`revalidateKey`), or when somebody
 * presses Retry. The second of those used to run on every mounted reader,
 * and `app/(tabs)/_layout.tsx` keeps every visited tab mounted -- so one Save
 * re-read the register on every tab anybody had opened, for nobody
 * (docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md, RC-3).
 *
 * The rule is pure and lives here so it can be read and tested as a truth
 * table rather than inferred from a hook. Deferred means: remember that the
 * answer on screen is stale, and ask once when the screen is next shown.
 */
export type DeferralInput = {
  /** the question itself changed (`deps` moved, or the first run) */
  fresh: boolean;
  /** the revalidate key moved: a write announced itself on a bus */
  keyMoved: boolean;
  /** Retry was pressed, or a deferral is being honoured */
  retried: boolean;
  /** this reader's screen is the one on screen */
  focused: boolean;
  /** the reader is holding an answer somebody could be looking at */
  hasData: boolean;
};

/**
 * Deferred only when ALL of these hold: it is a bus bump (not a new question
 * and not a retry), the screen is not on screen, and there is an answer to
 * keep. A new question is always asked, because the old answer is to a
 * different question; a retry is always run, because it is either a person
 * or the deferral itself; a reader with nothing loaded is always run, because
 * a hidden screen still loading must finish loading.
 */
export function shouldDefer(i: DeferralInput): boolean {
  return !i.fresh && i.keyMoved && !i.retried && !i.focused && i.hasData;
}
