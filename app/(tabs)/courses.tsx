import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Button, Skeleton, EmptyState, ErrorState } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/AppShell';
import { Icon } from '../../src/components/Icon';
import { DropdownRow, DropdownField, DropdownPanel, DropdownList } from '../../src/components/Dropdown';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../../src/theme/tokens';
import { DAY_NAMES, ruleSentence, AVATAR_TINTS, initials } from '../../src/data/mock';
import { useCourses, useFollowUp } from '../../src/data/hooks';
import { useIdentity } from '../../src/data/session';
import { ALL_BRANCHES } from '../../src/state/academy';
import { ConfirmDialog } from '../../src/components/Sheet';
import { deleteCourse, dataSource } from '../../src/data/repository';
import type { Course } from '../../src/data/mock';

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
  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null);
  const [branch, setBranch] = useState<string>(ALL_BRANCHES);
  const [branchOpen, setBranchOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { identity } = useIdentity();

  const enrolledIn = (name: string) => (followUp.data?.members ?? []).filter(m => m.course === name).length;

  /**
   * The canvas' DELETE COURSE CONFIRM, behind a real deletion. The row's
   * delete used to answer `flash('Removing X needs a confirmation')` -- which
   * was accurate and was the whole implementation.
   */
  const remove = async (course: Course) => {
    setConfirmDelete(null);
    setDeleting(true);
    try {
      const result = await deleteCourse(course.id);
      flash(result.alreadyDeleted
        ? `${course.name} was already deleted`
        : dataSource === 'live'
        ? `${course.name} deleted, ${result.sessionsKept} completed ${result.sessionsKept === 1 ? 'session' : 'sessions'} kept`
        : `${course.name} deleted on this device only. The academy database is not configured.`,
        result.alreadyDeleted || dataSource !== 'live' ? 'warn' : 'ok');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'The course could not be deleted. Nothing has been changed.', 'warn');
    } finally {
      setDeleting(false);
    }
  };

  const all = courses.data ?? [];
  const members = followUp.data?.members ?? [];
  const rules = followUp.data?.rules;
  // Only branches this academy actually runs a course at. The list is built
  // from the offerings rather than from the branch table, so a branch with no
  // offering never appears as a filter that empties the screen.
  const branchOptions = [ALL_BRANCHES,
    ...[...new Set(all.flatMap(c => c.offerings.map(o => o.branch)))].sort()];

  // A course is AT a branch through its offerings, so the filter asks the
  // offerings -- filtering on a course-level branch field would silently drop
  // every course that runs at two.
  const list = all
    .filter(c => branch === ALL_BRANCHES || c.offerings.some(o => o.branch === branch))
    .filter(c => !query.trim() || c.name.toLowerCase().includes(query.trim().toLowerCase()));
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
      <ScreenHeader title="Courses"
        subtitle={branch === ALL_BRANCHES
          ? `${all.length} ${all.length === 1 ? 'course' : 'courses'} · ${all.reduce((n, c) => n + c.offerings.length, 0)} offerings`
          : `${list.length} of ${all.length} ${all.length === 1 ? 'course' : 'courses'} · ${branch}`}
        right={<Button label="Add" onPress={() => router.push('/course/edit')} />} />

      {/* The canvas puts a branch chip in this header. Without it the only way
          to see one branch's courses was to read every course's offering
          lines and filter by eye. Hidden when the academy runs one branch:
          a filter with a single choice is furniture. */}
      {branchOptions.length > 2 ? (
        <DropdownRow open={branchOpen} style={{ marginTop: SPACE.md }}>
          <DropdownField label="Branch" value={branch} open={branchOpen}
            highlight={branch !== ALL_BRANCHES}
            testID="courses-branch-field"
            onPress={() => setBranchOpen(o => !o)} />
          {branchOpen ? (
            <DropdownPanel>
              <DropdownList options={branchOptions.map(label => ({ label }))} value={branch}
                testID="courses-branch"
                onSelect={l => { setBranch(l); setBranchOpen(false); }} />
            </DropdownPanel>
          ) : null}
        </DropdownRow>
      ) : null}

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
        // Which filter emptied the list, not just that it is empty: with two
        // filters on screen, "nothing matches" leaves the person guessing
        // which one to clear.
        <EmptyState title="Nothing matches"
          body={branch !== ALL_BRANCHES && query.trim()
            ? `No course at ${branch} matches that search. Clear one or both to see more.`
            : branch !== ALL_BRANCHES
            ? `No course runs at ${branch}. Choose ${ALL_BRANCHES} to see them all.`
            : 'No course matches that search. Clear it to see them all.'} />
      )}

      <View style={{ gap: SPACE.md, marginTop: SPACE.lg }}>
        {list.map((c, i) => {
          const enrolled = members.filter(m => m.course === c.name).length;
          const rule = rules?.byCourseName[c.name];
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
                {/* The name is the way IN to the course. "Members" used to
                    go to the members tab unscoped -- every member of every
                    course -- so this course's own roster was unreachable. */}
                <Pressable testID={`courses-open-${c.id}`}
                  onPress={() => router.push({ pathname: '/course/[id]', params: { id: c.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}, ${enrolled} member${enrolled === 1 ? '' : 's'}. Open the course`}
                  style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: theme.fgStrong }}>{c.name}</Text>
                  <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                    {`${enrolled} member${enrolled === 1 ? '' : 's'} · `}
                    {c.start_time ? `${ampm(c.start_time)}–${ampm(c.end_time!)} · ` : 'no default time · '}
                    {/* "intended", because frequency is stated intent and is
                        never what attendance is counted against */}
                    {`${c.frequency}/week intended`}
                  </Text>
                </Pressable>
                <RowIcon icon="edit" label={`Edit ${c.name}`} tint={theme.accentInk}
                  onPress={() => router.push({ pathname: '/course/edit', params: { id: c.id } })} />
                {/* Deleting a course is the super admin's, and only while the
                    subscription is writable -- the predicate delete_course
                    (0020) re-checks. Hiding it from staff beats offering a tap
                    that answers with a refusal. */}
                {identity?.isSuperAdmin ? (
                  <RowIcon icon="delete" label={`Delete ${c.name}`} tint={dangerInk}
                    onPress={() => setConfirmDelete(c)} />
                ) : null}
              </View>

              {/* The offerings ARE the schedule, so each one is the way in to
                  editing its days. Listing them as dead text is what left the
                  course form telling people to "set its days there" with no
                  there to go to. */}
              <View style={{
                gap: 6, marginTop: SPACE.md,
                paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: theme.line,
              }}>
                {c.offerings.length === 0 ? (
                  <Text style={{ fontSize: 11.5, color: theme.muted, lineHeight: 16 }}>
                    No offering yet — so no schedule, and nobody is expected anywhere.
                  </Text>
                ) : c.offerings.map(o => {
                  const days = o.weekdays.length
                    ? o.weekdays.map(d => DAY_NAMES[d]).join(' ')
                    : 'No days set';
                  return (
                    <Pressable testID={`courses-offering-${o.id}`}
                      key={o.id}
                      onPress={() => router.push({
                        pathname: '/offering/edit',
                        params: { courseId: c.id, offeringId: o.id },
                      })}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.name} at ${o.branch}, ${days}. Edit the days it runs`}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
                        minHeight: TAP_MIN - 8, opacity: pressed ? 0.7 : 1,
                      })}>
                      <Icon name="apartment" size={14} color={theme.dim} />
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: theme.fgStrong }}>
                        {o.branch}
                      </Text>
                      {/* the word carries it, not the absence of colour */}
                      <Text style={{
                        flex: 1, fontSize: 11.5, lineHeight: 16,
                        color: o.weekdays.length ? theme.muted : dangerInk,
                        fontWeight: o.weekdays.length ? '400' : '800',
                      }}>{days}</Text>
                      <Icon name="chevron_right" size={16} color={theme.dim} />
                    </Pressable>
                  );
                })}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.lg, marginTop: 2 }}>
                  <Pressable testID={`courses-add-offering-${c.id}`}
                    onPress={() => router.push({
                      pathname: '/offering/edit', params: { courseId: c.id },
                    })}
                    accessibilityRole="button"
                    accessibilityLabel={`Add a branch and days for ${c.name}`}
                    style={{ minHeight: TAP_MIN / 2, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>
                      {c.offerings.length ? 'Add offering' : 'Set where and when'}
                    </Text>
                  </Pressable>
                  <View style={{ flex: 1 }} />
                  <Pressable testID={`courses-members-${c.id}`}
                    onPress={() => router.push({ pathname: '/course/[id]', params: { id: c.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Members of ${c.name}`}
                    style={{ minHeight: TAP_MIN / 2, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>Members</Text>
                  </Pressable>
                </View>
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

      {/* The confirmation states what SURVIVES as well as what goes, because
          the promise the deletion keeps is that attendance history is not
          rewritten -- delete_course (0020) leaves every completed session,
          its frozen expectations and every attendance record alone. */}
      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={confirmDelete ? `Delete ${confirmDelete.name}?` : ''}
        body={confirmDelete
          ? `${(() => { const n = enrolledIn(confirmDelete.name);
              return n === 0 ? 'Nobody is enrolled.'
                : `${n} ${n === 1 ? 'member is' : 'members are'} enrolled, and their enrolment ends today.`; })()} `
            + 'Their attendance history stays: every completed session and every record of who was there is untouched. '
            + `The course, its ${confirmDelete.offerings.length} ${confirmDelete.offerings.length === 1 ? 'offering' : 'offerings'} and every session still to come are removed. Recorded in the audit log.`
          : ''}
        cancelLabel="Cancel"
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        onConfirm={() => { if (confirmDelete) void remove(confirmDelete); }} />
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
