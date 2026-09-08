import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Muted, Label, Button, Skeleton, ErrorState, EmptyState } from '../../src/components/ui';
import { FormDialog } from '../../src/components/FormDialog';
import { ConfirmDialog } from '../../src/components/Sheet';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../../src/theme/tokens';
import { primaryEmail, initials, AVATAR_TINTS } from '../../src/data/mock';
import { recipientSplit } from '../../src/data/followup';
import { enrolledIn } from '../../src/data/course';
import { mergeSent, sentThisSession, recordSent, defaultSelection, sentLabel } from '../../src/data/sent';
import { useCourses, useFollowUp, useCourseMessage, useSentForPeriod } from '../../src/data/hooks';
import { FollowUpTriggerPanel } from '../../src/components/FollowUpTriggerPanel';
import { readTrigger } from '../../src/data/followupTrigger';
import { currentWeek } from '../../src/data/period';
import { sendFollowUps } from '../../src/data/api';
import { setSendResult } from '../../src/data/pending';

/**
 * ONE draft, for ONE course: WHO it goes to, and nothing else.
 *
 * WHAT IS ON THIS SCREEN, AND WHY SO LITTLE
 * A list of members with a tick box each, and a Send button. That is the
 * whole decision. The template used to be rendered underneath -- name,
 * from-address, subject and body against the first recipient, and two
 * paragraphs explaining itself -- which is a screenful that is IDENTICAL on
 * every send, is authored somewhere else, and cannot be acted on from here.
 * It pushed the only thing you can act on below the fold. It is gone
 * (06-Sep-2026, on request); the wording is still fixed, still stored, and
 * still edited on the course.
 *
 * There is no compose field here and no template picker, and there never has
 * been: guardrail 5 and C-68 hold unchanged. Removing the PREVIEW of the
 * stored wording does not open a free-form path -- `template_id` still comes
 * from the course's resolved message and is still the only thing sent.
 *
 * PER-MEMBER SELECTION, restored deliberately (ADR 012). The rule still
 * DERIVES the list -- there is no second list, and guardrail 1 is untouched
 * -- but which of the flagged members actually gets written to is the
 * academy's call. What that reversal must not lose is the thing it cost the
 * first time: a subset that is quietly smaller than the rule's answer. So the
 * count is stated above the list, the confirmation names how many flagged
 * members are being left out, and a member with no address is still EXCLUDED
 * AND NAMED with her reason rather than dropped (C-76).
 *
 * ALREADY SENT is marked on her row. The fact was always recorded and never
 * shown, so the only guard against a second identical email in one week was
 * somebody remembering. Her box therefore starts EMPTY -- writing to her
 * again is possible, and is a deliberate tick rather than an accident.
 *
 * A DIALOG OVER THE SCREEN THAT OPENED IT, not a page (05-Sep-2026, on
 * request). Send is a decision taken ABOUT the register, the course or the
 * member you are looking at -- as a pushed page it replaced that screen, so
 * the roster you were sending FOR was gone while you decided whether to send
 * to it. The three halves that make it a dialog are in `DIALOG_SCREEN`
 * (app/_layout.tsx); this file supplies the second, the card itself.
 */
