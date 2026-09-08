import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { actionTitle, categoryOf, hasPlainTitle } from './auditPlain';

/**
 * TOTALITY, derived from the backend rather than from a list somebody kept.
 *
 * WHY THIS FILE EXISTS BESIDE auditPlain.test.ts
 * That file already ends in a totality test, and it was right the day it was
 * written. Its list is a snapshot of a grep — the comment above it even names
 * the grep — so it asserts that the actions of 07-Sep-2026 read as words, and
 * it cannot fail for an action added after that. Nine migrations and two Edge
 * Function changes later, fourteen actions the backend emits were not in it:
 * `member.hard_deleted` (46 rows in production on 08-Sep), `csv_import.previewed`
 * (38), `course.hard_deleted` (10), `attendance.day_reset`, `attendance.marked`,
 * `meeting_group.created` and the rest. Every one of them reached the academy
 * owner as a prettified code.
 *
 * A snapshot cannot catch its own drift. So this spec runs the grep INSTEAD of
 * quoting its output: it reads `supabase/` at test time, so the day somebody
 * adds an `audit_log(...)` call in a migration, this fails until the reader has
 * learned the action. The coupling the screen never had is this file.
 *
 * It reads source rather than rendering, exactly as dropdownAppliesOnPick.test.ts
 * and dialogDismiss.test.ts do — there is no component harness here, and the
 * claim is about what the backend can emit, not about pixels.
 */

const ROOT = process.env.AUDIT_COVERAGE_SPEC_ROOT ?? process.cwd();
const SUPABASE = path.join(ROOT, 'supabase');

