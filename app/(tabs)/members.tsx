import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Button, Skeleton, EmptyState, ErrorState } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/AppShell';
import { safeBackTarget } from '../../src/data/nav';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../../src/theme/tokens';
import {
  isEligible, hasEmail, primaryEmail, AVATAR_TINTS, initials, type Member,
} from '../../src/data/mock';
import { useFollowUp, useFilterOptions } from '../../src/data/hooks';
import { rosterScope } from '../../src/data/course';

type Filter = 'all' | 'nomail' | 'follow' | 'coimbatore';

export default function Members() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { state: forced, from, courseId, courseName } = useLocalSearchParams<
    { state?: string; from?: string; courseId?: string; courseName?: string }>();
  // Where back goes. These three sit INSIDE the tab group -- the canvas keeps
  // the academy header and the nav pill on them -- so router.back() pops to
  // the first tab rather than to the screen that opened this one. The caller
  // names its origin instead; `from` is a URL parameter, so it is validated
  // (src/data/nav.ts) rather than navigated to on trust.
  const backTo = safeBackTarget(from, '/courses');
  // ONE fetch for the members AND the rule, so "needs follow-up" here is the
  // same derivation the dashboard and the send flow use -- not a second list.
  const { state, data, error, retry } = useFollowUp(forced);
  const filters = useFilterOptions(forced);
  /**
   * The roster of ONE course, when the chevron on a course card opened this.
   *
   * Scoped by NAME rather than by id, because that is the only key the member
   * rows carry -- Member.course is the course's name, and the follow-up
   * derivation joins on it (guardrail 1: one member source). courseId still
   * travels so "Add" enrols into the right course rather than asking again.
   *
   * Resolved against the academy's OWN course list rather than trusted: the
   * name arrives in a URL, and this screen speaks it as a heading. See
   * rosterScope in src/data/course.ts for what that would otherwise let a
   * link put in the app's mouth.
   */
  // slice(1): the option list is headed by the "All courses" sentinel, and a
  // link asking for a course by that name would otherwise resolve to it --
  // an empty roster under a heading naming a course nobody teaches.
  const scopedTo = rosterScope((filters.data?.courses ?? []).slice(1), courseName);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const members = useMemo(() => data?.members ?? [], [data]);
  const rules = data?.rules;

  /** Everyone in the course, before the search box and the chips narrow it --
   *  so the subtitle counts the roster, not the current filter. */
  const scoped = useMemo(
    () => (scopedTo ? members.filter(m => m.course === scopedTo) : members),
    [members, scopedTo]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(m => {
      // the search covers everything the placeholder promises, including the
      // Meet aliases -- that is how a name from a CSV gets found at all
      const matches = !q || [
        // The code stays SEARCHABLE but is no longer advertised: anybody
        // holding one from an export can still find her, and nobody is
        // promised a field the app does not show.
        m.name, m.code, primaryEmail(m), ...m.aliases,
      ].some(v => v.toLowerCase().includes(q));
      // The scope is an AND, applied before the chips: inside one course,
      // "No email" means that course's members with no email, not the
      // academy's. A chip that quietly widened back to everyone would be a
      // list claiming to be a roster and showing strangers.
      const inScope = !scopedTo || m.course === scopedTo;
      const passes =
        filter === 'all' ? true
        : filter === 'nomail' ? !hasEmail(m)
        : filter === 'follow'
          ? (rules ? isEligible(m, rules.byCourseName[m.course] ?? rules.global) : false)
        : m.branch === 'Coimbatore';
      return inScope && matches && passes;
    });
  }, [query, filter, members, rules, scopedTo]);

  const chips: { key: Filter; label: string; icon: string }[] = [
    { key: 'all',        label: 'All',             icon: 'group' },
    { key: 'nomail',     label: 'No email',        icon: 'mail_off' },
    { key: 'follow',     label: 'Needs follow-up', icon: 'favorite' },
    { key: 'coimbatore', label: 'Coimbatore',      icon: 'apartment' },
  ];

  // "All branches"/"All courses" head each list, so the real count is one less
  const branches = Math.max(0, (filters.data?.branches.length ?? 1) - 1);
  const courses = Math.max(0, (filters.data?.courses.length ?? 1) - 1);

  return (
    <Screen>
      <ScreenHeader title={scopedTo ?? 'Members'}
        subtitle={scopedTo
          ? `${scoped.length} ${scoped.length === 1 ? 'member' : 'members'} in this course`
          : `${members.length} members · ${branches} branches · ${courses} courses`}
        onBack={() => router.navigate(backTo)}
        right={<Button label="Add" onPress={() => router.push(scopedTo && courseId
          ? { pathname: '/member/edit', params: { courseId } }
          : { pathname: '/member/edit' })} />} />

      {/* A filtered list that does not say it is filtered is a list that has
          silently lost rows -- so the narrowing is stated AND escapable, the
          same rule the scoped upload follows. */}
      {scopedTo ? (
        <Pressable testID="members-show-all" onPress={() => router.replace('/members?from=/courses')}
          accessibilityRole="button" accessibilityLabel="Show every member in the academy"
          style={({ pressed }) => ({
            alignSelf: 'flex-start', marginTop: SPACE.sm,
            minHeight: 34, paddingHorizontal: 12, borderRadius: RADIUS.sm,
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name="group" size={15} color={theme.accentInk} />
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.fg }}>
            Show every member
          </Text>
        </Pressable>
      ) : null}

      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.md,
        height: 46, borderRadius: RADIUS.md, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: theme.lineStrong, paddingHorizontal: 13,
      }}>
        <Icon name="search" size={19} color={theme.muted} />
        <TextInput
          value={query} onChangeText={setQuery}
          placeholder="Name, email or Meet alias"
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
        <ErrorState onRetry={retry}
          message={error ?? 'The member list could not be loaded. Nothing has been changed.'} />
      )}

      {state === 'ready' && members.length === 0 && (
        // no members yet is NOT the same as no search results
        <EmptyState
          title="No members yet"
          body="Add your first member, or import a member list. Attendance starts counting from the first session after she joins."
          action="Add a member" onAction={() => router.push('/member/edit')} />
      )}

      {/* An empty COURSE is not an empty search. "Clear one of them to widen
          the list" points at a search box that is not the reason, and leaves
          the person clearing filters that were never set. */}
      {state === 'ready' && members.length > 0 && scoped.length === 0 && scopedTo && (
        <EmptyState
          title={`Nobody is enrolled in ${scopedTo}`}
          body="Add her here and she is enrolled at this course's branch. Attendance starts counting from the first session after she joins."
          action="Add a member"
          onAction={() => router.push(courseId
            ? { pathname: '/member/edit', params: { courseId } }
            : { pathname: '/member/edit' })} />
      )}

      {state === 'ready' && scoped.length > 0 && list.length === 0 && (
        <EmptyState
          title="Nothing matches"
          body={scopedTo
            ? `No member of ${scopedTo} matches that search and filter. Clear one of them to widen the list.`
            : 'No member matches that search and filter. Clear one of them to widen the list.'} />
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
          {/* The member CODE is not shown. It is an internal identifier: it
              tells nobody which member this is, and it was the entire line
              for anyone with no address. Her course and branch already sit
              above; what belongs here is how she can be reached, or that she
              cannot be. */}
          {noMail ? 'No address on file' : primaryEmail(member)}
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
