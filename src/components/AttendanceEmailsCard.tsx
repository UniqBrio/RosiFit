import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Skeleton, ErrorState } from './ui';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from './Toast';
import { SPACE, RADIUS, STATUS } from '../theme/tokens';
import { useEmailLog } from '../data/hooks';
import {
  groupSends, countEmails, coursesText, academyDay, academyClock, emailLogSheets, emailLogFileName,
  sendFileName, emailOutcome, emailTimeline, OUTCOME_LOOK,
  type SendCounts, type EmailOutcome, type EmailLogRow,
} from '../data/emailLog';
import { buildReportWorkbook } from '../data/reportXlsx';
import { downloadBlob } from '../data/csv';
import type { Period } from '../data/period';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
/** Sends listed before "Show all": a busy month should not push the
 *  footnote off the bottom of a phone. The export always carries all of them. */
const FIRST_SENDS = 8;

/**
 * REPORTS → ATTENDANCE EMAILS (16-Oct-2026, on request): every follow-up send
 * in the report's period -- the date, the course, how many went out, how many
 * were delivered, bounced, failed or excluded -- and an Export of every email
 * in it with the member's name, address, the date and the reason.
 *
 * Its OWN card with its own loading and error states, below the attendance
 * report rather than inside it: the two answer different questions from
 * different reads, and an email log that failed must not take the attendance
 * figures down with it (or the other way round).
 *
 * The period is the report's own, passed in -- one Period control on the
 * screen, so the emails and the attendance above them are always about the
 * same days.
 */
