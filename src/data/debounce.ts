/**
 * WHEN A TYPED QUERY IS APPLIED.
 *
 * A search box used to narrow its list on every keystroke, and the list was
 * every row: on the course roster that was 0.8 s of blocked main thread per
 * letter at 1,644 members and 7.7 s at 5,000
 * (docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md, RC-6). The lists are
 * windowed now, so a keystroke is cheap -- but a filter over 1,644 rows is
 * still a filter over 1,644 rows, and six letters typed quickly are six of
 * them for one result. The query is APPLIED after a short quiet, so the list
 * answers the word, not every letter of it.
 *
 * TWO RULES, pure and tested here; `useDebouncedQuery` in hooks.ts is the
 * wiring.
 *
 *   QUIET_MS. 150 ms: well under the ~250 ms a person reads as "the app is
 *   thinking", and above the gap between two letters typed in a word.
 *
 *   CLEARING IS IMMEDIATE. Emptying the box must bring the whole list back
 *   at once: a delay there reads as a list that lost rows. So an empty
 *   query is never debounced.
 */
export const QUIET_MS = 150;

/**
 * How long to wait before applying `next`, having just had `prev` applied.
 * 0 means "now".
 */
export function applyAfterMs(next: string, quietMs: number = QUIET_MS): number {
  return next.trim() === '' ? 0 : quietMs;
}
