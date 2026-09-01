import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Button, Skeleton, EmptyState, ErrorState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useScreenState } from '../../src/data/useScreenState';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../../src/theme/tokens';
import {
  MEMBERS, BRANCHES, COURSES, GLOBAL_RULE, isEligible, hasEmail, primaryEmail,
  AVATAR_TINTS, initials, type Member,
} from '../../src/data/mock';

type Filter = 'all' | 'nomail' | 'follow' | 'coimbatore';

export default function Members() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();
  const [state, retry] = useScreenState(forced);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MEMBERS.filter(m => {
      // the search covers everything the placeholder promises, including the
      // Meet aliases -- that is how a name from a CSV gets found at all
      const matches = !q || [
        m.name, m.code, primaryEmail(m), ...m.aliases,
      ].some(v => v.toLowerCase().includes(q));
      const passes =
        filter === 'all' ? true
        : filter === 'nomail' ? !hasEmail(m)
        : filter === 'follow' ? isEligible(m, GLOBAL_RULE)
        : m.branch === 'Coimbatore';
      return matches && passes;
    });
  }, [query, filter]);

  const chips: { key: Filter; label: string; icon: string }[] = [
    { key: 'all',        label: 'All',             icon: 'group' },
    { key: 'nomail',     label: 'No email',        icon: 'mail_off' },
    { key: 'follow',     label: 'Needs follow-up', icon: 'favorite' },
    { key: 'coimbatore', label: 'Coimbatore',      icon: 'apartment' },
  ];

  const branches = BRANCHES.length - 1;
  const courses = COURSES.length - 1;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
        <Muted style={{ flex: 1 }}>
          {`${MEMBERS.length} members · ${branches} branches · ${courses} courses`}
        </Muted>
        <Button label="Add" onPress={() => router.push('/member/edit')} />
      </View>

      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.md,
        height: 46, borderRadius: RADIUS.md, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: theme.lineStrong, paddingHorizontal: 13,
      }}>
        <Icon name="search" size={19} color={theme.muted} />
        <TextInput
          value={query} onChangeText={setQuery}
          placeholder="Name, member ID, email or Meet alias"
          placeholderTextColor={theme.muted}
          accessibilityLabel="Search members"
          style={{ flex: 1, color: theme.fgStrong, fontSize: 13.5, fontWeight: '600' }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACE.sm, paddingVertical: SPACE.md }}>
        {chips.map(c => {
          const on = filter === c.key;
          return (
            <Pressable key={c.key} onPress={() => setFilter(c.key)}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{
                minHeight: TAP_MIN, flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 12, borderRadius: RADIUS.pill,
                backgroundColor: on ? theme.accent : theme.surface,
                borderWidth: 1, borderColor: on ? theme.accent : theme.lineStrong,
              }}>
              <Icon name={c.icon} size={15} color={on ? theme.onAccent : theme.fg} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: on ? theme.onAccent : theme.fg }}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {state === 'loading' && <Skeleton lines={4} />}

      {state === 'error' && (
        <ErrorState onRetry={retry} message="The member list could not be loaded. Nothing has been changed." />
      )}

      {state === 'ready' && MEMBERS.length === 0 && (
        // no members yet is NOT the same as no search results
        <EmptyState
          title="No members yet"
          body="Add your first member, or import a member list. Attendance starts counting from the first session after she joins."
          action="Add a member" onAction={() => router.push('/member/edit')} />
      )}

      {state === 'ready' && MEMBERS.length > 0 && list.length === 0 && (
        <EmptyState
          title="Nothing matches"
          body="No member matches that search and filter. Clear one of them to widen the list." />
      )}

      {state === 'ready' && list.length > 0 && (
        <View style={{ gap: 10 }}>
          {list.map((m, i) => (
            <MemberCard key={m.id} member={m} index={i}
              onOpen={() => router.push(`/member/${m.id}`)}
              onEdit={() => router.push({ pathname: '/member/edit', params: { id: m.id } })}
              onRemove={() => flash(`Removing ${m.name.split(' ')[0]} needs a confirmation`, 'warn')} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function MemberCard({ member, index, onOpen, onEdit, onRemove }:
  { member: Member; index: number; onOpen: () => void; onEdit: () => void; onRemove: () => void }) {
  const { theme } = useTheme();
  const noMail = !hasEmail(member);
  const ink = noMail
    ? (theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight)
    : (theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight);
  const box = statusSurface(ink);
  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;

  return (
    <View style={{
      padding: 14, borderRadius: RADIUS.lg, backgroundColor: theme.surface,
      borderWidth: 1, borderColor: theme.line,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <View style={{
          width: 42, height: 42, borderRadius: 21,
          backgroundColor: AVATAR_TINTS[index % AVATAR_TINTS.length],
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>{initials(member.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: theme.fgStrong }}>{member.name}</Text>
          <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>
            {`${member.course} · ${member.branch}`}
          </Text>
        </View>
        <IconButton icon="edit" label={`Edit ${member.name}`} tint={theme.accentInk} onPress={onEdit} />
        <IconButton icon="delete" label={`Remove ${member.name}`} tint={dangerInk} onPress={onRemove} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: 11 }}>
        {/* C-76: the pill says the WORD, so "no email" is never inferred from
            a colour or a struck-through icon alone */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 5,
          paddingVertical: 5, paddingHorizontal: 9, borderRadius: RADIUS.pill,
          backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
        }}>
          <Icon name={noMail ? 'mail_off' : 'mark_email_read'} size={14} color={ink} />
          <Text style={{ fontSize: 10.5, fontWeight: '800', color: ink }}>
            {noMail ? 'NO EMAIL' : 'EMAIL OK'}
          </Text>
        </View>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 11.5, color: theme.muted, fontVariant: ['tabular-nums'] }}>
          {noMail ? member.code : `${member.code} · ${primaryEmail(member)}`}
        </Text>
        <Pressable onPress={onOpen} accessibilityRole="button"
          accessibilityLabel={`Attendance for ${member.name}`}>
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>Attendance</Text>
        </Pressable>
      </View>
    </View>
  );
}

function IconButton({ icon, label, tint, onPress }:
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
