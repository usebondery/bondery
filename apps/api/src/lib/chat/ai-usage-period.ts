/**
 * The AI usage period for a new account.
 *
 * Every plan now has a monthly allowance, so a new account needs a live window
 * from the first day. An expired window reports no usage and no reset date,
 * which would leave the first screen without a date until the first message.
 */

/** Calendar months in one usage period. */
const MONTHS_PER_PERIOD = 1;

/**
 * End of the first usage period: one month from now.
 *
 * Uses `setUTCMonth` so a month keeps its day. A flat 30 days drifts away from
 * the calendar date the account opened and from the Stripe period it later joins.
 */
export function firstAiUsagePeriodEnd(now: Date = new Date()): Date {
  const periodEnd = new Date(now.getTime());
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + MONTHS_PER_PERIOD);
  return periodEnd;
}
