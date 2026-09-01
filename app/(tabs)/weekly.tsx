import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Label, Button, Skeleton, EmptyState, ErrorState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { MemberRow } from '../../src/components/MemberRow';
import { useScreenState } from '../../src/data/useScreenState';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN } from '../../src/theme/tokens';
import {
  MEMBERS, WEEK, GLOBAL_RULE, ruleSentence, flaggedMembers, hasEmail,
} from '../../src/data/mock';

type Filter = 'follow' | 'all' | 'nomail';

export default function Weekly() {
  const { theme } = useTheme();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();
  const [state, retry] = useScreenState(forced);
  const [filter, setFilter] = useState<Filter>('follow');

  const flagged = flaggedMembers(GLOBAL_RULE);
  const noMail = MEMBERS.filter(m => !hasEmail(m));
  const rows = filter === 'follow' ? flagged : filter === 'nomail' ? noMail : MEMBERS;

  const chips: { key: Filter; label: string }[] = [
    { key: 'follow', label: `Needs follow-up · ${flagged.length}` },
    { key: 'all',    label: `All ${MEMBERS.length}` },
    { key: 'nomail', label: `No email · ${noMail.length}` },
  ];

  return (
    <Screen>
      <Muted>{`${WEEK.label} · ${MEMBERS.length} members`}</Muted>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACE.sm, paddingVertical: SPACE.md }}>
        {chips.map(c => {
          const on = filter === c.key;
          return (
            <Pressable key={c.key} onPress={() => setFilter(c.key)}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{
                minHeight: TAP_MIN, justifyContent: 'center',
                paddingHorizontal: 13, borderRadius: RADIUS.pill,
                backgroundColor: on ? theme.accent : theme.surface,
                borderWidth: 1, borderColor: on ? theme.accent : theme.lineStrong,
              }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: on ? theme.onAccent : theme.fg }}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* the rule is stated above the list it produced */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: SPACE.md }}>
        <Icon name="rule" size={15} color={theme.accentInk} />
        <Muted style={{ flex: 1 }}>{ruleSentence(GLOBAL_RULE, 'every course')}</Muted>
      </View>

      {state === 'loading' && <Skeleton lines={4} />}

      {state === 'error' && (
        <ErrorState onRetry={retry}
          message="The attendance figures for this week could not be loaded. No email has been prepared and nobody has been contacted." />
      )}

      {state === 'ready' && (
        <>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
            paddingVertical: 9, paddingHorizontal: SPACE.md,
            backgroundColor: theme.surface2, borderRadius: RADIUS.sm, marginBottom: SPACE.md,
          }}>
            <Label style={{ flex: 1 }}>Member</Label>
            <View style={{ flexDirection: 'row', width: 62, justifyContent: 'space-between' }}>
              <Label style={{ width: 18, textAlign: 'center' }}>E</Label>
              <Label style={{ width: 18, textAlign: 'center' }}>A</Label>
              <Label style={{ width: 18, textAlign: 'center' }}>M</Label>
            </View>
            <Label style={{ width: 40, textAlign: 'right' }}>Att %</Label>
          </View>

          {rows.length === 0 ? (
            // "nobody qualifies" is GOOD NEWS and must not read like a failure
            filter === 'follow' ? (
              <EmptyState
                title="Nobody needs following up"
                body={`Every member met her course's rule for ${WEEK.label}. Nothing to do this week.`} />
            ) : (
              <EmptyState
                title="Nothing matches this filter"
                body="Every member has an email address on file." />
            )
          ) : (
            <View style={{ gap: 10 }}>
              {rows.map((m, i) => (
                <MemberRow key={m.id} member={m} index={i}
                  onPress={() => router.push(`/member/${m.id}`)} />
              ))}
            </View>
          )}

          <Muted style={{ textAlign: 'center', paddingVertical: SPACE.lg }}>
            “Streak” is her current run of missed sessions. “Miss” is the week’s total.
            They are different numbers.
          </Muted>

          {flagged.length > 0 && (
            <Button label={`Reach out to ${flagged.filter(hasEmail).length} members`}
              onPress={() => router.push('/send')} />
          )}
        </>
      )}
    </Screen>
  );
}
