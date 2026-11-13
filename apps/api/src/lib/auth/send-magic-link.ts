import { DEFAULT_LOCALE } from "@bondery/schemas/locale/supported-locale";
import type { GenericEndpointContext } from "better-auth";
import { APIError } from "better-auth/api";
import { classifySmtpError, isEmailConfigured } from "../notifications/transporter.js";
import logger from "../platform/logger.js";
import {
  consumeMagicLinkSendAllowance,
  hashMagicLinkEmail,
  hashMagicLinkStoredIdentifier,
  readPreviousMagicLinkIdentifier,
  rememberMagicLinkIdentifier,
} from "./magic-link-redis.js";
import { resolveAuthLocale } from "./resolve-auth-locale.js";
import { skipSmtpForReviewerSignIn } from "./reviewer-magic-link.js";

export type MagicLinkSendPayload = {
  email: string;
  token: string;
  url: string;
};

type SendMagicLinkFn = (data: MagicLinkSendPayload, ctx?: GenericEndpointContext) => Promise<void>;

let sendCaptureForTests: ((payload: MagicLinkSendPayload) => void) | null = null;

export function setMagicLinkSendCaptureForTests(
  capture: ((payload: MagicLinkSendPayload) => void) | null,
): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("setMagicLinkSendCaptureForTests is not available in production");
  }
  sendCaptureForTests = capture;
}

async function deleteStoredVerification(
  ctx: GenericEndpointContext | undefined,
  identifier: string,
): Promise<void> {
  if (!ctx) {
    return;
  }

  // Better Auth stores `magic-link:` plus the hash. Callers pass the hash.
  await ctx.context.internalAdapter.deleteVerificationByIdentifier(`magic-link:${identifier}`);
  await ctx.context.internalAdapter.deleteVerificationByIdentifier(identifier);
}

function throwUnconfigured(): never {
  throw APIError.from("INTERNAL_SERVER_ERROR", {
    code: "email_service_not_configured",
    message: "Email service not configured.",
  });
}

/**
 * Better Auth `sendMagicLink` implementation: per-email cap, invalidate the
 * previous hashed identifier, then send. Never logs email, token, or URL.
 */
export const sendMagicLink: SendMagicLinkFn = async ({ email, token, url }, ctx) => {
  const emailHash = hashMagicLinkEmail(email);
  const storedIdentifier = hashMagicLinkStoredIdentifier(token);

  try {
    await consumeMagicLinkSendAllowance(emailHash);
  } catch (error) {
    await deleteStoredVerification(ctx, storedIdentifier);
    throw error;
  }

  const previousIdentifier = await readPreviousMagicLinkIdentifier(emailHash);
  if (previousIdentifier && previousIdentifier !== storedIdentifier) {
    await deleteStoredVerification(ctx, previousIdentifier);
  }

  await rememberMagicLinkIdentifier(emailHash, storedIdentifier);

  if (await skipSmtpForReviewerSignIn({ ctx, email, token, url })) {
    return;
  }

  if (sendCaptureForTests) {
    sendCaptureForTests({ email, token, url });
    return;
  }

  try {
    const locale = ctx ? await resolveAuthLocale(ctx) : DEFAULT_LOCALE;
    if (!isEmailConfigured()) {
      await deleteStoredVerification(ctx, storedIdentifier);
      throwUnconfigured();
    }

    const { sendMagicLinkEmail } = await import("../../services/notifications/magic-link.js");
    await sendMagicLinkEmail(
      {
        email,
        language: locale,
        url,
      },
      logger,
    );
  } catch (error) {
    await deleteStoredVerification(ctx, storedIdentifier);
    if (error instanceof APIError) {
      throw error;
    }

    logger.warn({ error: classifySmtpError(error) }, "sign-in link email failed");
    throw APIError.from("INTERNAL_SERVER_ERROR", {
      code: "EMAIL_SEND_FAILED",
      message: "Could not send sign-in email.",
    });
  }
};
