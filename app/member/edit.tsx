import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Muted, Label, Button } from '../../src/components/ui';
import { Field } from '../../src/components/Field';
import { DateField } from '../../src/components/DateTimePicker';
import { iso } from '../../src/data/period';
import { Icon } from '../../src/components/Icon';
import { SearchPicker } from '../../src/components/Sheet';
import { FormDialog } from '../../src/components/FormDialog';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../../src/theme/tokens';
import { DAY_NAMES } from '../../src/data/mock';
import { memberWeekdays } from '../../src/data/memberDays';
import { useCourses, useMembers } from '../../src/data/hooks';
import { createMember, updateMember } from '../../src/data/repository';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Add / Edit a member, as a DIALOG over the workspace.
 *
 * It was a pushed screen with the stack's own header. The canvas presents it
 * the way it presents Add Course -- a sheet with its own title, a subtitle
 * naming what it decides, a close that leaves without saving, and a pinned
 * Cancel/Save footer. The difference is not decoration: a pushed screen puts
 * the only way out in the chrome, so "Add Member" from a course looked like
 * navigation away from the course rather than a decision taken over it.
 *
 * C-70/C-73: her name is the only required field. No phone number is held for
 * members -- it was never used to identify anyone. Aliases are what the Meet
 * CSV matches on; emails are several with exactly one primary.
 */
