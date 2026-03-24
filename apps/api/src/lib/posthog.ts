/**
 * PostHog Query API helper.
 *
 * Provides typed wrappers around PostHog's HogQL query endpoint
 * for KPI metrics (DAU/WAU/MAU, NPS).
 *
 * NOTE: No response caching here — the Next.js data cache handles that.
 */

/** Shape returned by the PostHog HogQL query endpoint. */
interface PostHogQueryResponse {
  results: unknown[][];
  columns: string[];
}

/**
 * Executes a HogQL query against the PostHog Query API.
 *
 * @param apiSecret - PostHog personal/project API key (ph_...)
 * @param projectId - PostHog project ID
 * @param query - HogQL query string
 * @returns Parsed query response
 */
async function runHogQLQuery(
  apiSecret: string,
  projectId: string,
  query: string,
): Promise<PostHogQueryResponse> {
  const url = `https://eu.i.posthog.com/api/projects/${encodeURIComponent(projectId)}/query`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog query failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<PostHogQueryResponse>;
}

export interface ActiveUsersTimelinePoint {
  date: string;
  dau: number;
  wau: number;
  mau: number;
}

/**
 * Fetches a DAU/WAU/MAU timeline from PostHog using HogQL.
 *
 * Returns one point per day for the last `days` days. For each day the
 * rolling 7-day (WAU) and 30-day (MAU) unique counts are computed from
 * per-user-per-day presence data.
 *
 * @param days - Number of days on the timeline (default 30).
 */
export async function getActiveUsersTimeline(
  apiSecret: string,
  projectId: string,
  days = 30,
): Promise<ActiveUsersTimelinePoint[]> {
  // We need `days + 29` extra days to compute a 30-day rolling window for
  // the first point on the timeline.
  const lookback = days + 29;

  // Use person_id (merged identity) and filter to identified users to avoid
  // inflated counts from anonymous distinct_id values.
  const query = `
    SELECT DISTINCT
      person_id,
      toDate(timestamp) AS day
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - INTERVAL ${lookback} DAY
      AND person_id IS NOT NULL
      AND person.properties.email IS NOT NULL
  `;

  const result = await runHogQLQuery(apiSecret, projectId, query);

  // Build a map: day string → set of user ids
  const dayUsers = new Map<string, Set<string>>();
  for (const row of result.results) {
    const userId = String(row[0]);
    const day = String(row[1]).slice(0, 10);
    if (!dayUsers.has(day)) dayUsers.set(day, new Set());
    dayUsers.get(day)!.add(userId);
  }

  // Compute timeline points for the last `days` days
  const timeline: ActiveUsersTimelinePoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    // DAU: unique users on this specific day
    const dau = dayUsers.get(dateStr)?.size ?? 0;

    // WAU: unique users in [date-6, date]
    const wauUsers = new Set<string>();
    for (let w = 6; w >= 0; w--) {
      const wd = new Date(d);
      wd.setDate(wd.getDate() - w);
      const wdStr = wd.toISOString().slice(0, 10);
      dayUsers.get(wdStr)?.forEach((u) => wauUsers.add(u));
    }

    // MAU: unique users in [date-29, date]
    const mauUsers = new Set<string>();
    for (let m = 29; m >= 0; m--) {
      const md = new Date(d);
      md.setDate(md.getDate() - m);
      const mdStr = md.toISOString().slice(0, 10);
      dayUsers.get(mdStr)?.forEach((u) => mauUsers.add(u));
    }

    timeline.push({
      date: dateStr,
      dau,
      wau: wauUsers.size,
      mau: mauUsers.size,
    });
  }

  return timeline;
}

export interface NpsResult {
  score: number | null;
  responses: number;
  promoters: number;
  passives: number;
  detractors: number;
}

/**
 * Fetches NPS survey results from PostHog (last 90 days).
 * Expects a survey event with a numeric rating property.
 */
export async function getNpsResults(apiSecret: string, projectId: string): Promise<NpsResult> {
  const query = `
    SELECT
      properties.$survey_response AS rating
    FROM events
    WHERE event = 'survey sent'
      AND timestamp >= now() - INTERVAL 90 DAY
      AND properties.$survey_response IS NOT NULL
  `;

  const result = await runHogQLQuery(apiSecret, projectId, query);

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  for (const row of result.results) {
    const rating = Number(row[0]);
    if (Number.isNaN(rating)) continue;
    if (rating >= 9) promoters++;
    else if (rating >= 7) passives++;
    else detractors++;
  }

  const total = promoters + passives + detractors;
  const score = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : null;

  return { score, responses: total, promoters, passives, detractors };
}
