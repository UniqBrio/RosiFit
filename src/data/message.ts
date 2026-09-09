/**
 * Filling a course's wording with real figures — or sample ones — for the
 * preview.
 *
 * THIS MIRRORS THE SENDER, and that is the whole point of it existing.
 * supabase/functions/send-followups/index.ts renders a template with
 *
 *     tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)
 *
 * so the syntax is DOUBLE braces and an unknown token is left standing rather
 * than blanked. Both are copied here deliberately. A preview that used a
 * different syntax would show `{{first_name}}` resolving in the form and
 * arriving unresolved in the inbox -- or worse, quietly agree while the two
 * drifted apart.
 *
 * The token list below is the sender's `vars` map, name for name. Anything
 * this file offers that the sender does not build would preview correctly and
 * send as literal text.
 *
 * WHY THE PREVIEW MATTERS MORE THAN IT LOOKS
 * The wording is authored once and sent to everyone in the course, so a
 * mistyped token is not a typo in one email -- it is a typo in every email
 * that course will ever send.
 */
import type { Member } from './mock';
import { currentWeek } from './period';

/**
 * The tokens the Edge Function actually builds. Kept in this order because it
 * is the order the send function declares them in, which makes the two
 * readable side by side.
 */
/**
 * `chip` is the SHORT label a person taps; `means` is the full phrase read to
 * a screen reader and used in prose. They are separate on purpose: a chip row
 * has to stay one line and scannable, and "Sessions she was due at" does not,
 * while "Sessions due" alone is not enough for somebody who cannot see the
 * field it sits under.
 *
 * `everyday` and `subjectLine` are which of the thirteen each chip row OFFERS
 * before it is asked for more. THE TWO ROWS ARE NOT THE SAME ROW, because the
 * two fields are not the same field.
 *
 * WHY THE LIST IS SPLIT AND NOT SHORTENED
 * All thirteen are real -- each one is a key the Edge Function builds, and the
 * spec below pins that name for name. So none can be deleted: wording already
 * written with `{{attendance_pct}}` must keep resolving, in the preview and in
 * the inbox alike.
 *
 * What was wrong was offering all thirteen at once to somebody who came to
 * change a sentence. Tapping along the row produced lines like
 * "RosiFit Academy Main — 0 —": every token resolved correctly, and the
 * message was worse for each one. Thirteen equally-weighted chips read as
 * thirteen suggestions.
 *
 * THE MESSAGE, `everyday: true` -- exactly the seven the academy's own default
 * template uses in its BODY (0009). The other six are figures, and a figure
 * belongs in a message only when somebody deliberately went looking for it.
 *
 * THE SUBJECT, `subjectLine: true` -- her first name, and nothing else. Same
 * rule, read against the seeded SUBJECT, which is
 * "We missed you this week, {{first_name}}" and uses one token. That is not a
 * coincidence of the seed: a subject line is read in a list, at one glance,
 * next to thirty others. A period, a branch and two session counts do not fit
 * there and do not help there -- they are what the message is FOR. Offering
 * them beside the subject box invited exactly that, and
 * "We missed you this week, {{first_name}} {{member_name}}" is what it got.
 *
 * TWO CHIPS SAY "name". Course and Academy alone name a THING; the tokens
 * insert that thing's NAME, and in a row that opens with "Her first name" and
 * "Her full name" a bare "Course" reads as a heading over the chips beside it
 * rather than as one of them. "Course name" and "Academy name" say what lands
 * in the box, which is the only question a chip has to answer.
 *
 * Neither row LOSES anything. Both end in one More chip that opens the full
 * thirteen, so a subject that genuinely wants to name the course is one tap
 * away -- it is simply no longer suggested.
 */
