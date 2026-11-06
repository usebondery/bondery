import { FeedbackEmail } from "@bondery/emails";
import type { FastifyBaseLogger } from "fastify";
import { emailDocumentProps } from "../../lib/notifications/email-chrome.js";
import { buildFeedbackCopy } from "../../lib/notifications/email-copy-builders.js";
import { formatEmailFrom } from "../../lib/notifications/email-from.js";
import {
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
import { internal } from "../../lib/platform/errors/http-errors.js";

export type SendFeedbackEmailInput = {
  /** Agent-facing defect report. `toolName` marks the report as agent-authored. */
  agentReport?: {
    actual: string;
    expected: string;
    kind: string;
    requestId?: string;
    toolName: string;
  };
  generalFeedback?: string;
  npsReason?: string;
  npsScore?: number;
  userEmail: string;
  userId: string;
};

export async function sendFeedbackEmail(
  input: SendFeedbackEmailInput,
  log?: FastifyBaseLogger,
): Promise<void> {
  if (!isEmailConfigured()) {
    throw internal("email_service_not_configured");
  }

  const config = requireEmailConfig();
  const lng = await resolveEmailLocale(input.userId);
  const bundle = loadEmailNamespace(lng, "FeedbackEmail");
  const copy = buildFeedbackCopy(bundle);
  const timestamp = new Date().toISOString();
  const subject = readCopyString(bundle, "subject");

  try {
    const { html, text } = await renderEmailParts(
      FeedbackEmail({
        ...emailDocumentProps(lng, subject),
        agentReport: input.agentReport,
        copy,
        generalFeedback: input.generalFeedback || undefined,
        npsReason: input.npsReason || undefined,
        npsScore: input.npsScore,
        timestamp,
        userEmail: input.userEmail,
        userId: input.userId,
      }),
    );

    await sendRenderedEmail(
      {
        cc: input.userEmail,
        from: formatEmailFrom(config.fromAddress),
        html,
        replyTo: input.userEmail,
        subject,
        text,
        to: formatEmailFrom(config.fromAddress),
      },
      log,
    );
  } catch (cause) {
    throw internal("failed_to_render_or_send_feedback_email_", cause);
  }
}
