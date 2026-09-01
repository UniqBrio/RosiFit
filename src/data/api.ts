/**
 * The Edge Functions, typed. Every write that touches the engine or a
 * credential goes through one of these — `authenticated` holds no write
 * grants on those tables, so there is no second path a screen could take.
 *
 * A failure here is shown to the person, never swallowed: each function
 * answers with { error: { message } } written for an operator, and
 * callFn turns that into a thrown Error carrying that same sentence.
 */
import { supabase } from '../lib/supabase';

async function callFn<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // supabase-js keeps the response on FunctionsHttpError; the function's
    // own message is far more useful than "Edge Function returned 400".
    const res = (error as { context?: Response }).context;
    if (res && typeof res.json === 'function') {
      try {
        const payload = await res.json();
        if (payload?.error?.message) throw new Error(payload.error.message);
      } catch (parsed) {
        if (parsed instanceof Error && parsed.message) throw parsed;
      }
    }
    throw new Error(error.message ?? 'Something went wrong. Please try again.');
  }
  const payload = data as { error?: { message?: string } } | null;
  if (payload && payload.error?.message) throw new Error(payload.error.message);
  return data as T;
}

// -------------------------------------------------------------------- auth
export type SignedIn = {
  session: { access_token: string; refresh_token: string } | null;
  user: { id: string; name?: string; kind?: string; role_label?: string; must_change_pin?: boolean };
};

export function authLogin(phone: string, pin: string): Promise<SignedIn> {
  return callFn<SignedIn>('auth-login', { phone, pin });
}

export function authBootstrap(input: {
  name: string; phone: string; pin: string;
  answers: { question_id: number; answer: string }[];
}): Promise<SignedIn> {
  return callFn<SignedIn>('auth-bootstrap', input);
}

/** After either call the client must adopt the returned session, or the
 *  next request still goes out anonymous. */
export async function adoptSession(result: SignedIn): Promise<void> {
  if (!result.session) return;
  await supabase.auth.setSession({
    access_token: result.session.access_token,
    refresh_token: result.session.refresh_token,
  });
}

// --------------------------------------------------------------------- PIN
export type IssuedPin = { app_user_id: string; phone_e164?: string; pin: string };

export function pinIssue(input: {
  app_user_id?: string; name?: string; phone?: string; role_label?: string; reactivate?: boolean;
}): Promise<IssuedPin> {
  return callFn<IssuedPin>('pin-issue', input);
}

export function pinReset(appUserId: string, signOutEverywhere = false):
  Promise<IssuedPin & { signed_out_everywhere: boolean }> {
  return callFn('pin-reset', { app_user_id: appUserId, sign_out_everywhere: signOutEverywhere });
}

// ---------------------------------------------------------------- recovery
export function recoveryVerify(phone: string, answers: { question_id: number; answer: string }[]):
  Promise<{ ok: true; recovery_token: string }> {
  return callFn('recovery-check', { action: 'verify', phone, answers });
}

export function recoveryApply(recoveryToken: string, newPin: string): Promise<SignedIn> {
  return callFn<SignedIn>('recovery-check', { action: 'apply', recovery_token: recoveryToken, new_pin: newPin });
}

// -------------------------------------------------------------- csv import
export type MatchKindLive = 'matched' | 'noEmail' | 'possible' | 'ambiguous' | 'unmatched';
export type PreviewRow = {
  row: number; kind: MatchKindLive; raw_name: string;
  first_seen: string | null; minutes: number;
  candidates: { member_id: string; full_name: string; member_code: string; has_email: boolean }[];
};
export type PreviewResult = {
  import_id: string; rows: PreviewRow[]; dropped_count: number;
  counts: Record<MatchKindLive, number>;
};

export function csvPreview(input: {
  offering_id: string; session_date: string; file_name: string; file_sha256: string;
  rows: { full_name: string; first_seen?: string; minutes_in_call: number }[];
}): Promise<PreviewResult> {
  return callFn<PreviewResult>('csv-import', { action: 'preview', ...input });
}

export type ImportDecision = {
  row: number;
  action: 'use_existing' | 'select_member' | 'link_existing' | 'add_as_new'
        | 'keep_unmatched' | 'skip' | 'not_a_member' | 'add_email' | 'continue_without_email';
  member_id?: string; email?: string;
  remember_alias?: boolean; confirm_different_person?: boolean;
};

export function csvCommit(importId: string, decisions: ImportDecision[]):
  Promise<{ session_id: string; new_members: number; skipped: number; present_or_extra: number }> {
  return callFn('csv-import', { action: 'commit', import_id: importId, decisions });
}

// ------------------------------------------------------------------- send
export type SendResult = {
  batch_id: string; requested: number; sent: number; failed: number; excluded: number;
  results: { member_id: string; name: string; status: 'sent' | 'failed' | 'excluded'; reason?: string }[];
};

/** Template only. There is no subject or body parameter here, and adding one
 *  would be the API half of the free-form compose that C-68 removed. */
export function sendFollowUps(input: {
  member_ids: string[]; template_id: string; period_from: string; period_to: string;
  client_batch_id?: string;
}): Promise<SendResult> {
  return callFn<SendResult>('send-followups', input);
}