export const MESSAGE_TOKENS: {
  token: string; means: string; chip: string;
  /** offered on the MESSAGE row before the More chip */
  everyday: boolean;
  /** offered on the SUBJECT row before the More chip */
  subjectLine: boolean;
}[] = [
  { token: '{{first_name}}', means: 'their first name', chip: 'First name', everyday: true, subjectLine: true },
  { token: '{{member_name}}', means: 'their full name', chip: 'Full name', everyday: false, subjectLine: false },
  { token: '{{course_name}}', means: 'the course name', chip: 'Course name', everyday: true, subjectLine: false },
  { token: '{{branch_name}}', means: 'the branch', chip: 'Branch', everyday: false, subjectLine: false },
  { token: '{{period_from}}', means: 'start of the period', chip: 'Period from', everyday: true, subjectLine: false },
  { token: '{{period_to}}', means: 'end of the period', chip: 'Period to', everyday: true, subjectLine: false },
  { token: '{{expected_sessions}}', means: 'sessions they were due at', chip: 'Sessions due', everyday: true, subjectLine: false },
  { token: '{{attended_sessions}}', means: 'sessions they made', chip: 'Sessions made', everyday: true, subjectLine: false },
  { token: '{{missed_sessions}}', means: 'sessions they missed', chip: 'Sessions missed', everyday: false, subjectLine: false },
  { token: '{{attendance_pct}}', means: 'their attendance', chip: 'Attendance %', everyday: false, subjectLine: false },
  { token: '{{consecutive_missed}}', means: 'missed in a row', chip: 'Missed in a row', everyday: false, subjectLine: false },
  /* THE RULE THAT LISTED HER, not a figure about her
     (requests/2026-09-08-follow-up-trigger-on-send-and-reach-out.md). Every
     other token answers "what did she do"; this one answers "why did this
     arrive", which is the question a member asks first and the wording could
     not say. It resolves to the count IN FORCE FOR HER COURSE at the moment
     the send runs -- so a trigger changed just before a send is the number the
     email carries, not the one it was written under. */
  { token: '{{follow_up_trigger}}', means: 'the trigger that listed them', chip: 'Follow-up trigger', everyday: false, subjectLine: false },
  { token: '{{last_attendance_date}}', means: 'when they were last present', chip: 'Last present', everyday: false, subjectLine: false },
  { token: '{{academy_name}}', means: 'the academy name', chip: 'Academy name', everyday: true, subjectLine: false },
];

/** What the MESSAGE row offers first. Order is MESSAGE_TOKENS' order, which is
 *  the sender's -- so the two lists stay readable side by side (see the spec). */
export const EVERYDAY_TOKENS = MESSAGE_TOKENS.filter(t => t.everyday);

/** What the SUBJECT row offers first: her name. See the note above. */
export const SUBJECT_TOKENS = MESSAGE_TOKENS.filter(t => t.subjectLine);

export type MessageContext = {
  member: Member;
  courseName: string;
  branchName: string;
  academyName: string;
  periodFrom: string;
  periodTo: string;
  /** the follow-up count in force for her course — what `{{follow_up_trigger}}`
   *  resolves to. A NUMBER, so a preview cannot show a blank where the rule is */
  followUpTrigger: number;
};

/** What a preview stands the trigger up as when the screen has not said one.
 *  4 because that is what `save_course` defaults `p_threshold` to (0030), so
 *  an unstated trigger previews as the value an unstated trigger IS. */
const SAMPLE_TRIGGER = 4;

/**
 * The member a preview stands in for when the screen has no real one.
 *
 * WHY A PREVIEW MUST NEVER SHOW A TOKEN
 * The preview exists to answer one question -- "what will she actually
 * read?" -- and it can only answer it in VALUES. A preview that renders
 * `{{expected_sessions}}` back at the person answers a different question,
 * the one they can already see for themselves in the box above it, and it
 * teaches the wrong lesson twice over: that the token is what arrives, and
 * that the preview is not worth reading.
 *
 * So there is always a context. Where the academy has a real member on this
 * course, that is the one used -- a token that resolves for a fixture and not
 * for her is exactly what the preview exists to catch. Where it has none (a
 * course being added, an academy on its first day, a template line in the
 * picker that belongs to no member at all), these figures stand in, and the
 * screen SAYS they are a sample rather than passing them off as hers.
 *
 * THE NUMBERS ARE DELIBERATELY ALL DIFFERENT. Three due, one made, two
 * missed, two in a row, 33% -- so a person reading the preview can tell which
 * token produced which figure. A sample of 0, 0, 0 resolves every token
 * correctly and demonstrates nothing.
 */
