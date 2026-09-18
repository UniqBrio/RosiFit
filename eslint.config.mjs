/**
 * ONE RULE, and a note about why this file is nearly empty.
 *
 * ESLint IS now a dependency, as of T-035 (RV-22). It was not before, and this
 * header used to say so: the gate's Lint step (G6) reported BLOCKED because
 * there was no `eslint` binary, while `ci.yml` told a different story again —
 * "no ESLint configured in this project" — with this configured file sitting in
 * the repository root. Configured is exactly what it was. INSTALLED is what it
 * was not, and the two comments between them made it impossible to tell.
 *
 * The old header worried that installing a linter "would turn a BLOCKED step
 * into a few hundred findings that have nothing to do with this work". That is
 * why this file still carries ONE rule and no `extends`, no recommended set and
 * no stylistic plugin. It reports on the boundary below and on nothing else, so
 * turning it on cannot bury a real finding under a few hundred cosmetic ones.
 * Widening it is a separate decision, made deliberately, with its own row.
 *
 * `scripts/audits/check-data-layer-boundary.mjs` still enforces the same rule —
 * wired into `npm run audit:boundary` and `npm run audit:all`, and specced in
 * `src/data/dataLayerBoundary.test.ts`. The two are deliberately kept: the audit
 * reads text and catches a query written in a file ESLint does not parse; ESLint
 * reads the syntax tree and catches one the text scan spells differently. Either
 * alone has a blind spot the other covers.
 *
 * ────────────────────────────────────────────────────────────────────────
 * THE RULE: a Supabase query may only be written in `src/data/`.
 *
 * RC-039 was a read that returned 1,000 of 3,110 rows with `200 OK` and
 * `error: null`. The paging, the bounded shape and the truncation guard that
 * answer it all live in `src/data/pageAll.ts`, and every one of them is worth
 * nothing the first time a screen writes `supabase.from('members')` itself:
 * that read goes straight to the network past all three and reports success
 * while returning part of the table.
 *
 * The selector names the RECEIVER. A bare `.from(` matches `Array.from(`,
 * which appears six times in this app and none of them are queries.
 */
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/data/**'],
    // REGISTERED, NOT ENABLED. Three `eslint-disable-next-line
    // react-hooks/exhaustive-deps` comments already exist in this codebase,
    // written when nothing read them. ESLint refuses a disable directive that
    // names a rule it cannot find, so without this the first real run failed
    // with two errors that had nothing to do with any rule this file sets.
    //
    // No rule from the plugin is switched on. Turning on exhaustive-deps means
    // auditing every hook in app/, which is a separate decision on another
    // session's surface, and burying this file's one rule under it is exactly
    // what the header above says not to do.
    plugins: { 'react-hooks': reactHooks },
    // Those same three directives are not "unused" — the rule they name is off,
    // so of course it reported nothing. Calling them unused would invite someone
    // to delete them, and they are the note that says these two hooks were
    // examined and their dependency lists are deliberate. They become live the
    // day exhaustive-deps is switched on.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    // Every file this config matches is TypeScript, and ESLint's default parser
    // reads JavaScript. Without this the run does not report "no findings" — it
    // reports a parse error per file, which is a red lint that says nothing
    // about the rule. Parser only: no `project`, so the rule stays syntactic and
    // the run does not need a type-check pass it would only duplicate.
    languageOptions: { parser: tseslint.parser },
    rules: {
      'no-restricted-syntax': ['error', {
        selector:
          "CallExpression[callee.type='MemberExpression']"
          + "[callee.object.name='supabase']"
          + "[callee.property.name=/^(from|rpc)$/]",
        message:
          'A Supabase query may only be written in src/data/. Written here it reaches the '
          + 'network past pageAllByKey, readBounded and guardUntruncated — so it can return '
          + '1,000 of 3,110 rows with 200 and no error, which is RC-039 exactly. Add a '
          + 'function to src/data/ and call that instead.',
      }],
    },
  },
];
