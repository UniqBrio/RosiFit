import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Muted, Label, Skeleton, EmptyState, ErrorState, DeepBackground } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { ConfirmDialog } from '../../src/components/Sheet';
import { DropdownRow, DropdownField, DropdownPanel, DropdownList } from '../../src/components/Dropdown';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, STATUS, statusSurface, type StatusKey } from '../../src/theme/tokens';
import { DAY_NAMES, ruleSentence, AVATAR_TINTS, initials, type Member } from '../../src/data/mock';
import { useCourses, useFollowUp, useAttendance } from '../../src/data/hooks';
import { weekStart, iso, label as periodLabel } from '../../src/data/period';
import { deleteCourse, dataSource } from '../../src/data/repository';
import { useIdentity } from '../../src/data/session';
import { ALL_BRANCHES } from '../../src/state/academy';

/**
 * The canvas' COURSE DETAIL.
 *
 * WHAT WAS MISSING
 * A course had an edit form, a rules form and an offering form, and no screen
 * that simply SHOWED it. The Courses tab's "Members" link went to the members
 * tab unscoped -- every member of every course -- so the question the canvas
 * asks here ("who is in this course, and how are they doing this week") had
 * no answer anywhere in the app. Its delete answered with
 * `flash('Removing X needs a confirmation')`, which was true and was the
 * whole implementation.
 *
 * THE WEEK STRIP IS READ, NEVER DERIVED FROM FREQUENCY
 * A course states a frequency; 0005 says out loud that expected attendance is
 * derived from offering_schedules and *** NEVER *** from that number. So the
 * strip reads the attendance rows for the week and gives a day the status its
 * rows actually carry -- and a day the offering does not run says "not
 * expected" rather than inventing a session from `frequency`. That is the
 * difference between this screen and one that quietly disagrees with the
 * register.
 */

/** How many weeks either way a person can step. Far enough to answer "what
 *  happened last month", short enough that each fetch stays one week wide. */
const WEEK_LIMIT = 26;

type DayCell = {
  iso: string;
  dayNum: string;
  mon: string;
  dow: string;
  key: StatusKey;
  /** the rows behind the cell, for the day's own summary line */
  present: number;
  absent: number;
  expected: number;
};

