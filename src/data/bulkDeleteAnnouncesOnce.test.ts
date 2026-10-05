import test from 'node:test';
import assert from 'node:assert/strict';
import { installNodeStubs, makeAcademy, fakeServer } from './fakePostgrest.testkit';

/**
 * FORTY DELETIONS ARE ONE ACT TO EVERY SCREEN READING THE REGISTER.
 *
 * Run: npx tsx --test src/data/bulkDeleteAnnouncesOnce.test.ts
 *
 * `bulkDeleteMembers` said so in its own comment and then called
 * `deleteMember` per member, which rang both buses each time -- forty-one
 * refreshes of every mounted reader for one bulk removal (RC-3,
 * docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md). The real repository
 * against the fake network; the buses are counted, not mocked.
 */
const setNetwork = installNodeStubs();

test('bulkDeleteMembers rings the member and attendance buses once, after the loop', async () => {
  // Imported by a variable path, as memberRefresh.test.ts does: the spec
  // type-check runs without the DOM types src/lib/supabase.ts needs.
  const REPOSITORY = './repository.ts';
  const repo = await import(REPOSITORY) as {
    bulkDeleteMembers(ids: string[]): Promise<{ deleted: number; failed: unknown[] }>;
    deleteMember(id: string): Promise<unknown>;
    onMembersChanged(l: () => void): () => void;
    onAttendanceChanged(l: () => void): () => void;
  };
  const server = fakeServer(makeAcademy(5));
  setNetwork(server.fetch as typeof fetch);
  let members = 0, attendance = 0;
  const off1 = repo.onMembersChanged(() => { members++; });
  const off2 = repo.onAttendanceChanged(() => { attendance++; });

  const r = await repo.bulkDeleteMembers(['a', 'b', 'c', 'd']);
  assert.equal(r.deleted, 4);
  assert.deepEqual([members, attendance], [1, 1], 'one announcement per bus for the whole act');

  // The single deletion still announces itself -- it is the bulk path that
  // was over-announcing, not this one.
  await repo.deleteMember('e');
  assert.deepEqual([members, attendance], [2, 2]);
  off1(); off2();
});
