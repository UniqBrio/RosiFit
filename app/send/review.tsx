import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Body, Muted, Label, Button, Skeleton, ErrorState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { ConfirmDialog } from '../../src/components/Sheet';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, STATUS, statusSurface } from '../../src/theme/tokens';
import { hasEmail, primaryEmail, reasonFor, AVATAR_TINTS, initials } from '../../src/data/mock';
import { useTemplates, useFollowUp } from '../../src/data/hooks';
import { currentWeek } from '../../src/data/period';
import { isConfigured } from '../../src/lib/supabase';
import { sendFollowUps } from '../../src/data/api';
import { setSendResult } from '../../src/data/pending';

/**
 * Step 2 of 3: REVIEW. Both lists are shown — who will receive, and who is
 * excluded and why. C-76: a member with no address is counted and named here,
 * never silently dropped from the send.
 */
export default function ReviewSend() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { template, state: forced } = useLocalSearchParams<{ template?: string; state?: string }>();
  const week = currentWeek();
  const templates = useTemplates(forced);
  const followUp = useFollowUp(forced, week);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const list = templates.data ?? [];
  const tpl = list.find(t => t.id === template) ?? list[0];
  const flagged = followUp.data?.flagged ?? [];
  const rules = followUp.data?.rules;
  const recipients = flagged.filter(hasEmail);
  const excluded = flagged.filter(m => !hasEmail(m));
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;
  const okInk = ink('present');
  const badInk = ink('absent');

  const send = async () => {
    if (!tpl || sending) return;
    if (!isConfigured) {
      router.push({ pathname: '/send/result', params: { template: tpl.id } });
      return;
    }
    setSending(true);
    try {
      // Only the template id and the period go up. There is no subject or
      // body parameter to send -- that is C-68 enforced at the API, not
      // just hidden in the UI. Excluded members are decided server-side
      // from the member record, so the send cannot be talked into mailing
      // an address the record does not have.
      const result = await sendFollowUps({
        member_ids: flagged.map(m => m.id),
        template_id: tpl.id,
        period_from: week.from,
        period_to: week.to,
      });
      setSendResult(result);
      router.push({ pathname: '/send/result', params: { template: tpl.id } });
    } catch (err) {
      flash(err instanceof Error ? err.message : 'The send did not run.', 'warn');
    } finally {
      setSending(false);
    }
  };

  if (templates.state === 'loading' || followUp.state === 'loading') {
    return <Screen><Skeleton lines={5} /></Screen>;
  }
  if (templates.state === 'error' || followUp.state === 'error' || !tpl) {
    return (
      <Screen>
        <ErrorState onRetry={() => { templates.retry(); followUp.retry(); }}
          message={templates.error ?? followUp.error ?? 'That template could not be loaded. Nothing has been sent.'} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Muted>{`${tpl.name} · week ${week.label}`}</Muted>

      <Label style={{ marginTop: SPACE.lg }}>{`Will receive · ${recipients.length}`}</Label>
      <View style={{ gap: SPACE.md, marginTop: SPACE.md }}>
        {recipients.map((m, i) => (
          <View key={m.id} style={{
            padding: SPACE.lg, borderRadius: RADIUS.lg, backgroundColor: theme.surface,
            borderWidth: 1, borderColor: theme.line,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
              <View style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: AVATAR_TINTS[i % AVATAR_TINTS.length],
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>{initials(m.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: theme.fgStrong }}>{m.name}</Text>
                <Text style={{ fontSize: 11.5, color: theme.muted, fontVariant: ['tabular-nums'] }}>
                  {primaryEmail(m)}
                </Text>
              </View>
              <Icon name="check_circle" size={19} color={okInk} />
            </View>
            {/* her REAL figures, from the engine -- never a placeholder */}
            <Text style={{
              fontSize: 11.5, color: theme.muted, marginTop: SPACE.sm,
              fontVariant: ['tabular-nums'], lineHeight: 17,
            }}>
              {rules ? reasonFor(m, rules.byCourseName[m.course] ?? rules.global) : ''}
            </Text>
          </View>
        ))}
      </View>

      <Label style={{ marginTop: SPACE.xl }}>
        {`Excluded · ${excluded.length} · counted, not dropped`}
      </Label>
      <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
        {excluded.map(m => (
          <View key={m.id} style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
            padding: SPACE.md, borderRadius: RADIUS.md,
            backgroundColor: statusSurface(badInk).bg,
            borderWidth: 1, borderColor: statusSurface(badInk).border,
          }}>
            <Icon name="mail_off" size={18} color={badInk} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>{m.name}</Text>
              <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>
                No email on file — she stays in the report
              </Text>
            </View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: badInk }}>EXCLUDED</Text>
          </View>
        ))}
      </View>

      <View style={{
        marginTop: SPACE.xl, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
          <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: theme.fg }}>
            {`Template · ${tpl.name}`}
          </Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button"
            accessibilityLabel="Change template">
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>Change</Text>
          </Pressable>
        </View>
        <Body style={{ marginTop: SPACE.md, fontSize: 13 }}>
          {`Subject: ${tpl.subject.replace('{{first_name}}', recipients[0]?.name.split(' ')[0] ?? 'her')}`}
        </Body>
        <Muted style={{ marginTop: SPACE.md }}>
          The wording is fixed. Only her own figures change, and they come from the attendance engine —
          never a placeholder.
        </Muted>
      </View>

      <Button
        label={sending ? 'Sending…' : `Send to ${recipients.length} members`}
        disabled={sending || recipients.length === 0}
        style={{ marginTop: SPACE.lg }} onPress={() => setConfirming(true)} />

      {/* Sending is the one irreversible act here, so the canvas puts a
          confirmation in front of it that restates the count AND why anyone
          is excluded (C-76) before a single message leaves. */}
      <ConfirmDialog
        open={confirming} onClose={() => setConfirming(false)}
        title={`Send ${recipients.length} check-in email${recipients.length === 1 ? '' : 's'}?`}
        body={`Each email carries her own attendance figures. ${excluded.length} member${excluded.length === 1 ? ' is' : 's are'} excluded because we have no usable email for ${excluded.length === 1 ? 'her' : 'them'} — ${excluded.length === 1 ? 'she stays' : 'they stay'} on your list.`}
        confirmLabel="Send"
        onConfirm={() => { setConfirming(false); void send(); }} />
    </Screen>
  );
}
