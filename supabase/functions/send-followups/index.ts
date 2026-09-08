// send-followups: renders the chosen stored template with each recipient's
// real engine figures and sends via the EmailProvider abstraction. Templates
// only -- there is no subject/body field this function accepts (C-68).
// Excluded members are returned and named, never silently dropped (C-76).
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { requireCaller } from '../_shared/authz.ts';
import { resolveEmailProvider } from './email.ts';
import { chooseFromAddress } from '../_shared/from-address.ts';

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

    const { data: template, error: tplErr } = await admin.from('email_templates')
      .select('id, name, subject, body_text, is_active').eq('id', templateId).maybeSingle();
    if (tplErr || !template) throw new HttpError(404, 'Template not found.');
    if (!template.is_active) throw new HttpError(409, 'This template is not active. Activate it in Settings first.');

    const { data: settingsRow } = await admin.from('app_settings').select('academy_name').eq('id', 1).single();
    const academyName = settingsRow?.academy_name ?? 'RosiFit Academy';

    const { data: members, error: mErr } = await admin.from('members')
      .select('id, full_name').in('id', memberIds).is('deleted_at', null);
    if (mErr) throw new HttpError(500, 'Could not load members.');
    const memberById = new Map((members ?? []).map(m => [m.id as string, m]));

    const { data: enrollments } = await admin.from('member_enrollments')
      .select('member_id, offering_id').in('member_id', memberIds).eq('status', 'active');
    const enrollByMember = new Map((enrollments ?? []).map(e => [e.member_id as string, e]));
    const offeringIds = [...new Set((enrollments ?? []).map(e => e.offering_id as string))];

    const zeroUuid = '00000000-0000-0000-0000-000000000000';
    const { data: offerings } = await admin.from('course_offerings')
      .select('id, course_id, branch_id').in('id', offeringIds.length ? offeringIds : [zeroUuid]);
    const offeringById = new Map((offerings ?? []).map(o => [o.id as string, o]));
    const courseIds = [...new Set((offerings ?? []).map(o => o.course_id as string))];
    const branchIds = [...new Set((offerings ?? []).map(o => o.branch_id as string))];

    const { data: courses } = await admin.from('courses').select('id, name')
      .in('id', courseIds.length ? courseIds : [zeroUuid]);
    const { data: branches } = await admin.from('branches').select('id, name')
      .in('id', branchIds.length ? branchIds : [zeroUuid]);
    const courseNameById = new Map((courses ?? []).map(c => [c.id as string, c.name as string]));
    const branchNameById = new Map((branches ?? []).map(b => [b.id as string, b.name as string]));

    // THE COURSE'S OWN SENDER (07-Sep-2026). course_communication.from_email is
    // what the From Email ID picker in the course form writes, and until now
    // nothing read it back: every message went out as SES_FROM_ADDRESS whatever
    // the course said. Read here, per course, in one query -- not per member,
    // which would be one round trip per recipient for a value shared by all of
    // them. A course with no row keeps the deployment's address.
    const { data: courseComms, error: ccErr } = await admin.from('course_communication')
      .select('course_id, from_email').in('course_id', courseIds.length ? courseIds : [zeroUuid]);
    // Loud, not silent. A failed read here is indistinguishable from "no course
    // has its own sender", and that reads as success while sending every
    // message from the wrong address -- the same shape as the discarded
    // destructure that made fetchSenders always fall back (TD-016).
    if (ccErr) throw new HttpError(500, "Could not load the courses' sender addresses, so nothing was sent.");
    const fromByCourse = new Map((courseComms ?? []).map(c => [c.course_id as string, c.from_email as string]));

    const { data: emails } = await admin.from('member_emails')
      .select('member_id, email, status').eq('is_primary', true).in('member_id', memberIds).is('deleted_at', null);
    const emailByMember = new Map((emails ?? []).map(e => [e.member_id as string, e]));

    const { data: stats } = await admin.from('member_stats').select('*').in('member_id', memberIds);
    const statsByMember = new Map((stats ?? []).map(s => [s.member_id as string, s]));

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

    const results: Array<{ member_id: string; name: string; status: string; reason?: string }> = [];
    let sent = 0, failed = 0, excluded = 0;

    for (const id of memberIds) {
      const member = memberById.get(id);
      if (!member) {
        results.push({ member_id: id, name: '(unknown)', status: 'excluded', reason: 'Member not found' });
        excluded++;
        continue;
      }

      const enroll = enrollByMember.get(id);
      const offering = enroll ? offeringById.get(enroll.offering_id as string) : undefined;
      const courseName = offering ? (courseNameById.get(offering.course_id as string) ?? '—') : '—';
      const branchName = offering ? (branchNameById.get(offering.branch_id as string) ?? '—') : '—';
      const fromChoice = chooseFromAddress(
        offering ? fromByCourse.get(offering.course_id as string) : null, defaultFrom);
      // Pulled out of the union here rather than read through `fromChoice`
      // below: the recipient is excluded via `exclusionReason`, which narrows
      // nothing about this value, and `undefined` is the honest answer for
      // both an unusable address and the dev provider's absent one.
      const fromAddress = fromChoice.ok ? fromChoice.from : undefined;
      const metric = metricsByMember.get(id) ?? { expected: 0, attended: 0, missed: 0, attendance_pct: null };
      const stat = statsByMember.get(id);
      const emailRow = emailByMember.get(id);

      let exclusionReason: string | null = null;
      // The SENDER is checked before the recipient is: a course whose stored
      // from-address is not an address cannot mail anybody, and saying so names
      // the course to fix rather than the member.
      if (!fromChoice.ok) {
        exclusionReason =
          `${courseName} sends from "${fromChoice.badValue}", which is not an email address. `
          + 'Set a valid From Email ID on the course.';
      } else if (!emailRow) exclusionReason = 'No email on file';
      else if (emailRow.status === 'bounced') exclusionReason = 'Primary email has bounced';
      else if (emailRow.status === 'unsubscribed') exclusionReason = 'Unsubscribed';
      else if (emailRow.status === 'complained') exclusionReason = 'Marked as spam previously';

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
      };
      const subject = renderTemplate(template.subject, vars);
      const text = renderTemplate(template.body_text, vars);

      if (exclusionReason) {
        await admin.from('email_messages').insert({
          batch_id: batch.id, member_id: id, to_email: emailRow?.email ?? null,
          subject, variables: vars, status: 'excluded', exclusion_reason: exclusionReason,
          from_email: fromAddress ?? null,
        });
        results.push({ member_id: id, name: member.full_name, status: 'excluded', reason: exclusionReason });
        excluded++;
        continue;
      }

      const { data: msgRow } = await admin.from('email_messages').insert({
        batch_id: batch.id, member_id: id, to_email: emailRow!.email, subject, variables: vars, status: 'sending',
        // RECORDED, not inferred. The sender now varies per course, so "which
        // address did this go out as" stops being answerable from the current
        // value of a secret and has to be written down per message.
        from_email: fromAddress ?? null,
      }).select('id').single();

      const result = await provider.send({
        to: emailRow!.email as string, subject, text, from: fromAddress });

      if (result.ok) {
        await admin.from('email_messages').update({
          status: 'sent', provider: provider.name, provider_message_id: result.providerMessageId,
          sent_at: new Date().toISOString(), attempt_count: 1,
        }).eq('id', msgRow!.id);
        await admin.from('member_stats').update({ last_emailed_at: new Date().toISOString() }).eq('member_id', id);
        results.push({ member_id: id, name: member.full_name, status: 'sent' });
        sent++;
      } else {
        await admin.from('email_messages').update({
          status: 'failed', provider: provider.name, failure_reason: result.error, attempt_count: 1,
        }).eq('id', msgRow!.id);
        results.push({ member_id: id, name: member.full_name, status: 'failed', reason: result.error });
        failed++;
      }
    }

    const finalStatus = failed > 0 ? 'completed_with_failures' : 'completed';
    await admin.from('email_batches').update({
      sent_count: sent, failed_count: failed, excluded_count: excluded,
      status: finalStatus, completed_at: new Date().toISOString(),
    }).eq('id', batch.id);

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
