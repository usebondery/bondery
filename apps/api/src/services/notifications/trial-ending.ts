import { TrialEndingEmail } from "@bondery/emails";
import type { FastifyBaseLogger } from "fastify";
import { appSettingsUrl, emailDocumentProps } from "../../lib/notifications/email-chrome.js";
import { buildTrialEndingCopy } from "../../lib/notifications/email-copy-builders.js";
import { formatEmailFrom } from "../../lib/notifications/email-from.js";
import {
  formatEmailDate,
  loadEmailNamespace,
  readCopyString,
  resolveEmailLocale,
} from "../../lib/notifications/email-i18n.js";
import { renderEmailParts } from "../../lib/notifications/render-email.js";
import {
  isEmailConfigured,
  requireEmailConfig,
  sendRenderedEmail,
} from "../../lib/notifications/transporter.js";

export type SendTrialEndingEmailInput = {
  email: string;
  trialEndsAt: Date | null;
  userId?: string | null;
  userName?: string | null;
};

export async function sendTrialEndingEmail(
  input: SendTrialEndingEmailInput,
  log?: FastifyBaseLogger,
): Promise<void> {
  if (!isEmailConfigured()) {
    log?.warn("Skipping trial-ending email: SMTP is not configured");
    return;
  }

  const config = requireEmailConfig();
  const formatCtx = await resolveEmailLocale(input.userId);
  const lng = formatCtx.locale;
  const bundle = loadEmailNamespace(lng, "TrialEndingEmail");
  const copy = buildTrialEndingCopy(bundle);
  const formattedEndDate = input.trialEndsAt
    ? formatEmailDate(input.trialEndsAt, formatCtx)
    : readCopyString(bundle, "endDateFallback");
  const subject = readCopyString(bundle, "subject");

  const { html, text } = await renderEmailParts(
    TrialEndingEmail({
      ...emailDocumentProps(lng, subject),
      copy,
      formattedEndDate,
      settingsUrl: appSettingsUrl(),
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
