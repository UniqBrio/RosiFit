/**
 * WHAT THE UPLOAD SAYS WHILE IT IS WORKING.
 *
 * WHAT WAS THERE. One sentence for the whole wait — *"Importing the file —
 * matching every name against the register."* — shown from the moment the
 * file was picked until the result appeared. It is true of the middle of the
 * upload and not of either end, and it says nothing at all about how far
 * along anything is.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 *   NO COUNTDOWN, NO SECONDS, NO PERCENTAGE. There is no measurement of this
 *   path anywhere in the repository — the matcher benchmark (T-068, V-01) has
 *   never been run, and the one production figure that exists is the ~1.5 s
 *   gap between a preview and its commit on four requests that all failed.
 *   A number on this screen would be invented, and an invented number that
 *   runs out is an invitation to conclude the upload is finished when it is
 *   not. The estimate comes back when there is something to estimate from.
 *
 *   NO SERVER SUB-STAGES. The client cannot see inside `csv-import`: it does
 *   not know when the paged member reads finished, when matching started, or
 *   where `commit_csv_import` is in its per-row loop. So the stages below are
 *   exactly the three things the CLIENT genuinely knows, because each one is
 *   a step it is itself performing or a request it is itself holding open.
 *   Nothing here claims more than that.
 *
 * THE STAGES, and what each one actually is:
 *
 *   reading   — the browser is reading the chosen files and parsing them.
 *               Synchronous and on the main thread, so in practice this is
 *               brief; it is named because for a large export it is not.
 *   matching  — `csvPreview` is open. Every name is being matched against
 *               the register, server-side. Usually the long half.
 *   writing   — `csvCommit` is open. One transaction, and the register is
 *               being changed.
 *
 * WHY THE WORDS LIVE HERE. `app/upload.tsx` renders in React Native and the
 * specs run under plain node, so a sentence written inside the screen is a
 * sentence no test can read. Same reason as `uploadOutcome.ts` next door.
 */

export type UploadStage = 'reading' | 'matching' | 'writing';

/**
 * How long a stage has to have been open before the screen says so.
 *
 * The point is honesty about a wait that is LASTING, not a running
 * commentary: a stage that comes and goes in a moment should not flash a
 * sentence nobody can read. Below this, the ordinary stage line stands.
 */
export const STILL_WORKING_MS = 10_000;

/**
 * The line shown while a stage is open.
 *
 * `files` is how many the operator chose, which is the one number this screen
 * legitimately has: the operator picked them. It says how much there is TO do, never
 * how long it will take.
 */
export function stageWords(stage: UploadStage, files: number): string {
  const many = files > 1;
  switch (stage) {
    case 'reading':
      return many
        ? `Reading ${files} files…`
        : 'Reading the file…';
    case 'matching':
      return many
        ? `Matching names against the register — ${files} files…`
        : 'Matching names against the register…';
    case 'writing':
      return many
        ? `Updating the register — ${files} files…`
        : 'Updating the register…';
  }
}

/**
 * THE SENTENCE FOR A WAIT THAT HAS GONE ON.
 *
 * Said only once a stage has genuinely been open for `STILL_WORKING_MS`, and
 * it promises nothing: not a duration, not a remaining amount, not that it
 * will succeed. What it does say is the one thing that matters to somebody
 * wondering whether to give up — that RosiFit is still waiting on the server,
 * and that nothing is decided until the server answers.
 *
 * This is the "Still processing…" state, and it is a LABEL. Nothing in the
 * app may read it, branch on it, or treat its appearance as an outcome: the
 * result is whatever `csvCommit` resolves or rejects with, and only that.
 */
export function stillWorkingWords(stage: UploadStage): string {
  return stage === 'writing'
    // "Do not close the app" overstated what closing costs, and this module
    // must not be the one that gets that wrong: the transaction is the
    // SERVER'S. Closing loses the report of what it did, not the writing of
    // it — which is exactly the case uploadSafety.ts exists for.
    ? 'Still writing the register. Leave this screen open — RosiFit will say what it did '
      + 'as soon as the server answers.'
    : 'Still processing. Larger files and larger registers take longer — RosiFit is '
      + 'waiting for the server and will say what it did when it answers.';
}

/**
 * The quiet line under the stage, for the whole of the wait.
 *
 * It is the promise the flow already keeps, said out loud: the result screen
 * appears when the server confirms what it did, and at no other moment.
 */
export const WAITING_NOTE =
  'Nothing is reported as imported until the server confirms it.';
