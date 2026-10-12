/**
 * The academy's subscription, as the More > Subscription screen reads it.
 *
 * READ-ONLY, by construction. `authenticated` holds SELECT on app_subscription
 * and nothing else (0002, 0015); the row is changed only by a migration or the
 * service role. So this file derives words and numbers from the row and offers
 * no way to change it.
 *
 * The STATE is the database's, never this file's: `subscription_state()`
 * (0002, 0090) is what every write gate asks, so the screen shows that answer
 * rather than re-deriving one that could disagree with it on the last day.
 */
import { parseISO } from './period';

export type SubscriptionState = 'active' | 'grace' | 'expired' | 'suspended';

export type Subscription = {
  customer: string;
  plan: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD -- the last day of the paid term, and the next renewal date */
  endDate: string;
  graceDays: number;
  state: SubscriptionState;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2027-09-24' -> '24 Sep 2027'; '—' when the date is missing. */
export function longDate(value: string | null): string {
  const d = parseISO(value ?? '');
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '—';
}

/** Whole calendar days from `todayIso` to `endIso`; negative once past. */
export function daysUntil(endIso: string, todayIso: string): number {
  const end = parseISO(endIso);
  const today = parseISO(todayIso);
  if (!end || !today) return 0;
  // UTC of both, so a daylight-saving device cannot make a day 23 hours long.
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(end) - utc(today)) / 86_400_000);
}

/** The day writes stop: the end date plus the grace days. */
export function lastGraceDay(endIso: string, graceDays: number): string {
  const end = parseISO(endIso);
  if (!end) return endIso;
  end.setDate(end.getDate() + graceDays);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
}

/** The word on the status chip. Colour is never the only signal (guardrail 3). */
export const STATE_WORD: Record<SubscriptionState, string> = {
  active: 'Active',
  grace: 'In grace period',
  expired: 'Expired',
  suspended: 'Suspended',
};

/** One sentence under the dates: what this state means for the academy. */
export function stateSentence(s: Subscription, todayIso: string): string {
  const left = daysUntil(s.endDate, todayIso);
  const graceEnd = longDate(lastGraceDay(s.endDate, s.graceDays));
  switch (s.state) {
    case 'active':
      return left === 0
        ? 'The subscription ends today. Renew it to keep everything working.'
        : `${left} ${left === 1 ? 'day' : 'days'} left until the next renewal.`;
    case 'grace':
      return `The subscription has ended. Everything keeps working until ${graceEnd}; after that the app becomes read-only.`;
    case 'expired':
      return 'The subscription has ended. You can still see every record, but nothing can be added or changed until it is renewed.';
    case 'suspended':
      return 'The subscription is suspended. You can still see every record, but nothing can be added or changed.';
  }
}