export default function CourseDetail() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { id, state: forced } = useLocalSearchParams<{ id?: string; state?: string }>();

  const courses = useCourses(forced);
  const followUp = useFollowUp(forced);
  const { identity } = useIdentity();

  const [weekOffset, setWeekOffset] = useState(0);
  const [branch, setBranch] = useState<string>(ALL_BRANCHES);
  const [branchOpen, setBranchOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // The week being shown, as a Period -- the shape useAttendance takes, so
  // stepping weeks refetches rather than re-slicing a stale load.
  const week = useMemo(() => {
    const start = weekStart(new Date());
    start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: iso(start), to: iso(end), label: periodLabel(start, end) };
  }, [weekOffset]);

  const attendance = useAttendance(week, forced);

  const course = (courses.data ?? []).find(c => c.id === id);
  const members = followUp.data?.members ?? [];
  const rules = followUp.data?.rules;

  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;
  const warnInk = theme.isDark ? STATUS.awaiting.fgDark : STATUS.awaiting.fgLight;

  // Only the branches this course actually runs at. Offering one it has no
  // offering at would filter every member away and read as "nobody is
  // enrolled" rather than "it does not run there".
  const branchOptions = useMemo(() => {
    const own = [...new Set((course?.offerings ?? []).map(o => o.branch))].sort();
    return [ALL_BRANCHES, ...own];
  }, [course]);

  const scoped = useMemo(
    () => members.filter(m => m.course === course?.name
      && (branch === ALL_BRANCHES || m.branch === branch)),
    [members, course, branch]);

  const withEmail = scoped.filter(m => m.emails.length > 0);
  const withoutEmail = scoped.filter(m => m.emails.length === 0);

  /**
   * The seven cells, built from the attendance rows for this course so the
   * strip and the register cannot disagree:
   *
   *   rows present             -> completed; present/absent as recorded
   *   no rows, offering is off -> not expected
   *   no rows, date to come    -> scheduled
   *   no rows, date passed     -> awaiting upload. The session ran and no
   *                               file has arrived, which is the state the
   *                               Upload action exists for.
   */
  const days: DayCell[] = useMemo(() => {
    const rows = (attendance.data ?? []).filter(r => r.course === course?.name
      && (branch === ALL_BRANCHES || r.branch === branch));
    const byDate = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = byDate.get(r.date) ?? [];
      list.push(r);
      byDate.set(r.date, list);
    }

    // The weekdays this course runs across the branches in scope. 1..7 with
    // Monday = 1, which is what offering_schedules.weekdays stores.
    const runsOn = new Set<number>();
    for (const o of course?.offerings ?? []) {
      if (branch !== ALL_BRANCHES && o.branch !== branch) continue;
      for (const d of o.weekdays) runsOn.add(d);
    }

    const todayIso = iso(new Date());
    const start = new Date(`${week.from}T00:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateIso = iso(date);
      const dayRows = byDate.get(dateIso) ?? [];
      // JS puts Sunday at 0; offering weekdays put Monday at 1, Sunday at 7.
      const weekday = date.getDay() === 0 ? 7 : date.getDay();

      const present = dayRows.filter(r => r.status === 'present' || r.status === 'extra').length;
      const absent = dayRows.filter(r => r.status === 'absent').length;
      const expected = dayRows.filter(r => r.expected).length;

      const key: StatusKey = dayRows.length > 0
        ? (absent > 0 && present === 0 ? 'absent' : 'present')
        : !runsOn.has(weekday) ? 'none'
        : dateIso > todayIso ? 'scheduled'
        : 'awaiting';

      return {
        iso: dateIso,
        dayNum: String(date.getDate()),
        mon: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
        dow: DAY_NAMES[weekday],
        key, present, absent, expected,
      };
    });
  }, [attendance.data, course, branch, week.from]);

  // Today when it falls in the week being shown, otherwise the first day: a
  // strip with nothing selected has no detail panel, and an empty panel is
  // worse than a default one.
  const chosen = days.find(d => d.iso === selectedDay)
    ?? days.find(d => d.iso === iso(new Date()))
    ?? days[0];


  const remove = async () => {
    if (!course || deleting) return;
    setConfirmDelete(false);
    setDeleting(true);
    setFailure(null);
    try {
      const result = await deleteCourse(course.id);
      if (result.alreadyDeleted) {
        flash(`${course.name} was already deleted`, 'warn');
      } else {
        flash(dataSource === 'live'
          ? `${course.name} deleted, ${result.sessionsKept} completed ${result.sessionsKept === 1 ? 'session' : 'sessions'} kept`
          : `${course.name} deleted on this device only. The academy database is not configured.`,
          dataSource === 'live' ? 'ok' : 'warn');
      }
      router.back();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'The course could not be deleted. Nothing has been changed.');
    } finally {
      setDeleting(false);
    }
  };

  if (courses.state === 'loading') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}
        contentContainerStyle={{ padding: SPACE.lg }}><Skeleton lines={6} /></ScrollView>
    );
  }
  if (courses.state === 'error') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: SPACE.lg }}>
        <ErrorState onRetry={courses.retry}
          message={courses.error ?? 'The course could not be loaded. Nothing has been changed.'} />
      </ScrollView>
    );
  }
  if (!course) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: SPACE.lg }}>
        {/* A deleted course reached by a stale link is not an error. It is an
            answer, and it says which. */}
        <EmptyState
          title="That course is not here"
          body="It may have been deleted, or the link may be out of date. The Courses tab lists every course the academy runs."
          action="Back to courses" onAction={() => router.replace('/(tabs)/courses')} />
      </ScrollView>
    );
  }

  const rule = rules?.byCourseName[course.name] ?? rules?.global;
  const freqLine = course.offerings.length === 0
    ? 'No offering yet, so no schedule and nobody is expected'
    : course.offerings.map(o => `${o.branch}: ${o.weekdays.length
        ? o.weekdays.map(d => DAY_NAMES[d]).join(' ') : 'no days set'}`).join(' · ');

  const memberSplit = `${withEmail.length} with email · ${withoutEmail.length} without`;

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}
        contentContainerStyle={{ paddingBottom: 110 }}>

        {/* The deep header the canvas draws. It is the same dark plum in both
            themes, so its ink is white in both. */}
        <DeepBackground style={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm, paddingBottom: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
            <Pressable testID="course-back" onPress={() => router.back()} accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => ({
                width: 38, height: 38, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: theme.deepControl,
                borderWidth: 1, borderColor: theme.deepControlLine,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Icon name="arrow_back" size={21} color={theme.onAccent} />
            </Pressable>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: theme.onDeep }}>
              {`Courses → ${course.name}`}
            </Text>
            {identity?.isSuperAdmin ? (
              <Pressable testID="course-delete" onPress={() => setConfirmDelete(true)}
                accessibilityRole="button" accessibilityLabel={`Delete ${course.name}`}
                style={({ pressed }) => ({
                  width: 38, height: 38, borderRadius: RADIUS.md,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: theme.deepControl,
                  borderWidth: 1, borderColor: theme.deepControlLine,
                  opacity: pressed ? 0.7 : 1,
                })}>
                <Icon name="delete" size={19} color={theme.onAccent} />
              </Pressable>
            ) : null}
          </View>

          <Text style={{
            marginTop: SPACE.lg, fontSize: 25, fontWeight: '800',
            color: theme.onAccent, letterSpacing: -0.5, lineHeight: 29,
          }}>{course.name}</Text>
          <Text style={{ fontSize: 13, color: theme.onDeep, marginTop: 5 }}>
            {branch === ALL_BRANCHES
              ? `${course.offerings.length} ${course.offerings.length === 1 ? 'branch' : 'branches'}`
              : `${branch} Branch`}
          </Text>
          <Text style={{ fontSize: 12.5, color: theme.onDeep, marginTop: 2, fontVariant: ['tabular-nums'] }}>
            {freqLine}
          </Text>

          <Pressable testID="course-send"
            onPress={() => router.push({ pathname: '/send', params: { id } })}
            accessibilityRole="button"
            accessibilityLabel={`Send communication for ${course.name}`}
            style={({ pressed }) => ({
              marginTop: 15, minHeight: 46, borderRadius: 13,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
              backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1,
            })}>
            <Icon name="send" size={18} color={theme.onAccent} />
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.onAccent }}>
              Send Communication
            </Text>
          </Pressable>
        </DeepBackground>

        <View style={{ padding: SPACE.lg }}>
          {rule ? <Muted style={{ marginBottom: SPACE.md }}>{ruleSentence(rule, course.name)}</Muted> : null}

          {/* ------------------------------------------------ branch filter */}
          {branchOptions.length > 2 ? (
            <>
              <DropdownRow open={branchOpen}>
                <DropdownField label="Branch" value={branch} open={branchOpen}
                  testID="course-branch-field"
                  onPress={() => setBranchOpen(o => !o)} />
              </DropdownRow>
              {branchOpen ? (
                <DropdownPanel>
                  <DropdownList
                    options={branchOptions.map(b => ({ label: b }))}
                    value={branch} testID="course-branch"
                    onSelect={v => { setBranch(v); setBranchOpen(false); }} />
                </DropdownPanel>
              ) : null}
            </>
          ) : null}

          {/* -------------------------------------------------- week strip */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.md }}>
            <Pressable testID="course-week-prev"
              onPress={() => { setWeekOffset(o => Math.max(o - 1, -WEEK_LIMIT)); setSelectedDay(null); }}
              disabled={weekOffset <= -WEEK_LIMIT}
              accessibilityRole="button" accessibilityLabel="Previous week"
              accessibilityState={{ disabled: weekOffset <= -WEEK_LIMIT }}
              style={({ pressed }) => ({
                width: 34, height: 34, borderRadius: 9,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
                opacity: pressed ? 0.7 : weekOffset <= -WEEK_LIMIT ? 0.4 : 1,
              })}>
              <Icon name="chevron_left" size={17} color={theme.fg} />
            </Pressable>
            <Text style={{
              flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: '700',
              color: theme.muted, fontVariant: ['tabular-nums'],
            }}>{weekOffset === 0 ? `${week.label} · this week` : week.label}</Text>
            <Pressable testID="course-week-next"
              onPress={() => { setWeekOffset(o => Math.min(o + 1, WEEK_LIMIT)); setSelectedDay(null); }}
              disabled={weekOffset >= WEEK_LIMIT}
              accessibilityRole="button" accessibilityLabel="Next week"
              accessibilityState={{ disabled: weekOffset >= WEEK_LIMIT }}
              style={({ pressed }) => ({
                width: 34, height: 34, borderRadius: 9,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
                opacity: pressed ? 0.7 : weekOffset >= WEEK_LIMIT ? 0.4 : 1,
              })}>
              <Icon name="chevron_right" size={17} color={theme.fg} />
            </Pressable>
          </View>

          {attendance.state === 'loading' ? (
            <View style={{ marginTop: SPACE.md }}><Skeleton lines={2} /></View>
          ) : attendance.state === 'error' ? (
            <View style={{ marginTop: SPACE.md }}>
              <ErrorState onRetry={attendance.retry}
                message={attendance.error ?? 'This week could not be loaded. Nothing has been changed.'} />
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                {days.map(d => {
                  const on = chosen?.iso === d.iso;
                  const tone = STATUS[d.key];
                  const ink = theme.isDark ? tone.fgDark : tone.fgLight;
                  return (
                    <Pressable key={d.iso} testID={`course-day-${d.iso}`}
                      onPress={() => setSelectedDay(d.iso)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      // The word, not the colour. The cell shows an icon and a
                      // number, so the STATUS has to reach a screen reader
                      // some other way.
                      accessibilityLabel={`${d.dow} ${d.dayNum} ${d.mon}, ${tone.word}`}
                      style={{
                        flex: 1, alignItems: 'center', gap: 2,
                        paddingVertical: 9, paddingHorizontal: 2,
                        borderRadius: 13,
                        backgroundColor: on ? statusSurface(theme.accent).bg : theme.surface,
                        borderWidth: 1, borderColor: on ? theme.accent : theme.line,
                      }}>
                      <Text style={{ fontSize: 8.5, fontWeight: '800', color: on ? theme.accentInk : theme.dim }}>
                        {d.mon}
                      </Text>
                      <Text style={{
                        fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'],
                        color: on ? theme.fgStrong : theme.fg,
                      }}>{d.dayNum}</Text>
                      <Text style={{ fontSize: 8.5, fontWeight: '700', color: on ? theme.accentInk : theme.dim }}>
                        {d.dow}
                      </Text>
                      <Icon name={tone.icon} size={13} color={ink} />
                    </Pressable>
                  );
                })}
              </View>

              {/* the chosen day, in words */}
              {chosen ? (() => {
                const tone = STATUS[chosen.key];
                const ink = theme.isDark ? tone.fgDark : tone.fgLight;
                const box = statusSurface(ink);
                const detail = chosen.key === 'none'
                  ? 'This course does not run on this day, so nobody is expected and nobody is missing.'
                  : chosen.key === 'scheduled'
                  ? 'Still to come. Nothing is counted until the session runs and its file arrives.'
                  : chosen.key === 'awaiting'
                  ? 'The session ran and no attendance file has arrived. Until it does, nobody is marked present or absent.'
                  : `${chosen.present} present · ${chosen.absent} absent · ${chosen.expected} expected`;
                return (
                  <View style={{
                    flexDirection: 'row', alignItems: 'flex-start', gap: 9,
                    marginTop: 11, padding: 13, borderRadius: 13,
                    backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
                  }}>
                    <Icon name={tone.icon} size={18} color={ink} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
                        <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '800', color: ink }}>
                          {tone.word}
                        </Text>
                        <Text style={{
                          fontSize: 10.5, fontWeight: '700', color: theme.muted,
                          fontVariant: ['tabular-nums'],
                        }}>{`${chosen.dow} ${chosen.dayNum} ${chosen.mon}`}</Text>
                      </View>
                      <Muted style={{ marginTop: 4 }}>{detail}</Muted>
                      {chosen.key === 'awaiting' ? (
                        <Pressable testID="course-day-upload"
                          // The DAY she tapped, not "the upload screen". It
                          // opens straight into this session (uploadScope).
                          onPress={() => router.push(
                            `/upload?courseId=${id}&date=${chosen.iso}`)}
                          accessibilityRole="button" accessibilityLabel="Upload this session"
                          style={({ pressed }) => ({
                            marginTop: 10, alignSelf: 'flex-start',
                            flexDirection: 'row', alignItems: 'center', gap: 6,
                            minHeight: 36, paddingHorizontal: 13, borderRadius: 11,
                            backgroundColor: statusSurface(warnInk).bg,
                            borderWidth: 1, borderColor: statusSurface(warnInk).border,
                            opacity: pressed ? 0.7 : 1,
                          })}>
                          <Icon name="cloud_upload" size={16} color={warnInk} />
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: warnInk }}>
                            Upload this session
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })() : null}
            </>
          )}

          {/* ----------------------------------------------------- members */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm, marginTop: SPACE.xl }}>
            <Label style={{ flex: 1 }}>Members</Label>
            <Text style={{ fontSize: 11.5, color: theme.muted, fontVariant: ['tabular-nums'] }}>
              {memberSplit}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 9, marginTop: 11 }}>
            <Pressable testID="course-add-member"
              onPress={() => router.push({ pathname: '/member/edit', params: { courseId: course.id } })}
              accessibilityRole="button" accessibilityLabel={`Add a member to ${course.name}`}
              style={({ pressed }) => ({
                flex: 1, minHeight: 46, borderRadius: RADIUS.md,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: statusSurface(theme.accent).bg,
                borderWidth: 1, borderColor: statusSurface(theme.accent).border,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Icon name="person_add" size={18} color={theme.accentInk} />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.accentInk }}>Add Member</Text>
            </Pressable>
            <Pressable testID="course-bulk-import"
              onPress={() => router.push(`/upload?courseId=${id}`)}
              accessibilityRole="button" accessibilityLabel="Bulk import from a file"
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

          {followUp.state === 'loading' ? (
            <View style={{ marginTop: SPACE.md }}><Skeleton lines={3} /></View>
          ) : followUp.state === 'error' ? (
            <View style={{ marginTop: SPACE.md }}>
              <ErrorState onRetry={followUp.retry}
                message={followUp.error ?? 'The members could not be loaded. Nothing has been changed.'} />
            </View>
          ) : scoped.length === 0 ? (
            <View style={{ marginTop: SPACE.md }}>
              <EmptyState
                title={branch === ALL_BRANCHES ? 'Nobody is enrolled yet' : `Nobody is enrolled at ${branch}`}
                body="Adding a member names the OFFERING, the course at one branch, so she is expected at the days that offering runs." />
            </View>
          ) : (
            <>
              <View style={{ gap: 9, marginTop: SPACE.md }}>
                {withEmail.map((m, i) => (
                  <MemberCard key={m.id} member={m} tint={AVATAR_TINTS[(i + 3) % AVATAR_TINTS.length]}
                    weekLabel={week.label} noEmail={false} />
                ))}
              </View>

              {/* C-76: a member with no address is still listed and still
                  counted. She is separated because the follow-up rule cannot
                  reach her, which is a fact about the SEND and not about her
                  attendance -- and the note says exactly that. */}
              {withoutEmail.length > 0 ? (
                <View style={{ marginTop: SPACE.xl }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Icon name="mail_off" size={16} color={dangerInk} />
                    <Label style={{ flex: 1, color: dangerInk }}>No email</Label>
                    <Text style={{ fontSize: 11.5, color: theme.muted, fontVariant: ['tabular-nums'] }}>
                      {`${withoutEmail.length} of ${scoped.length}`}
                    </Text>
                  </View>
                  <View style={{
                    marginTop: 9, padding: 13, borderRadius: RADIUS.md,
                    backgroundColor: statusSurface(dangerInk).bg,
                    borderWidth: 1, borderColor: statusSurface(dangerInk).border,
                  }}>
                    <Muted style={{ color: theme.fg }}>
                      Their attendance is recorded as usual, but they are never counted for
                      follow-up: there is no address to send to. Add an email and they join the rule.
                    </Muted>
                  </View>
                  <View style={{ gap: 9, marginTop: 10 }}>
                    {withoutEmail.map((m, i) => (
                      <MemberCard key={m.id} member={m} tint={AVATAR_TINTS[i % AVATAR_TINTS.length]}
                        weekLabel={week.label} noEmail />
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}

          {/* THE "ATTENDANCE" ACTION ROWS ARE GONE, on request.
              Send Communication was the same destination as the button in
              this screen's own header, three scroll-lengths apart; Upload
              Attendance is on the day strip above, where the awaiting day
              actually is and where it arrives already scoped to that session.
              Two rows out of three were a second copy of a control this
              screen already had.

              WEEKLY REVIEW HAD NO OTHER ROUTE and now has none: /weekly is
              reachable only by URL. Recorded rather than quietly accepted --
              see TECH_DEBT TD-014, which this joins. */}

          {/* A refused delete is shown rather than flashed away: the course is
              still there and the person has to be able to read why. */}
          {failure ? (
            <View style={{ marginTop: SPACE.lg }}>
              <ErrorState message={failure} onRetry={() => setFailure(null)} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* The confirmation states what SURVIVES as well as what goes. The whole
          point of the promise is that attendance history is not rewritten. */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${course.name}?`}
        body={`${scoped.length === 0
          ? 'Nobody is enrolled.'
          : `${scoped.length} ${scoped.length === 1 ? 'member is' : 'members are'} enrolled, and their enrolment ends today.`} `
          + 'Their attendance history stays: every completed session and every record of who was there is untouched. '
          + `The course, its ${course.offerings.length} ${course.offerings.length === 1 ? 'offering' : 'offerings'} and every session still to come are removed. Recorded in the audit log.`}
        cancelLabel="Cancel"
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        onConfirm={() => { void remove(); }} />
    </>
  );
}

