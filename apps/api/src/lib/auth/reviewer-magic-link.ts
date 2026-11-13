/**
 * Reviewer magic-link sign-in.
 *
 * A reviewer holds an active `reviewer_access` grant and has no reachable
 * mailbox. The send hook skips SMTP and keeps the verify URL that Better Auth
 * already built. The after-hook middleware copies the endpoint context onto the
 * response. `ctx.context` stays the same object.
 *
 * Expired, revoked, or banned grants are not reviewers. They fall through to
 * the normal SMTP path with no distinguishing response.
 */
import type { GenericEndpointContext } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import logger from "../platform/logger.js";
import { findActiveReviewerForEmail } from "./reviewer-access.js";

const MAGIC_LINK_SIGN_IN_PATH = "/sign-in/magic-link";

const reviewerVerifyUrls = new WeakMap<object, string>();

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

/**
 * Returns true when SMTP must not run.
 * A reviewer without a reachable mailbox is the only caller that gets the URL.
 */
export async function skipSmtpForReviewerSignIn(input: {
  ctx: GenericEndpointContext | undefined;
  email: string;
  url: string;
}): Promise<boolean> {
  const reviewer = await findActiveReviewerForEmail(input.email);
  if (!reviewer) {
    return false;
  }

  if (!input.ctx) {
    return false;
  }

  rememberReviewerVerifyUrl(input.ctx, input.url);
  logger.info({ label: reviewer.label, reviewerAccessId: reviewer.id }, "reviewer sign-in issued");
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
