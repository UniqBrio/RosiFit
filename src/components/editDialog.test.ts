import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * RC-021. A form that can be opened ON an existing record decides which form
 * it is from the ROUTE, and answers "loading", "failed" and "missing" before
 * it renders anything.
 *
 * The defect this holds shut: `app/member/edit.tsx` decided Add-vs-Edit from
 * the RESULT of its own lookup -- `existing = roster.find(...)` -- so one
 * `null` stood for three different things: no id was passed (Add), her record
 * has not arrived yet, and her id is not on the register. Two of those are
 * not Add. It rendered the Add form for all three, so EVERY tap on Edit
 * opened "Welcome a new member" with her name blank for as long as its own
 * nine-query fetch took, and a fetch that failed left it there -- over a Save
 * that would have created a SECOND record for somebody already on the
 * register. That is RC-012's hazard by a different route: RC-012 fixed WHERE
 * the record is read from and left the three-way conflation in place.
 *
 * It reads source rather than rendering, for the same reason
 * required.test.ts does: there is no component harness in this project, and
 * the claim is about the shape of the code, not one screen's pixels.
 *
 * Every assertion is a plain string search. A regex built inside a template
 * literal loses its own backslashes, which is how the first draft of this
 * spec passed itself.
 */

// The repository root. `npm run test:unit` runs from it; the override exists
// to replay this spec against an exported copy of an EARLIER tree, which is
// how .evidence/edit-opens-add-fail-first.txt was recorded. `import.meta` is
// deliberately not used -- scripts/tsconfig.json checks these specs as
// nodenext in a CommonJS package, where it is an error.
const ROOT = process.env.EDIT_DIALOG_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * Every form reached with a record id in the route.
 * `asked` is the param-derived name that says an EXISTING record was asked
 * for; `query` is the hook result that supplies that record.
 */
const FORMS = [
  { file: 'app/member/edit.tsx', asked: 'editing', query: 'roster' },
  { file: 'app/course/edit.tsx', asked: 'editing', query: 'courses' },
  { file: 'app/offering/edit.tsx', asked: 'editingOffering', query: 'editor' },
];

test('the spec is looking at a real tree', () => {
  // A source-reading spec that cannot find the source must say so. Silently
  // scanning nothing is the green-by-omission the gate exists to prevent.
  for (const f of FORMS) {
    assert.ok(fs.existsSync(path.join(ROOT, f.file)),
      `${ROOT} is not the repository root: no ${f.file}. Run from the root, or set EDIT_DIALOG_SPEC_ROOT.`);
  }
});

test('Add-vs-Edit is decided by the route, never by the lookup result', () => {
  for (const { file, asked } of FORMS) {
    const src = read(file);
    const decidedByTheAsk = [`const title = ${asked} ?`, `title={${asked} ?`];
    assert.ok(decidedByTheAsk.some(t => src.includes(t)),
      `${file}: the title must be chosen by \`${asked}\` -- the name that says a record was `
      + `asked for. Chosen from the looked-up record instead, "still loading" and "not on the `
      + `register" both render as the ADD form.`);
  }
});

test('a form asked for a record answers loading before it renders', () => {
  for (const { file, query } of FORMS) {
    assert.ok(read(file).includes(`${query}.state === 'loading'`),
      `${file}: nothing waits on \`${query}\`, the query that supplies the record being `
      + `edited. Until it lands, the form renders as though the record does not exist.`);
  }
});

test('a form asked for a record answers a failed read', () => {
  for (const { file, query } of FORMS) {
    assert.ok(read(file).includes(`${query}.state === 'error'`),
      `${file}: a failed read of \`${query}\` is not answered, so it reads as "no such `
      + `record" -- and a form that has decided there is no record offers to create one.`);
  }
});

test('a record asked for and not found is said, not treated as Add', () => {
  const missing = [
    { file: 'app/member/edit.tsx', says: 'not on the register' },
    { file: 'app/course/edit.tsx', says: 'no longer on the list' },
    { file: 'app/offering/edit.tsx', says: 'no longer on this course' },
  ];
  for (const { file, says } of missing) {
    assert.ok(read(file).includes(says),
      `${file}: a record that was asked for and is not there must be SAID. Falling through `
      + `to the Add form offers to create a record that already exists somewhere.`);
  }
});

test('the create path is unreachable once a record id was asked for', () => {
  // The destructive half. Add and Edit share one Save; if the id was in the
  // route, that Save must never reach the create branch, whatever the lookup
  // answered.
  const cases = [
    { file: 'app/member/edit.tsx', guard: 'if (editing && !existing) return;', create: 'createMember' },
    { file: 'app/offering/edit.tsx', guard: 'if (editingOffering && !existing) return;', create: 'createOffering' },
  ];
  for (const { file, guard, create } of cases) {
    const src = read(file);
    assert.ok(src.includes(create), `${file}: expected the create path \`${create}\` to be here`);
    assert.ok(src.includes(guard),
      `${file}: Save can still reach \`${create}\` when the route asked for an existing record `
      + `and the lookup came back empty -- that writes a duplicate.`);
  }
});