export default function MemberEdit() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { id, state: forced } = useLocalSearchParams<{ id?: string; state?: string }>();

  /**
   * THE LIVE member, not the fixture.
   *
   * This was `MEMBERS.find(m => m.id === id)` against the fixture array. On
   * live data no real id is in it, so `existing` was always undefined and
   * "Edit" opened the ADD form -- with her name blank, titled "Welcome a new
   * member", and a Save that would have created a second record for somebody
   * already on the register.
   *
   * The list, the roster and this form now read one source (guardrail 1).
   */
  const roster = useMembers(forced);
  const existing = id ? (roster.data ?? []).find(m => m.id === id) ?? null : null;

  // The courses she can join are the LIVE ones, not the fixture list: she is
  // enrolled into a course_offerings row, and a name picked from a hardcoded
  // list names nothing the database has.
  const courses = useCourses();
  const courseList = courses.data ?? [];

  const [name, setName] = useState(existing?.name ?? '');
  const [course, setCourse] = useState(existing?.course ?? '');
  const [branch, setBranch] = useState(existing?.branch ?? '');
  // Today, on the ADD form only. Almost every member is entered on the day
  // she walks in, so a blank field made the common case a date-picker trip
  // and left `joined_on` null whenever it was skipped. The EDIT form keeps it
  // blank: it does not save this field, and today's date on a record that
  // joined last year reads as a fact it isn't.
  const [joined, setJoined] = useState(id ? '' : iso(new Date()));
  const [aliases, setAliases] = useState<string[]>(existing?.aliases ?? []);
  const [aliasDraft, setAliasDraft] = useState('');
  const [emails, setEmails] = useState(existing?.emails ?? []);
  const [emailDraft, setEmailDraft] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [picker, setPicker] = useState<null | 'course' | 'branch'>(null);
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  /**
   * Her record arrives AFTER the first render, so the fields cannot be seeded
   * by useState -- that runs once, while the roster is still loading, and
   * would leave the Edit form permanently blank.
   *
   * Seeded once and only once: `seeded` is not reset, so a keystroke is never
   * overwritten by a refetch landing behind it.
   */
  useEffect(() => {
    if (seeded || !existing) return;
    setName(existing.name);
    setCourse(existing.course);
    setBranch(existing.branch);
    setAliases(existing.aliases);
    setEmails(existing.emails);
    setSeeded(true);
  }, [seeded, existing]);

  const chosenCourse = courseList.find(c => c.name === course) ?? null;
  // Only branches where this course actually RUNS: the pair is the offering,
  // and a branch with no offering is not somewhere she can be enrolled.
  const branchOptions = chosenCourse?.offerings.map(o => o.branch) ?? [];
  const offering = chosenCourse?.offerings.find(o => o.branch === branch) ?? null;

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  // Her name is the only field SHE needs (C-70/C-73), but a member with no
  // offering cannot be enrolled, and an unenrolled member is expected at no
  // session and appears in no follow-up list -- so the offering is required
  // by the save, and the form says which piece is missing.
  const valid = name.trim().length > 0 && !!offering;

  // days she may pick are only days her course's offerings actually run
  const courseDays = useMemo(() => {
    const set = new Set<string>();
    (offering ? [offering] : chosenCourse?.offerings ?? [])
      .forEach(o => o.weekdays.forEach(d => set.add(DAY_NAMES[d])));
    return set;
  }, [chosenCourse, offering]);

  /**
   * ADD seeds her days from the course; EDIT does not.
   *
   * She joins a course to attend the days it runs, so making her tick them
   * one by one asks her to re-state the course she just chose. The row opens
   * with all of them on and she takes off the ones she will not attend.
   *
   * Re-seeded on the course|branch identity and nothing else: the union of a
   * course's offerings narrows to one offering's days when the branch lands,
   * and a re-render must never undo a day she has just taken off.
   *
   * Edit is deliberately excluded. Her saved override is not on the Member
   * record, so seeding that form from the COURSE would show days that are
   * not hers -- worse than the blank row it shows today.
   */
  const seedKey = existing ? '' : `${course}|${branch}`;
  const [seededDays, setSeededDays] = useState<string | null>(null);
  useEffect(() => {
    if (existing || seededDays === seedKey) return;
    setDays([...courseDays]);
    setSeededDays(seedKey);
  }, [existing, seedKey, seededDays, courseDays]);

  const addAlias = () => {
    const a = aliasDraft.trim();
    if (!a) return;
    if (aliases.some(x => x.toLowerCase() === a.toLowerCase())) {
      flash('That display name is already on her record', 'warn'); return;
    }
    setAliases(p => [...p, a]); setAliasDraft('');
  };

  const addEmail = () => {
    const e = emailDraft.trim().toLowerCase();
    if (!e) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { flash('That does not look like an address', 'warn'); return; }
    // the FIRST address becomes primary; there is always exactly one
    setEmails(p => [...p, { address: e, primary: p.length === 0 }]);
    setEmailDraft('');
  };

  /**
   * This used to flash "<name> added" and go back, having written nothing.
   * The save now WAITS for the database to answer and reports a refusal
   * instead of swallowing it -- a form that cannot tell a save from a
   * refusal is indistinguishable from one that works, until somebody goes
   * looking for the member.
   */
  const save = async () => {
    if (!valid || !offering || saving) return;
    setSaving(true);
    setRefusal(null);
    // the primary address goes first; both RPCs make the first one primary,
    // so the ORDER here is the meaning
    const addresses = [...emails].sort((a, b) => Number(b.primary) - Number(a.primary))
      .map(e => e.address);
    // null means she follows the offering's days, which is not the same as
    // an empty list -- and a row still on its seeded default is one of the
    // ways of saying it (src/data/memberDays.ts)
    const weekdays = memberWeekdays(days, courseDays, !existing);
    try {
      if (existing) {
        // The arrays are the WHOLE list, not a patch: a display name or an
        // address taken off this screen has to come off the record too, and
        // that is only true if what is sent is what is shown.
        const { moved } = await updateMember({
          id: existing.id,
          full_name: name.trim(),
          offering_id: offering.id,
          aliases, emails: addresses, weekdays,
        });
        // Moving her course is the one change with consequences beyond this
        // form -- she is expected somewhere else from today -- so it is said
        // rather than folded into a generic "saved".
        flash(moved
          ? `${name.trim().split(' ')[0]} moved to ${course} · ${branch}`
          : `${name.trim().split(' ')[0]} saved`);
      } else {
        await createMember({
          full_name: name.trim(),
          offering_id: offering.id,
          joined_on: joined || null,
          aliases, emails: addresses, weekdays,
        });
        flash(`${name.trim().split(' ')[0]} added · ${course} · ${branch}`);
      }
      router.back();
    } catch (e) {
      setRefusal(e instanceof Error ? e.message : 'The member could not be saved. Nothing has been saved.');
    } finally {
      setSaving(false);
    }
  };

  const title = existing ? 'Edit member' : 'Welcome a new member';
  const subtitle = existing
    ? `${existing.name} · ${existing.course}`
    : 'She joins a course at one branch';

  /** The one line under the footer: what is missing, or what will be saved. */
  const hint = !name.trim()
      ? 'Her name is all that is required'
      : !course ? 'Choose the course she joins'
      : !offering ? `Choose the branch — ${course} runs at ${branchOptions.length || 'no'} of them`
      : `${course} · ${branch}${emails.length ? '' : ' · no email, she will be excluded from sends'}`;

  return (
    <FormDialog
      title={title} subtitle={subtitle}
      closeTestID="member-close" cancelTestID="member-cancel"
      confirmTestID={existing ? 'member-save' : 'member-add'}
      confirmLabel={saving ? (existing ? 'Saving…' : 'Adding…') : existing ? 'Save Changes' : 'Add Member'}
      onConfirm={() => void save()}
      confirmDisabled={!valid || saving}
      hint={hint}
      overlays={<>
        <SearchPicker open={picker === 'course'} onClose={() => setPicker(null)}
        title="Choose a course" placeholder="Search courses"
        options={courseList.map(c => ({
          label: c.name,
          meta: c.offerings.length ? `${c.offerings.length} branch${c.offerings.length > 1 ? 'es' : ''}` : 'no branch yet',
        }))}
        value={course}
        emptyNote="No course has been added yet. A member joins a course at a branch, so add the course first."
        onSelect={l => {
          setCourse(l);
          // her branch and her days both belong to the OLD course; keeping
          // either would enrol her into an offering she was never shown
          setBranch('');
          setDays([]);
          setPicker(null);
        }} />
      <SearchPicker open={picker === 'branch'} onClose={() => setPicker(null)}
        title="Choose a branch" placeholder="Search branches"
        options={branchOptions.map(label => ({ label }))} value={branch}
        emptyNote={course
          ? `${course} does not run at any branch yet. Add an offering for it and she can join there.`
          : 'Choose her course first — the branches are the ones that course runs at.'}
        onSelect={l => { setBranch(l); setDays([]); setPicker(null); }} />
      </>}
    >
      <Field label="Her name" value={name} onChange={setName} placeholder="e.g. Anitha Rajesh" />

      <Label>Course</Label>
      <PickRow testID="member-course" icon="school" value={course || 'Choose a course'} muted={!course}
        onPress={() => courseList.length
          ? setPicker('course')
          : flash(courses.state === 'loading'
              ? 'The course list is still loading'
              : 'No course has been added yet — a member joins a course at a branch', 'warn')} />
      <Label style={{ marginTop: SPACE.md }}>Branch</Label>
      {/* The branch list is the branches THIS course runs at, so it cannot be
          opened before the course is chosen -- and picking a pair that has no
          offering is how she would end up enrolled in nothing. */}
      <PickRow testID="member-branch" icon="apartment" value={branch || 'Choose a branch'} muted={!branch}
        onPress={() => !course
          ? flash('Choose her course first — the branches are the ones that course runs at', 'warn')
          : branchOptions.length
            ? setPicker('branch')
            : flash(`${course} does not run at any branch yet`, 'warn')} />

      <View style={{ marginTop: SPACE.md }}>
        {/* No future joining date: a member cannot have started next week,
            and a picker that offers one invites the typo it then has to
            validate. */}
        <DateField label="Joined on" value={joined} onChange={setJoined}
          placeholder="When she started" max={iso(new Date())}
          testID="member-joined-on" />
      </View>

      <View style={{ flexDirection: 'row', gap: SPACE.sm, alignItems: 'flex-start', marginTop: -4 }}>
        <Icon name="lock" size={15} color={ink('present')} />
        <Muted style={{ flex: 1 }}>
          No phone number is held for members. It was never used to identify anyone.
        </Muted>
      </View>

      {/* ------------------------------------------------ aliases (C-71) */}
      <Label style={{ marginTop: SPACE.xl }}>Google Meet display names</Label>
      <Muted style={{ marginTop: 4 }}>
        The names that may appear in the attendance file. Adding one here means the file matches it
        to her automatically.
      </Muted>
      <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
        {aliases.map(a => (
          <View key={a} style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
            padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: theme.surface,
            borderWidth: 1, borderColor: theme.line,
          }}>
            <Icon name="badge" size={17} color={theme.accentInk} />
            <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>{a}</Text>
            <Pressable testID={`member-alias-remove-${a}`}
              onPress={() => setAliases(p => p.filter(x => x !== a))}
              accessibilityRole="button" accessibilityLabel={`Remove display name ${a}`}
              style={{ minHeight: TAP_MIN / 2, justifyContent: 'center' }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.muted }}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <AddRow testID="member-alias" value={aliasDraft} onChange={setAliasDraft}
        placeholder="e.g. Anitha R" onAdd={addAlias} />

      {/* -------------------------------------------------- emails (C-73) */}
      <Label style={{ marginTop: SPACE.xl }}>Email addresses</Label>
      <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
        {emails.map(e => (
          <View key={e.address} style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
            padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: theme.surface,
            borderWidth: 1, borderColor: e.primary ? theme.accent : theme.line,
          }}>
            <Pressable
              testID={`member-email-primary-${e.address}`}
              onPress={() => setEmails(p => p.map(x => ({ ...x, primary: x.address === e.address })))}
              accessibilityRole="radio" accessibilityState={{ selected: e.primary }}
              accessibilityLabel={`Make ${e.address} the primary address`}
              style={{ minHeight: TAP_MIN / 2, justifyContent: 'center' }}>
              <Icon name={e.primary ? 'radio_button_checked' : 'radio_button_unchecked'}
                size={19} color={e.primary ? theme.accentInk : theme.dim} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
                {e.address}
              </Text>
              <Text style={{ fontSize: 10.5, color: e.primary ? theme.accentInk : theme.muted, marginTop: 2 }}>
                {e.primary ? 'PRIMARY — sends go here' : 'kept on file'}
              </Text>
            </View>
            <Pressable
              testID={`member-email-remove-${e.address}`}
              onPress={() => setEmails(p => {
                const rest = p.filter(x => x.address !== e.address);
                // removing the primary promotes the next -- there is never
                // an address list with no primary
                return rest.length && !rest.some(x => x.primary)
                  ? rest.map((x, i) => ({ ...x, primary: i === 0 })) : rest;
              })}
              accessibilityRole="button" accessibilityLabel={`Remove ${e.address}`}
              style={{ minHeight: TAP_MIN / 2, justifyContent: 'center' }}>
              <Icon name="close" size={17} color={theme.muted} />
            </Pressable>
          </View>
        ))}
      </View>
      <AddRow testID="member-email" value={emailDraft} onChange={setEmailDraft}
        placeholder="anitha@gmail.com" onAdd={addEmail} />
      <View style={{ flexDirection: 'row', gap: SPACE.sm, alignItems: 'flex-start', marginTop: SPACE.sm }}>
        <Icon name={emails.length ? 'mark_email_read' : 'mail_off'} size={15}
          color={emails.length ? ink('present') : ink('absent')} />
        <Muted style={{ flex: 1 }}>
          {emails.length
            ? 'Follow-up emails go to the primary address only.'
            : 'With no address she is listed and counted as excluded from every send — never quietly dropped.'}
        </Muted>
      </View>

      {/* ----------------------------------------------- her own days */}
      <Label style={{ marginTop: SPACE.xl }}>Her own days — optional</Label>
      <Muted style={{ marginTop: 4 }}>
        {/* Three states, not two. With no course chosen `course` is the empty
            string, and the old sentence began " has no offering running yet"
            -- a claim about nothing, with a hole where the name goes. */}
        {courseDays.size
          ? existing
            ? `Leave blank and she follows the days ${course} offerings run — ${[...courseDays].join(', ')}. Only those days can be picked.`
            : `Every day ${course} runs is already on — ${[...courseDays].join(', ')}. Take off any she will not attend; leave them all on and she follows the course.`
          : course
            ? `${course} has no offering running yet, so there are no days to pick.`
            : 'Choose her course first — her days can only be days that course runs.'}
      </Muted>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: SPACE.md }}>
        {ALL_DAYS.map(d => {
          const allowed = courseDays.has(d);
          const on = days.includes(d);
          return (
            <Pressable key={d} testID={`member-day-${d}`}
              onPress={() => allowed
                ? setDays(p => on ? p.filter(x => x !== d) : [...p, d])
                : flash(course
                    ? `${course} does not run on ${d}`
                    : 'Choose her course first — its days decide hers', 'warn')}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !allowed }}
              accessibilityLabel={`${d}${allowed ? '' : ', not available'}`}
              style={{
                flex: 1, minHeight: TAP_MIN - 4, alignItems: 'center', justifyContent: 'center',
                borderRadius: RADIUS.sm,
                backgroundColor: !allowed ? theme.surface2 : on ? theme.accent : theme.surface,
                borderWidth: 1, borderColor: !allowed ? theme.line : on ? theme.accent : theme.lineStrong,
              }}>
              <Text style={{
                fontSize: 11.5, fontWeight: '700',
                color: !allowed ? theme.dim : on ? theme.onAccent : theme.fg,
              }}>{d}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* The refusal is SHOWN. The database's own words -- the display name
          that belongs to someone else, the expired subscription -- are what
          the operator can act on; swallowing them is what made this form
          report a save it never made. */}
      {refusal ? (
        <View style={{
          flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.xl, padding: SPACE.lg,
          borderRadius: RADIUS.md, backgroundColor: statusSurface(ink('absent')).bg,
          borderWidth: 1, borderColor: statusSurface(ink('absent')).border,
        }}>
          <Icon name="error" size={19} color={ink('absent')} />
          <Muted accessibilityLiveRegion="polite" style={{ flex: 1, color: theme.fg }}>{refusal}</Muted>
        </View>
      ) : null}

      {/* Moving her course is the one change on this form with a consequence
          outside it, so it is said BEFORE the tap rather than reported after.
          0027 ends the old enrolment yesterday and starts the new one today:
          the sessions she was already marked at stay where they are, and
          nothing already recorded moves with her. */}
      {existing && course && branch && (course !== existing.course || branch !== existing.branch) ? (
        <View style={{
          flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.xl, padding: SPACE.lg,
          borderRadius: RADIUS.md, backgroundColor: statusSurface(ink('awaiting')).bg,
          borderWidth: 1, borderColor: statusSurface(ink('awaiting')).border,
        }}>
          <Icon name="swap_horiz" size={19} color={ink('awaiting')} />
          <Muted style={{ flex: 1, color: theme.fg }}>
            {`She moves from ${existing.course} · ${existing.branch} to ${course} · ${branch} from today. `
             + 'Attendance already recorded stays against the sessions it was recorded at.'}
          </Muted>
        </View>
      ) : null}
    </FormDialog>
  );
}

