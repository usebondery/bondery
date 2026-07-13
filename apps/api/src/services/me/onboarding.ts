import type { ImportFollowupPlatform } from "@bondery/schemas";
import type { DomainContext } from "../../domains/_shared/context.js";
import { internal } from "../../lib/platform/errors/http-errors.js";

export async function completeOnboarding(ctx: DomainContext): Promise<{ success: true }> {
  const { client, user } = ctx;

  const { error } = await client
    .from("user_settings")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("onboarding_completed_at", null);

  if (error) {
    throw internal("onboarding_failed_to_complete_onboarding");
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
  const { client, user } = ctx;

  const { error } = await client
    .from("user_settings")
    .update({
      import_followup_platform:
        input.status === "awaiting_export" ? (input.platform ?? null) : null,
      import_followup_status: input.status,
    })
    .eq("user_id", user.id);

  if (error) {
    throw internal("onboarding_failed_to_update_import_follow_up");
  }

  return { success: true };
}

export async function dismissGettingStarted(ctx: DomainContext): Promise<{ success: true }> {
  const { client, user } = ctx;

  const { error } = await client
    .from("user_settings")
    .update({ getting_started_dismissed_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    throw internal("onboarding_failed_to_dismiss_getting_started");
  }

  return { success: true };
}