export const SAMPLE_MEMBER: Member = {
  // She belongs to no course row and no register: `course_id` is null and the
  // id is the word 'sample', so a sample that ever reached a query would fail
  // loudly rather than quietly stand for member 1.
  id: 'sample', code: '', course_id: null, name: 'Divya Ramesh',
  course: 'Prenatal Flow', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'divya.r@gmail.com', primary: true }],
  status: 'active', weekdays: null,
  expected: 3, attended: 1, missed: 2, streak: 2,
  last: '1 Sep', joinedOn: '2026-03-01', joined: 'Mar 2026',
};

/** The academy's name where the screen has not loaded one yet. */
export const SAMPLE_ACADEMY = 'RosiFit';

/** Stands in for the member's own signed opt-out link (0066). The real one
 *  is minted per address by send-followups and cannot exist on a screen that
 *  is previewing wording rather than addressing anybody -- so this shows the
 *  SHAPE, which is all the preview is being asked about. */
export const SAMPLE_UNSUBSCRIBE_URL =
  'https://rosifit.example/unsubscribe?e=00000000-0000-0000-0000-000000000000&t=sample';

/** Blank, and the em dash a screen uses for "nothing here", are both ABSENT.
 *  Either one substituted into the wording reads as a value the person chose. */
const filled = (v: string | undefined | null): string | null => {
  const t = String(v ?? '').trim();
  return t.length > 0 && t !== '—' ? t : null;
};

/**
 * A context in which EVERY supported token resolves -- real figures where the
 * screen has them, the sample above where it has not.
 *
 * The fallbacks are not arbitrary. Course and branch fall back to the
 * PREVIEW MEMBER'S OWN, never to a second sample, so the resolved message
 * describes one coherent person: "Divya, three sessions in Prenatal Flow at
 * Coimbatore" and never "Divya ... in Prenatal Flow at —".
 *
 * THE PERIOD IS THIS WEEK'S, in the sender's own format. The form does not
 * choose a period, so this used to read "between the period start and the
 * period end" -- prose standing where a date belongs, which is the same
 * defect as an unresolved token wearing different clothes. The send flow
 * passes `currentWeek()` as ISO dates (app/send/index.tsx), and the Edge
 * Function substitutes them verbatim, so this is what a send made today
 * actually puts in the email.
 */
export function previewContext(
  /* Every field NULLABLE, because "I do not have one" is what the screens
     actually hold -- `branch?.name` before a branch is picked, an academy
     row still loading. Partial<MessageContext> would make each of those an
     error at the call site and push the fallback back out into the form. */
  over: { [K in keyof MessageContext]?: MessageContext[K] | null } = {},
  today = new Date(),
): MessageContext {
  const week = currentWeek(today);
  const member = over.member ?? SAMPLE_MEMBER;
  return {
    member,
    courseName: filled(over.courseName) ?? member.course,
    branchName: filled(over.branchName) ?? member.branch,
    academyName: filled(over.academyName) ?? SAMPLE_ACADEMY,
    periodFrom: filled(over.periodFrom) ?? week.from,
    periodTo: filled(over.periodTo) ?? week.to,
    // `filled` is for strings and would turn a perfectly good 0 into a
    // fallback; a trigger is a number, so it is nullish-checked on its own.
    followUpTrigger: over.followUpTrigger ?? SAMPLE_TRIGGER,
  };
}

