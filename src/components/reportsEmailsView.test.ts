import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Reports' Attendance emails is reached from a button beside Members and
 * Courses (16-Oct-2026). It shipped first as a card at the foot of the page,
 * under every course's bar, and the requester could not find it: "under
 * reports nothing is built". These pin that it stays one tap from the top.
 */
const src = () => fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/reports.tsx'), 'utf8');

test('Reports offers an Emails button beside the attendance scopes', () => {
  assert.match(src(), /\[\.\.\.REPORT_SCOPES, 'Emails'\]/);
  // Same testID template as Members and Courses: reports-scope-emails.
  assert.match(src(), /testID=\{`reports-scope-\$\{s\.toLowerCase\(\)\}`\}/);
});

test('the Emails view shows the Attendance emails card, and only there', () => {
  const s = src();
  assert.match(s, /emailsView \? <AttendanceEmailsCard range=\{range\} forced=\{forced\} \/>/);
  assert.equal(s.match(/<AttendanceEmailsCard /g)?.length, 1, 'mounted once, not also at the foot');
});

test('the header Export (attendance) steps aside in the Emails view, which has its own', () => {
  assert.match(src(), /right=\{ready && rows\.length > 0 && !emailsView \?/);
});

/* "On clicking each and export it should export whole info of emails sent on
   that day for the course" -- every send opens to its emails and exports alone. */
test('each send can be opened to its emails and exported on its own', () => {
  const card = fs.readFileSync(path.join(process.cwd(), 'src/components/AttendanceEmailsCard.tsx'), 'utf8');
  assert.match(card, /testID=\{`reports-emails-open-\$\{s\.batchId\}`\}/);
  assert.match(card, /testID=\{`reports-emails-export-\$\{s\.batchId\}`\}/);
  assert.match(card, /buildReportWorkbook\(emailLogSheets\(send\.rows\)\)/, 'the send exports ITS rows, not the period');
  assert.match(card, /downloadBlob\(sendFileName\(send\)/);
});
