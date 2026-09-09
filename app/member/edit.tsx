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
import { spaceSelects } from '../../src/components/keyboard';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../../src/theme/tokens';
import { DAY_NAMES, type MemberStatus } from '../../src/data/mock';
import { memberWeekdays, openingDays } from '../../src/data/memberDays';
import { useCourses, useMembers } from '../../src/data/hooks';
import { createMember, updateMember, setMemberStatus, setMemberActiveFrom } from '../../src/data/repository';
import { namesADisplayName } from '../../src/data/refusalCase';
import { inactiveFromProblem, dateInWords, dayBefore } from '../../src/data/inactiveFrom';
import { activeFromProblem } from '../../src/data/joined';
import { DATE_FORMAT_EXAMPLE } from '../../src/data/memberDate';

/** The format note that sits under a date field on this form. One string, so
 *  the two ends of the membership window cannot come to word it differently. */
const DATE_NOTE = `Dates read as ${DATE_FORMAT_EXAMPLE}.`;

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
 * The Active row's own words, named because TWO states of this form now show
 * them: the Edit pick below, and the Add form's toggle, which states the
 * status the create is about to write instead of offering a choice. One
 * source, so the two can never drift into calling one status two things.
 */
const ACTIVE_CHOICE = {
  value: 'active' as MemberStatus, label: 'Active', icon: 'check_circle',
  meaning: 'In the follow-up rule',
};

