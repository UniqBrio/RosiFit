// send-followups: renders the chosen stored template with each recipient's
// real engine figures and sends via the EmailProvider abstraction. Templates
// only -- there is no subject/body field this function accepts (C-68).
// Excluded members are returned and named, never silently dropped (C-76).
import { handlePreflight } from '../_shared/cors.ts';
import { json, errorJson, HttpError } from '../_shared/response.ts';
import { adminClient } from '../_shared/db.ts';
import { requireCaller } from '../_shared/authz.ts';
import { getEmailProvider } from './email.ts';

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
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

    const provider = getEmailProvider();
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
      const metric = metricsByMember.get(id) ?? { expected: 0, attended: 0, missed: 0, attendance_pct: null };
      const stat = statsByMember.get(id);
      const emailRow = emailByMember.get(id);

      let exclusionReason: string | null = null;
      if (!emailRow) exclusionReason = 'No email on file';
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
      };
      const subject = renderTemplate(template.subject, vars);
      const text = renderTemplate(template.body_text, vars);

      if (exclusionReason) {
        await admin.from('email_messages').insert({
          batch_id: batch.id, member_id: id, to_email: emailRow?.email ?? null,
          subject, variables: vars, status: 'excluded', exclusion_reason: exclusionReason,
        });
        results.push({ member_id: id, name: member.full_name, status: 'excluded', reason: exclusionReason });
        excluded++;
        continue;
      }

      const { data: msgRow } = await admin.from('email_messages').insert({
        batch_id: batch.id, member_id: id, to_email: emailRow!.email, subject, variables: vars, status: 'sending',
      }).select('id').single();

      const result = await provider.send({ to: emailRow!.email as string, subject, text });

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
