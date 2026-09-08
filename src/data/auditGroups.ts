/**
 * One import, one row.
 *
 * WHAT THIS FIXES
 * A bulk import of four members wrote about twenty audit entries: for each
 * member a `member.insert`, a `member_alias.insert`, a `member_email.insert`
 * and a `member_enrollment.insert`, plus the run's own summary. Every one of
 * them is a true and permanent record and none of them is deleted — but the
 * screen printed them as twenty separate acts, so a single import filled the
 * whole log and buried everything else. The requester's words: "just show as
 * members added using bulk import count 4, current value only names, if more
 * that 3 show +more on hit they can see full list".
 *
 * HOW A GROUP IS IDENTIFIED — exactly, not by guesswork
 * `audit_logs.occurred_at` defaults to `now()`, which in Postgres is the
 * TRANSACTION timestamp, not the statement's. `bulk_import_members` (0028)
 * writes every member through `create_member` in sub-transactions of one outer
 * transaction, so every audit row that import produced carries the IDENTICAL
 * `occurred_at`, down to the microsecond, and the same actor. That is the key:
 *
 *     same occurred_at + same actor + the run's own summary row present
 *
 * The third condition is what makes it safe. Without it, two unrelated changes
 * that happened to share a timestamp would be merged into an act that never
 * took place. With it, the group only forms where the database itself recorded
 * "this was one import" — `member.bulk_imported` (0028) or
 * `csv_import.completed` (0024). Two people importing at the same instant
 * still group separately, because the actor is part of the key.
 *
 * WHAT THE GROUP MAY AND MAY NOT CLAIM
 * The count comes from the summary row's own metadata (`inserted`) when it is
 * there, because that is the number the import itself reported. Only when it is
 * missing does the group fall back to counting the distinct members it can see.
 * The row says which of the two it is doing — a count derived by counting rows
 * on screen is not the same fact as a count the importer recorded, and on an
 * audit log the difference is worth a word.
 *
 * Nothing is hidden: the group states how many entries it stands for, and the
 * screen can expand it to the full list of names. The entries themselves are
 * untouched, still exported, still searchable — this is a way of DISPLAYING
 * them, not a second version of the record.
 */
import type { AuditCategory, PlainEntry } from './auditPlain';

/** The actions with which the database itself declares "that was one import". */
export const IMPORT_SUMMARY_ACTIONS: ReadonlySet<string> = new Set([
  // 0028 — bulk_import_members, the Add-members-from-a-file path
  'member.bulk_imported',
  // 0024 — the CSV attendance import, which also creates members it did not find
  'csv_import.completed',
]);

/** The actions inside a run that name a MEMBER who was added by it. */
const MEMBER_CREATED_ACTIONS: ReadonlySet<string> = new Set([
  'member.insert',
  'csv_import.member_created',
]);

export type PlainGroup = {
  id: string;
  /** the heading, already counted and pluralised */
  title: string;
  /** the file it came from, when the run recorded one */
  file: string | null;
  icon: string;
  category: AuditCategory;
  branch: string | null;
  who: string;
  role: string | null;
  when: string;
  at: string;
  /** the members the run added, named, in the order the log holds them */
  names: string[];
  /** how many members the run says it added */
  count: number;
  /** true when `count` is the importer's own figure rather than a tally of
   *  the rows this screen happens to be showing */
  countIsReported: boolean;
  /** how many audit entries this one row stands for */
  entryCount: number;
  /** every entry in the run, kept so nothing is lost and the group can be
   *  expanded, exported and searched exactly like the rows it replaces */
  entries: PlainEntry[];
  haystack: string;
};

export type PlainRow =
  | { kind: 'entry'; key: string; entry: PlainEntry }
  | { kind: 'group'; key: string; group: PlainGroup };

/** A positive integer from metadata, or null. Metadata is written by the
 *  database but typed as unknown here, and a count that is a string, a float
 *  or a negative is not a count. */
function reportedCount(meta: Record<string, unknown> | undefined): number | null {
  const raw = meta?.inserted ?? meta?.total;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) return null;
  return raw;
}

function fileName(meta: Record<string, unknown> | undefined): string | null {
  const raw = meta?.file_name ?? meta?.fileName;
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
}

/**
 * Collapses each import into one row and leaves everything else alone.
 *
 * Order is preserved: a group sits where its FIRST entry sat, so the log stays
 * newest-first and nothing jumps.
 */
export function groupRows(entries: PlainEntry[]): PlainRow[] {
  // Bucket by the exact instant and actor. Only buckets the database marked as
  // a run become groups.
  const runKeys = new Set<string>();
  for (const e of entries) {
    if (IMPORT_SUMMARY_ACTIONS.has(e.action)) runKeys.add(`${e.at}|${e.who}`);
  }

  const rows: PlainRow[] = [];
  const done = new Set<string>();

  for (const e of entries) {
    const key = `${e.at}|${e.who}`;
    if (!runKeys.has(key)) {
      rows.push({ kind: 'entry', key: e.id, entry: e });
      continue;
    }
    if (done.has(key)) continue;      // its group is already placed
    done.add(key);

    const members = entries.filter(x => `${x.at}|${x.who}` === key);
    const summary = members.find(x => IMPORT_SUMMARY_ACTIONS.has(x.action));

    // The names, de-duplicated in the order the log holds them. One member
    // produces several entries; she is one person.
    const names: string[] = [];
    for (const m of members) {
      if (!MEMBER_CREATED_ACTIONS.has(m.action)) continue;
      if (m.subject && !names.includes(m.subject)) names.push(m.subject);
    }

    const reported = reportedCount(summary?.meta);
    const count = reported ?? names.length;
    const file = fileName(summary?.meta);
    const noun = count === 1 ? 'member' : 'members';

    rows.push({
      kind: 'group',
      key: `group-${(summary ?? members[0]).id}`,
      group: {
        id: (summary ?? members[0]).id,
        title: `${count} ${noun} added by bulk import`,
        file,
        icon: 'group_add',
        category: 'members',
        // A run reaches one branch only when every entry in it agrees; an
        // import spanning two branches belongs to neither, exactly as a single
        // entry that points at nothing branch-specific does.
        branch: members.every(m => m.branch === members[0].branch) ? members[0].branch : null,
        who: (summary ?? members[0]).who,
        role: (summary ?? members[0]).role,
        when: (summary ?? members[0]).when,
        at: (summary ?? members[0]).at,
        names,
        count,
        countIsReported: reported !== null,
        entryCount: members.length,
        entries: members,
        haystack: members.map(m => m.haystack).join(' '),
      },
    });
  }

  return rows;
}
