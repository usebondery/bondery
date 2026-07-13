import { FeedbackEmail } from "@bondery/emails";
import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import { internal } from "../../lib/platform/errors/http-errors.js";

export type FeedbackEmailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  address: string;
};

export type SendFeedbackEmailInput = {
  userEmail: string;
  userId: string;
  npsScore: number;
  npsReason?: string;
  generalFeedback?: string;
};

export async function sendFeedbackEmail(
  config: FeedbackEmailConfig,
  input: SendFeedbackEmailInput,
): Promise<void> {
  const { userEmail, userId, npsScore, npsReason, generalFeedback } = input;
  const timestamp = new Date().toISOString();

  const transporter = nodemailer.createTransport({
    auth: {
      pass: config.pass,
      user: config.user,
    },
    host: config.host,
    port: config.port,
    secure: false,
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    const emailHtml = await render(
      FeedbackEmail({
        generalFeedback: generalFeedback || undefined,
        npsReason: npsReason || undefined,
        npsScore,
        timestamp,
        userEmail,
        userId,
      }),
    );

    await transporter.sendMail({
      cc: userEmail,
      from: `Robot from Bondery <${config.address}>`,
      html: emailHtml,
      replyTo: userEmail,
      subject: `New feedback about Bondery`,
      to: `Robot from Bondery <${config.address}>`,
    });
  } catch (cause) {
    throw internal("failed_to_render_or_send_feedback_email_", cause);
  }
}
