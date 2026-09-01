import { View, Text, Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Screen, Muted, Label } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../../src/theme/tokens';
import { STAFF, TEMPLATES, BRANCHES, GLOBAL_RULE, SUPPORT_PHONE } from '../../src/data/mock';

type Item = {
  icon: string; label: string; meta: string;
  to?: Href; onPress?: () => void; danger?: boolean;
};

export default function More() {
  const { theme, mode, accentKey, accents, isCustom } = useTheme();
  const { flash } = useToast();
  const router = useRouter();

  const activeTemplates = TEMPLATES.filter(t => t.active).length;
  const accentName = isCustom ? 'custom' : (accents.find(a => a.key === accentKey)?.label ?? '');
  const themeName = mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light';

  const groups: { title: string; items: Item[] }[] = [
    {
      title: 'Configuration', items: [
        { icon: 'rule',        label: 'Follow-up rules',   meta: `${GLOBAL_RULE.weekly_threshold}+ missed`, to: '/course/rules' },
        { icon: 'mail',        label: 'Message templates', meta: `${activeTemplates} active`,           to: '/templates' },
        { icon: 'event_busy',  label: 'Holidays',          meta: 'add',                                 to: '/holiday' },
        { icon: 'apartment',   label: 'Branches',          meta: String(BRANCHES.length - 1),
          onPress: () => flash(BRANCHES.filter(b => b !== 'All branches').join(' · ')) },
      ],
    },
    {
      title: 'Access', items: [
        { icon: 'badge',           label: 'Staff & access',        meta: String(STAFF.length), to: '/staff' },
        { icon: 'phonelink_lock',  label: 'First-time PIN setup',  meta: 'staff view',         to: '/set-pin' },
        { icon: 'help_center',     label: 'PIN recovery questions', meta: '2 set',             to: '/forgot-pin' },
        { icon: 'how_to_reg',      label: 'Super admin registration', meta: 'PIN recovery',    to: '/register' },
        { icon: 'history',         label: 'Audit log',             meta: 'today',              to: '/audit' },
      ],
    },
    {
      title: 'App', items: [
        { icon: 'palette',       label: 'Appearance',     meta: `${themeName} · ${accentName}`, to: '/appearance' },
        { icon: 'translate',     label: 'Language',       meta: 'English', onPress: () => flash('Tamil is coming') },
        { icon: 'support_agent', label: 'Help & support', meta: SUPPORT_PHONE, to: '/help' },
        { icon: 'logout',        label: 'Sign out',       meta: '', danger: true,
          onPress: () => router.replace('/') },
      ],
    },
  ];

  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;

  return (
    <Screen>
      <Muted style={{ marginBottom: SPACE.lg }}>Your account, your academy, your rules</Muted>

      <Pressable onPress={() => router.push('/profile')}
        accessibilityRole="button"
        accessibilityLabel="Priya Menon, Academy admin. Open your profile"
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 14, padding: SPACE.lg,
          borderRadius: 20, backgroundColor: theme.accentDeep,
          borderWidth: 1, borderColor: theme.lineStrong, opacity: pressed ? 0.85 : 1,
        })}>
        <View style={{
          width: 52, height: 52, borderRadius: 26, backgroundColor: theme.accentAvatar,
          borderWidth: 2, borderColor: theme.lineStrong, alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: theme.onAccent }}>PM</Text>
        </View>
        <View style={{ flex: 1 }}>
          {/* the deep header is the same dark plum in both themes, so the
              name is white in both -- theme.onDeep is the softer body ink */}
          <Text style={{ fontSize: 19, fontWeight: '800', color: '#FFFFFF' }}>Priya Menon</Text>
          <Text style={{ fontSize: 12, color: theme.onDeep, marginTop: 3, fontVariant: ['tabular-nums'] }}>
            Academy admin · +91 80563 29742
          </Text>
        </View>
        <Icon name="chevron_right" size={22} color={theme.onDeep} />
      </Pressable>

      {groups.map(g => (
        <View key={g.title} style={{ marginTop: SPACE.xxl }}>
          <Label style={{ marginBottom: SPACE.sm }}>{g.title}</Label>
          <View style={{
            borderRadius: RADIUS.lg, backgroundColor: theme.surface,
            borderWidth: 1, borderColor: theme.line, overflow: 'hidden',
          }}>
            {g.items.map((i, ix) => {
              const ink = i.danger ? dangerInk : theme.fgStrong;
              return (
                <Pressable key={i.label}
                  onPress={() => (i.to ? router.push(i.to) : i.onPress?.())}
                  accessibilityRole="button"
                  accessibilityLabel={i.meta ? `${i.label}, ${i.meta}` : i.label}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 13,
                    minHeight: TAP_MIN + 10, paddingHorizontal: 15, paddingVertical: SPACE.md,
                    opacity: pressed ? 0.7 : 1,
                    borderBottomWidth: ix === g.items.length - 1 ? 0 : 1, borderBottomColor: theme.line,
                  })}>
                  <View style={{
                    width: 34, height: 34, borderRadius: RADIUS.sm,
                    backgroundColor: theme.control, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={i.icon} size={18} color={i.danger ? dangerInk : theme.accentInk} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: ink }}>{i.label}</Text>
                  {i.meta ? <Text style={{ fontSize: 12, color: theme.muted }}>{i.meta}</Text> : null}
                  <Icon name="chevron_right" size={20} color={theme.dim} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}