const STATUS_CHOICES: { value: MemberStatus; label: string; icon: string; meaning: string }[] = [
  ACTIVE_CHOICE,
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
  // NO NAME COMES FROM THE URL. A `name` param used to prefill the ADD form
  // for "Add as new member" on a no-email card; that button now opens HER
  // record by id, because she is already on the register and the create path
  // gave her a twin (07-Sep-2026). A name on the query string has no other
  // caller, and leaving the door open is how the twin comes back.
  // `courseId` is the course the Add was pressed FROM -- the course header
  // (app/course/[id].tsx) and the course-scoped roster (app/(tabs)/members.tsx)
  // have both sent it for as long as those buttons have existed. It is the
  // course_offerings PARENT id, matched against the live course list below.
  const { id, courseId, state: forced } = useLocalSearchParams<
    { id?: string; courseId?: string; state?: string }>();

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

  const [name, setName] = useState(existing?.name ?? '');
  const [course, setCourse] = useState(existing?.course ?? '');
  const [branch, setBranch] = useState(existing?.branch ?? '');
  // Today, on the ADD form only. Almost every member is entered on the day
  // she walks in, so a blank field made the common case a date-picker trip
  // and left `joined_on` null whenever it was skipped.
  //
  // The EDIT form opens EMPTY here and is seeded from her record below, for
  // the same reason every other field is: her record has not arrived on the
  // first render. It used to stay empty -- "the Edit form keeps it blank" --
  // and the reason given was that this form does not save the field. That
  // reasoning covered a defect: a member who joined in March opened a form
  // that said nothing about when she joined, on the one screen that shows
  // the rest of her record. Today's date is still never defaulted in on an
  // edit; what is shown is what the register holds.
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
  /**
   * FROM WHEN that status applies -- `members.inactive_from` (0045), ISO, or
   * '' for "no date on record".
   *
   * The whole of what this request adds. Her status could only ever say
   * "now", so a member who is active today and leaving next month had two
   * ways of being recorded and both were wrong: left active and remembered,
   * or marked inactive five weeks early and withheld follow-up she is still
   * owed. She is active on every day before this date and off the register
   * from it onward (src/data/inactiveFrom.ts).
   *
   * '' IS A REAL VALUE, not a missing one: it is what every member marked
   * inactive before 0045 carries, and it means the status applies on every
   * day. Left alone, it stays '' -- this form does not backfill a date onto
   * a record that never had one, because inventing one would claim she left
   * on a day nobody recorded.
   */
  const [inactiveFrom, setInactiveFrom] = useState('');
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
    // And FROM WHEN it applies. Null seeds '', which is the same fact said
    // the way a date field can hold it -- no date on record. It is not
    // seeded to today: a record that never carried a date must not acquire
    // one just because somebody opened the form.
    setInactiveFrom(existing.inactiveFrom ?? '');
    // The day she joined, ISO, exactly as members.joined_on holds it. The
    // record used to carry only the formatted month ("Mar 2026"), which a
    // date field cannot open on -- so this seeded nothing and the row read
    // as a date nobody had filled in. `joinedOn` is that column, carried
    // (src/data/repository.ts). Null stays '', which the row reads as "not
    // on record" rather than as an unknown day.
    setJoined(existing.joinedOn ?? '');
    setSeeded(true);
  }, [seeded, existing]);

  /**
   * The course she is being added TO, when the Add came from one.
   *
   * "Add Member" on a course header and on that course's roster both carry
   * `courseId`, and this form ignored it: the picker opened blank and the
   * course just left on screen had to be found and picked again -- on a form
   * that then refuses to save without it. Worse, nothing stopped the wrong
   * one being picked, which enrols her somewhere she never walked into.
   *
   * The id is resolved against the LIVE list, not trusted: a stale link to a
   * deleted course matches nothing and the row stays blank, which is the
   * truthful answer rather than a name the database no longer holds.
   *
   * ADD ONLY, and only into an EMPTY row -- the same two conditions the sole
   * branch default below carries, for the same reasons. An edit seeds her
   * stored course and this must never write over it, and a course already
   * picked is a decision this form does not get to revisit.
   */
  useEffect(() => {
    if (editing || course || !courseId) return;
    // `courses.data` and not `courseList`: the `?? []` fallback is a fresh
    // array on every render, which would re-run this on every render while
    // the list is still loading for no possible effect.
    const from = courses.data?.find(c => c.id === courseId);
    if (from) setCourse(from.name);
  }, [editing, course, courseId, courses.data]);

  const chosenCourse = courseList.find(c => c.name === course) ?? null;
  // Only branches where this course actually RUNS: the pair is the offering,
  // and a branch with no offering is not somewhere she can be enrolled.
  const branchOptions = chosenCourse?.offerings.map(o => o.branch) ?? [];
  const offering = chosenCourse?.offerings.find(o => o.branch === branch) ?? null;

  /**
   * One option is not a choice -- it is the answer, so the form gives it.
   *
   * A course that runs at a single branch still charged two taps for a row
   * with one line in it, and until they were spent `offering` was null, Add
   * Member stayed disabled and the hint asked for a branch the form could
   * already name (requests/2026-09-07-add-member-single-branch-default.md).
   *
   * Only ever into an EMPTY branch. On the Edit form her stored branch seeds
   * first and is never written over -- a member enrolled where her course no
   * longer runs keeps what her record says, and this default would otherwise
   * move her silently. `seeded` is that ordering, held explicitly: while an
   * edit is still waiting for her record, nothing is defaulted into it.
   *
   * Two or more options are left blank, deliberately: filling one of several
   * is picking for her. Zero options are left blank too -- there is nothing
   * to fill, and the row still says the course runs nowhere yet.
   */
  const soleBranch = branchOptions.length === 1 ? branchOptions[0] : null;
  useEffect(() => {
    if (!soleBranch || branch) return;
    if (editing && !seeded) return;
    setBranch(soleBranch);
  }, [soleBranch, branch, editing, seeded]);

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  // Her name and an address are the fields of HERS the save needs (C-70/C-73;
  // requests/2026-09-06-add-member-email-required.md, both forms). A member
  // with no offering cannot be enrolled, and an unenrolled member is expected
  // at no session and appears in no follow-up list -- so the offering is
  // required too, and the form says which piece is missing.
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
  /** Her stored date, in the shape the field holds it. '' is "no date". */
  const storedInactiveFrom = existing?.inactiveFrom ?? '';
  /**
   * The date the Save would WRITE -- '' whenever the pick is Active, because
   * coming back onto the register is not a dated act and
   * `members_inactive_from_needs_status` (0045) will not hold a date beside
   * an active status.
   */
  const wantedInactiveFrom = status === 'active' ? '' : inactiveFrom.trim();
  /**
   * A change is a change to the PAIR. Moving only the date -- "she is
   * leaving on the 30th, not the 12th" -- is a real edit, and a form that
   * measured the status alone would offer to save it and then write nothing.
   */
  const statusChanged = !!existing
    && (status !== storedStatus || wantedInactiveFrom !== storedInactiveFrom);

  /**
   * Why the date cannot be saved, or null. The same three refusals
   * `set_member_status` raises (src/data/inactiveFrom.ts), so the form does
   * not offer a Save the database is going to decline.
   *
   * A BLANK is not one of them. '' means "no date on record", which is what
   * every member marked inactive before 0045 carries and is a legal thing to
   * leave alone; the field only defaults to today when somebody actually
   * moves the pick to Inactive, so a blank that survives is one that was
   * already there.
   */
  const inactiveFromError = wantedInactiveFrom
    // The date the form is about to WRITE, not the one on her record (0057).
    // Both ends of the window are editable now, so validating the far end
    // against the stored near end would refuse a legal pair -- "she started
    // in March and leaves in April" typed into an empty record -- and accept
    // an illegal one where only the joining date moved.
    ? inactiveFromProblem(wantedInactiveFrom, joined.trim() || null)
    : null;

  /**
   * ACTIVE FROM (0057) -- the near end of the same window.
   *
   * Her stored day, the day the form would write, and whether those differ.
   * Shaped exactly like the status pair above, because it is the same kind of
   * fact: a date the Save has to send through its OWN write path, since
   * `update_member` (0027) takes no parameter for it.
   */
  const storedActiveFrom = existing?.joinedOn ?? '';
  const wantedActiveFrom = joined.trim();
  const activeFromChanged = !!existing && wantedActiveFrom !== storedActiveFrom;
  /**
   * Why it cannot be saved, or null -- the first two of the three refusals
   * `set_member_active_from` raises (src/data/joined.ts). The third, about
   * the earliest session she is recorded at, only the database can answer.
   *
   * A BLANK is not a refusal, for the same reason it is not one above: ''
   * means "no date on record", which is what every member imported before
   * 0049 carries, and leaving it alone must go on being allowed.
   */
  const activeFromError = existing && wantedActiveFrom
    ? activeFromProblem(wantedActiveFrom, wantedInactiveFrom || null, iso(new Date()))
    : null;

  // Her name and an address are the fields of HERS the save needs (C-70/C-73;
  // requests/2026-09-06-add-member-email-required.md, both forms). A member
  // with no offering cannot be enrolled, and an unenrolled member is expected
  // at no session and appears in no follow-up list -- so the offering is
  // required too, and the form says which piece is missing.
  const valid = name.trim().length > 0 && !!offering && emails.length > 0
    && !inactiveFromError && !activeFromError;

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

  /**
   * When the refusal is about a display name, the answer to it is to change
   * that name -- so the moment she starts changing it, the sentence on screen
   * is about a value the form no longer holds. It sat there accusing "ani"
   * while "anit" was being typed into the box above it
   * (requests/2026-09-07-display-name-refusal-clears-and-case.md).
   *
   * Cleared on all three gestures that change the name, because they are one
   * act: typing in the draft, committing a draft as a row, and removing a
   * row. Clearing on the keystroke but not on the removal would leave the
   * likeliest fix of all -- taking the clashing name off -- staring at the
   * refusal it just resolved.
   *
   * ONLY when it is about a display name. This one banner holds whichever
   * refusal came back -- an address already on somebody else, days the course
   * does not run, a subscription that is not writable -- and dismissing an
   * address clash because a display name was typed would take an unrelated
   * refusal off the screen before it had been read. That is the request read
   * literally: it asked for THIS message to go, not for the banner to empty.
   *
   * It clears the DISPLAY, not the fact. The database is still the thing that
   * decides, and Save asks it again; nothing here marks the name as free.
   */
  const clearRefusal = () => setRefusal(r => (r && namesADisplayName(r) ? null : r));

  /**
   * Picking a status, and the one thing the pick has to decide for itself:
   * WHEN.
   *
   * Moving to Inactive on a record that carries no date fills TODAY in,
   * because that is what the control meant before it had a date at all --
   * "she is off the register now" -- and a form that made somebody choose a
   * date to say the ordinary thing would have made the common case worse.
   * The field is right there and takes any other day.
   *
   * A date already in the box is left alone: re-picking Inactive after
   * setting the 30th must not throw the 30th away (RC-020's shape -- a
   * gesture that re-states a value is not a gesture that changes it).
   *
   * Moving to Active does NOT clear the box. Save writes null either way
   * (`wantedInactiveFrom`), and clearing it here would lose the date on a
   * mis-tap of a two-row radio group, with nothing left to put it back.
   */
  const pickStatus = (next: MemberStatus) => {
    setStatus(next);
    if (next !== 'active' && !inactiveFrom.trim()) setInactiveFrom(iso(new Date()));
  };

  const changeAliasDraft = (v: string) => { clearRefusal(); setAliasDraft(v); };

  const addAlias = () => {
    const a = aliasDraft.trim();
    if (!a) return;
    if (aliases.some(x => x.toLowerCase() === a.toLowerCase())) {
      flash('That display name is already on the record', 'warn'); return;
    }
    clearRefusal();
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
            await setMemberStatus(existing.id, status, wantedInactiveFrom || null);
          } catch (err) {
            // The pick goes back to what her record actually holds, so the
            // form stops showing a change that did not happen -- BOTH halves
            // of it, or the date would sit there as a change nobody made.
            setStatus(storedStatus);
            setInactiveFrom(storedInactiveFrom);
            const why = err instanceof Error
              ? err.message.replace(/\s*Nothing has been saved\.\s*$/, '')
              : 'The status could not be changed';
            setRefusal(`${why}. The other details were saved; the member is still ${storedStatus}.`);
            return;
          }
        }
        /**
         * ACTIVE FROM is a THIRD write, for the reason the status is a second
         * one: `update_member` (0027) takes no parameter for `joined_on`, and
         * `set_member_active_from` (0057) is the only path that moves it --
         * and, with it, the enrolment that has to open on the same day.
         *
         * AFTER the status, not before. `set_member_status` refuses an
         * inactive date earlier than her joining date, so a save that moves
         * BOTH ends forward -- "she actually started in March and leaves in
         * April" -- only goes through if the far end is written first.
         * Reversed, the new joining date would be measured against the OLD
         * inactive date and refused for a clash the save was fixing.
         *
         * Same failure posture as the status write: her details are already
         * in, so "nothing has been saved" would be a lie. The field goes back
         * to what her record holds and the form stays open holding the
         * sentence the database gave.
         */
        if (activeFromChanged && wantedActiveFrom) {
          try {
            await setMemberActiveFrom(existing.id, wantedActiveFrom);
          } catch (err) {
            setJoined(storedActiveFrom);
            const why = err instanceof Error
              ? err.message.replace(/\s*Nothing has been saved\.\s*$/, '')
              : 'The joining date could not be changed';
            setRefusal(`${why}. The other details were saved; the member is still on the register from ${
              storedActiveFrom ? dateInWords(storedActiveFrom) : 'no date on record'}.`);
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
        // A date still ahead of her is the one thing the short word would
        // get wrong: "now inactive" over a member who is on the register for
        // another five weeks is the misreading this request exists to stop.
        const stillToCome = status !== 'active' && wantedInactiveFrom > iso(new Date());
        flash(statusChanged
          ? `${said} · ${status === 'active' ? 'active again'
              : stillToCome ? `inactive from ${dateInWords(wantedInactiveFrom)}`
              : 'now inactive'}`
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
  const subtitle = !editing ? 'Joins a course at one branch'
    : existing ? `${existing.name} · ${existing.course}`
    : pending ? 'Fetching the record'
    : 'The record is not in hand';

  /** The one line under the footer: what is missing, or what will be saved. */
  const hint = !name.trim()
      ? 'Member name and an email address are required'
      : !course ? 'Choose the course to join'
      : !offering ? `Choose the branch — ${course} runs at ${branchOptions.length || 'no'} of them`
      : !emails.length ? 'Add an email address — follow-ups are sent there'
      // The Save is disabled for this too, so the line under it has to say
      // which field is holding it -- a dead button with "Prenatal Flow ·
      // Coimbatore" under it explains nothing.
      : inactiveFromError ? inactiveFromError
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
          ? `${course} does not run at any branch yet. Add an offering for it and the member can join there.`
          : 'Choose the course first — the branches are the ones that course runs at.'}
        onSelect={l => { setBranch(l); setPicker(null); }} />
      </>}
    >
      {pending ? (
        <Skeleton lines={7} />
      ) : failed ? (
        <ErrorState onRetry={roster.retry}
          message={roster.error ?? 'The record could not be read. Nothing has been changed.'} />
      ) : missing ? (
        <ErrorState onRetry={() => router.back()}
          message="That member is not on the register. They may have been removed since this screen was opened." />
      ) : (
        <>
      <Field label="Member name" autoFocus required value={name} onChange={setName} placeholder="e.g. Anitha Rajesh" />

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
          ? flash('Choose the course first — the branches are the ones that course runs at', 'warn')
          : branchOptions.length
            ? (branchRow.measure(), setPicker('branch'))
            : flash(`${course} does not run at any branch yet`, 'warn')} />

      <View style={{ marginTop: SPACE.md }}>
        {/* ------------------------------------------- active from (0057)
            "We have inactive from date selection but not active from — fix
            that."

            THIS FIELD USED TO BE READ-ONLY ON EDIT, and its hint said why:
            update_member (0027) took no parameter for the joining day, so a
            picker here would have accepted a change the form could not save,
            and a field that quietly discards what it was told is worse than
            one that says it is not editable. 0057 built the write path --
            set_member_active_from -- so the reason is gone and the picker is
            live.

            IT IS THE SAME COLUMN, RENAMED IN THE UI ONLY. `members.joined_on`
            is the day they go ON the register, which is what "Active from"
            names; pairing it with "Inactive from" below is what makes the two
            read as the ends of one window rather than as unrelated dates. The
            column itself is not renamed (0057 says why).

            DEFAULTS TO THE JOINING DAY ON RECORD, and takes a custom one --
            the Add form opens on today, the Edit form on whatever the record
            holds, and any other past day may simply be picked.

            NO FUTURE DAY, on either form: a member cannot have started next
            week, and a picker that offers one invites the typo it then has to
            validate. `max` also stops at the inactive date when there is one
            -- a joining day after a leaving day is what
            members_inactive_from_after_joined refuses outright, and the
            calendar greys it out rather than letting somebody pick it and
            read a refusal afterwards.

            AND THE FORMAT IS SAID BESIDE IT -- the requester's own ask on
            09-Sep-2026: "give same as info beside date field as that". This
            same date is written into the Reports export and typed back in
            through Bulk Import, and somebody who has only ever seen it in this
            picker has no other way of knowing which shape that file wants.
            Named on the Add form too, where the hint would otherwise be empty:
            the format is not a detail of editing, it is what dates look like
            here. */}
        <DateField label="Active from" value={joined} onChange={setJoined}
          placeholder={editing ? 'Not on record' : 'When they started'}
          max={wantedInactiveFrom && wantedInactiveFrom < iso(new Date())
            ? wantedInactiveFrom : iso(new Date())}
          error={activeFromError ?? undefined}
          hint={activeFromError ? undefined
            : editing
              ? 'The first day they are on the register — sessions are counted'
                + ` from it, and the enrolment moves with it. ${DATE_NOTE}`
              : DATE_NOTE}
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
            Only an active member is reached by the follow-up rule. Enrolment, sessions
            and attendance history are not touched either way, on either side of any date
            set here.
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
                  onPress={() => pickStatus(choice.value)}
                  {...spaceSelects(() => pickStatus(choice.value))}
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

          {/* ------------------------------------------ inactive from (0045)
              "A member is active today but wants to leave next month ... set
              a future inactive date"
              (requests/2026-09-07-member-inactive-from-date.md).

              Only under the Inactive pick, because it is that pick's own
              second half: an active member has no date to give, and a date
              beside Active is one `members_inactive_from_needs_status` will
              not hold.

              NO `max`. A future date is the whole request, so the picker
              that refuses one would refuse the only thing being asked for --
              which is the opposite of "Joined on" above, where a future date
              is a typo. `min` is her joining day: a departure before an
              arrival is the one date the database refuses outright, and the
              calendar greys it out rather than letting somebody pick it and
              read a refusal afterwards.

              The hint NAMES both consequences, in dates rather than in
              adjectives -- the last day she is still reached, and what
              carries on regardless. "Inactive" without those two facts is
              the ambiguity the roster's confirmation was written to remove,
              and this control is where it is now decided. */}
          {status !== 'active' ? (
            <View style={{ marginTop: SPACE.md }}>
              <DateField label="Inactive from" value={inactiveFrom} onChange={setInactiveFrom}
                placeholder="No date on record"
                min={existing.joinedOn ?? undefined}
                error={inactiveFromError ?? undefined}
                hint={inactiveFromError ? undefined
                  : inactiveFrom.trim()
                    ? `In the follow-up rule up to ${dateInWords(dayBefore(inactiveFrom.trim()))}`
                      + ` and left out from ${dateInWords(inactiveFrom.trim())}.`
                      + ' Enrolment, sessions and attendance are unchanged on both sides of it.'
                    // The format, beside the OTHER end of the same window --
                    // only where there is no date yet, because the sentence
                    // above already spells the month out in full and does not
                    // need telling how it is written.
                    : `No date on record — left out of the follow-up rule on every day. ${DATE_NOTE}`}
                testID="member-inactive-from" />
            </View>
          ) : null}
        </>
      ) : null}

      {/* --------------------------------------------- status (ADD state)
          "While adding member show active and inactive toggle by default it
          should be active if they want to set as inactive they can cliq on
          edit and det as inactive"
          (requests/2026-09-07-add-member-status-toggle-default-active.md).

          The toggle SHOWS her status; it does not set it. The requester put
          the setting on Edit in the same sentence, and asked for it again
          when the question was put directly -- "toggle on by default, on
          edit they can toggle off". The mechanism agrees: create_member
          (0016) inserts 'active' and takes no status, so a pickable control
          here would need a SECOND write after the create, and a create that
          lands while that write is refused leaves a member on the register
          in the state the form just said she was not in -- the partial
          failure ADR-025 has to describe for Edit, imported into the one
          form where nothing exists to reconcile it against yet.

          Shown-and-fixed makes no claim it cannot keep: it states what the
          create is about to do, which is the one thing this form knows for
          certain. It supersedes ADR-025's "The Add form does not ask" -- and
          it still does not ask. It answers.

          Only on a pure ADD. An edit still fetching her record shows nothing,
          exactly as before: her stored status is not in hand, and 'Active'
          there would be a guess about somebody who may be inactive. */}
      {!editing ? (
        <>
          <Label style={{ marginTop: SPACE.xl }}>Status</Label>
          <Muted style={{ marginTop: 4 }}>
            The member is added active, so the follow-up rule applies. To make them inactive, add
            them first, then open the record and use Edit.
          </Muted>
          <View testID="member-status-add" style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
            minHeight: TAP_MIN, padding: SPACE.md, borderRadius: RADIUS.md,
            marginTop: SPACE.md, backgroundColor: theme.surface,
            borderWidth: 1, borderColor: theme.line,
          }}>
            {/* The toggle, drawn ON. Its two colours are the Active pair this
                file already renders text with, so nothing unmeasured enters
                the build (guardrail 2), and both resolve per theme. */}
            <View style={{
              width: 40, height: 24, borderRadius: 12, padding: 2,
              justifyContent: 'center', alignItems: 'flex-end',
              backgroundColor: statusSurface(ink('present')).bg,
              borderWidth: 1, borderColor: statusSurface(ink('present')).border,
            }}>
              <View style={{
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: ink('present'),
              }} />
            </View>
            {/* The knob's position is not what says Active -- the word and
                the icon beside it do, in both themes (guardrail 3). */}
            <Icon name={ACTIVE_CHOICE.icon} size={17} color={ink('present')} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>
                {ACTIVE_CHOICE.label}
              </Text>
              <Text style={{ fontSize: 10.5, marginTop: 2, color: theme.muted }}>
                {ACTIVE_CHOICE.meaning}
              </Text>
            </View>
          </View>
        </>
      ) : null}

      {/* ------------------------------------------------ aliases (C-71) */}
      <Label style={{ marginTop: SPACE.xl }}>Google Meet display names</Label>
      <Muted style={{ marginTop: 4 }}>
        The names that may appear in the attendance file. Adding one here means the file matches it
        to the member automatically.
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
              onPress={() => { clearRefusal(); setAliases(p => p.filter(x => x !== a)); }}
              accessibilityRole="button" accessibilityLabel={`Remove display name ${a}`}
              style={{ minHeight: TAP_MIN / 2, justifyContent: 'center' }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.muted }}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <AddRow testID="member-alias" value={aliasDraft} onChange={changeAliasDraft}
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
            : `Add an email address — it is where every follow-up is sent, and the member cannot be ${editing ? 'saved' : 'added'} without one.`}
        </Muted>
      </View>

      {/* ----------------------------------------------- her own days */}
      <Label style={{ marginTop: SPACE.xl }}>Custom days — optional</Label>
      <Muted style={{ marginTop: 4 }}>
        {/* Three states, not two. With no course chosen `course` is the empty
            string, and the old sentence began " has no offering running yet"
            -- a claim about nothing, with a hole where the name goes. */}
        {courseDays.size
          ? ownDays
            ? `These are custom days, not the course's. ${course} runs ${[...courseDays].join(', ')} — clear the row and the member follows all of them again.`
            : `Every day ${course} runs is already on — ${[...courseDays].join(', ')}. Take off any the member will not attend; leave them all on and the member follows the course.`
          : course
            ? `${course} has no offering running yet, so there are no days to pick.`
            : 'Choose the course first — custom days can only be days that course runs.'}
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
                    : 'Choose the course first — its days decide the custom ones', 'warn')}
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
            {`The member moves from ${existing.course} · ${existing.branch} to ${course} · ${branch} from today. `
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
              ? 'Saving puts the member back into the follow-up rule: they are listed and written to again '
                + 'when they miss sessions. Enrolment and attendance history are unchanged — '
                + 'they never went anywhere.'
              /* A date still ahead of her is a different sentence, not a
                 softer one: nothing changes for her today, and the tense has
                 to say so or the banner claims a consequence that has not
                 happened yet. */
              : wantedInactiveFrom > iso(new Date())
              ? `Saving schedules it: the member stays in the follow-up rule up to `
                + `${dateInWords(dayBefore(wantedInactiveFrom))} and is left out from `
                + `${dateInWords(wantedInactiveFrom)} — nobody has to come back on the day. `
                + 'The member stays on the roster and attendance goes on being recorded, enrolment '
                + 'and history are untouched, and picking Active again puts them straight back. '
                + 'Recorded in the audit log.'
              : 'Saving leaves the member out of the follow-up rule: they will not be listed for follow-up and '
                + 'nothing will be sent to them. They stay on the roster and attendance goes on '
                + 'being recorded, enrolment and history are untouched, and picking Active '
                + 'again puts them straight back. Recorded in the audit log.'}
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

