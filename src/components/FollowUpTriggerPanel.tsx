import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { Muted, Label } from './ui';
import { defaultSelection, sentLabel } from '../data/sent';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from './Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../theme/tokens';
import { clampThreshold, MIN_THRESHOLD, MAX_THRESHOLD } from '../data/followup';
import {
  triggerQuestion, triggerPhrase, triggerSource, triggerImpact, triggerNeverFires,
  triggerConverts, triggerDirty, triggerResettable, triggerSavedLine,
  type TriggerReading,
} from '../data/followupTrigger';
import { saveCourseTrigger, dataSource } from '../data/repository';

/**
 * THE FOLLOW-UP TRIGGER, ON THE SCREENS THAT ACT ON IT
 * (requests/2026-09-08-follow-up-trigger-on-send-and-reach-out.md).
 *
 * The requester: *"this should be visible in both send communication and reach
 * out instead of nothing is there for follow up."*
 *
 * ONE COMPONENT FOR BOTH, deliberately. The send draft and the member pop-up
 * ask the same question about the same number, and the number decides who gets
 * an email — so two copies of this panel is two places for the sentence, the
 * bounds and the warnings to drift apart, on the one setting where drift means
 * mail to the wrong people. Every word it renders is generated from the values
 * by `src/data/followupTrigger.ts` (C-67), which is also the only file with
 * anything in it a spec can pin.
 *
 * WHAT IT DOES NOT DO
 *   - It does not decide who is flagged. `flagged()`/`isEligible` stay the one
 *     derivation (guardrail 1, CP-011); this changes the SAVED rule and lets
 *     that derivation answer again — which is why the hooks refetch on
 *     `onRulesChanged` rather than this panel filtering anything itself.
 *   - It does not touch the wording, the template or the sender (guardrail 5).
 *     `saveCourseTrigger` passes each of those back exactly as stored.
 *
 * APPLY IS A SEPARATE PRESS FROM SEND. The ask is *"do you want to change or
 * reset it AND send communication"* — two decisions, in that order. Folding the
 * save into the send button would mean a person who only wanted to read the
 * trigger changes it by sending, and a person who cancels the send loses a
 * change they had already made.
 *
 * READ-ONLY IS A REAL STATE, not a failure. With no single course resolved —
 * the all-courses draft — there is no one rule to write, so the panel states
 * the academy-wide trigger and offers no stepper. Saying nothing at all is what
 * this change exists to stop.
 */
