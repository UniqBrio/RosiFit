import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Muted, Label, Skeleton, ErrorState } from '../../src/components/ui';
import { Field } from '../../src/components/Field';
import { FormDialog } from '../../src/components/FormDialog';
import { Icon } from '../../src/components/Icon';
import { DropdownRow, DropdownField, DropdownPanel, DropdownList } from '../../src/components/Dropdown';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../../src/theme/tokens';
import { DAY_NAMES } from '../../src/data/mock';
import { fillTokens, unknownTokens } from '../../src/data/message';
import {
  useCourses, useBranchUsage, useTemplates, useSenders, useCourseMessage, useFollowUp,
  useAcademyDetails,
} from '../../src/data/hooks';
import { saveCourse, dataSource } from '../../src/data/repository';

/**
 * Add / Edit a course — everything the course decides, in one dialog.
 *
 * WHAT THIS FORM USED TO BE
 * Name, a start and end time, a stated frequency number, and a note telling
 * people to set the actual days somewhere else. The sender, the template, the
 * wording and the follow-up rule lived on two separate settings screens.
 *
 * The canvas puts all of it here, and says why in its own caption: "A
 * course's message wording, sender and follow-up rule are edited in the
 * course form itself — there is no separate Message Templates or Follow-up
 * Rules screen in settings." Those two screens are gone.
 *
 * GONE WITH THEM: start and end time, fee, short code, offerings-as-schedule
 * and the tap-to-insert token row. The time fields were a DEFAULT for new
 * offerings that nothing read afterwards; there are no commercial fields
 * anywhere in this product; and the token row put nine buttons under a text
 * box to insert nine strings a person can type, while the preview below
 * already shows whether they resolved.
 *
 * ONE SAVE. The seven fields land in five tables, and offering_schedules has
 * no direct write policy at all, so this calls save_course (0022) rather than
 * sequencing writes here. A sequence that fails half way leaves a course with
 * no offering, or an offering with no schedule: expected at no session, in no
 * follow-up list, counted by nobody.
 */
