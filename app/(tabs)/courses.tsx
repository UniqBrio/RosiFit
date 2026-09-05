import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Label, Button, Skeleton, EmptyState, ErrorState } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/AppShell';
import { Icon } from '../../src/components/Icon';
import { DropdownRow, DropdownField, DropdownPanel, DropdownList } from '../../src/components/Dropdown';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, STATUS, statusSurface } from '../../src/theme/tokens';
import { ruleSentence, AVATAR_TINTS, initials } from '../../src/data/mock';
import { useCourses, useFollowUp } from '../../src/data/hooks';
import { courseSummary, coursesHeadline } from '../../src/data/course';
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
  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;

  /* The header sentence, counted from what is on screen rather than typed.
   * It sums the SAME per-course summary the cards show, so the header and the
   * list cannot disagree about how many members need following up. */
  const branchCount = new Set(all.flatMap(c => c.offerings.map(o => o.branch))).size;
  const needFollowUp = all.reduce((n, c) => {
    const rule = rules?.byCourseName[c.name] ?? rules?.global;
    if (!rule) return n;
    const enrolled = members.filter(m => m.course === c.name);
    const days = c.offerings.reduce((d, o) => Math.max(d, o.weekdays.length), 0);
    return n + courseSummary(enrolled, days, rule).flagged;
  }, 0);
  const headline = coursesHeadline(all.length, branchCount, needFollowUp);

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
      {/* "Attendance", not "Courses". This is the canvas' second TAB and its
          landing screen -- the workspace where a course is opened, its
          register uploaded and its weekly review run. The course list is how
          you get at all of that, not the subject of the screen. */}
      <ScreenHeader title="Attendance" subtitle={headline}
        right={
          <Pressable testID="courses-add"
            onPress={() => router.push('/course/edit')}
            accessibilityRole="button" accessibilityLabel="Add a course"
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 5,
              height: 36, paddingHorizontal: 12, borderRadius: 11,
              backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1,
            })}>
            <Icon name="add" size={17} color={theme.onAccent} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: theme.onAccent }}>Add Course</Text>
          </Pressable>
        } />

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

      {/* ADDING PEOPLE, from the workspace rather than only from inside one
          course. Both screens offer the same pair -- the course detail has
          them under its Members heading, where the course is already decided;
          here neither is, so both open asking which course she joins.
          They sit under the search box and above the list because that is
          where a person who came here to add somebody is already looking,
          and neither is a filter of what follows. */}
      {/* OWNER-ONLY, as the reference has it: a file of forty members is the
          shape of the register. Hidden for staff rather than disabled -- a
          disabled button asks a question the person cannot answer -- and the
          RPC refuses them anyway, so the deep route is gated too. */}
      {identity?.isSuperAdmin ? (
      <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md }}>
        <Pressable testID="courses-add-member"
          onPress={() => router.push('/member/edit')}
          accessibilityRole="button" accessibilityLabel="Add a member"
          style={({ pressed }) => ({
            flex: 1, minHeight: 46, borderRadius: RADIUS.md,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: statusSurface(theme.accentInk).bg,
            borderWidth: 1, borderColor: statusSurface(theme.accentInk).border,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name="person_add" size={18} color={theme.accentInk} />
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.accentInk }}>Add Member</Text>
        </Pressable>
        <Pressable testID="courses-bulk-import"
          onPress={() => router.push('/member/import')}
          accessibilityRole="button" accessibilityLabel="Bulk import members from a file"
          style={({ pressed }) => ({
            flex: 1, minHeight: 46, borderRadius: RADIUS.md,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name="upload_file" size={18} color={theme.fg} />
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.fg }}>Bulk Import</Text>
        </Pressable>
      </View>
      ) : null}

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

      {list.length > 0 ? (
        <Label style={{ marginTop: SPACE.xl }}>
          {branch === ALL_BRANCHES ? `All courses · ${list.length}` : `${branch} · ${list.length}`}
        </Label>
      ) : null}

      <View style={{ gap: SPACE.md, marginTop: SPACE.md }}>
        {list.map((c, i) => {
          const enrolled = members.filter(m => m.course === c.name);
          const rule = rules?.byCourseName[c.name] ?? rules?.global;
          // Every line this card states, computed where it can be tested.
          const summary = rule
            ? courseSummary(enrolled, c.offerings.reduce((n, o) => Math.max(n, o.weekdays.length), 0), rule)
            : null;
          const flagInk = summary?.noDays ? dangerInk
            : summary?.flagged ? theme.accentInk : okInk;
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
                  accessibilityLabel={`${c.name}. ${summary ? summary.freqLine : ''}. ${summary ? summary.note : ''}`}
                  style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: theme.fgStrong }}>{c.name}</Text>
                  {/* The branch a course belongs to, as the canvas states it.
                      A course running at several says so rather than naming
                      one and being wrong about the others. */}
                  <Text style={{ fontSize: 11.5, color: theme.accentInk, marginTop: 2 }}>
                    {c.offerings.length === 0 ? 'No branch yet'
                      : c.offerings.length === 1 ? `${c.offerings[0].branch} Branch`
                      : `${c.offerings.length} branches`}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                    {summary ? summary.freqLine : `${enrolled.length} members`}
                  </Text>

                  {/* Who can actually be reached. A course whose members have
                      no address cannot be followed up at all, and that is a
                      fact about the course, not a detail of one member. */}
                  {summary ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: 5 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon name="mail" size={13} color={theme.dim} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.muted, fontVariant: ['tabular-nums'] }}>
                          {summary.withMail}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon name="mail_off" size={13} color={summary.noMail ? dangerInk : theme.dim} />
                        <Text style={{
                          fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'],
                          color: summary.noMail ? dangerInk : theme.muted,
                        }}>{summary.noMail}</Text>
                      </View>
                    </View>
                  ) : null}
                </Pressable>
                {/* EDIT AND DELETE RIDE THE ROW, as the reference app has
                    them. They used to sit on a footer row of their own with
                    their words beside them; the row is where a person's eye
                    already is once she has found the course she means, and
                    the footer cost every card another 34pt to reach.

                    The words move to the accessibility label rather than
                    disappearing — the pair is tinted apart AND shaped apart
                    (a pencil, a bin), and delete stops at a confirmation that
                    names the course and states what survives, so nothing
                    irreversible turns on recognising a glyph. */}
                <CardAction icon="edit" tint={theme.accentInk}
                  testID={`courses-edit-${c.id}`}
                  hint={`Edit ${c.name}`}
                  onPress={() => router.push({ pathname: '/course/edit', params: { id: c.id } })} />
                {/* Deleting a course is the super admin's, and only while the
                    subscription is writable -- the predicate delete_course
                    (0020) re-checks. Hiding it from staff beats offering a tap
                    that answers with a refusal. */}
                {identity?.isSuperAdmin ? (
                  <CardAction icon="delete" tint={dangerInk}
                    testID={`courses-delete-${c.id}`}
                    hint={`Delete ${c.name}`}
                    onPress={() => setConfirmDelete(c)} />
                ) : null}
                {/* The chevron is its OWN target, not decoration inside the
                    card button: the card opens the course, the chevron opens
                    that course's roster. Two destinations, so two controls --
                    an arrow that did the same thing as the card it sits on is
                    an arrow that teaches people it means nothing. */}
                <Pressable testID={`courses-roster-${c.id}`}
                  onPress={() => router.push(
                    `/members?courseId=${c.id}&courseName=${encodeURIComponent(c.name)}&from=/courses`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Members of ${c.name}`}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    width: 24, height: 42, alignItems: 'center', justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}>
                  <Icon name="chevron_right" size={21} color={theme.dim} />
                </Pressable>
              </View>

              {/* The canvas' status line: ONE sentence per course saying
                  whether anybody in it needs following up -- and, ahead of
                  that, whether the course has any weekdays at all. No
                  weekdays is not "nobody needs follow-up": it is the more
                  serious fact that nothing is expected of anyone, so no
                  absence can be counted and the course sits outside the
                  engine entirely. The word carries it; the icon repeats it. */}
              {summary ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: SPACE.md,
                }}>
                  <Icon name={summary.icon} size={15} color={flagInk} />
                  <Text style={{ flex: 1, fontSize: 11.5, fontWeight: '700', color: flagInk }}>
                    {summary.note}
                  </Text>
                </View>
              ) : null}

            </View>
          );
        })}
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

/**
 * Edit or Delete, on the course row itself.
 *
 * It WAS a labelled control at the foot of the card, and the label is now the
 * accessibility label instead. Guardrail 3 -- colour is never the only signal
 * -- is still kept: the two are shaped apart as well as tinted apart, and the
 * one that cannot be undone opens a confirmation that names the course in
 * words before anything happens. What is gone is 34pt of card height per
 * course spent restating two of the most conventional glyphs there are.
 */
function CardAction({ icon, tint, hint, testID, onPress }:
  { icon: string; tint: string; hint: string; testID: string; onPress: () => void }) {
  return (
    <Pressable testID={testID} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={hint}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 34, height: 34, borderRadius: RADIUS.sm,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: statusSurface(tint).bg,
        borderWidth: 1, borderColor: statusSurface(tint).border,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={16} color={tint} />
    </Pressable>
  );
}
