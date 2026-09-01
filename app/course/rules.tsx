import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Label, Button } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN } from '../../src/theme/tokens';
import {
  COURSE_LIST, MEMBERS, GLOBAL_RULE, isEligible, type FollowUpRule,
} from '../../src/data/mock';

/**
 * C-61..C-67: the rule editor. Everything below edits a DRAFT; the live
 * preview counts who would be listed, and nothing changes until Save. A
 * config with both conditions off cannot exist -- the toggle refuses.
 */
export default function Rules() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const course = COURSE_LIST.find(c => c.id === id);

  const [scope, setScope] = useState<string | null>(course?.name ?? null);
  const [saved, setSaved] = useState<FollowUpRule>(GLOBAL_RULE);
  const [draft, setDraft] = useState<FollowUpRule>(GLOBAL_RULE);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const wouldList = MEMBERS.filter(m => isEligible(m, draft)).length;

  const plain = (() => {
    const w = `misses ${draft.weekly_threshold} or more sessions in the week`;
    const c = `misses ${draft.consecutive_threshold} sessions in a row`;
    const body = draft.weekly_enabled && draft.consecutive_enabled
      ? `${w} ${draft.combination === 'AND' ? 'AND' : 'OR'} ${c}`
      : draft.weekly_enabled ? w : c;
    return `A member ${scope ? `in ${scope}` : 'in any course'} is listed for follow-up when she ${body}.`;
  })();

  const toggle = (key: 'weekly_enabled' | 'consecutive_enabled') => {
    const next = { ...draft, [key]: !draft[key] };
    if (!next.weekly_enabled && !next.consecutive_enabled) {
      // C-62: both-off cannot exist; the same guard the DB CHECK enforces
      flash('Turn on at least one condition, or switch follow-up off entirely', 'warn');
      return;
    }
    setDraft(next);
  };

  const conditions = [
    { key: 'weekly_enabled' as const, tkey: 'weekly_threshold' as const,
      label: 'Weekly missed sessions', min: 1, max: 7,
      hint: 'Listed when she misses this many of the week’s scheduled sessions.' },
    { key: 'consecutive_enabled' as const, tkey: 'consecutive_threshold' as const,
      label: 'Consecutive missed sessions', min: 1, max: 12,
      hint: 'Listed when her current run of misses reaches this length.' },
  ];

  return (
    <Screen>
      <Muted style={{ marginBottom: SPACE.lg }}>
        {scope
          ? `${scope} · overrides the academy default`
          : 'The academy default · used by every course without its own rules'}
      </Muted>

      {/* C-64: scope first — who this rule is FOR is never implicit */}
      <View style={{ gap: SPACE.sm }}>
        {[
          { key: null, label: 'Use for every course',
            desc: 'The academy default. A course can still be given its own rules from Courses.' },
          { key: course?.name ?? 'Prenatal Flow', label: `Set rules for ${course?.name ?? 'Prenatal Flow'}`,
            desc: 'Only this course. Everyone else keeps the academy default.' },
        ].map(s => {
          const on = scope === s.key;
          return (
            <Pressable key={String(s.key)} onPress={() => setScope(s.key)}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              accessibilityLabel={`${s.label}. ${s.desc}`}
              style={{
                flexDirection: 'row', gap: SPACE.md, padding: SPACE.lg, minHeight: TAP_MIN,
                borderRadius: RADIUS.lg, backgroundColor: on ? theme.control : theme.surface,
                borderWidth: 1.5, borderColor: on ? theme.accent : theme.line,
              }}>
              <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'}
                size={20} color={on ? theme.accentInk : theme.dim} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: theme.fgStrong }}>{s.label}</Text>
                <Text style={{ fontSize: 12, color: theme.muted, marginTop: 3, lineHeight: 17 }}>{s.desc}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{
        marginTop: SPACE.lg, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, gap: SPACE.lg,
      }}>
        {conditions.map(c => {
          const on = draft[c.key];
          const v = draft[c.tkey];
          return (
            <View key={c.key}>
              <Pressable onPress={() => toggle(c.key)}
                accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                accessibilityLabel={c.label}
                style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: TAP_MIN - 8 }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 7,
                  backgroundColor: on ? theme.accent : 'transparent',
                  borderWidth: 1.5, borderColor: on ? theme.accent : theme.lineStrong,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {on ? <Icon name="check" size={14} color={theme.onAccent} /> : null}
                </View>
                <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '800', color: theme.fgStrong }}>{c.label}</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.sm }}>
                <Text style={{ flex: 1, fontSize: 12, color: theme.muted, lineHeight: 17 }}>{c.hint}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                  {(['−', '+'] as const).map((sym, i) => {
                    const delta = i === 0 ? -1 : 1;
                    const disabled = !on || (delta < 0 ? v <= c.min : v >= c.max);
                    return i === 0 ? (
                      <StepBtn key={sym} sym={sym} disabled={disabled}
                        label={`Decrease ${c.label.toLowerCase()}`}
                        onPress={() => setDraft({ ...draft, [c.tkey]: v - 1 })} />
                    ) : (
                      <View key={sym} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                        <Text accessibilityLiveRegion="polite" style={{
                          width: 30, textAlign: 'center', fontSize: 18, fontWeight: '800',
                          color: on ? theme.fgStrong : theme.dim, fontVariant: ['tabular-nums'],
                        }}>{v}</Text>
                        <StepBtn sym={sym} disabled={disabled}
                          label={`Increase ${c.label.toLowerCase()}`}
                          onPress={() => setDraft({ ...draft, [c.tkey]: v + 1 })} />
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          );
        })}

        <View>
          <Label>When should she be listed?</Label>
          <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm }}>
            {([['OR', 'Either condition'], ['AND', 'Both conditions']] as const).map(([key, label]) => {
              const on = draft.combination === key;
              return (
                <Pressable key={key} onPress={() => setDraft({ ...draft, combination: key })}
                  accessibilityRole="radio" accessibilityState={{ selected: on }}
                  style={{
                    flex: 1, minHeight: TAP_MIN + 4, alignItems: 'center', justifyContent: 'center', gap: 2,
                    borderRadius: RADIUS.md, backgroundColor: on ? theme.accent : theme.surface2,
                    borderWidth: 1, borderColor: on ? theme.accent : theme.lineStrong,
                  }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: on ? theme.onAccent : theme.fg }}>{label}</Text>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: on ? theme.onAccent : theme.muted }}>{key}</Text>
                </Pressable>
              );
            })}
          </View>
          <Muted style={{ marginTop: SPACE.sm }}>
            {draft.combination === 'AND' && draft.weekly_enabled && draft.consecutive_enabled
              ? 'Both conditions must hold in the same week. Fewer members will be listed.'
              : 'Meeting either condition lists her. This is the safer default.'}
          </Muted>
        </View>
      </View>

      {/* C-67: the rule in PLAIN WORDS plus a live count, before anything saves */}
      <View style={{
        marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <Text style={{ fontSize: 13.5, color: theme.fg, lineHeight: 21 }}>{plain}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACE.md, marginTop: SPACE.md }}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: theme.accentInk, fontVariant: ['tabular-nums'] }}>
            {wouldList}
          </Text>
          <Muted style={{ flex: 1 }}>
            {`members would be listed for the current week, out of ${MEMBERS.length}. Nothing is saved until you press save.`}
          </Muted>
        </View>
      </View>

      <Muted style={{ marginTop: SPACE.md }}>
        Cancelled classes, festival holidays, and sessions still awaiting upload never count toward a
        miss. Every send stores the rule it used, so a report months later can say which one applied.
      </Muted>

      <Button label="Save rules" disabled={!dirty} style={{ marginTop: SPACE.lg }}
        onPress={() => {
          setSaved(draft);
          flash(`Rules saved · ${wouldList} members listed`);
        }} />
      <Muted style={{ marginTop: 9, textAlign: 'center' }}>
        {dirty ? 'Saved rules are stored with every send, for audit' : 'Nothing changed yet'}
      </Muted>
    </Screen>
  );
}

function StepBtn({ sym, disabled, label, onPress }:
  { sym: string; disabled: boolean; label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled}
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
      style={{
        width: TAP_MIN - 4, height: TAP_MIN - 8, borderRadius: RADIUS.sm,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: disabled ? theme.control : theme.surface2,
        borderWidth: 1, borderColor: theme.lineStrong,
      }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: disabled ? theme.dim : theme.fgStrong }}>{sym}</Text>
    </Pressable>
  );
}
