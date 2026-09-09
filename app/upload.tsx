import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { H2, Body, Muted, Label, Button, Skeleton, ErrorState, EmptyState } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, STATUS, statusSurface } from '../src/theme/tokens';
import { MATCH_ROWS, IMPORTED_DAYS } from '../src/data/mock';
import { usePendingSessions, useCourses } from '../src/data/hooks';
import { attendanceImported, type PendingSession } from '../src/data/repository';
import { isConfigured } from '../src/lib/supabase';
import {
  // meetMatchesSession is gone from here: the day the file covers is derived
  // ONCE by meetCreatedDate (which is where the local-day rule lives), and
  // importAsk compares that ISO day with the ISO day she opened.
  parseMeetCsv, meetCreatedDate, meetCreatedTime, dedupeRows,
  CSV_COLUMNS, type MeetMeta,
} from '../src/data/meetCsv';
import { sha256Hex, pickCsvFiles } from '../src/data/csv';
import { csvPreview, csvCommit, type ImportDecision, type PreviewResult } from '../src/data/api';
import { scopeSessions } from '../src/data/uploadScope';
import {
  importAsk, askWords, courseConfirmWords, overrideSummary,
  type AskWords, type ImportAsk, type OverrideCounts, type Supersedes,
} from '../src/data/uploadOverride';
import { futureFileRefusal } from '../src/data/uploadWindow';
import {
  planBatch, batchAskWords, batchHeading, mergedFileName, mergedNote,
} from '../src/data/uploadBatch';
import { iso } from '../src/data/period';
import {
  alreadyImportedWords, nothingChanged, noChangeWords, changeSummary,
  type ImportChanges, type OutcomeWords,
} from '../src/data/uploadOutcome';
import { FormDialog } from '../src/components/FormDialog';

/**
 * THERE IS NO STEP BAR ANY MORE, because there is no longer a sequence to
 * track. Choose the course, choose the file; the file is read AND IMPORTED on
 * the pick, and what is left is the result. A progress bar over two choices
 * was measuring a journey that no longer exists.
 *
 * WHAT WENT WITH IT: the "Import N rows" button, and the list of rows that
 * needed a person which that button was waiting on. Both are gone on request
 * -- "directly import data no confirmation". The preview/commit split behind
 * them has NOT gone: csvPreview still classifies and stages, csvCommit still
 * writes every row in one transaction. The two now happen back to back
 * without stopping to ask.
 */

/**
 * the phases this dialog actually has, which is not the same as steps
 *
 * `clash` became `confirm` when the ask grew a second reason to exist: the
 * file being for another day, and the day already holding a register that
 * this file REPLACES. One phase, because they are one question with one
 * answer -- see src/data/uploadOverride.ts.
 *
 * `course` is the ask that came later and sits EARLIER: which course this is
 * for, put before the file picker opens and asked on every single upload. It
 * is its own phase and not part of `confirm` because it happens before there
 * is a file to talk about -- `confirm` runs after the preview, and the two
 * cannot be the same moment.
 */
type Phase = 'choose' | 'pick' | 'course' | 'confirm' | 'working' | 'done';

/**
 * WHAT THE IMPORT DOES WITH A ROW NOBODY WAS ASKED ABOUT.
 *
 * An exact match -- her canonical name, or a display name already confirmed
 * for her -- is her, and her attendance is marked. Everything else becomes a
 * NEW MEMBER WITH NO EMAIL, which is what puts her in the No email group on
 * the course, next to the two buttons that resolve her.
 *
 * WHY CREATE RATHER THAN LINK, for a fuzzy hit the matcher is 90% sure of,
 * or for a name two members share: because the two mistakes are not the same
 * size. A wrong LINK marks the wrong woman present and looks exactly like a
 * right one -- nothing on any screen says it happened. A wrong CREATE puts a
 * name you recognise in the No email group, where "add display name to
 * existing member" folds her into the real member and carries her attendance
 * across with her (0032). Visible and two taps to undo beats invisible and
 * permanent. Confirmed by the requester on 06-Sep-2026.
 *
 * This is what C-79's "a fuzzy hit is never auto-accepted" becomes: it is
 * still never accepted AS a match. It is filed as somebody new until a person
 * says otherwise.
 *
 * The instructor is not in here at all: csv-import sets staff names aside
 * before matching, so she never reaches this function as an unmatched row.
 */
function autoDecisions(rows: { row: number; kind: string; candidates: unknown[] }[]): ImportDecision[] {
  return rows
    .filter(r => r.kind !== 'matched' && r.kind !== 'noEmail')
    .map(r => ({
      row: r.row,
      action: 'add_as_new' as const,
      // C-80 wants an acknowledgement that this is a different person from
      // the candidate shown. Nobody was shown one, and this IS the
      // acknowledgement: the row is deliberately filed as somebody new.
      confirm_different_person: r.candidates.length > 0,
    }));
}

/**
 * What the import did, in the terms the requester asked to see it in:
 * "how many student with email and no email".
 *
 * WITH EMAIL is `matched` -- one confident candidate who has an address on
 * file (csv-import classifies exactly that, index.ts:183).
 * NO EMAIL is everybody else who landed: `noEmail` (she is a member, the
 * address is what is missing) plus every row filed as somebody new, because a
 * member created by an import has no address either. Both groups are marked
 * present; the difference is only whether the follow-up rule can reach them.
 */
type Outcome = {
  session_date: string;
  with_email: number;
  no_email: number;
  /** what actually landed on the register */
  imported: number;
  /** blank or repeated names, never matched */
  dropped: string[];
  /** names that belong to staff, set aside before matching */
  staff: string[];
  /** names whose only member of that name is enrolled in ANOTHER course, so
   *  they were added here as somebody new rather than marking that woman */
  other_course: string[];
  /** names Meet wrote more than once, counted once */
  duplicates: string[];
  /** the file this one corrected, when the day already had one */
  supersedes: string | null;
  /**
   * What replacing that register actually moved. A promise that data will be
   * overridden is only worth making if it can be checked afterwards, and
   * these three numbers are the check (uploadOverride.ts).
   */
  override: OverrideCounts | null;
  /**
   * What this file MOVED, as opposed to what it wrote (0045).
   *
   * `imported` above counts the rows the file NAMED, and it is the same
   * number whether every one of them was new or every one was already
   * marked — which is exactly why the second upload of a class read like the
   * first. These four say which: added, updated, already-marked-and-skipped,
   * and newly-recorded-absent.
   *
   * Null when the server does not report them, and treated as "say nothing"
   * rather than "nothing changed": see nothingChanged().
   */
  changes: ImportChanges | null;
};

/**
 * A file that has been READ, MATCHED AND STAGED, and not yet written.
 *
 * The preview classifies every row and parks it in `csv_imports` at
 * `previewed`; nothing reaches the register until the commit. Holding that
 * between the two is what lets the screen ask a question the answer to which
 * only the server has -- "this day already has a file, and it is this one" --
 * without having written anything to ask about.
 */
type Staged = {
  /** the day the file covers. Where the import lands, whatever was on screen. */
  day: string;
  /** the staged import. Null with no project configured: the fixtures answer. */
  preview: PreviewResult | null;
  /** the completed import already covering this day, when there is one */
  supersedes: Supersedes;
  /**
   * Names Meet wrote more than once, counted once. Carried rather than
   * recomputed: the commit used to re-parse the whole file to recover them,
   * which is a second full parse of the largest input this app handles.
   */
  duplicates: string[];
};

/**
 * ONE FILE OF A BATCH, staged and waiting with the rest of them.
 *
 * A batch is previewed IN FULL before anything is committed. That is what lets
 * the whole upload ask its one question — "these three replace a register" —
 * with every answer already known, and it is why the ask can be one dialog
 * rather than one per file. A declined batch leaves `previewed` rows behind,
 * inert by construction: both server-side checks count only `completed`.
 */
type StagedFile = { source: DayImport; staged: Staged };

/** a file after parsing, before anything has been asked of the server */
type PickedSource = { name: string; text: string; rows: number; meta: MeetMeta };

/**
 * ONE DAY'S IMPORT, built from every file that day had — usually one, and any
 * number when the class ran as several Meet calls. This is what a batch
 * previews and commits; the files it came from are named on it so the receipt
 * and the result row can both say where the register came from.
 */
type DayImport = {
  /** the files that fed it, in the order she picked them */
  fileNames: string[];
  /** what `csv_imports.file_name` records — every name, joined */
  name: string;
  /** every file's text, for the fingerprint */
  texts: string[];
  /** every call's rows, merged and de-duplicated */
  rows: ReturnType<typeof dedupeRows>['rows'];
  duplicates: string[];
  meetingCode: string | null;
  startedAt: string | null;
};

/**
 * ONE ROW OF THE BATCH RESULT — one file, and what became of it.
 *
 * Every file she picked gets a row, including the ones that never ran. A batch
 * that quietly listed only its successes would be the same defect as an import
 * that quietly dropped a name.
 */
type BatchRow = {
  fileName: string;
  /** null for a file set aside before its day could be read */
  day: string | null;
  kind: 'imported' | 'unchanged' | 'already' | 'setAside' | 'failed';
  /** the sentence under the file name, saying what happened to it */
  note: string;
  /** how many of her files this row stands for — more than one when a day's
   *  calls were merged into one register */
  files: number;
  withEmail: number;
  noEmail: number;
};

