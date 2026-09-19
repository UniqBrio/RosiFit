// send-followups: renders the chosen stored template with each recipient's
// real engine figures and sends via the EmailProvider abstraction. Templates
// only -- there is no subject/body field this function accepts (C-68).
// Excluded members are returned and named, never silently dropped (C-76).
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { requireCaller } from '../_shared/authz.ts';
import { resolveEmailProvider } from './email.ts';
import { chooseFromAddress, unquoteSecret } from '../_shared/from-address.ts';
import { buildUnsubscribeUrl } from '../_shared/unsubscribe-token.ts';
import { runSendLoop, type AdminLike, type PreparedRecipient } from './send-loop.ts';
import { loadSendData } from './load.ts';

/** The mailbox a mail client offers when it cannot use the URL. Named here
 *  rather than derived from the sender, because the sender now varies per
 *  course and List-Unsubscribe must point at one place the academy actually
 *  reads. */
const UNSUBSCRIBE_MAILTO = 'unsubscribe@getfit.rosifit.com';

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

/**
 * The COUNT out of an effective_follow_up_config row: whichever condition is
 * switched on. Em dash when there is no row at all — a member with no course
 * has no trigger, and printing 0 or 4 there would state a rule that does not
 * exist. Every other absent value in this function is written the same way.
 */
