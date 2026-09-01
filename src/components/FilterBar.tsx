import { View, Pressable, Text, ScrollView } from 'react-native';
import { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE, TAP_MIN } from '../theme/tokens';
import { BRANCHES, COURSES } from '../data/mock';

/**
 * C-84/85/86. One filter bar, used on every screen that filters, so the
 * interaction is identical everywhere (C-58/C-29). The selected period is
 * always visible -- metrics from different periods must never sit together
 * unlabelled.
 */
function Chips({ options, value, onChange, label }:
  { options: string[]; value: string; onChange: (v: string) => void; label: string }) {
  const { theme } = useTheme();
  return (
    <View>
      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
        textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.sm }}>
        {options.map(o => {
          const on = o === value;
          return (
            <Pressable key={o} onPress={() => onChange(o)}
              accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${label}: ${o}`}
              style={{
                minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: SPACE.lg,
                borderRadius: RADIUS.pill, borderWidth: 1.5,
                borderColor: on ? theme.accent : theme.lineStrong,
                backgroundColor: on ? theme.accent : 'transparent',
              }}>
              <Text style={{ fontSize: 13, fontWeight: '700',
                color: on ? theme.onAccent : theme.fg }}>{o}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function FilterBar({ branch, onBranch, course, onCourse, period }:
  { branch: string; onBranch: (v: string) => void;
    course: string; onCourse: (v: string) => void; period: string }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{
      backgroundColor: theme.surface2, borderRadius: RADIUS.lg, borderWidth: 1,
      borderColor: theme.line, padding: SPACE.md, marginBottom: SPACE.md, gap: SPACE.md,
    }}>
      <Pressable onPress={() => setOpen(o => !o)} accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', minHeight: TAP_MIN }}>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>
          {branch} · {course}
        </Text>
        <Text style={{ color: theme.accentInk, fontWeight: '800', fontSize: 13 }}>
          {open ? 'Hide filters' : 'Filters'}
        </Text>
      </Pressable>
      <Text style={{ fontSize: 12, color: theme.muted }}>{period}</Text>
      {open && (
        <View style={{ gap: SPACE.md }}>
          <Chips label="Branch" options={BRANCHES} value={branch} onChange={onBranch} />
          <Chips label="Course" options={COURSES} value={course} onChange={onCourse} />
        </View>
      )}
    </View>
  );
}