/** The same map the send function builds, from the rows this app already has. */
function variables(ctx: MessageContext): Record<string, string> {
  const m = ctx.member;
  return {
    first_name: m.name.split(' ')[0],
    member_name: m.name,
    course_name: ctx.courseName,
    branch_name: ctx.branchName,
    period_from: ctx.periodFrom,
    period_to: ctx.periodTo,
    expected_sessions: String(m.expected),
    attended_sessions: String(m.attended),
    missed_sessions: String(m.missed),
    // Nothing expected is an em dash, never 0% -- the sender writes the same,
    // and "0%" would tell a member with no scheduled sessions that she
    // attended none of them.
    attendance_pct: m.expected > 0 ? `${Math.round((m.attended / m.expected) * 100)}%` : '—',
    consecutive_missed: String(m.streak),
    last_attendance_date: m.last,
    academy_name: ctx.academyName,
    follow_up_trigger: String(ctx.followUpTrigger),
    /* {{unsubscribe_url}} -- the sender fills this per RECIPIENT, from a
       signature over that member_emails row, so there is no real value for it
       here: this screen previews wording, and it has no address in hand. The
       SAMPLE is what the preview shows and what stops `unknownTokens` warning
       about a token the sender fills perfectly well -- the same reason
       follow_up_trigger is carried above. */
    unsubscribe_url: SAMPLE_UNSUBSCRIBE_URL,
  };
}

export function fillTokens(text: string, ctx: MessageContext): string {
  const vars = variables(ctx);
  // ONE pass, exactly as the sender does it. A chained replace would rewrite
  // a value it had just inserted -- a member actually called "{{branch_name}}"
  // would come out as the branch.
  return String(text ?? '').replace(/\{\{(\w+)\}\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : whole);
}

/**
 * The tokens a piece of wording uses that the SENDER cannot fill.
 *
 * Read from the same map, so this can never disagree with fillTokens about
 * what is known -- which would be the one way for the warning and the preview
 * to contradict each other.
 */
export function unknownTokens(text: string): string[] {
  const known = variables({
    member: { name: '', expected: 0, attended: 0, missed: 0, streak: 0, last: '' } as Member,
    courseName: '', branchName: '', academyName: '', periodFrom: '', periodTo: '',
    // The VALUE is irrelevant here -- only the key set is read -- but it has to
    // be present, or `{{follow_up_trigger}}` would be reported as a token the
    // sender cannot fill while the sender fills it perfectly well.
    followUpTrigger: 0,
  });
  const found = String(text ?? '').match(/\{\{\w+\}\}/g) ?? [];
  return [...new Set(found.filter(t => !Object.prototype.hasOwnProperty.call(known, t.slice(2, -2))))];
}

/**
 * Dropping a token into wording at the cursor.
 *
 * WHY THIS IS A FUNCTION AND NOT THREE LINES IN THE FORM
 * It is the whole behaviour of the chip row, it has four edge cases, and none
 * of them is visible by reading the call site. Here it is testable without
 * rendering anything.
 *
 * SPACING IS PART OF THE JOB, not a nicety. The people writing this wording
 * are not technical: they tap "Her first name" after typing "Hi," and expect
 * "Hi, Divya", not "Hi,Divya". So a space is added before the token when the
 * character to its left is not already whitespace, and after it when the
 * character to its right is neither whitespace nor closing punctuation. A
 * token dropped at the very start or end gets neither -- there is nothing to
 * separate it from.
 *
 * NO SELECTION MEANS APPEND. `start` of -1 (a field never focused) puts the
 * token at the end, which is the only defensible guess: inserting at index 0
 * would silently reorder a sentence somebody had already written.
 *
 * A selection RANGE is replaced, exactly as typing over selected text does.
 */
export function insertToken(
  text: string, token: string, start: number, end: number,
): { text: string; caret: number } {
  const src = String(text ?? '');
  const lo = Number.isInteger(start) && start >= 0 && start <= src.length ? start : src.length;
  const hi = Number.isInteger(end) && end >= lo && end <= src.length ? end : lo;

  const before = src.slice(0, lo);
  const after = src.slice(hi);
  const lead = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
  // Closing punctuation needs no space before it -- "{{first_name}}," reads
  // right and "{{first_name}} ," does not.
  const trail = after.length > 0 && !/^[\s.,;:!?)\]]/.test(after) ? ' ' : '';
  const middle = `${lead}${token}${trail}`;
  return { text: before + middle + after, caret: before.length + middle.length };
}

