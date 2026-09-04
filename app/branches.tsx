import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Label, Button, Skeleton, EmptyState, ErrorState } from '../src/components/ui';
import { ScreenHeader, ShellScreen } from '../src/components/AppShell';
import { Field } from '../src/components/Field';
import { Icon } from '../src/components/Icon';
import { ConfirmDialog } from '../src/components/Sheet';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../src/theme/tokens';
import { useBranchUsage } from '../src/data/hooks';
import { useIdentity } from '../src/data/session';
import { createBranch, removeBranch, dataSource, type BranchUsage } from '../src/data/repository';

/**
 * The canvas' BRANCHES section.
 *
 * WHAT WAS WRONG HERE
 * More carried a "Branches" row whose whole behaviour was
 * `flash(BRANCHES.join(' · '))` -- a tap that named the branches and went
 * nowhere. There was no way to add one, no way to see what ran at one, and no
 * way to remove one, in an app whose Overview filter, holiday scope and every
 * course form are all addressed BY branch. Adding a branch meant a hand-written
 * INSERT against the live project.
 *
 * WHY A COUNT SITS ON EVERY ROW
 * The delete on each row is refused when the branch still runs something, and
 * a refusal a person could not have predicted is a worse control than no
 * control. The row states the count the guard reads, so the tap that will be
 * refused looks refusable before it is made. 0019 is what enforces it -- this
 * screen only says so first.
 */
