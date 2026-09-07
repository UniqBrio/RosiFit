import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMembers, useRules, useSentForPeriod } from '../../src/data/hooks';
import { FormDialog } from '../../src/components/FormDialog';
import { ConfirmDialog } from '../../src/components/Sheet';
import { Muted, Label, Button, Skeleton, ErrorState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, STATUS, statusSurface } from '../../src/theme/tokens';
import { memberSubtitle, attendanceTone } from '../../src/components/memberDialog';
import { sessionsFor, attendancePct, primaryEmail, hasEmail } from '../../src/data/mock';
import { flagged, isReachable } from '../../src/data/followup';
import { currentWeek } from '../../src/data/period';
import { mergeSent, sentThisSession, sentOn } from '../../src/data/sent';
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
  const [warning, setWarning] = useState(false);

  /* Loading and missing are separate answers and both are given plainly, in
     the same card -- the dialog is the member's from the moment it opens, so
     it does not flash a page and then become one. */
  if (members.state === 'loading') {
    return (
      <FormDialog title="Member" subtitle="Fetching her record" closeTestID="member-close">
        <Skeleton lines={7} />
      </FormDialog>
    );
  }
  if (members.state === 'error' || !m) {
    return (
      <FormDialog title="Member" closeTestID="member-close">
        <ErrorState onRetry={members.retry}
          message={members.error
            ?? 'That member is not on the register. She may have been removed since this link was opened.'} />
      </FormDialog>
    );
  }

  const pct = attendancePct(m);
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

  return (
    <FormDialog
      title={m.name}
      subtitle={memberSubtitle(m)}
      closeTestID="member-close"
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
            onPress={() => (warnsBeforeReachOut(sentAt) ? setWarning(true) : reachOut())} />
        </View>
      }
      /* The warning renders OUTSIDE the card, the way the send draft's own
         confirmation does: it is a decision about this dialog, not a section
         of the record that scrolls with it (CP-014). */
      overlays={(
        <ConfirmDialog
          open={warning}
          onClose={() => setWarning(false)}
          title="She has already had this week’s message"
          body={`${m.name.split(' ')[0]} was sent this week’s follow-up${sentAt && sentOn(sentAt) ? ` on ${sentOn(sentAt)}` : ''}.`
            + ' Reaching out again means a second identical email, and it cannot be recalled.'}
          cancelLabel="Not yet"
          confirmLabel="Reach out anyway"
          onConfirm={() => { setWarning(false); reachOut(); }} />
      )}>

      {/* HER FIGURES, one strip. Expected · Attended · Missed · Streak side
          by side, each under its own label -- streak and missed are
          DIFFERENT numbers and are named so neither can be read as the other
          -- and the week's percentage on the strip's own footer line. */}
      <View accessible
        accessibilityLabel={
          `${m.expected} expected, ${m.attended} attended, ${m.missed} missed, ` +
          `current missed streak ${m.streak}. Attendance this week ${pct === null ? 'no figure' : `${pct} percent`}.`}
        style={{
          borderRadius: RADIUS.md, backgroundColor: theme.surface,
          borderWidth: 1, borderColor: theme.line, overflow: 'hidden',
        }}>
        <View style={{ flexDirection: 'row' }}>
          <Figure label="Expected" value={m.expected} color={theme.fgStrong} />
          <Figure label="Attended" value={m.attended} color={ink('present')} />
          <Figure label="Missed"   value={m.missed}   color={ink('absent')} />
          <Figure label="Missed streak" value={m.streak} color={theme.fgStrong} last />
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

      {/* HER WEEK. One list, one hairline between rows -- not a bordered card
          per session. Holidays and cancellations are still LISTED and still
          say why they do not count (C-92); "no sessions" is still its own
          row rather than an empty list of misses. */}
      <Label style={{ marginTop: SPACE.xl, marginBottom: SPACE.sm }}>Her sessions this week</Label>
      <View style={{
        borderRadius: RADIUS.md, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: theme.line, overflow: 'hidden',
      }}>
        {sessionsFor(m).map((s, i) => {
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
              : 'She is shown and counted as excluded from every send, never quietly dropped.'}
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
    </FormDialog>
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
