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

/**
 * Whether a mobile number already has an account -- asked by Continue on the
 * sign-in screen, before any PIN is entered. One boolean, no identity.
 *
 * This is a public, unauthenticated lookup and therefore an enumeration
 * oracle by construction; see the header of supabase/functions/auth-lookup
 * and docs/decisions/008 for why it exists and who accepted it.
 *
 * A failure MUST NOT be read as "no account" -- callers pass null to
 * continueDestination instead.
 */
export function authLookup(phone: string): Promise<{ registered: boolean }> {
  return callFn<{ registered: boolean }>('auth-lookup', { phone });
}

export function authBootstrap(input: {
  name: string; phone: string; pin: string;
  answers: { question_id: number; answer: string }[];
}): Promise<SignedIn> {
  return callFn<SignedIn>('auth-bootstrap', input);
}

export type SecurityQuestion = { id: number; text: string };

/** The question list for registration. It comes from the function, not a
 *  client-side copy, because security_questions is readable only by the
 *  super admin -- the account being created. */
export function fetchSecurityQuestions():
  Promise<{ questions: SecurityQuestion[]; bootstrap_completed: boolean }> {
  return callFn('auth-bootstrap', { action: 'questions' });
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

/** Turn access back on WITHOUT issuing a PIN — a re-enabled account goes
 *  back to "needs a PIN", which is what the staff list then offers. */
export function staffReenable(appUserId: string): Promise<{ app_user_id: string; reactivated: true }> {
  return callFn('pin-issue', { app_user_id: appUserId, reactivate_only: true });
}

/** Add the person, grant nothing. She appears as "Not enabled" until a PIN
 *  is issued from the staff list — a separate, deliberate step. */
export function staffCreate(input: { name: string; phone: string; role_label: string }):
  Promise<{ app_user_id: string; access: 'not_enabled' }> {
  return callFn('pin-issue', { ...input, create_only: true });
}

/** Admin path: the server generates the PIN for somebody else and returns it
 *  once. Super admin only. */
export function pinReset(appUserId: string, signOutEverywhere = false):
  Promise<IssuedPin & { signed_out_everywhere: boolean }> {
  return callFn('pin-reset', { app_user_id: appUserId, sign_out_everywhere: signOutEverywhere });
}

/** Self path: she chooses her own four digits, so nothing comes back but the
 *  confirmation — the PIN is not echoed anywhere. */
export function changeOwnPin(newPin: string, signOutEverywhere = false):
  Promise<{ app_user_id: string; signed_out_everywhere: boolean }> {
  return callFn('pin-reset', { new_pin: newPin, sign_out_everywhere: signOutEverywhere });
}

// ---------------------------------------------------------------- recovery
/** The two questions THIS account registered, so the screen asks hers rather
 *  than a guess. Says which questions, never an answer. */
export function recoveryQuestions(phone: string): Promise<{ questions: SecurityQuestion[] }> {
  return callFn('recovery-check', { action: 'questions', phone });
}

export function recoveryVerify(phone: string, answers: { question_id: number; answer: string }[]):
  Promise<{ ok: true; recovery_token: string }> {
  return callFn('recovery-check', { action: 'verify', phone, answers });
}

export function recoveryApply(recoveryToken: string, newPin: string): Promise<SignedIn> {
  return callFn<SignedIn>('recovery-check', { action: 'apply', recovery_token: recoveryToken, new_pin: newPin });
}

// -------------------------------------------------------------- csv import
export type MatchKindLive = 'matched' | 'noEmail' | 'possible' | 'ambiguous' | 'unmatched';
export type PreviewCandidate = {
  member_id: string; full_name: string; has_email: boolean;
  /** her primary address, or '' when she has none — what tells two
   *  same-named candidates apart now that the member code is gone */
  primary_email: string;
  course_name: string; branch_name: string; aliases: string[];
  last_present_date: string | null;
  /** why this candidate is offered, in one line, and how sure it is */
  hint: string; hint_tone: 'sure' | 'unsure';
};
export type PreviewRow = {
  row: number; kind: MatchKindLive; raw_name: string;
  first_seen: string | null; minutes: number;
  candidates: PreviewCandidate[];
};
export type PreviewResult = {
  import_id: string; rows: PreviewRow[]; dropped_count: number;
  /** the repeated or blank names, NAMED -- a count alone has to be taken on trust */
  dropped_names?: string[];
  counts: Record<MatchKindLive, number>;
  /** the meeting the file names, echoed back so the screen can show it */
  meeting_code?: string | null;
  /** the date derived FROM THE FILE, not chosen from a list */
  session_date?: string;
  /** a completed import already covers this day: this file will update it */
  supersedes?: { file_name: string; completed_at: string } | null;
};

export function csvPreview(input: {
  offering_id: string; session_date: string; file_name: string; file_sha256: string;
  /** the meeting code and created timestamp the file carries, when it has them */
  meeting_code?: string | null;
  meeting_started_at?: string | null;
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
