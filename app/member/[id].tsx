import { useState, type ReactNode } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  useMembers, useRules, useSentForPeriod, useCourses, useCourseMessage, useMemberWeek,
} from '../../src/data/hooks';
import {
  FollowUpTriggerPanel, FollowUpTriggerPrompt, type TriggerRecipient,
} from '../../src/components/FollowUpTriggerPanel';
import { readTrigger } from '../../src/data/followupTrigger';
import { enrolledIn } from '../../src/data/course';
import { sendFollowUps } from '../../src/data/api';
import { setSendResult } from '../../src/data/pending';
import { FormDialog } from '../../src/components/FormDialog';
import { ConfirmDialog } from '../../src/components/Sheet';
import { Muted, Label, Button, Skeleton, ErrorState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, STATUS, statusSurface } from '../../src/theme/tokens';
import {
  memberSubtitle, attendanceTone, MEMBER_TABS, memberStatusReading,
  memberDayNames, addressesInOrder, type MemberTab,
} from '../../src/components/memberDialog';
import { TabStrip } from '../../src/components/TabStrip';
import { attendancePct, primaryEmail, hasEmail, type Member } from '../../src/data/mock';
import { streakReading } from '../../src/data/streak';
import { flagged, isReachable, recipientSplit } from '../../src/data/followup';
import { currentWeek, iso } from '../../src/data/period';
import { mergeSent, sentThisSession, sentOn, recordSent } from '../../src/data/sent';
import { reachOutState, REACH_OUT, warnsBeforeReachOut } from '../../src/data/reachOut';

/**
 * ONE MEMBER, AS A POP-UP OVER THE LIST SHE WAS TAPPED ON
 * (requests/2026-09-06-member-detail-as-popup.md).
 *
 * This was a PAGE: the academy shell, a plum gradient header with her name
 * and a back button, five tiles, a bordered card per session, an email panel
 * and the two actions at the bottom of a long scroll -- and on a wide window
 * every tile stretched a third of the screen to hold one number. The roster
 * she was tapped on was gone while she was read. The requester's words:
 * "lengthy", and "it should appear as pop up on top of screen with minimal
 * but yet full info".
 *
 * It is a DIALOG now, the same card every form and the upload use
 * (FormDialog + DIALOG_SCREEN in app/_layout.tsx): the roster stays under it,
 * blurred, and closing lands back on it. "Minimal but full" is read as the
 * SAME FACTS IN LESS ROOM: her five figures in one strip, her week as a
 * hairline list rather than a card per row, her email as one line, and the
 * two actions pinned in the footer where every dialog keeps its way on.
 * Nothing that was shown is dropped -- the request's MUST NOT CHANGE binds
 * the facts, and guardrail 3 binds each status to its word and its icon.
 *
 * TWO PANELS, ONE CARD (requests/2026-09-07-member-dialog-two-tabs.md).
 * Everything above stayed true and got crowded: her week, her address and
 * whether anything will go out are what the card is OPENED for, and the rest
 * of her record -- the days she attends, every address on file, the names the
 * import matches her on -- was only readable by leaving for the Edit form.
 * So the card is tabbed: `This week` is the panel above, unchanged and in the
 * same order, and `Her details` is the record beside it. The strip is PINNED
 * under the title (FormDialog's `subheader`) rather than scrolling with the
 * panel it switches, and the footer belongs to the DIALOG, not to a tab --
 * Reach out is one tap from either side.
 *
 * THE LIVE member, not the fixture. An earlier version of this screen read
 * `MEMBERS[index] ?? MEMBERS[0]` and showed A DIFFERENT PERSON -- the first
 * fixture member -- under the heading of whoever was tapped. useMembers is
 * the same source the list and the follow-up derivation read, so this cannot
 * show a member the list does not have (guardrail 1).
 */
