import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Label, Body, Button, Skeleton, ErrorState, EmptyState } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/AppShell';
import { ConfirmDialog } from '../../src/components/Sheet';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, STATUS, statusSurface } from '../../src/theme/tokens';
import { primaryEmail, initials, AVATAR_TINTS } from '../../src/data/mock';
import { recipientSplit } from '../../src/data/followup';
import { fillTokens } from '../../src/data/message';
import { useCourses, useFollowUp, useCourseMessage, useAcademyDetails } from '../../src/data/hooks';
import { currentWeek } from '../../src/data/period';
import { sendFollowUps } from '../../src/data/api';
import { setSendResult } from '../../src/data/pending';

/**
 * ONE draft, for ONE course, read-only.
 *
 * WHAT THIS FLOW USED TO BE
 * Three screens: pick a template, tick which members to include, then send.
 * The canvas has one — the course already decided its template, its sender
 * and its wording in the course form, so there is nothing to choose here.
 *
 * NO PER-MEMBER SELECTION, and that is the substantive change rather than a
 * simplification. The recipients ARE the follow-up list: everyone the
 * course's own rule flagged who has an address. Ticking a subset made the
 * list advisory — you could send to three of the seven the rule named and
 * nothing recorded that the other four were skipped or why. Now the rule
 * decides, the exclusions are listed by name with their reason, and the
 * choice a person makes is whether to send at all.
 *
 * The wording is shown READ-ONLY. There is no compose field here and no
 * template picker: C-68 and guardrail 5 hold, and 0021 moved the authoring to
 * the course where it belongs.
 */