export function FollowUpTriggerPanel({
  reading, courseId, daysPerWeek = null, testID = 'follow-up-trigger', onApplied,
  onDraftChange,
  readOnlyNote = 'This draft covers more than one course, so there is no single trigger to change here. Each course’s trigger is on its own course form.',
}: {
  /** null while the rules are still arriving, or if they failed to. The panel
   *  draws nothing then: it is an ADDITION to these screens, never a
   *  precondition for them — the same rule the reach-out label follows. */
  reading: TriggerReading | null;
  /** null = the trigger cannot be written from here, so it is stated only */
  courseId: string | null;
  /** the days this course runs, for the can-never-be-reached warning */
  daysPerWeek?: number | null;
  testID?: string;
  /** the screen's own reaction to a save. The lists refetch themselves through
   *  `onRulesChanged`; this is for anything else the caller wants to close. */
  onApplied?: (threshold: number) => void;
  /** whether the stepper is holding a change that has NOT been saved. Reported
   *  up rather than re-derived by the caller: the draft lives here, and a
   *  second copy of "is it dirty" is how a send button would enable itself over
   *  a change that never landed. */
  onDraftChange?: (pending: boolean) => void;
  /** what "no course to write to" MEANS on this screen. The all-courses draft
   *  and a member whose course cannot be resolved are different facts, and one
   *  sentence for both would state the wrong one on one of them. */
  readOnlyNote?: string;
}) {
  const { theme } = useTheme();
  const { flash } = useToast();
  /* null = untouched, so the panel FOLLOWS the saved value. Holding a number
     here from the start would leave a stale draft on screen after a save that
     landed a different one -- and after Apply this is set back to null so the
     refetched rule is what shows. */
  const [draft, setDraft] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;
  const dangerInk = ink('absent');

  /* A NUMBER TYPED AND NOT SAVED — the one thing a send button on the far side
     of this panel has to know. Narrower than `triggerDirty`, deliberately: that
     one also answers yes for a course stored under the retired consecutive
     trigger, which is a reason to OFFER Apply and not a reason to stop somebody
     sending to a list nobody has touched. Reported through an effect, and
     ABOVE the early return, because a hook cannot live under a condition. */
  const pendingChange = reading !== null && courseId !== null
    && draft !== null && clampThreshold(draft) !== reading.threshold;
  useEffect(() => { onDraftChange?.(pendingChange); }, [pendingChange, onDraftChange]);

  if (!reading) return null;

  const shown = clampThreshold(draft ?? reading.threshold);
  const editable = courseId !== null;
  const dirty = triggerDirty(reading, shown);
  const canReset = triggerResettable(reading, shown);
  const impact = triggerImpact(reading.threshold, shown);
  const converts = triggerConverts(reading, shown);
  const unreachable = triggerNeverFires(shown, reading.kind, daysPerWeek);

  const apply = async () => {
    if (!editable || !courseId || saving || !dirty) return;
    setSaving(true);
    setFailure(null);
    try {
      await saveCourseTrigger(courseId, shown);
      // Back to following the saved value: the refetch is what decides what is
      // on screen from here, not this component's own memory of the press.
      setDraft(null);
      flash(dataSource === 'live'
        ? triggerSavedLine(reading.courseName, shown)
        : `${triggerSavedLine(reading.courseName, shown)} — on this device only, the academy database is not configured`,
        dataSource === 'live' ? 'ok' : 'warn');
      onApplied?.(shown);
    } catch (err) {
      setFailure(err instanceof Error ? err.message
        : 'The follow-up trigger could not be changed. Nothing has been changed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View testID={testID} style={{
      borderRadius: RADIUS.md, backgroundColor: theme.surface2,
      borderWidth: 1, borderColor: theme.line, padding: 12,
    }}>
      {/* The heading carries the icon and the WORD, and the source pill says
          whose number this is -- never a tint on its own (guardrail 3). */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
        <Icon name="rule" size={16} color={theme.accentInk} />
        <Label style={{ flex: 1 }}>Follow-up trigger</Label>
        <Text testID={`${testID}-source`} style={{
          fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: theme.muted,
        }}>{reading.source === 'course' ? 'THIS COURSE' : 'ACADEMY DEFAULT'}</Text>
      </View>

      {/* THE QUESTION, in the requester's own words and generated from the
          values, so it cannot state a number the rule does not hold. */}
      <Text testID={`${testID}-question`} style={{
        fontSize: 12.5, lineHeight: 18, fontWeight: '600',
        color: theme.fgStrong, marginTop: SPACE.sm,
      }}>{triggerQuestion(reading)}</Text>
      <Muted style={{ fontSize: 11.5, lineHeight: 16, marginTop: 2 }}>
        {triggerSource(reading)}
      </Muted>

      {editable ? (
        <>
          {/* The SAME stepper and the same 1..7 bounds as the course form,
              from the same module -- a second set of bounds here is how the
              two screens would start accepting different numbers. */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.md,
          }}>
            <Step testID={`${testID}-minus`} icon="remove" label="One fewer"
              disabled={saving || shown <= MIN_THRESHOLD}
              onPress={() => setDraft(clampThreshold(shown - 1))} />
            <Text testID={`${testID}-value`}
              accessibilityLabel={triggerPhrase(shown, reading.kind)}
              style={{
                minWidth: 34, textAlign: 'center', fontSize: 20, fontWeight: '800',
                color: theme.fgStrong, fontVariant: ['tabular-nums'],
              }}>{shown}</Text>
            <Step testID={`${testID}-plus`} icon="add" label="One more"
              disabled={saving || shown >= MAX_THRESHOLD}
              onPress={() => setDraft(clampThreshold(shown + 1))} />
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: theme.muted }}>
              {triggerPhrase(shown, 'weekly')}
            </Text>
          </View>

          {/* WHAT THE CHANGE WOULD DO, in people rather than in numbers: a
              trigger is not a preference, it decides who an email reaches. */}
          {impact ? (
            <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm }}>
              <Icon name="group" size={15} color={theme.accentInk} />
              <Text testID={`${testID}-impact`} style={{
                flex: 1, fontSize: 11.5, lineHeight: 16, color: theme.accentInk,
              }}>{impact}</Text>
            </View>
          ) : null}

          {/* Stated BEFORE the save, never discovered from a list that moved --
              the same sentence the course form carries, for the same reason. */}
          {converts ? (
            <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm }}>
              <Icon name="error" size={15} color={dangerInk} />
              <Text testID={`${testID}-converts`} style={{
                flex: 1, fontSize: 11.5, lineHeight: 16, color: dangerInk,
              }}>{converts}</Text>
            </View>
          ) : null}

          {unreachable ? (
            <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm }}>
              <Icon name="error" size={15} color={dangerInk} />
              <Text testID={`${testID}-unreachable`} style={{
                flex: 1, fontSize: 11.5, lineHeight: 16, color: dangerInk,
              }}>{unreachable}</Text>
            </View>
          ) : null}

          {/* RESET puts the number back to the academy-wide one -- the value a
              course with no trigger of its own already follows. It does not
              save on its own: Reset and Change are the same decision, and both
              land on Apply, so the panel never writes on a press whose word is
              not "apply". */}
          <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
            <MiniButton testID={`${testID}-reset`}
              label={`Reset to ${reading.resetTo}`}
              disabled={saving || !canReset}
              onPress={() => setDraft(reading.resetTo)} />
            <MiniButton testID={`${testID}-apply`} primary
              label={saving ? 'Applying…' : 'Apply'}
              disabled={saving || !dirty}
              onPress={() => { void apply(); }} />
          </View>

          <Muted style={{ fontSize: 11, lineHeight: 15, marginTop: SPACE.sm }}>
            {dirty
              ? 'Apply saves the trigger on the course. Sending is a separate press.'
              : 'This is the trigger this list was drawn from.'}
          </Muted>

          {failure ? (
            <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm }}>
              <Icon name="error" size={15} color={dangerInk} />
              <Text testID={`${testID}-failure`} style={{
                flex: 1, fontSize: 11.5, lineHeight: 16, color: dangerInk,
              }}>{failure}</Text>
            </View>
          ) : null}
        </>
      ) : (
        /* No ONE course, so no one rule to write. The number is still stated --
           saying nothing is the complaint this change answers -- and where it
           is changed is named, rather than leaving a dead control on screen. */
        <Text testID={`${testID}-readonly`} style={{
          fontSize: 11.5, lineHeight: 16, marginTop: SPACE.sm, color: theme.muted,
        }}>{readOnlyNote}</Text>
      )}
    </View>
  );
}