export default function MemberDetail() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id, state: forced } = useLocalSearchParams<{ id: string; state?: string }>();

  const members = useMembers(forced);
  const m = (members.data ?? []).find(x => x.id === id) ?? null;
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  /* WILL AN EMAIL GO, AND HAS ONE GONE
     (requests/2026-09-07-reach-out-already-sent-and-rule-label.md).

     Two reads that this dialog does NOT depend on. The card opens on the
     member alone exactly as it did -- the loading and missing branches below
     are untouched -- and the label is drawn only once the rule has arrived.
     That is the same rule the send draft's already-sent mark carries: it is
     an ADDITION to the screen, never a precondition for it, so a rules read
     that fails costs a label rather than the record.

     The rule is not re-implemented here, and neither is the SELECTION around
     it: `flagged()` is called over a list of one, so this label and the
     weekly list answer to the same function rather than to two copies of one
     expression (CP-011). */
  const week = currentWeek();
  const rules = useRules(forced);
  const already = useSentForPeriod(week, forced);
  /* HER OWN SESSIONS for that week (requests/2026-09-08-her-week-and-the-run.md).
     A fourth read this dialog does not depend on, for the same reason the
     three above it are not preconditions: without it the list below says it
     could not be read, and the record still opens.

     It replaces `sessionsFor(m)`, which returned SIX FIXTURE ROWS -- the same
     six for every member, every course and every week. A Gentle Yoga member
     opened in September was shown three Prenatal Flow absences from August
     under her own live figures, so nothing a reader counted in the list could
     ever reproduce the numbers above it. That is what made *Missed streak 6*
     unreadable rather than merely unexplained. */
  const memberWeek = useMemberWeek(m?.id ?? null, week, forced);
  /* HER COURSE'S RECORD, for the trigger panel alone
     (requests/2026-09-08-follow-up-trigger-on-send-and-reach-out.md). The
     member row carries her course by NAME, and the trigger is written against
     a course ID -- so the list is read to resolve one to the other, the same
     way the send draft resolves her wording. A third read this dialog does not
     depend on: without it the panel is stated read-only rather than the record
     failing to open. */
  const courses = useCourses(forced);
  /* HER COURSE'S RECORD and its stored wording, both resolved BEFORE the early
     returns below, because a hook cannot live under a condition. `m` may still
     be null here -- the list is arriving -- and `useCourseMessage(null)` is a
     resolved null, so nothing is fetched until there is a course to fetch for.
     The wording is read for one reason only: the send made from the prompt
     needs the course's `template_id`, which is the only thing that decides what
     a member reads (guardrail 5). */
  const memberCourse = (courses.data ?? []).find(c => c.name === m?.course) ?? null;
  const message = useCourseMessage(memberCourse?.id ?? null, forced);
  const [warning, setWarning] = useState(false);
  /* The send made from the prompt, once a trigger has been applied. Its own
     state and not the draft's: this dialog now owns a send, and it reports its
     own progress and its own failure rather than navigating somewhere to find
     out. */
  const [sending, setSending] = useState(false);
  const [sendFailure, setSendFailure] = useState<string | null>(null);
  /* The question, asked in front of the send rather than only sitting on the
     card: "on clicking ... reach out show message of follow up triggere of
     that course and ask ... and send communication." */
  const [triggerPrompt, setTriggerPrompt] = useState(false);
  /* Opens on her week, every time. Not remembered between openings: the card
     is opened to decide whether to reach out, and a card that opens on
     whichever panel was last read shows a different thing to the same tap. */
  const [tab, setTab] = useState<MemberTab>('week');

  /* Loading and missing are separate answers and both are given plainly, in
     the same card -- the dialog is the member's from the moment it opens, so
     it does not flash a page and then become one. */
  if (members.state === 'loading') {
    return (
      <FormDialog title="Member" subtitle="Fetching the record" closeTestID="member-close">
        <Skeleton lines={7} />
      </FormDialog>
    );
  }
  if (members.state === 'error' || !m) {
    return (
      <FormDialog title="Member" closeTestID="member-close">
        <ErrorState onRetry={members.retry}
          message={members.error
            ?? 'That member is not on the register. They may have been removed since this link was opened.'} />
      </FormDialog>
    );
  }

  const pct = attendancePct(m);
  /* THE RUN, worded rather than printed bare. `Missed streak 6` sat in the
     strip beside `Missed 1` for a week on a course running five days, so it
     read as a contradiction of the number next to it; and the word the roster
     used for it -- *consecutive* -- named a follow-up trigger the course form
     no longer offers (0030). One derivation for both screens, so the card and
     the roster behind it cannot describe one number two ways
     (src/data/streak.ts). */
  const run = streakReading({ streak: m.streak, lastPresent: m.lastPresent ?? null });
  const tone = attendanceTone(pct);
  const pctColor = tone === null ? theme.muted : ink(tone);
  const mail = hasEmail(m);
  const mailInk = mail ? ink('present') : ink('absent');
  const mailBox = statusSurface(mailInk);

  /* The server's history plus this session's own sends -- the same merge the
     send draft marks its rows from, so the warning here cannot say "never"
     over a send made a minute ago in the other dialog. */
  const sentAt = mergeSent(already.data ?? {}, sentThisSession(week))[m.id];
  const state = rules.data
    ? reachOutState({
        /* `flagged` itself, over a list of one -- not the expression inside
           it copied out. The rule has gained a condition before (`isFollowable`,
           followup.ts) and a second copy of the selection is exactly how this
           label would start disagreeing with the weekly list and the draft
           the next time (guardrail 1, CP-011). */
        ruleMet: flagged([m], rules.data.global, rules.data.byCourseName).length === 1,
        /* The predicate the SEND splits on, not `hasEmail`: the panel above
           asks whether her primary address is filled in, this asks whether a
           message can leave, and they are different questions for a member
           whose primary is blank but who holds a second address. */
        hasEmail: isReachable(m),
        sentAt,
      })
    : null;
  const label = state ? REACH_OUT[state] : null;
  const labelInk = label ? ink(label.tone) : theme.muted;
  const labelBox = statusSurface(labelInk);

  /* Her own send, not the academy's. Reach out opened the draft for EVERY
     course from here, so the button on one member's record listed everybody
     and left her to be found in it -- which is why "sent using reach out"
     and "sending multiple emails at once" could not be told apart. It
     carries her id now and the draft is hers alone. Nothing about HOW it
     sends changes: same dialog, same stored wording, same confirmation. */
  const reachOut = () => router.push({ pathname: '/send', params: { member: m.id } });

  /* THE TRIGGER HER LABEL ABOVE IS ANSWERING TO. Read from the same `rules`
     the label reads, so the two cannot disagree: "Rule is not met" and the
     number that decides it are one fact stated twice, and until now only half
     of it was on screen. */
  const trigger = rules.data ? readTrigger(m.course, rules.data) : null;
  const memberCourseDays = memberCourse
    ? (memberCourse.offerings[0]?.weekdays.length || memberCourse.frequency || null)
    : null;
  /* WHY it cannot be changed from here, when it cannot -- and the two reasons
     are different facts. A list still arriving is a wait; a member whose
     course has no row (renamed, removed, or an ended enrolment, which leaves
     `course` as '—') is judged by the academy-wide rule, and saying "more than
     one course" over either of them would be untrue. */
  const memberCourseNote = courses.state === 'loading'
    ? 'The course is still being read, so the trigger cannot be changed from here yet.'
    : `${m.course === '—' ? 'This member is not on a course' : `${m.course} is not on the course list`}, so their follow-up is judged by the academy-wide trigger above. It is changed on the course form.`;

  /* The order of the two questions: the RULE first, then the duplicate.
     Whether to change the trigger is a decision about who should be written
     to at all; whether she has already had this week's message is a decision
     about her, and it is the last thing said before the draft opens. The
     already-sent warning is untouched -- same words, same guard, same tick. */
  const askReachOut = () => setTriggerPrompt(true);
  const afterTrigger = () => {
    setTriggerPrompt(false);
    if (warnsBeforeReachOut(sentAt)) setWarning(true); else reachOut();
  };

  /* WHO THE APPLIED TRIGGER NOW REACHES
     (requests/2026-09-08-follow-up-trigger-on-send-and-reach-out.md, correction
     of 8 Sep 2026: "As soon as Apply button is clicked ... show the list of
     members with select/deselect option and then enable Send communication").

     Derived HERE, from the same `flagged()` every other screen answers to, over
     the member list this dialog already holds and the rule it already read --
     so the list the prompt shows and the list the weekly screen shows are the
     same function over the same inputs, not a second opinion computed in a
     modal (guardrail 1, CP-011). `useRules` refetches on the Apply, so this
     re-derives against the NEW number without anything being passed down.

     Narrowed to HER COURSE, by the course record and not by name: a course
     created after one of the same name was deleted would otherwise draft to the
     deleted course's members. Where her course cannot be resolved the list is
     her alone, which is what Reach out has always meant. */
  const flaggedNow = rules.data
    ? flagged(members.data ?? [], rules.data.global, rules.data.byCourseName)
    : [];
  const flaggedHere = memberCourse
    ? enrolledIn(flaggedNow, memberCourse)
    : flaggedNow.filter(x => x.id === m.id);
  // Both halves from ONE call, so the prompt cannot claim to reach somebody it
  // will skip. Named while being excluded, never dropped (C-76).
  const split = recipientSplit(flaggedHere);
  const sentAll = mergeSent(already.data ?? {}, sentThisSession(week));
  const promptRecipients: TriggerRecipient[] = split.recipients.map(r => ({
    id: r.id, name: r.name, email: primaryEmail(r), sentAt: sentAll[r.id],
  }));

  /* THE SEND ITSELF, from this dialog rather than from the prompt: the prompt
     renders a decision, and the one API call that puts email in front of a
     person belongs where the router and the session state are. It is the SAME
     call the draft makes -- `sendFollowUps` with the course's stored template
     -- so there is still exactly one send path (guardrail 5), and the result
     screen is reached the same way. */
  const send = async (ids: string[]) => {
    if (!message.data || sending || ids.length === 0) return;
    setSending(true);
    setSendFailure(null);
    try {
      const result = await sendFollowUps({
        member_ids: ids,
        template_id: message.data.template_id,
        period_from: week.from, period_to: week.to,
      });
      // What the send REPORTED as sent, never what it was asked to send.
      recordSent(week, result.results.filter(r => r.status === 'sent').map(r => r.member_id));
      setSendResult(result);
      setTriggerPrompt(false);
      router.replace('/send/result');
    } catch (err) {
      setSendFailure(err instanceof Error ? err.message : 'Nothing has been sent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <FormDialog
      title={m.name}
      subtitle={memberSubtitle(m)}
      closeTestID="member-close"
      subheader={<TabStrip tabs={MEMBER_TABS} value={tab} onChange={setTab}
        testIDPrefix="member-tab" />}
      footer={
        /* The way on, pinned: Reach out is what the record is opened FOR, so
           it is the primary; Edit says its word now rather than being an
           icon with only a spoken label (guardrail 3). */
        <View style={{
          padding: SPACE.lg, borderTopWidth: 1, borderTopColor: theme.line,
          backgroundColor: theme.shell, flexDirection: 'row', gap: SPACE.md,
        }}>
          <Button testID="member-edit" label="Edit" variant="secondary" style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/member/edit', params: { id: m.id } })} />
          <Button testID="member-reach-out" label="Reach out" style={{ flex: 2 }}
            onPress={askReachOut} />
        </View>
      }
      /* The warning renders OUTSIDE the card, the way the send draft's own
         confirmation does: it is a decision about this dialog, not a section
         of the record that scrolls with it (CP-014). */
      overlays={(<>
        {/* Asked FIRST, and only on the press -- the panel below is already on
            the card for anybody reading it, so this is the same question put
            where the decision is taken rather than a second copy of it. */}
        <FollowUpTriggerPrompt
          open={triggerPrompt}
          onClose={() => setTriggerPrompt(false)}
          onContinue={afterTrigger}
          continueLabel="Send communication"
          reading={trigger}
          courseId={memberCourse?.id ?? null}
          daysPerWeek={memberCourseDays}
          readOnlyNote={memberCourseNote}
          /* The list Apply opens, and the send it enables. `listPending` is
             the rules read that Apply set off: until it lands, the list on
             screen is still the old rule's answer and must not be sendable. */
          recipients={promptRecipients}
          excludedNames={split.excluded.map(x => x.name)}
          listPending={rules.state === 'loading'}
          periodLabel={week.label}
          sending={sending}
          failure={sendFailure
            ?? (message.state === 'error'
              ? 'This course’s wording could not be read, so nothing can be sent from here.'
              : null)}
          onSend={ids => { void send(ids); }} />
        <ConfirmDialog
          open={warning}
          onClose={() => setWarning(false)}
          title="Already had this week’s message"
          body={`${m.name.split(' ')[0]} was sent this week’s follow-up${sentAt && sentOn(sentAt) ? ` on ${sentOn(sentAt)}` : ''}.`
            + ' Reaching out again means a second identical email, and it cannot be recalled.'}
          cancelLabel="Not yet"
          confirmLabel="Reach out anyway"
          onConfirm={() => { setWarning(false); reachOut(); }} />
      </>)}>

      {tab === 'week' ? (<>

      {/* HER FIGURES FOR THE WEEK, one strip, under the week they belong to.
          Expected · Attended · Missed side by side, each under its own label,
          and the week's percentage on the strip's own footer line.

          THE RUN IS NO LONGER IN HERE. It sat as a fourth cell called *Missed
          streak*, inside a strip whose other three figures are the week's --
          so a member who missed one session this week and six in a row read
          as "Missed 1 · Missed streak 6", two counts of what looked like the
          same thing, in a box that promised one period. It is its own card
          below, which is where it can say what it counts. Nothing is dropped:
          the request's MUST NOT CHANGE binds the FACTS, and all five are
          still on this panel. */}
      <Label style={{ marginBottom: SPACE.sm }}>{`This week · ${week.label}`}</Label>
      <View accessible
        accessibilityLabel={
          `This week, ${week.label}. ${m.expected} expected, ${m.attended} attended, ` +
          `${m.missed} missed. Attendance this week ${pct === null ? 'no figure' : `${pct} percent`}.`}
        style={{
          borderRadius: RADIUS.md, backgroundColor: theme.surface,
          borderWidth: 1, borderColor: theme.line, overflow: 'hidden',
        }}>
        <View style={{ flexDirection: 'row' }}>
          <Figure label="Expected" value={m.expected} color={theme.fgStrong} />
          <Figure label="Attended" value={m.attended} color={ink('present')} />
          <Figure label="Missed"   value={m.missed}   color={ink('absent')} last />
        </View>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
          paddingVertical: 9, paddingHorizontal: 12,
          borderTopWidth: 1, borderTopColor: theme.line, backgroundColor: theme.surface2,
        }}>
          <Icon name="donut_large" size={15} color={pctColor} />
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: theme.muted }}>Attendance this week</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: pctColor, fontVariant: ['tabular-nums'] }}>
            {pct === null ? '—' : `${pct}%`}
          </Text>
        </View>
      </View>

      {/* THE RUN, out of the week's strip and carrying its own sentence.
          The number is unchanged and is still `member_stats.current_streak`;
          what is added is the two facts that made it checkable -- what it
          counts (sessions, across weeks) and the day it counts back to. The
          word AND the number, never a colour alone (guardrail 3). */}
      <View testID="member-run" accessible
        accessibilityLabel={`${run.label}, ${run.count}. ${run.sentence}`}
        style={{
          marginTop: SPACE.md, borderRadius: RADIUS.md, backgroundColor: theme.surface,
          borderWidth: 1, borderColor: theme.line, overflow: 'hidden',
          flexDirection: 'row', alignItems: 'center',
          paddingVertical: 10, paddingHorizontal: 12, gap: SPACE.md,
        }}>
        <Text style={{
          fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'],
          color: run.count > 0 ? ink('absent') : theme.fgStrong, minWidth: 22,
        }}>{run.count}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Label style={{ fontSize: 9.5, letterSpacing: 0.6 }}>{run.label}</Label>
          {/* not clipped to a line: the part that explains the number is the
              part a phone would cut, and it is the reason the row exists */}
          <Muted style={{ fontSize: 11.5, lineHeight: 16, marginTop: 2 }}>{run.sentence}</Muted>
        </View>
      </View>

      {/* HER WEEK. One list, one hairline between rows -- not a bordered card
          per session. Holidays and cancellations are still LISTED and still
          say why they do not count (C-92); "no sessions" is still its own
          row rather than an empty list of misses. */}
      <Label style={{ marginTop: SPACE.xl, marginBottom: SPACE.sm }}>
        {`Sessions · ${week.label}`}
      </Label>
      {memberWeek.state === 'loading' ? (
        <Skeleton lines={4} />
      ) : memberWeek.state === 'error' || !memberWeek.data ? (
        /* The list alone, never the record. A week that could not be read says
           so where the rows would have been -- it does not take the card down,
           and it does not fall back to somebody else's sessions, which is the
           whole defect this replaced. */
        <ErrorState onRetry={memberWeek.retry}
          message={memberWeek.error ?? 'Sessions for this week could not be read.'} />
      ) : (
      <View testID="member-sessions" style={{
        borderRadius: RADIUS.md, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: theme.line, overflow: 'hidden',
      }}>
        {memberWeek.data.map((s, i) => {
          const t = STATUS[s.status];
          const c = theme.isDark ? t.fgDark : t.fgLight;
          const box = statusSurface(c);
          return (
            <View key={i} accessible
              accessibilityLabel={`${s.date} ${s.time}. ${t.word}. ${s.detail}`}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                paddingVertical: 9, paddingHorizontal: 12,
                borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.line,
              }}>
              <View style={{
                width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
                backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
              }}>
                <Icon name={t.icon} size={15} color={c} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: theme.fgStrong }}>
                  {`${s.date} · ${s.time}`}
                </Text>
                {/* not clipped to a line: on a phone the WHY -- "does not
                    count", "counts for nobody" -- is the part that would be
                    cut off, and it is the part the row exists to say (C-92) */}
                <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 1, lineHeight: 15 }}>{s.detail}</Text>
              </View>
              {/* the word, always -- colour is never the only signal */}
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: c }}>{t.word}</Text>
            </View>
          );
        })}
      </View>
      )}

      {/* HER EMAIL, one line. No usable email is shown and counted as
          excluded from every send, never quietly dropped (C-76). */}
      <View style={{
        marginTop: SPACE.lg, paddingVertical: 10, paddingHorizontal: 12, borderRadius: RADIUS.md,
        backgroundColor: mailBox.bg, borderWidth: 1, borderColor: mailBox.border,
        flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md,
      }}>
        <Icon name={mail ? 'mark_email_read' : 'mail_off'} size={18} color={mailInk} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: mailInk }}>
            {mail ? 'Email on file' : 'No usable email'}
          </Text>
          <Muted style={{ fontSize: 12, lineHeight: 17, marginTop: 2 }}>
            {mail
              ? `${primaryEmail(m)} · verified 4 Aug`
              : 'The member is shown and counted as excluded from every send, never quietly dropped.'}
          </Muted>
          <Muted style={{ fontSize: 12, lineHeight: 17, marginTop: 2 }}>
            {`Last contacted ${m.last === '—' ? 'never' : m.last}`}
          </Muted>
        </View>
      </View>

      {/* WHETHER THE RULE IS MET, AND SO WHETHER ANYTHING GOES OUT. The card
          said what her attendance was and whether she had an address; it
          never said the thing the button under it is FOR. The word carries
          it and the glyph carries it -- colour never alone (guardrail 3) --
          and the tone comes from the measured token pair for the theme that
          is on, never a literal (CP-008).

          Absent while the rule is still arriving, or if it failed to: an
          addition to the record, never a precondition for it. */}
      {label ? (
        <View testID="member-rule-label" accessible accessibilityLabel={label.text}
          style={{
            marginTop: SPACE.md, paddingVertical: 10, paddingHorizontal: 12, borderRadius: RADIUS.md,
            backgroundColor: labelBox.bg, borderWidth: 1, borderColor: labelBox.border,
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
          }}>
          <Icon name={label.icon} size={18} color={labelInk} />
          <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: labelInk }}>
            {label.text}
          </Text>
        </View>
      ) : null}

      {/* WHICH RULE, under the label that says whether it is met. "Rule is not
          met" answers a question the card never stated -- met by WHAT -- and
          the number behind it was two screens away on the course form. It sits
          directly under the label so the two read as one fact, and it is drawn
          only once the rules have arrived, exactly as the label is. */}
      <View style={{ marginTop: SPACE.md }}>
        <FollowUpTriggerPanel testID="member-trigger"
          reading={trigger} courseId={memberCourse?.id ?? null} daysPerWeek={memberCourseDays}
          readOnlyNote={memberCourseNote} />
      </View>

      </>) : <HerDetails m={m} />}
    </FormDialog>
  );
}

