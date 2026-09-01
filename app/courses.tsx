import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Button, Skeleton, EmptyState, ErrorState } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../src/theme/tokens';
import { DAY_NAMES, ruleSentence, AVATAR_TINTS, initials } from '../src/data/mock';
import { useCourses, useFollowUp } from '../src/data/hooks';

/** '06:00' -> '6:00 AM', for reading out a course's default time */
const ampm = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export default function Courses() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();
  const courses = useCourses(forced);
  const followUp = useFollowUp(forced);
  const [query, setQuery] = useState('');

  const all = courses.data ?? [];
  const members = followUp.data?.members ?? [];
  const rules = followUp.data?.rules;
  const list = all.filter(c =>
    !query.trim() || c.name.toLowerCase().includes(query.trim().toLowerCase()));
  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;

  if (courses.state === 'loading') return <Screen><Skeleton lines={4} /></Screen>;
  if (courses.state === 'error') {
    return (
      <Screen>
        <ErrorState onRetry={courses.retry}
          message={courses.error ?? 'The courses could not be loaded. Nothing has been changed.'} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
        <Muted style={{ flex: 1 }}>
          {`${all.length} courses · ${all.reduce((n, c) => n + c.offerings.length, 0)} offerings`}
        </Muted>
        <Button label="Add" onPress={() => router.push('/course/edit')} />
      </View>

      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.md,
        height: 46, borderRadius: RADIUS.md, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: theme.lineStrong, paddingHorizontal: 13,
      }}>
        <Icon name="search" size={19} color={theme.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search courses"
          placeholderTextColor={theme.muted} accessibilityLabel="Search courses"
          style={{ flex: 1, color: theme.fgStrong, fontSize: 13.5, fontWeight: '600' }} />
      </View>

      {all.length === 0 && (
        <EmptyState
          title="No courses yet"
          body="A course says what is taught. Adding it at a branch creates the offering that actually runs, and the offering's weekdays are what attendance is counted from."
          action="Add a course" onAction={() => router.push('/course/edit')} />
      )}

      {all.length > 0 && list.length === 0 && (
        <EmptyState title="Nothing matches" body="No course matches that search. Clear it to see them all." />
      )}

      <View style={{ gap: SPACE.md, marginTop: SPACE.lg }}>
        {list.map((c, i) => {
          const enrolled = members.filter(m => m.course === c.name).length;
          const rule = rules?.byCourseName[c.name];
          const offerings = c.offerings.length
            ? c.offerings.map(o =>
                `${o.branch} ${o.weekdays.map(d => DAY_NAMES[d]).join(' ')}`).join(' · ')
            : 'No offering yet — so no schedule';
          return (
            <View key={c.id} style={{
              padding: SPACE.lg, borderRadius: RADIUS.lg, backgroundColor: theme.surface,
              borderWidth: 1, borderColor: theme.line,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
                <View style={{
                  width: 42, height: 42, borderRadius: 13,
                  backgroundColor: AVATAR_TINTS[(i + 1) % AVATAR_TINTS.length],
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>{initials(c.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: theme.fgStrong }}>{c.name}</Text>
                  <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                    {`${enrolled} member${enrolled === 1 ? '' : 's'} · `}
                    {c.start_time ? `${ampm(c.start_time)}–${ampm(c.end_time!)} · ` : 'no default time · '}
                    {/* "intended", because frequency is stated intent and is
                        never what attendance is counted against */}
                    {`${c.frequency}/week intended`}
                  </Text>
                </View>
                <RowIcon icon="edit" label={`Edit ${c.name}`} tint={theme.accentInk}
                  onPress={() => router.push({ pathname: '/course/edit', params: { id: c.id } })} />
                <RowIcon icon="delete" label={`Remove ${c.name}`} tint={dangerInk}
                  onPress={() => flash(`Removing ${c.name} needs a confirmation`, 'warn')} />
              </View>

              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.md,
                paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: theme.line,
              }}>
                <Text numberOfLines={2} style={{ flex: 1, fontSize: 11.5, color: theme.muted, lineHeight: 16 }}>
                  {offerings}
                </Text>
                <Pressable onPress={() => router.push('/(tabs)/members')} accessibilityRole="button"
                  accessibilityLabel={`Members of ${c.name}`}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>Members</Text>
                </Pressable>
              </View>

              <Muted style={{ marginTop: SPACE.sm }}>
                {rule ? ruleSentence(rule, c.name)
                  : rules ? ruleSentence(rules.global, c.name) : ''}
                {rule ? '' : ' (academy default)'}
              </Muted>
              <Pressable onPress={() => router.push({ pathname: '/course/rules', params: { id: c.id } })}
                accessibilityRole="button" accessibilityLabel={`Follow-up rules for ${c.name}`}
                style={{ marginTop: 6, minHeight: TAP_MIN / 2 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>Follow-up rules</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={{
        marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
        flexDirection: 'row', gap: SPACE.md,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <Icon name="info" size={18} color={theme.accentInk} />
        {/* C-56: the model, stated where it is used */}
        <Muted style={{ flex: 1 }}>
          A course carries no schedule. Days and times live on its offerings — the same course runs
          different days at different branches.
        </Muted>
      </View>
    </Screen>
  );
}

function RowIcon({ icon, label, tint, onPress }:
  { icon: string; label: string; tint: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.control, borderWidth: 1, borderColor: theme.line,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={18} color={tint} />
    </Pressable>
  );
}