function SendDraftBody() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id, member, state: forced } =
    useLocalSearchParams<{ id?: string; member?: string; state?: string }>();
  const courseId = typeof id === 'string' && id ? id : null;
  /* ONE member's draft, opened by Reach out on her own record
     (requests/2026-09-07-reach-out-already-sent-and-rule-label.md). The
     dialog is otherwise unchanged: same derivation, same stored wording,
     same tick, same confirmation -- this narrows WHO is listed and nothing
     else. Without it the button on her record listed the whole academy. */
  const onlyMemberId = typeof member === 'string' && member ? member : null;

  const week = currentWeek();
  const courses = useCourses(forced);
  const followUp = useFollowUp(forced, week);

  /* WHOSE WORDING A SEND TO ONE MEMBER USES: her own course's.
     Named from the WHOLE member list, not from the flagged subset -- a member
     the rule has not flagged still opened this dialog, and the empty state
     owes her a name rather than a sentence about "this academy".

     The message is resolved from HER course rather than left unresolved,
     because `useCourseMessage(null)` answers `null` and `!message.data` is
     the error branch below -- so a draft with no course id renders "The draft
     could not be loaded" and can never send. Guardrail 5 wants this anyway:
     the wording belongs to a course, and a send to one member has to use the
     one her course stores. (The SAME null reaches this screen from the weekly
     screen's all-courses button, which passes no course either; that path is
     not touched here and is reported as its own defect.) */
  const onlyMember = onlyMemberId
    ? (followUp.data?.members ?? []).find(m => m.id === onlyMemberId) ?? null
    : null;
  const memberCourseId = onlyMember
    ? (courses.data ?? []).find(c => c.name === onlyMember.course)?.id ?? null
    : null;

  const wantedCourseId = courseId ?? memberCourseId;
  const message = useCourseMessage(wantedCourseId, forced);
  const already = useSentForPeriod(week, forced);

  // null = nobody has touched a box yet, so the default below applies. An
  // empty array is a real answer -- everything unticked -- and must not read
  // as "no choice made", which is why this is not just a Set.
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;
  const sentInk = ink('present');
  const course = (courses.data ?? []).find(c => c.id === courseId) ?? null;
  const close = () => router.back();

  // The same derived list the dashboard and the weekly screen read -- one
  // member source, one rule, so these counts cannot disagree with theirs.
  const flaggedAll = followUp.data?.flagged ?? [];
  const flagged = onlyMemberId
    ? flaggedAll.filter(m => m.id === onlyMemberId)
    // By the course's id. Scoped by name, a course created after one of the
    // same name was deleted would have drafted this period's follow-up to
    // the deleted course's members -- addressed, counted and ready to send.
    : course ? enrolledIn(flaggedAll, course) : flaggedAll;
  // Both halves from ONE call, so the draft cannot claim to reach somebody it
  // will skip. Counted and NAMED, never silently dropped (C-76).
  const { recipients, excluded } = recipientSplit(flagged);

  // The server's history plus this session's own sends, so the mark is right
  // the moment a send returns rather than at the next refetch -- and is the
  // only source at all on fixtures.
  const sent = mergeSent(already.data ?? {}, sentThisSession(week));

  const recipientIds = recipients.map(m => m.id);
  // Filtered against the CURRENT list: a member who stopped being flagged
  // while the dialog was open must not stay ticked in a stale array.
  const picked = (chosen ?? defaultSelection(recipientIds, sent))
    .filter(pid => recipientIds.includes(pid));
  const isPicked = (mid: string) => picked.includes(mid);
  const toggle = (mid: string) => setChosen(
    isPicked(mid) ? picked.filter(pid => pid !== mid) : [...picked, mid]);

  const allPicked = recipients.length > 0 && picked.length === recipients.length;
  const skipped = recipients.length - picked.length;
  const resending = picked.filter(pid => sent[pid]).length;
  const everyoneAlreadySent = recipients.length > 0 && recipients.every(m => sent[m.id]);

  /* THE MESSAGE HOOK LAGS ONE COMMIT BEHIND A CHANGE OF COURSE ID, and
     without this the member path PAINTS the very error card this change was
     written to remove.

     `useCourseMessage(null)` is `Promise.resolve(null)`, so it settles at
     `ready` with `data: null` almost at once. `memberCourseId` is null until
     BOTH courses and followUp are ready, so in the commit where the last of
     them lands, `loading` is already false, `failed` is false, and `message`
     is still the answer to the null id — which is exactly `!message.data`,
     the error branch. `useAsync` only resets to `loading` inside an effect,
     and passive effects run AFTER paint, so "The draft could not be loaded"
     is a frame the person actually sees on every open.

     `data: null` at `ready` can mean nothing else: fetchCourseMessage either
     returns a message or throws. So it reads exactly as "the hook has not
     been asked for the id we now want", which is a load, not a failure. When
     no id is wanted at all the expression is false and the all-courses path
     keeps its existing behaviour untouched (TD-033). */
  const messageBehind = wantedCourseId !== null
    && message.state === 'ready' && message.data === null;

  const loading = courses.state === 'loading' || followUp.state === 'loading'
    || message.state === 'loading' || already.state === 'loading' || messageBehind;
  const failed = courses.state === 'error' || followUp.state === 'error' || message.state === 'error';

  /* A member whose course has no row to resolve — renamed, removed, or an
     ended enrolment, which leaves `course` as '—' (repository.ts). Her
     wording cannot be found, so nothing can be sent, and the generic "the
     draft could not be loaded" would be both wrong and unactionable: it says
     retry, and retrying resolves nothing. Named as its own answer rather
     than left to the error card. */
  const memberUnsendable = onlyMemberId !== null && memberCourseId === null
    && courses.state === 'ready' && followUp.state === 'ready';

  const send = async () => {
    if (!message.data || sending || picked.length === 0) return;
    setConfirming(false);
    setSending(true);
    setFailure(null);
    try {
      const result = await sendFollowUps({
        member_ids: picked,
        template_id: message.data.template_id,
        period_from: week.from, period_to: week.to,
      });
      // What the send REPORTED as sent, never what it was asked to send: the
      // mark on her row has to mean an email left, not that one was tried.
      recordSent(week, result.results.filter(r => r.status === 'sent').map(r => r.member_id));
      setSendResult(result);
      // REPLACE, not push: the result takes this dialog's place over the SAME
      // screen underneath, so closing it returns to the register or the
      // course rather than stepping back through a draft that has been sent.
      router.replace('/send/result');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Nothing has been sent.');
    } finally {
      setSending(false);
    }
  };

  // Loading and failure are drawn INSIDE the card, never instead of it. As
  // bare screens they were a dialog that vanished and left the caller looking
  // at a full-window skeleton it had not asked for.
  if (loading) {
    return (
      <FormDialog title="Send communication" onClose={close}>
        <Skeleton lines={6} />
      </FormDialog>
    );
  }
  /* Answered BEFORE the error card, because it is not one: nothing failed and
     retrying changes nothing. Either the member on the link is not on the
     register, or her course has no row to take wording from. */
  if (memberUnsendable) {
    return (
      <FormDialog title="Send communication"
        subtitle={onlyMember ? `${onlyMember.name} · ${week.label}` : undefined}
        onClose={close}
        footer={(
          <View style={{
            padding: SPACE.lg, borderTopWidth: 1, borderTopColor: theme.line,
            backgroundColor: theme.shell,
          }}>
            <Button testID="send-cancel" label="Close" variant="secondary" onPress={close} />
          </View>
        )}>
        <EmptyState
          title="There is no wording to send"
          body={onlyMember
            ? `${onlyMember.name} is not on a course that has follow-up wording, so nothing can be sent to her from here. Put her on a course and the send is available again.`
            : 'That member is not on the register. She may have been removed since this link was opened.'} />
      </FormDialog>
    );
  }
  if (failed || !message.data) {
    return (
      <FormDialog title="Send communication" onClose={close}>
        <ErrorState onRetry={() => { courses.retry(); followUp.retry(); message.retry(); already.retry(); }}
          message={courses.error ?? followUp.error ?? message.error
            ?? 'The draft could not be loaded. Nothing has been sent.'} />
      </FormDialog>
    );
  }

  /* THE RULE THIS LIST CAME FROM
     (requests/2026-09-08-follow-up-trigger-on-send-and-reach-out.md).

     The draft named a threshold it never showed -- "no member of X is over the
     follow-up threshold" over a screen with no threshold on it -- and the one
     number that decides who is listed was editable only on the course form,
     two screens away. It is read here from the rules this dialog ALREADY
     fetched (`followUp.data.rules`), so the trigger on screen and the list
     under it come from one load and cannot be a query apart.

     By the resolved COURSE, whichever way this dialog was opened: its own id,
     or the course of the one member Reach out narrowed it to. Null for the
     all-courses draft, and the panel states the academy-wide rule instead of
     offering to write a rule that belongs to no course. */
  const triggerCourse = course
    ?? (onlyMember ? (courses.data ?? []).find(c => c.name === onlyMember.course) ?? null : null);
  const trigger = followUp.data
    ? readTrigger(triggerCourse?.name ?? onlyMember?.course ?? null, followUp.data.rules)
    : null;
  /* The days in force, for the can-never-be-reached warning. The offering's
     schedule where there is one, and the course's stated frequency where there
     is not -- never a guess: with neither, the warning is not drawn at all. */
  const triggerDays = triggerCourse
    ? (triggerCourse.offerings[0]?.weekdays.length || triggerCourse.frequency || null)
    : null;

  const nothingToSend = recipients.length === 0;
  const firstNames = recipients.filter(m => isPicked(m.id)).map(m => m.name.split(' ')[0]);
  /* WHO, short enough to read at a glance: a send to fifteen people does not
     need fifteen names to be recognisable, it needs the first few and a count. */
  const whoLine = firstNames.length > 3
    ? `${firstNames.slice(0, 3).join(', ')} and ${firstNames.length - 3} more`
    : firstNames.join(', ');
  /* The three caveats, one word-group each instead of one sentence each.
     Each is still STATED and still carries its number -- what goes is the
     prose around it, which said the same thing on every send. */
  const caveats = [
    skipped ? `${skipped} flagged not ticked` : '',
    resending ? `${resending} already sent this week` : '',
    excluded.length ? `${excluded.length} without an address` : '',
  ].filter(Boolean).join(' · ');

  return (
    <FormDialog
      title="Send communication"
      /* The course and the week -- what this send APPLIES to. The template's
         name used to sit here; it names something that cannot be changed from
         this dialog and reads the same on every send. */
      subtitle={`${onlyMember?.name ?? course?.name ?? 'Every course'} · ${week.label}`}
      onClose={close}
      cancelLabel="Not now"
      cancelTestID="send-cancel"
      confirmLabel={sending ? 'Sending…' : `Send to ${picked.length}`}
      confirmDisabled={sending || picked.length === 0}
      confirmTestID="send-now"
      onConfirm={nothingToSend ? undefined : () => setConfirming(true)}
      hint={nothingToSend ? undefined
        : picked.length === 0 ? 'Tick at least one member.'
        : 'This cannot be recalled.'}
      /* Nothing to send is still a dialog, and it still needs a way out --
         with no confirm action the shared footer draws nothing, so the close
         is supplied here rather than left to the X alone. */
      footer={nothingToSend ? (
        <View style={{
          padding: SPACE.lg, borderTopWidth: 1, borderTopColor: theme.line,
          backgroundColor: theme.shell,
        }}>
          <Button testID="send-cancel" label="Close" variant="secondary" onPress={close} />
        </View>
      ) : undefined}
      /* The confirmation renders OUTSIDE the card: it is a decision about
         this dialog, not a section of the draft that scrolls with it. */
      overlays={(
        <ConfirmDialog
          open={confirming}
          onClose={() => setConfirming(false)}
          title={`Send to ${picked.length} ${picked.length === 1 ? 'member' : 'members'}?`}
          /* THREE SHORT LINES, not a paragraph. The count is already in the
             title and the wording is already fixed by the course, so what is
             left to say here is who, what is being left out, and that it is
             final. The subset is still STATED -- a send that quietly reaches
             fewer people than the rule named is what selection must not
             become -- it is just no longer a screenful to read it. */
          body={whoLine
            + (caveats ? `\n${caveats}` : '')
            + '\nThis cannot be recalled.'}
          cancelLabel="Not yet"
          confirmLabel="Send"
          onConfirm={() => { void send(); }} />
      )}
    >
      {/* FIRST, and on BOTH branches. The empty draft is the case the panel
          exists for most: "nobody is over the threshold" is only actionable
          beside the threshold itself, and until now a person reading it had
          nothing on the screen to act on. */}
      <View style={{ marginBottom: SPACE.lg }}>
        <FollowUpTriggerPanel testID="send-trigger"
          reading={trigger} courseId={wantedCourseId} daysPerWeek={triggerDays} />
      </View>

      {nothingToSend ? (
        <EmptyState
          title={excluded.length ? 'Nobody here can be emailed' : 'Nobody needs following up'}
          body={excluded.length
            ? `${excluded.length} ${excluded.length === 1 ? 'member is' : 'members are'} over the threshold and ${excluded.length === 1 ? 'has' : 'have'} no email address. Add an address on the member and they will be included next time.`
            /* One member's draft says so about HER. "No member of this
               academy is over the threshold" is a claim about everybody, and
               it is not the one this dialog was opened to answer. */
            : onlyMember
              ? `${onlyMember.name} is not over the follow-up threshold for ${week.label}. Nothing to send.`
              : `No member of ${course?.name ?? 'this academy'} is over the follow-up threshold for ${week.label}. Nothing to send.`} />
      ) : (
        <>
          {/* One row of chrome for the whole list: how many are ticked, and
              the only bulk action worth a control. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
            <Pressable testID="send-select-all"
              accessibilityRole="button"
              accessibilityLabel={allPicked ? 'Clear the selection' : 'Select every member'}
              onPress={() => setChosen(allPicked ? [] : recipientIds)}
              style={({ pressed }) => ({
                minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: SPACE.md,
                borderRadius: RADIUS.pill, borderWidth: 1, borderColor: theme.line,
                backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.accentInk }}>
                {allPicked ? 'Clear all' : 'Select all'}
              </Text>
            </Pressable>
            <Label style={{ flex: 1, textAlign: 'right' }}>{`${picked.length} of ${recipients.length} selected`}</Label>
          </View>

          {everyoneAlreadySent && picked.length === 0 ? (
            <Muted style={{ marginTop: SPACE.sm }}>
              Everyone here has already had this week’s message. Tick anyone you want to write to again.
            </Muted>
          ) : null}

          <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
            {recipients.map((m, i) => {
              const on = isPicked(m.id);
              const at = sent[m.id];
              return (
                <Pressable key={m.id} testID={`send-pick-${m.id}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={at ? `${m.name} — ${sentLabel(at)}` : m.name}
                  onPress={() => toggle(m.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                    padding: SPACE.md, minHeight: TAP_MIN, borderRadius: RADIUS.md,
                    /* The app's own selected idiom (DropdownItem): accent
                       border and control fill. Never colour alone -- the box
                       itself is the signal that survives greyscale. */
                    backgroundColor: on ? theme.control : theme.surface,
                    borderWidth: 1, borderColor: on ? theme.accent : theme.line,
                    opacity: pressed ? 0.8 : 1,
                  })}>
                  <Icon name={on ? 'check_box' : 'check_box_outline_blank'} size={20}
                    color={on ? theme.accentInk : theme.dim} />
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: AVATAR_TINTS[i % AVATAR_TINTS.length],
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: theme.onAccent }}>{initials(m.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>{m.name}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.muted }}>{primaryEmail(m)}</Text>
                  </View>
                  {at ? (
                    /* The WORD, not a tint: "Sent 3 Sep" is the whole point of
                       the mark, and a colour alone would say it to nobody. */
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      paddingHorizontal: SPACE.sm, paddingVertical: 3, borderRadius: RADIUS.pill,
                      backgroundColor: statusSurface(sentInk).bg,
                      borderWidth: 1, borderColor: statusSurface(sentInk).border,
                    }}>
                      <Icon name="check_circle" size={13} color={sentInk} />
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: sentInk }}>{sentLabel(at)}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
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

          {failure ? (
            <View style={{ marginTop: SPACE.lg }}>
              <ErrorState message={failure} onRetry={() => setFailure(null)} />
            </View>
          ) : null}

          {/* One line where a card used to be. The promise it carried -- that
              the wording is the course's, and that the send is recorded with
              the wording it used -- is worth keeping; a rendered copy of that
              wording, on every send, is not. */}
          <Muted style={{ marginTop: SPACE.lg }}>
            The wording belongs to this course and is edited there. Every send is recorded with the
            wording it used.
          </Muted>
        </>
      )}
    </FormDialog>
  );
}

/**
 * The dialog IS the screen here -- no ShellScreen. It is presented over the
 * screen that opened it (DIALOG_SCREEN in app/_layout.tsx keeps that one
 * mounted and visible), so drawing the academy header and the tab pill again
 * would put a second copy of both on top of the first.
 */
export default function SendDraft() {
  return <SendDraftBody />;
}