// ------------------------------------------------------- the wording's bounds
/**
 * What `course_communication` will accept (0021), stated where the FORM can
 * obey it.
 *
 * These numbers already existed, in exactly one place: a CHECK constraint in
 * migration 0021, pinned by `supabase/tests/15_course_communication.sql` ("a
 * two-character subject is refused"). The rule was specified and tested at the
 * database and was invisible from the form that collects the field, so the
 * first thing that enforced it was the INSERT -- after Save had been offered,
 * pressed, and refused in Postgres' own words. Restated here, not moved: the
 * constraint stays the last line of defence, this is the first.
 *
 * BLANK IS LEGAL and is not a length failure. NULL means "use the template's"
 * (0021's column comment), and `saveCourse` sends `subject.trim() || null` --
 * so an empty box is a course that follows its template, which is what Reset
 * writes too. Only wording that EXISTS has to be long enough to send.
 */
/** `courses.name` (0005). Here beside the wording bounds because they are read
 *  together — every one of them is a rule the Add-a-course form must obey
 *  before it offers Save, and the form is where they were all missing. */
export const COURSE_NAME_MIN = 2;
export const COURSE_NAME_MAX = 80;

export const SUBJECT_MIN = 3;
export const SUBJECT_MAX = 200;
export const BODY_MIN = 10;

/**
 * Why this wording cannot be saved, in the words the person needs — or `null`
 * when it can.
 *
 * Takes the OVERRIDE, never what the box displays. A course that has not been
 * reworded shows its template's words and saves nothing, so judging the
 * template's length here would refuse a save the database would have accepted.
 */
export function wordingProblem(subject: string, body: string): string | null {
  const s = String(subject ?? '').trim();
  const b = String(body ?? '').trim();

  // Subject first: it is the field above, and reporting both at once gives a
  // person two things to fix and no order to fix them in.
  if (s.length > 0 && s.length < SUBJECT_MIN) {
    return `The subject needs at least ${SUBJECT_MIN} characters, or leave it empty to use the template's.`;
  }
  if (s.length > SUBJECT_MAX) {
    return `The subject is ${s.length} characters — it can be at most ${SUBJECT_MAX}.`;
  }
  if (b.length > 0 && b.length < BODY_MIN) {
    return `The message needs at least ${BODY_MIN} characters, or leave it empty to use the template's.`;
  }
  return null;
}

/**
 * Why this course name cannot be saved — or `null` when it can.
 *
 * The same defect as wordingProblem() on the field above it: `courses.name` is
 * `between 2 and 80` (0005) and the form checked only the lower half, so an
 * over-long name was refused as `courses_name_check` after Save. Empty is
 * reported by the form's own "A course name is required", not here, so this
 * stays silent on it rather than giving one field two required messages.
 */
export function courseNameProblem(name: string): string | null {
  const n = String(name ?? '').trim();
  if (n.length === 0) return null;
  if (n.length < COURSE_NAME_MIN) {
    return `A course name needs at least ${COURSE_NAME_MIN} characters.`;
  }
  if (n.length > COURSE_NAME_MAX) {
    return `The course name is ${n.length} characters — it can be at most ${COURSE_NAME_MAX}.`;
  }
  return null;
}