function BranchesBody() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();

  const branches = useBranchUsage(forced);
  const { identity } = useIdentity();

  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<BranchUsage | null>(null);

  const list = branches.data ?? [];
  const name = draft.trim();

  // The duplicate is caught here AND by branches_name_live (0019). Stating it
  // while she types is the difference between a correction and a rejection.
  const duplicate = list.some(b => b.name.toLowerCase() === name.toLowerCase());
  const tooShort = name.length > 0 && name.length < 2;
  const valid = name.length >= 2 && !duplicate;

  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;
  const warnInk = theme.isDark ? STATUS.awaiting.fgDark : STATUS.awaiting.fgLight;

  const add = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setFailure(null);
    try {
      await createBranch(name);
      // The list refetches off the write itself (onBranchesChanged), so the
      // branch appears because the row exists -- not because this screen
      // said so.
      setDraft('');
      flash(dataSource === 'live'
        ? `${name} added · available in every course form`
        : `${name} added on this device only — the academy database is not configured`,
        dataSource === 'live' ? 'ok' : 'warn');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'The branch could not be added. Nothing has been changed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (branch: BranchUsage) => {
    setConfirmRemove(null);
    setFailure(null);
    try {
      await removeBranch(branch.id, branch.name);
      flash(dataSource === 'live'
        ? `${branch.name} removed`
        : `${branch.name} removed on this device only — the academy database is not configured`,
        dataSource === 'live' ? 'ok' : 'warn');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'The branch could not be removed. Nothing has been changed.');
    }
  };

  const summary = branches.state === 'ready'
    ? `${list.length} ${list.length === 1 ? 'branch' : 'branches'}`
    : undefined;

  return (
    <Screen>
      <ScreenHeader title="Branches" subtitle={summary} onBack={() => router.back()} />

      {/* Staff can READ the branch list -- branches_read is
          is_active_app_user() -- and seeing where the academy runs is part of
          the job. Only the write half is withheld, and it is withheld by
          saying so rather than by showing a control that answers with an
          error. */}
      {identity && !identity.isSuperAdmin ? (
        <View style={{
          flexDirection: 'row', gap: SPACE.md, padding: SPACE.lg, marginBottom: SPACE.lg,
          borderRadius: RADIUS.lg, backgroundColor: theme.surface2,
          borderWidth: 1, borderColor: theme.line,
        }}>
          <Icon name="lock" size={19} color={theme.muted} />
          <Muted style={{ flex: 1 }}>
            Only the super admin can add or remove a branch. The list is here so you can see where
            the academy runs.
          </Muted>
        </View>
      ) : (
        <>
          <Field label="New branch name" value={draft} onChange={setDraft}
            placeholder="e.g. Salem"
            error={duplicate ? `${name} already exists.`
              : tooShort ? 'A little longer, please.' : undefined}
            hint="Type the city or locality, as members will see it." />

          <Button testID="branch-add" label={saving ? 'Adding…' : 'Add branch'}
            onPress={add} disabled={!valid || saving} />
        </>
      )}

      {/* A refused write is shown rather than flashed away: the branch is NOT
          saved and the person has to be able to read why. */}
      {failure ? (
        <View style={{ marginTop: SPACE.lg }}>
          <ErrorState message={failure} onRetry={() => setFailure(null)} />
        </View>
      ) : null}

      <Label style={{ marginTop: SPACE.xxl, marginBottom: SPACE.md }}>Branches</Label>

      {branches.state === 'loading' ? (
        <Skeleton lines={3} />
      ) : branches.state === 'error' ? (
        <ErrorState onRetry={branches.retry}
          message={branches.error ?? 'The branch list could not be loaded. Nothing has been changed.'} />
      ) : list.length === 0 ? (
        <EmptyState
          title="No branches yet"
          body="A branch is where a course actually runs. Add one above and it appears in the Overview filter and in every course form." />
      ) : (
        <View style={{ gap: SPACE.sm }}>
          {list.map(b => {
            // The same two counts 0019 reads. `inUse` is why the delete looks
            // unavailable before it is pressed.
            const inUse = b.courses > 0;
            const meta = `${b.courses} ${b.courses === 1 ? 'course' : 'courses'} · ${b.members} ${b.members === 1 ? 'member' : 'members'}`;
            return (
              <View key={b.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                padding: SPACE.md, borderRadius: RADIUS.md,
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
              }}>
                <View style={{
                  width: 38, height: 38, borderRadius: 12,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: theme.control,
                }}>
                  <Icon name="apartment" size={18} color={theme.accentInk} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>
                    {b.name}
                  </Text>
                  <Text numberOfLines={1} style={{
                    fontSize: 11.5, color: theme.muted, marginTop: 2, fontVariant: ['tabular-nums'],
                  }}>{meta}</Text>
                </View>

                {identity?.isSuperAdmin ? (
                  <Pressable testID={`branch-remove-${b.id}`}
                    onPress={() => (inUse
                      ? flash(`${b.name} has ${b.courses} ${b.courses === 1 ? 'course' : 'courses'} — move them first`, 'warn')
                      : setConfirmRemove(b))}
                    accessibilityRole="button"
                    // The label says WHY it will refuse, because the visual
                    // difference between the two states is colour alone.
                    accessibilityLabel={inUse
                      ? `Remove ${b.name}. Not available — ${b.courses} ${b.courses === 1 ? 'course runs' : 'courses run'} here`
                      : `Remove ${b.name}, which runs no courses`}
                    accessibilityState={{ disabled: inUse }}
                    style={({ pressed }) => ({
                      width: 38, height: 38, borderRadius: 11,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: theme.control,
                      borderWidth: 1, borderColor: theme.line,
                      opacity: pressed ? 0.7 : 1,
                    })}>
                    <Icon name={inUse ? 'lock' : 'delete'} size={18}
                      color={inUse ? theme.dim : dangerInk} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <View style={{
        marginTop: SPACE.lg, padding: SPACE.lg, borderRadius: RADIUS.lg,
        flexDirection: 'row', gap: SPACE.md,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <Icon name="info" size={19} color={warnInk} />
        <Muted style={{ flex: 1 }}>
          A branch appears in the Overview filter and in every course form as soon as you add it.
          A branch with courses cannot be removed, and neither can one a holiday is scoped to.
        </Muted>
      </View>

      {/* Removing a branch hides it from every filter in the app, so the
          dialog states that consequence rather than asking "are you sure?"
          about a name. */}
      <ConfirmDialog
        open={confirmRemove !== null}
        onClose={() => setConfirmRemove(null)}
        title={confirmRemove ? `Remove ${confirmRemove.name}?` : ''}
        body={confirmRemove
          ? `${confirmRemove.name} runs no courses, so no session and no attendance changes. It stops appearing in the Overview filter, the holiday scope and every course form. Past sessions still name it, and the removal is recorded in the audit log.`
          : ''}
        cancelLabel="Keep it"
        confirmLabel="Remove branch"
        onConfirm={() => { if (confirmRemove) void remove(confirmRemove); }} />
    </Screen>
  );
}

/**
 * Under the shell, not instead of it. This screen is pushed on the root
 * stack, so it is not one of the tab navigator's own and wore no academy
 * header and no Home · Reports · More pill until ShellScreen drew them.
 */
export default function Branches() {
  return <ShellScreen><BranchesBody /></ShellScreen>;
}