export default function SendDraft() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { id, state: forced } = useLocalSearchParams<{ id?: string; state?: string }>();
  const courseId = typeof id === 'string' && id ? id : null;

  const week = currentWeek();
  const courses = useCourses(forced);
  const followUp = useFollowUp(forced, week);
  const message = useCourseMessage(courseId, forced);
  const academy = useAcademyDetails(forced);

  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;
  const course = (courses.data ?? []).find(c => c.id === courseId) ?? null;

  // The same derived list the dashboard and the weekly screen read -- one
  // member source, one rule, so these counts cannot disagree with theirs.
  const flaggedAll = followUp.data?.flagged ?? [];
  const flagged = course ? flaggedAll.filter(m => m.course === course.name) : flaggedAll;
  // Both halves from ONE call, so the draft cannot claim to reach somebody it
  // will skip. Counted and NAMED, never silently dropped (C-76).
  const { recipients, excluded } = recipientSplit(flagged);

  const loading = courses.state === 'loading' || followUp.state === 'loading'
    || message.state === 'loading';
  const failed = courses.state === 'error' || followUp.state === 'error' || message.state === 'error';

  const send = async () => {
    if (!message.data || sending) return;
    setConfirming(false);
    setSending(true);
    setFailure(null);
    try {
      const result = await sendFollowUps({
        member_ids: recipients.map(m => m.id),
        template_id: message.data.template_id,
        period_from: week.from, period_to: week.to,
      });
      setSendResult(result);
      router.replace('/send/result');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Nothing has been sent.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Screen><Skeleton lines={6} /></Screen>;
  if (failed || !message.data) {
    return (
      <Screen>
        <ErrorState onRetry={() => { courses.retry(); followUp.retry(); message.retry(); }}
          message={courses.error ?? followUp.error ?? message.error
            ?? 'The draft could not be loaded. Nothing has been sent.'} />
      </Screen>
    );
  }

  // Rendered against the FIRST recipient, so the draft shows a real person's
  // figures rather than a placeholder nobody can check.
  const previewCtx = recipients[0] ? {
    member: recipients[0],
    courseName: course?.name ?? '—',
    branchName: recipients[0].branch,
    academyName: academy.data?.name ?? 'RosiFit',
    periodFrom: week.from, periodTo: week.to,
  } : null;

  return (
    <Screen>
      <ScreenHeader title="Send communication"
        subtitle={`${message.data.template_name} · ${course?.name ?? 'every course'}`}
        onBack={() => router.back()} />

      {recipients.length === 0 ? (
        <EmptyState
          title={excluded.length ? 'Nobody here can be emailed' : 'Nobody needs following up'}
          body={excluded.length
            ? `${excluded.length} ${excluded.length === 1 ? 'member is' : 'members are'} over the threshold and ${excluded.length === 1 ? 'has' : 'have'} no email address. Add an address on the member and they will be included next time.`
            : `No member of ${course?.name ?? 'this academy'} is over the follow-up threshold for ${week.label}. Nothing to send.`} />
      ) : (
        <>
          <Label style={{ marginTop: SPACE.lg }}>{`Will receive · ${recipients.length}`}</Label>
          <View style={{ gap: SPACE.sm, marginTop: SPACE.sm }}>
            {recipients.map((m, i) => (
              <View key={m.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.md,
                borderRadius: RADIUS.md, backgroundColor: theme.surface,
                borderWidth: 1, borderColor: theme.line,
              }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: AVATAR_TINTS[i % AVATAR_TINTS.length],
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: theme.onAccent }}>{initials(m.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>{m.name}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.muted }}>{primaryEmail(m)}</Text>
                </View>
                <Icon name="check_circle" size={18} color={ink('present')} />
              </View>
            ))}
          </View>

          {excluded.length ? (
            <>
              <Label style={{ marginTop: SPACE.xl }}>
                {`Excluded · ${excluded.length} · counted, not dropped`}
              </Label>
              <View style={{ gap: SPACE.sm, marginTop: SPACE.sm }}>
                {excluded.map(m => (
                  <View key={m.id} style={{
                    flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.md,
                    borderRadius: RADIUS.md, backgroundColor: theme.surface2,
                    borderWidth: 1, borderColor: theme.line,
                  }}>
                    <Icon name="mail_off" size={17} color={ink('absent')} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.fgStrong }}>{m.name}</Text>
                      <Text style={{ fontSize: 11.5, color: theme.muted }}>
                        No email address — she stays counted in every figure
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* ------------------------------------------------ the wording */}
          <View style={{
            marginTop: SPACE.xl, padding: SPACE.lg, borderRadius: RADIUS.lg,
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Icon name="mail" size={16} color={theme.accentInk} />
              <Label style={{ flex: 1 }}>{`Template · ${message.data.template_name}`}</Label>
            </View>
            <Muted style={{ marginTop: 4 }}>
              {message.data.from_email
                ? `From ${message.data.from_email}`
                : 'From the academy’s configured address'}
            </Muted>

            {previewCtx ? (
              <>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.fgStrong, marginTop: SPACE.md }}>
                  {fillTokens(message.data.subject, previewCtx)}
                </Text>
                <Text style={{ fontSize: 12.5, color: theme.fg, marginTop: 6, lineHeight: 19 }}>
                  {fillTokens(message.data.body, previewCtx)}
                </Text>
              </>
            ) : null}

            <Muted style={{
              marginTop: SPACE.md, paddingTop: SPACE.md,
              borderTopWidth: 1, borderTopColor: theme.line,
            }}>
              The wording is fixed and belongs to this course — it is edited on the course, never here.
              Only her own figures change, and they come from the attendance engine.
            </Muted>
          </View>

          {failure ? (
            <View style={{ marginTop: SPACE.lg }}>
              <ErrorState message={failure} onRetry={() => setFailure(null)} />
            </View>
          ) : null}

          <Button testID="send-now"
            label={sending ? 'Sending…' : `Send to ${recipients.length}`}
            disabled={sending}
            style={{ marginTop: SPACE.xl }}
            onPress={() => setConfirming(true)} />

          <Body style={{
            marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.md,
            backgroundColor: statusSurface(ink('awaiting')).bg,
            borderWidth: 1, borderColor: statusSurface(ink('awaiting')).border,
            fontSize: 12.5, lineHeight: 19,
          }}>
            Every send is recorded with the wording it used, so a report months from now can say
            exactly what each member was told.
          </Body>
        </>
      )}

      {/* A send reaches real people and cannot be recalled, so the confirmation
          restates the COUNT and who is not in it, rather than asking "are you
          sure?" about a template name. */}
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Send to ${recipients.length} ${recipients.length === 1 ? 'member' : 'members'}?`}
        body={`${recipients.map(m => m.name.split(' ')[0]).join(', ')} will receive the ${message.data.template_name} wording for ${course?.name ?? 'this academy'}.`
          + (excluded.length
            ? ` ${excluded.length} ${excluded.length === 1 ? 'member is' : 'members are'} excluded for having no address; they stay counted.`
            : '')
          + ' This cannot be recalled.'}
        cancelLabel="Not yet"
        confirmLabel="Send"
        onConfirm={() => { void send(); }} />
    </Screen>
  );
}
