/**
 * Canvas icon names that Material Symbols has and Material Icons does not.
 * Kept free of any react-native import so the CI guard can read it in plain
 * node -- see scripts/check-icons.ts.
 */
export const ICON_ALIAS: Record<string, string> = {
  // `unsubscribe` is the envelope-with-minus, the nearest true
  // "there is no address here to write to".
  mail_off: 'unsubscribe',
  // `security` is the plain shield; the lock is implied by the copy it
  // always sits beside.
  shield_lock: 'security',
};

/** Canvas name -> Material Icons name, or null when nothing resolves. */
export function resolveGlyph(name: string, has: (n: string) => boolean): string | null {
  const alias = ICON_ALIAS[name];
  if (alias) return has(alias) ? alias : null;
  const dashed = name.replace(/_/g, '-');
  if (has(dashed)) return dashed;
  if (has(name)) return name;
  return null;
}
