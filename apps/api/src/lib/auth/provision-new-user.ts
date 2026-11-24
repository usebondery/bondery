/**
 * Seeds app-domain rows for a newly registered Better Auth user.
 *
 * Seeds default user settings and the "myself" contact row for new accounts.
 * Must be idempotent: partial state (e.g. `user_settings` without `people`)
 * can exist when settings were migrated or a prior hook attempt failed
 * mid-transaction.
 */
import { type SupportedLocale as DbSupportedLocale, prisma } from "@bondery/db";
import {
  coerceSupportedLocale,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "@bondery/schemas/locale/supported-locale";
import { firstAiUsagePeriodEnd } from "../chat/ai-usage-period.js";
import { resolveNewUserDisplayName, splitDisplayName } from "./new-user-name.js";

export async function provisionNewUser(params: {
  email?: string | null;
  locale?: SupportedLocale;
  name?: string | null;
  userId: string;
}): Promise<{ settingsCreated: boolean }> {
  const { userId } = params;
  const locale = coerceSupportedLocale(params.locale ?? DEFAULT_LOCALE) as DbSupportedLocale;
  const now = new Date();
  const { firstName, lastName } = splitDisplayName(
    resolveNewUserDisplayName({ email: params.email, name: params.name }),
  );

  const [settings, myself] = await Promise.all([
    prisma.userSettings.findUnique({
      select: { id: true },
      where: { userId },
    }),
    prisma.people.findFirst({
      select: { id: true },
      where: { myself: true, userId },
    }),
  ]);

  if (!settings) {
    await prisma.userSettings.create({
      data: {
        aiMessagesMonthResetAt: firstAiUsagePeriodEnd(now),
        language: locale,
        nextReminderAtUtc: now,
        timezone: "UTC",
        userId,
      },
    });
  }

  if (!myself) {
    await prisma.people.create({
      data: {
        firstName,
        id: userId,
        lastInteraction: now,
        lastName,
        myself: true,
        userId,
      },
    });
  }

  return { settingsCreated: !settings };
}
