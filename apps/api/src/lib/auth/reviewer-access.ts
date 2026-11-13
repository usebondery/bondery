/**
 * Reviewer access grant lookup.
 *
 * A row in `reviewer_access` is the only gate for SMTP-bypass magic-link
 * sign-in. A reviewer has no reachable mailbox, so the API returns the verify
 * URL in the sign-in response instead of sending mail.
 *
 * Every read fails closed: a missing, expired, revoked, or banned grant returns
 * `null`, and the caller falls through to the normal SMTP path. The response
 * shape must stay identical for non-reviewers.
 */
import { prisma } from "@bondery/db";

export type ActiveReviewer = {
  id: string;
  label: string;
  userId: string;
};

type ReviewerCandidate = {
  banned: boolean | null;
  id: string;
  reviewerAccess: { expiresAt: Date; id: string; label: string; revokedAt: Date | null } | null;
};

/** A grant is active only when it is not revoked, not expired, and the user is not banned. */
function selectActiveReviewer(user: ReviewerCandidate | null): ActiveReviewer | null {
  const grant = user?.reviewerAccess;
  if (!user || !grant || user.banned) {
    return null;
  }
  if (grant.revokedAt) {
    return null;
  }
  if (grant.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return { id: grant.id, label: grant.label, userId: user.id };
}

const REVIEWER_SELECT = {
  banned: true,
  id: true,
  reviewerAccess: { select: { expiresAt: true, id: true, label: true, revokedAt: true } },
} as const;

/**
 * Resolve an active reviewer grant for a submitted sign-in address.
 * Runs only after the caller has already accepted the address, so a miss
 * reveals nothing about other addresses.
 */
export async function findActiveReviewerForEmail(email: string): Promise<ActiveReviewer | null> {
  const user = await prisma.user.findFirst({
    select: REVIEWER_SELECT,
    where: { email: { equals: email.trim().toLowerCase(), mode: "insensitive" } },
  });

  return selectActiveReviewer(user);
}

/** True when the user holds an active reviewer grant. */
export async function isActiveReviewer(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    select: REVIEWER_SELECT,
    where: { id: userId },
  });

  return selectActiveReviewer(user) !== null;
}