/**
 * HER DETAILS -- the record, read-only
 * (requests/2026-09-07-member-dialog-two-tabs.md).
 *
 * Everything here is on the member row already. Nothing is fetched for this
 * panel and nothing is written from it: it is the Edit form's fields, shown
 * to somebody who is about to reach out to her and needs to know WHO she is
 * without leaving the card to find out.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *   - *Last contacted*, which the week panel's email row already carries.
 *   - Her RF- code. It is searchable and never rendered, on purpose (see
 *     Member.code): a code tells the reader nothing she can check, which is
 *     why the subtitle carries her joining month instead.
 *
 * EVERY ROW HAS AN ANSWER when the record is empty. A blank beside "Days she
 * attends" reads as "she attends none"; she attends the days her course runs,
 * and the row says so.
 */
function HerDetails({ m }: { m: Member }) {
  const { theme } = useTheme();
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  // Her status ON TODAY, which since 0045 is not the same as the stored word:
  // a member marked inactive from the 1st of next month is active now, and a
  // pop-up somebody is about to reach out from has to say the true one.
  const status = memberStatusReading(m.status, m.inactiveFrom ?? null, iso(new Date()));
  const statusInk = status.active ? ink('present') : theme.muted;
  const days = memberDayNames(m.weekdays);
  const addresses = addressesInOrder(m.emails);

  return (
    <View testID="member-details" style={{
      borderRadius: RADIUS.md, backgroundColor: theme.surface,
      borderWidth: 1, borderColor: theme.line, overflow: 'hidden',
    }}>
      {/* The word AND the glyph, never the tone alone (guardrail 3) -- and
          the same two words the roster pill behind this card uses, from the
          same reading, so a member cannot be Active in one and not the
          other. */}
      <Detail label="Status">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
          <Icon name={status.icon} size={16} color={statusInk} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: statusInk }}>{status.word}</Text>
        </View>
        <Muted style={{ fontSize: 11.5, lineHeight: 16, marginTop: 2 }}>
          {status.active ? 'In the follow-up rule' : 'Left out of the follow-up rule'}
        </Muted>
        {/* WHEN, when there is a when. The word above is true today and says
            nothing about the date that produced it or the one coming; this
            is that date, and it is only drawn when her record carries one --
            every member marked inactive before 0045 carries none, and a row
            reading "Inactive since —" would invent a day nobody recorded. */}
        {status.note ? (
          <Muted style={{ fontSize: 11.5, lineHeight: 16, marginTop: 2 }}>
            {status.note}
          </Muted>
        ) : null}
      </Detail>

      {/* Course, branch and joining month are on the subtitle too -- as ONE
          clipped line, which on a phone is the line that gets cut. Here they
          are three facts that fit. */}
      <Detail label="Course"><Value text={m.course} /></Detail>
      <Detail label="Branch"><Value text={m.branch} /></Detail>
      {/* "Joined" until 0057. One word for one thing: the Edit form's
          picker, the members report's column and this row all name the
          same day, and the register's other end is "Inactive from" two
          rows down -- so this is the half of the pair that was reading as
          an unrelated fact. The COLUMN is still joined_on. */}
      <Detail label="Active from"><Value text={m.joined === '—' ? 'Not on record' : m.joined}
        faint={m.joined === '—'} /></Detail>

      <Detail label="Days they attend">
        <Value text={days ? days.join(' · ') : 'Follows the course schedule'} faint={!days} />
        {days ? (
          <Muted style={{ fontSize: 11.5, lineHeight: 16, marginTop: 2 }}>
            Custom days, not every day the course runs
          </Muted>
        ) : null}
      </Detail>

      {/* EVERY address, primary first -- the week panel names the one a
          follow-up would leave from; this is what the academy holds. No
          address is a stated fact with its consequence, never a blank
          (C-76). */}
      <Detail label="Email addresses">
        {addresses.length === 0 ? (
          <Value text="None on file — excluded from every send" faint />
        ) : addresses.map(e => (
          <View key={e.address} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            <Text style={{ flex: 1, fontSize: 13, color: theme.fgStrong }}>{e.address}</Text>
            {e.primary ? (
              <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, color: theme.muted }}>
                PRIMARY
              </Text>
            ) : null}
          </View>
        ))}
      </Detail>

      {/* What the Meet import matches her on. Empty is normal, not missing. */}
      <Detail label="Also known as" last>
        <Value text={m.aliases.length ? m.aliases.join(' · ') : 'No other names on record'}
          faint={!m.aliases.length} />
      </Detail>
    </View>
  );
}