/** One person on the list the prompt puts up after Apply. A plain shape, not a
 *  `Member`: this component decides nothing about who is eligible, it renders
 *  whoever the caller's derivation produced. */
export type TriggerRecipient = {
  id: string;
  name: string;
  email: string;
  /** when this period's message already went to her, from the merged sent map */
  sentAt?: string;
};

/**
 * THE PROMPT: the trigger, then WHO, then the send.
 *
 * "On clicking send communication and reach out show message of follow up
 * triggere of that course and ask ..." — and then, on the correction of
 * 8 Sep 2026: *"As soon as Apply button is clicked after changing to the new
 * number show the list of members with select/deselect option and then enable
 * 'Send communication' button. This time, the email should contain the new
 * number mentioned in this custom screen."*
 *
 * SO APPLY IS THE GATE, AND IT IS A REAL ONE
 * With a change pending, Send communication is DISABLED. That is not decoration:
 * the list on the far side of this button is derived from the SAVED rule, so
 * sending with 1 typed into the stepper and 4 still stored sends the four-miss
 * list under a screen showing 1 — the app claiming one rule and acting on
 * another, which is the whole of guardrail 1. Apply is what makes the number on
 * screen the number in force, and only then is there anything honest to send.
 *
 * WHY THE LIST IS HERE AND NOT ONLY IN THE DRAFT
 * Because the trigger is what CHANGES it. A person lowering the trigger from 4
 * to 1 is asking "who does that reach?", and the answer arriving one screen
 * later — after the decision is already made — is the answer to a question they
 * have stopped asking. So Apply re-derives and shows it, and the send goes from
 * here.
 *
 * THREE STEPS IN ONE CARD, never a modal on a modal. The confirmation is a step
 * of this card rather than a `ConfirmDialog` over it: sending stays confirmed
 * (it is the one irreversible act in this app) without stacking two Modals,
 * which is a stack this app has nowhere else.
 *
 * WHAT IT DOES NOT DECIDE: who is eligible, whether a member is reachable, what
 * the email says. Those arrive as props from a screen that read them from the
 * one derivation and the stored wording (guardrails 1 and 5).
 */