const CHIPS = ['members', 'courses', 'attendance', 'uploads', 'messages', 'settings'];

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...sources(p));
    else if (/\.(sql|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

/**
 * Every action the backend can write, and the entity_type it writes beside it.
 *
 * Three writers, three shapes:
 *   · `audit_log(action, entity_type, ...)`           — plpgsql, action first
 *   · `audit_log_as(actor, action, entity_type, ...)` — plpgsql, actor first
 *   · `p_action: '…', p_entity_type: '…'`             — the Edge Functions
 * The first two are read with one pattern: take the first DOTTED literal after
 * the open paren, which is the action in both, because an actor argument is a
 * uuid or a variable and never looks like `member.hard_deleted`.
 *
 * `audit_row_change('<entity>')` is the fourth: a trigger, which composes
 * `<entity>.insert|update|delete` for itself.
 */
function emitted(): { action: string; entity: string; where: string }[] {
  const found = new Map<string, { action: string; entity: string; where: string }>();
  const add = (action: string, entity: string, where: string) => {
    if (!found.has(action)) found.set(action, { action, entity, where });
  };

  for (const file of sources(SUPABASE)) {
    // The tests folder asserts against the writers rather than being one, and
    // apply_all.sql is a concatenation of migrations already read.
    if (/[\\/]tests[\\/]/.test(file) || /apply_(all|\d)/.test(path.basename(file))) continue;
    const src = fs.readFileSync(file, 'utf8');
    const where = path.relative(ROOT, file);

    for (const m of src.matchAll(/audit_log(?:_as)?\s*\(([\s\S]{0,220})/g)) {
      const action = /'([a-z_]+(?:\.[a-z_]+)+)'/.exec(m[1]);
      if (!action) continue;
      // the entity_type is the next literal after the action
      const rest = m[1].slice(m[1].indexOf(action[0]) + action[0].length);
      const entity = /'([a-z_.]+)'/.exec(rest);
      add(action[1], entity ? entity[1] : action[1].split('.')[0], where);
    }
    for (const m of src.matchAll(/p_action:\s*'([a-z_]+(?:\.[a-z_]+)+)'[\s\S]{0,120}?p_entity_type:\s*'([a-z_.]+)'/g)) {
      add(m[1], m[2], where);
    }
    for (const m of src.matchAll(/audit_row_change\('([a-z_.]+)'\)/g)) {
      for (const op of ['insert', 'update', 'delete']) add(`${m[1]}.${op}`, m[1], where);
    }
  }
  return [...found.values()].sort((a, b) => a.action.localeCompare(b.action));
}

test('the spec is looking at a real tree', () => {
  // A source-reading spec that finds nothing must say so. Scanning an empty
  // folder and passing is the green-by-omission the gate exists to prevent.
  assert.ok(fs.existsSync(SUPABASE),
    `${ROOT} is not the repository root: no supabase/. Run from the root, or set AUDIT_COVERAGE_SPEC_ROOT.`);
  const all = emitted();
  assert.ok(all.length >= 60,
    `only ${all.length} audit actions found in supabase/ — the scanner has stopped matching, `
    + 'and a totality test that reads nothing asserts nothing');
  // The four the screen was measured getting wrong, pinned by name so a
  // scanner change that silently drops a shape is caught here rather than by
  // a person reading the log.
  const names = all.map(a => a.action);
  for (const must of ['member.hard_deleted', 'csv_import.previewed', 'attendance.day_reset',
                      'member_import_run.hard_deleted']) {
    assert.ok(names.includes(must), `the scanner no longer finds ${must}`);
  }
});

test('no action the backend can emit reaches the screen as a code', () => {
  const bad: string[] = [];
  for (const { action, entity, where } of emitted()) {
    const title = actionTitle(action, entity);
    if (/[._]/.test(title) || title.trim() !== title || title.length === 0) {
      bad.push(`${action} (${where}) -> "${title}"`);
    }
  }
  assert.deepEqual(bad, [],
    'these actions reach the academy owner as codes:\n  ' + bad.join('\n  '));
});

test('every action the backend can emit has words somebody WROTE for it', () => {
  /* The assertion that actually holds the line, and the one the old snapshot
   * could not make. `actionTitle` is total by construction, so "it returned a
   * string" proves nothing; both its fall-throughs GUESS, and a guess is
   * indistinguishable from a translation on screen:
   *
   *   prettify      csv_import.previewed -> "Csv import previewed"
   *   noun + code   member.hard_deleted  -> "Member — member hard deleted"
   *
   * Neither contains a dot or an underscore. Both are what the academy owner
   * was reading. `hasPlainTitle` names the fall-through, so this fails the day
   * a migration adds an audit_log call and stays failing until the words are
   * written — which is the coupling between the audit writers and this reader
   * that never existed (RC-036). */
  const bad: string[] = [];
  for (const { action, entity, where } of emitted()) {
    if (!hasPlainTitle(action, entity)) {
      bad.push(`${action} (${where}) -> guessed as "${actionTitle(action, entity)}"`);
    }
  }
  assert.deepEqual(bad, [],
    'these actions have no stated wording, so the screen is guessing at them.\n'
    + 'Add each to ACTION_TITLE in src/data/auditPlain.ts:\n  ' + bad.join('\n  '));
});

test('every action lands under one of the seven chips', () => {
  const bad: string[] = [];
  for (const { action, entity, where } of emitted()) {
    if (!CHIPS.includes(categoryOf(action, entity))) bad.push(`${action} (${where})`);
  }
  assert.deepEqual(bad, [], 'these actions have no chip to appear under:\n  ' + bad.join('\n  '));
});

test('an upload, an attendance mark and a deletion are filed where they happened', () => {
  // The chip is the question somebody actually has, so filing by the table
  // that took the write is wrong whenever the two disagree. Each of these
  // was measured landing under the wrong chip.
  assert.equal(categoryOf('csv_import.previewed', 'csv_import'), 'uploads');
  assert.equal(categoryOf('csv_import.overrode_register', 'session'), 'uploads');
  // day_reset is written against the COURSE, because a day belongs to one.
  // It is still a thing that happened to attendance.
  assert.equal(categoryOf('attendance.day_reset', 'course'), 'attendance');
  assert.equal(categoryOf('attendance.marked', 'member'), 'attendance');
  assert.equal(categoryOf('attendance.session_created', 'session'), 'attendance');
  assert.equal(categoryOf('member.hard_deleted', 'member'), 'members');
});
