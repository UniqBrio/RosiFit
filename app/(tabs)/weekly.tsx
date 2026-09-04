import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Label, Button, Skeleton, EmptyState, ErrorState } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/AppShell';
import { safeBackTarget } from '../../src/data/nav';
import { Icon } from '../../src/components/Icon';
import { MemberRow } from '../../src/components/MemberRow';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN } from '../../src/theme/tokens';
import { ruleSentence, hasEmail } from '../../src/data/mock';
import { useFollowUp } from '../../src/data/hooks';
import { currentWeek } from '../../src/data/period';

type Filter = 'follow' | 'all' | 'nomail';

export default function Weekly() {
  const { theme } = useTheme();
  const router = useRouter();
  const { state: forced, from } = useLocalSearchParams<{ state?: string; from?: string }>();
  // Where back goes. These three sit INSIDE the tab group -- the canvas keeps
  // the academy header and the nav pill on them -- so router.back() pops to
  // the first tab rather than to the screen that opened this one. The caller
  // names its origin instead; `from` is a URL parameter, so it is validated
  // (src/data/nav.ts) rather than navigated to on trust.
  const backTo = safeBackTarget(from, '/courses');
  const week = currentWeek();
  const { state, data, error, retry } = useFollowUp(forced, week);
  const [filter, setFilter] = useState<Filter>('follow');

  // Members, the rule and the flagged set from ONE load: the chip counts and
  // the list underneath cannot be a query apart and disagree.
  const members = data?.members ?? [];
  const rules = data?.rules;
  const flagged = data?.flagged ?? [];
  const noMail = members.filter(m => !hasEmail(m));
  const rows = filter === 'follow' ? flagged : filter === 'nomail' ? noMail : members;

  const chips: { key: Filter; label: string }[] = [
    { key: 'follow', label: `Needs follow-up · ${flagged.length}` },
    { key: 'all',    label: `All ${members.length}` },
    { key: 'nomail', label: `No email · ${noMail.length}` },
  ];

  return (
    <Screen>
      <ScreenHeader title="Weekly review"
        subtitle={`${week.label} · ${members.length} members`}
        onBack={() => router.navigate(backTo)} />

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
        <Muted style={{ flex: 1 }}>
          {rules ? ruleSentence(rules.global, 'every course') : ''}
        </Muted>
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
                body={`Every member met her course's rule for ${week.label}. Nothing to do this week.`} />
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
