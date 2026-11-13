import { prisma } from "@bondery/db";
import type { SupportedLocale } from "@bondery/schemas/locale/supported-locale";
import type { FastifyBaseLogger } from "fastify";
import {
  AVATARS_BUCKET,
  deleteStorageObjects,
  LINKEDIN_LOGOS_BUCKET,
  listStorageKeys,
} from "../storage/get-storage.js";

export type UserDeletionSnapshot = {
  email: string;
  id: string;
  language?: SupportedLocale | null;
  name?: string | null;
};

const pendingDeletionEmails = new Map<string, UserDeletionSnapshot>();

export function snapshotUserForDeletion(user: UserDeletionSnapshot): void {
  pendingDeletionEmails.set(user.id, {
    email: user.email,
    id: user.id,
    language: user.language ?? null,
    name: user.name ?? null,
  });
}

function takeDeletionSnapshot(userId: string): UserDeletionSnapshot | undefined {
  const snapshot = pendingDeletionEmails.get(userId);
  pendingDeletionEmails.delete(userId);
  return snapshot;
}

async function deleteUserStorageFiles(userId: string): Promise<void> {
  const avatarKeys = await listStorageKeys(AVATARS_BUCKET, userId);
  if (avatarKeys.length > 0) {
    await deleteStorageObjects(AVATARS_BUCKET, avatarKeys);
  }

  const logoKeys = await listStorageKeys(LINKEDIN_LOGOS_BUCKET, userId);
  if (logoKeys.length > 0) {
    await deleteStorageObjects(LINKEDIN_LOGOS_BUCKET, logoKeys);
  }
}

export async function deleteOAuthArtifactsForUser(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.oauthAccessToken.deleteMany({ where: { userId } }),
    prisma.oauthRefreshToken.deleteMany({ where: { userId } }),
    prisma.oauthConsent.deleteMany({ where: { userId } }),
  ]);
}

async function cancelStripeSubscriptionIfAny(
  userId: string,
  log?: FastifyBaseLogger,
): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    select: { status: true, stripeSubscriptionId: true },
    where: { userId },
  });

  if (!subscription?.stripeSubscriptionId) {
    return;
  }

  if (subscription.status === "canceled") {
    return;
  }

  try {
    const { getStripeClient } = await import("../../services/billing/stripe.js");
    const stripe = getStripeClient();
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
  } catch (error) {
    log?.warn(
      { err: error, stripeSubscriptionId: subscription.stripeSubscriptionId, userId },
      "Failed to cancel Stripe subscription during account deletion",
    );
  }
}

export async function runUserDeleteBefore(
  user: UserDeletionSnapshot,
  log?: FastifyBaseLogger,
): Promise<void> {
  const { getUserSettingsLanguage } = await import("./get-user-settings-language.js");
  const language = await getUserSettingsLanguage(user.id);

  snapshotUserForDeletion({
    ...user,
    language,
  });
  await deleteUserStorageFiles(user.id);
  await deleteOAuthArtifactsForUser(user.id);
  await cancelStripeSubscriptionIfAny(user.id, log);

  try {
    const { deletePendingSubscription } = await import("../../services/billing/subscription.js");
    await deletePendingSubscription(user.email);
  } catch (error) {
    log?.warn({ err: error, userId: user.id }, "Failed to delete pending subscription row");
  }
}

export async function runUserDeleteAfter(
  user: UserDeletionSnapshot,
  log?: FastifyBaseLogger,
): Promise<void> {
  const snapshot = takeDeletionSnapshot(user.id) ?? user;

  try {
    const { sendAccountDeletedEmail } = await import(
      "../../services/notifications/account-deleted.js"
    );
    await sendAccountDeletedEmail(
      {
        email: snapshot.email,
        language: snapshot.language,
        userName: snapshot.name,
      },
      log,
    );
  } catch (error) {
    log?.error({ err: error, userId: user.id }, "Failed to send account-deleted email");
  }
}

export async function deleteUserWithTeardown(
  user: UserDeletionSnapshot,
  log?: FastifyBaseLogger,
): Promise<void> {
  await runUserDeleteBefore(user, log);

  try {
    await prisma.user.delete({ where: { id: user.id } });
  } catch (error) {
    log?.warn({ err: error, userId: user.id }, "Prisma user delete failed during account teardown");
    throw error;
  }

  await runUserDeleteAfter(user, log);
}
