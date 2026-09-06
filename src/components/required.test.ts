import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// CP-017. The request was "in all forms wherever there are mandatory fields
// show them with red asterisk symbol", and "all forms" is the whole of it: a
// marker on eight of nine forms is not a partial win, it is a rule the ninth
// form now contradicts. RC-018 is the precedent -- "across all forms" was
// satisfied by ONE token rather than three edits, because the fix that has to
// be applied at N call sites is the fix that ships at N-1 of them.
//
// So this spec holds two things a reader of any single file cannot see:
//   1. there is exactly ONE mark, and every label renderer draws that one;
//   2. no form that blocks its own save leaves every field unmarked.
//
// It reads source rather than rendering, for the same reason scrim.test.ts
// reads the token: there is no component harness in this project, and the
// claim is about the shape of the code, not about one screen's pixels.

// The repository root. `npm run test:unit` runs from it, and the override
// exists for one purpose: replaying this spec against an exported copy of an
// EARLIER tree, which is how .evidence/mandatory-asterisk-fail-first.txt was
// recorded. `import.meta` is deliberately not used -- scripts/tsconfig.json
// checks these specs as nodenext in a CommonJS package, where it is an error.
const ROOT = process.env.REQUIRED_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the spec is looking at a real tree', () => {
  // A source-reading spec that cannot find the source must say so. Silently
  // scanning an empty directory is the green-by-omission the gate exists to
  // prevent: no files, no violations, a pass that proves nothing.
  for (const dir of ['app', 'src/components']) {
    assert.ok(fs.existsSync(path.join(ROOT, dir)),
      `${ROOT} is not the repository root: no ${dir}/. Run from the root, or set REQUIRED_SPEC_ROOT.`);
  }
});

/** The label renderers. Each takes `required` and each must draw the shared mark. */
const RENDERERS = [
  'src/components/Field.tsx',
  'src/components/ui.tsx',
  'src/components/Dropdown.tsx',
  'src/components/DateTimePicker.tsx',
];

test('every label renderer draws the ONE shared mark', () => {
  for (const rel of RENDERERS) {
    const src = read(rel);
    assert.match(src, /required \? <RequiredMark \/> : null/,
      `${rel} takes \`required\` but does not render RequiredMark`);
    assert.match(src, /import \{ RequiredMark \}/,
      `${rel} must import the shared mark rather than draw its own`);
  }
});

test('nothing draws a second asterisk of its own', () => {
  // The defect this prevents: a fifth label renderer arrives, copies the
  // asterisk instead of the component, and drifts -- a different red, a
  // different spacing, or no accessible name at all.
  const files = [...RENDERERS, ...formFiles()];
  for (const rel of files) {
    if (rel === 'src/components/RequiredMark.tsx') continue;
    const src = read(rel);
    assert.doesNotMatch(src, /<Text[^>]*theme\.danger[^>]*>\s*\*/,
      `${rel} draws its own required asterisk; use <RequiredMark /> (CP-017)`);
  }
});

test('the mark is a shape and a word before it is a colour', () => {
  // Guardrail 3 / CP-010: colour is never the only carrier of meaning. The
  // glyph carries it for anyone who cannot see the red; the accessible name
  // carries it for anyone who cannot see the glyph.
  const src = read('src/components/RequiredMark.tsx');
  assert.match(src, /accessibilityLabel="required"/,
    'the mark must announce the word "required", not a star');
  assert.match(src, /theme\.danger/,
    'the mark must resolve its red from the token module (CP-008)');
  assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/,
    'no colour literal: theme.danger is measured on every surface, a literal is not');
});

/** Every screen under app/ that gates its own save behind a validity check. */
function formFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith('.tsx')) out.push(rel);
    }
  };
  walk('app');
  return out;
}

test('no form that blocks its own save leaves every field unmarked', () => {
  // A form is "gated" when something it renders is disabled until the person
  // has filled a field in -- which is precisely the definition of a mandatory
  // field, taken from the form's own code rather than from an opinion.
  const GATED = /(confirmDisabled|disabled)=\{!\s*(valid|pinOk|phoneOk)/;
  /** `required` as a JSX prop on an element, not the word in a sentence. */
  const MARKED = /<[A-Z][\w.]*(?:\s[^>]*?)?\srequired(?=[\s/>=])/s;

  // Screens whose gated control has NO field label to hang a mark on. Both
  // are a single unlabelled input under a heading -- sign-in's number and PIN,
  // and the PIN pad -- so there is no label, and an asterisk with nothing to
  // qualify marks nothing. Named here so the exemption is a decision on the
  // record rather than a gap in the sweep.
  const UNLABELLED = new Set(['app/index.tsx', 'app/set-pin.tsx']);

  const missed: string[] = [];
  for (const rel of formFiles()) {
    if (UNLABELLED.has(rel)) continue;
    const src = read(rel);
    if (!GATED.test(src)) continue;
    // The PROP on a component, never the word: "A course name is required"
    // is a hint string, and a sweep that accepts it would report a form as
    // marked because its copy happens to mention the rule.
    if (!MARKED.test(src)) missed.push(rel);
  }
  assert.deepEqual(missed, [],
    `these forms gate their save but mark no field mandatory: ${missed.join(', ')}`);
});
