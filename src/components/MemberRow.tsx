import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE, STATUS, statusSurface } from '../theme/tokens';
import { Icon } from './Icon';
import {
  attendancePct, isEligible, reasonFor, primaryEmail, hasEmail,
  AVATAR_TINTS, initials, GLOBAL_RULE, type Member, type FollowUpRule,
} from '../data/mock';

/**
 * The weekly-review row. Everything on it is derived from the member and the
 * saved rule -- there is no second list and no stored "is flagged" flag, so
 * this row and the dashboard count cannot disagree.
 */
export function MemberRow({ member, index, onPress, rule = GLOBAL_RULE }:
  { member: Member; index: number; onPress: () => void; rule?: FollowUpRule }) {
  const { theme } = useTheme();
  const ink = (k: keyof typeof STATUS) =>
    theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  const pct = attendancePct(member);
  const flagged = isEligible(member, rule);
  const noMail = !hasEmail(member);

  // Four different situations, four different sentences. Collapsing them
  // would tell an academy that a member with nothing scheduled is doing
  // badly, which is the failure this avoids.
  const note =
    member.expected === 0
      ? { text: 'No sessions scheduled this week', color: theme.dim, icon: 'event_busy' }
      : flagged
      ? { text: reasonFor(member, rule), color: theme.accentInk, icon: 'favorite' }
      : noMail
      ? { text: 'Below the rule · no email on file', color: ink('absent'), icon: 'mail_off' }
      : { text: 'Below the follow-up rule', color: theme.dim, icon: 'check_circle' };

  const pctColor = pct === null ? theme.muted
    : pct >= 70 ? ink('present') : pct >= 40 ? ink('awaiting') : ink('absent');

  const noteBox = statusSurface(note.color);

  return (
    <Pressable onPress={onPress}
      accessibilityRole="button"
      // one sentence a screen reader can act on, rather than nine loose numbers
      accessibilityLabel={
        `${member.name}, ${member.course}, ${member.branch}. ` +
        `${member.expected} expected, ${member.attended} attended, ${member.missed} missed, ` +
        `${pct === null ? 'no attendance figure' : `${pct} percent`}. ` +
        `${note.text}. Current streak ${member.streak}. ` +
        `${noMail ? 'No email on file.' : `Email ${primaryEmail(member)}.`}`}
      style={({ pressed }) => ({
        borderRadius: RADIUS.lg, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: flagged ? theme.accent : theme.line,
        overflow: 'hidden', opacity: pressed ? 0.8 : 1,
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: 13 }}>
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: AVATAR_TINTS[index % AVATAR_TINTS.length],
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>{initials(member.name)}</Text>
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 14.5, fontWeight: '700', color: theme.fgStrong }}>
              {member.name}
            </Text>
            <Icon name={noMail ? 'mail_off' : 'mail'} size={15}
              color={noMail ? ink('absent') : theme.dim} />
          </View>
          <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.muted }}>
            {`${member.course} · ${member.branch}`}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', width: 62, justifyContent: 'space-between' }}>
          <Num value={member.expected} color={theme.fg} />
          <Num value={member.attended} color={ink('present')} />
          <Num value={member.missed} color={member.missed === 0 ? theme.muted : ink('absent')} />
        </View>

        <Text style={{
          width: 40, textAlign: 'right', fontSize: 17, fontWeight: '800',
          color: pctColor, fontVariant: ['tabular-nums'],
        }}>{pct === null ? '—' : `${pct}%`}</Text>
      </View>

      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
        paddingVertical: 9, paddingHorizontal: 14,
        backgroundColor: noteBox.bg, borderTopWidth: 1, borderTopColor: theme.line,
      }}>
        <Icon name={note.icon} size={15} color={note.color} />
        <Text style={{ flex: 1, fontSize: 11.5, color: note.color, lineHeight: 16 }}>{note.text}</Text>
        {/* "Streak" and "Missed" are different numbers and are labelled as
            such -- the footnote under the list says so too */}
        <Text style={{
          fontSize: 11, fontWeight: '700', color: theme.muted,
          backgroundColor: theme.shell, borderWidth: 1, borderColor: theme.line,
          borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8,
          fontVariant: ['tabular-nums'],
        }}>{`Streak ${member.streak}`}</Text>
      </View>
    </Pressable>
  );
}

const Num = ({ value, color }: { value: number; color: string }) => (
  <Text style={{
    width: 18, textAlign: 'center', fontSize: 14, fontWeight: '700',
    color, fontVariant: ['tabular-nums'],
  }}>{value}</Text>
);