type BatchResult = {
  rows: BatchRow[];
  /** every file she picked, whatever became of it */
  files: number;
  /** how many of those FILES fed a register that ran */
  imported: number;
  /** how many distinct days those files landed on */
  days: number;
  withEmail: number;
  noEmail: number;
};

/**
 * The batch result, rows back in the order she picked the files in.
 *
 * They arrive in three groups — set aside, already imported, committed — which
 * is the order the MECHANISM produced them in and an order nobody chose. She
 * picked a list; she reads a list.
 */
function assembleBatch(rows: BatchRow[], order: string[]): BatchResult {
  const at = new Map(order.map((name, i) => [name, i]));
  const sorted = [...rows].sort(
    (a, b) => (at.get(a.fileName) ?? 0) - (at.get(b.fileName) ?? 0));
  // A file that RAN, whether or not it moved anything. "Nothing to update" is
  // an import that happened and found the register already correct.
  const landed = sorted.filter(r => r.kind === 'imported' || r.kind === 'unchanged');
  // FILES, not rows. Two calls merged into one day are one row and two files,
  // and "Imported 1 file" over the two she just picked reads as one lost.
  const files = (rs: BatchRow[]) => rs.reduce((n, r) => n + r.files, 0);
  return {
    rows: sorted,
    files: files(sorted),
    imported: files(landed),
    days: new Set(landed.map(r => r.day)).size,
    withEmail: sorted.reduce((n, r) => n + r.withEmail, 0),
    noEmail: sorted.reduce((n, r) => n + r.noEmail, 0),
  };
}

/** ISO day -> "Sun 31 Aug", the way every other date on this screen reads */
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dayLabel(iso: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  // Constructed in LOCAL time from the parts: new Date('2026-08-31') is
  // midnight UTC, which is the 30th for anybody west of Greenwich.
  const date = new Date(y, m - 1, d);
  return `${DOW[date.getDay()]} ${d} ${MON[m - 1]}`;
}

