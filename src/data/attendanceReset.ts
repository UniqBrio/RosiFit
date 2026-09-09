/**
 * UNDOING A DAY'S REGISTER — what is offered, and what the academy is told.
 *
 * UNTIL NOW THERE WAS NO WAY BACK. 0044 states it as a property rather than a
 * gap: "the register is the union of its files and no file undoes another's".
 * A file imported into the wrong course, or a Meet export whose names belong
 * to somebody else, could be CORRECTED by a second file for the same meeting
 * and could not be REMOVED. The day kept its tick, the strip kept offering
 * "Upload again", and the only route back was a hand-written delete nobody
 * has. The requester asked for the missing half in her own words -- "give a
 * reset attendnace button ... and the upload again should be changed to
 * awaiting upload".
 *
 * THE DAY GOES BACK TO AWAITING BY DERIVATION, NOT BY A FLAG. The week strip
 * gives a day `awaiting` when it holds no attendance rows (app/course/[id].tsx,
 * `days`); the roster card reads *Yet to mark* from the same absence
 * (dayAttendance). So clearing the rows is the whole of it -- there is no
 * second write that sets the day back, and therefore no second write that can
 * disagree with the first. That is deliberate: a status stored beside the rows
 * it summarises is exactly how the dashboard count and the weekly list drifted
 * apart (guardrail 1).
 *
 * WHO THE DELETE OFFER REACHES, and why it is not "the No email section".
 * The requester's words were "delet member under no email", and the obvious
 * reading -- the members drawn under the No email heading on this course --
 * is the one that MISSES the case she was looking at. Her three names
 * (Rani, Rossy, UniqBotz Infotech, 08-Sep-2026) were marked on the Yoda
 * Advance register while enrolled in NO course, so the roster, which is built
 * from enrolments, never listed them: the screen read "Members (1)" over a
 * register holding four. A delete offer driven by that list would have found
 * nothing to delete on the very day it was asked for.
 *
 * So the offer is driven by the REGISTER: every member this day's rows mark,
 * who has no address on file. On ordinary data that is the same set the No
 * email heading shows; on the requester's data it is the set she meant.
 *
 * Pure, and separate from the screen, because "who would this delete" is a
 * claim made immediately before the one write in this app that cannot be
 * undone -- and a claim computed inside a render body is one nobody can test.
 */

/** One member the day's register marks, as the reset dialog needs her. */
export type ResetTarget = {
  member_id: string;
  name: string;
  /** an address on file. Only the addressless are ever offered for deletion. */
  has_email: boolean;
  /**
   * How many OTHER days her attendance is recorded on.
   *
   * Deleting her is a hard delete (0051) and reaches every one of them, not
   * just this day. A dialog that offers the delete without this number is
   * describing a smaller write than the one it performs.
   */
  other_days: number;
};

/** What a reset would move, before anything is written. */
export type ResetPreview = {
  /** attendance rows on this day, for this course */
  marks: number;
  /** distinct members those rows name */
  members: number;
  /**
   * Of those, the ones WITH an address — the members a reset only un-marks.
   *
   * Counted separately because the requester asked for the two halves to be
   * put as two questions: "it should ask the attendance will be reset for
   * members with email and also ask do you want to delete the member without
   * email imported". A single total cannot say which of the two a given
   * member is in, and those are opposite outcomes for her.
   */
  keeping: number;
  /** the addressless among them — the only ones the delete tick is offered for */
  deletable: ResetTarget[];
};