/**
 * A draft beside a + Add button -- and LEAVING the field is a third way to
 * press it.
 *
 * The typed value used to become a real entry on exactly two gestures, the
 * button and Enter. Someone who typed her address and moved to the next
 * field had, as far as this form was concerned, entered no address at all:
 * the text sat in the draft, `emails.length > 0` stayed false, and Save
 * discarded it without a word
 * (requests/2026-09-07-add-member-commit-draft-on-blur.md).
 *
 * `onBlur` runs the SAME handler, so blur adds nothing the button would not
 * have added: the same trim, the same duplicate and address-shape refusals,
 * the same "first address is primary". A refusal keeps the text in the box
 * and flashes, which is the point -- committing a malformed address on the
 * way past would be worse than the tap it replaces.
 *
 * Leaving the field BY pressing + Add still adds once. Blur runs first (the
 * press begins with a pointer-down that takes focus off the input), commits
 * and clears the draft; the button's handler then sees an empty draft, and
 * both handlers return on an empty draft before doing anything at all.
 */
function AddRow({ value, onChange, placeholder, onAdd, testID }:
  { value: string; onChange: (v: string) => void; placeholder: string;
    onAdd: () => void; testID: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm }}>
      <TextInput testID={`${testID}-input`}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={theme.muted} accessibilityLabel={placeholder}
        onSubmitEditing={onAdd} onBlur={onAdd}
        style={{
          flex: 1, minHeight: TAP_MIN + 2, borderRadius: RADIUS.md, paddingHorizontal: SPACE.lg,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
          color: theme.fgStrong, fontSize: 14, fontWeight: '600',
        }} />
      <Button testID={`${testID}-add`} label="+ Add" variant="secondary" onPress={onAdd} />
    </View>
  );
}
