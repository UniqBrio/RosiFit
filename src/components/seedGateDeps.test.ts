import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * RC-025. A form seeded ONCE from a record must re-run its seeding effect
 * when the readiness it is waiting on arrives.
 *
 * The defect this holds shut is RC-021's own fix turned inside out.
 * `app/course/edit.tsx` fills its fields from an effect behind a `seeded`
 * latch that is never reset, and RC-021 correctly taught that effect to WAIT
 * -- `&& !recordPending` -- so it can no longer seed an Edit form from a
 * course that has not arrived. What RC-021 did not do is let the effect run
 * again once the wait ends: `recordPending` reads `courses.state` and
 * `followUp.state`, and neither is in the dependency array. So the effect
 * runs, bails while the follow-up rules are still in flight, and React never
 * schedules it again. `seeded` stays false and every field on the Edit form
 * stays empty for good. "Seeds too early" became "never seeds" -- the same
 * blank form, reported the same way.
 *
 * The invariant, stated so it holds any such form: everything an effect can
 * BAIL on must be something React can see change. A gate reached through a
 * derived `const` is expanded one level, because that is exactly where this
 * one hid -- `recordPending` is the name, `courses.state` and
 * `followUp.state` are the values, and only the values change.
 *
 * It reads source rather than rendering, for the same reason
 * editDialog.test.ts does: there is no component harness in this project,
 * and the claim is about the shape of the code.
 *
 * Every scan below is a plain string operation. A regex assembled inside a
 * template literal loses its own backslashes, which is how the first draft
 * of this spec passed against the defect it was written for.
 */

// The repository root. `npm run test:unit` runs from it; the override exists
// to replay this spec against an exported copy of an EARLIER tree, which is
// how .evidence/seed-gate-deps-fail-first.txt was recorded. `import.meta` is
// deliberately not used -- scripts/tsconfig.json checks these specs as
// nodenext in a CommonJS package, where it is an error.
const ROOT = process.env.SEED_GATE_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * Comments blanked, quoted text left alone. A scanner that reads prose can
 * be tripped by a comment naming a gate -- and, far worse, SATISFIED by one.
 * This spec's own subject carries a comment naming `courses.state`, so the
 * hazard is not hypothetical. Blanked rather than deleted, so what is left
 * still sits where it did.
 */
function stripComments(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (c === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? src.length : end + 2;
      while (i < stop) { out += src[i] === '\n' ? '\n' : ' '; i++; }
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      out += c; i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') { out += src[i]; i++; if (i >= src.length) break; }
        out += src[i]; i++;
      }
      if (i < src.length) { out += src[i]; i++; }
      continue;
    }
    out += c; i++;
  }
  return out;
}

/** What the scanners read: the code, without its prose. */
const source = (rel: string) => stripComments(read(rel));

/** Every form that seeds its fields once, behind a latch that is never reset. */
const FORMS = ['app/course/edit.tsx', 'app/member/edit.tsx'];

type Effect = { body: string; deps: string };

const isWordChar = (c: string | undefined) =>
  c !== undefined && (c === '_' || c === '$' || (c >= '0' && c <= '9')
    || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'));

/**
 * The seeding effect: the one whose body sets the latch. Located from
 * `setSeeded(true)` outwards rather than by counting `useEffect`s, so an
 * unrelated effect inserted above it does not quietly retarget the spec.
 */
function seedingEffect(src: string): Effect | null {
  const latch = src.indexOf('setSeeded(true)');
  if (latch < 0) return null;
  const open = src.lastIndexOf('useEffect(', latch);
  const close = src.indexOf('}, [', latch);
  if (open < 0 || close < 0) return null;
  const end = src.indexOf(']);', close);
  if (end < 0) return null;
  return { body: src.slice(open, close), deps: src.slice(close + 4, end) };
}

/** Every `<name>.state` read in a stretch of source. */
function stateReads(text: string): string[] {
  const out: string[] = [];
  for (let i = text.indexOf('.state'); i >= 0; i = text.indexOf('.state', i + 6)) {
    // `.stateful` is not a state read.
    if (isWordChar(text[i + 6])) continue;
    let start = i;
    while (start > 0 && isWordChar(text[start - 1])) start--;
    if (start < i) out.push(text.slice(start, i) + '.state');
  }
  return out;
}

/** Every identifier in a stretch of source. */
function identifiers(text: string): string[] {
  return text.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? [];
}

/**
 * The component-scope `const <name> = … ;` — two spaces of indent, up to its
 * first semicolon. A `const` declared inside the effect needs no lookup: it
 * is already part of the body.
 */
function declarationOf(src: string, name: string): string | null {
  const head = '\n  const ' + name;
  for (let i = src.indexOf(head); i >= 0; i = src.indexOf(head, i + 1)) {
    if (isWordChar(src[i + head.length])) continue;      // `recordPendingToo`
    const end = src.indexOf(';', i);
    return end < 0 ? src.slice(i) : src.slice(i, end + 1);
  }
  return null;
}

/**
 * The gates the effect can bail on: read directly, or one name away through
 * a value the component derives.
 */
function gatesReached(src: string, body: string): { gate: string; via: string }[] {
  const out = stateReads(body).map(gate => ({ gate, via: gate }));
  for (const name of new Set(identifiers(body))) {
    const decl = declarationOf(src, name);
    if (!decl) continue;
    for (const gate of stateReads(decl)) out.push({ gate, via: name });
  }
  return out;
}

test('the spec is looking at a real tree', () => {
  // A source-reading spec that cannot find its subject must say so. Silently
  // scanning nothing is the green-by-omission the gate exists to prevent.
  for (const file of FORMS) {
    assert.ok(fs.existsSync(path.join(ROOT, file)),
      `${ROOT} is not the repository root: no ${file}. Run from the root, or set SEED_GATE_SPEC_ROOT.`);
    assert.ok(seedingEffect(source(file)),
      `${file}: no seeding effect found. If the latch was renamed, this spec is now scanning `
      + `nothing and must be pointed at the new name -- not deleted.`);
  }
});

test('a seeding effect can be re-run by everything it bails on', () => {
  for (const file of FORMS) {
    const src = source(file);
    const effect = seedingEffect(src)!;
    const declared = identifiers(effect.deps);
    for (const { gate, via } of gatesReached(src, effect.body)) {
      const seen = effect.deps.includes(gate) || declared.includes(via);
      assert.ok(seen,
        `${file}: the seeding effect waits on \`${gate}\``
        + `${via === gate ? '' : ` (reached through \`${via}\`)`}`
        + `, and neither is in its dependency array. It bails while that read says "not yet", `
        + `React never schedules it again, and the latch stays unset -- so every field on the `
        + `form stays empty for good.`);
    }
  }
});

test('the latch that makes seeding once-only is never reset', () => {
  // The other half of the same balance, so this spec is not read as licence
  // for the opposite defect: a latch that IS reset re-seeds over what
  // somebody is typing the moment any query behind the form refetches.
  for (const file of FORMS) {
    assert.ok(!source(file).includes('setSeeded(false)'),
      `${file}: the seeding latch is reset somewhere. A re-seed overwrites a keystroke as soon `
      + `as any query behind this form lands again.`);
  }
});