/** One fact: its label above it, a hairline under it. Stacked rather than
 *  two columns, because an address is longer than any label column a 560pt
 *  card can spare and wrapping it into a gutter is how it becomes unreadable
 *  on a phone. */
function Detail({ label, children, last }:
  { label: string; children: ReactNode; last?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={{
      paddingVertical: 10, paddingHorizontal: 12,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.line,
    }}>
      <Label style={{ fontSize: 9.5, letterSpacing: 0.6 }}>{label}</Label>
      <View style={{ marginTop: 3 }}>{children}</View>
    </View>
  );
}

/** A stated value, or -- `faint` -- the sentence that stands in for one the
 *  record does not hold. The two are told apart by weight and wording, so
 *  "Not on record" cannot be mistaken for a joining month called that. */
function Value({ text, faint }: { text: string; faint?: boolean }) {
  const { theme } = useTheme();
  return (
    <Text style={{
      fontSize: 13, lineHeight: 18,
      fontWeight: faint ? '500' : '600',
      color: faint ? theme.muted : theme.fgStrong,
    }}>{text}</Text>
  );
}

/** One figure in the strip: its label over its number, a hairline to its right.
 *  The number sits at the cell's FOOT, so on a phone -- where "Missed streak"
 *  takes two lines and the other three labels take one -- the four numbers
 *  still share a baseline. */
function Figure({ label, value, color, last }:
  { label: string; value: number; color: string; last?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={{
      flex: 1, paddingVertical: 10, paddingHorizontal: 10, justifyContent: 'space-between',
      borderRightWidth: last ? 0 : 1, borderRightColor: theme.line,
    }}>
      <Label style={{ fontSize: 9.5, letterSpacing: 0.6 }}>{label}</Label>
      <Text style={{ fontSize: 22, fontWeight: '800', color, marginTop: 3, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}
