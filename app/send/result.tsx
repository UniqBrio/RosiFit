import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Muted, Button } from '../../src/components/ui';
import { FormDialog } from '../../src/components/FormDialog';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, STATUS, statusSurface } from '../../src/theme/tokens';
import { flaggedMembers } from '../../src/data/mock';
import { isReachable, emailExclusionReason } from '../../src/data/followup';
import { peekSendAlready, peekSendResult } from '../../src/data/pending';

/**
 * The last step: RESULT, per member. "Sent" is claimed per address, never for
 * the batch -- a failed send names the member, the reason, and what to do,
 * because a silent failure here is a member nobody follows up.
 *
 * A DIALOG, over the same screen the draft was over (05-Sep-2026, on
 * request). The draft REPLACES itself with this rather than pushing, so
 * closing the result returns to the register or the course that started it
 * and never steps back through a draft that has already been sent.
 */
function SendResultBody() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();

  // The real per-recipient outcome when a send just ran; the fixtures'
  // three states otherwise, so the screen is still reviewable offline.
  const [result] = useState(() => peekSendResult());
  /* A send the server refused as ALREADY SUBMITTED (T-017): this attempt
     carried a key that had already written a batch, so what is shown is what
     THAT batch did. Read once on mount, like the result beside it. */
  const [already] = useState(() => peekSendAlready());

  const fallbackFlagged = flaggedMembers();
  const fallbackRecipients = fallbackFlagged.filter(isReachable);

  type Row = { id: string; name: string; reason?: string };
  const sent: Row[] = result
    ? result.results.filter(r => r.status === 'sent').map(r => ({ id: r.member_id, name: r.name }))
    : fallbackRecipients.slice(0, 1).map(m => ({ id: m.id, name: m.name }));
  const failed: Row[] = result
    ? result.results.filter(r => r.status === 'failed').map(r => ({ id: r.member_id, name: r.name, reason: r.reason }))
    : fallbackRecipients.slice(1, 2).map(m => ({ id: m.id, name: m.name }));
  // C-76: an excluded member is NAMED with her reason, never dropped.
  const excluded: Row[] = result
    ? result.results.filter(r => r.status === 'excluded').map(r => ({ id: r.member_id, name: r.name, reason: r.reason }))
    : fallbackFlagged.filter(m => !isReachable(m))
        .map(m => ({ id: m.id, name: m.name, reason: emailExclusionReason(m) }));

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;
  const okInk = ink('present'); const badInk = ink('absent');
  const close = () => router.back();

  /**
   * ALREADY SUBMITTED (T-017). The attempt carried a key that had already
   * written a batch, so it wrote nothing and sent nothing -- and this screen
   * owes the operator the FIRST attempt's figures, not a failure.
   *
   * Its own body rather than a banner over the list below: there are no
   * per-recipient rows for this attempt, and borrowing the fixtures' three
   * would be inventing an outcome. The icon and the words both say it, never
   * the colour alone (guardrail 3).
   */
  if (already) {
    const batch = already.batch;
    return (
      <FormDialog
        title="Already submitted"
        subtitle="This send had already reached the academy"
        onClose={close}
        footer={(
          <View style={{
            padding: SPACE.lg, borderTopWidth: 1, borderTopColor: theme.line,
            backgroundColor: theme.shell,
          }}>
            <Button testID="result-done" label="Done" onPress={close} />
          </View>
        )}
      >
        <View testID="result-already" style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, padding: SPACE.lg,
          borderRadius: RADIUS.lg, backgroundColor: theme.surface,
          borderWidth: 1, borderColor: theme.line,
        }}>
          <Icon name="history" size={20} color={theme.muted} />
          <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20, color: theme.fgStrong }}>
            {batch
              ? 'This send is already in progress — it was submitted once and the answer did '
                + 'not reach this screen. Nothing was sent a second time. What the first '
                + 'attempt did is below.'
              : 'This send is already in progress — it was submitted once and the answer did '
                + 'not reach this screen. Nothing was sent a second time. Its figures could '
                + 'not be read just now; the notification tray carries the batch.'}
          </Text>
        </View>

        {batch ? (
          <>
            <View style={{ flexDirection: 'row', marginTop: SPACE.lg, gap: SPACE.md }}>
              <Count n={batch.sent} label="Sent" color={okInk} />
              <Count n={batch.failed} label="Failed" color={badInk} />
              <Count n={batch.excluded} label="Excluded" color={theme.muted} />
            </View>
            <Muted style={{ marginTop: SPACE.lg }}>
              {`${batch.requested} asked for · ${batch.status}`}
              {batch.createdAt ? ` · ${new Date(batch.createdAt).toLocaleString()}` : ''}
            </Muted>
          </>
        ) : null}
      </FormDialog>
    );
  }

  return (
    <FormDialog
      title="Result"
      subtitle="Per member, per address — never claimed for the batch"
      onClose={close}
      /* One way out, not a Cancel/Save pair: nothing here is being decided.
         Closing returns to the screen the send was started from, which is
         still mounted underneath. */
      footer={(
        <View style={{
          padding: SPACE.lg, borderTopWidth: 1, borderTopColor: theme.line,
          backgroundColor: theme.shell,
        }}>
          <Button testID="result-done" label="Done" onPress={close} />
        </View>
      )}
    >
      <Muted>{result ? `Sent ${new Date().toLocaleString()}` : 'Sent 8:42 pm · 22 Aug'}</Muted>

      <View style={{ flexDirection: 'row', marginTop: SPACE.lg, gap: SPACE.md }}>
        <Count n={sent.length} label="Sent" color={okInk} />
        <Count n={failed.length} label="Failed" color={badInk} />
        <Count n={excluded.length} label="Excluded" color={theme.muted} />
      </View>

      <View style={{ gap: SPACE.md, marginTop: SPACE.lg }}>
        {sent.map(m => (
          <View key={m.id} style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.lg,
            borderRadius: RADIUS.lg, backgroundColor: statusSurface(okInk).bg,
            borderWidth: 1, borderColor: statusSurface(okInk).border,
          }}>
            <Icon name="check_circle" size={20} color={okInk} />
            <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: theme.fgStrong }}>{m.name}</Text>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: okInk }}>SENT</Text>
          </View>
        ))}

        {failed.map(m => (
          <View key={m.id} style={{
            padding: SPACE.lg, borderRadius: RADIUS.lg,
            backgroundColor: statusSurface(badInk).bg,
            borderWidth: 1, borderColor: statusSurface(badInk).border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
              <Icon name="error" size={20} color={badInk} />
              <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: theme.fgStrong }}>{m.name}</Text>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: badInk }}>FAILED</Text>
            </View>
            {/* the reason and the fallback, not just "failed" */}
            <Text style={{ fontSize: 12, color: theme.fg, marginTop: SPACE.sm, lineHeight: 18 }}>
              {m.reason ?? 'The provider refused the message. Retry, or call the member.'}
            </Text>
            <Button testID={`result-retry-${m.id}`}
              label="Retry this one" variant="secondary" style={{ marginTop: SPACE.md }}
              onPress={() => flash(`Retrying ${m.name.split(' ')[0]} — result will replace this row`)} />
          </View>
        ))}

        {excluded.map(m => (
          <View key={m.id} style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.md,
            borderRadius: RADIUS.md, backgroundColor: theme.surface2,
            borderWidth: 1, borderColor: theme.line,
          }}>
            <Icon name="mail_off" size={18} color={theme.muted} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.fg }}>{m.name}</Text>
              <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>
                {`${m.reason ?? 'No email on file'} — they stay in the report`}
              </Text>
            </View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.muted }}>EXCLUDED</Text>
          </View>
        ))}
      </View>
    </FormDialog>
  );
}

function Count({ n, label, color }: { n: number; label: string; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={{
      flex: 1, padding: SPACE.lg, borderRadius: RADIUS.lg,
      backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
    }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>{n}</Text>
      <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/**
 * The dialog IS the screen -- no ShellScreen. The screen underneath stays
 * mounted (DIALOG_SCREEN, app/_layout.tsx), so drawing the academy header
 * and the tab pill here would render a second copy of both over the first.
 */
export default function SendResult() {
  return <SendResultBody />;
}
