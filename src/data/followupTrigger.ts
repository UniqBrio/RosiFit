/**
 * THE FOLLOW-UP TRIGGER, READ OUT WHERE IT IS ACTED ON
 * (requests/2026-09-08-follow-up-trigger-on-send-and-reach-out.md).
 *
 * The requester's words: *"On clicking send communication and reach out show
 * message of follow up triggere of that course and ask the follow up triggere
 * for course is set 4 do you want to change or reset it"*, and *"this should be
 * visible in both send communication and reach out instead of nothing is there
 * for follow up."*
 *
 * WHAT THIS FILE IS AND IS NOT
 * It is the READING of the saved rule — which number is in force for a course,
 * where that number came from, what a change to it would do, and the sentences
 * that say all three. It is NOT a second evaluation of the rule: nothing here
 * decides who is flagged. `isEligible`/`flagged` (followup.ts, CP-011) stay the
 * one derivation the weekly list, the dashboard, the send draft and
 * `follow_up_candidates()` all answer to, and this module only describes the
 * input they read (guardrail 1).
 *
 * WHY THE SENTENCES ARE GENERATED AND NOT WRITTEN
 * C-67, the same reason `ruleSentence` is generated: a hardcoded "set to 4"
 * beside a stepper showing 2 is the defect the panel exists to remove. Every
 * string here is built from the values it is describing, so it cannot say a
 * number the rule does not hold.
 *
 * WHY IT IS OUT OF THE SCREEN
 * A file importing react-native cannot be run by a spec, and the arithmetic
 * this panel turns on — which trigger is ON, what Reset goes back to, whether a
 * count can ever be reached, whether saving converts a course — is exactly what
 * has to be pinnable. The bounds themselves are NOT redefined here; they are
 * `clampThreshold`, `MIN_THRESHOLD` and `MAX_THRESHOLD` from followup.ts, so
 * this panel and the course form cannot disagree about what 1..7 means.
 */
import type { FollowUpRule } from './mock';
import { clampThreshold } from './followup';

/** The shape `fetchRules` answers with. Written out rather than imported from
 *  repository.ts so this layer stays free of the data layer; it is structurally
 *  the same type, so `Rules` is accepted wherever this is asked for. */
export type RuleSet = { global: FollowUpRule; byCourseName: Record<string, FollowUpRule> };

export type TriggerReading = {
  /** the course this is the trigger FOR, or null when the screen is not
   *  looking at one course (the all-courses draft) */
  courseName: string | null;
  /** the count in force: how many missed sessions put a member on the list */
  threshold: number;
  /** WHICH condition is switched on. `save_course` stores one or the other,
   *  and the form only offers the weekly one — but a course saved before that
   *  can still be stored as consecutive, and a panel that showed its number
   *  under the word "week" would be lying about who is flagged. */
  kind: 'weekly' | 'consecutive';
  /** whose number it is: this course's own, or the academy-wide default */
  source: 'course' | 'global';
  /** false when NO condition is switched on — the rule lists nobody, whatever
   *  the count says. Drawn as its own answer rather than a threshold nobody
   *  can reach. */
  enabled: boolean;
  /** what Reset puts it back to: the academy-wide weekly count, which is the
   *  number a course with no trigger of its own already follows */
  resetTo: number;
};

/**
 * The trigger in force for a course, from the same `Rules` the derivation
 * reads.
 *
 * `courseName` rather than an id because that is the key `fetchRules` answers
 * in and the key `flagged()` looks up — a second keying here is how this panel
 * would start describing one course's rule over another's list.
 */
export function readTrigger(courseName: string | null, rules: RuleSet): TriggerReading {
  const own = courseName ? rules.byCourseName[courseName] : undefined;
  const rule = own ?? rules.global;
  // The trigger that is actually ON. Consecutive only when it is the only one
  // enabled: with both on, the weekly count is the one the form shows and the
  // one a save would keep, so naming the other would misdescribe the save.
  const consecutiveOnly = Boolean(rule.consecutive_enabled && !rule.weekly_enabled);
  return {
    courseName,
    threshold: clampThreshold(
      consecutiveOnly ? rule.consecutive_threshold : rule.weekly_threshold),
    kind: consecutiveOnly ? 'consecutive' : 'weekly',
    source: own ? 'course' : 'global',
    enabled: Boolean(rule.weekly_enabled || rule.consecutive_enabled),
    resetTo: clampThreshold(rules.global.weekly_threshold),
  };
}

/** "4 missed sessions in a week" / "4 consecutive missed sessions" — the count
 *  with the WORD that says what it counts. A bare number beside "trigger" is
 *  the ambiguity that had the weekly and consecutive rules read as one. */