function UploadBody() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  // Where she came FROM decides what she is offered. A day on a course opens
  // straight into that session; the course itself narrows the list to its own
  // sessions; the academy-wide Attendance list narrows nothing. One screen,
  // three honest entry points -- see src/data/uploadScope.ts.
  const { state: forced, courseId, date } = useLocalSearchParams<
    { state?: string; courseId?: string; date?: string }>();
  const pending = usePendingSessions(forced);
  // Courses always exist; sessions awaiting a file may not. This is what makes
  // the upload reachable for an academy that schedules as it goes.
  const courses = useCourses(forced);

  const [phase, setPhase] = useState<Phase>('choose');
  /**
   * What the file will be imported into. An OFFERING (a course at a branch),
   * never a session: the session is derived from the file's own date, and may
   * not exist yet at all.
   *
   * `session` is set only when she took a shortcut from a day already
   * awaiting a file; it is a convenience, not a requirement.
   */
  const [target, setTarget] = useState<
    { offering_id: string; course: string; branch: string } | null>(null);
  const [session, setSession] = useState<PendingSession | null>(null);
  /**
   * WHAT "Change" LEFT BEHIND, so that leaving it is not one-way.
   *
   * Change is a detour: she is on the file card, wonders whether the course
   * above it is the right one, and goes back to look. Until now the only way
   * out of that list was to pick something or to close the dialog -- the ×
   * being the sole control on the screen -- so a look cost her the upload she
   * had already set up. This holds the course (and the day, when she came in
   * on one) she was uploading for at the moment she pressed Change, which is
   * the whole of what Back has to put back.
   *
   * Null whenever there is nowhere to go back TO: opening the dialog fresh
   * lands on this same list, and a Back button there would point at nothing.
   */
  const [returnTo, setReturnTo] = useState<
    { target: NonNullable<typeof target>; session: PendingSession | null } | null>(null);
  const [file, setFile] = useState<
    { name: string; text: string; rows: number; meta: MeetMeta } | null>(null);
  /**
   * WHAT WENT WRONG, or what simply is not on yet.
   *
   * One state, two tempers. Everything that reaches here is a reason the file
   * did not import and the panel is in the same place either way -- but a file
   * dated tomorrow is not a FAILURE, and the red panel said it was. `caution`
   * draws it amber with a caution icon instead: nothing broke, the class has
   * not happened. Requester, on seeing the red one: *"for future date add a
   * caution simple"*.
   */
  const [failure, setFailure] = useState<{ text: string; caution?: boolean } | null>(null);
  /** what the import did, once it has done it */
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  /**
   * THE FILE WAS ALREADY IMPORTED, so nothing ran at all.
   *
   * Not a `failure`: the red panel says the upload went wrong, and somebody
   * who re-sent a file because she was not sure the first one arrived would
   * read that as "and it still has not". Nothing went wrong here and nothing
   * needs doing — which is a RESULT, and is shown as one. The words are in
   * src/data/uploadOutcome.ts so a spec can read them.
   */
  const [already, setAlready] = useState<OutcomeWords | null>(null);
  /**
   * THE ONE QUESTION THIS FLOW STILL ASKS, now with two reasons to be asked:
   * a file whose own day is not the day she opened, and a day that already
   * holds a register this file REPLACES. Neither is something to discover
   * afterwards.
   *
   * `staged` is the preview that has already run: the rows are classified and
   * an import row is waiting at `previewed`, but NO attendance has been
   * written. That is what lets the ask name the file it is about to override
   * -- which only the server knows -- while "nothing has been written yet" is
   * still true.
   */
  const [ask, setAsk] = useState<
    { file: NonNullable<typeof file>; ask: ImportAsk; staged: Staged } | null>(null);
  /**
   * SEVERAL FILES AT ONCE, and what each of them did.
   *
   * Null for an ordinary one-file upload, which keeps every screen below
   * exactly as it was — one file has one day, one result and one Mapped panel,
   * and a batch summary over a single register would be a worse answer to the
   * same question. Set only when she picked more than one, and then it is the
   * result screen: a row per file, in the order she picked them, whether that
   * file landed or not.
   */
  const [batch, setBatch] = useState<BatchResult | null>(null);
  /**
   * The whole batch, previewed and waiting on ONE confirm. `other` is every
   * file that will not be committed — set aside, or already in — carried
   * through the ask so the result can still list them; `order` is the order
   * she picked in, which is the only order the rows mean anything in.
   */
  const [batchAsk, setBatchAsk] = useState<
    { words: AskWords; staged: StagedFile[]; other: BatchRow[]; order: string[] } | null>(null);
  /**
   * How many files this upload is working through, for the one sentence that
   * has to be true WHILE it works. `batchAsk` is not that number: it is set
   * after every preview has answered, and the previews are most of the wait.
   */
  const [batchCount, setBatchCount] = useState(0);

  const scope = scopeSessions(pending.data ?? [], courseId, date);
  const sessions = scope.sessions;

  /**
   * THE DAY SHE OPENED, which is not always a session.
   *
   * It used to be read off `session` alone -- a PendingSession, and those
   * exist only for days already AWAITING a file. So the requester's own case
   * (sitting on 6 Sep, uploading a 31 Aug export) never asked anything: 6 Sep
   * is not awaiting, `session` was null, and the file silently updated the
   * 31 Aug register. The date parameter is the day she tapped whether or not
   * anything is scheduled on it, so that is what the check reads.
   */
  const openedDay = session?.session_date
    ?? (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null);

  /**
   * What the file step says she is uploading FOR.
   *
   * A shortcut from a waiting day names that day. A course names the course:
   * the day is not known yet, because it comes from the file.
   */
  const chosen = session?.label
    ?? (target ? `${target.course} · ${target.branch}` : '');

  /**
   * One session means the choice was already made, on the screen she tapped.
   * Asking her to make it again is where she picks the wrong one.
   */
  useEffect(() => {
    // ONLY WHILE SHE IS STILL CHOOSING. usePendingSessions can answer late,
    // and this used to call setPhase('pick') whenever it did -- knocking her
    // out of a question she was in the middle of answering and discarding the
    // ask with it.
    if (!scope.preselect || session || phase !== 'choose') return;
    setSession(scope.preselect);
    setTarget({
      offering_id: scope.preselect.offering_id,
      course: scope.preselect.course,
      branch: scope.preselect.meta.split(' · ')[0] ?? '',
    });
    setPhase('pick');
    // `phase` is a dependency, not just a guard: an effect that defers on a
    // condition must be able to run AGAIN when that condition changes, or the
    // deferral is permanent and nothing can observe that it was (RC-025).
  }, [scope.preselect, session, phase]);

  /**
   * The offerings she can upload for: every branch of every course, narrowed
   * to one course when that is where she came from.
   *
   * This list does NOT depend on anything being scheduled, which is the whole
   * point. A course that has never had a session generated still appears, and
   * a file can still be imported into it.
   */
  const targets = (courses.data ?? [])
    .filter(c => !courseId || c.id === courseId)
    .flatMap(c => c.offerings.map(o => ({
      offering_id: o.id, course: c.name, branch: o.branch,
    })));

  /**
   * One offering means the choice was already made on the screen she tapped.
   * Only auto-selected when a course scope was ASKED for: academy-wide, an
   * academy that happens to run one course should still see what it is
   * choosing.
   */
  useEffect(() => {
    if (target || !courseId || targets.length !== 1) return;
    setTarget(targets[0]);
    setPhase('pick');
  }, [target, courseId, targets]);

  /**
   * ONE FILE OR SEVERAL, chosen in one press.
   *
   * The picker takes as many as she selects. ONE file keeps the whole of the
   * single-file flow untouched — same refusals in the same panels, same ask,
   * same result with its Mapped panel — because one file has one day and one
   * register, and a batch summary over it would answer a question nobody
   * asked. Two or more go to `stageBatch`, which previews all of them before
   * committing any.
   */
  const choose = async () => {
    setFailure(null);
    try {
      const chosen = await pickCsvFiles();
      // She opened the picker and chose nothing.
      if (chosen.length === 0) return;

      // Parsed here so a file with the wrong columns is refused before
      // anything is sent, and the message can name the three columns the
      // Meet export actually has (C-74). In a batch a file that will not
      // parse still refuses the whole pick: it is a file she chose, and
      // importing the other eight while saying nothing about it is how a
      // register goes missing quietly.
      const parsedAll = chosen.map(f => {
        const parsed = parseMeetCsv(f.text);
        if (parsed.rows.length === 0) {
          throw new Error(chosen.length === 1
            ? 'That file has no attendance rows.'
            : `${f.name} has no attendance rows, so nothing was imported.`);
        }
        return {
          source: {
            name: f.name, text: f.text, rows: parsed.rows.length,
            // The lines Meet writes above the table. They are the only
            // evidence in the file of WHICH meeting it came from, and the
            // only thing that says which day it covers.
            meta: parsed.meta,
          } as PickedSource,
          day: meetCreatedDate(parsed.meta.created),
        };
      });

      if (parsedAll.length > 1) {
        void stageBatch(parsedAll);
        return;
      }

      /* ------------------------------------------ one file, exactly as before */
      const { source: picked, day: fileDay } = parsedAll[0];
      setFile(picked);

      // A file with no "Created on" line cannot be imported at all. It stays
      // here, where the panel below names what is missing and Browse is still
      // there to try another export.
      if (!fileDay) return;

      /**
       * A CLASS THAT HAS NOT RUN YET HAS NO REGISTER.
       *
       * Refused HERE rather than after the preview, deliberately: the preview
       * stages a `csv_imports` row, and staging one for a file that is going
       * to be refused anyway leaves litter behind to answer a question that
       * only needed the file's own date. It is the same place, and the same
       * shape, as the "no Created on line" refusal directly above.
       */
      const future = futureFileRefusal(fileDay, iso(new Date()),
        { fileName: picked.name, label: dayLabel });
      if (future) {
        setFailure({ text: future, caution: true });
        return;
      }

      void stage(picked, fileDay);
    } catch (err) {
      setFailure({ text: err instanceof Error ? err.message : 'That file could not be read.' });
    }
  };

  /**
   * READ AND MATCHED, BUT NOT WRITTEN.
   *
   * The preview classifies every row and stages it; the register is untouched
   * until the commit below. This step exists on its own so that the question
   * -- when there is one -- is asked with everything known: which day the file
   * covers, AND whether that day already has a register this file replaces.
   * The second of those comes back from the preview and nowhere else.
   *
   * An ask that is declined leaves a staged `previewed` row behind. That is
   * inert by construction: both the already-imported check and the
   * supersede lookup count only `completed` imports.
   */
  const stage = async (source: NonNullable<typeof file>, day: string) => {
    setFailure(null);
    // Cleared with the failure, and for the same reason: the last file's
    // answer must not still be on screen underneath this one's.
    setAlready(null);
    setPhase('working');

    try {
      let staged: Staged;
      if (!isConfigured) {
        // No project configured: the fixtures answer, and they answer at once.
        const name = IMPORTED_DAYS[day];
        staged = {
          day, preview: null,
          supersedes: name ? { file_name: name, completed_at: `${day}T12:00:00Z` } : null,
          duplicates: [...new Set(dedupeRows(parseMeetCsv(source.text).rows).duplicates)],
        };
      } else {
        // NOT folded into the line above, deliberately. Reaching here with no
        // offering is a bug -- the file step is only reachable once one is
        // chosen -- and answering a bug with fixture numbers would report an
        // import that never happened, against a course nobody picked.
        if (!target?.offering_id) {
          setFailure({ text: 'No course is selected, so there is nothing to import into. Nothing was written.' });
          setPhase('pick');
          return;
        }
        const parsed = parseMeetCsv(source.text);
        const deduped = dedupeRows(parsed.rows);
        const preview: PreviewResult = await csvPreview({
          offering_id: target.offering_id,
          // FROM THE FILE, not from a list. The session this belongs to is
          // whatever day the meeting ran; if no such session exists yet, the
          // import creates it (0024).
          session_date: day,
          file_name: source.name,
          file_sha256: await sha256Hex(source.text),
          meeting_code: parsed.meta.code,
          meeting_started_at: parsed.meta.created,
          // Deduped before it is sent, so the count imported is the count the
          // file describes: one person, one session, one day.
          rows: deduped.rows,
        });

        /**
         * THIS EXACT FILE IS ALREADY IN. Nothing was staged, so there is
         * nothing to commit and nothing to ask about: what is owed is an
         * answer to the question that makes somebody upload a file twice,
         * which is whether the first one worked.
         *
         * Ahead of the ask deliberately. Asking her to confirm an override
         * that cannot happen — the fingerprint is refused by
         * csv_imports_sha_completed either way — would be a dialog about
         * nothing.
         */
        if (preview.already_imported) {
          setAlready(alreadyImportedWords(preview.already_imported, {
            fileName: source.name, course: chosen, label: dayLabel,
          }));
          setPhase('done');
          return;
        }

        staged = {
          day, preview, supersedes: preview.supersedes ?? null,
          duplicates: [...new Set(deduped.duplicates)],
        };
      }

      /**
       * THE ONE QUESTION LEFT, and the requester asked for both halves of it
       * by name.
       *
       * The day has always come from the FILE, never from the day she
       * tapped -- so a 31-Aug export opened from 3-Sep silently updated the
       * 31-Aug register. And a second file for a day already imported has
       * always REPLACED that register, with the only warning arriving on the
       * result screen, after the replacing was done. Both are the right
       * behaviour and the wrong way to find out about it.
       *
       * The day half is only asked when a day was actually CHOSEN: opened from
       * the Attendance list or a course header there is no day to disagree
       * with. The override half is asked wherever she came from -- a register
       * being replaced does not depend on which screen she started on.
       */
      const pending = importAsk({ fileDay: day, openedDay, supersedes: staged.supersedes });
      if (pending) {
        setAsk({ file: source, ask: pending, staged });
        setPhase('confirm');
        return;
      }
      await commit(source, staged);
    } catch (err) {
      // The sentence the commit's own catch already ships. It is true of this
      // path too -- the preview writes no attendance -- and a second wording
      // for the same fact is a new string this change was not asked for.
      setFailure({ text: err instanceof Error
        ? `${err.message} Nothing was written.`
        : 'The import did not run. Nothing was written.' });
      setPhase('pick');
    }
  };

  /**
   * WRITTEN, in one transaction.
   *
   * `source` and `staged` are passed rather than read from state: setFile has
   * not landed yet in the tick that calls this, and importing the PREVIOUS
   * file is exactly how the wrong register gets written.
   *
   * NO STOP BETWEEN THE ROWS. The decisions a person used to make one row at
   * a time are made by autoDecisions, and this follows the preview
   * immediately unless an ask stood in between.
   */
  const commit = async (source: NonNullable<typeof file>, staged: Staged) => {
    setFailure(null);
    setPhase('working');

    if (!staged.preview) {
      // No project configured: the fixtures answer, and they answer at once.
      setOutcome(fixtureOutcome(staged.day, source, staged.supersedes));
      setPhase('done');
      return;
    }

    try {
      const preview = staged.preview;
      const result = await csvCommit(preview.import_id, autoDecisions(preview.rows));
      // The register has moved. Every mounted list still holds what it read
      // BEFORE the file went in -- the member cards most visibly, because
      // their attendance and Missed figures are derived from exactly the rows
      // this just wrote. The import is an Edge Function call, so nothing
      // announces it on its own, and without this the numbers only catch up
      // when the tab is remounted -- which reads as an upload that did nothing.
      attendanceImported();
      const c = preview.counts;
      setOutcome({
        session_date: staged.day,
        with_email: c.matched ?? 0,
        no_email: (c.noEmail ?? 0) + (c.possible ?? 0) + (c.ambiguous ?? 0) + (c.unmatched ?? 0),
        imported: result.present_or_extra,
        dropped: preview.dropped_names ?? [],
        staff: preview.staff_names ?? [],
        // Absent from a project still on the older function, and read as
        // "nothing to say" rather than "none": the note simply does not draw.
        other_course: preview.other_course_names ?? [],
        duplicates: staged.duplicates,
        supersedes: staged.supersedes?.file_name ?? null,
        // Absent until the migration that returns it is applied, which is why
        // it is read defensively rather than assumed.
        override: result.overridden ?? null,
        // Same reading, same reason (0045): a server that does not count
        // changes says nothing about them, and the screen says nothing
        // either rather than reporting four zeroes as "nothing changed".
        changes: result.changes ?? null,
      });
      setPhase('done');
    } catch (err) {
      // The whole file failed together -- nothing landed -- so say that rather
      // than leaving anyone to wonder which half went in.
      setFailure({ text: err instanceof Error
        ? `${err.message} Nothing was written.`
        : 'The import did not run. Nothing was written.' });
      setPhase('pick');
    }
  };

  /* ==================================================== several files at once
   *
   * Everything below exists because a batch has to know ALL of its answers
   * before it writes ANY of them: which files can run, which of them replace a
   * register, and therefore whether one question is owed. `stage`/`commit`
   * above are the single-file pair and are untouched -- one file still walks
   * the flow it always did.
   */

  /**
   * ONE DAY'S FILES, MADE INTO ONE IMPORT.
   *
   * A day can have any number of Meet calls — a dropped call restarted under a
   * new code, a morning and an evening batch — and the requester uploads all
   * of them together. The database holds one register per day, so they merge
   * here: every row from every call, then the same de-duplication a single
   * file gets for a woman who rejoined. She was in two of the day's calls; she
   * is present once.
   *
   * The fingerprint is over every text that went in, so re-uploading the same
   * pair is caught as already imported, and adding a third file to the pair
   * is a different import — which it is.
   */
  const mergeDay = (sources: PickedSource[]): DayImport => {
    const parsed = sources.map(s => parseMeetCsv(s.text));
    const deduped = dedupeRows(parsed.flatMap(p => p.rows));
    return {
      fileNames: sources.map(s => s.name),
      name: mergedFileName(sources.map(s => s.name)),
      texts: sources.map(s => s.text),
      rows: deduped.rows,
      duplicates: [...new Set(deduped.duplicates)],
      // Every call's code, so the receipt names each meeting that fed it.
      meetingCode: parsed.map(p => p.meta.code).filter(Boolean).join(' + ') || null,
      // The earliest call is when the day's class began.
      startedAt: parsed.map(p => p.meta.created).filter((c): c is string => !!c).sort()[0] ?? null,
    };
  };

  /**
   * ONE DAY, PREVIEWED. The staging half of `stage()`, over a merged import
   * rather than a file, with no screen state of its own so the batch can call
   * it once per day and decide afterwards.
   */
  const previewDay = async (src: DayImport, day: string): Promise<
    { kind: 'staged'; staged: Staged } | { kind: 'already'; words: OutcomeWords }> => {
    if (!isConfigured) {
      // No project configured: the fixtures answer, and they answer at once.
      const name = IMPORTED_DAYS[day];
      return { kind: 'staged', staged: {
        day, preview: null,
        supersedes: name ? { file_name: name, completed_at: `${day}T12:00:00Z` } : null,
        duplicates: src.duplicates,
      } };
    }

    const preview = await csvPreview({
      offering_id: target!.offering_id,
      session_date: day,
      file_name: src.name,
      file_sha256: await sha256Hex(src.texts.join('\n')),
      meeting_code: src.meetingCode,
      meeting_started_at: src.startedAt,
      rows: src.rows,
    });

    if (preview.already_imported) {
      return { kind: 'already', words: alreadyImportedWords(preview.already_imported, {
        fileName: src.name, course: chosen, label: dayLabel,
      }) };
    }
    return { kind: 'staged', staged: {
      day, preview, supersedes: preview.supersedes ?? null,
      duplicates: src.duplicates,
    } };
  };

  /**
   * EVERY FILE PREVIEWED, THEN ONE QUESTION, THEN THE WRITES.
   *
   * The day-clash half of the single-file ask is deliberately NOT asked here
   * -- see uploadBatch.ts. Nine files cannot all be for the day she tapped,
   * and nine dialogs saying so is how somebody learns to click past the one
   * that matters. What survives is the override, which matters whatever she
   * picked.
   */
  const stageBatch = async (files: { source: PickedSource; day: string | null }[]) => {
    setFailure(null);
    setAlready(null);
    setOutcome(null);
    setBatch(null);
    setBatchCount(files.length);
    setPhase('working');

    if (!target?.offering_id) {
      setFailure({ text: 'No course is selected, so there is nothing to import into. Nothing was written.' });
      setPhase('pick');
      return;
    }

    const order = files.map(f => f.source.name);
    const plan = planBatch(
      files.map(f => ({ fileName: f.source.name, day: f.day })), iso(new Date()), dayLabel);
    const byName = new Map(files.map(f => [f.source.name, f.source]));

    const other: BatchRow[] = plan.setAside.map(s => ({
      fileName: s.fileName, day: null, kind: 'setAside' as const,
      note: s.reason, files: 1, withEmail: 0, noEmail: 0,
    }));

    // Every file was set aside. Nothing to preview and nothing to ask: the
    // result IS the list of reasons.
    if (plan.ready.length === 0) {
      setBatch(assembleBatch(other, order));
      setPhase('done');
      return;
    }

    try {
      const staged: StagedFile[] = [];
      // One preview per DAY, not per file: a day's files are merged first, so
      // the server sees one import and the day gets one register.
      for (const group of plan.ready) {
        const sources = group.fileNames
          .map(n => byName.get(n))
          .filter((s): s is PickedSource => !!s);
        if (sources.length === 0) continue;
        const source = mergeDay(sources);
        const previewed = await previewDay(source, group.day);
        if (previewed.kind === 'already') {
          other.push({
            fileName: source.name, day: group.day, kind: 'already',
            note: previewed.words.lines[0], files: source.fileNames.length,
            withEmail: 0, noEmail: 0,
          });
        } else {
          staged.push({ source, staged: previewed.staged });
        }
      }

      // Every file was already in. A result, not a failure — same reading as
      // the single-file `upload-already` panel.
      if (staged.length === 0) {
        setBatch(assembleBatch(other, order));
        setPhase('done');
        return;
      }

      const overrides = staged
        .filter(s => s.staged.supersedes)
        .map(s => ({
          fileName: s.source.name, day: s.staged.day,
          replaces: s.staged.supersedes!.file_name,
        }));

      if (overrides.length > 0) {
        setBatchAsk({
          words: batchAskWords(overrides,
            { course: chosen, total: staged.length, label: dayLabel }),
          staged, other, order,
        });
        setPhase('confirm');
        return;
      }

      await commitBatch(staged, other, order);
    } catch (err) {
      // A preview failed, so NOTHING in this batch was committed — the writes
      // all happen after every preview has answered.
      setFailure({ text: err instanceof Error
        ? `${err.message} Nothing was written.`
        : 'The import did not run. Nothing was written.' });
      setPhase('pick');
    }
  };

  /**
   * THE WRITES, one transaction per file.
   *
   * Per-file try/catch, because that is what the mechanism actually
   * guarantees: `commit_csv_import` is atomic for ONE file, and there is no
   * transaction spanning the batch. So a file that fails takes only itself
   * down, says so on its own row, and the rest still land — which is the
   * honest report of what happened, and better than losing eight good
   * registers to one bad export.
   */
  const commitBatch = async (staged: StagedFile[], other: BatchRow[], order: string[]) => {
    setFailure(null);
    setPhase('working');

    const rows: BatchRow[] = [...other];
    let wrote = false;

    for (const s of staged) {
      const { source, staged: st } = s;
      // Said on the row whenever the day came from more than one call, so the
      // result never shows one file name over a register two files built.
      const merged = mergedNote(source.fileNames, st.day, dayLabel);
      try {
        if (!st.preview) {
          // No project configured: the fixtures answer. The fixture counts come
          // from MATCH_ROWS whatever the text; the rows already merged here are
          // what a real preview would classify.
          const o = fixtureOutcome(st.day, { text: source.texts[0] ?? '' }, st.supersedes);
          rows.push({
            fileName: source.name, day: st.day, kind: 'imported',
            note: [`${o.imported} marked present.`, merged].filter(Boolean).join(' '),
            files: source.fileNames.length,
            withEmail: o.with_email, noEmail: o.no_email,
          });
          wrote = true;
          continue;
        }

        const preview = st.preview;
        const result = await csvCommit(preview.import_id, autoDecisions(preview.rows));
        wrote = true;
        const c = preview.counts;
        const noChange = nothingChanged(result.changes ?? null, result.overridden ?? null);
        rows.push({
          fileName: source.name, day: st.day,
          kind: noChange ? 'unchanged' : 'imported',
          note: noChange
            ? ['Every name was already marked on this register — nothing added, changed or duplicated.',
               merged].filter(Boolean).join(' ')
            : [
                `${result.present_or_extra} marked present.`,
                changeSummary(result.changes ?? null),
                st.supersedes ? `Replaced ${st.supersedes.file_name}.` : null,
                overrideSummary(result.overridden ?? null),
                merged,
              ].filter(Boolean).join(' '),
          files: source.fileNames.length,
          withEmail: c.matched ?? 0,
          noEmail: (c.noEmail ?? 0) + (c.possible ?? 0) + (c.ambiguous ?? 0) + (c.unmatched ?? 0),
        });
      } catch (err) {
        rows.push({
          fileName: source.name, day: st.day, kind: 'failed',
          note: err instanceof Error
            ? `${err.message} Nothing was written for this file.`
            : 'This file did not import. Nothing was written for it.',
          files: source.fileNames.length,
          withEmail: 0, noEmail: 0,
        });
      }
    }

    // Once for the batch, not once per file: every mounted list re-reads, and
    // it only has to be told the register moved.
    if (wrote) attendanceImported();
    setBatch(assembleBatch(rows, order));
    setPhase('done');
  };

  const warnInk = theme.isDark ? STATUS.awaiting.fgDark : STATUS.awaiting.fgLight;
  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;
  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;

  /* -------------------------------------------- did this import move anything
   *
   * The same class exported twice is not the same FILE twice: Meet writes a
   * new export each time, so the fingerprint differs, the import runs, and it
   * writes a register that already says exactly what it says. Nothing is
   * duplicated -- every row is an upsert on attendance_unique_live -- but
   * "12 marked present" was the whole of what the second upload reported, and
   * it is word for word what the first one reported too.
   *
   * These two decide which result the screen shows. `nothingChanged` answers
   * false when the server did not send the counts at all, so an older project
   * gets the result it always got rather than a claim nobody measured.
   */
  const noChange = nothingChanged(outcome?.changes ?? null, outcome?.override ?? null);
  const noChangeText = outcome && noChange && outcome.changes
    ? noChangeWords(outcome.changes, { day: outcome.session_date, course: chosen, label: dayLabel })
    : null;
  const changed = outcome && !noChange ? changeSummary(outcome.changes) : null;

  /* ----------------------------------------------- what the file says it is
   *
   * THIS PANEL CHANGED MEANING TWICE. It used to ask "does the file match the
   * session you picked" -- a check that only made sense while a session was
   * something chosen in advance. The day now comes FROM the file, and a file
   * that disagrees with the day she opened is asked about outright, so what
   * is left here is a statement of what the file said it was.
   */
  const fileDate = meetCreatedDate(file?.meta.created ?? null);
  const fileTime = meetCreatedTime(file?.meta.created ?? null);

  const sessionMap: { label: string; value: string; ok: boolean | null }[] = file ? [
    { label: 'Meeting code', value: file.meta.code ?? 'not in this file',
      ok: file.meta.code ? true : null },
    { label: 'Session date', value: fileDate ? dayLabel(fileDate) : 'not in this file',
      ok: fileDate ? true : null },
    { label: 'Started at', value: fileTime ?? 'no time in this file',
      ok: fileTime ? true : null },
    { label: 'Course', value: target ? `${target.course} · ${target.branch}` : '—', ok: null },
    { label: 'Rows read', value: `${file.rows}`, ok: true },
  ] : [];

  const sessionMapPanel = file ? (
    <View style={{
      marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
      backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Icon name="link" size={17} color={theme.accentInk} />
        <Label style={{ flex: 1 }}>Mapped to this session</Label>
      </View>

      <View style={{ gap: 9, marginTop: SPACE.md }}>
        {sessionMap.map(row => (
          <View key={row.label}
            style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            <Text style={{ flex: 1, fontSize: 11.5, color: theme.muted }}>{row.label}</Text>
            <Text numberOfLines={1} style={{
              flexShrink: 1, fontSize: 12, fontWeight: '700',
              color: theme.fgStrong, fontVariant: ['tabular-nums'],
            }}>{row.value}</Text>
            {/* the icon is a SECOND encoding of row.ok, never the only one --
                the note below spells out anything that is missing */}
            <Icon
              name={row.ok === null ? 'lock' : row.ok ? 'check_circle' : 'warning'}
              size={15}
              color={row.ok === null ? theme.dim : row.ok ? okInk : warnInk} />
          </View>
        ))}
      </View>

      <View style={{
        marginTop: SPACE.md, paddingTop: SPACE.md,
        borderTopWidth: 1, borderTopColor: theme.line,
      }}>
        <Text style={{ fontSize: 11.5, lineHeight: 17, color: fileDate ? theme.muted : warnInk }}>
          {fileDate
            ? 'The meeting code and date come from the lines above the table in the Meet file — that is what says which session this is. The course and branch come from RosiFit, never from the file.'
            : 'This file carries no “Created on” line, so RosiFit cannot tell which day it covers. Pick a day awaiting a file instead, or export it again from Meet.'}
        </Text>
      </View>
    </View>
  ) : null;

  return (
    <>
      {phase === 'choose' && (pending.state === 'loading' || courses.state === 'loading') && (
        <Skeleton lines={4} />
      )}

      {phase === 'choose' && courses.state === 'error' && (
        <ErrorState onRetry={courses.retry}
          message={courses.error ?? 'The course list could not be loaded. Nothing has been changed.'} />
      )}

      {/* NO COURSES is the only state that genuinely blocks an upload. It used
          to be "no session is awaiting a file", which blocked the case this
          screen exists for: an academy that schedules as it goes has no
          sessions waiting and a file to import all the same. */}
      {phase === 'choose' && courses.state === 'ready' && targets.length === 0 && (
        <EmptyState
          title={courseId ? 'This course runs at no branch yet' : 'No course to upload for'}
          body="A file is imported into a course at a branch, so add that first. The days it runs do not have to be decided — the attendance file says which day it covers."
          action={courseId ? 'Show every course' : 'Add a course'}
          onAction={() => router.replace(courseId ? '/upload' : '/course/edit')} />
      )}

      {phase === 'choose' && courses.state === 'ready' && targets.length > 0 && (
        <>
          {/* THE WAY BACK OUT OF "Change".
              Only drawn when Change is how she got here: the dialog opens on
              this list, and a Back button on the first screen of a flow points
              at nothing. It restores the course and the day she pressed Change
              on, which puts her back on the file card exactly as she left it —
              the × stays what it always was, the way out of the whole dialog,
              and is no longer also the only way out of this list. */}
          {returnTo ? (
            <Pressable testID="upload-choose-back"
              onPress={() => {
                setTarget(returnTo.target);
                setSession(returnTo.session);
                setReturnTo(null);
                setFailure(null);
                setPhase('pick');
              }}
              accessibilityRole="button"
              accessibilityLabel={`Back to uploading for ${returnTo.target.course} at ${returnTo.target.branch}`}
              style={({ pressed }) => ({
                alignSelf: 'flex-start', marginBottom: SPACE.md,
                minHeight: 34, paddingHorizontal: 12, borderRadius: RADIUS.sm,
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Icon name="arrow_back" size={15} color={theme.accentInk} />
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.fg }}>Back</Text>
            </Pressable>
          ) : null}

          {/* Days already awaiting a file come first, because when there IS
              one it is almost always the answer -- and taking the shortcut
              also lets the screen check the file's date against that day. */}
          {sessions.length > 0 ? (
            <>
              <Label>{`Waiting for a file · ${sessions.length}`}</Label>
              <View style={{ gap: SPACE.sm, marginTop: SPACE.sm, marginBottom: SPACE.lg }}>
                {sessions.map(sn => (
                  <Pressable key={sn.label} testID={`upload-session-${sn.session_date}`}
                    onPress={() => {
                      setSession(sn);
                      setTarget({ offering_id: sn.offering_id, course: sn.course,
                        branch: sn.meta.split(' · ')[0] ?? '' });
                      // She chose, so the detour is over and there is nothing
                      // left to go back to.
                      setReturnTo(null);
                      setFile(null); setOutcome(null); setAlready(null); setBatch(null); setBatchAsk(null); setBatchCount(0); setFailure(null); setPhase('pick');
                    }}
                    accessibilityRole="button" accessibilityLabel={`${sn.title}. ${sn.meta}`}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.lg,
                      borderRadius: RADIUS.lg, backgroundColor: theme.surface,
                      borderWidth: 1, borderColor: statusSurface(warnInk).border,
                      opacity: pressed ? 0.75 : 1,
                    })}>
                    <View style={{ alignItems: 'center', width: 40 }}>
                      <Text style={{ fontSize: 22, fontWeight: '800', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
                        {sn.dayNum}
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.muted }}>{sn.mon}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '700', color: theme.fgStrong }}>{sn.title}</Text>
                      <Text style={{ fontSize: 11.5, color: theme.muted }}>{sn.meta}</Text>
                    </View>
                    <Icon name="chevron_right" size={22} color={warnInk} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {/* ALWAYS PRESENT, whatever is or is not scheduled. This is the row
              that makes an unscheduled class uploadable at all. */}
          <Label>{sessions.length ? 'Or any course, any day' : 'Choose the course'}</Label>
          <Body style={{ marginTop: 6 }}>
            The file says which day it covers, so the class does not have to have been scheduled.
          </Body>
          <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
            {targets.map(t => (
              <Pressable key={t.offering_id} testID={`upload-offering-${t.offering_id}`}
                onPress={() => {
                  setTarget(t); setSession(null); setReturnTo(null);
                  setFile(null); setOutcome(null); setAlready(null); setBatch(null); setBatchAsk(null); setBatchCount(0); setFailure(null); setPhase('pick');
                }}
                accessibilityRole="button"
                accessibilityLabel={`Upload a file for ${t.course} at ${t.branch}`}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.lg,
                  borderRadius: RADIUS.lg, backgroundColor: theme.surface,
                  borderWidth: 1, borderColor: theme.line, opacity: pressed ? 0.75 : 1,
                })}>
                <Icon name="school" size={20} color={theme.accentInk} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: theme.fgStrong }}>{t.course}</Text>
                  <Text style={{ fontSize: 11.5, color: theme.muted }}>{t.branch}</Text>
                </View>
                <Icon name="chevron_right" size={22} color={theme.muted} />
              </Pressable>
            ))}
          </View>

          {courseId ? (
            <Pressable testID="upload-show-all" onPress={() => router.replace('/upload')}
              accessibilityRole="button" accessibilityLabel="Show every course"
              style={({ pressed }) => ({
                alignSelf: 'flex-start', marginTop: SPACE.md,
                minHeight: 34, paddingHorizontal: 12, borderRadius: RADIUS.sm,
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Icon name="list" size={15} color={theme.accentInk} />
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.fg }}>Show every course</Text>
            </Pressable>
          ) : null}
        </>
      )}

      {/* ------------------------------------------------------- pick a file
          The whole of the upload, for anybody who arrived from a course or a
          day: one card, one button, and the import runs on the pick. */}
      {(phase === 'pick' || phase === 'working') && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md }}>
            <View style={{ flex: 1 }}>
              {/* "Session" was a promise this screen can no longer make at
                  this point: the session is whatever day the FILE says, and
                  the file has not been chosen yet. */}
              <Label>{session ? 'Session' : 'Uploading for'}</Label>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.fgStrong, marginTop: 4 }}>{chosen}</Text>
            </View>
            {/* The only way back to the picker, and it must exist: opening
                from a day preselects the session, so without this a wrong
                preselect would be a trap. router.replace drops the scope
                params too -- otherwise the picker would reopen on the one
                session she is trying to get away from. */}
            <Pressable testID="upload-change-session" onPress={() => {
                // Held BEFORE it is cleared: this is what Back puts back.
                setReturnTo(target ? { target, session } : null);
                setSession(null); setTarget(null); setAsk(null);
                setFile(null); setOutcome(null); setAlready(null); setBatch(null); setBatchAsk(null); setBatchCount(0); setFailure(null); setPhase('choose');
                router.replace('/upload');
              }}
              accessibilityRole="button" accessibilityLabel="Choose a different session"
              style={({ pressed }) => ({
                minHeight: 34, paddingHorizontal: 12, borderRadius: RADIUS.sm,
                justifyContent: 'center',
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.fg }}>Change</Text>
            </Pressable>
          </View>

          <View style={{
            marginTop: SPACE.lg, padding: SPACE.xl, borderRadius: RADIUS.lg,
            backgroundColor: theme.surface2, borderWidth: 1, borderStyle: 'dashed',
            borderColor: theme.lineStrong, alignItems: 'center',
          }}>
            <Icon name="description" size={30} color={theme.accentInk} />
            <H2 style={{ marginTop: SPACE.md }}>Choose the Google Meet CSVs</H2>
            {/* SEVERAL AT ONCE, said before the picker opens rather than
                discovered. The picker has always taken one file; nothing on
                the card would tell an operator with four exports that she can
                now hand over all four. */}
            <Muted style={{ marginTop: 6, textAlign: 'center' }}>
              Choose one file or several — each one lands on the day its own “Created on” line says.
              Several calls on the same day merge into that day’s register.
            </Muted>
            {/* C-74: name the three columns, so an operator handed a
                different export can tell at a glance that it will not parse */}
            <Muted style={{ marginTop: 6, textAlign: 'center' }}>
              Meet exports one row per participant with join and leave times.
            </Muted>
            <Muted style={{ marginTop: 6, textAlign: 'center' }}>
              {`RosiFit reads the Meet export: ${CSV_COLUMNS.join(' · ')}. There is no email column.`}
            </Muted>
            {/* Said out loud because the parser USED to get this wrong: it
                read the first line as the header, so a genuine Meet export --
                which starts with the meeting code and the created and ended
                times -- was refused for having no Full Name column. */}
            <Muted style={{ marginTop: 6, textAlign: 'center' }}>
              Meet writes its own lines first — meeting code, created and ended times — then the
              table. RosiFit reads past those, so upload the file exactly as Meet gave it to you.
            </Muted>
            {/* WHAT THE BUTTON DOES, before it is pressed. It no longer
                stages a file for review, and a button that imports a register
                the moment it is pressed has to say so. */}
            <Body style={{ marginTop: SPACE.md, textAlign: 'center', fontWeight: '700' }}>
              They import as soon as you choose them.
            </Body>
            {/* The course ask stands between this press and the file picker
                now, on every upload. The button keeps its name -- Browse files
                is still what it leads to -- because the ask names itself. */}
            <Button testID="upload-browse"
              label={phase === 'working' ? 'Importing…' : 'Browse files'}
              variant="secondary" disabled={phase === 'working'}
              style={{ marginTop: SPACE.md }}
              onPress={() => { setFailure(null); setPhase('course'); }} />
          </View>

          {phase === 'working' ? (
            <View testID="upload-working" accessibilityLiveRegion="polite" style={{
              marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
              flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
              backgroundColor: statusSurface(theme.accentInk).bg,
              borderWidth: 1, borderColor: statusSurface(theme.accentInk).border,
            }}>
              <Icon name="cloud_upload" size={20} color={theme.accentInk} />
              <Body style={{ flex: 1, fontSize: 12.5 }}>
                {/* A batch does not set `file`, because there is no one file
                    it is working on. It says how many instead. */}
                {batchCount > 1
                  ? `Importing ${batchCount} files — matching every name against the register.`
                  : `Importing ${file?.name ?? 'the file'} — matching every name against the register.`}
              </Body>
            </View>
          ) : null}

          {/* ONE PANEL, TWO TEMPERS. Red and `error` when the upload went
              wrong; amber and `warning` when it simply cannot run yet, which
              today is a file dated ahead of the class. Reading "a future date"
              in the colour reserved for things that broke is what the caution
              was asked for. The testID is unchanged either way -- it is the
              same panel in the same place, saying why the file did not go. */}
          {failure && phase !== 'working' && (() => {
            const ink = failure.caution ? warnInk : dangerInk;
            const box = statusSurface(ink);
            return (
              <View
                testID="upload-failure"
                accessibilityLiveRegion="polite"
                style={{
                  marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
                  flexDirection: 'row', gap: SPACE.md,
                  backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
                }}>
                {/* the icon is the second encoding, never the only one: the
                    sentence itself says "a future date" (CP-010) */}
                <Icon name={failure.caution ? 'warning' : 'error'} size={20} color={ink} />
                <Body style={{ flex: 1, fontSize: 12.5, lineHeight: 19 }}>{failure.text}</Body>
              </View>
            );
          })()}

          {/* A file with no "Created on" line never imports at all, and this
              panel is what says why. Any other file is already on its way. */}
          {file && !fileDate && phase !== 'working' ? sessionMapPanel : null}
        </>
      )}

      {/* ------------------------------------------------- which course is this
          Asked before the picker opens, on EVERY upload. Nothing has been read
          yet, so this ask knows only the course and the branch -- which is the
          whole of what it is for. Accent-inked, not warn: nothing is wrong
          here, and spending the warning colour on an ordinary confirmation is
          how the two asks that DO carry a risk stop being read. */}
      {phase === 'course' && target ? (
        <AskPanel testID="upload-course-confirm" ink={theme.accentInk} icon="school"
          words={courseConfirmWords({ course: target.course, branch: target.branch })}
          onConfirm={() => { setPhase('pick'); void choose(); }}
          onCancel={() => setPhase('pick')} />
      ) : null}

      {/* ------------------------------------------------------- the one ask
          The file is from another day, or the day already holds a register
          this file replaces, or both -- and both are answered by one confirm.
          The words are in src/data/uploadOverride.ts, where a spec can read
          them; what is here is only how they are drawn. */}
      {phase === 'confirm' && ask ? (
        <AskPanel testID="upload-confirm" ink={warnInk}
          /* history for "this is about a day gone by", warning for
             "something you have is about to be replaced" */
          icon={ask.ask.overrides ? 'warning' : 'history'}
          words={askWords(ask.ask, {
            fileName: ask.file.name, course: chosen, label: dayLabel,
          })}
          onConfirm={() => {
            const held = ask;
            setAsk(null);
            void commit(held.file, held.staged);
          }}
          onCancel={() => { setAsk(null); setFile(null); setPhase('pick'); }} />
      ) : null}

      {/* --------------------------------------------- the one ask, for a batch
          Every file previewed, none written. The list of registers about to be
          replaced is in the words (uploadBatch.ts); one confirm covers the
          whole upload, which is the only way a nine-file pick does not become
          nine dialogs. */}
      {phase === 'confirm' && batchAsk ? (
        <AskPanel testID="upload-batch-confirm" ink={warnInk} icon="warning"
          words={batchAsk.words}
          onConfirm={() => {
            const held = batchAsk;
            setBatchAsk(null);
            void commitBatch(held.staged, held.other, held.order);
          }}
          onCancel={() => { setBatchAsk(null); setPhase('pick'); }} />
      ) : null}

      {/* ------------------------------------------------- the result, for a batch
          A row per file she picked, in the order she picked them, whether it
          landed or not. The two counts above are the whole upload's; each row
          carries its own day and its own sentence. */}
      {phase === 'done' && batch ? (
        <View testID="upload-batch-done">
          <View style={{
            padding: SPACE.xl, borderRadius: RADIUS.lg,
            backgroundColor: statusSurface(batch.imported > 0 ? okInk : warnInk).bg,
            borderWidth: 1,
            borderColor: statusSurface(batch.imported > 0 ? okInk : warnInk).border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Icon name={batch.imported > 0 ? 'check_circle' : 'warning'} size={20}
                color={batch.imported > 0 ? okInk : warnInk} />
              {/* the word, never the colour alone (CP-010) */}
              <Text testID="upload-batch-title" style={{
                flex: 1, fontSize: 13.5, fontWeight: '800',
                color: batch.imported > 0 ? okInk : warnInk,
              }}>
                {batchHeading(batch.imported, batch.days, chosen)}
              </Text>
            </View>
            {batch.files > batch.imported ? (
              <Muted style={{ marginTop: 4, color: theme.fg }}>
                {`${batch.files - batch.imported} of the ${batch.files} files you chose `
                 + `did not import. Each one says why below.`}
              </Muted>
            ) : null}
          </View>

          {/* THE SAME TWO COUNTS, over the whole upload. The requester's
              "with email and no email" does not stop being the question
              because four files answered it instead of one. */}
          <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
            <Landed testID="upload-with-email" n={batch.withEmail} icon="mail"
              word="With email" ink={okInk}
              note="On the register, and counted for follow-up." />
            <Landed testID="upload-no-email" n={batch.noEmail} icon="mail_off"
              word="No email" ink={dangerInk}
              note="Marked present, listed under No email on the course." />
          </View>

          {/* One row per REGISTER the upload touched, plus one per file it
              could not run — so a day built from two calls is one row naming
              both. The label counts rows, and says so, rather than promising
              a file each. */}
          <Label style={{ marginTop: SPACE.lg }}>
            {`${batch.files} ${batch.files === 1 ? 'file' : 'files'} · ${batch.rows.length} ${batch.rows.length === 1 ? 'result' : 'results'}`}
          </Label>
          <View style={{ gap: SPACE.sm, marginTop: SPACE.sm }}>
            {batch.rows.map(row => (
              <BatchFileRow key={row.fileName} row={row} day={dayLabel(row.day)}
                okInk={okInk} warnInk={warnInk} dangerInk={dangerInk} />
            ))}
          </View>

          <Button testID="upload-batch-another" label="Upload more files" variant="secondary"
            style={{ marginTop: SPACE.lg }}
            onPress={() => {
              setAsk(null);
              setFile(null); setOutcome(null); setAlready(null); setBatch(null); setBatchAsk(null); setBatchCount(0); setFailure(null); setPhase('pick');
            }} />
        </View>
      ) : null}

      {/* ---------------------------------------------------------- the result
          "just show how many student with email and no email" -- the two
          numbers the requester asked for, and where each group landed. */}
      {phase === 'done' && outcome ? (
        <View testID="upload-done">
          <View style={{
            padding: SPACE.xl, borderRadius: RADIUS.lg,
            backgroundColor: statusSurface(okInk).bg,
            borderWidth: 1, borderColor: statusSurface(okInk).border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Icon name="check_circle" size={20} color={okInk} />
              {/* THE HEADING IS THE ANSWER. "Imported · Mon 31 Aug" over a
                  register this file did not move is true and useless: it is
                  what the first upload said, so it cannot tell her this one
                  was the second. The word carries it, never the colour --
                  nothing here went wrong (CP-010).

                  THE COURSE IS IN IT NOW, between the word and the day, and
                  the day stays. It used to be readable only in the sentence
                  underneath, and that sentence has gone: with the course here
                  and the two counts directly below, "N marked present on the
                  X register" was the heading and the tiles said again. */}
              <Text testID="upload-done-title"
                style={{ flex: 1, fontSize: 13.5, fontWeight: '800', color: okInk }}>
                {`${noChange ? 'Nothing to update' : 'Imported'} · ${chosen} · ${dayLabel(outcome.session_date)}`}
              </Text>
            </View>
            {/* KEPT for "nothing to update", and only for it. That case has no
                counts worth reading -- every tile is a number the register
                already had -- so this sentence is the whole of what happened,
                and it exists nowhere else on the screen. */}
            {noChangeText ? (
              <>
                <Muted style={{ marginTop: 4, color: theme.fg }}>{noChangeText.lines[0]}</Muted>
                <Muted style={{ marginTop: SPACE.sm }}>{noChangeText.note}</Muted>
              </>
            ) : null}
          </View>

          {/* THE TWO COUNTS, side by side, each saying where that group is
              now -- the answer to "they should be landing in respective
              sections" is a sentence under the number, not something to go
              and check. */}
          <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
            <Landed testID="upload-with-email" n={outcome.with_email} icon="mail"
              word="With email" ink={okInk}
              note="On the register, and counted for follow-up." />
            <Landed testID="upload-no-email" n={outcome.no_email} icon="mail_off"
              word="No email" ink={dangerInk}
              note="Marked present, listed under No email on the course." />
          </View>

          {/* ADDED, UPDATED, SKIPPED -- the requester's three words, over a
              file that is part new and part already there. The two tiles
              above say who landed; this says which of them the register did
              not already have, which is the half that was missing. */}
          {changed ? (
            <Note testID="upload-changes" ink={theme.accentInk} icon="list"
              title="What this file changed" body={changed} />
          ) : null}

          {/* THE "N OF THEM ARE NEW" PARAGRAPH IS GONE. Removed on request,
              08-Sep-2026: it sat directly under the two count tiles and
              re-explained them. The No email tile already says where those
              women are ("listed under No email on the course"), and the merge
              it described — "Add display name to existing member" — is a
              button on that group, where she is standing when she needs it.
              With nothing left reading it, `new_members` came off the local
              Outcome type too rather than being written and ignored — the
              count it carried is `csvCommit`'s and is still returned. */}

          {/* A NAME THIS COURSE SHARES WITH ANOTHER ONE.
              A member has one live enrolment, so a name whose only member is
              in another course is not that member — she is added here as
              somebody new rather than marked present over there. That is a
              judgement, and it is the one the import can be wrong about when
              a woman really has moved course, so it is never made silently:
              the names are here, with the two taps that undo it. */}
          {outcome.other_course.length > 0 ? (
            <Note testID="upload-other-course" ink={warnInk} icon="swap_horiz"
              title={`${outcome.other_course.length} ${outcome.other_course.length === 1 ? 'name belongs' : 'names belong'} to another course`}
              body={`${outcome.other_course.join(', ')} ${outcome.other_course.length === 1 ? 'matches a member' : 'match members'} enrolled elsewhere, and a member is in one course at a time — so ${outcome.other_course.length === 1 ? 'they were added to this course as somebody new' : 'they were added to this course as new members'}, not marked present on the other register. If it is the same member, “Add display name to existing member” on the course folds them in and carries their attendance across.`} />
          ) : null}

          {/* WHO RAN THE CLASS. Named, because leaving the instructor off the
              register silently is how somebody concludes the import missed
              her. */}
          {outcome.staff.length > 0 ? (
            <Note testID="upload-staff" ink={theme.accentInk} icon="school"
              title={`${outcome.staff.length} staff ${outcome.staff.length === 1 ? 'name' : 'names'} left off the register`}
              body={`${outcome.staff.join(', ')} ${outcome.staff.length === 1 ? 'was' : 'were'} in the call as staff, not as a member. Attendance is for members, so they are not counted here.`} />
          ) : null}

          {/* ONE PERSON, ONE SESSION, ONE DAY -- with the names. Meet writes
              a line per JOIN, so anybody whose connection dropped is in the
              file twice; collapsing that silently would leave a file that
              says 14 rows importing 12 with no explanation. */}
          {outcome.duplicates.length > 0 ? (
            <Note testID="upload-duplicates" ink={warnInk} icon="content_copy"
              title={`${outcome.duplicates.length} repeated ${outcome.duplicates.length === 1 ? 'name' : 'names'} — counted once`}
              body={`${outcome.duplicates.join(', ')} ${outcome.duplicates.length === 1 ? 'appears' : 'appear'} more than once, which Meet does when somebody rejoins. They are marked present once — a member cannot be in their own session twice.`} />
          ) : null}

          {outcome.dropped.length > 0 ? (
            <Note testID="upload-dropped" ink={warnInk} icon="remove_circle"
              title={`${outcome.dropped.length} row${outcome.dropped.length === 1 ? '' : 's'} dropped before matching`}
              body={`${outcome.dropped.join(', ')} — a blank name, or a repeat of another row.`} />
          ) : null}

          {/* A day that already had a file. Not refused -- a corrected export
              is a real thing -- but never silent: one session per day is a
              database invariant, so this file UPDATED that register. */}
          {outcome.supersedes ? (
            <Note testID="upload-superseded" ink={warnInk} icon="history"
              title="This day already had a file"
              body={`${outcome.supersedes} was imported for this course on this date. This file CORRECTED that register rather than adding to it — nobody is counted twice.`
                // What the override actually moved, when the server said. A
                // promise that existing data would be replaced is worth
                // nothing if nobody can see what it replaced.
                + (overrideSummary(outcome.override) ? ` ${overrideSummary(outcome.override)}` : '')} />
          ) : null}

          {sessionMapPanel}

          {/* NO DONE BUTTON. Removed on request. The way out of this dialog is
              the × in FormDialog's own bar, which is where every other dialog
              in the app puts it -- a Done that only ever called router.back()
              was a second name for the same control, sitting under a result
              nobody has to acknowledge. `Upload another file` stays: it is the
              one thing here that is not a close. */}
          <Button testID="upload-another" label="Upload another file" variant="secondary"
            style={{ marginTop: SPACE.lg }}
            onPress={() => {
              setAsk(null);
              setFile(null); setOutcome(null); setAlready(null); setBatch(null); setBatchAsk(null); setBatchCount(0); setFailure(null); setPhase('pick');
            }} />
        </View>
      ) : null}

      {/* -------------------------------------------- already imported, exactly
          The fingerprint matched a completed import, so csv-import staged
          nothing and there is nothing to commit. A RESULT, not a failure:
          the file is in, the register says so, and the only thing owed is
          that sentence. The words are in src/data/uploadOutcome.ts. */}
      {phase === 'done' && !outcome && already ? (
        <View testID="upload-already">
          <View style={{
            padding: SPACE.xl, borderRadius: RADIUS.lg,
            backgroundColor: statusSurface(theme.accentInk).bg,
            borderWidth: 1, borderColor: statusSurface(theme.accentInk).border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Icon name="history" size={20} color={theme.accentInk} />
              {/* the word, never the colour alone (CP-010) */}
              <Text testID="upload-already-title"
                style={{ flex: 1, fontSize: 13.5, fontWeight: '800', color: theme.accentInk }}>
                {already.title}
              </Text>
            </View>
            {already.lines.map((line, i) => (
              <Body key={line} style={{ marginTop: i === 0 ? SPACE.md : SPACE.sm, lineHeight: 20 }}>
                {line}
              </Body>
            ))}
            <Muted style={{ marginTop: SPACE.md }}>{already.note}</Muted>
          </View>

          <Button testID="upload-already-close" label="Done" style={{ marginTop: SPACE.lg }}
            onPress={() => router.back()} />
          <Button testID="upload-already-another" label="Upload another file" variant="secondary"
            style={{ marginTop: SPACE.sm }}
            onPress={() => {
              setAsk(null);
              setFile(null); setOutcome(null); setAlready(null); setBatch(null); setBatchAsk(null); setBatchCount(0); setFailure(null); setPhase('pick');
            }} />
        </View>
      ) : null}
    </>
  );
}

/**
 * A QUESTION THIS DIALOG STOPS TO ASK, drawn the one way.
 *
 * There are two of them now -- the course, before the picker, and the day /
 * override, after the preview -- and they are the same object to whoever is
 * reading: a tinted panel, a worded title with its own icon, the sentences,
 * the quieter note, then yes and no in that order. Written once so the second
 * ask cannot drift away from the first, and so `${testID}-go` / `-cancel` are
 * spelled in one place: those two are the names round 4's browser evidence
 * and the testid baseline already know `upload-confirm` by.
 *
 * The words are never in here. They live in src/data/uploadOverride.ts, where
 * the specs run under plain node and can read them.
 */
function AskPanel({ testID, ink, icon, words, onConfirm, onCancel }: {
  testID: string; ink: string; icon: string; words: AskWords;
  onConfirm: () => void; onCancel: () => void;
}) {
  const box = statusSurface(ink);
  return (
    <View testID={testID}>
      <View style={{
        padding: SPACE.xl, borderRadius: RADIUS.lg,
        backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Icon name={icon} size={20} color={ink} />
          {/* the word as well as the colour (CP-010) */}
          <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '800', color: ink }}>
            {words.title}
          </Text>
        </View>
        {words.lines.map((line, i) => (
          <Body key={line} style={{ marginTop: i === 0 ? SPACE.md : SPACE.sm, lineHeight: 20 }}>
            {line}
          </Body>
        ))}
        <Muted style={{ marginTop: SPACE.md }}>{words.note}</Muted>
      </View>

      <Button testID={`${testID}-go`} label={words.confirm}
        style={{ marginTop: SPACE.lg }} onPress={onConfirm} />
      <Button testID={`${testID}-cancel`} label={words.cancel} variant="secondary"
        style={{ marginTop: SPACE.sm }} onPress={onCancel} />
    </View>
  );
}

/**
 * One of the two counts the requester asked for, with the section it landed
 * in written underneath it. The number alone answers "how many"; the line
 * under it answers "and where did they go", which is the other half of what
 * was asked.
 */
function Landed({ testID, n, icon, word, ink, note }: {
  testID: string; n: number; icon: string; word: string; ink: string; note: string;
}) {
  const { theme } = useTheme();
  const box = statusSurface(ink);
  return (
    <View testID={testID} accessible accessibilityLabel={`${n} ${word}. ${note}`}
      style={{
        flex: 1, padding: SPACE.lg, borderRadius: RADIUS.md,
        backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={16} color={ink} />
        {/* the WORD, never the colour alone (CP-010) */}
        <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: ink }}>{word}</Text>
      </View>
      <Text style={{
        fontSize: 30, fontWeight: '800', marginTop: 4,
        color: theme.fgStrong, fontVariant: ['tabular-nums'],
      }}>{n}</Text>
      <Text style={{ fontSize: 11, lineHeight: 16, color: theme.muted, marginTop: 2 }}>{note}</Text>
    </View>
  );
}

/**
 * ONE FILE OF A BATCH, and what became of it.
 *
 * Five outcomes, each with its own word AND its own icon, because a row whose
 * only difference from the row above it is a colour is a row nobody can read
 * (guardrail 3, CP-010). The day is on the row, not in a heading: with four
 * files there is no single day to head anything with.
 */
const BATCH_KIND: Record<BatchRow['kind'], { word: string; icon: string }> = {
  imported: { word: 'Imported', icon: 'check_circle' },
  unchanged: { word: 'Nothing to update', icon: 'history' },
  already: { word: 'Already imported', icon: 'history' },
  setAside: { word: 'Not imported', icon: 'warning' },
  failed: { word: 'Failed', icon: 'error' },
};

function BatchFileRow({ row, day, okInk, warnInk, dangerInk }: {
  row: BatchRow; day: string; okInk: string; warnInk: string; dangerInk: string;
}) {
  const { theme } = useTheme();
  const ink = row.kind === 'imported' ? okInk
    : row.kind === 'failed' ? dangerInk
    : warnInk;
  const box = statusSurface(ink);
  const { word, icon } = BATCH_KIND[row.kind];
  return (
    <View testID={`upload-batch-row-${row.fileName}`}
      accessible accessibilityLabel={`${row.fileName}. ${word}. ${row.note}`}
      style={{
        padding: SPACE.lg, borderRadius: RADIUS.md,
        backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={16} color={ink} />
        {/* the WORD, never the colour alone (CP-010) */}
        <Text style={{ fontSize: 11, fontWeight: '800', color: ink }}>{word}</Text>
        {/* A file set aside before its date could be read has no day to show,
            and "—" beside it would be a value rather than an absence. */}
        {row.day ? (
          <Text style={{
            flex: 1, textAlign: 'right', fontSize: 11, fontWeight: '700',
            color: theme.muted, fontVariant: ['tabular-nums'],
          }}>{day}</Text>
        ) : null}
      </View>
      <Text numberOfLines={2} style={{
        fontSize: 12.5, fontWeight: '700', color: theme.fgStrong, marginTop: 5,
      }}>{row.fileName}</Text>
      <Text style={{ fontSize: 11.5, lineHeight: 17, color: theme.muted, marginTop: 3 }}>
        {row.note}
      </Text>
    </View>
  );
}

/** One thing the import did that nobody asked it to, said out loud. */
function Note({ testID, ink, icon, title, body }: {
  testID: string; ink: string; icon: string; title: string; body: string;
}) {
  const { theme } = useTheme();
  const box = statusSurface(ink);
  return (
    <View testID={testID} style={{
      flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md, padding: SPACE.lg,
      borderRadius: RADIUS.md, backgroundColor: box.bg,
      borderWidth: 1, borderColor: box.border,
    }}>
      <Icon name={icon} size={18} color={ink} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: ink }}>{title}</Text>
        <Muted style={{ marginTop: 4, color: theme.fg }}>{body}</Muted>
      </View>
    </View>
  );
}

/**
 * The result the walkthrough and the route harness show, with no project
 * configured. Derived from the same five fixture outcomes the review screen
 * used to walk through, so the numbers on the screen are the numbers the
 * fixtures actually describe rather than a pleasing invention.
 */
function fixtureOutcome(day: string, source: { text: string }, supersedes: Supersedes): Outcome {
  const kinds = MATCH_ROWS.map(r => r.kind);
  const withEmail = kinds.filter(k => k === 'matched').length;
  const newMembers = kinds.filter(k => k === 'possible' || k === 'ambiguous' || k === 'unmatched').length;
  const noEmail = kinds.filter(k => k === 'noEmail').length + newMembers;
  return {
    session_date: day,
    with_email: withEmail,
    no_email: noEmail,
    imported: withEmail + noEmail,
    dropped: [],
    staff: [],
    other_course: [],
    duplicates: [...new Set(dedupeRows(parseMeetCsv(source.text).rows).duplicates)],
    supersedes: supersedes?.file_name ?? null,
    // The fixtures describe a register being replaced; they do not invent
    // numbers for what the replacing moved, because only the commit knows.
    override: null,
    // A walkthrough is always a FIRST import of these five rows: every name
    // it lands is new to the register. Saying so keeps the fixture result
    // honest -- and keeps a "nothing to update" panel, which is about a
    // second upload, out of a walkthrough that has only ever had one.
    changes: { added: withEmail + noEmail, updated: 0, unchanged: 0, absent_added: 0 },
  };
}

/**
 * A DIALOG over the screen that opened it, not a page you travel to.
 *
 * It used to be ShellScreen: the academy header, an "Upload attendance"
 * header with a back arrow, and the Home · Reports · More pill, filling the
 * window. The register being uploaded FOR was gone from view for the whole
 * of the upload. FormDialog draws the scrim and the card and carries the
 * same title and subtitle in its own bar; the × and a tap beside the card
 * are the way out, in the place every other dialog puts them.
 *
 * The other half is `presentation: 'transparentModal'` in app/_layout.tsx,
 * which keeps the screen underneath mounted and visible. The two only work
 * together -- change one and this stops being a dialog.
 */
export default function Upload() {
  return (
    // The subtitle used to end "matched before anything is written", which
    // stopped being true the moment the Import button went: the file is
    // matched AND written on the pick, and the bar has to say so.
    <FormDialog title="Upload attendance"
      subtitle="The register from Google Meet — the file says which day it covers">
      <UploadBody />
    </FormDialog>
  );
}
