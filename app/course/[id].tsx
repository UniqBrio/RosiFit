import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Muted, Label, Skeleton, EmptyState, ErrorState, DeepBackground } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { ConfirmDialog, SearchPicker } from '../../src/components/Sheet';
import { DropdownRow, DropdownField, DropdownPanel, DropdownList } from '../../src/components/Dropdown';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, STATUS, statusSurface, type StatusKey } from '../../src/theme/tokens';
import { DAY_NAMES, ruleSentence, AVATAR_TINTS, initials, type Member, type MemberStatus } from '../../src/data/mock';
import { useCourses, useFollowUp, useAttendance } from '../../src/data/hooks';
import { weekStart, iso, label as periodLabel } from '../../src/data/period';
import { setMemberStatus, mergeMemberInto, dataSource } from '../../src/data/repository';
import { MERGE_FAILED } from '../../src/data/alias';
import { ALL_BRANCHES } from '../../src/state/academy';
import { ShellScreen } from '../../src/components/AppShell';

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

function CourseDetailBody() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { id, state: forced } = useLocalSearchParams<{ id?: string; state?: string }>();

  /**
   * The three breakpoints, and the only place they are stated.
   *
   *   >= 1024  desktop -- actions beside the title, search on the heading row
   *   768-1023 tablet  -- the header wraps, the seven-card strip stays
   *   <  768   phone   -- actions stacked, ONE date card, search full width
   *
   * A phone is not a narrow desktop here: three 42pt buttons side by side at
   * 360pt truncate to one word each, and seven date cards give each day 44pt
   * to hold a month, a number, a weekday and an icon.
   *
   * WHY THE WIDTH IS IGNORED ON THE FIRST RENDER
   * This app ships as a STATIC export, so every route is prerendered in node
   * and then hydrated. react-native-web has no window there and reports a
   * width of 0 (Dimensions/index.js), while the browser reports the real one
   * on its very first render -- so reading the width directly would draw the
   * phone layout on the server and the desktop layout into the same markup,
   * which is a hydration mismatch: React discards the tree and remounts it.
   * That is the defect the note at the top of src/components/Icon.tsx was
   * written for, and this is the same shape of it.
   *
   * So the first render uses 0 on BOTH sides -- identical markup, by
   * construction -- and the measured width takes over on the render after
   * mount.
   */
  const { width } = useWindowDimensions();
  const [measured, setMeasured] = useState(false);
  useEffect(() => { setMeasured(true); }, []);
  const shownWidth = measured ? width : 0;
  const wide = shownWidth >= 1024;
  const compact = shownWidth < 768;

  const courses = useCourses(forced);
  const followUp = useFollowUp(forced);

  const [weekOffset, setWeekOffset] = useState(0);
  const [branch, setBranch] = useState<string>(ALL_BRANCHES);
  const [branchOpen, setBranchOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // Roster search. It filters what this screen DRAWS and nothing else -- no
  // refetch, no scope change: the branch filter above is what narrows the
  // query.
  const [query, setQuery] = useState('');

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

  // What the roster shows: the scoped members, less anything the search box
  // hides. Name or address, because those are the two things written on a card.
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter(m => m.name.toLowerCase().includes(q)
      || m.emails.some(e => e.address.toLowerCase().includes(q)));
  }, [scoped, query]);

  const withEmail = shown.filter(m => m.emails.length > 0);
  const withoutEmail = shown.filter(m => m.emails.length === 0);

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
        ? o.weekdays.map(d => DAY_NAMES[d]).join(', ') : 'no days set'}`).join(' · ');

  const memberSplit = `${withEmail.length} with email · ${withoutEmail.length} without`;

  // ONE line under the course name, where the hero used to spend three: how
  // many branches it runs at, and which days it runs on. Both facts were
  // already here; they were just on separate rows.
  const branchLine = branch === ALL_BRANCHES
    ? `${course.offerings.length} ${course.offerings.length === 1 ? 'branch' : 'branches'}`
    : `${branch} Branch`;
  const metaLine = `${branchLine} · ${freqLine}`;

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}
        contentContainerStyle={{ paddingBottom: 110 }}>

        {/* --------------------------------------- THE COMPACT COURSE HEADER
            The course is named ONCE, at heading size, with the back arrow
            beside it and the schedule directly underneath. What was here
            before said it twice -- a `Courses -> Postnatal` breadcrumb over a
            25pt hero -- across four rows and 22pt of bottom padding.

            The three primary actions ride this header rather than being spread
            down the screen. Send Communication was already here; Upload Session
            was reachable only from a day that happened to be awaiting; Add
            Member was a full-width bar pinned below the strip. They are the
            three things a person opens this screen to do, so they are one
            group, in one place. Deleting a course is not one of them: that
            lives on the Courses tab, so this header carries no trash icon. */}
        <DeepBackground style={{
          paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm, paddingBottom: SPACE.md,
        }}>
          <View style={{
            flexDirection: wide ? 'row' : 'column',
            alignItems: wide ? 'center' : 'stretch',
            gap: wide ? SPACE.lg : SPACE.md,
          }}>
            <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                {/* THE ONE back control on this screen, and the reason the day
                    arrows below are square, smaller and live inside the strip:
                    "leave this course" and "move one day" were the same arrow
                    drawn twice, and nobody could tell which was which. */}
                <Pressable testID="course-back" onPress={() => router.back()} accessibilityRole="button"
                  accessibilityLabel="Go back" hitSlop={6}
                  style={({ pressed }) => ({
                    width: 34, height: 34, borderRadius: RADIUS.md,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: theme.deepControl,
                    borderWidth: 1, borderColor: theme.deepControlLine,
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Icon name="arrow_back" size={19} color={theme.onAccent} />
                </Pressable>

                <Text numberOfLines={1} style={{
                  flex: 1, minWidth: 0, fontSize: 26, fontWeight: '800',
                  color: theme.onAccent, letterSpacing: -0.5, lineHeight: 30,
                }}>{course.name}</Text>
              </View>

              {/* Indented to the title, not the arrow, so the two read as one
                  block. Two lines at most -- a course at four branches states
                  four schedules, and that is a fact for the strip below to
                  show rather than for the header to grow into. */}
              <Text numberOfLines={2} style={{
                fontSize: 12.5, color: theme.onDeep, marginTop: 4, marginLeft: 42,
                fontVariant: ['tabular-nums'],
              }}>{metaLine}</Text>
            </View>

            <View style={{
              flexDirection: compact ? 'column' : 'row',
              flexWrap: compact ? 'nowrap' : 'wrap',
              alignItems: compact ? 'stretch' : 'center',
              justifyContent: 'flex-end', gap: SPACE.sm,
            }}>
              <HeaderAction testID="course-send" icon="send" label="Send Communication" primary
                accessibilityLabel={`Send communication for ${course.name}`}
                onPress={() => router.push({ pathname: '/send', params: { id } })} />
              {/* The COURSE, not a date. The awaiting day below keeps its own
                  button because that one arrives already scoped to the session
                  she tapped; this one opens the flow asking which. */}
              <HeaderAction testID="course-upload" icon="cloud_upload" label="Upload Session"
                accessibilityLabel={`Upload a session for ${course.name}`}
                onPress={() => router.push({ pathname: '/upload', params: { courseId: course.id } })} />
              <HeaderAction testID="course-add-member" icon="person_add" label="Add Member"
                accessibilityLabel={`Add a member to ${course.name}`}
                onPress={() => router.push({ pathname: '/member/edit', params: { courseId: course.id } })} />
            </View>
          </View>
        </DeepBackground>

        <View style={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.md }}>
          {rule ? <Muted style={{ marginBottom: SPACE.sm }}>{ruleSentence(rule, course.name)}</Muted> : null}

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

          {/* ----------------------------- the week: its range and its legend
              One row on anything but a phone. The legend is here rather than in
              a section of its own because the only thing it explains is the
              icon on a date card, and it is four words wide. */}
          <View style={{
            flexDirection: compact ? 'column' : 'row',
            alignItems: compact ? 'flex-start' : 'center',
            gap: compact ? 6 : SPACE.md, marginTop: SPACE.md,
          }}>
            <Text style={{
              flex: compact ? undefined : 1, fontSize: 13, fontWeight: '700',
              color: theme.fg, fontVariant: ['tabular-nums'],
            }}>{weekOffset === 0 ? `${week.label} · this week` : week.label}</Text>
            <DayLegend />
          </View>

          {/* -------------------------------------------------- week strip
              The arrows flank the CARDS, not a caption. They used to sit on a
              row of their own with the week label centred between them, two
              controls a finger's width from the edges of the screen and a
              full row away from the thing they move. The week they are
              stepping is stated above, left-aligned where a heading goes, and
              the arrows are now the ends of the strip itself.

              They are rendered OUTSIDE the loading branch on purpose: stepping
              a week refetches, and arrows that blinked out for the duration
              would be arrows you cannot press twice in a row.

              SEVEN CARDS AT EVERY WIDTH, on request. A phone shows the whole
              week and every day stays one tap away; only the gaps close up to
              pay for it. What changed on the phone is the height of a card,
              not how many there are. */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            gap: compact ? 6 : SPACE.sm, marginTop: SPACE.sm,
          }}>
            <StripArrow testID="course-week-prev" icon="chevron_left" label="Previous week"
              disabled={weekOffset <= -WEEK_LIMIT}
              onPress={() => {
                setWeekOffset(o => Math.max(o - 1, -WEEK_LIMIT)); setSelectedDay(null);
              }} />

            <View style={{ flex: 1, minWidth: 0 }}>
              {attendance.state === 'loading' ? (
                <Skeleton lines={2} />
              ) : attendance.state === 'error' ? null : (
                <View style={{ flexDirection: 'row', gap: compact ? 4 : 6 }}>
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
                          flex: 1, minWidth: 0, alignItems: 'center', gap: 1,
                          paddingVertical: 7, paddingHorizontal: compact ? 1 : 2,
                          borderRadius: 12,
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
              )}
            </View>

            <StripArrow testID="course-week-next" icon="chevron_right" label="Next week"
              disabled={weekOffset >= WEEK_LIMIT}
              onPress={() => {
                setWeekOffset(o => Math.min(o + 1, WEEK_LIMIT)); setSelectedDay(null);
              }} />
          </View>

          {/* A week that could not be loaded is stated under the strip
              rather than in place of it: the arrows still work, so stepping
              off the broken week is one tap and not a reload. */}
          {attendance.state === 'error' ? (
            <View style={{ marginTop: SPACE.md }}>
              <ErrorState onRetry={attendance.retry}
                message={attendance.error ?? 'This week could not be loaded. Nothing has been changed.'} />
            </View>
          ) : attendance.state === 'ready' ? (
            <>
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
                    flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm,
                    marginTop: SPACE.md, padding: 11, borderRadius: RADIUS.md,
                    backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
                  }}>
                    <Icon name={tone.icon} size={17} color={ink} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
                        <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '800', color: ink }}>
                          {tone.word}
                        </Text>
                        <Text style={{
                          fontSize: 10.5, fontWeight: '700', color: theme.muted,
                          fontVariant: ['tabular-nums'],
                        }}>{`${chosen.dow} ${chosen.dayNum} ${chosen.mon}`}</Text>
                      </View>
                      <Muted style={{ marginTop: 3 }}>{detail}</Muted>
                      {/* ------------------------------------------ upload
                          ALWAYS PRESENT, on every day of the strip.

                          It used to render only for an `awaiting` day -- a
                          day this course was scheduled to run and had not
                          been given a file for. That is the case the button
                          was designed around and it is not the case the
                          academy is in: a class that was arranged on the day,
                          or run on a day the course does not normally run,
                          has no scheduled session, so the day showed no way
                          to upload anything at all.

                          Nothing about the import needed the session to
                          exist -- the day comes from the file and 0024
                          creates the session if there is none. Only this
                          button was gated. Now the day she tapped always
                          travels with it, which is also what lets the upload
                          ASK when the file turns out to be from another day.

                          The tint still marks `awaiting` out: that is the day
                          the register is actually waiting on. */}
                      {(() => {
                        const waiting = chosen.key === 'awaiting';
                        const ink = waiting ? warnInk : theme.accentInk;
                        return (
                          <Pressable testID="course-day-upload"
                            onPress={() => router.push(
                              `/upload?courseId=${id}&date=${chosen.iso}`)}
                            accessibilityRole="button"
                            accessibilityLabel={`Upload a session for ${chosen.dow} ${chosen.dayNum} ${chosen.mon}`}
                            style={({ pressed }) => ({
                              marginTop: SPACE.sm, alignSelf: 'flex-start',
                              flexDirection: 'row', alignItems: 'center', gap: 6,
                              minHeight: 34, paddingHorizontal: 12, borderRadius: RADIUS.sm,
                              backgroundColor: statusSurface(ink).bg,
                              borderWidth: 1, borderColor: statusSurface(ink).border,
                              opacity: pressed ? 0.7 : 1,
                            })}>
                            <Icon name="cloud_upload" size={15} color={ink} />
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: ink }}>
                              Upload session
                            </Text>
                          </Pressable>
                        );
                      })()}
                    </View>
                  </View>
                );
              })() : null}
            </>
          ) : null}

          {/* ----------------------------------------------------- members
              The heading carries the count and, on a desktop, the search box
              on the same line.

              THE PINNED ADD MEMBER BAR IS GONE. It was a full-width button in
              a sticky child of its own, pinned because the roster is the long
              part of this screen and the way to add somebody scrolled off the
              top after four members. The action is now in the course header
              with the other two, which is above the fold at every width and
              needs no pinning to stay there -- so the sticky child, and the
              61pt band it cost every scroll position, both go. Nothing was
              removed: it is the same route, the same params and the same
              testID.

              Bulk Import is still not here, on the earlier request that took
              it off this heading. It remains on the Attendance tab. */}
          <View style={{
            flexDirection: wide ? 'row' : 'column',
            alignItems: wide ? 'center' : 'stretch',
            gap: wide ? SPACE.md : SPACE.sm, marginTop: SPACE.xl,
          }}>
            <View style={{
              flex: wide ? 1 : undefined, minWidth: 0,
              flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm,
            }}>
              <Label>{`Members (${shown.length})`}</Label>
              <Text numberOfLines={1} style={{
                flex: 1, minWidth: 0, fontSize: 11.5, color: theme.muted,
                fontVariant: ['tabular-nums'],
              }}>{memberSplit}</Text>
            </View>

            <View style={{
              width: wide ? 300 : undefined,
              flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
              height: 42, borderRadius: RADIUS.md, backgroundColor: theme.surface,
              borderWidth: 1, borderColor: theme.lineStrong, paddingHorizontal: 12,
            }}>
              <Icon name="search" size={18} color={theme.muted} />
              <TextInput testID="course-member-search"
                value={query} onChangeText={setQuery}
                placeholder="Search members"
                placeholderTextColor={theme.muted}
                accessibilityLabel="Search the members of this course"
                style={{ flex: 1, minWidth: 0, color: theme.fgStrong, fontSize: 13.5, fontWeight: '600' }} />
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: SPACE.lg, paddingBottom: SPACE.lg }}>
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
          ) : shown.length === 0 ? (
            /* SEARCHED away, not absent. The count it offers to bring back is
               the scoped roster, so the two states can never be confused. */
            <View style={{ marginTop: SPACE.md }}>
              <EmptyState
                title="No member matches that"
                body={`Nothing on this roster matches “${query.trim()}”. Clearing the search brings all ${scoped.length} back.`}
                action="Clear search" onAction={() => setQuery('')} />
            </View>
          ) : (
            <>
              <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
                {withEmail.map((m, i) => (
                  <MemberCard key={m.id} member={m} tint={AVATAR_TINTS[(i + 3) % AVATAR_TINTS.length]}
                    weekLabel={week.label} noEmail={false} allMembers={members} />
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
                      {`${withoutEmail.length} of ${shown.length}`}
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
                  <View style={{ gap: SPACE.sm, marginTop: 10 }}>
                    {withoutEmail.map((m, i) => (
                      <MemberCard key={m.id} member={m} tint={AVATAR_TINTS[i % AVATAR_TINTS.length]}
                        weekLabel={week.label} noEmail allMembers={members} />
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
        </View>
      </ScrollView>
    </>
  );
}

/**
 * One of the three primary course actions, on the deep header.
 *
 * Same height, same radius, same icon-and-word shape for all three; only the
 * fill separates the primary from the two secondaries, and the WORD is what
 * says which action it is. Full width when the parent stacks them (a phone),
 * natural width when it lines them up.
 */
function HeaderAction({ testID, icon, label, onPress, primary, accessibilityLabel }: {
  testID: string; icon: string; label: string; onPress: () => void;
  primary?: boolean; accessibilityLabel: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        height: 42, borderRadius: RADIUS.md, paddingHorizontal: 13,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        backgroundColor: primary ? theme.accent : theme.deepControl,
        borderWidth: 1, borderColor: primary ? theme.accent : theme.deepControlLine,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Icon name={icon} size={17} color={theme.onAccent} />
      <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '800', color: theme.onAccent }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A DATE control, and deliberately not the page back button.
 *
 * 30pt square on the app surface with a 9pt radius, inside the strip it moves.
 * The back button is 34pt, filled, rounded to RADIUS.md and up on the deep
 * header beside the course name. hitSlop takes this to the 44pt minimum
 * without taking the drawn control back up to the size of the one it must not
 * be mistaken for.
 */
function StripArrow({ testID, icon, label, disabled, onPress }: {
  testID: string; icon: string; label: string; disabled: boolean; onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} disabled={disabled}
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled }} hitSlop={7}
      style={({ pressed }) => ({
        width: 30, height: 30, borderRadius: 9,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
        opacity: pressed ? 0.7 : disabled ? 0.4 : 1,
      })}>
      <Icon name={icon} size={17} color={theme.fg} />
    </Pressable>
  );
}

/**
 * What the icon on a date card means, in one wrapping row.
 *
 * The four states a WEEK of this course can be in. Scheduled is left out on
 * purpose: it is the only one the day panel below always spells out in a
 * sentence, and a five-item legend stopped fitting one row at 360pt.
 */
function DayLegend() {
  const { theme } = useTheme();
  const keys: StatusKey[] = ['present', 'absent', 'awaiting', 'none'];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
      {keys.map(k => {
        const tone = STATUS[k];
        const ink = theme.isDark ? tone.fgDark : tone.fgLight;
        return (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name={tone.icon} size={13} color={ink} />
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: theme.muted }}>{tone.word}</Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * One member on the course roster. Extracted because the with-email and
 * no-email sections draw the SAME card with a different reason attached, and
 * two copies would be two places for the miss counts to drift.
 */
function MemberCard({ member, tint, weekLabel, noEmail, allMembers }:
  { member: Member; tint: string; weekLabel: string; noEmail: boolean;
    /** the register this member's display name can be linked INTO -- only a
     *  no-email card offers it, but the prop is passed by both call sites so
     *  the two cards stay one component */
    allMembers: Member[] }) {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();

  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;
  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;

  /**
   * ON the register, or off it -- `members.status`, not `expected === 0`.
   *
   * This pill used to read the WEEK: a member expected at nothing was drawn
   * "Inactive". That was a fact about her schedule wearing the word for a
   * fact about her membership, and nobody could change it, because nothing
   * anywhere wrote the column it was pretending to show. Now it shows the
   * column, and tapping it sets it (0031).
   */
  const inactive = member.status !== 'active';
  const statusInk = inactive ? theme.dim : okInk;
  const box = statusSurface(statusInk);
  // The threshold the canvas paints the miss line at. A READING aid, not the
  // follow-up rule: the rule lives in one place (src/data/followup) and this
  // line never decides anything.
  const heavy = member.missed >= 4 || member.streak >= 4;

  // Taking somebody off the register stops the academy writing to her, so it
  // is asked for rather than toggled -- and the question says which way it is
  // going and what follows.
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  // "Add display name to existing member" -- open, and mid-save.
  const [linking, setLinking] = useState(false);
  const [linkingSave, setLinkingSave] = useState(false);

  const applyStatus = async () => {
    if (saving) return;
    setConfirmStatus(false);
    setSaving(true);
    const wanted: MemberStatus = inactive ? 'active' : 'inactive';
    const first = member.name.split(' ')[0];
    const said = wanted === 'active' ? 'active again' : 'inactive';
    try {
      await setMemberStatus(member.id, wanted);
      flash(dataSource === 'live'
        ? `${first} is ${said}`
        : `${first} is ${said} on this device only. The academy database is not configured.`,
        dataSource === 'live' ? 'ok' : 'warn');
    } catch (err) {
      flash(err instanceof Error ? err.message
        : 'Her status could not be changed. Nothing has been saved.', 'warn');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{
      padding: 11, borderRadius: RADIUS.md, backgroundColor: theme.surface,
      borderWidth: 1, borderColor: noEmail ? statusSurface(dangerInk).border : theme.line,
    }}>
      {/* ONE row. The status and the Edit control sit together at its right
          hand, where the reference app puts them; Edit used to hang on a
          divided footer row of its own, three lines below the pill it belongs
          beside, costing every card 43pt of height to say one word.

          The card's own tap target is a SIBLING of those two rather than
          their parent: a pressable nested inside the card button is how "it
          opened her profile instead of editing her" happens. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
        <Pressable testID={`course-member-${member.id}`}
          onPress={() => router.push({ pathname: '/member/[id]', params: { id: member.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${member.name}, ${inactive ? 'inactive' : 'active'}. ${
            noEmail ? 'No email on file, not in follow-up' : member.emails[0]?.address ?? ''
          }. Missed ${member.missed}, consecutive ${member.streak}`}
          style={({ pressed }) => ({
            flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10,
            opacity: pressed ? 0.7 : 1,
          })}>
          <View style={{
            width: 34, height: 34, borderRadius: 17, backgroundColor: tint,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.onAccent }}>
              {initials(member.name)}
            </Text>
          </View>
          {/* minWidth 0 is what makes the ellipsis happen. The default minimum
              of a flex child is its CONTENT, so a long address pushed the
              status pill and the edit button off the right edge instead of
              truncating -- which is the one thing a roster of email addresses
              is guaranteed to contain. */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{
              fontSize: 14, fontWeight: '700', color: theme.fgStrong,
            }}>{member.name}</Text>
            <Text numberOfLines={1} style={{
              fontSize: 11.5, marginTop: 2,
              color: noEmail ? dangerInk : theme.muted,
            }}>
              {noEmail ? 'No email on file · not in follow-up' : member.emails[0]?.address ?? ''}
            </Text>
            <Text numberOfLines={1} style={{
              fontSize: 11, marginTop: 1, fontVariant: ['tabular-nums'],
              color: heavy ? dangerInk : theme.dim,
            }}>
              {`Missed ${weekLabel}: ${member.missed} · consecutive ${member.streak}`}
            </Text>
          </View>
        </Pressable>

        {/* The pill still STATES the status in a word and an icon (guardrail
            3); it is now also how the status is changed. Its label spells out
            what the tap does, because a pill reading "Active" that means
            "make her inactive" is a control nobody can read. */}
        <Pressable testID={`course-member-status-${member.id}`}
          onPress={() => setConfirmStatus(true)}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          accessibilityLabel={inactive
            ? `${member.name} is inactive. Mark her active.`
            : `${member.name} is active. Mark her inactive.`}
          hitSlop={6}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 4,
            minHeight: 30, paddingHorizontal: 8, borderRadius: RADIUS.pill,
            backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
            opacity: pressed || saving ? 0.6 : 1,
          })}>
          <Icon name={inactive ? 'pause_circle' : 'check_circle'} size={13} color={statusInk} />
          <Text style={{ fontSize: 9.5, fontWeight: '800', color: statusInk }}>
            {inactive ? 'Inactive' : 'Active'}
          </Text>
        </Pressable>

        <Pressable testID={`course-member-edit-${member.id}`}
          onPress={() => router.push({ pathname: '/member/edit', params: { id: member.id } })}
          accessibilityRole="button"
          accessibilityLabel={noEmail ? `Add an email for ${member.name}` : `Edit ${member.name}`}
          hitSlop={6}
          style={({ pressed }) => ({
            width: 32, height: 30, borderRadius: RADIUS.sm,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: statusSurface(noEmail ? dangerInk : theme.accent).bg,
            borderWidth: 1, borderColor: statusSurface(noEmail ? dangerInk : theme.accent).border,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name={noEmail ? 'mail_off' : 'edit'} size={15}
            color={noEmail ? dangerInk : theme.accentInk} />
        </Pressable>
      </View>

      {/* ------------------------------------------ the two no-email actions
          A name with no address reached the register one of two ways: she is
          somebody new who has not given one, or she is somebody ALREADY on
          the register under a different display name. The two buttons are
          those two answers, and each says which one it is.

          They sit on their own row rather than beside the status pill: both
          labels are sentences, and squeezed in beside an avatar and a pill
          they truncate to "Add as..." / "Add display..." -- two buttons that
          read the same are worse than one. */}
      {noEmail ? (
        <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: 11 }}>
          <Pressable testID={`course-member-add-new-${member.id}`}
            onPress={() => router.push({
              pathname: '/member/edit', params: { name: member.name } })}
            accessibilityRole="button"
            accessibilityLabel={`Add ${member.name} as a new member`}
            style={({ pressed }) => ({
              flex: 1, minHeight: 34, borderRadius: RADIUS.sm,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
              paddingHorizontal: 8,
              backgroundColor: statusSurface(theme.accentInk).bg,
              borderWidth: 1, borderColor: statusSurface(theme.accentInk).border,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Icon name="person_add" size={14} color={theme.accentInk} />
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: theme.accentInk }}>
              Add as new member
            </Text>
          </Pressable>

          <Pressable testID={`course-member-add-alias-${member.id}`}
            onPress={() => setLinking(true)}
            disabled={linkingSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: linkingSave }}
            accessibilityLabel={`Add ${member.name} as a display name for an existing member`}
            style={({ pressed }) => ({
              flex: 1, minHeight: 34, borderRadius: RADIUS.sm,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
              paddingHorizontal: 8,
              backgroundColor: theme.surface2,
              borderWidth: 1, borderColor: theme.lineStrong,
              opacity: pressed || linkingSave ? 0.6 : 1,
            })}>
            <Icon name="link" size={14} color={theme.fg} />
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: theme.fg }}>
              {linkingSave ? 'Saving…' : 'Add display name to existing member'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Every member on the register, searched by the operator -- nothing is
          guessed from the name. Selected by member_id, never by label: two
          members can share a name, and attaching a display name to the wrong
          one is exactly what the import would then act on. */}
      <SearchPicker
        open={linking}
        onClose={() => setLinking(false)}
        placement="top"
        title={`Who is “${member.name}”?`}
        placeholder="Search by name"
        options={allMembers
          .filter(m => m.id !== member.id)
          .map(m => ({ label: m.name, meta: `${m.course} · ${m.branch}`, value: m.id }))}
        confirmLabel="Add as display name"
        busy={linkingSave}
        /* WHAT IT WILL DO, naming both halves. The attendance move is the
           half nobody would guess from the button, and it is the half that
           cannot be undone by tapping something else. */
        confirmNote={chosen =>
          `“${member.name}” becomes a display name for ${chosen.label}, and every class `
          + `${member.name} was marked present at moves across to her. `
          + `${member.name} is then retired — the same person is not on the register twice.`}
        onSelect={memberId => {
          const chosen = allMembers.find(m => m.id === memberId);
          if (!chosen || linkingSave) return;
          void (async () => {
            setLinkingSave(true);
            try {
              const result = await mergeMemberInto(member.id, chosen.id);
              setLinking(false);
              flash(dataSource === 'live'
                ? `“${member.name}” is now a display name for ${chosen.name}`
                  + (result.attendance_moved > 0
                      ? ` · ${result.attendance_moved} attendance record${result.attendance_moved === 1 ? '' : 's'} moved`
                      : '')
                : `“${member.name}” merged into ${chosen.name} on this device only. The academy database is not configured.`,
                dataSource === 'live' ? 'ok' : 'warn');
            } catch (err) {
              // Every refusal here is a real answer about the register -- the
              // name already points at somebody, she carries an address of her
              // own -- not a glitch to swallow. The picker stays OPEN on a
              // failure, so the message lands next to what caused it.
              flash(err instanceof Error ? err.message : MERGE_FAILED, 'warn');
            } finally {
              setLinkingSave(false);
            }
          })();
        }}
        emptyNote="No member matches that. Add her as a new member instead — course and branch come from this course." />

      {/* What the mark DOES, in both directions, because "inactive" on its own
          could mean deleted, paused or unenrolled -- and which of those it is
          decides whether anybody dares tap it. */}
      <ConfirmDialog
        open={confirmStatus}
        onClose={() => setConfirmStatus(false)}
        title={inactive ? `Mark ${member.name} active?` : `Mark ${member.name} inactive?`}
        body={inactive
          ? 'She goes back into the follow-up rule from now on, and is listed and written to again when she misses sessions. Her enrolment and her attendance history are unchanged — they never went anywhere.'
          : 'She stays on the roster and her attendance goes on being recorded, but she is left out of the follow-up rule: she will not be listed for follow-up and nothing will be sent to her. Her enrolment and her history are untouched, and marking her active again puts her straight back. Recorded in the audit log.'}
        cancelLabel="Cancel"
        confirmLabel={saving ? 'Saving…' : inactive ? 'Mark active' : 'Mark inactive'}
        onConfirm={() => { void applyStatus(); }} />
    </View>
  );
}

/**
 * Under the shell, not instead of it. This screen is pushed on the root
 * stack, so it is not one of the tab navigator's own and wore no academy
 * header and no Home · Reports · More pill until ShellScreen drew them.
 */
export default function CourseDetail() {
  return <ShellScreen><CourseDetailBody /></ShellScreen>;
}