export function triggerPhrase(threshold: number, kind: TriggerReading['kind']): string {
  const noun = threshold === 1 ? 'session' : 'sessions';
  return kind === 'consecutive'
    ? `${threshold} consecutive missed ${noun}`
    : `${threshold} missed ${noun} in a week`;
}

/** Whose number it is, in a clause. Answered for BOTH cases: a course that
 *  follows the academy default has not "got no rule", it has that one. */
export function triggerSource(r: TriggerReading): string {
  return r.source === 'course'
    ? 'This course has its own trigger.'
    : `This course follows the academy-wide trigger of ${r.resetTo}.`;
}

/**
 * THE QUESTION, in the requester's own grammar.
 *
 * "The follow-up trigger for X is set to 4 missed sessions in a week. Do you
 * want to change or reset it?"
 *
 * The all-courses draft gets the same sentence about the academy-wide rule
 * rather than nothing: that draft's list is produced by a trigger too, and
 * "nothing is there for follow up" is the complaint this closes.
 */
export function triggerQuestion(r: TriggerReading): string {
  const who = r.courseName ? `for ${r.courseName}` : 'for this academy';
  if (!r.enabled) {
    return `No follow-up condition is switched on ${who}, so nobody is listed for follow-up. Do you want to set one?`;
  }
  return `The follow-up trigger ${who} is set to ${triggerPhrase(r.threshold, r.kind)}. Do you want to change or reset it?`;
}

/**
 * What a change would DO, before it is saved — never after.
 *
 * A trigger is not a preference: lowering it puts more people on the list an
 * email is about to go to, and raising it takes people off it. The direction is
 * stated in those terms rather than as "changed from 4 to 2", which says
 * nothing about who receives an email.
 *
 * Silent when nothing has moved, so an untouched panel carries no warning.
 */
export function triggerImpact(saved: number, draft: number): string | null {
  if (draft === saved) return null;
  return draft < saved
    ? `Lowering it from ${saved} to ${draft} lists MORE members for follow-up.`
    : `Raising it from ${saved} to ${draft} lists FEWER members for follow-up.`;
}

/**
 * A count no member of this course can ever reach.
 *
 * The same check the course form carries, in the same words, because it is the
 * same defect: a course running twice a week with a weekly trigger of four has
 * a rule that is switched on and unreachable by arithmetic (0030). Answered
 * only for the weekly trigger — a consecutive run spans weeks, so the days a
 * course runs in one week does not bound it.
 */
export function triggerNeverFires(
  threshold: number, kind: TriggerReading['kind'], daysPerWeek: number | null,
): string | null {
  if (kind !== 'weekly' || daysPerWeek === null || daysPerWeek <= 0) return null;
  if (threshold <= daysPerWeek) return null;
  return `This course runs ${daysPerWeek} ${daysPerWeek === 1 ? 'day' : 'days'} a week, so ${threshold} can never be reached — nobody will ever be followed up.`;
}

/**
 * The conversion, said BEFORE the save.
 *
 * `save_course` stores one trigger: with `p_rule = 'week'` it switches the
 * consecutive condition off. A course still stored under the retired
 * consecutive trigger therefore CHANGES SHAPE the first time this panel saves,
 * and who is listed changes with it. The course form already says this in these
 * words (app/course/edit.tsx); saying it here as well is the difference between
 * a stated consequence and one discovered from a list that moved.
 */
export function triggerConverts(r: TriggerReading, draft: number): string | null {
  if (r.kind !== 'consecutive') return null;
  return `This course currently follows up on ${triggerPhrase(r.threshold, 'consecutive')}. Applying changes it to ${triggerPhrase(draft, 'weekly')}, and who is listed for follow-up will change with it.`;
}

/** Whether Apply has anything to do. A save that writes the number already
 *  stored is still an audited write, so it is not offered. */
export const triggerDirty = (r: TriggerReading, draft: number): boolean =>
  clampThreshold(draft) !== r.threshold || r.kind === 'consecutive';

/** Whether Reset has anything to go back TO. Silent, not hidden, when the
 *  course is already on the academy-wide number: the control keeps its place
 *  and says why it is off. */
export const triggerResettable = (r: TriggerReading, draft: number): boolean =>
  clampThreshold(draft) !== r.resetTo;

/** What was saved, in one line for the toast — the number AND what it counts,
 *  so a person who looks away mid-save still knows what landed. */
export const triggerSavedLine = (courseName: string | null, threshold: number): string =>
  `${courseName ?? 'This academy'} · follow-up trigger set to ${triggerPhrase(threshold, 'weekly')}`;