export function FollowUpTriggerPrompt({
  open, onClose, onContinue, continueLabel, reading, courseId, daysPerWeek = null,
  readOnlyNote, recipients, excludedNames = [], listPending = false,
  sending = false, failure = null, onSend, periodLabel,
}: {
  open: boolean;
  onClose: () => void;
  /** the hand-off when nothing was applied: the draft, exactly as before */
  onContinue: () => void;
  continueLabel: string;
  reading: TriggerReading | null;
  courseId: string | null;
  daysPerWeek?: number | null;
  readOnlyNote?: string;
  /** whom the SAVED rule flags now, already split for reachability by the
   *  caller — this component never asks that question itself */
  recipients: TriggerRecipient[];
  /** flagged, no usable address: named while being excluded, never dropped (C-76) */
  excludedNames?: string[];
  /** the rule is being re-read after an Apply, so the list is not final yet */
  listPending?: boolean;
  sending?: boolean;
  failure?: string | null;
  onSend: (memberIds: string[]) => void;
  periodLabel: string;
}) {
  const { theme } = useTheme();
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;
  /* Apply is what opens the list, so this is the step marker. It is set by the
     panel's own callback rather than guessed from the numbers: "the trigger
     happens to equal what I typed" and "I pressed Apply and it saved" are
     different facts, and only the second one means the stored rule moved. */
  const [applied, setApplied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // null = nobody has touched a box, so the default below applies. An empty
  // array is a real answer -- everything unticked -- and must not read as one.
  const [chosen, setChosen] = useState<string[] | null>(null);
  /* Whether the stepper is holding a change that has not been saved. The panel
     owns the draft number; this is the one bit of it the footer needs, and it
     is reported up rather than re-derived here from a second copy. */
  const [pendingChange, setPendingChange] = useState(false);

  if (!open) return null;

  const ids = recipients.map(r => r.id);
  const picked = (chosen ?? defaultSelection(ids, sentMapOf(recipients)))
    // Filtered against the CURRENT list: a member who stopped being flagged
    // while this was open must not stay ticked in a stale array.
    .filter(id => ids.includes(id));
  const allPicked = ids.length > 0 && picked.length === ids.length;
  const toggle = (id: string) => setChosen(
    picked.includes(id) ? picked.filter(x => x !== id) : [...picked, id]);
  const resending = recipients.filter(r => picked.includes(r.id) && r.sentAt).length;

  /* THE GATE. Nothing to send to, a save still in flight, or a change typed and
     not applied — each of them is a reason this button must not act, and each
     says which one it is rather than sitting greyed out with no explanation. */
  const blocked = pendingChange
    ? 'Apply the new trigger first — the list below is drawn from the saved one.'
    : listPending ? 'Reading the list against the trigger you applied…'
    : applied && picked.length === 0 ? 'Tick at least one member.'
    : null;

  const heading = confirming
    ? `Send to ${picked.length} ${picked.length === 1 ? 'member' : 'members'}?`
    : applied ? 'Who this now reaches' : 'Before this goes out';
  const subheading = confirming
    ? [
        `${periodLabel}.`,
        resending ? `${resending} already had this week’s message.` : '',
        excludedNames.length ? `${excludedNames.length} flagged without an address are left out.` : '',
        'This cannot be recalled.',
      ].filter(Boolean).join(' ')
    : applied
      ? `Listed by the trigger you just applied, for ${periodLabel}. Untick anyone this should not go to.`
      : 'This is the rule that decided who is written to.';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26 }}>
        <View testID="trigger-prompt-scrim" onStartShouldSetResponder={() => true}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: theme.scrim,
          }} />
        <View testID="trigger-prompt" accessibilityViewIsModal style={{
          width: '100%', maxWidth: 460, maxHeight: '86%', borderRadius: 24, padding: 22,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
        }}>
          <Text testID="trigger-prompt-title"
            style={{ fontSize: 19, fontWeight: '800', color: theme.fgStrong, lineHeight: 25 }}>
            {heading}
          </Text>
          <Text style={{ fontSize: 13, color: theme.muted, lineHeight: 19, marginTop: SPACE.sm }}>
            {subheading}
          </Text>

          {/* The card scrolls, the footer does not: on a phone a list of a
              dozen members would otherwise push the send button off-screen. */}
          <ScrollView style={{ marginTop: SPACE.md }} contentContainerStyle={{ paddingBottom: 2 }}>
            {/* THE TRIGGER STAYS ON SCREEN through every step. It is what the
                list below is an answer to, and a person confirming a send is
                entitled to see the rule that produced it without going back. */}
            <FollowUpTriggerPanel testID="reach-out-trigger"
              reading={reading} courseId={courseId} daysPerWeek={daysPerWeek}
              readOnlyNote={readOnlyNote}
              onDraftChange={setPendingChange}
              onApplied={() => { setApplied(true); setChosen(null); }} />

            {applied ? (
              <View style={{ marginTop: SPACE.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
                  <Pressable testID="trigger-prompt-select-all"
                    accessibilityRole="button"
                    accessibilityLabel={allPicked ? 'Clear the selection' : 'Select every member'}
                    disabled={ids.length === 0}
                    onPress={() => setChosen(allPicked ? [] : ids)}
                    style={({ pressed }) => ({
                      minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: SPACE.md,
                      borderRadius: RADIUS.pill, borderWidth: 1, borderColor: theme.line,
                      backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1,
                    })}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.accentInk }}>
                      {allPicked ? 'Clear all' : 'Select all'}
                    </Text>
                  </Pressable>
                  <Label style={{ flex: 1, textAlign: 'right' }}>
                    {`${picked.length} of ${ids.length} selected`}
                  </Label>
                </View>

                <View style={{ gap: SPACE.sm, marginTop: SPACE.sm }}>
                  {recipients.map(r => {
                    const on = picked.includes(r.id);
                    return (
                      <Pressable key={r.id} testID={`trigger-prompt-pick-${r.id}`}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={r.sentAt ? `${r.name} — ${sentLabel(r.sentAt)}` : r.name}
                        onPress={() => toggle(r.id)}
                        style={({ pressed }) => ({
                          flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                          padding: SPACE.md, minHeight: TAP_MIN, borderRadius: RADIUS.md,
                          // the app's own selected idiom: the BOX is the signal
                          // that survives greyscale, never the fill alone
                          backgroundColor: on ? theme.control : theme.surface,
                          borderWidth: 1, borderColor: on ? theme.accent : theme.line,
                          opacity: pressed ? 0.8 : 1,
                        })}>
                        <Icon name={on ? 'check_box' : 'check_box_outline_blank'} size={20}
                          color={on ? theme.accentInk : theme.dim} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.fgStrong }}>
                            {r.name}
                          </Text>
                          <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.muted }}>
                            {r.email}
                          </Text>
                        </View>
                        {/* The WORD, not a tint: "Sent 3 Sep" is the whole
                            point of the mark (guardrail 3). */}
                        {r.sentAt ? (
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: ink('present') }}>
                            {sentLabel(r.sentAt)}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                  {ids.length === 0 ? (
                    <Text testID="trigger-prompt-empty" style={{
                      fontSize: 12, lineHeight: 17, color: theme.muted,
                    }}>
                      {listPending
                        ? 'Reading the list…'
                        : 'Nobody in this course is over the trigger you applied, so there is nothing to send.'}
                    </Text>
                  ) : null}
                </View>

                {/* Counted and NAMED, never quietly dropped (C-76). */}
                {excludedNames.length ? (
                  <Text testID="trigger-prompt-excluded" style={{
                    fontSize: 11.5, lineHeight: 16, color: theme.muted, marginTop: SPACE.sm,
                  }}>
                    {`Excluded · ${excludedNames.join(', ')} — flagged, but no email address on file. They stay counted in every figure.`}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {failure ? (
              <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
                <Icon name="error" size={15} color={ink('absent')} />
                <Text testID="trigger-prompt-failure" style={{
                  flex: 1, fontSize: 11.5, lineHeight: 16, color: ink('absent'),
                }}>{failure}</Text>
              </View>
            ) : null}
          </ScrollView>

          {blocked && !confirming ? (
            <Text testID="trigger-prompt-blocked" style={{
              fontSize: 11.5, lineHeight: 16, color: theme.muted, marginTop: SPACE.md,
            }}>{blocked}</Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: SPACE.lg }}>
            <Pressable testID="trigger-prompt-cancel"
              onPress={() => (confirming ? setConfirming(false) : onClose())}
              disabled={sending}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flex: 1, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: theme.lineStrong, opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>
                {confirming ? 'Not yet' : 'Not now'}
              </Text>
            </Pressable>
            <Pressable testID="trigger-prompt-continue"
              disabled={sending || Boolean(blocked)}
              onPress={() => {
                if (sending || blocked) return;
                // Nothing applied: the draft, exactly as this prompt behaved
                // before the list existed. Applied: pick, confirm, send.
                if (!applied) { onContinue(); return; }
                if (!confirming) { setConfirming(true); return; }
                onSend(picked);
              }}
              accessibilityRole="button"
              accessibilityState={{ disabled: sending || Boolean(blocked) }}
              style={({ pressed }) => ({
                flex: 1.4, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: sending || blocked ? theme.surface2 : theme.accent,
                borderWidth: 1, borderColor: sending || blocked ? theme.line : theme.accent,
                opacity: pressed ? 0.85 : 1,
              })}>
              <Text style={{
                fontSize: 14, fontWeight: '800',
                color: sending || blocked ? theme.dim : theme.onAccent,
              }}>
                {sending ? 'Sending…'
                  : confirming ? `Send to ${picked.length}`
                  : applied ? `${continueLabel} · ${picked.length}`
                  : continueLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** The rows' own stamps, back in the shape `defaultSelection` reads. Built from
 *  the list rather than taken as a second prop, so the ticks and the "Sent"
 *  marks cannot be answers from two different maps. */
function sentMapOf(recipients: TriggerRecipient[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const r of recipients) if (r.sentAt) map[r.id] = r.sentAt;
  return map;
}

/** One end of the stepper, drawn disabled at the bounds rather than removed so
 *  the control does not change shape. The course form's own `Step`, which is
 *  private to that file — copied rather than exported because moving it is a
 *  change to a screen this request does not touch. */
function Step({ icon, label, onPress, disabled, testID }:
  { icon: string; label: string; onPress: () => void; disabled?: boolean; testID: string }) {
  const { theme } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} disabled={disabled}
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => ({
        width: TAP_MIN, height: TAP_MIN, borderRadius: RADIUS.md,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: disabled ? theme.surface2 : theme.control,
        borderWidth: 1, borderColor: disabled ? theme.line : theme.lineStrong,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={20} color={disabled ? theme.dim : theme.fgStrong} />
    </Pressable>
  );
}

/** Reset and Apply: shorter than the dialog's own footer buttons, because they
 *  belong to this panel and not to the screen it sits in. A disabled one keeps
 *  its place and its word — a control that vanishes at its bound is one nobody
 *  can find again. */
function MiniButton({ label, onPress, disabled, primary, testID }:
  { label: string; onPress: () => void; disabled?: boolean; primary?: boolean; testID: string }) {
  const { theme } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} disabled={disabled}
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => ({
        flex: 1, minHeight: TAP_MIN, borderRadius: RADIUS.md,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.md,
        backgroundColor: disabled ? theme.surface2 : primary ? theme.accent : theme.surface,
        borderWidth: 1,
        borderColor: disabled ? theme.line : primary ? theme.accent : theme.lineStrong,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Text style={{
        fontSize: 12.5, fontWeight: '800',
        color: disabled ? theme.dim : primary ? theme.onAccent : theme.fgStrong,
      }}>{label}</Text>
    </Pressable>
  );
}
