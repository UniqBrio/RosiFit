import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Button, Pill, Row, Divider } from '../../src/components/ui';
import { Toggle, Stepper, Choice } from '../../src/components/Field';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS } from '../../src/theme/tokens';
import { COURSE_LIST, COURSE_RULES, GLOBAL_RULE, ruleSentence, CANDIDATES, type FollowUpRule } from '../../src/data/mock';

/**
 * C-60..C-67. Two conditions, combined by OR or AND, resolved as
 *   global default -> course override -> effective.
 */
export default function CourseRules() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const course = COURSE_LIST.find(c => c.id === id) ?? COURSE_LIST[0];

  const [useDefault, setUseDefault] = useState(!COURSE_RULES[course.id]);
  const [r, setR] = useState<FollowUpRule>(COURSE_RULES[course.id] ?? { ...GLOBAL_RULE, source: 'course' });
  const effective: FollowUpRule = useDefault ? GLOBAL_RULE : r;

  // at least one condition must be on, or the rule can never fire
  const noCondition = !effective.weekly_enabled && !effective.consecutive_enabled;
  const preview = CANDIDATES.filter(c => c.course_name === course.name).length;

  return (
    <Screen>
      <H1>Follow-up rules</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>{course.name}</Muted>

      <Card>
        <Choice label="Which rule applies?"
          options={['Use the academy default', 'Set rules for this course']}
          value={useDefault ? 'Use the academy default' : 'Set rules for this course'}
          onChange={v => setUseDefault(v === 'Use the academy default')} />
        {useDefault && (
          <Muted>
            Academy default: weekly missed ≥ {GLOBAL_RULE.weekly_threshold}
            {GLOBAL_RULE.consecutive_enabled ? `, consecutive ≥ ${GLOBAL_RULE.consecutive_threshold}` : ', consecutive off'}.
          </Muted>
        )}
      </Card>

      {!useDefault && (
        <Card>
          <H2>Conditions</H2>
          <View style={{ marginTop: SPACE.md }}>
            <Toggle label="Weekly missed sessions" value={r.weekly_enabled}
              onChange={v => setR(x => ({ ...x, weekly_enabled: v }))}
              hint="Counts misses within the selected week." />
            {r.weekly_enabled && (
              <Stepper label="Threshold" value={r.weekly_threshold} min={1} max={7}
                onChange={v => setR(x => ({ ...x, weekly_threshold: v }))} />
            )}
            <Divider />
            <Toggle label="Consecutive missed sessions" value={r.consecutive_enabled}
              onChange={v => setR(x => ({ ...x, consecutive_enabled: v }))}
              hint="Counts an unbroken run, however long it has been building." />
            {r.consecutive_enabled && (
              <Stepper label="Threshold" value={r.consecutive_threshold} min={1} max={12}
                onChange={v => setR(x => ({ ...x, consecutive_threshold: v }))} />
            )}
          </View>

          <Divider />
          <Choice label="When should a member be listed?"
            options={['Either condition (OR)', 'Both conditions (AND)']}
            value={r.combination === 'OR' ? 'Either condition (OR)' : 'Both conditions (AND)'}
            onChange={v => setR(x => ({ ...x, combination: v.startsWith('Either') ? 'OR' : 'AND' }))} />

          {noCondition && (
            <Body accessibilityLiveRegion="polite" style={{ color: theme.danger }}>
              Turn on at least one condition, or switch follow-up off entirely. With both off,
              nobody would ever be listed.
            </Body>
          )}
        </Card>
      )}

      {/* C-67: generated from the values, so it cannot drift from the rule */}
      <Card style={{ borderColor: theme.accent, borderWidth: 2 }}>
        <H2>What this means</H2>
        <Body style={{ marginTop: SPACE.sm }}>{ruleSentence(effective, course.name)}</Body>
        <Divider />
        <Row>
          <Pill text={`${preview} would be listed now`} tone={preview > 0 ? 'warning' : 'success'} />
        </Row>
        <Muted style={{ marginTop: SPACE.sm }}>
          Counted against the current week before you save, so a wider rule cannot surprise you.
        </Muted>
      </Card>

      <Row style={{ gap: SPACE.md }}>
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
        <Button label="Save rules" disabled={!useDefault && noCondition}
          onPress={() => router.back()} style={{ flex: 2 }} />
      </Row>
      <Muted style={{ textAlign: 'center', marginTop: SPACE.sm }}>
        Every changed field is recorded in the audit log, old value and new.
      </Muted>
    </Screen>
  );
}
