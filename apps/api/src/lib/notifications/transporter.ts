import type { FastifyBaseLogger } from "fastify";
import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";

export type EmailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromAddress: string;
};

export function createEmailTransporter(config: EmailConfig): Transporter {
  return nodemailer.createTransport({
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
}

export function emailConfigFromEnv(env: {
  PRIVATE_EMAIL_HOST: string;
  PRIVATE_EMAIL_PORT: string;
  PRIVATE_EMAIL_USER: string;
  PRIVATE_EMAIL_PASS: string;
  PRIVATE_EMAIL_ADDRESS: string;
}): EmailConfig {
  return {
    fromAddress: env.PRIVATE_EMAIL_ADDRESS,
    host: env.PRIVATE_EMAIL_HOST,
    pass: env.PRIVATE_EMAIL_PASS,
    port: Number(env.PRIVATE_EMAIL_PORT),
    user: env.PRIVATE_EMAIL_USER,
  };
}

export function emailConfigFromProcessEnv(): EmailConfig | null {
  const host = process.env.PRIVATE_EMAIL_HOST;
  const user = process.env.PRIVATE_EMAIL_USER;
  const pass = process.env.PRIVATE_EMAIL_PASS;
  const fromAddress = process.env.PRIVATE_EMAIL_ADDRESS;
  if (!host || !user || !pass || !fromAddress) {
    return null;
  }
  return {
    fromAddress,
    host,
    pass,
    port: Number(process.env.PRIVATE_EMAIL_PORT ?? 587),
    user,
  };
}

export async function sendRenderedEmail(
  transporter: Transporter,
  options: {
    from: string;
    to: string;
    subject: string;
    html: string;
    cc?: string;
    replyTo?: string;
  },
  log?: FastifyBaseLogger,
): Promise<void> {
  try {
    await transporter.sendMail(options);
  } catch (error) {
    log?.error({ err: error }, "Failed to send email");
    throw error;
  }
}
