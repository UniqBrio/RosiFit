import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * The ONE place that decides how "this field is mandatory" is drawn.
 *
 * Four components render a field label -- `Field` and `Choice` here, `Label`
 * in ui.tsx, `PickerRow` behind the date pickers, `DropdownField` behind the
 * dropdowns -- and the request is "in all forms". RC-018 is the argument for
 * a single mark rather than four copies of the same JSX: the fix that has to
 * be applied at N call sites is the fix that ships at N-1 of them.
 *
 * It is a SHAPE first and a colour second (guardrail 3, CP-010): the glyph
 * carries the meaning for anyone who cannot see the red, and the accessible
 * name says the word "required" so a screen reader does not announce a star.
 * `theme.danger` on every surface is measured at >= 4.5:1 in both themes by
 * scripts/check-contrast.ts, so this adds no unmeasured pair (guardrail 2).
 *
 * No fontSize of its own: nested inside its label's Text it inherits that
 * label's size, so the same mark is right at 11px in a Field and at 9.5px in
 * a DropdownField.
 */
export function RequiredMark() {
  const { theme } = useTheme();
  return <Text accessibilityLabel="required" style={{ color: theme.danger }}> *</Text>;
}
