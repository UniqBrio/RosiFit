/**
 * The keyboard shims this platform needs, in one place.
 *
 * react-native-web 0.21 binds Enter to a focused `Pressable` and NOT Space
 * (KL-003, verified on the built page: the keydown arrives at the element and
 * no press follows it). Space is the key that picks a radio, toggles a
 * checkbox and selects a tab in the ARIA authoring practices, and CP-22
 * requires it of exactly those controls -- so every `Pressable` acting as one
 * is keyboard-incomplete here until it carries this.
 *
 * It lived inside `app/member/edit.tsx`, which is where the first control to
 * need it happened to be. The member pop-up's tab strip is the second, and a
 * second copy of a five-line keyboard contract is how the two would start
 * answering different keys (CP-011).
 */

/**
 * Spread into a `Pressable` that Space must operate.
 *
 * Typed here rather than cast at the call site: RN's own `PressableProps`
 * carries no keyboard event, because most platforms have no keyboard.
 * Selecting is idempotent, so a browser that ALSO synthesises the press lands
 * on the same value.
 */
export const spaceSelects = (pick: () => void) => ({
  onKeyDown: (e: { nativeEvent: { key: string }; preventDefault: () => void }) => {
    if (e.nativeEvent.key !== ' ') return;
    e.preventDefault();
    pick();
  },
}) as object;
