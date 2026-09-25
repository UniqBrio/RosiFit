/**
 * TWO THINGS THE UPLOAD MUST NOT SAY.
 *
 * Both are about the same thing: the screen claiming to know something it
 * does not. The progress UI makes the result panel more authoritative-looking
 * than it was, so both are closed before it lands rather than after.
 *
 * WHY THE WORDS LIVE HERE. `app/upload.tsx` renders in React Native and the
 * specs run under plain node, so a sentence written inside the screen is a
 * sentence no test can read. Same reason as `uploadOutcome.ts` and
 * `uploadOverride.ts` next door.
 */

/**
 * ONE — A SUCCESS THAT NEVER HAPPENED (T-113, T-114).
 *
 * With no Supabase project configured, `app/upload.tsx` answers from
 * fixtures: it reports counts, a day and a register, and never sends a
 * request. That is right on the walkthrough and right during the static
 * export. It is a fabrication anywhere else, and on 17-Sep-2026 it was: a
 * stale Metro transform cache produced a fixture-mode bundle from a correct
 * `.env`, and an operator watched an import "succeed" that had not happened.
 * `isConfigured === false` was a `console.warn`, in `__DEV__` only, so
 * nothing on screen said a word.
 *
 * The runtime half of T-114's fix: on a real origin, fixture mode refuses
 * instead of inventing a result.
 *
 * WHAT COUNTS AS A DEVELOPMENT ORIGIN. Loopback, and the `.local` names a
 * phone on the same network reaches a dev server by. Everything else is
 * somewhere a person could be doing real work. An ABSENT host — native, and
 * the `expo export` prerender, where there is no `window` at all — is not a
 * production origin either, and must not be treated as one: refusing there
 * would break the export that builds the app.
 */
export function isDevelopmentOrigin(hostname: string | null | undefined): boolean {
  if (!hostname) return true;                       // native, or the prerender
  const host = hostname.toLowerCase();
  return host === 'localhost'
    || host === '127.0.0.1'
    || host === '::1'
    || host === '[::1]'
    || host === '0.0.0.0'
    || host.endsWith('.local')
    || host.endsWith('.localhost');
}

/**
 * The sentence to refuse an upload with, or null when there is nothing wrong.
 *
 * Deliberately NOT a caution: a build that cannot reach its database is
 * broken, and the amber "this cannot run yet" tone belongs to a file dated
 * tomorrow. It names what to check, because the two tells are cheap and the
 * person reading it is the one who can look: the address bar, and whether
 * the sign-in number pre-fills.
 */
export function fixtureModeRefusal(
  configured: boolean, hostname: string | null | undefined,
): string | null {
  if (configured || isDevelopmentOrigin(hostname)) return null;
  return 'This copy of RosiFit is not connected to its database, so it cannot import '
    + 'anything — and it must not pretend to. Nothing was uploaded and nothing was '
    + 'written. Reload the app; if this keeps happening, the deployment was built '
    + 'without its database settings and needs rebuilding before any attendance can '
    + 'be imported.';
}

/**
 * TWO — "NOTHING WAS WRITTEN", WHEN NOBODY KNOWS THAT.
 *
 * The commit is one transaction, and the client's only way of learning what
 * it did is the response (T-021, T-109). If the request reaches the server,
 * the transaction commits, and the REPLY is lost — a dropped connection, a
 * tab suspended mid-flight — then the register has moved and the screen says
 * `"… Nothing was written."` That sentence is not hedged and it can be
 * false, which makes it the worst kind of wrong: an operator who believes it
 * has been told the opposite of the truth about the day's register.
 *
 * TELLING THE TWO APART. `callFn` throws a `FunctionError` carrying the HTTP
 * status whenever the server ANSWERED (api.ts:16-40). An answer means the
 * request was processed and refused, and `commit_csv_import` raises inside
 * its transaction, so a refusal really did write nothing — that sentence
 * stays exactly as it was. No status means no answer came back at all, and
 * that is the case nobody can speak for.
 *
 * THE PREVIEW IS NOT AFFECTED and must not be. It stages a `csv_imports` row
 * at `previewed` and touches no attendance; both server-side checks count
 * only `completed`, so a lost preview reply really has written nothing.
 *
 * WHAT THIS DOES NOT DO. It does not reconcile. Reading the import back by
 * its `import_id` would settle the question outright and is the right next
 * step; it is a larger change than this one and is recorded as a follow-up
 * rather than smuggled in here. What it does is stop the screen asserting
 * something it cannot know, and point at the recovery that already exists —
 * `csv_imports_sha_completed` means re-uploading the same file is safe, and
 * `already_imported` answers with what the first one did.
 */
export function answeredByServer(err: unknown): boolean {
  return typeof err === 'object' && err !== null
    && 'status' in err && typeof (err as { status?: unknown }).status === 'number';
}

/** What went wrong, in the tense the client can actually defend. */
export function commitFailureText(err: unknown): string {
  const said = err instanceof Error && err.message ? err.message : null;

  // The server answered. It refused, inside the transaction, so the register
  // is untouched and the old sentence is true.
  if (answeredByServer(err)) {
    return said ? `${said} Nothing was written.` : 'The import did not run. Nothing was written.';
  }

  /* No answer came back. The import may have completed; it may never have
     arrived. Say that, and say what to do about it.

     `said` IS DELIBERATELY DROPPED HERE, and only here. On this branch no
     answer came back, so the only message available is the transport's own —
     supabase-js's "Failed to send a request to the Edge Function", a bare
     "Failed to fetch", or the read deadline's "nothing has been changed".
     The first two are machine detail in front of an operator; the third is
     WORSE, because it asserts the very thing this branch exists to stop the
     screen asserting, and the panel would then carry both claims at once.
     The answered branch above keeps its message, because that one is a
     sentence the function wrote for a person. */
  return 'RosiFit did not get an answer from the server, so it cannot tell whether this '
    + 'file was imported. Upload the same file again: if it already went in, RosiFit will '
    + 'say so and will not import it twice.';
}

/** The preview's failure. Nothing is staged that counts, so this is unchanged. */
export function previewFailureText(err: unknown): string {
  const said = err instanceof Error && err.message ? err.message : null;
  return said ? `${said} Nothing was written.` : 'The import did not run. Nothing was written.';
}