function triggerOf(cfg: unknown): string {
  const c = cfg as {
    weekly_enabled?: boolean; weekly_threshold?: number;
    consecutive_enabled?: boolean; consecutive_threshold?: number;
  } | null | undefined;
  if (!c) return '—';
  if (c.consecutive_enabled && !c.weekly_enabled) {
    return c.consecutive_threshold == null ? '—' : String(c.consecutive_threshold);
  }
  if (!c.weekly_enabled && !c.consecutive_enabled) return '—';
  return c.weekly_threshold == null ? '—' : String(c.weekly_threshold);
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
    const caller = await requireCaller(req);
    const body = await req.json().catch(() => ({}));
    const admin = adminClient();

    const memberIds: string[] = Array.isArray(body.member_ids) ? body.member_ids : [];
    const templateId = String(body.template_id ?? '');
    const periodFrom = String(body.period_from ?? '');
    const periodTo = String(body.period_to ?? '');
    const clientBatchId = String(body.client_batch_id ?? crypto.randomUUID());

    if (memberIds.length === 0) throw new HttpError(400, 'Choose at least one member to send to.');
    if (!templateId) throw new HttpError(400, 'Choose a template.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(periodTo)) {
      throw new HttpError(400, 'Choose a valid period.');
    }

    // REFUSE RATHER THAN PRETEND, and refuse FIRST -- before the batch row,
    // before a single email_messages row. With the AWS secrets incomplete
    // this used to fall through to the dev provider, which logs the message
    // and returns success, so every recipient was recorded 'sent' and nothing
    // was delivered. That happened on this project: a live send on
    // 05-Sep-2026 wrote provider='dev' and the screen said SENT.
    // A send that looks successful and sent nothing is worse than one that
    // fails. This is the same 503-naming-the-fix shape PIN_PEPPER already
    // uses (CP-006), and doing it here means a refused send leaves nothing
    // behind to explain.
    const { provider, problems, defaultFrom } = resolveEmailProvider();
    if (problems.length > 0) {
      throw new HttpError(503,
        `Email is not configured, so nothing was sent. ${problems.join('; ')}. `
        + 'Fix the Edge Function secrets and try again — no message was recorded.');
    }

    // The unsubscribe key is refused on the SAME terms and in the same place,
    // before the batch row exists. Without it every link in every message
    // would be unsigned, which means `unsubscribe` refuses all of them: the
    // member reads "you can stop them here", clicks, and is told the link did
    // not work. Sending mail nobody can opt out of is exactly what the
    // List-Unsubscribe header promises we do not do, so this is the same
    // "refuse rather than pretend" call the AWS secrets already get.
    const unsubscribeSecretRaw = Deno.env.get('UNSUBSCRIBE_SECRET');
    const unsubscribeSecret = unsubscribeSecretRaw ? unquoteSecret(unsubscribeSecretRaw) : '';
    if (!unsubscribeSecret) {
      throw new HttpError(503,
        'UNSUBSCRIBE_SECRET is not set, so nothing was sent — every message would '
        + 'have carried an unsubscribe link that cannot be honoured. '
        + 'Set it in the Edge Function secrets and try again — no message was recorded.');
    }
    // ${SUPABASE_URL}/functions/v1 -- the runtime injects SUPABASE_URL, so
    // the address of the unsubscribe endpoint is derived, not configured.
    const functionsBase = `${Deno.env.get('SUPABASE_URL') ?? ''}/functions/v1`;

    const { data: template, error: tplErr } = await admin.from('email_templates')
      .select('id, name, subject, body_text, is_active').eq('id', templateId).maybeSingle();
    if (tplErr || !template) throw new HttpError(404, 'Template not found.');
    if (!template.is_active) throw new HttpError(409, 'This template is not active. Activate it in Settings first.');

    const { data: settingsRow } = await admin.from('app_settings').select('academy_name').eq('id', 1).single();
    const academyName = settingsRow?.academy_name ?? 'RosiFit Academy';

    /*
     * EVERY READ CHUNKED, PAGED, AND THROWING (T-041, RV-05, B:F-03, C:RF-03).
     *
     * These eight `.in()` reads used to sit here inline: none chunked, none
     * paged, and six of the eight discarding their error. The request ceiling
     * refuses an over-long `.in()` with a bare 400 (640 ids through, 660
     * refused, measured 16-Sep-2026, RC-045); the reply ceiling truncates at
     * 1,000 rows with a 200 and no error at all. A discarded error turned
     * either one into an empty map, and the loop below cannot tell an empty
     * map from a member who is genuinely absent -- so it classified people
     * from the gap.
     *
     * They moved to load.ts so a spec can drive them with a fake client;
     * index.ts calls Deno.serve at module scope and cannot be imported.
     */
    const loaded = await loadSendData(admin, memberIds);
    const {
      memberById, enrollByMember, offeringById,
      courseNameById, branchNameById, fromByCourse,
      emailByMember, statsByMember, courseIds,
    } = loaded;

    const metricsByMember = new Map<string, { expected: number; attended: number; missed: number; attendance_pct: number | null }>();
    for (const id of memberIds) {
      const { data: metric } = await admin.rpc('member_period_metrics', {
        p_from: periodFrom, p_to: periodTo, p_member_id: id,
        p_offering_id: null, p_branch_id: null, p_course_id: null,
      });
      metricsByMember.set(id, metric?.[0] ?? { expected: 0, attended: 0, missed: 0, attendance_pct: null });
    }

    // C-66: the EFFECTIVE config per course, snapshotted so a report six
    // months later can say which rule applied.
    const configSnapshot: Record<string, unknown> = {};
    for (const cid of courseIds) {
      const { data: cfg } = await admin.rpc('effective_follow_up_config', { p_course_id: cid });
      configSnapshot[cid] = cfg?.[0] ?? null;
    }

    const { data: batch, error: batchErr } = await admin.from('email_batches').insert({
      client_batch_id: clientBatchId, template_id: templateId,
      subject_snapshot: template.subject, body_snapshot: template.body_text,
      context: { period_from: periodFrom, period_to: periodTo },
      config_snapshot: configSnapshot, requested_count: memberIds.length, sent_by: caller.id,
    }).select('id').single();
    if (batchErr || !batch) {
      if ((batchErr as { code?: string } | null)?.code === '23505') {
        throw new HttpError(409, 'This send has already been submitted.');
      }
      throw new HttpError(500, 'Could not start the send.');
    }

    // PREPARE every recipient, then run the loop. The split is what lets a
    // fake admin client drive the write-send-record loop in a spec (T-020):
    // what a member is TOLD is decided here, what is RECORDED is decided in
    // send-loop.ts. Nothing about the rendering below changed.
    const prepared: PreparedRecipient[] = [];

    for (const id of memberIds) {
      const member = memberById.get(id);
      if (!member) {
        prepared.push({
          kind: 'excluded', memberId: id, name: '(unknown)', toEmail: null,
          subject: '', vars: {}, reason: 'Member not found',
        });
        continue;
      }
      const enroll = enrollByMember.get(id);
      const offering = enroll ? offeringById.get(enroll.offering_id as string) : undefined;
      const courseName = offering ? (courseNameById.get(offering.course_id as string) ?? '—') : '—';
      const branchName = offering ? (branchNameById.get(offering.branch_id as string) ?? '—') : '—';
      const fromChoice = chooseFromAddress(
        offering ? fromByCourse.get(offering.course_id as string) : null, defaultFrom);
      // Pulled out of the union here rather than read through `fromChoice`
      // below: the recipient is excluded via `fate`, which narrows nothing
      // about this value, and `undefined` is the honest answer for both an
      // unusable address and the dev provider's absent one.
      const fromAddress = fromChoice.ok ? fromChoice.from : undefined;
      const metric = metricsByMember.get(id) ?? { expected: 0, attended: 0, missed: 0, attendance_pct: null };
      const stat = statsByMember.get(id);
      const emailRow = emailByMember.get(id);

      // The recipient's fate, decided once, carrying the address WITH the
      // decision. This replaced `emailRow!` at the two send sites (T-020,
      // RV-10): the send branch now holds a `string` the compiler can see,
      // so there is nothing left to assert. The order is unchanged -- the
      // SENDER is still checked before the recipient, because a course whose
      // stored from-address is not an address cannot mail anybody, and saying
      // so names the course to fix rather than the member.
      type Fate = { ok: true; email: string } | { ok: false; reason: string };
      const fate: Fate =
        !fromChoice.ok
          ? { ok: false, reason:
              `${courseName} sends from "${fromChoice.badValue}", which is not an email address. `
              + 'Set a valid From Email ID on the course.' }
        : !emailRow ? { ok: false, reason: 'No email on file' }
        : emailRow.status === 'bounced' ? { ok: false, reason: 'Primary email has bounced' }
        : emailRow.status === 'unsubscribed' ? { ok: false, reason: 'Unsubscribed' }
        : emailRow.status === 'complained' ? { ok: false, reason: 'Marked as spam previously' }
        : { ok: true, email: emailRow.email as string };

      // Signed per ADDRESS, so it is built per recipient and never once for
      // the batch -- a link shared between members would opt out whichever of
      // them clicked last. Em dash when there is no address to sign: that
      // member is excluded a few lines below and this text is never
      // delivered, and it is how every other absent value here is written.
      const unsubscribeUrl = emailRow
        ? await buildUnsubscribeUrl(emailRow.id as string, unsubscribeSecret, functionsBase)
        : '—';

      const vars: Record<string, string> = {
        first_name: member.full_name.split(' ')[0], member_name: member.full_name,
        course_name: courseName, branch_name: branchName,
        period_from: periodFrom, period_to: periodTo,
        expected_sessions: String(metric.expected ?? 0), attended_sessions: String(metric.attended ?? 0),
        missed_sessions: String(metric.missed ?? 0),
        attendance_pct: metric.attendance_pct == null ? '—' : `${metric.attendance_pct}%`,
        consecutive_missed: String(stat?.current_streak ?? 0),
        last_attendance_date: stat?.last_present_date ?? '—',
        academy_name: academyName,
        /* {{follow_up_trigger}} -- the rule that listed her, from the SNAPSHOT
           taken above, so the email and `email_batches.config_snapshot` carry
           the same number and a report six months later cannot disagree with
           what the member was told.
           (requests/2026-09-08-follow-up-trigger-on-send-and-reach-out.md)

           It is the count of whichever condition is ON, the same reading the
           panel and the course form use -- the disabled column keeps its value
           only so that switching back does not reset it, and rendering that
           would put a trigger nobody is judged by into an email.

           Read at SEND time and not from anything the client passed: a trigger
           changed a moment earlier -- which the send screens can now do -- is
           in force here, and a number posted from a screen could not be
           trusted to be the one the rule actually fired at. */
        follow_up_trigger: triggerOf(
          offering ? configSnapshot[offering.course_id as string] : null),
        /* {{unsubscribe_url}} -- the member's own signed opt-out link (0066
           puts it in the stored template). It is a variable and not a fixed
           address because the token commits to THIS member_emails row. */
        unsubscribe_url: unsubscribeUrl,
      };
      const subject = renderTemplate(template.subject, vars);
      const text = renderTemplate(template.body_text, vars);

      if (!fate.ok) {
        prepared.push({
          kind: 'excluded', memberId: id, name: member.full_name,
          toEmail: emailRow?.email ?? null, subject, vars, reason: fate.reason,
          fromAddress: fromAddress ?? undefined,
        });
        continue;
      }

      prepared.push({
        kind: 'send', memberId: id, name: member.full_name, toEmail: fate.email,
        subject, text, vars, fromAddress: fromAddress ?? undefined,
        // RFC 8058. The mailto is the fallback for a client that will not use
        // the URL; the URL is this member's own signed link, the same one the
        // body carries.
        //
        // List-Unsubscribe-Post is advertised ONLY because the POST branch of
        // the `unsubscribe` function honours it -- a one-click header on an
        // endpoint that ignores POST is worse than no header at all: the mail
        // client reports success to the member and nothing has changed.
        headers: [
          { name: 'List-Unsubscribe', value: `<mailto:${UNSUBSCRIBE_MAILTO}>, <${unsubscribeUrl}>` },
          { name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' },
        ],
      });
    }

    const { results, sent, failed, excluded } = await runSendLoop(
      admin as unknown as AdminLike, provider, batch.id as string, prepared);

    // Attributed (0023). On the service-role client audit_log() records no
    // actor at all, so every batch this academy has ever sent reads as
    // "System" -- indistinguishable, in an append-only table, from a batch
    // sent by nobody. caller was verified at the top of the request.
    await admin.rpc('audit_log_as', {
      p_actor: caller.id,
      p_action: 'communication.batch_sent', p_entity_type: 'email_batch', p_entity_id: batch.id,
      p_metadata: { requested: memberIds.length, sent, failed, excluded, provider: provider.name },
    });

    return json({ batch_id: batch.id, requested: memberIds.length, sent, failed, excluded, results });
  } catch (err) {
    return errorJson(err);
  }
});
