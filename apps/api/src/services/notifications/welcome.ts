import { prisma } from "@bondery/db";
import { WelcomeEmail } from "@bondery/emails";
import type { SupportedLocale } from "@bondery/schemas/locale/supported-locale";
import type { FastifyBaseLogger } from "fastify";
import { emailDocumentProps, resolveAppOrigin } from "../../lib/notifications/email-chrome.js";
import { buildWelcomeCopy } from "../../lib/notifications/email-copy-builders.js";
import { formatEmailFrom } from "../../lib/notifications/email-from.js";
import { loadEmailNamespace, readCopyString } from "../../lib/notifications/email-i18n.js";
import { renderEmailParts } from "../../lib/notifications/render-email.js";
import {
  isEmailConfigured,
  requireEmailConfig,
  sendRenderedEmail,
} from "../../lib/notifications/transporter.js";

type SendWelcomeEmailInput = {
  email: string;
  language: SupportedLocale;
  userId: string;
  userName?: string | null;
};

function resolveAppUrl(): string {
  return resolveAppOrigin();
}

export type { SendWelcomeEmailInput };

export async function sendWelcomeEmail(
  input: SendWelcomeEmailInput,
  log?: FastifyBaseLogger,
): Promise<void> {
  if (!isEmailConfigured()) {
    log?.warn("Skipping welcome email: SMTP is not configured");
    return;
  }

  const config = requireEmailConfig();
  const bundle = loadEmailNamespace(input.language, "WelcomeEmail");
  const copy = buildWelcomeCopy(bundle);
  const appUrl = resolveAppUrl();
  const subject = readCopyString(bundle, "subject");

  const { html, text } = await renderEmailParts(
    WelcomeEmail({
      ...emailDocumentProps(input.language, subject),
      appUrl,
      copy,
    }),
  );

  await sendRenderedEmail(
    {
      from: formatEmailFrom(config.fromAddress),
      html,
      replyTo: config.replyToAddress,
      subject,
      text,
      to: input.email,
    },
    log,
  );
}

export async function sendWelcomeEmailIfNeeded(
  input: SendWelcomeEmailInput,
  log?: FastifyBaseLogger,
): Promise<void> {
  if (!isEmailConfigured()) {
    log?.warn("Skipping welcome email: SMTP is not configured");
    return;
  }

  const claimed = await prisma.userSettings.updateMany({
    data: { welcomeEmailSentAt: new Date() },
    where: { userId: input.userId, welcomeEmailSentAt: null },
  });

  if (claimed.count === 0) {
    log?.info(
      { userId: input.userId },
      "welcome email already sent or settings missing — skipping",
    );
    return;
  }

  try {
    await sendWelcomeEmail(input, log);
    log?.info({ userId: input.userId }, "welcome email sent");
  } catch (error) {
    log?.warn({ err: error, userId: input.userId }, "welcome email failed");
  }
}
