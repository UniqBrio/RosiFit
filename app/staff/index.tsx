import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Button, Skeleton, ErrorState, EmptyState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { Sheet, ConfirmDialog } from '../../src/components/Sheet';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface, type StatusKey } from '../../src/theme/tokens';
import { STAFF_ACCESS, maskPhone, initials, AVATAR_TINTS, type Staff } from '../../src/data/mock';
import { useStaff } from '../../src/data/hooks';
import { useIdentity } from '../../src/data/session';
import { isConfigured } from '../../src/lib/supabase';
import { pinIssue, pinReset, staffReenable } from '../../src/data/api';
import { deleteStaff } from '../../src/data/repository';
import { setIssuedPin } from '../../src/data/pending';
import { ShellScreen } from '../../src/components/AppShell';

/**
 * Adding a person and giving them a login are TWO steps, on purpose. A record
 * exists first; access is granted deliberately afterwards. The list is sorted
 * by what still needs doing, so the two states that need the academy to act
 * are never below the ones that do not.
 */
const ACCESS_TONE: Record<string, StatusKey> = {
  notEnabled: 'absent', awaiting: 'awaiting', disabled: 'cancelled', active: 'present',
};

function StaffListBody() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();
  const { state, data, error, retry } = useStaff(forced);
  const [target, setTarget] = useState<Staff | null>(null);
  const [signOutEverywhere, setSignOutEverywhere] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Staff | null>(null);
  const [removing, setRemoving] = useState(false);
  // Her own row carries no bin. The server refuses it as well (an academy
  // whose only administrator can delete herself is an academy nobody can
  // administer), but a control that is only ever refused is a control that
  // should not have been drawn.
  const { identity } = useIdentity();

  const staff = useMemo(() => data ?? [], [data]);
  const people = useMemo(
    // An open PIN request outranks every access state: she is locked out and
    // waiting on this screen. Within the asked and the not-asked, the existing
    // "what still needs doing" order is untouched.
    () => [...staff].sort((a, b) =>
      Number(!!b.pinResetRequested) - Number(!!a.pinResetRequested)
      || STAFF_ACCESS[a.access].rank - STAFF_ACCESS[b.access].rank),
    [staff]);
  const needAccess = staff.filter(s => s.access !== 'active').length;
  const asked = staff.filter(s => s.pinResetRequested).length;
  const askedInk = theme.isDark ? STATUS.awaiting.fgDark : STATUS.awaiting.fgLight;

  const act = async (s: Staff) => {
    if (s.access === 'disabled') {
      // Re-enabling gives back access, not a PIN: she reappears as "needs a
      // PIN", and issuing one stays a second, deliberate act.
      if (!isConfigured) { flash(`${s.name.split(' ')[0]} re-enabled · still needs a PIN`); return; }
      try {
        await staffReenable(s.id);
        flash(`${s.name.split(' ')[0]} re-enabled · still needs a PIN`);
        retry();
      } catch (err) {
        flash(err instanceof Error ? err.message : 'That did not work.', 'warn');
      }
      return;
    }
    setSignOutEverywhere(true);
    setTarget(s);
  };

  const confirm = async () => {
    const s = target;
    if (!s || busy) return;
    setTarget(null);

    const goShowOnce = (pin: string) => {
      // The PIN is handed over in memory, never as a route parameter -- see
      // src/data/pending.ts. It is shown once and is never stored readable
      // or written to the audit log.
      setIssuedPin({ pin, name: s.name, phone: s.phone.replace('+91 ', ''), role: s.role });
      router.push('/staff/pin');
    };

    if (!isConfigured) {
      goShowOnce(String(Math.floor(1000 + Math.random() * 9000)));
      return;
    }

    setBusy(true);
    try {
      // Active means she has been using a PIN and forgot it (the C-98
      // admin-assisted path); anything else is her first or a replacement.
      const result = s.access === 'active'
        ? await pinReset(s.id, signOutEverywhere)
        : await pinIssue({ app_user_id: s.id });
      goShowOnce(result.pin);
      retry();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'That did not work.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  /**
   * The bin, behind a question that cannot be un-asked.
   *
   * The removal is a soft delete server-side and the confirmation says what
   * that means rather than promising a purge: her PIN dies, her row leaves
   * this list, and the registers she took stay attributed to her because
   * every one of them points at her id. See supabase/functions/pin-issue.
   */
  const remove = async (s: Staff) => {
    setConfirmRemove(null);
    setRemoving(true);
    try {
      await deleteStaff(s.id);
      flash(`${s.name.split(' ')[0]} removed · the PIN no longer works`);
      retry();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'That staff member could not be removed. Nothing has been changed.', 'warn');
    } finally {
      setRemoving(false);
    }
  };

  if (state === 'loading') return <Screen><Skeleton lines={4} /></Screen>;
  if (state === 'error') {
    return (
      <Screen>
        <ErrorState onRetry={retry}
          message={error ?? 'The staff list could not be loaded. Nothing has been changed.'} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Muted style={{ marginBottom: SPACE.lg }}>
        {`${staff.length} people · ${needAccess} still need access`}
        {asked > 0 ? ` · ${asked} asked for a new PIN` : ''}
      </Muted>

      {staff.length === 0 && (
        <EmptyState
          title="No staff yet"
          body="Add the people who will use RosiFit. A record comes first; access is granted deliberately afterwards."
          action="Add staff" onAction={() => router.push('/staff/add')} />
      )}

      {people.map(s => {
        const meta = STAFF_ACCESS[s.access];
        const tone = STATUS[ACCESS_TONE[s.access]];
        const ink = theme.isDark ? tone.fgDark : tone.fgLight;
        const box = statusSurface(ink);
        return (
          <View key={s.id} style={{
            backgroundColor: theme.surface, borderRadius: RADIUS.lg, borderWidth: 1,
            borderColor: theme.line, padding: SPACE.lg, marginBottom: SPACE.md,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: AVATAR_TINTS[people.indexOf(s) % AVATAR_TINTS.length],
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>{initials(s.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.fgStrong }}>{s.name}</Text>
                <Text style={{ fontSize: 12.5, color: theme.muted, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                  {`${s.role} · ${maskPhone(s.phone)}`}
                </Text>
              </View>
              {/* The D the roster has had since 0038, on the list where a
                  person who has left the academy is actually noticed. Beside
                  the name rather than beside the access action, so "remove
                  her" is never one row away from "give her a PIN". */}
              {identity?.id !== s.id ? (
                <Pressable testID={`staff-remove-${s.id}`}
                  onPress={() => setConfirmRemove(s)}
                  accessibilityRole="button" accessibilityLabel={`Remove ${s.name}`}
                  style={({ pressed }) => ({
                    width: 40, height: 40, borderRadius: 12,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: theme.control, borderWidth: 1, borderColor: theme.line,
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Icon name="delete" size={18}
                    color={theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight} />
                </Pressable>
              ) : null}
            </View>

            {/* the state carries its own word AND its own icon, so neither the
                colour nor the glyph is doing the work alone */}
            <View style={{
              alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
              marginTop: SPACE.md, paddingHorizontal: 10, paddingVertical: 5,
              borderRadius: RADIUS.pill, backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
            }}>
              <Icon name={meta.icon} size={14} color={ink} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: ink, letterSpacing: 0.3 }}>{meta.word}</Text>
            </View>

            {/* Its own word AND its own icon, like every other state here --
                the tint reinforces it and never carries it alone. */}
            {s.pinResetRequested ? (
              <View testID={`staff-pin-requested-${s.id}`} style={{
                alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
                marginTop: SPACE.sm, paddingHorizontal: 10, paddingVertical: 5,
                borderRadius: RADIUS.pill,
                backgroundColor: statusSurface(askedInk).bg,
                borderWidth: 1, borderColor: statusSurface(askedInk).border,
              }}>
                <Icon name="lock_reset" size={14} color={askedInk} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: askedInk, letterSpacing: 0.3 }}>
                  Requested a PIN reset
                </Text>
              </View>
            ) : null}

            <Muted style={{ marginTop: SPACE.sm }}>{s.meta}</Muted>

            <Button
              label={meta.action}
              variant={meta.primary ? 'primary' : 'secondary'}
              onPress={() => void act(s)}
              style={{ marginTop: SPACE.md }} />
          </View>
        );
      })}

      {/* Add staff used to sit HERE, below every card, so on an academy with
          a dozen people it was a scroll away from the screen that owns it.
          It is the action this screen owns, so it is now in the title row's
          right-hand slot -- the same place Members keeps Add. */}

      {/* the canvas closes this list by saying why there is no "show PIN" */}
      <View style={{
        marginTop: SPACE.lg, padding: 15, borderRadius: RADIUS.md,
        flexDirection: 'row', gap: 11,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <Icon name="lock_reset" size={19} color={theme.isDark ? STATUS.holiday.fgDark : STATUS.holiday.fgLight} />
        <Muted style={{ flex: 1 }}>
          A PIN is shown once, on this device, when you create it. Nobody can read it back later —
          you reset it instead.
        </Muted>
      </View>

      <Sheet open={!!target} onClose={() => setTarget(null)}
        title={target
          ? (target.access === 'active' ? `Reset ${target.name}’s PIN?` : `Generate a PIN for ${target.name}?`)
          : ''}>
        <Muted style={{ marginTop: 9 }}>
          The current PIN stops working straight away. The new one is shown once, on the next screen.
        </Muted>

        <Pressable onPress={() => setSignOutEverywhere(v => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: signOutEverywhere }}
          accessibilityLabel="Also sign them out everywhere"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.lg,
            padding: 14, borderRadius: RADIUS.lg, backgroundColor: theme.surface2,
            borderWidth: 1, borderColor: theme.line, minHeight: TAP_MIN,
          }}>
          <View style={{
            width: 22, height: 22, borderRadius: 7,
            backgroundColor: signOutEverywhere ? theme.accent : 'transparent',
            borderWidth: 1.5, borderColor: signOutEverywhere ? theme.accent : theme.lineStrong,
            alignItems: 'center', justifyContent: 'center',
          }}>
            {signOutEverywhere ? <Icon name="check" size={14} color={theme.onAccent} /> : null}
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: theme.fg }}>
            Also sign them out everywhere
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.lg }}>
          <Button label="Cancel" variant="secondary" onPress={() => setTarget(null)} style={{ flex: 1 }} />
          <Button label={busy ? 'Generating…' : 'Generate PIN'} onPress={() => void confirm()}
            disabled={busy} style={{ flex: 1 }} />
        </View>
      </Sheet>

      {/* It states what the removal DOES, including the half of it that is
          not a removal: her history stays. A dialog that said "delete her"
          and left her name on every register she took would be describing a
          different act from the one it performs. */}
      <ConfirmDialog
        open={confirmRemove !== null}
        onClose={() => setConfirmRemove(null)}
        title={confirmRemove ? `Remove ${confirmRemove.name}?` : ''}
        body={confirmRemove
          ? `They leave this list and their PIN stops working straight away — it cannot be given back, only replaced by adding them again. The registers they took and the changes they made stay in the records, still in their name. Their mobile number is freed for whoever replaces them.`
          : ''}
        cancelLabel="Cancel"
        confirmLabel={removing ? 'Removing…' : 'Remove'}
        onConfirm={() => { if (confirmRemove) void remove(confirmRemove); }} />
    </Screen>
  );
}

/**
 * Under the shell, not instead of it. This screen is pushed on the root
 * stack, so it is not one of the tab navigator's own and wore no academy
 * header and no Home · Reports · More pill until ShellScreen drew them.
 */
export default function StaffList() {
  const router = useRouter();
  return (
    <ShellScreen title="Staff & access" subtitle="Who can sign in, and what each of them may do"
      onBack={() => router.back()}
      right={<Button label="Add staff" testID="staff-add"
        onPress={() => router.push('/staff/add')} />}>
      <StaffListBody />
    </ShellScreen>
  );
}
