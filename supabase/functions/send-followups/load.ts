// Everything send-followups reads before it renders anybody (T-041).
//
// WHY THIS IS A SEPARATE MODULE
//   index.ts calls `Deno.serve` at module scope, so a spec cannot import it
//   without starting a server. The reads are where RV-05 lives, so the reads
//   are what a spec has to be able to reach - the same split, for the same
//   reason, as send-loop.ts in T-020.
//
// WHAT WAS WRONG
//   Eight `.in()` reads, none chunked, none paged, and six of the eight
//   discarding their error. Both of those are ceilings, and they are different
//   ceilings:
//
//   · THE REQUEST. An `.in(ids)` filter travels in the query string. The
//     gateway refuses an over-long request head with a bare `400` - no rows,
//     no PostgREST error body. Measured 16-Sep-2026: 640 ids through, 660
//     refused (RC-045). `inChunks` keeps every request to 150 ids.
//
//   · THE REPLY. PostgREST caps every response at `db-max-rows`, 1,000 here,
//     and answers `200` with `error: null`. At 1,001 recipients the member
//     read came back one row short and looked perfect. `pageAllByKey` reads
//     by keyset until a page comes back empty.
//
//   And the discarded errors turned either ceiling into an empty map. Empty is
//   not "no such member" - it is "the read failed" - but the send loop cannot
//   tell those apart, so it classified recipients from the gap: `Member not
//   found`, or a send from the deployment address rather than the course's own.
//
// EVERY READ HERE THROWS. Including the three that are bounded by the course
// and branch counts rather than by recipients: a bounded list that discards its
// error is the same class, and "it is small today" is not a property the type
// system or the next migration knows about.

import { inChunks, MAX_IDS_PER_REQUEST, pageAllByKey, PagedReadError } from '../_shared/pageAll.ts';

/** The slice of the admin client this module uses. Structural, so a spec's
 *  fake satisfies it without mimicking the whole query builder. */
export interface ReadableAdmin {
  // deno-lint-ignore no-explicit-any
  from(table: string): any;
}

export type MemberRow = { id: string; full_name: string };
export type EnrollmentRow = { member_id: string; offering_id: string };
export type OfferingRow = { id: string; course_id: string; branch_id: string };
export type NamedRow = { id: string; name: string };
export type CourseCommRow = { course_id: string; from_email: string };
export type EmailRow = { id: string; member_id: string; email: string; status: string };
/** `select('*')`, so the row carries more than this - but the two fields the
 *  template actually renders are named, and named with their real types. An
 *  index signature alone makes them `unknown`, and `unknown ?? '—'` is `{}`,
 *  which is how `last_attendance_date` came out as a type error the moment the
 *  Edge tree was first checked (T-027). */
export type StatsRow = {
  member_id: string;
  current_streak?: number | null;
  last_present_date?: string | null;
  [k: string]: unknown;
};

export type SendData = {
  memberById: Map<string, MemberRow>;
  enrollByMember: Map<string, EnrollmentRow>;
  offeringById: Map<string, OfferingRow>;
  courseNameById: Map<string, string>;
  branchNameById: Map<string, string>;
  fromByCourse: Map<string, string>;
  emailByMember: Map<string, EmailRow>;
  statsByMember: Map<string, StatsRow>;
  courseIds: string[];
};

/** One chunked, paged, throwing read. The `key` is what the keyset pages by,
 *  and it must be in the select or `pageAllByKey` says so rather than looping. */
function readAll<T extends Record<string, unknown>>(
  ids: readonly string[],
  key: string,
  build: (chunk: string[]) => unknown,
): Promise<T[]> {
  // An `.in()` on nothing is an empty answer, not a query. `inChunks` already
  // produces no chunks for an empty list, so this is only making that explicit
  // for the reader rather than for the machine.
  if (ids.length === 0) return Promise.resolve([]);
  return pageAllByKey<T>(inChunks(ids, build, MAX_IDS_PER_REQUEST), { key });
}

export async function loadSendData(
  admin: ReadableAdmin,
  memberIds: readonly string[],
): Promise<SendData> {
  const members = await readAll<MemberRow & Record<string, unknown>>(
    memberIds, 'id',
    (chunk) => admin.from('members').select('id, full_name').in('id', chunk).is('deleted_at', null),
  );
  const memberById = new Map(members.map((m) => [m.id, m]));

  const enrollments = await readAll<EnrollmentRow & Record<string, unknown>>(
    memberIds, 'member_id',
    (chunk) => admin.from('member_enrollments')
      .select('member_id, offering_id').in('member_id', chunk).eq('status', 'active'),
  );
  const enrollByMember = new Map(enrollments.map((e) => [e.member_id, e]));
  const offeringIds = [...new Set(enrollments.map((e) => e.offering_id))];

  const offerings = await readAll<OfferingRow & Record<string, unknown>>(
    offeringIds, 'id',
    (chunk) => admin.from('course_offerings').select('id, course_id, branch_id').in('id', chunk),
  );
  const offeringById = new Map(offerings.map((o) => [o.id, o]));
  const courseIds = [...new Set(offerings.map((o) => o.course_id))];
  const branchIds = [...new Set(offerings.map((o) => o.branch_id))];

  const courses = await readAll<NamedRow & Record<string, unknown>>(
    courseIds, 'id',
    (chunk) => admin.from('courses').select('id, name').in('id', chunk),
  );
  const branches = await readAll<NamedRow & Record<string, unknown>>(
    branchIds, 'id',
    (chunk) => admin.from('branches').select('id, name').in('id', chunk),
  );
  const courseNameById = new Map(courses.map((c) => [c.id, c.name]));
  const branchNameById = new Map(branches.map((b) => [b.id, b.name]));

  // THE COURSE'S OWN SENDER (07-Sep-2026). course_communication.from_email is
  // what the From Email ID picker in the course form writes. A failed read here
  // is indistinguishable from "no course has its own sender", and that reads as
  // success while sending every message from the wrong address -- the same
  // shape as the discarded destructure that made fetchSenders always fall back
  // (TD-016). It threw before this row and it still throws; what changed is
  // that the other five now do too.
  const courseComms = await readAll<CourseCommRow & Record<string, unknown>>(
    courseIds, 'course_id',
    (chunk) => admin.from('course_communication').select('course_id, from_email').in('course_id', chunk),
  );
  const fromByCourse = new Map(courseComms.map((c) => [c.course_id, c.from_email]));

  // `id` is selected for the unsubscribe link, which is signed per ADDRESS --
  // member_emails.id is what the token commits to, and what `unsubscribe` looks
  // up. email_messages.member_email_id is not used for this: it is frequently
  // null, and a link built from a null is a link that cannot be honoured.
  const emails = await readAll<EmailRow & Record<string, unknown>>(
    memberIds, 'member_id',
    (chunk) => admin.from('member_emails')
      .select('id, member_id, email, status').eq('is_primary', true)
      .in('member_id', chunk).is('deleted_at', null),
  );
  const emailByMember = new Map(emails.map((e) => [e.member_id, e]));

  const stats = await readAll<StatsRow & Record<string, unknown>>(
    memberIds, 'member_id',
    (chunk) => admin.from('member_stats').select('*').in('member_id', chunk),
  );
  const statsByMember = new Map(stats.map((s) => [s.member_id as string, s]));

  return {
    memberById, enrollByMember, offeringById,
    courseNameById, branchNameById, fromByCourse,
    emailByMember, statsByMember, courseIds,
  };
}

export { PagedReadError };