/** What a reset actually moved, once it has. */
export type ResetOutcome = {
  /** attendance rows cleared */
  cleared: number;
  /** members deleted outright */
  deleted: number;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** the minimum an attendance row must carry for this module to read it */
type Row = {
  member_id: string;
  member: string;
  course_id: string | null;
  date: string;
};

/** the minimum a member must carry for this module to read her address */
type WithEmails = { id: string; emails: { address: string }[] };

/**
 * WHO THIS DAY'S REGISTER MARKS, and which of them carry an address.
 *
 * `rows` is the whole week the screen already holds, so the narrowing to one
 * course and one day happens here rather than at three call sites.
 *
 * `known` is the roster — the members the screen can see addresses for. A
 * member the register marks who is NOT on it is, by construction, enrolled in
 * no course of this one's, and she is treated as having no address: that is
 * what she is, and it is what puts her in reach of the delete tick that
 * clears her up. The live preview asks the database the same question and
 * answers authoritatively; this is what the fixtures and the specs read.
 */
export function resetPreview(
  rows: Row[],
  known: WithEmails[],
  courseId: string | null | undefined,
  dayIso: string | null,
  /**
   * The members the operator selected. Since 0057 a reset acts on these and
   * nothing else — "only those members attendance should be reset".
   *
   * Null or empty means the whole day, which is what a caller that genuinely
   * means the whole register passes; the app always names a selection.
   */
  onlyMembers?: string[] | null,
): ResetPreview {
  if (!courseId || !dayIso || !ISO_DATE.test(dayIso)) {
    return { marks: 0, members: 0, keeping: 0, deletable: [] };
  }

  const emailsById = new Map(known.map(m => [m.id, m.emails.length > 0]));
  const picked = onlyMembers && onlyMembers.length > 0 ? new Set(onlyMembers) : null;
  const onDay = rows.filter(r => r.course_id === courseId && r.date === dayIso
    && (!picked || picked.has(r.member_id)));

  // Every other day of hers that carries a mark, anywhere -- the number the
  // dialog owes her, because the delete reaches all of them.
  const otherDays = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.date === dayIso) continue;
    const days = otherDays.get(r.member_id) ?? new Set<string>();
    days.add(r.date);
    otherDays.set(r.member_id, days);
  }

  const seen = new Map<string, ResetTarget>();
  for (const r of onDay) {
    if (seen.has(r.member_id)) continue;
    seen.set(r.member_id, {
      member_id: r.member_id,
      name: r.member,
      has_email: emailsById.get(r.member_id) ?? false,
      other_days: otherDays.get(r.member_id)?.size ?? 0,
    });
  }

  const members = [...seen.values()];
  return {
    marks: onDay.length,
    members: members.length,
    keeping: members.filter(m => m.has_email).length,
    // Named order, so the list a person ticks through does not reshuffle
    // between the preview and the confirmation.
    deletable: members.filter(m => !m.has_email)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/* ------------------------------------------------------------------- words */

/**
 * WHAT THE RESET WILL DO, said before it is done.
 *
 * ABOUT THE SELECTED MEMBERS, since 0057. The requester scoped it outright --
 * "when they select members and click on reset only those members attendance
 * should be reset" -- so the sentence counts the selection, never the day.
 *
 * `marksLeft` is what would STILL be recorded afterwards, and it decides the
 * last clause. A reset that empties the day returns it to awaiting a file; a
 * reset of three members out of eight leaves a register that is still a
 * register, and promising "the day goes back to awaiting" there would be a
 * sentence the database deliberately does not honour (0057 holds the session
 * and the import back on a partial reset). Two outcomes, two sentences.
 */
export function resetWarning(
  preview: ResetPreview, dayWords: string, marksLeft = 0,
): string {
  if (preview.marks === 0) {
    return `Nothing is selected on ${dayWords}, so there is nothing to reset.`;
  }
  const marks = preview.marks === 1 ? '1 mark' : `${preview.marks} marks`;
  const members = preview.members === 1
    ? '1 selected member' : `${preview.members} selected members`;
  // THE WITH-EMAIL HALF, STATED BY NAME. The requester asked for it outright
  // -- "it should ask the attendance will be reset for members with email" --
  // and it is the half that is easy to leave implicit: a total says nothing
  // about which of them merely lose a mark.
  const kept = preview.keeping === 0
    ? ''
    : preview.keeping === 1
      ? ' 1 of them has an email and stays on the course, reading Yet to mark.'
      : ` ${preview.keeping} of them have an email and stay on the course, reading Yet to mark.`;
  const after = marksLeft === 0
    ? `Nothing else is recorded that day, so it goes back to awaiting a file and can be uploaded again.`
    : marksLeft === 1
      ? `1 other mark stays on that day, so it is not returned to awaiting a file.`
      : `${marksLeft} other marks stay on that day, so it is not returned to awaiting a file.`;
  return `This clears ${marks} on ${dayWords} — ${members}.${kept} ${after}`;
}

/**
 * THE SECOND HALF, and it is the one that cannot be undone.
 *
 * `ticked` is what she has actually selected, not what was offered: a warning
 * that describes the whole group while three of five are unticked is a
 * warning about a write that is not going to happen, which is how a person
 * learns to read past the one that matters.
 *
 * The other-days total is named because delete_member (0051) is a HARD delete
 * -- her attendance on every day, her enrolments, addresses, aliases and the
 * mail the academy sent her -- and a dialog that says "delete her" while
 * meaning that owes the number out loud.
 */
export function deleteWarning(ticked: ResetTarget[]): string | null {
  if (ticked.length === 0) return null;
  const one = ticked.length === 1;
  const who = one
    ? `${ticked[0].name} is deleted outright`
    : `${ticked.length} members with no email are deleted outright`;
  const elsewhere = ticked.reduce((n, t) => n + t.other_days, 0);
  const spill = elsewhere === 0
    ? 'They have attendance on no other day.'
    : elsewhere === 1
      ? 'This also removes 1 mark on another day.'
      : `This also removes ${elsewhere} marks on other days.`;
  return `${who} — permanently, with every record of theirs. `
    + `${spill} This cannot be undone.`;
}

/** What happened, for the toast. Tone is never the only signal (guardrail 3). */
export function resetOutcome(outcome: ResetOutcome, dayWords: string):
  { message: string; tone: 'ok' | 'warn' } {
  if (outcome.cleared === 0 && outcome.deleted === 0) {
    return { message: `Nothing was recorded for ${dayWords}, so nothing changed.`, tone: 'warn' };
  }
  const cleared = outcome.cleared === 1
    ? '1 mark cleared' : `${outcome.cleared} marks cleared`;
  const deleted = outcome.deleted === 0 ? ''
    : outcome.deleted === 1 ? ', 1 member deleted'
    : `, ${outcome.deleted} members deleted`;
  return {
    message: `${dayWords}: ${cleared}${deleted}. The day is awaiting a file again.`,
    tone: 'ok',
  };
}

/** The reset did not run. Says so, and says nothing was written. */
export function resetFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return message
    ? `${message} Nothing was cleared.`
    : 'The reset did not run. Nothing was cleared.';
}