function PickRow({ icon, value, onPress, muted, testID }:
  { icon: string; value: string; onPress: () => void; muted?: boolean; testID: string }) {
  const { theme } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={value}
      accessibilityHint="Opens a searchable list"
      style={{
        marginTop: 8, minHeight: TAP_MIN + 8, borderRadius: RADIUS.md,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
        paddingHorizontal: SPACE.lg, flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
      }}>
      <Icon name={icon} size={20} color={theme.accentInk} />
      {/* nothing chosen yet is a real state and is drawn as one, rather than
          as a value somebody has already picked */}
      <Text style={{ flex: 1, fontSize: 15, fontWeight: muted ? '400' : '600',
        color: muted ? theme.muted : theme.fgStrong }}>{value}</Text>
      <Icon name="arrow_drop_down" size={22} color={theme.muted} />
    </Pressable>
  );
}

function AddRow({ value, onChange, placeholder, onAdd, testID }:
  { value: string; onChange: (v: string) => void; placeholder: string;
    onAdd: () => void; testID: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm }}>
      <TextInput testID={`${testID}-input`}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={theme.muted} accessibilityLabel={placeholder}
        onSubmitEditing={onAdd}
        style={{
          flex: 1, minHeight: TAP_MIN + 2, borderRadius: RADIUS.md, paddingHorizontal: SPACE.lg,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
          color: theme.fgStrong, fontSize: 14, fontWeight: '600',
        }} />
      <Button testID={`${testID}-add`} label="+ Add" variant="secondary" onPress={onAdd} />
    </View>
  );
}
