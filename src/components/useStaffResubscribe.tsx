import { useState } from 'react';
import { staffResubscribeEmail } from '../data/repository';
import {
  resubscribableAddresses, resubscribeOutcomeMessage, type ResubscribeSource,
} from '../data/staffResubscribe';
import type { EmailStatus } from '../data/emailStatus';
import { useToast } from './Toast';
import { StaffResubscribeDialog, type ResubscribeChoice } from './StaffResubscribeDialog';

type Address = { address: string; status?: EmailStatus; id?: string };

/**
 * THE ONE STAFF RESUBSCRIBE FLOW, for every screen that offers it
 * (requests/2026-10-01-staff-resubscribe-everywhere.md): the Reach Out pop-up,
 * the send draft and Attendance call `open`, render `dialog`, and get the same
 * confirmation, the same required source, the same RPC
 * (`staff_resubscribe_member_email`, 0084, through `staffResubscribeEmail`)
 * and the same words afterwards. Nothing here decides who may: the database
 * does, and its refusal is shown inside the dialog.
 *
 * The member list refreshes itself -- `staffResubscribeEmail` announces a
 * member change -- so the action disappears from every screen once the
 * address is back on.
 */
export function useStaffResubscribe(opts?: { onResubscribed?: (memberEmailId: string) => void }) {
  const { flash } = useToast();
  const [target, setTarget] = useState<{ memberName: string; choices: ResubscribeChoice[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  /** Whether this member has an address the action may be offered for. */
  const offers = (emails: readonly Address[]): boolean => resubscribableAddresses(emails).length > 0;

  function open(memberName: string, emails: readonly Address[]) {
    const choices = resubscribableAddresses(emails).map(e => ({ id: e.id!, address: e.address }));
    if (choices.length === 0) return;
    setRefusal(null);
    setTarget({ memberName, choices });
  }

  async function confirm(memberEmailId: string, source: ResubscribeSource, note: string) {
    setSaving(true);
    setRefusal(null);
    try {
      const result = await staffResubscribeEmail(memberEmailId, source, note);
      flash(resubscribeOutcomeMessage(result));
      opts?.onResubscribed?.(memberEmailId);
      setTarget(null);
    } catch (err) {
      setRefusal(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const dialog = (
    <StaffResubscribeDialog open={!!target} memberName={target?.memberName}
      choices={target?.choices ?? []} saving={saving} refusal={refusal}
      onClose={() => { if (!saving) setTarget(null); }}
      onConfirm={(id, source, note) => void confirm(id, source, note)} />
  );

  return { open, offers, dialog };
}