/**
 * One member on the course roster. Extracted because the with-email and
 * no-email sections draw the SAME card with a different reason attached, and
 * two copies would be two places for the miss counts to drift.
 */
function MemberCard({ member, tint, weekLabel, noEmail }:
  { member: Member; tint: string; weekLabel: string; noEmail: boolean }) {
  const { theme } = useTheme();
  const router = useRouter();

  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;
  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;

  // Expected at nothing is not "doing badly". It is not being on a running
  // schedule, and the word says which.
  const inactive = member.expected === 0;
  const statusInk = inactive ? theme.dim : okInk;
  const box = statusSurface(statusInk);
  // The threshold the canvas paints the miss line at. A READING aid, not the
  // follow-up rule: the rule lives in one place (src/data/followup) and this
  // line never decides anything.
  const heavy = member.missed >= 4 || member.streak >= 4;

  return (
    <View style={{
      padding: 13, borderRadius: RADIUS.lg, backgroundColor: theme.surface,
      borderWidth: 1, borderColor: noEmail ? statusSurface(dangerInk).border : theme.line,
    }}>
      <Pressable testID={`course-member-${member.id}`}
        onPress={() => router.push({ pathname: '/member/[id]', params: { id: member.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${member.name}, ${inactive ? 'inactive' : 'active'}. ${
          noEmail ? 'No email on file, not in follow-up' : member.emails[0]?.address ?? ''
        }. Missed ${member.missed}, consecutive ${member.streak}`}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 11, opacity: pressed ? 0.7 : 1,
        })}>
        <View style={{
          width: 38, height: 38, borderRadius: 19, backgroundColor: tint,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: theme.onAccent }}>
            {initials(member.name)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text numberOfLines={1} style={{
              flex: 1, fontSize: 14.5, fontWeight: '700', color: theme.fgStrong,
            }}>{member.name}</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.pill,
              backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
            }}>
              <Icon name={inactive ? 'pause_circle' : 'check_circle'} size={12} color={statusInk} />
              <Text style={{ fontSize: 9.5, fontWeight: '800', color: statusInk }}>
                {inactive ? 'Inactive' : 'Active'}
              </Text>
            </View>
          </View>
          <Text numberOfLines={1} style={{
            fontSize: 11.5, marginTop: 3,
            color: noEmail ? dangerInk : theme.muted,
          }}>
            {noEmail ? 'No email on file · not in follow-up' : member.emails[0]?.address ?? ''}
          </Text>
          <Text numberOfLines={1} style={{
            fontSize: 11, marginTop: 2, fontVariant: ['tabular-nums'],
            color: heavy ? dangerInk : theme.dim,
          }}>
            {`Missed ${weekLabel}: ${member.missed} · consecutive ${member.streak}`}
          </Text>
        </View>
      </Pressable>

      <View style={{
        marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.line,
        flexDirection: 'row', justifyContent: 'flex-end',
      }}>
        <Pressable testID={`course-member-edit-${member.id}`}
          onPress={() => router.push({ pathname: '/member/edit', params: { id: member.id } })}
          accessibilityRole="button"
          accessibilityLabel={noEmail ? `Add an email for ${member.name}` : `Edit ${member.name}`}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 5,
            minHeight: 32, paddingHorizontal: 11, borderRadius: RADIUS.sm,
            backgroundColor: statusSurface(noEmail ? dangerInk : theme.accent).bg,
            borderWidth: 1, borderColor: statusSurface(noEmail ? dangerInk : theme.accent).border,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name="edit" size={15} color={noEmail ? dangerInk : theme.accentInk} />
          <Text style={{ fontSize: 11, fontWeight: '800', color: noEmail ? dangerInk : theme.accentInk }}>
            {noEmail ? 'Add email' : 'Edit'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
