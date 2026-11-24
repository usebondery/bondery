import { prisma } from "@bondery/db";
import type { ReminderDigestRequest, ReminderDigestResponse } from "@bondery/schemas";
import { sendReminderDigest } from "./reminder-digest.js";

type DigestPayloadRow = {
  payload: ReminderDigestRequest | null;
  user_count: number;
  due_user_count: number;
};

/**
 * Builds the hourly reminder digest payload and dispatches emails.
 * Replaces `send_hourly_reminder_digests()` + pg_net HTTP round-trip.
 */
export async function runReminderDigestDispatch(): Promise<
  ReminderDigestResponse & {
    scheduledUsers?: number;
    message?: string;
  }
> {
  const rows = await prisma.$queryRaw<DigestPayloadRow[]>`
    WITH run_started_at AS (
      SELECT now() AS ts
    ),
    due_users AS (
      SELECT
        us.user_id,
        u.email AS user_email,
        COALESCE(tz.name, 'UTC') AS effective_timezone,
        timezone(COALESCE(tz.name, 'UTC'), (SELECT ts FROM run_started_at))::date AS local_date
      FROM user_settings us
      INNER JOIN "user" u ON u.id = us.user_id
      LEFT JOIN pg_timezone_names tz ON tz.name = us.timezone
      WHERE u.email IS NOT NULL
        AND us.next_reminder_at_utc <= (SELECT ts FROM run_started_at)
    ),
    due_events AS (
      SELECT
        e.user_id,
        du.user_email,
        du.effective_timezone,
        du.local_date,
        e.person_id,
        p.first_name,
        p.last_name,
        e.type,
        e.date,
        e.note,
        e.notify_days_before,
        e.notify_on
      FROM due_users du
      INNER JOIN people_important_dates e ON e.user_id = du.user_id
      INNER JOIN people p ON p.id = e.person_id AND p.user_id = e.user_id
      WHERE e.notify_days_before IS NOT NULL
        AND e.notify_on = du.local_date
        AND NOT EXISTS (
          SELECT 1
          FROM reminder_dispatch_log log
          WHERE log.user_id = e.user_id
            AND log.reminder_date = du.local_date
        )
    ),
    grouped_by_user AS (
      SELECT
        user_id,
        user_email,
        effective_timezone,
        local_date,
        jsonb_agg(
          jsonb_build_object(
            'personId', person_id,
            'personName', trim(concat_ws(' ', first_name, last_name)),
            'type', type,
            'date', date,
            'notifyOn', notify_on,
            'notifyDaysBefore', notify_days_before,
            'note', note
          )
          ORDER BY date, person_id
        ) AS reminders
      FROM due_events
      GROUP BY user_id, user_email, effective_timezone, local_date
    ),
    due_user_counts AS (
      SELECT COUNT(*)::integer AS total_due_users FROM due_users
    )
    SELECT
      jsonb_build_object(
        'targetDate', ((SELECT ts FROM run_started_at) AT TIME ZONE 'UTC')::date::text,
        'users', COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'userId', user_id,
              'email', user_email,
              'timezone', effective_timezone,
              'targetDate', local_date::text,
              'reminders', reminders
            )
            ORDER BY user_id
          ),
          '[]'::jsonb
        )
      ) AS payload,
      COUNT(*)::integer AS user_count,
      COALESCE(MAX(duc.total_due_users), 0) AS due_user_count
    FROM grouped_by_user gbu
    FULL JOIN due_user_counts duc ON true
  `;

  const [row] = rows;
  if (!row) {
    return {
      failedUsers: 0,
      sentUsers: 0,
      success: true,
      targetDate: new Date().toISOString().slice(0, 10),
    };
  }

  if (row.due_user_count === 0) {
    return {
      failedUsers: 0,
      message: "No users due for current hourly window",
      scheduledUsers: 0,
      sentUsers: 0,
      success: true,
      targetDate: new Date().toISOString().slice(0, 10),
    };
  }

  if (row.user_count === 0 || !row.payload) {
    await prisma.$executeRaw`
      UPDATE user_settings us
      SET next_reminder_at_utc = compute_next_reminder_at_utc(
        us.timezone,
        us.reminder_send_hour,
        now()
      )
      WHERE us.next_reminder_at_utc <= now()
    `;
    return {
      failedUsers: 0,
      message: "No reminders due for current hourly window",
      scheduledUsers: 0,
      sentUsers: 0,
      success: true,
      targetDate: new Date().toISOString().slice(0, 10),
    };
  }

  const result = await sendReminderDigest(row.payload);

  return result;
}