export function AttendanceEmailsCard({ range, forced }: { range: Period; forced?: string }) {
  const { theme } = useTheme();
  const { flash } = useToast();
  const log = useEmailLog(range, forced);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  /* ONE SEND, opened and exported on its own (16-Oct-2026): "on clicking each
     and export it should export whole info of emails sent on that day for the
     course make sure every detail is present". */
  const [open, setOpen] = useState<string | null>(null);
  const [busySend, setBusySend] = useState<string | null>(null);

  const rows = log.data ?? [];
  const sends = groupSends(rows);
  const total = countEmails(rows);
  const shown = showAll ? sends : sends.slice(0, FIRST_SENDS);

  const exportSend = async (batchId: string) => {
    const send = sends.find(x => x.batchId === batchId);
    if (!send || busySend) return;
    setBusySend(batchId);
    try {
      const bytes = await buildReportWorkbook(emailLogSheets(send.rows));
      downloadBlob(sendFileName(send), new Blob([bytes], { type: XLSX }));
      flash(`Exported ${send.rows.length} ${send.rows.length === 1 ? 'email' : 'emails'} · ${coursesText(send)}, ${academyDay(send.at)} · Excel`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'This send could not be exported.', 'warn');
    } finally {
      setBusySend(null);
    }
  };

  const exportLog = async () => {
    if (busy || rows.length === 0) return;
    setBusy(true);
    try {
      const bytes = await buildReportWorkbook(emailLogSheets(rows));
      downloadBlob(emailLogFileName(range.from, range.to), new Blob([bytes], { type: XLSX }));
      flash(`Exported ${rows.length} ${rows.length === 1 ? 'email' : 'emails'} from ${sends.length} ${sends.length === 1 ? 'send' : 'sends'} · Excel`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'The email report could not be exported.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View testID="reports-emails" style={{
      marginTop: SPACE.lg, padding: 16, borderRadius: 20,
      backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
        <Icon name="mail" size={18} color={theme.accentInk} />
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 13, fontWeight: '800', color: theme.fgStrong }}>
          Attendance emails
        </Text>
        {log.state === 'ready' && rows.length > 0 ? (
          <Pressable testID="reports-emails-export" onPress={() => { void exportLog(); }}
            accessibilityRole="button" accessibilityState={{ busy }}
            accessibilityLabel="Export every attendance email in this period as a spreadsheet: one sheet of sends, one of emails with member, email, date and reason"
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 5,
              height: 36, paddingHorizontal: 12, borderRadius: 11,
              backgroundColor: theme.control, borderWidth: 1, borderColor: theme.lineStrong,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Icon name="download" size={16} color={theme.accentInk} />
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>
              {busy ? 'Exporting…' : 'Export'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={{ fontSize: 11, color: theme.muted, marginTop: 3 }}>
        {`Follow-up emails sent ${range.label}`}
      </Text>

      {log.state === 'loading' ? (
        <View style={{ marginTop: SPACE.md }}><Skeleton lines={3} /></View>
      ) : log.state === 'error' ? (
        <View style={{ marginTop: SPACE.md }}>
          <ErrorState onRetry={log.retry}
            message={log.error ?? 'The attendance emails could not be loaded. Nothing has been changed.'} />
        </View>
      ) : rows.length === 0 ? (
        <Text testID="reports-emails-empty" style={{ fontSize: 12.5, color: theme.fg, marginTop: SPACE.md, lineHeight: 18 }}>
          No follow-up emails were sent in this period. Sends from a course’s Send Communication or a
          member’s Reach out appear here.
        </Text>
      ) : (
        <>
          {/* The period's totals first -- the "how many" the request led with. */}
          <CountChips testID="reports-emails-totals" counts={total} style={{ marginTop: SPACE.md }} />
          <Text style={{ fontSize: 11, color: theme.muted, marginTop: 6 }}>
            {`${sends.length} ${sends.length === 1 ? 'send' : 'sends'} · ${total.total} ${total.total === 1 ? 'member' : 'members'}`}
          </Text>

          <View style={{ marginTop: SPACE.md, gap: SPACE.sm }}>
            {shown.map(s => {
              const isOpen = open === s.batchId;
              return (
              <View key={s.batchId} testID={`reports-emails-send-${s.batchId}`}
                style={{
                  padding: SPACE.md, borderRadius: RADIUS.md,
                  backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
                }}>
                <View accessible
                  accessibilityLabel={`${academyDay(s.at)} ${academyClock(s.at)}. ${coursesText(s)}. ${s.counts.sent} sent, ${s.counts.delivered} delivered, ${s.counts.bounced} bounced, ${s.counts.failed} failed, ${s.counts.excluded} excluded.`}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
                      {academyDay(s.at)}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.muted, fontVariant: ['tabular-nums'] }}>
                      {academyClock(s.at)}
                    </Text>
                  </View>
                  <Text numberOfLines={2} style={{ fontSize: 12.5, fontWeight: '700', color: theme.fg, marginTop: 2 }}>
                    {coursesText(s)}
                  </Text>
                  <CountChips counts={s.counts} style={{ marginTop: 6 }} />
                  {s.sentBy ? (
                    <Text style={{ fontSize: 10.5, color: theme.muted, marginTop: 5 }}>{`Sent by ${s.sentBy}`}</Text>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm }}>
                  <Pressable testID={`reports-emails-open-${s.batchId}`} onPress={() => setOpen(isOpen ? null : s.batchId)}
                    accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
                    accessibilityLabel={`${isOpen ? 'Hide' : 'Show'} the ${s.rows.length} emails of this send`}
                    style={({ pressed }) => ({
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                      minHeight: 40, borderRadius: 11, borderWidth: 1, borderColor: theme.lineStrong,
                      backgroundColor: theme.control, opacity: pressed ? 0.7 : 1,
                    })}>
                    <Icon name={isOpen ? 'expand_less' : 'expand_more'} size={16} color={theme.accentInk} />
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>
                      {isOpen ? 'Hide emails' : `Show ${s.rows.length} ${s.rows.length === 1 ? 'email' : 'emails'}`}
                    </Text>
                  </Pressable>
                  <Pressable testID={`reports-emails-export-${s.batchId}`} onPress={() => { void exportSend(s.batchId); }}
                    accessibilityRole="button" accessibilityState={{ busy: busySend === s.batchId }}
                    accessibilityLabel={`Export every detail of this send's ${s.rows.length} emails as a spreadsheet`}
                    style={({ pressed }) => ({
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                      minHeight: 40, borderRadius: 11, borderWidth: 1, borderColor: theme.lineStrong,
                      backgroundColor: theme.control, opacity: pressed ? 0.7 : 1,
                    })}>
                    <Icon name="download" size={16} color={theme.accentInk} />
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>
                      {busySend === s.batchId ? 'Exporting…' : 'Export this send'}
                    </Text>
                  </Pressable>
                </View>

                {isOpen ? (
                  <View testID={`reports-emails-list-${s.batchId}`} style={{ marginTop: SPACE.sm, gap: 6 }}>
                    {s.rows.map(r => <EmailLine key={r.messageId} r={r} />)}
                  </View>
                ) : null}
              </View>
              );
            })}
          </View>

          {sends.length > FIRST_SENDS ? (
            <Pressable testID="reports-emails-show-all" onPress={() => setShowAll(v => !v)}
              accessibilityRole="button"
              style={{ marginTop: SPACE.md, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: theme.accentInk }}>
                {showAll ? 'Show fewer' : `Show all ${sends.length} sends`}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

/**
 * One email of an opened send: who, which address, what happened and when --
 * the same words the member's Emails tab uses, and the same facts the export
 * carries in columns.
 */
function EmailLine({ r }: { r: EmailLogRow }) {
  const { theme } = useTheme();
  const outcome = emailOutcome(r);
  const look = OUTCOME_LOOK[outcome];
  const ink = theme.isDark ? STATUS[look.tone].fgDark : STATUS[look.tone].fgLight;
  return (
    <View accessible
      accessibilityLabel={`${r.memberName}. ${r.email ?? 'No address'}. ${outcome}. ${emailTimeline(r).join('. ')}`}
      style={{
        padding: SPACE.sm, borderRadius: RADIUS.md,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={look.icon} size={15} color={ink} />
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: theme.fgStrong }}>
          {r.memberName}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '800', color: ink }}>{outcome}</Text>
      </View>
      <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.fg, marginTop: 2 }}>
        {[r.email ?? 'No address', r.branch].filter(Boolean).join(' · ')}
      </Text>
      {emailTimeline(r).map(line => (
        <Text key={line} style={{ fontSize: 11, color: theme.muted, marginTop: 2, lineHeight: 15 }}>{line}</Text>
      ))}
    </View>
  );
}

/**
 * The figures as chips, each with its OWN word and icon, so a count is never
 * only a colour (guardrail 3). Zero bounced and zero failed are still shown:
 * "0 bounced" is an answer the request asked for, not an absence.
 */
function CountChips({ counts, style, testID }: {
  counts: SendCounts; style?: object; testID?: string;
}) {
  const { theme } = useTheme();
  const ink = (o: EmailOutcome) => {
    const k = OUTCOME_LOOK[o].tone;
    return theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;
  };
  const chips: { n: number; word: string; outcome: EmailOutcome; always?: boolean }[] = [
    { n: counts.sent, word: 'sent', outcome: 'Sent', always: true },
    { n: counts.delivered, word: 'delivered', outcome: 'Delivered' },
    { n: counts.bounced, word: 'bounced', outcome: 'Bounced', always: true },
    { n: counts.failed, word: 'failed', outcome: 'Failed', always: true },
    { n: counts.spam, word: counts.spam === 1 ? 'spam report' : 'spam reports', outcome: 'Spam report' },
    { n: counts.excluded, word: 'excluded', outcome: 'Excluded' },
    { n: counts.sending, word: 'sending', outcome: 'Sending' },
  ];
  return (
    <View testID={testID} style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, style]}>
      {chips.filter(c => c.always || c.n > 0).map(c => (
        <View key={c.word} style={{
          flexDirection: 'row', alignItems: 'center', gap: 4,
          paddingVertical: 3, paddingHorizontal: 8, borderRadius: RADIUS.pill,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
        }}>
          <Icon name={OUTCOME_LOOK[c.outcome].icon} size={13} color={ink(c.outcome)} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.fg, fontVariant: ['tabular-nums'] }}>
            {`${c.n} ${c.word}`}
          </Text>
        </View>
      ))}
    </View>
  );
}
