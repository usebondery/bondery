/**
 * Reviewer magic-link sign-in.
 *
 * `BONDERY_AUTH_REVIEWER_EMAIL` holds the full address. An empty value disables the path.
 * A match skips SMTP. The sign-in JSON then carries the verify URL Better Auth already built.
 * A match with no user deletes that verification row and returns the normal sign-in error.
 * The after-hook middleware copies the endpoint context. `ctx.context` stays the same object.
 */
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@bondery/db";
import type { GenericEndpointContext } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import logger from "../platform/logger.js";
import { hashMagicLinkStoredIdentifier } from "./magic-link-redis.js";

const REVIEWER_EMAIL_ENV = "BONDERY_AUTH_REVIEWER_EMAIL";
const MAGIC_LINK_SIGN_IN_PATH = "/sign-in/magic-link";

const reviewerVerifyUrls = new WeakMap<object, string>();

function configuredReviewerEmail(): string {
  return process.env[REVIEWER_EMAIL_ENV]?.trim().toLowerCase() ?? "";
}

/** Length check first. `timingSafeEqual` throws when the buffers differ in length. */
export function isReviewerEmail(submitted: string): boolean {
  const configured = configuredReviewerEmail();
  if (!configured) {
    return false;
  }

  const candidate = submitted.trim().toLowerCase();
  const left = Buffer.from(candidate);
  const right = Buffer.from(configured);
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

function rememberReviewerVerifyUrl(ctx: GenericEndpointContext, url: string): void {
  reviewerVerifyUrls.set(ctx, url);
  reviewerVerifyUrls.set(ctx.context, url);
}

function takeReviewerVerifyUrl(ctx: object): string | undefined {
  const direct = reviewerVerifyUrls.get(ctx);
  if (direct) {
    reviewerVerifyUrls.delete(ctx);
    return direct;
  }

  if (!("context" in ctx)) {
    return undefined;
  }

  const authContext = ctx.context;
  if (!authContext || typeof authContext !== "object") {
    return undefined;
  }

  const nested = reviewerVerifyUrls.get(authContext);
  if (!nested) {
    return undefined;
  }

  reviewerVerifyUrls.delete(authContext);
  return nested;
}

function throwSignInEmailFailed(): never {
  throw APIError.from("INTERNAL_SERVER_ERROR", {
    code: "EMAIL_SEND_FAILED",
    message: "Could not send sign-in email.",
  });
}

async function deleteMagicLinkVerification(
  ctx: GenericEndpointContext,
  token: string,
): Promise<void> {
  const storedToken = hashMagicLinkStoredIdentifier(token);
  await ctx.context.internalAdapter.deleteVerificationByIdentifier(`magic-link:${storedToken}`);
  await ctx.context.internalAdapter.deleteVerificationByIdentifier(storedToken);
}

/**
 * Returns true when SMTP must not run.
 * Throws the normal sign-in error when the reviewer user row is missing.
 */
export async function skipSmtpForReviewerSignIn(input: {
  ctx: GenericEndpointContext | undefined;
  email: string;
  token: string;
  url: string;
}): Promise<boolean> {
  if (!isReviewerEmail(input.email)) {
    return false;
  }

  if (!input.ctx) {
    throwSignInEmailFailed();
  }

  const normalized = input.email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    select: { id: true },
    where: { email: { equals: normalized, mode: "insensitive" } },
  });

  if (!user) {
    await deleteMagicLinkVerification(input.ctx, input.token);
    throwSignInEmailFailed();
  }

  rememberReviewerVerifyUrl(input.ctx, input.url);
  logger.info("reviewer sign-in issued");
  return true;
}

/** Replaces `POST /sign-in/magic-link` JSON when a reviewer verify URL is stored. */
export function reviewerMagicLinkRedirect() {
  return {
    hooks: {
      after: [
        {
          handler: createAuthMiddleware(async (ctx) => {
            const url = takeReviewerVerifyUrl(ctx);
            if (!url) {
              return;
            }

            return ctx.json({ redirect: true, status: true, url });
          }),
          matcher: (context: { path?: string }) => context.path === MAGIC_LINK_SIGN_IN_PATH,
        },
      ],
    },
    id: "reviewer-magic-link" as const,
  };
}
