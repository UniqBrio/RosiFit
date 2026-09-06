import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Muted, Label, Button, Skeleton, ErrorState } from '../../src/components/ui';
import { Field } from '../../src/components/Field';
import { DateField } from '../../src/components/DateTimePicker';
import { iso } from '../../src/data/period';
import { Icon } from '../../src/components/Icon';
import { AnchoredPicker } from '../../src/components/Sheet';
import { useAnchor } from '../../src/components/AnchoredPanel';
import { FormDialog } from '../../src/components/FormDialog';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../../src/theme/tokens';
import { DAY_NAMES, type MemberStatus } from '../../src/data/mock';
import { memberWeekdays, openingDays } from '../../src/data/memberDays';
import { useCourses, useMembers } from '../../src/data/hooks';
import { createMember, updateMember, setMemberStatus } from '../../src/data/repository';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * The two answers this form offers for `members.status`.
 *
 * The column's CHECK (0006) allows a third, 'paused', and no screen has ever
 * offered it: `follow_up_candidates()` (0009) passes 'active' and nothing
 * else, so paused and inactive are the SAME fact to every part of the app
 * that acts on the column. Offering a third word here would be inventing a
 * distinction the system does not make. A record that already holds 'paused'
 * reads as Inactive, exactly as the course roster's pill already draws it.
 */
/**
 * SPACE picks a radio -- the ARIA pattern says so, and CP-22 after it.
 *
 * React Native Web's Pressable answers Enter and lets Space through to the
 * page, where it scrolls instead: verified on the built page, where the
 * keydown arrived at the element and no press followed it. React Native's own
 * Pressable types carry no keyboard event, because most platforms have no
 * keyboard, so the handler is typed here and spread in rather than cast at
 * the call site. Picking is idempotent, so a browser that does synthesise the
 * press as well lands on the same value.
 */
const spaceSelects = (pick: () => void) => ({
  onKeyDown: (e: { nativeEvent: { key: string }; preventDefault: () => void }) => {
    if (e.nativeEvent.key !== ' ') return;
    e.preventDefault();
    pick();
  },
}) as object;

const STATUS_CHOICES: { value: MemberStatus; label: string; icon: string; meaning: string }[] = [
  { value: 'active', label: 'Active', icon: 'check_circle',
    meaning: 'In the follow-up rule' },
  { value: 'inactive', label: 'Inactive', icon: 'pause_circle',
    meaning: 'Left out of the follow-up rule' },
];

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
 * C-70/C-73: no phone number is held for members -- it was never used to
 * identify anyone. Aliases are what the Meet CSV matches on; emails are
 * several with exactly one primary. An address is REQUIRED on both forms
 * (06-Sep-2026, the same rule the member file already enforces): a member
 * with no address cannot be written to. A member the attendance import
 * created has none, and that is why the upload offers two ways out of it --
 * add her as a new member, or make the name a display name of somebody
 * already on the register; editing her is the third, and it asks for the
 * address before it saves anything.
 */
