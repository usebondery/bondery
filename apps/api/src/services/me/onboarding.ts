import type { ImportFollowupPlatform } from "@bondery/schemas";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { captureProductEvent } from "../analytics/posthog-capture.js";

export async function completeOnboarding(ctx: DomainContext): Promise<{ success: true }> {
  const db = domainDb(ctx);
  const { user } = ctx;

  const result = await db.userSettings.updateMany({
    data: { onboardingCompletedAt: new Date() },
    where: {
      onboardingCompletedAt: null,
      userId: user.id,
    },
  });

  if (result.count > 0) {
    await captureProductEvent(ctx, "signup_flow:onboarding_complete");
  }

  return { success: true };
}

export async function updateImportFollowup(
  ctx: DomainContext,
  input: {
    status: "awaiting_export" | "dismissed";
    platform?: ImportFollowupPlatform | null;
  },
): Promise<{ success: true }> {
  const db = domainDb(ctx);
  const { user } = ctx;

  try {
    await db.userSettings.update({
      data: {
        importFollowupPlatform:
          input.status === "awaiting_export" ? (input.platform ?? null) : null,
        importFollowupStatus: input.status,
      },
      where: { userId: user.id },
    });
  } catch (error) {
    throw internal("onboarding_failed_to_update_import_follow_up", error);
  }

  return { success: true };
}

export async function dismissGettingStarted(ctx: DomainContext): Promise<{ success: true }> {
  const db = domainDb(ctx);
  const { user } = ctx;

  try {
    await db.userSettings.update({
      data: { gettingStartedDismissedAt: new Date() },
      where: { userId: user.id },
    });
  } catch (error) {
    throw internal("onboarding_failed_to_dismiss_getting_started", error);
  }

  return { success: true };
}
