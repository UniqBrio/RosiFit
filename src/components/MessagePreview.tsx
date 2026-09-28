import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, RADIUS } from '../theme/tokens';
import { Label } from './ui';
import type { SendPreview } from '../data/sendPreview';

/**
 * The message a send is about to deliver, on the step with the last Send
 * button (requests/2026-09-26-preview-before-send.md). Drawn the way the course
 * form's own preview is -- the label saying whose figures these are, the
 * subject in bold, the body as it will read -- so the words approved on the
 * course and the words being confirmed look like one thing.
 *
 * The dialog that holds it SCROLLS it rather than growing: a long body must
 * not push the Send and Not yet buttons off a phone screen, which is exactly
 * what got the draft screen's old preview removed (06-Sep-2026). Both hosts --
 * ConfirmDialog's `detail` and the trigger prompt's card -- already scroll.
 */
export function MessagePreview({ preview, testID }: { preview: SendPreview; testID: string }) {
  const { theme } = useTheme();
  return (
    <View testID={testID} style={{
      marginTop: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.md,
      backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
    }}>
      <Label>{preview.label}</Label>
      <Text testID={`${testID}-subject`}
        style={{ fontSize: 13, fontWeight: '800', color: theme.fgStrong, marginTop: 6 }}>
        {preview.subject}
      </Text>
      <Text testID={`${testID}-body`}
        style={{ fontSize: 12.5, color: theme.fg, marginTop: 5, lineHeight: 19 }}>
        {preview.body}
      </Text>
    </View>
  );
}