export default function CourseEdit() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { id, state: forced } = useLocalSearchParams<{ id?: string; state?: string }>();
  const editing = typeof id === 'string' && id.length > 0 ? id : null;

  const courses = useCourses(forced);
  const branches = useBranchUsage(forced);
  const templates = useTemplates(forced);
  const senders = useSenders(forced);
  const message = useCourseMessage(editing, forced);
  const followUp = useFollowUp(forced);
  const academy = useAcademyDetails(forced);

  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [rule, setRule] = useState<'week' | 'consec'>('week');
  const [sender, setSender] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [open, setOpen] = useState<null | 'branch' | 'sender' | 'template'>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const course = editing ? (courses.data ?? []).find(c => c.id === editing) ?? null : null;
  const branchList = branches.data ?? [];
  const templateList = templates.data ?? [];
  const senderList = senders.data ?? [];
  const rules = followUp.data?.rules;

  /* The form is SEEDED once from what the course already says, then left
   * alone. Re-seeding on every render would overwrite what is being typed the
   * moment any of these queries refetched. */
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (seeded) return;
    const ready = message.state !== 'loading' && branches.state === 'ready'
      && templates.state === 'ready' && senders.state === 'ready';
    if (!ready) return;

    if (course) {
      setName(course.name);
      const first = course.offerings[0];
      setBranchId(branchList.find(b => b.name === first?.branch)?.id ?? branchList[0]?.id ?? null);
      setDays(first?.weekdays ?? []);
      const r = rules?.byCourseName[course.name];
      // The canvas offers one trigger or the other. A course whose stored rule
      // has consecutive enabled reads as 'consec' whatever else is set.
      setRule(r?.consecutive_enabled && !r?.weekly_enabled ? 'consec' : 'week');
    } else {
      setBranchId(branchList[0]?.id ?? null);
    }
    setSender(message.data?.from_email ?? senderList[0] ?? null);
    setTemplateId(message.data?.template_id ?? templateList[0]?.id ?? null);
    // null means "still the template's" -- typing is what makes it the
    // course's own, and Reset puts it back to null.
    setSubject(message.data?.source === 'course' ? message.data.subject : null);
    setBody(message.data?.source === 'course' ? message.data.body : null);
    setSeeded(true);
  }, [seeded, message.state, branches.state, templates.state, senders.state, course]);

  const template = templateList.find(t => t.id === templateId) ?? null;
  // What the box shows: the course's own words where it has any, otherwise
  // the template's. Editing seeds from what is displayed, so nothing is lost.
  const shownSubject = subject ?? template?.subject ?? message.data?.subject ?? '';
  const shownBody = body ?? template?.body ?? message.data?.body ?? '';
  const overridden = subject !== null || body !== null;

  const branch = branchList.find(b => b.id === branchId) ?? null;
  const valid = name.trim().length >= 2 && days.length > 0 && !!branchId && !!sender && !!templateId;

  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;
  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;

  /* The preview renders against a REAL member of this course where there is
   * one, because a token that resolves for a fixture and not for her is
   * exactly what the preview exists to catch. */
  const sample = (followUp.data?.members ?? []).find(m => m.course === course?.name)
    ?? (followUp.data?.members ?? [])[0] ?? null;
  const previewCtx = sample
    ? {
        member: sample,
        courseName: name || 'this course',
        branchName: branch?.name ?? '—',
        academyName: academy.data?.name ?? 'RosiFit',
        // The period is stated at SEND time, not here; the preview says so in
        // words rather than showing a date this form never chose.
        periodFrom: 'the period start', periodTo: 'the period end',
      }
    : null;
  const stray = [...new Set([...unknownTokens(shownSubject), ...unknownTokens(shownBody)])];

  const save = async () => {
    if (!valid || saving || !branchId || !sender || !templateId) return;
    setSaving(true);
    setFailure(null);
    try {
      const result = await saveCourse({
        id: editing, name: name.trim(), branch_id: branchId, weekdays: days, rule,
        from_email: sender, template_id: templateId,
        subject: subject ?? '', body: body ?? '',
      });
      flash(dataSource === 'live'
        ? `${name.trim()} ${result.created ? 'added' : 'updated'} · ${days.length} ${days.length === 1 ? 'day' : 'days'} a week`
        : `${name.trim()} saved on this device only — the academy database is not configured`,
        dataSource === 'live' ? 'ok' : 'warn');
      router.back();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'The course could not be saved. Nothing has been saved.');
    } finally {
      setSaving(false);
    }
  };

  const loading = message.state === 'loading' || branches.state === 'loading'
    || templates.state === 'loading' || senders.state === 'loading';
  const failed = branches.state === 'error' || templates.state === 'error' || message.state === 'error';

  const hint = !name.trim() ? 'A course name is required'
    : days.length === 0 ? 'Select at least one frequency day'
    : `${branch?.name ?? '—'} · ${days.length}/week · ${rule === 'week' ? '4 weekly' : '4 consecutive'}`;

  return (
    <FormDialog
      title={editing ? 'Edit course' : 'Add a course'}
      subtitle={editing ? (course?.name ?? '') : 'Name, days, sender and template'}
      closeTestID="course-close" cancelTestID="course-cancel" confirmTestID="course-save"
      confirmLabel={saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Course'}
      /* No footer while it is loading or broken: a Save under a skeleton
         offers to write a form nobody has seen yet. */
      onConfirm={loading || failed ? undefined : () => void save()}
      confirmDisabled={!valid || saving}
      hint={loading || failed ? undefined : hint}>
      {loading ? (
        <Skeleton lines={7} />
      ) : failed ? (
        <ErrorState onRetry={() => { branches.retry(); templates.retry(); message.retry(); }}
          message={branches.error ?? templates.error ?? message.error
            ?? 'The course could not be loaded. Nothing has been changed.'} />
      ) : (
        <>
            <Field label="Course name" value={name} onChange={setName}
              placeholder="e.g. Gentle Recovery Yoga" />

            <DropdownRow open={open === 'branch'}>
              <DropdownField label="Branch" value={branch?.name ?? 'Choose a branch'}
                open={open === 'branch'} testID="course-branch-field"
                onPress={() => setOpen(o => (o === 'branch' ? null : 'branch'))} />
              {open === 'branch' ? (
                <DropdownPanel>
                  <DropdownList testID="course-branch"
                    options={branchList.map(b => ({ label: b.name, meta: `${b.courses} courses` }))}
                    value={branch?.name ?? ''}
                    onSelect={l => {
                      setBranchId(branchList.find(b => b.name === l)?.id ?? null);
                      setOpen(null);
                    }} />
                </DropdownPanel>
              ) : null}
            </DropdownRow>

            {/* ------------------------------------------------- frequency */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: SPACE.lg }}>
              <Label style={{ flex: 1 }}>Frequency</Label>
              <Text style={{
                fontSize: 11.5, fontWeight: '800',
                color: days.length ? theme.accentInk : dangerInk,
              }}>{days.length ? `${days.length} ${days.length === 1 ? 'day' : 'days'}/week` : 'Required'}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6, marginTop: SPACE.sm }}>
              {[1, 2, 3, 4, 5, 6, 7].map(d => {
                const on = days.includes(d);
                return (
                  <Pressable key={d} testID={`course-day-${d}`}
                    onPress={() => setDays(cur =>
                      cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d].sort())}
                    accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                    accessibilityLabel={DAY_NAMES[d]}
                    style={{
                      flex: 1, height: TAP_MIN, borderRadius: RADIUS.sm,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: on ? theme.accent : theme.surface,
                      borderWidth: 1, borderColor: on ? theme.accent : theme.lineStrong,
                    }}>
                    <Text style={{
                      fontSize: 11, fontWeight: '800',
                      color: on ? theme.onAccent : theme.fg,
                    }}>{DAY_NAMES[d]}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* The days ARE the expectation, so the note says what they mean
                rather than that a field is empty. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACE.sm }}>
              <Icon name={days.length ? 'event_available' : 'error'} size={15}
                color={days.length ? theme.muted : dangerInk} />
              <Text style={{ flex: 1, fontSize: 11.5, lineHeight: 17,
                color: days.length ? theme.muted : dangerInk }}>
                {days.length
                  ? `Attendance is expected on ${days.map(d => DAY_NAMES[d]).join(', ')}.`
                  : 'At least one day is required — with none, nothing is expected of anyone.'}
              </Text>
            </View>

            {/* --------------------------------------------------- sender */}
            <DropdownRow open={open === 'sender'} style={{ marginTop: SPACE.lg }}>
              <DropdownField label="From email ID" value={sender ?? 'Choose an address'}
                open={open === 'sender'} testID="course-sender-field"
                onPress={() => setOpen(o => (o === 'sender' ? null : 'sender'))} />
              {open === 'sender' ? (
                <DropdownPanel>
                  <DropdownList testID="course-sender"
                    options={senderList.map(label => ({ label, meta: 'verified' }))}
                    value={sender ?? ''}
                    onSelect={l => { setSender(l); setOpen(null); }} />
                </DropdownPanel>
              ) : null}
            </DropdownRow>

            <DropdownRow open={open === 'template'} style={{ marginTop: SPACE.md }}>
              <DropdownField label="Message template" value={template?.name ?? 'Choose a template'}
                open={open === 'template'} testID="course-template-field"
                onPress={() => setOpen(o => (o === 'template' ? null : 'template'))} />
              {open === 'template' ? (
                <DropdownPanel>
                  <DropdownList testID="course-template"
                    options={templateList.map(t => ({ label: t.name, meta: t.preview }))}
                    value={template?.name ?? ''}
                    onSelect={l => {
                      setTemplateId(templateList.find(t => t.name === l)?.id ?? null);
                      // Choosing a template means choosing ITS words. Keeping
                      // an override here would name one template and send
                      // another's wording.
                      setSubject(null); setBody(null);
                      setOpen(null);
                    }} />
                </DropdownPanel>
              ) : null}
            </DropdownRow>

            {/* ------------------------------------------- the course's words */}
            <View style={{
              marginTop: SPACE.lg, padding: SPACE.lg, borderRadius: RADIUS.lg,
              backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Icon name="edit_note" size={17} color={theme.accentInk} />
                <Label style={{ flex: 1 }}>Wording for this course</Label>
                {overridden ? (
                  <Pressable testID="course-reset-wording"
                    onPress={() => {
                      setSubject(null); setBody(null);
                      flash(`Wording reset to the ${template?.name ?? 'template'} template`);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Reset the wording to the template"
                    style={{ minHeight: TAP_MIN / 2, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>Reset</Text>
                  </Pressable>
                ) : null}
              </View>

              <Label style={{ marginTop: SPACE.md }}>Subject</Label>
              <TextInput
                testID="course-subject"
                value={shownSubject}
                onChangeText={setSubject}
                placeholder="We missed you this week, {{first_name}}"
                placeholderTextColor={theme.muted}
                accessibilityLabel="Message subject"
                style={{
                  marginTop: 6, minHeight: TAP_MIN, borderRadius: RADIUS.md,
                  paddingHorizontal: SPACE.md, color: theme.fgStrong, fontSize: 14,
                  backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.lineStrong,
                }} />

              <Label style={{ marginTop: SPACE.md }}>Message</Label>
              <TextInput
                testID="course-body"
                value={shownBody}
                onChangeText={setBody}
                multiline
                accessibilityLabel="Message body"
                style={{
                  marginTop: 6, minHeight: 118, borderRadius: RADIUS.md, textAlignVertical: 'top',
                  padding: SPACE.md, color: theme.fgStrong, fontSize: 14, lineHeight: 20,
                  backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.lineStrong,
                }} />

              {/* The preview is the point. This wording is authored once and
                  sent to everyone in the course, so an unresolved token is not
                  a typo in one email -- it is a typo in every email this
                  course will ever send. */}
              <View style={{
                marginTop: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.md,
                backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
              }}>
                <Label>{previewCtx ? `Preview · ${previewCtx.member.name}` : 'Preview'}</Label>
                {previewCtx ? (
                  <>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.fgStrong, marginTop: 6 }}>
                      {fillTokens(shownSubject, previewCtx)}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: theme.fg, marginTop: 5, lineHeight: 19 }}>
                      {fillTokens(shownBody, previewCtx)}
                    </Text>
                  </>
                ) : (
                  <Muted style={{ marginTop: 6 }}>
                    No member is enrolled yet, so there are no real figures to show this against.
                  </Muted>
                )}
              </View>

              {stray.length ? (
                <View accessibilityLiveRegion="polite"
                  style={{
                    flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md,
                    padding: SPACE.md, borderRadius: RADIUS.md,
                    backgroundColor: statusSurface(dangerInk).bg,
                    borderWidth: 1, borderColor: statusSurface(dangerInk).border,
                  }}>
                  <Icon name="error" size={17} color={dangerInk} />
                  <Text style={{ flex: 1, fontSize: 11.5, lineHeight: 17, color: theme.fg }}>
                    {`${stray.join(', ')} ${stray.length === 1 ? 'is not a token' : 'are not tokens'} — `}
                    {'it will be sent exactly as written. Check the spelling against the preview above.'}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
              <Icon name="info" size={16} color={theme.dim} />
              <Muted style={{ flex: 1 }}>
                This wording and sender belong to this course. Nothing is edited at send time.
              </Muted>
            </View>

            {/* ----------------------------------------- the follow-up rule */}
            <Label style={{ marginTop: SPACE.xl }}>Follow-up trigger</Label>
            <View style={{ gap: SPACE.sm, marginTop: SPACE.sm }}>
              {([
                { key: 'week' as const, label: '4 missed sessions in a week',
                  desc: 'Counted across the current week’s scheduled sessions.' },
                { key: 'consec' as const, label: '4 consecutive missed sessions',
                  desc: 'Counted as an unbroken run, however long it takes.' },
              ]).map(r => {
                const on = rule === r.key;
                return (
                  <Pressable key={r.key} testID={`course-rule-${r.key}`}
                    onPress={() => setRule(r.key)}
                    accessibilityRole="radio" accessibilityState={{ selected: on }}
                    accessibilityLabel={`${r.label}. ${r.desc}`}
                    style={{
                      flexDirection: 'row', gap: SPACE.md, padding: SPACE.lg,
                      borderRadius: RADIUS.lg, minHeight: TAP_MIN,
                      backgroundColor: on ? statusSurface(theme.accent).bg : theme.surface,
                      borderWidth: 1.5, borderColor: on ? theme.accent : theme.line,
                    }}>
                    <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'}
                      size={20} color={on ? theme.accentInk : theme.muted} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: theme.fgStrong }}>{r.label}</Text>
                      <Text style={{ fontSize: 12, color: theme.muted, marginTop: 3, lineHeight: 17 }}>{r.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
              <Icon name="rule" size={16} color={okInk} />
              <Muted style={{ flex: 1 }}>
                One or the other, never both. Holidays and cancelled classes never count toward a miss.
              </Muted>
            </View>

            {failure ? (
              <View style={{ marginTop: SPACE.lg }}>
                <ErrorState message={failure} onRetry={() => setFailure(null)} />
              </View>
            ) : null}
        </>
      )}
    </FormDialog>
  );
}
