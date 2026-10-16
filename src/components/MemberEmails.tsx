import { View, Text } from 'react-native';
import { Skeleton, ErrorState } from './ui';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, RADIUS, STATUS } from '../theme/tokens';
import { useMemberEmails } from '../data/hooks';
import {
  newestFirst, emailOutcome, emailTimeline, academyDay, academyClock, OUTCOME_LOOK,
} from '../data/emailLog';

/**
 * THE MEMBER'S EMAILS -- the third tab on the member record, beside This week
 * and Details, directly above Reach out (16-Oct-2026, on request): "details of
 * email sent on which date whether it reached or failed, or bounce for each
 * person ... when it was sent when it bounce or failed every detail".
 *
 * Every follow-up email this member has ever been sent, newest first. Each
 * says, as a WORD and an ICON (guardrail 3), what happened to it, then when:
 * sent, delivered, bounced, marked as spam -- or why it failed or was never
 * sent. The address it went to is on every row: a member's address can
 * change, and "which address bounced" is the question after "did it bounce".
 */
export function MemberEmails({ memberId }: { memberId: string }) {
  const { theme } = useTheme();
  const log = useMemberEmails(memberId);

  if (log.state === 'loading') return <View testID="member-emails-loading"><Skeleton lines={3} /></View>;
  if (log.state === 'error') {
    return (
      <ErrorState onRetry={log.retry}
        message={log.error ?? 'The emails sent to this member could not be loaded. Nothing has been changed.'} />
    );
  }
  const rows = newestFirst(log.data ?? []);
  if (rows.length === 0) {
    return (
      <Text testID="member-emails-empty" style={{ fontSize: 13, color: theme.fg, lineHeight: 19 }}>
        No follow-up emails have been sent to this member yet. Each one sent from Reach out or a
        course’s Send Communication will be listed here, with what happened to it.
      </Text>
    );
  }

  return (
    <View testID="member-emails" style={{ gap: SPACE.md }}>
      <Text style={{ fontSize: 11.5, color: theme.muted }}>
        {`${rows.length} ${rows.length === 1 ? 'email' : 'emails'} · newest first`}
      </Text>
      {rows.map(r => {
        const outcome = emailOutcome(r);
        const look = OUTCOME_LOOK[outcome];
        const ink = theme.isDark ? STATUS[look.tone].fgDark : STATUS[look.tone].fgLight;
        const where = [r.email ?? 'No address', r.course].filter(Boolean).join(' · ');
        return (
          <View key={r.messageId} testID={`member-email-${r.messageId}`}
            accessible
            accessibilityLabel={`${outcome}. ${academyDay(r.batchAt)} ${academyClock(r.batchAt)}. ${where}. ${emailTimeline(r).join('. ')}`}
            style={{
              padding: SPACE.md, borderRadius: RADIUS.lg,
              backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
              <Icon name={look.icon} size={18} color={ink} />
              <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '800', color: ink }}>{outcome}</Text>
              <Text style={{ fontSize: 11.5, color: theme.muted, fontVariant: ['tabular-nums'] }}>
                {`${academyDay(r.batchAt)} · ${academyClock(r.batchAt)}`}
              </Text>
            </View>
            <Text numberOfLines={2} style={{ fontSize: 12, color: theme.fg, marginTop: 4 }}>{where}</Text>
            {r.subject ? (
              <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>
                {`“${r.subject}”`}
              </Text>
            ) : null}
            <View style={{ marginTop: 6, gap: 2 }}>
              {emailTimeline(r).map(line => (
                <Text key={line} style={{ fontSize: 11.5, color: theme.fg, lineHeight: 16 }}>{line}</Text>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
