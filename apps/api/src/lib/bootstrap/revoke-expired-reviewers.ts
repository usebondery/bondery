/**
 * Reviewer access revocation.
 *
 * Revocation is not just "stop bypassing SMTP". A live session lasts 30 days
 * and Better Auth refreshes the cookie daily, so a grant that ends must also
 * end the sessions and OAuth tokens the reviewer already holds.
 *
 * The ban is the load-bearing part: Better Auth enforces `banned` in
 * `session.create.before`, which covers GitHub, passkey, magic link, and
 * refresh-token sign-in through one lever.
 */
import { prisma } from "@bondery/db";
import type { FastifyBaseLogger } from "fastify";
import { deleteOAuthArtifactsForUser } from "../auth/teardown-user.js";

const BAN_REASON = "reviewer access ended";

export type RevokeReviewerResult = {
  banned: number;
  label: string;
  reviewerAccessId: string;
  userId: string;
};

/** End one grant: mark revoked, ban the user, drop sessions and OAuth tokens. */
export async function revokeReviewerGrant(
  reviewerAccessId: string,
  log?: FastifyBaseLogger,
): Promise<RevokeReviewerResult | null> {
  const grant = await prisma.reviewerAccess.findUnique({
    select: { id: true, label: true, userId: true },
    where: { id: reviewerAccessId },
  });
  if (!grant) {
    return null;
  }

  await prisma.$transaction([
    prisma.reviewerAccess.update({
      data: { revokedAt: new Date() },
      where: { id: grant.id },
    }),
    prisma.user.update({
      data: { banned: true, banReason: BAN_REASON },
      where: { id: grant.userId },
    }),
    prisma.session.deleteMany({ where: { userId: grant.userId } }),
    prisma.apikey.updateMany({
      data: { enabled: false },
      where: { referenceId: grant.userId },
    }),
  ]);

  await deleteOAuthArtifactsForUser(grant.userId);

  log?.info(
    { label: grant.label, reviewerAccessId: grant.id, userId: grant.userId },
    "reviewer access revoked",
  );

  return {
    banned: 1,
    label: grant.label,
    reviewerAccessId: grant.id,
    userId: grant.userId,
  };
}

/**
 * Nightly sweep: revoke every grant that expired or was revoked but whose user
 * is still able to sign in. Returns the number of accounts banned.
 */
export async function revokeEndedReviewerGrants(log?: FastifyBaseLogger): Promise<number> {
  const now = new Date();
  const ended = await prisma.reviewerAccess.findMany({
    select: { id: true, label: true, user: { select: { banned: true } }, userId: true },
    where: {
      OR: [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }],
    },
  });

  let banned = 0;
  for (const grant of ended) {
    if (grant.user.banned) {
      continue;
    }
    await revokeReviewerGrant(grant.id, log);
    banned += 1;
  }

  log?.info({ banned, scanned: ended.length }, "reviewer access sweep complete");
  return banned;
}