export default function MemberEdit() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  // `name` PREFILLS the add form. It is how "Add as new member" on a
  // no-email card opens this dialog already carrying the display name the
  // register knows her by, instead of asking somebody to retype a name that
  // is on the screen they just came from. Ignored when `id` is present --
  // an existing member's name comes from her record, never from a URL.
  const { id, state: forced, name: prefill } = useLocalSearchParams<
    { id?: string; state?: string; name?: string }>();

  /**
   * WHICH form this is, decided by the ROUTE and by nothing else.
   *
   * It was decided by `existing` -- the RESULT of the lookup below -- so one
   * `null` stood for three different things: no id was passed (Add), her
   * record has not arrived yet, and her id is not on the register. Two of
   * those are not "Add", and answering them with the Add form is RC-021.
   */
  const editing = typeof id === 'string' && id.length > 0 ? id : null;

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
  const existing = editing ? (roster.data ?? []).find(m => m.id === editing) ?? null : null;

  /**
   * The three answers that are NOT the Add form, named separately because
   * they are not the same answer: wait, try again, and she is gone.
   */
  const pending = editing !== null && roster.state === 'loading';
  const failed = editing !== null && roster.state === 'error';
  const missing = editing !== null && roster.state === 'ready' && !existing;
  /** Nothing is offered for saving until her record is actually in hand. */
  const unresolved = pending || failed || missing;

  // The courses she can join are the LIVE ones, not the fixture list: she is
  // enrolled into a course_offerings row, and a name picked from a hardcoded
  // list names nothing the database has.
  const courses = useCourses();
  const courseList = courses.data ?? [];

  const [name, setName] = useState(existing?.name ?? (editing ? '' : prefill ?? ''));
  const [course, setCourse] = useState(existing?.course ?? '');
  const [branch, setBranch] = useState(existing?.branch ?? '');
  // Today, on the ADD form only. Almost every member is entered on the day
  // she walks in, so a blank field made the common case a date-picker trip
  // and left `joined_on` null whenever it was skipped. The EDIT form keeps it
  // blank: it does not save this field, and today's date on a record that
  // joined last year reads as a fact it isn't.
  const [joined, setJoined] = useState(editing ? '' : iso(new Date()));
  const [aliases, setAliases] = useState<string[]>(existing?.aliases ?? []);
  const [aliasDraft, setAliasDraft] = useState('');
  const [emails, setEmails] = useState(existing?.emails ?? []);
  const [emailDraft, setEmailDraft] = useState('');
  const [days, setDays] = useState<string[]>([]);
  /**
   * Her status as this form currently proposes it -- a PENDING value like
   * every other field here, discarded by Cancel and written by Save. The
   * roster pill (app/course/[id].tsx) writes on the tap instead; that is the
   * difference between a control that IS the decision and a field on a form
   * that has a Save button under it.
   *
   * 'active' is the placeholder for the Add form, which does not show this
   * control at all -- create_member (0016) inserts 'active' itself.
   */
  const [status, setStatus] = useState<MemberStatus>('active');
  const [picker, setPicker] = useState<null | 'course' | 'branch'>(null);
  // The fields the two lists hang under, measured at the press.
  const courseRow = useAnchor();
  const branchRow = useAnchor();
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
    // Seeded HERE and not by useState, for the same reason as every field
    // above it, and under the same once-only guard: a refetch landing behind
    // a pick must not undo the pick. A stored 'paused' seeds the Inactive
    // choice, which is what it means.
    setStatus(existing.status === 'active' ? 'active' : 'inactive');
    setSeeded(true);
  }, [seeded, existing]);

  const chosenCourse = courseList.find(c => c.name === course) ?? null;
  // Only branches where this course actually RUNS: the pair is the offering,
  // and a branch with no offering is not somewhere she can be enrolled.
  const branchOptions = chosenCourse?.offerings.map(o => o.branch) ?? [];
  const offering = chosenCourse?.offerings.find(o => o.branch === branch) ?? null;

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  // Her name and an address are the fields of HERS the save needs (C-70/C-73;
  // requests/2026-09-06-add-member-email-required.md, both forms). A member
  // with no offering cannot be enrolled, and an unenrolled member is expected
  // at no session and appears in no follow-up list -- so the offering is
  // required too, and the form says which piece is missing.
  const valid = name.trim().length > 0 && !!offering && emails.length > 0;

  /**
   * What her record HOLDS, in the two words this form offers.
   *
   * Folding 'paused' into 'inactive' here is what stops the Save writing a
   * value nobody picked: a paused member seeds the Inactive choice, and if
   * that choice is simply left alone the form must conclude nothing changed
   * rather than quietly rewriting her column on the way past. She becomes
   * 'inactive' only by somebody moving the pick to Active and back.
   */
  const storedStatus: MemberStatus = !existing ? 'active'
    : existing.status === 'active' ? 'active' : 'inactive';
  const statusChanged = !!existing && status !== storedStatus;

  // days she may pick are only days her course's offerings actually run
  const courseDays = useMemo(() => {
    const set = new Set<string>();
    (offering ? [offering] : chosenCourse?.offerings ?? [])
      .forEach(o => o.weekdays.forEach(d => set.add(DAY_NAMES[d])));
    return set;
  }, [chosenCourse, offering]);

  /**
   * Her own days, as they apply to THIS enrolment.
   *
   * An override is a subset of the days her offering runs (0006), so moving
   * her to another course leaves it an override on days that course may not
   * run at all -- which update_member refuses (0027). Reading it only while
   * the form still shows the enrolment it was written against is what makes
   * "move her course" and "keep her days" two separate decisions.
   */
  const ownDays = existing && course === existing.course && branch === existing.branch
    ? existing.weekdays
    : null;

  /**
   * BOTH forms open on the days already in force. Nobody re-picks them.
   *
   * She joins a course to attend the days it runs, so making somebody tick
   * them one by one asks her to re-state the course she just chose. Add opens
   * on every day the course runs; Edit opens on HER days when she has an
   * override and on the course's when she follows it. Days come OFF this row.
   *
   * Seeded on the course|branch identity and nothing else: the union of a
   * course's offerings narrows to one offering's days when the branch lands,
   * moving her to another course re-seeds from the new one, and a re-render
   * or a refetch must never undo a day just taken off.
   *
   * The pickers deliberately do NOT clear this row themselves. A clear that
   * the picker performs on every selection and a re-seed that only a CHANGED
   * key performs are two mechanisms that agree only while the value changes:
   * re-pick the course or branch already showing and the clear happens, the
   * re-seed does not, and the row goes blank with nothing left to refill it
   * (RC-020).
   */
  const seedKey = editing && !existing ? null : `${course}|${branch}`;
  const [seededDays, setSeededDays] = useState<string | null>(null);
  useEffect(() => {
    if (seedKey === null || seededDays === seedKey) return;
    setDays(openingDays(courseDays, ownDays));
    setSeededDays(seedKey);
  }, [seedKey, seededDays, courseDays, ownDays]);

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
    // Her record was asked for and is not in hand. There is nothing to save,
    // and taking the create path here writes a SECOND record for somebody
    // already on the register (RC-012's hazard, RC-021's route to it).
    if (editing && !existing) return;
    setSaving(true);
    setRefusal(null);
    // the primary address goes first; both RPCs make the first one primary,
    // so the ORDER here is the meaning
    const addresses = [...emails].sort((a, b) => Number(b.primary) - Number(a.primary))
      .map(e => e.address);
    // null means she follows the offering's days, which is not the same as
    // an empty list -- and a row still on its seeded default is one of the
    // ways of saying it (src/data/memberDays.ts)
    const weekdays = memberWeekdays(days, courseDays, !ownDays);
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
        /**
         * Her status is a SECOND write because it has to be. update_member
         * (0027) does not touch the column, and set_member_status (0031) is
         * the only path that stamps `status_changed_at` and `updated_by`
         * from the signed-in actor -- which is what makes the audit row name
         * who took her off the register. Folding it into update_member would
         * be a migration, and a bigger claim than this form is making.
         *
         * It runs only when the pick differs from her record, and only AFTER
         * her details landed: a refusal here is about the STATUS alone, and
         * "nothing has been saved" would be a lie about the fields that just
         * went in. So this failure gets its own sentence and the form stays
         * open holding it.
         */
        if (statusChanged) {
          try {
            await setMemberStatus(existing.id, status);
          } catch (err) {
            // The pick goes back to what her record actually holds, so the
            // form stops showing a change that did not happen.
            setStatus(storedStatus);
            const why = err instanceof Error
              ? err.message.replace(/\s*Nothing has been saved\.\s*$/, '')
              : 'Her status could not be changed';
            setRefusal(`${why}. Her other details were saved; she is still ${storedStatus}.`);
            return;
          }
        }
        const first = name.trim().split(' ')[0];
        // Moving her course is the one change with consequences beyond this
        // form -- she is expected somewhere else from today -- so it is said
        // rather than folded into a generic "saved".
        const said = moved ? `${first} moved to ${course} · ${branch}` : `${first} saved`;
        // Her status is the other one, and for the same reason: it decides
        // whether the academy writes to her at all.
        flash(statusChanged
          ? `${said} · ${status === 'active' ? 'active again' : 'now inactive'}`
          : said);
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

  const title = editing ? 'Edit member' : 'Welcome a new member';
  const subtitle = !editing ? 'She joins a course at one branch'
    : existing ? `${existing.name} · ${existing.course}`
    : pending ? 'Fetching her record'
    : 'Her record is not in hand';

  /** The one line under the footer: what is missing, or what will be saved. */
  const hint = !name.trim()
      ? 'Her name and an email address are required'
      : !course ? 'Choose the course she joins'
      : !offering ? `Choose the branch — ${course} runs at ${branchOptions.length || 'no'} of them`
      : !emails.length ? 'Add her email address — follow-ups are sent there'
      : `${course} · ${branch}`;

  return (
    <FormDialog
      title={title} subtitle={subtitle}
      closeTestID="member-close" cancelTestID="member-cancel"
      confirmTestID={editing ? 'member-save' : 'member-add'}
      confirmLabel={saving ? (editing ? 'Saving…' : 'Adding…') : editing ? 'Save Changes' : 'Add Member'}
      /* No footer while her record is not in hand: a Save under a skeleton
         offers to write a form nobody has seen yet, and a Save under "she is
         not on the register" offers to create her again. */
      onConfirm={unresolved ? undefined : () => void save()}
      confirmDisabled={!valid || saving}
      hint={unresolved ? undefined : hint}
      overlays={<>
        {/* Each list opens UNDER its field, as wide as the field, with the
            rest of the form still in view -- the way Joined on already
            does. The sheet these replaced covered the form the choice was
            being made for. */}
        <AnchoredPicker open={picker === 'course'} onClose={() => setPicker(null)}
        label="Choose a course" placeholder="Search courses"
        anchor={courseRow.anchor} testID="member-course-list"
        options={courseList.map(c => ({
          label: c.name,
          meta: c.offerings.length ? `${c.offerings.length} branch${c.offerings.length > 1 ? 'es' : ''}` : 'no branch yet',
        }))}
        value={course}
        emptyNote="No course has been added yet. A member joins a course at a branch, so add the course first."
        onSelect={l => {
          // Only a CHANGE has consequences. Her branch belongs to the OLD
          // course, so a real change has to drop it -- but re-picking the
          // course already showing changed nothing, and dropping her branch
          // (and the days that follow it) for that is the picker charging
          // the cost of a change that never happened (RC-020).
          if (l !== course) { setCourse(l); setBranch(''); }
          setPicker(null);
        }} />
      <AnchoredPicker open={picker === 'branch'} onClose={() => setPicker(null)}
        label="Choose a branch" placeholder="Search branches"
        anchor={branchRow.anchor} testID="member-branch-list"
        options={branchOptions.map(label => ({ label }))} value={branch}
        emptyNote={course
          ? `${course} does not run at any branch yet. Add an offering for it and she can join there.`
          : 'Choose her course first — the branches are the ones that course runs at.'}
        onSelect={l => { setBranch(l); setPicker(null); }} />
      </>}
    >
      {pending ? (
        <Skeleton lines={7} />
      ) : failed ? (
        <ErrorState onRetry={roster.retry}
          message={roster.error ?? 'Her record could not be read. Nothing has been changed.'} />
      ) : missing ? (
        <ErrorState onRetry={() => router.back()}
          message="That member is not on the register. She may have been removed since this screen was opened." />
      ) : (
        <>
      <Field label="Her name" required value={name} onChange={setName} placeholder="e.g. Anitha Rajesh" />

      <Label required>Course</Label>
      <PickRow testID="member-course" icon="school" value={course || 'Choose a course'} muted={!course}
        anchorRef={courseRow.ref}
        onPress={() => courseList.length
          ? (courseRow.measure(), setPicker('course'))
          : flash(courses.state === 'loading'
              ? 'The course list is still loading'
              : 'No course has been added yet — a member joins a course at a branch', 'warn')} />
      <Label required style={{ marginTop: SPACE.md }}>Branch</Label>
      {/* The branch list is the branches THIS course runs at, so it cannot be
          opened before the course is chosen -- and picking a pair that has no
          offering is how she would end up enrolled in nothing. */}
      <PickRow testID="member-branch" icon="apartment" value={branch || 'Choose a branch'} muted={!branch}
        anchorRef={branchRow.ref}
        onPress={() => !course
          ? flash('Choose her course first — the branches are the ones that course runs at', 'warn')
          : branchOptions.length
            ? (branchRow.measure(), setPicker('branch'))
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

      {/* ------------------------------------------------- status (0031)
          Only on the EDIT form. A member being created is created active
          (create_member, 0016), and a status control on a form that is
          welcoming somebody asks a question nobody has. */}
      {existing ? (
        <>
          <Label style={{ marginTop: SPACE.xl }}>Status</Label>
          <Muted style={{ marginTop: 4 }}>
            Only an active member is reached by the follow-up rule. Her enrolment, her sessions
            and her attendance history are not touched either way.
          </Muted>
          <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}
            accessibilityRole="radiogroup" accessibilityLabel="Status">
            {STATUS_CHOICES.map(choice => {
              const on = status === choice.value;
              // The word and the icon carry the status (guardrail 3); the
              // radio glyph carries which one is PICKED, so neither fact
              // rests on colour alone.
              const tone = choice.value === 'active' ? ink('present') : theme.dim;
              return (
                <Pressable key={choice.value} testID={`member-status-${choice.value}`}
                  onPress={() => setStatus(choice.value)}
                  {...spaceSelects(() => setStatus(choice.value))}
                  accessibilityRole="radio"
                  // `aria-checked`, not `accessibilityState` -- the same
                  // React Native Web 0.21 hole Dropdown.tsx documents, and
                  // verified the same way here: the built page rendered
                  // role="radio" with no checked state at all, so a screen
                  // reader announced both choices as unpicked. The visible
                  // row carries the answer in a filled radio glyph and an
                  // accent border; this is that fact reaching the
                  // accessibility tree.
                  aria-checked={on}
                  accessibilityLabel={`${choice.label} — ${choice.meaning}`}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                    minHeight: TAP_MIN, padding: SPACE.md, borderRadius: RADIUS.md,
                    backgroundColor: theme.surface,
                    borderWidth: 1, borderColor: on ? theme.accent : theme.line,
                  }}>
                  <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'}
                    size={19} color={on ? theme.accentInk : theme.dim} />
                  <Icon name={choice.icon} size={17} color={tone} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>
                      {choice.label}
                    </Text>
                    <Text style={{ fontSize: 10.5, marginTop: 2, color: theme.muted }}>
                      {choice.meaning}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

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
      <Label required style={{ marginTop: SPACE.xl }}>Email addresses</Label>
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
            : `Add her email address — it is where every follow-up is sent, and she cannot be ${editing ? 'saved' : 'added'} without one.`}
        </Muted>
      </View>

      {/* ----------------------------------------------- her own days */}
      <Label style={{ marginTop: SPACE.xl }}>Her own days — optional</Label>
      <Muted style={{ marginTop: 4 }}>
        {/* Three states, not two. With no course chosen `course` is the empty
            string, and the old sentence began " has no offering running yet"
            -- a claim about nothing, with a hole where the name goes. */}
        {courseDays.size
          ? ownDays
            ? `These are her own days, not the course's. ${course} runs ${[...courseDays].join(', ')} — clear the row and she follows all of them again.`
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

      {/* The other consequence outside this form, said the same way and for
          the same reason. "Inactive" on its own could mean deleted, paused
          or unenrolled, and which of those it is decides whether anybody
          dares pick it -- so the sentence spells out what Save will do, in
          whichever direction it is about to go. The roster pill says the
          same thing in a confirmation, because it writes on the tap; here
          the Save button is the confirmation. */}
      {statusChanged ? (
        <View style={{
          flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.xl, padding: SPACE.lg,
          borderRadius: RADIUS.md, backgroundColor: statusSurface(ink('awaiting')).bg,
          borderWidth: 1, borderColor: statusSurface(ink('awaiting')).border,
        }}>
          <Icon name={status === 'active' ? 'check_circle' : 'pause_circle'}
            size={19} color={ink('awaiting')} />
          <Muted style={{ flex: 1, color: theme.fg }}>
            {status === 'active'
              ? 'Saving puts her back into the follow-up rule: she is listed and written to again '
                + 'when she misses sessions. Her enrolment and her attendance history are unchanged — '
                + 'they never went anywhere.'
              : 'Saving leaves her out of the follow-up rule: she will not be listed for follow-up and '
                + 'nothing will be sent to her. She stays on the roster and her attendance goes on '
                + 'being recorded, her enrolment and her history are untouched, and picking Active '
                + 'again puts her straight back. Recorded in the audit log.'}
          </Muted>
        </View>
      ) : null}
        </>
      )}
    </FormDialog>
  );
}

function PickRow({ icon, value, onPress, muted, testID, anchorRef }:
  { icon: string; value: string; onPress: () => void; muted?: boolean; testID: string;
    /** the row the list hangs under -- see `useAnchor` */
    anchorRef?: React.Ref<View> }) {
  const { theme } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} ref={anchorRef}
      accessibilityRole="button" accessibilityLabel={value}
      accessibilityHint="Opens a list under the field"
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
