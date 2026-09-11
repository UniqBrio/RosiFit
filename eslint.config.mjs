/**
 * ONE RULE, and a note about why this file is nearly empty.
 *
 * ESLint is NOT a dependency of this repository. The deterministic gate has a
 * Lint step (G6) and it reports BLOCKED — before this change and after it —
 * because there is no `eslint` binary to run. Nothing here changes that, and
 * installing a lint toolchain into an app that has deliberately never had one
 * is a bigger decision than a truncation fix gets to make on its own: it
 * would turn a BLOCKED step into a few hundred findings that have nothing to
 * do with this work.
 *
 * What actually enforces the rule below, today, is
 * `scripts/audits/check-data-layer-boundary.mjs` — wired into
 * `npm run audit:boundary` and `npm run audit:all`, and specced in
 * `src/data/dataLayerBoundary.test.ts`. This file exists so the rule is also
 * the linter's the moment one is installed, instead of being remembered.
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
export default [
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/data/**'],
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
